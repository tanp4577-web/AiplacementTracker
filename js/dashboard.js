/* ============ Progress Dashboard & Analytics Module ============ */
const Dashboard = {
  _resizeHandler: null,

  render(container) {
    const email = Auth.getEmail();
    if (!email) {
      container.innerHTML = `
        <div class="card text-center" style="padding:60px 24px">
          <div style="font-size:44px;margin-bottom:14px;color:var(--accent)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:52px;height:52px;margin:0 auto"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
          </div>
          <h3 style="font-size:20px;margin-bottom:8px">Sign in to view your dashboard</h3>
          <p class="text-dim" style="max-width:440px;margin:0 auto">Create an account or sign in to track your placement readiness, analyze skill gaps, and view study streaks.</p>
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
      <div class="card dashboard-hero mb-3">
        <div class="hero-score">
          <div class="hero-ring">
            <svg viewBox="0 0 100 100">
              <circle class="bg" cx="50" cy="50" r="42" stroke-width="8" fill="none"/>
              <circle class="fg" cx="50" cy="50" r="42" stroke-width="8" fill="none"
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
            <div class="flex gap-2 mt-3 flex-wrap">
              <span class="chip blue">${this._daysActive(prog)} day streak</span>
              <span class="chip green">${prog.aptitude.completed || 0} quizzes taken</span>
              <span class="chip purple">${prog.coding.solved ? prog.coding.solved.length : 0} problems solved</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-4 mb-3">
        <div class="card text-center">
          <div class="card-stat text-accent">${prog.resumeScore || 0}</div>
          <div class="card-stat-label">Resume Score</div>
        </div>
        <div class="card text-center">
          <div class="card-stat text-success">${this._aptitudeAccuracy(prog)}%</div>
          <div class="card-stat-label">Aptitude Accuracy</div>
        </div>
        <div class="card text-center">
          <div class="card-stat" style="color:var(--purple)">${prog.interview.sessions || 0}</div>
          <div class="card-stat-label">Mock Interviews</div>
        </div>
        <div class="card text-center">
          <div class="card-stat text-warning">${Object.keys(prog.skills || {}).length ? prog.skills.matchPct || 0 : 0}%</div>
          <div class="card-stat-label">Target Skill Match</div>
        </div>
      </div>

      <div class="grid grid-2 mb-3">
        <div class="card">
          <div class="card-title">Aptitude Performance</div>
          <div class="card-sub">Recent quiz accuracy trends across attempts</div>
          <canvas class="bar-canvas" id="aptBarCanvas"></canvas>
        </div>
        <div class="card">
          <div class="card-title">Skill Radar</div>
          <div class="card-sub">Your profile skills versus target role requirements</div>
          <canvas class="radar-canvas" id="radarCanvas"></canvas>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Recent Study Activity</div>
          <div class="card-sub">Last 26 days of practice sessions</div>
          ${this._renderHeatmap(prog)}
        </div>
        <div class="card">
          <div class="card-title">Interview Topics Covered</div>
          <div class="card-sub">HR simulator questions & competency areas practiced</div>
          ${this._renderTopics(prog)}
        </div>
      </div>
    `;

    const renderCharts = () => {
      const barEl = document.getElementById('aptBarCanvas');
      const radarEl = document.getElementById('radarCanvas');
      if (barEl) this._drawBarChart(barEl, this._aptHistory(prog));
      if (radarEl) this._drawRadar(radarEl, prog);
    };

    requestAnimationFrame(renderCharts);

    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this._resizeHandler = () => renderCharts();
    window.addEventListener('resize', this._resizeHandler);
  },

  _computeReadiness(prog) {
    const resumeScore = prog.resumeScore || 0;
    const apt = prog.aptitude || { completed: 0, correct: 0, total: 0 };
    const coding = prog.coding || { solved: [] };
    const interview = prog.interview || { sessions: 0 };

    const resume = Math.min(resumeScore, 100);
    const aptitude = apt.total ? Math.round((apt.correct / apt.total) * 100) : 0;
    const code = Math.min((coding.solved.length / 3) * 100, 100);
    const intrv = Math.min((interview.sessions / 3) * 100, 100);

    const readiness = Math.round(
      resume * 0.25 +
      aptitude * 0.25 +
      code * 0.30 +
      intrv * 0.20
    );
    return Math.min(Math.max(readiness, 0), 100);
  },

  _readinessMessage(r) {
    if (r >= 80) return 'Outstanding! You are placement-ready.';
    if (r >= 60) return 'Great progress! Keep practicing daily.';
    if (r >= 40) return 'On the right track. Focus on weak areas.';
    return 'Getting started. Build momentum with mock tests.';
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
      <div class="heatmap">
        ${cells.join('')}
      </div>
      <div class="legend mt-2">
        <span>Less</span>
        <span class="sw" style="background:var(--surface-2);border:1px solid var(--border)"></span>
        <span class="sw" style="background:rgba(79,70,229,0.25)"></span>
        <span class="sw" style="background:rgba(79,70,229,0.50)"></span>
        <span class="sw" style="background:rgba(79,70,229,0.75)"></span>
        <span class="sw" style="background:var(--accent)"></span>
        <span>More</span>
      </div>
    `;
  },

  _renderTopics(prog) {
    const topics = (prog.interview && prog.interview.topics) || [];
    if (!topics.length) {
      return `
        <div class="empty-state" style="padding:28px 12px;text-align:center">
          <div style="margin-bottom:8px;color:var(--text-faint)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;margin:0 auto"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
          </div>
          <h4 style="font-size:14px;margin-bottom:4px">No interview practice yet</h4>
          <p class="text-dim" style="font-size:12.5px">Try the HR Simulator to cover common interview questions.</p>
        </div>
      `;
    }
    return `
      <div class="tag-row mt-2">
        ${topics.map(t => `<span class="chip green">${t}</span>`).join('')}
      </div>
    `;
  },

  _drawBarChart(canvas, history) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    if (!history.length) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Complete quizzes to see performance trends', w / 2, h / 2);
      return;
    }

    const labels = history.map((x, i) => 'Q' + (i + 1));
    const values = history.map(x => x.pct || 0);
    const pad = { top: 24, right: 16, bottom: 28, left: 36 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const max = Math.max(...values, 100);
    const barW = chartW / values.length;

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    [0, 50, 100].forEach(level => {
      const y = pad.top + chartH - (level / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(level + '%', pad.left - 6, y + 3);
    });

    values.forEach((v, i) => {
      const bh = (v / max) * chartH;
      const x = pad.left + i * barW + barW * 0.2;
      const y = pad.top + chartH - bh;

      // Bar fill
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      this._roundedRect(ctx, x, y, barW * 0.6, bh, 4);
      ctx.fill();

      // Bar value label
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(v + '%', x + barW * 0.3, y - 6);

      // X-axis label
      ctx.fillStyle = '#64748b';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(labels[i], x + barW * 0.3, h - 8);
    });
  },

  _drawRadar(canvas, prog) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const skills = prog.skills;
    const role = skills && skills.targetRole;
    if (!role || typeof ROLE_SKILLS === 'undefined' || !ROLE_SKILLS[role]) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select a target role in Skill Gap to view radar', w / 2, h / 2);
      return;
    }

    const roleData = ROLE_SKILLS[role];
    const reqSkills = roleData.skills.slice(0, 6);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 32;
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
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    reqSkills.forEach((_, i) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();
    });

    const matchPct = skills.matchPct || 0;
    ctx.beginPath();
    reqSkills.forEach((s, i) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const r = Math.max(0.15, (matchPct / 100)) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(79, 70, 229, 0.18)';
    ctx.fill();
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    reqSkills.forEach((s, i) => {
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      const x = cx + (radius + 18) * Math.cos(angle);
      const y = cy + (radius + 18) * Math.sin(angle);
      ctx.fillText(s.name, x, y + 4);
    });
  },

  _roundedRect(ctx, x, y, w, h, r) {
    if (!w || !h) return;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
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
