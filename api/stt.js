import fs from 'node:fs';
import formidable from 'formidable';
import Groq from 'groq-sdk';

export const config = {
  api: {
    bodyParser: false
  }
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 25 * 1024 * 1024
    });
    form.parse(req, (error, fields, files) => {
      if (error) return reject(error);
      resolve({ fields, files });
    });
  });
}

function firstFile(files) {
  const candidate = files.audio || files.file || files.recording;
  if (Array.isArray(candidate)) return candidate[0];
  if (candidate) return candidate;
  const values = Object.values(files || {}).flat();
  return values[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is missing.' });
  }

  try {
    const { files } = await parseMultipart(req);
    const audioFile = firstFile(files);
    if (!audioFile || !audioFile.filepath) {
      return res.status(400).json({ error: 'An audio file is required.' });
    }

    const groq = new Groq({ apiKey });
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: 'whisper-large-v3',
      response_format: 'text',
      language: 'en'
    });
    const text = typeof transcription === 'string'
      ? transcription
      : (transcription && transcription.text) || '';
    return res.status(200).json({ text });
  } catch (error) {
    console.error('Groq Whisper transcription failed:', error);
    return res.status(500).json({
      error: 'Audio transcription failed.',
      detail: error.message || 'unknown error'
    });
  }
}
