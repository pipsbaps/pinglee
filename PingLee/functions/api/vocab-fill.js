const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const buildPrompt = (query) => `Usa o input em mandarim: "${query}".
Devolve APENAS JSON com as chaves:
- word: a Palavra/caractere
- pinyin
- meaning: até 3 significados curtos em PT-PT (array ou string)
- pos: função gramatical em texto livre
- hsk: nível de HSK em texto livre
- radical: nome/explicação do radical (se aplicável)
- components: caracteres que compõem o radical (se aplicável)
- composition: nota breve sobre composição/estrutura
- related: 3-5 palavras/composições comuns com este caractere (array de {word, meaning})
- example_sentence: frase de exemplo em caracteres
- example_pinyin: pinyin da frase
- example_translation: tradução PT-PT da frase

Segue este prompt de referência (não devolvas texto corrido):
Palavra
Pinyin
Significado (máximo 3)
Função gramatical
nível de hsk
exemplo de frases (caracteres + pinyin)
tradução da frase`;

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
