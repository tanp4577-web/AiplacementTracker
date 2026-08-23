/* ============================================================================
   LIVE AI Resume Analyzer  —  PlacementPrep (GitHub Primer UI)
   Comprehensive semantic analysis with clean section breakdown, ATS score gauge,
   and actionable line-by-line recommendations.
   ========================================================================== */
const Resume = {
  _debounceTimer: null,

  render(container) {
    const email = Auth.getEmail();
    const prog = email ? DB.getProgress(email) : { resumeScore: 0 };

    container.innerHTML = `
      <div class="grid grid-2" style="align-items:start">
        <!-- Left: Upload & Input Panel -->
        <div class="card">
          <div class="card-title">
            <i class="bi bi-file-earmark-arrow-up text-accent" style="font-size:16px"></i>
            Upload Resume
          </div>
          <div class="card-sub">Paste your resume content or upload a document (.txt, .pdf, .docx)</div>

          <label class="field-label" for="targetRole">Target Role</label>
          <select id="targetRole">
            <option value="">-- General Software Engineering --</option>
            ${typeof ROLE_NAMES !== 'undefined' ? ROLE_NAMES.map(r => `<option value="${r}">${r}</option>`).join('') : ''}
          </select>

          <div class="drop-zone mt-3" id="dropZone">
            <div class="dz-icon">
              <i class="bi bi-cloud-arrow-up text-accent" style="font-size:36px"></i>
            </div>
            <p style="font-weight:500">Drag & drop your resume file here, or <span class="text-accent" style="cursor:pointer;font-weight:600">Browse Files</span></p>
            <p class="text-faint" style="font-size:11.5px;margin-top:4px">Supports PDF, DOCX, and TXT files</p>
          </div>
          <input type="file" id="fileInput" accept=".txt,.pdf,.docx" style="display:none" />

          <div class="divider"></div>

          <div class="flex-between">
            <label class="field-label" for="resumeText" style="margin:0">Resume Text Content</label>
            <span class="text-faint" id="resumeWordCounter" style="font-size:11.5px">0 words</span>
          </div>
          <textarea id="resumeText" class="mt-2" placeholder="Paste your resume summary, experience bullets, or full profile text here..." style="min-height:160px">${DB.getGlobal('lastResumeText') || ''}</textarea>

          <div class="flex gap-2 mt-3 items-center">
            <button class="btn btn-primary" id="analyzeBtn"><i class="bi bi-lightning-charge-fill" style="margin-right:4px"></i>Analyze Resume</button>
            <span class="text-dim" style="font-size:12px">Real-time analysis updates automatically</span>
          </div>
        </div>

        <!-- Right: Real-time Analysis Report -->
        <div class="card" id="resultCard">
          <div class="card-title">
            <i class="bi bi-file-earmark-check text-accent" style="font-size:16px"></i>
            ATS Analysis Report
          </div>
          <div class="card-sub">Automated structural & semantic resume score</div>
          
          <div id="resumeResult">
            <div class="empty-state" style="padding:48px 16px;text-align:center">
              <div style="color:var(--text-faint);margin-bottom:10px">
                <i class="bi bi-file-earmark-text" style="font-size:42px"></i>
              </div>
              <h4 style="font-size:14.5px;margin-bottom:4px">No Resume Analyzed Yet</h4>
              <p class="text-dim" style="font-size:12.5px;max-width:320px;margin:0 auto">Upload a file or paste your resume text to generate an instant ATS score, skill match breakdown, and feedback.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  },

  _bindEvents() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const textarea = document.getElementById('resumeText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultDiv = document.getElementById('resumeResult');
    const wordCounter = document.getElementById('resumeWordCounter');

    const updateWordCount = () => {
      const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCounter) wordCounter.textContent = `${words} words`;
    };
    updateWordCount();

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file, textarea);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) this._handleFile(fileInput.files[0], textarea);
    });

    analyzeBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) {
        App.showToast('Please enter or upload resume text first', 'error');
        return;
      }
      this._analyze(text, resultDiv);
    });

    // Re-analyze when target role changes
    const roleSel = document.getElementById('targetRole');
    if (roleSel) {
      roleSel.addEventListener('change', () => {
        const text = textarea.value.trim();
        if (text.length > 20) this._analyze(text, resultDiv);
      });
    }

    // Live analysis as you type (debounced)
    textarea.addEventListener('input', () => {
      updateWordCount();
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        const text = textarea.value.trim();
        if (text.length > 20) {
          this._analyze(text, resultDiv);
        }
      }, 500);
    });

    // Auto-analyze if there's existing text
    if (textarea.value.trim().length > 20) {
      this._analyze(textarea.value.trim(), resultDiv);
    }
  },

  _handleFile(file, textarea) {
    ResumeParser.parseFile(file)
      .then((text) => {
        textarea.value = text;
        const wordCounter = document.getElementById('resumeWordCounter');
        if (wordCounter) {
          const words = text.trim().split(/\s+/).filter(Boolean).length;
          wordCounter.textContent = `${words} words`;
        }
        App.showToast('File loaded successfully', 'success');
        if (text && text.trim().length > 20) {
          const resultDiv = document.getElementById('resumeResult');
          this._analyze(text.trim(), resultDiv);
        }
      })
      .catch((err) => {
        console.warn('Resume parsing error:', err);
        const reader = new FileReader();
        reader.onload = (e) => {
          textarea.value = e.target.result;
          App.showToast('File loaded (text)', 'info');
        };
        reader.readAsText(file);
      });
  },

  _analyze(text, resultDiv) {
    const roleSel = document.getElementById('targetRole');
    const targetRole = roleSel && roleSel.value ? roleSel.value : null;
    const result = LiveResumeAI.analyze(text, { targetRole });
    DB.setGlobal('lastResumeText', text);

    // Save progress
    const email = Auth.getEmail();
    if (email) {
      DB.saveProgress(email, { resumeScore: result.score });
      App.refreshAll();
    }

    // Render Score Ring
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (result.score / 100) * circumference;
    const scoreColor = result.score >= 75 ? 'var(--success)' : result.score >= 50 ? 'var(--warning)' : 'var(--danger)';
    const scoreRating = result.score >= 75 ? 'Strong Resume' : result.score >= 50 ? 'Good Potential' : 'Needs Optimization';

    // Warning banner if flagged
    const warnHTML = result.flagged ? `
      <div class="card mb-3" style="background:rgba(210,153,34,0.1);border-color:rgba(210,153,34,0.3)">
        <div class="flex gap-2 items-center">
          <i class="bi bi-exclamation-triangle-fill text-warning" style="font-size:18px"></i>
          <b style="color:var(--warning)">Quality Alert</b>
        </div>
        <ul class="text-dim mt-2" style="font-size:12px;padding-left:18px">
          ${(result.flagReasons || []).map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    // 5-part breakdown
    const parts = result.parts || { content: 0, skills: 0, structure: 0, quantified: 0, grammar: 0 };
    const partDefs = [
      { key: 'content', label: 'Content Depth', hint: 'Coherence, details, no filler' },
      { key: 'skills', label: 'Skills Coverage', hint: result.roleMatched ? `${result.roleMatched.role} (${result.roleMatched.matchPct}% match)` : 'Core technical keywords' },
      { key: 'structure', label: 'Section Structure', hint: 'Standard headings & layout completeness' },
      { key: 'quantified', label: 'Impact & Metrics', hint: 'Percentages, metrics, measurable results' },
      { key: 'grammar', label: 'Grammar & Clarity', hint: 'Spelling and syntax correctness' }
    ];

    const partsHTML = partDefs.map(p => {
      const v = Math.round(parts[p.key] || 0);
      const col = v >= 70 ? 'var(--success)' : v >= 45 ? 'var(--warning)' : 'var(--danger)';
      return `
        <div class="resume-part" style="background:var(--bg-2);border:1px solid var(--border);padding:10px 12px;border-radius:var(--radius-sm);margin-bottom:8px">
          <div class="flex-between" style="font-size:12.5px;margin-bottom:4px">
            <b>${p.label}</b>
            <span style="color:${col};font-weight:600;font-family:var(--font-mono)">${v}%</span>
          </div>
          <div class="progress" style="height:5px;background:var(--surface);border:1px solid var(--border);border-radius:4px;overflow:hidden">
            <div class="progress-fill" style="width:${v}%;background:${col};height:100%"></div>
          </div>
          <div class="text-faint mt-1" style="font-size:11px">${p.hint}</div>
        </div>
      `;
    }).join('');

    // Grammar items
    const grammarHTML = (result.grammarIssues && result.grammarIssues.length)
      ? result.grammarIssues.map(g => `
          <div class="flex gap-2 items-center" style="background:rgba(248,81,73,0.1);border:1px solid rgba(248,81,73,0.25);border-radius:4px;padding:6px 10px;font-size:12px;margin-bottom:6px">
            <i class="bi bi-x-circle-fill text-danger"></i>
            <span>${g}</span>
          </div>`).join('')
      : '<div class="text-success" style="font-size:12px"><i class="bi bi-check-circle-fill" style="margin-right:5px"></i>No major spelling or grammar issues found.</div>';

    // Section Checklist
    const sectionHTML = result.sections.map(s => `
      <div class="flex gap-2 items-center" style="font-size:12px">
        <i class="bi ${s.present ? 'bi-check-circle-fill text-success' : 'bi-dash-circle text-faint'}"></i>
        <span style="color:${s.present ? 'var(--text)' : 'var(--text-faint)'}">${s.name}</span>
      </div>
    `).join('');

    // Skills & Action Verbs
    const skillsHTML = result.foundSkills.length > 0
      ? result.foundSkills.slice(0, 10).map(sk => `<span class="chip blue">${sk}</span>`).join(' ')
      : '<span class="text-dim" style="font-size:12px">No specific technical keywords detected.</span>';

    const verbsHTML = result.foundVerbs.length > 0
      ? result.foundVerbs.slice(0, 8).map(v => `<span class="chip green">${v}</span>`).join(' ')
      : '<span class="text-dim" style="font-size:12px">Add action verbs (e.g. Architected, Built, Optimized).</span>';

    const recsHTML = result.recommendations.map(r => `
      <div class="flex gap-2 items-start" style="background:var(--bg-2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;font-size:12px;margin-bottom:6px">
        <i class="bi bi-lightbulb-fill text-warning" style="margin-top:2px;flex-shrink:0"></i>
        <div style="line-height:1.4">${r}</div>
      </div>
    `).join('');

    resultDiv.innerHTML = `
      ${warnHTML}
      <div class="card mb-3 text-center" style="background:var(--bg-2);border:1px solid var(--border);padding:18px">
        <div class="flex items-center justify-center gap-4 flex-wrap">
          <div class="hero-ring" style="width:84px;height:84px">
            <svg viewBox="0 0 100 100">
              <circle class="bg" cx="50" cy="50" r="42" stroke-width="8" fill="none" stroke="var(--surface)"/>
              <circle class="fg" cx="50" cy="50" r="42" stroke-width="8" fill="none"
                stroke="${scoreColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                stroke-linecap="round"
              />
            </svg>
            <div class="hero-num">
              <b style="font-size:18px;font-family:var(--font-mono)">${result.score}%</b>
            </div>
          </div>
          <div class="text-left" style="text-align:left">
            <div style="font-size:15px;font-weight:600;color:var(--text)">${scoreRating}</div>
            <div class="text-dim" style="font-size:12px;margin-top:2px">${result.wordCount} words analyzed · ${result.sectionPct}% structure completeness</div>
            <div class="mt-2">
              <span class="chip ${result.score >= 75 ? 'green' : result.score >= 50 ? 'orange' : 'red'}">${result.score >= 75 ? 'Ready to Apply' : 'Revisions Recommended'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-bar-chart-line text-accent" style="margin-right:4px"></i>Score Breakdown</div>
      <div class="mb-3">${partsHTML}</div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-layout-text-sidebar text-accent" style="margin-right:4px"></i>Section Coverage</div>
      <div class="grid grid-2 mb-3" style="background:var(--bg-2);border:1px solid var(--border);padding:10px 12px;border-radius:4px;gap:8px">
        ${sectionHTML}
      </div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-code-square text-accent" style="margin-right:4px"></i>Detected Skills</div>
      <div class="tag-row mb-3">${skillsHTML}</div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-lightning-fill text-accent" style="margin-right:4px"></i>Action Verbs</div>
      <div class="tag-row mb-3">${verbsHTML}</div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-spellcheck text-accent" style="margin-right:4px"></i>Grammar & Readability</div>
      <div class="mb-3">${grammarHTML}</div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-stars text-accent" style="margin-right:4px"></i>Actionable Recommendations</div>
      <div>${recsHTML}</div>
    `;
  }
};
