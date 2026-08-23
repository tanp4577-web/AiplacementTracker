/* ============================================================================
   Vercel Serverless Function — C++ & Code Compiler Proxy
   ----------------------------------------------------------------------------
   Endpoint: POST /api/compile
   Body:     { code: string, stdin?: string, compiler?: string }
   Response: { program?: string, compiler_error?: string, stderr?: string }
   ========================================================================== */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const stdin = typeof body.stdin === 'string' ? body.stdin : '';
  const compiler = typeof body.compiler === 'string' ? body.compiler : 'gcc-head';

  if (!code.trim()) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler,
        code,
        options: 'warning,gnu++17',
        stdin
      })
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Compiler upstream error: HTTP ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({
      error: 'Compilation service temporarily unavailable',
      detail: err.message
    });
  }
}
