import { Communicate } from 'edge-tts-universal';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return res.status(400).json({ error: 'Text is required.' });

    const voice = body.voice === 'en-US-GuyNeural' ? 'en-US-GuyNeural' : 'en-US-AriaNeural';
    const communicate = new Communicate(text, { voice });
    const chunks = [];
    for await (const chunk of communicate) {
      if (chunk && chunk.type === 'audio' && chunk.data) chunks.push(Buffer.from(chunk.data));
    }

    const audio = Buffer.concat(chunks);
    if (!audio.length) throw new Error('Edge-TTS returned no audio.');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (error) {
    console.error('Edge-TTS request failed:', error);
    return res.status(500).json({ error: 'Text-to-speech generation failed.' });
  }
}
