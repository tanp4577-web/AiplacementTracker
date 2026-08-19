/* ============================================================================
   Skill Gap Analyzer  —  PlacementPrep
   Compares candidate resume skills vs target role profiles.
   Highlights missing skills, recommends learning paths, maps gaps to YouTube
   lectures, and calculates an overall Readiness % that persists to localStorage.
   ============================================================================ */
const Skills = {
  state: {
    targetRole: null,
    profileSkills: null,
    manualSkills: [],
    view: 'setup'           // 'setup' | 'analysis'
  },

  /* ─── Entry point ─── */
  render(container) {
    this.container = container;
    this.state.targetRole = null;
    this.state.view = 'setup';
    this._renderSetup();
  },

  /* ─── Setup / Role Picker ─── */
  _renderSetup() {
    this.state.view = 'setup';
    // Extract skills from last resume scan if available
    try {
      const resumeText = DB.getGlobal('lastResumeText') || '';
      this.state.profileSkills = this._extractSkills(resumeText);
    } catch {
      this.state.profileSkills = [];
    }

    // Also load any previously saved manual skills
    try {
      const saved = localStorage.getItem('prepportal_manual_skills');
      this.state.manualSkills = saved ? JSON.parse(saved) : [];
    } catch { this.state.manualSkills = []; }

    const allSkills = this._mergeSkills(this.state.profileSkills, this.state.manualSkills);

    this.container.innerHTML = `
      <!-- Banner -->
      <div class="card sg-banner mb-2">
        <div class="sg-banner-inner">
          <div class="sg-banner-icon">🎯</div>
          <div>
            <div class="card-title" style="font-size:20px">Skill Gap Analyzer</div>
            <div class="card-sub">Select a target role to discover exactly which skills you're missing and get a personalized learning roadmap.</div>
          </div>
          <div class="sg-readiness-pill" id="sgReadinessPill" style="display:none">
            <span id="sgReadinessPct">0%</span>
            <span style="font-size:11px;opacity:.7">Readiness</span>
          </div>
        </div>
      </div>

      <div class="grid grid-2" style="gap:20px">

        <!-- LEFT: Your Skills -->
        <div class="card">
          <div class="card-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Your Detected Skills
          </div>
          <div class="card-sub">
            ${allSkills.length
        ? `${allSkills.length} skills detected — from resume scan + manual additions.`
        : 'No skills detected yet. Analyze your resume first, or add skills manually below.'}
          </div>

          ${allSkills.length > 0 ? `
            <div class="tag-row" id="detectedSkillsRow">
              ${allSkills.map(s => `
                <span class="chip ${this.state.profileSkills.includes(s) ? 'green' : 'blue'} sg-skill-chip">
                  ${s}
                </span>`).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding:24px">
              <div class="es-icon" style="font-size:28px">📄</div>
              <p style="font-size:13px">Visit the <b>Resume Analyzer</b> tab to scan your resume, or add skills below.</p>
            </div>
          `}

          <div class="divider"></div>
          <div class="card-title" style="font-size:13px">Add Skills Manually</div>
          <div class="flex gap-1 mt-1">
            <input type="text" id="manualSkillInput" placeholder="e.g. React, Python, Docker..." style="flex:1" />
            <button class="btn btn-ghost btn-sm" id="addManualSkillBtn">+ Add</button>
          </div>
          <div class="tag-row mt-1" id="manualSkillsRow">
            ${this.state.manualSkills.map(s => `
              <span class="chip orange sg-manual-chip" data-skill="${s}">
                ${s}
                <button class="sg-remove-skill" data-skill="${s}" title="Remove">✕</button>
              </span>`).join('')}
          </div>
          ${allSkills.length === 0 ? '' : `
            <div class="divider"></div>
            <button class="btn btn-ghost btn-sm" id="clearSkillsBtn" style="color:var(--danger)">🗑 Clear manual skills</button>
          `}
        </div>

        <!-- RIGHT: Role Explorer -->
        <div class="card">
          <div class="card-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            Choose Target Role
          </div>
          <div class="card-sub">Click a role to instantly analyze your gap</div>

          <div class="sg-role-grid" id="sgRoleGrid">
            ${ROLE_NAMES.map(r => {
          const rd = ROLE_SKILLS[r];
          const match = this._computeMatchPct(allSkills, r);
          const color = match >= 70 ? 'var(--success)' : match >= 40 ? 'var(--warning)' : 'var(--danger)';
          return `
                <div class="sg-role-card hoverable" data-role="${r}" tabindex="0" role="button" aria-label="Analyze role ${r}">
                  <div class="sg-role-icon">${this._roleEmoji(r)}</div>
                  <div class="sg-role-info">
                    <div class="sg-role-name">${r}</div>
                    <div class="sg-role-sub">${rd ? rd.skills.length : 0} core skills</div>
                  </div>
                  <div class="sg-role-match" style="color:${color};background:${color}22;border-color:${color}55">
                    ${match}%
                  </div>
                </div>`;
        }).join('')}
          </div>
        </div>

      </div>
    `;

    // Role click
    document.querySelectorAll('[data-role]').forEach(el => {
      el.addEventListener('click', () => this._analyze(el.dataset.role));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this._analyze(el.dataset.role); });
    });

    // Manual skill add
    const addBtn = document.getElementById('addManualSkillBtn');
    const skillInput = document.getElementById('manualSkillInput');
    const doAdd = () => {
      const val = (skillInput.value || '').trim();
      if (!val) return;
      const cap = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!this.state.manualSkills.includes(cap)) {
        this.state.manualSkills.push(cap);
        try { localStorage.setItem('prepportal_manual_skills', JSON.stringify(this.state.manualSkills)); } catch { }
      }
      skillInput.value = '';
      this._renderSetup();
    };
    if (addBtn) addBtn.addEventListener('click', doAdd);
    if (skillInput) skillInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

    // Remove manual skill
    document.querySelectorAll('.sg-remove-skill').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const skill = btn.dataset.skill;
        this.state.manualSkills = this.state.manualSkills.filter(s => s !== skill);
        try { localStorage.setItem('prepportal_manual_skills', JSON.stringify(this.state.manualSkills)); } catch { }
        this._renderSetup();
      });
    });

    // Clear all manual
    const clearBtn = document.getElementById('clearSkillsBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.state.manualSkills = [];
        try { localStorage.removeItem('prepportal_manual_skills'); } catch { }
        this._renderSetup();
      });
    }
  },

  /* ─── Compute match % for role explorer cards ─── */
  _computeMatchPct(allSkills, role) {
    try {
      const roleData = ROLE_SKILLS[role];
      if (!roleData) return 0;
      const profileLower = allSkills.map(s => s.toLowerCase());
      const poolKeys = ROLE_POOL_KEYS[role] || [];
      let matched = 0;
      const required = roleData.skills || [];
      required.forEach(skill => {
        const normalized = skill.name.toLowerCase();
        let match = profileLower.some(p => p.includes(normalized) || normalized.includes(p.split(' ')[0]));
        if (!match) {
          for (const key of poolKeys) {
            const synonyms = SKILL_POOL[key] || [key];
            if (synonyms.some(k => profileLower.some(p => p.includes(k) || k.includes(p)))) {
              match = true; break;
            }
          }
        }
        if (match) matched++;
      });
      return required.length > 0 ? Math.round((matched / required.length) * 100) : 0;
    } catch { return 0; }
  },

  /* ─── Full Analysis View ─── */
  _analyze(role) {
    this.state.targetRole = role;
    this.state.view = 'analysis';

    try {
      const resumeText = DB.getGlobal('lastResumeText') || '';
      this.state.profileSkills = this._extractSkills(resumeText);
    } catch { this.state.profileSkills = []; }
    try {
      const saved = localStorage.getItem('prepportal_manual_skills');
      this.state.manualSkills = saved ? JSON.parse(saved) : [];
    } catch { this.state.manualSkills = []; }

    const allSkills = this._mergeSkills(this.state.profileSkills, this.state.manualSkills);
    const roleData = ROLE_SKILLS[role];
    const poolKeys = ROLE_POOL_KEYS[role] || [];

    if (!roleData) {
      this.container.innerHTML = `<div class="empty-state"><h3>Role data not found</h3><button class="btn btn-ghost btn-sm" id="sgBackBtn">← Back</button></div>`;
      document.getElementById('sgBackBtn').addEventListener('click', () => this._renderSetup());
      return;
    }

    const profileLower = allSkills.map(s => s.toLowerCase());
    const required = roleData.skills || [];

    // Match each skill
    const rows = required.map(skill => {
      const normalized = skill.name.toLowerCase();
      let match = false;
      // Direct name match
      if (profileLower.some(p => p.includes(normalized) || normalized.includes(p.split(' ')[0]))) match = true;
      // Pool synonym match
      if (!match) {
        for (const key of poolKeys) {
          const synonyms = SKILL_POOL[key] || [key];
          if (synonyms.some(k => normalized.includes(k) || profileLower.some(p => p.includes(k)))) {
            match = true; break;
          }
        }
      }
      return { name: skill.name, level: skill.level || 70, match };
    });

    const matchedCount = rows.filter(r => r.match).length;
    const matchPct = rows.length ? Math.round((matchedCount / rows.length) * 100) : 0;
    const gaps = rows.filter(r => !r.match);
    const strengths = rows.filter(r => r.match);

    // Map gaps to YouTube lectures
    const ytLinks = this._mapGapsToYoutube(gaps, role);

    // Build learning roadmap
    const roadmap = gaps.length > 0
      ? gaps.slice(0, 5).map((g, i) => ({
        step: i + 1,
        title: `Learn ${g.name}`,
        desc: `Target proficiency: ${g.level}%. Start with fundamentals, then build a hands-on project.`,
        ytLink: ytLinks[g.name.toLowerCase()] || null
      }))
      : [{ step: 1, title: 'No critical gaps!', desc: 'You match all core skills for this role. Consider advanced topics or certifications.', ytLink: null }];

    // Persist readiness to DB
    const readinessPct = matchPct;
    try {
      const email = (typeof Auth !== 'undefined' && Auth.getEmail) ? Auth.getEmail() : null;
      if (email) {
        const prog = DB.getProgress(email);
        const skills = { ...(prog.skills || {}), targetRole: role, matchPct, lastAnalyzed: Date.now() };
        // Update overall readiness
        const currentReadiness = prog.readiness || 0;
        const newReadiness = Math.round(Math.max(currentReadiness, matchPct * 0.3 + (currentReadiness * 0.7)));
        DB.saveProgress(email, { skills, readiness: newReadiness });
        if (typeof App !== 'undefined') App.refreshAll();
      }
    } catch { }

    const progressColor = matchPct >= 70 ? 'var(--success)' : matchPct >= 40 ? 'var(--warning)' : 'var(--danger)';
    const resources = roleData.resources || [];

    this.container.innerHTML = `
      <!-- Navigation breadcrumb -->
      <div class="flex-between mb-2" style="flex-wrap:wrap;gap:10px">
        <button class="btn btn-ghost btn-sm" id="sgBackBtn">← Change Role</button>
        <div class="flex gap-1" style="align-items:center;flex-wrap:wrap">
          <span class="chip blue">${role}</span>
          <span class="chip ${matchPct >= 70 ? 'green' : matchPct >= 40 ? 'orange' : 'red'}">${matchPct}% match</span>
          <span class="chip">${matchedCount} of ${rows.length} skills matched</span>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-3 mb-2" style="gap:14px">
        <div class="card text-center">
          <div class="card-stat" style="color:var(--success)">${matchedCount}</div>
          <div class="card-stat-label">Skills You Have</div>
        </div>
        <div class="card text-center">
          <div class="card-stat" style="color:var(--danger)">${gaps.length}</div>
          <div class="card-stat-label">Skills to Learn</div>
        </div>
        <div class="card text-center">
          <div class="card-stat" style="color:${progressColor}">${matchPct}%</div>
          <div class="card-stat-label">Role Readiness</div>
        </div>
      </div>

      <!-- Readiness Gauge + Skill Matrix -->
      <div class="grid grid-2 mb-2" style="gap:20px">

        <!-- Gauge Card -->
        <div class="card">
          <div class="card-title">Readiness Overview</div>
          <div class="card-sub">Your overall match for <b>${role}</b></div>
          <div class="sg-readiness-gauge">
            <svg viewBox="0 0 200 120" style="width:100%;max-width:240px;margin:0 auto;display:block">
              <!-- Background arc (half-circle) -->
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(45,45,45,0.12)" stroke-width="16" stroke-linecap="round"/>
              <!-- Foreground arc -->
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
                stroke="${progressColor}" stroke-width="16" stroke-linecap="round"
                stroke-dasharray="${Math.PI * 80}"
                stroke-dashoffset="${Math.PI * 80 * (1 - matchPct / 100)}"
                style="transition:stroke-dashoffset 1.5s ease"/>
              <!-- Center text -->
              <text x="100" y="88" text-anchor="middle" font-size="32" font-weight="700" fill="var(--text)" font-family="var(--font-hand)">${matchPct}%</text>
              <text x="100" y="108" text-anchor="middle" font-size="11" fill="var(--text-dim)">Readiness</text>
            </svg>
          </div>
          <div class="divider"></div>
          <!-- Strength chips -->
          ${strengths.length > 0 ? `
            <div class="card-title" style="font-size:13px;margin-bottom:8px">✅ Your Strengths</div>
            <div class="tag-row">
              ${strengths.map(s => `<span class="chip green">${s.name}</span>`).join('')}
            </div>
          ` : ''}
          ${gaps.length > 0 ? `
            <div class="card-title" style="font-size:13px;margin:12px 0 8px">⚠️ Skill Gaps</div>
            <div class="tag-row">
              ${gaps.map(g => `<span class="chip red">${g.name}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Skill-by-Skill Matrix -->
        <div class="card">
          <div class="card-title">Skill-by-Skill Matrix</div>
          <div class="card-sub">Green = matched · Orange = gap · Bar = required proficiency</div>
          <div class="sg-skill-matrix" id="sgSkillMatrix">
            ${rows.map(r => `
              <div class="skill-bar-row">
                <div class="skill-bar-label">
                  <b>${r.name}</b>
                  <span style="color:${r.match ? 'var(--success)' : 'var(--warning)'}">${r.match ? '✓ Matched' : '✗ Gap'}</span>
                </div>
                <div class="progress">
                  <div class="progress-fill ${r.match ? 'green' : 'orange'}"
                       style="width:${r.match ? r.level : 15}%;transition:width 1s ease"
                       title="${r.match ? r.level + '% proficiency' : 'Learning needed'}">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Roadmap + Resources -->
      <div class="grid grid-2 mb-2" style="gap:20px">

        <!-- Personalized Learning Roadmap -->
        <div class="card">
          <div class="card-title">
            🗺 Personalized Learning Roadmap
          </div>
          <div class="card-sub">Prioritized next steps for the ${role} role</div>
          ${roadmap.map(r => `
            <div class="roadmap-item">
              <div class="roadmap-step">${r.step}</div>
              <div class="roadmap-body">
                <div class="roadmap-title">${r.title}</div>
                <div class="roadmap-desc">${r.desc}</div>
                ${r.ytLink ? `
                  <a href="#youtube" class="sg-yt-link" data-ytjump="${r.ytLink.id}">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--accent)" style="margin-right:4px"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
                    Watch: ${r.ytLink.title}
                  </a>` : ''}
              </div>
            </div>
          `).join('')}
          ${gaps.length === 0 ? '' : `
            <div class="divider"></div>
            <button class="btn btn-ghost btn-sm" id="sgGoToYtBtn" style="color:var(--accent)">
              ▶ Go to YouTube Lectures →
            </button>
          `}
        </div>

        <!-- Recommended Resources -->
        <div class="card">
          <div class="card-title">📚 Recommended Resources</div>
          <div class="card-sub">Curated links for the ${role} path</div>
          ${resources.length > 0 ? resources.map(r => `
            <div class="rec-item">
              <div class="rec-icon">${this._roleEmoji(role)}</div>
              <div class="rec-text">
                <a href="${r.url}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none;font-weight:700">${r.title}</a>
                <div class="text-dim" style="font-size:12px;margin-top:2px">${r.desc}</div>
              </div>
            </div>`).join('')
        : `<div class="text-dim" style="font-size:13px">No curated resources yet for this role. Check the YouTube Lectures section for video courses.</div>`}

          <div class="divider"></div>
          <!-- Skill Gap YouTube Map -->
          <div class="card-title" style="font-size:13px">🔗 Gap → Lecture Map</div>
          <div class="card-sub">Missing skills mapped to relevant YouTube content</div>
          ${Object.keys(ytLinks).length > 0
        ? Object.entries(ytLinks).map(([skill, yt]) => `
              <div class="sg-yt-map-row">
                <span class="chip red" style="font-size:11px">${skill}</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--text-dim)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                <a href="#youtube" class="sg-yt-link" data-ytjump="${yt.id}">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--accent)"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
                  ${yt.title}
                </a>
              </div>
            `).join('')
        : '<div class="text-dim" style="font-size:12px">All your gaps have matching lectures in the YouTube Lectures section!</div>'}
        </div>
      </div>

      <!-- Re-analyze with different role -->
      <div class="card">
        <div class="card-title" style="font-size:14px">Try a Different Role</div>
        <div class="sg-role-grid" id="sgRoleGridBottom">
          ${ROLE_NAMES.filter(r => r !== role).map(r => {
          const m = this._computeMatchPct(allSkills, r);
          const c = m >= 70 ? 'var(--success)' : m >= 40 ? 'var(--warning)' : 'var(--danger)';
          return `
              <div class="sg-role-card sg-role-card-sm hoverable" data-role="${r}" tabindex="0" role="button">
                <div class="sg-role-icon" style="font-size:16px">${this._roleEmoji(r)}</div>
                <div class="sg-role-info">
                  <div class="sg-role-name" style="font-size:12.5px">${r}</div>
                </div>
                <div class="sg-role-match" style="font-size:11px;color:${c};background:${c}22;border-color:${c}55">${m}%</div>
              </div>`;
        }).join('')}
        </div>
      </div>
    `;

    // Back button
    document.getElementById('sgBackBtn').addEventListener('click', () => this._renderSetup());

    // Role switch (bottom grid)
    document.querySelectorAll('[data-role]').forEach(el => {
      el.addEventListener('click', () => this._analyze(el.dataset.role));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this._analyze(el.dataset.role); });
    });

    // YouTube lecture links
    document.querySelectorAll('.sg-yt-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const ytId = link.dataset.ytjump;
        window.location.hash = '#youtube';
        // After navigation, auto-open the player
        if (ytId) {
          setTimeout(() => {
            if (typeof Youtube !== 'undefined') Youtube._openPlayer(ytId);
          }, 400);
        }
      });
    });

    // Go to YouTube button
    const ytBtn = document.getElementById('sgGoToYtBtn');
    if (ytBtn) ytBtn.addEventListener('click', () => { window.location.hash = '#youtube'; });

    // Animate progress bars in after DOM ready
    requestAnimationFrame(() => {
      document.querySelectorAll('.sg-skill-matrix .progress-fill').forEach(el => {
        el.style.transition = 'width 1.2s ease';
      });
    });
  },

  /* ─── Gap → YouTube lecture mapping ─── */
  _mapGapsToYoutube(gaps, role) {
    const map = {};
    try {
      const playlists = (typeof YOUTUBE_DATA !== 'undefined' && YOUTUBE_DATA.playlists) ? YOUTUBE_DATA.playlists : [];
      const keywordMap = {
        // Coding
        'javascript': ['js1', 'js2'], 'python': ['py1', 'py2'], 'java': ['java1'],
        'c++': ['cpp1'], 'sql': ['sql1', 'sql2'], 'typescript': ['ts1'],
        'react': ['react1'], 'node': ['node1'], 'node.js': ['node1'],
        // DevOps
        'docker': ['docker1'], 'kubernetes': ['k8s1'], 'linux': ['linux1'],
        'ci/cd': ['cicd1'], 'jenkins': ['cicd1'], 'terraform': ['terraform1'],
        'aws': ['aws1'], 'git': ['git1'],
        // AI/ML
        'machine learning': ['ml1'], 'deep learning': ['dl1'],
        'nlp': ['nlp1'], 'computer vision': ['cv1'], 'pytorch': ['pytorch1'],
        'tensorflow': ['dl1'], 'llm': ['llm1'], 'mlops': ['mlops1'],
        // SDE
        'data structures': ['dsa1', 'dsa2'], 'algorithms': ['dsa1', 'dsa2'],
        'system design': ['sd1'], 'operating systems': ['os1'],
        'databases': ['dbms1'], 'networking': ['cn1'],
        'dsa': ['dsa2', 'cppdsa'],
        // Data
        'data science': ['ds1'], 'pandas': ['pandas1'], 'power bi': ['bi1'],
        'tableau': ['tableau1'], 'statistics': ['stats1']
      };

      gaps.forEach(gap => {
        const gapLower = gap.name.toLowerCase();
        for (const [kw, ids] of Object.entries(keywordMap)) {
          if (gapLower.includes(kw) || kw.includes(gapLower.split(' ')[0])) {
            for (const pid of ids) {
              const playlist = playlists.find(p => p.id === pid);
              if (playlist) {
                map[gapLower] = { id: pid, title: playlist.title };
                break;
              }
            }
            if (map[gapLower]) break;
          }
        }
        // Fallback: search by category
        if (!map[gapLower]) {
          const catMap = {
            'Frontend Developer': 'coding', 'Backend Developer': 'coding',
            'Full Stack Developer': 'coding', 'DevOps Engineer': 'devops',
            'Machine Learning Engineer': 'ai', 'Data Analyst': 'data',
            'Data Scientist': 'data'
          };
          const cat = catMap[role] || 'sde';
          const pl = playlists.find(p => p.category === cat);
          if (pl) map[gapLower] = { id: pl.id, title: pl.title };
        }
      });
    } catch { }
    return map;
  },

  /* ─── Skill extraction from resume text ─── */
  _extractSkills(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];
    try {
      if (typeof SKILL_POOL !== 'undefined') {
        for (const [skill, keywords] of Object.entries(SKILL_POOL)) {
          if (keywords.some(k => lower.includes(k))) {
            const display = skill.replace(/\//g, ' / ')
              .split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            found.push(display);
          }
        }
      }
    } catch { }
    return found;
  },

  /* ─── Merge resume + manual skills (deduplicated) ─── */
  _mergeSkills(resumeSkills, manualSkills) {
    const all = new Map();
    (resumeSkills || []).forEach(s => all.set(s.toLowerCase(), s));
    (manualSkills || []).forEach(s => {
      if (!all.has(s.toLowerCase())) all.set(s.toLowerCase(), s);
    });
    return [...all.values()];
  },

  /* ─── Role emoji helper ─── */
  _roleEmoji(role) {
    const map = {
      'Software Development Engineer': '💻',
      'SDE (Software Development Engineer)': '💻',
      'Frontend Developer': '🎨',
      'Backend Developer': '⚙️',
      'Full Stack Developer': '🔧',
      'Data Analyst': '📊',
      'Data Scientist': '🔬',
      'Machine Learning Engineer': '🤖',
      'DevOps Engineer': '🚀',
      'Product Manager': '📋',
      'General Software Engineer': '👨‍💻',
      'Cloud Engineer': '☁️',
      'Cybersecurity Engineer': '🔐',
    };
    // Try exact then partial
    if (map[role]) return map[role];
    for (const [k, v] of Object.entries(map)) {
      if (role.toLowerCase().includes(k.toLowerCase().split(' ')[0])) return v;
    }
    return '🎯';
  }
};
