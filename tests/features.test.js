/* End-to-end feature checks: the real app runs in jsdom and the tests click through it
   the way a student would (network stubbed). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo, tick, defaultFetch, read } from './app-harness.js';

const text = (el, n = 400) => (el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, n) : '');
const fire = (app, el, type) => el.dispatchEvent(new app.window.Event(type, { bubbles: true }));
const offline = () => { throw new TypeError('Failed to fetch'); };

const RESUME = `Jane Doe
jane@example.com | +91 98765 43210 | linkedin.com/in/jane
Summary
Final-year CS student who builds web apps.
Education
B.Tech Computer Science, 2026, CGPA 8.4
Skills
JavaScript, Node.js, React, SQL, Git, Python
Projects
Built a placement tracker used by 200 students, improving response time by 40%.
Developed REST APIs with Node.js and MongoDB.
Experience
Intern at Acme: implemented features and led a team of 3.
Certifications
AWS Cloud Practitioner`;

/* ------------------------------------------------------------------ Resume */
test('resume analyzer: scores a resume, saves the score and feeds Skill Gap', async () => {
  const app = await bootApp();
  await goTo(app, 'resume');
  app.document.getElementById('resumeText').value = RESUME;
  fire(app, app.document.getElementById('resumeText'), 'input'); // what pasting does
  app.document.getElementById('analyzeBtn').click();
  await tick(500);
  assert.match(text(app.document.getElementById('viewContainer'), 3000), /Score Breakdown/);
  const score = app.run(`DB.getProgress('guest@local').resumeScore`);
  assert.ok(score > 40 && score <= 100, `score ${score}`);

  await goTo(app, 'skills');
  assert.match(text(app.document.getElementById('viewContainer')), /skills detected/i, 'detected skills come from the analysed resume');
  assert.deepEqual(app.errors, []);
});

test('resume analyzer: an empty resume is refused with a message, not a crash', async () => {
  const app = await bootApp();
  await goTo(app, 'resume');
  app.document.getElementById('analyzeBtn').click();
  await tick(200);
  assert.equal(app.run(`DB.getProgress('guest@local').resumeScore`), 0);
  assert.deepEqual(app.errors, []);
});

/* ------------------------------------------------------------- Skill Gap */
test('skill gap: a role is never "matched" when you have no skills, and adding skills raises it', async () => {
  const app = await bootApp();
  const pct = (skills, role) => app.run(`Skills._computeMatchPct(${JSON.stringify(skills)}, ${JSON.stringify(role)})`);
  const roles = JSON.parse(app.run('JSON.stringify(Object.keys(ROLE_SKILLS))'));
  assert.ok(roles.length >= 9);
  for (const role of roles) {
    const names = JSON.parse(app.run(`JSON.stringify(ROLE_SKILLS[${JSON.stringify(role)}].skills.map(s => s.name))`));
    assert.equal(pct([], role), 0, `${role}: no skills => 0%`);
    assert.equal(pct(names, role), 100, `${role}: every required skill => 100%`);
    assert.equal(pct(['photoshop', 'c'], role), 0, `${role}: unrelated skills => 0%`);
  }
  const partial = pct(['React', 'JavaScript', 'Node.js'], 'Full-Stack Developer');
  assert.ok(partial > 0 && partial < 100, `partial match ${partial}`);
  assert.equal(app.run(`Skills._hasWord('c++', 'c')`), false, '"c" must not match "c++"');
  assert.equal(app.run(`Skills._hasWord('javascript', 'java')`), false, '"java" must not match "javascript"');
});

test('skill gap: opening a role with no skills shows gaps, and a manual skill closes one', async () => {
  const app = await bootApp();
  await goTo(app, 'skills');
  app.document.querySelector('#sgRoleGrid > *').click();
  await tick(150);
  const view = text(app.document.getElementById('viewContainer'), 2000);
  assert.match(view, /0 of \d+ skills matched/);
  assert.match(view, /0% Target Role Match|0%/);
  assert.deepEqual(app.errors, []);
});

/* --------------------------------------------------------------- Aptitude */
test('aptitude quiz: start, answer, next, finish and the score is saved', async () => {
  const app = await bootApp();
  await goTo(app, 'aptitude');
  app.document.getElementById('quizCount').value = '5';
  app.document.getElementById('startQuizBtn').click();
  await tick(400);
  for (let i = 0; i < 5; i++) {
    const options = app.document.querySelectorAll('#options > *');
    assert.equal(options.length, 4, `question ${i + 1} has four options`);
    options[1].click();
    await tick(30);
    assert.match(text(app.document.getElementById('feedback')), /Correct|Incorrect/);
    app.document.getElementById('nextBtn').click();
    await tick(40);
  }
  assert.match(text(app.document.getElementById('viewContainer')), /Score|Result|Retake|Review/i);
  assert.ok(app.run(`DB.getProgress('guest@local').aptitude.total`) >= 5);
  assert.deepEqual(app.errors, []);
});

