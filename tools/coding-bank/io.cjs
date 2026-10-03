/* Turns a problem written as "function + argument arrays" into the language-agnostic stdin/stdout form.

   For every problem it works out:
     - the type of each input and of the answer (from the test data itself, or from the CUSTOM table below),
     - the stdin text of every test and the stdout text that is the expected answer,
     - how answers are compared (exact, order-free, or a checker for "any valid answer" problems),
     - the plain-language "Input" / "Output" sections shown on the page.
   And it can write a COMPLETE JavaScript program for any approach, which build.cjs runs through the same
   runner and judge the browser uses. That is what proves every question has a real, executable stdin/stdout
   definition, not just a description of one. */
const vm = require('vm');
const { loadScript } = require('./load.cjs');
const fs = require('fs');
const path = require('path');
const PRELUDE = require('./prelude.cjs');

const Judge = loadScript('js/judge.js', 'Judge');
const JsRunner = loadScript('js/js-runner.js', 'JsRunner');
const JUDGE_SOURCE = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'judge.js'), 'utf8');

const J = (v) => JSON.stringify(v);

/* ------------------------------------------------------------------ type inference */

function depthOf(v) {
  if (!Array.isArray(v)) return 0;
  return 1 + v.reduce((m, x) => Math.max(m, depthOf(x)), 0);
}

function leaves(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => leaves(x, out)); else out.push(v);
  return out;
}

/** The Judge type of one position (an input, or the answer) from all of its example values. */
function inferType(values, hint) {
  if (hint) return hint;
  const dims = values.reduce((m, v) => Math.max(m, depthOf(v)), 0);
  const kinds = new Set();
  for (const v of values) for (const x of leaves(v)) kinds.add(x === null ? 'null' : typeof x === 'number' ? (Number.isInteger(x) ? 'int' : 'float') : typeof x);
  let base;
  if (kinds.size === 0) base = 'int';
  else if ([...kinds].every((k) => k === 'int')) base = 'int';
  else if ([...kinds].every((k) => k === 'int' || k === 'float')) base = 'float';
  else if ([...kinds].every((k) => k === 'int' || k === 'null')) base = 'int?';
  else if (kinds.size === 1 && kinds.has('string')) base = 'str';
  else if (kinds.size === 1 && kinds.has('boolean')) base = 'bool';
  else throw new Error(`cannot infer a type from the kinds ${[...kinds].join(', ')}; add a CUSTOM entry`);
  if (base === 'int?' && dims === 0) throw new Error('a nullable scalar needs a CUSTOM entry');
  return base + '[]'.repeat(dims);
}

