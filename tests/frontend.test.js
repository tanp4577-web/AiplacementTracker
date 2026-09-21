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

/* ------------------------------------------------------------------ Hiring Hub */
const flush = () => new Promise((r) => setTimeout(r, 30));

function bootJobs(payload) {
  const ctx = boot(['js/sanitize.js', 'js/storage.js', 'js/jobs.js'], { html: '<div id="c"></div>', extra: APP_STUB });
  const requests = [];
  ctx.window.fetch = async (url) => {
    requests.push(String(url));
    return { ok: true, json: async () => payload };
  };
  ctx.run(`Jobs.render(document.getElementById('c'))`);
  return { ...ctx, requests };
}

const fallbackPayload = {
  source: 'india',
  mode: 'remote-fallback',
  notice: 'On-site local listings are not connected on this deployment yet.',
  count: 1,
  jobs: [
    {
      id: 'remote_1',
      title: '<img src=x onerror=window.__pwned=1>Backend Developer',
      company: 'Acme',
      location: 'Worldwide',
      tags: ['node'],
      description: 'Build APIs',
      sourceLabel: 'Remote OK',
      applyUrl: 'https://remoteok.com/1',
      isInternship: true
    }
  ]
};

test('Hiring Hub: India tab is the default, is never blank, and explains the fallback', async () => {
  const { document, requests } = bootJobs(fallbackPayload);
  await flush();
  assert.match(requests[0], /^\/api\/jobs\?/);
  assert.match(requests[0], /source=india/);
  assert.match(document.getElementById('jobsNotice').textContent, /not connected/);
  assert.equal(document.querySelectorAll('[data-job-id]').length, 1);
  assert.ok(document.querySelector('.chip.orange'), 'internship badge shown');
  assert.equal(document.querySelector('#jobsGrid img'), null, 'hostile title stays inert text');
  assert.match(document.getElementById('jobsGrid').textContent, /<img src=x/);
});

