const VocabularyData = {
    mainCategories: [
        {
            id: 'daily-life',
            name: 'Vida diária',
            icon: '🏠',
            subCategories: [
                {
                    id: 'greetings',
                    name: 'Saudações',
                    radicals: [
                        {
                            id: 'rad-people',
                            name: '亻 (pessoa)',
                            words: [
                                { id: 'w1', character: '你好', pinyin: 'nǐ hǎo', meaning: 'olá', hsk: 'HSK1', type: 'Expressão', notes: 'Saudação padrão', compounds: ['w2'], example: { zh: '你好！', pinyin: 'nǐ hǎo', pt: 'Olá!' } },
                                { id: 'w2', character: '您', pinyin: 'nín', meaning: 'você (formal)', hsk: 'HSK2', type: 'Pronome', notes: '', compounds: [], example: { zh: '您好！', pinyin: 'nín hǎo', pt: 'Olá (formal)!' } }
                            ]
                        }
                    ]
                },
                {
                    id: 'food',
                    name: 'Comida',
                    radicals: [
                        {
                            id: 'rad-mouth',
                            name: '口 (boca)',
                            words: [
                                { id: 'w3', character: '吃', pinyin: 'chī', meaning: 'comer', hsk: 'HSK1', type: 'Verbo', notes: '', compounds: [], example: { zh: '我想吃饭。', pinyin: 'wǒ xiǎng chī fàn', pt: 'Quero comer.' } }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: 'travel',
            name: 'Viagens',
            icon: '✈️',
            subCategories: [
                {
                    id: 'transport',
                    name: 'Transportes',
                    radicals: [
                        {
                            id: 'rad-car',
                            name: '车 (veículo)',
                            words: [
                                { id: 'w4', character: '出租车', pinyin: 'chūzūchē', meaning: 'táxi', hsk: 'HSK2', type: 'Substantivo', notes: '', compounds: [], example: { zh: '我们坐出租车。', pinyin: 'wǒmen zuò chūzūchē', pt: 'Vamos de táxi.' } }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

const Vocabulary = {
    _initialized: false,
    wordsIndex: [],
    radicalsIndex: new Map(),
    stats: { searched: {}, used: {}, wrong: {} },
    modalStack: [],
    State: {
        searchTerm: '',
        filterHSK: '',
        filterPOS: '',
        openMainCategoryId: null,
        openSubCategoryId: null,
        openRadicalId: null,
        panelMode: 'verCategorias',
        visibleWords: []
    },

    init() {
        if (this._initialized) return;
        this._initialized = true;

        this.el = {
            section: document.getElementById('vocabulary'),
            breadcrumb: document.getElementById('vocab-breadcrumb'),
            backRoot: document.getElementById('vocab-back-root'),
            stats: document.getElementById('vocab-stats'),
            panel: document.getElementById('vocab-panel'),
            search: document.getElementById('vocab-search'),
            filterHSK: document.getElementById('vocab-filter-hsk'),
            filterPOS: document.getElementById('vocab-filter-pos'),
            metricTotal: document.getElementById('metric-total'),
            metricTrain: document.getElementById('metric-train'),
            modalOverlay: document.getElementById('word-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('word-modal-body'),
            modalClose: document.querySelector('.word-modal-close'),
            formModal: document.getElementById('word-form-modal'),
            formModalTitle: document.getElementById('form-modal-title'),
            formClose: document.querySelector('.word-form-close'),
            wordForm: document.getElementById('word-form'),
            aiFillBtn: document.getElementById('ai-fill-btn'),
            feedback: document.getElementById('vocab-feedback'),
            addBtn: document.getElementById('open-add-word')
        };
        if (!this.el.section) return;

        this.formFields = {
            wordId: document.getElementById('word-id-input'),
            character: document.getElementById('character-input'),
            pinyin: document.getElementById('pinyin-input'),
            meaning: document.getElementById('translation-input'),
            hsk: document.getElementById('hsk-input'),
            type: document.getElementById('pos-input'),
            exampleZh: document.getElementById('example-chinese-input'),
            examplePt: document.getElementById('example-translation-input'),
            notes: document.getElementById('notes-input')
        };

        this.buildIndex(VocabularyData);
        this.loadStats();
        this.applyFilters();
        this.renderAll();
        this.bindEvents();
    },

    buildIndex(data) {
        this.wordsIndex = [];
        this.radicalsIndex = new Map();
        data.mainCategories.forEach(main => {
            main.subCategories.forEach(sub => {
                sub.radicals.forEach(rad => {
                    const wordIds = [];
                    rad.words.forEach(w => {
                        this.wordsIndex.push({
                            ...w,
                            mainId: main.id,
                            subId: sub.id,
                            radicalId: rad.id,
                            searchBlob: [
                                w.character,
                                w.pinyin,
                                w.meaning,
                                w.hsk,
                                w.type,
                                w.notes
                            ].filter(Boolean).join(' ').toLowerCase()
                        });
                        wordIds.push(w.id);
                    });
                    this.radicalsIndex.set(rad.id, wordIds);
                });
            });
        });
    },

    bindEvents() {
        if (this.el.search) {
            this.el.search.addEventListener('input', () => {
                this.State.searchTerm = this.el.search.value.trim();
                this.applyFilters();
                this.renderPanel('verPalavras');
                this.trackSearch(this.State.searchTerm, this.State.visibleWords.map(w => w.id));
            });
        }
        if (this.el.filterHSK) {
            this.el.filterHSK.addEventListener('change', () => {
                this.State.filterHSK = this.el.filterHSK.value;
                this.applyFilters();
                this.renderPanel('verPalavras');
            });
        }
        if (this.el.filterPOS) {
            this.el.filterPOS.addEventListener('change', () => {
                this.State.filterPOS = this.el.filterPOS.value;
                this.applyFilters();
                this.renderPanel('verPalavras');
            });
        }
        if (this.el.backRoot) {
            this.el.backRoot.addEventListener('click', () => {
                this.State.openMainCategoryId = null;
                this.State.openSubCategoryId = null;
                this.State.openRadicalId = null;
                this.State.panelMode = 'verCategorias';
                this.applyFilters();
                this.renderAll();
            });
        }
        if (this.el.addBtn) {
            this.el.addBtn.addEventListener('click', () => this.openFormModal());
        }
        if (this.el.formClose) {
            this.el.formClose.addEventListener('click', () => this.closeFormModal());
        }
        if (this.el.aiFillBtn) {
            this.el.aiFillBtn.addEventListener('click', () => this.handleAiFill());
        }
        if (this.el.wordForm) {
            this.el.wordForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        if (this.el.modalOverlay) {
            this.el.modalOverlay.addEventListener('click', e => {
                if (e.target === this.el.modalOverlay) this.closeModal();
            });
        }
        if (this.el.modalClose) {
            this.el.modalClose.addEventListener('click', () => this.closeModal());
        }
    },

    applyFilters() {
        const term = (this.State.searchTerm || '').toLowerCase();
        const noFilter = !term && !this.State.filterHSK && !this.State.filterPOS && !this.State.openRadicalId;
        this.State.visibleWords = this.wordsIndex.filter(w => {
            if (noFilter) return false;
            if (term && !w.searchBlob.includes(term)) return false;
            if (this.State.filterHSK && w.hsk !== this.State.filterHSK) return false;
            if (this.State.filterPOS && w.type !== this.State.filterPOS) return false;
            if (this.State.openRadicalId && w.radicalId !== this.State.openRadicalId) return false;
            return true;
        });
        const count = this.State.visibleWords.length;
        if (this.el.filterHSK) {
            this.el.filterHSK.classList.toggle('is-active', !!this.State.filterHSK);
            this.el.filterHSK.dataset.count = count;
        }
        if (this.el.filterPOS) {
            this.el.filterPOS.classList.toggle('is-active', !!this.State.filterPOS);
            this.el.filterPOS.dataset.count = count;
        }
        this.renderHeaderSummary();
        this.renderStats();
    },

    renderAll() {
        this.renderBreadcrumb();
        this.renderPanel(this.State.panelMode);
        this.renderStats();
        this.renderHeaderSummary();
    },

    renderBreadcrumb() {
        const parts = [];
        const { openMainCategoryId, openSubCategoryId, openRadicalId } = this.State;
        const main = VocabularyData.mainCategories.find(m => m.id === openMainCategoryId);
        const sub = main?.subCategories.find(s => s.id === openSubCategoryId);
        const rad = sub?.radicals.find(r => r.id === openRadicalId);
        if (main) parts.push({ label: main.name, level: 'main', id: main.id });
        if (sub) parts.push({ label: sub.name, level: 'sub', id: sub.id });
        if (rad) parts.push({ label: rad.name, level: 'rad', id: rad.id });

        const frag = document.createDocumentFragment();
        if (parts.length) {
            parts.forEach((p, idx) => {
                const btn = document.createElement('button');
                btn.textContent = p.label;
                btn.addEventListener('click', () => {
                    if (p.level === 'main') {
                        this.State.openMainCategoryId = p.id;
                        this.State.openSubCategoryId = null;
                        this.State.openRadicalId = null;
                        this.renderPanel('verRadicais');
                    } else if (p.level === 'sub') {
                        this.State.openSubCategoryId = p.id;
                        this.State.openRadicalId = null;
                        this.renderPanel('verRadicais');
                    } else if (p.level === 'rad') {
                        this.State.openRadicalId = p.id;
                        this.renderPanel('verPalavras');
                    }
                    this.applyFilters();
                    this.renderBreadcrumb();
                });
                frag.appendChild(btn);
                if (idx < parts.length - 1) {
                    const sep = document.createElement('span');
                    sep.className = 'sep';
                    sep.textContent = '>';
                    frag.appendChild(sep);
                }
            });
        }
        this.el.breadcrumb.innerHTML = '';
        this.el.breadcrumb.appendChild(frag);
    },

    renderPanel(mode) {
        this.State.panelMode = mode;
        this.el.panel.innerHTML = '';
        if (mode === 'verCategorias') {
            this.renderCategorias();
        } else if (mode === 'verRadicais') {
            this.renderRadicais();
        } else {
            this.renderPalavras();
        }
    },

    renderCategorias() {
        const grid = document.createElement('div');
        grid.className = 'panel-grid fade-in';
        VocabularyData.mainCategories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'panel-card main';
            card.innerHTML = `<div class="title">${cat.icon || ''} ${cat.name}</div><div class="meta">${cat.subCategories.length} subcategorias</div>`;
            card.addEventListener('click', () => {
                this.State.openMainCategoryId = cat.id;
                this.State.openSubCategoryId = null;
                this.State.openRadicalId = null;
                this.renderBreadcrumb();
                this.renderPanel('verRadicais');
            });
            grid.appendChild(card);
        });
        this.el.panel.appendChild(grid);
    },

    renderRadicais() {
        const main = VocabularyData.mainCategories.find(m => m.id === this.State.openMainCategoryId);
        if (!main) {
            this.renderPanel('verCategorias');
            return;
        }
        const subGrid = document.createElement('div');
        subGrid.className = 'panel-grid fade-in';
        main.subCategories.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'panel-card sub';
            const wordCount = sub.radicals.reduce((acc, r) => acc + (this.radicalsIndex.get(r.id)?.length || 0), 0);
            card.innerHTML = `<div class="title">${sub.name}</div><div class="meta">${wordCount} palavras</div>`;
            card.addEventListener('click', () => {
                this.State.openSubCategoryId = sub.id;
                this.State.openRadicalId = null;
                this.renderBreadcrumb();
                this.renderRadicais();
            });
            subGrid.appendChild(card);
        });
        this.el.panel.appendChild(subGrid);

        const sub = main.subCategories.find(s => s.id === this.State.openSubCategoryId);
        if (!sub) return;
        const radGrid = document.createElement('div');
        radGrid.className = 'panel-grid fade-in';
        sub.radicals.forEach(rad => {
            const count = this.radicalsIndex.get(rad.id)?.length || 0;
            const card = document.createElement('div');
            card.className = 'panel-card rad';
            card.innerHTML = `<div class="title">${rad.name}</div><div class="meta">${count} palavras</div>`;
            card.addEventListener('click', () => {
                this.State.openRadicalId = rad.id;
                this.applyFilters();
                this.renderBreadcrumb();
                this.renderPanel('verPalavras');
            });
            radGrid.appendChild(card);
        });
        this.el.panel.appendChild(radGrid);
    },

    renderPalavras() {
        const list = document.createElement('div');
        list.className = 'vocab-list fade-in';
        const noFilters =
            !this.State.searchTerm &&
            !this.State.filterHSK &&
            !this.State.filterPOS &&
            !this.State.openRadicalId;
        if (noFilters) {
            const p = document.createElement('p');
            p.className = 'empty-list-msg';
            p.textContent = 'Escolhe uma categoria/radical ou aplica filtros/pesquisa para ver palavras.';
            list.appendChild(p);
            this.el.panel.appendChild(list);
            return;
        }
        if (!this.State.visibleWords.length) {
            const p = document.createElement('p');
            p.className = 'empty-list-msg';
            p.textContent = 'Nenhuma palavra encontrada.';
            list.appendChild(p);
        } else {
            this.State.visibleWords.forEach(w => {
                const card = document.createElement('div');
                card.className = 'panel-card';
                card.innerHTML = `
                    <div class="title">${w.character} • <span class="meta">${w.pinyin}</span></div>
                    <div class="meta">${w.meaning}</div>
                    <div class="meta"><span class="tag-pill">${w.hsk || '—'}</span> <span class="tag-pill subtle">${w.type || '—'}</span></div>
                `;
                card.addEventListener('click', () => this.openWord(w.id));
                card.addEventListener('contextmenu', (e) => { e.preventDefault(); this.openFormModal(w.id); });
                list.appendChild(card);
            });
        }
        this.el.panel.appendChild(list);
    },

    renderStats() {
        const top = (map) => Object.entries(map || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const searched = top(this.stats.searched);
        const used = top(this.stats.used);
        const wrong = top(this.stats.wrong);
        this.el.stats.innerHTML = '';
        const blocks = [
            { title: 'Mais pesquisadas', data: searched },
            { title: 'Mais usadas', data: used },
            { title: 'Mais erradas', data: wrong }
        ];
        blocks.forEach(block => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `<h4>${block.title}</h4>`;
            const ul = document.createElement('ul');
            if (!block.data.length) {
                const li = document.createElement('li');
                li.textContent = '—';
                ul.appendChild(li);
            } else {
                block.data.forEach(([id, count]) => {
                    const word = this.wordsIndex.find(w => w.id === id);
                    if (!word) return;
                    const li = document.createElement('li');
                    const btn = document.createElement('button');
                    btn.textContent = `${word.character} ${word.pinyin ? `(${word.pinyin})` : ''} • ${count}`;
                    btn.addEventListener('click', () => this.openWord(word.id));
                    li.appendChild(btn);
                    ul.appendChild(li);
                });
            }
            card.appendChild(ul);
            this.el.stats.appendChild(card);
        });
    },

    renderHeaderSummary() {
        if (this.el.metricTotal) this.el.metricTotal.textContent = this.wordsIndex.length;
        const trainList = Object.entries(this.stats.wrong || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (this.el.metricTrain) this.el.metricTrain.textContent = trainList.length;
    },

    openWord(id) {
        const word = this.wordsIndex.find(w => w.id === id);
        if (!word || !this.el.modalBody) return;
        if (this.modalStack[this.modalStack.length - 1] !== id) this.modalStack.push(id);
        this.el.modalTitle.textContent = word.character;
        const relatedLinks = (word.compounds || []).map(cid => {
            const rel = this.wordsIndex.find(w => w.id === cid);
            return rel ? `<button class="link-rel" data-id="${rel.id}">${rel.character} ${rel.pinyin ? `(${rel.pinyin})` : ''}</button>` : '';
        }).join('');
        this.el.modalBody.innerHTML = `
            <div class="word-detail">
                <div class="word-detail-header">
                    <div class="word-char">${word.character}</div>
                    <div class="word-pinyin">${word.pinyin || '—'}</div>
                </div>
                <div class="word-meaning">${word.meaning || '—'}</div>
                <div class="word-tags">
                    <span class="tag-pill">${word.hsk || '—'}</span>
                    ${word.type ? `<span class="tag-pill subtle">${word.type}</span>` : ''}
                </div>
                ${word.notes ? `<p class="word-notes">${word.notes}</p>` : ''}
                ${word.example ? `<div class="word-example"><div>${word.example.zh || ''}</div><div class="word-example-py">${word.example.pinyin || ''}</div><div class="word-example-pt">${word.example.pt || ''}</div></div>` : ''}
                ${relatedLinks ? `<div class="related-links">${relatedLinks}</div>` : ''}
                <div class="detail-actions">
                    <button class="word-btn ghost detail-back" ${this.modalStack.length <= 1 ? 'disabled' : ''}>Voltar</button>
                    <button class="word-btn detail-edit">Editar</button>
                </div>
            </div>
        `;
        this.el.modalBody.querySelectorAll('.link-rel').forEach(btn => {
            btn.addEventListener('click', () => this.openWord(btn.dataset.id));
        });
        const backBtn = this.el.modalBody.querySelector('.detail-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.modalStack.pop();
                const prev = this.modalStack.pop();
                if (prev) this.openWord(prev);
            });
        }
        const editBtn = this.el.modalBody.querySelector('.detail-edit');
        if (editBtn) editBtn.addEventListener('click', () => this.openFormModal(word.id));
        this.el.modalOverlay.classList.remove('hidden');
        requestAnimationFrame(() => this.el.modalOverlay.classList.add('active'));
    },

    closeModal() {
        if (!this.el.modalOverlay) return;
        this.el.modalOverlay.classList.remove('active');
        setTimeout(() => this.el.modalOverlay.classList.add('hidden'), 200);
        this.modalStack = [];
    },

    trackSearch(term, ids) {
        if (!term || !ids.length) return;
        ids.forEach(id => {
            this.stats.searched[id] = (this.stats.searched[id] || 0) + 1;
        });
        this.saveStats();
        this.renderStats();
    },
    trackUsed(id) {
        if (!id) return;
        this.stats.used[id] = (this.stats.used[id] || 0) + 1;
        this.saveStats();
        this.renderStats();
    },
    trackWrong(id) {
        if (!id) return;
        this.stats.wrong[id] = (this.stats.wrong[id] || 0) + 1;
        this.saveStats();
        this.renderStats();
    },

    // ---------- Form modal (adicionar/editar) ----------
    openFormModal(id = null) {
        if (!this.State.openRadicalId && !id) {
            alert('Escolhe primeiro um radical para adicionar palavras.');
            return;
        }
        this.clearFeedback();
        if (id) {
            const w = this.wordsIndex.find(x => x.id === id);
            if (!w) return;
            this.formFields.wordId.value = w.id;
            this.formFields.character.value = w.character;
            this.formFields.pinyin.value = w.pinyin;
            this.formFields.meaning.value = w.meaning;
            this.formFields.hsk.value = w.hsk;
            this.formFields.type.value = w.type;
            this.formFields.exampleZh.value = w.example?.zh || '';
            this.formFields.examplePt.value = w.example?.pt || '';
            this.formFields.notes.value = w.notes || '';
            if (this.el.formModalTitle) this.el.formModalTitle.textContent = 'Editar Palavra';
        } else {
            if (this.el.wordForm) this.el.wordForm.reset();
            this.formFields.wordId.value = '';
            if (this.el.formModalTitle) this.el.formModalTitle.textContent = 'Adicionar Palavra';
        }
        if (this.el.formModal) {
            this.el.formModal.classList.remove('hidden');
            requestAnimationFrame(() => this.el.formModal.classList.add('active'));
        }
    },

    closeFormModal() {
        if (!this.el.formModal) return;
        this.el.formModal.classList.remove('active');
        setTimeout(() => this.el.formModal.classList.add('hidden'), 200);
    },

    async handleAiFill() {
        const character = (this.formFields.character.value || '').trim();
        if (!character) { alert('Por favor, insira um caractere chinês.'); return; }
        if (this.el.aiFillBtn) {
            this.el.aiFillBtn.disabled = true;
            this.el.aiFillBtn.textContent = 'A pesquisar...';
        }
        try {
            const aiData = await this.lookupWordWithAI(character);
            this.applyAIData(aiData);
        } catch (error) {
            console.error(error);
            alert(`Não foi possível obter uma sugestão para "${character}".`);
        } finally {
            if (this.el.aiFillBtn) {
                this.el.aiFillBtn.disabled = false;
                this.el.aiFillBtn.textContent = 'Auto';
            }
        }
    },

    lookupWordWithAI(character) {
        return fetch('/api/vocab-fill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: character })
        }).then(resp => {
            if (!resp.ok) throw new Error('Falha ao obter sugestão');
            return resp.json();
        });
    },

    applyAIData(aiData) {
        if (!aiData) return;
        const meaning = Array.isArray(aiData.meaning) ? aiData.meaning.join('; ') : (aiData.meaning || '');
        this.formFields.character.value = aiData.word || this.formFields.character.value;
        this.formFields.pinyin.value = aiData.pinyin || '';
        this.formFields.meaning.value = meaning;
        this.formFields.hsk.value = aiData.hsk || '';
        this.formFields.type.value = aiData.pos || '';
        this.formFields.exampleZh.value = aiData.example_sentence || aiData.related?.[0]?.word || '';
        this.formFields.examplePt.value = aiData.example_translation || aiData.related?.[0]?.meaning || '';
    },

    handleFormSubmit(event) {
        event.preventDefault();
        const idExisting = this.formFields.wordId.value || null;
        const wordData = {
            id: idExisting || `user-${Date.now()}`,
            character: this.formFields.character.value.trim(),
            pinyin: this.formFields.pinyin.value.trim(),
            meaning: this.formFields.meaning.value.trim(),
            hsk: this.formFields.hsk.value.trim(),
            type: this.formFields.type.value.trim(),
            notes: this.formFields.notes.value.trim(),
            example: { zh: this.formFields.exampleZh.value.trim(), pt: this.formFields.examplePt.value.trim(), pinyin: '' },
            compounds: []
        };
        if (!wordData.character || !wordData.pinyin || !wordData.meaning) {
            alert('Caractere, Pinyin e Significado são obrigatórios.');
            return;
        }
        const targetRadicalId = idExisting
            ? (this.wordsIndex.find(w => w.id === idExisting)?.radicalId)
            : this.State.openRadicalId;
        if (!targetRadicalId) {
            alert('Escolhe um radical antes de adicionar.');
            return;
        }
        const duplicate = this.wordsIndex.find(w =>
            w.id !== idExisting &&
            w.character === wordData.character &&
            w.pinyin.toLowerCase() === wordData.pinyin.toLowerCase() &&
            w.meaning.toLowerCase() === wordData.meaning.toLowerCase() &&
            w.hsk.toLowerCase() === wordData.hsk.toLowerCase()
        );
        if (duplicate) {
            alert('Esta palavra já existe.');
            return;
        }
        VocabularyData.mainCategories.forEach(main => {
            main.subCategories.forEach(sub => {
                sub.radicals.forEach(rad => {
                    if (rad.id === targetRadicalId) {
                        const idx = rad.words.findIndex(w => w.id === idExisting);
                        if (idx >= 0) rad.words[idx] = { ...rad.words[idx], ...wordData };
                        else rad.words.unshift(wordData);
                    }
                });
            });
        });
        this.buildIndex(VocabularyData);
        this.applyFilters();
        this.renderAll();
        this.closeFormModal();
        this.renderFeedback('✓ Palavra guardada com sucesso!', [], true, false);
        this.fetchSuggestionsFor(wordData.character).then(suggestions => {
            if (suggestions?.length) this.renderFeedback('✓ Palavra guardada com sucesso!', suggestions, false, false);
            else this.renderFeedback('✓ Palavra guardada com sucesso!', [], false, false);
        });
    },

    fetchSuggestionsFor(word) {
        return this.lookupWordWithAI(word).then(aiData => aiData.related || []).catch(() => []);
    },

    renderFeedback(message = '✓ Palavra guardada com sucesso!', suggestions = [], loadingSuggestions = false, addingSuggestions = false) {
        if (!this.el.feedback) return;
        const hasSuggestions = suggestions && suggestions.length;
        const suggestionLines = hasSuggestions
            ? suggestions.map(s => `<li>• ${s.word} ${s.pinyin ? `(${s.pinyin})` : ''} - ${s.meaning || ''}</li>`).join('')
            : '';
        this.el.feedback.innerHTML = `
            <div class="vocab-feedback-body">
                <div class="vocab-feedback-text">
                    <p class="feedback-title">${message}</p>
                    ${loadingSuggestions ? `<p class="feedback-sub">A obter palavras relacionadas...</p>` : ''}
                    ${addingSuggestions ? `<p class="feedback-sub">A adicionar palavras relacionadas...</p>` : ''}
                    ${hasSuggestions ? `<p class="feedback-sub">Palavras relacionadas que podes adicionar:</p>
                    <ul class="feedback-list">${suggestionLines}</ul>` : ''}
                </div>
                <div class="feedback-actions">
                    ${hasSuggestions ? `<button type="button" class="word-btn add-suggestions-btn"${addingSuggestions ? ' disabled' : ''}>${addingSuggestions ? 'A adicionar...' : 'Adicionar estas'}</button>` : ''}
                    <button type="button" class="word-btn ghost close-feedback-btn"${addingSuggestions ? ' disabled' : ''}>Fechar</button>
                </div>
            </div>
        `;
        const closeBtn = this.el.feedback.querySelector('.close-feedback-btn');
        if (closeBtn) closeBtn.onclick = () => this.clearFeedback();
        const addBtn = this.el.feedback.querySelector('.add-suggestions-btn');
        if (addBtn) addBtn.onclick = () => this.handleAddSuggestions(suggestions);
    },

    clearFeedback() {
        if (this.el.feedback) this.el.feedback.innerHTML = '';
    },

    handleAddSuggestions(suggestions) {
        if (!suggestions?.length) {
            this.clearFeedback();
            return;
        }
        this.renderFeedback('✓ Palavra guardada com sucesso!', suggestions, false, true);
        const toAdd = [];
        suggestions.forEach(sug => {
            const exists = this.wordsIndex.find(w => w.character === sug.word && w.pinyin === sug.pinyin);
            if (exists) return;
            toAdd.push({
                id: `sug-${Date.now()}-${Math.random()}`,
                character: sug.word,
                pinyin: sug.pinyin || '',
                meaning: sug.meaning || '',
                hsk: sug.hsk || '',
                type: sug.pos || '',
                notes: '',
                example: { zh: sug.example_sentence || '', pt: sug.example_translation || '', pinyin: '' },
                compounds: []
            });
        });
        if (!toAdd.length) {
            this.renderFeedback('Nenhuma sugestão adicionada.', [], false, false);
            return;
        }
        const targetRad = this.State.openRadicalId || (this.State.openSubCategoryId && VocabularyData.mainCategories.find(m => m.id === this.State.openMainCategoryId)?.subCategories.find(s => s.id === this.State.openSubCategoryId)?.radicals[0]?.id);
        if (!targetRad) {
            this.renderFeedback('Escolhe um radical para adicionar sugestões.', suggestions, false, false);
            return;
        }
        VocabularyData.mainCategories.forEach(main => {
            main.subCategories.forEach(sub => {
                sub.radicals.forEach(rad => {
                    if (rad.id === targetRad) {
                        rad.words = [...toAdd, ...rad.words];
                    }
                });
            });
        });
        this.buildIndex(VocabularyData);
        this.applyFilters();
        this.renderAll();
        this.renderFeedback('Sugestões adicionadas!', [], false, false);
    },

    saveStats() {
        try {
            localStorage.setItem('vocab_stats_v1', JSON.stringify(this.stats));
        } catch (_) {}
    },
    loadStats() {
        try {
            const raw = localStorage.getItem('vocab_stats_v1');
            if (raw) this.stats = { searched: {}, used: {}, wrong: {}, ...JSON.parse(raw) };
        } catch (_) {}
    }
};

window.Vocabulary = Vocabulary;

if (document.readyState !== 'loading') {
    Vocabulary.init();
} else {
    document.addEventListener('DOMContentLoaded', () => Vocabulary.init(), { once: true });
}
