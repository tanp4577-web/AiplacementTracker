/* Where the coding questions come from.

   Default: the verified bank in api/_data/coding-bank.js (built by tools/coding-bank). It lives on the server,
   so the browser downloads only the list page or the one question it needs.

   Optional: set CODING_API_URL to use the customer's own question API instead. That API must answer the same
   GET query strings as /api/coding-questions and return the same JSON (documented in the README). Set
   CODING_API_KEY if it needs a bearer token. Nothing else in the site changes. */
import { CODING_BANK } from '../_data/coding-bank.js';

const MAX_IDS = 400;

export const upstreamUrl = () => (process.env.CODING_API_URL || '').trim().replace(/\/+$/, '');

const firstLine = (text) => String(text || '').split('\n')[0].slice(0, 220);

/** What the list page needs: no code, tests or approaches. */
export function summary(q) {
  return {
    id: q.id,
    title: q.title,
    difficulty: q.difficulty,
    topic: q.topic || 'General',
    targetRoles: q.targetRoles || [],
    source: q.source || 'PlacementPrep',
    summary: firstLine(q.description),
    approaches: Array.isArray(q.approaches) ? q.approaches.length : 0
  };
}

const csv = (value, max = MAX_IDS) => String(value || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, max);
const int = (value, fallback, lo, hi) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

function facets() {
  const difficulty = { Easy: 0, Medium: 0, Hard: 0 };
  const topics = {};
  const roles = new Set();
  for (const q of CODING_BANK) {
    difficulty[q.difficulty] = (difficulty[q.difficulty] || 0) + 1;
    topics[q.topic || 'General'] = (topics[q.topic || 'General'] || 0) + 1;
    (q.targetRoles || []).forEach((r) => roles.add(r));
  }
  return { total: CODING_BANK.length, difficulty, topics, roles: [...roles].sort() };
}

function matching(query) {
  const include = query.include ? new Set(csv(query.include)) : null;
  const exclude = new Set(csv(query.exclude));
  const needle = String(query.q || '').trim().toLowerCase().slice(0, 80);
  return CODING_BANK.filter((q) => {
    if (query.difficulty && query.difficulty !== 'all' && q.difficulty !== query.difficulty) return false;
    if (query.topic && query.topic !== 'all' && (q.topic || 'General') !== query.topic) return false;
    if (query.role && query.role !== 'all' && !(q.targetRoles || []).includes(query.role)) return false;
    if (include && !include.has(q.id)) return false;
    if (exclude.has(q.id)) return false;
    if (needle && !`${q.title} ${q.topic || ''} ${q.description || ''}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}

/** Answers one request from the bundled bank. Returns { status, body }. */
export function localAnswer(query) {
  if (query.id) {
    const q = CODING_BANK.find((x) => x.id === String(query.id));
    return q ? { status: 200, body: { question: q } } : { status: 404, body: { error: 'Question not found.' } };
  }
  if (query.ids) {
    const want = csv(query.ids, 100);
    return { status: 200, body: { items: want.map((id) => CODING_BANK.find((q) => q.id === id)).filter(Boolean).map(summary) } };
  }
  const all = matching(query);
  if (query.idsOnly) return { status: 200, body: { total: all.length, ids: all.slice(0, 1000).map((q) => q.id) } };
  const offset = int(query.offset, 0, 0, 100000);
  const limit = int(query.limit, 30, 1, 100);
  return { status: 200, body: { total: all.length, offset, limit, items: all.slice(offset, offset + limit).map(summary), facets: facets() } };
}

/** Forwards the same query to the customer's API and returns its JSON. */
export async function remoteAnswer(searchParams) {
  const headers = { Accept: 'application/json' };
  if (process.env.CODING_API_KEY) headers.Authorization = `Bearer ${process.env.CODING_API_KEY}`;
  const res = await fetch(`${upstreamUrl()}?${searchParams.toString()}`, { headers, signal: AbortSignal.timeout(8000) });
  const body = await res.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new Error(`The question API answered with an unreadable response (status ${res.status}).`);
  return { status: res.ok ? 200 : res.status === 404 ? 404 : 502, body: res.ok || res.status === 404 ? body : { error: 'The question API is not available.' } };
}
