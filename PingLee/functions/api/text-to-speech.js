import OpenAI from "openai";

const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await request.json().catch(() => null);
  const text = body?.text;

  if (!text) {
    return jsonResponse({ error: "Text to synthesize is required." }, 400);
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse({ error: "Server missing OPENAI_API_KEY" }, 500);
  }

  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
      response_format: "mp3",
    });

    const audioBuffer = await mp3.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("Error with OpenAI Text-to-Speech API (Cloudflare):", error);
    return jsonResponse({ error: "Error generating audio" }, 500);
  }
}
