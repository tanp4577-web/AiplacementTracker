/* One-off consolidation of the six legacy stylesheets (kept in tools/ so the change is reviewable and repeatable).

   node tools/css-consolidate.cjs <legacy-dir> <out-dir>

   1. Joins the files in the order index.html loads them (style, fibery-theme, depth-theme, dark-theme, editorial, polish).
   2. Deletes a declaration when a LATER rule with the exact same selector, in the same at-rule, sets the same property
      (and is not weaker through !important). Such a declaration can never apply, so removing it changes nothing.
   3. Deletes the dead hover-lift transforms (see HOVER_POLICY) and reports them.
   4. Deletes rules and at-rules left empty, and earlier duplicate @keyframes.
   5. Moves rules made only of custom properties into tokens.css; everything else stays in cascade order in app.css.
   Comments of the original files are kept. A report of every deletion is written to <out-dir>/report.json. */
const fs = require('fs');
const path = require('path');
const csstree = require('css-tree');

const [legacyDir, outDir] = process.argv.slice(2);
const ORDER = ['style', 'fibery-theme', 'depth-theme', 'dark-theme', 'editorial', 'polish'];

/* Hover policy: hovering never moves or scales anything (the editorial layer already enforces this on .btn, .card and
   .nav-link; the same rule now holds for every other element). Colour, border and background changes are the feedback. */
const HOVER_TRANSFORM = /:(hover|active)\b/;

const text = ORDER.map((f) => `/* ===== ${f}.css ===== */\n` + fs.readFileSync(path.join(legacyDir, f + '.css'), 'utf8').replace(/\r\n/g, '\n')).join('\n');

function analyse(src) {
  const ast = csstree.parse(src, { positions: true });
  const rules = [];
  const keyframes = [];
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      const at = this.atrule;
      const ctx = at ? '@' + at.name + ' ' + csstree.generate(at.prelude) : '';
      const sel = csstree.generate(node.prelude);
      if (at && /keyframes$/.test(at.name)) return;
      const decls = [];
      node.block.children.forEach((d) => { if (d.type === 'Declaration') decls.push(d); });
      rules.push({ node, ctx, sel, decls });
    }
  });
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) { if (/keyframes$/.test(node.name)) keyframes.push(node); }
  });
  return { ast, rules, keyframes };
}

const report = { overridden: [], hover: [], emptyRules: 0, keyframes: [] };
let current = text;

function lineOf(src, offset) { return src.slice(0, offset).split('\n').length; }

/* ---- pass 1: overridden declarations and dead hover transforms */
function pass1(src) {
  const { rules, keyframes } = analyse(src);
  const cuts = [];
  const lastBy = new Map(); // ctx|sel|prop -> { index, imp }
  rules.forEach((r, ri) => r.decls.forEach((d) => {
    const key = `${r.ctx}|${r.sel}|${d.property}`;
    const prev = lastBy.get(key);
    if (prev) {
      // the earlier declaration loses to a later one unless it is !important and the later one is not
      if (!(prev.imp && !d.important)) cuts.push({ d: prev.d, why: 'overridden', sel: prev.sel, ctx: prev.ctx, by: r.sel });
      else cuts.push({ d, why: 'overridden', sel: r.sel, ctx: r.ctx, by: prev.sel });
    }
    lastBy.set(key, { d, imp: Boolean(d.important), sel: r.sel, ctx: r.ctx, ri });
  }));
  // hover policy: no transform on :hover / :active rules (selectors that are only a focus ring or reset are not touched)
  rules.forEach((r) => r.decls.forEach((d) => {
    if (/^(transform|translate|scale)$/.test(d.property) && HOVER_TRANSFORM.test(r.sel) && !/^(none|translateY\(0\)|translate\(0\)?)$/.test(csstree.generate(d.value).trim())) {
      cuts.push({ d, why: 'hover-transform', sel: r.sel, ctx: r.ctx, value: csstree.generate(d.value) });
    }
  }));
  // earlier duplicate keyframes lose to the last one with the same name
  const kf = new Map();
  keyframes.forEach((k) => { if (kf.has(k.prelude && csstree.generate(k.prelude))) cuts.push({ k: kf.get(csstree.generate(k.prelude)), why: 'keyframes', name: csstree.generate(k.prelude) }); kf.set(csstree.generate(k.prelude), k); });

  const ranges = [];
  const seen = new Set();
  for (const c of cuts) {
    const node = c.d || c.k;
    if (seen.has(node)) continue;
    seen.add(node);
    let { start, end } = node.loc;
    let s = start.offset;
    let e = end.offset;
    if (c.d) { while (src[e] === ';' || src[e] === ' ') e++; if (src[e] === '\n') e++; while (s > 0 && (src[s - 1] === ' ' || src[s - 1] === '\t')) s--; }
    ranges.push([s, e]);
    const line = lineOf(src, start.offset);
    if (c.why === 'overridden') report.overridden.push({ selector: c.sel, ctx: c.ctx, property: c.d.property, value: csstree.generate(c.d.value), line, overriddenBy: c.by });
    else if (c.why === 'hover-transform') report.hover.push({ selector: c.sel, ctx: c.ctx, value: c.value, line });
    else report.keyframes.push({ name: c.name, line });
  }
  // one-line rules ("a { x: 1; y: 2; }") give touching ranges: merge them so nothing is cut twice
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([r[0], r[1]]);
  }
  let out = src;
  for (let i = merged.length - 1; i >= 0; i--) out = out.slice(0, merged[i][0]) + out.slice(merged[i][1]);
  return { out, changed: ranges.length };
}

