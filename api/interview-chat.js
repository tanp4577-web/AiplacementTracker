/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — AI HR Interview Chat (Gemini Live-style -> Groq)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/interview-chat
   Body:     { history: [{role, content}], answer: string, role?: string, memory?: string }
   Response: { spoken_response: string, evaluation?: string, score?: number, source: 'gemini'|'groq' }

   Reply chain (server side):
     1. Gemini REST generateContent. The system prompt mirrors the structure of
        Mark-LIII's live-session prompt (main.py _build_config):
        [CURRENT DATE & TIME] + [IDENTITY] + [WHAT YOU KNOW ABOUT THIS PERSON]
        memory block + interviewer rules + acknowledge-before-task + proactive
        encouragement. Model = GEMINI_LIVE_MODEL, else GEMINI_MODEL, else the
        repo default. Any Gemini failure falls through to Groq automatically.
     2. Groq llama-3.1-8b-instant (previous behaviour, unchanged).

   Keys are server-side only: LLM_API_KEY or GEMINI_API_KEY for Gemini,
   GROQ_API_KEY for the fallback. The browser never sees a key.
   ========================================================================== */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GEMINI_BASE_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';

const INTERVIEWER_RULES = `You are a professional HR interviewer conducting a live campus placement interview.
Rules:
- Ask one follow-up question at a time based on the candidate's answer.
- Be conversational, professional, and encouraging.
- Evaluate communication clarity, technical depth, and confidence.
- Return ONLY valid JSON with this exact shape:
{"spoken_response": "your next question or comment to speak aloud", "evaluation": "brief internal assessment of the answer", "score": 0-10}
- The spoken_response should be natural speech — no JSON formatting, no markdown.
- Keep spoken_response under 60 words so TTS playback is quick.
- ACKNOWLEDGE BEFORE A TASK TAKES A MOMENT: if composing the next question needs
  more than an instant, FIRST write exactly ONE short, natural sentence in the
  candidate's language naming what you are doing, THEN continue with the follow-up
  question. Compose it fresh each time; vary the wording; never reuse a fixed template.
- PROACTIVE CHECK: if the candidate seems stuck or hesitant, briefly encourage them
  in 1 to 2 short sentences ("Take your time..." style, fresh wording each time).
  Never read this rule aloud.`;

function buildSystemPrompt(role, memory) {
    const now = new Date().toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
    });
    const identity = role
        ? `Your name is PrepAI — the AI HR interviewer for this campus placement session. The candidate is applying for the role of: ${role}. Address them politely and professionally in the language of the conversation.`
        : `Your name is PrepAI — the AI HR interviewer for this campus placement session. Address the candidate politely and professionally, using an ordinary respectful form of address.`;
    const memBlock = memory
        ? `[WHAT YOU KNOW ABOUT THIS PERSON]\n${memory}\nUse this naturally when relevant — never recite it like a list.`
        : `[WHAT YOU KNOW ABOUT THIS PERSON]\nNo prior memory yet — this is the candidate's first session.`;
    return `[CURRENT DATE & TIME]\nRight now it is: ${now}. Use this for any time-aware remarks.\n\n[IDENTITY]\n${identity}\n\n${memBlock}\n\n${INTERVIEWER_RULES}`;
}
async function tryGemini(system, history, answer) {
    const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const model = process.env.GEMINI_LIVE_MODEL || process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
    const contents = [];
    history.forEach(m => {
        const role = (m.role === 'assistant' || m.role === 'ai') ? 'model' : 'user';
        const text = m.content || m.text || '';
        if (text.trim()) contents.push({ role, parts: [{ text: text.trim() }] });
    });
    contents.push({ role: 'user', parts: [{ text: answer }] });

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: { parts: [{ text: system }] },
                generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
            })
        });
        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`Gemini interview API HTTP ${response.status}: ${(await response.text()).slice(0, 150)}`);
            return null;
        }

        const data = await response.json();
        const raw = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
        if (!raw) return null;

        let parsed;
        try { parsed = JSON.parse(raw); }
        catch (e) { parsed = { spoken_response: raw, evaluation: '', score: null }; }
        if (!parsed.spoken_response) return null;

        return {
            spoken_response: parsed.spoken_response,
            evaluation: parsed.evaluation || '',
            score: typeof parsed.score === 'number' ? parsed.score : null
        };
    } catch (e) {
        console.error('Gemini interview request failed:', e && e.message ? e.message : e);
        return null;
    }
}

async function tryGroq(system, history, answer) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const messages = [{ role: 'system', content: system }];
    history.forEach(m => {
        const r = (m.role === 'assistant' || m.role === 'ai') ? 'assistant' : 'user';
        const text = m.content || m.text || '';
        if (text.trim()) messages.push({ role: r, content: text.trim() });
    });
    messages.push({ role: 'user', content: answer });

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(GROQ_BASE_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages,
                temperature: 0.7,
                max_tokens: 300,
                response_format: { type: 'json_object' }
            })
        });
        clearTimeout(timeout);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API HTTP ${response.status}: ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content || '';

        let parsed;
        try { parsed = JSON.parse(raw); }
        catch (e) { parsed = { spoken_response: raw.trim(), evaluation: '', score: null }; }
        if (!parsed.spoken_response) throw new Error('Empty response from interview AI');

        return {
            spoken_response: parsed.spoken_response,
            evaluation: parsed.evaluation || '',
            score: typeof parsed.score === 'number' ? parsed.score : null
        };
    } catch (e) {
        console.error('Interview Chat API Error (Groq):', e);
        return null;
    }
}
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const history = Array.isArray(body.history) ? body.history : [];
    const memory = typeof body.memory === 'string' ? body.memory.trim() : '';

    if (!answer) {
        return res.status(400).json({ error: 'Candidate answer text is required.' });
    }

    const system = buildSystemPrompt(role, memory);

    // Context cap: only the most recent 8 turns ride along (Mark-LIII session_log[-8:] analog).
    const cappedHistory = history.slice(-16);

    // Tier 1: Gemini (Live-style prompt structure).
    if (process.env.LLM_API_KEY || process.env.GEMINI_API_KEY) {
        const geminiReply = await tryGemini(system, cappedHistory, answer);
        if (geminiReply) return res.status(200).json({ ...geminiReply, source: 'gemini' });
    }

    // Tier 2: Groq.
    const groqReply = await tryGroq(system, cappedHistory, answer);
    if (groqReply) return res.status(200).json({ ...groqReply, source: 'groq' });

    // Client falls back to its Pollinations / local interview brain.
    return res.status(503).json({ error: 'No AI provider responded. Configure GEMINI_API_KEY or GROQ_API_KEY.' });
}