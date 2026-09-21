import test from 'node:test';
import assert from 'node:assert/strict';
import { bootApp, goTo } from './app-harness.js';

const VIEWS = {
  dashboard: 'Dashboard',
  resume: 'Resume Analyzer',
  aptitude: 'Aptitude Quiz',
  coding: 'Coding Practice',
  interview: 'Interview Experiences',
  jobs: 'Hiring Hub',
  tracker: 'Application Tracker',
  skills: 'Skill Gap Analysis',
  company: 'Company Patterns',
  youtube: 'YouTube Lectures',
  lecturequestions: 'Lecture Questions'
};

test('every view renders without errors and sets its title', async () => {
  const app = await bootApp();
  for (const [view, title] of Object.entries(VIEWS)) {
    const container = await goTo(app, view);
    assert.ok(container.children.length > 0, `${view}: view is not blank`);
    assert.equal(app.document.getElementById('pageTitle').textContent, title, `${view}: page title`);
    assert.equal(app.document.title, `${title} · PlacementPrep`, `${view}: document title`);
    assert.ok(!/Loading\.\.\./.test(container.textContent), `${view}: still loading`);
  }
  assert.deepEqual(app.errors.map((e) => String(e.message || e)), [], 'no uncaught exceptions in any view');
});
