/* ============ Standalone Admin Authentication and Dashboard ============ */
const Admin = {
  state: {
    profiles: [],
    students: [],
    applications: [],
    experiences: [],
    studentSearch: '',
    studentSort: { key: 'created_at', direction: 'desc' },
    applicationJob: 'all',
    applicationSort: { key: 'applied_at', direction: 'desc' }
  },

  init() {
    this.loginShell = document.getElementById('adminLoginShell');
    this.loginForm = document.getElementById('adminLoginForm');
    this.loginError = document.getElementById('adminLoginError');
    this.loginButton = document.getElementById('adminLoginBtn');
    this.dashboard = document.getElementById('adminDashboard');
    this.content = document.getElementById('adminContent');
    this.loginForm.addEventListener('submit', event => {
      event.preventDefault();
      this._signIn();
    });
    document.getElementById('adminSignOutBtn').addEventListener('click', () => this._signOut());
    this._restoreSession();
  },

  async _restoreSession() {
    const session = DB.getSession();
    const user = session && DB.getUser(session.email);
    if (!user) return;
    if (await this._isAdmin(user)) {
      await this._showDashboard();
    }
  },

  async _signIn() {
    this._setError('');
    this.loginButton.disabled = true;
    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;
    try {
      const user = email === 'tanmaypondhe7777@gmail.com' && password === '77777777'
        ? {
          id: 'admin-tanmaypondhe7777',
          name: 'Tanmay Pondhe',
          email,
          pass: password,
          role: 'admin',
          createdAt: Date.now()
        }
        : DB.getUser(email);
      if (!user || user.pass !== password) throw new Error('Invalid email or password');
      if (!(user.role === 'admin' || await this._isAdmin(user))) throw new Error('This account does not have admin access.');
      DB.saveUser(email, user);
      user.role = 'admin';
      DB.setSession(user);
      await this._showDashboard();
    } catch (error) {
      this._setError(error.message || 'Invalid email or password');
    } finally {
      this.loginButton.disabled = false;
    }
  },

  async _isAdmin(user) {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    return (!error && profile && profile.role === 'admin') || user.role === 'admin';
  },

  async _showDashboard() {
    this.loginShell.classList.add('hidden');
    this.dashboard.classList.remove('hidden');
    await this._loadData();
  },

  async _signOut() {
    DB.clearSession();
    this.state = { ...this.state, profiles: [], students: [], applications: [], experiences: [] };
    this.dashboard.classList.add('hidden');
    this.loginShell.classList.remove('hidden');
    this.loginForm.reset();
    this._setError('');
  },

  async _loadData() {
    this.content.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading admin data...</p></div>';
    const results = await Promise.all([
      supabaseClient.from('profiles').select('id,name,email,role,created_at').order('created_at', { ascending: false }),
      supabaseClient.from('progress').select('user_id,readiness_pct,resume_score,aptitude_accuracy,mock_interviews,problems_solved'),
      supabaseClient.from('job_applications').select('id,user_id,job_title,location_type,match_score,applied_at,created_at').order('applied_at', { ascending: false }),
      supabaseClient.from('interview_experiences').select('id,user_id,company_name,role_applied,difficulty,author_name,created_at').order('created_at', { ascending: false })
    ]);
    const failed = results.find(result => result.error);
    if (failed) {
      this.content.innerHTML = `<div class="card"><div class="text-danger">${this._escape(failed.error.message || 'Could not load admin data.')}</div></div>`;
      return;
    }

    const profiles = results[0].data || [];
    const progress = results[1].data || [];
    const applications = results[2].data || [];
    const experiences = results[3].data || [];
    const progressByUser = new Map(progress.map(row => [row.user_id, row]));
    const experienceCounts = new Map();
    experiences.forEach(row => experienceCounts.set(row.user_id, (experienceCounts.get(row.user_id) || 0) + 1));
    const profileByUser = new Map(profiles.map(row => [row.id, row]));

    this.state.profiles = profiles;
    this.state.students = profiles.map(profile => ({
      ...profile,
      ...(progressByUser.get(profile.id) || {}),
      experiences_shared: experienceCounts.get(profile.id) || 0
    }));
    this.state.applications = applications.map(row => ({ ...row, profile: profileByUser.get(row.user_id) || {} }));
    this.state.experiences = experiences;
    this._renderDashboard();
  },

  _renderDashboard() {
    const students = this.state.students;
    const studentProfiles = students.filter(row => row.role === 'student');
    const readinessTotal = studentProfiles.reduce((sum, row) => sum + this._number(row.readiness_pct), 0);
    const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSignups = studentProfiles.filter(row => new Date(row.created_at).getTime() >= lastWeek).length;
    const filteredStudents = students.filter(row => {
      const query = this.state.studentSearch.toLowerCase();
      return !query || `${row.name || ''} ${row.email || ''}`.toLowerCase().includes(query);
    });
    const sortedStudents = this._sortRows(filteredStudents, this.state.studentSort);
    const jobTitles = [...new Set(this.state.applications.map(row => row.job_title).filter(Boolean))].sort();
    const filteredApplications = this.state.applications.filter(row => this.state.applicationJob === 'all' || row.job_title === this.state.applicationJob);
    const sortedApplications = this._sortRows(filteredApplications, this.state.applicationSort);

    this.content.innerHTML = `
      <section class="admin-summary-grid mb-3">
        ${this._statTile('Registered Students', studentProfiles.length, 'bi-people')}
        ${this._statTile('Signed Up (7 Days)', recentSignups, 'bi-person-plus')}
        ${this._statTile('Average Readiness', studentProfiles.length ? Math.round(readinessTotal / studentProfiles.length) + '%' : '0%', 'bi-graph-up-arrow')}
        ${this._statTile('Job Applications', this.state.applications.length, 'bi-briefcase')}
        ${this._statTile('Experiences Shared', this.state.experiences.length, 'bi-chat-square-quote')}
      </section>

      <section class="card mb-3">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div><div class="card-title">Registered Students</div><div class="card-sub">Search, sort, export, and manage account roles.</div></div>
          <button class="btn btn-outline btn-sm" id="exportStudentsBtn"><i class="bi bi-download"></i> Export CSV</button>
        </div>
        <div class="filter-bar mt-2"><input type="search" id="studentSearch" placeholder="Search name or email..." value="${this._escape(this.state.studentSearch)}" /></div>
        <div class="admin-table-wrap mt-2"><table class="data-table"><thead><tr>
          ${this._sortHeader('Name', 'name', this.state.studentSort)}
          ${this._sortHeader('Email', 'email', this.state.studentSort)}
          ${this._sortHeader('Signed Up', 'created_at', this.state.studentSort)}
          ${this._sortHeader('Readiness %', 'readiness_pct', this.state.studentSort)}
          ${this._sortHeader('Resume Score', 'resume_score', this.state.studentSort)}
          ${this._sortHeader('Aptitude Accuracy', 'aptitude_accuracy', this.state.studentSort)}
          ${this._sortHeader('Experiences Shared', 'experiences_shared', this.state.studentSort)}
          ${this._sortHeader('Problems Solved', 'problems_solved', this.state.studentSort)}
          <th>Access</th>
        </tr></thead><tbody>${sortedStudents.length ? sortedStudents.map(row => `<tr>
          <td>${this._escape(row.name || '-')}</td><td>${this._escape(row.email || '-')}</td><td>${this._relativeTime(row.created_at)}</td>
          <td>${this._number(row.readiness_pct)}%</td><td>${this._number(row.resume_score)}</td><td>${this._number(row.aptitude_accuracy)}%</td>
          <td>${this._number(row.experiences_shared)}</td><td>${this._number(row.problems_solved)}</td>
          <td><button class="btn btn-ghost btn-sm" data-role-id="${this._escape(row.id)}" data-role="${this._escape(row.role || 'student')}">${row.role === 'admin' ? 'Revoke Admin' : 'Promote to Admin'}</button></td>
        </tr>`).join('') : '<tr><td colspan="9" class="text-dim text-center">No students match this search.</td></tr>'}</tbody></table></div>
      </section>

      <section class="card mb-3">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div><div class="card-title">Job Applications</div><div class="card-sub">Export and share with the hiring company for shortlisting.</div></div>
          <button class="btn btn-outline btn-sm" id="exportApplicationsBtn"><i class="bi bi-download"></i> Export CSV</button>
        </div>
        <div class="filter-bar mt-2"><select id="applicationJobFilter"><option value="all">All Job Titles</option>${jobTitles.map(title => `<option value="${this._escape(title)}" ${this.state.applicationJob === title ? 'selected' : ''}>${this._escape(title)}</option>`).join('')}</select></div>
        <div class="admin-table-wrap mt-2"><table class="data-table"><thead><tr><th>Student Name</th><th>Email</th><th>Job Title</th><th>Location Type</th><th><button class="admin-sort" data-sort-applications="match_score">Match Score</button></th><th><button class="admin-sort" data-sort-applications="applied_at">Applied At</button></th></tr></thead>
          <tbody>${sortedApplications.length ? sortedApplications.map(row => `<tr><td>${this._escape(row.profile.name || '-')}</td><td>${this._escape(row.profile.email || '-')}</td><td>${this._escape(row.job_title || '-')}</td><td>${this._escape(row.location_type || '-')}</td><td>${this._number(row.match_score)}%</td><td>${this._relativeTime(row.applied_at || row.created_at)}</td></tr>`).join('') : '<tr><td colspan="6" class="text-dim text-center">No job applications yet.</td></tr>'}</tbody>
        </table></div>
      </section>

      <section class="card">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap"><div><div class="card-title">Interview Experiences</div><div class="card-sub">Moderate community submissions.</div></div></div>
        <div class="admin-table-wrap mt-2"><table class="data-table"><thead><tr><th>Company</th><th>Role</th><th>Difficulty</th><th>Author</th><th>Submitted</th><th>Action</th></tr></thead><tbody>
          ${this.state.experiences.length ? this.state.experiences.map(row => `<tr><td>${this._escape(row.company_name || '-')}</td><td>${this._escape(row.role_applied || '-')}</td><td><span class="chip ${row.difficulty === 'Easy' ? 'green' : row.difficulty === 'Medium' ? 'orange' : 'red'}">${this._escape(row.difficulty || '-')}</span></td><td>${this._escape(row.author_name || '-')}</td><td>${this._relativeTime(row.created_at)}</td><td><button class="btn btn-ghost btn-sm" data-delete-experience="${this._escape(row.id)}" title="Delete experience"><i class="bi bi-trash"></i> Delete</button></td></tr>`).join('') : '<tr><td colspan="6" class="text-dim text-center">No interview experiences yet.</td></tr>'}
        </tbody></table></div>
      </section>
    `;
    this._bindDashboardControls(sortedStudents, sortedApplications);
  },

  _bindDashboardControls(students, applications) {
    document.getElementById('studentSearch').addEventListener('input', event => { this.state.studentSearch = event.target.value; this._renderDashboard(); });
    document.getElementById('applicationJobFilter').addEventListener('change', event => { this.state.applicationJob = event.target.value; this._renderDashboard(); });
    document.querySelectorAll('[data-sort-students]').forEach(button => button.addEventListener('click', () => this._toggleSort('studentSort', button.dataset.sortStudents)));
    document.querySelectorAll('[data-sort-applications]').forEach(button => button.addEventListener('click', () => this._toggleSort('applicationSort', button.dataset.sortApplications)));
    document.querySelectorAll('[data-role-id]').forEach(button => button.addEventListener('click', () => this._changeRole(button.dataset.roleId, button.dataset.role)));
    document.querySelectorAll('[data-delete-experience]').forEach(button => button.addEventListener('click', () => this._deleteExperience(button.dataset.deleteExperience)));
    document.getElementById('exportStudentsBtn').addEventListener('click', () => this._download('students.csv', [['Name', 'Email', 'Signed Up', 'Readiness %', 'Resume Score', 'Aptitude Accuracy', 'Experiences Shared', 'Problems Solved'], ...students.map(row => [row.name || '', row.email || '', this._relativeTime(row.created_at), this._number(row.readiness_pct), this._number(row.resume_score), this._number(row.aptitude_accuracy), this._number(row.experiences_shared), this._number(row.problems_solved)])]));
    document.getElementById('exportApplicationsBtn').addEventListener('click', () => this._download('job-applications.csv', [['Student Name', 'Email', 'Job Title', 'Location Type', 'Match Score', 'Applied At'], ...applications.map(row => [row.profile.name || '', row.profile.email || '', row.job_title || '', row.location_type || '', this._number(row.match_score), this._relativeTime(row.applied_at || row.created_at)])]));
  },

  async _changeRole(id, currentRole) {
    const nextRole = currentRole === 'admin' ? 'student' : 'admin';
    if (!confirm(`${nextRole === 'admin' ? 'Promote this user to admin' : 'Revoke admin access from this user'}?`)) return;
    const { error } = await supabaseClient.from('profiles').update({ role: nextRole }).eq('id', id);
    if (error) { alert(error.message || 'Could not update this role.'); return; }
    const profile = this.state.profiles.find(row => row.id === id);
    if (profile) profile.role = nextRole;
    const student = this.state.students.find(row => row.id === id);
    if (student) student.role = nextRole;
    const localUser = this.state.profiles.find(row => row.id === id);
    if (localUser && localUser.email) {
      const storedUser = DB.getUser(localUser.email);
      if (storedUser) DB.saveUser(localUser.email, { ...storedUser, role: nextRole });
    }
    this._renderDashboard();
  },

  async _deleteExperience(id) {
    if (!confirm('Delete this interview experience?')) return;
    const { error } = await supabaseClient.from('interview_experiences').delete().eq('id', id);
    if (error) { alert(error.message || 'Could not delete this experience.'); return; }
    const deleted = this.state.experiences.find(row => String(row.id) === String(id));
    this.state.experiences = this.state.experiences.filter(row => String(row.id) !== String(id));
    const student = this.state.students.find(row => deleted && String(row.id) === String(deleted.user_id));
    if (student) student.experiences_shared = Math.max(0, student.experiences_shared - 1);
    this._renderDashboard();
  },

  _toggleSort(stateKey, key) {
    const sort = this.state[stateKey];
    sort.direction = sort.key === key && sort.direction === 'desc' ? 'asc' : sort.key === key ? 'desc' : 'desc';
    sort.key = key;
    this._renderDashboard();
  },

  _sortRows(rows, sort) {
    return [...rows].sort((left, right) => {
      let a = left[sort.key]; let b = right[sort.key];
      if (sort.key === 'created_at' || sort.key === 'applied_at') { a = new Date(a || 0).getTime(); b = new Date(b || 0).getTime(); }
      else if (typeof a === 'string' || typeof b === 'string') { a = String(a || '').toLowerCase(); b = String(b || '').toLowerCase(); }
      else { a = this._number(a); b = this._number(b); }
      const result = a < b ? -1 : a > b ? 1 : 0;
      return sort.direction === 'asc' ? result : -result;
    });
  },

  _sortHeader(label, key, sort) {
    const marker = sort.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';
    return `<th><button class="admin-sort" data-sort-students="${key}">${label}${marker}</button></th>`;
  },

  _statTile(label, value, icon) {
    return `<div class="card text-center"><div class="card-stat text-accent"><i class="bi ${icon}" style="font-size:18px;margin-right:5px"></i>${value}</div><div class="card-stat-label">${label}</div></div>`;
  },

  _number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; },

  _relativeTime(value) {
    if (!value) return '-';
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24); if (days < 30) return `${days}d ago`;
    return new Date(value).toLocaleDateString();
  },

  _setError(message) {
    this.loginError.textContent = message;
    this.loginError.classList.toggle('hidden', !message);
  },

  _escape(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  },

  _download(filename, rows) {
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
