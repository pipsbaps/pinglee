const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const buildPrompt = (query) => `Given the Mandarin input: "${query}".
Return JSON with:
- word: the character or word
- pinyin
- meaning: concise PT-PT gloss
- pos: part of speech (PT)
- hsk: HSK level or "N/A"
- radical: radical name/meaning if applicable
- components: component characters
- composition: short note on structure
- related: 3-5 common words using this char/component ("word" and PT meaning)
- unrelated: optional 2 words that include it but with unrelated meaning
Return ONLY JSON.`;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const body = await request.json().catch(() => null);
  const query = body?.query?.trim();
  if (!query) return jsonResponse({ error: 'query is required' }, 400);
  if (!env.OPENAI_API_KEY) return jsonResponse({ error: 'Server missing OPENAI_API_KEY' }, 500);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You return compact JSON only.' },
          { role: 'user', content: buildPrompt(query) }
        ],
        response_format: { type: 'json_object' }
      }),
    });
    if (!response.ok) {
      const textErr = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${textErr}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || '{}');
    return jsonResponse(parsed);
  } catch (err) {
    console.error('vocab-fill error', err);
    return jsonResponse({ error: 'Não foi possível obter sugestão' }, 500);
  }
}
