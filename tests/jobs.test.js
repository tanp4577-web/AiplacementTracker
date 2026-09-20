import test, { beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { makeReq, makeRes, mockFetch, jsonResponse } from './helpers.js';
import jobs, { _resetFeedCache, safeUrl, isInternship, indiaEligible, matchesKeyword } from '../api/jobs.js';

const OLD_ENV = { ...process.env };
let net;

/* Minimal copies of what the real feeds return. */
const remoteOkFeed = [
  { legal: 'terms of service' },
  { id: 101, position: 'Backend Developer', company: 'Acme', location: '', tags: ['node', 'sql'], description: '<p>Build <b>APIs</b> &amp; services</p>', date: '2026-09-18T10:00:00Z', url: 'https://remoteok.com/remote-jobs/101', apply_url: 'javascript:alert(1)' },
  { id: 102, position: 'Software Engineering Intern', company: 'Globex', location: 'Worldwide', tags: ['intern', 'python'], description: 'Learn on the job', date: '2026-09-19T10:00:00Z', url: 'https://remoteok.com/remote-jobs/102' },
  { id: 103, position: 'Frontend Developer', company: 'Initech', location: 'United States', tags: ['react'], description: 'US only role', date: '2026-09-10T10:00:00Z', url: 'https://remoteok.com/remote-jobs/103' }
];
const remotiveFeed = {
  jobs: [
    { id: 201, url: 'https://remotive.com/remote-jobs/software-dev/python-developer-201', title: 'Python Developer', company_name: 'Umbrella', category: 'Software Development', tags: ['python'], job_type: 'full_time', publication_date: '2026-09-17T08:30:00', candidate_required_location: 'APAC', salary: '$40k-$60k', description: '<p>Python services</p>' },
    { id: 202, url: 'https://remotive.com/remote-jobs/software-dev/backend-developer-202', title: 'Backend Developer', company_name: 'Acme', category: 'Software Development', tags: [], candidate_required_location: 'Worldwide', publication_date: '2026-09-01T08:30:00', description: 'dup of RemoteOK 101 (same title + company)' },
    { id: 203, url: 'https://remotive.com/remote-jobs/x/usa-only-203', title: 'Data Analyst', company_name: 'Hooli', category: 'Data', tags: [], candidate_required_location: 'USA Only', publication_date: '2026-09-05T08:30:00', description: 'US only' }
  ]
};
const adzunaFeed = {
  count: 2,
  results: [
    { id: '9001', title: 'Junior <strong>Developer</strong> Intern', company: { display_name: 'Zoho' }, location: { display_name: 'Chennai, Tamil Nadu' }, category: { label: 'IT Jobs' }, description: 'Trainee developer role', salary_min: 300000, salary_max: 480000, salary_is_predicted: '1', created: '2026-09-19T00:00:00Z', redirect_url: 'https://www.adzuna.in/details/9001' },
    { id: '9002', title: 'Java Developer', company: { display_name: 'Infosys' }, location: { display_name: 'Pune, Maharashtra' }, category: { label: 'IT Jobs' }, description: 'Java role', created: '2026-09-18T00:00:00Z', redirect_url: 'javascript:alert(1)' }
  ]
};

/** Route each upstream URL to a canned response; `fail` lists hosts that should error. */
function routeFetch({ fail = [] } = {}) {
  return mockFetch((url) => {
    const host = new URL(url).host;
    if (fail.includes(host)) return jsonResponse({ error: 'boom' }, 500);
    if (host === 'remoteok.com') return jsonResponse(remoteOkFeed);
    if (host === 'remotive.com') return jsonResponse(remotiveFeed);
    if (host === 'api.adzuna.com') return jsonResponse(adzunaFeed);
    throw new Error(`unexpected fetch to ${url}`);
  });
}

const get = async (query = {}, headers = {}) => {
  const res = makeRes();
  await jobs(makeReq({ method: 'GET', query, headers }), res);
  return res;
};

beforeEach(() => {
  _resetFeedCache();
  delete process.env.ADZUNA_APP_ID;
  delete process.env.ADZUNA_APP_KEY;
});
afterEach(() => {
  if (net) net.restore();
  net = null;
  mock.timers.reset();
  process.env = { ...OLD_ENV };
});

/* ------------------------------------------------------------------- helpers */
test('helpers: safeUrl only allows http(s)', () => {
  assert.equal(safeUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,<script>1</script>'), null);
  assert.equal(safeUrl('not a url'), null);
});

test('helpers: internship, India-eligibility and keyword matching', () => {
  assert.equal(isInternship({ title: 'Software Engineering Intern', tags: [] }), true);
  assert.equal(isInternship({ title: 'Graduate Trainee', tags: [] }), true);
  assert.equal(isInternship({ title: 'International Sales Manager', tags: [] }), false, 'must not match "intern" inside "International"');
  assert.equal(indiaEligible({ location: 'Worldwide' }), true);
  assert.equal(indiaEligible({ location: '' }), true);
  assert.equal(indiaEligible({ location: 'APAC' }), true);
  assert.equal(indiaEligible({ location: 'USA Only' }), false);
  assert.equal(matchesKeyword({ title: 'Python Developer', company: 'X', tags: [], description: '' }, 'python dev'), true);
  assert.equal(matchesKeyword({ title: 'Python Developer', company: 'X', tags: [], description: '' }, 'python java'), false);
  assert.equal(matchesKeyword({ title: 'Anything', company: 'X', tags: [], description: '' }, ''), true);
});

/* -------------------------------------------------------------------- guards */
test('jobs: GET only and same-origin only', async () => {
  let res = makeRes();
  await jobs(makeReq({ method: 'POST' }), res);
  assert.equal(res.statusCode, 405);
  res = makeRes();
  await jobs(makeReq({ method: 'GET', headers: { origin: 'https://evil.example' } }), res);
  assert.equal(res.statusCode, 403);
});

/* -------------------------------------------------------------- remote source */
test('remote: merges both feeds, drops duplicates, newest first, strips HTML, blocks unsafe links', async () => {
  net = routeFetch();
  const res = await get({ source: 'remote' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.mode, 'remote');
  assert.deepEqual(body.jobs.map((j) => j.title), ['Software Engineering Intern', 'Backend Developer', 'Python Developer', 'Frontend Developer', 'Data Analyst']);
  assert.equal(body.jobs.find((j) => j.company === 'Acme').sourceLabel, 'Remote OK', 'first feed wins the duplicate');
  assert.equal(body.jobs.find((j) => j.id === 'remote_101').description, 'Build APIs & services');
  assert.equal(body.jobs.find((j) => j.id === 'remote_101').applyUrl, 'https://remoteok.com/remote-jobs/101', 'javascript: apply_url replaced by the listing URL');
  assert.equal(body.jobs.find((j) => j.id === 'remotive_201').salaryText, '$40k-$60k');
  assert.match(res.headers['Cache-Control'], /s-maxage=300/);
});

test('remote: keyword and internship filters', async () => {
  net = routeFetch();
  let body = (await get({ source: 'remote', q: 'python' })).json();
  assert.deepEqual(body.jobs.map((j) => j.title), ['Software Engineering Intern', 'Python Developer']);
  body = (await get({ source: 'remote', internship: '1' })).json();
  assert.deepEqual(body.jobs.map((j) => j.title), ['Software Engineering Intern']);
  assert.equal(body.jobs[0].isInternship, true);
});

/* --------------------------------------------------- india without Adzuna keys */
test('india without keys: never empty — falls back to remote roles open to India, with a notice', async () => {
  net = routeFetch();
  const res = await get({});
  const body = res.json();
  assert.equal(res.statusCode, 200);
  assert.equal(body.source, 'india');
  assert.equal(body.mode, 'remote-fallback');
  assert.equal(body.needsSetup, true);
  assert.match(body.notice, /not connected/);
  const titles = body.jobs.map((j) => j.title);
  assert.ok(titles.includes('Python Developer') && titles.includes('Backend Developer'));
  assert.ok(!titles.includes('Frontend Developer'), 'US-only roles are excluded');
  assert.ok(!titles.includes('Data Analyst'), 'USA-only roles are excluded');
  assert.ok(!net.calls.some((c) => c.url.includes('adzuna')), 'no Adzuna call without keys');
  assert.match(res.headers['Cache-Control'], /s-maxage=60/, 'fallback answers are cached only briefly');
});

test('india without keys: internships-only narrows the fallback list', async () => {
  net = routeFetch();
  const body = (await get({ internship: '1' })).json();
  assert.deepEqual(body.jobs.map((j) => j.title), ['Software Engineering Intern']);
});

/* ---------------------------------------------------------- india with Adzuna */
test('india with keys: searches Adzuna by keyword, city and internship', async () => {
  process.env.ADZUNA_APP_ID = 'id123';
  process.env.ADZUNA_APP_KEY = 'key456';
  net = routeFetch();
  const res = await get({ q: 'developer', where: 'Chennai', distance: '30', internship: '1', page: '2' });
  const body = res.json();
  assert.equal(body.mode, 'adzuna');
  assert.equal(body.needsSetup, undefined);
  assert.equal(body.notice, undefined);
  assert.equal(body.page, 2);

  const url = new URL(net.calls[0].url);
  assert.equal(url.pathname, '/v1/api/jobs/in/search/2');
  assert.equal(url.searchParams.get('app_id'), 'id123');
  assert.equal(url.searchParams.get('app_key'), 'key456');
  assert.equal(url.searchParams.get('what'), 'developer');
  assert.equal(url.searchParams.get('where'), 'Chennai');
  assert.equal(url.searchParams.get('distance'), '30');
  assert.equal(url.searchParams.get('what_or'), 'internship intern trainee');
  assert.equal(net.calls.length, 1, 'remote feeds are not touched when Adzuna works');

  const first = body.jobs[0];
  assert.equal(first.title, 'Junior Developer Intern', '<strong> highlighting is stripped');
  assert.equal(first.currency, 'INR');
  assert.equal(first.isInternship, true);
  assert.equal(first.salaryIsPredicted, true);
  assert.equal(body.jobs[1].applyUrl, null, 'unsafe redirect URL removed');
  assert.match(res.headers['Cache-Control'], /s-maxage=300/);
});

test('india with keys: Adzuna outage falls back to remote roles with an explanatory notice', async () => {
  process.env.ADZUNA_APP_ID = 'id123';
  process.env.ADZUNA_APP_KEY = 'key456';
  net = routeFetch({ fail: ['api.adzuna.com'] });
  const body = (await get({})).json();
  assert.equal(body.mode, 'remote-fallback');
  assert.match(body.notice, /temporarily unavailable/);
  assert.equal(body.needsSetup, false);
  assert.ok(body.jobs.length > 0);
});

/* ---------------------------------------------------------------- resilience */
test('one remote feed failing still returns the other feed', async () => {
  net = routeFetch({ fail: ['remotive.com'] });
  const body = (await get({ source: 'remote' })).json();
  assert.ok(body.jobs.length > 0);
  assert.ok(body.jobs.every((j) => j.sourceLabel === 'Remote OK'));
});

test('both feeds failing with nothing cached gives a generic 502', async () => {
  net = routeFetch({ fail: ['remoteok.com', 'remotive.com'] });
  const res = await get({ source: 'remote' });
  assert.equal(res.statusCode, 502);
  assert.ok(!res.body.includes('boom'));
});

test('feeds are cached, and stale copies are served if a refresh fails', async () => {
  mock.timers.enable({ apis: ['Date'], now: Date.now() });
  net = routeFetch();
  await get({ source: 'remote' });
  await get({ source: 'remote', q: 'python' });
  assert.equal(net.calls.length, 2, 'two feeds fetched once, then reused');
  net.restore();

  mock.timers.tick(11 * 60 * 1000); // RemoteOK's 10-minute TTL has passed, Remotive's 6 hours have not
  net = routeFetch({ fail: ['remoteok.com'] });
  const res = await get({ source: 'remote' });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().jobs.some((j) => j.sourceLabel === 'Remote OK'), 'stale RemoteOK copy still served');
  assert.equal(net.calls.length, 1, 'Remotive was not refetched inside its 6-hour TTL');
});
