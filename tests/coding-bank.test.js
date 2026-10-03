import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CODING_BANK as bank } from '../api/_data/coding-bank.js';

const require = createRequire(import.meta.url);
const { loadScript } = require('../tools/coding-bank/load.cjs');
const Judge = loadScript('js/judge.js', 'Judge');

/* Fast checks on the SHIPPED bank (api/_data/coding-bank.js). The slow, thorough verification (every approach
   run as a complete program on every test, random inputs) is `npm run bank:check`, which the last test here runs. */

test('coding bank: enough problems at every level, with unique ids and titles', () => {
  const count = (d) => bank.filter((q) => q.difficulty === d).length;
  assert.ok(count('Easy') >= 100, `Easy ${count('Easy')}`);
  assert.ok(count('Medium') >= 100, `Medium ${count('Medium')}`);
  assert.ok(count('Hard') >= 49, `Hard ${count('Hard')}`);
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length, 'ids are unique');
  assert.equal(new Set(bank.map((q) => q.title)).size, bank.length, 'titles are unique');
  for (const q of bank) assert.match(q.id, /^[a-z0-9-]+$/, q.id);
});

test('coding bank: every problem has several approaches, complexities and enough tests', () => {
  for (const q of bank) {
    assert.ok(q.approaches.length >= 2, `${q.id}: at least two approaches`);
    assert.ok(q.testCases.length >= 5, `${q.id}: at least five tests`);
    for (const a of q.approaches) {
      assert.ok(a.timeClass && a.spaceClass, `${q.id}/${a.name}: complexity classes`);
      assert.ok(a.idea.length >= 20, `${q.id}/${a.name}: explanation`);
    }
  }
});

test('coding bank: every question is a real stdin/stdout definition, usable from any language', () => {
  const bad = [];
  for (const q of bank) {
    const io = q.io;
    if (!io || !Array.isArray(io.in) || !io.in.length || !io.out) { bad.push(`${q.id}: no io`); continue; }
    if (!Array.isArray(io.inputFormat) || (io.script ? io.inputFormat.length < 1 : io.inputFormat.length !== io.in.length)) bad.push(`${q.id}: the input format must describe each input`);
    if (!io.outputFormat || io.outputFormat.length < 10) bad.push(`${q.id}: no output format`);
    if ('starterCode' in q) bad.push(`${q.id}: still ships a language-specific starter`);
    const types = io.in.map((a) => a.type);
    const script = Boolean(io.script);
    const silent = [];
    for (const [i, t] of q.testCases.entries()) {
      if (typeof t.stdin !== 'string' || typeof t.expectedStdout !== 'string') { bad.push(`${q.id}: test ${i + 1} is not stdin/expectedStdout`); continue; }
      if (/\r/.test(t.stdin + t.expectedStdout)) bad.push(`${q.id}: test ${i + 1} has a carriage return`);
      try {
        const expected = Judge.decodeOutput(io.out, t.expectedStdout);
        if (Judge.encode(io.out, expected) !== t.expectedStdout) bad.push(`${q.id}: test ${i + 1} expected output does not round-trip`);
        let inputs = [];
        if (!script) {
          inputs = Judge.decodeInput(types, t.stdin);
          if (Judge.encode(types, inputs) !== t.stdin) bad.push(`${q.id}: test ${i + 1} stdin does not round-trip`);
        }
        // the expected output must judge as correct, and a silent program must not pass them all
        if (!Judge.compare(io, expected, t.expectedStdout, inputs).pass) bad.push(`${q.id}: test ${i + 1} expected output fails its own judge`);
        silent.push(Judge.compare(io, expected, '', inputs).pass);
      } catch (e) {
        bad.push(`${q.id}: test ${i + 1}: ${e.message}`);
      }
    }
    if (silent.length && silent.every(Boolean)) bad.push(`${q.id}: a program that prints nothing passes every test`);
    if (io.check && !Judge.checkers[io.check]) bad.push(`${q.id}: unknown checker ${io.check}`);
  }
  assert.deepEqual(bad, []);
});

test('coding bank: wrong answers really fail (the judge is not a rubber stamp)', () => {
  let checked = 0;
  for (const q of bank) {
    if (q.io.script || q.io.check) continue;
    const t = q.testCases.find((x) => x.expectedStdout.trim() !== '');
    const expected = Judge.decodeOutput(q.io.out, t.expectedStdout);
    const inputs = Judge.decodeInput(q.io.in.map((a) => a.type), t.stdin);
    // flipping the last token of the answer makes it a different answer for any type
    const flipped = t.expectedStdout.replace(/(\S+)(\s*)$/, (m, tok, ws) => (tok === 'true' ? 'false' : tok === 'false' ? 'true' : /^-?\d+(\.\d+)?$/.test(tok) ? String(Number(tok) + 1000) : tok + 'x') + ws);
    const res = Judge.compare(q.io, expected, flipped, inputs);
    assert.equal(res.pass, false, `${q.id}: a changed answer was accepted`);
    checked++;
  }
  assert.ok(checked > 200);
});

test('coding bank: the full verification passes (npm run bank:check: every approach as a real program on every test)', { timeout: 280000 }, () => {
  const script = fileURLToPath(new URL('../tools/coding-bank/build.cjs', import.meta.url));
  const r = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8', timeout: 270000 });
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(0, 3000));
  assert.match(r.stdout, /OK: 250 problems/);
});
