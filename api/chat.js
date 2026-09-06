/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — PrepAI Chatbot (Groq & Gemini Supported)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/chat
   Body:     { messages: [{role:'user'|'assistant', content}], context?: string }
   Response: { reply: string }
   ========================================================================== */

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const SYSTEM_PROMPT = `You are PrepAI, a friendly and highly capable placement assistant for college students.
You help with: resume ATS optimization, HR/technical mock interviews, aptitude quizzes, coding/DSA strategies, company patterns, and skill gap roadmaps.
Rules:
- Give clear, concise, actionable advice (under 120 words).
- Use clean plain text formatting.
- Be encouraging, practical, and direct.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'LLM_API_KEY or GEMINI_API_KEY is not configured' });

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = typeof body.context === 'string' ? body.context : '';

  const formattedMessages = [];
  messages.forEach(m => {
    const role = (m.role === 'assistant' || m.role === 'ai') ? 'model' : 'user';
    const text = m.content || m.text || '';
    if (text.trim()) formattedMessages.push({ role, parts: [{ text: text.trim() }] });
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const baseUrl = (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

    const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: formattedMessages,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT + (context ? `\nUser Context: ${context}` : '') }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      })
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API HTTP ${response.status}: ${errText.slice(0, 150)}`);
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!reply) throw new Error('Empty completion from Gemini API');

    return res.status(200).json({ reply });
  } catch (e) {
    console.error('Chat API Error:', e);
    return res.status(502).json({ error: 'Gemini chat request failed' });
  }
}
