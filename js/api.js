/* ============ Online Question Fetcher ============ */
const API = {
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

/* ---------- Fetch Coding Questions from GitHub (LeetCode-style) ---------- */
  // Returns real questions shaped like the local coding schema so they can be
  // merged into the Coding module (js/coding.js). Source is lydiahallie's
  // JavaScript-Questions repo (CORS-verified) via GitHub raw content.
  async fetchCodingQuestions() {
    const sources = [
      'https://raw.githubusercontent.com/lydiahallie/javascript-questions/master/README.md',
      'https://raw.githubusercontent.com/lydiahallie/javascript-questions/master/en/README.md'
    ];
    for (const url of sources) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) continue;
        const md = await res.text();
        const questions = this._parseJsQuestions(md);
        if (questions.length >= 3) return questions;
      } catch (e) {
        // try next source
      }
    }
    return null;
  },

  /* Parse the markdown Q&A from lydiahallie/javascript-questions into the
     coding schema used by js/coding.js (id, title, source, difficulty,
     topic, description, starterCode, testCases, solution). */
  _parseJsQuestions(md) {
    const out = [];
    // Split into question blocks by "####" headings
    const blocks = md.split(/\n####\s+/);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const titleMatch = block.match(/^([^\n]+)/);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();
      // Extract the body (everything before the options/first answer)
      const body = block.replace(/^[^\n]*\n/, '').split(/^[-*]\s*[A-D][\.\):]/m)[0];
      const description = body.replace(/```/g, '').trim().slice(0, 400);
      const answered = /answer:\s*`?[A-D]`?/i.test(block);
      out.push({
        id: 'js_' + (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || i),
        title: title.slice(0, 80),
        source: 'JS Questions',
        difficulty: 'Easy',
        targetRoles: ['SDE', 'Frontend Developer'],
        topic: 'JavaScript',
        description: description || title,
        starterCode: `function solve() {\n  // Explain the correct answer for: ${title}\n}`,
        testCases: [
          { input: "typeof solve()", expected: "\"undefined\"" }
        ],
        solution: answered ? 'See the explanation in the original question source.' : 'See the explanation in the original question source.',
        explanation: 'Sourced live from lydiahallie/javascript-questions (GitHub).'
      });
    }
    return out;
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
