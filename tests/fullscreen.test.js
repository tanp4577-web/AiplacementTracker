import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick } from './app-harness.js';

/** Fake Fullscreen API: records calls and tracks which element is full screen. */
const FAKE_FS = `
  window.__fs = { requested: 0, exited: 0 };
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => window.__fsEl || null });
  document.documentElement.requestFullscreen = function () { window.__fs.requested++; window.__fsEl = this; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
  document.exitFullscreen = function () { window.__fs.exited++; window.__fsEl = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
  MockInterview._say = function (t) { document.getElementById('ivQuestion').textContent = t; this._listen(); };
`;

async function startTyped(app) {
  await goTo(app, 'mockinterview');
  app.run(FAKE_FS);
  app.document.getElementById('ivTotal').value = '5';
  app.document.getElementById('ivTypedOnly').click();
  await tick(150);
}

test('interview full screen: starting asks for full screen and the room covers the whole window', async () => {
  const app = await bootApp();
  await startTyped(app);
  assert.equal(app.run('window.__fs.requested'), 1, 'full screen requested once, from the start click');
  assert.ok(app.document.body.classList.contains('iv-immersive'));
  const room = app.document.querySelector('.iv-room');
  assert.equal(room.parentElement, app.document.body, 'room is attached to <body> so no page animation can trap it');
  assert.equal(app.document.getElementById('ivFull').textContent, 'Exit full screen');
  assert.equal(app.document.getElementById('ivFull').getAttribute('aria-pressed'), 'true');
  app.run('MockInterview.cleanup()');
});

test('interview full screen: the button leaves and re-enters full screen', async () => {
  const app = await bootApp();
  await startTyped(app);
  app.document.getElementById('ivFull').click();
  await tick(20);
  assert.equal(app.run('window.__fs.exited'), 1);
  assert.equal(app.document.getElementById('ivFull').textContent, 'Full screen');
  assert.ok(app.document.body.classList.contains('iv-immersive'), 'the room stays big even outside real full screen');
  app.document.getElementById('ivFull').click();
  await tick(20);
  assert.equal(app.run('window.__fs.requested'), 2);
  assert.equal(app.document.getElementById('ivFull').textContent, 'Exit full screen');
  app.run('MockInterview.cleanup()');
});

test('interview full screen: cancel, finish and leaving the page all restore the normal page', async () => {
  // cancel
  let app = await bootApp();
  await startTyped(app);
  app.document.getElementById('ivCancel').click();
  await tick(40);
  assert.ok(app.document.getElementById('appConfirmModal'), 'the dialog is shown (the whole page is full screen, so it is visible)');
  app.document.getElementById('appConfirmOk').click();
  await tick(80);
  assert.equal(app.document.body.classList.contains('iv-immersive'), false);
  assert.equal(app.document.querySelector('.iv-room'), null, 'room removed from <body>');
  assert.equal(app.run('window.__fs.exited'), 1);
  assert.ok(app.document.getElementById('ivStart'), 'back on the setup page');

  // finish early
  app = await bootApp();
  await startTyped(app);
  app.document.getElementById('ivTyped').value = 'An answer with because and for example some structure to it.';
  app.document.getElementById('ivDone').click();
  await tick(100);
  app.document.getElementById('ivEnd').click();
  await tick(40);
  app.document.getElementById('appConfirmOk').click();
  await tick(300);
  assert.equal(app.document.body.classList.contains('iv-immersive'), false);
  assert.equal(app.run('window.__fs.exited'), 1);
  assert.ok(app.document.querySelector('.iv-report'), 'the report is shown in the normal page');

  // leaving the page
  app = await bootApp();
  await startTyped(app);
  await goTo(app, 'dashboard');
  assert.equal(app.document.body.classList.contains('iv-immersive'), false);
  assert.equal(app.document.querySelector('.iv-room'), null);
  assert.equal(app.run('window.__fs.exited'), 1);
});

test('interview full screen: still works where the Fullscreen API is missing', async () => {
  const app = await bootApp();
  await goTo(app, 'mockinterview');
  app.run('MockInterview._say = function (t) { document.getElementById("ivQuestion").textContent = t; this._listen(); }; delete document.documentElement.requestFullscreen;');
  app.document.getElementById('ivTypedOnly').click();
  await tick(150);
  assert.ok(app.document.body.classList.contains('iv-immersive'), 'overlay still fills the window');
  assert.equal(app.document.getElementById('ivFull').hidden, true, 'no useless button');
  assert.deepEqual(app.errors, []);
  app.run('MockInterview.cleanup()');
});
