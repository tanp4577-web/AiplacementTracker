/* Boots the real app (index.html + every local script, in order) inside jsdom,
   with just enough browser stubs for the UI to run. Used by the feature tests. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
export const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

const okJson = (data, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data), blob: async () => ({}) });

/** Default network: every /api call answers plausibly; anything else is "offline". */
export function defaultFetch(url) {
  const u = String(url);
  if (u.startsWith('/api/jobs')) {
    return okJson({
      source: u.includes('source=remote') ? 'remote' : 'india', mode: 'remote-fallback', needsSetup: true, notice: 'On-site local listings are not connected yet.', count: 2, page: 1,
      jobs: [
        { id: 'r1', source: 'remote', title: 'Backend Developer', company: 'Acme', location: 'Worldwide', tags: ['node'], description: 'Build APIs with Node.js and SQL.', sourceLabel: 'Remote OK', applyUrl: 'https://remoteok.com/1', created: new Date().toISOString(), isInternship: false },
        { id: 'r2', source: 'remote', title: 'Data Intern', company: 'Globex', location: 'APAC', tags: ['internship'], description: 'Learn analytics.', sourceLabel: 'Jobicy', applyUrl: 'https://jobicy.com/2', created: new Date().toISOString(), isInternship: true }
      ]
    });
  }
  if (u.startsWith('/api/aptitude')) {
    return okJson({ questions: Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, category: 'Quant', difficulty: 'medium', question: `What is ${i} + 1?`, options: [`${i}`, `${i + 1}`, `${i + 2}`, `${i + 3}`], correct: 1, explanation: 'Add one.' })) });
  }
  if (u.startsWith('/api/chat')) return okJson({ reply: 'Practise data structures daily.' });
  if (u.startsWith('/api/compile')) return okJson({ program: '', status: '0', compiler_error: '' });
  if (u.startsWith('/api/job-apply')) return okJson({ matchScore: 72, matchedSkills: ['Node.js'], missingSkills: ['Docker'], skillGapSummary: 'Learn Docker.', recommendations: [{ action: 'Build an API', resourceType: 'Project', outcome: 'Ship it' }], recommendedInterviewQuestions: ['Q1', 'Q2', 'Q3'] });
  return okJson({}, 503);
}

export async function bootApp({ fetch = defaultFetch, session = { id: 'guest', name: 'Guest', email: 'guest@local', role: 'student', guest: true }, users = null, hash = '' } = {}) {
  const errors = [];
  const consoleErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e.detail || e));
  virtualConsole.on('error', (...args) => consoleErrors.push(args.map(String).join(' ')));

  const html = read('index.html').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<link[^>]*>/gi, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: `https://app.test/${hash}`, pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
  window.TextEncoder = TextEncoder;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  window.Element.prototype.scrollIntoView = function scrollIntoView() {};
  window.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: (_, prop) => (prop === 'measureText' ? () => ({ width: 10 }) : prop === 'canvas' ? {} : () => {}), set: () => true });
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
  window.fetch = async (url, init) => fetch(url, init);
  window.alert = () => {};
  window.confirm = () => true;
  window.open = () => null;

  const ctx = dom.getInternalVMContext();
  const run = (code, filename = 'inline.js') => new vm.Script(code, { filename }).runInContext(ctx);
  if (users) window.localStorage.setItem('prepportal_users', JSON.stringify(users));
  if (session) window.localStorage.setItem('prepportal_session', JSON.stringify({ ...session, loginAt: Date.now() }));

  const scripts = [...read('index.html').matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/^https?:/.test(s));
  for (const src of scripts) run(read(src), src);

  // app.js boots itself on DOMContentLoaded (as in a real browser). Wait for that instead of
  // calling App.init() ourselves, otherwise every listener would be registered twice.
  if (window.document.readyState !== 'complete') await new Promise((resolve) => window.addEventListener('load', resolve));
  if (!run('Object.keys(App.views).length')) run('App.init()');
  await tick(320); // let the first route (200ms debounce) finish before tests navigate
  return { dom, window, document: window.document, run, errors, consoleErrors, scripts };
}

export async function goTo(app, view, wait = 320) {
  app.window.location.hash = `#${view}`;
  await tick(wait);
  return app.document.getElementById('viewContainer');
}
