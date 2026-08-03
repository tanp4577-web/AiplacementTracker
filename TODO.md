# Hand-Drawn Redesign + LIVE AI Fixes + Online Questions

## Status: ✅ Complete

### Part 1: LIVE AI Fixes (js/live-voice.js) ✅
- [x] Silence timer raised 2200ms -> 4000ms for full speech capture
- [x] Continuous speech enabled (`rec.continuous = true`, `autoRestart: true`)
- [x] OpenAI-compatible POST fallback as first online path (was GET-only)
- [x] `_generalReply` enhanced: answers factual questions ("capital of India"), arithmetic, before canned fallback

### Part 2: Hand-Drawn Design System ✅
- [x] CSS tokens updated: paper bg (#fdfbf7), pencil black (#2d2d2d), red marker (#ff4d4d), blue pen (#2d5da1)
- [x] Fonts: Kalam + Patrick Hand added (Google Fonts in index.html)
- [x] Wobbly radii (255px 15px 225px 15px / 15px 225px 15px 255px)
- [x] Hard offset shadows (4px 4px 0px #2d2d2d)
- [x] Core components restyled: sidebar, cards, buttons, inputs, modal, chatbot, monitor, transcript
- [x] Dashboard canvas colors updated to paper palette (bar chart: #ff4d4d, radar: blue pen #2d5da1, text: #6b6b6b)
- [x] Radar chart fill/stroke updated to match hand-drawn aesthetic

### Part 3: Online Question Fetching ✅
- [x] `js/api.js` updated: `fetchCodingQuestions` now returns real questions from lydiahallie/javascript-questions (GitHub raw, CORS-verified)
- [x] Markdown parser (`_parseJsQuestions`) converts GitHub Q&A into coding module schema
- [x] `js/coding.js` wired: `_fetchOnlineQuestions()` merges live questions into local bank on render
- [x] Falls back silently to local bank if network unavailable
- [x] OpenTriviaDB for aptitude questions preserved and working

### Verification
- [x] All JS files pass syntax validation
- [x] Vercel functions (api/chat.js, api/interview-chat.js) configured for Google Gemini
- [x] Offline fallbacks retained for all features