/** 'tree' | 'list' | 'graph' for each parameter, and for the answer, read from the problem's own expr(). */
function kindsFromExpr(p, argCount) {
  const out = { args: Array(argCount).fill(''), ret: '' };
  if (typeof p.expr !== 'function') return out;
  const src = p.expr.toString();
  const names = (src.match(/^\s*\(?([^)=]*)\)?\s*=>/) || [, ''])[1].split(',').map((s) => s.trim());
  names.forEach((n, i) => {
    if (!n || i >= argCount) return;
    const esc = n.replace(/[$]/g, '\\$');
    if (new RegExp(`fromTree\\(\\$\\{J\\(${esc}\\)\\}`).test(src)) out.args[i] = 'tree';
    else if (new RegExp(`fromListCycle\\(\\$\\{J\\(${esc}\\)\\}`).test(src) || new RegExp(`fromList\\(\\$\\{J\\(${esc}\\)\\}`).test(src)) out.args[i] = 'list';
    else if (new RegExp(`fromGraph\\(\\$\\{J\\(${esc}\\)\\}`).test(src)) out.args[i] = 'graph';
  });
  if (/toTree\(/.test(src)) out.ret = 'tree';
  else if (/toList\(/.test(src)) out.ret = 'list';
  return out;
}

function paramNames(p, n) {
  const names = String(p.params || '').split(',').map((s) => s.trim().replace(/\s*=.*$/, '')).filter(Boolean);
  if (names.length === n) return names;
  return Array.from({ length: n }, (_, i) => `arg${i + 1}`);
}

/* ------------------------------------------------------------------ problems that need their own definition */

/* A few problems are not plain "arguments in, value out":
   - several answers are valid (a checker decides),
   - the object under test is a class (an operation script is the input),
   - the original returned a handle that stdout cannot carry (a graph clone, a codec), so the question is
     restated so that something checkable is printed.
   `args(old)` maps an old test's argument list to the new inputs; `call` is the JavaScript expression that
   produces the answer from the decoded inputs (__A). */
const CUSTOM = {
  'wiggle-sort': { inTypes: ['int[]'], out: 'int[]', check: 'wiggle', call: 'wiggleSort(__A[0])', note: 'Any valid wiggle-sorted arrangement is accepted.' },
  'find-peak-element': { inTypes: ['int[]'], out: 'int', check: 'peak', call: 'findPeakElement(__A[0])', note: 'Print the index of any peak. Any valid index is accepted.' },
  'reorganize-string': { inTypes: ['str'], out: 'str', check: 'reorganize', call: 'reorganizeString(__A[0])', note: 'Print any rearrangement with no two equal neighbours, or an empty line if none exists.' },
  'course-schedule-ii': { inTypes: ['int', 'int[][]'], out: 'int[]', check: 'courseOrder', call: 'findOrder(__A[0], __A[1])', note: 'Print any valid order (count, then the order). If it is impossible print 0 and an empty line.' },
  'alien-dictionary': { inTypes: ['str[]'], out: 'str', check: 'alien', call: 'alienOrder(__A[0])', note: 'Print any valid order of the letters, or an empty line if the words are inconsistent.' },
  'sorted-array-to-bst': { inTypes: ['int[]'], kinds: { ret: 'tree' }, out: 'int?[]', check: 'balancedBst', call: 'toTree(sortedArrayToBST(__A[0]))', note: 'Print the tree you build in level order. Any height-balanced tree whose in-order traversal is the input is accepted.' },
  'clone-graph': { inTypes: ['int[][]'], kinds: { args: ['graph'] }, out: 'int[][]', cmp: 'sortInner', call: 'toGraph(cloneGraph(fromGraph(__A[0])))', note: 'Build a deep copy of the graph, then print the adjacency lists of the copy (the neighbours of a node may be in any order).' },
  'serialize-deserialize-tree': {
    inTypes: ['int?[]'], kinds: { args: ['tree'], ret: 'tree' }, out: 'int?[]',
    call: '(() => { const c = new Codec(); return toTree(c.deserialize(c.serialize(fromTree(__A[0])))); })()',
    note: 'Serialize the tree to a string and deserialize it back, then print the resulting tree. (Standard output can only show the final tree.)'
  },
  'first-bad-version': {
    inTypes: ['int', 'int'], names: ['n', 'bad'], out: 'int',
    call: 'firstBadVersion((v) => v >= __A[1])(__A[0])',
    note: 'Versions 1..n exist and isBadVersion(v) is true exactly when v >= bad, so every version after the first bad one is bad too. The input gives bad only so that the checker can define isBadVersion: solve it as the original problem, with a binary search that asks isBadVersion O(log n) times.'
  }
};

/** Class-design problems: the input is a script of operations and the output is what the operations return. */
const DESIGN = {
  'implement-queue-stacks': { cls: 'MyQueue', voidOps: ['push'] },
  'lru-cache': { cls: 'LRUCache', voidOps: ['put'] },
  'rate-limiter': { cls: 'RateLimiter', voidOps: [] },
  'min-stack': { cls: 'MinStack', voidOps: ['push', 'pop'] }
};

/** Records the constructor call and the method calls a test makes on the problem's class. */
function recordScript(p, code) {
  const d = DESIGN[p.id];
  const recorded = [];
  const ctx = vm.createContext({ Math, JSON, Array, Object, Map, Set, Number, String, Infinity, NaN, Symbol, BigInt, __rec: recorded });
  vm.runInContext(`${PRELUDE}\n${code}\n;globalThis.__Real = ${d.cls};
    ${d.cls} = function (...a) { __rec.push(['<new>', ...a]); const o = new __Real(...a);
      return new Proxy(o, { get(t, k) { const v = t[k]; return typeof v === 'function' ? (...x) => { __rec.push([k, ...x]); return v.apply(t, x); } : v; } }); };`, ctx, { timeout: 4000 });
  return { ctx, recorded };
}

function scriptFromTest(p, test) {
  const { ctx, recorded } = recordScript(p, p.approaches[0].code);
  vm.runInContext(`(${test.expr})`, ctx, { timeout: 4000 });
  const [ctor, ...ops] = recorded;
  return { ctor: ctor.slice(1), ops };
}

const tokenText = (v) => (v === null || v === undefined ? 'null' : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));

function scriptStdin(script) {
  return [script.ctor.map(tokenText).join(' '), String(script.ops.length), ...script.ops.map((o) => o.map(tokenText).join(' '))].join('\n') + '\n';
}

