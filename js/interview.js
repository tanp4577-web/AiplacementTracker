/* ============================================================================
   Live 1-on-1 AI HR Interview Simulator  —  PlacementPrep
   Dual-panel split screen: candidate camera left / AI avatar right.
   Uses Web Speech API (SpeechRecognition + SpeechSynthesis) + LiveAI engine.
   Features: camera toggle, real-time transcript, AI voice, dynamic questions,
   post-interview performance summary with communication score.
   ============================================================================ */
const Interview = {
  state: {
    running: false,
    stream: null,
    camActive: false,
    camEnabled: true,
    micEnabled: true,
    cleanupLevel: null,
    history: [],
    turnCount: 0,
    interviewType: 'general',
    jobRole: 'General Software Engineer',
    customQuestions: [],
    _conversationActive: false,
    _inAIReply: false,
    _micOn: false,
    _speakerOn: true,
    _wordCounts: [],       // wpm per turn
    _startTime: null,
    _recorder: null,
    _recordChunks: [],
    _recordStart: null,
    _uploading: false,
    _uploadEndpoint: 'http://localhost:5000/upload-proof'
  },

  /* ═══ Secret Session Recording (unchanged from original) ═══ */
  _startRecording() {
    if (!this.state.stream) return;
    if (typeof MediaRecorder === 'undefined') return;
    try {
      this.state._recordChunks = [];
      this.state._recordStart = Date.now();
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
      this.state._recorder = mime
        ? new MediaRecorder(this.state.stream, { mimeType: mime, videoBitsPerSecond: 2500000 })
        : new MediaRecorder(this.state.stream);
      this.state._recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) this.state._recordChunks.push(e.data);
      };
      this.state._recorder.start(1000);
    } catch (e) {
      this.state._recorder = null;
    }
  },

  _stopRecording() {
    return new Promise(resolve => {
      const rec = this.state._recorder;
      if (!rec || rec.state === 'inactive') {
        this.state._recorder = null;
        return resolve(null);
      }
      rec.onstop = () => {
        const blob = new Blob(this.state._recordChunks, { type: rec.mimeType || 'video/webm' });
        this.state._recorder = null;
        this.state._recordChunks = [];
        resolve(blob);
      };
      try { rec.stop(); } catch { resolve(null); }
    });
  },

  async _finalizeRecording() {
    const blob = await this._stopRecording();
    if (blob && blob.size) await this._uploadRecording(blob);
  },

  async _uploadRecording(blob) {
    if (!blob || !blob.size) return;
    this.state._uploading = true;
    const email = (typeof Auth !== 'undefined' && Auth.getEmail) ? Auth.getEmail() : 'user';
    const safeEmail = String(email || 'user').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const form = new FormData();
    form.append('video', blob, `${safeEmail}_interview_${ts}.webm`);
    form.append('user_id', safeEmail);
    try {
      const res = await fetch(this.state._uploadEndpoint, { method: 'POST', body: form });
      if (!res.ok) console.warn('Recording upload non-OK:', res.status);
    } catch { }
    finally { this.state._uploading = false; }
  },

  /* ═══ Cleanup ═══ */
  cleanup() {
    LiveAI.stopSpeaking();
    LiveAI.stopListening();
    this.state.running = false;
    this.state._conversationActive = false;
    this.state._inAIReply = false;
    this.state._micOn = false;
    if (this.state.cleanupLevel) { try { this.state.cleanupLevel(); } catch { } this.state.cleanupLevel = null; }
    if (this.state.stream) {
      try { this.state.stream.getTracks().forEach(t => t.stop()); } catch { }
      this.state.stream = null;
    }
    this.state.camActive = false;
    this.state.history = [];
    this.state._wordCounts = [];
    this.state._startTime = null;
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      document.removeEventListener('keyup', this._keyupHandler);
    }
  },

  /* ═══ Entry Point ═══ */
  render(container) {
    this.container = container;
    this._keydownHandler = this._onKeyDown.bind(this);
    this._keyupHandler = this._onKeyUp.bind(this);
    this.cleanup();
    this._renderIntro();
  },

  /* ═══ Intro / Setup Panel ═══ */
  _renderIntro() {
    const isSecure = LiveAI.isSecureContext();
    const srSupported = LiveAI.speechRecognitionSupported();

    this.container.innerHTML = `
      <div class="live-interview-layout">

        <!-- LEFT PANEL: Candidate Camera -->
        <div class="li-panel li-panel-left">
          <div class="li-panel-label">
            <span class="pulse-dot" id="camPulse" style="background:var(--text-dim)"></span>
            CANDIDATE
          </div>

          <!-- Camera Feed -->
          <div class="li-cam-wrap" id="liCamWrap">
            <video id="liCamVideo" autoplay muted playsinline></video>
            <div class="li-cam-overlay" id="liCamOverlay">
              <div class="li-cam-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="opacity:.35">
                  <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>
                </svg>
                <p>${isSecure ? 'Camera will appear here' : 'HTTPS required for camera'}</p>
              </div>
            </div>
            <!-- Camera Controls -->
            <div class="li-cam-controls" id="liCamControls" style="display:none">
              <button class="cam-btn active" id="liCamToggle" title="Toggle camera">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M23 7 16 12l7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              </button>
              <button class="cam-btn active" id="liMicToggleBtn" title="Toggle microphone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            </div>
            <!-- Audio Level Bar -->
            <div class="li-audio-level" id="liAudioLevel" style="display:none">
              <div class="li-audio-fill" id="liAudioFill"></div>
            </div>
          </div>

          <!-- Live Transcript -->
          <div class="li-section-label">Live Transcript</div>
          <div class="transcript-box" id="transcriptBox" style="height:230px">
            <div class="transcript-empty" id="transcriptEmpty">Conversation transcript will appear here once started.</div>
          </div>

          ${!srSupported ? `
            <div class="explanation mt-1" style="font-size:12px;border-color:rgba(209,72,63,0.4);background:rgba(209,72,63,0.08)">
              ⚠ Web Speech API unsupported — use Chrome or Edge for voice input.
              You can type your answers below.
            </div>
            <div class="mt-1">
              <textarea id="typedAnswer" placeholder="Type your answer here..." style="min-height:60px"></textarea>
              <button class="btn btn-ghost btn-sm mt-1" id="sendTypedBtn">Send Answer ➤</button>
            </div>` : ''}
        </div>

        <!-- RIGHT PANEL: AI Interviewer -->
        <div class="li-panel li-panel-right">
          <div class="li-panel-label">
            <span class="pulse-dot" id="aiPulse" style="background:var(--text-dim)"></span>
            AI INTERVIEWER
          </div>

          <!-- AI Avatar -->
          <div class="li-ai-avatar-wrap">
            <div class="ai-agent" id="aiAgent">
              <div class="agent-ring"></div>
              <div class="agent-core" id="aiAgentCore">🤖</div>
            </div>
            <div>
              <div class="agent-name">PrepAI Interviewer</div>
              <div class="agent-status-line">
                <div class="agent-wave" id="agentWave">
                  <span></span><span></span><span></span><span></span>
                </div>
                <span id="agentStatusText">Ready to interview</span>
              </div>
            </div>
          </div>

          <!-- Role Selector -->
          <div class="divider"></div>
          <label class="field-label" for="jobRoleSelect">Target Job Role</label>
          <select id="jobRoleSelect">
            <option value="General Software Engineer">General Software Engineer</option>
            ${typeof ROLE_NAMES !== 'undefined' ? ROLE_NAMES.map(r => `<option value="${r}">${r}</option>`).join('') : ''}
            <option value="SDE (Software Development Engineer)">SDE (Software Development Engineer)</option>
            <option value="Data Analyst">Data Analyst</option>
            <option value="Product Manager">Product Manager</option>
            <option value="Backend Developer">Backend Developer</option>
            <option value="Frontend Developer">Frontend Developer</option>
            <option value="Full Stack Developer">Full Stack Developer</option>
            <option value="DevOps Engineer">DevOps Engineer</option>
            <option value="Machine Learning Engineer">Machine Learning Engineer</option>
          </select>

          <label class="field-label mt-1" for="interviewTypeSelect">Interview Style</label>
          <select id="interviewTypeSelect">
            <option value="general">General HR (Balanced)</option>
            <option value="behavioral">Behavioral (STAR Method)</option>
            <option value="technical">Technical Deep-Dive</option>
            <option value="system">System Design Focus</option>
          </select>

          <div class="divider"></div>

          <!-- Session Stats (shown during interview) -->
          <div id="sessionStats" style="display:none">
            <div class="li-stats-row">
              <div class="li-stat-box">
                <div class="li-stat-val" id="statTurns">0</div>
                <div class="li-stat-lbl">Responses</div>
              </div>
              <div class="li-stat-box">
                <div class="li-stat-val" id="statWords">0</div>
                <div class="li-stat-lbl">Words</div>
              </div>
              <div class="li-stat-box">
                <div class="li-stat-val" id="statWpm">—</div>
                <div class="li-stat-lbl">Avg WPM</div>
              </div>
              <div class="li-stat-box">
                <div class="li-stat-val" id="statTime">0:00</div>
                <div class="li-stat-lbl">Duration</div>
              </div>
            </div>
            <div class="mic-hint" id="micHint">Starting session...</div>
          </div>

          <!-- Pre-start info -->
          <div id="preStartInfo">
            <div class="explanation" style="font-size:13px;line-height:1.65;background:var(--success-soft);border-color:var(--success)">
              <b>How the live interview works:</b><br>
              1. AI speaks a question aloud<br>
              2. Mic auto-activates — answer naturally<br>
              3. AI listens, processes, replies conversationally<br>
              4. Session ends with a performance scorecard
            </div>
            <div class="flex gap-1 mt-1" style="flex-wrap:wrap">
              <span class="chip ${isSecure ? 'green' : 'orange'}">${isSecure ? '✓ Camera Ready' : '⚠ HTTPS needed for camera'}</span>
              <span class="chip ${srSupported ? 'green' : 'red'}">${srSupported ? '✓ Voice Input Ready' : '✗ Voice unsupported'}</span>
              <span class="chip blue">✓ Browser Voice Ready</span>
            </div>
          </div>

          <!-- Controls -->
          <div class="voice-controls mt-2">
            <button class="btn btn-primary" id="startBtn">▶ Begin Interview</button>
            <button class="btn btn-danger" id="endBtn" style="display:none">⏹ End Session</button>
            <button class="voice-btn active" id="speakerToggleBtn" style="display:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              AI Voice: On
            </button>
          </div>
        </div>

      </div>
    `;

    // Wire up controls
    document.getElementById('startBtn').addEventListener('click', () => this._startSession());

    document.getElementById('endBtn').addEventListener('click', () => {
      this._finalizeRecording().then(() => {
        this.cleanup();
        this._renderReport();
      });
    });

    document.getElementById('speakerToggleBtn').addEventListener('click', e => {
      const btn = e.currentTarget;
      this.state._speakerOn = !this.state._speakerOn;
      btn.classList.toggle('active', this.state._speakerOn);
      const svgPath = this.state._speakerOn
        ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'
        : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">${svgPath}</svg> AI Voice: ${this.state._speakerOn ? 'On' : 'Off'}`;
      if (!this.state._speakerOn) LiveAI.stopSpeaking();
    });

    const roleSel = document.getElementById('jobRoleSelect');
    if (roleSel) roleSel.addEventListener('change', () => { this.state.jobRole = roleSel.value; });
    const typeSel = document.getElementById('interviewTypeSelect');
    if (typeSel) typeSel.addEventListener('change', () => { this.state.interviewType = typeSel.value; });

    const sendTyped = document.getElementById('sendTypedBtn');
    if (sendTyped) {
      sendTyped.addEventListener('click', () => {
        const ta = document.getElementById('typedAnswer');
        const text = (ta && ta.value.trim()) || '';
        if (!text || !this.state.running) return;
        ta.value = '';
        this._addTranscript('user', text);
        this._handleUserReply(text);
      });
    }
  },

  /* ═══ Start Session ═══ */
  async _startSession() {
    this.state.running = true;
    this.state.history = [];
    this.state.turnCount = 0;
    this.state._wordCounts = [];
    this.state._conversationActive = true;
    this.state._micOn = true;
    this.state._speakerOn = true;
    this.state.camEnabled = true;
    this.state.micEnabled = true;
    this.state._startTime = Date.now();

    const roleSel = document.getElementById('jobRoleSelect');
    const typeSel = document.getElementById('interviewTypeSelect');
    if (roleSel) this.state.jobRole = roleSel.value;
    if (typeSel) this.state.interviewType = typeSel.value;

    document.addEventListener('keydown', this._keydownHandler);
    document.addEventListener('keyup', this._keyupHandler);

    // UI transition
    const startBtn = document.getElementById('startBtn');
    const endBtn = document.getElementById('endBtn');
    const speakerBtn = document.getElementById('speakerToggleBtn');
    const preInfo = document.getElementById('preStartInfo');
    const sessionStats = document.getElementById('sessionStats');
    const camControls = document.getElementById('liCamControls');
    const audioLevel = document.getElementById('liAudioLevel');

    if (startBtn) startBtn.style.display = 'none';
    if (endBtn) endBtn.style.display = 'inline-flex';
    if (speakerBtn) speakerBtn.style.display = 'inline-flex';
    if (preInfo) preInfo.style.display = 'none';
    if (sessionStats) sessionStats.style.display = 'block';
    if (camControls) camControls.style.display = 'flex';
    if (audioLevel) audioLevel.style.display = 'block';

    // Activate dots
    const camPulse = document.getElementById('camPulse');
    const aiPulse = document.getElementById('aiPulse');
    if (camPulse) camPulse.style.background = 'var(--danger)';
    if (aiPulse) aiPulse.style.background = 'var(--success)';

    // Start timer
    this._timerInterval = setInterval(() => this._updateStats(), 1000);

    // Camera + Mic
    if (LiveAI.isSecureContext()) {
      try {
        this.state.stream = await LiveAI.enableCamera(true, true);
        const video = document.getElementById('liCamVideo');
        if (video) video.srcObject = this.state.stream;
        this.state.camActive = true;
        this._startRecording();

        const overlay = document.getElementById('liCamOverlay');
        if (overlay) overlay.style.opacity = '0';

        this.state.cleanupLevel = await LiveAI.startLevelMeter(this.state.stream, level => {
          const fill = document.getElementById('liAudioFill');
          if (fill) fill.style.width = Math.min(100, level * 200) + '%';
        });

        // Wire camera toggle
        const camToggle = document.getElementById('liCamToggle');
        if (camToggle) {
          camToggle.addEventListener('click', () => {
            this.state.camEnabled = !this.state.camEnabled;
            const videoEl = document.getElementById('liCamVideo');
            if (this.state.stream) {
              this.state.stream.getVideoTracks().forEach(t => { t.enabled = this.state.camEnabled; });
            }
            camToggle.classList.toggle('active', this.state.camEnabled);
            camToggle.classList.toggle('off', !this.state.camEnabled);
            if (videoEl) videoEl.style.opacity = this.state.camEnabled ? '1' : '0.25';
          });
        }

        // Wire mic toggle (cam controls bar)
        const micToggle = document.getElementById('liMicToggleBtn');
        if (micToggle) {
          micToggle.addEventListener('click', () => {
            this.state.micEnabled = !this.state.micEnabled;
            if (this.state.stream) {
              this.state.stream.getAudioTracks().forEach(t => { t.enabled = this.state.micEnabled; });
            }
            micToggle.classList.toggle('active', this.state.micEnabled);
            micToggle.classList.toggle('off', !this.state.micEnabled);
            const hint = document.getElementById('micHint');
            if (hint) hint.textContent = this.state.micEnabled ? '🎤 Mic active' : '🎤 Mic muted';
            if (this.state.micEnabled) {
              this._startListening();
            } else {
              LiveAI.stopListening();
            }
          });
        }

      } catch (e) {
        console.warn('Camera unavailable:', e.message);
      }
    }

    // Kick off conversation
    this._sendAIReply('', true);
  },

  /* ═══ Stats ticker ═══ */
  _updateStats() {
    if (!this.state._startTime) return;
    const elapsed = Math.floor((Date.now() - this.state._startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const el = document.getElementById('statTime');
    if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  },

  /* ═══ AI Reply ═══ */
  async _sendAIReply(text, isOpening = false) {
    if (!this.state._conversationActive) return;
    this._setAgentState('thinking');
    this.state._inAIReply = true;
    const hint = document.getElementById('micHint');
    if (hint) hint.textContent = isOpening ? ' AI is preparing your first question...' : '🤔 AI is thinking...';

    const roleDesc = this.state.jobRole || 'General Software Engineer';

    let reply = null;

    // Groq LLaMA — fast, ~1s response time
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch('/api/interview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: this.state.history, answer: text }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data && data.spoken_response && data.spoken_response.trim()) reply = data.spoken_response.trim();
      }
    } catch { }

    // Fast local fallback (no network call)
    if (!reply || !reply.trim()) {
      reply = isOpening
        ? `Hello! I am your AI interviewer today. Let us start — could you please introduce yourself and tell me what brings you here for the ${roleDesc} position?`
        : 'That is interesting. Could you expand on that a bit more? Give me a concrete example from your experience.';
    }

    this.state.history.push({ role: 'ai', text: reply });
    this._addTranscript('ai', reply);
    if (hint) hint.textContent = '';
    this._setAgentState('speaking');

    if (/(report|feedback|wrap|thank you for.*session|conclude|sign off)/i.test(reply) || this.state.turnCount >= 9) {
      setTimeout(() => this._showReport(), 2500);
    } else {
      this._speakAndListen(reply);
    }
  },

  /* ═══ Speak using native browser TTS (zero latency) then invite recording ═══ */
  _speakAndListen(text) {
    if (!this.state._conversationActive) return;
    const hint = document.getElementById('micHint');
    const afterSpeak = () => {
      this.state._inAIReply = false;
      this._setAgentState('listening');
      if (hint) hint.textContent = 'Hold [Spacebar] to record your answer';
    };
    if (this.state._speakerOn && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 1.05;
      // Pick a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => /en(-|_)(US|GB)/i.test(v.lang) && /female|samantha|google us english|zira/i.test(v.name))
        || voices.find(v => /en(-|_)?(US|GB)/i.test(v.lang));
      if (preferred) u.voice = preferred;
      u.onend = afterSpeak;
      u.onerror = afterSpeak;
      window.speechSynthesis.speak(u);
    } else {
      this.state._inAIReply = false;
      afterSpeak();
    }
  },

  /* ═══ Listen for user speech ═══ */
  _startListening() {
    if (!this.state._conversationActive) return;
    const hint = document.getElementById('micHint');
    if (hint) hint.textContent = 'Hold [Spacebar] to record and speak naturally';
  },

  /* ═══ Continuous Push-to-Talk (Zero Latency) ═══ */
  _ensureContinuousSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || this.state._continuousSR) return;

    try {
      const sr = new SR();
      sr.lang = 'en-US';
      sr.continuous = true;
      sr.interimResults = true;
      sr.maxAlternatives = 1;

      sr.onresult = ev => {
        let final = '', interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) final += ev.results[i][0].transcript + ' ';
          else interim += ev.results[i][0].transcript;
        }

        // Only save words spoken WHILE spacebar is actively held down
        if (this.state._spaceDown) {
          if (final) this.state._pttTranscript = (this.state._pttTranscript || '') + final;
          this.state._pttInterim = interim;

          const box = document.getElementById('transcriptBox');
          if (box) {
            let el = box.querySelector('#pttInterim');
            if (!el) { el = document.createElement('div'); el.id = 'pttInterim'; el.className = 'transcript-msg user interim'; box.appendChild(el); }
            el.textContent = ((this.state._pttTranscript || '') + interim).trim();
            box.scrollTop = box.scrollHeight;
          }
        }
      };

      sr.onerror = () => { };
      // Restart if it stops automatically (continuous sometimes drops after silence)
      sr.onend = () => {
        if (this.state._conversationActive && this.state.micEnabled) {
          try { sr.start(); } catch (e) { }
        }
      };

      sr.start();
      this.state._continuousSR = sr;
    } catch (e) { }
  },

  _onKeyDown(e) {
    if (e.code !== 'Space' || e.repeat || !this.state._conversationActive || this.state._spaceDown) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    this.state._spaceDown = true;
    this.state._pttTranscript = '';
    this.state._pttInterim = '';

    // Interrupt AI speech instantly
    window.speechSynthesis && window.speechSynthesis.cancel();
    this.state._inAIReply = false;

    const hint = document.getElementById('micHint');
    if (hint) hint.textContent = '🎤 Listening… speak now (release to send)';

    this._ensureContinuousSpeechRecognition();
  },

  _onKeyUp(e) {
    if (e.code !== 'Space' || !this.state._spaceDown) return;
    e.preventDefault();
    this.state._spaceDown = false;
    const hint = document.getElementById('micHint');

    const box = document.getElementById('transcriptBox');
    const interimEl = box && box.querySelector('#pttInterim');
    if (interimEl) interimEl.remove();

    const text = ((this.state._pttTranscript || '') + ' ' + (this.state._pttInterim || '')).trim();
    this.state._pttTranscript = '';
    this.state._pttInterim = '';

    if (text.length > 2) {
      if (hint) hint.textContent = 'Processing ...';
      this._addTranscript('user', text);
      this._handleUserReply(text);
    } else {
      if (hint) hint.textContent = 'Nothing captured. Hold [Spacebar], speak clearly, then release.';
    }
  },


  /* ═══ Process user answer ═══ */
  async _handleUserReply(text) {
    if (!this.state._conversationActive) return;
    this.state.turnCount++;
    this.state.history.push({ role: 'user', text });

    // Track word count for WPM
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    this.state._wordCounts.push(words);

    // Update live stats
    const totalWords = this.state._wordCounts.reduce((a, b) => a + b, 0);
    const elapsed = this.state._startTime ? (Date.now() - this.state._startTime) / 60000 : 1;
    const avgWpm = elapsed > 0 ? Math.round(totalWords / elapsed) : 0;
    const statTurns = document.getElementById('statTurns');
    const statWords = document.getElementById('statWords');
    const statWpm = document.getElementById('statWpm');
    if (statTurns) statTurns.textContent = this.state.turnCount;
    if (statWords) statWords.textContent = totalWords;
    if (statWpm) statWpm.textContent = avgWpm;

    this._sendAIReply(text, false);
  },

  /* ═══ Transcript ═══ */
  _addTranscript(role, text) {
    const box = document.getElementById('transcriptBox');
    if (!box) return;
    const empty = document.getElementById('transcriptEmpty');
    if (empty) empty.style.display = 'none';

    const div = document.createElement('div');
    div.className = `transcript-msg ${role === 'ai' ? 'ai' : 'user'}`;

    const label = document.createElement('div');
    label.className = 'transcript-label';
    label.textContent = role === 'ai' ? '🤖 PrepAI Interviewer' : '👤 You';

    const content = document.createElement('div');
    content.className = 'transcript-text';
    content.textContent = text;

    div.appendChild(label);
    div.appendChild(content);
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  /* ═══ Agent Visual State ═══ */
  _setAgentState(state) {
    const agent = document.getElementById('aiAgent');
    const statusText = document.getElementById('agentStatusText');
    const wave = document.getElementById('agentWave');
    if (!agent) return;
    agent.className = 'ai-agent';
    if (state === 'thinking') {
      agent.classList.add('thinking');
      if (statusText) statusText.textContent = 'Thinking...';
      if (wave) wave.classList.remove('active');
    } else if (state === 'speaking') {
      agent.classList.add('speaking');
      if (statusText) statusText.textContent = 'Speaking...';
      if (wave) wave.classList.add('active');
    } else if (state === 'listening') {
      if (statusText) statusText.textContent = '🎤 Listening...';
      if (wave) wave.classList.remove('active');
    } else {
      if (statusText) statusText.textContent = 'Ready';
      if (wave) wave.classList.remove('active');
    }
  },

  /* ═══ Performance Report ═══ */
  async _showReport() {
    await this._finalizeRecording();
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
    this.cleanup();

    const userTurns = this.state.history.filter(h => h.role === 'user');
    const totalWords = (this.state._wordCounts || []).reduce((a, b) => a + b, 0);
    const elapsed = this.state._startTime ? Math.floor((Date.now() - this.state._startTime) / 1000) : 0;
    const avgWpm = elapsed > 0 ? Math.round(totalWords / (elapsed / 60)) : 0;
    const turns = userTurns.length;

    // Score calculation
    const communicationScore = Math.min(100, Math.round(
      (Math.min(turns, 8) / 8 * 40) +           // Engagement (40%)
      (Math.min(avgWpm, 120) / 120 * 30) +       // Speaking pace (30%)
      (Math.min(totalWords, 500) / 500 * 30)     // Verbosity (30%)
    ));

    const clarity = turns >= 5 ? 'Strong' : turns >= 3 ? 'Moderate' : 'Needs improvement';
    const pace = avgWpm > 100 ? 'Good pace' : avgWpm > 60 ? 'Steady pace' : 'Try to elaborate more';

    const grade = communicationScore >= 80 ? '🏆 Excellent' : communicationScore >= 60 ? '👍 Good' : communicationScore >= 40 ? '📈 Developing' : '🌱 Keep Practicing';

    // Feedback items
    const feedback = [];
    if (turns < 4) feedback.push({ icon: '💬', text: 'Give more complete answers — aim to speak for at least 30–60 seconds per response.' });
    if (avgWpm < 80) feedback.push({ icon: '🗣', text: 'Try to elaborate more. Use the STAR method: Situation, Task, Action, Result.' });
    if (avgWpm > 160) feedback.push({ icon: '🐢', text: 'Slow down a bit — speaking slightly slower improves clarity and confidence.' });
    if (turns >= 5) feedback.push({ icon: '✅', text: 'Great engagement! You answered all questions throughout the session.' });
    if (totalWords > 200) feedback.push({ icon: '📝', text: 'Good vocabulary depth. Keep using concrete examples with numbers and outcomes.' });
    feedback.push({ icon: '🎯', text: `Focused on: ${this.state.jobRole}. Practice role-specific questions regularly.` });
    if (feedback.length < 3) feedback.push({ icon: '🔁', text: 'Repeat mock interviews weekly — consistency is what builds interview confidence.' });

    // Transcript for report
    const transcriptItems = this.state.history.slice(-10).map(h => `
      <div class="transcript-msg ${h.role === 'ai' ? 'ai' : 'user'}" style="max-width:100%;margin-bottom:8px">
        <div class="transcript-label">${h.role === 'ai' ? '🤖 PrepAI Interviewer' : '👤 You'}</div>
        <div class="transcript-text" style="font-size:12.5px">${h.text}</div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="card mb-2" style="border-color:var(--success);background:var(--success-soft)">
        <div class="flex-between" style="flex-wrap:wrap;gap:12px">
          <div>
            <div class="card-title" style="color:var(--success)">✅ Interview Complete — ${grade}</div>
            <div class="card-sub">Role: ${this.state.jobRole} &bull; Style: ${this.state.interviewType}</div>
          </div>
          <button class="btn btn-primary" id="restartInterviewBtn">🔄 New Interview</button>
        </div>
      </div>

      <div class="grid grid-2" style="gap:20px">

        <!-- Score Panel -->
        <div class="card">
          <div class="card-title">Performance Scorecard</div>
          <div class="card-sub">AI-evaluated after ${turns} responses</div>

          <!-- Circular gauge -->
          <div style="display:flex;align-items:center;gap:22px;margin-bottom:18px;flex-wrap:wrap">
            <div style="position:relative;width:120px;height:120px;flex-shrink:0">
              <svg viewBox="0 0 120 120" style="transform:rotate(-90deg)">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(45,45,45,0.12)" stroke-width="10"/>
                <circle cx="60" cy="60" r="50" fill="none"
                  stroke="${communicationScore >= 70 ? 'var(--success)' : communicationScore >= 40 ? 'var(--warning)' : 'var(--danger)'}"
                  stroke-width="10" stroke-linecap="round"
                  stroke-dasharray="314"
                  stroke-dashoffset="${314 - (314 * communicationScore / 100)}"
                  style="transition:stroke-dashoffset 1.5s ease"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                <b style="font-size:26px;font-family:var(--font-hand);color:var(--text)">${communicationScore}</b>
                <span style="font-size:11px;color:var(--text-dim)">/100</span>
              </div>
            </div>
            <div style="flex:1;min-width:120px">
              <div style="font-size:20px;font-family:var(--font-hand);font-weight:700;margin-bottom:6px">${grade}</div>
              <div style="font-size:13px;color:var(--text-dim);line-height:1.6">
                Communication Score — based on engagement, pace, and answer depth.
              </div>
            </div>
          </div>

          <!-- Metric breakdown -->
          <div class="li-report-metrics">
            <div class="li-report-metric">
              <span class="li-rm-label">Responses Given</span>
              <span class="li-rm-val">${turns}</span>
            </div>
            <div class="li-report-metric">
              <span class="li-rm-label">Total Words</span>
              <span class="li-rm-val">${totalWords}</span>
            </div>
            <div class="li-report-metric">
              <span class="li-rm-label">Avg Words/Min</span>
              <span class="li-rm-val">${avgWpm} WPM</span>
            </div>
            <div class="li-report-metric">
              <span class="li-rm-label">Duration</span>
              <span class="li-rm-val">${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}</span>
            </div>
            <div class="li-report-metric">
              <span class="li-rm-label">Clarity</span>
              <span class="li-rm-val">${clarity}</span>
            </div>
            <div class="li-report-metric">
              <span class="li-rm-label">Pace</span>
              <span class="li-rm-val">${pace}</span>
            </div>
          </div>

          <!-- Progress bars -->
          <div class="mt-2">
            <div class="progress-label"><span>Communication</span><span>${communicationScore}%</span></div>
            <div class="progress mb-1"><div class="progress-fill ${communicationScore >= 70 ? 'green' : 'orange'}" style="width:${communicationScore}%"></div></div>
            <div class="progress-label"><span>Answer Depth</span><span>${Math.min(100, Math.round(totalWords / 5))}%</span></div>
            <div class="progress mb-1"><div class="progress-fill cyan" style="width:${Math.min(100, Math.round(totalWords / 5))}%"></div></div>
            <div class="progress-label"><span>Engagement</span><span>${Math.min(100, Math.round(turns / 8 * 100))}%</span></div>
            <div class="progress"><div class="progress-fill green" style="width:${Math.min(100, Math.round(turns / 8 * 100))}%"></div></div>
          </div>
        </div>

        <!-- Feedback + Transcript -->
        <div style="display:flex;flex-direction:column;gap:20px">
          <div class="card">
            <div class="card-title">AI Feedback</div>
            <div class="card-sub">Personalized suggestions based on your performance</div>
            ${feedback.map(f => `
              <div class="rec-item">
                <div class="rec-icon">${f.icon}</div>
                <div class="rec-text">${f.text}</div>
              </div>
            `).join('')}
          </div>

          <div class="card">
            <div class="card-title">Session Transcript (last 10)</div>
            <div class="card-sub">Review your conversation</div>
            <div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">
              ${transcriptItems || '<div class="text-dim" style="font-size:13px">No transcript yet.</div>'}
            </div>
          </div>
        </div>

      </div>
    `;

    document.getElementById('restartInterviewBtn').addEventListener('click', () => {
      this.state.history = [];
      this.state._wordCounts = [];
      this._renderIntro();
    });

    // Save progress
    try {
      const email = (typeof Auth !== 'undefined' && Auth.getEmail) ? Auth.getEmail() : null;
      if (email) {
        const prog = DB.getProgress(email);
        const interview = prog.interview || { sessions: 0, topics: [] };
        interview.sessions = (interview.sessions || 0) + 1;
        interview.lastScore = communicationScore;
        if (!interview.topics.includes(this.state.jobRole)) interview.topics.push(this.state.jobRole);
        DB.saveProgress(email, { interview });
        if (typeof App !== 'undefined') App.refreshAll();
      }
    } catch { }
  }
};
