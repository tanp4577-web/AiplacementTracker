/* ============ Company Patterns Explorer Module ============ */
const Company = {
  state: {
    filterCompany: 'all',
    filterDifficulty: 'all',
    search: ''
  },

  render(container) {
    this.container = container;
    this.state = { filterCompany: 'all', filterDifficulty: 'all', search: '' };
    this._renderShell();
  },

  /** Draws the page once. Filtering afterwards only swaps the pattern list (see _updateList),
   *  so the search box keeps focus and no card is rebuilt or re-animated while you type. */
  _renderShell() {
    const companies = COMPANY_PATTERNS.companies;
    const esc = (v) => Sanitize.html(v);

    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="card-title"><i class="bi bi-buildings text-accent" style="margin-right:4px"></i>Company Interview Patterns</div>
        <div class="card-sub">Master the DSA patterns and technical rounds asked at top tech employers</div>
        <div class="filter-bar mt-2">
          <select id="companyFilter" aria-label="Filter by company">
            <option value="all">All Companies</option>
            ${companies.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}
          </select>
          <select id="difficultyFilter" aria-label="Filter by difficulty">
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <input type="search" id="patternSearch" placeholder="Search patterns..." aria-label="Search patterns" value="${esc(this.state.search)}" />
        </div>
      </div>

      <div class="card mb-2">
        <div class="card-title"><i class="bi bi-lightbulb text-accent" style="margin-right:4px"></i>Company Insights</div>
        <div class="card-sub">What each company focuses on during campus hiring</div>
        <div class="grid grid-3">
          ${companies.map(c => `
            <div class="card hoverable" style="padding:16px" data-company="${esc(c.name)}">
              <div class="flex gap-2 items-center mb-1">
                ${ICONS.logo(c.logo)}
                <div>
                  <b style="font-size:14.5px">${esc(c.name)}</b>
                  <div class="text-dim" style="font-size:11.5px">${esc(c.tagline)}</div>
                </div>
              </div>
              <div class="flex-between">
                <span class="chip ${c.difficulty === 'Hard' ? 'red' : c.difficulty === 'Medium' ? 'orange' : 'green'}">${esc(c.difficulty)}</span>
                <span class="text-dim" style="font-size:11.5px">${COMPANY_QUESTIONS[c.name] ? COMPANY_QUESTIONS[c.name].length + ' questions' : ''}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">DSA Pattern Master List <span class="chip blue" style="margin-left:6px" id="patternCount"></span></div>
        <div class="card-sub">Click a pattern to see strategy, complexity, and sample code</div>
        <div class="grid grid-2" id="patternGrid" aria-live="polite"></div>
      </div>
    `;

    document.getElementById('companyFilter').addEventListener('change', (e) => {
      this.state.filterCompany = e.target.value;
      this._updateList();
    });
    document.getElementById('difficultyFilter').addEventListener('change', (e) => {
      this.state.filterDifficulty = e.target.value;
      this._updateList();
    });
    document.getElementById('patternSearch').addEventListener('input', (e) => {
      this.state.search = e.target.value;
      this._updateList();
    });
    document.querySelectorAll('[data-company]').forEach(el => {
      el.addEventListener('click', () => {
        this.state.filterCompany = el.dataset.company;
        document.getElementById('companyFilter').value = el.dataset.company;
        this._updateList();
        document.getElementById('patternGrid').scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      });
    });
    // One delegated listener, so it survives every list refresh.
    const grid = document.getElementById('patternGrid');
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('[data-pattern]');
      if (card) this._openPattern(card.dataset.pattern);
    });
    grid.addEventListener('keydown', (e) => {
      const card = e.target.closest('[data-pattern]');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this._openPattern(card.dataset.pattern);
      }
    });

    this._updateList();
  },

  /** Recomputes the filtered patterns and replaces only the list contents. */
  _updateList() {
    const patterns = COMPANY_PATTERNS.patterns;
    const term = this.state.search.trim().toLowerCase();
    const esc = (v) => Sanitize.html(v);

    const filtered = patterns.filter(p => {
      const matchCompany = this.state.filterCompany === 'all' || p.companies.includes(this.state.filterCompany);
      const matchDiff = this.state.filterDifficulty === 'all' || p.difficulty === this.state.filterDifficulty;
      const matchSearch = !term || p.name.toLowerCase().includes(term) || p.desc.toLowerCase().includes(term);
      return matchCompany && matchDiff && matchSearch;
    });

    document.getElementById('patternCount').textContent = `${filtered.length} shown`;
    document.getElementById('patternGrid').innerHTML = filtered.map(p => `
      <div class="card pattern-card hoverable" data-pattern="${esc(p.id)}" style="cursor:pointer" tabindex="0" role="button">
        <div class="flex-between mb-1">
          <div class="flex gap-2 items-center">
            <span style="color:var(--accent)">${ICONS.pattern(p.icon)}</span>
            <b style="font-size:15px">${esc(p.name)}</b>
          </div>
          <span class="chip ${p.difficulty === 'Easy' ? 'green' : p.difficulty === 'Medium' ? 'orange' : 'red'}">${esc(p.difficulty)}</span>
        </div>
        <div class="text-dim" style="font-size:13px;line-height:1.5">${esc(p.desc)}</div>
        <div class="flex gap-1 mt-2" style="flex-wrap:wrap">
          <span class="chip cyan">${esc(p.time)}</span>
          <span class="chip purple">${esc(p.space)}</span>
          ${p.companies.slice(0, 3).map(c => `<span class="chip">${esc(c)}</span>`).join('')}
        </div>
      </div>
    `).join('') || '<div class="empty-state"><h3>No patterns match your filters</h3><p>Try clearing search or filters</p></div>';
  },

  _openPattern(id) {
    const p = COMPANY_PATTERNS.patterns.find(x => x.id === id);
    if (!p) return;

    this.container.innerHTML = `
      <div class="mb-2">
        <button class="btn btn-ghost btn-sm" id="backBtn"><- Back to Patterns</button>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="flex-between mb-2">
            <div class="flex gap-2 items-center">
              <span style="color:var(--accent)">${ICONS.pattern(p.icon)}</span>
              <div>
                <div class="card-title" style="margin-bottom:0">${p.name}</div>
                <div class="card-sub">${p.difficulty} difficulty</div>
              </div>
            </div>
            <span class="chip ${p.difficulty === 'Easy' ? 'green' : p.difficulty === 'Medium' ? 'orange' : 'red'}">${p.difficulty}</span>
          </div>
          <div class="text-dim mb-2" style="line-height:1.6;font-size:13.5px">${p.desc}</div>
          <div class="flex gap-1 mb-2">
            <span class="chip cyan">Time: ${p.time}</span>
            <span class="chip purple">Space: ${p.space}</span>
          </div>
          <div class="divider"></div>
          <div class="card-title mb-1" style="font-size:14px">Strategy</div>
          <div class="text-dim" style="font-size:13px;line-height:1.6">${p.strategy}</div>
          <div class="divider"></div>
          <div class="card-title mb-1" style="font-size:14px">Asked At</div>
          <div class="tag-row">
            ${p.companies.map(c => `<span class="chip blue">${c}</span>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="card-title mb-1" style="font-size:14px">Practice Problems</div>
          ${p.problems.map((prob, i) => `
            <div class="section-check">
              <div class="check-icon" style="background:rgba(230,162,60,0.14);color:var(--accent)">${i + 1}</div>
              <span style="font-size:13px">${prob}</span>
            </div>
          `).join('')}
        </div>
        <div class="card">
          <div class="card-title">Sample Solution</div>
          <div class="card-sub">Reference implementation in JavaScript</div>
          <div class="code-wrap">
            <div class="code-header">
              <div class="code-dots"><span></span><span></span><span></span></div>
              <span class="code-file">pattern.js</span>
            </div>
            <textarea class="code-input" readonly style="min-height:340px">${p.sample}</textarea>
          </div>
        </div>
      </div>
    `;

    document.getElementById('backBtn').addEventListener('click', () => this._renderShell());
  }
};
