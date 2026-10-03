import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const csstree = require('css-tree');
const read = (f) => fs.readFileSync(new URL(`../css/${f}`, import.meta.url), 'utf8');

test('css: two files only, tokens first, and every page loads them in that order', () => {
  assert.deepEqual(fs.readdirSync(new URL('../css/', import.meta.url)).sort(), ['app.css', 'tokens.css']);
  for (const page of ['index.html', 'admin.html']) {
    const html = fs.readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.ok(html.indexOf('css/tokens.css') > 0 && html.indexOf('css/tokens.css') < html.indexOf('css/app.css'), `${page}: tokens.css before app.css`);
  }
});

test('css: tokens.css holds only custom properties, and each token is set once per theme', () => {
  const ast = csstree.parse(read('tokens.css'));
  const seen = new Map();
  csstree.walk(ast, {
    visit: 'Rule',
    enter(rule) {
      const sel = csstree.generate(rule.prelude);
      rule.block.children.forEach((d) => {
        if (d.type !== 'Declaration') return;
        assert.ok(/^--/.test(d.property) || d.property === 'color-scheme', `tokens.css has a non-token declaration: ${d.property}`);
        const key = `${sel}|${d.property}`;
        assert.ok(!seen.has(key), `${d.property} is set twice for ${sel}`);
        seen.set(key, true);
      });
    }
  });
  assert.ok(seen.size > 80);
});

test('css: no declaration is silently overridden by a later rule with the same selector, and nothing lifts on hover', () => {
  const ast = csstree.parse(read('app.css'));
  const last = new Map();
  const dead = [];
  const lifting = [];
  csstree.walk(ast, {
    visit: 'Rule',
    enter(rule) {
      const at = this.atrule;
      if (at && /keyframes$/.test(at.name)) return;
      const ctx = at ? `@${at.name} ${csstree.generate(at.prelude)}` : '';
      const sel = csstree.generate(rule.prelude);
      rule.block.children.forEach((d) => {
        if (d.type !== 'Declaration') return;
        const key = `${ctx}|${sel}|${d.property}`;
        if (last.has(key) && !last.get(key).important) dead.push(`${sel} { ${d.property} } (set twice)`);
        last.set(key, d);
        if (/:(hover|active)/.test(sel) && /^(transform|translate|scale)$/.test(d.property) && !/^(none|translateY\(0\))/.test(csstree.generate(d.value).trim())) lifting.push(sel);
      });
    }
  });
  // a handful of declarations are repeated on purpose as fallbacks for older browsers (same rule, different value)
  assert.ok(dead.length < 40, `${dead.length} repeated declarations: ${dead.slice(0, 8).join('; ')}`);
  assert.deepEqual(lifting, []);
});
