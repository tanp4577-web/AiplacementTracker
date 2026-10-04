/* ============================================================================
   Vercel Serverless Function — Wandbox proxy (any language)
   ----------------------------------------------------------------------------
   The browser normally calls Wandbox directly. This proxy is the fallback for
   when that is blocked (extensions, school or office networks).

   GET  /api/compile?list=1   the live Wandbox compiler list (name, version, language, display-name)
   POST /api/compile          { code, stdin?, compiler }  ->  Wandbox's response fields

   The compiler must be one that Wandbox itself lists right now (the list is
   fetched live and kept for an hour), so every Wandbox language works without a
   code change and nothing else can be reached through this route. Code and
   input sizes are capped and requests are rate limited by api/_lib/guard.js.
   ========================================================================== */
import { guard, getBody, send } from './_lib/guard.js';

const LIST_URL = 'https://wandbox.org/api/list.json';
const COMPILE_URL = 'https://wandbox.org/api/compile.json';
const LIST_TTL_MS = 3600_000;
const MAX_CODE_CHARS = 30_000;
const MAX_STDIN_CHARS = 20_000;

let cached = null; // { at, list }

/** The live Wandbox list, trimmed to the fields the site needs. Throws when Wandbox cannot be reached. */
export async function wandboxList(now = Date.now()) {
  if (cached && now - cached.at < LIST_TTL_MS) return cached.list;
  const response = await fetch(LIST_URL, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) throw new Error('empty list');
  const list = data
    .filter((c) => c && typeof c.name === 'string' && typeof c.language === 'string')
    .map((c) => ({ name: c.name, version: String(c.version || ''), language: c.language, 'display-name': String(c['display-name'] || c.name) }));
  cached = { at: now, list };
  return list;
}

export function resetWandboxCache() { cached = null; }

export default async function handler(req, res) {
  const ctx = await guard(req, res, {
    route: 'compile',
    methods: ['GET', 'POST'],
    maxBodyBytes: 80_000,
    limit: { max: 200, windowSec: 600 },
    globalDaily: 20_000
  });
  if (!ctx) return;

  if (req.method === 'GET') {
    try {
      const list = await wandboxList();
      return send(res, 200, list, { 'Cache-Control': 'public, max-age=600, s-maxage=3600' });
    } catch (err) {
      console.error('Wandbox list error:', err.message);
      return send(res, 502, { error: 'The language list is temporarily unavailable' });
    }
  }

  const body = getBody(req);
  const code = typeof body.code === 'string' ? body.code : '';
  const stdin = typeof body.stdin === 'string' ? body.stdin : '';
  const compiler = typeof body.compiler === 'string' ? body.compiler : '';

  if (!code.trim()) return send(res, 400, { error: 'Code is required' });
  if (code.length > MAX_CODE_CHARS) return send(res, 413, { error: 'Code is too long' });
  if (stdin.length > MAX_STDIN_CHARS) return send(res, 413, { error: 'Input is too long' });

  let list;
  try {
    list = await wandboxList();
  } catch (err) {
    console.error('Wandbox list error:', err.message);
    return send(res, 502, { error: 'Compilation service temporarily unavailable' });
  }
  if (!list.some((c) => c.name === compiler)) return send(res, 400, { error: 'Unsupported compiler' });

  try {
    const response = await fetch(COMPILE_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(25_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compiler, code, stdin, save: false })
    });

    if (!response.ok) {
      return send(res, 502, { error: `Compiler upstream error: HTTP ${response.status}` });
    }

    const data = await response.json();
    // Pass Wandbox's response through (the page reads several of its fields), but cap every string so a huge
    // program output can't flood clients.
    const out = {};
    for (const [key, value] of Object.entries(data && typeof data === 'object' ? data : {})) {
      out[key] = typeof value === 'string' ? value.slice(0, 20_000) : value;
    }
    return send(res, 200, out);
  } catch (err) {
    console.error('Compile API error:', err.message);
    return send(res, 502, { error: 'Compilation service temporarily unavailable' });
  }
}
