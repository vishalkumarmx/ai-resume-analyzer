'use client'

import React, { useMemo, useState } from 'react'
import clsx from 'clsx'

const REACT_SKILLS = [
  'JavaScript (ES6+)', 'TypeScript', 'React', 'React Hooks', 'Redux Toolkit', 'Zustand',
  'React Query / TanStack Query', 'Next.js', 'React Router', 'CSS / SCSS', 'Tailwind CSS', 'Styled Components',
  'Testing (Jest/RTL)', 'GraphQL', 'REST APIs', 'Form handling (Formik/RHF)', 'Webpack/Vite', 'Accessibility (a11y)',
  'Performance (memo, code-splitting)',
]

function parseCommaSeparated(input: string) { return Array.from(new Set(input.split(',').map(s => s.trim()).filter(Boolean))) }

function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (<button type="button" onClick={onToggle} className={clsx('px-3 py-1 rounded-2xl text-sm border transition-all', selected ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50')}>{label}</button>)
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (<div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5"><div className="flex items-start justify-between gap-3 mb-4"><h2 className="text-lg font-semibold tracking-tight">{title}</h2>{right}</div>{children}</div>)
}

export default function ResumeAnalyzer() {
  const [selected, setSelected] = useState<string[]>([])
  const [showCustom, setShowCustom] = useState(false)
  const [customRaw, setCustomRaw] = useState('')
  const [jd, setJd] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const combinedSkills = useMemo(() => Array.from(new Set([...selected])), [selected])
  const otherChipSelected = showCustom || combinedSkills.includes('Other')

  const toggleSkill = (skill: string) => setSelected(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  const addCustomSkills = () => { const parsed = parseCommaSeparated(customRaw); if (parsed.length === 0) return; setSelected(prev => Array.from(new Set([...prev, ...parsed]))); setCustomRaw('') }
  const removeSkill = (skill: string) => setSelected(prev => prev.filter(s => s !== skill))

  const onAnalyze = async () => {
    setError(null)
    if (!resumeFile) { setError('Please upload a resume (PDF/DOCX/TXT)'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('resume', resumeFile)
      fd.append('skills', JSON.stringify(combinedSkills.filter(s => s !== 'Other')))
      if (jd.trim()) fd.append('jobDescription', jd.trim())
      const res = await fetch('/api/analyze', { method: 'POST', body: fd })
      if (!res.ok) { throw new Error(await res.text() || `Request failed: ${res.status}`) }
      const data = await res.json()
      setResult(data)
    } catch (e: any) { setError(e.message || 'Something went wrong') } finally { setBusy(false) }
  }

  return (<div className="min-h-screen w-full">
    <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-gray-200 text-2xl" >⚡</div>
          <div>
            <p className="text-xs text-gray-500">AI-Powered</p>
            <h1 className="font-bold tracking-tight text-lg">Resume Analyzer</h1>
          </div>
        </div>
        <a className="text-sm rounded-xl border px-3 py-1.5 hover:bg-gray-50" href="https://github.com/" target="_blank">GitHub</a>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card title="Upload Resume" right={<span className="text-xs text-gray-500">PDF • DOCX • TXT</span>}>
          <div className="flex items-center gap-4">
            <label className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 cursor-pointer">
              <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12 5v14M5 12h14" /></svg>
              Choose file
            </label>
            <div className="text-sm text-gray-700 truncate">{resumeFile ? (<span className="inline-flex items-center gap-2"><span className="font-medium">{resumeFile.name}</span><button className="text-gray-400 hover:text-red-500" onClick={() => setResumeFile(null)} title="Remove">✕</button></span>) : (<span className="text-gray-500">No file selected</span>)}</div>
          </div>
        </Card>

        <Card title="Select Your Skills">
          <div className="flex flex-wrap gap-2">
            {REACT_SKILLS.map(skill => (<Chip key={skill} label={skill} selected={selected.includes(skill)} onToggle={() => toggleSkill(skill)} />))}
            <Chip label="Other" selected={otherChipSelected} onToggle={() => setShowCustom(v => !v)} />
          </div>
          {otherChipSelected && (<div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <input className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Add comma-separated custom skills (e.g., Framer Motion, Recharts)" value={customRaw} onChange={e => setCustomRaw(e.target.value)} />
            <button onClick={addCustomSkills} className="rounded-xl bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 transition">Add</button>
          </div>)}
          {combinedSkills.length > 0 && (<div className="mt-5"><p className="text-sm text-gray-500 mb-2">Selected skills</p><div className="flex flex-wrap gap-2">{combinedSkills.filter(s => s !== 'Other').map(skill => (<span key={skill} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 text-sm">{skill}<button className="text-indigo-400 hover:text-red-500" onClick={() => removeSkill(skill)}>✕</button></span>))}</div></div>)}
        </Card>

        <Card title="Job Description (Optional)" right={<span className="text-xs text-gray-500">Paste to tailor analysis</span>}>
          <textarea className="w-full min-h-[160px] rounded-2xl border border-gray-300 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Paste the JD here to get missing/weak skills vs role requirements (optional)" value={jd} onChange={e => setJd(e.target.value)} />
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Analyze">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <button onClick={onAnalyze} disabled={busy} className={clsx('w-full rounded-2xl px-4 py-3 font-semibold transition', busy ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700')}>{busy ? 'Analyzing…' : 'Analyze Resume'}</button>
        </Card>

        <Card title="Results">
          {!result ? (<div className="text-sm text-gray-500">No results yet.</div>) : (<div className="space-y-4">
            <div className="rounded-xl border p-3"><div className="text-sm text-gray-600">ATS Score</div><div className="text-2xl font-semibold">{result.ats?.score ?? 0}/100</div><ul className="list-disc pl-5 text-sm text-gray-600 mt-2">{(result.ats?.reasons ?? []).map((r: string, i: number) => (<li key={i}>{r}</li>))}</ul></div>
            <div className="rounded-xl border p-3"><div className="font-medium mb-2">Missing & Weak Skills</div><div className="text-sm"><b>Missing:</b> {(result.ai?.missing_skills ?? []).join(', ') || '—'}</div><div className="text-sm"><b>Weak:</b> {(result.ai?.weak_skills ?? []).join(', ') || '—'}</div></div>
            <div className="rounded-xl border p-3"><div className="font-medium mb-2">Improved Summary</div><div className="text-sm"><b>Short:</b> {result.ai?.summary_improved_short || '—'}</div><div className="text-sm"><b>Resume (2–3 lines):</b> {result.ai?.summary_improved_long || '—'}</div></div>
            <details className="rounded-xl border p-3"><summary className="cursor-pointer font-medium">Grammar Fixes</summary><div className="mt-2 space-y-2 text-sm">{(result.ai?.grammar_fixes ?? []).map((g: any, i: number) => (<div key={i} className="bg-gray-50 border rounded-lg p-2"><div><b>Before:</b> {g.before}</div><div><b>After:</b> {g.after}</div><div className="text-gray-500"><b>Reason:</b> {g.reason}</div></div>))}</div></details>
            <details className="rounded-xl border p-3"><summary className="cursor-pointer font-medium">ATS Warnings</summary><ul className="list-disc pl-5 text-sm text-gray-600 mt-2">{(result.ai?.ats_warnings ?? []).map((w: string, i: number) => (<li key={i}>{w}</li>))}</ul></details>
            <details className="rounded-xl border p-3"><summary className="cursor-pointer font-medium">Raw JSON</summary><pre className="text-xs bg-gray-50 border rounded-lg p-2 overflow-auto max-h-80">{JSON.stringify(result, null, 2)}</pre></details>
          </div>)}
        </Card>
      </div>
    </main>

    <footer className="max-w-6xl mx-auto px-6 py-8 text-sm text-gray-500">Built with <span className="font-semibold text-gray-700">Next.js 15 + Tailwind</span> — server parses PDF/DOCX and calls OpenAI.</footer>
  </div>)
}
