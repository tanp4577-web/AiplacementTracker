/* ============ Live Mock Interview ============
   An AI interviewer (Aria) asks spoken questions; the candidate answers aloud with the camera and
   microphone on. Questions come from /api/interview (Gemini) and fall back to a built-in bank, so a
   session always runs. The camera and microphone stay in the browser: no video or audio is recorded or
   uploaded. Only the text of the answers is sent to the interview API, and only when AI mode is on. */
const MockInterview = {
  state: null,

  FILLERS: ['um', 'uh', 'umm', 'erm', 'hmm', 'you know', 'basically', 'literally', 'sort of', 'kind of'],
  CONNECTORS: ['first', 'second', 'then', 'because', 'therefore', 'for example', 'for instance', 'as a result', 'so that', 'finally', 'however', 'which means'],
  SILENCE_MS: 3500,

  _fresh() {
    return {
      phase: 'setup', cfg: { role: 'SDE', type: 'mixed', level: 'fresher', total: 8 }, history: [], asked: 0,
      mode: 'ai', plan: [], stream: null, audioCtx: null, meterRaf: 0, recog: null, voice: null,
      typedMode: false, busy: false, buffer: '', interim: '', lastSpeechAt: 0, silenceTimer: 0,
      clock: 0, startedAt: 0, answerStartedAt: 0, durations: [], noAnswerRetries: 0, notice: ''
    };
  },

  /* ---------------------------------------------------------------- helpers (pure) */

  speechSupport() {
    const w = window;
    return {
      recognition: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition),
      synthesis: Boolean(w.speechSynthesis && typeof w.SpeechSynthesisUtterance === 'function'),
      media: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
  },

  countWords(text) {
    return (String(text || '').trim().match(/\S+/g) || []).length;
  },

  countFillers(text) {
    const t = ` ${String(text || '').toLowerCase().replace(/[^a-z\s']/g, ' ')} `;
    return this.FILLERS.reduce((n, f) => n + (t.split(` ${f} `).length - 1), 0);
  },

  /** Delivery numbers computed from what was actually said. */
  deliveryStats(history, durations = []) {
    const answers = history.filter((t) => t.role === 'candidate');
    const words = answers.reduce((n, a) => n + this.countWords(a.content), 0);
    const seconds = durations.reduce((n, d) => n + (d || 0), 0);
    return {
      answers: answers.length,
      words,
      avgWords: answers.length ? Math.round(words / answers.length) : 0,
      fillers: answers.reduce((n, a) => n + this.countFillers(a.content), 0),
      wpm: seconds >= 10 && words ? Math.round((words / seconds) * 60) : null,
      seconds: Math.round(seconds)
    };
  },

  /** Offline feedback. Honest about being a rough estimate from length, structure words and keywords. */
  localReport(cfg, history, plan = []) {
    const pairs = [];
    history.forEach((t, i) => {
      if (t.role === 'candidate') pairs.push({ q: (history[i - 1] || {}).content || 'Question', a: t.content });
    });
    const clamp = (n) => Math.max(0, Math.min(10, Math.round(n)));
    const per = pairs.map((p, i) => {
      const words = this.countWords(p.a);
      const lower = p.a.toLowerCase();
      const meta = plan.find((x) => x.q === p.q);
      const hits = meta ? meta.keywords.filter((k) => lower.includes(k)).length : 0;
      const connectors = this.CONNECTORS.filter((c) => lower.includes(c)).length;
      let feedback;
      if (words < 12) feedback = 'Very short. Aim for 30 to 90 words: give your answer, then a reason or an example.';
      else if (meta && meta.keywords.length && hits === 0) feedback = 'Reasonable length, but it did not touch the key ideas this question is looking for.';
      else if (meta && hits >= 2) feedback = 'Good: you covered several of the key ideas. Add a concrete example to make it memorable.';
      else if (connectors === 0) feedback = 'Add structure: say what you did, why, and what the result was.';
      else feedback = 'Clear and structured. Keep adding specific numbers or outcomes where you can.';
      return { question: p.q, feedback, betterAnswerHint: '', words, hits, connectors, i };
    });
    const n = per.length || 1;
    const avgWords = per.reduce((s, x) => s + x.words, 0) / n;
    const fillers = history.filter((t) => t.role === 'candidate').reduce((s, t) => s + this.countFillers(t.content), 0);
    const lengthScore = avgWords >= 40 && avgWords <= 160 ? 8 : avgWords >= 20 ? 6 : avgWords >= 10 ? 4 : 2;
    const communication = clamp(lengthScore - Math.min(3, fillers / n));
    const structure = clamp(per.reduce((s, x) => s + Math.min(3, x.connectors), 0) / n * 2.5 + 2);
    const keyed = per.filter((x) => plan.find((m) => m.q === x.question && m.keywords.length));
    const technical = keyed.length ? clamp(keyed.reduce((s, x) => s + Math.min(3, x.hits), 0) / keyed.length * 2.7 + 1) : clamp(lengthScore - 1);
    const problemSolving = clamp((technical + structure) / 2);
    const overall = Math.round(((communication + technical + problemSolving + structure) / 4) * 10);
    return {
      overall,
      scores: { communication, technical, problemSolving, structure },
      summary: 'This is an offline estimate based on answer length, structure words and key terms. Turn on the AI interviewer (needs the server key) for a deeper review of what you actually said.',
      strengths: [
        avgWords >= 30 ? 'You gave answers with enough detail to work with.' : 'You kept going through the interview.',
        fillers <= 2 ? 'Very few filler words.' : 'You completed every round of questions.',
        structure >= 6 ? 'Your answers had a clear order.' : 'You attempted each question.'
      ],
      improvements: [
        avgWords < 30 ? 'Give longer answers: a direct answer, a reason, then an example.' : 'Trim long answers to the key points.',
        fillers > 2 ? 'Cut filler words ("um", "basically", "you know"): pause instead.' : 'Use specific numbers and outcomes.',
        structure < 6 ? 'Use signposts like "first", "because" and "as a result".' : 'Practise explaining trade-offs.'
      ],
      perQuestion: per.map(({ question, feedback, betterAnswerHint }) => ({ question, feedback, betterAnswerHint })),
      nextSteps: ['Retry this interview and aim to improve your weakest score.', 'Answer the same questions again out loud, timing yourself.', 'Read your answers back and shorten anything that rambles.'],
      offline: true
    };
  },

  /* ---------------------------------------------------------------- view */

  render(container) {
    this.cleanup();
    this.container = container;
    this.state = this._fresh();
    this._renderSetup();
  },

  _roles() {
    return typeof ROLE_SKILLS !== 'undefined' ? Object.keys(ROLE_SKILLS) : ['SDE'];
  },

  _history() {
    const email = typeof Auth !== 'undefined' && Auth.getEmail ? Auth.getEmail() : null;
    const prog = email ? DB.getProgress(email) : null;
    return (prog && prog.mockInterviews) || [];
  },

  _renderSetup() {
    const s = this.state;
    const sup = this.speechSupport();
    const past = this._history().slice(-5).reverse();
    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Live interview</div>
          <div class="card-sub">Aria asks the questions out loud. You answer out loud, on camera, like the real thing.</div>
          <label class="field-label mt-2" for="ivRole">Role</label>
          <select id="ivRole">${this._roles().map((r) => `<option ${r === s.cfg.role ? 'selected' : ''}>${Sanitize.html(r)}</option>`).join('')}</select>
          <label class="field-label mt-2" for="ivType">Interview type</label>
          <select id="ivType">
            <option value="mixed" selected>Mixed (technical and HR)</option>
            <option value="technical">Technical only</option>
            <option value="hr">HR and behavioural only</option>
          </select>
          <label class="field-label mt-2" for="ivLevel">Your level</label>
          <select id="ivLevel">
            <option value="intern">Internship</option>
            <option value="fresher" selected>Fresher</option>
            <option value="experienced">1 to 3 years</option>
          </select>
          <label class="field-label mt-2" for="ivTotal">Length</label>
          <select id="ivTotal">
            <option value="5">5 questions (about 10 min)</option>
            <option value="8" selected>8 questions (about 15 min)</option>
            <option value="12">12 questions (about 25 min)</option>
          </select>
        </div>
        <div class="card">
          <div class="card-title">Check your setup</div>
          <div class="card-sub">Camera and microphone stay on your device. Nothing is recorded or uploaded.</div>
          <div class="iv-check">
            <div class="iv-tile iv-me iv-preview"><video id="ivPreview" autoplay muted playsinline aria-label="Your camera preview"></video><div class="iv-empty" id="ivPreviewEmpty">Camera is off</div></div>
            <div class="iv-meter" aria-hidden="true"><i id="ivMeterSetup"></i></div>
            <div class="text-dim" id="ivDeviceMsg" role="status" style="font-size:13px;margin-top:8px">${sup.media ? 'Allow camera and microphone, then speak: the bar should move.' : 'This browser cannot access the camera or microphone.'}</div>
          </div>
          <div class="flex gap-2 flex-wrap mt-2">
            <button type="button" class="btn btn-ghost" id="ivEnable" ${sup.media ? '' : 'disabled'}>Enable camera and microphone</button>
            <button type="button" class="btn btn-primary" id="ivStart" disabled>Start interview</button>
          </div>
          <p class="text-dim mt-2" style="font-size:12.5px" id="ivSpeechNote">${sup.recognition ? 'Speech recognition is available: your answers are captured as you speak.' : 'This browser cannot transcribe speech (use Chrome or Edge for voice answers). You can still type your answers.'}</p>
          <button type="button" class="btn btn-ghost btn-sm" id="ivTypedOnly">No camera or microphone? Continue with typed answers</button>
        </div>
      </div>
      ${past.length ? `<div class="card mt-3"><div class="card-title">Recent interviews</div>
        <table class="data-table"><thead><tr><th>Date</th><th>Role</th><th>Type</th><th>Score</th></tr></thead><tbody>
        ${past.map((p) => `<tr><td>${Sanitize.html(new Date(p.date).toLocaleDateString())}</td><td>${Sanitize.html(p.role)}</td><td>${Sanitize.html(p.type)}</td><td>${Sanitize.html(String(p.overall))}/100</td></tr>`).join('')}
        </tbody></table></div>` : ''}
    `;
    const $ = (id) => document.getElementById(id);
    $('ivEnable').addEventListener('click', () => this._enableDevices());
    $('ivStart').addEventListener('click', () => this._start());
    $('ivTypedOnly').addEventListener('click', () => { this.state.typedMode = true; this._start(); });
  },

  _readConfig() {
    const $ = (id) => document.getElementById(id);
    this.state.cfg = { role: $('ivRole').value, type: $('ivType').value, level: $('ivLevel').value, total: parseInt($('ivTotal').value, 10) || 8 };
  },

  /* ---------------------------------------------------------------- devices */

  async _enableDevices() {
    const msg = document.getElementById('ivDeviceMsg');
    const say = (t) => { if (msg) msg.textContent = t; };
    if (!window.isSecureContext) { say('The camera needs a secure (https) page.'); return; }
    this._stopStream();
    try {
      this.state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 } }, audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const name = e && e.name;
      say(name === 'NotAllowedError' ? 'Permission was blocked. Click the camera icon in the address bar, allow camera and microphone, then try again.'
        : name === 'NotFoundError' ? 'No camera or microphone was found on this device.'
        : name === 'NotReadableError' ? 'Another app is using the camera or microphone. Close it and try again.'
        : 'Could not start the camera and microphone.');
      return;
    }
    const video = document.getElementById('ivPreview');
    if (video) { video.srcObject = this.state.stream; }
    const empty = document.getElementById('ivPreviewEmpty');
    if (empty) empty.hidden = true;
    this._startMeter(document.getElementById('ivMeterSetup'));
    say('Camera and microphone are on. Say something: the bar should move.');
    document.getElementById('ivStart').disabled = false;
  },

  _stopStream() {
    const s = this.state;
    if (!s) return;
    cancelAnimationFrame(s.meterRaf);
    if (s.stream) s.stream.getTracks().forEach((t) => t.stop());
    s.stream = null;
    if (s.audioCtx) { try { s.audioCtx.close(); } catch { /* already closed */ } }
    s.audioCtx = null;
  },

  _startMeter(el) {
    const s = this.state;
    if (!el || !s.stream || !s.stream.getAudioTracks().length) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    cancelAnimationFrame(s.meterRaf);
    if (s.audioCtx) { try { s.audioCtx.close(); } catch { /* already closed */ } }
    s.audioCtx = new Ctx();
    const analyser = s.audioCtx.createAnalyser();
    analyser.fftSize = 256;
    s.audioCtx.createMediaStreamSource(s.stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
      el.style.width = `${Math.min(100, Math.round((peak / 64) * 100))}%`;
      s.meterRaf = requestAnimationFrame(tick);
    };
    tick();
  },

  /* ---------------------------------------------------------------- interview flow */

  async _start() {
    this._readConfig();
    const s = this.state;
    s.history = []; s.asked = 0; s.durations = []; s.buffer = ''; s.interim = ''; s.mode = 'ai'; s.notice = '';
    s.plan = this._buildPlan();
    s.phase = 'room';
    s.startedAt = Date.now();
    this._renderRoom();
    await this._nextQuestion();
  },

  /** Offline plan: opener, shuffled bank questions for the role and type, closer. */
  _buildPlan() {
    const { role, type, total } = this.state.cfg;
    const bank = typeof INTERVIEW_BANK !== 'undefined' ? INTERVIEW_BANK : { opener: 'Please introduce yourself.', closer: 'Anything you would like to add?', hr: [], technical: {} };
    const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const tech = shuffle(bank.technical[role] || bank.technical.SDE || []);
    const hr = shuffle(bank.hr);
    const mid = [];
    const want = Math.max(1, total - 2);
    for (let i = 0; mid.length < want && (tech.length || hr.length); i++) {
      const pickTech = type === 'technical' || (type === 'mixed' && i % 2 === 0);
      const src = (pickTech ? tech : hr).length ? (pickTech ? tech : hr) : (tech.length ? tech : hr);
      mid.push(src.shift());
    }
    return [{ q: bank.opener, keywords: [] }, ...mid, { q: bank.closer, keywords: [] }].slice(0, total);
  },

  async _api(action, extra = {}) {
    const s = this.state;
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...s.cfg, history: s.history, ...extra })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) throw new Error((data && data.error) || 'Interview service unavailable');
    return data;
  },

  async _nextQuestion() {
    const s = this.state;
    if (s.phase !== 'room') return;
    this._setStatus('thinking');
    let question = null;
    if (s.mode === 'ai') {
      try {
        question = (await this._api('next')).question;
      } catch {
        s.mode = 'offline';
        s.notice = 'The AI interviewer is not available, so Aria is using the built-in question bank.';
        this._renderNotice();
      }
    }
    if (!question) question = (s.plan[s.asked] || s.plan[s.plan.length - 1]).q;
    if (s.phase !== 'room') return;
    s.history.push({ role: 'interviewer', content: question });
    s.asked++;
    s.noAnswerRetries = 0;
    this._paintProgress();
    this._say(question);
  },

  _pickVoice() {
    const s = this.state;
    if (s.voice || !this.speechSupport().synthesis) return s.voice;
    const voices = window.speechSynthesis.getVoices();
    s.voice = voices.find((v) => /en[-_]IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang) && /female|zira|samantha|google uk english female/i.test(v.name)) || voices.find((v) => /^en/i.test(v.lang)) || null;
    return s.voice;
  },

  _say(text) {
    const s = this.state;
    document.getElementById('ivQuestion').textContent = text;
    document.getElementById('ivAnswer').textContent = '';
    const done = () => { if (this.state === s && s.phase === 'room') this._listen(); };
    if (!this.speechSupport().synthesis) { this._setStatus('speaking'); setTimeout(done, Math.min(6000, 1200 + text.length * 35)); return; }
    this._setStatus('speaking');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = this._pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-IN'; }
    u.rate = 0.98;
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  },

  _listen() {
    const s = this.state;
    if (s.phase !== 'room') return;
    s.busy = false;
    s.buffer = '';
    s.interim = '';
    s.answerStartedAt = Date.now();
    s.lastSpeechAt = 0;
    const sup = this.speechSupport();
    const typed = document.getElementById('ivTyped');
    if (s.typedMode || !sup.recognition) {
      this._setStatus('typing');
      typed.hidden = false;
      typed.value = '';
      typed.focus();
      return;
    }
    this._setStatus('listening');
    this._startRecognition();
    clearInterval(s.silenceTimer);
    s.silenceTimer = setInterval(() => {
      if (s.busy || !s.lastSpeechAt) return;
      if (this.countWords(s.buffer) >= 5 && Date.now() - s.lastSpeechAt > this.SILENCE_MS) this._submit();
    }, 500);
  },

  _startRecognition() {
    const s = this.state;
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    this._stopRecognition();
    const r = new R();
    r.lang = 'en-IN';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let finals = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += t + ' '; else interim += t;
      }
      if (finals) s.buffer += finals;
      s.interim = interim;
      s.lastSpeechAt = Date.now();
      const el = document.getElementById('ivAnswer');
      if (el) el.textContent = (s.buffer + interim).trim();
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        s.typedMode = true;
        this._notify('Speech recognition was blocked, so you can type your answers.');
        this._listen();
      }
    };
    r.onend = () => { if (this.state === s && s.phase === 'room' && !s.busy && s.recog === r && !s.typedMode) { try { r.start(); } catch { /* already running */ } } };
    s.recog = r;
    try { r.start(); } catch { /* already running */ }
  },

  _stopRecognition() {
    const s = this.state;
    if (s.recog) { const r = s.recog; s.recog = null; r.onend = null; r.onresult = null; r.onerror = null; try { r.abort(); } catch { /* not running */ } }
    clearInterval(s.silenceTimer);
  },

  async _submit() {
    const s = this.state;
    if (s.busy || s.phase !== 'room') return;
    s.busy = true;
    const typed = document.getElementById('ivTyped');
    const spoken = (s.buffer + ' ' + s.interim).replace(/\s+/g, ' ').trim();
    const text = (typed && !typed.hidden ? typed.value.trim() : '') || spoken;
    this._stopRecognition();
    if (typed) typed.hidden = true;
    window.speechSynthesis && window.speechSynthesis.cancel();
    if (!text) {
      if (s.noAnswerRetries++ < 1) {
        document.getElementById('ivAnswer').textContent = 'I did not catch that. Please answer again, or use "Type instead".';
        this._listen();
        return;
      }
      s.history.push({ role: 'candidate', content: '(no answer)' });
    } else {
      s.history.push({ role: 'candidate', content: text });
    }
    s.durations.push((Date.now() - s.answerStartedAt) / 1000);
    if (s.asked >= s.cfg.total) { await this._finish(); return; }
    await this._nextQuestion();
  },

  _repeat() {
    const s = this.state;
    if (s.phase !== 'room' || s.busy) return;
    const last = [...s.history].reverse().find((t) => t.role === 'interviewer');
    if (!last) return;
    this._stopRecognition();
    s.buffer = ''; s.interim = '';
    this._say(last.content);
  },

  _toggleTyped() {
    const s = this.state;
    s.typedMode = !s.typedMode;
    this._stopRecognition();
    const typed = document.getElementById('ivTyped');
    if (s.typedMode) { this._setStatus('typing'); typed.hidden = false; typed.focus(); } else { typed.hidden = true; this._listen(); }
    document.getElementById('ivTypedToggle').textContent = s.typedMode ? 'Use voice instead' : 'Type instead';
  },

  async _end() {
    const s = this.state;
    const answered = s.history.some((t) => t.role === 'candidate');
    const ok = typeof App !== 'undefined' && App.confirm
      ? await App.confirm(answered ? 'End the interview now and get feedback on what you have answered so far?' : 'Leave the interview? Nothing has been answered yet.', { title: 'End interview', confirmLabel: answered ? 'End and get feedback' : 'Leave' })
      : true;
    if (!ok) return;
    if (!answered) { this.cleanup(); this.render(this.container); return; }
    await this._finish();
  },

  /* ---------------------------------------------------------------- room UI */

  _renderRoom() {
    const s = this.state;
    this.container.innerHTML = `
      <div class="iv-room">
        <div class="iv-bar">
          <span class="chip" id="ivProgress">Question 0 of ${s.cfg.total}</span>
          <span class="chip"><span id="ivClock">0:00</span></span>
          <span class="chip">${Sanitize.html(s.cfg.role)}</span>
          <span id="ivNotice" class="text-dim" style="font-size:12.5px"></span>
        </div>
        <div class="iv-stage">
          <div class="iv-tile iv-interviewer"><div class="iv-avatar" id="ivAvatar" aria-hidden="true">A</div><div class="iv-name">Aria, interviewer</div><div class="iv-state" id="ivState" role="status" aria-live="polite"></div></div>
          <div class="iv-tile iv-me"><video id="ivVideo" autoplay muted playsinline aria-label="Your camera"></video><div class="iv-empty" id="ivVideoEmpty" ${s.stream ? 'hidden' : ''}>Camera off</div><div class="iv-name">You</div><div class="iv-meter" aria-hidden="true"><i id="ivMeter"></i></div></div>
        </div>
        <div class="iv-captions">
          <div class="iv-q" id="ivQuestion" aria-live="polite"></div>
          <div class="iv-a" id="ivAnswer"></div>
          <textarea id="ivTyped" hidden rows="4" placeholder="Type your answer here" aria-label="Type your answer"></textarea>
        </div>
        <div class="iv-controls">
          <button type="button" class="btn btn-primary" id="ivDone">I am done answering</button>
          <button type="button" class="btn btn-ghost" id="ivRepeat">Repeat question</button>
          <button type="button" class="btn btn-ghost" id="ivTypedToggle">${s.typedMode ? 'Use voice instead' : 'Type instead'}</button>
          <button type="button" class="btn btn-ghost" id="ivEnd">End interview</button>
        </div>
      </div>`;
    const $ = (id) => document.getElementById(id);
    $('ivDone').addEventListener('click', () => this._submit());
    $('ivRepeat').addEventListener('click', () => this._repeat());
    $('ivTypedToggle').addEventListener('click', () => this._toggleTyped());
    $('ivEnd').addEventListener('click', () => this._end());
    $('ivTyped').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this._submit(); });
    if (s.stream) { $('ivVideo').srcObject = s.stream; this._startMeter($('ivMeter')); }
    clearInterval(s.clock);
    s.clock = setInterval(() => {
      const el = $('ivClock');
      if (!el) { clearInterval(s.clock); return; }
      const t = Math.floor((Date.now() - s.startedAt) / 1000);
      el.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    }, 1000);
  },

  _paintProgress() {
    const el = document.getElementById('ivProgress');
    if (el) el.textContent = `Question ${this.state.asked} of ${this.state.cfg.total}`;
  },

  _renderNotice() {
    const el = document.getElementById('ivNotice');
    if (el) el.textContent = this.state.notice;
  },

  _notify(text) {
    this.state.notice = text;
    this._renderNotice();
  },

  _setStatus(kind) {
    const labels = { thinking: 'Aria is thinking…', speaking: 'Aria is speaking…', listening: 'Listening: answer out loud', typing: 'Type your answer, then press the button' };
    const st = document.getElementById('ivState');
    if (st) st.textContent = labels[kind] || '';
    const av = document.getElementById('ivAvatar');
    if (av) { av.classList.toggle('iv-speaking', kind === 'speaking'); av.classList.toggle('iv-thinking', kind === 'thinking'); }
    const me = document.querySelector('.iv-me');
    if (me) me.classList.toggle('iv-live', kind === 'listening' || kind === 'typing');
  },

  /* ---------------------------------------------------------------- report */

  async _finish() {
    const s = this.state;
    if (s.phase === 'report') return;
    s.phase = 'report';
    this._stopRecognition();
    window.speechSynthesis && window.speechSynthesis.cancel();
    clearInterval(s.clock);
    this._stopStream();
    this.container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Aria is preparing your feedback…</p></div>';
    const stats = this.deliveryStats(s.history, s.durations);
    let report = null;
    if (s.mode === 'ai') {
      try { report = await this._api('report'); } catch { report = null; }
    }
    if (!report) report = this.localReport(s.cfg, s.history, s.plan);
    s.report = report;
    this._save(report);
    this._renderReport(report, stats);
  },

  _save(report) {
    const email = typeof Auth !== 'undefined' && Auth.getEmail ? Auth.getEmail() : null;
    if (!email) return;
    const prog = DB.getProgress(email);
    const list = [...(prog.mockInterviews || []), { date: Date.now(), role: this.state.cfg.role, type: this.state.cfg.type, overall: report.overall }].slice(-20);
    const interview = { ...(prog.interview || { sessions: 0, topics: [] }), sessions: ((prog.interview && prog.interview.sessions) || 0) + 1 };
    DB.saveProgress(email, { mockInterviews: list, interview });
  },

  _renderReport(r, stats) {
    const E = (t) => Sanitize.html(String(t == null ? '' : t));
    const bar = (label, v) => `<div class="iv-score"><div class="iv-score-top"><span>${label}</span><b>${v}/10</b></div><div class="progress"><div class="progress-fill" style="width:${v * 10}%"></div></div></div>`;
    this.container.innerHTML = `
      <div class="iv-report">
        <div class="dashboard-hero iv-hero">
          <div class="iv-overall"><b>${E(r.overall)}</b><span>out of 100</span></div>
          <div><h3>${r.overall >= 75 ? 'Strong interview.' : r.overall >= 50 ? 'A solid base to build on.' : 'Needs more practice, and that is fine.'}</h3><p>${E(r.summary)}</p>
          ${r.offline ? '<span class="chip">Offline estimate</span>' : ''}</div>
        </div>
        <div class="grid grid-4 mb-3">
          <div class="card"><div class="card-stat">${stats.answers}</div><div class="card-stat-label">Answers</div></div>
          <div class="card"><div class="card-stat">${stats.avgWords}</div><div class="card-stat-label">Words per answer</div></div>
          <div class="card"><div class="card-stat">${stats.wpm == null ? 'n/a' : stats.wpm}</div><div class="card-stat-label">Words per minute</div></div>
          <div class="card"><div class="card-stat">${stats.fillers}</div><div class="card-stat-label">Filler words</div></div>
        </div>
        <div class="grid grid-2">
          <div class="card"><div class="card-title">Scores</div>
            ${bar('Communication', r.scores.communication)}${bar('Technical depth', r.scores.technical)}${bar('Problem solving', r.scores.problemSolving)}${bar('Structure', r.scores.structure)}
            <p class="text-dim mt-2" style="font-size:12.5px">Pace guide: 110 to 160 words per minute sounds natural.</p></div>
          <div class="card"><div class="card-title">What to do next</div><ol class="iv-list">${(r.nextSteps || []).map((x) => `<li>${E(x)}</li>`).join('')}</ol></div>
          <div class="card"><div class="card-title">Strengths</div><ul class="iv-list">${(r.strengths || []).map((x) => `<li>${E(x)}</li>`).join('')}</ul></div>
          <div class="card"><div class="card-title">Improve</div><ul class="iv-list">${(r.improvements || []).map((x) => `<li>${E(x)}</li>`).join('')}</ul></div>
        </div>
        <div class="card mt-3"><div class="card-title">Question by question</div>
          ${(r.perQuestion || []).map((q) => `<div class="iv-pq"><b>${E(q.question)}</b><p>${E(q.feedback)}</p>${q.betterAnswerHint ? `<p class="text-dim">Stronger answer: ${E(q.betterAnswerHint)}</p>` : ''}</div>`).join('') || '<p class="text-dim">No per-question notes.</p>'}
        </div>
        <div class="flex gap-2 flex-wrap mt-3">
          <button type="button" class="btn btn-primary" id="ivAgain">Practise again</button>
          <button type="button" class="btn btn-ghost" id="ivDownload">Download transcript</button>
        </div>
      </div>`;
    document.getElementById('ivAgain').addEventListener('click', () => this.render(this.container));
    document.getElementById('ivDownload').addEventListener('click', () => this._download());
  },

  _download() {
    const s = this.state;
    const lines = s.history.map((t) => `${t.role === 'candidate' ? 'You' : 'Aria'}: ${t.content}`);
    const blob = new Blob([`Mock interview: ${s.cfg.role} (${s.cfg.type})\n\n${lines.join('\n\n')}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mock-interview-transcript.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  /** Stops the camera, microphone, speech and timers. Called when leaving the view. */
  cleanup() {
    const s = this.state;
    if (!s) return;
    s.phase = 'closed';
    this._stopRecognition();
    clearInterval(s.clock);
    if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch { /* unsupported */ } }
    this._stopStream();
  }
};
