/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — AI HR Interview Chat (Groq)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/interview-chat
   Body:     { history: [{role, content}], answer: string, role?: string }
   Response: { spoken_response: string, evaluation?: string, score?: number }
   ========================================================================== */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are a professional HR interviewer conducting a live campus placement interview.
Rules:
- Ask one follow-up question at a time based on the candidate's answer.
- Be conversational, professional, and encouraging.
- Evaluate communication clarity, technical depth, and confidence.
- Return ONLY valid JSON with this exact shape:
{"spoken_response": "your next question or comment to speak aloud", "evaluation": "brief internal assessment of the answer", "score": 0-10}
- The spoken_response should be natural speech — no JSON formatting, no markdown.
- Keep spoken_response under 60 words so TTS playback is quick.`;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'GROQ_API_KEY is not configured. Interview chat requires a Groq API key.' });
    }

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    const role = typeof body.role === 'string' ? body.role : '';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!answer) {
        return res.status(400).json({ error: 'Candidate answer text is required.' });
    }

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT + (role ? `\nThe candidate is applying for: ${role}` : '') }
    ];

    // Add conversation history
    history.forEach(m => {
        const r = (m.role === 'assistant' || m.role === 'ai') ? 'assistant' : 'user';
        const text = m.content || m.text || '';
        if (text.trim()) messages.push({ role: r, content: text.trim() });
    });

    // Add the current answer
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
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            // If Groq didn't return valid JSON, use the raw text as spoken response
            parsed = { spoken_response: raw.trim(), evaluation: '', score: null };
        }

        if (!parsed.spoken_response) {
            throw new Error('Empty response from interview AI');
        }

        return res.status(200).json({
            spoken_response: parsed.spoken_response,
            evaluation: parsed.evaluation || '',
            score: typeof parsed.score === 'number' ? parsed.score : null
        });
    } catch (e) {
        console.error('Interview Chat API Error:', e);
        return res.status(502).json({ error: 'Interview AI request failed: ' + (e.message || 'Unknown error') });
    }
}
