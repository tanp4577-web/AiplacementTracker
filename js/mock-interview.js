/* ============ Live AI Mock Interview (voice) ============
   Continuous, hands-free interview loop:
     click Start -> AI speaks -> mic auto-listens -> silence detected ->
     AI thinks -> AI speaks the follow-up -> repeat.
   No manual "record" button per turn — this is intentional so it behaves
   like a live conversation instead of a walkie-talkie.

   Step-2 upgrade (browser port of the Mark-LIII realtime voice engine):
   1. ONE continuously-hot SpeechRecognition is armed in the Start click and
      stays up for the whole session (auto re-arms on browser drop), so the
      candidate can BARGE IN while the interviewer is speaking. The rest of
      that AI turn is discarded (Mark-LIII interrupt()/_interrupted analog).
   2. Turn-taking state machine: SPEAKING -> LISTENING -> THINKING -> SPEAKING
      via state.phase. Auto-listen re-arms on the interviewer's utterance end;
      a 1.5s quiet period after the candidate's last words commits the turn.
   3. Proactive encouragement (ProactiveEngine @ interview scale): if the
      candidate goes silent ~30s after the opening, the interviewer says one
      short fresh line, then keeps listening. Never fires mid-sentence.
   4. Thinking filler (Mark-LIII "ACKNOWLEDGE BEFORE A TASK TAKES A MOMENT"):
      if composing the next question takes > 4s, one short filler is spoken.
   5. Memory & context caps (Mark-LIII memory_manager analog): only the last
      8 turns ride into each /api/interview-chat call, plus a compact
      "[WHAT YOU KNOW ABOUT THIS PERSON]" block built from saved progress.
   6. Resilient reply chain: /api/interview-chat (Gemini first, then Groq,
      server-side keys) -> Pollinations via LiveAI -> LiveAI's local
      interview brain.

   Echo caveat: barge-in relies on the browser's SpeechRecognition, which can
   sometimes hear the interviewer's own voice through speakers. Results that
   look like the words being spoken are ignored (token-overlap check). Use
   headphones for best results.
   ========================================================================== */