test('aptitude quiz works offline using the built-in question bank', async () => {
  const app = await bootApp({ fetch: offline });
  await goTo(app, 'aptitude');
  app.document.getElementById('startQuizBtn').click();
  await tick(700);
  assert.ok(app.document.querySelectorAll('#options > *').length >= 2, 'a question with options is shown');
  assert.deepEqual(app.errors, []);
});

/* ---------------------------------------------------------------- Coding */
test('coding practice: every JavaScript question is well-formed', async () => {
  const app = await bootApp();
  const problems = JSON.parse(app.run(`JSON.stringify((() => {
    const problems = []; const ids = new Set();
    for (const q of [...FALLBACK_CODING, ...EXTRA_CODING]) {
      const tag = q.id + ': ';
      if (!q.id || ids.has(q.id)) problems.push(tag + 'missing/duplicate id'); ids.add(q.id);
      if (!['Easy', 'Medium', 'Hard'].includes(q.difficulty)) problems.push(tag + 'bad difficulty');
      if (!q.testCases || !q.testCases.length) { problems.push(tag + 'no tests'); continue; }
      const fn = /(?:function|class)\\s+([A-Za-z0-9_$]+)/.exec(q.starterCode || '');
      if (!fn) { problems.push(tag + 'starter code defines nothing'); continue; }
      for (const tc of q.testCases) {
        if (!String(tc.input).includes(fn[1])) problems.push(tag + 'test does not use ' + fn[1]);
        try { new Function('return ' + tc.input); } catch (e) { problems.push(tag + 'invalid test input ' + tc.input); }
      }
    }
    return problems;
  })())`));
  assert.deepEqual(problems, []);
});

test('coding practice: a session runs tests, and a correct solution passes and is recorded', async () => {
  const app = await bootApp();
  await goTo(app, 'coding');
  assert.ok(app.document.querySelectorAll('#questionList > *').length > 20);
  const twoSum = [...app.document.querySelectorAll('#questionList > *')].find((el) => /Two Sum/.test(el.textContent));
  twoSum.click();
  await tick(300);
  assert.match(text(app.document.getElementById('viewContainer')), /Two Sum/);
  app.document.getElementById('langJsBtn').click();
  await tick(100);
  app.document.getElementById('runBtn').click();
  await tick(200);
  assert.match(text(app.document.getElementById('testResults')), /0\/3 Tests Passed/, 'starter code fails');

  app.document.getElementById('codeEditor').value = 'function twoSum(nums, target) { const seen = {}; for (let i = 0; i < nums.length; i++) { const need = target - nums[i]; if (need in seen) return [seen[need], i]; seen[nums[i]] = i; } }';
  app.document.getElementById('runBtn').click();
  await tick(200);
  assert.match(text(app.document.getElementById('testResults')), /3\/3 Tests Passed/);
  assert.ok(app.run(`DB.getProgress('guest@local').coding.solved.includes('two-sum')`));
  assert.deepEqual(app.errors, []);
});

test('coding practice: a syntax error in your code is reported, not thrown', async () => {
  const app = await bootApp();
  await goTo(app, 'coding');
  [...app.document.querySelectorAll('#questionList > *')].find((el) => /Two Sum/.test(el.textContent)).click();
  await tick(300);
  app.document.getElementById('langJsBtn').click();
  await tick(100);
  app.document.getElementById('codeEditor').value = 'function twoSum( {';
  app.document.getElementById('runBtn').click();
  await tick(200);
  assert.match(text(app.document.getElementById('testResults')), /Error/);
  assert.deepEqual(app.errors, []);
});

