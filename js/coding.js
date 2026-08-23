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
    lang: 'javascript', // 'javascript' | 'cpp'
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
          <div class="card-title"><i class="bi bi-code-slash text-accent" style="font-size:16px"></i> Coding Practice</div>
          <div class="card-sub">LeetCode & HackerRank technical problems with instant test suite</div>

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
              <i class="bi bi-lightning-charge-fill" style="margin-right:4px"></i>
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

_lookupCppQuestion(id) {
    // Find the matching C++ version of a JS question by id (suffix "-cpp").
    if (typeof EXTRA_CODING_CPP === 'undefined') return null;
    return EXTRA_CODING_CPP.find(c => c.id === id + '-cpp') || null;
  },

  _openQuestion(id) {
    const q = this.state.questions.find(x => x.id === id);
    if (!q) return;
    this.state.current = q;
    this.state.code = q.starterCode;
    this.state.results = [];
    // Default language: if a C++ version exists, prefer C++ for this question.
    this.state.lang = this._lookupCppQuestion(q.id) ? 'cpp' : 'javascript';

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
      const runBtn = document.getElementById('runBtn');
      if (runBtn) runBtn.textContent = isCpp ? '▶ Run C++ Tests' : ' Run Tests';
      const cppNote = document.getElementById('cppNote');
      if (cppNote) cppNote.style.display = (isCpp && cppQ) ? 'block' : 'none';
    };

    this.container.innerHTML = `
      <div class="mb-2 flex-between" style="flex-wrap:wrap;gap:10px">
        <button class="btn btn-ghost btn-sm" id="backBtn"><i class="bi bi-arrow-left"></i> ${inSession ? 'Session' : 'Back to Problems'}</button>
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
          <div class="flex gap-2 mb-2" style="align-items:center">
            <span class="text-dim" style="font-size:12.5px">Language:</span>
            <button class="btn btn-ghost btn-sm ${this.state.lang === 'javascript' ? 'active' : ''}" id="langJsBtn">JavaScript</button>
            <button class="btn btn-ghost btn-sm ${this.state.lang === 'cpp' ? 'active' : ''}" id="langCppBtn">C++</button>
          </div>
          <div class="code-wrap">
            <div class="code-header">
              <div class="code-dots"><span></span><span></span><span></span></div>
              <span class="code-file" id="codeFileLabel">solution.js</span>
            </div>
            <textarea class="code-input" id="codeEditor" spellcheck="false">${q.starterCode}</textarea>
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
    document.getElementById('langJsBtn').addEventListener('click', () => {
      this.state.lang = 'javascript';
      renderEditor();
    });
    document.getElementById('langCppBtn').addEventListener('click', () => {
      this.state.lang = 'cpp';
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
      resultsDiv.innerHTML = `<div class="empty-state"><h3>No C++ test cases</h3><p>This question has no C++ test harness yet.</p></div>`;
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
        const data = await res.json();
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

    // Progress tracking (same as JS mode)
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
