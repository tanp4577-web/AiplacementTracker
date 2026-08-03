/* ============ SPA Router & Global Controller ============ */
const App = {
  currentView: null,
  views: {},

  init() {
    console.log('App.init() called');
    // Register views
    this.views = {
      dashboard: { render: (c) => Dashboard.render(c), title: 'Dashboard', subtitle: 'Your placement readiness overview' },
      resume: { render: (c) => Resume.render(c), title: 'Resume Analyzer', subtitle: 'ATS score & improvement suggestions' },
      aptitude: { render: (c) => Aptitude.render(c), title: 'Aptitude Quiz', subtitle: 'Practice with adaptive difficulty' },
      coding: { render: (c) => Coding.render(c), title: 'Coding Practice', subtitle: 'Solve challenges in your browser' },
      interview: { render: (c) => Interview.render(c), title: 'HR Simulator', subtitle: 'Practice with our AI interviewer' },
      skills: { render: (c) => Skills.render(c), title: 'Skill Gap Analysis', subtitle: 'Find what to learn next' },
      company: { render: (c) => Company.render(c), title: 'Company Patterns', subtitle: 'Top tech interview patterns' }
    };

    // Initialize auth
    Auth.init();

    // Initialize chatbot
    Chatbot.init();

    // Router
    window.addEventListener('hashchange', () => this._route());
    window.addEventListener('load', () => this._route());

    // Nav link active tracking
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        // Close mobile menu
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
      });
    });

    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('overlay').classList.toggle('show');
    });
    document.getElementById('overlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.remove('show');
    });

    // Reset button
    document.getElementById('resetDataBtn').addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        DB.resetAll();
        this.showToast('Progress reset', 'info');
        this.refreshAll();
      }
    });
  },

  _route() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    if (this.currentView === hash) return;

    // Clean up the HR interview resources (speech, mic, camera, timers) before leaving
    if (this.currentView === 'interview' && typeof Interview.cleanup === 'function') {
      Interview.cleanup();
    }

    this.currentView = hash;

    const view = this.views[hash];
    if (!view) {
      window.location.hash = '#dashboard';
      return;
    }

    // Update page title
    document.getElementById('pageTitle').textContent = view.title;
    document.getElementById('pageSubtitle').textContent = view.subtitle;

    // Update active nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-view="${hash}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Render the view
    const container = document.getElementById('viewContainer');
    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading...</p></div>';
    setTimeout(() => {
      container.innerHTML = '';
      view.render(container);
    }, 200);
  },

  refreshAll() {
    if (this.currentView) {
      const hash = this.currentView;
      this.currentView = null;
      window.location.hash = '#' + hash;
    }
    this._updateMiniReadiness();
  },

  _updateMiniReadiness() {
    const email = Auth.getEmail();
    if (!email) {
      document.getElementById('miniReadiness').style.width = '0%';
      document.getElementById('miniReadinessVal').textContent = '0%';
      return;
    }
    const prog = DB.getProgress(email);
    const r = prog.readiness || 0;
    document.getElementById('miniReadiness').style.width = r + '%';
    document.getElementById('miniReadinessVal').textContent = Math.round(r) + '%';
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    toast.innerHTML = `<span>${icons[type] || icons.info}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
