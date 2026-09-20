// api/jobs.js
// GET /api/jobs?source=<remote|india>&q=<keyword>&where=<city>&distance=<km>&page=<n>
// -> { jobs: [...], count, page, source }
//
// Two real, live sources — no hardcoded or AI-generated listings anywhere:
//
// source=remote (default): RemoteOK's public JSON API (remoteok.com/api).
//   No API key needed. RemoteOK's Terms of Service require attribution —
//   the frontend links back to remoteok.com on every job. Do not remove it.
//
// source=india: Adzuna's job search API, scoped to India (real local jobs
//   and internships — search a keyword like "internship" to filter to
//   those). Requires two free, instantly-issued keys from
//   https://developer.adzuna.com:
//     ADZUNA_APP_ID
//     ADZUNA_APP_KEY
//   Without them, this returns a clear configuration error — never a
//   fallback to fake data.

import { guard, send } from './_lib/guard.js';

const REMOTEOK_URL = 'https://remoteok.com/api';
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const ADZUNA_COUNTRY = 'in';

// RemoteOK's full feed is large and rarely changes, so keep it warm in memory
// per serverless instance and let Vercel's edge cache absorb repeat searches.
let remoteCache = { at: 0, raw: null };
const REMOTE_TTL_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  const ctx = await guard(req, res, {
    route: 'jobs',
    methods: ['GET'],
    limit: { max: 60, windowSec: 600 },
    globalDaily: 5000
  });
  if (!ctx) return;

  const source = req.query?.source === 'india' ? 'india' : 'remote';
  try {
    const result = source === 'india' ? await fetchIndia(req.query) : await fetchRemote(req.query);
    const status = result.status || 200;
    // Successful listings are public data: let the edge cache absorb repeat searches.
    const cache = status === 200 ? { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } : {};
    return send(res, status, result.body, cache);
  } catch (err) {
    console.error('api/jobs error:', err.message);
    return send(res, 502, { error: 'Could not fetch live job listings right now. Please try again shortly.' });
  }
}

// ── Remote (global), via RemoteOK — no key required ─────────────────────────
async function fetchRemote(query) {
  const { q = '', page = '1', results_per_page = '20' } = query || {};
  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.max(1, Math.min(50, Number(results_per_page) || 20));

  let raw = remoteCache.raw;
  if (!raw || Date.now() - remoteCache.at > REMOTE_TTL_MS) {
    const r = await fetch(REMOTEOK_URL, {
      headers: { 'User-Agent': 'AiplacementTracker-StudentProject/1.0 (+https://aiplacement-tracker.vercel.app)' },
      signal: AbortSignal.timeout(10_000)
    });
    if (!r.ok) throw new Error(`RemoteOK API responded ${r.status}`);
    raw = await r.json();
    remoteCache = { at: Date.now(), raw };
  }

  let jobs = Array.isArray(raw)
    ? raw.filter((item) => item && item.id && item.position).map(normalizeRemoteOkJob)
    : [];

  const keyword = String(q || '').trim().toLowerCase();
  if (keyword) {
    jobs = jobs.filter((job) => `${job.title} ${job.company} ${job.tags.join(' ')}`.toLowerCase().includes(keyword));
  }

  const count = jobs.length;
  const start = (pageNum - 1) * perPage;
  return { body: { jobs: jobs.slice(start, start + perPage), count, page: pageNum, source: 'remote' } };
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

function normalizeRemoteOkJob(job) {
  return {
    id: `remote_${job.id}`,
    source: 'remote',
    currency: 'USD',
    title: job.position || 'Untitled role',
    company: job.company || 'Company not disclosed',
    location: job.location && String(job.location).trim() ? String(job.location).trim() : 'Remote (worldwide)',
    tags: Array.isArray(job.tags) ? job.tags.slice(0, 8) : [],
    description: stripHtml(job.description).slice(0, 4000),
    salaryMin: typeof job.salary_min === 'number' && job.salary_min > 0 ? job.salary_min : null,
    salaryMax: typeof job.salary_max === 'number' && job.salary_max > 0 ? job.salary_max : null,
    salaryIsPredicted: false,
    created: job.date || null,
    applyUrl: job.apply_url || job.url || null,
    sourceUrl: job.url || null,
    sourceLabel: 'Remote OK'
  };
}

// ── India (local jobs + internships), via Adzuna — needs a free key ────────
async function fetchIndia(query) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return {
      status: 503,
      body: {
        error: 'Local India job data is not configured yet. Add ADZUNA_APP_ID and ADZUNA_APP_KEY in the server environment — free instant keys at https://developer.adzuna.com.',
        needsSetup: true
      }
    };
  }

  const { q = '', where = '', distance, page = '1', results_per_page = '20' } = query || {};
  const pageNum = Math.max(1, Math.min(50, Number(page) || 1));
  const perPage = Math.max(1, Math.min(50, Number(results_per_page) || 20));

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(perPage),
    'content-type': 'application/json'
  });
  if (q) params.set('what', String(q).slice(0, 100));
  if (where) params.set('where', String(where).slice(0, 100));
  if (distance) params.set('distance', String(Math.max(1, Math.min(300, Number(distance) || 50))));

  const url = `${ADZUNA_BASE}/${ADZUNA_COUNTRY}/search/${pageNum}?${params.toString()}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Adzuna API responded ${r.status}: ${text.slice(0, 200)}`);
  }
  const data = await r.json();
  const jobs = Array.isArray(data.results) ? data.results.map(normalizeAdzunaJob) : [];
  return { body: { jobs, count: data.count || jobs.length, page: pageNum, source: 'india' } };
}

function normalizeAdzunaJob(job) {
  return {
    id: `india_${job.id || job.adref || Math.random().toString(36).slice(2, 11)}`,
    source: 'india',
    currency: 'INR',
    title: job.title || 'Untitled role',
    company: job.company?.display_name || 'Company not disclosed',
    location: job.location?.display_name || 'Location not specified',
    tags: job.category?.label ? [job.category.label] : [],
    description: job.description || '',
    salaryMin: typeof job.salary_min === 'number' ? Math.round(job.salary_min) : null,
    salaryMax: typeof job.salary_max === 'number' ? Math.round(job.salary_max) : null,
    salaryIsPredicted: job.salary_is_predicted === '1' || job.salary_is_predicted === 1 || job.salary_is_predicted === true,
    created: job.created || null,
    applyUrl: job.redirect_url || null,
    sourceUrl: job.redirect_url || null,
    sourceLabel: 'Adzuna'
  };
}
