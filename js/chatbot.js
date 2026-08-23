/* ============ AI Assistant Chatbot ============ */
const Chatbot = {
  _history: [],
  _busy: false,

  init() {
    this.fab = document.getElementById('chatbotFab');
    this.panel = document.getElementById('chatbotPanel');
    this.body = document.getElementById('chatbotBody');
    this.input = document.getElementById('chatbotInput');
    this.sendBtn = document.getElementById('chatbotSend');
    this.closeBtn = document.getElementById('chatbotClose');
    this.chipsWrap = document.getElementById('quickChips');

    this._bindEvents();
    this._renderQuickChips();
  },

  _bindEvents() {
    this.fab.addEventListener('click', () => this._toggle());
    this.closeBtn.addEventListener('click', () => this._toggle(false));
    this.sendBtn.addEventListener('click', () => this._handleSend());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSend();
    });
  },

  _toggle(force) {
    const willShow = force !== undefined ? force : this.panel.classList.contains('hidden');
    this.panel.classList.toggle('hidden', !willShow);
    if (willShow && !this.body.children.length) {
      this._addBotMsg('Hello! I am your live AI placement assistant. Ask me anything about resumes, interviews, coding, aptitude, or your progress — I generate every answer in real time.');
      this._addQuickSuggestions();
    }
    if (willShow) this.input.focus();
  },

  _renderQuickChips() {
    const chips = ['Resume tips', 'Interview questions', 'Coding practice', 'My readiness'];
    this.chipsWrap.innerHTML = chips.map(c => `<button class="quick-chip" data-q="${c}">${c}</button>`).join('');
    this.chipsWrap.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.input.value = chip.dataset.q;
        this._handleSend();
      });
    });
  },

  _addQuickSuggestions() {
    const chips = ['Resume tips', 'Interview questions', 'Coding practice', 'My readiness'];
    const wrap = document.createElement('div');
    wrap.className = 'msg-suggestions';
    wrap.innerHTML = chips.map(c => `<span class="sugg-chip">${c}</span>`).join('');
    wrap.querySelectorAll('.sugg-chip').forEach(s => {
      s.addEventListener('click', () => {
        this.input.value = s.textContent;
        this._handleSend();
      });
    });
    this.body.appendChild(wrap);
    this.body.scrollTop = this.body.scrollHeight;
  },

  _addBotMsg(text) {
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.textContent = text;
    this.body.appendChild(div);
    this.body.scrollTop = this.body.scrollHeight;
  },

  _addUserMsg(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = text;
    this.body.appendChild(div);
    this.body.scrollTop = this.body.scrollHeight;
  },

  _showTyping() {
    const div = document.createElement('div');
    div.className = 'msg bot typing';
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    this.body.appendChild(div);
    this.body.scrollTop = this.body.scrollHeight;
    return div;
  },

  _handleSend() {
    const text = this.input.value.trim();
    if (!text || this._busy) return;
    this._addUserMsg(text);
    this.input.value = '';
    this._history.push({ role: 'user', content: text });

    const typing = this._showTyping();
    this._busy = true;
    this._getLiveReply(text)
      .then((reply) => {
        typing.remove();
        this._addBotMsg(reply);
        this._history.push({ role: 'assistant', content: reply });
      })
      .catch(() => {
        typing.remove();
        const fallback = 'Sorry, I am having trouble reaching the AI right now. Please try again in a moment.';
        this._addBotMsg(fallback);
        this._history.push({ role: 'assistant', content: fallback });
      })
      .finally(() => {
        this._busy = false;
      });
  },

  /**
   * LIVE AI pipeline — every answer is generated in real time:
   *   1) /api/chat (Google Gemini via Vercel serverless, when LLM_API_KEY is set)
   *   2) LiveAI.chatReply (Pollinations.ai free keyless live LLM)
   *   3) Smart local fallback (context-aware, built from the user's words)
   */
  async _getLiveReply(text) {
    const system = [
      'You are PrepAI, a friendly, knowledgeable placement assistant for college students.',
      'You help with: resume tips and ATS optimization, HR and technical interview preparation,',
      'aptitude and reasoning practice, coding and DSA strategies, company-specific interview patterns,',
      'skill-gap analysis, learning roadmaps, and general career guidance for campus placements.',
      '',
      'Rules:',
      '- Give clear, actionable, concise answers (keep replies under ~120 words unless asked for depth).',
      '- Be encouraging and practical. Use plain text (no markdown).',
      '- Reference the user context below when relevant.',
      '- Never claim to be a human. You are an AI assistant.'
    ].join('\n');

    const email = (typeof Auth !== 'undefined') ? Auth.getEmail() : null;
    const prog = email ? DB.getProgress(email) : null;
    const context = prog
      ? `User readiness: ${prog.readiness || 0}%. Resume score: ${prog.resumeScore || 0}. Aptitude completed: ${prog.aptitude ? prog.aptitude.completed : 0}. Coding solved: ${prog.coding && prog.coding.solved ? prog.coding.solved.length : 0}.`
      : 'User is not signed in.';

    let reply = null;

    // 1) Serverless Gemini endpoint (deployed with LLM_API_KEY)
    let geminiError = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this._history, context }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data && data.reply && data.reply.trim()) {
          reply = data.reply.trim();
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        geminiError = `Chat API Error (${res.status}): ${errorData.error || 'Unknown'}. Detail: ${errorData.detail || 'None'}`;
      }
    } catch (e) {
      geminiError = `Network or timeout error trying to reach /api/chat: ${e.message}`;
    }

    if (geminiError && !reply) {
      // Silently fall through to Pollinations live LLM
      console.warn('[Chatbot] Gemini failed, using fallback:', geminiError);
    }

    // 2) Free keyless live LLM (Pollinations) directly from the browser
    if (!reply) {
      reply = await LiveAI.chatReply(system, this._history);
    }

    return reply;
  }
};

