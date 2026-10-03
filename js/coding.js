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
    lang: 'JavaScript', // a Wandbox language name; JavaScript runs in the browser
    compiler: 'browser', // 'browser' or a Wandbox compiler name
    langError: '',
    filters: { difficulty: 'all', role: 'all', topic: 'all', status: 'all', search: '', count: 10, limit: 30 },
    session: [],
    sessionIndex: 0,
    sessionActive: false,
    sessionResults: {},
    tab: null        // activity section tab: 'solved' | 'attempted' (null = automatic)
  },
  _drafts: {},       // code typed so far, by 'questionId|language'
  _langs: null,      // languages from Wandbox (plus JavaScript in the browser)
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

  /** Full question by id, cached. */
  async _fetchQuestion(id) {
    if (this._cache[id]) return this._cache[id];
    const data = await this._api(new URLSearchParams({ id }));
    this._cache[id] = data.question;
    this._meta[id] = data.question;
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
    // Real full screen (the whole monitor), like the live interview. It must start from the click, so only when
    // the learner asked for it (not when a question re-renders while focus mode is already on).
    const root = document.documentElement;
    if (on && !quiet && root.requestFullscreen && !document.fullscreenElement) {
      this._fsByFocus = true;
      Promise.resolve(root.requestFullscreen()).catch(() => { this._fsByFocus = false; }); // refused: the big layout still works
    } else if (!on && this._fsByFocus && document.fullscreenElement && document.exitFullscreen) {
      this._fsByFocus = false;
      Promise.resolve(document.exitFullscreen()).catch(() => {});
    } else if (!on) {
      this._fsByFocus = false;
    }
    if (!this._fsListener) {
      // The browser's own Esc leaves full screen without a key event for the page: leave focus mode with it.
      this._fsListener = () => {
        if (!document.fullscreenElement && this._fsByFocus && document.body.classList.contains('coding-focus')) {
          this._fsByFocus = false;
          this._setFocus(false, true);
        }
      };
      document.addEventListener('fullscreenchange', this._fsListener);
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
          <div class="card mt-3" id="progressTeaser">${this._teaserHtml()}</div>
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
    document.getElementById('openProgressBtn').addEventListener('click', () => this._renderProgress());
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

  /* ---------------------------------------------------------------- My Progress */

  /** Verdict for one run, from what actually happened in it. */
  _verdict(results) {
    if (results.length && results.every((r) => r.pass)) return 'Accepted';
    if (results.some((r) => r.kind === 'compile')) return 'Compile Error';
    if (results.some((r) => r.kind === 'timeout')) return 'Time Limit Exceeded';
    if (results.some((r) => r.kind === 'runtime')) return 'Runtime Error';
    return 'Wrong Answer';
  },

  _submissions() {
    const prog = Auth.getEmail() ? DB.getProgress(Auth.getEmail()) : null;
    return ((prog && prog.coding && prog.coding.submissions) || []).slice().sort((a, b) => b.at - a.at);
  },

  _renderProgress() {
    const esc = (v) => this._escapeHtml(v);
    const subs = this._submissions();
    const all = this._attempts();
    const solved = all.filter((a) => a.solved);
    const accepted = subs.filter((s) => s.verdict === 'Accepted').length;
    const filter = this.state.subFilter || 'all';
    const shown = subs.filter((s) => filter === 'all' || (filter === 'accepted' ? s.verdict === 'Accepted' : s.verdict !== 'Accepted'));
    const diff = (d) => solved.filter((a) => (a.difficulty || (this._meta[a.id] || {}).difficulty) === d).length;
    this.container.innerHTML = `
      <div class="mb-2 flex-between"><button class="btn btn-ghost btn-sm" id="progBack"><i class="bi bi-arrow-left"></i> Back to Problems</button></div>
      <h2 class="mb-2" style="font-size:22px">My Progress</h2>
      <div class="grid grid-4 mb-2" id="progStats">
        <div class="card stat-card"><div class="card-stat">${solved.length}</div><div class="card-stat-label">Solved</div></div>
        <div class="card stat-card"><div class="card-stat">${all.filter((a) => !a.solved).length}</div><div class="card-stat-label">Attempted, not solved</div></div>
        <div class="card stat-card"><div class="card-stat">${subs.length}</div><div class="card-stat-label">Submissions</div></div>
        <div class="card stat-card"><div class="card-stat">${subs.length ? Math.round((accepted / subs.length) * 100) + '%' : '–'}</div><div class="card-stat-label">Accepted</div></div>
      </div>
      <p class="text-dim mb-2" style="font-size:12.5px">Solved by level: Easy ${diff('Easy')} · Medium ${diff('Medium')} · Hard ${diff('Hard')}. Everything here was recorded from your own runs on this device.</p>
      <div class="card mb-2" id="activityCard">${this._activityHtml()}</div>
      <div class="card" id="historyCard">
        <div class="card-title">Submission history</div>
        <div class="card-sub">Every time you pressed Run Tests, newest first. Run time is measured in your browser.</div>
        <div class="cx-tabs" role="tablist" aria-label="History filter">
          ${[['all', 'All'], ['accepted', 'Accepted'], ['failed', 'Not accepted']].map(([k, l]) => `<button type="button" class="cx-tab ${filter === k ? 'active' : ''}" role="tab" aria-selected="${filter === k}" data-sub-filter="${k}">${l}</button>`).join('')}
        </div>
        <div class="act-list">
          ${shown.slice(0, 100).map((s) => `
            <button type="button" class="act-row" data-sub-open="${esc(s.id)}">
              <span class="act-main"><b>${esc(s.title || s.id)}</b><span class="text-dim">${esc([s.lang === 'cpp' ? 'C++' : s.lang === 'javascript' ? 'JavaScript' : s.lang, s.passed + '/' + s.total + ' tests', s.ms != null ? s.ms + ' ms' : ''].filter(Boolean).join(' · '))}</span></span>
              <span class="act-detail ${s.verdict === 'Accepted' ? 'cx-ok-t' : ''}">${esc(s.verdict)} · ${esc(this._ago(s.at))}</span>
            </button>`).join('') || '<p class="text-dim" style="font-size:13px">No submissions yet. Run tests on a problem and each run is listed here.</p>'}
        </div>
      </div>`;
    document.getElementById('progBack').addEventListener('click', () => this._renderList());
    document.querySelectorAll('[data-sub-filter]').forEach((b) => b.addEventListener('click', () => { this.state.subFilter = b.dataset.subFilter; this._renderProgress(); }));
    document.querySelectorAll('[data-sub-open]').forEach((b) => b.addEventListener('click', () => this._openQuestion(b.dataset.subOpen)));
    this._bindActivity();
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
          <span class="act-main"><b>${esc(title)}</b><span class="text-dim">${esc([diff, topic, a.lang === 'cpp' ? 'C++' : (a.lang && a.lang !== 'javascript' ? a.lang : '')].filter(Boolean).join(' · '))}</span></span>
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

  /** Writes code into the editor (CodeMirror when loaded, always mirrored in the textarea). */
  _setCode(code) {
    const ta = document.getElementById('codeEditor');
    if (ta) ta.value = code;
    this.state.code = code;
    if (this._editor) this._editor.setValue(code);
  },

  /** Upgrades the textarea to CodeMirror in the background. The textarea keeps working if that fails. */
  _mountEditor() {
    if (this._editor) { this._editor.destroy(); this._editor = null; }
    const ta = document.getElementById('codeEditor');
    if (!ta || typeof CodeEditor === 'undefined') return;
    const q = this.state.current;
    CodeEditor.mount(ta, { language: this._highlightName(this.state.lang), onChange: (v) => { this.state.code = v; } }).then((h) => {
      if (this.state.current !== q || !ta.isConnected) { h.destroy(); return; }
      this._editor = h;
    });
  },

  _teaserHtml() {
    const all = this._attempts();
    const solved = all.filter((a) => a.solved).length;
    return `<div class="card-title">My Progress</div>
      <div class="card-sub"><b>${solved}</b> solved · <b>${all.length - solved}</b> attempted, not solved · <b>${this._submissions().length}</b> submissions</div>
      <button type="button" class="btn btn-primary btn-sm mt-1" id="openProgressBtn">Open My Progress</button>`;
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
  _recordProgress(q, passed, total, allPass, run = {}) {
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
    coding.submissions = [...(coding.submissions || []), {
      id: q.id, title: q.title, at: now, passed, total, lang: this.state.lang, compiler: run.compiler || '',
      verdict: run.verdict || (allPass ? 'Accepted' : 'Wrong Answer'),
      ms: Number.isFinite(run.ms) ? run.ms : null
    }].slice(-200);
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

  /* ---------------------------------------------------------------- languages */

  /** The language the learner used last. Older builds stored 'javascript' or 'cpp'. */
  _savedLang() {
    let v = '';
    try { v = localStorage.getItem('pp_code_lang') || ''; } catch {}
    if (v === 'javascript') return 'JavaScript';
    if (v === 'cpp') return 'C++';
    return v;
  },

  _savedCompiler(language) {
    try { return localStorage.getItem('pp_code_compiler_' + language) || ''; } catch { return ''; }
  },

  _saveLang(language, compiler) {
    try {
      localStorage.setItem('pp_code_lang', language);
      localStorage.setItem('pp_code_compiler_' + language, compiler);
    } catch { /* private mode: lasts for this visit only */ }
  },

  /** Languages and compilers from Wandbox's live list, plus JavaScript running in the browser. Never rejects. */
  async _loadLanguages(force) {
    if (this._langs && !force) return this._langs;
    this.state.langError = '';
    let langs = [];
    try {
      langs = Wandbox.languages(await Wandbox.compilers(force));
    } catch (e) {
      this.state.langError = e.message || 'Could not load the language list.';
    }
    const node = langs.find((l) => l.language === 'JavaScript');
    const browser = { name: 'browser', version: '', display: 'Browser (instant, no network)', head: false };
    const js = { language: 'JavaScript', compilers: [browser, ...(node ? node.compilers : [])], default: 'browser' };
    this._langs = [js, ...langs.filter((l) => l.language !== 'JavaScript')];
    return this._langs;
  },

  /** Name CodeMirror knows the language by. */
  _highlightName(language) {
    const n = String(language || '').toLowerCase();
    return n === 'bash script' ? 'bash' : n;
  },

  _langEntry(language) {
    return (this._langs || []).find((l) => l.language === language) || null;
  },

  /** Fills the language and compiler selects from this._langs and selects the current choice. */
  _paintLangControls() {
    const sel = document.getElementById('langSelect');
    const comp = document.getElementById('compilerSelect');
    if (!sel || !comp) return;
    const langs = this._langs || [];
    sel.innerHTML = langs.map((l) => `<option value="${this._escapeHtml(l.language)}">${this._escapeHtml(l.language)}</option>`).join('');
    sel.value = this.state.lang;
    const entry = this._langEntry(this.state.lang);
    comp.innerHTML = (entry ? entry.compilers : []).map((c) => {
      const label = c.name === 'browser' ? c.display : `${c.display || c.name}${c.head ? ' (development build)' : ''}`;
      return `<option value="${this._escapeHtml(c.name)}">${this._escapeHtml(label)}</option>`;
    }).join('');
    comp.value = this.state.compiler;
    const note = document.getElementById('langNote');
    if (note) {
      note.innerHTML = this.state.langError
        ? `${this._escapeHtml(this.state.langError)} Only JavaScript (in the browser) is available. <button type="button" class="btn btn-ghost btn-sm" id="langRetryBtn">Retry</button>`
        : this.state.compiler === 'browser' ? 'Runs instantly in your browser.' : 'Runs on Wandbox (online), so each run needs a network connection.';
      document.getElementById('langRetryBtn')?.addEventListener('click', async () => {
        note.textContent = 'Loading languages…';
        await this._loadLanguages(true);
        this._paintLangControls();
      });
    }
  },

  /** Switches language: keeps what was typed in the old one, and starts the new one from its template. */
  _selectLanguage(language, compiler) {
    const q = this.state.current;
    const entry = this._langEntry(language);
    if (!q || !entry) return;
    this._drafts[`${q.id}|${this.state.lang}`] = this._getCode();
    const wanted = compiler || this._savedCompiler(language);
    const compilerName = entry.compilers.some((c) => c.name === wanted) ? wanted : entry.default;
    this.state.lang = language;
    this.state.compiler = compilerName;
    this._saveLang(language, compilerName);
    const draft = this._drafts[`${q.id}|${language}`];
    const skeleton = Skeletons.for(language);
    this._setCode(draft != null ? draft : skeleton.code);
    const file = document.getElementById('codeFileLabel');
    if (file) file.textContent = `solution.${skeleton.ext}`;
    if (this._editor) this._editor.setLanguage(this._highlightName(language));
    this._paintLangControls();
  },

  _getCode() {
    const ta = document.getElementById('codeEditor');
    return this._editor ? this._editor.getValue() : (ta ? ta.value : this.state.code);
  },

  /* ---------------------------------------------------------------- one question */

  /** `code` spans in the generated Input / Output text. */
  _fmt(text) {
    return this._escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
  },

  _ioHtml(q) {
    const io = q.io;
    if (!io || !Array.isArray(io.inputFormat)) return '';
    const sample = (q.testCases || [])[0];
    return `
      <div class="io-spec" id="ioSpec">
        <div class="io-title">Input</div>
        <p class="io-note">Your program reads standard input and prints to standard output. Wherever the statement says "return", print instead.</p>
        <ul class="io-list">${io.inputFormat.map((l) => `<li>${this._fmt(l)}</li>`).join('')}</ul>
        <div class="io-title">Output</div>
        <p class="io-note">${this._fmt(io.outputFormat || '')}</p>
        ${sample ? `<div class="io-title">Example</div>
        <div class="io-example"><div><span class="io-label">Input</span><pre>${this._escapeHtml(sample.stdin)}</pre></div>
        <div><span class="io-label">${io.check ? 'One valid output' : 'Output'}</span><pre>${this._escapeHtml(sample.expectedStdout)}</pre></div></div>` : ''}
      </div>`;
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
    this.state.results = [];
    const langs = await this._loadLanguages();
    if (this.state.current !== q) return; // the learner opened another problem while the languages loaded

    // Language: what they used last when it still exists, else JavaScript in the browser.
    const saved = this._savedLang();
    const first = langs.find((l) => l.language === saved) || langs[0];
    const savedCompiler = this._savedCompiler(first.language);
    this.state.lang = first.language;
    this.state.compiler = first.compilers.some((c) => c.name === savedCompiler) ? savedCompiler : first.default;
    const skeleton = Skeletons.for(this.state.lang);
    const draft = this._drafts[`${q.id}|${this.state.lang}`];
    this.state.code = draft != null ? draft : skeleton.code;

    const inSession = this.state.sessionActive && this.state.session.includes(q.id);
    const sessionPos = inSession ? this.state.session.indexOf(q.id) : -1;
    const sessionTotal = this.state.session.length;
    const src = q.source || 'LeetCode';

    // The learner caused this render (a click that waited for the network): show it as it is, no entrance replay.
    if (typeof Animations !== 'undefined') Animations._lastInteraction = performance.now();
    this.container.innerHTML = `
      <div class="mb-2 flex-between" style="flex-wrap:wrap;gap:10px">
        <button class="btn btn-ghost btn-sm" id="backBtn"><i class="bi bi-arrow-left"></i> ${inSession ? 'Session' : 'Back to Problems'}</button>
        <div class="flex gap-1 items-center">
          ${inSession ? `<span class="chip blue">Session ${sessionPos + 1}/${sessionTotal}</span>` : ''}
          <button class="btn btn-ghost btn-sm" id="focusBtn" aria-pressed="false" title="Hide the sidebar and top bar (Esc to exit)"><i class="bi bi-arrows-fullscreen"></i> Focus mode</button>
        </div>
      </div>
      ${inSession ? this._paletteHtml(q.id) : ''}
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
          ${this._ioHtml(q)}
          <div class="lang-row mb-2">
            <label for="langSelect" class="text-dim" style="font-size:12.5px">Language</label>
            <select id="langSelect" aria-label="Programming language"></select>
            <select id="compilerSelect" aria-label="Compiler or runtime version"></select>
            <span class="text-dim" id="langNote" style="font-size:12px" role="status"></span>
          </div>
          <div class="code-wrap">
            <div class="code-header">
              <div class="code-dots"><span></span><span></span><span></span></div>
              <span class="code-file" id="codeFileLabel">solution.${skeleton.ext}</span>
            </div>
            <textarea class="code-input" id="codeEditor" spellcheck="false" aria-label="Code editor. Press Tab to indent, Escape then Tab to leave.">${this._escapeHtml(this.state.code)}</textarea>
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
          <div class="card-sub">Your program runs on every test; its output is compared with the expected answer</div>
          <div id="solutionPanel" style="display:none">
            <p class="text-dim" style="font-size:12.5px">The code below is the core algorithm as a JavaScript function. Your program also has to read the input and print the answer in the format described on the left.</p>
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

    this._bindPalette();
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
    document.getElementById('runBtn').addEventListener('click', () => this._runTests());
    document.getElementById('resetCodeBtn').addEventListener('click', () => {
      this._drafts[`${q.id}|${this.state.lang}`] = undefined;
      this._setCode(Skeletons.for(this.state.lang).code);
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
    document.getElementById('langSelect').addEventListener('change', (e) => this._selectLanguage(e.target.value));
    document.getElementById('compilerSelect').addEventListener('change', (e) => {
      this.state.compiler = e.target.value;
      this._saveLang(this.state.lang, this.state.compiler);
      this._paintLangControls();
    });

    this._paintLangControls();
    this._mountEditor();

    if (inSession) {
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.addEventListener('click', () => this._nextSessionQuestion());
    }
  },

  /* ---------------------------------------------------------------- running and judging */

  /** One test: run the program, then judge its stdout. -> { kind, pass, stdout, stderr, message, ms, actual } */
  async _runOne(q, test, code) {
    const r = this.state.compiler === 'browser'
      ? await JsRunner.run(code, test.stdin, 3000).then((x) => ({ kind: x.kind, stdout: x.stdout, stderr: x.stderr, message: x.error, ms: x.ms }))
      : await Wandbox.run({ compiler: this.state.compiler, code, stdin: test.stdin });
    const out = { kind: r.kind, pass: false, stdout: r.stdout || '', stderr: r.stderr || '', message: r.message || '', ms: r.ms || 0 };
    if (r.kind !== 'ok') return out;
    try {
      const expected = Judge.decodeOutput(q.io.out, test.expectedStdout);
      const inputs = q.io.script ? [] : Judge.decodeInput(q.io.in.map((a) => a.type), test.stdin);
      const res = Judge.compare(q.io, expected, r.stdout, inputs);
      out.pass = res.pass;
      out.kind = res.pass ? 'ok' : 'wrong';
      if (res.message) out.message = res.message;
    } catch (e) {
      out.kind = 'wrong';
      out.message = `This test could not be checked: ${e.message}`;
    }
    return out;
  },

  _testCardHtml(q, t, r, i) {
    const esc = (v) => this._escapeHtml(v);
    const label = { ok: 'PASS', wrong: 'WRONG ANSWER', runtime: 'RUNTIME ERROR', timeout: 'TIME LIMIT', compile: 'COMPILE ERROR', skipped: 'NOT RUN', network: 'NO ANSWER' }[r.kind] || 'FAIL';
    return `
      <div class="test-case ${r.pass ? 'pass' : 'fail'}">
        <div class="test-title">
          <span>Test ${i + 1}</span>
          <span class="${r.pass ? 'text-success' : 'text-danger'}">${label}${r.ms ? ` · ${r.ms} ms` : ''}</span>
        </div>
        <div class="test-io">
          <div>Input:<pre class="io-pre">${esc(t.stdin)}</pre></div>
          <div>${q.io.check ? 'One valid output' : 'Expected'}:<pre class="io-pre">${esc(t.expectedStdout)}</pre></div>
          ${r.kind === 'skipped' ? '' : `<div>Your output:<pre class="io-pre">${esc(r.stdout)}</pre></div>`}
          ${r.message ? `<div class="io-msg">${esc(r.message)}</div>` : ''}
          ${r.stderr ? `<div>Error output:<pre class="io-pre">${esc(r.stderr)}</pre></div>` : ''}
        </div>
      </div>`;
  },

  async _runTests() {
    const q = this.state.current;
    const resultsDiv = document.getElementById('testResults');
    const code = this._getCode();
    const runBtn = document.getElementById('runBtn');
    if (this._running) return;
    if (!code.trim()) { App.showToast('Write some code first', 'error'); return; }
    const tests = q.testCases || [];
    if (!q.io || !tests.length || !tests.every((t) => typeof t.stdin === 'string' && typeof t.expectedStdout === 'string')) {
      resultsDiv.innerHTML = '<div class="card test-case fail"><div class="test-title"><span>Cannot run</span></div><div class="test-io">This question has no stdin/stdout tests, so it cannot be judged here.</div></div>';
      return;
    }
    const lang = this.state.lang;
    const compiler = this.state.compiler;
    this._running = true;
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = 'Running…'; }
    resultsDiv.innerHTML = `<div class="empty-state"><div class="spinner"></div><h3>Running ${tests.length} tests…</h3><p id="runProgress" role="status">${compiler === 'browser' ? 'In your browser' : 'On Wandbox'}</p></div>`;

    const results = new Array(tests.length).fill(null);
    let stop = null;      // a result that ends the whole run (compile error, no answer, time limit)
    let next = 0;
    let finished = 0;
    const worker = async () => {
      while (!stop && next < tests.length) {
        const i = next++;
        const r = await this._runOne(q, tests[i], code);
        results[i] = r;
        finished++;
        const note = document.getElementById('runProgress');
        if (note) note.textContent = `${finished} of ${tests.length} done`;
        if (r.kind === 'compile' || r.kind === 'network' || r.kind === 'timeout') stop = stop || r;
      }
    };
    try {
      await Promise.all(Array.from({ length: compiler === 'browser' ? 1 : 2 }, worker));
    } finally {
      this._running = false;
      if (runBtn) { runBtn.disabled = false; runBtn.textContent = ' Run Tests'; }
    }
    if (this.state.current !== q) return; // the learner moved to another question while this ran

    const reasons = { compile: 'Stopped after the compile error.', timeout: 'Stopped after the first time limit.', network: 'Stopped: the compiler service did not answer.' };
    results.forEach((r, i) => { if (!r) results[i] = { kind: 'skipped', pass: false, stdout: '', stderr: '', message: reasons[stop && stop.kind] || 'Not run.', ms: 0 }; });
    this.state.results = results;

    const passCount = results.filter((r) => r.pass).length;
    const noAnswer = results.some((r) => r.kind === 'network');
    const verdict = noAnswer ? 'No answer from the compiler service' : this._verdict(results);
    const allPass = !noAnswer && passCount === results.length;
    const ms = Math.round(results.reduce((t, r) => t + (r.pass || r.kind === 'wrong' ? r.ms : 0), 0));

    // A run that never got an answer says nothing about the program, so it is not recorded as a submission.
    if (!noAnswer) this._recordProgress(q, passCount, results.length, allPass, { verdict, ms, compiler });

    if (this.state.sessionActive && this.state.session.includes(q.id)) {
      if (!noAnswer) this.state.sessionResults[q.id] = allPass || this.state.sessionResults[q.id] === true;
      this._refreshPalette(q.id);
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.style.display = 'inline-flex';
    }

    // The learner caused this render (a click that waited for the network): show it as it is, no entrance replay.
    if (typeof Animations !== 'undefined') Animations._lastInteraction = performance.now();
    const compileErr = results.find((r) => r.kind === 'compile');
    const netErr = results.find((r) => r.kind === 'network');
    const timeLabel = compiler === 'browser' ? `${ms} ms measured in your browser` : `${ms} ms including the trip to Wandbox`;
    resultsDiv.innerHTML = `
      <div class="mb-2">
        <div class="card stat-card" style="padding:14px">
          <div class="verdict ${allPass ? 'ok' : 'bad'}" id="verdict" role="status">${this._escapeHtml(verdict)}</div>
          <div class="card-stat ${allPass ? 'text-success' : ''}">${passCount}/${results.length}</div>
          <div class="card-stat-label">Tests passed${noAnswer ? '' : ` · ${timeLabel}`} · ${this._escapeHtml(lang)}</div>
        </div>
      </div>
      ${netErr ? `<div class="test-case fail" id="runError"><div class="test-title"><span>Could not reach the compiler service</span></div><div class="test-io io-msg">${this._escapeHtml(netErr.message)} Nothing was recorded for this run. <button type="button" class="btn btn-ghost btn-sm" id="retryRunBtn">Try again</button></div></div>` : ''}
      ${compileErr ? `<div class="test-case fail" id="compileError"><div class="test-title"><span>Compile error</span></div><div class="test-io"><pre class="io-pre">${this._escapeHtml(compileErr.message)}</pre></div></div>` : ''}
      ${results.map((r, i) => (r.kind === 'compile' ? '' : this._testCardHtml(q, tests[i], r, i))).join('')}
    `;
    document.getElementById('retryRunBtn')?.addEventListener('click', () => this._runTests());
  },

  /** 'solved' | 'attempted' | 'todo', read straight from state.sessionResults (the single source of truth). */
  _sessionState(id) {
    const r = this.state.sessionResults[id];
    return r === true ? 'solved' : r === false ? 'attempted' : 'todo';
  },

  _paletteHtml(currentId) {
    const label = { solved: 'solved', attempted: 'attempted, not solved', todo: 'not attempted' };
    const done = this.state.session.filter((id) => id in this.state.sessionResults).length;
    return `<nav class="qpal mb-2" id="qPalette" aria-label="Session questions">
      ${this.state.session.map((id, i) => {
        const st = this._sessionState(id);
        const cur = id === currentId;
        return `<button type="button" class="qpal-btn ${st}${cur ? ' current' : ''}" data-pal="${i}" aria-label="Question ${i + 1}, ${label[st]}${cur ? ', current' : ''}"${cur ? ' aria-current="true"' : ''}>${i + 1}</button>`;
      }).join('')}
      <span class="text-dim" style="font-size:12px;margin-left:6px" id="qPalCount">${done}/${this.state.session.length} attempted</span>
      ${done === this.state.session.length ? '<button type="button" class="btn btn-sm btn-primary" id="qPalSummary">See session summary</button>' : ''}
    </nav>`;
  },

  _bindPalette() {
    const nav = document.getElementById('qPalette');
    if (!nav) return;
    nav.querySelectorAll('[data-pal]').forEach((b) => b.addEventListener('click', () => this._jumpTo(Number(b.dataset.pal))));
    const sum = document.getElementById('qPalSummary');
    if (sum) sum.addEventListener('click', () => this._renderSessionSummary());
  },

  _refreshPalette(currentId) {
    const nav = document.getElementById('qPalette');
    if (!nav) return;
    nav.outerHTML = this._paletteHtml(currentId);
    this._bindPalette();
  },

  _jumpTo(index) {
    if (!this.state.session[index]) return;
    this.state.sessionIndex = index;
    this._openQuestion(this.state.session[index]);
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
    const passed = ids.filter((id) => this._sessionState(id) === 'solved').length;
    const failed = ids.filter((id) => this._sessionState(id) === 'attempted').length;
    const skipped = total - passed - failed;
    const groups = [
      ['solved', 'Solved', 'green', '✓'],
      ['attempted', 'Attempted, not solved', 'red', '✗'],
      ['todo', 'Skipped', 'blue', '–']
    ];

    this.container.innerHTML = `
      <div class="mb-2 flex-between">
        <button class="btn btn-ghost btn-sm" id="backToListBtn">Back to Question Bank</button>
        <span class="chip blue">Session summary</span>
      </div>
      <div class="card text-center mb-2" style="padding:28px">
        <h2 style="font-size:24px;margin-bottom:6px">Practice session</h2>
        <div class="card-stat" style="font-size:42px">${passed}/${total}</div>
        <div class="text-dim mb-2">questions solved</div>
        <div class="progress mb-2" style="max-width:320px;margin:0 auto"><div class="progress-fill green" style="width:${total ? (passed / total) * 100 : 0}%"></div></div>
        <p class="text-dim" style="font-size:13.5px"><b>${passed}</b> solved · <b>${failed}</b> attempted, not solved · <b>${skipped}</b> skipped</p>
      </div>
      ${groups.map(([key, title, color, mark]) => {
        const list = ids.filter((id) => this._sessionState(id) === key);
        return `<div class="card mb-2" data-sum-group="${key}">
          <div class="card-title">${title} (${list.length})</div>
          <div class="card-sub">Tap a question to open it again</div>
          ${list.length ? list.map((id) => {
            const q = this._meta[id] || { title: id };
            const i = ids.indexOf(id);
            return `<div class="section-check hoverable" style="cursor:pointer" role="button" tabindex="0" data-reopen="${i}">
              <div class="check-icon ${key === 'solved' ? 'ok' : 'no'}">${mark}</div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13.5px">${i + 1}. ${this._escapeHtml(q.title)}</div>
                <div class="text-dim" style="font-size:12px">${this._escapeHtml(q.source || 'PlacementPrep')} · ${this._escapeHtml(q.difficulty || '')} · ${this._escapeHtml(q.topic || '')}</div>
              </div>
              <span class="chip ${color}">${title}</span>
            </div>`;
          }).join('') : '<div class="text-dim" style="font-size:13px">None</div>'}
        </div>`;
      }).join('')}
    `;

    document.getElementById('backToListBtn').addEventListener('click', () => {
      this.state.sessionActive = false;
      this.state.session = [];
      this._renderList();
    });
    document.querySelectorAll('[data-reopen]').forEach((el) => {
      el.addEventListener('click', () => this._jumpTo(Number(el.dataset.reopen)));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._jumpTo(Number(el.dataset.reopen)); } });
    });
  },

  _escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
};
