const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text to synthesize is required.' });
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // A friendly and clear voice
      input: text,
      response_format: "mp3",
    });

    // Set headers to stream the audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.status(200).send(buffer);

  } catch (error) {
    console.error('Error with OpenAI Text-to-Speech API:', error);
    res.status(500).json({ error: 'Error generating audio' });
  }
};