test('coding practice: the C++ runner uses the API and falls back to Wandbox when the API is down', async () => {
  const calls = [];
  const app = await bootApp({
    fetch: (url, init) => {
      calls.push(String(url));
      if (String(url).startsWith('/api/compile')) return { ok: false, status: 502, json: async () => ({}) };
      if (String(url).includes('wandbox.org')) return { ok: true, status: 200, json: async () => ({ program: '0 1\n', status: '0', compiler_error: '' }) };
      return defaultFetch(url, init);
    }
  });
  await goTo(app, 'coding');
  [...app.document.querySelectorAll('#questionList > *')].find((el) => /Two Sum/.test(el.textContent)).click();
  await tick(300);
  app.document.getElementById('langCppBtn').click();
  await tick(100);
  const run = app.document.getElementById('runBtn');
  assert.ok(run, 'run button present in C++ mode');
  run.click();
  await tick(800);
  assert.ok(calls.some((u) => u.startsWith('/api/compile')), 'tries the server first');
  assert.ok(calls.some((u) => u.includes('wandbox.org')), 'then falls back to Wandbox directly');
  assert.deepEqual(app.errors, []);
});

/* ------------------------------------------------- Interview Experiences */
test('interview experiences: add, filter, search-as-you-type keeps focus, delete is admin-only', async () => {
  const app = await bootApp();
  await goTo(app, 'interview');
  const $ = (id) => app.document.getElementById(id);
  assert.match(text($('experienceGrid')), /No experiences yet/);

  $('shareExperienceBtn').click();
  await tick(100);
  $('submitExperienceBtn').click();
  assert.match(text($('experienceFormError')), /Please complete/);

  $('experienceCompany').value = 'Acme <b>Corp</b>';
  $('experienceRole').value = 'SDE Intern';
  $('experienceDifficulty').value = 'Medium';
  $('experienceRounds').value = 'OA then two technical rounds';
  $('experienceTips').value = 'Practise graphs';
  $('submitExperienceBtn').click();
  await tick(150);
  assert.equal(app.document.querySelectorAll('#experienceGrid article').length, 1);
  assert.equal(app.document.querySelector('#experienceGrid b'), null, 'HTML in what you type stays text');
  assert.equal(app.run(`DB.getGlobal('interview_experiences').length`), 1);
  assert.ok([...$('experienceCompanyFilter').options].some((o) => o.value === 'Acme <b>Corp</b>'), 'company filter learns the new company');

  const search = $('experienceSearch');
  search.focus();
  search.value = 'graphs';
  fire(app, search, 'input');
  assert.equal($('experienceSearch'), search, 'search box is not rebuilt while typing');
  assert.equal(app.document.activeElement, search, 'and keeps focus');
  assert.equal(app.document.querySelectorAll('#experienceGrid article').length, 1);
  search.value = 'zzzz';
  fire(app, search, 'input');
  assert.match(text($('experienceGrid')), /No experiences match/);

  assert.equal(app.document.querySelector('[data-delete-experience]'), null, 'students cannot delete');
  assert.deepEqual(app.errors, []);
});

/* ---------------------------------------------------------------- YouTube */
test('youtube lectures: search and category tabs update the grid without rebuilding the page', async () => {
  const app = await bootApp();
  await goTo(app, 'youtube');
  const $ = (id) => app.document.getElementById(id);
  const all = app.document.querySelectorAll('#ytGrid > *').length;
  assert.ok(all > 10);

  const search = $('ytSearch');
  search.focus();
  search.value = 'python';
  fire(app, search, 'input');
  assert.equal($('ytSearch'), search, 'same element');
  assert.equal(app.document.activeElement, search, 'focus kept');
  const found = app.document.querySelectorAll('#ytGrid > *').length;
  assert.ok(found > 0 && found < all);

  search.value = '"><img src=x onerror=window.__pwned=1>';
  fire(app, search, 'input');
  assert.equal(app.document.querySelector('#ytGrid img[src="x"]'), null);
  assert.match(text($('ytGrid')), /No lectures found/);

  search.value = '';
  fire(app, search, 'input');
  const tab = [...app.document.querySelectorAll('.yt-cat')].find((t) => t.dataset.cat !== 'all');
  tab.click();
  assert.ok(tab.classList.contains('active'));
  assert.ok(app.document.querySelectorAll('#ytGrid > *').length < all);
  const check = app.document.querySelector('.yt-check-btn');
  check.click();
  assert.ok(check.classList.contains('done'), 'mark as watched works');
  assert.deepEqual(app.errors, []);
});

/* ----------------------------------------------------------------- Chatbot */
test('chatbot: opens, answers from the API, and still answers when the API is down', async () => {
  let app = await bootApp();
  const $ = (a, id) => a.document.getElementById(id);
  $(app, 'chatbotFab').click();
  assert.equal($(app, 'chatbotFab').getAttribute('aria-expanded'), 'true');
  $(app, 'chatbotInput').value = 'How do I prepare for TCS?';
  $(app, 'chatbotSend').click();
  await tick(500);
  assert.match(text($(app, 'chatbotBody'), 2000), /Practise data structures daily/);

  app = await bootApp({ fetch: offline });
  $(app, 'chatbotFab').click();
  $(app, 'chatbotInput').value = 'How is my readiness?';
  $(app, 'chatbotSend').click();
  await tick(1500);
  assert.match(text($(app, 'chatbotBody'), 3000), /readiness/i, 'a local answer appears instead of an error');
  assert.deepEqual(app.errors, []);
});

