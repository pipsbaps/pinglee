const scenarios = {
  restaurant: { name: "At the Restaurant", prompt: "You are a friendly restaurant waiter in Beijing. Start by welcoming the user." },
  shopping: { name: "Shopping for Clothes", prompt: "You are a helpful shop assistant in Shanghai. Start by asking if the user needs help." },
  introductions: { name: "Making a new friend", prompt: "You are a native Mandarin speaker named Lìlì (丽丽). Start by introducing yourself." },
  taxi: { name: "Taking a Taxi", prompt: "You are a taxi driver in Guangzhou. Start by asking where the user wants to go." }
};

const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const getInitialVoiceSystemPrompt = (scenarioKey) => {
  if (!scenarioKey || !scenarios[scenarioKey]) {
    return `You are PingLee, an AI tutor. Apologize in Portuguese for an error and ask the user to try again. Format as a JSON object with 'chinese', 'pinyin', and 'translation'.`;
  }
  const scenario = scenarios[scenarioKey];
  return `You are PingLee, an AI Mandarin tutor, starting a role-play as: ${scenario.prompt}
    Your task is to deliver the first line of the role-play in Mandarin.
    Your response MUST be a single JSON object with 3 keys: 'chinese' (your starting line), 'pinyin', and 'translation' (the Portuguese translation). Do NOT include a 'feedback' key.`;
};

const getVoiceSystemPrompt = (scenarioKey, userTranscription) => {
  const scenario = scenarios[scenarioKey] || { prompt: "a general conversation" };
  return `You are PingLee, an AI Mandarin tutor role-playing as: ${scenario.prompt}

    Your tasks are:
    1.  **Analyze User's Transcription:** The user's speech was transcribed as: "${userTranscription}".
    2.  **Provide Feedback (in Portuguese):** Your feedback MUST focus ONLY on grammar or word choice based on the transcription. If it's good, praise the user. Do not analyze pronunciation.
    3.  **Continue the Role-Play (in Chinese):** Respond naturally in simple Mandarin.
    4.  **Format as JSON:** Your response MUST be a JSON object with keys: 'chinese', 'pinyin', 'translation' (in Portuguese), and 'feedback' (concise).`;
};

const getTextSystemPrompt = () => `You are PingLee, an AI Mandarin tutor and conversation partner.

    GOALS:
    - Respond proactively in Mandarin with short, natural sentences (aim for one or two sentences).
    - Never just translate the user's text; always reply as yourself, keeping the conversation flowing.
    - Keep grammar simple, HSK1-HSK3 level, unless the history shows the user is advanced.
    - Offer concise correction/feedback in Portuguese if the user's last message has errors. If correct, praise briefly.
    - Often end with a brief follow-up question in Mandarin to keep the dialogue moving.

    OUTPUT FORMAT:
    - Return a single JSON object with keys:
      'chinese': your Mandarin reply,
      'pinyin': pinyin for your reply,
      'translation': European Portuguese translation of your reply (not of the user's message),
      'feedback': short Portuguese feedback about the user's previous message (max 2 lines).
    - Do NOT include any other keys.`;

const callOpenAIChat = async (env, messages) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI chat error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.message) {
    return jsonResponse({ error: "Message is required." }, 400);
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse({ error: "Server missing OPENAI_API_KEY" }, 500);
  }

  const { message, mode = "text", scenario: scenarioKey, history = [] } = body;

  let messages = [];
  let systemPrompt;

  if (mode === "voice") {
    if (message === "##START_SCENARIO##") {
      systemPrompt = getInitialVoiceSystemPrompt(scenarioKey);
      messages.push({ role: "system", content: systemPrompt });
      messages.push({ role: "user", content: `Start the role-play for ${scenarios[scenarioKey]?.name}.` });
    } else {
      systemPrompt = getVoiceSystemPrompt(scenarioKey, message);
      messages.push({ role: "system", content: systemPrompt });
      if (Array.isArray(history)) {
        messages = messages.concat(history);
      }
      messages.push({ role: "user", content: message });
    }
  } else {
    systemPrompt = getTextSystemPrompt();
    messages.push({ role: "system", content: systemPrompt });
    if (Array.isArray(history)) {
      messages = messages.concat(history);
    }
    messages.push({ role: "user", content: message });
  }

  try {
    const responseContent = await callOpenAIChat(env, messages);
    const responseJson = JSON.parse(responseContent);
    return jsonResponse(responseJson);
  } catch (error) {
    console.error("Error in chat API (Cloudflare):", error);
    return jsonResponse({ error: "Sorry, I encountered an error." }, 500);
  }
}
