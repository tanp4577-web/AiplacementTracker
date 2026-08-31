/* ============ Lecture Questions Module ============
   Subject-based timestamped questions with runnable C++ code.
   - Pick a subject (Coding, DevOps, AI/ML, SDE, Data) → see its questions.
   - Each question shows a timestamp and a C++ snippet.
   - Click "Run" to compile & execute the C++ in the browser via the
     Wandbox online compiler API (fallback to the expected output if the
     network API is unavailable).
   =============================================== */
const LectureQuestions = {
  state: {
    subject: 'coding',
    active: null
  },

  render(container) {
    this.container = container;
    if (!this.state.subject) this.state.subject = 'coding';
    this.state.active = null;
    this._renderList();
  },

  _subjectKeys() {
    return Object.keys(LECTURE_QUESTIONS || {});
  },

  _renderList() {
    const keys = this._subjectKeys();
    const activeId = this.state.subject;
    const active = LECTURE_QUESTIONS[activeId];

    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            Lecture Questions
          </div>
          <div class="card-sub">Timestamped practice questions per subject — with runnable C++ code</div>

          <div class="filter-bar">
            <select id="lqSubject">
              ${keys.map(k => `<option value="${k}" ${k === activeId ? 'selected' : ''}>${LECTURE_QUESTIONS[k].label}</option>`).join('')}
            </select>
          </div>

          <div class="text-dim" style="font-size:12.5px;margin-top:8px;line-height:1.5">
            ${active ? active.intro : ''}
          </div>

          <div id="lqQuestionList" class="mt-2">
            ${(active ? active.questions : []).map((q, i) => `
              <div class="card hoverable mb-1 lq-card" style="padding:14px;cursor:pointer" data-lq="${q.id}">
                <div class="flex-between">
                  <div>
                    <b style="font-size:14px">${i + 1}. ${q.question}</b>
                    <div class="tag-row" style="margin-top:8px">
                      <span class="chip blue">⏱ ${q.timestamp}</span>
                      <span class="chip purple">C++</span>
                    </div>
                  </div>
                  <span class="chip green">Open →</span>
                </div>
              </div>
            `).join('') || '<div class="empty-state"><h3>No questions</h3><p>No questions for this subject yet.</p></div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-title">How it works</div>
          <div class="card-sub">Learn the concept, then test it</div>
          <div class="explanation" style="font-size:13px;line-height:1.6">
            <b>1.</b> Pick a subject and open a question.<br/>
            <b>2.</b> Each question has a <b>timestamp</b> — jump back to that moment in the matching YouTube lecture.<br/>
            <b>3.</b> The question shows a <b>C++</b> snippet.<br/>
            <b>4.</b> Hit <b>Run</b> to compile & execute it live in your browser — or just pick the correct answer.<br/>
            <b>5.</b> Check the explanation to lock in the concept.
          </div>
          <div class="divider"></div>
          <div class="text-dim" style="font-size:12.5px">
            <b style="color:var(--accent)">Note:</b> Running uses the <b>Wandbox</b> online C++ compiler (GCC). If the network is unavailable, it falls back to showing the expected output.
          </div>
        </div>
      </div>
    `;

    document.getElementById('lqSubject').addEventListener('change', (e) => {
      this.state.subject = e.target.value;
      this.state.active = null;
      this._renderList();
    });
    document.querySelectorAll('[data-lq]').forEach(el => {
      el.addEventListener('click', () => this._openQuestion(el.dataset.lq));
    });
  },

  _questionById(subject, id) {
    const sub = LECTURE_QUESTIONS[subject];
    if (!sub) return null;
    return sub.questions.find(q => q.id === id) || null;
  },

  _openQuestion(qid) {
    const sub = LECTURE_QUESTIONS[this.state.subject];
    if (!sub) return;
    const q = sub.questions.find(x => x.id === qid);
    if (!q) return;
    this.state.active = q;

    this.container.innerHTML = `
      <div class="mb-2 flex-between" style="flex-wrap:wrap;gap:10px">
        <button class="btn btn-ghost btn-sm" id="lqBack"><- Back to Questions</button>
        <span class="chip blue">${sub.label}</span>
      </div>

      <div class="card mb-2">
        <div class="flex-between mb-2" style="flex-wrap:wrap;gap:10px">
          <div>
            <div class="card-title">${q.question}</div>
            <div class="card-sub">Lecture timestamp: <b style="color:var(--accent)">${q.timestamp}</b></div>
          </div>
          <a class="btn btn-outline btn-sm" href="https://www.youtube.com/${this._findYoutubeRef()}?t=${q.timestampSec}" target="_blank" rel="noopener">
            ▶ Watch at ${q.timestamp}
          </a>
        </div>

        <div class="code-wrap">
          <div class="code-header">
            <div class="code-dots"><span></span><span></span><span></span></div>
            <span class="code-file">solution.cpp</span>
          </div>
          <textarea class="code-input" id="lqCodeEditor" spellcheck="false">${q.code}</textarea>
        </div>

        <div class="flex gap-2 mt-2">
          <button class="btn btn-primary" id="lqRunBtn">▶ Run C++</button>
          <button class="btn btn-ghost" id="lqResetBtn">Reset</button>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Choose the answer</div>
          <div class="card-sub">What does this C++ program output / which is correct?</div>
          <div id="lqOptions">
            ${q.options.map((opt, i) => `
              <button class="option-btn" data-opt="${i}">
                <span class="option-letter">${String.fromCharCode(65 + i)}</span> ${opt}
              </button>
            `).join('')}
          </div>
          <div id="lqAnswerFeedback" class="mt-2"></div>
        </div>
        <div class="card">
          <div class="card-title">Run Output</div>
          <div class="card-sub">Live compilation & execution result</div>
          <div id="lqRunOutput">
            <div class="empty-state">
              <div class="es-icon">⚙</div>
              <h3>Run the code to see output</h3>
              <p>Click "Run C++" to compile the snippet</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('lqBack').addEventListener('click', () => {
      this.state.active = null;
      this._renderList();
    });
    document.getElementById('lqRunBtn').addEventListener('click', () => this._runCode());
    document.getElementById('lqResetBtn').addEventListener('click', () => {
      document.getElementById('lqCodeEditor').value = q.code;
    });
    document.querySelectorAll('[data-opt]').forEach(btn => {
      btn.addEventListener('click', () => this._checkAnswer(btn, q));
    });
  },

  _findYoutubeRef() {
    // Best-effort: find a matching lecture by category for the "watch at" link.
    try {
      const cat = this.state.subject;
      const pl = (typeof YOUTUBE_DATA !== 'undefined' && YOUTUBE_DATA.playlists)
        ? YOUTUBE_DATA.playlists.find(p => p.category === cat) : null;
      if (pl && pl.url) {
        const m = pl.url.match(/embed\/([a-zA-Z0-9_-]+)/);
        if (m) return 'watch?v=' + m[1];
      }
    } catch (e) {}
    return 'watch?v=PkZNo7MFNFg';
  },

  _checkAnswer(btn, q) {
    const idx = parseInt(btn.dataset.opt, 10);
    document.querySelectorAll('[data-opt]').forEach(b => {
      b.classList.remove('selected', 'correct', 'wrong');
      if (b === btn) {
        b.classList.add(idx === q.answerIndex ? 'correct' : 'wrong');
      } else if (parseInt(b.dataset.opt, 10) === q.answerIndex) {
        b.classList.add('correct');
      }
    });
    const fb = document.getElementById('lqAnswerFeedback');
    if (idx === q.answerIndex) {
      fb.innerHTML = `<div class="explanation" style="border-color:rgba(63,174,111,0.4);background:rgba(63,174,111,0.1)"><b style="color:var(--success)">✓ Correct!</b> ${q.explanation}</div>`;
    } else {
      fb.innerHTML = `<div class="explanation" style="border-color:rgba(209,72,63,0.4);background:rgba(209,72,63,0.1)"><b style="color:var(--danger)">✗ Not quite.</b> ${q.explanation}</div>`;
    }
  },

  /* ---- Run C++ via Wandbox compiler API (with fallback) ---- */
  async _runCode() {
    const code = document.getElementById('lqCodeEditor').value || this.state.active.code;
    const out = document.getElementById('lqRunOutput');
    out.innerHTML = `
      <div class="empty-state">
        <div class="spinner" style="width:26px;height:26px"></div>
        <h3>Compiling...</h3>
        <p>Running C++ (GCC) through Wandbox</p>
      </div>
    `;

    try {
      const res = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: 'gcc-head',
          code: code,
          options: 'warning,gnu++17',
          stdin: ''
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const program = data.program || '';
      const errors = data.compiler_error || data.stderr || '';
      this._renderRunResult(out, program, errors);
    } catch (e) {
      // Fallback: show expected output if we can't reach the compiler.
      out.innerHTML = `
        <div class="card test-case" style="background:rgba(230,162,60,0.08);border-color:rgba(230,162,60,0.4)">
          <div class="test-title"><span>⚠ Offline mode</span><span class="text-warning">Network unavailable</span></div>
          <div class="test-io">
            <div style="color:var(--text)">Could not reach the online C++ compiler (${e.message}).</div>
            <div style="margin-top:4px">Expected output: <code style="color:var(--success)">${this.state.active.expectedOutput}</code></div>
          </div>
        </div>
      `;
    }
  },

  _renderRunResult(out, program, errors) {
    if (errors) {
      out.innerHTML = `
        <div class="card test-case fail" style="background:rgba(209,72,63,0.08);border-color:rgba(209,72,63,0.4)">
          <div class="test-title"><span>Compile / Runtime Error</span><span class="text-danger">[X]</span></div>
          <div class="test-io"><pre style="white-space:pre-wrap;color:var(--danger)">${this._escapeHtml(errors)}</pre></div>
        </div>
      `;
      return;
    }
    out.innerHTML = `
      <div class="card test-case pass" style="background:rgba(63,174,111,0.08);border-color:rgba(63,174,111,0.4)">
        <div class="test-title"><span>Program Output</span><span class="text-success">[OK]</span></div>
        <div class="test-io"><pre style="white-space:pre-wrap;color:var(--text)">${this._escapeHtml(program || '(no output)')}</pre></div>
      </div>
      <div class="text-dim mt-2" style="font-size:12px">Expected output: <code style="color:var(--success)">${this._escapeHtml(this.state.active.expectedOutput)}</code></div>
    `;
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};
