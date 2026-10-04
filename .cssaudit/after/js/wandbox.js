/* ============ Wandbox client ============
   Runs a complete program in any language Wandbox offers (https://wandbox.org). The language and compiler
   lists come LIVE from Wandbox (GET /api/list.json), and programs run with POST /api/compile.json, so a language
   added to Wandbox appears here without a code change. Nothing is hard-coded except which languages are left out
   (see EXCLUDED) and the order of the most common ones.

   Calls go straight from the browser (Wandbox allows cross-origin requests and the site's CSP lists wandbox.org).
   If that fails at the network level (blocked, offline extension, corporate proxy) the same request is retried
   through this site's /api/compile proxy, which accepts any compiler from Wandbox's own list.

   Every failure is reported, never swallowed: run() resolves { kind } where kind is one of
     'ok' | 'compile' | 'runtime' | 'timeout' | 'network'
   'network' means we never got an answer (nothing about the program is known); the others describe the program. */
const Wandbox = (() => {
  const API = 'https://wandbox.org/api';
  /* Wandbox language names that cannot run a "read stdin, print stdout" solution. */
  const EXCLUDED = {
    CPP: 'preprocessor only (the real C++ compilers are listed under "C++")',
    OpenSSL: 'a command line tool, not a programming language',
    'Lazy K': 'esoteric language',
    'Vim script': 'cannot read standard input as a program',
    SQL: 'runs queries, not stdin/stdout programs'
  };
  const FIRST = ['C++', 'Python', 'Java', 'C', 'JavaScript', 'TypeScript', 'C#', 'Go', 'Rust', 'Ruby', 'Kotlin', 'Swift', 'PHP'];
  /* Which compiler is the default when a language has several. gcc for C and C++ (clang's C++ library has no
     <bits/stdc++.h>), Mono for C# (the .NET SDK build on Wandbox needs a large scratch file), CPython 3 for Python. */
  const PREFER = { 'C++': /^gcc-\d/, C: /^gcc-\d/, 'C#': /^mono-/, Python: /^cpython-3\.\d+\.\d+$/ };
  const LIST_KEY = 'pp_wandbox_list_v1';
  const LIST_TTL = 24 * 3600 * 1000;
  let cache = null;

  const natural = (a, b) => String(b).localeCompare(String(a), undefined, { numeric: true });
  const isHead = (c) => /head|nightly|dev/i.test(c.name) || !c.version;

  function readStored() {
    try {
      const raw = JSON.parse(localStorage.getItem(LIST_KEY) || 'null');
      if (raw && Array.isArray(raw.list) && Date.now() - raw.at < LIST_TTL) return raw.list;
    } catch {}
    return null;
  }

  function slim(list) {
    return list.map((c) => ({ name: c.name, version: c.version || '', language: c.language, display: c['display-name'] || c.name }));
  }

  async function fetchJson(url, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
    try {
      const res = await fetch(url, { signal: ctl ? ctl.signal : undefined });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally { clearTimeout(t); }
  }

  /** The live compiler list (cached for a day in the browser). Throws an Error with a readable message. */
  async function compilers(force) {
    if (!force && cache) return cache;
    if (!force) {
      const stored = readStored();
      if (stored) return (cache = stored);
    }
    let list;
    try {
      list = await fetchJson(`${API}/list.json`, 15000);
    } catch (direct) {
      try {
        list = await fetchJson('/api/compile?list=1', 15000);
      } catch {
        throw new Error(`Could not load the language list from Wandbox (${direct.message || 'network error'}).`);
      }
    }
    if (!Array.isArray(list) || !list.length) throw new Error('Wandbox returned an empty language list.');
    cache = slim(list);
    try { localStorage.setItem(LIST_KEY, JSON.stringify({ at: Date.now(), list: cache })); } catch {}
    return cache;
  }

  /** [{ language, compilers: [{ name, version, display, head }], default }] from the live list, common languages first. */
  function languages(list) {
    const by = new Map();
    for (const c of list) {
      if (EXCLUDED[c.language]) continue;
      if (!by.has(c.language)) by.set(c.language, []);
      by.get(c.language).push({ name: c.name, version: c.version, display: c.display, head: isHead(c) });
    }
    const out = [...by.entries()].map(([language, cs]) => {
      const stable = cs.filter((c) => !c.head).sort((a, b) => natural(a.version, b.version));
      const heads = cs.filter((c) => c.head);
      const ordered = [...stable, ...heads];
      const preferred = PREFER[language] && stable.find((c) => PREFER[language].test(c.name));
      return { language, compilers: ordered, default: (preferred || ordered[0]).name };
    });
    const rank = (l) => { const i = FIRST.indexOf(l); return i < 0 ? 99 : i; };
    return out.sort((a, b) => rank(a.language) - rank(b.language) || a.language.localeCompare(b.language));
  }

  function classify(data) {
    const status = String(data.status == null ? '' : data.status);
    const compilerErr = String(data.compiler_error || '').trim();
    const ran = Boolean(data.program_output || data.program_error || data.program_message);
    const stdout = String(data.program_output || '');
    const stderr = String(data.program_error || '');
    if (status && status !== '0' && compilerErr && !ran) return { kind: 'compile', stdout, stderr: '', message: compilerErr };
    if (status === '137' || status === '124' || /killed|timed? ?out/i.test(String(data.signal || ''))) {
      return { kind: 'timeout', stdout, stderr, message: `The program was stopped (exit ${status || data.signal}): it ran out of time or memory. Look for an infinite loop or a slower approach than the input needs.` };
    }
    if (status && status !== '0') {
      const hint = { 139: 'Segmentation fault', 134: 'Aborted', 136: 'Arithmetic exception', 1: 'Exited with an error' }[status] || 'Exited with an error';
      return { kind: 'runtime', stdout, stderr, message: `${hint} (exit code ${status}).${stderr ? '\n' + stderr.trim() : ''}` };
    }
    return { kind: 'ok', stdout, stderr, message: '' };
  }

  async function post(url, body, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
      let data = null;
      try { data = await res.json(); } catch {}
      return { res, data };
    } finally { clearTimeout(t); }
  }

  /** Runs one program. Resolves { kind, stdout, stderr, message, ms }. Never rejects. */
  async function run({ compiler, code, stdin = '', timeoutMs = 30000 }) {
    const t0 = Date.now();
    const done = (r) => ({ stdout: '', stderr: '', message: '', ...r, ms: Date.now() - t0 });
    const body = { compiler, code, stdin, save: false };
    let out = null;
    try {
      out = await post(`${API}/compile.json`, body, timeoutMs);
    } catch (e) {
      if (e && e.name === 'AbortError') return done({ kind: 'network', message: `Wandbox did not answer within ${Math.round(timeoutMs / 1000)} seconds. Try again.` });
      try {
        out = await post('/api/compile', body, timeoutMs); // blocked or offline direct call: use this site's proxy
      } catch (e2) {
        return done({ kind: 'network', message: e2 && e2.name === 'AbortError' ? 'The compiler service did not answer in time. Try again.' : 'Could not reach the compiler service (check your connection and try again).' });
      }
    }
    const { res, data } = out;
    if (!res.ok || !data) {
      const why = (data && (data.error || data.message)) || `HTTP ${res.status}`;
      return done({ kind: 'network', message: `The compiler service returned an error: ${why}.` });
    }
    return done(classify(data));
  }

  return { compilers, languages, run, classify, EXCLUDED, isHead };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Wandbox;