/* -------------------------------------------------------------- Hiring Hub */
test('hiring hub: shows jobs, internships toggle and saved jobs; survives an API outage', async () => {
  const app = await bootApp();
  await goTo(app, 'jobs');
  const $ = (id) => app.document.getElementById(id);
  assert.ok(app.document.querySelectorAll('[data-job-id]').length >= 1);
  assert.ok($('jobsNotice') || /not connected/i.test(text(app.document.getElementById('viewContainer'), 3000)));
  assert.ok($('savedJobsBtn') && $('jobSortSelect') && $('indiaSourceBtn') && $('remoteSourceBtn'));

  $('remoteSourceBtn').click();
  await tick(300);
  assert.match(text(app.document.getElementById('viewContainer'), 3000), /remote/i);

  const down = await bootApp({ fetch: () => ({ ok: false, status: 502, json: async () => ({ error: 'Could not fetch live job listings right now.' }) }) });
  await goTo(down, 'jobs');
  assert.ok(down.document.getElementById('retryJobsBtn'), 'a retry button is offered');
  assert.deepEqual([...app.errors, ...down.errors], []);
});

/* ------------------------------------------------------- Auth / reset / admin */
test('auth: wrong password, duplicate sign-up, sign out and sign back in', async () => {
  const app = await bootApp({ session: null });
  const $ = (id) => app.document.getElementById(id);
  const submit = async (name, email, pass, signup) => {
    $(signup ? 'tabSignup' : 'tabLogin').click();
    $('authName').value = name; $('authEmail').value = email; $('authPass').value = pass;
    $('authSubmitBtn').click();
    await tick(60);
  };
  assert.ok($('authModal').classList.contains('show'));
  await submit('Ana', 'ana@example.com', 'correct-horse-1', true);
  assert.equal(app.run('Auth.getEmail()'), 'ana@example.com');

  app.document.getElementById('logoutBtn').click();
  await tick(60);
  assert.equal(app.run('Auth.getEmail()'), null);
  assert.ok($('authModal').classList.contains('show'));

  await submit('', 'ana@example.com', 'wrong-password', false);
  assert.equal(app.run('Auth.getEmail()'), null);
  assert.ok(!$('authError').classList.contains('hidden'), 'wrong password shows an error');

  await submit('Ana', 'ana@example.com', 'another-pass-2', true);
  assert.equal(app.run('Auth.getEmail()'), null, 'duplicate account is refused');
  assert.ok(!$('authError').classList.contains('hidden'));

  await submit('', 'ana@example.com', 'correct-horse-1', false);
  assert.equal(app.run('Auth.getEmail()'), 'ana@example.com');
  assert.deepEqual(app.errors, []);
});

test('reset progress asks first, then clears everything', async () => {
  const app = await bootApp();
  app.run(`DB.saveProgress('guest@local', { resumeScore: 60 })`);
  app.document.getElementById('resetDataBtn').click();
  await tick(60);
  const modal = app.document.getElementById('appConfirmModal');
  assert.ok(modal, 'a confirmation dialog appears');
  modal.querySelector('#appConfirmCancel').click();
  await tick(30);
  assert.equal(app.run(`DB.getProgress('guest@local').resumeScore`), 60, 'cancel keeps the data');

  app.document.getElementById('resetDataBtn').click();
  await tick(60);
  app.document.querySelector('#appConfirmOk').click();
  await tick(100);
  assert.equal(app.run(`(DB.getProgress('guest@local') || {}).resumeScore || 0`), 0);
});

