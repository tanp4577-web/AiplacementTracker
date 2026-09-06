/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — Live HR Interview AI (Groq API)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/interview-chat
   Body:     { history: [], answer: string, role?: string }
   Response: { evaluation: string, score: number, spoken_response: string }
   ========================================================================== */

const GROQ_MODEL = 'groq/compound-mini';

const SYSTEM_PROMPT = `You are a senior tech interviewer conducting a live HR/technical mock interview.
RULES:
1. Ask ONE concise question at a time.
2. Your very first question, when there is no prior history, MUST ask the candidate to say their name and give a brief introduction. Do not ask a technical question yet.
3. Evaluate the candidate's answer strictly and give actionable feedback.
4. Keep spoken_response conversational and under 2 sentences so TTS sounds natural.
Output strictly as a JSON object with keys:
"evaluation": "internal assessment of answer quality",
"score": 1-10 integer score,
"spoken_response": "what you will say directly to the candidate"`;

function buildMessages(history, answer, targetRole) {
  const roleContext = targetRole ? `\nThe candidate is interviewing for the role of: ${targetRole}.` : '';
  const messages = [{ role: 'system', content: SYSTEM_PROMPT + roleContext }];
  if (Array.isArray(history)) {
    history.forEach(item => {
      const content = item && (item.content || item.text);
      if (!content) return;
      messages.push({
        role: item.role === 'ai' || item.role === 'assistant' ? 'assistant' : 'user',
        content: String(content)
      });
    });
  }
  messages.push({
    role: 'user',
    content: answer
      ? `The candidate's latest spoken answer is: "${answer}"`
      : 'Begin the interview session with your opening question.'
  });
  return messages;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'GROQ_API_KEY is not configured' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const history = Array.isArray(body.history) ? body.history : [];
    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    const targetRole = typeof body.role === 'string' ? body.role.trim() : '';

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
        messages: buildMessages(history, answer, targetRole),
        response_format: { type: 'json_object' },
        temperature: 0.6
      })
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const completion = await response.json();
    const rawContent = completion.choices?.[0]?.message?.content || '{}';
    let cleanContent = rawContent.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    }

    let parsedJson = {};
    try {
      parsedJson = JSON.parse(cleanContent);
    } catch (e) {
      parsedJson = {
        evaluation: 'Candidate responded clearly.',
        score: 7,
        spoken_response: cleanContent.slice(0, 150)
      };
    }

    return res.status(200).json({
      evaluation: (parsedJson.evaluation || 'Answer received.').trim(),
      score: typeof parsedJson.score === 'number' ? parsedJson.score : 7,
      spoken_response: (parsedJson.spoken_response || parsedJson.evaluation || 'Thank you. Let us move to the next question.').trim()
    });
  } catch (error) {
    console.error('Interview chat error:', error);
    return res.status(200).json({
      evaluation: 'Good response.',
      score: 7,
      spoken_response: 'Thank you for your answer! Could you elaborate on how you handled technical challenges in your previous projects?'
    });
  }
}
