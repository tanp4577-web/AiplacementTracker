/* ============ Squad Practice ============
   Practise coding with friends: one player leads, others join with a code, everyone works the same questions
   in the language they prefer, and points come from real test results (see js/squad-score.js).
   The room itself is js/squad-room.js. Today friends can join from other tabs or windows of the same browser;
   playing across computers needs the online service described in the README (the transport is the only piece
   that changes). Questions, languages, the editor and the judge are the ones the Coding Practice page uses. */
const Squad = {
  client: null,
  selfId: '',
  _q: {},            // full questions by id
  _drafts: {},       // code by 'questionId|language'
  _viewing: 0,       // index of the question this player is looking at
  _tick: 0,

  _name() {
    const s = Auth.getCurrentUser && Auth.getCurrentUser();
    return (s && s.name) || 'Player';
  },

  _esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },

  render(container) {
    this.container = container;
    this._leaveQuietly();
    this.selfId = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
    this._home();
  },

  /** Called by the router when the learner leaves this page. */
  cleanup() { this._leaveQuietly(); clearInterval(this._tick); },

  _leaveQuietly() {
    if (this.client) { try { this.client.leave(); } catch {} }
    this.client = null;
    clearInterval(this._tick);
  },

  /** What is known right now: the list Coding already loaded, or just JavaScript in the browser. Never waits. */
  _languagesNow() {
    return (typeof Coding !== 'undefined' && Coding._langs) || [{ language: 'JavaScript', compilers: [{ name: 'browser', display: 'Browser (instant, no network)' }], default: 'browser' }];
  },

  async _languages() {
    return (typeof Coding !== 'undefined' ? await Coding._loadLanguages() : [{ language: 'JavaScript', compilers: [{ name: 'browser', display: 'Browser' }], default: 'browser' }]);
  },

  _langOptions(langs, selected) {
    return langs.map((l) => `<option value="${this._esc(l.language)}" ${l.language === selected ? 'selected' : ''}>${this._esc(l.language)}</option>`).join('');
  },

  /* ---------------------------------------------------------------- home: create, join, friends, random */

  _home() {
    this._shown = 'home';
    const langs = this._languagesNow();
    const saved = (typeof Coding !== 'undefined' && Coding._savedLang()) || 'JavaScript';
    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card" id="sqCreate">
          <div class="card-title">Create a squad</div>
          <div class="card-sub">You become the leader: you pick the difficulty and the questions, then start the round.</div>
          <label class="field-label" for="sqName">Your name</label>
          <input id="sqName" maxlength="24" value="${this._esc(this._name())}" />
          <label class="field-label mt-1" for="sqLang">Your language</label>
          <select id="sqLang">${this._langOptions(langs, saved)}</select>
          <button class="btn btn-primary mt-2" id="sqCreateBtn">Create squad</button>
        </div>
        <div class="card" id="sqJoin">
          <div class="card-title">Join a friend's squad</div>
          <div class="card-sub">Ask the leader for the 6-character code.</div>
          <label class="field-label" for="sqCode">Squad code</label>
          <input id="sqCode" maxlength="6" autocomplete="off" style="text-transform:uppercase;letter-spacing:.2em" />
          <button class="btn btn-primary mt-2" id="sqJoinBtn">Join</button>
          <div class="text-dim mt-1" id="sqJoinMsg" role="status" style="font-size:12.5px"></div>
        </div>
      </div>
      <div class="grid grid-2 mt-3">
        <div class="card" id="sqFriends">
          <div class="card-title">Friends</div>
          <div class="card-sub">Friends who are online will appear here so you can invite them in one tap.</div>
          <p class="text-dim" style="font-size:13px">Friends and calls need accounts that work across computers, which this site does not have yet. Until then, share the squad code or the invite link: friends who open it in another tab or window of this browser join instantly.</p>
        </div>
        <div class="card" id="sqRandom">
          <div class="card-title">Random squad</div>
          <div class="card-sub">Get matched with other learners who want the same difficulty and language.</div>
          <p class="text-dim" style="font-size:13px">Matchmaking needs a shared online service to find other players, so it is not available yet. Nobody is shown as waiting because nobody can be.</p>
          <button class="btn btn-ghost" disabled>Find a squad (coming with the online service)</button>
        </div>
      </div>`;
    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    if (params.get('join')) document.getElementById('sqCode').value = params.get('join').toUpperCase().slice(0, 6);
    this._languages().then((all) => {
      const sel = document.getElementById('sqLang');
      if (sel && this._shown === 'home' && all !== langs) sel.innerHTML = this._langOptions(all, sel.value);
    });
    document.getElementById('sqCreateBtn').addEventListener('click', () => this._create());
    document.getElementById('sqJoinBtn').addEventListener('click', () => this._join());
  },

  _connect(extra = {}) {
    this.client = new SquadRoom.Client({
      selfId: this.selfId,
      onState: (s) => this._paint(s),
      onEnded: (msg) => { App.showToast(msg, 'error'); this._leaveQuietly(); this._home(); },
      ...extra
    });
  },

  _create() {
    this._connect();
    const name = document.getElementById('sqName').value.trim() || 'Leader';
    const lang = document.getElementById('sqLang').value;
    this.client.host({ name, lang });
  },

  async _join() {
    const msg = document.getElementById('sqJoinMsg');
    const code = document.getElementById('sqCode').value.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) { msg.textContent = 'Enter the 6-character code.'; return; }
    msg.textContent = 'Looking for the squad…';
    this._connect();
    try {
      const langs = this._languagesNow();
      const lang = (typeof Coding !== 'undefined' && Coding._savedLang()) || langs[0].language;
      await this.client.join({ code, name: this._name(), lang });
    } catch (e) {
      this._leaveQuietly();
      const m = document.getElementById('sqJoinMsg');
      if (m) m.textContent = e.message;
    }
  },

  /* ---------------------------------------------------------------- room */

  _paint(state) {
    // A chat message or a score change must not wipe what someone is typing, so the page already on screen is
    // updated in place; only a change of phase (or of the question set) redraws it.
    if (state.phase === 'lobby' && this._shown === 'lobby' && document.getElementById('sqMembers')) return this._refreshLobby(state);
    if (state.phase === 'playing' && this._shown === 'playing' && document.getElementById('sqCode') && this._shownKey === state.startedAt) return this._refreshPlay(state);
    clearInterval(this._tick);
    this._shown = state.phase;
    this._shownKey = state.startedAt;
    if (state.phase === 'lobby') this._lobby(state);
    else if (state.phase === 'playing') this._play(state);
    else this._done(state);
  },

  _refreshChat(state) {
    const log = document.getElementById('sqChatLog');
    if (!log) return;
    const html = state.chat.map((c) => `<div><b>${this._esc((state.members[c.from] || { name: 'Player' }).name)}:</b> ${this._esc(c.text)}</div>`).join('') || '<span class="text-dim">Say hi to your squad.</span>';
    if (log.innerHTML !== html) { log.innerHTML = html; log.scrollTop = log.scrollHeight; }
  },

  _refreshLobby(state) {
    document.getElementById('sqMembers').innerHTML = this._membersHtml(state);
    const me = state.members[this.selfId];
    const lang = document.getElementById('sqMyLang');
    if (me && lang && document.activeElement !== lang) lang.value = me.lang;
    if (state.leaderId !== this.selfId) {
      const s = state.settings;
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
      set('sqDiff', s.difficulty); set('sqCount', s.count); set('sqTopic', s.topic); set('sqTime', s.limitScale);
    }
    this._refreshChat(state);
  },

  _refreshPlay(state) {
    const board = this._board(state);
    const el = document.querySelector('.sq-board');
    if (el) el.outerHTML = this._boardHtml(state, board);
    const mine = state.attempts[this.selfId] || {};
    document.querySelectorAll('[data-sq-q]').forEach((b) => {
      const x = state.questions[Number(b.dataset.sqQ)];
      const done = (mine[x.id] || []).some((a) => a.passed === a.total);
      const tried = (mine[x.id] || []).length > 0;
      b.classList.toggle('solved', done);
      b.classList.toggle('attempted', !done && tried);
    });
    const here = state.questions[Math.min(this._viewing, state.questions.length - 1)];
    const run = document.getElementById('sqRun');
    if (run && here && (mine[here.id] || []).some((a) => a.passed === a.total)) { run.disabled = true; run.textContent = 'Solved'; }
    this._refreshChat(state);
  },

  _membersHtml(state) {
    return Object.entries(state.members).map(([id, m]) => `
      <div class="sq-member">
        <span class="sq-avatar" aria-hidden="true">${this._esc(m.name.slice(0, 1).toUpperCase())}</span>
        <span><b>${this._esc(m.name)}</b>${id === state.leaderId ? ' <span class="chip orange">Leader</span>' : ''}${id === this.selfId ? ' <span class="text-dim">(you)</span>' : ''}
        <span class="text-dim" style="display:block;font-size:12px">${this._esc(m.lang)}</span></span>
      </div>`).join('');
  },

  _chatHtml(state) {
    return `<div class="sq-chat" id="sqChat">
      <div class="sq-chat-log" id="sqChatLog" aria-live="polite">${state.chat.map((c) => `<div><b>${this._esc((state.members[c.from] || { name: 'Player' }).name)}:</b> ${this._esc(c.text)}</div>`).join('') || '<span class="text-dim">Say hi to your squad.</span>'}</div>
      <form id="sqChatForm" class="flex gap-1"><input id="sqChatInput" maxlength="400" placeholder="Message" aria-label="Chat message" /><button class="btn btn-ghost btn-sm" type="submit">Send</button></form>
    </div>`;
  },

  _bindChat() {
    const form = document.getElementById('sqChatForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('sqChatInput');
      if (input.value.trim()) this.client.act({ type: 'chat', text: input.value });
      input.value = '';
    });
    const log = document.getElementById('sqChatLog');
    if (log) log.scrollTop = log.scrollHeight;
  },

  _lobby(state) {
    const isLeader = state.leaderId === this.selfId;
    const s = state.settings;
    const langs = this._languagesNow();
    const link = `${location.origin}${location.pathname}#squad?join=${state.code}`;
    const topics = (typeof Coding !== 'undefined' && Coding.state.facets && Object.keys(Coding.state.facets.topics)) || [];
    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="flex-between"><div><div class="card-title">Squad lobby</div><div class="card-sub">Share the code or the link. Up to ${SquadRoom.MAX_MEMBERS} players.</div></div>
            <button class="btn btn-ghost btn-sm" id="sqLeave">Leave</button></div>
          <div class="sq-code" id="sqCodeShow" aria-label="Squad code">${this._esc(state.code)}</div>
          <div class="flex gap-1 mt-1"><button class="btn btn-ghost btn-sm" id="sqCopy">Copy invite link</button><span class="text-dim" id="sqCopyMsg" role="status" style="font-size:12.5px"></span></div>
          <div class="sq-members mt-2" id="sqMembers">${this._membersHtml(state)}</div>
          <label class="field-label mt-2" for="sqMyLang">Your language</label>
          <select id="sqMyLang">${this._langOptions(langs, state.members[this.selfId] ? state.members[this.selfId].lang : '')}</select>
        </div>
        <div class="card">
          <div class="card-title">Game settings</div>
          <div class="card-sub">${isLeader ? 'You choose; everyone plays the same questions.' : 'The leader chooses the settings.'}</div>
          <div class="sq-settings">
            <label class="field-label" for="sqDiff">Difficulty</label>
            <select id="sqDiff" ${isLeader ? '' : 'disabled'}>${['Easy', 'Medium', 'Hard'].map((d) => `<option ${d === s.difficulty ? 'selected' : ''}>${d}</option>`).join('')}</select>
            <label class="field-label" for="sqCount">Questions</label>
            <select id="sqCount" ${isLeader ? '' : 'disabled'}>${[1, 2, 3, 5, 7, 10].map((n) => `<option ${n === s.count ? 'selected' : ''}>${n}</option>`).join('')}</select>
            <label class="field-label" for="sqTopic">Topic</label>
            <select id="sqTopic" ${isLeader ? '' : 'disabled'}><option value="all">Any topic</option>${topics.map((t) => `<option ${t === s.topic ? 'selected' : ''}>${this._esc(t)}</option>`).join('')}</select>
            <label class="field-label" for="sqTime">Time per question</label>
            <select id="sqTime" ${isLeader ? '' : 'disabled'}>${[[0.5, 'Short (half time)'], [1, 'Normal'], [2, 'Relaxed (double)']].map(([v, l]) => `<option value="${v}" ${v === s.limitScale ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div>
          <p class="text-dim" style="font-size:12.5px">Points: Easy 10, Medium 20, Hard 40, plus up to 50% for speed, minus 2 per wrong try, a little credit for partial work, and +5 each if the whole squad solves a question.</p>
          ${isLeader ? '<button class="btn btn-primary" id="sqStart">Start round</button>' : '<div class="text-dim">Waiting for the leader to start…</div>'}
          <div class="text-dim mt-1" id="sqStartMsg" role="status" style="font-size:12.5px"></div>
        </div>
      </div>
      <div class="card mt-3"><div class="card-title">Squad chat</div>${this._chatHtml(state)}</div>`;
    document.getElementById('sqLeave').addEventListener('click', () => { this._leaveQuietly(); this._home(); });
    document.getElementById('sqCopy').addEventListener('click', async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(link); ok = true; } catch {}
      document.getElementById('sqCopyMsg').textContent = ok ? 'Link copied.' : link;
    });
    document.getElementById('sqMyLang').addEventListener('change', (e) => this.client.act({ type: 'lang', lang: e.target.value }));
    if (isLeader) {
      const push = () => this.client.act({ type: 'settings', settings: {
        difficulty: document.getElementById('sqDiff').value, count: Number(document.getElementById('sqCount').value),
        topic: document.getElementById('sqTopic').value, limitScale: Number(document.getElementById('sqTime').value)
      } });
      ['sqDiff', 'sqCount', 'sqTopic', 'sqTime'].forEach((id) => document.getElementById(id).addEventListener('change', push));
      document.getElementById('sqStart').addEventListener('click', () => this._start());
    }
    this._bindChat();
  },

  /** The leader picks the questions from the real bank and starts the round. */
  async _start() {
    const msg = document.getElementById('sqStartMsg');
    const s = this.client.state.settings;
    msg.textContent = 'Picking questions…';
    try {
      const params = { idsOnly: 1, difficulty: s.difficulty };
      if (s.topic && s.topic !== 'all') params.topic = s.topic;
      const data = await Coding._api(new URLSearchParams(params));
      if (!data.ids.length) { msg.textContent = 'No questions match these settings.'; return; }
      const pool = data.ids.slice();
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const ids = pool.slice(0, s.count);
      await Coding._hydrate(ids);
      const questions = ids.map((id) => ({ id, title: (Coding._meta[id] || {}).title || id, difficulty: (Coding._meta[id] || {}).difficulty || s.difficulty }));
      this.client.act({ type: 'start', questions });
    } catch (e) {
      msg.textContent = e.message || 'Could not pick questions.';
    }
  },

  /* ---------------------------------------------------------------- the round */

  _board(state) {
    const players = Object.keys(state.members);
    return SquadScore.scoreboard({ questions: state.questions, players, attemptsBy: state.attempts, limitScale: state.settings.limitScale, squad: state.settings.mode === 'squad' });
  },

  _boardHtml(state, board) {
    return `<ol class="sq-board" aria-label="Scoreboard">${board.rows.map((r) => `
      <li><span class="sq-rank">${r.rank}</span><span class="sq-who">${this._esc(state.members[r.player].name)}${r.player === this.selfId ? ' (you)' : ''}</span>
      <span class="text-dim">${r.solved}/${state.questions.length} solved</span><b>${r.points} pts</b></li>`).join('')}</ol>`;
  },

  async _play(state) {
    const me = state.members[this.selfId];
    if (!me) { this._leaveQuietly(); this._home(); return; }
    const board = this._board(state);
    const mine = state.attempts[this.selfId] || {};
    const idx = Math.min(this._viewing, state.questions.length - 1);
    const qs = state.questions[idx];
    this.client.act({ type: 'open', qid: qs.id });
    let q = this._q[qs.id];
    if (!q) {
      this.container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading question…</p></div>';
      try { q = this._q[qs.id] = await Coding._fetchQuestion(qs.id); } catch (e) {
        this.container.innerHTML = `<div class="card"><div class="card-title">Could not load the question</div><p>${this._esc(e.message)}</p><button class="btn btn-primary" id="sqRetry">Try again</button></div>`;
        document.getElementById('sqRetry').addEventListener('click', () => this._play(this.client.state));
        return;
      }
      if (!this.client || this.client.state.phase !== 'playing') return;
    }
    const langs = this._languagesNow();
    const entry = langs.find((l) => l.language === me.lang) || langs[0];
    const compiler = (Coding._savedCompiler && entry.compilers.some((c) => c.name === Coding._savedCompiler(entry.language)) ? Coding._savedCompiler(entry.language) : entry.default);
    const draftKey = `${qs.id}|${entry.language}`;
    const code = this._drafts[draftKey] != null ? this._drafts[draftKey] : Skeletons.for(entry.language).code;
    const isLeader = state.leaderId === this.selfId;
    const attempts = mine[qs.id] || [];
    const solved = attempts.some((a) => a.passed === a.total);
    const startedAt = (state.opened[this.selfId] || {})[qs.id] || state.startedAt;
    const limit = SquadScore.limit(qs.difficulty, state.settings.limitScale);

    this.container.innerHTML = `
      <div class="flex-between mb-2" style="flex-wrap:wrap;gap:8px">
        <div class="sq-palette" role="tablist" aria-label="Questions">${state.questions.map((x, i) => {
          const done = (mine[x.id] || []).some((a) => a.passed === a.total);
          const tried = (mine[x.id] || []).length > 0;
          return `<button type="button" class="qpal-btn ${done ? 'solved' : tried ? 'attempted' : ''} ${i === idx ? 'current' : ''}" data-sq-q="${i}" aria-label="Question ${i + 1}, ${done ? 'solved' : tried ? 'attempted' : 'not attempted'}">${i + 1}</button>`;
        }).join('')}</div>
        <div class="flex gap-1 items-center"><span class="chip blue" id="sqTimer" role="timer" aria-label="Time on this question"></span>
          ${isLeader ? '<button class="btn btn-ghost btn-sm" id="sqFinish">End round</button>' : ''}<button class="btn btn-ghost btn-sm" id="sqLeave">Leave</button></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">${this._esc(q.title)} <span class="chip ${q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Medium' ? 'orange' : 'red'}">${this._esc(q.difficulty)}</span></div>
          <div class="card-sub" style="white-space:pre-line">${this._esc(q.description)}</div>
          ${Coding._ioHtml(q)}
          <div class="text-dim" style="font-size:12.5px">Your language: <b>${this._esc(entry.language)}</b> (change it in the lobby). ${compiler === 'browser' ? 'Runs in your browser.' : 'Runs on Wandbox (online).'}</div>
          <div class="code-wrap mt-1"><div class="code-header"><div class="code-dots"><span></span><span></span><span></span></div><span class="code-file">solution.${Skeletons.for(entry.language).ext}</span></div>
            <textarea class="code-input" id="sqCode" spellcheck="false" aria-label="Code editor">${this._esc(code)}</textarea></div>
          <div class="flex gap-2 mt-2"><button class="btn btn-primary" id="sqRun" ${solved ? 'disabled' : ''}>${solved ? 'Solved' : 'Run tests'}</button></div>
          <div id="sqResult" role="status" class="mt-1"></div>
        </div>
        <div>
          <div class="card"><div class="card-title">Scoreboard</div>${this._boardHtml(state, board)}</div>
          <div class="card mt-2"><div class="card-title">Squad chat</div>${this._chatHtml(state)}</div>
        </div>
      </div>`;

    const timer = document.getElementById('sqTimer');
    const paintTimer = () => {
      const used = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      const left = Math.max(0, limit - used);
      timer.textContent = solved ? 'Solved' : left > 0 ? `Bonus window ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Bonus window over';
    };
    paintTimer();
    this._tick = setInterval(paintTimer, 1000);
    document.querySelectorAll('[data-sq-q]').forEach((b) => b.addEventListener('click', () => { this._drafts[draftKey] = document.getElementById('sqCode').value; this._viewing = Number(b.dataset.sqQ); this._play(this.client.state); }));
    document.getElementById('sqLeave').addEventListener('click', () => { this._leaveQuietly(); this._home(); });
    document.getElementById('sqFinish')?.addEventListener('click', () => this.client.act({ type: 'finish' }));
    document.getElementById('sqRun').addEventListener('click', () => this._run(q, entry.language, compiler, draftKey));
    this._bindChat();
  },

  async _run(q, language, compiler, draftKey) {
    const btn = document.getElementById('sqRun');
    const out = document.getElementById('sqResult');
    const code = document.getElementById('sqCode').value;
    this._drafts[draftKey] = code;
    if (!code.trim()) { out.textContent = 'Write some code first.'; return; }
    if (!q.io || !(q.testCases || []).length) { out.textContent = 'This question has no stdin/stdout tests.'; return; }
    btn.disabled = true;
    out.textContent = `Running ${q.testCases.length} tests…`;
    const results = [];
    for (const t of q.testCases) {
      const r = await Coding._runOne(q, t, code, compiler);
      results.push(r);
      if (r.kind === 'compile' || r.kind === 'network' || r.kind === 'timeout') break;
    }
    if (!document.getElementById('sqRun')) return; // the round moved on while tests ran
    btn.disabled = false;
    const stop = results.find((r) => ['compile', 'network', 'timeout'].includes(r.kind));
    const passed = results.filter((r) => r.pass).length;
    if (stop && stop.kind === 'network') { out.innerHTML = `Could not reach the compiler service: ${this._esc(stop.message)} Nothing was scored.`; return; }
    this.client.act({ type: 'submit', qid: q.id, passed, total: q.testCases.length, lang: language });
    const verdict = stop && stop.kind === 'compile' ? 'Compile error' : passed === q.testCases.length ? 'All tests passed' : `${passed}/${q.testCases.length} tests passed`;
    const out2 = document.getElementById('sqResult');
    if (out2) out2.innerHTML = `<b>${this._esc(verdict)}</b>${stop && stop.message ? `<pre class="io-pre">${this._esc(stop.message)}</pre>` : ''}`;
  },

  /* ---------------------------------------------------------------- results */

  _done(state) {
    const board = this._board(state);
    const isLeader = state.leaderId === this.selfId;
    this.container.innerHTML = `
      <div class="card">
        <div class="flex-between"><div><div class="card-title">Round finished</div><div class="card-sub">Squad total: <b>${board.squadTotal} points</b></div></div>
          <div class="flex gap-1">${isLeader ? '<button class="btn btn-primary" id="sqRematch">Play again</button>' : ''}<button class="btn btn-ghost" id="sqLeave">Leave</button></div></div>
        ${this._boardHtml(state, board)}
      </div>
      <div class="card mt-2"><div class="card-title">Question by question</div>
        <div class="sq-table"><table><thead><tr><th>Player</th>${state.questions.map((q, i) => `<th title="${this._esc(q.title)}">Q${i + 1}</th>`).join('')}</tr></thead><tbody>
        ${board.rows.map((r) => `<tr><td>${this._esc(state.members[r.player].name)}</td>${state.questions.map((q) => {
          const x = r.perQuestion[q.id];
          return `<td>${x.solved ? '✓ ' : ''}${x.points}${x.squadBonus ? ' <span class="text-dim" title="squad bonus">+' + x.squadBonus + '</span>' : ''}</td>`;
        }).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    document.getElementById('sqLeave').addEventListener('click', () => { this._leaveQuietly(); this._home(); });
    document.getElementById('sqRematch')?.addEventListener('click', () => { this._viewing = 0; this.client.act({ type: 'rematch' }); });
  }
};
