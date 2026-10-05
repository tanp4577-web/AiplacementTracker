/* ============ Unified Storage Engine ============ */
const DB = {
  _prefix: 'prepportal_',

  // Some browsers (private tabs, blocked cookies, full storage) throw on every
  // localStorage call. Keep the app working for the session from memory instead.
  _mem: {},
  _warned: false,

  _get(key) {
    const full = this._prefix + key;
    try {
      if (Object.hasOwn(this._mem, full)) return JSON.parse(this._mem[full]);
      return JSON.parse(localStorage.getItem(full));
    } catch {
      return null;
    }
  },

  _set(key, val) {
    const full = this._prefix + key;
    const text = JSON.stringify(val);
    try {
      localStorage.setItem(full, text);
      delete this._mem[full];
    } catch {
      this._mem[full] = text;
      this._warnStorageBlocked();
    }
  },

  _del(key) {
    const full = this._prefix + key;
    delete this._mem[full];
    try { localStorage.removeItem(full); } catch { /* storage unavailable */ }
  },

  _warnStorageBlocked() {
    if (this._warned) return;
    this._warned = true;
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast('Your browser is blocking storage, so progress only lasts until you close this tab.', 'error');
    }
  },

  /** All keys (without the prefix) this app has stored, in storage or memory. */
  _keys() {
    const keys = new Set(Object.keys(this._mem).map((k) => k.slice(this._prefix.length)));
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this._prefix)) keys.add(key.slice(this._prefix.length));
      }
    } catch { /* storage unavailable */ }
    return [...keys];
  },

  /* ---------- User Accounts ---------- */
  getUsers() {
    return this._get('users') || {};
  },

  saveUser(email, data) {
    const users = this.getUsers();
    users[email] = { ...users[email], ...data };
    this._set('users', users);
  },

  getUser(email) {
    return this.getUsers()[email] || null;
  },

  /* ---------- Current Session ---------- */
  getSession() {
    const session = this._get('session') || null;
    if (session && 'pass' in session) {
      // Older builds stored the password hash inside the session record.
      delete session.pass;
      this._set('session', session);
    }
    return session;
  },

  setSession(user) {
    const safe = { ...user };
    delete safe.pass; // never keep the password hash in the session record
    this._set('session', { ...safe, loginAt: Date.now() });
  },

  clearSession() {
    this._del('session');
  },

  /* ---------- Per-User Progress ---------- */
  _progressKey(email) {
    return 'progress_' + email.replace(/[^a-zA-Z0-9]/g, '_');
  },

  getProgress(email) {
    if (!email) return null;
    return this._get(this._progressKey(email)) || {
      aptitude: { completed: 0, correct: 0, total: 0, history: [] },
      coding: { solved: [], totalAttempts: 0 },
      interview: { sessions: 0, topics: [] },
      resumeScore: 0,
      skills: {},
      activity: [],
      readiness: 0
    };
  },

  saveProgress(email, data) {
    if (!email) return;
    const key = this._progressKey(email);
    const existing = this.getProgress(email);
    // Log activity for dashboard heatmap (cap at 200 entries)
    const activity = existing.activity || [];
    activity.push({ date: Date.now(), type: 'update' });
    if (activity.length > 200) activity.splice(0, activity.length - 200);
    this._set(key, { ...existing, ...data, activity });
  },

  /* ---------- Activity Tracking ---------- */
  logActivity(email, type) {
    if (!email) return;
    const prog = this.getProgress(email);
    const activity = prog.activity || [];
    activity.push({ date: Date.now(), type: type || 'update' });
    if (activity.length > 200) activity.splice(0, activity.length - 200);
    this.saveProgress(email, { activity });
  },

  /* ---------- Global (no-auth) ---------- */
  getGlobal(key) {
    return this._get('g_' + key);
  },

  setGlobal(key, val) {
    this._set('g_' + key, val);
  },

  /* ---------- Nuke ---------- */
  resetAll() {
    const session = this.getSession();
    if (session) this._del(this._progressKey(session.email));
    this._del('session');
    /* Clean every other prepportal_ key */
    this._keys().forEach((k) => this._del(k));
  },

  /* ---------- Application tracker records ---------- */
  /** Returns a clean application record, or null if company/role are missing. Never trusts its input. */
  normalizeApplication(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const text = (v, max) => (typeof v === 'string' ? v.replaceAll('\u0000', '').trim().slice(0, max) : '');
    const company = text(raw.company, 80);
    const role = text(raw.role, 120);
    if (!company || !role) return null;
    let url = text(raw.url, 500);
    try {
      const parsed = new URL(url);
      url = ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch { url = ''; }
    const statuses = ['saved', 'applied', 'assessment', 'interview', 'offer', 'closed'];
    const now = new Date().toISOString();
    const stamp = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : now);
    return {
      id: text(raw.id, 60) || `app_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      company, role, url,
      status: statuses.includes(raw.status) ? raw.status : 'saved',
      notes: text(raw.notes, 1000),
      jobId: text(raw.jobId, 80),
      source: text(raw.source, 40),
      createdAt: stamp(raw.createdAt),
      updatedAt: stamp(raw.updatedAt)
    };
  },

  /* ---------- Backup / restore (works without any server) ---------- */
  /** Progress for one account plus the app-wide data (resume text, interview experiences...). Never includes passwords. */
  exportBackup(email) {
    const globals = {};
    this._keys().filter((k) => k.startsWith('g_')).forEach((k) => { globals[k.slice(2)] = this._get(k); });
    return { app: 'placementprep', version: 1, exportedAt: new Date().toISOString(), progress: this.getProgress(email), globals };
  },

  /** Validate and restore a backup into `email`'s account. Returns { ok: true } or { ok: false, error }. */
  importBackup(email, backup) {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (!email) return { ok: false, error: 'Sign in (or continue as guest) before importing.' };
    if (!isObj(backup) || backup.app !== 'placementprep' || backup.version !== 1 || !isObj(backup.progress)) {
      return { ok: false, error: 'This file is not a PlacementPrep backup.' };
    }
    const base = this.getProgress(email);
    const p = backup.progress;
    const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
    const progress = {
      ...base,
      aptitude: {
        completed: num(p.aptitude && p.aptitude.completed),
        correct: num(p.aptitude && p.aptitude.correct),
        total: num(p.aptitude && p.aptitude.total),
        history: Array.isArray(p.aptitude && p.aptitude.history) ? p.aptitude.history.slice(-200) : []
      },
      coding: {
        solved: Array.isArray(p.coding && p.coding.solved) ? p.coding.solved.filter((x) => typeof x === 'string' || typeof x === 'number').slice(0, 500) : [],
        totalAttempts: num(p.coding && p.coding.totalAttempts)
      },
      interview: isObj(p.interview) ? p.interview : base.interview,
      resumeScore: Math.min(num(p.resumeScore), 100),
      skills: isObj(p.skills) ? p.skills : {},
      activity: Array.isArray(p.activity) ? p.activity.slice(-200) : [],
      readiness: Math.min(num(p.readiness), 100),
      applications: (Array.isArray(p.applications) ? p.applications : []).slice(0, 300).map((a) => this.normalizeApplication(a)).filter(Boolean)
    };
    this._set(this._progressKey(email), progress);
    if (isObj(backup.globals)) {
      for (const [key, value] of Object.entries(backup.globals)) {
        if (/^[A-Za-z0-9_-]{1,60}$/.test(key)) this.setGlobal(key, value);
      }
    }
    return { ok: true };
  }
};
