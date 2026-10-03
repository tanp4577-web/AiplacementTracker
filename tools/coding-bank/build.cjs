/* Builds js/data/coding-bank.js from tools/coding-bank/problems/*.js and verifies every problem.
   Run: node tools/coding-bank/build.js           (writes the file)
        node tools/coding-bank/build.js --check   (verifies only)

   Checks, per problem:
     - every approach runs on every test and gives the same answer (expected values are computed from the first approach)
     - every approach agrees on random inputs from `gen` when one is supplied
     - the starter code does not pass any test (so "Run tests" on untouched code never counts as solved)
     - complexity labels are recognised, ids/titles are unique, counts and difficulty are valid */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { classify } = require('./dsl.cjs');
const PRELUDE = require('./prelude.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'js', 'data', 'coding-bank.js');
const DIFFS = { E: 'Easy', M: 'Medium', H: 'Hard' };
const CMP = '(a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0)';

/** Small seeded generator so a failing random case can be reproduced. */
function rng(seed) {
  let s = seed >>> 0;
  const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next, int,
    arr: (len, lo, hi) => Array.from({ length: len }, () => int(lo, hi)),
    str: (len, alphabet = 'abc') => Array.from({ length: len }, () => alphabet[int(0, alphabet.length - 1)]).join(''),
    pick: (xs) => xs[int(0, xs.length - 1)],
    uniq: (len, lo, hi) => { const set = new Set(); while (set.size < Math.min(len, hi - lo + 1)) set.add(int(lo, hi)); return [...set]; },
    sorted: (len, lo, hi) => Array.from({ length: len }, () => int(lo, hi)).sort((a, b) => a - b),
    grid: (r, c, lo, hi) => Array.from({ length: r }, () => Array.from({ length: c }, () => int(lo, hi)))
  };
}

function wrap(call, out) {
  if (out === 'sort') return `(${call}).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))`;
  if (out === 'sortRows') return `(${call}).map((r) => r.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).sort(${CMP})`;
  if (out === 'sortAll') return `(${call}).slice().sort(${CMP})`;
  return call;
}

function exprFor(p, test) {
  if (typeof test === 'string') return test;
  if (test && typeof test === 'object' && !Array.isArray(test) && test.expr) return test.expr;
  // `expr` lets list/tree/class problems build their inputs and read their outputs: expr(...args) -> expression text
  if (typeof p.expr === 'function') return wrap(p.expr(...test), p.out);
  return wrap(`${p.fn}(${test.map((a) => JSON.stringify(a)).join(', ')})`, p.out);
}

function run(code, expr, timeout = 4000) {
  const ctx = vm.createContext({ Math, JSON, Array, Object, Map, Set, Number, String, Infinity, NaN, parseInt, parseFloat, isNaN, Symbol, BigInt });
  const value = vm.runInContext(`${PRELUDE}\n${code}\n;(${expr})`, ctx, { timeout });
  return JSON.stringify(value);
}

function loadProblems() {
  const dir = path.join(__dirname, 'problems');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.cjs')).sort().flatMap((f) => require(path.join(dir, f)).map((p) => ({ ...p, _file: f })));
}

