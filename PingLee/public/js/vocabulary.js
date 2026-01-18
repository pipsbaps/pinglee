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
            modalClose: document.querySelector('.word-modal-close')
        };
        if (!this.el.section) return;

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
        this.State.visibleWords = this.wordsIndex.filter(w => {
            if (term && !w.searchBlob.includes(term)) return false;
            if (this.State.filterHSK && w.hsk !== this.State.filterHSK) return false;
            if (this.State.filterPOS && w.type !== this.State.filterPOS) return false;
            if (this.State.openRadicalId && w.radicalId !== this.State.openRadicalId) return false;
            return true;
        });
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
        if (!parts.length) {
            const span = document.createElement('span');
            span.textContent = 'Categorias';
            frag.appendChild(span);
        } else {
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
        grid.className = 'panel-grid';
        VocabularyData.mainCategories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'panel-card';
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
        subGrid.className = 'panel-grid';
        main.subCategories.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'panel-card';
            card.innerHTML = `<div class="title">${sub.name}</div><div class="meta">${sub.radicals.length} radicais</div>`;
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
        radGrid.className = 'panel-grid';
        sub.radicals.forEach(rad => {
            const count = this.radicalsIndex.get(rad.id)?.length || 0;
            const card = document.createElement('div');
            card.className = 'panel-card';
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
        list.className = 'vocab-list';
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
                    <div class="title">${w.character} • ${w.pinyin}</div>
                    <div class="meta">${w.meaning}</div>
                    <div class="meta">HSK: ${w.hsk || '—'} | Função: ${w.type || '—'}</div>
                `;
                card.addEventListener('click', () => this.openWord(w.id));
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
        this.el.modalTitle.textContent = word.character;
        const relatedLinks = (word.compounds || []).map(cid => {
            const rel = this.wordsIndex.find(w => w.id === cid);
            return rel ? `<button class="link-rel" data-id="${rel.id}">${rel.character} ${rel.pinyin ? `(${rel.pinyin})` : ''}</button>` : '';
        }).join('');
        this.el.modalBody.innerHTML = `
            <p><strong>Pinyin:</strong> ${word.pinyin || '—'}</p>
            <p><strong>Significado:</strong> ${word.meaning || '—'}</p>
            <p><strong>HSK:</strong> ${word.hsk || '—'} | <strong>Função:</strong> ${word.type || '—'}</p>
            ${word.notes ? `<p><strong>Notas:</strong> ${word.notes}</p>` : ''}
            ${word.example ? `<div><strong>Exemplo:</strong><div>${word.example.zh || ''}</div><div>${word.example.pinyin || ''}</div><div>${word.example.pt || ''}</div></div>` : ''}
            ${relatedLinks ? `<div class="related-links"><strong>Relacionadas:</strong> ${relatedLinks}</div>` : ''}
        `;
        this.el.modalBody.querySelectorAll('.link-rel').forEach(btn => {
            btn.addEventListener('click', () => this.openWord(btn.dataset.id));
        });
        this.el.modalOverlay.classList.remove('hidden');
        requestAnimationFrame(() => this.el.modalOverlay.classList.add('active'));
    },

    closeModal() {
        if (!this.el.modalOverlay) return;
        this.el.modalOverlay.classList.remove('active');
        setTimeout(() => this.el.modalOverlay.classList.add('hidden'), 200);
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
