# Fix Pass — Deployment Sync + Verified Gaps Only

Current real status (verified by manual testing on the live URL):

WORKING:
- YouTube Lectures page loads, 42 lecture cards visible, category filters visible, search field visible
- HR Simulator page loads, Start Interview button visible, voice input + camera status shown

NOT WORKING / NOT VERIFIED:
1. Lecture modal does not open in the browser — so video playback cannot even be tested
2. YouTube IFrame API progress tracking is not present in the deployed build at all
3. Automatic lecture completion on video end is unconfirmed
4. One-question-at-a-time AI interview flow is unconfirmed — live deploy requires mic/API access to test, and the live deploy is on an older commit than local
5. Hiring Hub is completely missing from the deployed navigation
6. The deployed HR Simulator is running older code than what exists locally

ROOT CAUSE: the live URL is serving an outdated deployment. Local `main` has newer code that was never pushed live.

## Do this in order. Do not skip to step 2 until step 1 is proven.

### Step 1 — Deployment sync (fix first, verify before touching code)
- Run `git log -1` locally and compare the commit hash to what Vercel shows as currently deployed
- If they differ, tell me exactly why (push failed? build failed? wrong branch connected? env vars missing on Vercel causing a silent fallback build?)
- Trigger a fresh deploy from `main` and paste the actual Vercel build log output — not "it should be deployed now"
- After deploy finishes, give me the live deployment URL + commit hash it's running, so I can independently confirm

### Step 2 — Only after Step 1 is proven, fix these one at a time
For each item below: fix it, run it, and report back using the working / partial / not-started format — no summaries claiming "done."

1. **Lecture modal won't open** — find the actual error (check browser console for the failure, don't guess). Fix the click handler / modal state / z-index / whatever it actually is. Prove it opens by describing what you see in the console/test, not by assumption.
2. **YouTube IFrame API missing** — confirm whether the code exists locally at all. If it doesn't exist, build it (per the earlier YouTubePlayer component spec: track `getCurrentTime()`, wire progress to Supabase, trigger `onEnded`). If it exists locally but isn't in the deployed bundle, that's a Step 1 problem, not a Step 2 problem — don't rebuild something that already works locally.
3. **Auto lecture completion** — depends on #2. Once IFrame API events fire, confirm `onEnded` actually writes a "completed" record for the user + lecture. Show me the actual database write, not just the event firing.
4. **One-question-at-a-time interview flow** — since mic/API access blocks manual browser testing, test this via an automated script or curl against the interview API endpoint directly, feeding it a mock answer and confirming it returns exactly one follow-up question (not a batch, not the whole script). Paste that raw output.
5. **Hiring Hub missing from nav** — check whether the route/component exists in local code at all. If it was built but never added to the nav config, that's a one-line fix — do it and confirm the nav link appears. If it was never built, say so plainly and treat it as new work, not a bug.

## Reporting format for every item
```
Item: <name>
Status: working / partial / not started
Evidence: <actual terminal output, console log, or screenshot description — not a claim>
If partial/not started: <exact blocker>
```

Do not mark anything "working" without evidence attached in that format.
