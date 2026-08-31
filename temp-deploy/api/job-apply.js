/* Vercel Serverless Function - resume-to-job ATS matching. */
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function screeningPrompt({ jobTitle, locationType, jobDescription, resumeText }) {
  return `You are an expert ATS screener and HR talent acquisition AI.

Job Title: ${jobTitle}
Target Location Type: ${locationType}
Job Description: ${jobDescription}
Candidate Resume Text: ${resumeText}

Calculate a match score from 0 to 100. Identify exactly up to 3 matched skills and exactly up to 3 missing or weak skills. Generate exactly 3 concise voice-interview questions tailored to the missing or weak areas.
Return ONLY valid JSON with this shape:
{"matchScore": number, "matchedSkills": [string], "missingSkills": [string], "recommendedInterviewQuestions": [string, string, string]}`;
}

function parseJson(text) {
  const cleaned = String(text || '').replace(/^```json\s*|^```\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Resume matching is not configured.' });

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  const fields = ['jobTitle', 'locationType', 'jobDescription', 'resumeText'];
  if (fields.some(field => typeof body[field] !== 'string' || !body[field].trim())) {
    return res.status(400).json({ error: 'Job details and readable resume text are required.' });
  }
  if (body.resumeText.length > 100000) return res.status(413).json({ error: 'Resume is too large.' });

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.GEMINI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  try {
    const response = await fetch(`${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { responseMimeType: 'application/json' },
        contents: [{ parts: [{ text: screeningPrompt(body) }] }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: 'Gemini resume analysis failed.' });
    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
    const parsed = parseJson(text);
    return res.status(200).json({
      matchScore: Math.max(0, Math.min(100, Number(parsed.matchScore) || 0)),
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills.slice(0, 3) : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills.slice(0, 3) : [],
      recommendedInterviewQuestions: Array.isArray(parsed.recommendedInterviewQuestions)
        ? parsed.recommendedInterviewQuestions.slice(0, 3)
        : []
    });
  } catch (error) {
    return res.status(502).json({ error: 'Could not parse Gemini resume analysis.' });
  }
}
