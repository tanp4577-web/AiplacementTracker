/* ============================================================================
   LIVE AI Resume Analyzer
   Replaces the old keyword-matching analyzer with a true structural + semantic
   analysis that works on ANY pasted text or uploaded file. No fixed keyword
   bank, no "must match X" requirements. Provides real scores, sections,
   skills, action verbs, quantified achievements, and actionable recommendations.
   ========================================================================== */
const Resume = {
  _debounceTimer: null,

  render(container) {
    const email = Auth.getEmail();
    const prog = email ? DB.getProgress(email) : { resumeScore: 0 };

    container.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Upload Resume
          </div>
          <div class="card-sub">Paste your resume text or upload a file — we analyze any paragraph</div>

          <label class="field-label" for="targetRole">Target Role (optional — improves skill relevance)</label>
          <select id="targetRole">
            <option value="">-- No specific role --</option>
            ${typeof ROLE_NAMES !== 'undefined' ? ROLE_NAMES.map(r => `<option value="${r}">${r}</option>`).join('') : ''}
          </select>

          <div class="divider"></div>
          <div class="drop-zone" id="dropZone">
            <div class="dz-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:42px;height:42px;color:var(--accent)"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <p>Drag & drop your resume here, or <strong>browse</strong></p>
            <p class="text-dim" style="font-size:12px;margin-top:6px">Supports .txt, .pdf, .docx</p>
          </div>
          <input type="file" id="fileInput" accept=".txt,.pdf,.docx" style="display:none" />
          <div class="divider"></div>
          <label class="field-label" for="resumeText">Or paste any text to analyze</label>
          <textarea id="resumeText" placeholder="Paste your resume content, a paragraph, or any text here...">${DB.getGlobal('lastResumeText') || ''}</textarea>
          <button class="btn btn-primary mt-2" id="analyzeBtn">Analyze</button>
          <span class="text-dim" style="font-size:11.5px;margin-left:10px">Live analysis updates as you type</span>
        </div>
        <div class="card" id="resultCard">
          <div class="card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--accent)"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="8"/></svg>
            Analysis Report
          </div>
          <div class="card-sub">Real AI analysis — no fixed keywords, works on any text</div>
          <div id="resumeResult">
            <div class="empty-state">
              <div class="es-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:46px;height:46px;color:var(--text-dim)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h3>No analysis yet</h3>
              <p>Paste or upload any text — the AI will detect sections, skills, and provide a score with actionable feedback</p>
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
        App.showToast('Please enter or upload text first', 'error');
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
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        const text = textarea.value.trim();
        if (text.length > 20) {
          this._analyze(text, resultDiv);
        }
      }, 600);
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
          App.showToast('File loaded (raw text)', 'info');
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

    // Render
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (result.score / 100) * circumference;
    const scoreColor = result.scoreColor;

    // ---- Warning banner for fake/placeholder content ----
    const warnHTML = result.flagged ? `
      <div class="resume-warn-banner">
        <div class="rw-icon">⚠</div>
        <div class="rw-body">
          <b>This content looks auto-generated or low-quality.</b>
          <ul>${(result.flagReasons || []).map(r => `<li>${r}</li>`).join('')}</ul>
          <div class="rw-fix">Rewrite it with genuine, specific details about your real experience — the score below reflects this warning.</div>
        </div>
      </div>
      <div class="divider"></div>
    ` : '';

    // ---- 5-part breakdown ----
    const parts = result.parts || { content: 0, skills: 0, structure: 0, quantified: 0, grammar: 0 };
    const partDefs = [
      { key: 'content', label: 'Content Quality', hint: 'Real sentences, coherence, no filler' },
      { key: 'skills', label: 'Skills Relevance', hint: result.roleMatched ? `Matched against ${result.roleMatched.role} (${result.roleMatched.matchPct}% role overlap)` : 'Technical keyword coverage' },
      { key: 'structure', label: 'Structure', hint: 'Sections & completeness' },
      { key: 'quantified', label: 'Quantified Impact', hint: 'Numbers, %, metrics in achievements' },
      { key: 'grammar', label: 'Grammar & Spelling', hint: 'Errors detected below' }
    ];
    const partsHTML = partDefs.map(p => {
      const v = Math.round(parts[p.key] || 0);
      const col = v >= 70 ? 'var(--success)' : v >= 45 ? 'var(--warning)' : 'var(--danger)';
      return `
        <div class="resume-part">
          <div class="rp-label">
            <b>${p.label}</b>
            <span style="color:${col}">${v}%</span>
          </div>
          <div class="progress"><div class="progress-fill" style="width:${v}%;background:${col}"></div></div>
          <div class="rp-hint">${p.hint}</div>
        </div>
      `;
    }).join('');

    // ---- Grammar issues ----
    const grammarHTML = (result.grammarIssues && result.grammarIssues.length)
      ? result.grammarIssues.map(g => `
          <div class="grammar-issue">
            <span class="gi-icon">✗</span>
            <span>${g}</span>
          </div>`).join('')
      : '<div class="text-dim" style="font-size:12.5px">No obvious grammar/spelling issues detected.</div>';

    // ---- Line-by-line suggestions ----
    const suggHTML = (result.suggestions && result.suggestions.length)
      ? result.suggestions.map(s => `
          <div class="resume-sugg">
            <div class="rs-line">${s.line}</div>
            <div class="rs-fix">→ ${s.fix}</div>
          </div>`).join('')
      : '';

    const sectionHTML = result.sections.map(s => `
      <div class="section-check">
        <div class="check-icon ${s.present ? 'ok' : 'no'}">
          ${s.present
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
        </div>
        <span>${s.name}</span>
      </div>
    `).join('');

    const skillsHTML = result.foundSkills.length > 0
      ? result.foundSkills.slice(0, 12).map(sk => `<span class="chip">${sk}</span>`).join(' ')
      : '<span class="text-dim">No specific skills detected — add more technical keywords</span>';

    const verbsHTML = result.foundVerbs.length > 0
      ? result.foundVerbs.map(v => `<span class="chip green">${v}</span>`).join(' ')
      : '<span class="text-dim">No action verbs detected — use words like "built", "improved", "led"</span>';

    const quantHTML = result.quantified.length > 0
      ? result.quantified.map(q => `<span class="chip blue">${q}</span>`).join(' ')
      : '<span class="text-dim">No quantified results — add numbers, percentages, or metrics</span>';

    const recsHTML = result.recommendations.map(r => `
      <div class="rec-item">
        <div class="rec-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <div class="rec-text">${r}</div>
      </div>
    `).join('');

    resultDiv.innerHTML = `
      ${warnHTML}
      <div class="ats-score-ring">
        <svg viewBox="0 0 100 100">
          <circle class="ats-ring-bg" cx="50" cy="50" r="45"/>
          <circle class="ats-ring-val" cx="50" cy="50" r="45"
            stroke="${scoreColor}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
          />
        </svg>
        <div class="ats-score-num">
          <b style="color:${scoreColor}">${result.score}%</b>
          <span>Quality Score</span>
        </div>
      </div>
      <div class="text-dim text-center" style="font-size:12px;margin-top:4px">${result.wordCount} words detected</div>

      <div class="divider"></div>
      <div class="card-title mb-1">Detailed Breakdown</div>
      <div class="card-sub">Five-part quality analysis</div>
      ${partsHTML}

      <div class="divider"></div>
      <div class="card-title mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
        Grammar & Spelling
      </div>
      ${grammarHTML}

      ${suggHTML ? `<div class="divider"></div>
      <div class="card-title mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="8"/></svg>
        Line-by-Line Suggestions
      </div>
      ${suggHTML}` : ''}

      <div class="divider"></div>
      <div class="card-title mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
        Section Completeness (${result.sectionPct}%)
      </div>
      ${sectionHTML}

      <div class="divider"></div>
      <div class="card-title mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Skills Detected
      </div>
      <div class="tag-row">${skillsHTML}</div>

      <div class="divider"></div>
      <div class="card-title mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        Action Verbs
      </div>
      <div class="tag-row">${verbsHTML}</div>

      <div class="divider"></div>
      <div class="card-title mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
        Quantified Results
      </div>
      <div class="tag-row">${quantHTML}</div>

      <div class="divider"></div>
      <div class="card-title mb-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--accent)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Recommendations (${result.recommendations.length})
      </div>
      ${recsHTML}
    `;
  }
};