/** Runs a script against an implementation (class source) and returns the printed tokens. */
function runScript(p, code, stdin) {
  const d = DESIGN[p.id];
  const lines = stdin.split('\n');
  const parse = (t) => (t === 'true' ? true : t === 'false' ? false : t === 'null' ? null : /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t);
  const ctorArgs = lines[0].split(' ').filter(Boolean).map(parse);
  const q = Number(lines[1]);
  const ctx = vm.createContext({ Math, JSON, Array, Object, Map, Set, Number, String, Infinity, NaN, Symbol, BigInt });
  const obj = vm.runInContext(`${PRELUDE}\n${code}\n;new ${d.cls}(...${J(ctorArgs)})`, ctx, { timeout: 4000 });
  const out = [];
  for (let i = 0; i < q; i++) {
    const [name, ...args] = lines[2 + i].split(' ').map(parse);
    const r = obj[name](...args);
    if (!d.voidOps.includes(name)) out.push(tokenText(r));
  }
  return out;
}

/* ------------------------------------------------------------------ the main conversion */

/** Placeholders so p.expr(...) can be turned into an expression over the decoded inputs (__A[i]). */
function exprOverInputs(p, argCount) {
  const marks = Array.from({ length: argCount }, (_, i) => '__ARG' + i + '__');
  const text = p.expr(...marks);
  return text.replace(/"?__ARG(\d+)__"?/g, (_, i) => '__A[' + i + ']');
}

/** The JavaScript expression (over __A) that computes the answer for `p`. */
function callFor(p, argCount) {
  const c = CUSTOM[p.id];
  if (c) return c.call;
  if (typeof p.expr === 'function') return exprOverInputs(p, argCount);
  return `${p.fn}(${Array.from({ length: argCount }, (_, i) => `__A[${i}]`).join(', ')})`;
}

const needsPrelude = (text) => /ListNode|TreeNode|GraphNode|fromList|toList|fromTree|toTree|fromGraph|toGraph|isDeepClone/.test(text);

/** A complete JavaScript program for one approach: reads stdin, prints stdout. */
function referenceProgram(p, io, approachCode) {
  if (io.script) {
    const d = DESIGN[p.id];
    return [
      approachCode,
      `const __L = require('fs').readFileSync(0, 'utf8').split('\\n');`,
      `const __P = (t) => (t === 'true' ? true : t === 'false' ? false : t === 'null' ? null : /^-?\\d+(\\.\\d+)?$/.test(t) ? Number(t) : t);`,
      `const __O = new ${d.cls}(...__L[0].split(' ').filter(Boolean).map(__P)); const __R = [];`,
      `for (let i = 0; i < Number(__L[1]); i++) { const [n, ...a] = __L[2 + i].split(' ').map(__P); const r = __O[n](...a); if (!${J(d.voidOps)}.includes(n)) __R.push(r === null || r === undefined ? 'null' : String(r)); }`,
      `console.log(__R.length); __R.forEach((x) => console.log(x));`
    ].join('\n');
  }
  const types = io.in.map((a) => a.type);
  const call = callFor(p, types.length);
  return [
    JUDGE_SOURCE,
    needsPrelude(call + approachCode) ? PRELUDE : '',
    approachCode,
    `const __A = Judge.decodeInput(${J(types)}, require('fs').readFileSync(0, 'utf8'));`,
    `process.stdout.write(Judge.encode(${J(io.out)}, ${call}));`
  ].join('\n');
}

/**
 * Builds { io, tests } for one problem.
 *   oldTests: [{ input: <expr text>, expected: <JSON text> }] from the existing verified build (expected values
 *             computed from the first approach).
 */
