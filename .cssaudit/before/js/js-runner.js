/* ============ In-browser JavaScript runner ============
   Runs a COMPLETE program (it reads standard input and prints to standard output) in the browser, so JavaScript
   keeps instant results and needs no network. It follows the same contract every other language uses on Wandbox:
   stdin in, stdout out. `require('fs').readFileSync(0)`, `readline`, `process.stdin` and `process.stdout.write`
   / `console.log` all work, as they would under Node.

   The program runs in a Web Worker that is terminated after the time limit, so an infinite loop cannot freeze the
   page. Where Workers do not exist (tests, very old browsers) it runs on the main thread instead. */
const JsRunner = (() => {
  /* Everything this function needs is inside it: its source text is also sent to the Worker. */
  async function execute(code, stdin) {
    const LIMIT = 2000000; // characters of output kept
    let stdout = '';
    let stderr = '';
    const text = String(stdin);
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    class ExitSignal { constructor(code) { this.code = code; } }
    const put = (s) => { if (stdout.length < LIMIT) stdout += String(s); };
    const err = (s) => { if (stderr.length < LIMIT) stderr += String(s); };
    const show = (v) => {
      if (typeof v === 'string') return v;
      try { return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v); } catch { return String(v); }
    };
    const fmt = (...a) => a.map(show).join(' ');
    const consoleShim = {
      log: (...a) => put(fmt(...a) + '\n'), info: (...a) => put(fmt(...a) + '\n'), debug: (...a) => put(fmt(...a) + '\n'),
      error: (...a) => err(fmt(...a) + '\n'), warn: (...a) => err(fmt(...a) + '\n'), table: (...a) => put(fmt(...a) + '\n'),
      time() {}, timeEnd() {}, assert() {}, trace() {}
    };
    // Delivers the input once, after the program has had the chance to register its listeners.
    let listening = false; // did the program register for stdin events?
    const later = (fn) => { listening = true; (typeof setImmediate === 'function' ? setImmediate : (f) => setTimeout(f, 0))(fn); };
    const stdinShim = {
      _h: {}, _sent: false,
      setEncoding() { return this; }, resume() { return this; }, pause() { return this; }, unref() { return this; },
      on(ev, fn) {
        (this._h[ev] = this._h[ev] || []).push(fn);
        if (!this._sent) {
          this._sent = true;
          later(() => { (this._h.data || []).forEach((f) => f(text)); (this._h.readable || []).forEach((f) => f()); (this._h.end || []).forEach((f) => f()); (this._h.close || []).forEach((f) => f()); });
        }
        return this;
      },
      once(ev, fn) { return this.on(ev, fn); },
      read() { if (this._read) return null; this._read = true; return text; },
      [Symbol.asyncIterator]() { let sent = false; return { next: async () => (sent ? { done: true, value: undefined } : ((sent = true), { done: false, value: text })) }; }
    };
    const processShim = {
      stdin: stdinShim, stdout: { write: (s) => { put(s); return true; }, isTTY: false }, stderr: { write: (s) => { err(s); return true; } },
      argv: ['node', 'main.js'], env: {}, platform: 'linux', version: 'v20.0.0', versions: { node: '20.0.0' },
      exit(c) { throw new ExitSignal(c || 0); }, exitCode: 0,
      nextTick: (f, ...a) => Promise.resolve().then(() => f(...a)),
      hrtime: Object.assign(() => { const t = Date.now(); return [Math.floor(t / 1000), (t % 1000) * 1e6]; }, { bigint: () => BigInt(Date.now()) * 1000000n }),
      memoryUsage: () => ({ heapUsed: 0, rss: 0 }), cwd: () => '/', on() { return this; }, once() { return this; }
    };
    const fsShim = {
      readFileSync(p) {
        if (p === 0 || p === '/dev/stdin' || p === 'stdin') return text;
        const e = new Error(`ENOENT: no such file or directory, open '${p}'`); e.code = 'ENOENT'; throw e;
      },
      writeSync(fd, s) { if (fd === 2) err(s); else put(s); return String(s).length; },
      writeFileSync(p, s) { if (p === 1 || p === '/dev/stdout') put(s); else if (p === 2 || p === '/dev/stderr') err(s); },
      existsSync: () => false
    };
    const readlineShim = {
      createInterface() {
        const h = {};
        const rl = {
          on(ev, fn) { (h[ev] = h[ev] || []).push(fn); return rl; },
          once(ev, fn) { return rl.on(ev, fn); },
          close() { (h.close || []).splice(0).forEach((f) => f()); },
          setPrompt() {}, prompt() {}, pause() { return rl; }, resume() { return rl; },
          question(q, cb) { put(q); cb(lines.shift() ?? ''); },
          [Symbol.asyncIterator]() { rl._iter = true; let i = 0; return { next: async () => (i < lines.length ? { done: false, value: lines[i++] } : { done: true, value: undefined }) }; }
        };
        later(() => { if (!rl._iter) { lines.forEach((l) => (h.line || []).forEach((f) => f(l))); rl.close(); } });
        return rl;
      }
    };
    const utilShim = { inspect: show, format: fmt, promisify: (f) => (...a) => new Promise((res, rej) => f(...a, (e, v) => (e ? rej(e) : res(v)))), isDeepStrictEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b) };
    const modules = { fs: fsShim, readline: readlineShim, util: utilShim, process: processShim, perf_hooks: { performance: typeof performance !== 'undefined' ? performance : { now: () => Date.now() } }, events: null };
    const requireShim = (name) => {
      const n = String(name).replace(/^node:/, '');
      if (n === 'events') {
        return class EventEmitter {
          constructor() { this._e = {}; }
          on(e, f) { (this._e[e] = this._e[e] || []).push(f); return this; }
          emit(e, ...a) { (this._e[e] || []).forEach((f) => f(...a)); return true; }
        };
      }
      if (modules[n]) return modules[n];
      throw new Error(`Cannot find module '${name}'. Only fs, readline, util, events and perf_hooks are available here.`);
    };
    const moduleShim = { exports: {} };
    let error = '';
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const main = new AsyncFunction('require', 'process', 'console', 'module', 'exports', code);
      await main(requireShim, processShim, consoleShim, moduleShim, moduleShim.exports);
      // let queued input events and timers finish
      for (let i = 0; i < 20; i++) await Promise.resolve();
      if (listening) for (let i = 0; i < 4; i++) await new Promise((r) => (typeof setImmediate === 'function' ? setImmediate(r) : setTimeout(r, 0)));
    } catch (e) {
      if (!(e instanceof ExitSignal)) error = e && e.stack ? String(e.stack).split('\n').slice(0, 4).join('\n') : String(e);
    }
    return { stdout, stderr, error };
  }

  const WORKER_SOURCE = `const execute = ${execute.toString()};\nonmessage = async (e) => { postMessage(await execute(e.data.code, e.data.stdin)); };`;

  /** Runs `code` with `stdin`. Resolves { kind: 'ok' | 'runtime' | 'timeout', stdout, stderr, error, ms }. Never rejects. */
  function run(code, stdin, timeoutMs = 3000) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const done = (r) => ({ ...r, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0) });
    const finish = (r) => done({ kind: r.error ? 'runtime' : 'ok', stdout: r.stdout || '', stderr: r.stderr || '', error: r.error || '' });
    const direct = () => execute(code, stdin).then(finish, (e) => finish({ error: String((e && e.message) || e) }));
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return direct();
    return new Promise((resolve) => {
      let worker;
      let url;
      try {
        url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
        worker = new Worker(url);
      } catch {
        resolve(direct());
        return;
      }
      const end = (r) => { clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url); resolve(r); };
      const timer = setTimeout(() => end(done({ kind: 'timeout', stdout: '', stderr: '', error: `Time limit exceeded (${timeoutMs / 1000} s). Look for an infinite loop, or an approach that is too slow for the input.` })), timeoutMs);
      worker.onmessage = (e) => end(finish(e.data));
      worker.onerror = (e) => end(finish({ error: String(e.message || 'Script error') }));
      worker.postMessage({ code, stdin });
    });
  }

  return { run, execute };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = JsRunner;
