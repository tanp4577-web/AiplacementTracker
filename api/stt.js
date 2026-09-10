/* Copyright (c) 2026. Patent Pending. All Rights Reserved. */
/* ============================================================================
   Vercel Serverless Function — Speech-to-Text (Groq Whisper)
   ----------------------------------------------------------------------------
   Endpoint: POST /api/stt
   Body:     multipart/form-data with 'audio' file field
   Response: { text: string }
   ========================================================================== */

export const config = {
    api: {
        bodyParser: false
    }
};

async function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function extractFileFromBody(buffer, contentType) {
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return null;

    const body = buffer.toString('binary');
    const parts = body.split('--' + boundary);

    for (const part of parts) {
        if (part.includes('name="audio"')) {
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            const fileData = part.slice(headerEnd + 4);
            const trimmed = fileData.endsWith('\r\n') ? fileData.slice(0, -2) : fileData;

            // Determine filename from Content-Disposition
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const filename = filenameMatch ? filenameMatch[1] : 'audio.webm';

            // Determine content type
            const ctMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
            const mimeType = ctMatch ? ctMatch[1].trim() : 'audio/webm';

            return {
                data: Buffer.from(trimmed, 'binary'),
                filename,
                mimeType
            };
        }
    }
    return null;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'GROQ_API_KEY is not configured. STT requires a Groq API key.' });
    }

    try {
        const rawBody = await parseMultipart(req);
        const contentType = req.headers['content-type'] || '';

        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Expected multipart/form-data with an audio file.' });
        }

        const file = extractFileFromBody(rawBody, contentType);
        if (!file || !file.data.length) {
            return res.status(400).json({ error: 'No audio file found in the request.' });
        }

        // Build FormData for Groq Whisper API
        const boundary = '----GroqSTTBoundary' + Date.now();
        const formParts = [];

        // Audio file part
        formParts.push(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
            `Content-Type: ${file.mimeType}\r\n\r\n`
        );
        formParts.push(file.data);
        formParts.push('\r\n');

        // Model part
        formParts.push(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="model"\r\n\r\n` +
            `whisper-large-v3-turbo\r\n`
        );

        // Language part
        formParts.push(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="language"\r\n\r\n` +
            `en\r\n`
        );

        // Response format part
        formParts.push(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="response_format"\r\n\r\n` +
            `json\r\n`
        );

        formParts.push(`--${boundary}--\r\n`);

        // Convert to buffer
        const bodyParts = formParts.map(p => typeof p === 'string' ? Buffer.from(p, 'binary') : p);
        const requestBody = Buffer.concat(bodyParts);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: requestBody
        });
        clearTimeout(timeout);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq Whisper API HTTP ${response.status}: ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        const text = (data.text || '').trim();

        if (!text) {
            return res.status(200).json({ text: '', warning: 'No speech detected in the audio.' });
        }

        return res.status(200).json({ text });
    } catch (e) {
        console.error('STT API Error:', e);
        return res.status(502).json({ error: 'Speech transcription failed: ' + (e.message || 'Unknown error') });
    }
}