function convert(p, oldTests) {
  const errors = [];
  const custom = CUSTOM[p.id];
  const design = DESIGN[p.id];

  if (design) {
    const scripts = p.tests.map((t) => scriptFromTest(p, t));
    const tests = scripts.map((s) => {
      const stdin = scriptStdin(s);
      const out = runScript(p, p.approaches[0].code, stdin);
      return { stdin, expectedStdout: Judge.encode('tok[]', out) };
    });
    const ops = [...new Set(scripts.flatMap((s) => s.ops.map((o) => o[0])))];
    const signature = (name) => {
      const sample = scripts.flatMap((s) => s.ops).find((o) => o[0] === name);
      return `${name}${sample.slice(1).map((a) => ' ' + (typeof a === 'string' ? '<text>' : '<number>')).join('')}${design.voidOps.includes(name) ? ' (prints nothing)' : ' (prints its result)'}`;
    };
    const io = {
      in: [{ name: 'script', type: 'script' }],
      out: 'tok[]',
      script: { cls: design.cls, voidOps: design.voidOps },
      inputFormat: [
        'Line 1: the constructor arguments, separated by spaces (an empty line if there are none).',
        'Line 2: the number of operations q.',
        `Then q lines, each an operation name followed by its arguments: ${ops.map(signature).join('; ')}.`
      ],
      outputFormat: 'For every operation that returns a value, in order: first print how many values k there are, then print them one per line (true or false for booleans, null for a missing value).'
    };
    return { io, tests, errors };
  }

  // arguments and answers as plain values
  const argLists = custom && custom.args ? p.tests.map((t) => custom.args(t)) : p.tests.map((t) => (Array.isArray(t) ? t : null));
  if (argLists.some((a) => a === null)) throw new Error('has non-array tests and no CUSTOM entry');
  const argCount = argLists[0].length;
  const kinds = kindsFromExpr(p, argCount);
  if (custom && custom.kinds) {
    if (custom.kinds.args) custom.kinds.args.forEach((k, i) => { kinds.args[i] = k; });
    if (custom.kinds.ret) kinds.ret = custom.kinds.ret;
  }

  const kindType = { tree: 'int?[]', list: 'int[]', graph: 'int[][]' };
  const inTypes = [];
  for (let i = 0; i < argCount; i++) {
    const hint = custom && custom.inTypes ? custom.inTypes[i] : (kinds.args[i] ? kindType[kinds.args[i]] : undefined);
    inTypes.push(inferType(argLists.map((a) => a[i]), hint));
  }
  const expectedValues = oldTests.map((t) => JSON.parse(t.expected));
  let outType;
  let expectedList;
  if (custom) {
    outType = custom.out;
    // expected answers come from running the first approach as a real program
    expectedList = argLists.map((args) => {
      const stdin = Judge.encode(inTypes, args);
      return { stdin, value: null };
    });
  } else {
    outType = inferType(expectedValues, kinds.ret ? kindType[kinds.ret] : undefined);
  }
  const names = custom && custom.names ? custom.names : paramNames(p, argCount);
  const io = { in: names.map((name, i) => ({ name, type: inTypes[i], ...(kinds.args[i] ? { kind: kinds.args[i] } : {}) })), out: outType };
  if (kinds.ret) io.outKind = kinds.ret;
  if (custom && custom.check) io.check = custom.check;
  const cmp = custom && custom.cmp ? custom.cmp : p.out || '';
  if (cmp) io.cmp = cmp;

  const tests = [];
  if (custom) {
    const first = referenceProgram(p, io, p.approaches[0].code);
    // outputs are produced by the first approach, run exactly like a user's program would be
    tests.push(...expectedList.map((e) => ({ stdin: e.stdin, expectedStdout: null, _program: first })));
  } else {
    argLists.forEach((args, i) => {
      tests.push({ stdin: Judge.encode(inTypes, args), expectedStdout: Judge.encode(outType, expectedValues[i]) });
    });
  }

  io.inputFormat = io.in.map((a, i) => (custom && custom.describeIn && custom.describeIn[i]) || Judge.describeLayout(a.type, a.name, a.kind));
  io.outputFormat = outputText(io, custom);
  return { io, tests, errors };
}

function outputText(io, custom) {
  const { dims } = Judge.parseType(io.out);
  const base = io.outKind === 'tree'
    ? 'The resulting binary tree in level order: a line with the number of entries, then one line with the entries (the word null marks a missing child; trailing nulls may be left out).'
    : io.outKind === 'list'
      ? 'The resulting linked list: a line with its length, then one line with the node values.'
      : dims === 0
        ? (io.out === 'str' ? 'The answer as a line of text.' : io.out === 'bool' ? 'The word true or false.' : io.out === 'float' ? 'The answer as a number (a small rounding difference is accepted).' : 'The answer as an integer.')
        : dims === 1
          ? (io.out === 'str[]' ? 'A line with the number of strings, then one line per string.' : 'A line with the number of values, then one line with the values separated by spaces (an empty line when there are none).')
          : 'A line with the number of rows, then one line per row: the row length followed by its values.';
  const extra = [];
  if (io.cmp === 'sort' || io.cmp === 'sortRows' || io.cmp === 'sortAll') extra.push('The order of the results does not matter.');
  if (custom && custom.note) extra.push(custom.note);
  return [base, ...extra].join(' ');
}

module.exports = { Judge, JsRunner, convert, referenceProgram, callFor, inferType, runScript, DESIGN, CUSTOM, JUDGE_SOURCE, PRELUDE };
