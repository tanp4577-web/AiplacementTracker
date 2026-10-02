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
      phase: 'setup', cfg: { role: 'SDE', type: 'mixed', level: 'fresher', total: 8, focus: 'standard', company: 'Amazon', resume: '', answerSeconds: 0 }, history: [], asked: 0,
      mode: 'ai', plan: [], stream: null, audioCtx: null, meterRaf: 0, recog: null, voice: null,
      typedMode: false, busy: false, buffer: '', interim: '', lastSpeechAt: 0, silenceTimer: 0,
      clock: 0, startedAt: 0, answerStartedAt: 0, durations: [], noAnswerRetries: 0, notice: '', answerTimer: 0, answerLeft: 0, lastWasFollowUp: false, timeouts: 0
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
      timeouts: answers.filter((a) => a.timedOut).length,
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
    const timeouts = history.filter((t) => t.role === 'candidate' && t.timedOut).length;
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
        timeouts ? `You ran out of time on ${timeouts} answer${timeouts > 1 ? 's' : ''}: lead with the conclusion, then add one reason, then stop.` : (structure < 6 ? 'Use signposts like "first", "because" and "as a result".' : 'Practise explaining trade-offs.')
      ],
      perQuestion: per.map(({ question, feedback, betterAnswerHint }) => ({ question, feedback, betterAnswerHint })),
      nextSteps: ['Retry this interview and aim to improve your weakest score.', 'Answer the same questions again out loud, timing yourself.', 'Read your answers back and shorten anything that rambles.'],
      offline: true
    };
  },

  /* ---------------------------------------------------------------- view */

  render(container, keepCfg) {
    this.cleanup();
    this.container = container;
    this.state = this._fresh();
    if (keepCfg) this.state.cfg = { ...keepCfg };
    this._renderSetup();
  },

  _focusLabel() {
    const c = this.state.cfg;
    return c.focus === 'company' ? `${c.company} style` : c.focus === 'resume' ? 'Resume-based' : (this.TYPE_OPTIONS.find((t) => t[0] === c.type) || [0, 'Interview'])[1].split(' (')[0];
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
            ${this.TYPE_OPTIONS.map(([v, label]) => `<option value="${v}" ${v === s.cfg.type ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
          <label class="field-label mt-2" for="ivFocus">Focus</label>
          <select id="ivFocus">
            <option value="standard" ${s.cfg.focus === 'standard' ? 'selected' : ''}>General (by role and type)</option>
            <option value="resume" ${s.cfg.focus === 'resume' ? 'selected' : ''}>Based on my resume and projects</option>
            <option value="company" ${s.cfg.focus === 'company' ? 'selected' : ''}>Specific company</option>
          </select>
          <div id="ivCompanyWrap" ${s.cfg.focus === 'company' ? '' : 'hidden'}>
            <label class="field-label mt-2" for="ivCompany">Company</label>
            <select id="ivCompany">${this._companies().map((c) => `<option ${c === s.cfg.company ? 'selected' : ''}>${Sanitize.html(c)}</option>`).join('')}</select>
          </div>
          <div id="ivResumeWrap" ${s.cfg.focus === 'resume' ? '' : 'hidden'}>
            <label class="field-label mt-2" for="ivResume">Your resume (projects, skills, experience)</label>
            <textarea id="ivResume" rows="6" placeholder="Paste your resume text. Aria will ask about your own projects and skills.">${Sanitize.html(s.cfg.resume || (typeof DB !== 'undefined' ? DB.getGlobal('lastResumeText') || '' : ''))}</textarea>
            <div class="text-dim" style="font-size:12px;margin-top:4px">Filled from your last Resume Analyzer run when available. It is sent to the AI interviewer only during this session.</div>
          </div>
          <label class="field-label mt-2" for="ivLevel">Your level</label>
          <select id="ivLevel">
            <option value="intern">Internship</option>
            <option value="fresher" selected>Fresher</option>
            <option value="experienced">1 to 3 years</option>
          </select>
          <label class="field-label mt-2" for="ivClock">Answer time limit</label>
          <select id="ivClock">
            <option value="0" ${!s.cfg.answerSeconds ? 'selected' : ''}>No limit (relaxed)</option>
            <option value="120" ${s.cfg.answerSeconds === 120 ? 'selected' : ''}>120 seconds per answer</option>
            <option value="90" ${s.cfg.answerSeconds === 90 ? 'selected' : ''}>90 seconds per answer (pressure round)</option>
            <option value="60" ${s.cfg.answerSeconds === 60 ? 'selected' : ''}>60 seconds per answer (pressure round)</option>
            <option value="45" ${s.cfg.answerSeconds === 45 ? 'selected' : ''}>45 seconds per answer (hard mode)</option>
          </select>
          <label class="field-label mt-2" for="ivSpeed">Aria's speaking speed</label>
          <select id="ivSpeed">
            <option value="slow" ${this._rateKey() === 'slow' ? 'selected' : ''}>Slow</option>
            <option value="normal" ${this._rateKey() === 'normal' ? 'selected' : ''}>Natural (recommended)</option>
            <option value="fast" ${this._rateKey() === 'fast' ? 'selected' : ''}>Fast</option>
          </select>
          <label class="field-label mt-2" for="ivVoice">Aria's voice</label>
          <select id="ivVoice"></select>
          <button type="button" class="btn btn-ghost btn-sm mt-2" id="ivVoiceTest">Hear a sample</button>
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
            <div id="ivPickers" hidden>
              <label class="field-label mt-2" for="ivCam">Camera</label>
              <select id="ivCam"></select>
              <label class="field-label mt-2" for="ivMic">Microphone</label>
              <select id="ivMic"></select>
              <div class="text-dim" id="ivPickerHint" style="font-size:12px;margin-top:4px">If your phone is being used as a webcam, choose your laptop camera here.</div>
              <div class="iv-alert" id="ivMicHint" hidden></div>
            </div>
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
    this._fillVoices();
    if (this.speechSupport().synthesis) window.speechSynthesis.onvoiceschanged = () => this._fillVoices();
    $('ivSpeed').addEventListener('change', () => this._remember('rate', $('ivSpeed').value));
    $('ivVoice').addEventListener('change', () => { this._remember('voice', $('ivVoice').value); });
    $('ivVoiceTest').addEventListener('click', () => this._sample());
    $('ivFocus').addEventListener('change', () => {
      const v = $('ivFocus').value;
      $('ivCompanyWrap').hidden = v !== 'company';
      $('ivResumeWrap').hidden = v !== 'resume';
    });
  },

  /** Lists the English voices this browser has, best first, and keeps the saved choice selected. */
  _fillVoices() {
    const sel = document.getElementById('ivVoice');
    if (!sel) return;
    const list = this._englishVoices();
    const chosen = this._pickVoice();
    if (!list.length) {
      sel.innerHTML = '<option value="">Default voice</option>';
      sel.disabled = true;
      const test = document.getElementById('ivVoiceTest');
      if (test) test.disabled = !this.speechSupport().synthesis;
      return;
    }
    sel.disabled = false;
    sel.innerHTML = list.map((v) => `<option value="${Sanitize.html(v.voiceURI)}" ${chosen && v.voiceURI === chosen.voiceURI ? 'selected' : ''}>${Sanitize.html(v.name)} (${Sanitize.html(v.lang)})</option>`).join('');
  },

  _sample() {
    if (!this.speechSupport().synthesis) return;
    const text = 'Hello, I am Aria, and I will be your interviewer today. Tell me a little about yourself, and take your time.';
    const u = new SpeechSynthesisUtterance(text);
    const v = this._pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    const key = document.getElementById('ivSpeed').value;
    u.rate = this._rateFor(v, key);
    const startedAt = performance.now();
    u.onend = () => this._learn(v, u.rate, this.countWords(text), (performance.now() - startedAt - 300) / 1000, key);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  },

  TYPE_OPTIONS: [
    ['mixed', 'Mixed (technical and HR)'],
    ['technical', 'Technical (role-specific)'],
    ['hr', 'HR and behavioural'],
    ['fundamentals', 'CS fundamentals (OS, DBMS, networks, OOP)'],
    ['coding', 'Coding and data structures (spoken)'],
    ['systemdesign', 'System design'],
    ['situational', 'Situational and managerial'],
    ['puzzles', 'Puzzles and aptitude']
  ],

  _companies() {
    return typeof COMPANY_PATTERNS !== 'undefined' ? COMPANY_PATTERNS.companies.map((c) => c.name) : ['Amazon', 'Google', 'Microsoft', 'TCS', 'Infosys', 'Wipro', 'Meta', 'Cognizant', 'Accenture'];
  },

  _readConfig() {
    const $ = (id) => document.getElementById(id);
    this.state.cfg = {
      role: $('ivRole').value, type: $('ivType').value, level: $('ivLevel').value, total: parseInt($('ivTotal').value, 10) || 8,
      focus: $('ivFocus').value, company: $('ivCompany').value, resume: $('ivResume').value.trim().slice(0, 6000), answerSeconds: parseInt($('ivClock').value, 10) || 0
    };
  },

  /* ---------------------------------------------------------------- devices */

  /** Cameras that are usually a phone or a virtual device rather than the laptop's own camera. */
  PHONE_LIKE: /phone|iphone|android|pixel|galaxy|iriun|droidcam|camo|epoccam|ivcam|continuity|link to windows|virtual|obs/i,

  _saved(kind) {
    try { return localStorage.getItem(`pp_iv_${kind}`) || ''; } catch { return ''; }
  },

  _remember(kind, id) {
    try { localStorage.setItem(`pp_iv_${kind}`, id); } catch { /* private mode: choice lasts for this visit only */ }
  },

  _constraints(camId, micId) {
    return {
      video: camId ? { deviceId: { exact: camId }, width: { ideal: 960 } } : { width: { ideal: 960 } },
      audio: micId ? { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true }
    };
  },

  /** Opens the stream with the chosen devices; falls back to the browser default if a saved device is gone. */
  async _open(camId, micId) {
    try {
      return await navigator.mediaDevices.getUserMedia(this._constraints(camId, micId));
    } catch (e) {
      if ((camId || micId) && e && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) {
        return navigator.mediaDevices.getUserMedia(this._constraints('', ''));
      }
      throw e;
    }
  },

  _deviceId(stream, kind) {
    const track = kind === 'video' ? stream.getVideoTracks()[0] : stream.getAudioTracks()[0];
    return (track && track.getSettings && track.getSettings().deviceId) || '';
  },

  async _enableDevices() {
    const msg = document.getElementById('ivDeviceMsg');
    const say = (t) => { if (msg) msg.textContent = t; };
    if (!window.isSecureContext) { say('The camera needs a secure (https) page.'); return; }
    this._stopStream();
    try {
      this.state.stream = await this._open(this._saved('cam'), this._saved('mic'));
      this.state.camOk = true;
      this.state.micOk = true;
    } catch {
      // Asking for both at once fails if either one is blocked, busy or missing. Find out which one it is
      // and carry on with the one that works, instead of reporting a vague failure.
      const partial = await this._openEach();
      if (!partial.stream) { say(`Neither device could be opened. Camera: ${partial.camMsg} Microphone: ${partial.micMsg}`); return; }
      this.state.stream = partial.stream;
      this.state.camOk = partial.camOk;
      this.state.micOk = partial.micOk;
      this._attachPreview();
      const parts = [];
      if (!partial.camOk) parts.push(`Camera: ${partial.camMsg}`);
      if (!partial.micOk) parts.push(`Microphone: ${partial.micMsg}`);
      if (!partial.micOk) this.state.typedMode = true;
      say(`${parts.join(' ')} ${partial.micOk ? 'Your microphone works, so you can still answer by voice.' : 'You can still start and type your answers.'}`);
      document.getElementById('ivStart').disabled = false;
      return;
    }
    // Labels only appear after permission. If nothing was chosen before and the browser picked a phone-like
    // camera, switch to a camera that does not look like a phone.
    let list = await this._listDevices();
    if (!this._saved('cam')) {
      const cur = list.cams.find((c) => c.deviceId === this._deviceId(this.state.stream, 'video'));
      const better = list.cams.find((c) => !this.PHONE_LIKE.test(c.label));
      if (cur && this.PHONE_LIKE.test(cur.label) && better && better.deviceId !== cur.deviceId) {
        this._stopStream();
        try { this.state.stream = await this._open(better.deviceId, this._saved('mic')); } catch { this.state.stream = await this._open('', this._saved('mic')); }
        list = await this._listDevices();
      }
    }
    this._attachPreview();
    this._renderPickers(list);
    say('Camera and microphone are on. Say something: the bar should move.');
    document.getElementById('ivStart').disabled = false;
  },

  _deviceMessage(e, what) {
    const name = e && e.name;
    if (name === 'NotAllowedError') return `${what} permission is blocked: click the lock or camera icon in the address bar and allow it.`;
    if (name === 'NotFoundError') return `no ${what.toLowerCase()} was found.`;
    if (name === 'NotReadableError') return `another app (Zoom, Teams, Phone Link) is using the ${what.toLowerCase()}. Close it and try again.`;
    return `the ${what.toLowerCase()} could not be started.`;
  },

  /** Try the camera and the microphone one at a time and combine whatever works into one stream. */
  async _openEach() {
    const md = navigator.mediaDevices;
    const attempt = async (constraints) => {
      try { return { stream: await md.getUserMedia(constraints) }; } catch (e) { return { err: e }; }
    };
    const cam = await attempt({ video: this._constraints(this._saved('cam'), '').video });
    const mic = await attempt({ audio: this._constraints('', this._saved('mic')).audio });
    const tracks = [...(cam.stream ? cam.stream.getVideoTracks() : []), ...(mic.stream ? mic.stream.getAudioTracks() : [])];
    let stream = null;
    if (cam.stream && mic.stream) stream = typeof MediaStream === 'function' ? new MediaStream(tracks) : cam.stream;
    else stream = cam.stream || mic.stream || null;
    return {
      stream, camOk: Boolean(cam.stream), micOk: Boolean(mic.stream),
      camMsg: cam.err ? this._deviceMessage(cam.err, 'Camera') : '', micMsg: mic.err ? this._deviceMessage(mic.err, 'Microphone') : ''
    };
  },

  async _listDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      return { cams: all.filter((d) => d.kind === 'videoinput'), mics: all.filter((d) => d.kind === 'audioinput') };
    } catch {
      return { cams: [], mics: [] };
    }
  },

  _attachPreview() {
    const video = document.getElementById('ivPreview');
    if (video) video.srcObject = this.state.stream;
    const empty = document.getElementById('ivPreviewEmpty');
    if (empty) empty.hidden = true;
    this._startMeter(document.getElementById('ivMeterSetup'));
  },

  _renderPickers(list) {
    const camSel = document.getElementById('ivCam');
    const micSel = document.getElementById('ivMic');
    const wrap = document.getElementById('ivPickers');
    if (!camSel || !micSel || !wrap) return;
    const curCam = this._deviceId(this.state.stream, 'video');
    const curMic = this._deviceId(this.state.stream, 'audio');
    const fill = (sel, items, cur, fallback) => {
      sel.innerHTML = items.map((d, i) => `<option value="${Sanitize.html(d.deviceId)}" ${d.deviceId === cur ? 'selected' : ''}>${Sanitize.html(d.label || `${fallback} ${i + 1}`)}</option>`).join('');
    };
    fill(camSel, list.cams, curCam, 'Camera');
    fill(micSel, list.mics, curMic, 'Microphone');
    wrap.hidden = list.cams.length < 2 && list.mics.length < 2;
    this._paintMicHint(list);
    camSel.onchange = () => this._switchDevices();
    micSel.onchange = () => this._switchDevices();
  },

  /** Voice recognition always listens to the system default microphone, whatever is picked here. If the two differ,
      the level bar can move while no words appear, so say so. */
  _paintMicHint(list) {
    const hint = document.getElementById('ivMicHint');
    const micSel = document.getElementById('ivMic');
    if (!hint || !micSel) return;
    const def = list.mics.find((d) => d.deviceId === 'default');
    const chosen = list.mics.find((d) => d.deviceId === micSel.value);
    const differs = def && chosen && chosen.deviceId !== 'default' && def.groupId && chosen.groupId && def.groupId !== chosen.groupId;
    hint.hidden = !differs;
    if (differs) {
      hint.textContent = 'Heads up: voice recognition always uses your system default microphone (' + (def.label || 'default') + '), not the one chosen here. If the level bar moves but your words do not appear, pick that microphone here too, or change the default in Windows Sound settings.';
    }
  },

  /** The user picked another camera or microphone: restart the stream with it and remember the choice. */
  async _switchDevices() {
    const camId = document.getElementById('ivCam').value;
    const micId = document.getElementById('ivMic').value;
    const msg = document.getElementById('ivDeviceMsg');
    this._stopStream();
    try {
      this.state.stream = await this._open(camId, micId);
    } catch {
      if (msg) msg.textContent = 'That device could not be opened. Pick another one.';
      document.getElementById('ivStart').disabled = true;
      return;
    }
    this._remember('cam', camId);
    this._remember('mic', micId);
    this._attachPreview();
    this._paintMicHint(await this._listDevices());
    if (msg) msg.textContent = 'Switched. Say something: the bar should move.';
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
      const level = Math.min(100, Math.round((peak / 64) * 100));
      el.style.width = `${level}%`;
      s.micPeak = Math.max(s.micPeak || 0, level);
      s.meterRaf = requestAnimationFrame(tick);
    };
    tick();
  },

  /* ---------------------------------------------------------------- interview flow */

  async _start() {
    this._readConfig();
    const s = this.state;
    if (s.cfg.focus === 'resume' && this.countWords(s.cfg.resume) < 15) {
      const el = document.getElementById('ivResume');
      if (el) { el.focus(); }
      this._notifySetup('Paste at least a few lines of your resume (projects, skills) so Aria has something to ask about.');
      return;
    }
    s.history = []; s.asked = 0; s.durations = []; s.buffer = ''; s.interim = ''; s.mode = 'ai'; s.notice = '';
    s.timeouts = 0; s.lastWasFollowUp = false;
    s.plan = this._buildPlan();
    s.phase = 'room';
    s.startedAt = Date.now();
    this._renderRoom();
    await this._nextQuestion();
  },

  _notifySetup(text) {
    const msg = document.getElementById('ivDeviceMsg');
    if (msg) msg.textContent = text;
  },

  _shuffle(a) {
    return a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  },

  /** Skills and project lines pulled from the pasted resume, used for the offline resume interview. */
  _resumeFacts(text) {
    const lower = String(text || '').toLowerCase();
    const known = typeof ROLE_SKILLS !== 'undefined' ? [...new Set(Object.values(ROLE_SKILLS).flatMap((r) => r.skills.map((x) => x.name)))] : [];
    const saved = (typeof DB !== 'undefined' ? DB.getGlobal('lastResumeSkills') : null) || [];
    const skills = [...new Set([...saved, ...known.filter((k) => lower.includes(k.toLowerCase().split('/')[0].trim()))])].filter((k) => typeof k === 'string' && k.length > 1).slice(0, 8);
    const projects = String(text || '').split(/\n+/).map((l) => l.replace(/^[\s\-•*·\d.)]+/, '').trim())
      .filter((l) => l.length > 25 && /project|built|develop|creat|design|implement|led|deploy/i.test(l)).map((l) => l.slice(0, 150)).slice(0, 4);
    return { skills, projects };
  },

  /** Offline plan. Builds the opener, a mix of questions drawn from the banks that fit the chosen type, focus and company, and a closer. */
  _buildPlan() {
    const { role, type, total, focus, company, resume } = this.state.cfg;
    const bank = typeof INTERVIEW_BANK !== 'undefined' ? INTERVIEW_BANK : { opener: 'Please introduce yourself.', closer: 'Anything you would like to add?', hr: [], technical: {} };
    const tech = this._shuffle(bank.technical[role] || bank.technical.SDE || []);
    const hr = this._shuffle(bank.hr || []);
    const typed = {
      fundamentals: bank.fundamentals, coding: bank.coding, systemdesign: bank.systemDesign, situational: bank.situational, puzzles: bank.puzzles
    };
    let pools;
    let sequential = false; // focused types use up their own pool before borrowing from another
    let opener = bank.opener;
    if (focus === 'company' && bank.company && bank.company[company]) {
      const extra = this._shuffle(bank.company[company].extra);
      const asked = (typeof COMPANY_QUESTIONS !== 'undefined' && COMPANY_QUESTIONS[company]) || [];
      const company_hr = this._shuffle(asked.filter((q) => !/introduce yourself|tell me about yourself/i.test(q)).map((q) => ({ q, keywords: [] })));
      pools = [extra, company_hr, tech, hr];
      opener = `Hello, I am Aria. Today's interview follows the style of ${company} campus hiring. To begin, please introduce yourself.`;
    } else if (focus === 'resume') {
      const { skills, projects } = this._resumeFacts(resume);
      const projQ = projects.map((p) => ({ q: `Your resume says: "${p}". What was your exact role, and what was the hardest problem you solved there?`, keywords: ['i ', 'built', 'problem', 'because', 'result', ...p.toLowerCase().split(/\W+/).filter((w) => w.length > 5).slice(0, 4)] }));
      const skillQ = skills.slice(0, 4).map((k) => ({ q: `You list ${k} on your resume. Describe a situation where you used it, and a problem you solved with it.`, keywords: [k.toLowerCase().split('/')[0].trim(), 'project', 'problem', 'used', 'result'] }));
      pools = [projQ, skillQ, tech, hr];
      opener = 'Hello, I am Aria. I have read your resume. To begin, give me a quick summary of yourself and the project you are proudest of.';
    } else if (typed[type] && typed[type].length) {
      pools = [this._shuffle(typed[type]), type === 'situational' ? hr : tech];
      sequential = true;
    } else if (type === 'technical') {
      pools = [tech, this._shuffle(bank.fundamentals || [])];
      sequential = true;
    } else if (type === 'hr') {
      pools = [hr, this._shuffle(bank.situational || [])];
      sequential = true;
    } else {
      pools = [tech, hr];
    }
    const mid = [];
    const want = Math.max(1, total - 2);
    for (let i = 0; mid.length < want && pools.some((p) => p.length); i++) {
      const pool = sequential || !pools[i % pools.length].length ? pools.find((p) => p.length) : pools[i % pools.length];
      mid.push(pool.shift());
    }
    return [{ q: opener, keywords: [] }, ...mid, { q: bank.closer, keywords: [] }].slice(0, total);
  },

  async _api(action, extra = {}) {
    const s = this.state;
    const res = await fetch('/api/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action, role: s.cfg.role, type: s.cfg.type, level: s.cfg.level, total: s.cfg.total, answerSeconds: s.cfg.answerSeconds,
        company: s.cfg.focus === 'company' ? s.cfg.company : '',
        resume: s.cfg.focus === 'resume' ? s.cfg.resume : '',
        history: s.history, ...extra
      })
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
    if (!question) {
      // Pressure round, offline: a thin answer gets a sharp follow-up before the interview moves on.
      const last = s.history[s.history.length - 1];
      const pressure = typeof INTERVIEW_BANK !== 'undefined' && INTERVIEW_BANK.pressure;
      if (s.cfg.answerSeconds && pressure && !s.lastWasFollowUp && s.asked > 1 && last && last.role === 'candidate' && this.countWords(last.content) < 15 && s.asked < s.cfg.total - 1) {
        question = pressure[s.asked % pressure.length];
        s.lastWasFollowUp = true;
      } else {
        question = (s.plan[Math.min(s.asked - (s.history.filter((t) => t.followUp).length), s.plan.length - 1)] || s.plan[s.plan.length - 1]).q;
        s.lastWasFollowUp = false;
      }
    } else {
      s.lastWasFollowUp = false;
    }
    if (s.phase !== 'room') return;
    s.history.push({ role: 'interviewer', content: question, followUp: s.lastWasFollowUp });
    s.asked++;
    s.noAnswerRetries = 0;
    this._paintProgress();
    this._say(question);
  },

  /** Target pace in words per minute. Everyday conversation is roughly 150 to 160. */
  WPM: { slow: 125, normal: 155, fast: 185 },

  _rateKey() {
    const k = this._saved('rate');
    return this.WPM[k] ? k : 'normal';
  },

  _targetWpm(key = this._rateKey()) {
    return this.WPM[key];
  },

  /** True for the plain built-in desktop voices, which speak slowly at rate 1 and respond in coarse steps. */
  _isLocalVoice(v) {
    return Boolean(v) && /microsoft|sapi/i.test(v.name) && !/online|natural|neural/i.test(v.name);
  },

  _rateSlot(voice, key) {
    return `rate_${voice ? voice.voiceURI : 'default'}_${key}`;
  },

  /** Speech rate for this voice at the chosen speed. Voices differ a lot (rate 1 can be 120 or 170 words per
      minute), so the rate is learned: it starts from a sensible guess and is corrected after each sentence
      from how long Aria actually took. The learned value is remembered per voice and speed. */
  _rateFor(voice, key = this._rateKey()) {
    const saved = parseFloat(this._saved(this._rateSlot(voice, key)));
    if (saved >= 0.7 && saved <= 2.4) return saved;
    const base = this._isLocalVoice(voice) ? 1.5 : 1.1;
    return Math.min(2.4, Math.max(0.7, base * (this._targetWpm(key) / 155)));
  },

  /** Adjust the stored rate toward the target pace using one measured sentence. Ignores short or odd samples. */
  _learn(voice, rate, words, seconds, key = this._rateKey()) {
    if (words < 8 || seconds < 2) return null;
    const wpm = (words / seconds) * 60;
    const next = Math.min(2.4, Math.max(0.7, rate * Math.pow(this._targetWpm(key) / wpm, 0.8)));
    this._remember(this._rateSlot(voice, key), next.toFixed(2));
    return next;
  },

  /** Higher is better: natural / neural voices first, then Indian English, then any English voice. */
  _scoreVoice(v) {
    if (!/^en/i.test(v.lang)) return -1;
    let n = 1;
    if (/natural|neural|online/i.test(v.name)) n += 6;
    if (/en[-_]IN/i.test(v.lang)) n += 3;
    if (/google/i.test(v.name)) n += 1;
    if (/female|zira|aria|jenny|neerja|samantha|heera/i.test(v.name)) n += 1;
    return n;
  },

  _englishVoices() {
    if (!this.speechSupport().synthesis) return [];
    return window.speechSynthesis.getVoices().filter((v) => this._scoreVoice(v) > 0).sort((a, b) => this._scoreVoice(b) - this._scoreVoice(a));
  },

  _pickVoice() {
    if (!this.speechSupport().synthesis) return null;
    const list = this._englishVoices();
    const saved = this._saved('voice');
    return list.find((v) => v.voiceURI === saved) || list[0] || null;
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
    u.rate = this._rateFor(v);
    const startedAt = performance.now();
    const words = this.countWords(text);
    u.onend = () => {
      // Skip the first ~0.3 s: engines take a moment to start talking.
      this._learn(v, u.rate, words, (performance.now() - startedAt - 300) / 1000);
      done();
    };
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
    s.noSpeech = 0;
    s.micPeak = 0;
    if (!s.typedMode) this._notify('');
    this._startAnswerClock();
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
    clearTimeout(s.soundTimer);
    s.soundTimer = setTimeout(() => {
      if (this.state === s && s.phase === 'room' && !s.busy && !s.typedMode && (s.micPeak || 0) < 4) {
        this._notify('No sound is reaching the microphone yet. Check that the bar by your video moves when you speak, choose the right microphone, or use "Type instead".');
      }
    }, 8000);
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
      s.noSpeech = 0;
      s.lastSpeechAt = Date.now();
      const el = document.getElementById('ivAnswer');
      if (el) el.textContent = (s.buffer + interim).trim();
    };
    r.onerror = (e) => {
      if (this.state !== s || s.recog !== r) return;
      const err = e && e.error;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        this._useTyping('Speech recognition was blocked by the browser, so you can type your answers.');
      } else if (err === 'network') {
        this._useTyping('Voice recognition could not reach its online service. Chrome and Edge send your speech to an online service for this, so it needs internet and does not work in some browsers (for example Brave). You can type your answers instead.');
      } else if (err === 'audio-capture') {
        this._useTyping('The speech engine could not use a microphone. Close other apps that use it (Zoom, Teams, Phone Link), check Windows Sound settings, or type your answers.');
      } else if (err === 'no-speech') {
        s.noSpeech = (s.noSpeech || 0) + 1;
        if (s.noSpeech >= 3) this._notify('I cannot hear you. Check that the bar by your video moves when you speak, move closer to the microphone, or use "Type instead".');
      }
    };
    r.onend = () => { if (this.state === s && s.phase === 'room' && !s.busy && s.recog === r && !s.typedMode) { try { r.start(); } catch { /* already running */ } } };
    s.recog = r;
    try { r.start(); } catch { /* already running */ }
  },

  /** Voice answers cannot work here (blocked, offline or no microphone): switch to typing and say why. */
  _useTyping(reason) {
    const s = this.state;
    s.typedMode = true;
    this._stopRecognition();
    this._notify(reason);
    if (s.phase !== 'room' || s.busy) return;
    const typed = document.getElementById('ivTyped');
    if (typed) { typed.hidden = false; typed.focus(); }
    this._setStatus('typing');
    const toggle = document.getElementById('ivTypedToggle');
    if (toggle) toggle.textContent = 'Use voice instead';
  },

  _stopRecognition() {
    const s = this.state;
    if (s.recog) { const r = s.recog; s.recog = null; r.onend = null; r.onresult = null; r.onerror = null; try { r.abort(); } catch { /* not running */ } }
    clearInterval(s.silenceTimer);
  },

  /** Per-answer countdown for the pressure round. Runs while the candidate is answering. */
  _startAnswerClock() {
    const s = this.state;
    clearInterval(s.answerTimer);
    const limit = s.cfg.answerSeconds;
    const chip = document.getElementById('ivAnswerChip');
    if (chip) chip.hidden = !limit;
    if (!limit) return;
    s.answerLeft = limit;
    this._paintAnswerClock();
    s.answerTimer = setInterval(() => {
      if (!document.getElementById('ivAnswerClock')) { clearInterval(s.answerTimer); return; }
      s.answerLeft--;
      this._paintAnswerClock();
      if (s.answerLeft <= 0) { clearInterval(s.answerTimer); this._submit({ timedOut: true }); }
    }, 1000);
  },

  _paintAnswerClock() {
    const s = this.state;
    const el = document.getElementById('ivAnswerClock');
    if (!el) return;
    const t = Math.max(0, s.answerLeft);
    el.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const chip = document.getElementById('ivAnswerChip');
    if (chip) chip.classList.toggle('iv-low', t <= 10);
  },

  async _submit({ timedOut = false } = {}) {
    const s = this.state;
    if (s.busy || s.phase !== 'room') return;
    s.busy = true;
    clearInterval(s.answerTimer);
    const typed = document.getElementById('ivTyped');
    const spoken = (s.buffer + ' ' + s.interim).replace(/\s+/g, ' ').trim();
    const text = (typed && !typed.hidden ? typed.value.trim() : '') || spoken;
    this._stopRecognition();
    if (typed) typed.hidden = true;
    window.speechSynthesis && window.speechSynthesis.cancel();
    if (timedOut) s.timeouts++;
    if (!text) {
      if (!timedOut && s.noAnswerRetries++ < 1) {
        document.getElementById('ivAnswer').textContent = 'I did not catch that. Please answer again, or use "Type instead".';
        this._listen();
        return;
      }
      s.history.push({ role: 'candidate', content: '(no answer)', timedOut });
    } else {
      s.history.push({ role: 'candidate', content: text, timedOut });
    }
    s.durations.push((Date.now() - s.answerStartedAt) / 1000);
    const endBtn = document.getElementById('ivEnd');
    if (endBtn) { endBtn.disabled = false; endBtn.removeAttribute('title'); }
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

  /** Finish early but still get feedback on what has been answered. */
  async _end() {
    const s = this.state;
    if (s.phase !== 'room' || !s.history.some((t) => t.role === 'candidate')) return;
    const ok = await this._confirm('End the interview now and get feedback on what you have answered so far?', 'End interview', 'End and get feedback');
    if (!ok || this.state !== s || s.phase !== 'room') return;
    s.busy = true;
    await this._finish();
  },

  /** Abandon the interview: no feedback, nothing saved, camera and microphone off. */
  async _cancel() {
    const s = this.state;
    if (s.phase !== 'room') return;
    const ok = await this._confirm('Cancel this interview? Your answers will not be scored or saved.', 'Cancel interview', 'Cancel interview');
    if (!ok || this.state !== s || s.phase !== 'room') return;
    const keep = s.cfg;
    this.render(this.container, keep);
    if (typeof App !== 'undefined' && App.showToast) App.showToast('Interview cancelled. Nothing was saved.', 'info');
  },

  async _confirm(message, title, confirmLabel) {
    const s = this.state;
    s.confirming = true;
    try {
      return typeof App !== 'undefined' && App.confirm ? await App.confirm(message, { title, confirmLabel, cancelLabel: 'Keep going' }) : true;
    } finally {
      if (this.state === s) s.confirming = false;
    }
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
          <span class="chip">${Sanitize.html(this._focusLabel())}</span>
          <span class="chip" id="ivAnswerChip" hidden>Answer time <span id="ivAnswerClock">0:00</span></span>
          <span id="ivNotice" class="text-dim" style="font-size:12.5px"></span>
        </div>
        <div class="iv-alert" id="ivAlert" role="alert" hidden></div>
        <div class="iv-stage">
          <div class="iv-tile iv-interviewer"><div class="iv-avatar" id="ivAvatar" aria-hidden="true">A</div><div class="iv-name">Aria, interviewer</div><div class="iv-state" id="ivState" role="status" aria-live="polite"></div></div>
          <div class="iv-tile iv-me"><video id="ivVideo" autoplay muted playsinline aria-label="Your camera"></video><div class="iv-empty" id="ivVideoEmpty" ${s.stream && s.stream.getVideoTracks().length ? 'hidden' : ''}>Camera off</div><div class="iv-name">You</div><div class="iv-meter" aria-hidden="true"><i id="ivMeter"></i></div></div>
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
          <label class="iv-speed" for="ivSpeedRoom">Voice speed
            <select id="ivSpeedRoom" aria-label="Aria's speaking speed">
              <option value="slow" ${this._rateKey() === 'slow' ? 'selected' : ''}>Slow</option>
              <option value="normal" ${this._rateKey() === 'normal' ? 'selected' : ''}>Natural</option>
              <option value="fast" ${this._rateKey() === 'fast' ? 'selected' : ''}>Fast</option>
            </select>
          </label>
          <button type="button" class="btn btn-ghost" id="ivEnd" disabled title="Available after your first answer">End and get feedback</button>
          <button type="button" class="btn btn-ghost iv-cancel" id="ivCancel">Cancel interview</button>
        </div>
      </div>`;
    const $ = (id) => document.getElementById(id);
    $('ivDone').addEventListener('click', () => this._submit());
    $('ivRepeat').addEventListener('click', () => this._repeat());
    $('ivTypedToggle').addEventListener('click', () => this._toggleTyped());
    $('ivEnd').addEventListener('click', () => this._end());
    $('ivCancel').addEventListener('click', () => this._cancel());
    $('ivSpeedRoom').addEventListener('change', () => this._remember('rate', $('ivSpeedRoom').value));
    document.removeEventListener('keydown', this._escHandler);
    this._escHandler = (e) => { if (e.key === 'Escape' && this.state && this.state.phase === 'room' && !this.state.confirming && !document.getElementById('appConfirmModal')) this._cancel(); };
    document.addEventListener('keydown', this._escHandler);
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
    const el = document.getElementById('ivAlert');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
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
    clearInterval(s.answerTimer);
    document.removeEventListener('keydown', this._escHandler);
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
          <div class="card"><div class="card-stat">${this.state.cfg.answerSeconds ? stats.timeouts : stats.fillers}</div><div class="card-stat-label">${this.state.cfg.answerSeconds ? 'Ran out of time' : 'Filler words'}</div></div>
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
    clearInterval(s.answerTimer);
    clearTimeout(s.soundTimer);
    document.removeEventListener('keydown', this._escHandler);
    if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch { /* unsupported */ } }
    this._stopStream();
  }
};
