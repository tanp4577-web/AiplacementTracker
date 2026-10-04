import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bootApp, goTo, tick } from './app-harness.js';

const require = createRequire(import.meta.url);
const { loadScript } = require('../tools/coding-bank/load.cjs');
const ResumeInsights = loadScript('js/resume-insights.js', 'ResumeInsights');

const text = (el, n = 6000) => (el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, n) : '');

/** What a PDF with an undecodable font looks like once a naive reader has "extracted" it: random symbols. */
const GARBLED = (() => {
  let seed = 7;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
  const chars = '!"#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~';
  return Array.from({ length: 900 }, () => (next() % 5 === 0 ? ' ' : chars[next() % chars.length])).join('');
})();

const GOOD = `Asha Verma
asha.verma@example.com | +91 98765 43210 | linkedin.com/in/ashaverma | github.com/ashaverma

Summary
Final-year computer science student looking for a backend developer role.

Education
B.Tech Computer Science, Example Institute of Technology, 2021 - 2025
CGPA: 8.4/10

Projects
Built a REST API in Node.js and PostgreSQL that served 1,200 requests per minute in load tests.
Designed a React dashboard used by 150 students to track placement preparation.
Reduced page load time by 35% by adding Redis caching to a Django service.
Developed a chat application with WebSockets and Docker for 40 concurrent users.

Skills
JavaScript, Python, Java, SQL, React, Node.js, Django, PostgreSQL, Redis, Docker, Git, AWS

Certifications
AWS Cloud Practitioner`;

const WEAK = `Ravi Kumar
Ravi is a hardworking and passionate fresher.

Experience
Responsible for various tasks in the team.
Worked on a website for the college.
I helped with testing of my project.

Skills
Python`;

/* ------------------------------------------------------------------ can it be read? */

test('resume insights: garbled text from a broken PDF is refused, and ordinary resumes are accepted', () => {
  const bad = ResumeInsights.readability(GARBLED);
  assert.equal(bad.ok, false);
  assert.ok(bad.reasons.length >= 1);
  assert.equal(ResumeInsights.readability('').ok, false);
  assert.equal(ResumeInsights.readability('too short').ok, false);
  assert.equal(ResumeInsights.readability(GOOD).ok, true);
  assert.equal(ResumeInsights.readability(WEAK).ok, true);
  assert.equal(ResumeInsights.analyze(GARBLED).fixes.length, 0, 'no advice is invented for unreadable text');
});

/* ------------------------------------------------------------------ findings */

test('resume insights: a complete fresher resume has contact, sections, numbers and few fixes', () => {
  const r = ResumeInsights.analyze(GOOD);
  assert.deepEqual({ ...r.contact }, { email: true, phone: true, linkedin: true, github: true, link: false });
  assert.deepEqual([...r.sections.filter((s) => s.found).map((s) => s.key)], ['summary', 'education', 'projects', 'skills', 'certs']);
  assert.equal(r.fresher.cgpa, true);
  assert.equal(r.bullets.metric, 4, 'every project line has a number');
  assert.equal(r.bullets.verb, 4, 'and starts with a verb');
  assert.ok(r.skills.includes('react') && r.skills.includes('docker'));
  assert.deepEqual([...r.fixes.filter((f) => f.severity === 'high')], [], 'nothing important is missing');
});

test('resume insights: a weak resume gets specific fixes, ordered by importance, quoting the lines they are about', () => {
  const r = ResumeInsights.analyze(WEAK + '\nThis resume has a few lines of text so that it can be read as a normal document for the check.');
  const titles = r.fixes.map((f) => f.title);
  assert.ok(titles.includes('No email address found'));
  assert.ok(titles.includes('No phone number found'));
  assert.ok(titles.some((t) => /No "Education" section/.test(t)));
  assert.ok(titles.includes('Weak phrase'));
  assert.ok(titles.includes('First-person words (I, my, me)'));
  const order = { high: 0, medium: 1, low: 2 };
  assert.deepEqual([...r.fixes.map((f) => order[f.severity])], [...r.fixes.map((f) => order[f.severity])].sort(), 'high before medium before low');
  const weak = r.fixes.filter((f) => f.title === 'Weak phrase');
  assert.ok(weak.some((f) => /Responsible for various/.test(f.line)), 'the fix quotes the actual line');
  assert.ok(weak.every((f) => f.why && f.how));
  const noNumbers = r.fixes.find((f) => /contain a number/.test(f.title));
  assert.ok(noNumbers && noNumbers.severity === 'high' && noNumbers.line, 'missing numbers: a high fix that quotes a line');
});

