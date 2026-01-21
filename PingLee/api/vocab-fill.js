const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required.' });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: 'system', content: 'You return compact JSON only.' },
                { role: 'user', content: buildPrompt(query) }
            ],
            response_format: { type: 'json_object' }
        });

        const content = completion.choices[0].message.content;
        const parsed = JSON.parse(content || '{}');
        res.status(200).json(parsed);
    } catch (error) {
        console.error('Error in vocab-fill API:', error);
        res.status(500).json({ error: 'Sorry, I encountered an error.' });
    }
};
