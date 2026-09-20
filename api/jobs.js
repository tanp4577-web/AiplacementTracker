// api/jobs.js
// GET /api/jobs?source=<india|remote>&q=<keyword>&internship=1&where=<city>&distance=<km>&page=<n>
// -> { jobs: [...], count, page, source, mode, notice? }
//
// Only real, live listings — nothing hardcoded or AI-generated.
//
// source=india  (the default in the UI): local jobs and internships.
//   With ADZUNA_APP_ID / ADZUNA_APP_KEY set (free, instant keys from
//   https://developer.adzuna.com) it searches Adzuna India, on-site and remote,
//   by keyword and city.  mode = "adzuna".
//   Without the keys — or if Adzuna is down — it does NOT return an empty page.
//   It falls back to real remote roles that accept candidates in India, from the
//   two key-free feeds below, and says so in `notice`.  mode = "remote-fallback".
//
// source=remote: the same two key-free feeds, worldwide.
//   - Remote OK (remoteok.com/api)     — requires a link back to remoteok.com
//   - Remotive  (remotive.com/api)     — requires a link back to the Remotive
//     listing and crediting Remotive; do not repost its jobs to other job boards.
//   The frontend shows both attributions on every listing. Do not remove them.
import { guard, send } from './_lib/guard.js';

const REMOTEOK_URL = 'https://remoteok.com/api';
const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs';
const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs';
const ADZUNA_COUNTRY = 'in';
const USER_AGENT = 'AiplacementTracker-StudentProject/1.0 (+https://aiplacement-tracker.vercel.app)';

// Both public feeds return everything in one response, so keep the normalised
// result warm per serverless instance (and let the edge cache absorb repeats).
// Remotive asks API users not to poll it often, so it gets a long TTL. If a feed
// errors, the last good copy is served instead of failing the whole page.
const FEED_TTL_MS = { remoteok: 10 * 60 * 1000, remotive: 6 * 60 * 60 * 1000 };
const feedCache = { remoteok: { at: 0, jobs: null }, remotive: { at: 0, jobs: null } };

/** Test hook: forget cached feeds. */
export function _resetFeedCache() {
  feedCache.remoteok = { at: 0, jobs: null };
  feedCache.remotive = { at: 0, jobs: null };
}

const hasAdzunaKeys = () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);

/* ------------------------------------------------------------ small helpers */

/** Only http(s) links may reach the browser — never javascript:/data: URLs from a third-party feed. */
export function safeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
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

const safeId = (prefix, raw) => `${prefix}_${String(raw).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60)}`;
const INTERN_RE = /\b(intern|interns|internship|internships|trainee|trainees|apprentice|apprenticeship|fresher|freshers|co-?op)\b/i;
const INDIA_OK_RE = /worldwide|anywhere|global|international|india|asia|apac|south asia|any location/i;

export const isInternship = (job) => INTERN_RE.test(`${job.title} ${(job.tags || []).join(' ')}`);

/** Remote roles that an applicant in India can actually take. */
export function indiaEligible(job) {
  const loc = String(job.location || '').trim();
  return !loc || INDIA_OK_RE.test(loc);
}

