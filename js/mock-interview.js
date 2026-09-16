/* ============ Live AI Mock Interview (voice) ============
   Continuous, hands-free interview loop:
     click Start -> AI speaks -> mic auto-listens -> silence detected ->
     AI thinks -> AI speaks the follow-up -> repeat.
   No manual "record" button per turn — this is intentional so it behaves
   like a live conversation instead of a walkie-talkie.

   Two fixes versus the previous version:
   1. The opening question is spoken via the browser's own speechSynthesis
      DIRECTLY inside the Start-button click handler, before any awaited
      permission prompts. Browsers require audio playback to happen very
      close to a real user click ("user activation") or they silently
      block it — that's why the interviewer wasn't speaking before.
   2. Speech-to-text now uses the browser's own continuous SpeechRecognition
      instead of recording audio and sending it to a server transcription
      endpoint. It's instant, doesn't depend on an extra API key working,
      and shows a live transcript as you talk.

   The AI brain itself still calls the existing /api/interview-chat
   endpoint (unchanged) — that part still requires GROQ_API_KEY to be set
   in Vercel, or you'll get a clear error toast instead of a reply.
   ========================================================================== */
const MockInterview = {
  MAX_QUESTIONS: 6,
  OPENING_QUESTION: 'Tell me about yourself and your background.',
  SILENCE_MS: 1500,

  state: {
    history: [],
    role: '',
    questionCount: 0,
    scores: [],
    stream: null,
    stopLevelMeter: null,
    recognition: null,
    listening: false,
    finished: false
  },

  render(container) {
    this.container = container;
    this.state = {
      history: [], role: '', questionCount: 0, scores: [],
      stream: null, stopLevelMeter: null, recognition: null, listening: false, finished: false
    };
    this._renderIntro();
  },

  _renderIntro() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="card-title"><i class="bi bi-mic-fill text-accent" style="margin-right:6px"></i>Live AI Mock Interview</div>
        <div class="card-sub">Speak your answers out loud — the AI interviewer listens live, replies, and follows up automatically. No buttons to press mid-interview.</div>
        ${!SR ? '<p class="mt-2" style="color:#f87171;font-size:.85rem">Your browser does not support live speech recognition. Please use Chrome or Edge.</p>' : ''}
        <div class="mt-2">
          <label style="display:block;margin-bottom:6px;font-size:.85rem;color:var(--text-secondary,#9fb3c8)">Role you're applying for (optional)</label>
          <input type="text" id="miRole" placeholder="e.g. Frontend Developer" style="width:100%;max-width:360px" />
        </div>
        <button class="btn btn-primary mt-2" id="miStartBtn" ${!SR ? 'disabled' : ''}><i class="bi bi-mic" style="margin-right:4px"></i>Start Interview</button>
        <p class="mt-2" style="font-size:.8rem;color:var(--text-secondary,#9fb3c8)">Requires microphone access (camera is optional, just for your own preview).</p>
      </div>
    `;
    this.container.querySelector('#miStartBtn').addEventListener('click', () => this._startInterview());
  },

  _startInterview() {
    this.state.role = (this.container.querySelector('#miRole')?.value || '').trim();
    this._renderSession();

    // Speak the opening question immediately, synchronously in this click
    // handler — no awaits before this line — so the browser doesn't block it.
    const qEl = this.container.querySelector('#miQuestion');
    if (qEl) qEl.textContent = this.OPENING_QUESTION;
    this._speakThenListen(this.OPENING_QUESTION);

    // Camera preview is cosmetic only — enable it in parallel, don't block
    // the interview loop on it (mic permission is requested separately by
    // SpeechRecognition itself when it starts).
    if (LiveAI.isSecureContext()) {
      LiveAI.enableCamera(true, true).then((stream) => {
        this.state.stream = stream;
        const videoEl = this.container.querySelector('#miVideo');
        if (videoEl) { videoEl.srcObject = stream; videoEl.play().catch(() => {}); }
        LiveAI.startLevelMeter(stream, (level) => {
          const bar = this.container.querySelector('#miLevelBar');
          if (bar) bar.style.width = Math.round(level * 100) + '%';
        }).then((stop) => { this.state.stopLevelMeter = stop; });
      }).catch(() => {
        const videoEl = this.container.querySelector('#miVideo');
        if (videoEl) videoEl.style.display = 'none';
      });
    }
  },

  _renderSession() {
    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div class="card-title"><i class="bi bi-mic-fill text-accent" style="margin-right:6px"></i>Live AI Mock Interview</div>
          <div id="miStatus" style="font-size:.85rem;color:var(--text-secondary,#9fb3c8)">Starting…</div>
        </div>
        <div class="grid grid-2 mt-2" style="gap:16px;align-items:start">
          <div>
            <video id="miVideo" autoplay muted playsinline style="width:100%;border-radius:10px;background:#000"></video>
            <div style="height:6px;background:#1f2a37;border-radius:4px;margin-top:8px;overflow:hidden">
              <div id="miLevelBar" style="height:100%;width:0%;background:#16a34a;transition:width .1s"></div>
            </div>
          </div>
          <div>
            <div class="card" style="background:var(--bg-secondary,#0b0f14);min-height:90px">
              <div style="font-size:.75rem;color:var(--text-secondary,#9fb3c8);margin-bottom:6px">INTERVIEWER</div>
              <div id="miQuestion" style="font-size:1.05rem;line-height:1.5">—</div>
            </div>
            <div class="card mt-2" style="background:var(--bg-secondary,#0b0f14);min-height:60px">
              <div style="font-size:.75rem;color:var(--text-secondary,#9fb3c8);margin-bottom:6px">YOU (live transcript)</div>
              <div id="miTranscript" style="font-size:.95rem;font-style:italic;color:#7dd3fc">—</div>
            </div>
          </div>
        </div>
        <div class="mt-2">
          <button class="btn btn-ghost" id="miEndBtn">End Interview</button>
        </div>
      </div>
    `;
    this.container.querySelector('#miEndBtn').addEventListener('click', () => this._endInterview());
  },

  _setStatus(text) {
    const el = this.container.querySelector('#miStatus');
    if (el) el.textContent = text;
  },

  /** Speak text with the browser's own voice, then auto-start listening when it ends. */
  _speakThenListen(text) {
    this._setStatus('🔊 Interviewer speaking…');
    if (!('speechSynthesis' in window)) {
      this._startListening();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1.02;
    utter.onend = () => { if (!this.state.finished) this._startListening(); };
    utter.onerror = () => { if (!this.state.finished) this._startListening(); };
    window.speechSynthesis.speak(utter);
  },

  _startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      App.showToast('Speech recognition needs Chrome or Edge.', 'error');
      return;
    }
    if (this.state.recognition) {
      try { this.state.recognition.stop(); } catch (e) {}
    }

    this._setStatus('🎙️ Listening…');
    this.state.listening = true;
    const tEl = this.container.querySelector('#miTranscript');
    if (tEl) tEl.textContent = '';

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let finalTranscript = '';
    let silenceTimer = null;

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t + ' ';
        else interim += t;
      }
      if (tEl) tEl.textContent = (finalTranscript + interim).trim();

      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (this.state.listening && finalTranscript.trim()) rec.stop();
      }, this.SILENCE_MS);
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed') {
        App.showToast("Microphone access was blocked. Allow it in your browser's address-bar permissions and click Start again.", 'error');
      }
    };

    rec.onend = () => {
      this.state.listening = false;
      if (this.state.finished) return;
      const answer = finalTranscript.trim();
      finalTranscript = '';
      if (!answer) {
        this._startListening(); // nothing heard yet, keep listening
        return;
      }
      this._handleAnswer(answer);
    };

    this.state.recognition = rec;
    try { rec.start(); } catch (e) { /* already running */ }
  },

  async _handleAnswer(answer) {
    this._setStatus('🤔 Thinking…');
    try {
      const res = await fetch('/api/interview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: this.state.history, answer, role: this.state.role })
      });
      const data = await res.json();
      if (!res.ok || !data.spoken_response) {
        throw new Error(data.error || 'The interviewer had no response.');
      }

      this.state.history.push({ role: 'user', content: answer });
      this.state.history.push({ role: 'assistant', content: data.spoken_response });
      if (typeof data.score === 'number') this.state.scores.push(data.score);
      this.state.questionCount++;

      const qEl = this.container.querySelector('#miQuestion');
      if (qEl) qEl.textContent = data.spoken_response;

      if (this.state.questionCount >= this.MAX_QUESTIONS) {
        this._finishInterview();
        return;
      }

      this._speakThenListen(data.spoken_response);
    } catch (e) {
      App.showToast(e.message, 'error');
      this._setStatus('⚠️ ' + e.message);
      if (!this.state.finished) this._startListening();
    }
  },

  _finishInterview() {
    this.state.finished = true;
    if (this.state.recognition) {
      try { this.state.recognition.stop(); } catch (e) {}
    }

    const email = (typeof Auth !== 'undefined' && Auth.getEmail) ? Auth.getEmail() : null;
    if (email && typeof DB !== 'undefined') {
      const progress = DB.getProgress(email);
      const interview = progress.interview || { sessions: 0, topics: [] };
      interview.sessions = (interview.sessions || 0) + 1;
      DB.saveProgress(email, { interview });
    }

    const avgScore = this.state.scores.length
      ? (this.state.scores.reduce((a, b) => a + b, 0) / this.state.scores.length).toFixed(1)
      : null;

    this._setStatus('✅ Interview complete');

    const summary = document.createElement('div');
    summary.className = 'card mt-2';
    summary.innerHTML = `
      <div class="card-title">Interview Complete</div>
      <p>You answered ${this.state.questionCount} question${this.state.questionCount === 1 ? '' : 's'}.${avgScore ? ` Average score: <strong>${avgScore}/10</strong>.` : ''}</p>
      <button class="btn btn-primary" id="miRestartBtn">Start New Interview</button>
    `;
    this.container.querySelector('.card').after(summary);
    summary.querySelector('#miRestartBtn').addEventListener('click', () => {
      this._cleanup();
      this._renderIntro();
    });
  },

  _endInterview() {
    if (!this.state.finished && this.state.questionCount > 0) {
      if (!confirm('End the interview now? Your progress on this session will still be saved.')) return;
      this._finishInterview();
      return; // let the user review the summary; cleanup happens on "Start New Interview"
    }
    this._cleanup();
    this._renderIntro();
  },

  _cleanup() {
    this.state.finished = true;
    window.speechSynthesis.cancel();
    if (this.state.recognition) {
      try { this.state.recognition.stop(); } catch (e) {}
    }
    if (this.state.stopLevelMeter) {
      this.state.stopLevelMeter();
      this.state.stopLevelMeter = null;
    }
    if (this.state.stream) {
      this.state.stream.getTracks().forEach((t) => t.stop());
      this.state.stream = null;
    }
  }
};
