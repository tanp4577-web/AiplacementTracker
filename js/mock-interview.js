/* ============ Live AI Mock Interview (voice) ============
   Wires the existing LiveAI engine (js/live-voice.js) and the existing
   /api/interview-chat + /api/stt + /api/tts endpoints into an actual
   interview session: record answer -> transcribe -> AI follow-up -> speak
   -> repeat. Nothing in live-voice.js or the API layer is modified.
   ========================================================================== */
const MockInterview = {
  MAX_QUESTIONS: 6,
  OPENING_QUESTION: 'Tell me about yourself and your background.',

  state: {
    history: [],
    role: '',
    questionCount: 0,
    scores: [],
    stream: null,
    stopLevelMeter: null,
    recording: false,
    finished: false
  },

  render(container) {
    this.container = container;
    this.state = {
      history: [], role: '', questionCount: 0, scores: [],
      stream: null, stopLevelMeter: null, recording: false, finished: false
    };
    this._renderIntro();
  },

  _renderIntro() {
    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="card-title"><i class="bi bi-mic-fill text-accent" style="margin-right:6px"></i>Live AI Mock Interview</div>
        <div class="card-sub">Speak your answers out loud — the AI interviewer listens, replies, and asks relevant follow-ups.</div>
        <div class="mt-2">
          <label style="display:block;margin-bottom:6px;font-size:.85rem;color:var(--text-secondary,#9fb3c8)">Role you're applying for (optional)</label>
          <input type="text" id="miRole" placeholder="e.g. Frontend Developer" style="width:100%;max-width:360px" />
        </div>
        <button class="btn btn-primary mt-2" id="miStartBtn"><i class="bi bi-camera-video" style="margin-right:4px"></i>Start Interview</button>
        <p class="mt-2" style="font-size:.8rem;color:var(--text-secondary,#9fb3c8)">Requires microphone (camera optional) access. Works best in Chrome or Edge.</p>
      </div>
    `;
    this.container.querySelector('#miStartBtn').addEventListener('click', () => this._startInterview());
  },

  async _startInterview() {
    this.state.role = (this.container.querySelector('#miRole')?.value || '').trim();

    if (!LiveAI.isSecureContext()) {
      App.showToast('Camera/microphone requires HTTPS (or localhost).', 'error');
      return;
    }

    let stream;
    try {
      stream = await LiveAI.enableCamera(true, true);
    } catch (e) {
      try {
        stream = await LiveAI.enableCamera(true, false); // retry audio-only
      } catch (e2) {
        App.showToast('Microphone access is required for the live interview: ' + (e2.message || e.message), 'error');
        return;
      }
    }
    this.state.stream = stream;

    this._renderSession();

    const videoEl = this.container.querySelector('#miVideo');
    if (videoEl && stream.getVideoTracks().length) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    } else if (videoEl) {
      videoEl.style.display = 'none';
    }

    this.state.stopLevelMeter = await LiveAI.startLevelMeter(stream, (level) => {
      const bar = this.container.querySelector('#miLevelBar');
      if (bar) bar.style.width = Math.round(level * 100) + '%';
    });

    this._showOpeningQuestion();
  },

  _renderSession() {
    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div class="card-title"><i class="bi bi-mic-fill text-accent" style="margin-right:6px"></i>Live AI Mock Interview</div>
          <div id="miStatus" style="font-size:.85rem;color:var(--text-secondary,#9fb3c8)">Ready</div>
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
              <div style="font-size:.75rem;color:var(--text-secondary,#9fb3c8);margin-bottom:6px">YOUR LAST ANSWER</div>
              <div id="miTranscript" style="font-size:.95rem;font-style:italic;color:#7dd3fc">—</div>
            </div>
          </div>
        </div>
        <div class="mt-2">
          <button class="btn btn-primary" id="miRecordBtn" disabled><i class="bi bi-mic" style="margin-right:4px"></i>Record Answer</button>
          <button class="btn btn-ghost" id="miEndBtn">End Interview</button>
        </div>
      </div>
    `;
    this.container.querySelector('#miRecordBtn').addEventListener('click', () => this._toggleRecording());
    this.container.querySelector('#miEndBtn').addEventListener('click', () => this._endInterview());
  },

  _setStatus(text) {
    const el = this.container.querySelector('#miStatus');
    if (el) el.textContent = text;
  },

  _showOpeningQuestion() {
    const qEl = this.container.querySelector('#miQuestion');
    if (qEl) qEl.textContent = this.OPENING_QUESTION;
    this._setStatus('🔊 Interviewer speaking…');
    LiveAI.speakResponse(this.OPENING_QUESTION, {
      onend: () => {
        this._setStatus('Ready — click Record Answer');
        const btn = this.container.querySelector('#miRecordBtn');
        if (btn) btn.disabled = false;
      }
    });
  },

  async _toggleRecording() {
    const btn = this.container.querySelector('#miRecordBtn');
    if (!this.state.recording) {
      const result = await LiveAI.startRecording();
      if (!result.ok) {
        App.showToast('Could not start recording: ' + (result.error || 'unknown error'), 'error');
        return;
      }
      this.state.recording = true;
      btn.innerHTML = '<i class="bi bi-stop-fill" style="margin-right:4px"></i>Stop & Submit';
      this._setStatus('🎙️ Recording your answer…');
    } else {
      this.state.recording = false;
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-mic" style="margin-right:4px"></i>Record Answer';
      this._submitAnswer();
    }
  },

  async _submitAnswer() {
    this._setStatus('⏳ Processing…');

    const result = await LiveAI.runRecordedInteraction(this.state.history, {
      role: this.state.role,
      onState: (s) => {
        const labels = {
          recording: '⏳ Finishing recording…',
          transcribing: '📝 Transcribing…',
          thinking: '🤔 Thinking…',
          speaking: '🔊 Interviewer speaking…',
          idle: 'Ready — click Record Answer',
          error: '⚠️ Something went wrong'
        };
        this._setStatus(labels[s] || s);
        // Only re-enable once the AI has actually finished speaking (idle) or failed —
        // not right when the network call resolves, so the candidate can't talk over it.
        if ((s === 'idle' || s === 'error') && !this.state.finished && this.state.questionCount < this.MAX_QUESTIONS) {
          const btn = this.container.querySelector('#miRecordBtn');
          if (btn) btn.disabled = false;
        }
      },
      onError: (msg) => App.showToast(msg, 'error')
    });

    if (result.error) return; // onState('error') already re-enabled the button

    this.state.history.push({ role: 'user', content: result.text });
    this.state.history.push({ role: 'assistant', content: result.spoken_response });
    if (typeof result.score === 'number') this.state.scores.push(result.score);
    this.state.questionCount++;

    const tEl = this.container.querySelector('#miTranscript');
    if (tEl) tEl.textContent = result.text;
    const qEl = this.container.querySelector('#miQuestion');
    if (qEl) qEl.textContent = result.spoken_response;

    if (this.state.questionCount >= this.MAX_QUESTIONS) {
      this._finishInterview();
    }
  },

  _finishInterview() {
    this.state.finished = true;

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
    const btn = this.container.querySelector('#miRecordBtn');
    if (btn) { btn.disabled = true; btn.style.display = 'none'; }

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
    LiveAI.stopSpeaking();
    if (this.state.recording) {
      LiveAI.stopRecording().catch(() => {});
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
