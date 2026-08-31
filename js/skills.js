/* ============================================================================
   Skill Gap Analyzer  —  PlacementPrep (GitHub Primer UI)
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
      <div class="card sg-banner mb-3" style="background:var(--surface-2);border:1px solid var(--border);padding:18px">
        <div class="flex-between items-center" style="flex-wrap:wrap;gap:12px">
          <div class="flex items-center gap-3">
            <div class="brand-logo" style="width:36px;height:36px;background:var(--surface);border:1px solid var(--border);border-radius:4px">
              <i class="bi bi-bullseye text-accent" style="font-size:18px"></i>
            </div>
            <div>
              <div class="card-title" style="font-size:16px">Skill Gap Analyzer</div>
              <div class="card-sub" style="margin-bottom:0">Select a target engineering role to discover missing competencies and your roadmap.</div>
            </div>
          </div>
          <div class="sg-readiness-pill" id="sgReadinessPill" style="display:none">
            <span id="sgReadinessPct">0%</span>
            <span style="font-size:11px;opacity:.7">Readiness</span>
          </div>
        </div>
      </div>

      <div class="grid grid-2" style="gap:20px;align-items:start">

        <!-- LEFT: Your Skills -->
        <div class="card">
          <div class="card-title">
            <i class="bi bi-check2-circle text-success" style="font-size:16px"></i>
            Your Detected Skills
          </div>
          <div class="card-sub">
            ${allSkills.length
        ? `${allSkills.length} skills detected from resume scans and manual entries.`
        : 'No skills detected yet. Analyze your resume or add skills below.'}
          </div>

          ${allSkills.length > 0 ? `
            <div class="tag-row" id="detectedSkillsRow">
              ${allSkills.map(s => `
                <span class="chip ${this.state.profileSkills.includes(s) ? 'green' : 'blue'} sg-skill-chip">
                  ${s}
                </span>`).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding:24px;text-align:center">
              <div style="color:var(--text-faint);margin-bottom:8px">
                <i class="bi bi-file-earmark-code" style="font-size:28px"></i>
              </div>
              <p class="text-dim" style="font-size:12.5px">Visit the <b>Resume Analyzer</b> tab to scan your resume, or add skills manually below.</p>
            </div>
          `}

          <div class="divider"></div>
          <div class="card-title" style="font-size:13px">Add Custom Skills</div>
          <div class="flex gap-2 mt-2">
            <input type="text" id="manualSkillInput" placeholder="e.g. React, Python, Docker, AWS..." style="flex:1" />
            <button class="btn btn-primary btn-sm" id="addManualSkillBtn"><i class="bi bi-plus-lg"></i> Add</button>
          </div>
          <div class="tag-row mt-2" id="manualSkillsRow">
            ${this.state.manualSkills.map(s => `
              <span class="chip orange sg-manual-chip" data-skill="${s}">
                ${s}
                <button class="sg-remove-skill btn-ghost btn-sm" data-skill="${s}" title="Remove" style="padding:0 2px;margin-left:4px;border:none"><i class="bi bi-x"></i></button>
              </span>`).join('')}
          </div>
          ${allSkills.length === 0 ? '' : `
            <div class="divider"></div>
            <button class="btn btn-ghost btn-sm" id="clearSkillsBtn" style="color:var(--danger)"><i class="bi bi-trash" style="margin-right:4px"></i>Clear manual skills</button>
          `}
        </div>

        <!-- RIGHT: Role Explorer -->
        <div class="card">
          <div class="card-title">
            <i class="bi bi-diagram-3 text-accent" style="font-size:16px"></i>
            Choose Target Role
          </div>
          <div class="card-sub">Select a role to analyze required competencies</div>

          <div class="sg-role-grid" id="sgRoleGrid">
            ${ROLE_NAMES.map(r => {
          const rd = ROLE_SKILLS[r];
          const match = this._computeMatchPct(allSkills, r);
          const color = match >= 70 ? 'var(--success)' : match >= 40 ? 'var(--warning)' : 'var(--danger)';
          return `
                <div class="sg-role-card hoverable" data-role="${r}" tabindex="0" role="button" aria-label="Analyze role ${r}" style="background:var(--bg-2);border:1px solid var(--border);padding:12px;border-radius:4px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:pointer">
                  <div class="flex items-center gap-2">
                    <div class="sg-role-icon" style="color:var(--blue);font-size:16px">${this._roleIcon(r)}</div>
                    <div>
                      <div class="sg-role-name" style="font-weight:600;font-size:13px">${r}</div>
                      <div class="sg-role-sub text-faint" style="font-size:11px">${rd ? rd.skills.length : 0} core skills</div>
                    </div>
                  </div>
                  <div class="sg-role-match" style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:${color}">
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
      const poolKeys = (typeof ROLE_POOL_KEYS !== 'undefined' && ROLE_POOL_KEYS[role]) ? ROLE_POOL_KEYS[role] : [];
      let matched = 0;
      const required = roleData.skills || [];
      required.forEach(skill => {
        const normalized = skill.name.toLowerCase();
        let match = profileLower.some(p => p.includes(normalized) || normalized.includes(p.split(' ')[0]));
        if (!match && typeof SKILL_POOL !== 'undefined') {
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
    const poolKeys = (typeof ROLE_POOL_KEYS !== 'undefined' && ROLE_POOL_KEYS[role]) ? ROLE_POOL_KEYS[role] : [];

    if (!roleData) {
      this.container.innerHTML = `<div class="empty-state"><h3>Role data not found</h3><button class="btn btn-ghost btn-sm" id="sgBackBtn">Back</button></div>`;
      document.getElementById('sgBackBtn').addEventListener('click', () => this._renderSetup());
      return;
    }

    const profileLower = allSkills.map(s => s.toLowerCase());
    const required = roleData.skills || [];

    // Match each skill
    const rows = required.map(skill => {
      const normalized = skill.name.toLowerCase();
      let match = false;
      if (profileLower.some(p => p.includes(normalized) || normalized.includes(p.split(' ')[0]))) match = true;
      if (!match && typeof SKILL_POOL !== 'undefined') {
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
        desc: `Target proficiency: ${g.level}%. Focus on key fundamentals and practical implementation.`,
        ytLink: ytLinks[g.name.toLowerCase()] || null
      }))
      : [{ step: 1, title: 'No Critical Gaps Found', desc: 'You match all core skills for this role. Consider advanced domain architecture topics.', ytLink: null }];

    // Persist readiness to DB
    try {
      const email = (typeof Auth !== 'undefined' && Auth.getEmail) ? Auth.getEmail() : null;
      if (email) {
        const prog = DB.getProgress(email);
        const skills = { ...(prog.skills || {}), targetRole: role, matchPct, lastAnalyzed: Date.now() };
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
      <div class="flex-between mb-3" style="flex-wrap:wrap;gap:10px">
        <button class="btn btn-outline btn-sm" id="sgBackBtn"><i class="bi bi-arrow-left" style="margin-right:4px"></i>Change Role</button>
        <div class="flex gap-2" style="align-items:center;flex-wrap:wrap">
          <span class="chip blue">${role}</span>
          <span class="chip ${matchPct >= 70 ? 'green' : matchPct >= 40 ? 'orange' : 'red'}">${matchPct}% match</span>
          <span class="chip">${matchedCount} of ${rows.length} skills matched</span>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-3 mb-3" style="gap:14px">
        <div class="card text-center">
          <div class="card-stat text-success">${matchedCount}</div>
          <div class="card-stat-label">Matched Skills</div>
        </div>
        <div class="card text-center">
          <div class="card-stat text-danger">${gaps.length}</div>
          <div class="card-stat-label">Identified Gaps</div>
        </div>
        <div class="card text-center">
          <div class="card-stat" style="color:${progressColor}">${matchPct}%</div>
          <div class="card-stat-label">Target Role Match</div>
        </div>
      </div>

      <!-- Readiness Gauge + Skill Matrix -->
      <div class="grid grid-2 mb-3" style="gap:20px;align-items:start">

        <!-- Gauge Card -->
        <div class="card">
          <div class="card-title">Readiness Overview</div>
          <div class="card-sub">Your current skill profile for <b>${role}</b></div>
          <div class="sg-readiness-gauge">
            <svg viewBox="0 0 200 120" style="width:100%;max-width:240px;margin:0 auto;display:block">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--surface-2)" stroke-width="14" stroke-linecap="round"/>
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
                stroke="${progressColor}" stroke-width="14" stroke-linecap="round"
                stroke-dasharray="${Math.PI * 80}"
                stroke-dashoffset="${Math.PI * 80 * (1 - matchPct / 100)}"
                style="transition:stroke-dashoffset 1s ease"/>
              <text x="100" y="86" text-anchor="middle" font-size="28" font-weight="700" fill="var(--text)" font-family="var(--font-mono)">${matchPct}%</text>
              <text x="100" y="106" text-anchor="middle" font-size="11" fill="var(--text-dim)">Readiness</text>
            </svg>
          </div>
          <div class="divider"></div>
          ${strengths.length > 0 ? `
            <div class="card-title" style="font-size:13px;margin-bottom:6px"><i class="bi bi-check-circle-fill text-success" style="margin-right:4px"></i>Matched Strengths</div>
            <div class="tag-row mb-2">
              ${strengths.map(s => `<span class="chip green">${s.name}</span>`).join('')}
            </div>
          ` : ''}
          ${gaps.length > 0 ? `
            <div class="card-title" style="font-size:13px;margin:12px 0 6px"><i class="bi bi-exclamation-circle-fill text-warning" style="margin-right:4px"></i>Identified Skill Gaps</div>
            <div class="tag-row">
              ${gaps.map(g => `<span class="chip red">${g.name}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Skill-by-Skill Matrix -->
        <div class="card">
          <div class="card-title">Competency Matrix</div>
          <div class="card-sub">Individual skill match and target proficiency</div>
          <div class="sg-skill-matrix" id="sgSkillMatrix">
            ${rows.map(r => `
              <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:4px;padding:8px 12px;margin-bottom:8px">
                <div class="flex-between" style="font-size:12px;margin-bottom:4px">
                  <b>${r.name}</b>
                  <span style="color:${r.match ? 'var(--success)' : 'var(--warning)'};font-weight:600">
                    <i class="bi ${r.match ? 'bi-check-lg' : 'bi-dash'}"></i> ${r.match ? 'Matched' : 'Gap'}
                  </span>
                </div>
                <div class="progress" style="height:5px;background:var(--surface);border-radius:3px;overflow:hidden">
                  <div class="progress-fill" style="width:${r.match ? r.level : 15}%;background:${r.match ? 'var(--success)' : 'var(--warning)'};height:100%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Roadmap + Resources -->
      <div class="grid grid-2 mb-3" style="gap:20px;align-items:start">

        <!-- Learning Roadmap -->
        <div class="card">
          <div class="card-title">
            <i class="bi bi-signpost-split text-accent" style="font-size:16px"></i>
            Personalized Learning Roadmap
          </div>
          <div class="card-sub">Recommended next steps for ${role}</div>
          ${roadmap.map(r => `
            <div class="roadmap-item" style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${r.step}</div>
              <div class="roadmap-body">
                <div style="font-size:13px;font-weight:600">${r.title}</div>
                <div class="text-dim" style="font-size:12px;line-height:1.4;margin-top:2px">${r.desc}</div>
                ${r.ytLink ? `
                  <a href="#youtube" class="sg-yt-link" data-ytjump="${r.ytLink.id}" style="font-size:12px;margin-top:4px;display:inline-flex;align-items:center;gap:4px">
                    <i class="bi bi-play-circle-fill text-accent"></i> Watch: ${r.ytLink.title}
                  </a>` : ''}
              </div>
            </div>
          `).join('')}
          ${gaps.length === 0 ? '' : `
            <div class="mt-3">
              <button class="btn btn-outline btn-sm" id="sgGoToYtBtn">
                <i class="bi bi-play-circle" style="margin-right:4px"></i>Browse YouTube Lectures
              </button>
            </div>
          `}
        </div>

        <!-- Recommended Resources -->
        <div class="card">
          <div class="card-title"><i class="bi bi-bookmarks text-accent" style="font-size:16px"></i>Curated Resources</div>
          <div class="card-sub">Documentation & tutorials for ${role}</div>
          ${resources.length > 0 ? resources.map(r => `
            <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:4px;padding:10px;margin-bottom:8px">
              <a href="${r.url}" target="_blank" rel="noopener" style="font-weight:600;font-size:13px;display:block">${r.title} <i class="bi bi-box-arrow-up-right" style="font-size:11px;margin-left:4px"></i></a>
              <div class="text-dim" style="font-size:11.5px;margin-top:2px">${r.desc}</div>
            </div>`).join('')
        : `<div class="text-dim" style="font-size:12.5px">Check the YouTube Lectures section for full playlist courses.</div>`}
        </div>
      </div>
    `;

    // Back button
    document.getElementById('sgBackBtn').addEventListener('click', () => this._renderSetup());

    // YouTube lecture links
    document.querySelectorAll('.sg-yt-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const ytId = link.dataset.ytjump;
        window.location.hash = '#youtube';
        if (ytId) {
          setTimeout(() => {
            if (typeof Youtube !== 'undefined') Youtube._openPlayer(ytId);
          }, 400);
        }
      });
    });

    const ytBtn = document.getElementById('sgGoToYtBtn');
    if (ytBtn) ytBtn.addEventListener('click', () => { window.location.hash = '#youtube'; });
  },

  _mapGapsToYoutube(gaps, role) {
    const map = {};
    try {
      const playlists = (typeof YOUTUBE_DATA !== 'undefined' && YOUTUBE_DATA.playlists) ? YOUTUBE_DATA.playlists : [];
      const keywordMap = {
        'javascript': ['js1', 'js2'], 'python': ['py1', 'py2'], 'java': ['java1'],
        'c++': ['cpp1'], 'sql': ['sql1', 'sql2'], 'typescript': ['ts1'],
        'react': ['react1'], 'node': ['node1'], 'node.js': ['node1'],
        'docker': ['docker1'], 'kubernetes': ['k8s1'], 'linux': ['linux1'],
        'ci/cd': ['cicd1'], 'jenkins': ['cicd1'], 'terraform': ['terraform1'],
        'aws': ['aws1'], 'git': ['git1'], 'machine learning': ['ml1'],
        'deep learning': ['dl1'], 'nlp': ['nlp1'], 'computer vision': ['cv1'],
        'pytorch': ['pytorch1'], 'tensorflow': ['dl1'], 'llm': ['llm1'],
        'data structures': ['dsa1', 'dsa2'], 'algorithms': ['dsa1', 'dsa2'],
        'system design': ['sd1'], 'operating systems': ['os1'],
        'databases': ['dbms1'], 'networking': ['cn1'], 'dsa': ['dsa2', 'cppdsa']
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
      });
    } catch { }
    return map;
  },

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

  _mergeSkills(resumeSkills, manualSkills) {
    const all = new Map();
    (resumeSkills || []).forEach(s => all.set(s.toLowerCase(), s));
    (manualSkills || []).forEach(s => {
      if (!all.has(s.toLowerCase())) all.set(s.toLowerCase(), s);
    });
    return [...all.values()];
  },

  _roleIcon(role) {
    const map = {
      'Software Development Engineer': '<i class="bi bi-laptop"></i>',
      'SDE (Software Development Engineer)': '<i class="bi bi-laptop"></i>',
      'Frontend Developer': '<i class="bi bi-palette"></i>',
      'Backend Developer': '<i class="bi bi-hdd-network"></i>',
      'Full Stack Developer': '<i class="bi bi-layers"></i>',
      'Data Analyst': '<i class="bi bi-graph-up-arrow"></i>',
      'Data Scientist': '<i class="bi bi-bar-chart"></i>',
      'Machine Learning Engineer': '<i class="bi bi-cpu"></i>',
      'DevOps Engineer': '<i class="bi bi-terminal"></i>',
      'Product Manager': '<i class="bi bi-kanban"></i>',
      'General Software Engineer': '<i class="bi bi-code-square"></i>',
      'Cloud Engineer': '<i class="bi bi-cloud"></i>',
      'Cybersecurity Engineer': '<i class="bi bi-shield-lock"></i>',
    };
    if (map[role]) return map[role];
    for (const [k, v] of Object.entries(map)) {
      if (role.toLowerCase().includes(k.toLowerCase().split(' ')[0])) return v;
    }
    return '<i class="bi bi-briefcase"></i>';
  }
};
