/* ============ Unified Storage Engine ============ */
const DB = {
  _prefix: 'prepportal_',

  _get(key) {
    try { return JSON.parse(localStorage.getItem(this._prefix + key)); }
    catch { return null; }
  },

  _set(key, val) {
    localStorage.setItem(this._prefix + key, JSON.stringify(val));
  },

  _del(key) {
    localStorage.removeItem(this._prefix + key);
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
    return this._get('session') || null;
  },

  setSession(user) {
    this._set('session', { ...user, loginAt: Date.now() });
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
    this.syncProgress(email);
  },

  syncProgress(email) {
    try {
      const user = typeof Auth !== 'undefined' && Auth.getCurrentUser ? Auth.getCurrentUser() : null;
      /* Supabase removed */
      if (true) return;
      const progress = this.getProgress(email);
      supabaseClient.from('progress').upsert({
        user_id: user.id,
        readiness_pct: progress.readiness || 0,
        resume_score: progress.resumeScore || 0,
        aptitude_accuracy: progress.aptitude && progress.aptitude.total
          ? Math.round((progress.aptitude.correct / progress.aptitude.total) * 100)
          : 0,
        mock_interviews: progress.interview ? progress.interview.sessions || 0 : 0,
        target_skill_match: progress.skills ? progress.skills.matchPct || 0 : 0,
        quizzes_taken: progress.aptitude ? progress.aptitude.completed || 0 : 0,
        problems_solved: progress.coding && progress.coding.solved ? progress.coding.solved.length : 0,
        updated_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.warn('Progress sync failed:', error.message || error);
      }).catch(error => console.warn('Progress sync failed:', error));
    } catch (error) {
      console.warn('Progress sync failed:', error);
    }
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
    if (session) {
      this._del(this._progressKey(session.email));
    }
    this._del('session');
    /* Clean any other prepportal_ keys from localStorage */
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this._prefix)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }
};
