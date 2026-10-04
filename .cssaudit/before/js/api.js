/* ============ Online Question Fetcher ============ */
const API = {
  /* ---------- Generate subject-specific aptitude questions ---------- */
  async generateAptitudeQuestions(amount = 10, category = 'mixed', difficulty = 'medium') {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch('/api/aptitude', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, category, difficulty })
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data.questions) ? data.questions : null;
    } catch (e) {
      return null;
    }
  },

  /* ---------- Fetch Aptitude Questions from OpenTriviaDB ---------- */
  async fetchAptitudeQuestions(amount = 10, category = 18) {
    // categories: 18=CompSci, 9=General, 17=Science, 19=Maths
    const url = `https://opentdb.com/api.php?amount=${amount}&category=${category}&type=multiple`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.response_code !== 0) throw new Error('API returned error code');
      return data.results.map((q, i) => {
        const correctAnswer = this._decodeHTML(q.correct_answer);
        const options = this._shuffle([
          ...q.incorrect_answers.map(a => this._decodeHTML(a)),
          correctAnswer
        ]);
        return {
          id: i,
          category: 'Online',
          question: this._decodeHTML(q.question),
          options,
          correct: this.fixCorrectIndex({ options }, correctAnswer),
          correctAnswer,
          explanation: `The correct answer is: ${correctAnswer}`
        };
      });
    } catch (e) {
      console.warn('Online fetch failed, using fallback:', e.message);
      return null;
    }
  },

  /* ---------- Helpers ---------- */
  _decodeHTML(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  },

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /* ---------- Fix correct index after shuffle ---------- */
  fixCorrectIndex(question, correctAnswer) {
    return question.options.indexOf(correctAnswer);
  }
};
