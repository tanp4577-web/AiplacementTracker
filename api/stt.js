/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — Speech-to-Text (Groq Whisper)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/stt
   Body:     multipart/form-data with an 'audio' file field
   Response: { text: string }
   Protected by api/_lib/guard.js. Audio is capped at 4 MB (Vercel's request
   body limit is 4.5 MB).
   ========================================================================== */
import { guard, send } from './_lib/guard.js';

export const config = {
  api: {
    bodyParser: false
  }
};

const MAX_AUDIO_BYTES = 4_000_000;
const ALLOWED_EXTENSIONS = new Set(['webm', 'wav', 'mp3', 'm4a', 'ogg', 'mp4', 'mpeg']);

class TooLargeError extends Error {}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new TooLargeError('Audio too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Only ever send Groq a filename made of safe characters and a known extension. */
function safeFilename(raw) {
  const base = String(raw || 'audio.webm').split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 60);
  const ext = (base.split('.').pop() || '').toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? base : 'audio.webm';
}

function safeMimeType(raw) {
  const m = String(raw || '').trim().toLowerCase();
  return /^audio\/[a-z0-9.+-]+$/.test(m) || m === 'video/webm' || m === 'video/mp4' ? m : 'audio/webm';
}

export function extractFileFromBody(buffer, contentType) {
  const boundary = (contentType.split('boundary=')[1] || '').split(';')[0].trim().replace(/^"|"$/g, '');
  if (!boundary) return null;

  const body = buffer.toString('binary');
  const parts = body.split('--' + boundary);

  for (const part of parts) {
    if (part.includes('name="audio"')) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const fileData = part.slice(headerEnd + 4);
      const trimmed = fileData.endsWith('\r\n') ? fileData.slice(0, -2) : fileData;

      const filenameMatch = part.match(/filename="([^"]+)"/);
      const ctMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
      return {
        data: Buffer.from(trimmed, 'binary'),
        filename: safeFilename(filenameMatch ? filenameMatch[1] : ''),
        mimeType: safeMimeType(ctMatch ? ctMatch[1] : '')
      };
    }
  }
  return null;
}

export default async function handler(req, res) {
  const ctx = await guard(req, res, {
    route: 'stt',
    maxBodyBytes: MAX_AUDIO_BYTES + 100_000,
    limit: { max: 30, windowSec: 600 },
    globalDaily: 2000
  });
  if (!ctx) return;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return send(res, 503, { error: 'Speech-to-text is not configured.' });

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return send(res, 400, { error: 'Expected multipart/form-data with an audio file.' });
  }

  try {
    const rawBody = await readBody(req, MAX_AUDIO_BYTES + 100_000);
    const file = extractFileFromBody(rawBody, contentType);
    if (!file || !file.data.length) return send(res, 400, { error: 'No audio file found in the request.' });
    if (file.data.length > MAX_AUDIO_BYTES) return send(res, 413, { error: 'Audio too large' });

    const boundary = '----GroqSTTBoundary' + Date.now();
    const field = (name, value) =>
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`, 'binary');

    const requestBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`,
        'binary'
      ),
      file.data,
      Buffer.from('\r\n', 'binary'),
      field('model', 'whisper-large-v3-turbo'),
      field('language', 'en'),
      field('response_format', 'json'),
      Buffer.from(`--${boundary}--\r\n`, 'binary')
    ]);

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: requestBody
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Groq Whisper HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = (data.text || '').trim();
    if (!text) return send(res, 200, { text: '', warning: 'No speech detected in the audio.' });
    return send(res, 200, { text });
  } catch (e) {
    if (e instanceof TooLargeError) return send(res, 413, { error: 'Audio too large' });
    console.error('STT API error:', e.message);
    return send(res, 502, { error: 'Speech transcription failed. Please try again.' });
  }
}
