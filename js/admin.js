/* ============ Admin Dashboard Module ============ */
const Admin = {
  async render(container) {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
      window.location.hash = '#dashboard';
      return;
    }

    container.innerHTML = '<div class="loading-screen"><div class="spinner"></div><p>Loading admin data...</p></div>';
    const [{ data: profiles, error: profilesError }, { data: progress, error: progressError }, { data: applications, error: applicationsError }] = await Promise.all([
      supabaseClient.from('profiles').select('id,name,email,created_at').order('created_at', { ascending: false }),
      supabaseClient.from('progress').select('user_id,readiness_pct,resume_score,aptitude_accuracy,mock_interviews'),
      supabaseClient.from('job_applications').select('id,user_id,job_title,match_score,location_type,applied_at,created_at').order('applied_at', { ascending: false })
    ]);

    if (profilesError || progressError || applicationsError) {
      const message = (profilesError || progressError || applicationsError).message || 'Could not load admin data.';
      container.innerHTML = `<div class="card"><div class="text-danger">${this._escape(message)}</div></div>`;
      return;
    }

    const profileRows = profiles || [];
    const progressByUser = new Map((progress || []).map(row => [row.user_id, row]));
    const profileByUser = new Map(profileRows.map(row => [row.id, row]));
    const studentRows = profileRows.map(profile => ({ ...profile, ...(progressByUser.get(profile.id) || {}) }));
    const applicationRows = (applications || []).map(application => ({
      ...application,
      profile: profileByUser.get(application.user_id) || {}
    }));

    container.innerHTML = `
      <section class="card mb-3">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div>
            <div class="card-title">Registered Students</div>
            <div class="card-sub">All registered student accounts and placement progress.</div>
          </div>
          <button class="btn btn-outline btn-sm" id="exportStudentsBtn"><i class="bi bi-download"></i> Export</button>
        </div>
        <div class="mt-2" style="overflow:auto">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Signed up</th><th>Readiness %</th><th>Resume Score</th><th>Aptitude Accuracy</th><th>Mock Interviews</th></tr></thead>
            <tbody>${studentRows.length ? studentRows.map(row => `<tr>
              <td>${this._escape(row.name || '-')}</td>
              <td>${this._escape(row.email || '-')}</td>
              <td>${this._formatDate(row.created_at)}</td>
              <td>${this._number(row.readiness_pct)}%</td>
              <td>${this._number(row.resume_score)}</td>
              <td>${this._number(row.aptitude_accuracy)}%</td>
              <td>${this._number(row.mock_interviews)}</td>
            </tr>`).join('') : '<tr><td colspan="7" class="text-dim text-center">No registered students yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="flex-between items-center" style="gap:12px;flex-wrap:wrap">
          <div>
            <div class="card-title">Job Applications</div>
            <div class="card-sub">Share this list with the hiring company for shortlisting.</div>
          </div>
          <button class="btn btn-outline btn-sm" id="exportApplicationsBtn"><i class="bi bi-download"></i> Export</button>
        </div>
        <div class="mt-2" style="overflow:auto">
          <table class="data-table">
            <thead><tr><th>Student</th><th>Email</th><th>Job Title</th><th>Match Score</th><th>Applied At</th></tr></thead>
            <tbody>${applicationRows.length ? applicationRows.map(row => `<tr>
              <td>${this._escape(row.profile.name || '-')}</td>
              <td>${this._escape(row.profile.email || '-')}</td>
              <td>${this._escape(row.job_title || '-')}</td>
              <td>${this._number(row.match_score)}%</td>
              <td>${this._formatDate(row.applied_at || row.created_at)}</td>
            </tr>`).join('') : '<tr><td colspan="5" class="text-dim text-center">No job applications yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById('exportStudentsBtn').addEventListener('click', () => this._download('registered-students.csv', [
      ['Name', 'Email', 'Signed up', 'Readiness %', 'Resume Score', 'Aptitude Accuracy', 'Mock Interviews'],
      ...studentRows.map(row => [row.name || '', row.email || '', this._formatDate(row.created_at), this._number(row.readiness_pct), this._number(row.resume_score), this._number(row.aptitude_accuracy), this._number(row.mock_interviews)])
    ]));
    document.getElementById('exportApplicationsBtn').addEventListener('click', () => this._download('job-applications.csv', [
      ['Student', 'Email', 'Job Title', 'Match Score', 'Applied At'],
      ...applicationRows.map(row => [row.profile.name || '', row.profile.email || '', row.job_title || '', this._number(row.match_score), this._formatDate(row.applied_at || row.created_at)])
    ]));
  },

  _number(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  },

  _formatDate(value) {
    return value ? new Date(value).toLocaleString() : '-';
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