const MockInterview = {
  MAX_QUESTIONS: 6,
  OPENING_QUESTION: 'Tell me about yourself and your background.',
  SILENCE_MS: 1500,               // quiet period that commits the candidate's turn
  LONG_SILENCE_NUDGE_MS: 30000,   // proactive nudge if the candidate goes quiet
  THINKING_FILLER_MS: 4000,       // "let me think" line while awaiting the brain
  MAX_HISTORY_TURNS: 8,           // context cap (session_log[-8:] analog)

  state: {
    history: [],
    role: '',
    questionCount: 0,
    scores: [],
    stream: null,
    stopLevelMeter: null,
    recognition: null,
    finished: false,
    // --- Step-2 turn state machine ---
    phase: 'idle',           // idle | speaking | listening | thinking | finished
    interrupted: false,      // AI turn discarded after a barge-in
    pendingText: '',         // accumulated final transcript of the current turn
    _speakingUtter: null,    // current SpeechSynthesisUtterance (echo check)
    commitTimer: null,
    nudgeTimer: null,
    thinkTimer: null,
    srRestartTimer: null,
    explicitStop: false,     // cleanup signal: never auto-restart the recognizer
    pendingAbort: null       // in-flight /api/interview-chat AbortController
  },

  render(container) {
    this.container = container;
    this.state = {
      history: [], role: '', questionCount: 0, scores: [],
      stream: null, stopLevelMeter: null, recognition: null, finished: false,
      phase: 'idle', interrupted: false, pendingText: '', _speakingUtter: null,
      commitTimer: null, nudgeTimer: null, thinkTimer: null, srRestartTimer: null,
      explicitStop: false, pendingAbort: null,
      // --- Gemini Live full-duplex fields ---
      liveMode: false, live: null, liveAnswerCount: 0, liveWrapUp: false,
      livePendingAnswer: '', liveCommitTimer: null
    };
    this._renderIntro();
  },

  _renderIntro() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="card-title"><i class="bi bi-mic-fill text-accent" style="margin-right:6px"></i>Live AI Mock Interview</div>
        <div class="card-sub">Speak your answers out loud — the AI interviewer listens live, replies, and follows up automatically. No buttons to press mid-interview — and you can even cut in while it's speaking.</div>
        ${!SR ? '<p class="mt-2" style="color:#f87171;font-size:.85rem">Your browser does not support live speech recognition. Please use Chrome or Edge.</p>' : ''}
        <div class="mt-2">
          <label style="display:block;margin-bottom:6px;font-size:.85rem;color:var(--text-secondary,#9fb3c8)">Role you're applying for (optional)</label>
          <input type="text" id="miRole" placeholder="e.g. Frontend Developer" style="width:100%;max-width:360px" />
        </div>
        <button class="btn btn-primary mt-2" id="miStartBtn" ${!SR ? 'disabled' : ''}><i class="bi bi-mic" style="margin-right:4px"></i>Start Interview</button>
        ${typeof GeminiLive !== 'undefined' && GeminiLive.supported() ? '<button class="btn btn-ghost mt-2" id="miLiveStartBtn" style="margin-left:8px"><i class="bi bi-lightning-fill" style="margin-right:4px"></i>Start LIVE Interview (full-duplex AI)</button>' : ''}
        <p class="mt-2" style="font-size:.8rem;color:var(--text-secondary,#9fb3c8)">Requires microphone access (camera is optional, just for your own preview). The LIVE button uses Gemini's native voice — no browser speech recognition needed.</p>
      </div>
    `;
    this.container.querySelector('#miStartBtn').addEventListener('click', () => this._startInterview());
    var liveBtn = this.container.querySelector('#miLiveStartBtn');
    if (liveBtn) liveBtn.addEventListener('click', () => this._startLiveInterview());
  },
  _startInterview() {
    this.state.role = (this.container.querySelector('#miRole')?.value || '').trim();
    this.state.explicitStop = false;
    this._renderSession();

    // Speak the opening question immediately, synchronously in this click
    // handler — no awaits before this line — so the browser doesn't block it.
    const qEl = this.container.querySelector('#miQuestion');
    if (qEl) qEl.textContent = this.OPENING_QUESTION;
    this._speakThenListen(this.OPENING_QUESTION);

    // One continuously-hot recognizer, armed now: this is what enables
    // barge-in while the interviewer is still speaking.
    this._startRecognition();

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

  /** Speak text with the browser's own voice, then auto start listening at the end. */
  _speakThenListen(text) {
    if (this.state.finished) return;
    this._cancelNudge();
    this._setStatus('🔊 Interviewer speaking…');
    this.state.phase = 'speaking';
    if (!('speechSynthesis' in window)) {
      this._startListening();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1.02;
    this.state._speakingUtter = utter;
    utter.onend = () => {
      this.state._speakingUtter = null;
      if (this.state.finished) return;
      if (this.state.interrupted) { this.state.interrupted = false; return; }
      this._startListening();
    };
    utter.onerror = () => {
      this.state._speakingUtter = null;
      if (!this.state.finished && !this.state.interrupted) this._startListening();
    };
    window.speechSynthesis.speak(utter);
  },

  /** Re-arms the turn for candidate input (the recognizer keeps running underneath). */
  _startListening() {
    if (this.state.finished) return;
    this._setStatus('🎙️ Listening…');
    this.state.phase = 'listening';
    this.state.pendingText = '';
    this._refreshTranscript('');
    if (!this.state.recognition) this._startRecognition();
    this._scheduleNudge();
  },
  /* ------------------- Live speech engine (hot recognizer) ------------------- */

  /** Arms the single SpeechRecognition that stays hot for the whole session. */
  _startRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (this.state.recognition) {
      try { this.state.recognition.stop(); } catch (e) {}
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => this._onSpeechResult(e);
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        App.showToast("Microphone access was blocked. Allow it in your browser's address-bar permissions and click Start again.", 'error');
      }
      // 'no-speech' / 'aborted' happen routinely on long silences — ignore them.
    };
    rec.onend = () => {
      // Chrome drops continuous SR after long silences; re-arm it automatically
      // (Mark-LIII reconnect-loop analog) unless we're finishing up.
      if (this.state.finished || this.state.explicitStop) return;
      clearTimeout(this.state.srRestartTimer);
      this.state.srRestartTimer = setTimeout(() => this._startRecognition(), 250);
    };
    this.state.recognition = rec;
    try { rec.start(); } catch (e) { /* already running */ }
  },

  /** Every recognizer event routes through here (single source of truth). */
  _onSpeechResult(e) {
    if (this.state.finished) return;

    let interim = '', finalAdded = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalAdded += ' ' + t;
      else interim += t;
    }

    // While the interviewer is speaking we only watch for a barge-in.
    if (this.state.phase === 'speaking') {
      const heard = (finalAdded + ' ' + interim).trim();
      if (heard) this._onBargeIn(heard);
      return;
    }

    // While composing the next question we ignore input (no double commits).
    if (this.state.phase === 'thinking') return;

    // Listening: accumulate the candidate's answer.
    if (finalAdded.trim()) {
      this.state.pendingText = (this.state.pendingText + ' ' + finalAdded.trim()).trim();
    }
    this._refreshTranscript(interim);
    if ((this.state.pendingText || interim).trim()) {
      this._scheduleCommit();
      this._cancelNudge();
    }
  },

  /** The candidate started talking while the interviewer is mid-sentence. */
  _onBargeIn(heard) {
    // Echo guard: ignore recognizing our own just-spoken words via speakers.
    if (this._isEchoOfAIText(heard)) return;

    // Mark-LIII interrupt() semantics: discard the rest of the AI turn and
    // treat what was heard as the start of the candidate's answer.
    this.state.interrupted = true;
    this.state.pendingText = (this.state.pendingText + ' ' + heard).trim();
    window.speechSynthesis.cancel();
    this._cancelThinkFiller();
    this.state.phase = 'listening';
    this._setStatus('🎙️ Listening (you cut in)…');
    this._refreshTranscript('');
    this._scheduleCommit();
    this._scheduleNudge();
  },

  /** True when the recognised text is mostly the words we are speaking now. */
  _isEchoOfAIText(text) {
    const utterText = this.state._speakingUtter ? this.state._speakingUtter.text : '';
    if (!utterText) return false;
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const heard = norm(text);
    const spoken = new Set(norm(utterText));
    if (!heard.length) return true;
    let hits = 0;
    heard.forEach((w) => { if (spoken.has(w)) hits++; });
    return (hits / heard.length) > 0.65;
  },

  /** A quiet period after the candidate's last words commits their answer. */
  _scheduleCommit() {
    clearTimeout(this.state.commitTimer);
    this.state.commitTimer = setTimeout(() => {
      if (this.state.finished || this.state.phase !== 'listening') return;
      const answer = (this.state.pendingText || '').trim();
      if (!answer) return;
      this._commitAnswer();
    }, this.SILENCE_MS);
  },

  _commitAnswer() {
    this._cancelNudge();
    clearTimeout(this.state.commitTimer);
    const answer = (this.state.pendingText || '').trim();
    this.state.pendingText = '';
    const tEl = this.container.querySelector('#miTranscript');
    if (tEl) tEl.textContent = answer;
    this._handleAnswer(answer);
  },

  _refreshTranscript(interim) {
    const tEl = this.container.querySelector('#miTranscript');
    if (tEl) tEl.textContent = ((this.state.pendingText || '') + ' ' + (interim || '')).trim() || '—';
  },
  /* ------------------ Proactive nudge & thinking filler --------------------- */
  /* (ports of Mark-LIII ProactiveEngine + "acknowledge before a task")        */

  _scheduleNudge() {
    this._cancelNudge();
    if (this.state.finished || this.state.questionCount === 0) return; // never nudge before the first answer
    this.state.nudgeTimer = setTimeout(() => {
      if (this.state.finished || this.state.phase !== 'listening') return;
      if ((this.state.pendingText || '').trim()) return; // mid-sentence
      this._setStatus('💬 Encouraging…');
      const utter = new SpeechSynthesisUtterance(this._nudgeLine());
      utter.rate = 1;
      utter.pitch = 1.02;
      utter.onend = () => { if (!this.state.finished) this._startListening(); };
      window.speechSynthesis.speak(utter);
    }, this.LONG_SILENCE_NUDGE_MS);
  },

  _cancelNudge() {
    clearTimeout(this.state.nudgeTimer);
  },

  /** Rotating short encouragements (ProactiveEngine rotation analog). */
  _nudgeLine() {
    const lines = [
      "Take your time — there's no rush.",
      "That's okay. Think it through and answer when you're ready.",
      "No pressure — just tell me what comes to mind."
    ];
    const i = (this.state.questionCount + Math.floor(Date.now() / 60000)) % lines.length;
    return lines[i];
  },

  /** If composing the next question takes > 4s, speak one short filler line. */
  _armThinkFiller() {
    this._cancelThinkFiller();
    this.state.thinkTimer = setTimeout(() => {
      if (this.state.finished || this.state.phase !== 'thinking') return;
      this._setStatus('🤔 Composing my next question…');
      if (!('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(this._thinkFillerLine());
      utter.rate = 1;
      utter.pitch = 1.02;
      utter.onend = () => { if (!this.state.finished && this.state.phase === 'thinking') this._setStatus('🤔 Thinking…'); };
      window.speechSynthesis.speak(utter);
    }, this.THINKING_FILLER_MS);
  },

  _cancelThinkFiller() {
    clearTimeout(this.state.thinkTimer);
  },

  _thinkFillerLine() {
    const lines = [
      'Let me think about that for a moment.',
      'Good — give me a second to compose the next question.',
      'Let me consider that.'
    ];
    return lines[Math.floor(Date.now() / 60000) % lines.length];
  },
  async _handleAnswer(answer) {
    this.state.phase = 'thinking';
    this._setStatus('🤔 Thinking…');
    this._cancelNudge();
    this._armThinkFiller();

    // Context cap: only the last 8 turns ride along (Mark-LIII session_log[-8:]).
    const cappedHistory = this.state.history.slice(-this.MAX_HISTORY_TURNS * 2);

    let reply = null;
    let engine = null;
    let score = null;
    let errorMsg = 'The interviewer had no response.';

    // Tier 1: /api/interview-chat — Gemini first, then Groq, keys server-side.
    try {
      const ctrl = new AbortController();
      this.state.pendingAbort = ctrl;
      const timeout = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch('/api/interview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          history: cappedHistory,
          answer,
          role: this.state.role,
          memory: this._memoryBlock()
        })
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && typeof data.spoken_response === 'string' && data.spoken_response.trim()) {
        reply = data.spoken_response.trim();
        engine = data.source || 'server';
        if (typeof data.score === 'number') score = data.score;
      } else {
        errorMsg = (data && data.error) || `Interviewer error (HTTP ${res.status}).`;
      }
    } catch (e) {
      errorMsg = (e && e.name === 'AbortError')
        ? 'The interviewer took too long to reply.'
        : ((e && e.message) || 'Network error.');
    }
    this.state.pendingAbort = null;
    this._cancelThinkFiller();

    // Tier 2: Pollinations via LiveAI (free, no key).
    if (!reply) {
      try {
        const local = await LiveAI.chatReply(this._fallbackSystemPrompt(), cappedHistory, {});
        if (local && local.trim()) { reply = local.trim(); engine = 'pollinations'; }
      } catch (e2) { /* keep going */ }
    }

    // Tier 3: local interview brain (keyword-aware, works fully offline).
    if (!reply) {
      try {
        const local = (typeof LiveAI._interviewReply === 'function') ? LiveAI._interviewReply(answer) : '';
        if (local && local.trim()) { reply = local.trim(); engine = 'local'; }
      } catch (e3) { /* keep going */ }
    }

    if (!reply) {
      App.showToast(errorMsg, 'error');
      this._setStatus('⚠️ ' + errorMsg);
      if (!this.state.finished) this._startListening();
      return;
    }

    this.state.history.push({ role: 'user', content: answer });
    this.state.history.push({ role: 'assistant', content: reply });
    if (typeof score === 'number') this.state.scores.push(score);
    this.state.questionCount++;

    const qEl = this.container.querySelector('#miQuestion');
    if (qEl) qEl.textContent = reply;

    if (this.state.questionCount >= this.MAX_QUESTIONS) {
      this._finishInterview();
      return;
    }
    this._speakThenListen(reply);
  },

  /** Compact interviewer system prompt used for the client-side fallback tiers. */
  _fallbackSystemPrompt() {
    return `You are PrepAI, a professional HR interviewer conducting a live campus placement interview.
Rules:
- Ask one follow-up question at a time based on the candidate's answer.
- Be conversational, professional, and encouraging.
- If you need a moment before continuing, first say exactly one short natural phrase.
- If the candidate seems stuck, encourage them briefly.
- Keep the question under 60 words, natural speech, no markdown and no JSON.`;
  },

  /** Compact "[WHAT YOU KNOW ABOUT THIS PERSON]" block from saved progress. */
  _memoryBlock() {
    try {
      const email = (typeof Auth !== 'undefined' && Auth.getEmail) ? Auth.getEmail() : null;
      if (email && typeof DB !== 'undefined') {
        const progress = DB.getProgress(email);
        const iv = progress && progress.interview;
        if (iv && (((iv.sessions || 0) > 0) || (iv.topics && iv.topics.length))) {
          return `Prior practice — sessions completed: ${iv.sessions || 0}; topics practiced: ${(iv.topics || []).join(', ')}.`;
        }
      }
    } catch (e) { /* no memory yet */ }
    return 'No prior interview memory yet.';
  },
  _finishInterview() {
    this.state.finished = true;
    this.state.explicitStop = true;
    clearTimeout(this.state.commitTimer);
    clearTimeout(this.state.nudgeTimer);
    clearTimeout(this.state.thinkTimer);
    clearTimeout(this.state.srRestartTimer);
    clearTimeout(this.state.liveCommitTimer);
    if (this.state.pendingAbort) {
      try { this.state.pendingAbort.abort(); } catch (e) {}
      this.state.pendingAbort = null;
    }
    if (this.state.recognition) {
      try { this.state.recognition.stop(); } catch (e) {}
    }
    if (this.state.live) {
      try { this.state.live.stop(); } catch (e) {}
      this.state.live = null;
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

    const answered = this.state.liveMode
      ? this.state.liveAnswerCount
      : this.state.questionCount;
    const summary = document.createElement('div');
    summary.className = 'card mt-2';
    summary.innerHTML = `
      <div class="card-title">Interview Complete</div>
      <p>You answered ${answered} question${answered === 1 ? '' : 's'}.${avgScore ? ` Average score: <strong>${avgScore}/10</strong>.` : ''}</p>
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
      return;
    }
    this._cleanup();
    this._renderIntro();
  },

  /* ============ Gemini Live full-duplex interview mode ============ */

  _liveSystemPrompt() {
    var now = new Date().toLocaleString('en-US', {
      weekday:'long', month:'long', day:'numeric', year:'numeric',
      hour:'numeric', minute:'2-digit', hour12:true
    });
    var role = this.state.role;
    var identity = role
      ? 'Your name is PrepAI — the AI HR interviewer for this campus placement session. The candidate is applying for the role of: '+role+'. Address them politely and professionally.'
      : 'Your name is PrepAI — the AI HR interviewer for this campus placement session. Address the candidate politely and professionally.';
    var mem = this._memoryBlock();
    var Q = this.MAX_QUESTIONS;
    return '[CURRENT DATE & TIME]\nRight now it is: '+now+'.\n\n[IDENTITY]\n'+identity+'\n\n[WHAT YOU KNOW ABOUT THIS PERSON]\n'+mem+'\n\n[LIVE VOICE INTERVIEW RULES]\n'+Q+' question'+(Q===1?'':'s')+' in this interview. You must:\n1. Open with a warm greeting, then immediately ask the first question: "Tell me about yourself."\n2. One question at a time. ALWAYS wait for the candidate to finish speaking before asking the next question.\n3. Keep each turn under 60 words. Natural spoken English. No bullet lists. No markdown. No JSON.\n4. If you need a moment to think, say one short natural sentence first, then ask the question.\n5. Be conversational, professional, and encouraging.\n6. After ALL '+Q+' answers are received, immediately deliver a concise final summary (2-3 sentences noting strengths, then 1 improvement tip), then say: "That concludes the interview. Thank you and good luck." Then stop talking — do not ask any more questions.';
  },

  async _startLiveInterview() {
    this.state.role = (this.container.querySelector('#miRole')?.value || '').trim();
    this.state.explicitStop = false;
    this.state.liveMode = true;
    this._renderSession();
    if (typeof GeminiLive === 'undefined' || !GeminiLive.supported()) {
      App.showToast('Live full-duplex voice is not available. Falling back.', 'error');
      this.state.liveMode = false;
      this._speakThenListen(this.OPENING_QUESTION);
      this._startRecognition();
      return;
    }
    this._setStatus('\u{1F7E2} Connecting to LIVE AI\u2026');
    var self = this;
    try {
      this.state.live = new GeminiLive({
        model: 'gemini-2.0-flash-live-001',
        systemInstruction: this._liveSystemPrompt(),
        voiceName: 'Puck',
        temperature: 0.7,
        onState: function(s) {
          if (s === 'talking') self._setStatus('\u{1F50A} Interviewer speaking\u2026');
          else if (s === 'listening') self._setStatus('\u{1F399}\uFE0F LIVE \u2014 listening\u2026');
          else if (s === 'connecting') self._setStatus('\u{1F7E2} Connecting\u2026');
        },
        onUserTranscript: function(text) {
          var el = self.container.querySelector('#miTranscript');
          if (el) el.textContent = text || '\u2014';
        },
        onUserUtterance: function(text) { self._liveOnUserUtterance(text); },
        onModelTurnStart: function() { self.state.phase = 'speaking'; },
        onModelText: function(text) {
          var el = self.container.querySelector('#miQuestion');
          if (el) el.textContent = text || '\u2014';
        },
        onModelTurn: function(text) { self._liveOnModelTurn(text); },
        onModelInterrupted: function() {
          self.state.interrupted = true;
          clearTimeout(self.state.liveCommitTimer);
          self.state.livePendingAnswer = '';
          self.state.phase = 'listening';
        },
        onError: function(msg, fatal) {
          App.showToast('Live AI: ' + msg, fatal ? 'error' : 'warning');
          if (fatal) self._handleLiveFailure();
        }
      });
      await this.state.live.start();
      this._setStatus('\u{1F399}\uFE0F LIVE \u2014 interviewer is introducing\u2026');
    } catch (e) {
      App.showToast('Live AI failed to start: ' + ((e && e.message) || e), 'error');
      this._handleLiveFailure();
    }
  },

  _liveOnUserUtterance(text) {
    if (this.state.finished || !this.state.live) return;
    var t = (text || '').trim();
    if (!t) return;
    this.state.phase = 'listening';
    this.state.livePendingAnswer = (this.state.livePendingAnswer + ' ' + t).trim();
    var el = this.container.querySelector('#miTranscript');
    if (el) el.textContent = this.state.livePendingAnswer;
    clearTimeout(this.state.liveCommitTimer);
    var self = this;
    this.state.liveCommitTimer = setTimeout(function() {
      if (self.state.finished || !self.state.live) return;
      var answer = (self.state.livePendingAnswer || '').trim();
      if (!answer) return;
      self.state.livePendingAnswer = '';
      self._liveCommitAnswer(answer);
    }, this.SILENCE_MS);
  },

  _liveCommitAnswer(answer) {
    this.state.history.push({ role: 'user', content: answer });
    this.state.liveAnswerCount++;
    clearTimeout(this.state.liveCommitTimer);
    this._liveScoreAnswer(answer);
    if (this.state.liveAnswerCount >= this.MAX_QUESTIONS) {
      this.state.liveWrapUp = true;
    }
    var el = this.container.querySelector('#miTranscript');
    if (el) el.textContent = '\u2014';
  },

  _liveOnModelTurn(text) {
    if (this.state.finished) return;
    var t = (text || '').trim();
    if (!t) return;
    this.state.history.push({ role: 'assistant', content: t });
    var el = this.container.querySelector('#miQuestion');
    if (el) el.textContent = t;
    this.state.questionCount++;
    if (this.state.liveWrapUp) {
      this._finishInterview();
      return;
    }
    this.state.phase = 'listening';
    this._setStatus('\u{1F399}\uFE0F LIVE \u2014 listening\u2026');
  },

  async _liveScoreAnswer(answer) {
    try {
      var capped = this.state.history.slice(-this.MAX_HISTORY_TURNS * 2);
      var ctrl = new AbortController();
      var to = setTimeout(function() { ctrl.abort(); }, 20000);
      var res = await fetch('/api/interview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          history: capped, answer: answer,
          role: this.state.role, memory: this._memoryBlock()
        })
      });
      clearTimeout(to);
      var data = await res.json().catch(function() { return {}; });
      if (res.ok && typeof data.score === 'number') this.state.scores.push(data.score);
    } catch (e) { /* scoring is best-effort */ }
  },

  _handleLiveFailure() {
    if (this.state.live) { try { this.state.live.stop(); } catch (e) {} this.state.live = null; }
    this.state.liveMode = false;
    this.state.liveWrapUp = false;
    this.state.liveAnswerCount = 0;
    clearTimeout(this.state.liveCommitTimer);
    this._setStatus('\u{1F399}\uFE0F Listening\u2026');
    this._speakThenListen(this.OPENING_QUESTION);
    this._startRecognition();
  },

  _cleanup() {
    this.state.finished = true;
    this.state.explicitStop = true;
    clearTimeout(this.state.commitTimer);
    clearTimeout(this.state.nudgeTimer);
    clearTimeout(this.state.thinkTimer);
    clearTimeout(this.state.srRestartTimer);
    clearTimeout(this.state.liveCommitTimer);
    if (this.state.pendingAbort) {
      try { this.state.pendingAbort.abort(); } catch (e) {}
      this.state.pendingAbort = null;
    }
    window.speechSynthesis.cancel();
    if (this.state.recognition) {
      try { this.state.recognition.stop(); } catch (e) {}
    }
    if (this.state.live) {
      try { this.state.live.stop(); } catch (e) {}
      this.state.live = null;
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