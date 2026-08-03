const fs = require('fs');
function countTitles(rel) {
  const src = fs.readFileSync(rel, 'utf8');
  const m = src.match(/title:\s*"/g) || [];
  return m.length;
}
function extractIds(rel) {
  const src = fs.readFileSync(rel, 'utf8');
  // only object-level id: "..." — use a split on lines starting with two spaces then id:
  const lines = src.split('\n');
  const ids = [];
  for (const line of lines) {
    const m = line.match(/^\s{2}id:\s*"([^"]+)"/);
    if (m) ids.push(m[1]);
  }
  return ids;
}
const fb = countTitles('js/data/coding-fallback.js');
const ex = countTitles('js/data/coding-questions.js');
console.log('FALLBACK_CODING (by title):', fb);
console.log('EXTRA_CODING (by title):', ex);
console.log('TOTAL:', fb + ex);

const fallbackIds = extractIds('js/data/coding-fallback.js');
const extraIds = extractIds('js/data/coding-questions.js');
console.log('fallback ids found:', fallbackIds.length, '| extra ids found:', extraIds.length);
const all = [...fallbackIds, ...extraIds];
const dup = all.filter((x, i) => all.indexOf(x) !== i);
console.log('Duplicate ids:', dup.length ? dup.join(', ') : 'none');
