const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const base64ToUint8Array = (input) => {
  const base64 = input.split(",")[1] || input;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const body = await request.json().catch(() => null);
  const audioBase64 = body?.audioBase64;

  if (!audioBase64) {
    return jsonResponse({ error: "No audio data provided." }, 400);
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse({ error: "Server missing OPENAI_API_KEY" }, 500);
  }

  try {
    const bytes = base64ToUint8Array(audioBase64);
    const file = new File([bytes], `recording-${Date.now()}.webm`, { type: "audio/webm" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("language", "zh");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const textErr = await response.text();
      throw new Error(`OpenAI STT error: ${response.status} ${textErr}`);
    }

    const data = await response.json();
    return jsonResponse({ transcription: data.text });
  } catch (error) {
    console.error("Error with speech-to-text API (Cloudflare):", error);
    return jsonResponse({ error: "Error processing your audio" }, 500);
  }
}
