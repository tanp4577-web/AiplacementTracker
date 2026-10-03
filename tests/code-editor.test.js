import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bootApp, goTo, tick } from './app-harness.js';

const bundlePath = fileURLToPath(new URL('../js/vendor/codemirror.js', import.meta.url));

test('code editor: the self-hosted bundle loads, highlights, auto-closes brackets and keeps the length cap', async () => {
  const lib = await import(pathToFileURL(bundlePath).href);
  for (const name of ['javascript', 'python', 'c++', 'java', 'rust', 'go', 'ruby', 'c#', 'kotlin', 'swift']) {
    assert.equal(typeof lib.langs[name], 'function', `language mode for ${name}`);
    assert.ok(lib.langs[name](), `${name} builds`);
  }
  // auto-close brackets and quotes work on a headless state
  const { EditorState } = lib.state;
  const st = EditorState.create({ doc: '', extensions: [lib.autocomplete.closeBrackets(), lib.langs.javascript()] });
  assert.equal(st.doc.length, 0);
  // the length cap rejects an over-long change
  const capped = EditorState.create({ doc: 'abc', extensions: [EditorState.changeFilter.of((tr) => tr.newDoc.length <= 5)] });
  assert.equal(capped.update({ changes: { from: 3, insert: 'defgh' } }).state.doc.toString(), 'abc', 'over the cap: change rejected');
  assert.equal(capped.update({ changes: { from: 3, insert: 'de' } }).state.doc.toString(), 'abcde');
});

test('code editor: needs no CSP change (same-origin bundle, no third-party imports) and uses the emerald palette', () => {
  const js = fs.readFileSync(new URL('../js/code-editor.js', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /https?:\/\//, 'no remote module URLs');
  const css = fs.readFileSync(new URL('../css/app.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('/* Code editor (CodeMirror)'));
  const colours = block.match(/#[0-9a-f]{6}/gi) || [];
  assert.ok(colours.length >= 8);
  for (const hex of colours) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(!(b > r && b > g && b - g > 25), `${hex} is blue/violet`);
  }
});

test('code editor: without CodeMirror (offline, tests) the textarea is the editor and the page still works', async () => {
  const app = await bootApp();
  await goTo(app, 'coding');
  app.document.querySelector('#questionList [data-qid]').click();
  await tick(250);
  const ta = app.document.getElementById('codeEditor');
  assert.equal(ta.hidden, false);
  assert.equal(app.run('Coding._editor.kind'), 'textarea');
  assert.equal(ta.maxLength, 30000, 'length limit kept');
  app.run("Coding._setCode('const x = 1;')");
  assert.equal(ta.value, 'const x = 1;');
  assert.equal(app.run('Coding.state.code'), 'const x = 1;');
  assert.deepEqual(app.errors, []);
});
