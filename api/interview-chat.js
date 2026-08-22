import Groq from 'groq-sdk';

const SYSTEM_PROMPT = `You are a senior tech interviewer.
RULES:
1. Ask ONE question at a time.
2. Evaluate the user's previous answer strictly.
3. Keep spoken responses under 2 sentences.
Output strictly in JSON format with keys:
'evaluation': 'internal thought on candidate answer',
'score': integer 1-10,
'spoken_response': 'what you will say to the candidate'`;

function buildMessages(history, answer) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
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
      ? `The candidate's latest answer is: ${answer}`
      : 'Begin the interview with one opening question.'
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
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY is missing.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const history = Array.isArray(body.history) ? body.history : [];
    const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: buildMessages(history, answer),
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    });
    const content = completion.choices?.[0]?.message?.content;
    let cleanContent = (content || '').trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    }
    const parsedJson = JSON.parse(cleanContent || '{}');
    if (typeof parsedJson.evaluation !== 'string' ||
      !parsedJson.evaluation.trim() ||
      typeof parsedJson.score !== 'number' ||
      typeof parsedJson.spoken_response !== 'string' ||
      !parsedJson.spoken_response.trim()) {
      throw new Error('Groq response did not contain spoken_response.');
    }
    return res.status(200).json({
      evaluation: parsedJson.evaluation.trim(),
      score: parsedJson.score,
      spoken_response: parsedJson.spoken_response.trim()
    });
  } catch (error) {
    console.error('Groq interview request failed:', error);
    return res.status(500).json({ error: 'Interview chat failed.', detail: error.message || 'unknown error' });
  }
}
