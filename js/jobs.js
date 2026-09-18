/* ============ Hiring Hub — REAL live job listings ============
   Replaces the old hardcoded JOB_OPENINGS array entirely. Every job shown
   here comes from /api/jobs (Adzuna's real job aggregation API) — genuine,
   currently-open vacancies with a real "Apply" link to the original posting.
   No AI-generated or fabricated job details (package ranges, PPT dates,
   interview rounds, etc.) are shown anywhere in this file.
   ================================================================== */
const Jobs = {
  state: {
    scope: 'national',
    keyword: 'software developer',
    location: null,
    locationLabel: 'Location not set',
    jobs: [],
    loading: false,
    error: null,
    page: 1,
    count: 0
  },

  render(container) {
    this.container = container;
    this._search();
  },

  async _search(append = false) {
    if (this.state.scope === 'regional' && !this.state.locationLabel) {
      this.state.jobs = [];
      this.state.loading = false;
      this.state.error = null;
      this._renderHub();
      return;
    }

    this.state.loading = true;
    this.state.error = null;
    if (!append) this.state.page = 1;
    this._renderHub();

    const params = new URLSearchParams({
      what: this.state.keyword || '',
      page: String(this.state.page),
      results_per_page: '20'
    });
    if (this.state.scope === 'regional' && this.state.location) {
      params.set('where', this.state.locationLabel);
      params.set('distance', '50');
    }

    try {
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load job listings.');
      this.state.jobs = append ? [...this.state.jobs, ...data.jobs] : data.jobs;
      this.state.count = data.count || this.state.jobs.length;
    } catch (err) {
      this.state.error = err.message || 'Could not load job listings.';
      if (!append) this.state.jobs = [];
    } finally {
      this.state.loading = false;
      this._renderHub();
    }
  },

  _renderHub() {
    const { jobs, loading, error, count } = this.state;
    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="flex-between" style="gap:16px;flex-wrap:wrap">
          <div>
            <div class="card-title"><i class="bi bi-briefcase text-accent" style="margin-right:4px"></i>Hiring Hub</div>
            <div class="card-sub">${loading ? 'Loading live listings…' : `${count} real, currently-open ${count === 1 ? 'role' : 'roles'} — live from the job market, updated on every search.`}</div>
          </div>
          <div class="flex gap-1" role="group" aria-label="Opportunity scope">
            <button class="btn ${this.state.scope === 'national' ? 'btn-primary' : 'btn-ghost'}" id="nationalJobsBtn">National</button>
            <button class="btn ${this.state.scope === 'regional' ? 'btn-primary' : 'btn-ghost'}" id="regionalJobsBtn">Regional</button>
          </div>
        </div>
        <div class="flex gap-1 mt-2" style="flex-wrap:wrap">
          <input type="search" id="jobKeywordInput" placeholder="Job title or keyword (e.g. frontend developer)" value="${this._escape(this.state.keyword)}" style="flex:1;min-width:220px" />
          <button class="btn btn-primary" id="jobSearchBtn"><i class="bi bi-search" style="margin-right:4px"></i>Search</button>
        </div>
        <div class="flex-between mt-2" style="gap:12px;flex-wrap:wrap">
          <span class="chip ${this.state.location ? 'green' : 'orange'}"><i class="bi bi-geo-alt-fill"></i> ${this.state.location ? `Near ${this._escape(this.state.locationLabel)}` : 'Regional location not set'}</span>
          <button class="btn btn-ghost btn-sm" id="locateJobsBtn"><i class="bi bi-crosshair" style="margin-right:4px"></i>Use my location</button>
        </div>
        <div class="text-dim mt-1" style="font-size:11px">Live job data via Adzuna's job aggregation API — real listings, real companies, real apply links.</div>
      </div>

      ${error ? `<div class="empty-state"><h3>Couldn't load listings</h3><p>${this._escape(error)}</p></div>` : ''}
      ${!error && loading && jobs.length === 0 ? `<div class="empty-state"><h3>Loading live listings…</h3><p>Fetching real, currently-open roles.</p></div>` : ''}
      ${!error && !loading && this.state.scope === 'regional' && !this.state.location ? `<div class="empty-state"><h3>Set your location</h3><p>Click "Use my location" to see roles near you.</p></div>` : ''}
      ${!error && !loading && jobs.length === 0 && (this.state.scope === 'national' || this.state.location) ? `<div class="empty-state"><h3>No roles found</h3><p>Try a different keyword${this.state.scope === 'regional' ? ' or switch to National' : ''}.</p></div>` : ''}

      <div class="grid grid-2" id="jobsGrid">
        ${jobs.map(job => this._jobCard(job)).join('')}
      </div>
      ${!error && jobs.length > 0 && jobs.length < count ? `<div class="flex-between mt-2"><button class="btn btn-ghost" id="loadMoreJobsBtn" ${loading ? 'disabled' : ''}>${loading ? 'Loading…' : 'Load more'}</button></div>` : ''}
      <div class="text-dim mt-2" style="font-size:12px">Listings and salary figures are sourced live from the job market and may include estimated salary ranges where the employer didn't publish one.</div>
    `;

    document.getElementById('nationalJobsBtn').addEventListener('click', () => {
      if (this.state.scope === 'national') return;
      this.state.scope = 'national';
      this._search();
    });
    document.getElementById('regionalJobsBtn').addEventListener('click', () => {
      if (this.state.scope === 'regional') return;
      this.state.scope = 'regional';
      this._search();
    });
    document.getElementById('jobSearchBtn').addEventListener('click', () => this._onSearchClick());
    document.getElementById('jobKeywordInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._onSearchClick();
    });
    document.getElementById('locateJobsBtn').addEventListener('click', () => this._locate());
    document.getElementById('loadMoreJobsBtn')?.addEventListener('click', () => {
      this.state.page += 1;
      this._search(true);
    });
    this.container.querySelectorAll('[data-job-id]').forEach(card => {
      card.querySelector('[data-apply]')?.addEventListener('click', () => this._openApplication(card.dataset.jobId));
      card.querySelector('[data-details]')?.addEventListener('click', () => this._openDetails(card.dataset.jobId));
      card.querySelector('[data-view-original]')?.addEventListener('click', () => {
        const job = this.state.jobs.find(j => j.id === card.dataset.jobId);
        if (job?.applyUrl) window.open(job.applyUrl, '_blank', 'noopener');
      });
    });
  },

  _onSearchClick() {
    const input = document.getElementById('jobKeywordInput');
    this.state.keyword = (input?.value || '').trim();
    this._search();
  },

  _escape(value) {
    return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  },

  _formatSalary(job) {
    if (!job.salaryMin && !job.salaryMax) return null;
    const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
    const range = job.salaryMin && job.salaryMax && job.salaryMin !== job.salaryMax
      ? `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`
      : fmt(job.salaryMin || job.salaryMax);
    return range + (job.salaryIsPredicted ? ' (estimated)' : '') + ' / year';
  },

  _jobCard(job) {
    const salary = this._formatSalary(job);
    const snippet = this._escape(job.description).slice(0, 220);
    return `
      <article class="card hoverable" data-job-id="${job.id}">
        <div class="flex-between" style="gap:10px">
          <div>
            <div class="card-title" style="font-size:19px">${this._escape(job.title)}</div>
            <div class="card-sub">${this._escape(job.company)} · ${this._escape(job.location)}</div>
          </div>
          ${job.contractTime ? `<span class="chip blue">${this._escape(job.contractTime.replace('_', '-'))}</span>` : ''}
        </div>
        ${salary ? `<div class="chip green mt-1" style="display:inline-block">${salary}</div>` : ''}
        <p class="text-dim mt-1" style="font-size:13px;line-height:1.55">${snippet}${job.description.length > 220 ? '…' : ''}</p>
        <div class="flex gap-1 mt-2" style="flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-details><i class="bi bi-building"></i> Details</button>
          ${job.applyUrl ? `<button class="btn btn-ghost btn-sm" data-view-original><i class="bi bi-box-arrow-up-right"></i> View original posting</button>` : ''}
          <button class="btn btn-primary btn-sm" data-apply><i class="bi bi-file-earmark-person"></i> Analyze resume fit</button>
        </div>
      </article>
    `;
  },

  _openDetails(id) {
    const job = this.state.jobs.find(item => item.id === id);
    if (!job) return;
    const existing = document.getElementById('jobDetailsModal');
    if (existing) existing.remove();
    const salary = this._formatSalary(job);
    const modal = document.createElement('div');
    modal.id = 'jobDetailsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal job-details-modal" role="dialog" aria-modal="true" aria-labelledby="jobDetailsTitle">
        <div class="modal-head">
          <div class="job-details-heading">
            <div class="job-company-mark"><i class="bi bi-building"></i></div>
            <div>
              <h2 id="jobDetailsTitle">${this._escape(job.title)}</h2>
              <p class="text-dim">${this._escape(job.company)} · ${this._escape(job.location)}</p>
            </div>
          </div>
          <button class="modal-close" id="closeJobDetails" aria-label="Close company details"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <div class="job-detail-stats">
            <div><span>Category</span><strong>${this._escape(job.category || 'Not specified')}</strong></div>
            <div><span>Contract</span><strong>${this._escape((job.contractType || job.contractTime || 'Not specified').replace('_', '-'))}</strong></div>
            <div><span>Salary</span><strong>${salary ? this._escape(salary) : 'Not disclosed'}</strong></div>
            <div><span>Posted</span><strong>${job.created ? new Date(job.created).toLocaleDateString() : 'Unknown'}</strong></div>
          </div>
          <p class="job-company-description mt-2">${this._escape(job.description)}</p>
          <div class="text-dim mt-1" style="font-size:12px">This is a real, live listing. Full details and the original application form are on the employer's or job board's own page.</div>
        </div>
        <div class="modal-foot flex-between">
          <button class="btn btn-ghost" id="closeJobDetailsBottom">Close</button>
          <div class="flex gap-1">
            ${job.applyUrl ? `<button class="btn btn-ghost" id="viewOriginalFromDetails"><i class="bi bi-box-arrow-up-right"></i> View original posting</button>` : ''}
            <button class="btn btn-primary" id="detailsAnalyzeBtn">Analyze resume fit</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    const close = () => modal.remove();
    modal.querySelector('#closeJobDetails').addEventListener('click', close);
    modal.querySelector('#closeJobDetailsBottom').addEventListener('click', close);
    modal.querySelector('#viewOriginalFromDetails')?.addEventListener('click', () => window.open(job.applyUrl, '_blank', 'noopener'));
    modal.querySelector('#detailsAnalyzeBtn').addEventListener('click', () => {
      close();
      this._openApplication(job.id);
    });
  },

  async _locate() {
    if (!navigator.geolocation) {
      App.showToast('Geolocation is not supported by this browser.', 'error');
      return;
    }
    App.showToast('Requesting your location...', 'info');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      this.state.location = { latitude, longitude };
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`);
        const data = await res.json();
        const address = data.address || {};
        this.state.locationLabel = address.city || address.town || address.county || address.state || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      } catch {
        this.state.locationLabel = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      }
      App.showToast(`Showing roles near ${this.state.locationLabel}.`, 'success');
      this._search();
    }, () => App.showToast('Location permission was unavailable. You can still browse national roles.', 'error'), { timeout: 10000 });
  },

  _openApplication(id) {
    const job = this.state.jobs.find(item => item.id === id);
    if (!job) return;
    const existing = document.getElementById('jobApplyModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'jobApplyModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:620px">
        <div class="modal-head">
          <h2>${this._escape(job.title)}</h2>
          <p class="text-dim">${this._escape(job.company)} · ${this._escape(job.location)}</p>
        </div>
        <div class="modal-body">
          <label class="field-label" for="jobResumeFile">Upload resume</label>
          <input type="file" id="jobResumeFile" accept=".pdf,.docx,.txt,.rtf" />
          <div id="jobApplyStatus" class="text-dim mt-1" style="font-size:13px">PDF, DOCX, TXT, and RTF are supported.</div>
          <div id="jobMatchResult" class="mt-2"></div>
          <div class="flex-between mt-2" style="gap:8px">
            <button class="btn btn-ghost" id="closeJobModal">Close</button>
            <button class="btn btn-primary" id="analyzeJobBtn">Analyze fit</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    modal.querySelector('#closeJobModal').addEventListener('click', () => modal.remove());
    modal.querySelector('#analyzeJobBtn').addEventListener('click', () => this._analyze(job, modal));
  },

  async _analyze(job, modal) {
    const file = modal.querySelector('#jobResumeFile').files[0];
    const status = modal.querySelector('#jobApplyStatus');
    const result = modal.querySelector('#jobMatchResult');
    if (!file) {
      status.textContent = 'Choose a resume first.';
      return;
    }
    status.textContent = 'Reading resume and comparing requirements...';
    modal.querySelector('#analyzeJobBtn').disabled = true;
    try {
      const resumeText = await ResumeParser.parseFile(file);
      if (!resumeText.trim()) throw new Error('No readable text was found in that file.');
      const response = await fetch('/api/job-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          locationType: this.state.scope,
          jobDescription: job.description,
          resumeText
        })
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('The server sent back an unexpected response. Please try again in a moment.');
      }
      if (!response.ok) throw new Error(data.error || 'Resume analysis failed.');
      this._logApplication(job, Number(data.matchScore) || 0);
      status.textContent = 'Analysis complete.';
      result.innerHTML = this._resultMarkup(data);
      result.querySelector('[data-start-interview]')?.addEventListener('click', () => {
        modal.remove();
        window.location.hash = '#interview';
      });
    } catch (error) {
      status.textContent = error.message || 'Could not analyze this resume.';
    } finally {
      modal.querySelector('#analyzeJobBtn').disabled = false;
    }
  },

  _logApplication(job, matchScore) {
    try {
      const user = Auth.getCurrentUser();
      if (!user || !user.id) return;
      const apps = DB.getGlobal('job_applications') || [];
      apps.unshift({ id: crypto.randomUUID(), user_id: user.id, job_title: job.title, location_type: this.state.scope, match_score: matchScore, applied_at: new Date().toISOString(), created_at: new Date().toISOString() });
      DB.setGlobal('job_applications', apps);
    } catch (error) {
      console.warn('Job application sync failed:', error);
    }
  },

  _resultMarkup(data) {
    const score = Math.max(0, Math.min(100, Number(data.matchScore) || 0));
    const escape = this._escape;
    const recommendations = (data.recommendations || []).map(item => `
      <li class="recommendation-row">
        <strong>${escape(item.action)}</strong>
        <span class="text-dim">${escape(item.resourceType)} · ${escape(item.outcome)}</span>
      </li>
    `).join('');
    return `
      <div class="card" style="background:var(--success-soft);border-color:var(--success)">
        <div class="flex-between"><div class="card-title">ATS Match Score</div><strong style="font-size:26px;color:var(--success)">${score}%</strong></div>
        <div class="progress mt-1"><div class="progress-fill green" style="width:${score}%"></div></div>
        <div class="card-sub mt-1">Matched skills: ${(data.matchedSkills || []).map(escape).join(', ') || 'None identified'}</div>
        <div class="card-sub">Missing or weak skills: ${(data.missingSkills || []).map(escape).join(', ') || 'None identified'}</div>
        ${data.skillGapSummary ? `<div class="explanation mt-1"><strong>Priority gap:</strong> ${escape(data.skillGapSummary)}</div>` : ''}
        ${recommendations ? `<div class="card-title mt-2" style="font-size:15px">Recommended next steps</div><ol class="recommendation-list">${recommendations}</ol>` : ''}
        <div class="card-title mt-2" style="font-size:15px">Recommended interview questions</div>
        <ol style="padding-left:20px;font-size:13px">${(data.recommendedInterviewQuestions || []).map(question => `<li>${escape(question)}</li>`).join('')}</ol>
        <button class="btn btn-primary btn-sm mt-1" data-start-interview>View Interview Experiences</button>
      </div>
    `;
  }
};
