import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

/* Fast checks on the SHIPPED bank (js/data/coding-bank.js). The slow, thorough verification (random inputs,
   every approach against the first) runs with: npm run bank:check */
const file = fs.readFileSync(new URL('../js/data/coding-bank.js', import.meta.url), 'utf8');
const { bank, prelude } = vm.runInNewContext(`${file}\n;({ bank: CODING_BANK, prelude: CODING_PRELUDE })`);

const run = (code, expr) => {
  const ctx = vm.createContext({ Math, JSON, Array, Object, Map, Set, Number, String, Infinity, NaN, parseInt, parseFloat, isNaN, Symbol, BigInt });
  return JSON.stringify(vm.runInContext(`${prelude}\n${code}\n;(${expr})`, ctx, { timeout: 4000 }));
};

test('coding bank: enough problems at every level, with unique ids', () => {
  const count = (d) => bank.filter((q) => q.difficulty === d).length;
  assert.ok(count('Easy') >= 100, `Easy ${count('Easy')}`);
  assert.ok(count('Medium') >= 100, `Medium ${count('Medium')}`);
  assert.ok(count('Hard') >= 49, `Hard ${count('Hard')}`);
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length, 'ids are unique');
  assert.equal(new Set(bank.map((q) => q.title)).size, bank.length, 'titles are unique');
});

test('coding bank: every problem has several approaches, complexities and enough tests', () => {
  for (const q of bank) {
    assert.ok(q.approaches.length >= 2, `${q.id}: at least two approaches`);
    assert.ok(q.testCases.length >= 5, `${q.id}: at least five tests`);
    for (const a of q.approaches) {
      assert.ok(a.timeClass && a.spaceClass, `${q.id}/${a.name}: complexity classes`);
      assert.ok(a.idea.length >= 20, `${q.id}/${a.name}: explanation`);
    }
    assert.match(q.starterCode, /Your code here|TODO/i, `${q.id}: starter is a stub`);
  }
});

test('coding bank: every approach passes every shipped test, and untouched starter code passes none', () => {
  const bad = [];
  for (const q of bank) {
    for (const a of q.approaches) {
      for (const t of q.testCases) {
        let got;
        try { got = run(a.code, t.input); } catch (e) { got = `ERROR ${e.message}`; }
        if (got !== t.expected) bad.push(`${q.id} / ${a.name}: ${t.input.slice(0, 60)} -> ${String(got).slice(0, 40)} (expected ${t.expected.slice(0, 40)})`);
      }
    }
    for (const t of q.testCases) {
      let got;
      try { got = run(q.starterCode, t.input); } catch { got = 'ERROR'; }
      if (got === t.expected) bad.push(`${q.id}: the untouched starter passes ${t.input.slice(0, 60)}`);
    }
  }
  assert.deepEqual(bad, []);
});
