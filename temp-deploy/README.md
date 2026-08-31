# PlacementPrep

PlacementPrep is a browser-based placement preparation portal with a live HR interview simulator.

## Interview voice

The interviewer uses the browser Web Speech API for speech recognition and the `/api/tts` Edge-TTS route for spoken replies, with browser SpeechSynthesis as a fallback. Chrome or Edge is recommended.

The Groq interview route is configured with:

```text
GROQ_API_KEY=your_groq_api_key
```

The interviewer uses `llama-3.1-8b-instant` and returns strict JSON internally before speaking the `spoken_response` value. When Groq is unavailable, the client falls back to Pollinations and then its local interview brain.

## Vercel environment variables

Add these in the Vercel project settings for Production (and Preview if needed):

```text
GROQ_API_KEY=your_groq_api_key
```

`GROQ_API_KEY` is required by `/api/interview-chat` and `/api/stt`.

The chatbot and Hiring Hub ATS route use Gemini. Configure one of these key names:

```text
LLM_API_KEY=your_gemini_api_key
```

or:

```text
GEMINI_API_KEY=your_gemini_api_key
```

Optional Gemini settings are `GEMINI_MODEL` and `GEMINI_BASE_URL`; defaults are `gemini-2.0-flash` and `https://generativelanguage.googleapis.com/v1beta`. Do not add `VERCEL_OIDC_TOKEN` to project environment variables; it is a local deployment credential managed by Vercel.

API keys are read only by server-side functions and are never hardcoded in frontend files.

Use HTTPS, or `http://localhost`, for camera and microphone permissions.

## Hiring Hub

The Hiring Hub provides national and regional demo openings. Regional mode uses browser geolocation and shows roles within 600 km when permission is available. Select **Analyze resume** on a listing, upload a PDF, DOCX, TXT, or RTF resume, and the Gemini ATS worker returns a match score, matched skills, missing skills, and three targeted interview questions. **Start targeted interview** sends those questions into the HR Simulator.

The ATS endpoint uses the same server-side Gemini configuration shown above. Resume text is extracted in the browser before it is sent to `/api/job-apply`; the original file is not uploaded or stored by that endpoint.

## Local recording collector

The optional Flask service in `app.py` receives interview recordings at `http://localhost:5000/upload-proof`.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
python app.py
```
