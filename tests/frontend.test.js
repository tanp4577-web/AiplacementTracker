/* Browser-side smoke tests: the real scripts from js/ run inside jsdom, in the
   same way the <script> tags in index.html load them (shared global scope). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

/** index.html markup without external scripts/styles (jsdom must not touch the network). */
function pageHtml() {
  return read('index.html')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*>/gi, '');
}

function boot(scripts, { html = pageHtml(), extra = '' } = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://app.test/' });
  const { window } = dom;
  Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
  window.TextEncoder = TextEncoder;
  const ctx = dom.getInternalVMContext();
  const run = (code, filename = 'inline.js') => new vm.Script(code, { filename }).runInContext(ctx);
  if (extra) run(extra, 'stub.js');
  for (const file of scripts) run(read(file), file);
  return { window, document: window.document, run };
}

const APP_STUB = 'const App = { showToast() {}, refreshAll() {} };';
const tick = () => new Promise((r) => setTimeout(r, 20));

test('Sanitize.html escapes markup and quotes', () => {
  const { run } = boot(['js/sanitize.js']);
  assert.equal(run(`Sanitize.html('<img src=x onerror="a()"> & \\'q\\'')`), '&lt;img src=x onerror=&quot;a()&quot;&gt; &amp; &#39;q&#39;');
  assert.equal(run('Sanitize.html(null)'), '');
});

test('aptitude quiz renders hostile AI/API question text as inert text', () => {
  const { document, run } = boot(['js/sanitize.js', 'js/aptitude.js'], { html: '<div id="c"></div>' });
  run(`
    Aptitude.container = document.getElementById('c');
    Aptitude.state.questions = [{
      category: '<b>cat</b>',
      question: '<img src=x onerror=window.__pwned=1> What is 2 < 3?',
      options: ['<script>window.__pwned=1</script>', 'b', 'c', 'd'],
      correct: 0,
      explanation: '<svg onload=window.__pwned=1>'
    }];
    Aptitude.state.index = 0;
    Aptitude._renderQuestion();
    Aptitude._reviewAnswers();
  `);
  const c = document.getElementById('c');
  assert.equal(c.querySelector('img, script, svg'), null, 'no injected elements');
  assert.match(c.textContent, /<img src=x onerror=window.__pwned=1> What is 2 < 3\?/);
  assert.equal(run('window.__pwned'), undefined);
});

test('showToast inserts messages as text, not HTML', () => {
  const html = '<div id="toastContainer"></div>';
  const { document, run } = boot(['js/sanitize.js', 'js/app.js'], { html, extra: 'document.addEventListener = () => {};' });
  run(`App.showToast('Showing roles near <img src=x onerror=window.__pwned=1>', 'info')`);
  const toast = document.querySelector('#toastContainer .toast');
  assert.ok(toast);
  assert.equal(toast.querySelector('img'), null);
  assert.match(toast.textContent, /<img src=x/);
  assert.ok(toast.querySelector('svg'), 'icon still renders');
});

test('guest mode: one click, no password hash stored, session marked as guest', async () => {
  const { window, document, run } = boot(['js/sanitize.js', 'js/storage.js', 'js/auth.js'], { extra: APP_STUB });
  await run('Auth.init()');
  assert.ok(document.getElementById('authModal').classList.contains('show'), 'sign-in modal opens first');

  document.getElementById('authGuestBtn').click();
  await tick();

  const session = JSON.parse(window.localStorage.getItem('prepportal_session'));
  assert.equal(session.guest, true);
  assert.equal(session.email, 'guest@local');
  assert.equal('pass' in session, false);
  assert.equal(run('Auth.getEmail()'), 'guest@local');
  assert.equal(document.getElementById('authModal').classList.contains('show'), false);
  assert.match(document.getElementById('authArea').textContent, /Guest/);
});

test('sign-up: 8+ character passwords, hash kept out of the session record', async () => {
  const { window, document, run } = boot(['js/sanitize.js', 'js/storage.js', 'js/auth.js'], { extra: APP_STUB });
  await run('Auth.init()');
  const fill = (name, email, pass) => {
    document.getElementById('authName').value = name;
    document.getElementById('authEmail').value = email;
    document.getElementById('authPass').value = pass;
  };

  document.getElementById('tabSignup').click();
  fill('Ana Sharma', 'ana@example.com', 'short12');
  document.getElementById('authSubmitBtn').click();
  await tick();
  assert.match(document.getElementById('authError').textContent, /at least 8/);
  assert.equal(window.localStorage.getItem('prepportal_session'), null);

  fill('Ana Sharma', 'ana@example.com', 'long-enough-1');
  document.getElementById('authSubmitBtn').click();
  await tick();
  const users = JSON.parse(window.localStorage.getItem('prepportal_users'));
  assert.match(users['ana@example.com'].pass, /^[0-9a-f]{64}$/);
  const session = JSON.parse(window.localStorage.getItem('prepportal_session'));
  assert.equal(session.email, 'ana@example.com');
  assert.equal('pass' in session, false);
});

test('existing sessions written by older builds lose their stored password hash', () => {
  const { window, run } = boot(['js/storage.js']);
  window.localStorage.setItem('prepportal_session', JSON.stringify({ email: 'old@example.com', pass: 'a'.repeat(64) }));
  assert.equal(run('DB.getSession().pass'), undefined);
  assert.equal('pass' in JSON.parse(window.localStorage.getItem('prepportal_session')), false);
});
