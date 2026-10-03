/* Loads one of the page's browser scripts (js/*.js, which declare a top-level `const Name = ...`) into a Node
   vm context and returns that global, so the build and the tests exercise the exact code the browser runs. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function loadScript(file, name, globals = {}) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, ...globals });
  return vm.runInContext(`${src}\n;${name}`, ctx, { filename: file });
}

module.exports = { loadScript };
