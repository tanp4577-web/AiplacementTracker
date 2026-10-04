/* ============ Resume insights ============
   Concrete, checkable findings about a resume, each with the exact line it is about, why it matters and how to
   fix it. Everything here is computed from the text the learner gave us: nothing is invented, no number is
   guessed, and when a resume cannot be read at all we say so instead of scoring noise.

   ResumeInsights.analyze(text, { role, jd }) returns
     readable  { ok, reasons }              false for scanned or garbled text
     contact   { email, phone, linkedin, github, link }
     sections  [{ key, label, found, line }] found by heading lines, not by a word appearing anywhere
     bullets   { total, verb, metric, long, weak, pronouns }
     fresher   { cgpa, projects }
     words, lengthStatus
     fixes     [{ severity: 'high'|'medium'|'low', title, why, how, line? }] most important first
     jd        null | { pct, matched, missing }    only when a job description was pasted
   The 0-100 score itself still comes from LiveResumeAI; this module explains it. */
const ResumeInsights = (() => {
  const HEADINGS = [
    { key: 'summary', label: 'Summary / Objective', re: /^(professional |career )?(summary|objective|profile|about me)$/i, need: 'low' },
    { key: 'education', label: 'Education', re: /^(education|academics?|academic (background|qualifications?)|qualifications?)$/i, need: 'high' },
    { key: 'experience', label: 'Experience / Internships', re: /^((work|professional) )?(experience|employment( history)?|internships?|work history)$/i, need: 'none' },
    { key: 'projects', label: 'Projects', re: /^((academic|personal|key|major) )?projects?$/i, need: 'high' },
    { key: 'skills', label: 'Skills', re: /^(technical |key |core )?(skills|technologies|tech stack|competencies)( summary)?$/i, need: 'high' },
    { key: 'certs', label: 'Certifications / Courses', re: /^(certifications?|certificates?|courses?|training|licenses?)$/i, need: 'low' },
    { key: 'achievements', label: 'Achievements', re: /^(achievements?|awards?|honou?rs?|accomplishments?)$/i, need: 'none' },
    { key: 'activities', label: 'Activities / Leadership', re: /^(extra[- ]?curricular( activities)?|activities|leadership|positions of responsibility|volunteering)$/i, need: 'none' }
  ];

  const VERBS = new Set(('built,led,ran,wrote,made,drove,grew,won,taught,found,held,sold,led,designed,developed,created,implemented,managed,improved,increased,reduced,launched,delivered,spearheaded,optimized,optimised,engineered,architected,achieved,mentored,automated,streamlined,collaborated,established,initiated,negotiated,resolved,analyzed,analysed,researched,deployed,migrated,integrated,shipped,organized,organised,coordinated,presented,trained,tested,debugged,refactored,configured,maintained,published,secured,scaled,simplified,reviewed,conducted,contributed,participated,secured,ranked,earned,awarded,selected,completed,submitted,prepared,planned,executed,supported,assisted,utilized,utilised,leveraged,modeled,modelled,visualized,visualised,trained,fine-tuned,evaluated,applied,solved,cleaned,processed,extracted,queried').split(','));

  const WEAK = [
    [/\bresponsible for\b/i, 'Starts with a duty, not an achievement. Say what you did and what changed: "Built X that did Y".'],
    [/\bduties (included|include)\b/i, 'A list of duties says nothing about results. Name one thing you delivered.'],
    [/\bworked (on|with|in)\b/i, '"Worked on" hides your part. Use a precise verb: built, tested, designed, fixed.'],
    [/\b(helped|assisted)( (with|in|to))?\b/i, '"Helped" hides your part. Say what you personally did.'],
    [/\b(involved|participated) in\b/i, '"Involved in" does not say what you did. Name your action.'],
    [/\b(various|several|many|etc\.?)\b/i, 'Vague words ("various", "etc.") waste space. Name the actual things.'],
    [/\b(hard-?working|team player|quick learner|passionate|dedicated|sincere|self-motivated)\b/i, 'Self-praise is not evidence. Show it with a project, number or result.']
  ];

  const GENERIC_JD_WORDS = new Set(('about,above,ability,able,across,after,also,and,are,applicants,candidate,candidates,company,description,duties,etc,experience,from,have,help,including,job,looking,must,need,our,per,position,preferred,required,requirements,responsibilities,role,skills,strong,team,that,the,their,this,through,using,will,with,work,working,years,your,you,knowledge,good,excellent,understanding,plus,bonus,least,minimum,opportunity,benefits,salary,apply,join,environment,projects,other,related,such,able,across').split(','));

  const SKILLS = ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
    'react', 'react native', 'angular', 'vue', 'node.js', 'node', 'express', 'django', 'flask', 'spring boot', 'spring', 'next.js', 'html', 'css', 'tailwind', 'bootstrap',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'firebase', 'graphql', 'rest api', 'rest', 'grpc', 'kafka', 'rabbitmq', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'linux', 'bash', 'git', 'github', 'gitlab',
    'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'machine learning', 'deep learning', 'nlp', 'data analysis', 'data structures', 'algorithms', 'system design', 'microservices', 'agile', 'scrum', 'oop',
    'android', 'ios', 'flutter', 'selenium', 'cypress', 'jest', 'junit', 'pytest', 'excel', 'power bi', 'tableau', 'figma'];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const has = (hay, term) => new RegExp('(^|[^a-z0-9+#])' + esc(term) + '($|[^a-z0-9+#])', 'i').test(hay);
  const clip = (s, n = 110) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  function lines(text) {
    return String(text || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  }

  /** Looks for the words a human would expect in a readable resume. Scanned pages and broken PDF fonts fail. */
  function readability(text) {
    const t = String(text || '');
    const reasons = [];
    const visible = t.replace(/\s/g, '');
    if (visible.length < 40) return { ok: false, reasons: ['There is almost no text to read.'] };
    const letters = (visible.match(/[A-Za-z]/g) || []).length;
    const odd = (visible.match(/[^A-Za-z0-9.,;:'"()\-–—/&@+#%!?[\]|•·*_\\‘’“”]/g) || []).length;
    const toks = t.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 1);
    const common = new Set(('the,and,of,to,in,for,with,a,on,at,as,by,is,was,were,from,using,built,developed,designed,experience,education,project,projects,skills,university,college,engineering,software,technical,team,work,data,application,system,intern,internship,certification,summary,objective,bachelor,technology,science,computer,java,python,web,sql,api').split(','));
    const hits = toks.filter((w) => common.has(w)).length;
    const ratio = toks.length ? hits / toks.length : 0;
    if (letters / visible.length < 0.6) reasons.push('Most characters are not letters.');
    if (odd / visible.length > 0.12) reasons.push('Many unreadable symbols, which usually means the PDF font could not be decoded.');
    if (toks.length > 30 && ratio < 0.06) reasons.push('Almost none of the words are ordinary English words.');
    return { ok: reasons.length === 0, reasons };
  }

  function findSections(ls) {
    return HEADINGS.map((h) => {
      const idx = ls.findIndex((l) => l.length <= 42 && !/[.!?]$/.test(l) && h.re.test(l.replace(/[:\-–—_|•*#]+$/g, '').replace(/^[•*#\-–—\s]+/, '').trim()));
      return { key: h.key, label: h.label, need: h.need, found: idx >= 0, index: idx, line: idx >= 0 ? ls[idx] : '' };
    });
  }

  function hasMetric(line) {
    const stripped = line.replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, ' ').replace(/\b\d{10}\b/g, ' ');
    return /\d/.test(stripped);
  }

  function startsWithVerb(line) {
    const first = line.replace(/^[•\-–—*▪●◦·\s]+/, '').split(/\s+/)[0].toLowerCase().replace(/[^a-z-]/g, '');
    return VERBS.has(first) || (first.length > 4 && /ed$/.test(first) && !/^(need|speed|seed|feed|embed)/.test(first));
  }

  function bulletLines(ls) {
    // lines that read like achievements: a bullet mark, or a sentence of at least 6 words that is not a heading
    return ls.filter((l) => {
      if (l.length > 42 || /[.!?]$/.test(l) || l.split(/\s+/).length >= 6) {
        if (HEADINGS.some((h) => h.re.test(l.trim()))) return false;
        return /^[•\-–—*▪●◦·]/.test(l) || l.split(/\s+/).length >= 6;
      }
      return false;
    }).filter((l) => !/@|linkedin\.com|github\.com|^\+?\d[\d\s-]{8,}$/i.test(l) && !/^(skills?|languages?|tools|technologies|frameworks?|databases?)\s*[:-]/i.test(l.replace(/^[•\-–—*▪●◦·\s]+/, '')));
  }

  function analyze(text, opts = {}) {
    const t = String(text || '');
    const tl = t.toLowerCase();
    const ls = lines(t);
    const words = t.split(/\s+/).filter(Boolean).length;
    const readable = readability(t);
    const out = { readable, words, fixes: [], jd: null };
    if (!readable.ok) return out;

    // ---- contact
    const contact = {
      email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(t),
      phone: /(\+?\d{1,3}[\s-]?)?(\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,6}/.test(t.replace(/\b(19|20)\d{2}\s*[-–]\s*(19|20)?\d{2}\b/g, '')) && /\b\d[\d\s-]{8,}\d\b/.test(t),
      linkedin: /linkedin\.com\/(in|pub)\//i.test(t) || /\blinkedin\b/i.test(t),
      github: /github\.com\/[A-Za-z0-9-]+/i.test(t) || /\bgithub\b/i.test(t),
      link: /https?:\/\/|www\./i.test(t)
    };

    // ---- sections, from heading lines
    const sections = findSections(ls);
    const sec = (k) => sections.find((s) => s.key === k);

    // ---- bullets
    const bl = bulletLines(ls);
    const verbOk = bl.filter(startsWithVerb);
    const metricOk = bl.filter(hasMetric);
    const longOnes = bl.filter((l) => l.split(/\s+/).length > 32);
    const weak = [];
    for (const l of bl) { for (const [re, why] of WEAK) { if (re.test(l)) { weak.push({ line: l, why }); break; } } }
    const pronouns = bl.filter((l) => /\b(i|my|me)\b/i.test(l));
    const bullets = { total: bl.length, verb: verbOk.length, metric: metricOk.length, long: longOnes.length, weak: weak.length, pronouns: pronouns.length };

    // ---- fresher essentials
    const fresher = {
      cgpa: /\b(cgpa|gpa|percentage|aggregate|score)\b[^\n]{0,20}\d/i.test(t) || /\b\d(\.\d{1,2})?\s*\/\s*10\b/.test(t) || /\b\d{2}(\.\d+)?\s*%/.test(t),
      projects: ls.filter((l) => /^(project|projects)\b/i.test(l)).length ? Math.max(1, bl.filter((l) => /\b(built|developed|designed|created|implemented)\b/i.test(l)).length) : 0
    };

    // ---- skills and role gap
    const skills = SKILLS.filter((s) => has(tl, s));
    // keys of the target role whose names and synonyms never appear in the resume
    let roleMissing = [];
    if (opts.role && typeof ROLE_POOL_KEYS !== 'undefined' && typeof SKILL_POOL !== 'undefined' && ROLE_POOL_KEYS[opts.role]) {
      roleMissing = ROLE_POOL_KEYS[opts.role].filter((k) => ![k, ...(SKILL_POOL[k] || [])].some((syn) => has(tl, String(syn).toLowerCase()))).slice(0, 8);
    }

    // ---- length
    const lengthStatus = words < 150 ? 'very short' : words < 300 ? 'short' : words <= 800 ? 'good' : 'long';

    // ---- job description match
    if (opts.jd && opts.jd.trim().length > 40) {
      const jl = opts.jd.toLowerCase();
      const terms = new Set(SKILLS.filter((s) => has(jl, s)));
      const freq = {};
      (jl.match(/[a-z][a-z+#.]{3,}/g) || []).forEach((w) => { w = w.replace(/\.$/, ''); if (!GENERIC_JD_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1; });
      Object.entries(freq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([w]) => terms.add(w));
      const list = [...terms];
      const matched = list.filter((w) => has(tl, w));
      out.jd = { pct: list.length ? Math.round((matched.length / list.length) * 100) : 0, matched, missing: list.filter((w) => !has(tl, w)).slice(0, 15), total: list.length };
    }

    // ---- fixes: most important first
    const fixes = [];
    const add = (severity, title, why, how, line) => fixes.push({ severity, title, why, how, ...(line ? { line: clip(line) } : {}) });
    if (!contact.email) add('high', 'No email address found', 'Recruiters and automated systems need a way to reach you.', 'Add a professional email (name@domain) in the header.');
    if (!contact.phone) add('high', 'No phone number found', 'Many companies call shortlisted candidates.', 'Add your mobile number in the header.');
    for (const s of sections) {
      if (!s.found && s.need === 'high' && !(s.key === 'projects' && sec('experience').found)) add('high', `No "${s.label}" section heading`, 'Applicant tracking systems look for standard headings to sort your information.', `Add a heading line called "${s.key === 'skills' ? 'Skills' : s.label.split(' / ')[0]}" on its own line.`);
    }
    if (!sec('experience').found && !sec('projects').found) add('high', 'No Experience or Projects section', 'With no experience yet, projects are the proof that you can build things.', 'Add a "Projects" section with 2 to 4 projects: what it does, the tech used and one result.');
    if (bullets.total >= 3 && bullets.metric / bullets.total < 0.3) {
      const sample = bl.find((l) => !hasMetric(l));
      add('high', `Only ${bullets.metric} of ${bullets.total} lines contain a number`, 'Numbers (users, percent, time saved, tests, size) turn claims into evidence.', 'Add one measurable result to each project or job line. If you truly have no number, state the scale: "for 200 students", "5 API endpoints".', sample);
    }
    if (!contact.github && !contact.linkedin) add('medium', 'No GitHub or LinkedIn link', 'For tech roles, recruiters check your code and profile.', 'Add your GitHub and LinkedIn links in the header.');
    else if (!contact.github) add('medium', 'No GitHub link', 'Code is the strongest proof for a software role.', 'Add your GitHub profile link, and link the best project.');
    else if (!contact.linkedin) add('low', 'No LinkedIn link', 'Many recruiters search LinkedIn first.', 'Add your LinkedIn profile link in the header.');
    if (bullets.total >= 3 && bullets.verb / bullets.total < 0.5) {
      const sample = bl.find((l) => !startsWithVerb(l));
      add('medium', `Only ${bullets.verb} of ${bullets.total} lines start with an action verb`, 'Lines that start with a strong verb are quicker to scan and sound more confident.', 'Start each line with a past-tense verb: Built, Designed, Reduced, Led, Tested.', sample);
    }
    weak.slice(0, 3).forEach((w) => add('medium', 'Weak phrase', w.why, 'Rewrite the line: verb + what you did + result.', w.line));
    if (!fresher.cgpa && sec('education').found) add('medium', 'No CGPA or percentage found', 'For freshers, campus recruiters shortlist on marks.', 'Write your CGPA or percentage next to each degree, for example "CGPA: 8.4/10".');
    if (skills.length < 6) add('medium', `Only ${skills.length} technical skill${skills.length === 1 ? '' : 's'} recognised`, 'Systems match keywords, so missing tools means missed matches.', 'List the languages, frameworks, databases and tools you have actually used under Skills.');
    if (roleMissing.length) add('medium', `Missing role keywords for ${opts.role}`, 'These are tools this role usually asks for that your resume does not mention.', `Only if you really know them, add: ${roleMissing.join(', ')}. Otherwise treat them as your learning list.`);
    if (lengthStatus === 'very short') add('medium', `Very short (${words} words)`, 'There is not enough detail to judge your work.', 'Add projects, internships, coursework and achievements with details.');
    if (lengthStatus === 'long') add('low', `Long (${words} words)`, 'Recruiters spend seconds on a resume. Freshers should fit one page.', 'Trim to your strongest 3 to 4 items per section.');
    if (bullets.long > 0) add('low', `${bullets.long} very long line${bullets.long === 1 ? '' : 's'} (over 32 words)`, 'Long lines are skipped.', 'Split each into two short lines, one idea each.', longOnes[0]);
    if (bullets.pronouns > 0) add('low', 'First-person words (I, my, me)', 'Resumes are written without "I".', 'Remove I/my/me: "Built a chat app" instead of "I built my chat app".', pronouns[0]);
    if (!sec('summary').found && words > 200) add('low', 'No short summary at the top', 'Two lines can tell a recruiter your target role and strongest skill.', 'Add a 2-line summary: role you want, key skills, one highlight.');
    const order = { high: 0, medium: 1, low: 2 };
    fixes.sort((a, b) => order[a.severity] - order[b.severity]);
    out.fixes = fixes;
    Object.assign(out, { contact, sections, bullets, fresher, skills, roleMissing, lengthStatus });
    return out;
  }

  /** A plain-text version of the report, for copying or downloading. */
  function report(text, result, insights, opts = {}) {
    const L = [];
    L.push('RESUME REPORT (PlacementPrep)');
    if (opts.role) L.push(`Target role: ${opts.role}`);
    if (!insights.readable.ok) { L.push('', 'Could not read this resume: ' + insights.readable.reasons.join(' ')); return L.join('\n'); }
    L.push(`ATS-style score: ${result.score}/100 (${insights.words} words)`, '');
    L.push('FIXES, most important first');
    insights.fixes.forEach((f, i) => { L.push(`${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`, `   Why: ${f.why}`, `   Fix: ${f.how}`); if (f.line) L.push(`   Line: ${f.line}`); });
    if (insights.jd) L.push('', `JOB DESCRIPTION MATCH: ${insights.jd.pct}%`, `Matched: ${insights.jd.matched.join(', ') || 'none'}`, `Missing: ${insights.jd.missing.join(', ') || 'none'}`);
    L.push('', 'SECTIONS: ' + insights.sections.map((s) => `${s.label} ${s.found ? 'yes' : 'no'}`).join(' | '));
    L.push('CONTACT: ' + ['email', 'phone', 'linkedin', 'github'].map((k) => `${k} ${insights.contact[k] ? 'yes' : 'no'}`).join(' | '));
    return L.join('\n');
  }

  return { analyze, readability, report, hasMetric, startsWithVerb, HEADINGS, SKILLS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ResumeInsights;
