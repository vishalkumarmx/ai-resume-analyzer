// lib/parse.ts
export async function extractTextFromFile(file: File, filename: string): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = filename.toLowerCase();

  if (name.endsWith(".pdf")) {
    // load at runtime to avoid turbopack eval issues
    const pdfParse = (await import("pdf-parse")).default as (b: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buf);
    return (data.text || "").trim();
  }

  if (name.endsWith(".docx")) {
    // mammoth sometimes exports as CJS default, sometimes namespace — cover both
    const mammothMod: any = await import("mammoth");
    const mammoth = mammothMod.default ?? mammothMod;
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return (value || "").trim();
  }

  // fallback: TXT
  return buf.toString("utf-8");
}
