/* Live check against the real Wandbox (needs the internet; NOT part of CI).
     npm run wandbox:smoke
   For every language Wandbox lists right now (minus the documented exclusions) it:
     1. makes sure js/skeletons.js has a starter template for it,
     2. runs a complete sample program (wandbox-samples.cjs) with the language's default compiler and checks the
        output, using the same js/wandbox.js code the browser uses,
     3. compiles / runs the starter template itself: it must be accepted by the compiler and print nothing.
   Exit code 1 if anything fails, so a changed Wandbox (new language, removed compiler) is noticed. */
const { loadScript } = require('./load.cjs');
const samples = require('./wandbox-samples.cjs');

const Wandbox = loadScript('js/wandbox.js', 'Wandbox', { fetch, AbortController, AbortSignal });
const Skeletons = loadScript('js/skeletons.js', 'Skeletons');

const INPUT = '3\n1 2 3\n';
const only = process.argv[2];

async function runWithRetry(args) {
  let r = await Wandbox.run(args);
  for (let i = 0; i < 2 && r.kind === 'network'; i++) {
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    r = await Wandbox.run(args);
  }
  return r;
}

(async () => {
  const list = await Wandbox.compilers(true);
  const langs = Wandbox.languages(list).filter((l) => !only || l.language === only);
  const problems = [];
  let done = 0;
  const queue = langs.slice();
  const worker = async () => {
    for (let l = queue.shift(); l; l = queue.shift()) {
      const name = l.language;
      const skeleton = Skeletons.for(name);
      if (!skeleton || !skeleton.code) { problems.push(`${name}: no starter template in js/skeletons.js`); continue; }
      if (!samples[name]) { problems.push(`${name}: no sample program in wandbox-samples.cjs`); continue; }
      const compiler = l.default;
      const sample = await runWithRetry({ compiler, code: samples[name], stdin: INPUT });
      if (sample.kind !== 'ok' || sample.stdout.trim() !== '6') {
        problems.push(`${name} (${compiler}): sample program ${sample.kind}: ${JSON.stringify((sample.message || sample.stdout || '').slice(0, 200))}`);
      }
      const empty = await runWithRetry({ compiler, code: skeleton.code, stdin: INPUT });
      if (empty.kind !== 'ok' || empty.stdout.trim() !== '') {
        problems.push(`${name} (${compiler}): starter template ${empty.kind}: ${JSON.stringify((empty.message || empty.stdout || '').slice(0, 200))}`);
      }
      done++;
      console.log(`${sample.kind === 'ok' && sample.stdout.trim() === '6' && empty.kind === 'ok' ? 'ok  ' : 'FAIL'} ${name} (${compiler})`);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  console.log(`\n${done} languages checked, ${problems.length} problem(s).`);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
