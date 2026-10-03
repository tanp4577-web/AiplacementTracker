/* Complete JavaScript programs (they read stdin and print to stdout) that solve a few questions. The same
   programs are used by the tests to prove that the page's runner, the judge and the question data agree. */

/** Two Sum: `nums` (count, then values), `target`; prints the two indices as an array (count, then values). */
export const TWO_SUM = `
const t = require('fs').readFileSync(0, 'utf8').split('\\n');
const n = Number(t[0]);
const nums = t[1].split(' ').map(Number);
const target = Number(t[2]);
const seen = {};
for (let i = 0; i < n; i++) {
  const need = target - nums[i];
  if (need in seen) { console.log(2); console.log(seen[need] + ' ' + i); break; }
  seen[nums[i]] = i;
}
`;

/** Prints something for Two Sum that is only sometimes right. */
export const TWO_SUM_PARTIAL = `console.log(2); console.log('0 1');`;

/** Reads the input with readline events (a different way to read stdin). */
export const TWO_SUM_READLINE = `
const rl = require('readline').createInterface({ input: process.stdin });
const lines = [];
rl.on('line', (l) => lines.push(l));
rl.on('close', () => {
  const nums = lines[1].split(' ').map(Number);
  const target = Number(lines[2]);
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
    if (nums[i] + nums[j] === target) { console.log(2); console.log(i + ' ' + j); return; }
  }
});
`;
