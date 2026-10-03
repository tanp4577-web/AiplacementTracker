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

/** Turns "O(n log n)" or "O(n²)" into a class key. Returns null when the label is not recognised.
    Two-variable and graph forms (O(n·m), O(V+E)) are measured against one size n, with all sizes about equal. */
function classify(label) {
  let s = String(label).replace(/[²³⁴ⁿ]/g, (c) => SUP[c]).toLowerCase().replace(/\s+/g, '');
  s = s.replace(/^o\(|\)$/g, '').replace(/[·*×]/g, '');
  const table = {
    '1': '1', 'logn': 'logn', 'log(n)': 'logn', 'sqrt(n)': 'sqrtn', '√n': 'sqrtn', 'n': 'n', 'nlogn': 'nlogn', 'nlog(n)': 'nlogn', 'nsqrt(n)': 'nsqrtn', 'n√n': 'nsqrtn',
    'n^2': 'n2', 'n^2logn': 'n2logn', 'n^3': 'n3', 'n^4': 'n4', '2^n': '2^n', 'n2^n': 'n2^n', '3^n': '3^n', 'n!': 'n!', 'nn!': 'nn!',
    'n+m': 'n', 'm+n': 'n', 'v+e': 'n', 'e+v': 'n', 'nm': 'n2', 'mn': 'n2', 'elogv': 'nlogn', 'elog(v)': 'nlogn', '(v+e)logv': 'nlogn', 'elogn': 'nlogn',
    'nlogk': 'nlogn', 'nk': 'n2', 'n+k': 'n', 'logmn': 'logn', 'log(mn)': 'logn', 'log(min(m,n))': 'logn', 'logn+logm': 'logn', 'k': '1', 'h': 'logn',
    'nlogm': 'nlogn', 'min(n,m)': 'n', 'nlogn+mlogm': 'nlogn', '(n+m)log(n+m)': 'nlogn', '(n+m)log(m+n)': 'nlogn', 'nlogn+m': 'nlogn', 'nlogn+nm': 'n2',
    'mlogn': 'nlogn', 'm': 'n', 'n+mlogn': 'nlogn', 'v^2': 'n2', 'v^3': 'n3', 'n^2m': 'n3', 'nmk': 'n3', 'mnk': 'n3', 'n^2k': 'n3', 'm^2': 'n2'
  };
  const key = table[s];
  return key && CLASSES[key] ? key : null;
}

/** Approach: name, plain-language idea, time and space labels, code. `opts.note` is shown under the code. */
function A(name, idea, time, space, code, opts = {}) {
  return { name, idea, time, space, code: String(code).trim(), note: opts.note || '' };
}

module.exports = { A, classify, CLASSES };