function buildAll() {
  const errors = [];
  const questions = [];
  const ids = new Set();
  const titles = new Set();
  for (const p of loadProblems()) {
    const where = `${p._file}:${p.id}`;
    const err = (m) => errors.push(`${where}: ${m}`);
    try {
      if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) { err('bad id'); continue; }
      if (ids.has(p.id)) { err('duplicate id'); continue; }
      ids.add(p.id);
      if (titles.has(p.title)) err('duplicate title');
      titles.add(p.title);
      if (!DIFFS[p.d]) { err('d must be E, M or H'); continue; }
      if (!p.desc || p.desc.length < 40) err('description too short');
      if (!Array.isArray(p.approaches) || p.approaches.length < 2) { err('needs at least two approaches'); continue; }
      if (!Array.isArray(p.tests) || p.tests.length < 5) { err('needs at least five tests'); continue; }
      for (const a of p.approaches) {
        if (!classify(a.time)) err(`unknown time complexity "${a.time}" in ${a.name}`);
        if (!classify(a.space)) err(`unknown space complexity "${a.space}" in ${a.name}`);
        if (!a.idea || a.idea.length < 20) err(`idea too short in ${a.name}`);
      }
      const exprs = p.tests.map((t) => exprFor(p, t));
      if (new Set(exprs).size !== exprs.length) err('duplicate test inputs');

      // expected values come from the first approach; every other approach must agree
      const expected = exprs.map((e) => {
        try { return run(p.approaches[0].code, e); } catch (x) { err(`first approach failed on ${e}: ${x.message}`); return undefined; }
      });
      p.approaches.forEach((a, ai) => {
        exprs.forEach((e, i) => {
          if (expected[i] === undefined) return;
          let got;
          try { got = run(a.code, e); } catch (x) { err(`approach "${a.name}" threw on ${e}: ${x.message}`); return; }
          if (got !== expected[i]) err(`approach "${a.name}" gives ${got} but expected ${expected[i]} for ${e}`);
        });
        if (ai > 0 && typeof p.gen === 'function') {
          const r = rng(1234 + p.id.length);
          for (let i = 0; i < 40; i++) {
            let args;
            try { args = p.gen(r, i); } catch (x) { err(`gen failed: ${x.message}`); break; }
            const e = exprFor(p, args);
            let a0; let a1;
            try { a0 = run(p.approaches[0].code, e); a1 = run(a.code, e); } catch (x) { err(`random case threw for "${a.name}": ${x.message} on ${e.slice(0, 120)}`); break; }
            if (a0 !== a1) { err(`approach "${a.name}" disagrees with "${p.approaches[0].name}" on random input ${e.slice(0, 160)}: ${a1} vs ${a0}`); break; }
          }
        }
      });

      const starter = p.starter || `function ${p.fn}(${p.params || ''}) {\n  // Your code here\n}`;
      exprs.forEach((e, i) => {
        if (expected[i] === undefined) return;
        let got;
        try { got = run(starter, e); } catch { got = 'ERR'; }
        if (got === expected[i]) err(`the untouched starter code passes the test ${e}`);
      });
      if (expected.some((x) => x === undefined)) continue;
      if (!p.uniform && expected.every((x) => x === expected[0])) err('every test has the same expected value: tests are too weak (set uniform: true for property checks)');

      const best = p.approaches[p.approaches.length - 1];
      questions.push({
        id: p.id,
        title: p.title,
        source: 'PlacementPrep',
        difficulty: DIFFS[p.d],
        targetRoles: p.roles || ['SDE', 'Backend Developer'],
        topic: p.topic,
        description: p.desc,
        constraints: p.constraints || '',
        starterCode: starter,
        testCases: exprs.map((e, i) => ({ input: e, expected: expected[i] })),
        approaches: p.approaches.map((a) => ({ name: a.name, idea: a.idea, time: a.time, space: a.space, timeClass: classify(a.time), spaceClass: classify(a.space), code: a.code, note: a.note })),
        sizes: p.sizes || null,
        solution: `${best.name}: ${best.idea} Time ${best.time}, space ${best.space}.`,
        explanation: p.approaches.map((a) => `${a.name} (time ${a.time}, space ${a.space}): ${a.idea}`).join('\n')
      });
    } catch (x) {
      err(`unexpected: ${x.message}`);
    }
  }
  const order = { Easy: 0, Medium: 1, Hard: 2 };
  questions.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
  return { questions, errors };
}

function emit(questions) {
  const head = `/* GENERATED by tools/coding-bank/build.js from tools/coding-bank/problems/*.js. Do not edit by hand.
   ${questions.length} problems. Every approach was run against every test and against random inputs at build time. */
`;
  const lines = questions.map((q) => '  ' + JSON.stringify(q));
  fs.writeFileSync(OUT, `${head}const CODING_PRELUDE = ${JSON.stringify(PRELUDE)};\nconst CODING_BANK = [\n${lines.join(',\n')}\n];\n`);
}

if (require.main === module) {
  const { questions, errors } = buildAll();
  const count = (d) => questions.filter((q) => q.difficulty === d).length;
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`\n${errors.length} problem(s) found. Not written.`);
    process.exit(1);
  }
  console.log(`OK: ${questions.length} problems (Easy ${count('Easy')}, Medium ${count('Medium')}, Hard ${count('Hard')})`);
  if (!process.argv.includes('--check')) { emit(questions); console.log('wrote ' + path.relative(ROOT, OUT)); }
}

module.exports = { buildAll, rng };