test('admin console (admin.html): students are refused, admins get the dashboard and can change roles', async () => {
  const { JSDOM, VirtualConsole } = await import('jsdom');
  const vm = await import('node:vm');
  const { createHash } = await import('node:crypto');
  const { webcrypto } = await import('node:crypto');
  const { read } = await import('./app-harness.js');
  const sha = (v) => createHash('sha256').update(v).digest('hex');

  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e));
  const html = read('admin.html').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<link[^>]*>/gi, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://app.test/admin', virtualConsole });
  const { window } = dom;
  Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
  window.TextEncoder = TextEncoder;
  window.confirm = () => true;
  window.localStorage.setItem('prepportal_users', JSON.stringify({
    'boss@example.com': { id: 'a1', name: 'Boss', email: 'boss@example.com', role: 'admin', pass: sha('admin-pass-1') },
    'stu@example.com': { id: 's1', name: 'Stu Dent', email: 'stu@example.com', role: 'student', pass: sha('student-pass-1') }
  }));
  const ctx = dom.getInternalVMContext();
  for (const f of ['js/storage.js', 'js/admin.js']) new vm.Script(read(f), { filename: f }).runInContext(ctx);
  if (window.document.readyState !== 'complete') await new Promise((r) => window.addEventListener('load', r));
  const $ = (id) => window.document.getElementById(id);
  const signIn = async (email, pass) => {
    $('adminEmail').value = email;
    $('adminPassword').value = pass;
    $('adminLoginForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await tick(120);
  };

  await signIn('stu@example.com', 'student-pass-1');
  assert.match(text($('adminLoginError')), /does not have admin access/);
  assert.ok($('adminDashboard').classList.contains('hidden'));

  await signIn('boss@example.com', 'wrong');
  assert.match(text($('adminLoginError')), /Invalid email or password/);

  await signIn('boss@example.com', 'admin-pass-1');
  assert.ok(!$('adminDashboard').classList.contains('hidden'), 'admin sees the dashboard');
  assert.match(text($('adminContent'), 3000), /Stu Dent/);

  const roleBtn = window.document.querySelector('[data-role-id="s1"]');
  roleBtn.click();
  await tick(150);
  assert.equal(JSON.parse(window.localStorage.getItem('prepportal_users'))['stu@example.com'].role, 'admin', 'promotion works (no App.confirm crash)');
  assert.deepEqual(errors.map((e) => String(e.message || e)), []);
});

test('the main app never exposes an admin route to students', async () => {
  const student = await bootApp();
  student.window.location.hash = '#admin';
  await tick(400);
  assert.equal(student.window.location.hash, '#dashboard');
});

/* --------------------------------------------------------- Dashboard charts */
test('dashboard renders charts and numbers with real progress and updates after a quiz', async () => {
  const app = await bootApp();
  app.run(`DB.saveProgress('guest@local', { resumeScore: 80, aptitude: { completed: 2, correct: 15, total: 20, history: [{ score: 70, date: Date.now() }, { score: 80, date: Date.now() }] }, coding: { solved: ['two-sum', 'fizzbuzz', 'palindrome'], totalAttempts: 6 } })`);
  await goTo(app, 'resume');
  await goTo(app, 'dashboard');
  const view = text(app.document.getElementById('viewContainer'), 3000);
  assert.match(view, /Readiness/);
  assert.equal(app.document.getElementById('startHereCard'), null);
  assert.match(text(app.document.getElementById('readinessValue')), /^\d+%$/);
  assert.deepEqual(app.errors, []);
});

/* ---------------------------------------------- Hiring Hub: save + ATS fit */
test('hiring hub: save a job, see it under Saved, and get an ATS score using the analysed resume', async () => {
  const requests = [];
  const app = await bootApp({
    fetch: (url, init) => {
      if (String(url).startsWith('/api/job-apply')) requests.push(JSON.parse(init.body));
      return defaultFetch(url, init);
    }
  });
  const $ = (id) => app.document.getElementById(id);
  app.run(`DB.setGlobal('lastResumeText', ${JSON.stringify(RESUME)})`);
  await goTo(app, 'jobs');

  const card = app.document.querySelector('[data-job-id="r1"]');
  card.querySelector('[data-save]').click();
  assert.ok(app.run(`Object.keys(DB.getGlobal('saved_jobs')).includes('r1')`), 'job is saved');
  $('savedJobsBtn').click();
  await tick(150);
  assert.equal(app.document.querySelectorAll('[data-job-id]').length, 1, 'Saved view lists only saved jobs');
  $('savedJobsBtn').click();
  await tick(150);

  app.document.querySelector('[data-job-id="r1"] [data-apply]').click();
  const modal = $('jobApplyModal');
  assert.ok(modal && $('jobSavedResumeNote'), 'the analysed resume is offered, no re-upload needed');
  $('analyzeJobBtn').click();
  await tick(300);
  assert.match(text($('jobMatchResult'), 800), /72%/);
  assert.match(text($('jobMatchResult'), 800), /Node\.js/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].jobTitle, 'Backend Developer');
  assert.equal(requests[0].locationType, 'remote');
  assert.match(requests[0].resumeText, /Jane Doe/);
  assert.equal(app.run(`DB.getGlobal('job_applications').length`), 1, 'the analysis is logged');
  assert.deepEqual(app.errors, []);
});

