/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — Text-to-Speech placeholder
   ----------------------------------------------------------------------------
   Endpoint: POST /api/tts     Body: { text: string, voice?: string }

   Edge-TTS is a Python service and cannot run on Vercel's Node runtime, so on
   Vercel this always answers 503 and the client falls back to the browser's
   SpeechSynthesis. When running the local Flask server, set
   window.EDGE_TTS_URL = 'http://localhost:5000/tts' to bypass this endpoint.
   ========================================================================== */
import { guard, getBody, clampText, send } from './_lib/guard.js';

export default async function handler(req, res) {
  const ctx = await guard(req, res, {
    route: 'tts',
    maxBodyBytes: 20_000,
    limit: { max: 60, windowSec: 600 }
  });
  if (!ctx) return;

  const text = clampText(getBody(req).text, 5000);
  if (!text) return send(res, 400, { error: 'Text is required for speech synthesis.' });

  return send(res, 503, {
    error: 'Server-side TTS is not available on this deployment. The browser will use native SpeechSynthesis instead.',
    fallback: 'browser-speechsynthesis'
  });
}
