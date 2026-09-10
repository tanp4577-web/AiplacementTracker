/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — Text-to-Speech (Edge TTS via edge-tts service)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/tts
   Body:     { text: string, voice?: string }
   Response: audio/mpeg binary stream
   
   This endpoint proxies to the local Flask Edge-TTS service when available,
   or falls back to a lightweight browser-side SpeechSynthesis (handled client-side).
   On Vercel, this provides a graceful 503 so the client falls back to browser TTS.
   ========================================================================== */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
        return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    // On Vercel serverless, we cannot run edge-tts (Python).
    // Return 503 so the client gracefully falls back to browser SpeechSynthesis.
    // When running locally with the Flask server, set window.EDGE_TTS_URL to
    // 'http://localhost:5000/tts' to bypass this endpoint entirely.
    return res.status(503).json({
        error: 'Edge TTS is only available when running the local Flask server. The browser will use native SpeechSynthesis instead.',
        fallback: 'browser-speechsynthesis'
    });
}
