// api/jobs.js
// GET /api/jobs?q=<keyword>&page=<n>&results_per_page=<n>
// -> { jobs: [...], count, page }
//
// Fetches REAL, currently-open remote job listings from RemoteOK's public
// JSON API (https://remoteok.com/api) — no API key or signup required.
// Every returned job includes `applyUrl`, a direct link to the real
// original posting on RemoteOK.
//
// RemoteOK's API Terms of Service require attribution: any site using this
// data must link back to the job's URL on remoteok.com and credit RemoteOK
// as the source. The frontend (js/jobs.js) does this on every job card and
// in the Hiring Hub header — do not remove that attribution.

const REMOTEOK_URL = 'https://remoteok.com/api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q = '', page = '1', results_per_page = '20' } = req.query || {};
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.max(1, Math.min(50, Number(results_per_page) || 20));

  try {
    const r = await fetch(REMOTEOK_URL, {
      headers: {
        'User-Agent': 'AiplacementTracker-StudentProject/1.0 (+https://aiplacement-tracker.vercel.app)'
      }
    });
    if (!r.ok) {
      throw new Error(`RemoteOK API responded ${r.status}`);
    }
    const raw = await r.json();

    // First element is RemoteOK's own API terms/legal notice, not a job — drop it,
    // and drop any malformed entries that are missing the fields a real job needs.
    let jobs = Array.isArray(raw)
      ? raw.filter((item) => item && item.id && item.position).map(normalizeJob)
      : [];

    const keyword = String(q || '').trim().toLowerCase();
    if (keyword) {
      jobs = jobs.filter((job) => {
        const haystack = `${job.title} ${job.company} ${job.tags.join(' ')}`.toLowerCase();
        return haystack.includes(keyword);
      });
    }

    const count = jobs.length;
    const start = (pageNum - 1) * perPage;
    const pageItems = jobs.slice(start, start + perPage);

    return res.status(200).json({ jobs: pageItems, count, page: pageNum });
  } catch (err) {
    console.error('api/jobs error:', err.message);
    return res.status(502).json({ error: 'Could not fetch live job listings right now. Please try again shortly.' });
  }
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeJob(job) {
  return {
    id: String(job.id),
    title: job.position || 'Untitled role',
    company: job.company || 'Company not disclosed',
    location: job.location && String(job.location).trim() ? String(job.location).trim() : 'Remote (worldwide)',
    tags: Array.isArray(job.tags) ? job.tags.slice(0, 8) : [],
    description: stripHtml(job.description).slice(0, 4000),
    salaryMin: typeof job.salary_min === 'number' && job.salary_min > 0 ? job.salary_min : null,
    salaryMax: typeof job.salary_max === 'number' && job.salary_max > 0 ? job.salary_max : null,
    created: job.date || null,
    applyUrl: job.apply_url || job.url || null,
    sourceUrl: job.url || null
  };
}
