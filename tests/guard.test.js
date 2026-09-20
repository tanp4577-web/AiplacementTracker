import test from 'node:test';
import assert from 'node:assert/strict';
import { guard, getBody, clampText, cleanStringList } from '../api/_lib/guard.js';
import { makeReq, makeRes, freshIp } from './helpers.js';

test('rejects methods that are not allowed', async () => {
  const res = makeRes();
  assert.equal(await guard(makeReq({ method: 'GET' }), res, { route: 't-method' }), null);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
});

test('rejects cross-origin requests', async () => {
  const res = makeRes();
  const req = makeReq({ headers: { origin: 'https://evil.example' } });
  assert.equal(await guard(req, res, { route: 't-origin' }), null);
  assert.equal(res.statusCode, 403);
});

test('accepts Sec-Fetch-Site: same-origin and rejects cross-site', async () => {
  const ok = makeReq({ headers: { origin: undefined, 'sec-fetch-site': 'same-origin' } });
  assert.ok(await guard(ok, makeRes(), { route: 't-sfs-ok' }));

  const bad = makeReq({ headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' } });
  const res = makeRes();
  assert.equal(await guard(bad, res, { route: 't-sfs-bad' }), null);
  assert.equal(res.statusCode, 403);
});

test('allows extra origins from ALLOWED_ORIGINS', async () => {
  process.env.ALLOWED_ORIGINS = 'https://custom.example';
  const req = makeReq({ headers: { origin: 'https://custom.example' } });
  const out = await guard(req, makeRes(), { route: 't-allowed' });
  delete process.env.ALLOWED_ORIGINS;
  assert.ok(out);
});

test('blocks requests with no origin info in production, allows them in dev', async () => {
  const bare = () => makeReq({ headers: { origin: undefined } });
  process.env.VERCEL_ENV = 'production';
  const prod = makeRes();
  assert.equal(await guard(bare(), prod, { route: 't-bare-prod' }), null);
  assert.equal(prod.statusCode, 403);
  delete process.env.VERCEL_ENV;
  assert.ok(await guard(bare(), makeRes(), { route: 't-bare-dev' }));
});

test('rejects oversized bodies', async () => {
  const res = makeRes();
  const req = makeReq({ headers: { 'content-length': '999999' } });
  assert.equal(await guard(req, res, { route: 't-size', maxBodyBytes: 1000 }), null);
  assert.equal(res.statusCode, 413);
});

test('rate limits per IP and leaves other IPs alone', async () => {
  const opts = { route: 't-rate', limit: { max: 2, windowSec: 600 } };
  const ip = freshIp();
  const call = (addr) => guard(makeReq({ headers: { 'x-forwarded-for': addr } }), makeRes(), opts);
  assert.ok(await call(ip));
  assert.ok(await call(ip));
  const res = makeRes();
  assert.equal(await guard(makeReq({ headers: { 'x-forwarded-for': ip } }), res, opts), null);
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.headers['Retry-After']) > 0);
  assert.ok(await call(freshIp()));
});

test('global daily cap stops all callers', async () => {
  const opts = { route: 't-global', globalDaily: 2, limit: { max: 50, windowSec: 600 } };
  assert.ok(await guard(makeReq(), makeRes(), opts));
  assert.ok(await guard(makeReq(), makeRes(), opts));
  const res = makeRes();
  assert.equal(await guard(makeReq(), res, opts), null);
  assert.equal(res.statusCode, 429);
});

test('getBody, clampText and cleanStringList behave safely', () => {
  assert.deepEqual(getBody({ body: { a: 1 } }), { a: 1 });
  assert.deepEqual(getBody({ body: '{"a":2}' }), { a: 2 });
  assert.deepEqual(getBody({ body: 'not json' }), {});
  assert.deepEqual(getBody({}), {});
  assert.equal(clampText('  hello\u0000 world  ', 8), 'hello wo');
  assert.equal(clampText(42, 10), '');
  assert.deepEqual(cleanStringList(['ok', 5, { x: 1 }, '  spaced  ', ''], 5, 4), ['ok', 'spac']);
  assert.deepEqual(cleanStringList('nope', 5, 10), []);
});
