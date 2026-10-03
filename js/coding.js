/* ============ Coding Sandbox Module ============
   Practice problems fetched from /api/coding-questions (nothing is bundled into the page):
     - a paged list with search, difficulty, topic, role and solved/unsolved filters
     - one full question (stubs, tests, approaches) loaded when you open it
     - practice sessions built from the ids of the filtered list
     - an activity section listing what you have solved and what you have tried
   Keeps the in-browser editor + instant test runner.
   =============================================== */
const Coding = {
  state: {
    items: [],       // list summaries for the current filters (paged)
    total: 0,        // how many problems match the filters
    facets: null,    // overall counts for the filters (difficulty, topics, roles)
    loading: false,
    error: '',
    current: null,
    code: '',
    results: [],
    lang: 'javascript', // 'javascript' | 'cpp'
    filters: { difficulty: 'all', role: 'all', topic: 'all', status: 'all', search: '', count: 10, limit: 30 },
    session: [],
    sessionIndex: 0,
    sessionActive: false,
    sessionResults: {},
    prelude: '',     // helpers (ListNode, TreeNode, ...) that the test runner makes available
    tab: null        // activity section tab: 'solved' | 'attempted' (null = automatic)
  },
  _cache: {},        // full questions already fetched, by id
  _meta: {},         // title / difficulty / topic for ids seen in lists, sessions and activity

  render(container) {
    this.container = container;
    this.state.current = null;
    this.state.session = [];
    this.state.sessionIndex = 0;
    this.state.sessionActive = false;
    this.state.sessionResults = {};
    this.state.filters.limit = 30;
    this.state.items = [];
    this.state.error = '';
    this._renderList();
    this._loadList();
  },

  /* ---------------------------------------------------------------- API */

  async _api(params) {
    const res = await fetch(`/api/coding-questions?${params.toString()}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) throw new Error((data && data.error) || 'The question service is not available.');
    return data;
  },

  _solvedIds() {
    const prog = Auth.getEmail() ? DB.getProgress(Auth.getEmail()) : null;
    return prog && prog.coding && Array.isArray(prog.coding.solved) ? prog.coding.solved : [];
  },

  /** Filters as a query string. Solved / unsolved is sent as include / exclude lists of ids. */
  _query(extra = {}) {
    const f = this.state.filters;
    const p = new URLSearchParams();
    if (f.difficulty !== 'all') p.set('difficulty', f.difficulty);
    if (f.topic !== 'all') p.set('topic', f.topic);
    if (f.role !== 'all') p.set('role', f.role);
    if (f.search.trim()) p.set('q', f.search.trim());
    const solved = this._solvedIds();
    if (f.status === 'solved') p.set('include', solved.length ? solved.join(',') : '-');
    if (f.status === 'unsolved' && solved.length) p.set('exclude', solved.join(','));
    for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
    return p;
  },

  /** Loads the first page, or the next page when `append` is true, and repaints the list. */
  async _loadList(append = false) {
    const st = this.state;
    const ticket = (this._ticket = (this._ticket || 0) + 1);
    st.loading = true;
    st.error = '';
    this._paintList();
    try {
      const data = await this._api(this._query({ offset: append ? st.items.length : 0, limit: 30 }));
      if (ticket !== this._ticket) return;
      st.items = append ? [...st.items, ...data.items] : data.items;
      st.total = data.total;
      const firstFacets = !st.facets;
      if (data.facets) st.facets = data.facets;
      st.items.forEach((q) => { this._meta[q.id] = q; });
      st.loading = false;
      if (!document.getElementById('questionList')) return; // the learner has moved on (opened a problem)
      if (firstFacets) this._renderList(); else this._paintList();
    } catch (e) {
      if (ticket !== this._ticket) return;
      st.loading = false;
      st.error = e.message || 'Could not load the problems.';
      this._paintList();
    }
  },

  /** Full question by id, cached. Also remembers the test-helper prelude the runner needs. */
  async _fetchQuestion(id) {
    if (this._cache[id]) return this._cache[id];
    const data = await this._api(new URLSearchParams({ id }));
    this._cache[id] = data.question;
    this._meta[id] = data.question;
    if (data.prelude) this.state.prelude = data.prelude;
    return data.question;
  },

  /** Titles for ids we have not seen yet (older solved problems, session reviews). */
  async _hydrate(ids) {
    const missing = ids.filter((id) => !this._meta[id]);
    if (!missing.length) return false;
    try {
      const data = await this._api(new URLSearchParams({ ids: missing.join(',') }));
      data.items.forEach((q) => { this._meta[q.id] = q; });
      return true;
    } catch {
      return false;
    }
  },

  /* ---------------------------------------------------------------- list */

  /** Focus mode: hides the sidebar and top bar so only the problem, editor and results remain. */
  _setFocus(on, quiet) {
    const body = document.body;
    body.classList.toggle('coding-focus', !!on);
    let exit = document.getElementById('focusExit');
    if (on && !exit) {
      exit = document.createElement('button');
      exit.type = 'button';
      exit.id = 'focusExit';
      exit.className = 'btn btn-sm focus-exit';
      exit.setAttribute('aria-label', 'Exit focus mode');
      exit.innerHTML = '<i class="bi bi-fullscreen-exit"></i> Exit focus mode';
      exit.addEventListener('click', () => this._setFocus(false));
      body.appendChild(exit);
    }
    if (!on && exit) exit.remove();
    const btn = document.getElementById('focusBtn');
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!this._focusKey) {
      this._focusKey = (e) => {
        if (e.key !== 'Escape' || !document.body.classList.contains('coding-focus')) return;
        if (document.querySelector('.modal-overlay.show, #appConfirmModal')) return;
        this._setFocus(false);
      };
      document.addEventListener('keydown', this._focusKey);
    }
    if (!quiet) (on ? document.getElementById('focusExit') : document.getElementById('focusBtn'))?.focus();
  },

  _renderList() {
    const prog = Auth.getEmail() ? DB.getProgress(Auth.getEmail()) : null;
    const solved = prog && prog.coding ? prog.coding.solved : [];
    const f = this.state.filters;
    const fc = this.state.facets;
    const esc = (v) => this._escapeHtml(v);
    const opt = (value, label, current) => `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(label)}</option>`;
    const topics = fc ? Object.keys(fc.topics).sort() : [];
    const roles = fc ? fc.roles : [];
    const total = fc ? fc.total : 0;

    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title"><i class="bi bi-code-slash text-accent" style="font-size:16px"></i> Coding Practice</div>
          <div class="card-sub">${fc ? `${total} problems. ` : ''}Each one has several ways to solve it, with the time and space cost of every approach.</div>

          <div class="filter-bar">
            <input type="search" id="codeSearch" placeholder="Search problems or topics" aria-label="Search problems" value="${esc(f.search)}">
            <select id="difficultyFilter" aria-label="Difficulty">
              ${opt('all', 'All difficulties', f.difficulty)}
              ${['Easy', 'Medium', 'Hard'].map((d) => opt(d, fc ? `${d} (${fc.difficulty[d] || 0})` : d, f.difficulty)).join('')}
            </select>
            <select id="topicFilter" aria-label="Topic">
              ${opt('all', 'All topics', f.topic)}
              ${topics.map((t) => opt(t, t, f.topic)).join('')}
            </select>
            <select id="statusFilter" aria-label="Status">
              ${opt('all', 'Solved and unsolved', f.status)}
              ${opt('unsolved', 'Unsolved only', f.status)}
              ${opt('solved', 'Solved only', f.status)}
            </select>
            <select id="roleFilter" aria-label="Role">
              ${opt('all', 'All roles', f.role)}
              ${roles.map((r) => opt(r, r, f.role)).join('')}
            </select>
          </div>

          <div class="flex gap-1 items-center mt-2" style="flex-wrap:wrap">
            <label class="field-label" style="margin:0 4px 0 0;text-transform:none;letter-spacing:0">Practice questions:</label>
            <select id="countFilter" style="width:auto;min-width:110px">
              ${[5, 10, 20, 50].map((c) => `<option value="${c}" ${f.count == c ? 'selected' : ''}>${c} questions</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" id="startSessionBtn">
              <i class="bi bi-lightning-charge-fill" style="margin-right:4px"></i>
              Generate ${f.count}Q Session
            </button>
          </div>
          <div class="text-dim" id="matchCount" style="font-size:12px;margin-top:8px"></div>
          <div id="questionList" class="mt-2" aria-live="polite"></div>
        </div>
        <div>
          <div class="card">
            <div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="8"/></svg> Your Progress</div>
            <div class="card-sub">Coding statistics</div>
            <div class="stat-row" style="margin-bottom:10px">
              <div class="card stat-card" style="padding:14px">
                <div class="card-stat">${solved.length}</div>
                <div class="card-stat-label">Solved</div>
              </div>
              <div class="card stat-card" style="padding:14px">
                <div class="card-stat">${total || '…'}</div>
                <div class="card-stat-label">Total Bank</div>
              </div>
            </div>
            <div class="progress-label"><span>Completion</span><span>${total ? Math.round((solved.length / total) * 100) : 0}%</span></div>
            <div class="progress"><div class="progress-fill green" style="width:${total ? (solved.length / total) * 100 : 0}%"></div></div>
            <div class="divider"></div>
            <div class="card-title mb-1" style="font-size:13px">Topic Coverage</div>
            <div class="tag-row">${this._topicSummary()}</div>
            <div class="divider"></div>
            <div class="text-dim" style="font-size:12.5px">Attempts made: <b style="color:var(--text)">${prog && prog.coding ? prog.coding.totalAttempts : 0}</b></div>
            <div class="explanation mt-2" style="font-size:12.5px">
              <b>How sessions work:</b> pick filters, choose a question count, then hit <b>Generate Session</b>. You will get a curated sequence of that many questions with a progress tracker and a final summary.
            </div>
          </div>
          <div class="card mt-3" id="activityCard">${this._activityHtml()}</div>
        </div>
      </div>
    `;

    const refilter = (key, value) => { this.state.filters[key] = value; this._loadList(); };
    let searchTimer = 0;
    document.getElementById('codeSearch').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => refilter('search', v), 300);
    });
    document.getElementById('difficultyFilter').addEventListener('change', (e) => refilter('difficulty', e.target.value));
    document.getElementById('topicFilter').addEventListener('change', (e) => refilter('topic', e.target.value));
    document.getElementById('statusFilter').addEventListener('change', (e) => refilter('status', e.target.value));
    document.getElementById('roleFilter').addEventListener('change', (e) => refilter('role', e.target.value));
    document.getElementById('countFilter').addEventListener('change', (e) => {
      this.state.filters.count = parseInt(e.target.value, 10) || 10;
      const btn = document.getElementById('startSessionBtn');
      if (btn) btn.innerHTML = `Generate ${this.state.filters.count}Q Session`;
    });
    document.getElementById('startSessionBtn').addEventListener('click', () => this._startSession());
    this._bindActivity();
    this._paintList();
  },

  /** Repaints only the list of problems (and the match count), so typing in the search box never loses focus. */
  _paintList() {
    const box = document.getElementById('questionList');
    if (!box) return;
    const st = this.state;
    const esc = (v) => this._escapeHtml(v);
    const solvedIds = new Set(this._solvedIds());
    const count = document.getElementById('matchCount');
    if (count) {
      count.innerHTML = st.error ? '' : st.loading && !st.items.length ? 'Loading problems…' : `<b style="color:var(--accent)">${st.total}</b> questions match your filters.${st.total === 0 ? ' Try relaxing the filters.' : ''}`;
    }
    if (st.error) {
      box.innerHTML = `<div class="empty-state" role="alert"><h3>Couldn't load the problems</h3><p>${esc(st.error)}</p><button type="button" class="btn btn-ghost btn-sm" id="retryCodingBtn">Try again</button></div>`;
      document.getElementById('retryCodingBtn').addEventListener('click', () => this._loadList());
      return;
    }
    const rows = st.items.map((q) => `
      <div class="card hoverable mb-1" style="padding:14px;cursor:pointer" data-qid="${esc(q.id)}" role="button" tabindex="0">
        <b style="font-size:14px">${esc(q.title)}</b>
        <div class="text-dim" style="font-size:12px;margin-top:3px">${esc(q.summary || '')}</div>
        <div class="tag-row" style="margin-top:8px">
          <span class="chip ${q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Medium' ? 'orange' : 'red'}">${esc(q.difficulty)}</span>
          <span class="chip purple">${esc(q.topic)}</span>
          ${q.approaches ? `<span class="chip">${q.approaches} approaches</span>` : ''}
          ${q.targetRoles && q.targetRoles.length ? `<span class="chip cyan">${esc(q.targetRoles.slice(0, 2).join(', '))}${q.targetRoles.length > 2 ? '…' : ''}</span>` : ''}
          ${solvedIds.has(q.id) ? '<span class="chip green">[OK] Solved</span>' : ''}
        </div>
      </div>`).join('');
    const more = st.total > st.items.length
      ? `<button type="button" class="btn btn-ghost btn-block" id="showMoreBtn" ${st.loading ? 'disabled' : ''}>${st.loading ? 'Loading…' : `Show ${Math.min(30, st.total - st.items.length)} more (${st.total - st.items.length} left)`}</button>`
      : '';
    box.innerHTML = rows || (st.loading ? '' : '<div class="empty-state"><h3>No questions found</h3><p>Adjust your filters to see more challenges</p></div>');
    box.insertAdjacentHTML('beforeend', more);
    document.getElementById('showMoreBtn')?.addEventListener('click', () => this._loadList(true));
    box.querySelectorAll('[data-qid]').forEach((el) => {
      el.addEventListener('click', () => this._openQuestion(el.dataset.qid));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openQuestion(el.dataset.qid); } });
    });
  },

  _topicSummary() {
    const topics = this.state.facets ? this.state.facets.topics : {};
    return Object.entries(topics).sort().map(([t, n]) => `<span class="chip purple">${this._escapeHtml(t)} (${n})</span>`).join(' ') || '<span class="text-dim">No topics yet</span>';
  },

  /* ---------------------------------------------------------------- your activity */

  /** Everything the learner has tried: each problem's tries, best result and when. Older progress that only has a
      list of solved ids still shows up (without tries) once the titles are fetched. */
  _attempts() {
    const prog = Auth.getEmail() ? DB.getProgress(Auth.getEmail()) : null;
    const coding = (prog && prog.coding) || {};
    const map = { ...(coding.attempts || {}) };
    for (const id of coding.solved || []) if (!map[id]) map[id] = { id, tries: 0, solved: true };
    for (const [id, a] of Object.entries(map)) { map[id] = { ...a, id }; if ((coding.solved || []).includes(id)) map[id].solved = true; }
    return Object.values(map);
  },

  _ago(ms) {
    if (!ms) return '';
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 90) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} d ago`;
  },

  _activityHtml() {
    const esc = (v) => this._escapeHtml(v);
    const all = this._attempts();
    const solved = all.filter((a) => a.solved).sort((x, y) => (y.solvedAt || y.lastAt || 0) - (x.solvedAt || x.lastAt || 0));
    const tried = all.filter((a) => !a.solved).sort((x, y) => (y.lastAt || 0) - (x.lastAt || 0));
    // Until the learner picks a tab, show the one that has something in it.
    const tab = this.state.tab || (solved.length || !tried.length ? 'solved' : 'attempted');
    const list = tab === 'solved' ? solved : tried;
    const show = this.state.showAllActivity ? list : list.slice(0, 8);
    const row = (a) => {
      const m = this._meta[a.id] || {};
      const title = a.title || m.title || a.id;
      const diff = a.difficulty || m.difficulty || '';
      const topic = a.topic || m.topic || '';
      const detail = a.solved
        ? `Solved${a.tries ? ` in ${a.tries} ${a.tries === 1 ? 'try' : 'tries'}` : ''}${a.solvedAt || a.lastAt ? ` · ${this._ago(a.solvedAt || a.lastAt)}` : ''}`
        : `${a.tries} ${a.tries === 1 ? 'try' : 'tries'} · best ${a.best || 0}/${a.total || '?'} tests${a.lastAt ? ` · ${this._ago(a.lastAt)}` : ''}`;
      return `
        <button type="button" class="act-row" data-act-open="${esc(a.id)}">
          <span class="act-main"><b>${esc(title)}</b><span class="text-dim">${esc([diff, topic, a.lang === 'cpp' ? 'C++' : ''].filter(Boolean).join(' · '))}</span></span>
          <span class="act-detail ${a.solved ? 'cx-ok-t' : ''}">${esc(detail)}</span>
        </button>`;
    };
    return `
      <div class="card-title">Your activity</div>
      <div class="card-sub">What you have solved and what you have tried</div>
      <div class="cx-tabs" role="tablist" aria-label="Activity">
        <button type="button" class="cx-tab ${tab === 'solved' ? 'active' : ''}" role="tab" aria-selected="${tab === 'solved'}" data-act-tab="solved">Solved (${solved.length})</button>
        <button type="button" class="cx-tab ${tab === 'attempted' ? 'active' : ''}" role="tab" aria-selected="${tab === 'attempted'}" data-act-tab="attempted">Attempted, not solved (${tried.length})</button>
      </div>
      <div class="act-list">
        ${show.map(row).join('') || `<p class="text-dim" style="font-size:13px">${tab === 'solved' ? 'Nothing solved yet. Open a problem and press Run Tests: when every test passes it appears here.' : 'No unfinished attempts. Problems you run tests on but do not finish will be listed here.'}</p>`}
      </div>
      ${list.length > 8 ? `<button type="button" class="btn btn-ghost btn-sm mt-1" data-act-more>${this.state.showAllActivity ? 'Show fewer' : `Show all ${list.length}`}</button>` : ''}`;
  },

  _bindActivity() {
    const card = document.getElementById('activityCard');
    if (!card) return;
    const repaint = () => { card.innerHTML = this._activityHtml(); this._bindActivity(); };
    card.querySelectorAll('[data-act-tab]').forEach((b) => b.addEventListener('click', () => { this.state.tab = b.dataset.actTab; this.state.showAllActivity = false; repaint(); }));
    card.querySelector('[data-act-more]')?.addEventListener('click', () => { this.state.showAllActivity = !this.state.showAllActivity; repaint(); });
    card.querySelectorAll('[data-act-open]').forEach((b) => b.addEventListener('click', () => this._openQuestion(b.dataset.actOpen)));
    // Older solved ids have no stored title: fetch them once and repaint.
    const ids = this._attempts().filter((a) => !a.title).map((a) => a.id);
    this._hydrate(ids).then((changed) => { if (changed && document.getElementById('activityCard') === card) repaint(); });
  },

  /** Records one run of the tests: tries, the best result, the last time, and when it was first solved. */
  _recordProgress(q, passed, total, allPass) {
    const email = Auth.getEmail();
    if (!email) return;
    const prog = DB.getProgress(email);
    const coding = prog.coding || { solved: [], totalAttempts: 0 };
    coding.totalAttempts = (coding.totalAttempts || 0) + 1;
    const attempts = { ...(coding.attempts || {}) };
    const prev = attempts[q.id] || {};
    const now = Date.now();
    attempts[q.id] = {
      title: q.title, difficulty: q.difficulty, topic: q.topic || '',
      tries: (prev.tries || 0) + 1,
      best: Math.max(prev.best || 0, passed), total,
      firstAt: prev.firstAt || now, lastAt: now,
      solved: Boolean(prev.solved || allPass),
      solvedAt: prev.solvedAt || (allPass ? now : 0),
      lang: this.state.lang
    };
    coding.attempts = attempts;
    if (allPass && !coding.solved.includes(q.id)) {
      coding.solved = [...coding.solved, q.id];
      App.showToast(' All tests passed! Challenge solved.', 'success');
    }
    DB.saveProgress(email, { coding });
    App.refreshAll();
  },

  /* ---------------------------------------------------------------- sessions */

  async _startSession() {
    let data;
    try {
      data = await this._api(this._query({ idsOnly: 1 }));
    } catch (e) {
      App.showToast(e.message || 'Could not start a session', 'error');
      return;
    }
    if (!data.ids.length) {
      App.showToast('No questions match the current filters', 'error');
      return;
    }
    const count = Math.min(this.state.filters.count, data.ids.length);
    this.state.session = [...data.ids].sort(() => Math.random() - 0.5).slice(0, count);
    this.state.sessionIndex = 0;
    this.state.sessionActive = true;
    this.state.sessionResults = {};
    App.showToast(`Session generated: ${count} questions`, 'success');
    this._openQuestion(this.state.session[0]);
  },

  _savedLang() {
    try { return localStorage.getItem('pp_code_lang') || ''; } catch { return ''; }
  },

  _saveLang(lang) {
    try { localStorage.setItem('pp_code_lang', lang); } catch { /* private mode: lasts for this visit only */ }
  },

  _lookupCppQuestion(id) {
    // Find the matching C++ version of a JS question by id (suffix "-cpp").
    if (typeof EXTRA_CODING_CPP === 'undefined') return null;
    return EXTRA_CODING_CPP.find(c => c.id === id + '-cpp') || null;
  },

  async _openQuestion(id) {
    let q = this._cache[id];
    if (!q) {
      this.container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading problem...</p></div>';
      try {
        q = await this._fetchQuestion(id);
      } catch (e) {
        App.showToast(e.message || 'Could not load this problem', 'error');
        this._renderList();
        return;
      }
    }
    this.state.current = q;
    this.state.code = q.starterCode;
    this.state.results = [];
    // Default language: if a C++ version exists, prefer C++ for this question.
    // Remember the language the user last picked; with no choice yet, prefer C++ where a C++ version exists.
    this.state.lang = (this._lookupCppQuestion(q.id) && this._savedLang() !== 'javascript') ? 'cpp' : 'javascript';

    const inSession = this.state.sessionActive && this.state.session.includes(q.id);
    const sessionPos = inSession ? this.state.session.indexOf(q.id) : -1;
    const sessionTotal = this.state.session.length;
    const src = q.source || 'LeetCode';

    const renderEditor = () => {
      const isCpp = this.state.lang === 'cpp';
      const cppQ = this._lookupCppQuestion(q.id);
      const starter = isCpp ? (cppQ ? cppQ.starterCpp : this._cppTemplate(q)) : q.starterCode;
      const fileLabel = isCpp ? 'solution.cpp' : 'solution.js';
      const editor = document.getElementById('codeEditor');
      if (editor) {
        editor.value = starter;
        this.state.code = starter;
      }
      const fileEl = document.getElementById('codeFileLabel');
      if (fileEl) fileEl.textContent = fileLabel;
      const jsBtn = document.getElementById('langJsBtn');
      const cppBtn = document.getElementById('langCppBtn');
      if (jsBtn) jsBtn.classList.toggle('active', !isCpp);
      if (cppBtn) cppBtn.classList.toggle('active', isCpp);
      // The C++ button only exists in the DOM when this question has a C++ harness
      // (see the template below), so there is nothing to disable here otherwise.
      const runBtn = document.getElementById('runBtn');
      if (runBtn) runBtn.textContent = isCpp ? '▶ Run C++ Tests' : ' Run Tests';
      const cppNote = document.getElementById('cppNote');
      if (cppNote) cppNote.style.display = (isCpp && cppQ) ? 'block' : 'none';
    };

    this.container.innerHTML = `
      <div class="mb-2 flex-between" style="flex-wrap:wrap;gap:10px">
        <button class="btn btn-ghost btn-sm" id="backBtn"><i class="bi bi-arrow-left"></i> ${inSession ? 'Session' : 'Back to Problems'}</button>
        <div class="flex gap-1 items-center">
          ${inSession ? `<span class="chip blue">Session ${sessionPos + 1}/${sessionTotal}</span>` : ''}
          <button class="btn btn-ghost btn-sm" id="focusBtn" aria-pressed="false" title="Hide the sidebar and top bar (Esc to exit)"><i class="bi bi-arrows-fullscreen"></i> Focus mode</button>
        </div>
      </div>
      ${inSession ? `<div class="progress mb-2"><div class="progress-fill" style="width:${((sessionPos + 1) / sessionTotal) * 100}%"></div></div>` : ''}
      <div class="grid grid-2">
        <div class="card">
          <div class="flex-between mb-2">
            <div>
              <div class="card-title">${this._escapeHtml(q.title)}</div>
              <div class="card-sub" style="white-space:pre-line">${this._escapeHtml(q.description)}</div>
              ${q.constraints ? `<div class="text-dim mt-1" style="font-size:12.5px"><b>Constraints:</b> ${this._escapeHtml(q.constraints)}</div>` : ''}
            </div>
          </div>
          <div class="tag-row" style="margin-bottom:10px">
            <span class="chip ${src === 'LeetCode' ? 'blue' : 'purple'}">${this._escapeHtml(src)}</span>
            <span class="chip ${q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Medium' ? 'orange' : 'red'}">${this._escapeHtml(q.difficulty)}</span>
            ${q.topic ? `<span class="chip purple">${this._escapeHtml(q.topic)}</span>` : ''}
            ${(q.targetRoles || []).map(r => `<span class="chip cyan">${this._escapeHtml(r)}</span>`).join('')}
          </div>
          <div class="flex gap-2 mb-2" style="align-items:center">
            <span class="text-dim" style="font-size:12.5px">Language:</span>
            <button class="btn btn-ghost btn-sm ${this.state.lang === 'javascript' ? 'active' : ''}" id="langJsBtn">JavaScript</button>
            ${this._lookupCppQuestion(q.id)
              ? `<button class="btn btn-ghost btn-sm ${this.state.lang === 'cpp' ? 'active' : ''}" id="langCppBtn">C++</button>`
              : `<span class="chip gray" title="No C++ version of this question yet">C++ not available</span>`}
          </div>
          <div class="code-wrap">
            <div class="code-header">
              <div class="code-dots"><span></span><span></span><span></span></div>
              <span class="code-file" id="codeFileLabel">solution.js</span>
            </div>
            <textarea class="code-input" id="codeEditor" spellcheck="false" aria-label="Code editor. Press Tab to indent, Escape then Tab to leave.">${this._escapeHtml(q.starterCode)}</textarea>
          </div>
          <div class="text-dim" id="cppNote" style="display:none;font-size:12px;margin-top:6px">
            <b style="color:var(--accent)">C++ mode:</b> run via Wandbox GCC compiler (online).
          </div>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-primary" id="runBtn"><i class="bi bi-play-fill" style="margin-right:4px"></i>Run Tests</button>
            <button class="btn btn-ghost" id="resetCodeBtn"><i class="bi bi-arrow-counterclockwise" style="margin-right:4px"></i>Reset</button>
            <button class="btn btn-outline" id="solutionBtn"><i class="bi bi-lightbulb" style="margin-right:4px"></i>Show Solution</button>
          </div>
          ${inSession ? `<div class="flex gap-2 mt-2"><button class="btn btn-success btn-block" id="nextBtn" style="display:none">Next Question <i class="bi bi-arrow-right"></i></button></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title"><i class="bi bi-check2-all text-accent" style="font-size:16px"></i> Test Results</div>
          <div class="card-sub">Automated verification against hidden test cases</div>
          <div id="solutionPanel" style="display:none">
            ${(q.approaches && q.approaches.length && typeof ComplexityView !== 'undefined')
              ? ComplexityView.html(q, (v) => this._escapeHtml(v))
              : `<div class="explanation mb-2" style="border-color:rgba(230,162,60,0.35)">
              <b style="color:var(--accent)">Approach & Solution</b>
              <div class="mt-1" style="line-height:1.6">${this._escapeHtml(q.solution || q.explanation || 'No solution provided.')}</div>
            </div>`}
          </div>
          <div id="testResults">
            <div class="empty-state">
              <div class="es-icon"></div>
              <h3>Run tests to see results</h3>
              <p>Click "Run Tests" to check your solution</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('focusBtn').addEventListener('click', () => this._setFocus(!document.body.classList.contains('coding-focus')));
    this._setFocus(document.body.classList.contains('coding-focus'), true);
    document.getElementById('backBtn').addEventListener('click', () => {
      this._setFocus(false, true);
      if (inSession && this.state.sessionActive) {
        this._renderSessionSummary();
      } else {
        this._renderList();
      }
    });
    document.getElementById('runBtn').addEventListener('click', () => {
      if (this.state.lang === 'cpp') this._runCppTests();
      else this._runTests();
    });
    document.getElementById('resetCodeBtn').addEventListener('click', () => {
      const isCpp = this.state.lang === 'cpp';
      const cppQ = this._lookupCppQuestion(q.id);
      const starter = isCpp ? (cppQ ? cppQ.starterCpp : this._cppTemplate(q)) : q.starterCode;
      document.getElementById('codeEditor').value = starter;
      this.state.code = starter;
    });
    document.getElementById('solutionBtn').addEventListener('click', () => {
      const panel = document.getElementById('solutionPanel');
      const btn = document.getElementById('solutionBtn');
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.textContent = ' Hide Solution';
      } else {
        panel.style.display = 'none';
        btn.textContent = ' Show Solution';
      }
    });
    document.getElementById('codeEditor').addEventListener('input', (e) => {
      this.state.code = e.target.value;
    });
    // Tab inserts two spaces instead of moving focus out of the editor; Escape then Tab leaves it.
    let tabEnabled = true;
    document.getElementById('codeEditor').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { tabEnabled = false; return; }
      if (e.key !== 'Tab' || !tabEnabled || e.shiftKey) { if (e.key !== 'Tab') tabEnabled = true; return; }
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = start + 2;
      this.state.code = ta.value;
    });
    if (typeof ComplexityView !== 'undefined') ComplexityView.bind(document.getElementById('solutionPanel'), q, (v) => this._escapeHtml(v));
    document.getElementById('langJsBtn').addEventListener('click', () => {
      this.state.lang = 'javascript';
      this._saveLang('javascript');
      renderEditor();
    });
    document.getElementById('langCppBtn')?.addEventListener('click', () => {
      this.state.lang = 'cpp';
      this._saveLang('cpp');
      renderEditor();
    });

    renderEditor();

    if (inSession) {
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.addEventListener('click', () => this._nextSessionQuestion());
    }
  },

  /* A generic C++ template for JS-only questions that have no pre-supplied C++ candidate. */
  _cppTemplate(q) {
    if (q.topic === 'Trees') {
      return `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

// Implement below
`;
    }
    return `#include <bits/stdc++.h>
using namespace std;

// Implement the solution here
`;
  },

  /* ---- Run C++ test cases via Wandbox (with offline fallback) ---- */
  async _runCppTests() {
    const q = this.state.current;
    const cppQ = this._lookupCppQuestion(q.id);
    const resultsDiv = document.getElementById('testResults');
    const bodyCode = document.getElementById('codeEditor').value || this.state.code;

    if (!cppQ || !Array.isArray(cppQ.cppTestCases) || !cppQ.cppTestCases.length) {
      resultsDiv.innerHTML = `<div class="empty-state"><h3>No C++ test cases</h3><p>This question has no C++ test harness yet. Switch to JavaScript to run it.</p><button class="btn btn-primary btn-sm mt-2" id="switchToJsBtn">Switch to JavaScript</button></div>`;
      document.getElementById('switchToJsBtn')?.addEventListener('click', () => {
        this.state.lang = 'javascript';
        this._openQuestion(q.id);
      });
      return;
    }

    resultsDiv.innerHTML = `
      <div class="empty-state">
        <div class="spinner" style="width:26px;height:26px"></div>
        <h3>Compiling ${cppQ.cppTestCases.length} test(s)...</h3>
        <p>Running C++ (GCC) through Wandbox</p>
      </div>
    `;

    const results = [];
    let allPass = true;
    let networkError = null;

    for (let i = 0; i < cppQ.cppTestCases.length; i++) {
      const tc = cppQ.cppTestCases[i];
      const harness = this._cppHarness(cppQ, bodyCode);
      try {
        let data = null;
        try {
          const res = await fetch('/api/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ compiler: 'gcc-head', code: harness, stdin: tc.input || '' })
          });
          if (res.ok) data = await res.json();
        } catch (err) {}

        if (!data) {
          const res = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              compiler: 'gcc-head',
              code: harness,
              options: 'warning,gnu++17',
              stdin: tc.input || ''
            })
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          data = await res.json();
        }

        const program = (data.program || '').trim();
        const errors = data.compiler_error || data.stderr || '';
        if (errors) {
          results.push({ input: tc.input, expected: tc.expected, actual: 'Compile Error: ' + errors.trim().split('\n').slice(0, 3).join('\n'), pass: false });
          allPass = false;
        } else {
          const pass = program === tc.expected.trim();
          results.push({ input: tc.input, expected: tc.expected, actual: program, pass });
          if (!pass) allPass = false;
        }
      } catch (e) {
        networkError = e;
        break;
      }
    }

    if (networkError && results.length === 0) {
      resultsDiv.innerHTML = `
        <div class="card test-case" style="background:rgba(230,162,60,0.08);border-color:rgba(230,162,60,0.4)">
          <div class="test-title"><span>⚠ Offline mode</span><span class="text-warning">Network unavailable</span></div>
          <div class="test-io">
            <div style="color:var(--text)">Could not reach the online C++ compiler (${this._escapeHtml(networkError.message)}).</div>
            <div style="margin-top:4px">Run this locally to verify, or check the expected outputs below.</div>
          </div>
        </div>
        ${cppQ.cppTestCases.map(tc => `<div class="test-io mt-1"><div>Expected: <code style="color:var(--success)">${this._escapeHtml(tc.expected)}</code></div></div>`).join('')}
      `;
      return;
    }

    this.state.results = results;
    const passCount = results.filter(r => r.pass).length;
    allPass = passCount === results.length;

    this._recordProgress(q, passCount, results.length, allPass);

    if (this.state.sessionActive && this.state.session.includes(q.id)) {
      this.state.sessionResults[q.id] = allPass;
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.style.display = 'inline-flex';
    }

    resultsDiv.innerHTML = `
      <div class="mb-2">
        <div class="card stat-card" style="padding:14px">
          <div class="card-stat ${allPass ? 'text-success' : ''}">${passCount}/${results.length}</div>
          <div class="card-stat-label">Tests Passed</div>
        </div>
      </div>
      ${results.map((r, i) => `
        <div class="test-case ${r.pass ? 'pass' : 'fail'}">
          <div class="test-title">
            <span>Test ${i + 1}</span>
            <span class="${r.pass ? 'text-success' : 'text-danger'}">${r.pass ? '[OK] PASS' : '[X] FAIL'}</span>
          </div>
          <div class="test-io">
            <div>Input: <code>${this._escapeHtml(r.input)}</code></div>
            <div>Expected: <code>${this._escapeHtml(r.expected)}</code></div>
            <div>Your Output: <code>${this._escapeHtml(r.actual)}</code></div>
          </div>
        </div>
      `).join('')}
    `;
  },

  /* Build a full compilable C++ program from the user's function + a
     test harness that reads the given stdin and prints the result. */
  _cppHarness(cppQ, bodyCode) {
    const includes = `#include <bits/stdc++.h>
using namespace std;
`;
    return includes + bodyCode + '\n' + this._cppMainFor(cppQ);
  },

  _cppMainFor(cppQ) {
    const id = cppQ.id;
    switch (id) {
      case 'two-sum-cpp':
        return `int main(){
  int n, target; cin >> n >> target;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  auto r = twoSum(nums, target);
  cout << r[0] << " " << r[1];
  return 0;
}`;
      case 'valid-anagram-cpp':
        return `int main(){
  string s, t; getline(cin, s); getline(cin, t);
  cout << (isAnagram(s, t) ? "true" : "false");
  return 0;
}`;
      case 'missing-number-cpp':
        return `int main(){
  int n; cin >> n;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  cout << missingNumber(nums);
  return 0;
}`;
      case 'single-number-cpp':
        return `int main(){
  int n; cin >> n;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  cout << singleNumber(nums);
  return 0;
}`;
      case 'valid-palindrome-cpp':
        return `int main(){
  string s; getline(cin, s);
  cout << (isPalindrome(s) ? "true" : "false");
  return 0;
}`;
      case 'first-unique-char-cpp':
        return `int main(){
  string s; cin >> s;
  cout << firstUniqChar(s);
  return 0;
}`;
      case 'fizzbuzz-cpp':
        return `int main(){
  int n; cin >> n;
  auto r = fizzBuzz(n);
  for (size_t i=0;i<r.size();i++) cout << r[i] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case 'move-zeroes-cpp':
        return `int main(){
  int n; cin >> n;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  moveZeroes(nums);
  for (size_t i=0;i<nums.size();i++) cout << nums[i] << (i+1==nums.size()?"":" ");
  return 0;
}`;
      case 'container-most-water-cpp':
        return `int main(){
  int n; cin >> n;
  vector<int> h(n); for (int i=0;i<n;i++) cin >> h[i];
  cout << maxArea(h);
  return 0;
}`;
      case 'binary-search-cpp':
        return `int main(){
  int n, target; cin >> n >> target;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  cout << search(nums, target);
  return 0;
}`;
      case 'kth-largest-cpp':
        return `int main(){
  int n, k; cin >> n >> k;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  cout << findKthLargest(nums, k);
  return 0;
}`;
      case 'max-subarray-cpp':
        return `int main(){
  int n; cin >> n;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  cout << maxSubArray(nums);
  return 0;
}`;
      case 'climbing-stairs-cpp':
        return `int main(){
  int n; cin >> n;
  cout << climbStairs(n);
  return 0;
}`;
      case 'coin-change-cpp':
        return `int main(){
  int m, amount; cin >> m >> amount;
  vector<int> coins(m); for (int i=0;i<m;i++) cin >> coins[i];
  cout << coinChange(coins, amount);
  return 0;
}`;
      case 'valid-parentheses-cpp':
        return `int main(){
  string s; cin >> s;
  cout << (isValid(s) ? "true" : "false");
  return 0;
}`;
      case 'daily-temperatures-cpp':
        return `int main(){
  int n; cin >> n;
  vector<int> t(n); for (int i=0;i<n;i++) cin >> t[i];
  auto r = dailyTemperatures(t);
  for (size_t i=0;i<r.size();i++) cout << r[i] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case 'merge-intervals-cpp':
        return `int main(){
  int n; cin >> n;
  vector<vector<int>> itv(n, vector<int>(2));
  for (int i=0;i<n;i++) cin >> itv[i][0] >> itv[i][1];
  auto r = merge(itv);
  for (size_t i=0;i<r.size();i++) cout << r[i][0] << " " << r[i][1] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case 'jump-game-cpp':
        return `int main(){
  int n; cin >> n;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  cout << (canJump(nums) ? "true" : "false");
  return 0;
}`;
      case 'group-anagrams-cpp':
        return `int main(){
  int n; cin >> n; cin.ignore();
  vector<string> strs(n);
  for (int i=0;i<n;i++) getline(cin, strs[i]);
  auto r = groupAnagrams(strs);
  cout << r.size();
  return 0;
}`;
      case 'top-k-frequent-cpp':
        return `int main(){
  int n, k; cin >> n >> k;
  vector<int> nums(n); for (int i=0;i<n;i++) cin >> nums[i];
  auto r = topKFrequent(nums, k);
  for (size_t i=0;i<r.size();i++) cout << r[i] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case 'max-depth-tree-cpp':
        return `int main(){
  int n; if (!(cin >> n)) return 0;
  vector<int> a(n);
  for (int i=0;i<n;i++) cin >> a[i];
  vector<TreeNode*> v(n, nullptr);
  TreeNode* root = nullptr;
  for (int i=0;i<n;i++){ if(a[i]!=-1) v[i]=new TreeNode(a[i]); }
  for (int i=0;i<n;i++){
    if(!v[i]) continue;
    if(!root) root=v[i];
    if(2*i+1<n) v[i]->left=v[2*i+1];
    if(2*i+2<n) v[i]->right=v[2*i+2];
  }
  cout << maxDepth(root);
  return 0;
}`;
      case 'inorder-traversal-cpp':
        return `int main(){
  int n; if (!(cin >> n)) return 0;
  vector<int> a(n);
  for (int i=0;i<n;i++) cin >> a[i];
  if(n==0){ return 0; }
  vector<TreeNode*> v(n, nullptr);
  TreeNode* root=nullptr;
  for (int i=0;i<n;i++){ if(a[i]!=-1) v[i]=new TreeNode(a[i]); }
  for (int i=0;i<n;i++){
    if(!v[i]) continue;
    if(!root) root=v[i];
    if(2*i+1<n) v[i]->left=v[2*i+1];
    if(2*i+2<n) v[i]->right=v[2*i+2];
  }
  auto r = inorderTraversal(root);
  for (size_t i=0;i<r.size();i++) cout << r[i] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case 'number-of-islands-cpp':
        return `int main(){
  int R, C; cin >> R >> C;
  vector<vector<char>> g(R, vector<char>(C));
  for (int i=0;i<R;i++) for (int j=0;j<C;j++) cin >> g[i][j];
  cout << numIslands(g);
  return 0;
}`;
      case "reverse-string-cpp":
        return `int main(){
  string t; cin >> t;
  vector<char> s(t.begin(), t.end());
  reverseString(s);
  cout << string(s.begin(), s.end());
  return 0;
}`;
      case "best-time-stock-cpp":
        return `int main(){
  int n; cin >> n;
  vector<int> p(n); for (int i=0;i<n;i++) cin >> p[i];
  cout << maxProfit(p);
  return 0;
}`;
      case "contains-duplicate-cpp":
        return `int main(){
  int n; cin >> n;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  cout << (containsDuplicate(a) ? "true" : "false");
  return 0;
}`;
      case "merge-sorted-arrays-cpp":
        return `int main(){
  int n, m; cin >> n >> m;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  vector<int> b(m); for (int i=0;i<m;i++) cin >> b[i];
  auto r = mergeSorted(a, b);
  for (size_t i=0;i<r.size();i++) cout << r[i] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case "valid-palindrome-2-cpp":
        return `int main(){
  string s; cin >> s;
  cout << (validPalindrome(s) ? "true" : "false");
  return 0;
}`;
      case "two-sum-2-sorted-cpp":
        return `int main(){
  int n, target; cin >> n >> target;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  auto r = twoSumSorted(a, target);
  cout << r[0] << " " << r[1];
  return 0;
}`;
      case "longest-substr-no-repeat-cpp":
        return `int main(){
  string s; cin >> s;
  cout << lengthOfLongestSubstring(s);
  return 0;
}`;
      case "min-window-substring-cpp":
        return `int main(){
  string s, t; cin >> s >> t;
  cout << minWindow(s, t);
  return 0;
}`;
      case "longest-common-subseq-cpp":
        return `int main(){
  string a, b; cin >> a >> b;
  cout << longestCommonSubsequence(a, b);
  return 0;
}`;
      case "edit-distance-cpp":
        return `int main(){
  string a, b; getline(cin, a); getline(cin, b);
  cout << minDistance(a, b);
  return 0;
}`;
      case "intersection-two-arrays-cpp":
        return `int main(){
  int n, m; cin >> n >> m;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  vector<int> b(m); for (int i=0;i<m;i++) cin >> b[i];
  auto r = intersection(a, b);
  sort(r.begin(), r.end());
  for (size_t i=0;i<r.size();i++) cout << r[i] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case "isomorphic-strings-cpp":
        return `int main(){
  string s, t; cin >> s >> t;
  cout << (isIsomorphic(s, t) ? "true" : "false");
  return 0;
}`;
      case "sort-colors-cpp":
        return `int main(){
  int n; cin >> n;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  sortColors(a);
  for (size_t i=0;i<a.size();i++) cout << a[i] << (i+1==a.size()?"":" ");
  return 0;
}`;
      case "meeting-rooms-cpp":
        return `int main(){
  int n; cin >> n;
  vector<vector<int>> v(n, vector<int>(2));
  for (int i=0;i<n;i++) cin >> v[i][0] >> v[i][1];
  cout << (canAttendMeetings(v) ? "true" : "false");
  return 0;
}`;
      case "product-array-except-self-cpp":
        return `int main(){
  int n; cin >> n;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  auto r = productExceptSelf(a);
  for (size_t i=0;i<r.size();i++) cout << r[i] << (i+1==r.size()?"":" ");
  return 0;
}`;
      case "subarray-sum-equals-k-cpp":
        return `int main(){
  int n, k; cin >> n >> k;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  cout << subarraySum(a, k);
  return 0;
}`;
      case "longest-consecutive-sequence-cpp":
        return `int main(){
  int n; cin >> n;
  vector<int> a(n); for (int i=0;i<n;i++) cin >> a[i];
  cout << longestConsecutive(a);
  return 0;
}`;
      case "task-scheduler-cpp":
        return `int main(){
  string s; int n; cin >> s >> n;
  vector<char> t(s.begin(), s.end());
  cout << leastInterval(t, n);
  return 0;
}`;
      default:
        return `int main(){ cout << ""; return 0; }`;
    }
  },

  _nextSessionQuestion() {
    this.state.sessionIndex++;
    if (this.state.sessionIndex < this.state.session.length) {
      this._openQuestion(this.state.session[this.state.sessionIndex]);
    } else {
      this._renderSessionSummary();
    }
  },

  async _renderSessionSummary() {
    const ids = this.state.session;
    await this._hydrate(ids);
    const total = ids.length;
    const passed = ids.filter(id => this.state.sessionResults[id]).length;

    this.container.innerHTML = `
      <div class="mb-2 flex-between">
        <button class="btn btn-ghost btn-sm" id="backToListBtn"><- Back to Question Bank</button>
        <span class="chip blue">Session Complete</span>
      </div>
      <div class="card text-center mb-2" style="padding:36px">
        <div style="font-size:48px;margin-bottom:8px">${passed === total ? '🎉' : passed >= total / 2 ? '💪' : '📚'}</div>
        <h2 style="font-size:24px;margin-bottom:6px">Practice Session Complete</h2>
        <div class="card-stat" style="font-size:42px">${passed}/${total}</div>
        <div class="text-dim mb-2">questions solved</div>
        <div class="progress mb-3" style="max-width:320px;margin:0 auto"><div class="progress-fill green" style="width:${total ? (passed / total) * 100 : 0}%"></div></div>
        <p class="text-dim" style="font-size:13.5px">${passed === total ? 'Perfect session — every question solved!' : 'Keep practicing. Revisit the ones you missed to lock in the patterns.'}</p>
      </div>
      <div class="card">
        <div class="card-title">Session Review</div>
        <div class="card-sub">Tap any question to open it again</div>
        ${ids.map((id, i) => {
          const q = this._meta[id];
          if (!q) return '';
          const ok = this.state.sessionResults[id];
          return `
            <div class="section-check hoverable" style="cursor:pointer" data-reopen="${id}">
              <div class="check-icon ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'}</div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13.5px">${i + 1}. ${this._escapeHtml(q.title)}</div>
                <div class="text-dim" style="font-size:12px">${this._escapeHtml(q.source || 'PlacementPrep')} · ${this._escapeHtml(q.difficulty)} · ${this._escapeHtml(q.topic || '')}</div>
              </div>
              <span class="chip ${ok ? 'green' : 'red'}">${ok ? '[OK] Solved' : 'Attempted'}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById('backToListBtn').addEventListener('click', () => {
      this.state.sessionActive = false;
      this.state.session = [];
      this._renderList();
    });
    document.querySelectorAll('[data-reopen]').forEach(el => {
      el.addEventListener('click', () => this._openQuestion(el.dataset.reopen));
    });
  },

  /* Runs one test expression against the user's code. In a browser it happens inside a Web Worker that is
     terminated after `timeoutMs`, so an infinite loop cannot freeze the page. Where Workers are not available
     (older browsers, the test environment) it falls back to running on the main thread. */
  _sandboxRun(code, input, timeoutMs = 2500) {
    const prelude = this.state.prelude || '';
    const direct = () => {
      try {
        const value = new Function(prelude + '\n' + code + '\nreturn (' + input + ');')();
        return { ok: true, json: JSON.stringify(value) };
      } catch (e) {
        return { ok: false, error: String((e && e.message) || e) };
      }
    };
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || !window.URL || !URL.createObjectURL) return Promise.resolve(direct());
    return new Promise((resolve) => {
      let worker;
      let url;
      try {
        const src = 'self.onmessage = (e) => { const d = e.data; try { const v = new Function(d.prelude + "\\n" + d.code + "\\nreturn (" + d.input + ");")(); self.postMessage({ ok: true, json: JSON.stringify(v) }); } catch (err) { self.postMessage({ ok: false, error: String((err && err.message) || err) }); } };';
        url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        worker = new Worker(url);
      } catch {
        resolve(direct());
        return;
      }
      const finish = (result) => { clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url); resolve(result); };
      const timer = setTimeout(() => finish({ ok: false, error: `Time limit exceeded (${timeoutMs / 1000} s). Look for an infinite loop, or a slower approach than the input size allows.` }), timeoutMs);
      worker.onmessage = (e) => finish(e.data);
      worker.onerror = (e) => finish({ ok: false, error: String(e.message || 'Script error') });
      worker.postMessage({ prelude, code, input });
    });
  },

  async _runTests() {
    const q = this.state.current;
    const resultsDiv = document.getElementById('testResults');
    const code = document.getElementById('codeEditor').value || this.state.code;
    const runBtn = document.getElementById('runBtn');
    if (this._running) return;
    this._running = true;
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = 'Running…'; }

    const results = [];
    try {
      let timedOut = false;
      for (const tc of q.testCases) {
        if (timedOut) {
          // One timeout is enough: do not make the user wait for the same infinite loop again.
          results.push({ input: tc.input, expected: tc.expected, actual: 'Not run (stopped after the first timeout)', pass: false });
          continue;
        }
        const r = await this._sandboxRun(code, tc.input);
        timedOut = !r.ok && /^Time limit exceeded/.test(r.error);
        const expectedJson = JSON.stringify(this._parseExpected(tc.expected));
        results.push({
          input: tc.input,
          expected: tc.expected,
          actual: r.ok ? String(r.json) : 'Error: ' + r.error,
          pass: r.ok && r.json === expectedJson
        });
      }
    } finally {
      this._running = false;
      if (runBtn) { runBtn.disabled = false; runBtn.textContent = ' Run Tests'; }
    }
    if (this.state.current !== q) return; // the user moved to another question while this ran

    this.state.results = results;
    const passCount = results.filter(r => r.pass).length;
    const allPass = passCount === results.length;

    this._recordProgress(q, passCount, results.length, allPass);

    if (this.state.sessionActive && this.state.session.includes(q.id)) {
      this.state.sessionResults[q.id] = allPass;
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.style.display = 'inline-flex';
    }

    resultsDiv.innerHTML = `
      <div class="mb-2">
        <div class="card stat-card" style="padding:14px">
          <div class="card-stat ${allPass ? 'text-success' : ''}">${passCount}/${results.length}</div>
          <div class="card-stat-label">Tests Passed</div>
        </div>
      </div>
      ${results.map((r, i) => `
        <div class="test-case ${r.pass ? 'pass' : 'fail'}">
          <div class="test-title">
            <span>Test ${i + 1}</span>
            <span class="${r.pass ? 'text-success' : 'text-danger'}">${r.pass ? '[OK] PASS' : '[X] FAIL'}</span>
          </div>
          <div class="test-io">
            <div>Input: <code>${this._escapeHtml(r.input)}</code></div>
            <div>Expected: <code>${this._escapeHtml(r.expected)}</code></div>
            <div>Your Output: <code>${this._escapeHtml(r.actual)}</code></div>
          </div>
        </div>
      `).join('')}
    `;
  },

  _parseExpected(str) {
    try { return JSON.parse(str); } catch { return str; }
  },

  _escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};
