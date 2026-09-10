/* ============ Community Interview Experiences Wall ============ */
const InterviewWall = {
  state: {
    experiences: [],
    filterCompany: 'all',
    filterDifficulty: 'all',
    search: ''
  },

  async render(container) {
    this.container = container;
    this.state = { experiences: [], filterCompany: 'all', filterDifficulty: 'all', search: '' };
    this.container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading interview experiences...</p></div>';
    /* Load experiences from localStorage */
    const allExp = DB.getGlobal('interview_experiences') || [];
    this.state.experiences = allExp.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    this._renderWall();
  },

  _renderWall() {
    const companies = [...new Set(this.state.experiences.map(item => item.company_name).filter(Boolean))].sort();
    const filtered = this.state.experiences.filter(item => {
      const query = this.state.search.toLowerCase();
      const matchesCompany = this.state.filterCompany === 'all' || item.company_name === this.state.filterCompany;
      const matchesDifficulty = this.state.filterDifficulty === 'all' || item.difficulty === this.state.filterDifficulty;
      const haystack = [item.company_name, item.role_applied, item.tips, item.rounds_text].filter(Boolean).join(' ').toLowerCase();
      return matchesCompany && matchesDifficulty && (!query || haystack.includes(query));
    });
    const isAdmin = Auth.getCurrentUser()?.role === 'admin';

    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div>
            <div class="card-title"><i class="bi bi-chat-square-quote text-accent" style="margin-right:4px"></i>Interview Experiences</div>
            <div class="card-sub">Real rounds and tips from students who've already interviewed</div>
          </div>
          <button class="btn btn-primary" id="shareExperienceBtn"><i class="bi bi-plus-lg" style="margin-right:4px"></i>Share Your Experience</button>
        </div>
        <div class="filter-bar mt-2">
          <select id="experienceCompanyFilter">
            <option value="all">All Companies</option>
            ${companies.map(company => `<option value="${this._escape(company)}" ${this.state.filterCompany === company ? 'selected' : ''}>${this._escape(company)}</option>`).join('')}
          </select>
          <select id="experienceDifficultyFilter">
            <option value="all">All Difficulties</option>
            <option value="Easy" ${this.state.filterDifficulty === 'Easy' ? 'selected' : ''}>Easy</option>
            <option value="Medium" ${this.state.filterDifficulty === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="Hard" ${this.state.filterDifficulty === 'Hard' ? 'selected' : ''}>Hard</option>
          </select>
          <input type="search" id="experienceSearch" placeholder="Search companies, roles, or tips..." value="${this._escape(this.state.search)}" />
        </div>
      </div>

      <div class="grid grid-2" id="experienceGrid">
        ${filtered.length ? filtered.map(item => this._cardMarkup(item, isAdmin)).join('') : '<div class="card empty-state" style="grid-column:1/-1"><h3>No experiences shared yet — be the first!</h3><p>Share what you learned to help the next student prepare.</p></div>'}
      </div>
    `;

    if (this._clickHandler) this.container.removeEventListener('click', this._clickHandler);
    this._clickHandler = this._handleClick.bind(this);
    this.container.addEventListener('click', this._clickHandler);
    document.getElementById('experienceCompanyFilter').addEventListener('change', event => {
      this.state.filterCompany = event.target.value;
      this._renderWall();
    });
    document.getElementById('experienceDifficultyFilter').addEventListener('change', event => {
      this.state.filterDifficulty = event.target.value;
      this._renderWall();
    });
    document.getElementById('experienceSearch').addEventListener('input', event => {
      this.state.search = event.target.value;
      this._renderWall();
    });

    const focusId = sessionStorage.getItem('interviewWallFocusId');
    if (focusId) {
      sessionStorage.removeItem('interviewWallFocusId');
      requestAnimationFrame(() => document.getElementById(`experience-${focusId}`)?.scrollIntoView({ block: 'center' }));
    }
  },

  _handleClick(event) {
    const shareButton = event.target.closest('#shareExperienceBtn');
    if (shareButton) {
      this._openShareModal();
      return;
    }
    const deleteButton = event.target.closest('[data-delete-experience]');
    if (deleteButton) this._deleteExperience(deleteButton.dataset.deleteExperience);
  },

  _cardMarkup(item, isAdmin) {
    const difficultyClass = item.difficulty === 'Easy' ? 'green' : item.difficulty === 'Medium' ? 'orange' : 'red';
    return `
      <article class="card" id="experience-${this._escape(item.id)}">
        <div class="flex-between items-center" style="gap:10px">
          <div>
            <div class="card-title" style="margin-bottom:2px">${this._escape(item.company_name || 'Unknown company')}</div>
            <div class="text-dim" style="font-size:13px">${this._escape(item.role_applied || 'Role not specified')}</div>
          </div>
          <div class="flex gap-1 items-center">
            <span class="chip ${difficultyClass}">${this._escape(item.difficulty || 'Unknown')}</span>
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" data-delete-experience="${this._escape(item.id)}" title="Delete experience" aria-label="Delete experience"><i class="bi bi-trash"></i></button>` : ''}
          </div>
        </div>
        <div class="divider"></div>
        <div class="card-title" style="font-size:13px">Interview Rounds</div>
        <div class="text-dim" style="font-size:13px;line-height:1.6;white-space:pre-line">${this._escape(item.rounds_text || '')}</div>
        ${item.tips ? `<div class="card-title mt-2" style="font-size:13px">Tips for Future Candidates</div><div class="text-dim" style="font-size:13px;line-height:1.6;white-space:pre-line">${this._escape(item.tips)}</div>` : ''}
        <div class="text-faint mt-2" style="font-size:11.5px">Shared by ${this._escape(item.author_name || 'Student')} · ${this._relativeTime(item.created_at)}</div>
      </article>
    `;
  },

  _openShareModal() {
    const existing = document.getElementById('interviewExperienceModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'interviewExperienceModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:620px">
        <div class="modal-head">
          <h2>Share Your Experience</h2>
          <p class="text-dim">Help other students prepare with real interview details.</p>
        </div>
        <div class="modal-body">
          <div id="experienceFormError" class="auth-error hidden" style="color:var(--danger);font-size:12.5px;margin-bottom:12px"></div>
          <label class="field-label" for="experienceCompany">Company Name</label>
          <input type="text" id="experienceCompany" required />
          <label class="field-label" for="experienceRole">Role Applied For</label>
          <input type="text" id="experienceRole" required />
          <label class="field-label" for="experienceDifficulty">Difficulty</label>
          <select id="experienceDifficulty" required><option value="">Select difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
          <label class="field-label" for="experienceRounds">Interview Rounds</label>
          <textarea id="experienceRounds" required placeholder="e.g. 1 online aptitude test, 1 technical DSA round, 1 HR round"></textarea>
          <label class="field-label" for="experienceTips">Tips for Future Candidates</label>
          <textarea id="experienceTips" placeholder="What would you tell the next candidate?"></textarea>
          <div class="flex-between mt-3" style="gap:8px">
            <button class="btn btn-ghost" id="cancelExperienceBtn">Cancel</button>
            <button class="btn btn-primary" id="submitExperienceBtn">Submit</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    modal.querySelector('#cancelExperienceBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    modal.querySelector('#submitExperienceBtn').addEventListener('click', () => this._submitExperience(modal));
  },

  async _submitExperience(modal) {
    const errorBox = modal.querySelector('#experienceFormError');
    const values = {
      company_name: modal.querySelector('#experienceCompany').value.trim(),
      role_applied: modal.querySelector('#experienceRole').value.trim(),
      difficulty: modal.querySelector('#experienceDifficulty').value,
      rounds_text: modal.querySelector('#experienceRounds').value.trim(),
      tips: modal.querySelector('#experienceTips').value.trim()
    };
    if (!values.company_name || !values.role_applied || !values.difficulty || !values.rounds_text) {
      errorBox.textContent = 'Please complete Company Name, Role Applied For, Difficulty, and Interview Rounds.';
      errorBox.classList.remove('hidden');
      return;
    }
    const button = modal.querySelector('#submitExperienceBtn');
    button.disabled = true;
    errorBox.classList.add('hidden');
    try {
      const currentUser = Auth.getCurrentUser();
      if (!currentUser) throw new Error('Please sign in before sharing an experience.');
      const newExp = { id: crypto.randomUUID(), user_id: currentUser.id, author_name: currentUser.name || currentUser.email, created_at: new Date().toISOString(), ...values };
      const allExp = DB.getGlobal('interview_experiences') || [];
      allExp.unshift(newExp);
      DB.setGlobal('interview_experiences', allExp);
      modal.remove();
      App.showToast('Experience shared successfully', 'success');
      await this.render(this.container);
    } catch (error) {
      errorBox.textContent = error.message || 'Could not share this experience.';
      errorBox.classList.remove('hidden');
    } finally {
      button.disabled = false;
    }
  },

  async _deleteExperience(id) {
    const allExp = DB.getGlobal('interview_experiences') || [];
    DB.setGlobal('interview_experiences', allExp.filter(item => String(item.id) !== String(id)));
    this.state.experiences = this.state.experiences.filter(item => String(item.id) !== String(id));
    this._renderWall();
  },

  _relativeTime(value) {
    if (!value) return 'recently';
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  },

  _escape(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }
};
