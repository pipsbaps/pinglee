const Vocabulary = {
  initialized: false,
  modalStack: [],
  
  state: {
    currentView: 'categories',
    breadcrumb: [],
    selectedCategory: null,
    selectedSubcategory: null,
    selectedRadical: null,
    searchQuery: '',
    filterHSK: '',
    filterPOS: ''
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof VOCABULARY_DATA === 'undefined') {
      console.error('❌ VOCABULARY_DATA não encontrado! Certifica-te que vocabulary_data.js está carregado no HTML.');
      return;
    }

    console.log('✅ Categorias:', Object.keys(VOCABULARY_DATA.categories));
    
    this.cacheDOM();
    this.attachEvents();
    this.bootstrap();
  },

  cacheDOM() {
    this.vocabSection = document.getElementById('vocabulary');
    if (!this.vocabSection) return;

    this.breadcrumbEl = this.vocabSection.querySelector('#vocab-breadcrumb');
    this.panelEl = this.vocabSection.querySelector('#vocab-panel');
    this.searchInput = this.vocabSection.querySelector('#vocab-search');
    this.filterHSKSelect = this.vocabSection.querySelector('#vocab-filter-hsk');
    this.filterPOSSelect = this.vocabSection.querySelector('#vocab-filter-pos');
    this.metricTotal = this.vocabSection.querySelector('#metric-total');
    this.metricTrain = this.vocabSection.querySelector('#metric-train');
    this.addBtn = document.getElementById('open-add-word');
    this.formModal = document.getElementById('word-form-modal');
    this.formModalTitle = document.getElementById('form-modal-title');
    this.formClose = document.querySelector('.word-form-close');
    this.wordForm = document.getElementById('word-form');
    this.aiFillBtn = document.getElementById('ai-fill-btn');
    this.feedbackBox = document.getElementById('vocab-feedback');
    this.detailOverlay = document.getElementById('word-modal');
    this.detailBody = document.getElementById('word-modal-body');
    this.detailClose = this.detailOverlay?.querySelector('.word-modal-close') || null;
    this.formFields = {
      id: document.getElementById('word-id-input'),
      character: document.getElementById('character-input'),
      pinyin: document.getElementById('pinyin-input'),
      meaning: document.getElementById('translation-input'),
      hsk: document.getElementById('hsk-input'),
      type: document.getElementById('pos-input'),
      exampleZh: document.getElementById('example-chinese-input'),
      examplePt: document.getElementById('example-translation-input'),
      notes: document.getElementById('notes-input')
    };
  },

  attachEvents() {
    if (!this.vocabSection) return;

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value;
        if (this.state.currentView === 'words') this.renderWords();
      });
    }

    if (this.filterHSKSelect) {
      this.filterHSKSelect.addEventListener('change', (e) => {
        this.state.filterHSK = e.target.value || '';
        if (this.state.currentView === 'words') this.renderWords();
      });
    }

    if (this.filterPOSSelect) {
      this.filterPOSSelect.addEventListener('change', (e) => {
        this.state.filterPOS = e.target.value || '';
        if (this.state.currentView === 'words') this.renderWords();
      });
    }

    const backHome = document.getElementById('vocab-back-root');
    if (backHome) {
      backHome.addEventListener('click', () => this.goToCategories());
    }

    if (this.detailClose) this.detailClose.addEventListener('click', () => this.closeDetailModal());

    if (this.addBtn) this.addBtn.addEventListener('click', () => this.openFormModal());
    if (this.formClose) this.formClose.addEventListener('click', () => this.closeFormModal());
    if (this.aiFillBtn) this.aiFillBtn.addEventListener('click', () => this.handleAiFill());
    if (this.wordForm) this.wordForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

    const observer = new MutationObserver((mutations) => {
      if (mutations.some(m => m.attributeName === 'class')) {
        if (this.vocabSection.classList.contains('active')) this.render();
      }
    });
    observer.observe(this.vocabSection, { attributes: true });
  },

  bootstrap() {
    if (this.vocabSection.classList.contains('active')) this.render();
  },

  goToCategories() {
    this.state.currentView = 'categories';
    this.state.breadcrumb = [];
    this.state.selectedCategory = null;
    this.state.selectedSubcategory = null;
    this.state.selectedRadical = null;
    this.render();
  },

  goToCategory(categoryName) {
    this.state.selectedCategory = categoryName;
    this.state.breadcrumb = [categoryName];
    
    const categoryData = VOCABULARY_DATA.categories[categoryName];
    const firstKey = Array.isArray(categoryData.radicals) ? categoryData.radicals[0] : null;
    const first = firstKey ? VOCABULARY_DATA.radicals[firstKey] : null;
    
    this.state.currentView = first && first.characters ? 'radicals' : 'subcategories';
    this.render();
  },

  goToSubcategory(subcategoryName) {
    this.state.selectedSubcategory = subcategoryName;
    this.state.breadcrumb = [this.state.selectedCategory, subcategoryName];
    this.state.currentView = 'radicals';
    this.render();
  },

  goToRadical(radicalKey) {
    this.state.selectedRadical = radicalKey;
    
    if (this.state.selectedSubcategory) {
      this.state.breadcrumb = [this.state.selectedCategory, this.state.selectedSubcategory, radicalKey];
    } else {
      this.state.breadcrumb = [this.state.selectedCategory, radicalKey];
    }
    
    this.state.currentView = 'words';
    this.render();
  },

  render() {
   if (!this.panelEl) return;

   this.renderBreadcrumb();
   this.renderMetrics();

    switch (this.state.currentView) {
      case 'categories': this.renderCategories(); break;
      case 'subcategories': this.renderSubcategories(); break;
      case 'radicals': this.renderRadicals(); break;
      case 'words': this.renderWords(); break;
    }
  },

  renderBreadcrumb() {
    if (!this.breadcrumbEl) return;
    this.breadcrumbEl.innerHTML = '';
    if (!this.state.breadcrumb.length) {
      const span = document.createElement('span');
      span.textContent = 'Categorias';
      this.breadcrumbEl.appendChild(span);
      return;
    }
    this.state.breadcrumb.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item;
      btn.addEventListener('click', () => {
        if (idx === 0) {
          this.goToCategory(item);
        } else if (idx === 1) {
          this.goToSubcategory(item);
        } else if (idx === 2) {
          this.goToRadical(item);
        }
      });
      this.breadcrumbEl.appendChild(btn);
      if (idx < this.state.breadcrumb.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'sep';
        sep.textContent = '>';
        this.breadcrumbEl.appendChild(sep);
      }
    });
  },

  renderMetrics() {
    if (this.metricTotal) this.metricTotal.textContent = this.getAllWords().length;
    if (this.metricTrain) this.metricTrain.textContent = '0';
  },

  renderCategories() {
    this.setPanelLayout('grid');
    const categories = Object.keys(VOCABULARY_DATA.categories);
    this.panelEl.innerHTML = categories.map(cat => {
      const count = this.getWordsInCategory(cat).length;
      const slug = this.slugify(cat);
      return `<button class="category-btn cat-${slug}" data-category="${cat}">${cat}<br><small>${count} palavras</small></button>`;
    }).join('');

    this.panelEl.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.goToCategory(e.currentTarget.dataset.category));
    });
  },

  renderSubcategories() {
    this.setPanelLayout('grid');
    const categoryData = VOCABULARY_DATA.categories[this.state.selectedCategory];
    const subs = Array.isArray(categoryData.radicals) ? categoryData.radicals : [];

    const html = subs.map(sub => {
      const words = this.getWordsInSubcategory(sub);
      const count = words.length;
      return `<button class="subcategory-btn" data-sub="${sub}">${sub}<br><small>${count} palavras</small></button>`;
    }).join('');

    this.panelEl.innerHTML = html;

    this.panelEl.querySelectorAll('.subcategory-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.goToSubcategory(e.currentTarget.dataset.sub);
      });
    });
  },

  renderRadicals() {
    this.setPanelLayout('grid');
    let radicals;

    if (this.state.selectedSubcategory) {
      radicals = this.getRadicalsInSubcategory(this.state.selectedSubcategory);
    } else {
      const categoryData = VOCABULARY_DATA.categories[this.state.selectedCategory];
      radicals = (categoryData.radicals || []).map(key => ({
        key,
        data: VOCABULARY_DATA.radicals[key]
      }));
    }

    const html = radicals.map(({ key, data }) => {
      const count = data.characters ? data.characters.length : 0;
      const slug = this.slugify(this.state.selectedCategory);
      return `<button class="radical-btn cat-${slug}" data-radical="${key}">${key}<br><small>${count} palavras</small></button>`;
    }).join('');

    this.panelEl.innerHTML = html;

    this.panelEl.querySelectorAll('.radical-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.goToRadical(e.currentTarget.dataset.radical);
      });
    });
  },

  renderWords() {
    this.setPanelLayout('list');
    const radicalData = VOCABULARY_DATA.radicals[this.state.selectedRadical];
    let words = radicalData.characters || [];

    words = this.applyFilters(words);

    if (words.length === 0) {
      this.panelEl.innerHTML = '<div class="empty-message">Nenhuma palavra encontrada.</div>';
      return;
    }

    const html = words.map((w, idx) => `
      <div class="word-card" data-id="${this.buildWordId(this.state.selectedRadical, w, idx)}">
        <div class="word-title"><span class="word-char">${w.char}</span><span class="word-sep"> • </span><span class="word-py">${w.pinyin}</span></div>
        <div class="word-meaning">${w.meaning}</div>
        <div class="word-tags">
          ${w.hsk ? `<span class="tag tag-hsk">${w.hsk}</span>` : ''}
          ${this.getTypes(w).map(t => `<span class="tag tag-pos">${t}</span>`).join('')}
        </div>
      </div>
    `).join('');

    this.panelEl.innerHTML = html;
    this.panelEl.querySelectorAll('.word-card').forEach(card => {
      card.addEventListener('click', () => this.openWord(card.dataset.id));
    });
    this.updateFilterState(words.length);
  },

  openWord(id) {
    const found = this.findWordById(id);
    const word = found?.word;
    const body = this.detailBody;
    const overlay = this.detailOverlay;
    if (!word || !body || !overlay) return;
    const titleEl = overlay.querySelector('#modal-title');
    if (titleEl) titleEl.textContent = word.meaning || 'Detalhe';
    if (this.modalStack[this.modalStack.length - 1] !== id) this.modalStack.push(id);
    const compoundLinks = (word.compounds || []).map((c, idx) => {
      if (typeof c === 'string') {
        const rel = this.findWordById(c)?.word;
        return rel ? `<button class="link-rel" data-id="${rel.id}">${rel.char} ${rel.pinyin ? `(${rel.pinyin})` : ''}</button>` : '';
      }
      if (c && typeof c === 'object') {
        const label = `${c.char || ''}${c.pinyin ? ` (${c.pinyin})` : ''}`;
        return `<button class="link-rel" data-compound-idx="${idx}">${label}</button>`;
      }
      return '';
    }).join('');
    body.innerHTML = `
      <div class="word-detail">
        <div class="detail-main">
          <div class="detail-char">${word.char}</div>
          <div class="detail-pinyin">${word.pinyin || '—'}</div>
        </div>
        <div class="detail-meaning">${word.meaning || '—'}</div>
        <div class="word-tags">
          ${word.hsk ? `<span class="tag tag-hsk">${word.hsk}</span>` : ''}
          ${this.getTypes(word).map(t => `<span class="tag tag-pos">${t}</span>`).join('')}
        </div>
        ${word.notes?.length ? `<p class="word-notes">${word.notes.join(' ')}</p>` : ''}
        ${compoundLinks ? `<div class="related-links">${compoundLinks}</div>` : ''}
        ${word.example ? `<div class="detail-example"><div>${word.example.zh || ''}</div><div class="detail-example-py">${word.example.pinyin || ''}</div><div class="detail-example-pt">${word.example.pt || ''}</div></div>` : ''}
        <div class="detail-actions">
          <div class="detail-actions-left">
            <button class="icon-btn ghost detail-back" ${this.modalStack.length <= 1 ? 'disabled' : ''} aria-label="Voltar">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M15 5l-7 7 7 7"/></svg>
            </button>
          </div>
          <div class="detail-actions-right">
            <button class="icon-btn detail-edit" aria-label="Editar">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.76 3.76 1.83-1.83z"/></svg>
            </button>
            <button class="icon-btn danger detail-delete" aria-label="Apagar">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7m-7 4v6m4-6v6"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
    body.querySelectorAll('.link-rel').forEach(btn => {
      const { id: relId, compoundIdx } = btn.dataset;
      if (relId) {
        btn.addEventListener('click', () => this.openWord(relId));
      } else if (compoundIdx) {
        const comp = (word.compounds || [])[Number(compoundIdx)];
        if (comp) btn.addEventListener('click', () => this.openCompoundDetail(comp, id));
      }
    });
    const backBtn = body.querySelector('.detail-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      this.modalStack.pop();
      const prev = this.modalStack.pop();
      if (prev) this.openWord(prev);
    });
    const editBtn = body.querySelector('.detail-edit');
    if (editBtn) editBtn.addEventListener('click', () => this.openFormModal(id));
    const delBtn = body.querySelector('.detail-delete');
    if (delBtn) delBtn.addEventListener('click', () => this.handleDeleteWord(id));
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  closeDetailModal() {
    if (!this.detailOverlay) return;
    this.detailOverlay.classList.remove('active');
    setTimeout(() => this.detailOverlay.classList.add('hidden'), 150);
    this.modalStack = [];
  },

  openCompoundDetail(compound, sourceId = null) {
    const overlay = this.detailOverlay;
    const body = this.detailBody;
    if (!overlay || !body || !compound) return;
    const pseudoId = compound.id || `compound::${compound.char || ''}::${compound.pinyin || ''}`;
    if (this.modalStack[this.modalStack.length - 1] !== pseudoId) this.modalStack.push(pseudoId);

    const titleEl = overlay.querySelector('#modal-title');
    if (titleEl) titleEl.textContent = compound.char || 'Detalhe';

    body.innerHTML = `
      <div class="word-detail">
        <div class="detail-main">
          <div class="detail-char">${compound.char || ''}</div>
          <div class="detail-pinyin">${compound.pinyin || '—'}</div>
        </div>
        <div class="detail-meaning">${compound.meaning || '—'}</div>
        ${compound.hsk ? `<div class="word-tags"><span class="tag tag-hsk">${compound.hsk}</span></div>` : ''}
        ${compound.type?.length ? `<div class="word-tags">${compound.type.map(t => `<span class="tag tag-pos">${t}</span>`).join('')}</div>` : ''}
        ${compound.notes?.length ? `<p class="word-notes">${compound.notes.join(' ')}</p>` : ''}
        <div class="detail-actions">
          <div class="detail-actions-left">
            <button class="icon-btn ghost detail-back" ${this.modalStack.length <= 1 ? 'disabled' : ''} aria-label="Voltar">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M15 5l-7 7 7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const backBtn = body.querySelector('.detail-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      this.modalStack.pop();
      const prev = this.modalStack.pop();
      if (prev) this.openWord(prev);
    });

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  handleDeleteWord(id) {
    const found = this.findWordById(id);
    if (!found) return;
    const { radicalKey, word } = found;
    const radEntry = VOCABULARY_DATA.radicals[radicalKey];
    if (!radEntry?.characters) return;
    const confirmed = window.confirm(`Remover "${word.char}"?`);
    if (!confirmed) return;
    radEntry.characters = radEntry.characters.filter(w => w.id === id ? false : this.buildWordId(radicalKey, w) !== id);
    this.modalStack = [];
    this.closeDetailModal();
    this.render();
  },

  getAllWords() {
    const words = [];
    Object.values(VOCABULARY_DATA.radicals).forEach(r => {
      if (r.characters) words.push(...r.characters);
    });
    return words;
  },

  getWordsInCategory(cat) {
    const words = [];
    const catData = VOCABULARY_DATA.categories[cat];
    
    (catData.radicals || []).forEach(key => {
      const rad = VOCABULARY_DATA.radicals[key];
      if (rad && rad.characters) words.push(...rad.characters);
    });
    
    return words;
  },

  getWordsInSubcategory(sub) {
    const radicals = this.getRadicalsInSubcategory(sub);
    return radicals.flatMap(r => r.data?.characters || []);
  },

  getRadicalsInSubcategory(sub) {
    const radicals = [];
    Object.entries(VOCABULARY_DATA.radicals).forEach(([key, data]) => {
      if ((data.category === sub || data.subcategory === sub) && data.characters) {
        radicals.push({ key, data });
      }
    });
    return radicals;
  },

  setPanelLayout(mode) {
    if (!this.panelEl) return;
    this.panelEl.classList.toggle('grid-2', mode === 'grid');
    this.panelEl.classList.toggle('list', mode === 'list');
  },

  updateFilterState(count = 0) {
    if (this.filterHSKSelect) {
      const active = !!this.state.filterHSK;
      this.filterHSKSelect.classList.toggle('is-active', active);
      this.filterHSKSelect.dataset.count = active ? count : '';
    }
    if (this.filterPOSSelect) {
      const active = !!this.state.filterPOS;
      this.filterPOSSelect.classList.toggle('is-active', active);
      this.filterPOSSelect.dataset.count = active ? count : '';
    }
  },

  slugify(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  },

  applyFilters(words) {
    let filtered = words;

    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(w => 
        w.char.includes(q) ||
        (w.pinyin && w.pinyin.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q))
      );
    }

    if (this.state.filterHSK) {
      filtered = filtered.filter(w => String(w.hsk || '').toUpperCase() === this.state.filterHSK.toUpperCase());
    }

    if (this.state.filterPOS) {
      filtered = filtered.filter(w => {
        const types = this.getTypes(w);
        return types.some(t => t.toLowerCase() === this.state.filterPOS.toLowerCase());
      });
    }

    return filtered;
  },

  openFormModal(id = null) {
    if (!this.formModal) return;
    if (!this.state.selectedRadical && !id) {
      alert('Escolhe um radical antes de adicionar.');
      return;
    }
    this.clearFeedback();
    if (id) {
      const found = this.findWordById(id);
      if (!found) return;
      const { word, radicalKey } = found;
      this.formFields.id.value = id;
      this.formFields.character.value = word.char || '';
      this.formFields.pinyin.value = word.pinyin || '';
      this.formFields.meaning.value = word.meaning || '';
      this.formFields.hsk.value = word.hsk || '';
      this.formFields.type.value = Array.isArray(word.type) ? word.type.join(', ') : (word.type || '');
      this.formFields.exampleZh.value = word.example?.zh || '';
      this.formFields.examplePt.value = word.example?.pt || '';
      this.formFields.notes.value = (word.notes || []).join(' ');
      this.formModal.dataset.radical = radicalKey;
      if (this.formModalTitle) this.formModalTitle.textContent = 'Editar Palavra';
    } else {
      if (this.wordForm) this.wordForm.reset();
      this.formFields.id.value = '';
      this.formModal.dataset.radical = this.state.selectedRadical || '';
      if (this.formModalTitle) this.formModalTitle.textContent = 'Adicionar Palavra';
    }
    this.formModal.classList.remove('hidden');
    requestAnimationFrame(() => this.formModal.classList.add('active'));
  },

  closeFormModal() {
    if (!this.formModal) return;
    this.formModal.classList.remove('active');
    setTimeout(() => this.formModal.classList.add('hidden'), 150);
  },

  async handleAiFill() {
    const character = (this.formFields.character.value || '').trim();
    if (!character) { alert('Por favor, insira um caractere chinês.'); return; }
    const prompt = `Qual o significado de ${character}? qual o radical e que caracteres compõem o radical (se aplicável)? qual a sua composição/estrutura? diz-me outros caracteres e palavras mais usadas com este caractere como componente, incluindo significados literais e/ou figurativos/metafóricos para além do significado base. Se aplicável, inclui palavras que tenham este caractere, mas que o significado não esteja relacionado. Utiliza a seguinte estrutura (sem bullet points e sem o título):
Palavra
Pinyin
Significado (máx 3)
Função gramatical
nível de hsk
frases exemplos + pinyin
tradução`;
    try {
      if (this.aiFillBtn) { this.aiFillBtn.disabled = true; this.aiFillBtn.textContent = 'A pesquisar...'; }
      const aiData = await this.lookupWordWithAI(prompt);
      this.applyAIData(aiData);
    } catch (e) {
      console.error(e);
      alert('Não foi possível obter dados da IA.');
    } finally {
      if (this.aiFillBtn) { this.aiFillBtn.disabled = false; this.aiFillBtn.textContent = 'Auto'; }
    }
  },

  lookupWordWithAI(query) {
    return fetch('/api/vocab-fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }).then(r => {
      if (!r.ok) throw new Error('AI error');
      return r.json();
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
    this.formFields.exampleZh.value = aiData.example_sentence || '';
    this.formFields.examplePt.value = aiData.example_translation || '';
  },

  handleFormSubmit(e) {
    e.preventDefault();
    const targetRadical = this.formModal?.dataset.radical || this.state.selectedRadical;
    if (!targetRadical) { alert('Escolhe um radical antes de guardar.'); return; }
    const radEntry = VOCABULARY_DATA.radicals[targetRadical];
    if (!radEntry) { alert('Radical não encontrado.'); return; }
    if (!Array.isArray(radEntry.characters)) radEntry.characters = [];

    const idExisting = this.formFields.id.value || null;
    const wordData = {
      id: idExisting || `user-${Date.now()}`,
      char: this.formFields.character.value.trim(),
      pinyin: this.formFields.pinyin.value.trim(),
      meaning: this.formFields.meaning.value.trim(),
      hsk: this.formFields.hsk.value.trim(),
      type: (this.formFields.type.value || '').split(',').map(s => s.trim()).filter(Boolean),
      notes: this.formFields.notes.value.trim() ? [this.formFields.notes.value.trim()] : [],
      example: {
        zh: this.formFields.exampleZh.value.trim(),
        pinyin: '',
        pt: this.formFields.examplePt.value.trim()
      }
    };
    if (!wordData.char || !wordData.pinyin || !wordData.meaning) {
      alert('Caractere, Pinyin e Significado são obrigatórios.');
      return;
    }
    const duplicate = radEntry.characters.find(w =>
      w.id !== idExisting &&
      w.char === wordData.char &&
      w.pinyin.toLowerCase() === wordData.pinyin.toLowerCase() &&
      w.meaning.toLowerCase() === wordData.meaning.toLowerCase()
    );
    if (duplicate) {
      alert('Esta palavra já existe neste radical.');
      return;
    }
    if (idExisting) {
      const idx = radEntry.characters.findIndex(w => w.id === idExisting);
      if (idx >= 0) radEntry.characters[idx] = { ...radEntry.characters[idx], ...wordData };
      else radEntry.characters.unshift(wordData);
    } else {
      radEntry.characters.unshift(wordData);
    }
    this.state.selectedRadical = targetRadical;
    this.render();
    this.renderFeedback('✓ Palavra guardada com sucesso!', [], true, false);
    this.fetchSuggestionsFor(wordData.char).then(suggestions => {
      if (suggestions?.length) this.renderFeedback('✓ Palavra guardada com sucesso!', suggestions, false, false);
      else this.renderFeedback('✓ Palavra guardada com sucesso!', [], false, false);
    });
  },

  findWordById(id) {
    let found = null;
    Object.entries(VOCABULARY_DATA.radicals).forEach(([key, data]) => {
      if (found) return;
      const list = data.characters || [];
      list.forEach((w, idx) => {
        if (found) return;
        if (w.id && w.id === id) {
          found = { word: w, radicalKey: key, index: idx };
          return;
        }
        const idxId = `${key}::idx::${idx}`;
        if (id === idxId) {
          found = { word: w, radicalKey: key, index: idx };
          return;
        }
        if (this.buildWordId(key, w, idx) === id) {
          found = { word: w, radicalKey: key, index: idx };
        }
      });
    });
    return found;
  },

  buildWordId(radKey, word, idx = null) {
    if (word.id) return word.id;
    const safeRad = radKey || 'rad';
    if (idx !== null && idx !== undefined) return `${safeRad}::idx::${idx}`;
    const safeChar = word.char || 'char';
    const safePy = word.pinyin || '';
    return `${safeRad}::${safeChar}::${safePy}`;
  },

  getTypes(word) {
    if (!word) return [];
    if (Array.isArray(word.type)) {
      return word.type.map(t => t.trim()).filter(Boolean);
    }
    if (typeof word.type === 'string') {
      return word.type.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  },

  clearFeedback() {
    if (this.feedbackBox) this.feedbackBox.innerHTML = '';
  },

  fetchSuggestionsFor(word) {
    return this.lookupWordWithAI(word).then(aiData => aiData.related || []).catch(() => []);
  },

  renderFeedback(message = '✓ Palavra guardada com sucesso!', suggestions = [], loading = false, adding = false) {
    if (!this.feedbackBox) return;
    const hasSuggestions = suggestions && suggestions.length;
    const suggestionLines = hasSuggestions
      ? suggestions.map(s => `<li>• ${s.word} ${s.pinyin ? `(${s.pinyin})` : ''} - ${s.meaning || ''}</li>`).join('')
      : '';
    this.feedbackBox.innerHTML = `
      <div class="vocab-feedback-body">
        <div class="vocab-feedback-text">
          <p class="feedback-title">${message}</p>
          ${loading ? `<p class="feedback-sub">A obter palavras relacionadas...</p>` : ''}
          ${adding ? `<p class="feedback-sub">A adicionar palavras relacionadas...</p>` : ''}
          ${hasSuggestions ? `<p class="feedback-sub">Palavras relacionadas que podes adicionar:</p><ul class="feedback-list">${suggestionLines}</ul>` : ''}
        </div>
        <div class="feedback-actions">
          ${hasSuggestions ? `<button type="button" class="word-btn add-suggestions-btn" ${adding ? 'disabled' : ''}>${adding ? 'A adicionar...' : 'Adicionar estas'}</button>` : ''}
          <button type="button" class="word-btn ghost close-feedback-btn"${adding ? ' disabled' : ''}>Fechar</button>
        </div>
      </div>
    `;
    const closeBtn = this.feedbackBox.querySelector('.close-feedback-btn');
    if (closeBtn) closeBtn.onclick = () => {
      this.clearFeedback();
      if (this.formModal && this.formModal.classList.contains('active')) this.closeFormModal();
    };
    const addBtn = this.feedbackBox.querySelector('.add-suggestions-btn');
    if (addBtn) addBtn.onclick = () => this.handleAddSuggestions(suggestions);
  },

  handleAddSuggestions(suggestions) {
    if (!suggestions?.length) {
      this.clearFeedback();
      return;
    }
    this.renderFeedback('✓ Palavra guardada com sucesso!', suggestions, false, true);
    const targetRad = this.state.selectedRadical;
    if (!targetRad) {
      this.renderFeedback('Escolhe um radical para adicionar sugestões.', suggestions, false, false);
      return;
    }
    const radEntry = VOCABULARY_DATA.radicals[targetRad];
    if (!radEntry) {
      this.renderFeedback('Radical não encontrado.', suggestions, false, false);
      return;
    }
    if (!Array.isArray(radEntry.characters)) radEntry.characters = [];
    const toAdd = [];
    suggestions.forEach(s => {
      const exists = radEntry.characters.find(w => w.char === s.word && w.pinyin === s.pinyin);
      if (exists) return;
      toAdd.push({
        id: `sug-${Date.now()}-${Math.random()}`,
        char: s.word,
        pinyin: s.pinyin || '',
        meaning: s.meaning || '',
        hsk: s.hsk || '',
        type: s.pos ? [s.pos] : [],
        notes: [],
        example: {
          zh: s.example_sentence || '',
          pinyin: '',
          pt: s.example_translation || ''
        }
      });
    });
    radEntry.characters = [...toAdd, ...radEntry.characters];
    this.render();
    this.renderFeedback('Sugestões adicionadas!', [], false, false);
  }
};

window.Vocabulary = Vocabulary;

if (document.readyState !== 'loading') {
  window.Vocabulary.init();
} else {
  document.addEventListener('DOMContentLoaded', () => window.Vocabulary.init(), { once: true });
}
