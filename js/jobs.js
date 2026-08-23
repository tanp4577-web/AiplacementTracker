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
            <div class="card-sub">Find active student roles, check your resume fit, and practice target gaps.</div>
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
        <button class="btn btn-primary btn-sm mt-2" data-apply>Analyze resume</button>
      </article>
    `;
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
    return `
      <div class="card" style="background:var(--success-soft);border-color:var(--success)">
        <div class="flex-between"><div class="card-title">ATS Match Score</div><strong style="font-size:26px;color:var(--success)">${score}%</strong></div>
        <div class="progress mt-1"><div class="progress-fill green" style="width:${score}%"></div></div>
        <div class="card-sub mt-1">Matched skills: ${(data.matchedSkills || []).join(', ') || 'None identified'}</div>
        <div class="card-sub">Missing or weak skills: ${(data.missingSkills || []).join(', ') || 'None identified'}</div>
        <div class="card-title mt-2" style="font-size:15px">Recommended interview questions</div>
        <ol style="padding-left:20px;font-size:13px">${(data.recommendedInterviewQuestions || []).map(question => `<li>${question}</li>`).join('')}</ol>
        <button class="btn btn-primary btn-sm mt-1" data-start-interview>Start targeted interview</button>
      </div>
    `;
  }
};