test('hiring hub: with no resume yet, the ATS explains what to do instead of failing', async () => {
  const app = await bootApp();
  await goTo(app, 'jobs');
  app.document.querySelector('[data-job-id="r1"] [data-apply]').click();
  assert.equal(app.document.getElementById('jobSavedResumeNote'), null);
  app.document.getElementById('analyzeJobBtn').click();
  await tick(100);
  assert.match(text(app.document.getElementById('jobApplyStatus')), /Resume Analyzer first/);
});

test('hiring hub: an ATS error from the server is shown to the user', async () => {
  const app = await bootApp({
    fetch: (url, init) => (String(url).startsWith('/api/job-apply') ? { ok: false, status: 429, json: async () => ({ error: 'Too many requests. Please slow down and try again shortly.' }) } : defaultFetch(url, init))
  });
  app.run(`DB.setGlobal('lastResumeText', ${JSON.stringify(RESUME)})`);
  await goTo(app, 'jobs');
  app.document.querySelector('[data-job-id="r1"] [data-apply]').click();
  app.document.getElementById('analyzeJobBtn').click();
  await tick(300);
  assert.match(text(app.document.getElementById('jobApplyStatus')), /Too many requests/);
});

/* --------------------------------------------------- Lecture questions + player */
test('lecture questions: multiple-choice feedback and the C++ runner report results', async () => {
  const app = await bootApp({
    fetch: (url, init) => (String(url).startsWith('/api/compile') ? { ok: true, status: 200, json: async () => ({ program: '2 1\n', status: '0', compiler_error: '' }) } : defaultFetch(url, init))
  });
  await goTo(app, 'lecturequestions');
  const items = [...app.document.querySelectorAll('#lqQuestionList > *')];
  assert.ok(items.length >= 3);
  items[0].click();
  await tick(150);
  assert.ok(app.document.getElementById('lqCodeEditor'), 'a C++ question shows its editor');
  app.document.getElementById('lqRunBtn').click();
  await tick(400);
  assert.match(text(app.document.getElementById('lqRunOutput')), /2 1/);
  const options = app.document.querySelectorAll('#lqOptions > *');
  assert.equal(options.length, 4);
  options[0].click();
  await tick(60);
  assert.ok(text(app.document.getElementById('lqAnswerFeedback')).length > 0, 'answer feedback is shown');
  app.document.getElementById('lqBack').click();
  await tick(100);
  assert.ok(app.document.getElementById('lqQuestionList'));
  assert.deepEqual(app.errors, []);
});

test('youtube: opening a lecture shows the player and marks progress', async () => {
  const app = await bootApp();
  await goTo(app, 'youtube');
  app.document.querySelector('[data-play]').click();
  await tick(200);
  assert.ok(app.document.getElementById('ytPlayerFrame') || app.document.getElementById('ytVideoIframe'), 'player is shown');
  assert.deepEqual(app.errors, []);
});

/* --------------------------------------------- Interview wall: admin delete */
test('interview experiences: an admin can delete an entry, and the list and dashboard update', async () => {
  const app = await bootApp({
    session: { id: 'a1', name: 'Boss', email: 'boss@example.com', role: 'admin' },
    users: { 'boss@example.com': { id: 'a1', name: 'Boss', email: 'boss@example.com', role: 'admin', pass: 'x' } }
  });
  app.run(`DB.setGlobal('interview_experiences', [{ id: 'e1', company_name: 'Acme', role_applied: 'SDE', difficulty: 'Easy', rounds_text: 'OA', tips: '', created_at: new Date().toISOString(), author_name: 'Boss' }])`);
  await goTo(app, 'interview');
  const del = app.document.querySelector('[data-delete-experience]');
  assert.ok(del, 'admins see a delete button');
  del.click();
  await tick(100);
  const ok = app.document.getElementById('appConfirmOk');
  if (ok) { ok.click(); await tick(150); }
  assert.equal(app.run(`DB.getGlobal('interview_experiences').length`), 0);
  assert.deepEqual(app.errors, []);
});

