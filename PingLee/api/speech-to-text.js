
const OpenAI = require("openai");
const fs = require('fs');
const os = require('os');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Vercel parses JSON body by default. We expect a base64 string.
        const { audioBase64 } = req.body;
        if (!audioBase64) {
            return res.status(400).json({ error: 'No audio data provided.' });
        }

        // The base64 string might have a data URI prefix, e.g., "data:audio/webm;base64,"
        const base64Data = audioBase64.split(',')[1] || audioBase64;
        const audioBuffer = Buffer.from(base64Data, 'base64');

        // Write to a temporary file in the Vercel serverless environment
        const tempFilename = `recording_${Date.now()}.webm`;
        const tempPath = path.join(os.tmpdir(), tempFilename);
        fs.writeFileSync(tempPath, audioBuffer);

        // Create a read stream for the OpenAI API
        const readStream = fs.createReadStream(tempPath);

        // Call the Whisper API for transcription
        const transcription = await openai.audio.transcriptions.create({
            file: readStream,
            model: "whisper-1",
            language: "zh", // Specify Mandarin Chinese for better accuracy
        });

        // Clean up the temporary file
        fs.unlinkSync(tempPath);

        // Send the transcription back to the client
        res.status(200).json({ transcription: transcription.text });

    } catch (error) {
        console.error('Error with speech-to-text API:', error);
        res.status(500).json({ error: 'Error processing your audio' });
    }
};