# PlacementPrep

PlacementPrep is a browser-based placement preparation portal with a live HR interview simulator.

## Interview voice

The interviewer uses the browser Web Speech API for speech recognition and SpeechSynthesis for spoken replies. This keeps text-to-speech available without a separate voice subscription or provider-specific character limits. Chrome or Edge is recommended.

The Gemini interview route is configured with:

```text
LLM_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` is supported as a fallback for `LLM_API_KEY`. When the server or Gemini is unavailable, the client falls back to Pollinations and then its local interview brain.

Use HTTPS, or `http://localhost`, for camera and microphone permissions.

## Local recording collector

The optional Flask service in `app.py` receives interview recordings at `http://localhost:5000/upload-proof`.

```powershell
python -m pip install -r requirements.txt
python app.py
```
