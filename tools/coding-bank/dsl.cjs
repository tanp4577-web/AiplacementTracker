/* Authoring helpers for the coding question bank.
   A problem lists several approaches (brute force -> optimal) as real code. build.cjs runs every approach on
   every test and on random inputs, so expected outputs are computed, never typed by hand, and an approach
   that disagrees with the others fails the build. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// One source of truth for the complexity classes: the same file the browser loads.
const CLASSES = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'complexity.js'), 'utf8') + '\n;COMPLEXITY_CLASSES');

const SUP = { '²': '^2', '³': '^3', '⁴': '^4', 'ⁿ': '^n' };

const ORDER = ['1', 'logn', 'sqrtn', 'n', 'nlogn', 'nsqrtn', 'n2', 'n2logn', 'n3', 'n4', '2^n', 'n2^n', '3^n', 'n!', 'nn!'];

/** Classifies one additive term such as "m n log n" or "2^n" into a class key. */
function classifyTerm(t) {
  if (/!/.test(t)) return /[a-z!].*!|[a-z]!?[a-z]/.test(t.replace(/!/, '')) && t.replace(/[a-z]!/, '').match(/[a-z]/) ? 'nn!' : 'n!';
  const exp = t.match(/(\d+|[a-z])\^([a-z])/);
  if (exp) {
    const rest = t.replace(exp[0], '');
    const base = /^\d+$/.test(exp[1]) ? Number(exp[1]) : 3;
    if (base <= 2) return /[a-z]/.test(rest.replace(/log\([^)]*\)/g, '')) ? 'n2^n' : '2^n';
    return '3^n';
  }
  let logs = 0;
  let s = t.replace(/log(\^\d)?(\([^)]*\)|[a-z])/g, () => { logs++; return ''; });
  let degree = 0;
  s = s.replace(/sqrt\([^)]*\)|√[a-z]/g, () => { degree += 0.5; return ''; });
  s = s.replace(/([a-z])(\^(\d))?/g, (_, _v, _p, k) => { degree += k ? Number(k) : 1; return ''; });
  if (degree === 0) return logs ? 'logn' : '1';
  if (degree === 0.5) return 'sqrtn';
  if (degree === 1) return logs ? 'nlogn' : 'n';
  if (degree === 1.5) return 'nsqrtn';
  if (degree === 2) return logs ? 'n2logn' : 'n2';
  if (degree === 3) return 'n3';
  return degree > 3 ? 'n4' : 'n';
}

/** Turns "O(n log n)" or "O(n²)" into a class key, or null when the label cannot be read.
    Several variables (O(m·n), O(V+E)) are measured against one size n, with all sizes taken as about equal. */
function classify(label) {
  let s = String(label).replace(/[²³⁴ⁿ]/g, (c) => SUP[c]).toLowerCase().replace(/\s+/g, '').replace(/[·*×]/g, '').replace(/α|\u03b1/g, '');
  const m = s.match(/^o\((.*)\)$/);
  if (!m) return null;
  s = m[1]
    .replace(/(min|max)\([^()]*\)/g, 'n')
    .replace(/(log)+/g, 'log') // log log n is treated as one log
    .replace(/\(([^()+]*)\)\^(\d)/g, (_, inner, k) => inner.repeat(Number(k))) // (m n)^2 -> m n m n
    .replace(/\([^()]*\+[^()]*\)/g, 'n'); // (n + m) as a factor counts as one size
  let depth = 0; let cur = ''; const terms = [];
  for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === '+' && depth === 0) { terms.push(cur); cur = ''; } else cur += ch; }
  terms.push(cur);
  const keys = terms.filter(Boolean).map(classifyTerm);
  if (!keys.length) return null;
  const best = keys.reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a));
  return CLASSES[best] ? best : null;
}

/** Approach: name, plain-language idea, time and space labels, code. `opts.note` is shown under the code. */
function A(name, idea, time, space, code, opts = {}) {
  return { name, idea, time, space, code: String(code).trim(), note: opts.note || '' };
}

module.exports = { A, classify, CLASSES };
