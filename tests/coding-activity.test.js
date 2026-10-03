import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick, defaultFetch } from './app-harness.js';
import { TWO_SUM, TWO_SUM_PARTIAL } from './coding-programs.js';

const text = (el, n = 3000) => (el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const items = (app) => [...app.document.querySelectorAll('#questionList [data-qid]')];

async function openProblem(app, title) {
  const item = items(app).find((el) => el.textContent.includes(title));
  item.click();
  await tick(250);
}

async function openProgress(app) {
  app.document.getElementById('openProgressBtn').click();
  await tick(60);
}

async function run(app, code) {
  if (code) app.document.getElementById('codeEditor').value = code;
  app.document.getElementById('runBtn').click();
  await tick(250);
}


test('coding: questions are fetched from the API, nothing is bundled in the page', async () => {
  const app = await bootApp();
  assert.equal(app.run('typeof CODING_BANK'), 'undefined');
  assert.equal(app.run('typeof FALLBACK_CODING'), 'undefined');
  const seen = [];
  const app2 = await bootApp({ fetch: (u, init) => { seen.push(String(u)); return defaultFetch(u, init); } });
  await goTo(app2, 'coding');
  assert.ok(seen.some((u) => u.startsWith('/api/coding-questions?')), 'the list comes from the API');
  assert.equal(items(app2).length, 30, 'first page of 30');
  assert.match(text(app2.document.getElementById('matchCount')), /\d+ questions match/);
  assert.match(text(app2.document.getElementById('viewContainer'), 20000), /Show 30 more/);
  seen.length = 0;
  await openProblem(app2, 'Two Sum');
  assert.ok(seen.some((u) => u.includes('id=two-sum')), 'opening a problem fetches just that one');
  assert.deepEqual(app2.errors, []);
});

test('coding: filters and search go to the API, and show-more loads the next page', async () => {
  const seen = [];
  const app = await bootApp({ fetch: (u, init) => { seen.push(String(u)); return defaultFetch(u, init); } });
  await goTo(app, 'coding');
  app.document.getElementById('difficultyFilter').value = 'Hard';
  app.document.getElementById('difficultyFilter').dispatchEvent(new app.window.Event('change'));
  await tick(150);
  assert.ok(seen.some((u) => u.includes('difficulty=Hard')));
  assert.ok(items(app).length > 0 && items(app).every((el) => el.textContent.includes('Hard')));

  app.document.getElementById('difficultyFilter').value = 'all';
  app.document.getElementById('difficultyFilter').dispatchEvent(new app.window.Event('change'));
  await tick(150);
  app.document.getElementById('showMoreBtn').click();
  await tick(150);
  assert.equal(items(app).length, 60, 'next page appended');

  const search = app.document.getElementById('codeSearch');
  search.focus();
  search.value = 'trapping rain';
  search.dispatchEvent(new app.window.Event('input'));
  await tick(500);
  assert.ok(seen.some((u) => u.includes('q=trapping+rain')));
  assert.deepEqual(items(app).map((el) => el.textContent.includes('Trapping Rain Water')), [true]);
  assert.equal(app.document.activeElement, search, 'typing does not steal focus');
  assert.deepEqual(app.errors, []);
});

test('coding: when the question service is down you get a clear message and a working retry', async () => {
  let down = true;
  const app = await bootApp({ fetch: (u, init) => (down && String(u).startsWith('/api/coding-questions') ? { ok: false, status: 502, json: async () => ({ error: 'The question service is not available. Please try again.' }) } : defaultFetch(u, init)) });
  await goTo(app, 'coding');
  const box = app.document.getElementById('questionList');
  assert.match(text(box), /Couldn't load the problems/);
  assert.match(text(box), /question service is not available/);
  down = false;
  app.document.getElementById('retryCodingBtn').click();
  await tick(200);
  assert.equal(items(app).length, 30);
});

test('coding activity: tries are recorded, unfinished problems are listed as attempted, solved ones as solved', async () => {
  const app = await bootApp();
  await goTo(app, 'coding');
  await openProgress(app);
  assert.match(text(app.document.getElementById('activityCard')), /Solved \(0\)/);
  assert.match(text(app.document.getElementById('activityCard')), /Nothing solved yet/);
  app.document.getElementById('progBack').click();

  await openProblem(app, 'Two Sum');
  await run(app); // untouched starter: fails
  let rec = app.run(`DB.getProgress('guest@local').coding.attempts['two-sum']`);
  assert.equal(rec.tries, 1);
  assert.equal(rec.solved, false);
  assert.equal(rec.best, 0);
  assert.equal(rec.title, 'Two Sum');

  await run(app, TWO_SUM_PARTIAL); // wrong on some tests
  rec = app.run(`DB.getProgress('guest@local').coding.attempts['two-sum']`);
  assert.equal(rec.tries, 2);
  assert.ok(rec.best >= 1 && rec.best < rec.total, 'partial result is remembered as the best so far');

  app.document.getElementById('backBtn').click();
  await tick(60);
  await openProgress(app);
  app.document.querySelector('[data-act-tab="attempted"]').click();
  let card = text(app.document.getElementById('activityCard'));
  assert.match(card, /Attempted, not solved \(1\)/);
  assert.match(card, /Two Sum/);
  assert.match(card, /2 tries/);
  assert.match(card, new RegExp(`best ${rec.best}/${rec.total} tests`));

  // solve it
  app.document.getElementById('progBack').click();
  await openProblem(app, 'Two Sum');
  await run(app, TWO_SUM);
  rec = app.run(`DB.getProgress('guest@local').coding.attempts['two-sum']`);
  assert.equal(rec.solved, true);
  assert.equal(rec.tries, 3);
  assert.ok(rec.solvedAt > 0);

  app.document.getElementById('backBtn').click();
  await tick(60);
  await openProgress(app);
  app.document.querySelector('[data-act-tab="solved"]').click();
  card = text(app.document.getElementById('activityCard'));
  assert.match(card, /Solved \(1\)/);
  assert.match(card, /Attempted, not solved \(0\)/);
  assert.match(card, /Two Sum/);
  assert.match(card, /Solved in 3 tries/);

  // opening from the activity list works
  app.document.querySelector('[data-act-open="two-sum"]').click();
  await tick(250);
  assert.match(text(app.document.getElementById('viewContainer')), /Two Sum/);
  assert.deepEqual(app.errors, []);
});

test('coding activity: problems solved before attempts were tracked still appear, with their titles', async () => {
  const app = await bootApp();
  app.run(`DB.saveProgress('guest@local', { coding: { solved: ['fizzbuzz', 'three-sum'], totalAttempts: 2 } })`);
  await goTo(app, 'coding');
  await openProgress(app);
  await tick(250);
  const card = text(app.document.getElementById('activityCard'));
  assert.match(card, /Solved \(2\)/);
  assert.match(card, /FizzBuzz/);
  assert.match(card, /3Sum/);
});

test('coding: the solved-only filter and sessions use the same API', async () => {
  const app = await bootApp();
  app.run(`DB.saveProgress('guest@local', { coding: { solved: ['two-sum', 'fizzbuzz'], totalAttempts: 2 } })`);
  await goTo(app, 'coding');
  app.document.getElementById('statusFilter').value = 'solved';
  app.document.getElementById('statusFilter').dispatchEvent(new app.window.Event('change'));
  await tick(200);
  assert.deepEqual(items(app).map((el) => /Two Sum|FizzBuzz/.exec(el.textContent)[0]).sort(), ['FizzBuzz', 'Two Sum']);

  app.document.getElementById('statusFilter').value = 'all';
  app.document.getElementById('statusFilter').dispatchEvent(new app.window.Event('change'));
  await tick(150);
  app.document.getElementById('countFilter').value = '5';
  app.document.getElementById('countFilter').dispatchEvent(new app.window.Event('change'));
  app.document.getElementById('startSessionBtn').click();
  await tick(400);
  assert.equal(app.run('Coding.state.session.length'), 5);
  assert.match(text(app.document.getElementById('viewContainer')), /Session 1\/5/);
  assert.deepEqual(app.errors, []);
});

test('my progress: every run is a stored submission with a verdict and a measured time, shown in the view', async () => {
  const app = await bootApp();
  await goTo(app, 'coding');
  await openProblem(app, 'Two Sum');
  await run(app); // untouched starter: wrong answer
  assert.match(text(app.document.getElementById('verdict')), /Wrong Answer/);
  app.run(`window.__sr = JsRunner.run; JsRunner.run = async () => ({ kind: 'timeout', stdout: '', stderr: '', error: 'Time limit exceeded (3 s).', ms: 3000 })`);
  await run(app, 'console.log(1)');
  assert.match(text(app.document.getElementById('verdict')), /Time Limit Exceeded/);
  app.run('JsRunner.run = window.__sr');
  await run(app, "throw new Error('boom');");
  assert.match(text(app.document.getElementById('verdict')), /Runtime Error/);
  await run(app, TWO_SUM);
  assert.match(text(app.document.getElementById('verdict')), /Accepted/);
  const subs = app.run(`DB.getProgress('guest@local').coding.submissions`);
  assert.equal(subs.length, 4, 'stored inside the existing DB.coding record');
  assert.deepEqual([...subs.map((s) => s.verdict)].slice(-2), ['Runtime Error', 'Accepted']);
  assert.ok(subs.every((s) => Number.isFinite(s.ms) && s.total >= 5));

  app.document.getElementById('backBtn').click();
  await tick(60);
  assert.match(text(app.document.getElementById('progressTeaser')), /1 solved/);
  await openProgress(app);
  assert.match(text(app.document.getElementById('progStats')), /4\s*Submissions/);
  assert.match(text(app.document.getElementById('historyCard')), /Accepted/);
  app.document.querySelector('[data-sub-filter="accepted"]').click();
  assert.equal(app.document.querySelectorAll('[data-sub-open]').length, 1);
  app.document.querySelector('[data-sub-open]').click();
  await tick(250);
  assert.match(text(app.document.getElementById('viewContainer')), /Two Sum/);
  assert.deepEqual(app.errors, []);
});
