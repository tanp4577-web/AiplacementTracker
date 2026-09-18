// api/jobs.js
// GET /api/jobs?what=<keywords>&where=<city>&distance=<km>&page=<n>
// -> { jobs: [...], count, page }
//
// Fetches REAL, currently-open job listings from Adzuna's job search API
// (https://developer.adzuna.com) — Adzuna aggregates genuine vacancies from
// many real job boards and company sites across India. Every returned job
// includes `applyUrl`, a direct link to the real original posting.
//
// Requires two free env vars (instant signup at https://developer.adzuna.com):
//   ADZUNA_APP_ID
//   ADZUNA_APP_KEY
// If they're not set, this endpoint returns a clear error instead of
// silently falling back to fake data.

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const COUNTRY = 'in'; // India

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return res.status(503).json({
      error: 'Live job data is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in the server environment — free instant keys at https://developer.adzuna.com.'
    });
  }

  const { what = '', where = '', distance, page = '1', results_per_page = '20' } = req.query || {};
  const pageNum = Math.max(1, Math.min(50, Number(page) || 1));
  const perPage = Math.max(1, Math.min(50, Number(results_per_page) || 20));

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(perPage),
    'content-type': 'application/json'
  });
  if (what) params.set('what', String(what).slice(0, 100));
  if (where) params.set('where', String(where).slice(0, 100));
  if (distance) params.set('distance', String(Math.max(1, Math.min(300, Number(distance) || 50))));

  const url = `${ADZUNA_BASE}/${COUNTRY}/search/${pageNum}?${params.toString()}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(`Adzuna API responded ${r.status}: ${text.slice(0, 200)}`);
    }
    const data = await r.json();
    const jobs = Array.isArray(data.results) ? data.results.map(normalizeJob) : [];
    return res.status(200).json({ jobs, count: data.count || jobs.length, page: pageNum });
  } catch (err) {
    console.error('api/jobs error:', err.message);
    return res.status(502).json({ error: 'Could not fetch live job listings right now. Please try again shortly.' });
  }
}

function normalizeJob(job) {
  return {
    id: job.id ? String(job.id) : (job.adref || `job_${Math.random().toString(36).slice(2, 11)}`),
    title: job.title || 'Untitled role',
    company: job.company?.display_name || 'Company not disclosed',
    location: job.location?.display_name || 'Location not specified',
    latitude: typeof job.latitude === 'number' ? job.latitude : null,
    longitude: typeof job.longitude === 'number' ? job.longitude : null,
    description: job.description || '',
    category: job.category?.label || null,
    contractType: job.contract_type || null,
    contractTime: job.contract_time || null,
    salaryMin: typeof job.salary_min === 'number' ? Math.round(job.salary_min) : null,
    salaryMax: typeof job.salary_max === 'number' ? Math.round(job.salary_max) : null,
    salaryIsPredicted: job.salary_is_predicted === '1' || job.salary_is_predicted === 1 || job.salary_is_predicted === true,
    created: job.created || null,
    applyUrl: job.redirect_url || null
  };
}
