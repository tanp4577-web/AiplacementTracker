/* Vercel Serverless Function - coding practice questions.
   Endpoint: GET /api/coding-questions
     ?id=two-sum                      one full question (code stubs, tests, approaches) + the test-helper prelude
     ?ids=a,b,c                       summaries for specific questions
     ?difficulty=Easy|Medium|Hard&topic=&role=&q=&include=a,b&exclude=c&offset=0&limit=30
                                      a page of summaries + facets (counts for the filters)
     ?...&idsOnly=1                   just the matching ids (used to build practice sessions)
   The questions are not bundled into the website. By default they come from api/_data/coding-bank.js on the
   server; set CODING_API_URL to read them from another API with this same contract (see README). */
import { guard, send } from './_lib/guard.js';
import { localAnswer, remoteAnswer, upstreamUrl } from './_lib/coding-source.js';

export default async function handler(req, res) {
  const ctx = await guard(req, res, {
    route: 'coding-questions',
    methods: ['GET'],
    limit: { max: 240, windowSec: 600 }
  });
  if (!ctx) return;

  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const flat = {};
  for (const [k, v] of Object.entries(query)) flat[k] = Array.isArray(v) ? v[0] : v;

  try {
    const out = upstreamUrl() ? await remoteAnswer(new URLSearchParams(flat)) : localAnswer(flat);
    // The bank only changes with a deployment, so browsers and the CDN may keep answers for a while.
    return send(res, out.status, out.body, out.status === 200 ? { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } : {});
  } catch (e) {
    console.error('Coding questions API error:', e.message);
    return send(res, 502, { error: 'The question service is not available. Please try again.' });
  }
}
