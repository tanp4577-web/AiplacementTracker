/* ============================================================================
   api/_lib/guard.js — shared abuse protection for PlacementPrep serverless routes.

   Call `await guard(req, res, {...})` at the top of every route. Files and
   folders starting with "_" are not deployed as routes by Vercel.

   Checks, in order:
     1. HTTP method allow-list
     2. Same-origin check (blocks other websites and casual curl/script abuse)
     3. Request-size cap via Content-Length
     4. Per-client rate limit (Upstash Redis if configured, else in-memory)
     5. Optional global daily cap per route (a circuit breaker for your API bill)

   Honest limits: headers can be forged by a determined attacker, so the rate
   limits and the daily cap are what actually protect your quota. Set the
   UPSTASH_* variables in production: the in-memory fallback is per serverless
   instance and resets on cold start.
   ========================================================================== */

const memoryHits = new Map(); // key -> { count, resetAt }

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

export function send(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries({ ...BASE_HEADERS, ...extraHeaders })) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

export function isSameOrigin(req) {
  // Browsers set Sec-Fetch-Site themselves; page JavaScript cannot forge it.
  if (req.headers['sec-fetch-site'] === 'same-origin') return true;

  const source = req.headers.origin || req.headers.referer || '';
  if (!source) {
    // A browser always sends Sec-Fetch-Site/Origin/Referer on same-site calls.
    // Nothing at all => curl/script. Only tolerate that in local development.
    return process.env.VERCEL_ENV !== 'production' && !req.headers['sec-fetch-site'];
  }
  let parsed;
  try {
    parsed = new URL(source);
  } catch {
    return false;
  }
  if (parsed.host === req.headers.host) return true;
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(parsed.origin);
}

async function upstashHit(key, windowSec) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSec * 2]
    ]),
    signal: AbortSignal.timeout(2500)
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  const data = await r.json();
  const count = Number(data[0] && data[0].result);
  if (!Number.isFinite(count)) throw new Error('bad upstash response');
  return count;
}

function memoryHit(key, windowSec) {
  const now = Date.now();
  if (memoryHits.size > 5000) {
    for (const [k, v] of memoryHits) if (v.resetAt <= now) memoryHits.delete(k);
  }
  let entry = memoryHits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowSec * 1000 };
    memoryHits.set(key, entry);
  }
  entry.count += 1;
  return entry.count;
}

export async function rateLimit(key, max, windowSec) {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  let count = null;
  try {
    count = await upstashHit(`rl:${key}:${bucket}`, windowSec);
  } catch (e) {
    console.error('rate limiter falling back to memory:', e.message);
  }
  if (count == null) count = memoryHit(key, windowSec);
  const retryAfter = windowSec - (Math.floor(Date.now() / 1000) % windowSec);
  return { allowed: count <= max, remaining: Math.max(0, max - count), retryAfter };
}

/**
 * @param {object} req Vercel/Node request
 * @param {object} res Vercel/Node response
 * @param {object} [options]
 * @param {string}   [options.route]        short name used in rate-limit keys
 * @param {string[]} [options.methods]      allowed HTTP methods (default POST)
 * @param {number}   [options.maxBodyBytes] reject larger Content-Length
 * @param {{max:number,windowSec:number}} [options.limit] per-client limit
 * @param {number}   [options.globalDaily]  total calls/day for this route, 0 = off
 * @returns {Promise<{ip:string}|null>} null => response already sent, just `return`
 */
export async function guard(req, res, options = {}) {
  const o = {
    route: 'api',
    methods: ['POST'],
    maxBodyBytes: 200_000,
    limit: { max: 20, windowSec: 600 },
    globalDaily: 0,
    ...options
  };

  if (!o.methods.includes(req.method)) {
    send(res, 405, { error: 'Method not allowed' }, { Allow: o.methods.join(', ') });
    return null;
  }
  if (!isSameOrigin(req)) {
    send(res, 403, { error: 'Forbidden' });
    return null;
  }
  const length = Number(req.headers['content-length'] || 0);
  if (length > o.maxBodyBytes) {
    send(res, 413, { error: 'Request too large' });
    return null;
  }

  const ip = clientIp(req);
  const rl = await rateLimit(`${o.route}:${ip}`, o.limit.max, o.limit.windowSec);
  if (!rl.allowed) {
    send(res, 429, { error: 'Too many requests. Please slow down and try again shortly.' }, { 'Retry-After': String(rl.retryAfter) });
    return null;
  }

  if (o.globalDaily > 0) {
    const g = await rateLimit(`${o.route}:global`, o.globalDaily, 86400);
    if (!g.allowed) {
      send(res, 429, { error: 'Daily capacity reached. Please try again tomorrow.' }, { 'Retry-After': String(g.retryAfter) });
      return null;
    }
  }

  for (const [k, v] of Object.entries(BASE_HEADERS)) res.setHeader(k, v);
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  return { ip };
}

/** Vercel usually parses JSON bodies for you; this handles string/empty cases safely. */
export function getBody(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return {};
}

/** Trim, strip NUL bytes, and cap length so callers can't make you pay for a novel. */
export function clampText(value, max) {
  if (typeof value !== 'string') return '';
  return value.replaceAll('\u0000', '').trim().slice(0, max);
}

/** Keep only short, non-empty strings from an untrusted array (e.g. model output). */
export function cleanStringList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}
