/* ============================================================================
   Application Tracker — a board for every job or internship you go after:
   Saved → Applied → Assessment → Interview → Offer (or Closed).
   Stored per account in this browser (inside the progress record), so it is
   included in Export / Import backup. Cards move with plain buttons, which
   works with a keyboard and on a phone (no drag-and-drop needed).
   ========================================================================== */
const Tracker = {
  STATUSES: [
    { id: 'saved', label: 'Saved', hint: 'Roles you want to apply to' },
    { id: 'applied', label: 'Applied', hint: 'Application sent' },
    { id: 'assessment', label: 'Assessment', hint: 'Online test or assignment' },
    { id: 'interview', label: 'Interview', hint: 'Technical / HR rounds' },
    { id: 'offer', label: 'Offer', hint: 'Offer received' },
    { id: 'closed', label: 'Closed', hint: 'Rejected or withdrawn' }
  ],
  MAX_ENTRIES: 300,
  state: { search: '', editingId: null },

  /* ------------------------------ data ------------------------------ */
  list(email) {
    const progress = DB.getProgress(email);
    return progress && Array.isArray(progress.applications) ? progress.applications : [];
  },

  _save(email, applications) {
    DB.saveProgress(email, { applications });
  },

  /** Adds an application. Returns { ok, entry } or { ok: false, error }. */
  add(email, raw) {
    const applications = this.list(email);
    if (applications.length >= this.MAX_ENTRIES) return { ok: false, error: `You can track up to ${this.MAX_ENTRIES} applications.` };
    const entry = DB.normalizeApplication({ ...raw, id: undefined });
    if (!entry) return { ok: false, error: 'Please enter both the company and the role.' };
    this._save(email, [entry, ...applications]);
    return { ok: true, entry };
  },

  update(email, id, changes) {
    const applications = this.list(email);
    const index = applications.findIndex((a) => a.id === id);
    if (index < 0) return { ok: false, error: 'That application no longer exists.' };
    const entry = DB.normalizeApplication({ ...applications[index], ...changes, id, updatedAt: new Date().toISOString() });
    if (!entry) return { ok: false, error: 'Please enter both the company and the role.' };
    applications[index] = entry;
    this._save(email, applications);
    return { ok: true, entry };
  },

  move(email, id, direction) {
    const entry = this.list(email).find((a) => a.id === id);
    if (!entry) return { ok: false };
    const index = this.STATUSES.findIndex((s) => s.id === entry.status) + direction;
    if (index < 0 || index >= this.STATUSES.length) return { ok: false };
    return this.update(email, id, { status: this.STATUSES[index].id });
  },

  remove(email, id) {
    this._save(email, this.list(email).filter((a) => a.id !== id));
  },

  /** Called by the Hiring Hub's "Track" button. */
  addFromJob(job) {
    const email = Auth.getEmail();
    if (!email) {
      App.showToast('Sign in or continue as guest to track applications.', 'info');
      return { ok: false };
    }
    if (this.list(email).some((a) => a.jobId && a.jobId === job.id)) {
      App.showToast('Already in your Application Tracker.', 'info');
      return { ok: false, duplicate: true };
    }
    const result = this.add(email, { company: job.company, role: job.title, url: job.applyUrl, status: 'saved', jobId: job.id, source: job.sourceLabel || '' });
    App.showToast(result.ok ? 'Added to your Application Tracker (Saved).' : result.error, result.ok ? 'success' : 'error');
    return result;
  },

  /* ------------------------------- view ------------------------------ */
  render(container) {
    this.container = container;
    this.state = { search: '', editingId: null };
    const email = Auth.getEmail();
    if (!email) {
      container.innerHTML = `
        <div class="card text-center" style="padding:40px 20px">
          <h3>Sign in to track your applications</h3>
          <p class="text-dim" style="max-width:440px;margin:8px auto 0">Keep every job and internship in one board — from Saved to Offer.</p>
          <div class="flex gap-2 flex-wrap" style="justify-content:center;margin-top:18px">
            <button type="button" class="btn btn-primary" id="trackerSignInBtn">Sign in</button>
            <button type="button" class="btn btn-ghost" id="trackerGuestBtn">Continue as guest</button>
          </div>
        </div>`;
      document.getElementById('trackerSignInBtn').addEventListener('click', () => Auth._showModal());
      document.getElementById('trackerGuestBtn').addEventListener('click', () => Auth._loginAsGuest());
      return;
    }
    this.email = email;
    const esc = (v) => Sanitize.html(v);

    container.innerHTML = `
      <div class="card mb-2">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div>
            <div class="card-title"><i class="bi bi-kanban text-accent" style="margin-right:4px"></i>Application Tracker</div>
            <div class="card-sub" id="trackerSummary"></div>
          </div>
          <div class="flex gap-2" style="flex-wrap:wrap">
            <input type="search" id="trackerSearch" placeholder="Search company or role..." aria-label="Search applications" />
            <button type="button" class="btn btn-primary" id="trackerAddBtn"><i class="bi bi-plus-lg" style="margin-right:4px"></i>Add application</button>
          </div>
        </div>
        <form id="trackerForm" class="tracker-form hidden" novalidate>
          <div class="grid grid-2">
            <div><label class="field-label" for="trackerCompany">Company</label><input id="trackerCompany" maxlength="80" autocomplete="off" /></div>
            <div><label class="field-label" for="trackerRole">Role</label><input id="trackerRole" maxlength="120" autocomplete="off" /></div>
            <div><label class="field-label" for="trackerUrl">Link to the posting (optional)</label><input id="trackerUrl" type="url" placeholder="https://" autocomplete="off" /></div>
            <div><label class="field-label" for="trackerStatus">Stage</label>
              <select id="trackerStatus">${this.STATUSES.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</select></div>
          </div>
          <label class="field-label" for="trackerNotes">Notes (optional)</label>
          <textarea id="trackerNotes" rows="3" maxlength="1000" placeholder="Referral, deadline, round details..."></textarea>
          <div id="trackerFormError" class="text-danger hidden" role="alert" style="margin-top:6px;font-size:13px"></div>
          <div class="flex gap-2 mt-2">
            <button type="submit" class="btn btn-primary" id="trackerSaveBtn">Save</button>
            <button type="button" class="btn btn-ghost" id="trackerCancelBtn">Cancel</button>
          </div>
        </form>
      </div>
      <div class="tracker-board" id="trackerBoard" role="list"></div>
    `;

    document.getElementById('trackerAddBtn').addEventListener('click', () => this._openForm(null));
    document.getElementById('trackerCancelBtn').addEventListener('click', () => this._closeForm());
    document.getElementById('trackerForm').addEventListener('submit', (e) => { e.preventDefault(); this._submitForm(); });
    document.getElementById('trackerSearch').addEventListener('input', (e) => { this.state.search = e.target.value; this._renderBoard(); });
    document.getElementById('trackerBoard').addEventListener('click', (e) => this._onBoardClick(e));
    this._renderBoard();
  },

  _openForm(id) {
    const entry = id ? this.list(this.email).find((a) => a.id === id) : null;
    this.state.editingId = entry ? entry.id : null;
    const $ = (name) => document.getElementById(name);
    $('trackerCompany').value = entry ? entry.company : '';
    $('trackerRole').value = entry ? entry.role : '';
    $('trackerUrl').value = entry ? entry.url : '';
    $('trackerStatus').value = entry ? entry.status : 'applied';
    $('trackerNotes').value = entry ? entry.notes : '';
    $('trackerFormError').classList.add('hidden');
    $('trackerSaveBtn').textContent = entry ? 'Save changes' : 'Save';
    $('trackerForm').classList.remove('hidden');
    $('trackerCompany').focus();
  },

  _closeForm() {
    this.state.editingId = null;
    document.getElementById('trackerForm').classList.add('hidden');
  },

  _submitForm() {
    const $ = (name) => document.getElementById(name);
    const data = { company: $('trackerCompany').value, role: $('trackerRole').value, url: $('trackerUrl').value, status: $('trackerStatus').value, notes: $('trackerNotes').value };
    const result = this.state.editingId ? this.update(this.email, this.state.editingId, data) : this.add(this.email, data);
    if (!result.ok) {
      $('trackerFormError').textContent = result.error;
      $('trackerFormError').classList.remove('hidden');
      return;
    }
    this._closeForm();
    this._renderBoard();
    App.showToast(this.state.editingId ? 'Application updated.' : 'Application added.', 'success');
  },

  async _onBoardClick(e) {
    const button = e.target.closest('button[data-id]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.move) {
      const result = this.move(this.email, id, Number(button.dataset.move));
      if (result.ok) this._renderBoard();
    } else if (button.dataset.edit !== undefined) {
      this._openForm(id);
      document.getElementById('trackerForm').scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    } else if (button.dataset.remove !== undefined) {
      if (await App.confirm('Delete this application from your tracker?', { title: 'Delete application', confirmLabel: 'Delete' })) {
        this.remove(this.email, id);
        this._renderBoard();
      }
    }
  },

  _renderBoard() {
    const esc = (v) => Sanitize.html(v);
    const all = this.list(this.email);
    const term = this.state.search.trim().toLowerCase();
    const shown = term ? all.filter((a) => `${a.company} ${a.role}`.toLowerCase().includes(term)) : all;

    const active = all.filter((a) => !['offer', 'closed'].includes(a.status)).length;
    const offers = all.filter((a) => a.status === 'offer').length;
    document.getElementById('trackerSummary').textContent = all.length
      ? `${all.length} tracked · ${active} in progress · ${offers} offer${offers === 1 ? '' : 's'}`
      : 'Nothing tracked yet — add an application, or press Track on any job in the Hiring Hub.';

    document.getElementById('trackerBoard').innerHTML = this.STATUSES.map((status, col) => {
      const cards = shown.filter((a) => a.status === status.id);
      return `
        <section class="tracker-col" data-status="${status.id}" role="listitem" aria-label="${esc(status.label)}, ${cards.length} application${cards.length === 1 ? '' : 's'}">
          <header class="tracker-col-head"><b>${esc(status.label)}</b><span class="chip gray">${cards.length}</span></header>
          <div class="text-dim tracker-col-hint">${esc(status.hint)}</div>
          ${cards.map((a) => `
            <article class="tracker-card" data-card="${esc(a.id)}">
              <div class="tracker-card-title">${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.role)}</a>` : esc(a.role)}</div>
              <div class="text-dim" style="font-size:13px">${esc(a.company)}</div>
              ${a.notes ? `<p class="tracker-notes">${esc(a.notes)}</p>` : ''}
              <div class="text-dim" style="font-size:11.5px;margin-top:6px">${a.source ? `${esc(a.source)} · ` : ''}Updated ${esc(new Date(a.updatedAt).toLocaleDateString())}</div>
              <div class="tracker-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-id="${esc(a.id)}" data-move="-1" ${col === 0 ? 'disabled' : ''} aria-label="Move ${esc(a.role)} to ${esc((this.STATUSES[col - 1] || status).label)}">←</button>
                <button type="button" class="btn btn-ghost btn-sm" data-id="${esc(a.id)}" data-move="1" ${col === this.STATUSES.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(a.role)} to ${esc((this.STATUSES[col + 1] || status).label)}">→</button>
                <button type="button" class="btn btn-ghost btn-sm" data-id="${esc(a.id)}" data-edit aria-label="Edit ${esc(a.role)}">Edit</button>
                <button type="button" class="btn btn-ghost btn-sm" data-id="${esc(a.id)}" data-remove aria-label="Delete ${esc(a.role)}">Delete</button>
              </div>
            </article>`).join('') || '<div class="tracker-empty text-dim">No applications here</div>'}
        </section>`;
    }).join('');
  }
};
