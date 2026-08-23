/* ============ Progress Dashboard & Analytics Module ============ */
const Dashboard = {
  render(container) {
    const email = Auth.getEmail();
    if (!email) {
      container.innerHTML = `
        <div class="card text-center" style="padding:50px">
          <div style="font-size:44px;margin-bottom:12px;color:var(--accent)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:52px;height:52px;margin:0 auto"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
          </div>
          <h3 style="font-size:20px;margin-bottom:8px">Sign in to view your dashboard</h3>
          <p class="text-dim">Create an account or sign in to track your placement readiness, progress charts, and streaks.</p>
        </div>
      `;
      return;
    }

    const prog = DB.getProgress(email);
    const readiness = this._computeReadiness(prog);

    if (prog.readiness !== readiness) {
      DB.saveProgress(email, { readiness });
    }

    container.innerHTML = `
      <div class="card dashboard-hero mb-2">
        <div class="hero-score">
          <div class="hero-ring">
            <svg viewBox="0 0 100 100">
              <circle class="bg" cx="50" cy="50" r="42" stroke-width="10" fill="none"/>
              <circle class="fg" cx="50" cy="50" r="42" stroke-width="10" fill="none"
                stroke-dasharray="${2 * Math.PI * 42}"
                stroke-dashoffset="${2 * Math.PI * 42 * (1 - readiness / 100)}"/>
            </svg>
            <div class="hero-num">
              <b>${readiness}%</b>
              <span>Readiness</span>
            </div>
          </div>
          <div class="hero-msg">
            <h3>${this._readinessMessage(readiness)}</h3>
            <p>Your overall placement readiness is calculated from resume quality, aptitude accuracy, coding progress, interview practice, and skill gap coverage.</p>
            <div class="flex gap-1 mt-2">
              <span class="chip blue">${this._daysActive(prog)} day streak</span>
              <span class="chip green">${prog.aptitude.completed || 0} quizzes</span>
              <span class="chip purple">${prog.coding.solved ? prog.coding.solved.length : 0} solved</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-4 mb-2">
        <div class="card text-center">
          <div class="card-stat">${prog.resumeScore || 0}</div>
          <div class="card-stat-label">Resume Score</div>
        </div>
        <div class="card text-center">
          <div class="card-stat">${this._aptitudeAccuracy(prog)}%</div>
          <div class="card-stat-label">Aptitude Accuracy</div>
        </div>
        <div class="card text-center">
          <div class="card-stat">${prog.interview.sessions || 0}</div>
          <div class="card-stat-label">Mock Interviews</div>
        </div>
        <div class="card text-center">
          <div class="card-stat">${Object.keys(prog.skills || {}).length ? prog.skills.matchPct || 0 : 0}%</div>
          <div class="card-stat-label">Skill Match</div>
        </div>
      </div>

      <div class="grid grid-2 mb-2">
        <div class="card">
          <div class="card-title">Aptitude Performance</div>
          <div class="card-sub">Your accuracy across quiz sessions</div>
          <canvas class="bar-canvas" id="aptBarCanvas"></canvas>
        </div>
        <div class="card">
          <div class="card-title">Skill Radar</div>
          <div class="card-sub">Detected skills vs target role requirements</div>
          <canvas class="radar-canvas" id="radarCanvas"></canvas>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Recent Activity</div>
          <div class="card-sub">Last 26 days of study activity</div>
          ${this._renderHeatmap(prog)}
        </div>
        <div class="card">
          <div class="card-title">Interview Topics Covered</div>
          <div class="card-sub">HR round topics you have practiced</div>
          ${this._renderTopics(prog)}
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      this._drawBarChart(document.getElementById('aptBarCanvas'), this._aptHistory(prog));
      this._drawRadar(document.getElementById('radarCanvas'), prog);
    });
  },

  _computeReadiness(prog) {
    const resumeScore = prog.resumeScore || 0;
    const apt = prog.aptitude || { completed: 0, correct: 0, total: 0 };
    const coding = prog.coding || { solved: [] };
    const interview = prog.interview || { sessions: 0 };
    const skills = prog.skills || {};

    const resume = Math.min(resumeScore, 100);
    const aptitude = apt.total ? Math.round((apt.correct / apt.total) * 100) : 0;
    const code = Math.min((coding.solved.length / 3) * 100, 100);
    const intrv = Math.min((interview.sessions / 3) * 100, 100);

    const readiness = Math.round(
      resume * 0.25 +
      aptitude * 0.25 +
      code * 0.3 +
      intrv * 0.2
    );
    return Math.min(Math.max(readiness, 0), 100);
  },

  _readinessMessage(r) {
    if (r >= 80) return 'Outstanding! You are placement-ready.';
    if (r >= 60) return 'Great progress! Keep pushing.';
    if (r >= 40) return 'On the right track. Focus on weak areas.';
    return 'Getting started. Build momentum with daily practice.';
  },

  _aptitudeAccuracy(prog) {
    const apt = prog.aptitude || {};
    return apt.total ? Math.round((apt.correct / apt.total) * 100) : 0;
  },

  _daysActive(prog) {
    const activity = prog.activity || [];
    if (!activity.length) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      if (activity.some(a => a.date && new Date(a.date).toDateString() === key)) streak++;
      else if (i > 0) break;
    }
    return streak;
  },

  _aptHistory(prog) {
    const history = (prog.aptitude && prog.aptitude.history) || [];
    return history.slice(-8);
  },

  _renderHeatmap(prog) {
    const activity = prog.activity || [];
    const today = new Date();
    const cells = [];
    for (let i = 25; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const count = activity.filter(a => a.date && new Date(a.date).toDateString() === key).length;
      const level = count === 0 ? '' : count === 1 ? 'l1' : count === 2 ? 'l2' : count === 3 ? 'l3' : 'l4';
      const title = `${d.toDateString()}: ${count} activity`;
      cells.push(`<div class="heat-cell ${level}" title="${title}"></div>`);
    }
    return `
      ${cells.join('')}
      <div class="legend mt-1" style="grid-column:1/-1">
        <span>Less</span>
        <span class="sw" style="background:rgba(255,255,255,0.05)"></span>
        <span class="sw" style="background:rgba(63,174,111,0.3)"></span>
        <span class="sw" style="background:rgba(63,174,111,0.55)"></span>
        <span class="sw" style="background:rgba(63,174,111,0.8)"></span>
        <span class="sw" style="background:rgba(63,174,111,1)"></span>
        <span>More</span>
      </div>
    `;
  },

  _renderTopics(prog) {
    const topics = (prog.interview && prog.interview.topics) || [];
    if (!topics.length) {
      return `
        <div class="empty-state">
          <div class="es-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:40px;height:40px;margin:0 auto"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
          </div>
          <h3>No interview practice yet</h3>
          <p>Try the HR Simulator to cover more topics</p>
        </div>
      `;
    }
    return topics.map(t => `<span class="chip green" style="margin:0 6px 6px 0">${t}</span>`).join('');
  },

  _drawBarChart(canvas, history) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

if (!history.length) {
      ctx.fillStyle = '#6b6b6b';
      ctx.font = '14px Patrick Hand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Complete quizzes to see trends', w / 2, h / 2);
      return;
    }

    const labels = history.map((x, i) => 'Q' + (i + 1));
    const values = history.map(x => x.pct || 0);
    const pad = { top: 20, right: 10, bottom: 24, left: 30 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const max = Math.max(...values, 100);
    const barW = chartW / values.length;

ctx.font = '12px Patrick Hand, sans-serif';
    ctx.fillStyle = '#6b6b6b';

    values.forEach((v, i) => {
      const bh = (v / max) * chartH;
      const x = pad.left + i * barW + barW * 0.2;
      const y = pad.top + chartH - bh;
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      this._roundedRect(ctx, x, y, barW * 0.6, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#6b6b6b';
      ctx.textAlign = 'center';
      ctx.fillText(v + '%', x + barW * 0.3, y - 5);
      ctx.fillText(labels[i], x + barW * 0.3, h - 8);
    });
  },

  _drawRadar(canvas, prog) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

const skills = prog.skills;
    const role = skills && skills.targetRole;
    if (!role || !ROLE_SKILLS[role]) {
      ctx.fillStyle = '#6b6b6b';
      ctx.font = '14px Patrick Hand, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Analyze skill gaps to see radar', w / 2, h / 2);
      return;
    }

    const roleData = ROLE_SKILLS[role];
    const reqSkills = roleData.skills.slice(0, 6);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 28;
    const n = reqSkills.length;

    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
        const r = (ring / 4) * radius;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    reqSkills.forEach((_, i) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();
    });

    const matchPct = skills.matchPct || 0;
    ctx.beginPath();
    reqSkills.forEach((s, i) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const r = (matchPct / 100) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
ctx.closePath();
    ctx.fillStyle = 'rgba(45,93,161,0.22)';
    ctx.fill();
    ctx.strokeStyle = '#2d5da1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#6b6b6b';
    ctx.font = '12px Patrick Hand, sans-serif';
    ctx.textAlign = 'center';
    reqSkills.forEach((s, i) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const x = cx + (radius + 15) * Math.cos(angle);
      const y = cy + (radius + 15) * Math.sin(angle);
      ctx.fillText(s.name, x, y);
    });
  },

  _roundedRect(ctx, x, y, w, h, r) {
    if (!w || !h) return;
    // Use native roundRect when available (Chrome 99+, Safari 16+)
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    // Fallback path for older browsers
    const rad = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
  }
};