/* ---- pass 2: remove rules (and at-rules) left without declarations */
function pass2(src) {
  const ast = csstree.parse(src, { positions: true });
  const ranges = [];
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      const at = this.atrule;
      if (at && /keyframes$/.test(at.name)) return;
      if (!node.block.children.some((c) => c.type === 'Declaration')) ranges.push([node.loc.start.offset, node.loc.end.offset]);
    }
  });
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.block && node.block.children && node.block.children.size === 0 && /^(media|supports|layer)$/.test(node.name)) ranges.push([node.loc.start.offset, node.loc.end.offset]);
    }
  });
  // keep only outermost ranges (an emptied @media already contains its emptied rules), then cut from the end
  ranges.sort((p, q) => p[0] - q[0] || q[1] - p[1]);
  const done = [];
  for (const r of ranges) if (!done.length || r[0] >= done[done.length - 1][1]) done.push(r);
  let out = src;
  for (let i = done.length - 1; i >= 0; i--) {
    const [s0, e0] = done[i];
    let ee = e0;
    while (out[ee] === '\n') ee++;
    out = out.slice(0, s0) + out.slice(ee);
  }
  report.emptyRules += done.length;
  return { out, changed: done.length };
}

for (let i = 0; i < 6; i++) {
  const a = pass1(current);
  current = a.out;
  const b = pass2(current);
  current = b.out;
  if (!a.changed && !b.changed) break;
}

/* ---- split: rules made only of custom properties (and color-scheme) go to tokens.css */
const ast = csstree.parse(current, { positions: true });
const tokenRanges = [];
ast.children.forEach((node) => {
  if (node.type !== 'Rule') return;
  const ds = [];
  node.block.children.forEach((c) => { if (c.type === 'Declaration') ds.push(c); });
  if (ds.length && ds.every((d) => /^--/.test(d.property) || d.property === 'color-scheme') && /^:root(\[data-theme="dark"\])?$/.test(csstree.generate(node.prelude).replace(/'/g, '"'))) {
    tokenRanges.push([node.loc.start.offset, node.loc.end.offset]);
  }
});
const tokens = tokenRanges.map(([s, e]) => current.slice(s, e));
let app = current;
[...tokenRanges].sort((a, b) => b[0] - a[0]).forEach(([s, e]) => { let ee = e; while (app[ee] === '\n') ee++; app = app.slice(0, s) + app.slice(ee); });

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'tokens.css'), tokens.join('\n\n') + '\n');
fs.writeFileSync(path.join(outDir, 'app.css'), app.replace(/\n{3,}/g, '\n\n'));
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
const total = (t) => t.split('\n').length;
console.log(`in: ${total(text)} lines, tokens.css: ${total(tokens.join('\n'))} lines, app.css: ${total(app)} lines`);
console.log(`overridden declarations removed: ${report.overridden.length}, hover transforms removed: ${report.hover.length}, empty rules removed: ${report.emptyRules}, duplicate keyframes: ${report.keyframes.length}`);