const tokenize = (text) => String(text || '').toLowerCase().match(/[a-z0-9+#.]+/g) || [];

/** Every word the user typed must appear in the title, company, tags or the start of the description. */
export function matchesKeyword(job, keyword) {
  const words = tokenize(keyword);
  if (!words.length) return true;
  const haystack = `${job.title} ${job.company} ${(job.tags || []).join(' ')} ${String(job.description || '').slice(0, 1500)}`.toLowerCase();
  return words.every((w) => haystack.includes(w));
}

function parseQuery(query) {
  const q = query || {};
  const num = (v, min, max, fallback) => Math.max(min, Math.min(max, Number(v) || fallback));
  return {
    keyword: String(q.q || '').trim().slice(0, 100),
    internship: q.internship === '1' || q.internship === 'true',
    where: String(q.where || '').trim().slice(0, 100),
    distance: num(q.distance, 1, 300, 50),
    page: num(q.page, 1, 50, 1),
    perPage: num(q.results_per_page, 1, 50, 20)
  };
}

/* --------------------------------------------- key-free remote feeds (cached) */

function normalizeRemoteOkJob(job) {
  const job2 = {
    id: safeId('remote', job.id),
    source: 'remote',
    currency: 'USD',
    title: stripHtml(job.position) || 'Untitled role',
    company: stripHtml(job.company) || 'Company not disclosed',
    location: job.location && String(job.location).trim() ? stripHtml(job.location) : 'Remote (worldwide)',
    tags: Array.isArray(job.tags) ? job.tags.filter((t) => typeof t === 'string').slice(0, 8) : [],
    description: stripHtml(job.description).slice(0, 4000),
    salaryMin: typeof job.salary_min === 'number' && job.salary_min > 0 ? job.salary_min : null,
    salaryMax: typeof job.salary_max === 'number' && job.salary_max > 0 ? job.salary_max : null,
    salaryIsPredicted: false,
    created: job.date || null,
    applyUrl: safeUrl(job.apply_url) || safeUrl(job.url),
    sourceUrl: safeUrl(job.url),
    sourceLabel: 'Remote OK'
  };
  return { ...job2, isInternship: isInternship(job2) };
}

function normalizeRemotiveJob(job) {
  const tags = [job.category, ...(Array.isArray(job.tags) ? job.tags : [])].filter((t) => typeof t === 'string' && t).slice(0, 8);
  const url = safeUrl(job.url);
  const job2 = {
    id: safeId('remotive', job.id),
    source: 'remote',
    currency: 'USD',
    title: stripHtml(job.title) || 'Untitled role',
    company: stripHtml(job.company_name) || 'Company not disclosed',
    location: job.candidate_required_location ? stripHtml(job.candidate_required_location) : 'Remote (worldwide)',
    tags,
    description: stripHtml(job.description).slice(0, 4000),
    salaryMin: null,
    salaryMax: null,
    salaryText: typeof job.salary === 'string' ? stripHtml(job.salary).slice(0, 80) : '',
    salaryIsPredicted: false,
    // Remotive timestamps are UTC without a zone suffix.
    created: job.publication_date ? `${String(job.publication_date).replace(/Z$/, '')}Z` : null,
    applyUrl: url,
    sourceUrl: url,
    sourceLabel: 'Remotive'
  };
  return { ...job2, isInternship: isInternship(job2) };
}

async function loadFeed(name, url, extract) {
  const slot = feedCache[name];
  if (slot.jobs && Date.now() - slot.at < FEED_TTL_MS[name]) return slot.jobs;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`${name} responded ${r.status}`);
    const jobs = extract(await r.json());
    feedCache[name] = { at: Date.now(), jobs };
    return jobs;
  } catch (err) {
    if (slot.jobs) {
      console.error(`api/jobs: ${name} failed, serving stale copy:`, err.message);
      return slot.jobs;
    }
    throw err;
  }
}

const loadRemoteOk = () =>
  loadFeed('remoteok', REMOTEOK_URL, (raw) =>
    Array.isArray(raw) ? raw.filter((item) => item && item.id && item.position).map(normalizeRemoteOkJob) : []
  );

const loadRemotive = () =>
  loadFeed('remotive', REMOTIVE_URL, (raw) =>
    raw && Array.isArray(raw.jobs) ? raw.jobs.filter((item) => item && item.id && item.title).map(normalizeRemotiveJob) : []
  );

