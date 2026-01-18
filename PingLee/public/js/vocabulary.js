const Vocabulary = {
    _initialized: false,

    init() {
        if (this._initialized) return;
        this._initialized = true;
        // --- 1. DADOS ---
        let vocabularyBank = [
            { id: 1, character: '你好', pinyin: 'nǐ hǎo', translation: 'Olá', hsk: 'HSK1', partOfSpeech: 'Expressão', example: { chinese: '你好，你叫什么名字？', translation: 'Olá, qual é o seu nome?' }, related: [] },
            { id: 2, character: '上', pinyin: 'shàng', translation: 'Cima, subir', hsk: 'HSK1', partOfSpeech: 'Verbo', example: { chinese: '请上车。', translation: 'Por favor, suba no carro.' }, related: [] },
            { id: 3, character: '学习', pinyin: 'xué xí', translation: 'Estudar', hsk: 'HSK2', partOfSpeech: 'Verbo', example: { chinese: '我喜欢学习汉语。', translation: 'Eu gosto de estudar mandarim.' }, related: [] }
        ];

        // --- 2. ELEMENTOS DO DOM ---
        const vocabSection = document.getElementById('vocabulary');
        if (!vocabSection) return;

    const vocabList = vocabSection.querySelector('.vocab-list');
    const addWordBtn = vocabSection.querySelector('.add-word-btn');
    const modalOverlay = document.getElementById('word-modal');
    const modalTitle = document.getElementById('modal-title');
    const wordForm = document.getElementById('word-form');
        const closeBtn = document.querySelector('.word-modal-close');
    const aiFillBtn = document.getElementById('ai-fill-btn');
    const searchInput = document.getElementById('vocab-search');
    const saveBtn = wordForm?.querySelector('.save-btn');

        const [wordIdInput, characterInput, pinyinInput, translationInput, hskInput, posInput, exampleChineseInput, exampleTranslationInput, notesInput] = [
            'word-id-input', 'character-input', 'pinyin-input', 'translation-input', 'hsk-input', 'pos-input', 'example-chinese-input', 'example-translation-input', 'notes-input'
        ].map(id => document.getElementById(id));
    let feedbackContainer = null;
    let lastSuggestions = [];
    let searchQuery = '';
    let isSaving = false;


    // --- 3. SÍNTESE DE VOZ (usa endpoint TTS da app) ---
    async function speak(text, buttonEl = null) {
        if (!text) return;
        if (buttonEl) buttonEl.classList.add('playing');
        const tmpBtn = document.createElement('button');
        UI.playAudio(tmpBtn, text, () => {
            if (buttonEl) buttonEl.classList.remove('playing');
        }, 0.95);
    }

    // --- 4. RENDERIZAÇÃO DO VOCABULÁRIO (COM NOVO DESIGN) ---
    function renderVocabulary() {
        const currentlyExpanded = Array.from(vocabList.querySelectorAll('.word-card.expanded')).map(c => parseInt(c.dataset.id));
        vocabList.innerHTML = '';

        const term = (searchQuery || '').trim().toLowerCase();
        const list = term
            ? vocabularyBank.filter(w => {
                const haystack = [
                    w.character,
                    w.pinyin,
                    w.translation,
                    w.hsk,
                    w.partOfSpeech,
                    w.example?.chinese,
                    w.example?.translation
                ].filter(Boolean).join(' ').toLowerCase();
                return haystack.includes(term);
            })
            : vocabularyBank;

        if (list.length === 0) {
            const msg = term
                ? `Nenhum resultado para "${term}".`
                : 'Ainda não tem palavras. Adicione uma!';
            vocabList.innerHTML = `<p class="empty-list-msg">${msg}</p>`;
            return;
        }

        list.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.hsk = word.hsk; // Para a barra de cor
            if (currentlyExpanded.includes(word.id)) {
                wordCard.classList.add('expanded');
            }

            // Nova estrutura HTML para o cartão
            wordCard.innerHTML = `
                <div class="word-card-main">
                    <span class="character">${word.character}</span>
                    <div class="info-stack">
                        <span class="pinyin">${word.pinyin}</span>
                        <span class="translation">${word.translation}</span>
                        <div class="tags">
                            <span class="tag hsk">${word.hsk}</span>
                            <span class="tag pos">${word.partOfSpeech}</span>
                        </div>
                    </div>
                            <button class="word-action-btn audio-btn" aria-label="Ouvir Caractere">
                                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
                            </button>
                </div>
                <div class="word-card-extended">
                    <div class="extended-content-wrapper">
                        ${word.example && word.example.chinese ? `
                        <div class="example-container">
                            <p class="example-chinese">Frase: ${word.example.chinese}</p>
                            <p class="example-translation">Trad.: ${word.example.translation}</p>
                        </div>` : ''}
                        ${word.notes ? `<div class="notes-block"><p class="notes-label">Notas</p><p class="notes-text">${word.notes}</p></div>` : ''}
                        <div class="word-card-actions">
                            <button class="word-action-btn edit-word-btn" aria-label="Editar Palavra">
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                            <button class="word-action-btn delete-word-btn" aria-label="Apagar Palavra">
                                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            vocabList.appendChild(wordCard);
            const extended = wordCard.querySelector('.word-card-extended');
            if (wordCard.classList.contains('expanded') && extended) {
                const inner = extended.querySelector('.extended-content-wrapper');
                const height = inner ? inner.scrollHeight : extended.scrollHeight;
                extended.style.maxHeight = `${height + 64}px`;
            }
        });
    }

    // --- 5. LIGAÇÃO À API DE IA ---
    async function lookupWordWithAI(character) {
        const resp = await fetch('/api/vocab-fill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: character })
        });
        if (!resp.ok) throw new Error('Falha ao obter sugestão');
        return resp.json();
    }

    function applyAIData(aiData) {
        if (!aiData) return;
        characterInput.value = aiData.word || characterInput.value;
        pinyinInput.value = aiData.pinyin || '';
        const meaning = Array.isArray(aiData.meaning) ? aiData.meaning.join('; ') : (aiData.meaning || '');
        translationInput.value = meaning;
        hskInput.value = aiData.hsk || '';
        posInput.value = aiData.pos || '';
        exampleChineseInput.value = aiData.example_sentence || aiData.related?.[0]?.word || '';
        exampleTranslationInput.value = aiData.example_translation || aiData.related?.[0]?.meaning || '';
    }

    function ensureFeedbackContainer() {
        if (feedbackContainer) return feedbackContainer;
        feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'vocab-feedback hidden';
        vocabSection.insertBefore(feedbackContainer, vocabList);
        return feedbackContainer;
    }

    function hideFeedback() {
        if (!feedbackContainer) return;
        feedbackContainer.classList.add('hidden');
    }

    function renderFeedback(message = '✓ Palavra guardada com sucesso!', suggestions = [], loadingSuggestions = false) {
        const container = ensureFeedbackContainer();
        lastSuggestions = suggestions || [];
        const hasSuggestions = lastSuggestions.length > 0;
        const suggestionLines = hasSuggestions
            ? lastSuggestions.map(s => `<li>• ${s.word} ${s.pinyin ? `(${s.pinyin})` : ''} - ${s.meaning || ''}</li>`).join('')
            : '';
        container.innerHTML = `
            <div class="vocab-feedback-body">
                <div class="vocab-feedback-text">
                    <p class="feedback-title">${message}</p>
                    ${loadingSuggestions ? `<p class="feedback-sub">A obter palavras relacionadas...</p>` : ''}
                    ${hasSuggestions ? `<p class="feedback-sub">Palavras relacionadas que podes adicionar:</p>
                    <ul class="feedback-list">${suggestionLines}</ul>` : ''}
                </div>
                <div class="feedback-actions">
                    ${hasSuggestions ? `<button type="button" class="word-btn add-suggestions-btn">Adicionar estas</button>` : ''}
                    <button type="button" class="word-btn ghost close-feedback-btn">Fechar</button>
                </div>
            </div>
        `;
        container.classList.remove('hidden');

        const closeBtn = container.querySelector('.close-feedback-btn');
        if (closeBtn) closeBtn.onclick = hideFeedback;
        const addBtn = container.querySelector('.add-suggestions-btn');
        if (addBtn) addBtn.onclick = handleAddSuggestions;
    }

    async function fetchSuggestionsFor(word) {
        try {
            const aiData = await lookupWordWithAI(word);
            return aiData.related || [];
        } catch (e) {
            return [];
        }
    }

    async function handleAddSuggestions() {
        const container = ensureFeedbackContainer();
        const addBtn = container.querySelector('.add-suggestions-btn');
        if (addBtn) addBtn.disabled = true;
        if (!lastSuggestions.length) {
            hideFeedback();
            return;
        }
        const toAdd = [];
        for (const sug of lastSuggestions) {
            try {
                const aiData = await lookupWordWithAI(sug.word);
                if (!aiData) continue;
                const suggestionWord = {
                    character: aiData.word || sug.word,
                    pinyin: aiData.pinyin || '',
                    translation: Array.isArray(aiData.meaning) ? aiData.meaning.join('; ') : (aiData.meaning || sug.meaning || ''),
                    hsk: aiData.hsk || '',
                    partOfSpeech: aiData.pos || '',
                    example: {
                        chinese: aiData.example_sentence || '',
                        translation: aiData.example_translation || ''
                    },
                    notes: ''
                };
                const duplicate = vocabularyBank.find(w =>
                    w.character.trim() === suggestionWord.character &&
                    w.pinyin.trim().toLowerCase() === suggestionWord.pinyin.toLowerCase() &&
                    w.translation.trim().toLowerCase() === suggestionWord.translation.toLowerCase() &&
                    w.hsk.trim().toLowerCase() === suggestionWord.hsk.toLowerCase()
                );
                if (!duplicate && suggestionWord.character && suggestionWord.pinyin && suggestionWord.translation) {
                    toAdd.push({ ...suggestionWord, id: Date.now() + Math.floor(Math.random() * 1000) });
                }
            } catch (err) {
                console.error('Falha ao adicionar sugestão', err);
            }
        }
        if (toAdd.length) {
            vocabularyBank = [...toAdd, ...vocabularyBank];
            renderVocabulary();
        }
        hideFeedback();
        if (addBtn) addBtn.disabled = false;
    }

    async function handleAiFill() {
        const character = characterInput.value.trim();
        if (!character) { alert('Por favor, insira um caractere chinês.'); return; }
        aiFillBtn.disabled = true;
        aiFillBtn.textContent = 'A pesquisar...';
        try {
            const aiResponse = await lookupWordWithAI(character);
            applyAIData(aiResponse);
        } catch (error) {
            console.error(error);
            alert(`Não foi possível obter uma sugestão para "${character}".`);
        } finally {
            aiFillBtn.disabled = false;
            aiFillBtn.textContent = 'Auto';
        }
    }

    // --- 6. LÓGICA DO MODAL (ADICIONAR/EDITAR) ---
    function openModalForCreate() {
        wordForm.reset();
        wordIdInput.value = '';
        modalTitle.textContent = 'Adicionar Nova Palavra';
        aiFillBtn.style.display = 'block';
        notesInput.value = '';
        modalOverlay.classList.remove('hidden');
        setTimeout(() => modalOverlay.classList.add('active'), 10);
        characterInput.focus();
    }

    function openModalForEdit(word) {
        wordForm.reset();
        modalTitle.textContent = 'Editar Palavra';
        aiFillBtn.style.display = 'none';
        wordIdInput.value = word.id;
        characterInput.value = word.character;
        pinyinInput.value = word.pinyin;
        translationInput.value = word.translation;
        hskInput.value = word.hsk;
        posInput.value = word.partOfSpeech;
        exampleChineseInput.value = word.example?.chinese || '';
        exampleTranslationInput.value = word.example?.translation || '';
        notesInput.value = word.notes || '';
        modalOverlay.classList.remove('hidden');
        setTimeout(() => modalOverlay.classList.add('active'), 10);
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        setTimeout(() => modalOverlay.classList.add('hidden'), 300);
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        if (isSaving) return;
        isSaving = true;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'A guardar...';
        }
        const id = parseInt(wordIdInput.value);
        const wordData = {
            character: characterInput.value.trim(),
            pinyin: pinyinInput.value.trim(),
            translation: translationInput.value.trim(),
            hsk: hskInput.value.trim(),
            partOfSpeech: posInput.value.trim(),
            example: { chinese: exampleChineseInput.value.trim(), translation: exampleTranslationInput.value.trim() },
            notes: notesInput.value.trim()
        };
        if (!wordData.character || !wordData.pinyin || !wordData.translation) {
            alert('Os campos Caractere, Pinyin e Tradução são obrigatórios.');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
            }
            isSaving = false;
            return;
        }
        // Evita duplicações (mesmos campos-chave, ignorando exemplos e função gramatical)
        const duplicate = vocabularyBank.find(w =>
            w.id !== id &&
            w.character.trim() === wordData.character &&
            w.pinyin.trim().toLowerCase() === wordData.pinyin.toLowerCase() &&
            w.translation.trim().toLowerCase() === wordData.translation.toLowerCase() &&
            w.hsk.trim().toLowerCase() === wordData.hsk.toLowerCase()
        );
        if (duplicate) {
            alert('Esta palavra já existe com os mesmos dados. Ajuste antes de guardar.');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
            }
            isSaving = false;
            return;
        }
        if (id) {
            const index = vocabularyBank.findIndex(word => word.id === id);
            if (index !== -1) vocabularyBank[index] = { ...vocabularyBank[index], ...wordData, id };
        } else {
            vocabularyBank.unshift({ ...wordData, id: Date.now() });
        }
        renderVocabulary();
        closeModal();
        renderFeedback('✓ Palavra guardada com sucesso!', [], true);
        fetchSuggestionsFor(wordData.character).then(suggestions => {
            if (suggestions?.length) {
                renderFeedback('✓ Palavra guardada com sucesso!', suggestions);
            } else {
                renderFeedback('✓ Palavra guardada com sucesso!', [], false);
            }
        }).finally(() => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar';
            }
            isSaving = false;
        });
    }

    function handleDeleteWord(id) {
        if (confirm('Tem a certeza de que quer apagar esta palavra?')) {
            vocabularyBank = vocabularyBank.filter(word => word.id !== id);
            renderVocabulary();
        }
    }

    // --- 7. INICIALIZAÇÃO E EVENT LISTENERS ---
    function bootstrap() {
        if (vocabSection.classList.contains('active')) renderVocabulary();
        const observer = new MutationObserver(mutations => {
            if (mutations.some(m => m.attributeName === 'class' && vocabSection.classList.contains('active'))) {
                renderVocabulary();
            }
        });
        observer.observe(vocabSection, { attributes: true });

        addWordBtn.addEventListener('click', openModalForCreate);
        closeBtn.addEventListener('click', closeModal);
        aiFillBtn.addEventListener('click', handleAiFill);
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value || '';
                renderVocabulary();
            });
        }
        modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
        wordForm.addEventListener('submit', handleFormSubmit);

        vocabList.addEventListener('click', (event) => {
            const card = event.target.closest('.word-card');
            if (!card) return;

            const wordId = parseInt(card.dataset.id);
            const word = vocabularyBank.find(w => w.id === wordId);
            
            const isAudioButton = event.target.closest('.audio-btn');
            const isEditButton = event.target.closest('.edit-word-btn');
            const isDeleteButton = event.target.closest('.delete-word-btn');

            if (isAudioButton) {
                event.stopPropagation();
                speak(word.character, isAudioButton);
                return;
            }
            if (isEditButton) {
                if (word) openModalForEdit(word);
                return;
            }
            if (isDeleteButton) {
                handleDeleteWord(wordId);
                return;
            }

            // Se não for nenhum botão de ação, expande/encolhe o cartão
            if (event.target.closest('.word-card-main')){
                 const wasOpen = card.classList.contains('expanded');
                 // Fecha outros
                 vocabList.querySelectorAll('.word-card.expanded').forEach(other => {
                    if (other !== card) {
                        other.classList.remove('expanded');
                        const ext = other.querySelector('.word-card-extended');
                        if (ext) ext.style.maxHeight = '0px';
                    }
                 });
                 card.classList.toggle('expanded', !wasOpen);
                 const extended = card.querySelector('.word-card-extended');
                 if (card.classList.contains('expanded') && extended) {
                    const inner = extended.querySelector('.extended-content-wrapper');
                    const height = inner ? inner.scrollHeight : extended.scrollHeight;
                    requestAnimationFrame(() => {
                        extended.style.maxHeight = `${height + 64}px`;
                    });
                 } else if (extended) {
                    extended.style.maxHeight = '0px';
                 }
            }
        });
    }

        bootstrap();
    }
};

// Exporta para lazy load
window.Vocabulary = Vocabulary;

// Auto-init se o script for carregado após DOM pronto (fallback)
if (document.readyState !== 'loading') {
    window.Vocabulary.init();
} else {
    document.addEventListener('DOMContentLoaded', () => window.Vocabulary.init(), { once: true });
}
