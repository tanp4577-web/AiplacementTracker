/* ============ Authentication Module ============ */
const Auth = {
  mode: 'login', // 'login' | 'signup'

  init() {
    this.modal = document.getElementById('authModal');
    this.title = document.getElementById('authTitle');
    this.subtitle = document.getElementById('authSubtitle');
    this.tabLogin = document.getElementById('tabLogin');
    this.tabSignup = document.getElementById('tabSignup');
    this.nameField = document.getElementById('nameField');
    this.nameInput = document.getElementById('authName');
    this.emailInput = document.getElementById('authEmail');
    this.passInput = document.getElementById('authPass');
    this.submitBtn = document.getElementById('authSubmitBtn');
    this.errorDiv = document.getElementById('authError');
    this.authArea = document.getElementById('authArea');

    this._bindEvents();

    // Check if already logged in
    const session = DB.getSession();
    if (session && DB.getUser(session.email)) {
      this._renderLoggedIn(session.email);
    } else {
      this._showModal();
    }

    // Show date
    const dateText = document.getElementById('dateText');
    const formattedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (dateText) {
      dateText.textContent = formattedDate;
    } else {
      const badge = document.getElementById('dateBadge');
      if (badge) badge.textContent = formattedDate;
    }
  },

  _bindEvents() {
    this.tabLogin.addEventListener('click', () => this._setMode('login'));
    this.tabSignup.addEventListener('click', () => this._setMode('signup'));
    this.submitBtn.addEventListener('click', () => this._handleSubmit());

    // Enter key support
    this.passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSubmit();
    });
    this.emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSubmit();
    });
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSubmit();
    });

    // Close modal on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this._hideModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._hideModal();
    });
  },

  _setMode(mode) {
    this.mode = mode;
    this.errorDiv.classList.add('hidden');
    const isSignup = mode === 'signup';
    this.tabLogin.classList.toggle('active', !isSignup);
    this.tabSignup.classList.toggle('active', isSignup);
    this.nameField.classList.toggle('hidden', !isSignup);
    this.nameInput.required = isSignup;
    this.title.textContent = isSignup ? 'Create Your Account' : 'Sign in to PlacementPrep';
    this.subtitle.textContent = isSignup ? 'Join to start tracking your placement journey' : 'Sign in to track your placement readiness';
    this.submitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
  },

  _showModal() {
    this.modal.classList.add('show');
    this._setMode('login');
    setTimeout(() => this.emailInput && this.emailInput.focus(), 300);
  },

  _hideModal() {
    this.modal.classList.remove('show');
  },

  _handleSubmit() {
    const email = this.emailInput.value.trim().toLowerCase();
    const pass = this.passInput.value.trim();
    const name = this.nameInput.value.trim();
    const isSignup = this.mode === 'signup';

    this.errorDiv.classList.add('hidden');

    if (!email || !pass) {
      this._showError('Please fill in all required fields.');
      return;
    }

    if (isSignup && !name) {
      this._showError('Please enter your full name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this._showError('Please enter a valid email address.');
      return;
    }

    if (pass.length < 4) {
      this._showError('Password must be at least 4 characters.');
      return;
    }

    const existing = DB.getUser(email);

    if (isSignup) {
      if (existing) {
        this._showError('An account with this email already exists. Please sign in.');
        return;
      }
      DB.saveUser(email, { name, email, pass, createdAt: Date.now() });
      this._login(email, 'Account created! Welcome aboard.');
    } else {
      if (!existing) {
        this._showError('No account found with this email. Please create an account.');
        return;
      }
      if (existing.pass !== pass) {
        this._showError('Incorrect password. Please try again.');
        return;
      }
      this._login(email, 'Welcome back!');
    }
  },

  _login(email, msg) {
    DB.setSession(email);
    this._hideModal();
    this._renderLoggedIn(email);
    App.showToast(msg, 'success');
    App.refreshAll();
  },

  _renderLoggedIn(email) {
    const user = DB.getUser(email);
    if (!user) return;
    const initial = (user.name || email[0]).charAt(0).toUpperCase();
    const displayName = user.name ? user.name.split(' ')[0] : email.split('@')[0];
    this.authArea.innerHTML = `
      <div class="user-badge" id="userBadge">
        <span class="user-avatar">${this._escapeHtml(initial)}</span>
        <span class="user-name">${this._escapeHtml(displayName)}</span>
        <button class="btn btn-ghost btn-sm user-logout" id="logoutBtn" title="Sign out" aria-label="Sign out">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => this._logout());
  },

  _logout() {
    DB.clearSession();
    this.authArea.innerHTML = '';
    this._showModal();
    App.showToast('Signed out successfully', 'info');
    App.refreshAll();
  },

  _showError(msg) {
    this.errorDiv.textContent = msg;
    this.errorDiv.classList.remove('hidden');
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  getCurrentUser() {
    const session = DB.getSession();
    if (!session) return null;
    return DB.getUser(session.email);
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  getEmail() {
    const session = DB.getSession();
    return session ? session.email : null;
  }
};
