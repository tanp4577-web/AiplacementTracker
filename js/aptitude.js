/* ============ Adaptive Aptitude Quiz Engine ============ */
const Aptitude = {
  state: {
    questions: [],
    index: 0,
    score: 0,
    streak: 0,
    mode: 'setup', // setup | quiz | results
    selected: null,
    timer: null,
    timeLeft: 0,
    category: 'mixed'
  },

  render(container) {
    this.container = container;
    this.state = { ...this.state, mode: 'setup', questions: [], index: 0, score: 0, streak: 0, selected: null };
    this._renderSetup();
  },

  _renderSetup() {
    const prog = Auth.getEmail() ? DB.getProgress(Auth.getEmail()) : null;
    const prevStats = prog && prog.aptitude ? prog.aptitude : null;

    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>
            Aptitude Quiz Generator
          </div>
          <div class="card-sub">Questions fetched live from OpenTriviaDB — always fresh, adaptive difficulty</div>
          <label class="field-label">Category</label>
          <select id="quizCategory">
            <option value="mixed">Mixed (all topics)</option>
            <option value="18">Computer Science</option>
            <option value="9">General Knowledge</option>
            <option value="19">Mathematics</option>
            <option value="17">Science</option>
          </select>
          <label class="field-label mt-2">Number of Questions</label>
          <select id="quizCount">
            <option value="5">5 (Quick)</option>
            <option value="10" selected>10 (Standard)</option>
            <option value="15">15 (Deep)</option>
          </select>
          <label class="field-label mt-2">Difficulty</label>
          <select id="quizDifficulty">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button class="btn btn-primary btn-block mt-3" id="startQuizBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;vertical-align:-2px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Generate Quiz
          </button>
          <p class="text-dim mt-2" style="font-size:12px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Needs internet for fresh questions. Falls back to offline bank if unavailable.
          </p>
        </div>
        <div class="card">
          <div class="card-title">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="8"/></svg>
            Your Previous Performance
          </div>
          <div class="card-sub">Aptitude history across all sessions</div>
          ${this._renderStats(prevStats)}
        </div>
      </div>
    `;

    document.getElementById('startQuizBtn').addEventListener('click', () => this._startQuiz());
  },

  _renderStats(stats) {
    if (!stats || !stats.completed) {
      return `<div class="empty-state"><div class="es-icon"></div><h3>No quizzes yet</h3><p>Complete a quiz to see your stats here</p></div>`;
    }
    const accuracy = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    return `
      <div class="stat-row" style="margin-bottom:10px">
        <div class="card stat-card" style="padding:14px">
          <div class="card-stat">${stats.completed}</div>
          <div class="card-stat-label">Quizzes</div>
        </div>
        <div class="card stat-card" style="padding:14px">
          <div class="card-stat">${accuracy}%</div>
          <div class="card-stat-label">Accuracy</div>
        </div>
      </div>
      <div class="progress-label"><span>Overall accuracy</span><span>${accuracy}%</span></div>
      <div class="progress"><div class="progress-fill" style="width:${accuracy}%"></div></div>
      <div class="divider"></div>
      <div class="text-dim" style="font-size:12.5px">Total questions answered: <b style="color:var(--text)">${stats.total}</b><br>
      Correct: <b class="text-success">${stats.correct}</b> · Wrong: <b class="text-danger">${stats.total - stats.correct}</b></div>
    `;
  },

  async _startQuiz() {
    const category = document.getElementById('quizCategory').value;
    const count = parseInt(document.getElementById('quizCount').value);
    const difficulty = document.getElementById('quizDifficulty').value;

    this.container.innerHTML = `
      <div class="loading-screen">
        <div class="spinner"></div>
        <p>Generating subject-specific questions...</p>
      </div>
    `;

    // Generate subject-specific questions through the server-side AI API first.
    let questions = await API.generateAptitudeQuestions(count, category, difficulty);

    // Keep the public question bank as a subject-aware fallback.
    if (!questions || questions.length < count) questions = null;
    if (!questions && category === 'mixed') {
      // Fetch a mix
      const cats = ['18', '9', '19'];
      const per = Math.ceil(count / cats.length);
      const results = await Promise.all(cats.map(c => API.fetchAptitudeQuestions(per, c)));
      const valid = results.filter(r => r && r.length);
      questions = valid.flat().slice(0, count);
    } else if (!questions) {
      questions = await API.fetchAptitudeQuestions(count, category);
    }

    if (!questions || questions.length === 0) {
      // Use only a matching local bank as the final fallback.
      const offlineBank = this._offlineQuestionBank(category);
      questions = this._shuffle(offlineBank).slice(0, count);
      if (questions.length) {
        App.showToast('Online generation failed — using matching offline questions', 'info');
      } else {
        App.showToast('Could not load questions for this subject. Please try again.', 'error');
        this._renderSetup();
        return;
      }
    } else {
      App.showToast('Fresh questions loaded from online bank', 'success');
    }

    // Normalize + fix correct index (since options were shuffled)
    questions = questions.map(q => {
      if (q.correctAnswer) {
        const idx = q.options.indexOf(q.correctAnswer);
        return { ...q, correct: idx === -1 ? 0 : idx };
      }
      return q;
    });

    // Difficulty filter for fallback questions (fallback has no difficulty, keep all)
    this.state.questions = this._shuffle(questions);
    this.state.index = 0;
    this.state.score = 0;
    this.state.streak = 0;
    this.state.selected = null;
    this.state.mode = 'quiz';
    this._renderQuestion();
  },

  _renderQuestion() {
    const q = this.state.questions[this.state.index];
    if (!q) {
      this._renderResults();
      return;
    }

    const total = this.state.questions.length;
    const qNum = this.state.index + 1;

    this.container.innerHTML = `
      <div class="quiz-meta">
        <div class="chip blue">Question ${qNum} / ${total}</div>
        <div class="chip purple">${q.category || 'General'}</div>
        <div class="chip orange">Streak: ${this.state.streak}</div>
        <div class="chip green">Score: ${this.state.score}</div>
      </div>
      <div class="card question-card">
        <div class="progress mb-2"><div class="progress-fill" style="width:${(qNum / total) * 100}%"></div></div>
        <h3 style="font-size:17px;margin-bottom:18px;line-height:1.5">${q.question}</h3>
        <div class="options" id="options">
          ${q.options.map((opt, i) => `
            <button class="option-btn" data-idx="${i}">
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
        <div id="feedback"></div>
        <div class="flex-between mt-3">
          <button class="btn btn-ghost" id="prevBtn" ${this.state.index === 0 ? 'disabled' : ''}><- Prev</button>
          <button class="btn btn-primary" id="nextBtn">${this.state.index === total - 1 ? 'Finish Quiz' : 'Next ->'}</button>
        </div>
      </div>
    `;

    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => this._selectOption(parseInt(btn.dataset.idx)));
    });
    document.getElementById('nextBtn').addEventListener('click', () => this._next());
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => this._prev());
  },

  _selectOption(idx) {
    const q = this.state.questions[this.state.index];
    this.state.selected = idx;

    document.querySelectorAll('.option-btn').forEach(btn => {
      const i = parseInt(btn.dataset.idx);
      btn.classList.remove('selected', 'correct', 'wrong');
      if (i === idx) btn.classList.add('selected');
    });

    // Disable further selection (evaluate immediately like real tests)
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);

    const isCorrect = idx === q.correct;
    const optionsDiv = document.getElementById('options');
    const btns = optionsDiv.querySelectorAll('.option-btn');
    btns[q.correct].classList.add('correct');
    btns[q.correct].classList.remove('selected');
    if (!isCorrect) btns[idx].classList.add('wrong');

    if (isCorrect) {
      this.state.score++;
      this.state.streak++;
    } else {
      this.state.streak = 0;
    }

    document.getElementById('feedback').innerHTML = `
      <div class="explanation" style="${isCorrect ? 'border-color:rgba(63,174,111,0.3);background:rgba(63,174,111,0.06)' : ''}">
        <b style="color:${isCorrect ? 'var(--success)' : 'var(--danger)'}">${isCorrect ? '[OK] Correct!' : '[X] Incorrect'}</b>
        <div class="mt-1">${q.explanation || 'No explanation available.'}</div>
      </div>
    `;
  },

  _next() {
    // If not answered yet, auto-mark as skipped
    if (this.state.selected === null) {
      // allow next without selecting, count as wrong/skipped
    }
    this.state.selected = null;
    this.state.index++;
    if (this.state.index >= this.state.questions.length) {
      this._renderResults();
    } else {
      this._renderQuestion();
    }
  },

  _prev() {
    this.state.selected = null;
    this.state.index--;
    this._renderQuestion();
  },

  _renderResults() {
    const total = this.state.questions.length;
    const score = this.state.score;
    const pct = total ? Math.round((score / total) * 100) : 0;
    const msg = pct >= 80 ? 'Outstanding! You are placement-ready.' : pct >= 60 ? 'Good job! Keep practicing.' : pct >= 40 ? 'Keep going — focus on weak areas.' : 'Need more practice. Try again!';

    // Save progress
    const email = Auth.getEmail();
    if (email) {
      const prog = DB.getProgress(email);
      const aptitude = prog.aptitude || { completed: 0, correct: 0, total: 0, history: [] };
      aptitude.completed++;
      aptitude.correct += score;
      aptitude.total += total;
      aptitude.history.push({ date: Date.now(), score: score, total: total, pct: pct });
      DB.saveProgress(email, { aptitude });
      App.refreshAll();
    }

    const resultSvg = pct >= 60
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="#c98a2c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:56px;height:56px"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/></svg>'
      : pct >= 40
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:56px;height:56px"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="#ef9891" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:56px;height:56px"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M20 17v5"/></svg>';

    this.container.innerHTML = `
      <div class="card text-center" style="padding:40px">
        <div style="font-size:56px;margin-bottom:12px">${resultSvg}</div>
        <h2 style="font-size:26px;margin-bottom:6px">Quiz Complete!</h2>
        <div class="card-stat" style="font-size:44px">${score}/${total}</div>
        <div class="text-dim mb-2">Score: ${pct}%</div>
        <div class="progress mb-3" style="max-width:300px;margin:0 auto">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <p class="mb-3" style="font-size:14.5px">${msg}</p>
        <div class="chip blue mb-3">Accuracy: ${pct}%</div>
        <div class="flex gap-2" style="justify-content:center">
          <button class="btn btn-primary" id="retakeBtn"> Retake Quiz</button>
          <button class="btn btn-ghost" id="reviewBtn"> Review Answers</button>
        </div>
      </div>
    `;

    document.getElementById('retakeBtn').addEventListener('click', () => this.render(this.container));
    document.getElementById('reviewBtn').addEventListener('click', () => this._reviewAnswers());
  },

  _reviewAnswers() {
    const html = this.state.questions.map((q, i) => {
      return `
        <div class="card mb-1" style="padding:16px">
          <div class="flex-between mb-1">
            <span class="chip ${'purple'}">Q${i + 1}</span>
            <span class="chip green">Correct: ${q.options[q.correct]}</span>
          </div>
          <div style="font-size:13.5px;margin-bottom:8px">${q.question}</div>
          <div class="text-dim" style="font-size:12.5px">${q.explanation || ''}</div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="card-title"> Answer Review</div>
        <div class="card-sub">All questions with correct answers</div>
        <button class="btn btn-ghost btn-sm" id="backBtn"><- Back to Results</button>
      </div>
      ${html}
    `;

    document.getElementById('backBtn').addEventListener('click', () => this._renderResults());
  },

  _offlineQuestionBank(category = 'mixed') {
    const bank = [];
    const allowedCategories = category === '19' ? ['quantitative'] : category === 'mixed' ? null : [];
    if (typeof APTITUDE_QUESTIONS !== 'undefined') {
      Object.entries(APTITUDE_QUESTIONS).forEach(([name, cat]) => {
        if (allowedCategories && !allowedCategories.includes(name)) return;
        (cat || []).forEach(q => {
          bank.push({
            category: q.category || 'General',
            question: q.question,
            options: q.options || [],
            correct: q.answer != null ? q.answer : 0,
            explanation: q.explanation || ''
          });
        });
      });
    }
    // The generic pool is safe only for mixed or quantitative quizzes.
    if (allowedCategories === null || allowedCategories.includes('quantitative')) {
      if (typeof FALLBACK_APTITUDE !== 'undefined') {
      bank.push(...FALLBACK_APTITUDE);
      }
    }
    return bank;
  },

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};


