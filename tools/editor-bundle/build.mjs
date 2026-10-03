import { build } from 'esbuild';
await build({
  entryPoints: ['entry.js'], bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'none',
  outfile: '../../js/vendor/codemirror.js'
});
console.log('wrote js/vendor/codemirror.js');
