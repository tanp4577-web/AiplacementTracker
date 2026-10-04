/* Copies the legacy (wide browser support) pdf.js build into js/vendor. Run: cd tools/pdf-vendor && npm install && node copy.cjs */
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'node_modules', 'pdfjs-dist');
const out = path.join(__dirname, '..', '..', 'js', 'vendor');
for (const [from, to] of [['legacy/build/pdf.min.mjs', 'pdf.min.mjs'], ['legacy/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'], ['LICENSE', 'pdfjs-LICENSE.txt']]) fs.copyFileSync(path.join(src, from), path.join(out, to));
console.log('copied pdf.js', require(path.join(src, 'package.json')).version);
