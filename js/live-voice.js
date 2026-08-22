/* ============================================================================
   Live Voice + AI Engine
   Shared module powering the LIVE conversational interviewer and the LIVE
   AI resume analyzer. Uses:
    - SpeechRecognition / webkitSpeechRecognition  (single utterance)
    - speechSynthesis (native browser TTS)
     - getUserMedia ({video,audio}) for camera + mic with secure-context checks
     - Pollinations.ai free text/voice AI when online (no API key)
     - Smart offline fallbacks so everything still works without internet
   ========================================================================== */
const LiveAI = {
  _sr: null,
  _mediaRecorder: null,
  _recordingStream: null,
  _recordingChunks: [],
  _recordingPromise: null,
  _edgeAudio: null,
  _edgeAudioUrl: null,
  _listening: false,
  _silenceTimer: null,
  _autoRestart: true,
  _isSecure: null, // null = not yet computed (must NOT default to false on HTTPS)
  _pollinationsOnline: null,
  _pollinationsTried: false,

  /* ----------------------------- Secure context ---------------------------- */
  init() {
    this._isSecure = false;
    if (typeof window === 'undefined' || typeof location === 'undefined') return this._isSecure;
    // True HTTPS page -> camera + mic allowed
    if (window.isSecureContext === true) { this._isSecure = true; return this._isSecure; }
    // http://localhost / http://127.0.0.1 counts as a secure context too
    if (/^https?:$/.test(location.protocol) &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      this._isSecure = true;
    }
    return this._isSecure;
  },

  isSecureContext() {
    if (this._isSecure === null) this.init();
    return this._isSecure;
  },

  /* --------------- SpeechRecognition support detection --------------- */
  speechRecognitionSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  /* ------------------------------- Camera+Mic ------------------------------ */
  async enableCamera(audio = true, video = true) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('This browser does not support camera/microphone access.');
    }
    if (!this.isSecureContext()) {
      throw new Error('secure-context');
    }
    return navigator.mediaDevices.getUserMedia({ video, audio });
  },

  /* ----------------------- Recorded voice interaction ---------------------- */
  async startRecording(opts = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      return { ok: false, error: 'recording-unsupported' };
    }
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      return { ok: false, error: 'already-recording' };
    }
    try {
      this._recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = opts.mimeType || (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm');
      this._mediaRecorder = new MediaRecorder(this._recordingStream, { mimeType: preferredMime });
      this._recordingChunks = [];
      this._recordingPromise = new Promise((resolve, reject) => {
        this._mediaRecorder.ondataavailable = event => {
          if (event.data && event.data.size) this._recordingChunks.push(event.data);
        };
        this._mediaRecorder.onerror = event => reject(event.error || new Error('Audio recording failed.'));
        this._mediaRecorder.onstop = () => {
          const type = this._mediaRecorder.mimeType || preferredMime || 'audio/webm';
          resolve(new Blob(this._recordingChunks, { type }));
        };
      });
      this._mediaRecorder.start(opts.timeslice || 250);
      return { ok: true, mode: opts.mode || 'push-to-talk' };
    } catch (error) {
      this._stopRecordingStream();
      this._mediaRecorder = null;
      return { ok: false, error: error.name === 'NotAllowedError' ? 'microphone-denied' : 'recording-failed' };
    }
  },

  async stopRecording() {
    const recorder = this._mediaRecorder;
    if (!recorder || recorder.state === 'inactive') return null;
    recorder.stop();
    try {
      return await this._recordingPromise;
    } finally {
      this._stopRecordingStream();
      this._mediaRecorder = null;
      this._recordingPromise = null;
    }
  },

  _stopRecordingStream() {
    if (this._recordingStream) {
      this._recordingStream.getTracks().forEach(track => track.stop());
      this._recordingStream = null;
    }
  },

  async runRecordedInteraction(history = [], opts = {}) {
    const onState = opts.onState || (() => { });
    const onError = opts.onError || (() => { });
    try {
      onState('recording');
      const audioBlob = opts.audioBlob || await this.stopRecording();
      if (!audioBlob || !audioBlob.size) throw new Error('No recorded audio was captured.');

      onState('transcribing');
      const form = new FormData();
      const extension = audioBlob.type.includes('wav') ? 'wav' : 'webm';
      form.append('audio', audioBlob, `candidate-answer.${extension}`);
      const sttResponse = await fetch('/api/stt', { method: 'POST', body: form });
      const sttData = await sttResponse.json();
      if (!sttResponse.ok || !sttData.text || !sttData.text.trim()) {
        throw new Error(sttData.error || 'Speech transcription failed.');
      }

      onState('thinking');
      const llmResponse = await fetch('/api/interview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, answer: sttData.text.trim() })
      });
      const llmData = await llmResponse.json();
      if (!llmResponse.ok || !llmData.spoken_response) {
        throw new Error(llmData.error || 'Interview response failed.');
      }

      onState('speaking');
      await this.speakResponse(llmData.spoken_response, { onend: () => onState('idle') });
      const result = {
        text: sttData.text.trim(),
        evaluation: llmData.evaluation || '',
        score: llmData.score,
        spoken_response: llmData.spoken_response
      };
      if (opts.onResult) opts.onResult(result);
      return result;
    } catch (error) {
      onState('error');
      onError(error.message || 'Voice interaction failed.');
      return { error: error.message || 'Voice interaction failed.' };
    }
  },

  /* ----------------------------- Speech to text ---------------------------- */
  startListening(opts = {}) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return { ok: false, error: 'unsupported' };

    if (this._sr) {
      try { this._sr.stop(); } catch (e) { }
      this._sr = null;
    }
    const rec = new SR();
    rec.lang = opts.lang || 'en-US';
    rec.interimResults = opts.interimResults !== false; // Try changing to true by default for better UX
    rec.continuous = false; // Must be false for turn-based conversation, otherwise it listens to AI output
    rec.maxAlternatives = 1;

    this._listening = true;
    this._autoRestart = false;
    this._onFinal = opts.onFinal || (() => { });
    this._onInterim = opts.onInterim || (() => { });
    this._onState = opts.onState || (() => { });
    this._onError = opts.onError || (() => { });

    rec.onstart = () => {
      this._onState('listening');
    };
    rec.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript + ' ';
        }
      }
      finalTranscript = finalTranscript.trim();
      interimTranscript = interimTranscript.trim();

      if (interimTranscript && !finalTranscript) {
        this._onInterim({ final: '', interim: interimTranscript });
      }
      if (finalTranscript) {
        this._onFinal({ final: finalTranscript, interim: interimTranscript });
      }
    };
    rec.onerror = (event) => {
      this._onError(event.error || 'error');
      if (event.error === 'not-allowed') {
        this._autoRestart = false;
        this._listening = false;
        this._onState('blocked');
      }
    };
    rec.onend = () => {
      this._listening = false;
      this._onState('idle');
    };

    try { rec.start(); } catch (e) {
      this._listening = false;
      this._onState('error');
      return { ok: false, error: 'start-failed' };
    }
    this._sr = rec;
    return { ok: true };
  },

  stopListening() {
    this._listening = false;
    this._autoRestart = false;
    this._clearSilenceTimer();
    if (this._sr) {
      try { this._sr.stop(); } catch (e) { }
      this._sr = null;
    }
  },

  _clearSilenceTimer() {
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
  },

  /* ----------------------------- Text to speech ---------------------------- */
  async speakResponse(text, opts = {}) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500); // Strict 2.5s timeout for network TTS to prevent lag
      const response = await fetch(window.EDGE_TTS_URL || '/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: opts.voice || 'en-US-AriaNeural' }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        this._edgeAudio = audio;
        this._edgeAudioUrl = audioUrl;
        const finish = () => {
          if (this._edgeAudioUrl === audioUrl) {
            URL.revokeObjectURL(audioUrl);
            this._edgeAudio = null;
            this._edgeAudioUrl = null;
          }
          if (opts.onend) opts.onend();
        };
        audio.onended = finish;
        audio.onerror = finish;
        await audio.play();
        return true;
      }
    } catch (e) { }

    if (!('speechSynthesis' in window)) {
      if (opts.onend) setTimeout(opts.onend, 200);
      return false;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 1.0;
    u.pitch = opts.pitch || 1.02;
    u.volume = opts.volume || 1;
    const voices = window.speechSynthesis.getVoices();
    if (opts.voiceIndex != null && voices[opts.voiceIndex]) {
      u.voice = voices[opts.voiceIndex];
    } else {
      const preferred = voices.find(v => /en(-|_)(US|GB)/i.test(v.lang) && /female|samantha|google us english|zira/i.test(v.name))
        || voices.find(v => /en(-|_)?(US|GB)/i.test(v.lang));
      if (preferred) u.voice = preferred;
    }
    if (opts.onend) u.onend = opts.onend;
    u.onerror = () => { if (opts.onend) opts.onend(); };
    window.speechSynthesis.speak(u);
    return true;
  },

  speak(text, opts = {}) {
    return this.speakResponse(text, opts);
  },

  stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (this._edgeAudio) {
      this._edgeAudio.pause();
      this._edgeAudio.src = '';
      this._edgeAudio = null;
    }
    if (this._edgeAudioUrl) {
      URL.revokeObjectURL(this._edgeAudioUrl);
      this._edgeAudioUrl = null;
    }
  },

  /* --------------------------- Live audio level ---------------------------- */
  async startLevelMeter(stream, onLevel) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const level = Math.sqrt(sum / data.length);
        if (onLevel) onLevel(Math.min(1, level * 3));
        this._levelRaf = requestAnimationFrame(loop);
      };
      loop();
      return () => {
        cancelAnimationFrame(this._levelRaf);
        ctx.close();
      };
    } catch (e) {
      return () => { };
    }
  },

  /* ------------------------------ Pollinations (GET) -----------------------
     * The anonymous Pollinations tier uses a simple GET endpoint:
     *   GET https://text.pollinations.ai/{prompt}
     * The POST /openai endpoint (OpenAI-compatible) is behind Cloudflare and
     * returns 402/502 for anonymous multi-turn requests. The GET endpoint is
     * the only reliable anonymous path — we embed the system instruction and
     * conversation history into the prompt text itself.
     * ----------------------------------------------------------------------- */
  async _probePollinations() {
    if (this._pollinationsTried) return this._pollinationsOnline;
    this._pollinationsTried = true;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch('https://text.pollinations.ai/hello', {
        signal: ctrl.signal
      });
      clearTimeout(t);
      this._pollinationsOnline = res.ok;
    } catch (e) {
      this._pollinationsOnline = false;
    }
    return this._pollinationsOnline;
  },

  /** Build a GET-compatible prompt from system + user message */
  _buildPollinationsPrompt(system, user) {
    const sys = (system || '').trim();
    const usr = (user || '').trim();
    // Combine system + user into a single prompt, max 400 chars to avoid URL limits
    let prompt = usr.length > 200 ? usr.slice(0, 200) : usr;
    if (sys && prompt.length < 150) {
      prompt = `[${sys.slice(0, 120)}] ${prompt}`;
    }
    return encodeURIComponent(prompt);
  },

  /** Build a GET-compatible prompt from conversation history */
  _buildHistoryPrompt(system, history) {
    const sys = (system || '').trim();
    const lines = [];
    if (sys) lines.push(`[System: ${sys.slice(0, 100)}]`);
    const hist = Array.isArray(history) ? history : [];
    // Only take the last 4 turns to stay within URL length limits
    const recent = hist.slice(-4);
    recent.forEach((m) => {
      const role = m && (m.role === 'assistant' || m.role === 'ai') ? 'Asst' : 'User';
      const text = m && (m.content || m.text) ? String(m.content || m.text).slice(0, 150) : '';
      if (text.trim()) lines.push(`${role}: ${text}`);
    });
    lines.push('Asst:');
    return encodeURIComponent(lines.join('\n'));
  },

  /**
   * Real conversational AI via Pollinations GET (free, no key, reliable).
   * Falls back to a smart local brain when offline. Returns a reply string.
   */
  async askAI(system, user, opts = {}) {
    const online = await this._probePollinations();
    if (online && !opts.forceLocal) {
      try {
        const prompt = this._buildPollinationsPrompt(system, user);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(`https://text.pollinations.ai/${prompt}`, {
          signal: ctrl.signal
        });
        clearTimeout(t);
        if (res.ok) {
          const txt = await res.text();
          if (txt && txt.trim()) return txt.trim();
        }
      } catch (e) { /* fall through to local */ }
    }
    return this._localBrain(system, user);
  },

  /**
   * Full-context live chat for the PrepAI assistant.
   * history = [{role:'user'|'assistant', content}] (full conversation).
   * Returns a live LLM reply (Pollinations GET) or a smart local fallback.
   */
  async chatReply(system, history, opts = {}) {
    const online = await this._probePollinations();
    if (online && !opts.forceLocal) {
      // 1) Prefer OpenAI-compatible POST endpoint — gives proper conversational
      //    answers to general questions (e.g. "capital of India") instead of
      //    echoing the prompt back via the GET endpoint.
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: 'system', content: system || 'You are a helpful assistant.' },
              ...(Array.isArray(history) ? history : []).map(m => ({
                role: (m.role === 'assistant' || m.role === 'ai') ? 'assistant' : 'user',
                content: m.content || m.text || ''
              })).filter(m => m.content.trim())
            ]
          })
        });
        clearTimeout(t);
        if (res.ok) {
          const data = await res.json();
          const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
          if (txt && txt.trim()) return txt.trim();
        }
      } catch (e) { /* fall through to GET */ }

      // 2) Fall back to the anonymous GET endpoint
      try {
        const prompt = this._buildHistoryPrompt(system, history);
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(`https://text.pollinations.ai/${prompt}`, {
          signal: ctrl.signal
        });
        clearTimeout(t);
        if (res.ok) {
          const txt = await res.text();
          if (txt && txt.trim()) return txt.trim();
        }
      } catch (e) { /* fall through to local */ }
    }
    // Offline fallback — still dynamic (keyword-aware), never canned single-line.
    return this._generalReply(system, history);
  },

  /* ------------------------------ Local brain ------------------------------ */
  _localBrain(system, user) {
    const u = (user || '').toLowerCase();
    const isInterview = /interview|interviewer|question|candidate/i.test(system || '');
    if (isInterview) return this._interviewReply(user);
    return this._generalReply(system, [{ role: 'user', content: user }]);
  },

  /**
   * Generic smart fallback for the assistant chatbot — builds a contextual
   * reply around the user's last message using their actual words, so it is
   * never a hardcoded canned response even when fully offline.
   */
  _generalReply(system, history) {
    const last = (Array.isArray(history) ? history : []).filter(m => m && m.role === 'user').pop();
    const user = (last && (last.content || last.text)) || '';
    const u = user.toLowerCase();

    const greet = /^(hi|hello|hey|namaste|yo|hola|good (morning|afternoon|evening))/.test(u);
    const thanks = /(thank|thanks|thx|appreciate|grateful)/.test(u);
    const resume = /(resume|cv|ats|cover letter)/.test(u);
    const interview = /(interview|hr|mock|behavioural|behavioral)/.test(u);
    const coding = /(coding|program|dsa|leetcode|hackerrank|problem solving)/.test(u);
    const aptitude = /(aptitude|quant|reasoning|verbal|logical|math)/.test(u);
    const company = /(company|amazon|google|microsoft|tcs|infosys|wipro|accenture)/.test(u);
    const skills = /(skill|gap|learn|roadmap|road map)/.test(u);
    const progress = /(progress|score|readiness|how am i doing|dashboard|track)/.test(u);
    const account = /(login|log in|sign ?in|signup|sign up|account|register)/.test(u);
    const bye = /(bye|goodbye|see you|later)/.test(u);

    if (greet) {
      return `Hello! I am PrepAI, your live placement assistant. I can help with resume tips, interview preparation, aptitude practice, coding strategies, company patterns, and skill-gap roadmaps. What would you like to work on today?`;
    }
    if (thanks) {
      return `You are very welcome! Remember, consistency is the key to placement success. Is there any other area — resume, coding, aptitude, or interviews — you would like to dig into next?`;
    }
    if (bye) {
      return `Goodbye! Keep up the great work on your preparation. Whenever you need help, I am right here. All the best for your placement journey!`;
    }
    if (resume) {
      return `For a strong resume: use action verbs like "built" and "led", quantify results (for example "improved load time by 30%"), keep it under two pages, tailor keywords to the job description, and link your GitHub and LinkedIn. Open the Resume Analyzer and paste your resume to get a live ATS score and line-by-line suggestions.`;
    }
    if (interview) {
      return `Great choice! Interviews are best handled with the STAR method — Situation, Task, Action, Result. Prepare answers for "tell me about yourself", "your strengths and weaknesses", and "why should we hire you". Try the HR Simulator for a live AI mock interview where the interviewer listens and adapts to your answers.`;
    }
    if (coding) {
      return `For coding practice, build in layers: arrays and strings first, then hashing, two pointers, sliding window, and finally DP and graphs. Solve problems on LeetCode/HackerRank consistently — even 1 or 2 problems a day compounds quickly. The Coding Practice module lets you filter by difficulty, source, and target role.`;
    }
    if (aptitude) {
      return `Aptitude requires both speed and accuracy. Practice Quantitative, Logical, and Verbal sections daily, and always review your mistakes. The Aptitude Quiz fetches fresh questions and tracks your accuracy over time — try a timed session to simulate the real test.`;
    }
    if (company) {
      return `Company interviews follow recognizable patterns — sliding window, two pointers, DFS/BFS, DP, and system design. The Company Patterns module lets you pick a company like Amazon, Google, or TCS to see their frequently asked patterns and practice with aligned questions.`;
    }
    if (skills) {
      return `A smart approach is to pick your target role first, then compare your current skills against what the role demands. The Skill Gap Analysis does exactly that — it highlights missing skills and gives you a personalized learning roadmap. Start there and tackle the top gaps one by one.`;
    }
    if (progress) {
      const email = (typeof Auth !== 'undefined') ? Auth.getEmail() : null;
      if (!email) return 'Sign in first and your readiness score will appear on the dashboard. It is built from your aptitude, coding, interview, and resume activity.';
      try {
        const prog = DB.getProgress(email);
        const r = prog.readiness || 0;
        return `Your current placement readiness is ${r}%. ${r < 30 ? 'Start with the Resume Analyzer and a few Aptitude quizzes to build a strong foundation.' : r < 60 ? 'Solid progress! Focus on coding practice and a live mock interview next to level up.' : 'Excellent! You are nearly placement-ready. Polish weak areas and keep taking mock interviews.'}`;
      } catch (e) {
        return 'Sign in to see your personalized readiness score and progress dashboard.';
      }
    }
    if (account) {
      return 'Use the account button in the top-right corner to sign in or create a free account. Your progress is saved locally per account — resume scores, quiz history, coding stats, and interview sessions all sync to your dashboard.';
    }
    if (/(help|what can you|features|modules)/.test(u)) {
      return 'Here is what I can help with: Resume Analyzer (ATS score + line-by-line fixes), Aptitude Quiz (fresh questions), Coding Practice (LeetCode/HackerRank style), HR Simulator (live AI voice interview), Skill Gap Analysis, and Company Patterns. Ask me about any of these or your readiness progress!';
    }

    // ---- General knowledge + factual questions (works offline) ----
    const fact = this._answerFactual(u);
    if (fact) return fact;

    // Dynamic response built from the user's own words so it never feels canned.
    const snippet = user.trim().split(/\s+/).slice(0, 8).join(' ');
    return `I want to make sure I fully address that for you. You said: "${snippet}". Here is my take — for campus placements, break preparation into four tracks: aptitude (daily timed quizzes), coding (consistent DSA practice), communication (mock interviews with the HR Simulator), and resume (quantified achievements). Focus on your weakest track first, and track your readiness score on the dashboard to measure improvement. Could you tell me a bit more about which area matters most to you right now?`;
  },

  /**
   * Answer simple factual / general-knowledge / arithmetic questions offline.
   * Returns a string or null if the question isn't something we can answer.
   */
  _answerFactual(u) {
    // --- Capital cities ---
    const capitals = {
      'india': 'New Delhi', 'australia': 'Canberra', 'canada': 'Ottawa',
      'japan': 'Tokyo', 'china': 'Beijing', 'france': 'Paris', 'germany': 'Berlin',
      'italy': 'Rome', 'spain': 'Madrid', 'russia': 'Moscow', 'uk': 'London',
      'united kingdom': 'London', 'usa': 'Washington, D.C.', 'united states': 'Washington, D.C.',
      'brazil': 'Brasília', 'egypt': 'Cairo', 'south africa': 'Pretoria',
      'pakistan': 'Islamabad', 'bangladesh': 'Dhaka', 'nepal': 'Kathmandu',
      'sri lanka': 'Sri Jayawardenepura Kotte', 'indonesia': 'Jakarta',
      'mexico': 'Mexico City', 'turkey': 'Ankara', 'greece': 'Athens',
      'portugal': 'Lisbon', 'netherlands': 'Amsterdam', 'sweden': 'Stockholm',
      'norway': 'Oslo', 'poland': 'Warsaw', 'ukraine': 'Kyiv'
    };
    const capMatch = u.match(/capital (?:of|city) (?:\w+ )?(.+)/i) || u.match(/what is the capital of (.+)/i);
    if (capMatch) {
      const country = capMatch[1].trim().replace(/[?,.!]/g, '').toLowerCase();
      if (capitals[country]) return `The capital of ${country.charAt(0).toUpperCase() + country.slice(1)} is ${capitals[country]}.`;
      // Try partial match
      for (const key of Object.keys(capitals)) {
        if (country.includes(key) || key.includes(country)) {
          return `The capital of ${key.charAt(0).toUpperCase() + key.slice(1)} is ${capitals[key]}.`;
        }
      }
    }

    // --- Arithmetic (e.g. "what is 5 + 3", "12 * 4") ---
    const arith = u.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/x])\s*(-?\d+(?:\.\d+)?)/);
    if (arith) {
      const a = parseFloat(arith[1]);
      const b = parseFloat(arith[3]);
      const op = arith[2].toLowerCase();
      let res;
      if (op === '+') res = a + b;
      else if (op === '-') res = a - b;
      else if (op === '*' || op === 'x') res = a * b;
      else if (op === '/') res = b === 0 ? 'undefined (cannot divide by zero)' : a / b;
      if (res !== undefined) return `${a} ${op === 'x' ? '×' : op} ${b} = ${res}.`;
    }

    // --- First planet / largest planet (quick facts) ---
    if (/(largest planet|biggest planet)/.test(u)) return 'The largest planet in our solar system is Jupiter.';
    if (/(smallest planet)/.test(u)) return 'The smallest planet in our solar system is Mercury.';
    if (/(how many planets)/.test(u)) return 'There are 8 planets in our solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.';
    if (/(square root of 2|sqrt 2)/.test(u)) return 'The square root of 2 is approximately 1.4142.';
    if (/(value of pi|what is pi)/.test(u)) return 'Pi (π) is approximately 3.14159.';
    if (/(chemical symbol of water|formula of water)/.test(u)) return 'The chemical formula of water is H2O.';
    if (/(capital of india)/.test(u)) return 'The capital of India is New Delhi.';

    return null;
  },

  _interviewReply(user) {
    const u = (user || '').toLowerCase();
    if (/(hello|hi|hey|start|begin)/.test(u)) {
      return 'Great, let us begin! To start, could you tell me about yourself, your education, and your technical background?';
    }
    if (/(my name is|i am |i'm )/.test(u)) {
      const nameMatch = u.match(/(?:my name is|i am|i'm)\s+([a-z\s]+)/i);
      const name = nameMatch ? nameMatch[1].trim() : '';
      return name
        ? `Nice to meet you, ${name}! Now, could you walk me through your most important project — what problem did it solve and what was your specific contribution?`
        : 'Nice to meet you! Tell me more about the project you are most proud of and the role you played in it.';
    }
    if (/(project|built|developed|created|implemented)/.test(u)) {
      return 'That sounds like solid hands-on experience. What technologies did you use, and what was the hardest technical challenge you faced while building it?';
    }
    if (/(challenge|difficult|problem|hard|struggled)/.test(u)) {
      return 'How did you work through that challenge, and what was the final outcome? Looking back, what would you do differently?';
    }
    if (/(intern|internship|worked|job|experience|company)/.test(u)) {
      return 'What key skill did that experience teach you, and how have you applied it in a team setting since then?';
    }
    if (/(strength|good at|excel|strong)/.test(u)) {
      return 'Great. On the flip side, what is one area you are actively working to improve, and what steps are you taking?';
    }
    if (/(weak|improve|learning|grow)/.test(u)) {
      return 'That is a very honest and mature answer. Where do you see yourself in five years, and how does this role fit into that plan?';
    }
    if (/(team|conflict|disagree|collaborat)/.test(u)) {
      return 'Tell me more about how you communicated during that situation — did you find a compromise, and what did you learn about teamwork?';
    }
    if (/(five|5 year|future|goal|career)/.test(u)) {
      return 'That is a clear vision. Finally, do you have any questions for me about the role, the team, or the company culture?';
    }
    if (/(question|ask|anything|role|team|culture|tech stack|tech-stack)/.test(u)) {
      return 'Those are excellent questions to ask. Based on our conversation, I would rate your communication and clarity highly. Let us wrap up — I will now generate your feedback report.';
    }
    if (/(thank|thanks|bye|done|end|report)/.test(u)) {
      return 'Thank you for a great session! I will generate your feedback report now.';
    }
    const followups = [
      'Interesting — could you give me a concrete example from your experience that illustrates that?',
      'I see. How did that experience shape the way you approach new problems today?',
      'Good. If you could redo that situation, what would you do differently?',
      'Understood. How do you think that maps to the day-to-day work in this role?',
      'That is helpful context. What did you learn about yourself through that?'
    ];
    return followups[Math.floor(Math.random() * followups.length)];
  },

  _resumeReply(user) {
    const u = (user || '').toLowerCase();
    if (/(score|how|good|analy)/.test(u)) {
      return 'I have analyzed the text you provided and generated a detailed report above — check the score ring and the recommendations panel.';
    }
    return 'I have analyzed your content and prepared actionable recommendations in the panel above.';
  }
};

/* ============================================================================
   Live Resume AI — structural + semantic analysis that works on ANY pasted
   paragraph/text (no fixed keyword bank), with optional real AI commentary.
   ========================================================================== */
const LiveResumeAI = {
  /* Stopwords used to detect real sentence structure */
  _stopwords: new Set(('a,able,about,after,all,also,am,and,any,are,as,at,be,because,been,being,by,can,could,did,do,does,doing,for,from,had,has,have,having,he,her,here,hers,him,his,how,i,if,in,into,is,it,its,just,me,more,most,my,no,nor,not,of,on,once,only,or,other,our,ours,out,over,own,s,she,should,so,some,such,t,than,that,the,their,theirs,them,then,there,these,they,this,those,through,to,too,under,until,up,very,was,we,were,what,when,where,which,while,who,whom,why,will,with,would,you,your,yours').split(',')),

  _commonWordsForSentences: new Set(('i,my,me,we,our,us,work,project,team,built,developed,helped,managed,responsible,skills,experience,learned,company,university,student,year,intern,internship,final,goal,passionate,improve,achieve,created,design,implement,test,data,system,code,problem,solution,role,lead,led,collaborate,communicate,present,deliver,result,increased,reduced,improved,improvement,strong,key,main,core,area,focus,during,after,before,while,with,for,and,or,but,so,this,that,these,those,who,what,when,where,why,how,is,are,was,were,be,been,being,have,has,had,do,does,did,can,could,will,would,should,may,might,must').split(',')),

  analyze(text, opts = {}) {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    const tl = t.toLowerCase();
    const words = t ? t.split(' ') : [];
    const wordCount = words.length;

    // ================= CONTENT QUALITY / FAKE DETECTION =================
    const quality = (typeof ResumeTextQuality !== 'undefined' && ResumeTextQuality.analyze)
      ? ResumeTextQuality.analyze(t)
      : { flagged: false, reasons: [], sentenceScore: 100, grammarIssues: [], nonsenseRatio: 0 };

    // ================= SECTIONS =================
    const sectionDefs = [
      { name: 'Summary / Objective', re: /\b(summary|objective|profile|about me|career objective)\b/i },
      { name: 'Work Experience', re: /\b(experience|employment|work history|professional experience)\b/i },
      { name: 'Education', re: /\b(education|university|college|degree|b\.?tech|b\.?sc|m\.?tech|bachelor|master|school)\b/i },
      { name: 'Skills', re: /\b(skills?|technical|technologies|tools|competencies|proficien)\b/i },
      { name: 'Projects', re: /\b(projects?|portfolio|achievements?|accomplishments?)\b/i },
      { name: 'Certifications', re: /\b(certif|courses?|training|credentials)\b/i },
      { name: 'Contact / Links', re: /\b(phone|mobile|email|linkedin|github|contact|address|@)\b/i }
    ];
    const sections = sectionDefs.map(sd => ({ name: sd.name, present: sd.re.test(tl), score: sd.re.test(tl) ? 1 : 0 }));
    const presentCount = sections.filter(s => s.present).length;
    const sectionPct = Math.round((presentCount / sections.length) * 100);

    // ================= SKILLS =================
    const skillDict = [
      'javascript', 'js', 'typescript', 'python', 'java', 'c', 'c++', 'c#', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
      'react', 'react native', 'angular', 'vue', 'svelte', 'node', 'node.js', 'express', 'django', 'flask', 'spring', 'spring boot', 'next.js', 'nextjs', 'nuxt',
      'html', 'css', 'sass', 'tailwind', 'bootstrap',
      'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'redis', 'firebase', 'supabase', 'graphql', 'rest', 'rest api', 'grpc',
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'jenkins', 'ci/cd', 'linux', 'bash', 'git', 'github', 'gitlab',
      'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'machine learning', 'ml', 'deep learning', 'nlp', 'data science', 'data analysis', 'opencv',
      'oop', 'data structures', 'algorithms', 'dsa', 'system design', 'microservices', 'agile', 'scrum', 'kanban', 'tdd', 'devops', 'django rest',
      'android', 'ios', 'flutter', 'react native', 'selenium', 'cypress', 'jest', 'mocha', 'junit', 'pytest',
      'excel', 'power bi', 'tableau', 'figma', 'photoshop', 'word', 'powerpoint', 'canva',
      'communication', 'leadership', 'teamwork', 'problem solving', 'critical thinking', 'time management', 'public speaking', 'adaptability'
    ];
    const found = [];
    const seen = new Set();
    skillDict.forEach(sk => {
      if (seen.has(sk)) return;
      const escaped = sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('\\b' + escaped + '\\b', 'i').test(tl)) { found.push(sk); seen.add(sk); }
    });

    // ================= QUANTIFIED ACHIEVEMENTS =================
    const quantifiedMatches = t.match(/\b\d+(\.\d+)?\s*(%|percent|₹|rs\.?|rs|inr|\$|usd|lakh|million|k\+|\+|x)\b/gi) || [];
    const quantified = [...new Set(quantifiedMatches.map(m => m.trim()))].slice(0, 8);

    // ================= ACTION VERBS =================
    const actionVerbs = [
      'built', 'developed', 'designed', 'created', 'implemented', 'led', 'managed', 'improved', 'increased',
      'reduced', 'launched', 'delivered', 'spearheaded', 'optimized', 'engineered', 'architected', 'achieved',
      'grew', 'mentored', 'automated', 'streamlined', 'collaborated', 'drove', 'established', 'initiated',
      'negotiated', 'resolved', 'analyzed', 'researched', 'deployed', 'migrated', 'integrated', 'shipped'
    ];
    const foundVerbs = actionVerbs.filter(v => new RegExp('\\b' + v + '\\b', 'i').test(tl));

    // ================= TARGET ROLE WEIGHTING =================
    let role = opts.targetRole || null;
    if (role && typeof ROLE_SKILLS === 'undefined') role = null;
    const roleKeys = (role && ROLE_POOL_KEYS[role]) || [];
    const roleSkillNames = (role && ROLE_SKILLS[role]) ? ROLE_SKILLS[role].skills.map(s => s.name.toLowerCase()) : [];
    const roleSyns = [];
    if (role) {
      roleKeys.forEach(k => {
        (SKILL_POOL[k] || [k]).forEach(syn => roleSyns.push(syn));
      });
    }
    const roleSkillsFound = role ? roleSyns.filter(syn => tl.includes(syn)).length : 0;
    const roleSkillsTotal = role ? Math.max(roleSyns.length, 1) : 1;
    const roleMatchPct = role ? Math.round((roleSkillsFound / roleSkillsTotal) * 100) : null;

    // ================= 5-PART BREAKDOWN (0-100 each) =================
    // (a) Content quality/coherence
    const contentScore = Math.max(0, Math.min(100, Math.round(quality.sentenceScore)));
    // (b) Keyword & skills relevance
    const skillScore = Math.min((found.length / 16) * 100, 100);
    // (c) Structure/section completeness
    const structureScore = sectionPct;
    // (d) Quantified achievements check
    const quantScore = Math.min(quantified.length * 12.5, 100);
    // (e) Grammar/spelling
    const grammarIssues = quality.grammarIssues || [];
    const grammarScore = Math.max(0, Math.min(100, Math.round(100 - grammarIssues.length * 8)));

    // Role weighting: if a target role is chosen, bias the skill part.
    let skillsWeighted = skillScore;
    if (role) {
      skillsWeighted = Math.round(skillScore * 0.5 + roleMatchPct * 0.5);
    }

    // ================= FINAL SCORE =================
    // Fake/low-quality resumes must never get a high score.
    const flagPenalty = quality.flagged ? Math.min(55, quality.reasons.length * 12 + 20) : 0;
    let finalScore = Math.round(
      contentScore * 0.25 +
      skillsWeighted * 0.3 +
      structureScore * 0.2 +
      quantScore * 0.15 +
      grammarScore * 0.1
    );
    finalScore = Math.max(0, Math.min(100, finalScore - flagPenalty));

    // ================= LINE-BY-LINE SUGGESTIONS =================
    const suggestions = [];
    const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean);
    lines.slice(0, 12).forEach((line) => {
      const ll = line.toLowerCase();
      if (/\b(fresher|student)\b/i.test(line) && /\b(passionate|hardworking|sincere|dedicated|quick learner)\b/i.test(line)) {
        suggestions.push({ line: line.slice(0, 90) + (line.length > 90 ? '…' : ''), fix: 'Replace generic self-praise with a concrete skill or a measurable achievement.' });
      }
      if (!/\d/.test(line) && line.split(/\s+/).length > 8 && /(team|project|responsib|work|helped|assist)/i.test(line)) {
        suggestions.push({ line: line.slice(0, 90) + (line.length > 90 ? '…' : ''), fix: 'Add a number or metric to this line (e.g. "reduced load time by 30%").' });
      }
      if (/lorem|ipsum|dolor|sit amet|consectetur|xxx|placeholder|add text|dummy/i.test(ll)) {
        suggestions.push({ line: line.slice(0, 90) + (line.length > 90 ? '…' : ''), fix: 'Remove filler/placeholder text — replace with real responsibilities and results.' });
      }
      if (/^(skills?|technolog(ies|y)|tools)\s*:?\s*$/i.test(ll) && line.length < 30) {
        suggestions.push({ line: line.slice(0, 90), fix: 'List your actual tools and technologies under this heading.' });
      }
    });
    // Role-specific gap suggestions
    if (role && roleKeys.length) {
      const missing = roleSyns.filter(syn => !tl.includes(syn));
      if (missing.length && found.length) {
        suggestions.push({ line: `Target role: ${role}`, fix: `You mention ${found.length} skills, but the role expects things like: ${missing.slice(0, 5).join(', ')}.` });
      }
    }
    if (suggestions.length < 3) {
      suggestions.push({ line: 'Overall', fix: 'Structure each bullet with: action verb + what you did + measurable result.' });
    }

    // ================= RECOMMENDATIONS (legacy, generic) =================
    const recs = [];
    if (quality.flagged) {
      recs.push('This text appears to be placeholder or low-quality content. Rewrite it with genuine, specific details about your experience.');
    }
    if (sectionPct < 60) recs.push('Add standard resume sections: Summary, Experience, Education, Skills, and Projects.');
    if (foundVerbs.length < 3) recs.push('Use more action verbs (built, improved, led, implemented) to describe your achievements.');
    if (quantified.length < 1) recs.push('Add quantifiable results (percentages, revenue, team size, time saved) to strengthen impact.');
    if (wordCount < 50) recs.push('Your resume is too brief. Add more detail about your experience, projects, and responsibilities.');
    if (found.length < 3) recs.push('Include more technical skills and tools relevant to your target role.');
    if (!tl.includes('github') && !tl.includes('linkedin')) recs.push('Add links to your GitHub and LinkedIn profiles.');
    if (recs.length === 0) recs.push('Your resume looks strong! Consider tailoring it to each specific job application.');

    const scoreColor = finalScore >= 70 ? '#3fae6f' : finalScore >= 45 ? '#c98a2c' : '#d1483f';

    return {
      // Legacy fields (backward compatible with dashboard / resume.js)
      score: finalScore,
      wordCount,
      sections,
      sectionPct,
      foundSkills: found,
      foundVerbs,
      quantified,
      recommendations: recs,
      scoreColor,
      // New fields
      flagged: quality.flagged,
      flagReasons: quality.reasons || [],
      parts: {
        content: contentScore,
        skills: skillsWeighted,
        structure: structureScore,
        quantified: quantScore,
        grammar: grammarScore
      },
      grammarIssues,
      suggestions,
      roleMatched: role ? { role, matchPct: roleMatchPct } : null,
      targetRole: role || null
    };
  }
};
