import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { buildAll } = require('../tools/coding-bank/build.cjs');

const built = buildAll();
const file = fs.readFileSync(new URL('../js/data/coding-bank.js', import.meta.url), 'utf8');
const bank = vm.runInNewContext(`${file}\n;CODING_BANK`);

test('coding bank: every problem verifies (approaches agree on tests and random inputs, starters fail)', () => {
  assert.deepEqual(built.errors, []);
});

test('coding bank: the shipped file is up to date with the problem sources', () => {
  assert.equal(bank.length, built.questions.length, 'run: node tools/coding-bank/build.cjs');
  assert.equal(JSON.stringify(bank.map((q) => q.id)), JSON.stringify(built.questions.map((q) => q.id)));
  const strip = (qs) => JSON.stringify(qs);
  assert.equal(strip(JSON.parse(JSON.stringify(bank))), strip(built.questions), 'generated file differs from the sources: run node tools/coding-bank/build.cjs');
});

test('coding bank: every problem has several approaches with complexities and enough tests', () => {
  for (const q of bank) {
    assert.ok(q.approaches.length >= 2, `${q.id}: at least two approaches`);
    assert.ok(q.testCases.length >= 5, `${q.id}: at least five tests`);
    for (const a of q.approaches) {
      assert.ok(a.timeClass && a.spaceClass, `${q.id}/${a.name}: complexity classes`);
      assert.ok(a.code.includes('function') || a.code.includes('class'), `${q.id}/${a.name}: has code`);
    }
    assert.match(q.starterCode, /Your code here|implement|TODO/i, `${q.id}: starter is a stub`);
  }
});
