/* Shared Gemini call used by /api/chat, /api/aptitude and /api/job-apply.
   - API key goes in the x-goog-api-key header, not the URL (URLs end up in logs).
   - No temperature/top_p/top_k: Google has deprecated those sampling parameters
     for the 3.x models (see the Gemini "latest models" migration checklist).
   - Hard timeout so a slow upstream can't hold a serverless function open. */

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export const geminiConfigured = () => Boolean(process.env.LLM_API_KEY || process.env.GEMINI_API_KEY);

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export async function generateText({ contents, systemInstruction, generationConfig, timeoutMs = 20_000 }) {
  const key = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) throw fail('NOT_CONFIGURED', 'Gemini key is not configured');

  const base = (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const response = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents, systemInstruction, generationConfig }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw fail('UPSTREAM', `Gemini HTTP ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
  if (!text) throw fail('EMPTY', 'Empty completion from Gemini');
  return text;
}

/** Parse JSON that may be wrapped in ```json fences. Throws on invalid JSON. */
export function parseJsonLoose(text) {
  const cleaned = String(text || '').replace(/^```json\s*|^```\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned);
}
