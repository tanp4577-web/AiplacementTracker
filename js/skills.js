/* ============ Skill Gap Analysis Module ============ */
const Skills = {
  state: {
    targetRole: null,
    profileSkills: null
  },

  render(container) {
    this.container = container;
    this.state.targetRole = null;
    this.state.profileSkills = null;
    this._renderSetup();
  },

  _renderSetup() {
    const email = Auth.getEmail();
    const prog = email ? DB.getProgress(email) : null;
    const resumeText = DB.getGlobal('lastResumeText') || '';

    // Extract user's known skills from resume text (if any)
    this.state.profileSkills = this._extractSkills(resumeText);

    this.container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Skill Gap Analysis</div>
          <div class="card-sub">Compare your profile against a target role to find gaps</div>

          <label class="field-label" for="roleSelect">Target Role</label>
          <select id="roleSelect">
            <option value="">-- Select a target role --</option>
            ${ROLE_NAMES.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>

          <div class="divider"></div>
          <div class="card-title mb-1" style="font-size:13px">Your Detected Skills</div>
          <div class="text-dim" style="font-size:12.5px;margin-bottom:10px">
            ${this.state.profileSkills.length
              ? 'Extracted from your analyzed resume. Choose a role above to see gaps.'
              : 'No skills detected yet. Analyze your resume in the Resume Analyzer first, or select a role to see what is required.'}
          </div>
          <div class="tag-row">
            ${this.state.profileSkills.length
              ? this.state.profileSkills.map(s => `<span class="chip green">${s}</span>`).join('')
              : '<span class="chip">No skills yet</span>'}
          </div>
        </div>
        <div class="card">
          <div class="card-title">Role Explorer</div>
          <div class="card-sub">Pick a role to see its required skill tree</div>
          ${ROLE_NAMES.map(r => `
            <div class="section-check hoverable" style="cursor:pointer" data-role="${r}">
              <div class="check-icon" style="background:rgba(230,162,60,0.14);color:var(--accent)">${ICONS.role(ROLE_SKILLS[r].icon)}</div>
              <div>
                <div style="font-weight:600;font-size:13.5px">${r}</div>
                <div class="text-dim" style="font-size:12px">${ROLE_SKILLS[r].skills.length} core skills</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('roleSelect').addEventListener('change', (e) => {
      if (e.target.value) this._analyze(e.target.value);
    });

    document.querySelectorAll('[data-role]').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('roleSelect').value = el.dataset.role;
        this._analyze(el.dataset.role);
      });
    });
  },

  _extractSkills(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];
    for (const [skill, keywords] of Object.entries(SKILL_POOL)) {
      if (keywords.some(k => lower.includes(k))) {
        found.push(skill.replace(/\//g, ' / ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    }
    return found;
  },

  _analyze(role) {
    this.state.targetRole = role;
    const roleData = ROLE_SKILLS[role];
    const poolKeys = ROLE_POOL_KEYS[role] || [];
    const required = roleData.skills;
    const profileLower = (this.state.profileSkills || []).map(s => s.toLowerCase());

    // Compute match level for each required skill based on profile
    const rows = required.map(skill => {
      const normalized = skill.name.toLowerCase();
      let match = false;
      for (const key of poolKeys) {
        const synonyms = SKILL_POOL[key] || [key];
        if (synonyms.some(k => normalized.includes(k) || profileLower.some(p => p.includes(k)))) {
          match = true;
          break;
        }
      }
      // Also direct text check
      if (!match) {
        match = profileLower.some(p => normalized.includes(p) || p.includes(normalized.split(' ')[0]));
      }
      return { name: skill.name, required: skill.level, match };
    });

    const matchedCount = rows.filter(r => r.match).length;
    const matchPct = rows.length ? Math.round((matchedCount / rows.length) * 100) : 0;
    const gaps = rows.filter(r => !r.match);
    const strengths = rows.filter(r => r.match);

    // Save profile skills for dashboard
    const email = Auth.getEmail();
    if (email) {
      const prog = DB.getProgress(email);
      const skills = { ...(prog.skills || {}), targetRole: role, matchPct, lastAnalyzed: Date.now() };
      DB.saveProgress(email, { skills });
      App.refreshAll();
    }

    // Render analysis
    const allHtml = rows.map(r => {
      const pct = r.match ? Math.min(r.required, 100) : Math.round(r.required * 0.2);
      return `
        <div class="skill-bar-row">
          <div class="skill-bar-label">
            <b>${r.name}</b>
            <span>${r.match ? r.required + '% (matched)' : 'Gap - start learning'}</span>
          </div>
          <div class="progress">
            <div class="progress-fill ${r.match ? 'green' : 'orange'}" style="width:${r.match ? r.required : 15}%"></div>
          </div>
        </div>
      `;
    }).join('');

    // Build learning roadmap from gaps
    const roadmap = gaps.length ? gaps.slice(0, 5).map((g, i) => ({
      title: `Learn ${g.name}`,
      desc: `Target proficiency: ${g.required}%. Recommended: online course + hands-on project + daily practice.`
    })) : [{ title: 'No critical gaps', desc: 'You match all core skills for this role. Consider advanced topics or certifications.' }];

    // Recommend resources
    const resources = roleData.resources || [];

    this.container.innerHTML = `
      <div class="mb-2 flex-between">
        <button class="btn btn-ghost btn-sm" id="backBtn"><- Change Role</button>
        <div class="flex gap-1 items-center">
          <span class="chip blue">${role}</span>
          <span class="chip ${matchPct >= 70 ? 'green' : matchPct >= 40 ? 'orange' : 'red'}">${matchPct}% match</span>
        </div>
      </div>
      <div class="grid grid-3">
        <div class="card text-center">
          <div class="card-stat">${matchedCount}/${rows.length}</div>
          <div class="card-stat-label">Skills Matched</div>
        </div>
        <div class="card text-center">
          <div class="card-stat text-warning">${gaps.length}</div>
          <div class="card-stat-label">Skill Gaps</div>
        </div>
        <div class="card text-center">
          <div class="card-stat ${matchPct >= 70 ? 'text-success' : ''}">${matchPct}%</div>
          <div class="card-stat-label">Overall Match</div>
        </div>
      </div>
      <div class="card mt-2">
        <div class="card-title">Skill-by-Skill Analysis</div>
        <div class="card-sub">Green = matched, Orange = gap</div>
        ${allHtml}
      </div>
      <div class="grid grid-2 mt-2">
        <div class="card">
          <div class="card-title">Learning Roadmap</div>
          <div class="card-sub">Prioritized next steps for ${role}</div>
          ${roadmap.map((r, i) => `
            <div class="roadmap-item">
              <div class="roadmap-step">${i + 1}</div>
              <div class="roadmap-body">
                <div class="roadmap-title">${r.title}</div>
                <div class="roadmap-desc">${r.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="card">
          <div class="card-title">Recommended Resources</div>
          <div class="card-sub">Curated learning material</div>
          ${resources.map(r => `
            <div class="rec-item">
              <div class="rec-icon">${ICONS.role(ROLE_SKILLS[role].icon)}</div>
              <div class="rec-text">
                <a href="${r.url}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none;font-weight:600">${r.title}</a>
                <div class="text-dim" style="font-size:12px;margin-top:2px">${r.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('backBtn').addEventListener('click', () => this.render(this.container));
  }
};
