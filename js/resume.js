/* ============================================================================
   Resume Analyzer
   Reads a PDF / DOCX / TXT (or pasted text), refuses to score text that cannot be read, and explains the result:
   the score and its five parts (LiveResumeAI), plus concrete fixes with the exact lines they are about, contact and
   section checks, bullet quality, an optional job-description match and a report you can copy or download
   (ResumeInsights). Nothing is sent anywhere: the analysis runs in your browser.
   ========================================================================== */
const Resume = {
  _debounceTimer: null,
  _last: null,         // { text, result, insights, role } of the last readable analysis, for the report buttons
  _showAllFixes: false,

  render(container) {
    container.innerHTML = `
      <div class="grid grid-2" style="align-items:start">
        <div class="card">
          <div class="card-title">
            <i class="bi bi-file-earmark-arrow-up text-accent" style="font-size:16px"></i>
            Upload Resume
          </div>
          <div class="card-sub">Upload a PDF, DOCX or TXT, or paste your resume text</div>

          <label class="field-label" for="targetRole">Target Role</label>
          <select id="targetRole">
            <option value="">-- General Software Engineering --</option>
            ${typeof ROLE_NAMES !== 'undefined' ? ROLE_NAMES.map(r => `<option value="${Sanitize.html(r)}">${Sanitize.html(r)}</option>`).join('') : ''}
          </select>

          <div class="drop-zone mt-3" id="dropZone" tabindex="0" role="button" aria-label="Choose a resume file">
            <div class="dz-icon"><i class="bi bi-cloud-arrow-up text-accent" style="font-size:36px"></i></div>
            <p style="font-weight:500">Drag & drop your resume file here, or <span class="text-accent" style="cursor:pointer;font-weight:600">Browse Files</span></p>
            <p class="text-faint" style="font-size:11.5px;margin-top:4px">PDF, DOCX or TXT. Scanned images of a resume cannot be read: export a text PDF instead.</p>
          </div>
          <input type="file" id="fileInput" accept=".txt,.pdf,.docx,.rtf" style="display:none" />
          <div id="resumeFileNote" class="mt-1" role="status" style="font-size:12.5px"></div>

          <div class="divider"></div>

          <div class="flex-between">
            <label class="field-label" for="resumeText" style="margin:0">Resume Text Content</label>
            <span class="text-faint" id="resumeWordCounter" style="font-size:11.5px">0 words</span>
          </div>
          <textarea id="resumeText" class="mt-2" placeholder="Paste your resume text here..." style="min-height:160px">${Sanitize.html(DB.getGlobal('lastResumeText') || '')}</textarea>

          <details class="mt-2" id="jdBox">
            <summary style="cursor:pointer;font-size:13px;font-weight:600">Compare with a job description (optional)</summary>
            <p class="text-dim" style="font-size:12px;margin:6px 0">Paste the job post. We list which of its keywords your resume already has and which it is missing.</p>
            <textarea id="jdText" placeholder="Paste the job description here..." style="min-height:110px"></textarea>
          </details>

          <div class="flex gap-2 mt-3 items-center" style="flex-wrap:wrap">
            <button class="btn btn-primary" id="analyzeBtn"><i class="bi bi-lightning-charge-fill" style="margin-right:4px"></i>Analyze Resume</button>
            <button class="btn btn-ghost" id="clearResumeBtn" type="button">Clear</button>
            <span class="text-dim" style="font-size:12px">Updates as you type</span>
          </div>
        </div>

        <div class="card" id="resultCard">
          <div class="card-title">
            <i class="bi bi-file-earmark-check text-accent" style="font-size:16px"></i>
            ATS Analysis Report
          </div>
          <div class="card-sub">What a recruiter's system sees, and what to fix first</div>
          <div id="resumeResult">
            <div class="empty-state" style="padding:48px 16px;text-align:center">
              <div style="color:var(--text-faint);margin-bottom:10px"><i class="bi bi-file-earmark-text" style="font-size:42px"></i></div>
              <h4 style="font-size:14.5px;margin-bottom:4px">No Resume Analyzed Yet</h4>
              <p class="text-dim" style="font-size:12.5px;max-width:340px;margin:0 auto">Upload a file or paste your resume text. You get a score, a short list of what to fix first, and a checklist of contact details, sections and measurable results.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    this._bindEvents();
  },

  _els() {
    return {
      dropZone: document.getElementById('dropZone'), fileInput: document.getElementById('fileInput'),
      textarea: document.getElementById('resumeText'), jd: document.getElementById('jdText'),
      result: document.getElementById('resumeResult'), counter: document.getElementById('resumeWordCounter'),
      note: document.getElementById('resumeFileNote')
    };
  },

  _bindEvents() {
    const { dropZone, fileInput, textarea, jd, result, counter } = this._els();
    const updateWordCount = () => { counter.textContent = `${textarea.value.trim().split(/\s+/).filter(Boolean).length} words`; };
    updateWordCount();
    const run = () => { const t = textarea.value.trim(); if (t.length > 20) this._analyze(t, result); };

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) this._handleFile(fileInput.files[0]); fileInput.value = ''; });

    document.getElementById('analyzeBtn').addEventListener('click', () => {
      if (!textarea.value.trim()) { App.showToast('Please enter or upload resume text first', 'error'); return; }
      this._analyze(textarea.value.trim(), result);
    });
    document.getElementById('clearResumeBtn').addEventListener('click', () => {
      textarea.value = ''; jd.value = ''; updateWordCount();
      DB.setGlobal('lastResumeText', '');
      this._last = null;
      this.render(document.getElementById('viewContainer'));
    });
    document.getElementById('targetRole').addEventListener('change', run);
    jd.addEventListener('input', () => { clearTimeout(this._jdTimer); this._jdTimer = setTimeout(run, 500); });
    textarea.addEventListener('input', () => {
      updateWordCount();
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(run, 500);
    });
    if (textarea.value.trim().length > 20) run();
  },

  /** Reads the file and loads it into the box, or says plainly why it could not be read. */
  async _handleFile(file) {
    const { textarea, result, note, counter } = this._els();
    note.className = 'mt-1 text-dim';
    note.textContent = `Reading ${file.name}…`;
    let loaded;
    try {
      loaded = await ResumeParser.load(file);
    } catch (e) {
      loaded = { text: '', readable: false, reasons: [e && e.message ? e.message : 'The file could not be opened.'] };
    }
    if (!loaded.readable) {
      note.className = 'mt-1 text-danger';
      note.innerHTML = `<b>We could not read text from ${Sanitize.html(file.name)}.</b> ${Sanitize.html(loaded.reasons.join(' '))} This usually means the PDF is a scanned image or uses a font the reader cannot decode. Export it again as a text PDF (File, Download as PDF from Word or Google Docs), save a DOCX, or paste the text below.`;
      return;
    }
    textarea.value = loaded.text;
    counter.textContent = `${loaded.text.split(/\s+/).filter(Boolean).length} words`;
    note.className = 'mt-1 text-success';
    note.textContent = `Read ${file.name} (${loaded.text.split(/\s+/).filter(Boolean).length} words). Check the text below is right, then fix anything that looks off.`;
    App.showToast('File loaded', 'success');
    this._analyze(loaded.text, result);
  },

  _sev: { high: ['red', 'Fix first'], medium: ['orange', 'Should fix'], low: ['gray', 'Nice to have'] },

  _unreadableHtml(insights) {
    return `
      <div class="card mb-3" id="resumeUnreadable" style="background:rgba(210,153,34,0.1);border-color:rgba(210,153,34,0.3)">
        <div class="flex gap-2 items-center"><i class="bi bi-exclamation-triangle-fill text-warning" style="font-size:18px"></i><b style="color:var(--warning)">We cannot read this text</b></div>
        <ul class="text-dim mt-2" style="font-size:12.5px;padding-left:18px">${insights.readable.reasons.map((r) => `<li>${Sanitize.html(r)}</li>`).join('')}</ul>
        <p style="font-size:12.5px;margin-top:8px">No score is shown, because a score for unreadable text would be meaningless. Paste the resume as plain text, or upload a text PDF or DOCX (not a scan or photo).</p>
      </div>`;
  },

  _analyze(text, resultDiv) {
    const roleSel = document.getElementById('targetRole');
    const targetRole = roleSel && roleSel.value ? roleSel.value : null;
    const jdEl = document.getElementById('jdText');
    const jd = jdEl ? jdEl.value : '';
    const insights = ResumeInsights.analyze(text, { role: targetRole, jd });
    if (!insights.readable.ok) {
      this._last = null;
      resultDiv.innerHTML = this._unreadableHtml(insights);
      return;
    }
    const result = this._blend(LiveResumeAI.analyze(text, { targetRole }), insights);
    this._last = { text, result, insights, role: targetRole };
    DB.setGlobal('lastResumeText', text);
    DB.setGlobal('lastResumeSkills', result.foundSkills || []);
    DB.setGlobal('lastResumeRole', result.roleMatched ? result.roleMatched.role : (targetRole || null));
    const email = Auth.getEmail();
    if (email) { DB.saveProgress(email, { resumeScore: result.score }); App.refreshAll(); }
    resultDiv.innerHTML = this._reportHtml(result, insights, targetRole);
    this._bindReport(resultDiv);
  },

  /** LiveResumeAI looks for symbols such as % and counts words anywhere; the insights read headings and lines. Where
      they know more (sections found by heading, share of lines with a real number) the score uses that, and a resume
      with no way to contact you, or almost no content, cannot score as "strong". The changes are listed in result.notes. */
  _blend(result, ins) {
    const old = result.parts;
    const parts = { ...old };
    const notes = [];
    const w = (p) => p.content * 0.25 + p.skills * 0.3 + p.structure * 0.2 + p.quantified * 0.15 + p.grammar * 0.1;
    if (ins.bullets.total >= 3) parts.quantified = Math.round((ins.bullets.metric / ins.bullets.total) * 100);
    const need = ['summary', 'education', 'skills', 'certs'].filter((k) => ins.sections.find((x) => x.key === k).found).length + (ins.sections.some((x) => (x.key === 'experience' || x.key === 'projects') && x.found) ? 1 : 0);
    parts.structure = Math.round((need / 5) * 100);
    let score = Math.round(result.score + (w(parts) - w(old)));
    if (!ins.contact.email || !ins.contact.phone) { score -= 8; notes.push('-8: no email or phone found'); }
    if (ins.words < 150) { score = Math.min(score, 55); notes.push('capped at 55: fewer than 150 words'); }
    score = Math.max(0, Math.min(100, score));
    return { ...result, parts, score, notes, sectionPct: parts.structure };
  },

  _tick(ok) { return `<i class="bi ${ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}" aria-hidden="true"></i><span class="sr-only">${ok ? 'yes' : 'missing'}</span>`; },

  _reportHtml(result, ins, targetRole) {
    const h = (v) => Sanitize.html(v);
    const circumference = 2 * Math.PI * 42;
    const offset = circumference - (result.score / 100) * circumference;
    const scoreColor = result.score >= 75 ? 'var(--success)' : result.score >= 50 ? 'var(--warning)' : 'var(--danger)';
    const rating = result.score >= 75 ? 'Strong Resume' : result.score >= 50 ? 'Good Potential' : 'Needs Optimization';
    const top = ins.fixes.filter((f) => f.severity === 'high');
    const headline = top.length
      ? `Biggest problems: ${top.slice(0, 2).map((f) => f.title.toLowerCase()).join('; ')}.`
      : ins.fixes.length ? `No major gaps. Next improvement: ${ins.fixes[0].title.toLowerCase()}.` : 'No gaps found by these checks. Tailor it to each job.';

    const warn = result.flagged ? `
      <div class="card mb-3" style="background:rgba(210,153,34,0.1);border-color:rgba(210,153,34,0.3)">
        <div class="flex gap-2 items-center"><i class="bi bi-exclamation-triangle-fill text-warning" style="font-size:18px"></i><b style="color:var(--warning)">Quality Alert</b></div>
        <ul class="text-dim mt-2" style="font-size:12px;padding-left:18px">${(result.flagReasons || []).map((r) => `<li>${h(r)}</li>`).join('')}</ul>
      </div>` : '';

    const shown = this._showAllFixes ? ins.fixes : ins.fixes.slice(0, 5);
    const fixesHtml = shown.map((f) => {
      const [color, label] = this._sev[f.severity];
      return `
        <div class="resume-fix" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:8px">
          <div class="flex gap-2 items-center" style="flex-wrap:wrap"><span class="chip ${color}">${label}</span><b style="font-size:13px">${h(f.title)}</b></div>
          ${f.line ? `<div class="mt-1" style="font-size:12px;border-left:3px solid var(--border-strong);padding-left:8px;color:var(--text-dim)">${h(f.line)}</div>` : ''}
          <div class="text-dim mt-1" style="font-size:12px"><b>Why:</b> ${h(f.why)}</div>
          <div class="mt-1" style="font-size:12px"><b>Fix:</b> ${h(f.how)}</div>
        </div>`;
    }).join('') || '<div class="text-success" style="font-size:12.5px"><i class="bi bi-check-circle-fill"></i> Nothing to fix from these checks.</div>';

    const parts = result.parts || {};
    const partDefs = [
      { key: 'content', label: 'Content Depth', hint: 'Real sentences, details, no filler' },
      { key: 'skills', label: 'Skills Coverage', hint: result.roleMatched ? `${result.roleMatched.role}: ${result.roleMatched.matchPct}% of its keywords` : 'Technical keywords found' },
      { key: 'structure', label: 'Section Structure', hint: 'Standard headings and layout' },
      { key: 'quantified', label: 'Impact & Metrics', hint: 'Percentages and measurable results' },
      { key: 'grammar', label: 'Grammar & Clarity', hint: 'Spelling and syntax' }
    ];
    const partsHtml = partDefs.map((p) => {
      const v = Math.round(parts[p.key] || 0);
      const col = v >= 70 ? 'var(--success)' : v >= 45 ? 'var(--warning)' : 'var(--danger)';
      return `<div class="resume-part" style="background:var(--bg-2);border:1px solid var(--border);padding:10px 12px;border-radius:var(--radius-sm);margin-bottom:8px">
        <div class="flex-between" style="font-size:12.5px;margin-bottom:4px"><b>${h(p.label)}</b><span style="color:${col};font-weight:600;font-family:var(--font-mono)">${v}%</span></div>
        <div class="progress" style="height:5px"><div class="progress-fill" style="width:${v}%;background:${col};height:100%"></div></div>
        <div class="text-faint mt-1" style="font-size:11px">${h(p.hint)}</div></div>`;
    }).join('');

    const c = ins.contact;
    const contactHtml = [['Email', c.email], ['Phone', c.phone], ['LinkedIn', c.linkedin], ['GitHub', c.github]].map(([n, ok]) => `<div class="flex gap-2 items-center" style="font-size:12.5px">${this._tick(ok)} ${n}</div>`).join('');
    const sectionsHtml = ins.sections.filter((s) => s.need !== 'none' || s.found).map((s) => `<div class="flex gap-2 items-center" style="font-size:12.5px">${this._tick(s.found)} ${h(s.label)}</div>`).join('');
    const b = ins.bullets;
    const pct = (n) => (b.total ? Math.round((n / b.total) * 100) : 0);
    const bulletsHtml = b.total
      ? `<div style="font-size:12.5px;line-height:1.7">${b.total} achievement lines found.<br>
         <b>${pct(b.verb)}%</b> start with an action verb (${b.verb}/${b.total})<br>
         <b>${pct(b.metric)}%</b> contain a number (${b.metric}/${b.total})<br>
         <b>${b.weak}</b> use weak phrases, <b>${b.long}</b> are over 32 words</div>`
      : '<div class="text-dim" style="font-size:12.5px">No achievement lines found. Write each project or job as short lines starting with a verb.</div>';

    let jdHtml = '';
    if (ins.jd) {
      jdHtml = `
        <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-bullseye text-accent" style="margin-right:4px"></i>Job Description Match: <b id="jdPct">${ins.jd.pct}%</b></div>
        <div class="mb-3" id="jdMatch"><div class="text-dim" style="font-size:12px;margin-bottom:6px">Of ${ins.jd.total} keywords in the job post, your resume has ${ins.jd.matched.length}.</div>
          <div class="tag-row">${ins.jd.matched.slice(0, 14).map((k) => `<span class="chip green">${h(k)}</span>`).join(' ') || '<span class="text-dim" style="font-size:12px">none</span>'}</div>
          ${ins.jd.missing.length ? `<div class="text-dim mt-2" style="font-size:12px">Missing (add only what is true for you):</div><div class="tag-row mt-1">${ins.jd.missing.map((k) => `<span class="chip red">${h(k)}</span>`).join(' ')}</div>` : ''}</div>`;
    }

    const skillsHtml = result.foundSkills.length ? result.foundSkills.slice(0, 14).map((s) => `<span class="chip blue">${h(s)}</span>`).join(' ') : '<span class="text-dim" style="font-size:12px">No specific technical keywords detected.</span>';
    const missingRole = ins.roleMissing && ins.roleMissing.length ? `<div class="text-dim mt-2" style="font-size:12px">${h(targetRole)} usually also asks for:</div><div class="tag-row mt-1">${ins.roleMissing.map((k) => `<span class="chip orange">${h(k)}</span>`).join(' ')}</div>` : '';
    const grammarHtml = (result.grammarIssues && result.grammarIssues.length)
      ? result.grammarIssues.map((g) => `<div style="font-size:12px;margin-bottom:4px"><i class="bi bi-x-circle-fill text-danger"></i> ${h(g)}</div>`).join('')
      : '<div class="text-success" style="font-size:12px"><i class="bi bi-check-circle-fill"></i> No spelling or grammar problems found.</div>';

    return `
      ${warn}
      <div class="card mb-3" style="background:var(--bg-2);border:1px solid var(--border);padding:18px">
        <div class="flex items-center gap-4" style="flex-wrap:wrap">
          <div class="hero-ring" style="width:84px;height:84px">
            <svg viewBox="0 0 100 100" role="img" aria-label="Score ${result.score} out of 100">
              <circle class="bg" cx="50" cy="50" r="42" stroke-width="8" fill="none" stroke="var(--surface)"/>
              <circle class="fg" cx="50" cy="50" r="42" stroke-width="8" fill="none" stroke="${scoreColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
            </svg>
            <div class="hero-num"><b style="font-size:18px;font-family:var(--font-mono)" id="resumeScoreNum">${result.score}%</b></div>
          </div>
          <div style="flex:1;min-width:200px">
            <div style="font-size:15px;font-weight:600">${rating}</div>
            <div class="text-dim" style="font-size:12px;margin-top:2px">${ins.words} words (${h(ins.lengthStatus)} length) · ${result.sectionPct}% structure</div>
            ${result.notes && result.notes.length ? `<div class="text-faint" id="resumeNotes" style="font-size:11px;margin-top:4px">Score adjusted: ${h(result.notes.join('; '))}</div>` : ''}
            <div id="resumeHeadline" style="font-size:12.5px;margin-top:6px">${h(headline)}</div>
          </div>
        </div>
      </div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-list-check text-accent" style="margin-right:4px"></i>What to fix first (${ins.fixes.length})</div>
      <div class="mb-3" id="resumeFixes">${fixesHtml}${ins.fixes.length > 5 ? `<button type="button" class="btn btn-ghost btn-sm" id="toggleFixes">${this._showAllFixes ? 'Show fewer' : `Show all ${ins.fixes.length}`}</button>` : ''}</div>

      ${jdHtml}

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-bar-chart-line text-accent" style="margin-right:4px"></i>Score Breakdown</div>
      <div class="mb-3">${partsHtml}</div>

      <div class="grid grid-2 mb-3" style="gap:12px">
        <div><div class="card-title mb-2" style="font-size:13px">Contact & links</div><div id="resumeContact">${contactHtml}</div></div>
        <div><div class="card-title mb-2" style="font-size:13px">Sections found</div><div id="resumeSections">${sectionsHtml}</div></div>
      </div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-text-left text-accent" style="margin-right:4px"></i>Achievement lines</div>
      <div class="mb-3" id="resumeBullets">${bulletsHtml}</div>

      <div class="card-title mb-2" style="font-size:13px"><i class="bi bi-code-square text-accent" style="margin-right:4px"></i>Skills detected</div>
      <div class="tag-row mb-3">${skillsHtml}</div>${missingRole}

      <div class="card-title mb-2 mt-3" style="font-size:13px"><i class="bi bi-spellcheck text-accent" style="margin-right:4px"></i>Grammar & Readability</div>
      <div class="mb-3">${grammarHtml}</div>

      <div class="flex gap-2" style="flex-wrap:wrap">
        <button type="button" class="btn btn-ghost btn-sm" id="copyReportBtn"><i class="bi bi-clipboard"></i> Copy report</button>
        <button type="button" class="btn btn-ghost btn-sm" id="downloadReportBtn"><i class="bi bi-download"></i> Download report</button>
        <span class="text-dim" id="reportMsg" role="status" style="font-size:12px"></span>
      </div>
    `;
  },

  _reportText() {
    const l = this._last;
    return l ? ResumeInsights.report(l.text, l.result, l.insights, { role: l.role }) : '';
  },

  _bindReport(resultDiv) {
    document.getElementById('toggleFixes')?.addEventListener('click', () => {
      this._showAllFixes = !this._showAllFixes;
      if (this._last) { resultDiv.innerHTML = this._reportHtml(this._last.result, this._last.insights, this._last.role); this._bindReport(resultDiv); }
    });
    const msg = document.getElementById('reportMsg');
    document.getElementById('copyReportBtn')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(this._reportText()); msg.textContent = 'Report copied.'; } catch { msg.textContent = 'Copy is blocked in this browser. Use Download instead.'; }
    });
    document.getElementById('downloadReportBtn')?.addEventListener('click', () => {
      const blob = new Blob([this._reportText()], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'resume-report.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      msg.textContent = 'Report downloaded.';
    });
  }
};
