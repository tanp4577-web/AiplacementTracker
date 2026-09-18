# PlacementPrep

PlacementPrep is a browser-based campus placement preparation portal: resume analysis, aptitude quizzes, coding practice, a hiring hub with an AI resume-match score, skill gap tracking, company interview patterns, and YouTube lecture tracking.

A voice-based chatbot assistant and voice input for coding help use the browser's Web Speech API together with the `/api/tts` and `/api/stt` routes (Chrome or Edge recommended for speech recognition).

## Vercel environment variables

Add these in the Vercel project settings for Production (and Preview if needed):

```text
GROQ_API_KEY=your_groq_api_key
```

`GROQ_API_KEY` is required by `/api/stt` (speech-to-text for the chatbot/coding voice features) and by the chatbot itself.

The Hiring Hub ATS route and aptitude generator use Gemini. Configure one of these key names:

```text
LLM_API_KEY=your_gemini_api_key
```

or:

```text
GEMINI_API_KEY=your_gemini_api_key
```

Optional Gemini settings are `GEMINI_MODEL` and `GEMINI_BASE_URL`; defaults are `gemini-3.5-flash-lite` and `https://generativelanguage.googleapis.com/v1beta`. Do not add `VERCEL_OIDC_TOKEN` to project environment variables; it is a local deployment credential managed by Vercel.

API keys are read only by server-side functions and are never hardcoded in frontend files.

Use HTTPS, or `http://localhost`, for camera and microphone permissions.

## Hiring Hub

The Hiring Hub provides national and regional demo openings. Regional mode uses browser geolocation and shows roles within 600 km when permission is available. Select **Analyze resume** on a listing, upload a PDF, DOCX, TXT, or RTF resume, and the Gemini ATS worker returns a match score, matched skills, and missing skills. Use **View Interview Experiences** to browse real rounds and tips shared by other students.

The ATS endpoint uses the same server-side Gemini configuration shown above. Resume text is extracted in the browser before it is sent to `/api/job-apply`; the original file is not uploaded or stored by that endpoint.

## Local recording collector (optional, currently unused by the UI)

`app.py` is an optional local Flask helper that can receive uploaded recordings at `http://localhost:5000/upload-proof`. Nothing in the current frontend calls this endpoint — it's kept for local/manual use only.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
python app.py
```
