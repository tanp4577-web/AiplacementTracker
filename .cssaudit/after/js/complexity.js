/* Complexity classes and the "how the work grows" view used on the Coding Practice page.
   COMPLEXITY_CLASSES gives log10(operations) for an input of size n, so exponential and factorial
   algorithms stay finite numbers. tools/coding-bank/dsl.cjs loads this same file to validate labels,
   so the browser and the build can never disagree. */
const COMPLEXITY_CLASSES = (() => {
  const lg = (x) => Math.log10(Math.max(1, x));
  const lg2 = (n) => Math.log2(Math.max(2, n));
  const factorial = (n) => (n < 2 ? 0 : (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN10);
  return {
    '1': () => 0,
    'logn': (n) => lg(lg2(n)),
    'sqrtn': (n) => 0.5 * lg(n),
    'n': (n) => lg(n),
    'nlogn': (n) => lg(n) + lg(lg2(n)),
    'nsqrtn': (n) => 1.5 * lg(n),
    'n2': (n) => 2 * lg(n),
    'n2logn': (n) => 2 * lg(n) + lg(lg2(n)),
    'n3': (n) => 3 * lg(n),
    'n4': (n) => 4 * lg(n),
    '2^n': (n) => n * Math.log10(2),
    'n2^n': (n) => lg(n) + n * Math.log10(2),
    '3^n': (n) => n * Math.log10(3),
    'n!': (n) => factorial(n),
    'nn!': (n) => lg(n) + factorial(n)
  };
})();

const ComplexityView = {
  DEFAULT_SIZES: [10, 100, 1000, 10000, 100000, 1000000],
  /** About 10^8 simple operations fit in one second on a typical machine. */
  LIMITS: [[7, 'instant', 'ok'], [8, 'under a second', 'ok'], [9, 'a few seconds', 'warn'], [Infinity, 'too slow', 'bad']],

  opsLog10(cls, n) {
    const f = COMPLEXITY_CLASSES[cls];
    return f ? f(n) : 0;
  },

  verdict(log10ops) {
    return this.LIMITS.find(([max]) => log10ops < max) || this.LIMITS[this.LIMITS.length - 1];
  },

  /** 1,000 -> "1.0×10³". Small values are shown as plain numbers. */
  format(log10ops) {
    if (log10ops < 4) return String(Math.max(1, Math.round(Math.pow(10, log10ops)))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const exp = Math.floor(log10ops);
    const mant = Math.pow(10, log10ops - exp);
    const sup = String(exp).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    return `${mant.toFixed(1)}×10${sup}`;
  },

  formatN(n) {
    return Number(n).toLocaleString('en-US');
  },

  rows(approaches, n) {
    return approaches.map((a) => {
      const time = this.opsLog10(a.timeClass, n);
      const [, label, tone] = this.verdict(time);
      return { name: a.name, time: a.time, ops: this.format(time), width: Math.max(2, Math.min(100, (time / 12) * 100)), label, tone };
    });
  },

  html(q, esc) {
    const list = q.approaches || [];
    if (!list.length) return '';
    const sizes = q.sizes && q.sizes.length ? q.sizes : this.DEFAULT_SIZES;
    const start = Math.min(sizes.length - 1, Math.max(0, sizes.indexOf(1000) >= 0 ? sizes.indexOf(1000) : Math.floor(sizes.length / 2)));
    return `
      <div class="cx" data-cx>
        <div class="cx-tabs" role="tablist" aria-label="Ways to solve it">
          ${list.map((a, i) => `<button type="button" class="cx-tab ${i === 0 ? 'active' : ''}" role="tab" aria-selected="${i === 0}" data-i="${i}">${i + 1}. ${esc(a.name)}</button>`).join('')}
        </div>
        ${list.map((a, i) => `
          <div class="cx-panel" role="tabpanel" data-panel="${i}" ${i === 0 ? '' : 'hidden'}>
            <p class="cx-idea">${esc(a.idea)}</p>
            <div class="cx-badges"><span class="chip">Time ${esc(a.time)}</span><span class="chip">Space ${esc(a.space)}</span></div>
            <pre class="cx-code"><code>${esc(a.code)}</code></pre>
            ${a.note ? `<p class="text-dim cx-note">${esc(a.note)}</p>` : ''}
          </div>`).join('')}
        <div class="cx-grow">
          <div class="cx-grow-head">
            <b>How the work grows</b>
            <label class="cx-slider">Input size n
              <input type="range" min="0" max="${sizes.length - 1}" step="1" value="${start}" aria-label="Input size" data-cx-size>
              <output data-cx-out>${this.formatN(sizes[start])}</output>
            </label>
          </div>
          <div class="cx-rows" data-cx-rows>${this.rowsHtml(list, sizes[start], esc)}</div>
          <p class="text-dim cx-foot">Operations are estimates (about 10⁸ per second). Drag n and watch the slow approaches fall off a cliff while the fast ones barely move.</p>
          <details class="cx-guide"><summary>Which complexity fits which input size?</summary>
            <table class="data-table"><thead><tr><th>n up to about</th><th>Aim for</th></tr></thead><tbody>
              <tr><td>10 to 11</td><td>O(n!) (try every ordering)</td></tr>
              <tr><td>20 to 25</td><td>O(2ⁿ) (try every subset)</td></tr>
              <tr><td>500</td><td>O(n³)</td></tr>
              <tr><td>5,000</td><td>O(n²)</td></tr>
              <tr><td>1,000,000</td><td>O(n log n)</td></tr>
              <tr><td>100,000,000</td><td>O(n)</td></tr>
              <tr><td>anything</td><td>O(log n) or O(1)</td></tr>
            </tbody></table>
          </details>
        </div>
      </div>`;
  },

  rowsHtml(list, n, esc) {
    return this.rows(list, n).map((r) => `
      <div class="cx-row">
        <div class="cx-name">${esc(r.name)} <span class="text-dim">${esc(r.time)}</span></div>
        <div class="cx-bar"><i class="cx-${r.tone}" style="width:${r.width}%"></i></div>
        <div class="cx-ops">${r.ops}</div>
        <div class="cx-verdict cx-${r.tone}-t">${r.label}</div>
      </div>`).join('');
  },

  /** Wires the tabs and the size slider inside `root`. */
  bind(root, q, esc) {
    const box = root.querySelector('[data-cx]');
    if (!box) return;
    const sizes = q.sizes && q.sizes.length ? q.sizes : this.DEFAULT_SIZES;
    box.querySelectorAll('.cx-tab').forEach((tab) => tab.addEventListener('click', () => {
      box.querySelectorAll('.cx-tab').forEach((t) => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
      box.querySelectorAll('.cx-panel').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.i; });
    }));
    const slider = box.querySelector('[data-cx-size]');
    slider.addEventListener('input', () => {
      const n = sizes[parseInt(slider.value, 10)];
      box.querySelector('[data-cx-out]').textContent = this.formatN(n);
      box.querySelector('[data-cx-rows]').innerHTML = this.rowsHtml(q.approaches, n, esc);
    });
  }
};