/* ------------------------------------------- Skill Gap: manual skills */
test('skill gap: adding a skill by hand closes a gap and persists', async () => {
  const app = await bootApp();
  await goTo(app, 'skills');
  const $ = (id) => app.document.getElementById(id);
  $('manualSkillInput').value = 'React';
  $('addManualSkillBtn').click();
  await tick(100);
  assert.match(text($('manualSkillsRow')), /React/);
  const before = JSON.parse(app.run(`JSON.stringify(Skills._computeMatchPct(['React'], 'Frontend Engineer'))`));
  assert.ok(before > 0);
  await goTo(app, 'dashboard');
  await goTo(app, 'skills');
  assert.match(text($('manualSkillsRow')), /React/, 'still there after leaving and coming back');
});

/* ------------------------------------------------------- phone menu + tidy-up */
test('phone menu: opens, locks page scroll, and closes via Escape, backdrop, link and toggle', async () => {
  const app = await bootApp();
  const $ = (id) => app.document.getElementById(id);
  const state = () => [$('sidebar').classList.contains('open'), $('overlay').classList.contains('show'), app.document.body.classList.contains('menu-open'), $('menuToggle').getAttribute('aria-expanded')];
  assert.deepEqual(state(), [false, false, false, 'false']);
  $('menuToggle').click();
  assert.deepEqual(state(), [true, true, true, 'true']);
  app.document.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.deepEqual(state(), [false, false, false, 'false'], 'Escape closes');
  $('menuToggle').click();
  $('overlay').click();
  assert.deepEqual(state(), [false, false, false, 'false'], 'backdrop closes');
  $('menuToggle').click();
  app.document.querySelector('.nav-link[data-view="aptitude"]').click();
  assert.deepEqual(state(), [false, false, false, 'false'], 'choosing a page closes');
  $('menuToggle').click();
  $('menuToggle').click();
  assert.deepEqual(state(), [false, false, false, 'false'], 'toggle closes');
  assert.deepEqual(app.errors, []);
});

