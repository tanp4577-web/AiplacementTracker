/* ============ Hiring Hub — REAL live job listings ============
   Every job shown here comes from /api/jobs, which fetches RemoteOK's
   public, key-free JSON API — genuine, currently-open remote vacancies
   with a real "Apply" link to the original posting. No AI-generated or
   fabricated job details (fake dates, invented interview rounds, etc.)
   appear anywhere in this file.

   Attribution: RemoteOK's API Terms of Service require every site using
   this data to link back to remoteok.com and credit RemoteOK as the
   source. That attribution link below is required — do not remove it.
   ================================================================== */
const Jobs = {
  state: {
    keyword: 'developer',
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
    this.state.loading = true;
    this.state.error = null;
    if (!append) this.state.page = 1;
    this._renderHub();

    const params = new URLSearchParams({
      q: this.state.keyword || '',
      page: String(this.state.page),
      results_per_page: '20'
    });

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
            <div class="card-sub">${loading ? 'Loading live listings…' : `${count} real, currently-open remote ${count === 1 ? 'role' : 'roles'} — live from the job market.`}</div>
          </div>
        </div>
        <div class="flex gap-1 mt-2" style="flex-wrap:wrap">
          <input type="search" id="jobKeywordInput" placeholder="Job title or skill (e.g. frontend developer, python)" value="${this._escape(this.state.keyword)}" style="flex:1;min-width:220px" />
          <button class="btn btn-primary" id="jobSearchBtn"><i class="bi bi-search" style="margin-right:4px"></i>Search</button>
        </div>
        <div class="text-dim mt-2" style="font-size:11px">Live remote job data via <a href="https://remoteok.com" target="_blank" rel="noopener">Remote OK</a> — real listings, real companies, real apply links.</div>
      </div>

      ${error ? `<div class="empty-state"><h3>Couldn't load listings</h3><p>${this._escape(error)}</p></div>` : ''}
      ${!error && loading && jobs.length === 0 ? `<div class="empty-state"><h3>Loading live listings…</h3><p>Fetching real, currently-open roles.</p></div>` : ''}
      ${!error && !loading && jobs.length === 0 ? `<div class="empty-state"><h3>No roles found</h3><p>Try a different keyword.</p></div>` : ''}

      <div class="grid grid-2" id="jobsGrid">
        ${jobs.map(job => this._jobCard(job)).join('')}
      </div>
      ${!error && jobs.length > 0 && jobs.length < count ? `<div class="flex-between mt-2"><button class="btn btn-ghost" id="loadMoreJobsBtn" ${loading ? 'disabled' : ''}>${loading ? 'Loading…' : 'Load more'}</button></div>` : ''}
      <div class="text-dim mt-2" style="font-size:12px">These are real remote positions sourced live from Remote OK. Salary figures, when shown, are in USD as published by the employer.</div>
    `;

    document.getElementById('jobSearchBtn').addEventListener('click', () => this._onSearchClick());
    document.getElementById('jobKeywordInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._onSearchClick();
    });
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
    const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
    const range = job.salaryMin && job.salaryMax && job.salaryMin !== job.salaryMax
      ? `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`
      : fmt(job.salaryMin || job.salaryMax);
    return range + ' USD / year';
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
        </div>
        ${salary ? `<div class="chip green mt-1" style="display:inline-block">${salary}</div>` : ''}
        <div class="flex gap-1 mt-1" style="flex-wrap:wrap">${job.tags.slice(0, 5).map(t => `<span class="chip blue">${this._escape(t)}</span>`).join('')}</div>
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
            <div><span>Tags</span><strong>${this._escape(job.tags.slice(0, 4).join(', ') || 'Not specified')}</strong></div>
            <div><span>Salary</span><strong>${salary ? this._escape(salary) : 'Not disclosed'}</strong></div>
            <div><span>Posted</span><strong>${job.created ? new Date(job.created).toLocaleDateString() : 'Unknown'}</strong></div>
            <div><span>Source</span><strong><a href="${job.sourceUrl}" target="_blank" rel="noopener">Remote OK</a></strong></div>
          </div>
          <p class="job-company-description mt-2" style="white-space:pre-line">${this._escape(job.description)}</p>
          <div class="text-dim mt-1" style="font-size:12px">This is a real, live listing sourced from Remote OK. Full details and the original application form are on the linked original posting.</div>
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
          locationType: 'remote',
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
      apps.unshift({ id: crypto.randomUUID(), user_id: user.id, job_title: job.title, location_type: 'remote', match_score: matchScore, applied_at: new Date().toISOString(), created_at: new Date().toISOString() });
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
