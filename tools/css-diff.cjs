/* Compares two computed-style snapshots (before / after a CSS change) taken by a headless browser.
   node tools/css-diff.cjs before.json after.json [noise.json]
   `noise.json` is a second snapshot of the BEFORE site: anything that already differs between two identical runs
   (clocks, timing) is ignored. Prints a grouped report of every element whose computed style changed. */
const fs = require('fs');
const [a, b, n] = process.argv.slice(2).map((f) => (f ? JSON.parse(fs.readFileSync(f, 'utf8')) : null));

const noisy = new Set();
if (n) {
  for (const state of Object.keys(a)) {
    if (state === '__hover') continue;
    for (const key of Object.keys(a[state])) {
      const x = a[state][key]; const y = n[state] && n[state][key];
      if (!y) { noisy.add(`${state}|${key}|*`); continue; }
      for (const p of Object.keys(x)) if (x[p] !== y[p]) noisy.add(`${state}|${key}|${p}`);
    }
  }
}

const groups = new Map();
let elements = 0;
let compared = 0;
for (const state of Object.keys(a)) {
  if (state === '__hover') continue;
  const sa = a[state]; const sb = b[state] || {};
  for (const key of Object.keys(sa)) {
    compared++;
    const x = sa[key]; const y = sb[key];
    if (!y) { if (!noisy.has(`${state}|${key}|*`)) { (groups.get('element missing after') || groups.set('element missing after', []).get('element missing after')).push(`${state} ${key}`); } continue; }
    let changed = false;
    for (const p of Object.keys(x)) {
      if (x[p] === y[p] || noisy.has(`${state}|${key}|${p}`)) continue;
      changed = true;
      const g = `${p}: ${x[p].slice(0, 60)}  ->  ${y[p].slice(0, 60)}`;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(`${state} ${key}`);
    }
    if (changed) elements++;
  }
}
console.log(`${compared} elements compared across ${Object.keys(a).length - 1} states; ${elements} elements changed`);
const rows = [...groups.entries()].sort((p, q) => q[1].length - p[1].length);
for (const [g, list] of rows.slice(0, Number(process.env.TOP || 60))) {
  const classes = [...new Set(list.map((s) => s.split(' ').slice(2).join(' ')))].slice(0, 4).join(' | ');
  console.log(`${String(list.length).padStart(5)}  ${g}\n         e.g. ${classes}`);
}
console.log(`${rows.length} distinct changes`);
if (a.__hover) {
  console.log('\nHOVER (computed on hover)');
  for (const k of Object.keys(a.__hover)) {
    const same = a.__hover[k] === b.__hover[k];
    console.log(`${same ? '  same ' : '  DIFF '} ${k}${same ? '' : `\n        before: ${a.__hover[k]}\n        after:  ${b.__hover[k]}`}`);
  }
}
