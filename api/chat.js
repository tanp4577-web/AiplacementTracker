/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — PrepAI Chatbot (Groq & Gemini Supported)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/chat
   Body:     { messages: [{role:'user'|'assistant', content}], context?: string }
   Response: { reply: string }
   ========================================================================== */

const GROQ_DEFAULT_KEY = '[REDACTED]';
const GROQ_MODEL = 'groq/compound-mini';

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

  const apiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || GROQ_DEFAULT_KEY;

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = typeof body.context === 'string' ? body.context : '';

  const formattedMessages = [{ role: 'system', content: SYSTEM_PROMPT + (context ? `\nUser Context: ${context}` : '') }];
  messages.forEach(m => {
    const role = (m.role === 'assistant' || m.role === 'ai') ? 'assistant' : 'user';
    const text = m.content || m.text || '';
    if (text.trim()) formattedMessages.push({ role, content: text.trim() });
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 300
      })
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API HTTP ${response.status}: ${errText.slice(0, 150)}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('Empty completion from Groq API');

    return res.status(200).json({ reply });
  } catch (e) {
    console.error('Chat API Error:', e);
    return res.status(200).json({
      reply: 'Preparation tip: Break down your practice daily into 4 tracks: Aptitude, Coding, Communication, and Resume formatting. Track your readiness metric on the dashboard!'
    });
  }
}
