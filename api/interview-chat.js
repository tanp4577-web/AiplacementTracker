/* ============================================================================
   Vercel Serverless Function — Live Interview Chat (Google Gemini)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/interview-chat
   Body:     { conversationHistory: [{role:'user'|'ai', text}], jobRole: string }
   Response: { reply: string }

   Uses Google's Gemini API (free tier available — no credit card required).
   The API key is read from process.env.LLM_API_KEY (the generic env var used by
   this project) — never hardcoded. GEMINI_API_KEY is kept as a fallback for
   backwards compatibility with existing deployments.

   Environment variables (all with safe defaults):
     - LLM_API_KEY     (REQUIRED)  Google Gemini API key. Get one free:
                                   https://aistudio.google.com/apikey
     - GEMINI_API_KEY  (fallback)  Legacy alias, used only if LLM_API_KEY unset.
     - GEMINI_MODEL    (optional)  default gemini-2.0-flash
     - GEMINI_BASE_URL (optional)  default https://generativelanguage.googleapis.com/v1beta

   The full conversation transcript is embedded in the prompt so Gemini has
   context of the interview so far. If the daily free quota is exceeded
   (HTTP 429 / RESOURCE_EXHAUSTED), a clear, user-friendly error is returned.
   ========================================================================== */

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/* ============================================================================
   Basic abuse protection (rate limiting).
   NOTE: In-memory map on a single warm instance. On Vercel's serverless edge
   this is a best-effort guard — for production-grade DDoS defense you should
   also enable Vercel's built-in WAF / Attack Challenge Mode (see README).
   ========================================================================== */
const RATE_WINDOW_MS = 60 * 1000;        // 60s window
const RATE_MAX_REQUESTS = 20;            // max requests per IP per window
const MAX_BODY_BYTES = 64 * 1024;        // 64KB body cap
const rateBuckets = new Map();            // ip -> { count, resetAt }

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX_REQUESTS;
}

function getClientIp(req) {
  return (
    (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '')) ||
    'unknown'
  ).toString().split(',')[0].trim() || 'unknown';
}

function buildPrompt({ jobRole, interviewType, targetedQuestions, history }) {
  const lines = [];
  lines.push(`You are a friendly but professional HR interview coach conducting a live mock interview for a candidate targeting the role of "${jobRole}".`);
  lines.push('');
  lines.push('Rules:');
  lines.push('- Ask ONE question at a time and keep each reply natural and focused.');
  lines.push("- Listen to the candidate's actual answer and ask a natural, relevant follow-up based on what they just said — never repeat a question and never fall back to a fixed script.");
  lines.push('- Vary your questions across: introduction, experience, projects, strengths & weaknesses, behavioral/STAR scenarios, technical depth (if the candidate mentions skills), and career goals.');
  lines.push('- Around turn 6-7, begin wrapping up by asking the candidate if they have any questions for you, then you may say the session is concluding.');
  lines.push('- Keep the tone warm, encouraging and professional. Do not use markdown or bullet lists.');
  if (interviewType) lines.push(`- Interview style: ${interviewType}.`);
  if (Array.isArray(targetedQuestions) && targetedQuestions.length) {
    lines.push(`- Tailor the interview toward these resume-gap questions: ${targetedQuestions.slice(0, 3).join(' | ')}`);
  }
  lines.push('');
  lines.push('--- Interview transcript so far ---');
  if (!history || !history.length) {
    lines.push('(No answers yet. Ask the opening question: ask the candidate to introduce themselves and their background.)');
  } else {
    history.forEach((h) => {
      lines.push(`${h && h.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${h && h.text ? String(h.text) : ''}`);
    });
  }
  lines.push('');
  lines.push('Now respond ONLY as the interviewer with your next question or follow-up. If the interview should wrap up, give a short closing message instead.');
  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Abuse protection: rate limit + body size cap ---
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
  }
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request body too large.' });
  }

  // Task requirement: use process.env.LLM_API_KEY (no hardcoded keys).
  // GEMINI_API_KEY kept as a fallback for existing deployments.
  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Interview chat is not configured on the server (LLM_API_KEY is missing).'
    });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
  const jobRole = typeof body.jobRole === 'string' && body.jobRole.trim()
    ? body.jobRole.trim()
    : 'General Software Engineer';
  const interviewType = typeof body.interviewType === 'string' ? body.interviewType.trim() : 'general';
  const targetedQuestions = Array.isArray(body.targetedQuestions) ? body.targetedQuestions : [];

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const prompt = buildPrompt({ jobRole, interviewType, targetedQuestions, history: conversationHistory });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      let detail = '';
      try {
        const j = await response.json();
        detail = (j && j.error && j.error.message) || JSON.stringify(j);
      } catch (e) {
        detail = await response.text();
      }

      const quotaExceeded =
        response.status === 429 ||
        /RESOURCE_EXHAUSTED|quota|limit\s*exceeded/i.test(detail);

      return res.status(quotaExceeded ? 429 : 502).json({
        error: quotaExceeded
          ? 'Gemini daily free quota exceeded. Please try again later or add billing at https://aistudio.google.com to raise your limits.'
          : 'Gemini API returned an error',
        detail: detail.slice(0, 400)
      });
    }

    const data = await response.json();
    const reply =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts
        .filter((p) => p && typeof p.text === 'string' && p.text.trim())
        .map((p) => p.text.trim())
        .join('\n');

    if (!reply) {
      return res.status(502).json({ error: 'Empty Gemini response' });
    }

    return res.status(200).json({ reply });
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? 'Gemini request timed out' : (e && e.message);
    return res.status(500).json({ error: 'Interview chat failed', detail: msg || 'unknown error' });
  }
}

