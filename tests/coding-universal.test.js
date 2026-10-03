import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bootApp, goTo, tick, defaultFetch, WANDBOX_LIST } from './app-harness.js';
import { TWO_SUM, TWO_SUM_PARTIAL, TWO_SUM_READLINE } from './coding-programs.js';

const require = createRequire(import.meta.url);
const { loadScript } = require('../tools/coding-bank/load.cjs');
const Judge = loadScript('js/judge.js', 'Judge');
const JsRunner = loadScript('js/js-runner.js', 'JsRunner');
const Skeletons = loadScript('js/skeletons.js', 'Skeletons');
const wandboxWith = (fetchImpl, extra = {}) => loadScript('js/wandbox.js', 'Wandbox', { fetch: fetchImpl, AbortController, ...extra });

const text = (el, n = 3000) => (el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

/* ------------------------------------------------------------------ the shared stdin / stdout layout */

test('judge: every type round-trips through the one text layout, in both directions', () => {
  const types = ['int[]', 'str', 'str[]', 'int[][]', 'bool', 'float', 'str[][]', 'int?[]', 'int', 'int[]'];
  const values = [[], '  hello  world ', ['a b', '', 'c'], [[1, 2], [], [3]], true, 2.5, [['X', 'O'], ['.']], [1, null, 2], -7, [4, 5]];
  const stdin = Judge.encode(types, values);
  assert.deepEqual(JSON.parse(JSON.stringify(Judge.decodeInput(types, stdin))), values);
  assert.equal(Judge.encode('int[]', [1, 2, 3]), '3\n1 2 3\n');
  assert.equal(Judge.encode('str[]', ['a', 'b']), '2\na\nb\n');
  assert.equal(Judge.encode('int[][]', [[1, 2], [3]]), '2\n2 1 2\n1 3\n');
  assert.throws(() => Judge.encode('str', 'two\nlines'), /line break/);
  assert.throws(() => Judge.encode('str[][]', [['a b']]), /space/);
});

test('judge: compares values, not text, and is tolerant about whitespace', () => {
  const ok = (io, expected, out, inputs = []) => Judge.compare(io, expected, out, inputs);
  assert.equal(ok({ out: 'int[]' }, [1, 2], '2\n1   2\n\n').pass, true, 'extra spaces and blank lines');
  assert.equal(ok({ out: 'int[]' }, [1, 2], '2 1 2').pass, true, 'all on one line');
  assert.equal(ok({ out: 'int[]' }, [1, 2], '2\n2 1').pass, false, 'order matters by default');
  assert.equal(ok({ out: 'int[]', cmp: 'sort' }, [1, 2], '2\n2 1').pass, true, 'unless the question says it does not');
  assert.equal(ok({ out: 'int[][]', cmp: 'sortAll' }, [[1], [2, 3]], '2\n2 2 3\n1 1').pass, true);
  assert.equal(ok({ out: 'int[]' }, [], '0\n').pass, true, 'an empty answer');
  assert.equal(ok({ out: 'float' }, 1024, '1024.0000001').pass, true, 'floats within 1e-6');
  assert.equal(ok({ out: 'float' }, 1024, '1025').pass, false);
  assert.equal(ok({ out: 'bool' }, true, 'True').pass, true, 'Python-style booleans');
  assert.equal(ok({ out: 'str' }, 'abc', 'abc \n').pass, true, 'trailing spaces are not part of the answer');
  assert.equal(ok({ out: 'str' }, 'a b', 'a  b').pass, false, 'but inner spaces are');
  assert.equal(ok({ out: 'int?[]' }, [1, null, 2], '3\n1 null 2 null null').pass, true, 'trailing nulls of a tree do not matter');
  assert.equal(ok({ out: 'tok[]' }, ['true', '3'], '2\nTrue\n3').pass, true);
});

test('judge: unreadable or missing output fails with a plain explanation', () => {
  const none = Judge.compare({ out: 'int' }, 3, '', []);
  assert.equal(none.pass, false);
  assert.match(none.message, /printed nothing/);
  const junk = Judge.compare({ out: 'int' }, 3, 'three', []);
  assert.match(junk.message, /Could not read your output as an integer/);
  const short = Judge.compare({ out: 'int[]' }, [1, 2, 3], '3\n1 2', []);
  assert.match(short.message, /ended too early/);
});

test('judge: "any valid answer" questions use a checker that really checks', () => {
  const c = (check, inputs, out, expected) => Judge.compare({ out: out.type, check }, expected, out.text, inputs);
  const wiggle = (text) => c('wiggle', [[3, 5, 2, 1, 6, 4]], { type: 'int[]', text }, [1, 5, 1, 4, 2, 6]);
  assert.equal(wiggle('6\n3 5 1 6 2 4').pass, true);
  assert.equal(wiggle('6\n1 2 3 4 5 6').pass, false, 'sorted is not a wiggle');
  assert.equal(wiggle('6\n3 5 2 1 6 9').pass, false, 'must be a permutation of the input');
  assert.equal(c('peak', [[1, 2, 3, 1]], { type: 'int', text: '2' }, 2).pass, true);
  assert.equal(c('peak', [[1, 2, 3, 1]], { type: 'int', text: '1' }, 2).pass, false);
  assert.equal(c('reorganize', ['aab'], { type: 'str', text: 'aba' }, 'aba').pass, true);
  assert.equal(c('reorganize', ['aab'], { type: 'str', text: 'aab' }, 'aba').pass, false);
  assert.equal(c('courseOrder', [2, [[1, 0]]], { type: 'int[]', text: '2\n0 1' }, [0, 1]).pass, true);
  assert.equal(c('courseOrder', [2, [[1, 0]]], { type: 'int[]', text: '2\n1 0' }, [0, 1]).pass, false);
  assert.equal(c('alien', [['wrt', 'wrf', 'er', 'ett', 'rftt']], { type: 'str', text: 'wertf' }, 'wertf').pass, true);
  assert.equal(c('alien', [['wrt', 'wrf', 'er', 'ett', 'rftt']], { type: 'str', text: 'fewrt' }, 'wertf').pass, false);
  assert.equal(c('balancedBst', [[-10, -3, 0, 5, 9]], { type: 'int?[]', text: '7\n0 -10 5 null -3 null 9' }, [0, -10, 5, null, -3, null, 9]).pass, true);
  assert.equal(c('balancedBst', [[1, 2, 3]], { type: 'int?[]', text: '5\n1 null 2 null 3' }, [2, 1, 3]).pass, false, 'a chain is not balanced');
});

/* ------------------------------------------------------------------ the in-browser JavaScript runner */

test('js runner: fs, readline, process.stdin and process.stdout all work like Node', async () => {
  const sum = (code) => JsRunner.run(code, '3\n4\n');
  const a = await sum(`const t = require('fs').readFileSync(0, 'utf8').split('\\n'); console.log(Number(t[0]) + Number(t[1]));`);
  assert.deepEqual([a.kind, a.stdout], ['ok', '7\n']);
  const b = await sum(`const rl = require('readline').createInterface({ input: process.stdin }); let n = 0; rl.on('line', () => n++); rl.on('close', () => console.log(n));`);
  assert.deepEqual([b.kind, b.stdout], ['ok', '2\n']);
  const c = await sum(`let d = ''; process.stdin.on('data', (x) => { d += x; }); process.stdin.on('end', () => process.stdout.write(d.trim().split('\\n').join('+')));`);
  assert.equal(c.stdout, '3+4');
  const d = await sum(`(async () => { const rl = require('readline').createInterface({ input: process.stdin }); let n = 0; for await (const l of rl) n += Number(l); console.log(n); })();`);
  assert.equal(d.stdout, '7\n');
  const e = await sum(`console.log('a'); process.exit(0); console.log('b');`);
  assert.deepEqual([e.kind, e.stdout], ['ok', 'a\n']);
});

test('js runner: a crash is a runtime error with the message, and output printed before it is kept', async () => {
  const r = await JsRunner.run(`console.log('before'); null.x;`, '');
  assert.equal(r.kind, 'runtime');
  assert.equal(r.stdout, 'before\n');
  assert.match(r.error, /TypeError/);
  const syntax = await JsRunner.run('function (', '');
  assert.equal(syntax.kind, 'runtime');
  assert.match(syntax.error, /SyntaxError/);
  const missing = await JsRunner.run(`require('child_process')`, '');
  assert.match(missing.error, /Cannot find module/);
  assert.ok(Number.isFinite(r.ms));
});

/* ------------------------------------------------------------------ the Wandbox client */

test('wandbox: languages come from the live list, grouped, with sensible defaults and documented exclusions', () => {
  const W = wandboxWith(async () => json(WANDBOX_LIST));
  const langs = W.languages(WANDBOX_LIST.map((c) => ({ name: c.name, version: c.version, language: c.language, display: c['display-name'] })));
  const names = langs.map((l) => l.language);
  assert.deepEqual([...names.slice(0, 3)], ['C++', 'Python', 'Java'], 'common languages first');
  assert.ok(!names.includes('Lazy K') && !names.includes('CPP'), 'languages that cannot run a stdin/stdout program are left out');
  assert.ok(W.EXCLUDED['Lazy K'] && W.EXCLUDED.CPP, 'and the reason is written down');
  const cpp = langs.find((l) => l.language === 'C++');
  assert.equal(cpp.default, 'gcc-13.2.0', 'gcc is the default for C++ (clang has no bits/stdc++.h)');
  assert.equal(cpp.compilers.at(-1).name, 'gcc-head', 'development builds are listed last');
  assert.equal(langs.find((l) => l.language === 'Python').default, 'cpython-3.14.0', 'newest stable CPython 3');
  assert.deepEqual([...langs.find((l) => l.language === 'Python').compilers.map((c) => c.head)], [false, false, true]);
});

test('wandbox: every outcome is classified, nothing is swallowed', async () => {
  const W = wandboxWith(async () => json({}));
  assert.equal(W.classify({ status: '0', program_output: '42\n' }).kind, 'ok');
  const compile = W.classify({ status: '1', compiler_error: "prog.cc:1:20: error: 'x' was not declared", program_output: '' });
  assert.equal(compile.kind, 'compile');
  assert.match(compile.message, /was not declared/);
  assert.equal(W.classify({ status: '0', compiler_error: 'warning: unused variable', program_output: '1' }).kind, 'ok', 'warnings are not errors');
  const rte = W.classify({ status: '139', program_output: '', program_error: '' });
  assert.equal(rte.kind, 'runtime');
  assert.match(rte.message, /Segmentation fault/);
  const py = W.classify({ status: '1', program_error: 'Traceback...\nZeroDivisionError: division by zero\n' });
  assert.equal(py.kind, 'runtime');
  assert.match(py.message, /ZeroDivisionError/);
  const tle = W.classify({ status: '137', program_output: '' });
  assert.equal(tle.kind, 'timeout');
  assert.match(tle.message, /time or memory/);
});

test('wandbox: run() sends the compiler, code and stdin, retries through the site proxy, and reports network failures', async () => {
  const seen = [];
  const W = wandboxWith(async (url, init) => {
    seen.push([String(url), init && init.body ? JSON.parse(init.body) : null]);
    if (String(url).startsWith('https://wandbox.org')) throw new TypeError('Failed to fetch'); // blocked
    return json({ status: '0', program_output: '6\n' });
  });
  const r = await W.run({ compiler: 'cpython-3.12.7', code: 'print(6)', stdin: '1\n' });
  assert.equal(r.kind, 'ok');
  assert.equal(r.stdout, '6\n');
  assert.deepEqual(seen.map((s) => s[0]), ['https://wandbox.org/api/compile.json', '/api/compile']);
  assert.deepEqual(seen[0][1], { compiler: 'cpython-3.12.7', code: 'print(6)', stdin: '1\n', save: false });

  const down = wandboxWith(async () => { throw new TypeError('Failed to fetch'); });
  const d = await down.run({ compiler: 'x', code: 'y' });
  assert.equal(d.kind, 'network');
  assert.match(d.message, /Could not reach the compiler service/);

  const http = wandboxWith(async () => json({ error: 'Unsupported compiler' }, 400));
  const h = await http.run({ compiler: 'x', code: 'y' });
  assert.equal(h.kind, 'network');
  assert.match(h.message, /Unsupported compiler/);

  const slow = wandboxWith((url, init) => new Promise((_, reject) => { init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); }));
  const s = await slow.run({ compiler: 'x', code: 'y', timeoutMs: 30 });
  assert.equal(s.kind, 'network');
  assert.match(s.message, /did not answer within/);
});

