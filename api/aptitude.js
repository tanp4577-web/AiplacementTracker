const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const SUBJECTS = {
  mixed: 'a balanced mix of quantitative aptitude, logical reasoning, and verbal reasoning',
  '18': 'computer science fundamentals, programming, data structures, algorithms, databases, operating systems, and computer networks',
  '9': 'general knowledge and general awareness',
  '19': 'mathematics and quantitative aptitude',
  '17': 'science fundamentals'
};

function cleanQuestions(value, subject, difficulty) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.question === 'string' && Array.isArray(item.options))
    .map((item, index) => {
      const options = item.options.map((option) => String(option).trim()).filter(Boolean);
      const answer = Number(item.correct);
      return {
        id: `ai_${Date.now()}_${index}`,
        category: subject,
        difficulty,
        question: item.question.trim(),
        options,
        correct: Number.isInteger(answer) && answer >= 0 && answer < options.length ? answer : -1,
        explanation: typeof item.explanation === 'string' ? item.explanation.trim() : ''
      };
    })
    .filter((item) => item.options.length === 4 && item.correct >= 0 && item.explanation);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'LLM_API_KEY is not configured' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const amount = Math.min(Math.max(Number(body.amount) || 10, 1), 20);
  const category = SUBJECTS[body.category] ? body.category : 'mixed';
  const difficulty = ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'medium';
  const subject = SUBJECTS[category];
  const prompt = [
    `Create exactly ${amount} original multiple-choice placement questions about ${subject}.`,
    `Difficulty: ${difficulty}. Do not repeat questions and do not use trivia unrelated to the subject.`,
    'Return only valid JSON, with no markdown, in this exact shape:',
    '[{"question":"...","options":["...","...","...","..."],"correct":0,"explanation":"..."}]',
    'The correct field is the zero-based index of the correct option. Every question must have exactly four options and a useful explanation.'
  ].join('\n');

  try {
    const baseUrl = (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 }
      })
    });
    if (!response.ok) return res.status(502).json({ error: 'Question generation failed' });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    const questions = cleanQuestions(JSON.parse(text), subject, difficulty);
    if (!questions.length) return res.status(502).json({ error: 'Generated questions did not match the required format' });
    return res.status(200).json({ questions });
  } catch (error) {
    return res.status(502).json({ error: 'Question generation failed' });
  }
}