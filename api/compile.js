/* ============================================================================
   Vercel Serverless Function — C++ Compiler Proxy (Wandbox)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/compile
   Body:     { code: string, stdin?: string, compiler?: string }
   Response: { program?: string, compiler_error?: string, stderr?: string }
   Protected by api/_lib/guard.js. The compiler must be on the allow-list, and
   code/stdin sizes are capped so this can't be used as a free general-purpose
   proxy to Wandbox.
   ========================================================================== */
import { guard, getBody, send } from './_lib/guard.js';

const ALLOWED_COMPILERS = new Set(['gcc-head', 'gcc-13.2.0', 'gcc-14.1.0', 'clang-head']);
const MAX_CODE_CHARS = 30_000;
const MAX_STDIN_CHARS = 5_000;

export default async function handler(req, res) {
  const ctx = await guard(req, res, {
    route: 'compile',
    maxBodyBytes: 60_000,
    limit: { max: 30, windowSec: 600 },
    globalDaily: 3000
  });
  if (!ctx) return;

  const body = getBody(req);
  const code = typeof body.code === 'string' ? body.code : '';
  const stdin = typeof body.stdin === 'string' ? body.stdin : '';
  const compiler = typeof body.compiler === 'string' ? body.compiler : 'gcc-head';

  if (!code.trim()) return send(res, 400, { error: 'Code is required' });
  if (code.length > MAX_CODE_CHARS) return send(res, 413, { error: 'Code is too long' });
  if (stdin.length > MAX_STDIN_CHARS) return send(res, 413, { error: 'Input is too long' });
  if (!ALLOWED_COMPILERS.has(compiler)) return send(res, 400, { error: 'Unsupported compiler' });

  try {
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compiler, code, options: 'warning,gnu++17', stdin })
    });

    if (!response.ok) {
      return send(res, 502, { error: `Compiler upstream error: HTTP ${response.status}` });
    }

    const data = await response.json();
    // Pass Wandbox's response through unchanged (the frontend reads several of
    // its fields), but cap every string so a huge program output can't flood clients.
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
