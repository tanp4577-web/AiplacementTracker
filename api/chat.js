/* ============================================================================
   Vercel Serverless Function — Live AI Chatbot (Google Gemini)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/chat
   Body:     { messages: [{role:'user'|'assistant', content}], context?: string }
   Response: { reply: string }

   Powers the in-app "PrepAI Assistant" chatbot with a REAL live LLM — no
   hardcoded canned responses. Uses Google Gemini (free tier, no credit card).

   Environment variables (all with safe defaults):
     - LLM_API_KEY     (REQUIRED)  Google Gemini API key. Get one free:
                                   https://aistudio.google.com/apikey
     - GEMINI_API_KEY  (fallback)  Legacy alias, used only if LLM_API_KEY unset.
     - GEMINI_MODEL    (optional)  default gemini-2.0-flash
     - GEMINI_BASE_URL (optional)  default https://generativelanguage.googleapis.com/v1beta

   If the key is missing, the browser-side fallback (Pollinations.ai free live
   LLM) is used automatically, so the bot is ALWAYS live.
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

function buildMessages({ messages, context }) {
  const system = [
    'You are PrepAI, a friendly, knowledgeable placement assistant for college students.',
    'You help with: resume tips and ATS optimization, HR and technical interview preparation,',
    'aptitude and reasoning practice, coding and DSA strategies, company-specific interview patterns,',
    'skill-gap analysis, learning roadmaps, and general career guidance for campus placements.',
    '',
    'Rules:',
    '- Give clear, actionable, concise answers (keep replies under ~120 words unless asked for depth).',
    '- Be encouraging and practical. Use plain text (no markdown, no bullet symbols beyond simple "-").',
    '- If the user shares their readiness/score context, tailor advice to it.',
    '- If asked about the app features, explain how to use them.',
    '- Never claim to be a human. You are an AI assistant.',
    '- Answer in the same language the user writes in.'
  ].join('\n');

  const msgs = [{ role: 'system', content: system }];

  if (context) {
    msgs.push({ role: 'system', content: `User context: ${context}` });
  }

  // Always seed at least one message
  const safe = Array.isArray(messages) && messages.length ? messages : [
    { role: 'user', content: 'Hi! How can you help me with my placements?' }
  ];

  safe.forEach((m) => {
    const role = m && (m.role === 'assistant' || m.role === 'ai') ? 'model' : 'user';
    const content = m && m.content ? String(m.content) : (m && m.text ? String(m.text) : '');
    if (content.trim()) msgs.push({ role, content });
  });

  // Gemini requires alternating roles; collapse consecutive same-role turns.
  const collapsed = [];
  msgs.forEach((m) => {
    const last = collapsed[collapsed.length - 1];
    if (last && last.role === m.role) {
      last.content += '\n' + m.content;
    } else {
      collapsed.push({ role: m.role, content: m.content });
    }
  });
  return collapsed;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // --- Abuse protection: rate limit + body size cap ---
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
  }
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request body too large.' });
  }

  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Not configured on server — client falls back to Pollinations (still live).
    return res.status(503).json({
      error: 'LLM_API_KEY not set on server — using browser-side live fallback.',
      fallback: true
    });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = typeof body.context === 'string' ? body.context : '';
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  try {
    const contents = buildMessages({ messages, context });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      let detail = '';
      try {
        const j = await response.json();
        detail = (j && j.error && j.error.message) || JSON.stringify(j);
      } catch (e) { detail = await response.text(); }
      const quotaExceeded = response.status === 429 || /RESOURCE_EXHAUSTED|quota|limit\s*exceeded/i.test(detail);
      return res.status(quotaExceeded ? 429 : 502).json({
        error: quotaExceeded
          ? 'Gemini daily free quota exceeded — using browser-side live fallback.'
          : 'Gemini API returned an error',
        detail: detail.slice(0, 300),
        fallback: true
      });
    }

    const data = await response.json();
    const reply =
      data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts
        ? data.candidates[0].content.parts
            .filter((p) => p && typeof p.text === 'string' && p.text.trim())
            .map((p) => p.text.trim())
            .join('\n')
        : '';

    if (!reply) return res.status(502).json({ error: 'Empty Gemini response', fallback: true });

    return res.status(200).json({ reply });
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? 'Gemini request timed out' : (e && e.message);
    return res.status(500).json({ error: 'Chat failed', detail: msg || 'unknown error', fallback: true });
  }
}