test('Hiring Hub: city and internship toggle drive the request and the direct-search links', async () => {
  const { document, requests, run } = bootJobs(fallbackPayload);
  await flush();

  const city = document.getElementById('jobCityInput');
  city.value = 'Pune';
  city.dispatchEvent(new document.defaultView.Event('change'));
  await flush();
  assert.match(requests.at(-1), /where=Pune/);
  assert.match(requests.at(-1), /distance=50/);

  document.getElementById('internshipToggle').click();
  await flush();
  assert.match(requests.at(-1), /internship=1/);

  const hrefs = Object.fromEntries([...document.querySelectorAll('#externalSearchLinks a')].map((a) => [a.textContent.trim(), a.getAttribute('href')]));
  assert.match(hrefs.LinkedIn, /location=Pune/);
  assert.match(hrefs.LinkedIn, /f_JT=I/);
  assert.match(hrefs.Internshala, /^https:\/\/internshala\.com\/internships\//);
  assert.match(hrefs.Naukri, /^https:\/\/www\.naukri\.com\/.+-in-pune$/);
  assert.match(hrefs['Indeed India'], /l=Pune/);
  assert.equal(Object.keys(hrefs).length, 5);
  for (const url of Object.values(hrefs)) assert.match(url, /^https:\/\//);

  run(`Jobs.state.keyword = ''; Jobs.state.city = ''; Jobs.state.internshipOnly = false;`);
  const plain = run(`Jobs._externalSearchLinks().find(l => l.label === 'Naukri').href`);
  assert.equal(plain, 'https://www.naukri.com/jobs');
});

test('Hiring Hub: only http(s) links are ever opened', () => {
  const { run } = boot(['js/sanitize.js', 'js/storage.js', 'js/jobs.js'], { html: '<div id="c"></div>', extra: APP_STUB });
  assert.equal(run(`Jobs._safeUrl('javascript:alert(1)')`), '');
  assert.equal(run(`Jobs._safeUrl('https://example.com/x')`), 'https://example.com/x');
});

test('Hiring Hub: an API error shows a retry button instead of a blank page', async () => {
  const ctx = boot(['js/sanitize.js', 'js/storage.js', 'js/jobs.js'], { html: '<div id="c"></div>', extra: APP_STUB });
  ctx.window.fetch = async () => ({ ok: false, json: async () => ({ error: 'Could not fetch live job listings right now.' }) });
  ctx.run(`Jobs.render(document.getElementById('c'))`);
  await flush();
  assert.ok(ctx.document.getElementById('retryJobsBtn'));
  assert.match(ctx.document.getElementById('c').textContent, /Could not fetch live job listings/);
});

/* ------------------------------------------------------- page-level quality */
test('index.html: metadata, icons, skip link and accessible chatbot button are in place', () => {
  const html = read('index.html');
  assert.ok(!/font-awesome/i.test(html), 'unused Font Awesome stylesheet removed');
  assert.ok(!/live HR interviews/i.test(html), 'meta description no longer promises a removed feature');
  for (const needle of ['property="og:image"', 'name="twitter:card"', 'rel="manifest"', 'rel="icon"', 'rel="apple-touch-icon"', 'rel="canonical"', 'class="skip-link"', '<noscript>']) {
    assert.ok(html.includes(needle), `missing ${needle}`);
  }
  const doc = new JSDOM(html).window.document;
  const fab = doc.getElementById('chatbotFab');
  assert.equal(fab.tagName, 'BUTTON');
  assert.ok(fab.getAttribute('aria-label'));
  assert.equal(fab.getAttribute('aria-expanded'), 'false');
  assert.equal(doc.getElementById('viewContainer').getAttribute('tabindex'), '-1', 'skip link has a focus target');
  assert.match(doc.querySelector('meta[name="description"]').content, /^.{50,170}$/);
});

test('icons, manifest, robots and sitemap exist and reference real files', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(root, icon.src.replace(/^\//, ''))), `${icon.src} exists`);
  for (const file of ['favicon.svg', 'og-image.png', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml']) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
  }
  assert.match(read('robots.txt'), /Sitemap: https:\/\/aiplacement-tracker\.vercel\.app\/sitemap\.xml/);
});

/* ------------------------------------------------------------ storage fallback */
test('storage blocked by the browser: the app keeps working from memory and warns once', () => {
  const toasts = [];
  const { window, run } = boot(['js/storage.js'], {
    html: '<div></div>',
    extra: 'const App = { showToast(msg) { window.__toasts.push(msg); } };'
  });
  window.__toasts = toasts;
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError: storage blocked'); }, configurable: true });

  run(`DB.saveUser('a@b.co', { name: 'Ana' }); DB.setSession({ email: 'a@b.co', name: 'Ana' });`);
  assert.equal(run(`DB.getUser('a@b.co').name`), 'Ana');
  assert.equal(run(`DB.getSession().email`), 'a@b.co');
  run(`DB.saveProgress('a@b.co', { resumeScore: 40 });`);
  assert.equal(run(`DB.getProgress('a@b.co').resumeScore`), 40);
  assert.equal(toasts.length, 1, 'the user is told once, not on every save');
  run(`DB.resetAll()`); // must not throw
  assert.equal(run(`DB.getSession()`), null);
});

/* ---------------------------------------------------------------- backup/restore */
test('backup: round-trips progress between accounts and never exports passwords', () => {
  const { run } = boot(['js/storage.js'], { html: '<div></div>', extra: APP_STUB });
  run(`
    DB.saveUser('ana@example.com', { name: 'Ana', pass: 'a'.repeat(64) });
    DB.saveProgress('ana@example.com', { resumeScore: 72, aptitude: { completed: 2, correct: 15, total: 20, history: [] }, coding: { solved: ['two-sum', 'fizzbuzz'], totalAttempts: 5 } });
    DB.setGlobal('lastResumeText', 'my resume text');
  `);
  const json = run(`JSON.stringify(DB.exportBackup('ana@example.com'))`);
  assert.ok(!json.includes('aaaaaaaa'), 'password hash is not part of the backup');

  const result = run(`DB.importBackup('guest@local', ${json})`);
  assert.equal(result.ok, true);
  assert.equal(run(`DB.getProgress('guest@local').resumeScore`), 72);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(DB.getProgress('guest@local').coding.solved)`)), ['two-sum', 'fizzbuzz']);
  assert.equal(run(`DB.getGlobal('lastResumeText')`), 'my resume text');
});

test('backup: rejects foreign files and sanitises hostile values', () => {
  const { run } = boot(['js/storage.js'], { html: '<div></div>', extra: APP_STUB });
  assert.equal(run(`DB.importBackup('a@b.co', { hello: 'world' })`).ok, false);
  assert.equal(run(`DB.importBackup('a@b.co', { app: 'placementprep', version: 2, progress: {} })`).ok, false);
  assert.equal(run(`DB.importBackup('', { app: 'placementprep', version: 1, progress: {} })`).ok, false, 'needs a signed-in profile');

  const hostile = { app: 'placementprep', version: 1, progress: { resumeScore: 99999, readiness: -5, aptitude: { correct: 'lots', total: -1, history: new Array(5000).fill(1) }, coding: { solved: [{ evil: true }, 'ok'] }, activity: new Array(5000).fill({}) }, globals: { 'bad key!': 1, good_key: 'yes' } };
  assert.equal(run(`DB.importBackup('a@b.co', ${JSON.stringify(hostile)}).ok`), true);
  assert.equal(run(`DB.getProgress('a@b.co').resumeScore`), 100);
  assert.equal(run(`DB.getProgress('a@b.co').readiness`), 0);
  assert.equal(run(`DB.getProgress('a@b.co').aptitude.correct`), 0);
  assert.equal(run(`DB.getProgress('a@b.co').aptitude.history.length`), 200);
  assert.deepEqual(JSON.parse(run(`JSON.stringify(DB.getProgress('a@b.co').coding.solved)`)), ['ok']);
  assert.equal(run(`DB.getProgress('a@b.co').activity.length`), 200);
  assert.equal(run(`DB.getGlobal('good_key')`), 'yes');
  assert.equal(run(`DB.getGlobal('bad key!')`), null);
});

/* ------------------------------------------------------------------ auth dialog */
test('sign-in dialog: Escape leaves a Sign in button, tabs report state, focus stays inside', async () => {
  const { window, document, run } = boot(['js/sanitize.js', 'js/storage.js', 'js/auth.js'], { extra: APP_STUB });
  await run('Auth.init()');
  const modal = document.getElementById('authModal');
  assert.ok(modal.classList.contains('show'));
  assert.equal(document.getElementById('tabLogin').getAttribute('aria-selected'), 'true');
  document.getElementById('tabSignup').click();
  assert.equal(document.getElementById('tabSignup').getAttribute('aria-selected'), 'true');
  assert.equal(document.getElementById('tabLogin').getAttribute('aria-selected'), 'false');
  document.getElementById('tabLogin').click();

  // Tab from the last control wraps to the first
  document.getElementById('authGuestBtn').focus();
  const tab = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  document.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, true);
  assert.equal(document.activeElement.id, 'tabLogin');

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(modal.classList.contains('show'), false);
  const signIn = document.getElementById('openSignInBtn');
  assert.ok(signIn, 'a way back in is offered');
  signIn.click();
  assert.ok(modal.classList.contains('show'));
});

/* ------------------------------------------------------------------- dashboard */
function bootDashboard() {
  const ctx = boot(['js/sanitize.js', 'js/storage.js', 'js/auth.js', 'js/dashboard.js'], { extra: APP_STUB });
  ctx.window.requestAnimationFrame = () => 0;
  return ctx;
}

test('dashboard: signed-out visitors get real buttons, including guest mode', async () => {
  const { document, run } = bootDashboard();
  await run('Auth.init()');
  run(`Auth._hideModal(); Dashboard.render(document.getElementById('viewContainer'))`);
  document.getElementById('dashGuestBtn').click();
  await tick();
  assert.equal(run('Auth.getEmail()'), 'guest@local');
});

test('dashboard: new users see a start checklist, the exact readiness formula and a backup card', async () => {
  const { document, run } = bootDashboard();
  await run('Auth.init()');
  run(`DB.setSession({ email: 'guest@local', name: 'Guest', guest: true }); Dashboard.render(document.getElementById('viewContainer'))`);
  assert.ok(document.getElementById('startHereCard'));
  assert.match(document.getElementById('viewContainer').textContent, /aptitude accuracy .* 25%.*coding .* 30%.*interview experiences shared .* 20%/s);
  assert.match(document.getElementById('dataBackupCard').textContent, /guest profile/);
  assert.ok(document.getElementById('exportDataBtn') && document.getElementById('importDataBtn'));

  run(`DB.saveProgress('guest@local', { resumeScore: 80 }); Dashboard.render(document.getElementById('viewContainer'))`);
  assert.equal(document.getElementById('startHereCard'), null, 'checklist disappears once there is progress');
});

test('dashboard: importing a backup file restores progress; bad files are refused with a message', async () => {
  const toasts = [];
  const { window, run } = bootDashboard();
  await run('Auth.init()');
  window.__toasts = toasts;
  run(`DB.setSession({ email: 'guest@local', name: 'Guest', guest: true }); App.showToast = (m) => window.__toasts.push(m);`);
  const file = (text, size = text.length) => ({ size, text: async () => text });

  const good = JSON.stringify({ app: 'placementprep', version: 1, progress: { resumeScore: 64 }, globals: {} });
  window.__file = file(good);
  await run(`Dashboard._importData('guest@local', window.__file)`);
  assert.equal(run(`DB.getProgress('guest@local').resumeScore`), 64);
  assert.ok(toasts.some((t) => /restored/i.test(t)));

  toasts.length = 0;
  window.__file = file('not json');
  await run(`Dashboard._importData('guest@local', window.__file)`);
  assert.ok(toasts.some((t) => /not valid JSON/i.test(t)));

  toasts.length = 0;
  window.__file = file('{}', 5 * 1024 * 1024);
  await run(`Dashboard._importData('guest@local', window.__file)`);
  assert.ok(toasts.some((t) => /too large/i.test(t)));
});

/* ------------------------------------------------- Company Patterns + animations */
const bootCompany = () => boot(['js/sanitize.js', 'js/data/roles-data.js', 'js/data/company-patterns.js', 'js/company.js'], { html: '<div id="c"></div>' });

test('Company Patterns: typing in the search box updates the list without rebuilding the page', () => {
  const { window, document, run } = bootCompany();
  run(`Company.render(document.getElementById('c'))`);
  const total = run('COMPANY_PATTERNS.patterns.length');
  assert.equal(document.getElementById('patternCount').textContent, `${total} shown`);

  const shellCards = [...document.querySelectorAll('#c > .card')];
  const input = document.getElementById('patternSearch');
  const select = document.getElementById('companyFilter');
  const firstName = run('COMPANY_PATTERNS.patterns[0].name');

  input.value = firstName.slice(0, 5).toLowerCase();
  input.dispatchEvent(new window.Event('input', { bubbles: true }));

  assert.equal(document.getElementById('patternSearch'), input, 'search input is the same element, so it keeps focus');
  assert.equal(document.getElementById('companyFilter'), select);
  assert.deepEqual([...document.querySelectorAll('#c > .card')], shellCards, 'header, insights and list cards are not recreated');
  assert.ok(document.querySelectorAll('#patternGrid [data-pattern]').length < total);
  assert.match(document.getElementById('patternGrid').textContent, new RegExp(firstName.slice(0, 5), 'i'));
});

test('Company Patterns: hostile search text is inert, empty results are explained', () => {
  const { window, document, run } = bootCompany();
  run(`Company.render(document.getElementById('c'))`);
  const input = document.getElementById('patternSearch');
  input.value = '"><img src=x onerror=window.__pwned=1>';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(document.querySelector('#c img'), null);
  assert.match(document.getElementById('patternGrid').textContent, /No patterns match/);
  assert.equal(document.getElementById('patternCount').textContent, '0 shown');
  // clicking a company clears nothing but the company filter and keeps the select in sync
  input.value = '';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  const name = run('COMPANY_PATTERNS.companies[0].name');
  document.querySelector(`[data-company="${name}"]`).click();
  assert.equal(document.getElementById('companyFilter').value, name);
});

test('Company Patterns: a pattern opens on click and on Enter, and Back restores the page', () => {
  const { window, document, run } = bootCompany();
  run(`Company.render(document.getElementById('c'))`);
  const card = document.querySelector('#patternGrid [data-pattern]');
  card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.ok(document.getElementById('backBtn'), 'detail view shown');
  document.getElementById('backBtn').click();
  assert.ok(document.getElementById('patternGrid').children.length > 0);
});

test('animations: filtering/typing never replays the entrance animation, async arrivals still animate', async () => {
  const gsapCalls = { set: 0 };
  const { window, document, run } = boot(['js/animations.js'], {
    html: '<div id="c"><div class="card" id="first">a</div></div>',
    extra: `
      window.matchMedia = () => ({ matches: false });
      window.gsap = { registerPlugin() {}, set() { window.__sets = (window.__sets || 0) + 1; }, to() {} };
      window.ScrollTrigger = { getAll: () => [], batch() {} };
    `
  });
  window.__sets = 0;
  run('Animations.isTouch = true; Animations.init();');
  assert.equal(run('Animations.ready'), true);

  const container = document.getElementById('c');
  run(`Animations.applyTo(document.getElementById('c'))`);
  assert.equal(window.__sets, 1, 'the view animates in once when it first appears');

  // the user types → the list re-renders → no new animation
  document.dispatchEvent(new window.Event('input', { bubbles: true }));
  const rebuilt = document.createElement('div');
  rebuilt.className = 'card';
  container.appendChild(rebuilt);
  await tick();
  assert.equal(window.__sets, 1, 'a re-render caused by typing is shown as-is');

  // later, data arrives on its own (e.g. jobs finish loading) → still animates
  run('Animations._lastInteraction = performance.now() - 5000;');
  const late = document.createElement('div');
  late.className = 'card';
  container.appendChild(late);
  await tick();
  assert.equal(window.__sets, 2);
  void gsapCalls;
});

/* ------------------------------------------------------------------- theme colour */
test('theme: no blue, indigo or violet colours remain in the app styles or scripts', () => {
  const files = [...fs.readdirSync(path.join(root, 'css')).map((f) => `css/${f}`), 'index.html', 'admin.html', 'manifest.webmanifest', 'favicon.svg',
    'js/dashboard.js', 'js/jobs.js', 'js/company.js', 'js/app.js'];
  const hue = (r, g, b) => {
    const [mx, mn] = [Math.max(r, g, b), Math.min(r, g, b)];
    if (mx - mn < 8) return null; // greys and near-whites carry no visible tint
    const d = mx - mn;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    return h < 0 ? h + 360 : h;
  };
  const offenders = [];
  for (const file of files) {
    const text = read(file);
    for (const m of text.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      const h = hue(r, g, b);
      if (h !== null && h >= 195 && h <= 290) offenders.push(`${file} ${m[0]}`);
    }
    for (const m of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      const h = hue(+m[1], +m[2], +m[3]);
      if (h !== null && h >= 195 && h <= 290) offenders.push(`${file} ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, []);
  assert.match(read('css/depth-theme.css'), /--accent:\s*#097a54/);
  assert.match(read('index.html'), /name="theme-color" content="#097a54"/);
});
