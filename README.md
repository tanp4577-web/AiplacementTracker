# PlacementPrep

PlacementPrep is a browser-based placement preparation portal with a live HR interview simulator.

## Interview voice

The interviewer uses browser Web Speech API recognition and the local Flask service's Edge-TTS voice for spoken replies. Edge-TTS has no application-level character quota. If the Flask service is unavailable, the browser falls back to SpeechSynthesis. Chrome or Edge is recommended.

The Gemini interview route is configured with:

```text
LLM_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` is supported as a fallback for `LLM_API_KEY`. When the server or Gemini is unavailable, the client falls back to Pollinations and then its local interview brain.

Use HTTPS, or `http://localhost`, for camera and microphone permissions.

## Local recording collector

The Flask service in `app.py` provides both Edge-TTS at `http://localhost:5000/tts` and interview recording uploads at `http://localhost:5000/upload-proof`.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
python app.py
```
