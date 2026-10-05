/* Vercel Serverless Function — AI aptitude question generator (Gemini).
   Endpoint: POST /api/aptitude   Body: { amount?, category?, difficulty? }
   Response: { questions: [...] }
   Protected by api/_lib/guard.js. */
import { guard, getBody, send } from './_lib/guard.js';
import { generateText, geminiConfigured, parseJsonLoose } from './_lib/gemini.js';

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
      const options = item.options.map((option) => String(option).trim().slice(0, 300)).filter(Boolean);
      const answer = Number(item.correct);
      return {
        id: `ai_${Date.now()}_${index}`,
        category: subject,
        difficulty,
        question: item.question.trim().slice(0, 1000),
        options,
        correct: Number.isInteger(answer) && answer >= 0 && answer < options.length ? answer : -1,
        explanation: typeof item.explanation === 'string' ? item.explanation.trim().slice(0, 1000) : ''
      };
    })
    .filter((item) => item.options.length === 4 && item.correct >= 0 && item.explanation);
}

export default async function handler(req, res) {
  const ctx = await guard(req, res, {
    route: 'aptitude',
    maxBodyBytes: 2_000,
    limit: { max: 10, windowSec: 600 },
    globalDaily: 1000
  });
  if (!ctx) return;

  if (!geminiConfigured()) return send(res, 503, { error: 'Question generation is not configured.' });

  const body = getBody(req);
  const amount = Math.min(Math.max(Number(body.amount) || 10, 1), 20);
  const category = Object.hasOwn(SUBJECTS, body.category) ? body.category : 'mixed';
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
    const text = await generateText({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
      timeoutMs: 25_000
    });
    const questions = cleanQuestions(parseJsonLoose(text), subject, difficulty);
    if (!questions.length) return send(res, 502, { error: 'Generated questions did not match the required format' });
    return send(res, 200, { questions });
  } catch (e) {
    console.error('Aptitude API error:', e.message);
    return send(res, 502, { error: 'Question generation failed' });
  }
}
