const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY;

// Históricos de conversa separados
let textChatHistory = [];
let voiceChatHistory = [];
let exploreHistory = [];

const scenarios = {
    restaurant: { name: "At the Restaurant", prompt: "You are a friendly restaurant waiter in Beijing. Start by welcoming the user." },
    shopping: { name: "Shopping for Clothes", prompt: "You are a helpful shop assistant in Shanghai. Start by asking if the user needs help." },
    introductions: { name: "Making a new friend", prompt: "You are a native Mandarin speaker named Lìlì (丽丽). Start by introducing yourself." },
    taxi: { name: "Taking a Taxi", prompt: "You are a taxi driver in Guangzhou. Start by asking where the user wants to go." }
};

// --- Prompts do Sistema ---

// NOVO: Prompt apenas para a primeira mensagem do cenário
const getInitialVoiceSystemPrompt = (scenarioKey) => {
    if (!scenarioKey || !scenarios[scenarioKey]) {
        return `You are PingLee, an AI tutor. Apologize in Portuguese for an error and ask the user to try again. Format as a JSON object with 'chinese', 'pinyin', and 'translation'.`;
    }
    const scenario = scenarios[scenarioKey];
    return `You are PingLee, an AI Mandarin tutor, starting a role-play as: ${scenario.prompt}
    Your task is to deliver the first line of the role-play in Mandarin.
    Your response MUST be a single JSON object with 3 keys: 'chinese' (your starting line), 'pinyin', and 'translation' (the Portuguese translation). Do NOT include a 'feedback' key.`;
}

// Prompt para as respostas seguintes do utilizador
const getVoiceSystemPrompt = (scenarioKey, userTranscription) => {
    const scenario = scenarios[scenarioKey] || { prompt: "a general conversation" };
    return `You are PingLee, an AI Mandarin tutor role-playing as: ${scenario.prompt}

    Your tasks are:
    1.  **Analyze User's Transcription:** The user's speech was transcribed as: "${userTranscription}".
    2.  **Provide Feedback (in Portuguese):** Your feedback MUST focus ONLY on grammar or word choice based on the transcription. If it's good, praise the user. Do not analyze pronunciation.
    3.  **Continue the Role-Play (in Chinese):** Respond naturally in simple Mandarin.
    4.  **Format as JSON:** Your response MUST be a JSON object with keys: 'chinese', 'pinyin', 'translation' (in Portuguese), and 'feedback' (concise).`;
}

const getTextSystemPrompt = () => {
    return `You are PingLee, an AI Mandarin tutor and conversation partner.

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
};

const getExploreSystemPrompt = () => {
    return `És PingLee num modo "Explora": respondes em Português de Portugal a perguntas abertas sobre Mandarim, linguística ou cultura. Traz contexto e exemplos, e inclui caracteres/pinyin quando forem úteis, mas fala sempre em PT-PT. Devolve SEMPRE um único JSON com as chaves:
- "translation": a tua resposta completa em PT-PT (pode incluir exemplos em chinês/pinyin, emojis ou bullets).
- "chinese": opcional (frases curtas em chinês, caso faça sentido), caso contrário vazio.
- "pinyin": opcional, caso contrário vazio.
- "feedback": deixa vazio ("").
Não peças confirmação para continuar; mantém o tom caloroso e curioso.`;
};

// --- Lógica Principal da API ---
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message, mode = 'text', scenario: scenarioKey, variant } = req.body;
    let currentHistory, systemPrompt;

    if (mode === 'voice') {
        currentHistory = voiceChatHistory;
        if (message === '##START_SCENARIO##') {
            voiceChatHistory.splice(0, voiceChatHistory.length); 
            systemPrompt = getInitialVoiceSystemPrompt(scenarioKey); // Usar o novo prompt inicial
            currentHistory.push({ role: "system", content: systemPrompt });
            currentHistory.push({ role: "user", content: `Start the role-play for ${scenarios[scenarioKey]?.name}.` });
        } else {
            systemPrompt = getVoiceSystemPrompt(scenarioKey, message);
            if (currentHistory.length > 0 && currentHistory[0].role === 'system') {
                currentHistory[0].content = systemPrompt; 
            } else {
                currentHistory.unshift({ role: "system", content: systemPrompt });
            }
            currentHistory.push({ role: "user", content: message });
        }
    } else if (variant === 'explora') {
        currentHistory = exploreHistory;
        if (currentHistory.length === 0) {
            systemPrompt = getExploreSystemPrompt();
            currentHistory.push({ role: "system", content: systemPrompt });
        }
        currentHistory.push({ role: "user", content: message });
    } else { 
        currentHistory = textChatHistory;
        if (currentHistory.length === 0) {
            systemPrompt = getTextSystemPrompt();
            currentHistory.push({ role: "system", content: systemPrompt });
        }
        currentHistory.push({ role: "user", content: message });
    }

    try {
        let responseContent;
        if (variant === 'explora') {
            if (!ANTHROPIC_KEY) throw new Error('Anthropic API key missing');
            const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ANTHROPIC_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 1000,
                    messages: currentHistory
                })
            });
            const anthropicData = await anthropicRes.json();
            responseContent = anthropicData?.content?.[0]?.text || '{}';
            currentHistory.push({ role: "assistant", content: responseContent });
        } else {
            const completion = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: currentHistory,
                response_format: { type: "json_object" },
            });
            responseContent = completion.choices[0].message.content;
            currentHistory.push({ role: "assistant", content: responseContent });
        }

        if (currentHistory.length > 15) {
            currentHistory.splice(1, 2); 
        }

        const responseJson = JSON.parse(responseContent);
        res.status(200).json(responseJson);

    } catch (error) {
        console.error(`Error in chat API (mode: ${mode}):`, error);
        res.status(500).json({ error: 'Sorry, I encountered an error.' });
    }
};
