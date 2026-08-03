/* ============================================================================
   LIVE Conversational Interviewer
   Replaces the old static 7-question script with a truly interactive,
   real-time voice conversation. AI speaks -> auto-listens -> captures your
   live speech -> AI thinks (via Vercel serverless /api/interview-chat powered
   by Google Gemini) -> replies conversationally -> speaks -> continues.
   Camera + microphone stay on throughout the entire session.
   ========================================================================== */
const Interview = {
  state: {
    running: false,
    stream: null,
    camActive: false,
    cleanupLevel: null,
    history: [],
    turnCount: 0,
    interviewType: 'general',
    jobRole: 'General Software Engineer',
    _conversationActive: false,
    _inAIReply: false,
    _micOn: false,
    _pendingMicStart: false
  },

  /* ---------- Cleanup ---------- */
  cleanup() {
    LiveAI.stopSpeaking();
    LiveAI.stopListening();
    this.state.running = false;
    this.state._conversationActive = false;
    this.state._inAIReply = false;
    this.state._micOn = false;
    this.state._pendingMicStart = false;
    if (this.state.cleanupLevel) this.state.cleanupLevel();
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(t => t.stop());
      this.state.stream = null;
    }
    this.state.camActive = false;
    this.state.history = [];
  },

  render(container) {
    this.container = container;
    this.cleanup();
    this._renderIntro();
  },

  _renderIntro() {
    const isSecure = LiveAI.isSecureContext();
    const srSupported = LiveAI.speechRecognitionSupported();
    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">LIVE AI Interview Simulator</div>
          <div class="card-sub">
            Real-time voice conversation · AI listens & responds dynamically
            <span class="chip ${isSecure ? 'green' : 'red'}" style="margin-left:8px">
              ${isSecure ? 'Camera ready' : 'Camera needs HTTPS'}
            </span>
            <span class="chip ${srSupported ? 'green' : 'red'}" style="margin-left:6px">
              ${srSupported ? 'Voice input ready' : 'Voice input unsupported'}
            </span>
          </div>

          ${!srSupported ? `
            <div class="explanation" style="margin-top:8px;font-size:12px;border-color:rgba(209,72,63,0.4);background:rgba(209,72,63,0.08)">
              ⚠ Your browser does not support the Web Speech API (SpeechRecognition).
              Voice-to-text won't work here — please use Chrome, Edge, or another Chromium browser.
              The AI interviewer will still speak aloud and you can type your answers below.
            </div>` : ''}

          <!-- Camera Preview -->
          <div class="monitor-preview large" id="camPreview">
            <div class="monitor-badge"><span class="pulse-dot"></span> CAMERA</div>
            <video id="camVideo" autoplay muted playsinline></video>
            <div class="monitor-overlay" id="camOverlay">
              <div class="monitor-status">
                <span class="pulse-dot"></span>
                <span id="camStatusText">${isSecure ? 'Click Start to enable camera & mic' : 'Open via HTTPS/Localhost for camera'}</span>
              </div>
            </div>
          </div>
          ${!isSecure ? '<div class="explanation" style="margin-top:8px;font-size:12px">⚠ Camera & microphone require HTTPS or localhost. Voice chat still works without camera.</div>' : ''}

          <!-- Job role selector -->
          <div class="divider"></div>
          <label class="field-label" for="jobRoleSelect">Target Job Role</label>
          <select id="jobRoleSelect">
            <option value="General Software Engineer">General Software Engineer</option>
            ${typeof ROLE_NAMES !== 'undefined' ? ROLE_NAMES.map(r => `<option value="${r}">${r}</option>`).join('') : ''}
            <option value="SDE (Software Development Engineer)">SDE (Software Development Engineer)</option>
            <option value="Data Analyst">Data Analyst</option>
            <option value="Backend Developer">Backend Developer</option>
            <option value="Frontend Developer">Frontend Developer</option>
            <option value="DevOps Engineer">DevOps Engineer</option>
          </select>

          <!-- Transcript -->
          <div class="divider"></div>
          <div class="card-title" style="font-size:13px">Live Transcript</div>
          <div class="transcript-box" id="transcriptBox">
            <div class="transcript-empty" id="transcriptEmpty">The AI interviewer will speak. Your voice will appear here in real time.</div>
          </div>

          <!-- Controls -->
          <div class="voice-controls" style="margin-top:12px">
            <button class="btn btn-primary" id="startBtn">▶ Start Interview</button>
            <button class="btn btn-ghost" id="endBtn" style="display:none">⏹ End</button>
            <button class="voice-btn" id="micToggleBtn" style="display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              <span id="micToggleLabel">🎤 Mic: Auto</span>
            </button>
            <button class="voice-btn active" id="speakerToggleBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              AI Voice: On
            </button>
          </div>
          <div class="mic-hint" id="micHint">${srSupported
            ? 'The AI will listen to you automatically after asking a question.'
            : 'Voice input is unsupported — type your answer in the box below.'}</div>

          ${!srSupported ? `
            <div class="mt-2">
              <textarea id="typedAnswer" placeholder="Type your spoken answer here..." style="min-height:70px"></textarea>
              <button class="btn btn-ghost btn-sm mt-1" id="sendTypedBtn">Send Answer</button>
            </div>` : ''}

          <!-- Info -->
          <p class="text-dim mt-2" style="font-size:13px;line-height:1.6">
            <b style="color:var(--text)">How it works:</b> The AI interviewer (powered by Google Gemini via a Vercel serverless function)
            holds a natural conversation with you. It speaks, then listens to your response, thinks, and replies — just like a real interview.
            Falls back to a smart local brain when the server isn't configured.
          </p>
        </div>
        <div class="card">
          <div class="card-title">Session Info</div>
          <div class="card-sub">Interview quality metrics</div>
          <div id="sessionInfo">
            <div class="empty-state">
              <div class="es-icon">🎙</div>
              <h3>Ready</h3>
              <p>Start the interview to begin the live conversation</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('startBtn').addEventListener('click', () => this._startSession());
    document.getElementById('endBtn').addEventListener('click', () => {
      this.cleanup();
      this._renderIntro();
    });
    document.getElementById('micToggleBtn').addEventListener('click', (e) => this._toggleMic(e));
    document.getElementById('speakerToggleBtn').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const on = !btn.classList.contains('active');
      btn.classList.toggle('active', on);
      btn.lastChild.textContent = on ? ' AI Voice: On' : ' AI Voice: Off';
      if (!on) LiveAI.stopSpeaking();
    });
    const roleSel = document.getElementById('jobRoleSelect');
    if (roleSel) {
      roleSel.addEventListener('change', () => {
        this.state.jobRole = roleSel.value;
      });
    }
    const sendTyped = document.getElementById('sendTypedBtn');
    if (sendTyped) {
      sendTyped.addEventListener('click', () => {
        const ta = document.getElementById('typedAnswer');
        const text = (ta && ta.value.trim()) || '';
        if (!text) return;
        ta.value = '';
        this._addTranscript('user', text);
        this._handleUserReply(text);
      });
    }
  },

  _toggleMic(e) {
    if (!this.state.running) return;
    const btn = e.currentTarget;
    this.state._micOn = !this.state._micOn;
    if (this.state._micOn) {
      btn.classList.add('listening');
      document.getElementById('micToggleLabel').textContent = '🎤 Mic: Listening';
      this._startListening();
    } else {
      btn.classList.remove('listening');
      document.getElementById('micToggleLabel').textContent = '🎤 Mic: Paused';
      LiveAI.stopListening();
      const hint = document.getElementById('micHint');
      if (hint) hint.textContent = 'Mic paused — click the mic button to answer.';
    }
  },

  async _startSession() {
    this.state.running = true;
    this.state.history = [];
    this.state.turnCount = 0;
    this.state._conversationActive = true;
    // Mic starts in "auto-listen" mode (matches the "Mic: Auto" label).
    // The user can pause it later with the mic toggle button.
    this.state._micOn = true;

    const startBtn = document.getElementById('startBtn');
    const endBtn = document.getElementById('endBtn');
    const micBtn = document.getElementById('micToggleBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (endBtn) endBtn.style.display = 'inline-flex';
    if (micBtn) micBtn.style.display = 'inline-flex';

    // Try camera + mic
    if (LiveAI.isSecureContext()) {
      try {
        // audio:true enables the microphone (the previous bug was audio:false)
        this.state.stream = await LiveAI.enableCamera(true, true);
        const video = document.getElementById('camVideo');
        if (video) video.srcObject = this.state.stream;
        this.state.camActive = true;
        const overlay = document.getElementById('camOverlay');
        if (overlay) overlay.classList.add('active');
        const status = document.getElementById('camStatusText');
        if (status) status.textContent = 'Live — AI Interviewer';
        // Start audio level meter
        this.state.cleanupLevel = await LiveAI.startLevelMeter(this.state.stream, (level) => {
          const wave = document.getElementById('audioWave');
          if (wave) wave.style.transform = `scaleY(${0.5 + level * 2})`;
        });
      } catch (e) {
        const status = document.getElementById('camStatusText');
        if (status) {
          if (e.message === 'secure-context') status.textContent = 'Camera needs HTTPS/localhost';
          else status.textContent = 'Camera/mic unavailable — continuing with voice only';
        }
      }
    }

    // Begin conversation — the opening question is generated LIVE by the AI,
    // never hardcoded. Falls back to a dynamic local opener only when offline.
    this._sendAIReply('', true);
  },

  /**
   * Send the user's answer to the live AI and speak the AI's reply.
   * @param {string} text  The candidate's answer ('' for the opening question)
   * @param {boolean} isOpening  Whether this is the first AI message
   */
  async _sendAIReply(text, isOpening = false) {
    if (!this.state._conversationActive) return;
    const hint = document.getElementById('micHint');
    if (hint) hint.textContent = isOpening ? '🤔 AI is preparing your first question...' : '🤔 AI is thinking...';

    const jobRole = this.state.jobRole || 'General Software Engineer';

    // Build full history + a live AI opener request
    const system = `You are a friendly but professional HR interviewer conducting a live mock interview for a candidate targeting the role of "${jobRole}". Ask ONE question at a time, keep each reply to 2-3 sentences (max 60 words). Listen to the candidate's actual answer and ask a natural, relevant follow-up based on what they said — never repeat a question, never fall back to a fixed script. Vary questions across: introduction, experience, projects, strengths & weaknesses, behavioral/STAR scenarios, technical depth, and career goals. Around turn 6-7 begin wrapping up, ask if they have questions, then close warmly. Keep tone warm and professional, no markdown.`;

    let reply = null;

    // 1) Vercel serverless Gemini (when deployed with LLM_API_KEY)
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch('/api/interview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: this.state.history,
          jobRole: this.state.jobRole
        }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data && data.reply && data.reply.trim()) {
          reply = data.reply.trim();
        }
      }
    } catch (e) {
      // network / server unavailable — fall through to live browser AI
    }

    // 2) Free keyless live LLM (Pollinations) directly from the browser —
    //    send the FULL history so follow-ups stay context-aware.
    if (!reply) {
      const historyForAI = isOpening
        ? [{ role: 'user', content: 'Please open the interview. Ask me the first question about my background and what brings me here.' }]
        : this.state.history.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.text }));
      reply = await LiveAI.chatReply(system, historyForAI);
    }

    if (!reply || !reply.trim()) {
      reply = isOpening
        ? `Hello! I am your AI interviewer today. To begin, could you tell me about yourself, your background, and what brings you here for the ${jobRole} role?`
        : 'Thank you for sharing that. Could you give me a concrete example that illustrates your point?';
    }

    this.state.history.push({ role: 'ai', text: reply });
    this._addTranscript('ai', reply);
    if (hint) hint.textContent = '';

    // Check if wrap-up
    if (/(report|feedback|wrap|thank you for.*session|conclude)/i.test(reply) || this.state.turnCount >= 7) {
      this._showReport();
    } else {
      this._speakAndListen(reply);
    }
  },

  /* ---------- Speak + Auto-Listen ---------- */
  _speakAndListen(text) {
    const btn = document.getElementById('speakerToggleBtn');
    const voiceOn = !btn || btn.classList.contains('active');
    this.state._inAIReply = true;

    if (voiceOn) {
      LiveAI.speak(text, {
        onend: () => {
          this.state._inAIReply = false;
          // Only auto-listen if mic isn't manually paused
          if (this.state._micOn || !document.getElementById('micToggleBtn')) {
            this._startListening();
          } else if (document.getElementById('micToggleBtn') && !this.state._micOn) {
            const hint = document.getElementById('micHint');
            if (hint) hint.textContent = 'Mic paused — click the mic button to answer.';
          }
        }
      });
    } else {
      this.state._inAIReply = false;
      setTimeout(() => {
        if (this.state._micOn || !document.getElementById('micToggleBtn')) this._startListening();
      }, 800);
    }
  },

  _startListening() {
    if (!this.state._conversationActive) return;
    const hint = document.getElementById('micHint');
    // If SpeechRecognition is unavailable (e.g. Safari), don't show a fake
    // "listening" state — direct the user to the typed-answer fallback.
    if (!LiveAI.speechRecognitionSupported()) {
      if (hint) hint.textContent = 'Voice input unsupported in this browser — please type your answer below.';
      return;
    }
    if (hint) hint.textContent = '🎤 Listening... (speak your answer naturally)';
    const micBtn = document.getElementById('micToggleBtn');
    if (micBtn) {
      micBtn.classList.add('listening');
      const lbl = document.getElementById('micToggleLabel');
      if (lbl) lbl.textContent = '🎤 Mic: Listening';
    }

    LiveAI.startListening({
      autoRestart: false,
      silenceMs: 2000,
      onState: (state) => {
        if (state === 'listening') {
          if (hint) hint.textContent = '🎤 Listening... (speak naturally)';
        } else if (state === 'idle') {
          if (hint) hint.textContent = 'Processing your answer...';
        } else if (state === 'blocked') {
          if (hint) hint.textContent = '⚠ Microphone blocked. Please allow mic access in your browser settings.';
        }
      },
      onInterim: (data) => {
        // Show live interim text
        const box = document.getElementById('transcriptBox');
        if (box) {
          let last = box.querySelector('.transcript-user-interim');
          if (!last) {
            last = document.createElement('div');
            last.className = 'transcript-msg user interim';
            last.id = 'interimMsg';
            box.appendChild(last);
            box.scrollTop = box.scrollHeight;
          }
          last.textContent = data.final + data.interim;
        }
      },
      onFinal: (data) => {
        if (data.final === 'AUTO_STOP') {
          // Use whatever was captured
          const interim = document.getElementById('interimMsg');
          const text = interim ? interim.textContent.trim() : '';
          if (text) {
            this._addTranscript('user', text);
            this._handleUserReply(text);
          } else {
            if (hint) hint.textContent = 'I did not catch that — could you try again?';
            setTimeout(() => {
              if (this.state._micOn) this._startListening();
            }, 1200);
          }
          if (interim) interim.remove();
        }
      }
    });
  },

  /* ---------- Send answer to the live AI ---------- */
  async _handleUserReply(text) {
    if (!this.state._conversationActive) return;
    this.state.turnCount++;
    this.state.history.push({ role: 'user', text });
    this._sendAIReply(text, false);
  },

  _addTranscript(role, text) {
    const box = document.getElementById('transcriptBox');
    if (!box) return;
    const empty = document.getElementById('transcriptEmpty');
    if (empty) empty.style.display = 'none';

    const div = document.createElement('div');
    div.className = `transcript-msg ${role === 'ai' ? 'ai' : 'user'}`;

    const label = document.createElement('div');
    label.className = 'transcript-label';
    label.textContent = role === 'ai' ? '🤖 AI Interviewer' : '👤 You';

    const content = document.createElement('div');
    content.className = 'transcript-text';
    content.textContent = text;

    div.appendChild(label);
    div.appendChild(content);
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  _showReport() {
    this.cleanup();
    const startBtn = document.getElementById('startBtn');
    const endBtn = document.getElementById('endBtn');
    const micBtn = document.getElementById('micToggleBtn');
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (endBtn) endBtn.style.display = 'none';
    if (micBtn) micBtn.style.display = 'none';

    const box = document.getElementById('transcriptBox');
    if (box) {
      const empty = document.getElementById('transcriptEmpty');
      if (empty) empty.style.display = 'none';
    }

    const sessionInfo = document.getElementById('sessionInfo');
    if (sessionInfo) {
      const turns = this.state.history.filter(h => h.role === 'user').length;
      const words = this.state.history.filter(h => h.role === 'user').reduce((s, h) => s + (h.text || '').split(/\s+/).length, 0);
      sessionInfo.innerHTML = `
        <div class="card-stat" style="font-size:36px">${turns}</div>
        <div class="card-stat-label">Responses Given</div>
        <div class="divider"></div>
        <div class="card-stat" style="font-size:36px;color:var(--success)">${words}</div>
        <div class="card-stat-label">Total Words Spoken</div>
        <div class="divider"></div>
        <div class="mt-2">
          <div class="card-title mb-1">AI Interviewer Feedback</div>
          <div class="rec-item">
            <div class="rec-icon">✅</div>
            <div class="rec-text">You completed a live conversational interview with real-time voice interaction.</div>
          </div>
          <div class="rec-item">
            <div class="rec-icon">💡</div>
            <div class="rec-text">The AI adapted its questions to your answers — no scripted questions.</div>
          </div>
          <div class="rec-item">
            <div class="rec-icon">📈</div>
            <div class="rec-text">Practice regularly to improve your confidence and articulation.</div>
          </div>
        </div>
        <button class="btn btn-primary btn-block mt-2" id="restartBtn">Start New Interview</button>
      `;
      const rb = sessionInfo.querySelector('#restartBtn');
      if (rb) rb.addEventListener('click', () => this._renderIntro());
    }

    // Save progress
    const email = Auth.getEmail();
    if (email) {
      const prog = DB.getProgress(email);
      const interview = prog.interview || { sessions: 0, topics: [] };
      interview.sessions++;
      if (!interview.topics.includes(this.state.jobRole)) interview.topics.push(this.state.jobRole);
      DB.saveProgress(email, { interview });
      App.refreshAll();
    }
  }
};

