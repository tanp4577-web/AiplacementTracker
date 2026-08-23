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
            <i class="bi bi-patch-question text-accent" style="font-size:16px"></i>
            Aptitude Quiz Generator
          </div>
          <div class="card-sub">Dynamic aptitude tests with quantitative, logical, and technical questions</div>
          <label class="field-label">Category</label>
          <select id="quizCategory">
            <option value="mixed">Mixed (All Categories)</option>
            <option value="18">Computer Science & Tech</option>
            <option value="19">Quantitative & Mathematics</option>
            <option value="9">General Aptitude & Logical</option>
            <option value="17">Science & Engineering</option>
          </select>
          <label class="field-label mt-2">Number of Questions</label>
          <select id="quizCount">
            <option value="5">5 Questions (Quick Check)</option>
            <option value="10" selected>10 Questions (Standard Test)</option>
            <option value="15">15 Questions (Full Mock)</option>
          </select>
          <label class="field-label mt-2">Difficulty</label>
          <select id="quizDifficulty">
            <option value="easy">Easy (Fundamentals)</option>
            <option value="medium" selected>Medium (Standard Campus)</option>
            <option value="hard">Hard (Advanced)</option>
          </select>
          <button class="btn btn-primary btn-block mt-3" id="startQuizBtn">
            <i class="bi bi-lightning-charge-fill" style="margin-right:4px"></i>
            Start Aptitude Quiz
          </button>
          <p class="text-dim mt-2" style="font-size:12px">
            <i class="bi bi-shield-check text-accent" style="margin-right:4px"></i>
            Real-time evaluation with detailed explanations for every question.
          </p>
        </div>
        <div class="card">
          <div class="card-title">
            <i class="bi bi-graph-up text-accent" style="font-size:16px"></i>
            Performance History
          </div>
          <div class="card-sub">Accuracy metrics and past attempts</div>
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
          <button class="btn btn-ghost" id="prevBtn" ${this.state.index === 0 ? 'disabled' : ''}><i class="bi bi-arrow-left"></i> Previous</button>
          <button class="btn btn-primary" id="nextBtn">${this.state.index === total - 1 ? 'Finish Quiz' : 'Next <i class="bi bi-arrow-right"></i>'}</button>
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

    const resultIcon = pct >= 60
      ? '<i class="bi bi-trophy-fill text-warning" style="font-size:48px"></i>'
      : pct >= 40
        ? '<i class="bi bi-check-circle-fill text-accent" style="font-size:48px"></i>'
        : '<i class="bi bi-arrow-clockwise text-dim" style="font-size:48px"></i>';

    this.container.innerHTML = `
      <div class="card text-center" style="padding:40px;max-width:540px;margin:0 auto">
        <div style="margin-bottom:12px">${resultIcon}</div>
        <h2 style="font-size:22px;margin-bottom:6px">Quiz Complete!</h2>
        <div class="card-stat" style="font-size:36px;font-family:var(--font-mono)">${score} / ${total}</div>
        <div class="text-dim mb-2">Accuracy: <b>${pct}%</b></div>
        <div class="progress mb-3" style="max-width:280px;margin:0 auto;height:6px">
          <div class="progress-fill ${pct >= 60 ? 'green' : pct >= 40 ? 'orange' : 'red'}" style="width:${pct}%"></div>
        </div>
        <p class="mb-3" style="font-size:13px;line-height:1.5">${msg}</p>
        <div class="flex gap-2" style="justify-content:center">
          <button class="btn btn-primary" id="retakeBtn"><i class="bi bi-arrow-clockwise" style="margin-right:4px"></i>Retake Quiz</button>
          <button class="btn btn-ghost" id="reviewBtn"><i class="bi bi-card-checklist" style="margin-right:4px"></i>Review Answers</button>
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
        <div class="flex-between">
          <div>
            <div class="card-title"><i class="bi bi-card-checklist text-accent" style="margin-right:4px"></i>Answer Review</div>
            <div class="card-sub">Detailed solutions and concept explanations</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="backBtn"><i class="bi bi-arrow-left"></i> Back to Results</button>
        </div>
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


