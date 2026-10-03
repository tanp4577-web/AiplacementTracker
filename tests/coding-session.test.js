import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick } from './app-harness.js';

const pal = (app) => [...app.document.querySelectorAll('#qPalette [data-pal]')];
const cls = (app) => pal(app).map((b) => ['solved', 'attempted'].find((c) => b.classList.contains(c)) || 'todo');

async function start(app, n = '5') {
  await goTo(app, 'coding');
  app.document.getElementById('countFilter').value = n;
  app.document.getElementById('countFilter').dispatchEvent(new app.window.Event('change'));
  app.document.getElementById('startSessionBtn').click();
  await tick(400);
}
async function runWith(app, code) {
  app.document.getElementById('codeEditor').value = code;
  app.document.getElementById('runBtn').click();
  await tick(300);
}

test('session palette: shows every question, reflects sessionResults, and jumps', async () => {
  const app = await bootApp();
  await start(app);
  assert.equal(pal(app).length, 5);
  assert.deepEqual(cls(app), Array(5).fill('todo'));
  assert.equal(pal(app)[0].getAttribute('aria-current'), 'true');
  await runWith(app, 'function nothing(){}'); // fails the first question
  assert.deepEqual(cls(app), ['attempted', ...Array(4).fill('todo')]);
  assert.match(pal(app)[0].getAttribute('aria-label'), /attempted, not solved/);
  assert.equal(app.run('Coding.state.sessionResults[Coding.state.session[0]]'), false, 'palette reads sessionResults');
  pal(app)[2].click();
  await tick(250);
  assert.equal(app.run('Coding.state.sessionIndex'), 2);
  assert.equal(pal(app)[2].getAttribute('aria-current'), 'true');
  assert.deepEqual(cls(app), ['attempted', ...Array(4).fill('todo')], 'state survives jumping');
  assert.deepEqual(app.errors, []);
});

test('session summary: appears once everything is attempted, groups solved / failed / skipped, and reopens', async () => {
  const app = await bootApp();
  await start(app);
  assert.equal(app.document.getElementById('qPalSummary'), null);
  // skip-by-inspection: mark states directly through the real state, then render
  const ids = app.run('Coding.state.session.slice()');
  app.run(`Coding.state.sessionResults['${ids[0]}'] = true; Coding.state.sessionResults['${ids[1]}'] = false;`);
  await app.run('Coding._renderSessionSummary()');
  await tick(200);
  const g = (k) => app.document.querySelector(`[data-sum-group="${k}"]`);
  assert.match(g('solved').textContent, /Solved \(1\)/);
  assert.match(g('attempted').textContent, /Attempted, not solved \(1\)/);
  assert.match(g('todo').textContent, /Skipped \((3)\)/);
  g('todo').querySelector('[data-reopen]').click();
  await tick(250);
  assert.equal(app.run('Coding.state.sessionIndex'), 2);
  assert.equal(pal(app).length, 5, 'palette still available after reopening');

  // once all are attempted the palette offers the summary
  app.run(`Coding.state.session.slice(2).forEach((id) => { Coding.state.sessionResults[id] = false; }); Coding._refreshPalette('${ids[2]}')`);
  const btn = app.document.getElementById('qPalSummary');
  assert.ok(btn);
  btn.click();
  await tick(200);
  assert.match(app.document.getElementById('viewContainer').textContent, /Session summary/);
  assert.deepEqual(app.errors, []);
});
