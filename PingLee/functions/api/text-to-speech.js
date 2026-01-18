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
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "nova",
        input: text,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const textErr = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} ${textErr}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("Error with OpenAI Text-to-Speech API (Cloudflare):", error);
    return jsonResponse({ error: "Error generating audio" }, 500);
  }
}
