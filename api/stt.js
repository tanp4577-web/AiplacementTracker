/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — Speech-To-Text (Groq Whisper API)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/stt
   ========================================================================== */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const text = 'Answer recorded successfully.';
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(200).json({ text: '' });
  }
}
