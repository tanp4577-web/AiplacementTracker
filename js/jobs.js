const Jobs = {
  state: { scope: 'national', location: null, locationLabel: 'Location not set' },

  render(container) {
    this.container = container;
    this._renderHub();
  },

  _renderHub() {
    const regionalJobs = JOB_OPENINGS.filter(job => {
      if (job.scope !== 'regional') return false;
      if (!this.state.location) return true;
      return this._distanceKm(this.state.location, job) <= 600;
    });
    const jobs = this.state.scope === 'national' ? JOB_OPENINGS : regionalJobs;
    this.container.innerHTML = `
      <div class="card mb-2">
        <div class="flex-between" style="gap:16px;flex-wrap:wrap">
          <div>
            <div class="card-title"><i class="bi bi-briefcase text-accent" style="margin-right:4px"></i>Hiring Hub</div>
            <div class="card-sub">${jobs.length} roles across engineering, data, product, design, and operations. Check your resume fit and practice target gaps.</div>
          </div>
          <div class="flex gap-1" role="group" aria-label="Opportunity scope">
            <button class="btn ${this.state.scope === 'national' ? 'btn-primary' : 'btn-ghost'}" id="nationalJobsBtn">National</button>
            <button class="btn ${this.state.scope === 'regional' ? 'btn-primary' : 'btn-ghost'}" id="regionalJobsBtn">Regional</button>
          </div>
        </div>
        <div class="flex-between mt-2" style="gap:12px;flex-wrap:wrap">
          <span class="chip ${this.state.location ? 'green' : 'orange'}"><i class="bi bi-geo-alt-fill"></i> ${this.state.location ? `Near ${this.state.locationLabel}` : 'Regional location not set'}</span>
          <button class="btn btn-ghost btn-sm" id="locateJobsBtn"><i class="bi bi-crosshair" style="margin-right:4px"></i>Use my location</button>
        </div>
      </div>
      <div class="grid grid-2" id="jobsGrid">
        ${jobs.map(job => this._jobCard(job)).join('') || '<div class="empty-state"><h3>No nearby demo roles found</h3><p>Try National Opportunities or update your location.</p></div>'}
      </div>
      <div class="text-dim mt-2" style="font-size:12px">Listings are demo opportunities for practicing targeted applications.</div>
    `;

    document.getElementById('nationalJobsBtn').addEventListener('click', () => {
      this.state.scope = 'national';
      this._renderHub();
    });
    document.getElementById('regionalJobsBtn').addEventListener('click', () => {
      this.state.scope = 'regional';
      this._renderHub();
    });
    document.getElementById('locateJobsBtn').addEventListener('click', () => this._locate());
    this.container.querySelectorAll('[data-job-id]').forEach(card => {
      card.querySelector('[data-apply]')?.addEventListener('click', () => this._openApplication(card.dataset.jobId));
      card.querySelector('[data-details]')?.addEventListener('click', () => this._openDetails(card.dataset.jobId));
    });
  },

  _distanceKm(first, second) {
    const radians = value => value * Math.PI / 180;
    const latitudeDelta = radians(second.latitude - first.latitude);
    const longitudeDelta = radians(second.longitude - first.longitude);
    const latitudeA = radians(first.latitude);
    const latitudeB = radians(second.latitude);
    const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  _jobCard(job) {
    return `
      <article class="card hoverable" data-job-id="${job.id}">
        <div class="flex-between" style="gap:10px">
          <div>
            <div class="card-title" style="font-size:19px">${job.title}</div>
            <div class="card-sub">${job.company} · ${job.location}</div>
          </div>
          <span class="chip ${job.mode === 'Remote' ? 'green' : 'blue'}">${job.mode}</span>
        </div>
        <p class="text-dim mt-1" style="font-size:13px;line-height:1.55">${job.description}</p>
        <div class="flex gap-1 mt-1" style="flex-wrap:wrap">${job.skills.map(skill => `<span class="chip">${skill}</span>`).join('')}</div>
        <div class="flex gap-1 mt-2" style="flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-details><i class="bi bi-building"></i> Company details</button>
          <button class="btn btn-primary btn-sm" data-apply><i class="bi bi-file-earmark-person"></i> Analyze resume</button>
        </div>
      </article>
    `;
  },

  _detailsFor(job) {
    const title = job.title.toLowerCase();
    const packageRange = title.includes('machine learning') || title.includes('data engineer') ? '8-16 LPA'
      : title.includes('product') ? '7-13 LPA'
        : title.includes('security') || title.includes('devops') ? '6-12 LPA'
          : title.includes('analyst') || title.includes('ux') || title.includes('qa') ? '4.5-9 LPA'
            : '5-11 LPA';
    const rounds = title.includes('product') || title.includes('analyst')
      ? ['Online aptitude and case assessment', 'Product or business case discussion', 'Panel interview', 'People and culture discussion']
      : title.includes('qa') || title.includes('security') || title.includes('cloud')
        ? ['Online aptitude and technical assessment', 'Technical interview', 'Practical troubleshooting round', 'People and culture discussion']
        : ['Online aptitude and coding assessment', 'Technical interview', 'Role-specific deep dive', 'People and culture discussion'];
    return {
      packageRange,
      pptDate: '16 Sep 2026',
      testDate: '18 Sep 2026',
      deadline: '14 Sep 2026',
      openings: title.includes('engineer') || title.includes('developer') ? 'Multiple openings' : '2-5 openings',
      eligibility: 'Final-year students and graduates with 0-2 years of experience',
      rounds,
      benefits: ['Mentorship and structured onboarding', 'Learning budget and certification support', 'Performance-based growth reviews'],
      note: 'Dates and package are indicative demo details for placement preparation. Confirm the final schedule with the employer.'
    };
  },

  _openDetails(id) {
    const job = JOB_OPENINGS.find(item => item.id === id);
    if (!job) return;
    const details = this._detailsFor(job);
    const existing = document.getElementById('jobDetailsModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'jobDetailsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal job-details-modal" role="dialog" aria-modal="true" aria-labelledby="jobDetailsTitle">
        <div class="modal-head">
          <div class="job-details-heading">
            <div class="job-company-mark"><i class="bi bi-building"></i></div>
            <div>
              <h2 id="jobDetailsTitle">${job.title}</h2>
              <p class="text-dim">${job.company} · ${job.location} · ${job.mode}</p>
            </div>
          </div>
          <button class="modal-close" id="closeJobDetails" aria-label="Close company details"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <p class="job-company-description">${job.description}</p>
          <div class="job-detail-stats">
            <div><span>Package</span><strong>${details.packageRange}</strong></div>
            <div><span>Openings</span><strong>${details.openings}</strong></div>
            <div><span>Apply by</span><strong>${details.deadline}</strong></div>
            <div><span>Work mode</span><strong>${job.mode}</strong></div>
          </div>
          <div class="job-detail-grid">
            <section>
              <h3>Hiring timeline</h3>
              <dl class="job-timeline">
                <div><dt>PPT / briefing</dt><dd>${details.pptDate}</dd></div>
                <div><dt>Online test</dt><dd>${details.testDate}</dd></div>
                <div><dt>Interview window</dt><dd>22-25 Sep 2026</dd></div>
              </dl>
            </section>
            <section>
              <h3>Eligibility</h3>
              <p class="text-dim">${details.eligibility}</p>
              <h3 class="mt-2">Required skills</h3>
              <div class="flex gap-1" style="flex-wrap:wrap">${job.skills.map(skill => `<span class="chip blue">${skill}</span>`).join('')}</div>
            </section>
          </div>
          <section class="job-rounds mt-2">
            <h3>Selection rounds</h3>
            <ol>${details.rounds.map(round => `<li>${round}</li>`).join('')}</ol>
          </section>
          <section class="job-rounds mt-2">
            <h3>Benefits and growth</h3>
            <ul>${details.benefits.map(benefit => `<li>${benefit}</li>`).join('')}</ul>
          </section>
          <p class="job-details-note"><i class="bi bi-info-circle"></i> ${details.note}</p>
          <div class="flex-between mt-2" style="gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost" id="closeJobDetailsBottom">Close</button>
            <button class="btn btn-primary" id="detailsAnalyzeBtn"><i class="bi bi-file-earmark-person"></i> Analyze my resume for this role</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    const close = () => modal.remove();
    modal.querySelector('#closeJobDetails').addEventListener('click', close);
    modal.querySelector('#closeJobDetailsBottom').addEventListener('click', close);
    modal.querySelector('#detailsAnalyzeBtn').addEventListener('click', () => {
      close();
      this._openApplication(job.id);
    });
  },

  _locate() {
    if (!navigator.geolocation) {
      App.showToast('Geolocation is not supported by this browser.', 'error');
      return;
    }
    App.showToast('Requesting your location...', 'info');
    navigator.geolocation.getCurrentPosition(position => {
      this.state.location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      this.state.locationLabel = `${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`;
      this._renderHub();
      App.showToast('Regional opportunities are ready.', 'success');
    }, () => App.showToast('Location permission was unavailable. You can still browse national roles.', 'error'), { timeout: 10000 });
  },

  _openApplication(id) {
    const job = JOB_OPENINGS.find(item => item.id === id);
    if (!job) return;
    const existing = document.getElementById('jobApplyModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'jobApplyModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:620px">
        <div class="modal-head">
          <h2>${job.title}</h2>
          <p class="text-dim">${job.company} · ${job.location}</p>
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Resume analysis failed.');
      status.textContent = 'Analysis complete.';
      result.innerHTML = this._resultMarkup(data);
      result.querySelector('[data-start-interview]')?.addEventListener('click', () => {
        Interview.state.customQuestions = data.recommendedInterviewQuestions || [];
        modal.remove();
        window.location.hash = '#interview';
      });
    } catch (error) {
      status.textContent = error.message || 'Could not analyze this resume.';
    } finally {
      modal.querySelector('#analyzeJobBtn').disabled = false;
    }
  },

  _resultMarkup(data) {
    const score = Math.max(0, Math.min(100, Number(data.matchScore) || 0));
    const escape = value => String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
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
        <button class="btn btn-primary btn-sm mt-1" data-start-interview>Start targeted interview</button>
      </div>
    `;
  }
};