test('resume insights: a number in a date, year or phone number does not count as a measurable result', () => {
  assert.equal(ResumeInsights.hasMetric('Worked at Acme from 2021 to 2023'), false);
  assert.equal(ResumeInsights.hasMetric('Call 9876543210'), false);
  assert.equal(ResumeInsights.hasMetric('Cut build time by 40%'), true);
  assert.equal(ResumeInsights.hasMetric('Mentored 12 students'), true);
  assert.equal(ResumeInsights.startsWithVerb('• Built a compiler'), true);
  assert.equal(ResumeInsights.startsWithVerb('Responsible for tasks'), false);
  assert.equal(ResumeInsights.startsWithVerb('Led a team of 4'), true);
});

test('resume insights: a job description is matched on real keywords, and a report is produced as text', () => {
  const jd = 'We need a backend engineer with Python, Django, PostgreSQL, Kafka and Kubernetes. Python and Django experience required. Kafka streaming a plus. Kubernetes deployments.';
  const r = ResumeInsights.analyze(GOOD, { jd });
  assert.ok(r.jd.matched.includes('python') && r.jd.matched.includes('django') && r.jd.matched.includes('postgresql'));
  assert.ok(r.jd.missing.includes('kafka') && r.jd.missing.includes('kubernetes'));
  assert.equal(r.jd.pct, Math.round((r.jd.matched.length / r.jd.total) * 100));
  assert.equal(ResumeInsights.analyze(GOOD, { jd: 'short' }).jd, null, 'a tiny job description is ignored');
  const rep = ResumeInsights.report(GOOD, { score: 71 }, r, { role: 'Backend Developer' });
  assert.match(rep, /RESUME REPORT/);
  assert.match(rep, /JOB DESCRIPTION MATCH: \d+%/);
  assert.match(rep, /Missing: .*kafka/);
});

/* ------------------------------------------------------------------ the page */

const fire = (app, el, type) => el.dispatchEvent(new app.window.Event(type, { bubbles: true }));

test('resume page: unreadable text gets a plain explanation and NO score', async () => {
  const app = await bootApp();
  await goTo(app, 'resume');
  const ta = app.document.getElementById('resumeText');
  ta.value = GARBLED;
  fire(app, ta, 'input');
  app.document.getElementById('analyzeBtn').click();
  await tick(300);
  const box = app.document.getElementById('resumeUnreadable');
  assert.ok(box, 'an explanation is shown');
  assert.match(text(box), /We cannot read this text/);
  assert.match(text(box), /No score is shown/);
  assert.equal(app.document.getElementById('resumeScoreNum'), null);
  assert.equal(app.run(`(DB.getProgress('guest@local') || {}).resumeScore || 0`), 0, 'nothing saved');
  assert.deepEqual(app.errors, []);
});

