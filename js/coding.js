/* ============ Coding Sandbox Module ============
   LeetCode + HackerRank style practice with rich filters:
     - Difficulty filter (Easy / Medium / Hard)
     - Source filter (LeetCode / HackerRank / Both)
     - Target role filter (SDE / Data Analyst / ... )
     - Number of questions selector -> generates a practice session
   Keeps the existing in-browser editor + instant test runner.
   =============================================== */
const Coding = {
  state: {
    questions: [],
    current: null,
    code: '',
    results: [],
    filters: { difficulty: 'all', source: 'both', role: 'all', count: 10 },
    session: [],
    sessionIndex: 0,
    sessionActive: false,
    sessionResults: {}
  },

render(container) {
    this.container = container;
    const base = Array.isArray(FALLBACK_CODING) ? FALLBACK_CODING : [];
    const extra = (typeof EXTRA_CODING !== 'undefined' && Array.isArray(EXTRA_CODING)) ? EXTRA_CODING : [];
    this.state.questions = [...base, ...extra];
    this.state.current = null;
    this.state.session = [];
    this.state.sessionIndex = 0;
    this.state.sessionActive = false;
    this.state.sessionResults = {};
    this._renderList();
    // Try to enrich the bank with live online questions (best-effort).
    this._fetchOnlineQuestions();
  },

  /* Best-effort merge of live questions from the online source. Falls back to
     the local bank silently if the network is unavailable. */
  async _fetchOnlineQuestions() {
    try {
      const online = await API.fetchCodingQuestions();
      if (!online || !Array.isArray(online) || !online.length) return;
      const existing = new Set(this.state.questions.map(q => q.id));
      const fresh = online.filter(q => !existing.has(q.id));
      if (fresh.length) {
        this.state.questions = [...this.state.questions, ...fresh];
        this._renderList();
        if (typeof LiveAI !== 'undefined' && LiveAI.getStatus) {
          // no-op hook; keep offline bank intact
        }
      }
    } catch (e) {
      // keep local bank
    }
  },

  _availableRoles() {
    const roles = new Set();
    this.state.questions.forEach(q => (q.targetRoles || []).forEach(r => roles.add(r)));
    return [...roles].sort();
  },

  _availableSources() {
    const s = new Set();
    this.state.questions.forEach(q => s.add(q.source || 'LeetCode'));
    return [...s];
  },

  _filteredQuestions() {
    const f = this.state.filters;
    return this.state.questions.filter(q => {
      if (f.difficulty !== 'all' && q.difficulty !== f.difficulty) return false;
      if (f.source !== 'both' && (q.source || 'LeetCode') !== f.source) return false;
      if (f.role !== 'all' && !(q.targetRoles || []).includes(f.role)) return false;
      return true;
    });
  },

  _renderList() {
    const prog = Auth.getEmail() ? DB.getProgress(Auth.getEmail()) : null;
    const solved = prog && prog.coding ? prog.coding.solved : [];
    const solvedIds = new Set(solved);
    const filtered = this._filteredQuestions();
    const roles = this._availableRoles();
    const sources = this._availableSources();
    const f = this.state.filters;

    const sourceChip = (q) => {
      const src = q.source || 'LeetCode';
      return `<span class="chip ${src === 'LeetCode' ? 'blue' : 'purple'}">${src}</span>`;
    };
    const topicChip = (q) => q.topic ? `<span class="chip purple">${q.topic}</span>` : '';

    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
<div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Coding Practice</div>
          <div class="card-sub">LeetCode + HackerRank style challenges with instant test verification</div>

          <div class="filter-bar">
            <select id="difficultyFilter">
              <option value="all">All Difficulties</option>
              <option value="Easy" ${f.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
              <option value="Medium" ${f.difficulty === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Hard" ${f.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
            </select>
            <select id="sourceFilter">
              <option value="both">Both Sources</option>
              ${sources.map(s => `<option value="${s}" ${f.source === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select id="roleFilter">
              <option value="all">All Roles</option>
              ${roles.map(r => `<option value="${r}" ${f.role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>

          <div class="flex gap-1 items-center mt-2" style="flex-wrap:wrap">
            <label class="field-label" style="margin:0 4px 0 0;text-transform:none;letter-spacing:0">Practice questions:</label>
            <select id="countFilter" style="width:auto;min-width:110px">
              ${[5, 10, 20, 50].map(c => `<option value="${c}" ${f.count == c ? 'selected' : ''}>${c} questions</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" id="startSessionBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Generate ${f.count}Q Session
            </button>
          </div>
          <div class="text-dim" style="font-size:12px;margin-top:8px">
            <b style="color:var(--accent)">${filtered.length}</b> questions match your filters.
            ${filtered.length === 0 ? 'Try relaxing the filters.' : ''}
          </div>

          <div id="questionList" class="mt-2">
            ${filtered.map(q => `
              <div class="card hoverable mb-1" style="padding:14px;cursor:pointer" data-qid="${q.id}">
                <div class="flex-between">
                  <div>
                    <b style="font-size:14px">${q.title}</b>
                    <div class="text-dim" style="font-size:12px;margin-top:3px">${(q.description || '').split('\n')[0]}</div>
                    <div class="tag-row" style="margin-top:8px">
                      ${sourceChip(q)}
                      <span class="chip ${q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Medium' ? 'orange' : 'red'}">${q.difficulty}</span>
                      ${topicChip(q)}
                      ${q.targetRoles && q.targetRoles.length ? `<span class="chip cyan">${q.targetRoles.slice(0, 2).join(', ')}${q.targetRoles.length > 2 ? '…' : ''}</span>` : ''}
                      ${solvedIds.has(q.id) ? '<span class="chip green">[OK] Solved</span>' : ''}
                    </div>
                  </div>
                </div>
              </div>
            `).join('') || `<div class="empty-state"><div class="es-icon"></div><h3>No questions found</h3><p>Adjust your filters to see more challenges</p></div>`}
          </div>
        </div>
        <div class="card">
<div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="8"/></svg> Your Progress</div>
          <div class="card-sub">Coding statistics</div>
          <div class="stat-row" style="margin-bottom:10px">
            <div class="card stat-card" style="padding:14px">
              <div class="card-stat">${solved.length}</div>
              <div class="card-stat-label">Solved</div>
            </div>
            <div class="card stat-card" style="padding:14px">
              <div class="card-stat">${this.state.questions.length}</div>
              <div class="card-stat-label">Total Bank</div>
            </div>
          </div>
          <div class="progress-label"><span>Completion</span><span>${this.state.questions.length ? Math.round((solved.length / this.state.questions.length) * 100) : 0}%</span></div>
          <div class="progress"><div class="progress-fill green" style="width:${this.state.questions.length ? (solved.length / this.state.questions.length) * 100 : 0}%"></div></div>
          <div class="divider"></div>
          <div class="card-title mb-1" style="font-size:13px">Topic Coverage</div>
          <div class="tag-row">${this._topicSummary()}</div>
          <div class="divider"></div>
          <div class="text-dim" style="font-size:12.5px">Attempts made: <b style="color:var(--text)">${prog && prog.coding ? prog.coding.totalAttempts : 0}</b></div>
          <div class="explanation mt-2" style="font-size:12.5px">
            <b>How sessions work:</b> pick filters, choose a question count, then hit <b>Generate Session</b>. You will get a curated sequence of that many questions with a progress tracker and a final summary.
          </div>
        </div>
      </div>
    `;

    document.getElementById('difficultyFilter').addEventListener('change', (e) => {
      this.state.filters.difficulty = e.target.value;
      this._renderList();
    });
    document.getElementById('sourceFilter').addEventListener('change', (e) => {
      this.state.filters.source = e.target.value;
      this._renderList();
    });
    document.getElementById('roleFilter').addEventListener('change', (e) => {
      this.state.filters.role = e.target.value;
      this._renderList();
    });
    document.getElementById('countFilter').addEventListener('change', (e) => {
      this.state.filters.count = parseInt(e.target.value, 10) || 10;
      const btn = document.getElementById('startSessionBtn');
      if (btn) btn.innerHTML = `Generate ${this.state.filters.count}Q Session`;
    });
    document.getElementById('startSessionBtn').addEventListener('click', () => this._startSession());
    document.querySelectorAll('[data-qid]').forEach(el => {
      el.addEventListener('click', () => this._openQuestion(el.dataset.qid));
    });
  },

  _topicSummary() {
    const topics = {};
    this.state.questions.forEach(q => {
      const t = q.topic || 'General';
      topics[t] = (topics[t] || 0) + 1;
    });
    return Object.entries(topics).map(([t, n]) => `<span class="chip purple">${t} (${n})</span>`).join(' ') || '<span class="text-dim">No topics</span>';
  },

  _startSession() {
    const pool = this._filteredQuestions();
    if (pool.length === 0) {
      App.showToast('No questions match the current filters', 'error');
      return;
    }
    const count = Math.min(this.state.filters.count, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.state.session = shuffled.slice(0, count).map(q => q.id);
    this.state.sessionIndex = 0;
    this.state.sessionActive = true;
    this.state.sessionResults = {};
    App.showToast(`Session generated: ${count} questions`, 'success');
    this._openQuestion(this.state.session[0]);
  },

  _openQuestion(id) {
    const q = this.state.questions.find(x => x.id === id);
    if (!q) return;
    this.state.current = q;
    this.state.code = q.starterCode;
    this.state.results = [];

    const inSession = this.state.sessionActive && this.state.session.includes(q.id);
    const sessionPos = inSession ? this.state.session.indexOf(q.id) : -1;
    const sessionTotal = this.state.session.length;
    const src = q.source || 'LeetCode';

    this.container.innerHTML = `
      <div class="mb-2 flex-between" style="flex-wrap:wrap;gap:10px">
        <button class="btn btn-ghost btn-sm" id="backBtn"><- ${inSession ? 'Session' : 'Back to List'}</button>
        ${inSession ? `<div class="flex gap-1 items-center"><span class="chip blue">Session ${sessionPos + 1}/${sessionTotal}</span></div>` : ''}
      </div>
      ${inSession ? `<div class="progress mb-2"><div class="progress-fill" style="width:${((sessionPos + 1) / sessionTotal) * 100}%"></div></div>` : ''}
      <div class="grid grid-2">
        <div class="card">
          <div class="flex-between mb-2">
            <div>
              <div class="card-title">${q.title}</div>
              <div class="card-sub">${q.description}</div>
            </div>
          </div>
          <div class="tag-row" style="margin-bottom:10px">
            <span class="chip ${src === 'LeetCode' ? 'blue' : 'purple'}">${src}</span>
            <span class="chip ${q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Medium' ? 'orange' : 'red'}">${q.difficulty}</span>
            ${q.topic ? `<span class="chip purple">${q.topic}</span>` : ''}
            ${(q.targetRoles || []).map(r => `<span class="chip cyan">${r}</span>`).join('')}
          </div>
          <div class="code-wrap">
            <div class="code-header">
              <div class="code-dots"><span></span><span></span><span></span></div>
              <span class="code-file">solution.js</span>
            </div>
            <textarea class="code-input" id="codeEditor" spellcheck="false">${q.starterCode}</textarea>
          </div>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-primary" id="runBtn"> Run Tests</button>
            <button class="btn btn-ghost" id="resetCodeBtn"> Reset</button>
            <button class="btn btn-outline" id="solutionBtn"> Show Solution</button>
          </div>
          ${inSession ? `<div class="flex gap-2 mt-2"><button class="btn btn-success btn-block" id="nextBtn" style="display:none">Next Question -></button></div>` : ''}
        </div>
        <div class="card">
<div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Test Results</div>
          <div class="card-sub">Your code is verified against hidden test cases</div>
          <div id="solutionPanel" style="display:none">
            <div class="explanation mb-2" style="border-color:rgba(230,162,60,0.35)">
              <b style="color:var(--accent)">Approach & Solution</b>
              <div class="mt-1" style="line-height:1.6">${this._escapeHtml(q.solution || q.explanation || 'No solution provided.')}</div>
            </div>
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

    document.getElementById('backBtn').addEventListener('click', () => {
      if (inSession && this.state.sessionActive) {
        this._renderSessionSummary();
      } else {
        this._renderList();
      }
    });
    document.getElementById('runBtn').addEventListener('click', () => this._runTests());
    document.getElementById('resetCodeBtn').addEventListener('click', () => {
      document.getElementById('codeEditor').value = q.starterCode;
      this.state.code = q.starterCode;
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

    if (inSession) {
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.addEventListener('click', () => this._nextSessionQuestion());
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

  _renderSessionSummary() {
    const ids = this.state.session;
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
          const q = this.state.questions.find(x => x.id === id);
          if (!q) return '';
          const ok = this.state.sessionResults[id];
          return `
            <div class="section-check hoverable" style="cursor:pointer" data-reopen="${id}">
              <div class="check-icon ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'}</div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13.5px">${i + 1}. ${q.title}</div>
                <div class="text-dim" style="font-size:12px">${q.source || 'LeetCode'} · ${q.difficulty} · ${q.topic || ''}</div>
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

  _runTests() {
    const q = this.state.current;
    const resultsDiv = document.getElementById('testResults');
    const code = document.getElementById('codeEditor').value || this.state.code;

    const results = q.testCases.map(tc => {
      try {
        const sandbox = new Function(code + '\nreturn ' + tc.input + ';');
        const output = sandbox();
        const expected = this._parseExpected(tc.expected);
        const pass = JSON.stringify(output) === JSON.stringify(expected);
        return {
          input: tc.input,
          expected: tc.expected,
          actual: JSON.stringify(output),
          pass
        };
      } catch (e) {
        return {
          input: tc.input,
          expected: tc.expected,
          actual: 'Error: ' + e.message,
          pass: false
        };
      }
    });

    this.state.results = results;
    const passCount = results.filter(r => r.pass).length;
    const allPass = passCount === results.length;

    const email = Auth.getEmail();
    if (email) {
      const prog = DB.getProgress(email);
      const coding = prog.coding || { solved: [], totalAttempts: 0 };
      coding.totalAttempts++;
      if (allPass && !coding.solved.includes(q.id)) {
        coding.solved.push(q.id);
        App.showToast(' All tests passed! Challenge solved.', 'success');
      }
      DB.saveProgress(email, { coding });
      App.refreshAll();
    }

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
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};
