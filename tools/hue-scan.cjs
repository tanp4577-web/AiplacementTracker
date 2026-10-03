const a = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const hits = new Map();
const hue = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 0.12) return null; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = Math.round(h * 60); return (h + 360) % 360; };
for (const st of Object.keys(a)) { if (st === '__hover') continue; for (const [k, o] of Object.entries(a[st])) for (const p of ['color', 'background-color', 'border-top-color', 'box-shadow', 'fill', 'stroke', 'background-image']) {
  for (const m of String(o[p]).matchAll(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/g)) { if (m[4] !== undefined && Number(m[4]) < 0.05) continue; const h = hue(+m[1], +m[2], +m[3]); if (h !== null && h >= 200 && h <= 300) { const key = `${p} ${m[0]}`; if (!hits.has(key)) hits.set(key, new Set()); hits.get(key).add(st + ' ' + k.split(' ').slice(1).join(' ')); } } } }
for (const [k, v] of hits) console.log(k, '|', [...v].slice(0, 3).join(' ; '));
console.log(hits.size, 'blue/violet colours in use');
