import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { score } from '@/lib/rubric';
import { extractTextFromFile } from '@/lib/parse';

export const runtime = 'nodejs';

// --- Types ----------------------------------------------------------------

type GrammarFix = { before: string; after: string; reason: string };

interface AIAnalysis {
    missing_skills: string[];
    weak_skills: string[];
    grammar_fixes: GrammarFix[];
    ats_warnings: string[];
    summary_improved_short: string;
    summary_improved_long: string;
}

interface RoutePayload {
    ats: unknown;
    ai: Partial<AIAnalysis>;
    meta: { filename: string; skills: string[] };
}

// --- Constants ------------------------------------------------------------

const MAX_JD_CHARS = 4_000;
const MAX_RESUME_CHARS = 200_000;
const MODEL = 'gpt-4o-mini';

// --- OpenAI client --------------------------------------------------------

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- Helpers --------------------------------------------------------------

const SkillsArray = z.array(z.string().trim().min(1)).max(200).optional();

function coerceSkills(form: FormData): string[] {
    // Multiple form entries (e.g., <select multiple name="skills">)
    const all = form.getAll('skills');
    if (all.length > 1) {
        const parsed = SkillsArray.safeParse(all.map(String));
        const val: string[] = parsed.success ? parsed.data! : ([] as string[]);
        return val;
    }

    // Single JSON string
    const raw = form.get('skills');
    if (typeof raw === 'string') {
        try {
            const parsed = SkillsArray.safeParse(JSON.parse(raw));
            const val: string[] = parsed.success ? parsed.data! : ([] as string[]);
            return val;
        } catch {
            return [] as string[];
        }
    }

    return [] as string[];
}

function trimCap(input: string, max: number): string {
    return input.length > max ? input.slice(0, max) : input;
}

function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

function serverError(err: unknown) {
    const msg =
        typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
}

function promptParts(resumeText: string, jd: string) {
    console.log('hiiiiiiiiiii')
    const system =
        'You are a precise resume analyst. Return JSON with keys: missing_skills[], weak_skills[], grammar_fixes[], ats_warnings[], summary_improved_short, summary_improved_long.';

    const user = `RESUME:
${resumeText}

TARGET_ROLE: React Frontend Engineer
TARGET_JD: ${jd}

Requirements:
- missing_skills: rank by impact; only job-relevant skills/tech/tools/frameworks/soft-skills
- weak_skills: present in resume but too generic or lacking depth
- grammar_fixes: list of objects with before, after, reason
- ats_warnings: specific, actionable
- summary_improved_short: 150-220 chars; crisp; quantified if possible
- summary_improved_long: 2-3 lines for a resume top section

Return JSON only.`;

    return { system, user };
}

function safeJson<T = unknown>(text: string): T | undefined {
    try {
        return JSON.parse(text) as T;
    } catch {
        return undefined;
    }
}

async function getAIAnalysis(resumeText: string, jd: string): Promise<Partial<AIAnalysis>> {
    const { system, user } = promptParts(resumeText, jd);

    const chat = await openai.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
    });

    const msg = chat.choices?.[0]?.message;

    type TextPart = { type?: string; text?: string };
    const text =
        typeof msg?.content === 'string'
            ? msg.content
            : Array.isArray(msg?.content)
                ? (msg.content as TextPart[]).map((c) => c?.text ?? '').join('\n')
                : '';

    const parsed = safeJson<AIAnalysis>(text);
    // Ensure we always return a Partial<AIAnalysis>, not `{}` which can cause never[]
    return (parsed ?? ({} as Partial<AIAnalysis>));
}

// --- Route ---------------------------------------------------------------

export async function POST(req: NextRequest) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return serverError('Missing OPENAI_API_KEY');
        }

        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return badRequest('Expected multipart/form-data');
        }

        const form = await req.formData();
        const file = form.get('resume');

        if (!(file instanceof File)) {
            return badRequest('Missing resume file');
        }

        const jdRaw = (form.get('jobDescription') as string | null) || '';
        const jd = trimCap(jdRaw, MAX_JD_CHARS);
        const skills: string[] = coerceSkills(form);

        const resumeTextRaw = await extractTextFromFile(file, file.name);
        const resumeText = trimCap(resumeTextRaw, MAX_RESUME_CHARS);

        const ats = score(resumeText, jd);

        const ai: Partial<AIAnalysis> = await getAIAnalysis(resumeText, jd);

        // Example of consuming arrays without never[]:
        const missing: string[] = ai.missing_skills ?? ([] as string[]);
        const weak: string[] = ai.weak_skills ?? ([] as string[]);
        const fixes: GrammarFix[] = ai.grammar_fixes ?? ([] as GrammarFix[]);
        const warnings: string[] = ai.ats_warnings ?? ([] as string[]);

        // (Optional) If you need to map, it's safe now:
        // const normalizedMissing = missing.map(s => s.trim()).filter(Boolean);

        const payload: RoutePayload = {
            ats,
            ai: {
                ...ai,
                missing_skills: missing,
                weak_skills: weak,
                grammar_fixes: fixes,
                ats_warnings: warnings,
            },
            meta: {
                filename: file.name,
                skills,
            },
        };

        return NextResponse.json(payload);
    } catch (err: any) {
        if (err?.status === 429) {
            return NextResponse.json({ error: 'Rate limited. Please retry later.' }, { status: 429 });
        }
        if (err?.status === 401 || err?.status === 403) {
            return NextResponse.json({ error: 'Unauthorized OpenAI request.' }, { status: err.status });
        }
        console.error('[resume-analyze] Error:', err);
        return serverError(err);
    }
}
