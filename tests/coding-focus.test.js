import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick } from './app-harness.js';

async function open(app) {
  await goTo(app, 'coding');
  app.document.querySelector('#questionList [data-qid]').click();
  await tick(250);
}
const esc = (app) => app.document.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

test('focus mode: toggle hides chrome, shows a visible exit button, Escape and the button both exit', async () => {
  const app = await bootApp();
  await open(app);
  const b = app.document.body;
  const btn = app.document.getElementById('focusBtn');
  assert.equal(btn.getAttribute('aria-pressed'), 'false');
  btn.click();
  assert.ok(b.classList.contains('coding-focus'));
  assert.equal(btn.getAttribute('aria-pressed'), 'true');
  const exit = app.document.getElementById('focusExit');
  assert.ok(exit && exit.textContent.includes('Exit focus mode'));
  assert.equal(app.document.activeElement, exit);
  esc(app);
  assert.equal(b.classList.contains('coding-focus'), false);
  assert.equal(app.document.getElementById('focusExit'), null);
  assert.equal(app.document.activeElement, btn, 'focus returns to the toggle');
  btn.click();
  app.document.getElementById('focusExit').click();
  assert.equal(b.classList.contains('coding-focus'), false);
  assert.deepEqual(app.errors, []);
});

test('focus mode: Escape is ignored while a dialog is open, and leaving the problem or page restores the layout', async () => {
  const app = await bootApp();
  await open(app);
  app.document.getElementById('focusBtn').click();
  const m = app.document.createElement('div'); m.id = 'appConfirmModal'; app.document.body.appendChild(m);
  esc(app);
  assert.ok(app.document.body.classList.contains('coding-focus'));
  m.remove();
  app.document.getElementById('backBtn').click();
  await tick(60);
  assert.equal(app.document.body.classList.contains('coding-focus'), false);
  await open(app);
  app.document.getElementById('focusBtn').click();
  await goTo(app, 'dashboard');
  assert.equal(app.document.body.classList.contains('coding-focus'), false);
  assert.equal(app.document.getElementById('focusExit'), null);
});

test('focus mode: the button takes the whole screen (real full screen) and leaving full screen leaves focus mode', async () => {
  const app = await bootApp();
  app.run(`window.__fs = { req: 0, exit: 0 };
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => window.__fsEl || null });
    document.documentElement.requestFullscreen = function () { window.__fs.req++; window.__fsEl = this; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
    document.exitFullscreen = function () { window.__fs.exit++; window.__fsEl = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };`);
  await open(app);
  app.document.getElementById('focusBtn').click();
  await tick(20);
  assert.equal(app.run('window.__fs.req'), 1, 'asks the browser for full screen from the click');
  assert.ok(app.document.body.classList.contains('coding-focus'));
  // the browser's own Esc: full screen ends, focus mode ends with it
  app.run('window.__fsEl = null; document.dispatchEvent(new Event("fullscreenchange"))');
  assert.equal(app.document.body.classList.contains('coding-focus'), false);
  // exit button leaves full screen too
  app.document.getElementById('focusBtn').click();
  await tick(20);
  app.document.getElementById('focusExit').click();
  await tick(20);
  assert.equal(app.run('window.__fs.exit'), 1);
  assert.equal(app.document.body.classList.contains('coding-focus'), false);
  assert.deepEqual(app.errors, []);
});