/** Merge both feeds; one failing is fine, both failing throws. */
async function loadRemoteJobs() {
  const results = await Promise.allSettled([loadRemoteOk(), loadRemotive()]);
  const ok = results.filter((r) => r.status === 'fulfilled');
  if (!ok.length) throw new Error(results.map((r) => r.reason && r.reason.message).join('; '));
  results.filter((r) => r.status === 'rejected').forEach((r) => console.error('api/jobs feed failed:', r.reason.message));

  const seen = new Set();
  const merged = [];
  for (const job of ok.flatMap((r) => r.value)) {
    const key = `${job.title}|${job.company}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(job);
  }
  return merged.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
}

async function remoteSearch(opts, { indiaOnly }) {
  let jobs = await loadRemoteJobs();
  if (indiaOnly) jobs = jobs.filter(indiaEligible);
  if (opts.internship) jobs = jobs.filter((j) => j.isInternship);
  jobs = jobs.filter((j) => matchesKeyword(j, opts.keyword));
  const start = (opts.page - 1) * opts.perPage;
  return { jobs: jobs.slice(start, start + opts.perPage), count: jobs.length };
}

/* --------------------------------------------------- Adzuna India (needs keys) */

function normalizeAdzunaJob(job) {
  const job2 = {
    id: safeId('india', job.id || job.adref || Math.random().toString(36).slice(2, 11)),
    source: 'india',
    currency: 'INR',
    // Adzuna wraps matched words in <strong> tags.
    title: stripHtml(job.title) || 'Untitled role',
    company: stripHtml(job.company && job.company.display_name) || 'Company not disclosed',
    location: stripHtml(job.location && job.location.display_name) || 'Location not specified',
    tags: job.category && job.category.label ? [job.category.label] : [],
    description: stripHtml(job.description),
    salaryMin: typeof job.salary_min === 'number' ? Math.round(job.salary_min) : null,
    salaryMax: typeof job.salary_max === 'number' ? Math.round(job.salary_max) : null,
    salaryIsPredicted: job.salary_is_predicted === '1' || job.salary_is_predicted === 1 || job.salary_is_predicted === true,
    created: job.created || null,
    applyUrl: safeUrl(job.redirect_url),
    sourceUrl: safeUrl(job.redirect_url),
    sourceLabel: 'Adzuna'
  };
  return { ...job2, isInternship: isInternship(job2) };
}

async function adzunaSearch(opts) {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID,
    app_key: process.env.ADZUNA_APP_KEY,
    results_per_page: String(opts.perPage),
    sort_by: 'date',
    'content-type': 'application/json'
  });
  if (opts.keyword) params.set('what', opts.keyword);
  if (opts.internship) params.set('what_or', 'internship intern trainee');
  if (opts.where) {
    params.set('where', opts.where);
    params.set('distance', String(opts.distance));
  }

  const r = await fetch(`${ADZUNA_BASE}/${ADZUNA_COUNTRY}/search/${opts.page}?${params.toString()}`, {
    signal: AbortSignal.timeout(10_000)
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Adzuna API responded ${r.status}: ${text.slice(0, 200)}`);
  }
  const data = await r.json();
  const jobs = Array.isArray(data.results) ? data.results.map(normalizeAdzunaJob) : [];
  return { jobs, count: data.count || jobs.length };
}

async function indiaSearch(opts) {
  let notice;
  if (hasAdzunaKeys()) {
    try {
      const { jobs, count } = await adzunaSearch(opts);
      return { body: { jobs, count, page: opts.page, source: 'india', mode: 'adzuna' } };
    } catch (err) {
      console.error('api/jobs adzuna failed:', err.message);
      notice = 'Live on-site listings are temporarily unavailable, so these are remote roles open to candidates in India. Try again shortly, or use the search links below.';
    }
  } else {
    notice = 'On-site local listings are not connected on this deployment yet, so these are remote roles open to candidates in India. Use the search links below for city-specific jobs and internships.';
  }

  const { jobs, count } = await remoteSearch(opts, { indiaOnly: true });
  return {
    short: true,
    body: { jobs, count, page: opts.page, source: 'india', mode: 'remote-fallback', needsSetup: !hasAdzunaKeys(), notice }
  };
}

/* ------------------------------------------------------------------ handler */

export default async function handler(req, res) {
  const source = req.query?.source === 'remote' ? 'remote' : 'india';
  const ctx = await guard(req, res, {
    route: `jobs-${source}`,
    methods: ['GET'],
    limit: { max: 60, windowSec: 600 },
    // Adzuna's free tier allows a few hundred calls a day; the key-free feeds are cheap.
    globalDaily: source === 'india' && hasAdzunaKeys() ? 300 : 3000
  });
  if (!ctx) return;

  const opts = parseQuery(req.query);
  try {
    const result = source === 'india' ? await indiaSearch(opts) : { body: { ...(await remoteSearch(opts, { indiaOnly: false })), page: opts.page, source: 'remote', mode: 'remote' } };
    // Listings are public data: let the edge cache absorb repeat searches.
    // Fallback answers are cached briefly so a recovered Adzuna shows up quickly.
    const maxAge = result.short ? 60 : 300;
    return send(res, 200, result.body, { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` });
  } catch (err) {
    console.error('api/jobs error:', err.message);
    return send(res, 502, { error: 'Could not fetch live job listings right now. Please try again shortly.' });
  }
}
