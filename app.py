"""Live Interview Recording Collector (Flask)

Receives the video+audio WebM recordings that the browser's LIVE AI
Interviewer silently uploads, and stores them locally for the interviewer.

The frontend (js/interview.js) POSTs multipart form data to:
    POST /upload-proof
      - `video`   : the WebM blob (video + audio)
      - `user_id` : the candidate's (sanitized) email

Privacy note: this is a "proctoring" style capture. Ensure you have the
candidate's explicit consent before using it in a real deployment.
"""

import asyncio
import os
import re
import uuid
from datetime import datetime

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

try:
    import edge_tts
except ImportError:
    edge_tts = None

app = Flask(__name__)
CORS(app)  # allow the browser page (potentially different origin) to POST

# Saved recordings are stored under ./recordings
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "recordings")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_CONTENT_LENGTH = 512 * 1024 * 1024  # 512 MB cap
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH


def sanitize_user_id(value):
    """Keep only safe filename characters for the user_id folder name."""
    if not value:
        return "anonymous"
    return re.sub(r"[^a-zA-Z0-9._-]", "_", str(value))[:80]


@app.route("/upload-proof", methods=["POST"])
def upload_proof():
    """Receive a recorded interview blob and save it to disk."""
    if "video" not in request.files:
        return jsonify({"error": "No 'video' file part in request"}), 400

    video = request.files["video"]
    if not video or not video.filename:
        return jsonify({"error": "Empty file upload"}), 400

    user_id = sanitize_user_id(request.form.get("user_id", "anonymous"))

    # Make a per-user folder so recordings are easy to find.
    user_dir = os.path.join(UPLOAD_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)

    # Keep the original extension if present and safe, else default to .webm.
    ext = os.path.splitext(video.filename)[1].lower()
    if ext not in (".webm", ".mp4", ".mkv", ".ogg"):
        ext = ".webm"

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    unique = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique}{ext}"
    save_path = os.path.join(user_dir, filename)

    try:
        video.save(save_path)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Failed to save file: {exc}"}), 500

    return jsonify({
        "ok": True,
        "saved": True,
        "filename": filename,
        "user_id": user_id,
        "size": os.path.getsize(save_path),
    }), 201


@app.route("/tts", methods=["POST"])
def text_to_speech():
    """Generate an Edge-TTS MP3 for the browser interview voice."""
    if edge_tts is None:
        return jsonify({"error": "Install the edge-tts dependency first."}), 503

    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Text is required."}), 400

    voice = str(payload.get("voice", "en-US-AriaNeural"))
    rate = str(payload.get("rate", "+0%"))

    async def synthesize():
        communicate = edge_tts.Communicate(text, voice=voice, rate=rate)
        audio = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
        return bytes(audio)

    try:
        audio = asyncio.run(synthesize())
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"TTS generation failed: {exc}"}), 502

    return Response(audio, mimetype="audio/mpeg", headers={"Cache-Control": "no-store"})


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "Live Interview Recording Collector",
        "status": "running",
        "endpoint": "/upload-proof",
    })


if __name__ == "__main__":
    # Run on 0.0.0.0 so the browser on any device can reach it via the
    # host's LAN IP. Port 5000 matches the frontend's _uploadEndpoint.
    app.run(host="0.0.0.0", port=5000, debug=True)