test('resume page: a readable resume shows what to fix first, checklists, a job match and a report', async () => {
  const app = await bootApp();
  await goTo(app, 'resume');
  const ta = app.document.getElementById('resumeText');
  ta.value = WEAK + '\n' + 'Padding line so that the text is long enough for the reader to accept it as a real document.';
  fire(app, ta, 'input');
  app.document.getElementById('jdText').value = 'Looking for a Python developer with Django, Docker and Kubernetes. Python and Django are required. Docker is a plus.';
  app.document.getElementById('analyzeBtn').click();
  await tick(300);
  const view = text(app.document.getElementById('viewContainer'));
  assert.match(view, /What to fix first \(\d+\)/);
  assert.match(view, /Fix first/);
  assert.match(view, /No email address found/);
  assert.match(view, /Contact & links/);
  assert.match(view, /Sections found/);
  assert.match(view, /Score Breakdown/);
  assert.match(view, /Skills detected/);
  assert.match(text(app.document.getElementById('resumeHeadline')), /Biggest problems/);
  assert.match(text(app.document.getElementById('jdMatch')), /Missing/);
  assert.match(text(app.document.getElementById('jdMatch')), /django|kubernetes/i);
  assert.ok(app.document.querySelectorAll('.resume-fix').length === 5, 'the top five are shown first');
  app.document.getElementById('toggleFixes').click();
  assert.ok(app.document.querySelectorAll('.resume-fix').length > 5, 'then all of them');
  assert.ok(Number(app.run(`DB.getProgress('guest@local').resumeScore`)) > 0, 'the score is saved for the dashboard');
  assert.match(app.run('Resume._reportText()'), /RESUME REPORT/);

  app.document.getElementById('clearResumeBtn').click();
  await tick(100);
  assert.equal(app.document.getElementById('resumeText').value, '');
  assert.deepEqual(app.errors, []);
});

test('resume page: an unreadable PDF is explained, the box is left alone, and a text file loads', async () => {
  const app = await bootApp();
  await goTo(app, 'resume');
  const ta = app.document.getElementById('resumeText');
  ta.value = 'my existing text should stay when a bad file is chosen';
  const fakeFile = (name, bytes) => ({ name, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  const enc = (s) => new TextEncoder().encode(s);
  app.window.__bad = fakeFile('cv.pdf', enc('%PDF-1.4\n' + GARBLED));
  app.window.__good = fakeFile('cv.txt', enc(GOOD));
  await app.run('Resume._handleFile(window.__bad)');
  const note = text(app.document.getElementById('resumeFileNote'));
  assert.match(note, /We could not read text from cv\.pdf/);
  assert.match(note, /scanned image|font/);
  assert.equal(ta.value, 'my existing text should stay when a bad file is chosen', 'noise is never put in the box');
  await app.run('Resume._handleFile(window.__good)');
  assert.match(text(app.document.getElementById('resumeFileNote')), /Read cv\.txt/);
  assert.match(ta.value, /Asha Verma/);
  assert.match(text(app.document.getElementById('viewContainer')), /What to fix first/);
  assert.deepEqual(app.errors, []);
});

test('resume page: the score agrees with the findings (a short resume with no contact details is not "strong")', async () => {
  const app = await bootApp();
  const score = async (resume) => {
    await goTo(app, 'resume');
    const ta = app.document.getElementById('resumeText');
    ta.value = resume;
    app.document.getElementById('analyzeBtn').click();
    await tick(250);
    return { n: Number(text(app.document.getElementById('resumeScoreNum')).replace('%', '')), notes: text(app.document.getElementById('resumeNotes')), view: text(app.document.getElementById('viewContainer')) };
  };
  const longer = GOOD + '\n' + "\nExperience\nBackend intern at Example Labs, June 2024 - August 2024\nBuilt 6 REST endpoints for an internal tool used by 25 engineers and wrote 40 unit tests.\nReduced the nightly report job from 12 minutes to 4 minutes by batching database queries.\nMentored 3 new interns on Git workflow and code review practice during the summer programme.\nAchievements\nRanked in the top 5% of 8000 participants in a national coding contest in 2024 and solved 300 problems.";
  const good = await score(longer);
  const weak = await score(WEAK + '\nThis resume has a few lines of text so that it can be read as a normal document for the check.');
  assert.ok(good.n > weak.n + 20, `good ${good.n} vs weak ${weak.n}`);
  assert.ok(weak.n <= 55, 'a very short resume is capped');
  assert.match(weak.notes, /no email or phone/);
  assert.match(weak.notes, /fewer than 150 words/);
  assert.doesNotMatch(weak.view, /Strong Resume/);
  assert.equal(good.notes, '', 'nothing to adjust for a complete resume');
});
