/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — Gemini Live ephemeral token mint
   ----------------------------------------------------------------------------
   Endpoint: POST /api/gemini-token
   Body:     { model?, systemInstruction?, voiceName?, temperature? }
   Response: { ok: true, url, tokenName, model, expireTime } | { ok: false, error }

   WHY THIS EXISTS
   The LIVE AI interviewer uses the Gemini Live WebSocket for full-duplex
   audio. A browser must never hold the API key, so this function mints an
   ephemeral auth token using the exact v1alpha "auth_tokens" wire format the
   @google/genai SDK uses (verified against v2.22.0 source):

       POST https://generativelanguage.googleapis.com/v1alpha/auth_tokens
       x-goog-api-key: <key>

   The browser then connects DIRECTLY to the Gemini Live WebSocket with that
   token:

       wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage
           .v1alpha.GenerativeService.BidiGenerateContentConstrained
           ?access_token=auth_tokens/<id>

   The whole setup (model, generation config, voice, system instruction) is
   minted INTO the token, so the candidate's microphone audio and the AI's
   voice never pass through this server — only this one POST per session.

   Keys are server-side only: LLM_API_KEY or GEMINI_API_KEY.
   ========================================================================== */

const AUTH_TOKEN_URL = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';
const WS_BASE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
const DEFAULT_LIVE_MODEL = 'gemini-2.0-flash-live-001';

function isoDate(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key is not configured on the server' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const model = (body.model && String(body.model).trim()) ||
    process.env.GEMINI_LIVE_MODEL ||
    DEFAULT_LIVE_MODEL;
  const systemInstruction = (typeof body.systemInstruction === 'string' && body.systemInstruction.trim())
    ? body.systemInstruction.trim()
    : 'You are a professional, warm interviewer conducting a live voice interview.';
  const voiceName = (body.voiceName && String(body.voiceName).trim()) || 'Puck';
  const temperature = Number.isFinite(body.temperature) ? body.temperature : 0.7;

  // The token itself stays usable for the session; new sessions must start
  // within two minutes. 20 uses easily covers one session plus reconnects.
  // NOTE: this matches the SDK's transformed auth_tokens.create wire format —
  // the setup object is NOT nested under "setup"; it sits directly on
  // bidiGenerateContentSetup, and without a fieldMask nothing is locked so the
  // browser may send its own setup message with the same values.
  const payload = {
    uses: 20,
    expireTime: isoDate(20 * 60 * 1000),
    newSessionExpireTime: isoDate(2 * 60 * 1000),
    bidiGenerateContentSetup: {
      model,
      generationConfig: {
        responseModalities: ['AUDIO'],
        temperature,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        }
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: systemInstruction }] }
    }
  };

  let data;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch(AUTH_TOKEN_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });
    clearTimeout(timeout);
    data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const detail = (data && data.error && data.error.message) || `HTTP ${resp.status}`;
      return res.status(502).json({ ok: false, error: `Gemini Live token mint failed: ${detail}` });
    }
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? 'Gemini Live token mint timed out' : ((e && e.message) || 'Network error');
    return res.status(502).json({ ok: false, error: `Gemini Live token mint failed: ${msg}` });
  }

  // v1alpha returns the created resource; the token name is what the WebSocket
  // URL must carry as ?access_token=. Accept the two spellings the API has
  // shipped ("name" on the resource, "token" on the create response).
  const tokenName = String(data.name || data.token || '').trim();
  if (!tokenName) {
    return res.status(502).json({ ok: false, error: 'Gemini Live token mint returned no token' });
  }

  return res.status(200).json({
    ok: true,
    url: `${WS_BASE_URL}?access_token=${encodeURIComponent(tokenName)}`,
    tokenName,
    model,
    expireTime: data.expireTime || null
  });
}