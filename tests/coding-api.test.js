import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeReq, makeRes, mockFetch, jsonResponse } from './helpers.js';
import handler from '../api/coding-questions.js';

const OLD_ENV = { ...process.env };
let net;
afterEach(() => { if (net) net.restore(); net = null; process.env = { ...OLD_ENV }; });

const get = async (query = {}, extra = {}) => {
  const res = makeRes();
  await handler(makeReq({ method: 'GET', query, ...extra }), res);
  return res;
};

test('coding api: only GET from the same site is accepted', async () => {
  let res = makeRes();
  await handler(makeReq({ method: 'POST' }), res);
  assert.equal(res.statusCode, 405);
  res = await get({}, { headers: { origin: 'https://evil.example' } });
  assert.equal(res.statusCode, 403);
});

test('coding api: a list page has summaries and facets, never the solutions or tests', async () => {
  const res = await get();
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.items.length, 30);
  assert.ok(body.total >= 250);
  assert.deepEqual(Object.keys(body.items[0]).sort(), ['approaches', 'difficulty', 'id', 'source', 'summary', 'targetRoles', 'title', 'topic']);
  assert.ok(body.facets.total >= 250);
  assert.ok(body.facets.difficulty.Easy >= 100 && body.facets.difficulty.Medium >= 100);
  assert.ok(Object.keys(body.facets.topics).length > 10);
  assert.ok(body.facets.roles.includes('SDE'));
  assert.match(res.headers['Cache-Control'], /s-maxage/);
});

test('coding api: filters, search and paging', async () => {
  const hard = (await get({ difficulty: 'Hard', limit: '100' })).json();
  assert.ok(hard.total >= 49);
  assert.ok(hard.items.every((q) => q.difficulty === 'Hard'));

  const trees = (await get({ topic: 'Trees', limit: '100' })).json();
  assert.ok(trees.items.length > 5 && trees.items.every((q) => q.topic === 'Trees'));

  const found = (await get({ q: 'two sum' })).json();
  assert.ok(found.items.some((q) => q.id === 'two-sum'));
  assert.ok(found.total < 20, 'search narrows the list');

  const first = (await get({ limit: '5', offset: '0' })).json();
  const next = (await get({ limit: '5', offset: '5' })).json();
  assert.equal(first.items.length, 5);
  assert.ok(first.items.every((q) => !next.items.some((n) => n.id === q.id)), 'pages do not overlap');

  const huge = (await get({ limit: '99999' })).json();
  assert.equal(huge.limit, 100, 'page size is capped');
});

test('coding api: solved and unsolved filters use include / exclude id lists', async () => {
  const solved = (await get({ include: 'two-sum,fizzbuzz' })).json();
  assert.deepEqual(solved.items.map((q) => q.id).sort(), ['fizzbuzz', 'two-sum']);
  const none = (await get({ include: '-' })).json();
  assert.equal(none.total, 0);
  const rest = (await get({ exclude: 'two-sum', limit: '100', difficulty: 'Easy' })).json();
  assert.ok(!rest.items.some((q) => q.id === 'two-sum'));
});

test('coding api: ids only, summaries by id, and one full question', async () => {
  const ids = (await get({ idsOnly: '1', difficulty: 'Medium' })).json();
  assert.equal(ids.ids.length, ids.total);
  assert.ok(ids.ids.includes('three-sum'));

  const items = (await get({ ids: 'two-sum,nope,fizzbuzz' })).json();
  assert.deepEqual(items.items.map((q) => q.id), ['two-sum', 'fizzbuzz']);

  const one = (await get({ id: 'two-sum' })).json();
  assert.equal(one.question.id, 'two-sum');
  assert.ok(one.question.testCases.length >= 5);
  assert.ok(one.question.approaches.length >= 2);
  assert.deepEqual(one.question.testCases[0], { stdin: '4\n2 7 11 15\n9\n', expectedStdout: '2\n0 1\n' });
  assert.deepEqual(one.question.io.in, [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }]);
  assert.equal('starterCode' in one.question, false, 'no language-specific starter: every language has its own template');
  assert.equal('prelude' in one, false);

  const missing = await get({ id: 'does-not-exist' });
  assert.equal(missing.statusCode, 404);
});

test('coding api: CODING_API_URL switches to the customer API, forwarding the query and the key', async () => {
  process.env.CODING_API_URL = 'https://questions.example.com/v1/coding/';
  process.env.CODING_API_KEY = 'secret-key';
  net = mockFetch(() => jsonResponse({ total: 1, offset: 0, limit: 30, items: [{ id: 'remote-1', title: 'Remote problem', difficulty: 'Easy', topic: 'Arrays' }], facets: { total: 1, difficulty: { Easy: 1 }, topics: { Arrays: 1 }, roles: [] } }));
  const res = await get({ difficulty: 'Easy', q: 'remote' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().items[0].id, 'remote-1');
  assert.equal(net.calls.length, 1);
  const url = new URL(net.calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://questions.example.com/v1/coding');
  assert.equal(url.searchParams.get('difficulty'), 'Easy');
  assert.equal(url.searchParams.get('q'), 'remote');
  assert.equal(net.calls[0].init.headers.Authorization, 'Bearer secret-key');
});

test('coding api: a broken customer API gives a clean 502, and 404 passes through', async () => {
  process.env.CODING_API_URL = 'https://questions.example.com/api';
  net = mockFetch(() => ({ ok: false, status: 500, json: async () => { throw new Error('not json'); } }));
  let res = await get({ id: 'x' });
  assert.equal(res.statusCode, 502);
  assert.doesNotMatch(res.body, /not json/);
  net.restore();
  net = mockFetch(() => jsonResponse({ error: 'Question not found.' }, 404));
  res = await get({ id: 'x' });
  assert.equal(res.statusCode, 404);
  net.restore();
  net = mockFetch(() => { throw new Error('network down'); });
  res = await get({});
  assert.equal(res.statusCode, 502);
});
