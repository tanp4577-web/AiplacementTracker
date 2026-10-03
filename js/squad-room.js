/* ============ Squad room ============
   A small, host-authoritative room for practising together. The LEADER's browser owns the room state; everyone
   else sends events ("join", "submit", "chat") to it and receives the full state back. The state changes only
   through `reduce` (a pure function, tested without any network), so every client shows the same room.

   How messages travel is a separate piece, a "transport": connect(code, selfId, onMessage) -> { send(msg), close() }.
     - LocalTransport (below): BroadcastChannel, so tabs and windows of the same browser can be a squad. It needs
       no server and is what the tests and a single-computer demo use.
     - A network transport (a realtime service such as Supabase or Firebase) plugs into the same shape to let
       friends on different computers play; it is not connected yet.

   Honest limits: test verdicts are judged in each player's own browser and reported to the room, so this is a
   friendly practice mode, not a tamper-proof ranked mode. If the leader closes the room, the room ends. */
const SquadRoom = (() => {
  const MAX_MEMBERS = 4;
  const MAX_CHAT = 200;
  const DEFAULTS = { difficulty: 'Medium', count: 3, topic: 'all', limitScale: 1, mode: 'squad' };

  const newCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  };

  function create({ code, leaderId, name, lang }) {
    return {
      code: code || newCode(), leaderId, phase: 'lobby', startedAt: 0, endedAt: 0,
      members: { [leaderId]: { name: String(name || 'Leader').slice(0, 24), lang: lang || 'JavaScript', joinedAt: Date.now() } },
      settings: { ...DEFAULTS }, questions: [], attempts: {}, chat: [], opened: {}
    };
  }

  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

  /** The only way room state changes. Returns a new state, or the same one when the event is not allowed. */
  function reduce(state, ev) {
    const from = ev.from;
    const isLeader = from === state.leaderId;
    const member = state.members[from];
    switch (ev.type) {
      case 'join': {
        if (member) return { ...state, members: { ...state.members, [from]: { ...member, name: clean(ev.name, 24) || member.name, lang: ev.lang || member.lang } } };
        if (state.phase !== 'lobby') return state; // no joining half-way through a round
        if (Object.keys(state.members).length >= MAX_MEMBERS) return state;
        return { ...state, members: { ...state.members, [from]: { name: clean(ev.name, 24) || 'Player', lang: ev.lang || 'JavaScript', joinedAt: Date.now() } } };
      }
      case 'leave': {
        if (!member || isLeader) return state; // the leader closing the room is handled by 'close'
        const members = { ...state.members };
        delete members[from];
        return { ...state, members };
      }
      case 'lang':
        return member ? { ...state, members: { ...state.members, [from]: { ...member, lang: clean(ev.lang, 30) || member.lang } } } : state;
      case 'settings': {
        if (!isLeader || state.phase !== 'lobby') return state;
        const s = ev.settings || {};
        const next = { ...state.settings };
        if (['Easy', 'Medium', 'Hard'].includes(s.difficulty)) next.difficulty = s.difficulty;
        if (Number.isInteger(s.count) && s.count >= 1 && s.count <= 10) next.count = s.count;
        if (typeof s.topic === 'string') next.topic = clean(s.topic, 40) || 'all';
        if (typeof s.limitScale === 'number' && s.limitScale >= 0.5 && s.limitScale <= 3) next.limitScale = s.limitScale;
        if (['squad', 'duel'].includes(s.mode)) next.mode = s.mode;
        return { ...state, settings: next };
      }
      case 'start': {
        if (!isLeader || state.phase !== 'lobby' || !Array.isArray(ev.questions) || !ev.questions.length) return state;
        const questions = ev.questions.slice(0, 10).map((q) => ({ id: clean(q.id, 80), title: clean(q.title, 120), difficulty: q.difficulty }));
        const now = ev.at || Date.now();
        const opened = {};
        Object.keys(state.members).forEach((id) => { opened[id] = { [questions[0].id]: now }; });
        return { ...state, phase: 'playing', startedAt: now, questions, attempts: {}, opened };
      }
      case 'open': { // a player opened a question: the clock for their bonus starts at the first open
        if (state.phase !== 'playing' || !member || !state.questions.some((q) => q.id === ev.qid)) return state;
        const mine = state.opened[from] || {};
        if (mine[ev.qid]) return state;
        return { ...state, opened: { ...state.opened, [from]: { ...mine, [ev.qid]: ev.at || Date.now() } } };
      }
      case 'submit': {
        if (state.phase !== 'playing' || !member || !state.questions.some((q) => q.id === ev.qid)) return state;
        const total = Number(ev.total);
        const passed = Number(ev.passed);
        if (!Number.isInteger(total) || !Number.isInteger(passed) || total < 1 || passed < 0 || passed > total) return state;
        const opened = (state.opened[from] || {})[ev.qid] || state.startedAt;
        const atSec = Math.max(0, Math.round(((ev.at || Date.now()) - opened) / 1000));
        const mine = (state.attempts[from] || {})[ev.qid] || [];
        if (mine.some((a) => a.passed === a.total)) return state; // already solved: later runs do not change the score
        const attempt = { passed, total, atSec, lang: clean(ev.lang, 30), at: ev.at || Date.now() };
        return { ...state, attempts: { ...state.attempts, [from]: { ...(state.attempts[from] || {}), [ev.qid]: [...mine, attempt].slice(-30) } } };
      }
      case 'chat': {
        const text = clean(ev.text, 400);
        if (!member || !text) return state;
        return { ...state, chat: [...state.chat, { from, text, at: ev.at || Date.now() }].slice(-MAX_CHAT) };
      }
      case 'finish':
        return isLeader && state.phase === 'playing' ? { ...state, phase: 'done', endedAt: ev.at || Date.now() } : state;
      case 'rematch': // back to the lobby with the same squad
        return isLeader && state.phase === 'done' ? { ...state, phase: 'lobby', questions: [], attempts: {}, opened: {}, startedAt: 0, endedAt: 0 } : state;
      default:
        return state;
    }
  }

  /** Same-browser transport: every tab on the same code hears every other tab. */
  const LocalTransport = {
    connect(code, selfId, onMessage) {
      if (typeof BroadcastChannel === 'undefined') throw new Error('This browser cannot connect tabs to each other.');
      const ch = new BroadcastChannel('pp-squad-' + code);
      ch.onmessage = (e) => { if (e.data && e.data.from !== selfId) onMessage(e.data); };
      return { send: (msg) => ch.postMessage({ ...msg, from: selfId }), close: () => ch.close() };
    }
  };

  /** One player's connection to a room. `onState(state)` fires on every change. */
  class Client {
    constructor({ transport = LocalTransport, selfId, onState = () => {}, onEnded = () => {} }) {
      this.transport = transport; this.selfId = selfId; this.onState = onState; this.onEnded = onEnded;
      this.state = null; this.conn = null; this.isHost = false;
    }

    /** Leader: makes a new room. */
    host({ name, lang, code }) {
      this.isHost = true;
      this.state = create({ code, leaderId: this.selfId, name, lang });
      this._connect(this.state.code);
      this.onState(this.state);
      return this.state.code;
    }

    /** Member: joins a room by code. Resolves when the leader answers, rejects after a few seconds. */
    join({ code, name, lang, waitMs = 3000 }) {
      this.isHost = false;
      const wanted = String(code || '').trim().toUpperCase();
      return new Promise((resolve, reject) => {
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; this.leave(); reject(new Error('Nobody answered for this code. Check the code, and that the leader still has the room open.')); } }, waitMs);
        this._pending = (state) => { if (!done) { done = true; clearTimeout(timer); resolve(state); } };
        this._connect(wanted);
        this.conn.send({ type: 'join', name, lang });
      });
    }

    _connect(code) {
      this.conn = this.transport.connect(code, this.selfId, (msg) => this._receive(msg));
    }

    _receive(msg) {
      if (this.isHost) {
        if (msg.type === 'state' || msg.type === 'closed') return;
        const next = reduce(this.state, msg);
        if (next !== this.state) { this.state = next; this._broadcast(); this.onState(this.state); }
        else if (msg.type === 'join') this._broadcast(); // refused or repeated join: still answer so the joiner learns the state
        return;
      }
      if (msg.type === 'closed') { this.onEnded('The leader closed the room.'); this.leave(); return; }
      if (msg.type === 'state' && msg.state && msg.state.code) {
        this.state = msg.state;
        if (this._pending) { const p = this._pending; this._pending = null; p(this.state); }
        this.onState(this.state);
      }
    }

    _broadcast() { this.conn.send({ type: 'state', state: this.state }); }

    /** Sends an event as this player. The leader applies it directly. */
    act(ev) {
      if (!this.conn) return;
      const full = { ...ev, from: this.selfId };
      if (this.isHost) {
        const next = reduce(this.state, full);
        if (next !== this.state) { this.state = next; this._broadcast(); this.onState(this.state); }
      } else {
        this.conn.send(ev);
      }
    }

    leave() {
      if (!this.conn) return;
      if (this.isHost) this.conn.send({ type: 'closed' }); else this.conn.send({ type: 'leave' });
      this.conn.close();
      this.conn = null;
    }
  }

  return { create, reduce, Client, LocalTransport, MAX_MEMBERS, DEFAULTS, newCode };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SquadRoom;