test('starter templates: one per language, none of them about a particular question', () => {
  const langs = Skeletons.languages();
  assert.ok(langs.length >= 25);
  for (const l of ['C', 'C++', 'C#', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Ruby', 'Swift', 'PHP', 'Kotlin'].filter((x) => x !== 'Kotlin')) {
    assert.ok(Skeletons.for(l).code.length > 20, `${l} has a template`);
  }
  for (const l of langs) assert.doesNotMatch(Skeletons.for(l).code, /two ?sum|twoSum/i, `${l} template is generic`);
  assert.equal(Skeletons.for('Brainfuck').code, '', 'an unknown language gets an empty editor, not a wrong template');
  assert.equal(Skeletons.for('Python').ext, 'py');
});

/* ------------------------------------------------------------------ the page */

async function openTwoSum(app) {
  await goTo(app, 'coding');
  [...app.document.querySelectorAll('#questionList > *')].find((el) => /Two Sum/.test(el.textContent)).click();
  await tick(400);
}

const setCode = (app, code) => { app.document.getElementById('codeEditor').value = code; };
const run = async (app, ms = 400) => { app.document.getElementById('runBtn').click(); await tick(ms); };
const select = async (app, id, value) => {
  const el = app.document.getElementById(id);
  el.value = value;
  el.dispatchEvent(new app.window.Event('change'));
  await tick(40);
};

test('coding page: a question shows its Input / Output format and a real example from its tests', async () => {
  const app = await bootApp();
  await openTwoSum(app);
  const spec = text(app.document.getElementById('ioSpec'));
  assert.match(spec, /Input/);
  assert.match(spec, /`?nums`?: a line with the count/);
  assert.match(spec, /target.*integer on one line/);
  assert.match(spec, /Output/);
  assert.match(text(app.document.getElementById('ioSpec')), /Example/);
  const q = app.run('Coding.state.current');
  assert.equal(app.document.querySelector('#ioSpec .io-example pre').textContent, q.testCases[0].stdin);
  assert.deepEqual(app.errors, []);
});

test('coding page: JavaScript runs instantly in the browser; a full program passes, a wrong one is Wrong Answer', async () => {
  const calls = [];
  const app = await bootApp({ fetch: (u, i) => { calls.push(String(u)); return defaultFetch(u, i); } });
  await openTwoSum(app);
  assert.equal(app.document.getElementById('langSelect').value, 'JavaScript');
  assert.equal(app.document.getElementById('compilerSelect').value, 'browser');
  assert.match(text(app.document.getElementById('langNote')), /instantly in your browser/);
  calls.length = 0;

  await run(app); // the untouched JavaScript skeleton prints nothing
  assert.match(text(app.document.getElementById('verdict')), /Wrong Answer/);
  setCode(app, TWO_SUM_PARTIAL);
  await run(app);
  const partial = text(app.document.getElementById('testResults'), 6000);
  assert.match(partial, /Wrong Answer/);
  setCode(app, TWO_SUM);
  await run(app);
  assert.match(text(app.document.getElementById('verdict')), /Accepted/);
  assert.match(text(app.document.getElementById('testResults')), /([1-9]\d*)\/\1 Tests passed/);
  assert.ok(app.run(`DB.getProgress('guest@local').coding.solved.includes('two-sum')`));
  assert.ok(!calls.some((u) => u.includes('compile')), 'no network was used');

  setCode(app, TWO_SUM_READLINE);
  await run(app);
  assert.match(text(app.document.getElementById('verdict')), /Accepted/, 'reading stdin with readline works too');
  const subs = app.run(`DB.getProgress('guest@local').coding.submissions`);
  assert.equal(subs.length, 4);
  assert.equal(subs.at(-1).lang, 'JavaScript');
  assert.deepEqual(app.errors, []);
});

test('coding page: a crash and a syntax error are reported with their message, not thrown', async () => {
  const app = await bootApp();
  await openTwoSum(app);
  setCode(app, 'function twoSum( {');
  await run(app);
  assert.match(text(app.document.getElementById('verdict')), /Runtime Error/);
  assert.match(text(app.document.getElementById('testResults')), /SyntaxError/);
  setCode(app, `console.log('partial'); throw new Error('boom');`);
  await run(app);
  const out = text(app.document.getElementById('testResults'), 6000);
  assert.match(out, /Runtime Error/);
  assert.match(out, /boom/);
  assert.match(out, /partial/, 'what was printed before the crash is shown');
  assert.deepEqual(app.errors, []);
});

test('coding page: a time limit stops the run and is recorded as Time Limit Exceeded', async () => {
  const app = await bootApp();
  await openTwoSum(app);
  app.run(`window.__run = JsRunner.run; JsRunner.run = async () => ({ kind: 'timeout', stdout: '', stderr: '', error: 'Time limit exceeded (3 s).', ms: 3000 });`);
  setCode(app, 'while (true) {}');
  await run(app);
  assert.match(text(app.document.getElementById('verdict')), /Time Limit Exceeded/);
  assert.match(text(app.document.getElementById('testResults')), /NOT RUN/, 'the remaining tests are not run after the first time limit');
  const sub = app.run(`DB.getProgress('guest@local').coding.submissions.at(-1)`);
  assert.equal(sub.verdict, 'Time Limit Exceeded');
  app.run('JsRunner.run = window.__run');
});

test('coding page: every Wandbox language is offered, and a program in another language runs there', async () => {
  const sent = [];
  const app = await bootApp({
    fetch: (u, init) => {
      if (String(u).includes('wandbox.org/api/compile.json')) {
        const body = JSON.parse(init.body);
        sent.push(body);
        const q = app.run('Coding.state.current');
        const t = q.testCases.find((x) => x.stdin === body.stdin);
        return json({ status: '0', signal: '', compiler_error: '', program_output: t.expectedStdout, program_error: '' });
      }
      return defaultFetch(u, init);
    }
  });
  await openTwoSum(app);
  const options = [...app.document.querySelectorAll('#langSelect option')].map((o) => o.value);
  assert.deepEqual(options, ['JavaScript', 'C++', 'Python', 'Java', 'Rust'], 'JavaScript, then what Wandbox listed (no excluded ones)');
  assert.deepEqual([...app.document.querySelectorAll('#compilerSelect option')].map((o) => o.value), ['browser', 'nodejs-20.17.0']);

  setCode(app, 'js draft');
  await select(app, 'langSelect', 'Python');
  assert.equal(app.document.getElementById('compilerSelect').value, 'cpython-3.14.0');
  assert.equal(app.document.getElementById('codeFileLabel').textContent, 'solution.py');
  assert.match(app.document.getElementById('codeEditor').value, /import sys/, 'starts from the Python template');
  setCode(app, 'print("my python")');
  await select(app, 'langSelect', 'JavaScript');
  assert.equal(app.document.getElementById('codeEditor').value, 'js draft', 'switching back keeps what you typed');
  await select(app, 'langSelect', 'Python');
  assert.equal(app.document.getElementById('codeEditor').value, 'print("my python")');

  await run(app, 900);
  assert.ok(sent.length >= 5, 'every test was sent to Wandbox');
  assert.equal(sent[0].compiler, 'cpython-3.14.0');
  assert.equal(sent[0].code, 'print("my python")');
  assert.match(text(app.document.getElementById('verdict')), /Accepted/);
  assert.match(text(app.document.getElementById('testResults')), /including the trip to Wandbox/);
  assert.equal(app.run(`DB.getProgress('guest@local').coding.submissions.at(-1).lang`), 'Python');
  assert.equal(app.run(`DB.getProgress('guest@local').coding.submissions.at(-1).compiler`), 'cpython-3.14.0');

  // the choice is remembered for the next question
  app.document.getElementById('backBtn').click();
  await tick(60);
  [...app.document.querySelectorAll('#questionList > *')].find((el) => /FizzBuzz/.test(el.textContent)).click();
  await tick(400);
  assert.equal(app.document.getElementById('langSelect').value, 'Python');
  assert.deepEqual(app.errors, []);
});

test('coding page: compile errors, runtime errors and a dead network each show their own clear state', async () => {
  let mode = 'compile';
  const app = await bootApp({
    fetch: (u, init) => {
      if (String(u).includes('wandbox.org/api/compile.json')) {
        if (mode === 'compile') return json({ status: '1', compiler_error: "prog.cc:3:5: error: 'x' was not declared in this scope", program_output: '', program_error: '' });
        if (mode === 'runtime') return json({ status: '139', program_output: '', program_error: '' });
        if (mode === 'down') throw new TypeError('Failed to fetch');
      }
      if (String(u).startsWith('/api/compile') && mode === 'down') throw new TypeError('Failed to fetch');
      return defaultFetch(u, init);
    }
  });
  await openTwoSum(app);
  await select(app, 'langSelect', 'C++');
  setCode(app, 'int main() { return x; }');

  await run(app, 600);
  assert.match(text(app.document.getElementById('verdict')), /Compile Error/);
  assert.match(text(app.document.getElementById('compileError')), /'x' was not declared/);
  assert.equal(app.document.querySelectorAll('#testResults .test-case.fail').length >= 1, true);

  mode = 'runtime';
  await run(app, 900);
  assert.match(text(app.document.getElementById('verdict')), /Runtime Error/);
  assert.match(text(app.document.getElementById('testResults')), /Segmentation fault/);

  const before = app.run(`DB.getProgress('guest@local').coding.submissions.length`);
  mode = 'down';
  await run(app, 900);
  assert.match(text(app.document.getElementById('verdict')), /No answer from the compiler service/);
  assert.match(text(app.document.getElementById('runError')), /Could not reach the compiler service/);
  assert.equal(app.run(`DB.getProgress('guest@local').coding.submissions.length`), before, 'a run that got no answer is not recorded as a submission');
  mode = 'compile';
  app.document.getElementById('retryRunBtn').click();
  await tick(600);
  assert.match(text(app.document.getElementById('verdict')), /Compile Error/, 'Try again really runs again');
  assert.deepEqual(app.errors, []);
});

test('coding page: if the language list cannot be loaded you still get JavaScript, a clear message and a working retry', async () => {
  let listUp = false;
  const app = await bootApp({
    fetch: (u, init) => {
      if (String(u).endsWith('/api/list.json') || String(u).startsWith('/api/compile?list')) {
        if (!listUp) throw new TypeError('Failed to fetch');
      }
      return defaultFetch(u, init);
    }
  });
  await openTwoSum(app);
  assert.deepEqual([...app.document.querySelectorAll('#langSelect option')].map((o) => o.value), ['JavaScript']);
  assert.match(text(app.document.getElementById('langNote')), /Could not load the language list from Wandbox/);
  setCode(app, TWO_SUM);
  await run(app);
  assert.match(text(app.document.getElementById('verdict')), /Accepted/, 'JavaScript still works with no Wandbox');

  listUp = true;
  app.document.getElementById('langRetryBtn').click();
  await tick(200);
  assert.ok([...app.document.querySelectorAll('#langSelect option')].length > 1, 'the list loads on retry');
  assert.deepEqual(app.errors, []);
});

test('coding page: the saved language is restored (including the old "cpp" setting) and an unknown one falls back to JavaScript', async () => {
  let app = await bootApp();
  app.window.localStorage.setItem('pp_code_lang', 'cpp');
  await openTwoSum(app);
  assert.equal(app.document.getElementById('langSelect').value, 'C++');
  assert.equal(app.document.getElementById('compilerSelect').value, 'gcc-13.2.0');

  app = await bootApp();
  app.window.localStorage.setItem('pp_code_lang', 'Brainfuck');
  await openTwoSum(app);
  assert.equal(app.document.getElementById('langSelect').value, 'JavaScript');
});