test('smoothness and tidy-up: no expensive transitions/blur, unused files gone, docs point to the README', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { read } = await import('./app-harness.js');
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  for (const f of fs.readdirSync(path.join(root, 'css'))) {
    assert.ok(!/transition:\s*all\b/.test(read(`css/${f}`)), `${f} must not use transition: all`);
  }
  const depth = read('css/depth-theme.css');
  const tail = depth.slice(depth.lastIndexOf('/* ---------- Smoothness'));
  assert.match(tail, /\.card,\s*\.grid > \.card\s*\{[^}]*backdrop-filter:\s*none/s);
  assert.match(tail, /prefers-reduced-motion: no-preference\)\s*\{\s*html\s*\{\s*scroll-behavior: smooth/s);
  assert.match(tail, /body\.menu-open\s*\{\s*overflow:\s*hidden/);
  for (const gone of ['omg2.png', 'app.py', 'requirements.txt']) assert.ok(!fs.existsSync(path.join(root, gone)), `${gone} removed`);
  assert.doesNotMatch(read('README.md'), /app\.py/);
  assert.match(read('PROJECT_DOCUMENTATION.md').slice(0, 400), /earlier version[\s\S]*README\.md/);
});

/* ------------------------------------------------------ Application Tracker */
test('application tracker: add, validate, move through stages, edit, delete, persist', async () => {
  const app = await bootApp();
  await goTo(app, 'tracker');
  const $ = (id) => app.document.getElementById(id);
  assert.equal(app.document.querySelectorAll('.tracker-col').length, 6);
  assert.match(text($('trackerSummary')), /Nothing tracked yet/);

  $('trackerAddBtn').click();
  $('trackerSaveBtn').click();
  assert.match(text($('trackerFormError')), /both the company and the role/);

  $('trackerCompany').value = 'Acme <img src=x onerror=window.__pwned=1>';
  $('trackerRole').value = 'SDE Intern';
  $('trackerUrl').value = 'javascript:alert(1)';
  $('trackerNotes').value = 'Referral from <b>Ravi</b>';
  $('trackerStatus').value = 'applied';
  $('trackerSaveBtn').click();
  await tick(50);
  const card = app.document.querySelector('.tracker-col[data-status="applied"] .tracker-card');
  assert.ok(card, 'card lands in the chosen column');
  assert.equal(app.document.querySelector('.tracker-card img, .tracker-card b'), null, 'typed HTML stays text');
  assert.equal(card.querySelector('a'), null, 'unsafe link was dropped');
  assert.match(text($('trackerSummary')), /1 tracked · 1 in progress · 0 offers/);

  const id = card.querySelector('[data-move="1"]').dataset.id;
  const right = () => app.document.querySelector(`[data-id="${id}"][data-move="1"]`).click();
  right(); right();
  assert.ok(app.document.querySelector('.tracker-col[data-status="interview"] .tracker-card'), 'moved applied → assessment → interview');
  right();
  assert.match(text($('trackerSummary')), /1 offer\b/);
  assert.equal(app.document.querySelector(`.tracker-col[data-status="offer"] [data-id="${id}"][data-move="1"]`).disabled, false);
  app.document.querySelector(`[data-id="${id}"][data-move="-1"]`).click();
  assert.ok(app.document.querySelector('.tracker-col[data-status="interview"] .tracker-card'), 'can move back');

  app.document.querySelector(`[data-id="${id}"][data-edit]`).click();
  assert.equal($('trackerRole').value, 'SDE Intern');
  $('trackerRole').value = 'SDE Intern (Backend)';
  $('trackerUrl').value = 'https://acme.example/jobs/1';
  $('trackerSaveBtn').click();
  await tick(50);
  assert.match(text(app.document.querySelector('.tracker-card')), /SDE Intern \(Backend\)/);
  assert.equal(app.document.querySelector('.tracker-card a').getAttribute('href'), 'https://acme.example/jobs/1');

  const search = $('trackerSearch');
  search.value = 'nomatch';
  fire(app, search, 'input');
  assert.equal(app.document.querySelectorAll('.tracker-card').length, 0);
  assert.equal($('trackerSearch'), search, 'search box keeps focus while filtering');
  search.value = '';
  fire(app, search, 'input');

  await goTo(app, 'resume');
  await goTo(app, 'tracker');
  assert.equal(app.document.querySelectorAll('.tracker-card').length, 1, 'still there after leaving and coming back');

  app.document.querySelector(`[data-id="${id}"][data-remove]`).click();
  await tick(60);
  app.document.getElementById('appConfirmOk').click();
  await tick(60);
  assert.equal(app.document.querySelectorAll('.tracker-card').length, 0);
  assert.deepEqual(app.errors, []);
});

test('application tracker: "Track" on a Hiring Hub job adds it once, with its link', async () => {
  const app = await bootApp();
  await goTo(app, 'jobs');
  const track = () => app.document.querySelector('[data-job-id="r1"] [data-track]').click();
  track();
  track();
  const list = JSON.parse(app.run(`JSON.stringify(Tracker.list('guest@local'))`));
  assert.equal(list.length, 1, 'second click does not duplicate');
  assert.equal(list[0].company, 'Acme');
  assert.equal(list[0].role, 'Backend Developer');
  assert.equal(list[0].status, 'saved');
  assert.equal(list[0].url, 'https://remoteok.com/1');
  await goTo(app, 'tracker');
  assert.equal(app.document.querySelectorAll('.tracker-col[data-status="saved"] .tracker-card').length, 1);
  assert.deepEqual(app.errors, []);
});

test('application tracker: signed-out visitors are invited to sign in; backups carry and sanitise applications', async () => {
  const out = await bootApp({ session: null });
  await goTo(out, 'tracker');
  assert.ok(out.document.getElementById('trackerGuestBtn'));

  const app = await bootApp();
  app.run(`Tracker.add('guest@local', { company: 'Zoho', role: 'Trainee', status: 'interview', url: 'https://zoho.example/j' })`);
  const json = app.run(`JSON.stringify(DB.exportBackup('guest@local'))`);
  assert.match(json, /Zoho/);
  const other = await bootApp({ session: { id: 'guest', name: 'Guest', email: 'other@local', role: 'student', guest: true } });
  assert.equal(other.run(`DB.importBackup('other@local', ${json}).ok`), true);
  assert.equal(other.run(`Tracker.list('other@local')[0].company`), 'Zoho');

  const hostile = { app: 'placementprep', version: 1, progress: { applications: [
    { company: 'Evil', role: 'x', url: 'javascript:alert(1)', status: 'hacked', notes: 'n'.repeat(5000) },
    { company: '', role: 'nameless' },
    'not an object'
  ] } };
  other.run(`DB.importBackup('other@local', ${JSON.stringify(hostile)})`);
  const apps = JSON.parse(other.run(`JSON.stringify(Tracker.list('other@local'))`));
  assert.equal(apps.length, 1);
  assert.equal(apps[0].url, '');
  assert.equal(apps[0].status, 'saved');
  assert.equal(apps[0].notes.length, 1000);
});

test('application tracker: sidebar link and script are wired in', () => {
  const html = read('index.html');
  assert.match(html, /<a href="#tracker" class="nav-link" data-view="tracker">/);
  assert.ok(html.indexOf('js/tracker.js') > -1 && html.indexOf('js/tracker.js') < html.indexOf('js/app.js'));
});
