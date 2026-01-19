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
  lastAddedWordRef: null,

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
    this.searchForm = this.vocabSection.querySelector('#vocab-search-form');
    this.searchInput = this.vocabSection.querySelector('#vocab-search');
    this.filterHSKSelect = this.vocabSection.querySelector('#vocab-filter-hsk');
    this.filterPOSSelect = this.vocabSection.querySelector('#vocab-filter-pos');
    this.metricTotal = this.vocabSection.querySelector('#metric-total');
    this.metricTrain = this.vocabSection.querySelector('#metric-train');
    this.metricTrainBtn = document.getElementById('metric-train-btn');
    this.addBtn = document.getElementById('open-add-word');
    this.formModal = document.getElementById('word-form-modal');
    this.formModalTitle = document.getElementById('form-modal-title');
    this.formClose = document.querySelector('.word-form-close');
    this.wordForm = document.getElementById('word-form');
    this.aiFillBtn = document.getElementById('ai-fill-btn');
    this.feedbackBox = document.getElementById('vocab-feedback');
    this.detailOverlay = document.getElementById('word-modal');
    this.detailBody = document.getElementById('word-modal-body');
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
    if (this.searchForm) {
      this.searchForm.addEventListener('submit', (e) => this.handleSearchSubmit(e));
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

    if (this.addBtn) this.addBtn.addEventListener('click', () => this.openFormModal());
    if (this.formClose) this.formClose.addEventListener('click', () => this.closeFormModal());
    if (this.aiFillBtn) this.aiFillBtn.addEventListener('click', () => this.handleAiFill());
    if (this.wordForm) this.wordForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    if (this.metricTrainBtn) this.metricTrainBtn.addEventListener('click', () => this.showTrainingList());

    const observer = new MutationObserver((mutations) => {
      if (mutations.some(m => m.attributeName === 'class')) {
        if (this.vocabSection.classList.contains('active')) this.render();
      }
    });
    observer.observe(this.vocabSection, { attributes: true });
  },

  handleSearchSubmit(e) {
    if (e) e.preventDefault();
    if (this.searchInput) this.state.searchQuery = this.searchInput.value.trim();
    if (this.state.currentView === 'words') {
      this.renderWords();
    } else {
      this.render();
    }
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
    if (this.metricTrain) this.metricTrain.textContent = this.getTrainingWords().length;
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
      const count = this.countWordsIncludingCompounds(data.characters || []);
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
    let words = [];
    if (this.state.showingTrain) {
      words = this.getTrainingWords().map(item => ({ ...item }));
    } else {
      const radicalData = VOCABULARY_DATA.radicals[this.state.selectedRadical];
      words = radicalData.characters || [];
    }

    words = this.applyFilters(words);

    if (words.length === 0) {
      this.panelEl.innerHTML = '<div class="empty-message">Nenhuma palavra encontrada.</div>';
      return;
    }

    const html = words.map((w, idx) => `
      <div class="word-card" data-id="${this.buildWordId(this.state.selectedRadical, w, idx)}" data-word-idx="${idx}">
        <div class="word-title"><span class="word-char">${w.char}</span><span class="word-sep"> • </span><span class="word-py">${w.pinyin}</span></div>
        <div class="word-meaning">${w.meaning}</div>
        <div class="word-tags">
          ${this.formatHSK(w.hsk) ? `<span class="tag tag-hsk ${this.getHSKClass(w.hsk)}">${this.formatHSK(w.hsk)}</span>` : ''}
          ${this.getTypes(w).map(t => `<span class="tag tag-pos ${this.getPOSClass(t)}">${t}</span>`).join('')}
          ${this.renderCompoundTags(w)}
        </div>
        ${w.train ? '<div class="train-flag" aria-label="Marcada para treinar">Treinar</div>' : ''}
      </div>
    `).join('');

    this.panelEl.innerHTML = html;
    const cards = this.panelEl.querySelectorAll('.word-card');
    cards.forEach(card => {
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
    const notesContent = Array.isArray(word.notes)
      ? word.notes.join(' ')
      : (word.notes || '');
    const formattedNotes = notesContent
      ? `<div class="word-notes">${notesContent}</div>`
      : '';
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
    const trainBtn = `
      <button class="train-toggle" data-id="${id}" aria-pressed="${word.train ? 'true' : 'false'}">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>${word.train ? 'Marcada para treinar' : 'Marcar para treinar'}</span>
      </button>
    `;
    body.innerHTML = `
      <div class="word-detail">
        <div class="detail-main">
          <div class="detail-char">${word.char}</div>
          <div class="detail-pinyin">${word.pinyin || '—'}</div>
        </div>
        <div class="detail-meaning">${word.meaning || '—'}</div>
        <div class="word-tags">
          ${this.formatHSK(word.hsk) ? `<span class="tag tag-hsk ${this.getHSKClass(word.hsk)}">${this.formatHSK(word.hsk)}</span>` : ''}
          ${this.getTypes(word).map(t => `<span class="tag tag-pos ${this.getPOSClass(t)}">${t}</span>`).join('')}
        </div>
        ${trainBtn}
        ${formattedNotes}
        ${compoundLinks ? `<div class="related-links">${compoundLinks}</div>` : ''}
        ${word.example ? `<div class="detail-example"><div>${word.example.zh || ''}</div><div class="detail-example-py">${word.example.pinyin || ''}</div><div class="detail-example-pt">${word.example.pt || ''}</div></div>` : ''}
        <div class="detail-actions">
          <div class="detail-actions-left">
            <button class="icon-btn ghost detail-back" aria-label="Voltar">
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
        if (comp) btn.addEventListener('click', () => this.openCompoundDetail(comp, id, Number(compoundIdx)));
      }
    });
    const backBtn = body.querySelector('.detail-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      this.modalStack.pop();
      const prev = this.modalStack.pop();
      if (prev) {
        this.openWord(prev);
      } else {
        this.closeDetailModal();
      }
    });
    const editBtn = body.querySelector('.detail-edit');
    if (editBtn) editBtn.addEventListener('click', () => this.openFormModal(id));
    const delBtn = body.querySelector('.detail-delete');
    if (delBtn) delBtn.addEventListener('click', () => this.handleDeleteWord(id));
    const trainToggle = body.querySelector('.train-toggle');
    if (trainToggle) trainToggle.addEventListener('click', () => this.toggleTrain(id));
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  closeDetailModal() {
    if (!this.detailOverlay) return;
    this.detailOverlay.classList.remove('active');
    setTimeout(() => this.detailOverlay.classList.add('hidden'), 150);
    this.modalStack = [];
    this.state.showingTrain = false;
  },

  openCompoundDetail(compound, sourceId = null, compoundIndex = null) {
    const overlay = this.detailOverlay;
    const body = this.detailBody;
    if (!overlay || !body || !compound) return;
    if (!compound.id) compound.id = `compound-${Date.now()}-${Math.random()}`;
    const pseudoId = compound.id;
    if (this.modalStack[this.modalStack.length - 1] !== pseudoId) this.modalStack.push(pseudoId);

    const titleEl = overlay.querySelector('#modal-title');
    if (titleEl) titleEl.textContent = compound.char || 'Detalhe';
    const notesContent = Array.isArray(compound.notes)
      ? compound.notes.join(' ')
      : (compound.notes || '');
    const formattedNotes = notesContent
      ? `<div class="word-notes">${notesContent}</div>`
      : '';

    body.innerHTML = `
      <div class="word-detail">
        <div class="detail-main">
          <div class="detail-char">${compound.char || ''}</div>
          <div class="detail-pinyin">${compound.pinyin || '—'}</div>
        </div>
        <div class="detail-meaning">${compound.meaning || '—'}</div>
        ${this.formatHSK(compound.hsk) ? `<div class="word-tags"><span class="tag tag-hsk ${this.getHSKClass(compound.hsk)}">${this.formatHSK(compound.hsk)}</span></div>` : ''}
        ${compound.type?.length ? `<div class="word-tags">${compound.type.map(t => `<span class="tag tag-pos ${this.getPOSClass(t)}">${t}</span>`).join('')}</div>` : ''}
        ${formattedNotes}
        <div class="detail-actions">
          <div class="detail-actions-left">
            <button class="icon-btn ghost detail-back" aria-label="Voltar">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M15 5l-7 7 7 7"/></svg>
            </button>
            <button class="icon-btn detail-edit compound-edit" aria-label="Editar">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.76 3.76 1.83-1.83z"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const backBtn = body.querySelector('.detail-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      this.modalStack.pop();
      const prev = this.modalStack.pop();
      if (prev) {
        this.openWord(prev);
      } else {
        this.closeDetailModal();
      }
    });
    const editBtn = body.querySelector('.compound-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.openCompoundForm(compound, sourceId, compoundIndex));
    }

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  toggleTrain(id) {
    const found = this.findWordById(id);
    if (!found) return;
    const { word } = found;
    word.train = !word.train;
    this.renderMetrics();
    const message = word.train ? 'Palavra marcada para treinar.' : 'Palavra removida de treino.';
    this.renderFeedback(message, [], false, false);
    if (this.state.showingTrain) this.showTrainingList();
  },

  handleDeleteWord(id) {
    const found = this.findWordById(id);
    if (!found) return;
    const { radicalKey, word } = found;
    const radEntry = VOCABULARY_DATA.radicals[radicalKey];
    if (!radEntry?.characters) return;
    const confirmed = window.confirm(`Remover "${word.char}"?`);
    if (!confirmed) return;
    radEntry.characters = radEntry.characters.filter((w, idx) => {
      if (w.id && w.id === id) return false;
      const generatedId = this.buildWordId(radicalKey, w, idx);
      return generatedId !== id;
    });
    this.modalStack = [];
    this.closeDetailModal();
    this.render();
  },

  getAllWords() {
    const words = [];
    Object.values(VOCABULARY_DATA.radicals).forEach(r => {
      if (r.characters) {
        r.characters.forEach(w => words.push(...this.flattenWord(w)));
      }
    });
    return words;
  },

  getWordsInCategory(cat) {
    const words = [];
    const catData = VOCABULARY_DATA.categories[cat];
    
    (catData.radicals || []).forEach(key => {
      const rad = VOCABULARY_DATA.radicals[key];
      if (rad && rad.characters) {
        rad.characters.forEach(w => words.push(...this.flattenWord(w)));
      }
    });
    
    return words;
  },

  getWordsInSubcategory(sub) {
    const radicals = this.getRadicalsInSubcategory(sub);
    return radicals.flatMap(r => this.flattenCharacters(r.data?.characters || []));
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
    this.state.showingTrain = false;
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

  formatHSK(hsk) {
    if (hsk === null || hsk === undefined) return '';
    const raw = String(hsk).trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    if (upper.startsWith('HSK')) return upper;
    const numeric = raw.replace(/[^0-9]/g, '') || raw;
    return `HSK${numeric}`;
  },

  getHSKClass(hsk) {
    const label = this.formatHSK(hsk);
    const match = label.match(/HSK\s*([1-6])/i);
    if (!match) return '';
    return `hsk${match[1]}`;
  },

  flattenWord(word) {
    if (!word) return [];
    const stack = [word];
    const list = [];
    while (stack.length) {
      const current = stack.shift();
      if (!current) continue;
      list.push(current);
      if (Array.isArray(current.compounds) && current.compounds.length) {
        current.compounds.forEach(c => stack.push(c));
      }
    }
    return list;
  },

  flattenCharacters(characters = []) {
    return characters.flatMap(ch => this.flattenWord(ch));
  },

  countWordsIncludingCompounds(characters = []) {
    return this.flattenCharacters(characters).length;
  },

  getTrainingWords() {
    const list = [];
    Object.entries(VOCABULARY_DATA.radicals).forEach(([key, data]) => {
      (data.characters || []).forEach((w, idx) => {
        if (w.train) list.push({ ...w, _radical: key, _idx: idx });
      });
    });
    return list;
  },

  showTrainingList() {
    this.state.showingTrain = true;
    this.setPanelLayout('list');
    this.renderWords();
  },

  existsInVocabulary(char, pinyin = '', excludeId = null) {
    const targetChar = (char || '').trim();
    const targetPy = (pinyin || '').trim().toLowerCase();
    if (!targetChar) return false;
    let found = false;
    Object.values(VOCABULARY_DATA.radicals).forEach(rad => {
      if (found || !rad.characters) return;
      rad.characters.forEach(w => {
        if (found) return;
        this.flattenWord(w).forEach(item => {
          if (found) return;
          if (excludeId) {
            const genId = this.buildWordId(key, item, idx);
            if ((item.id && item.id === excludeId) || genId === excludeId) return;
          }
          const sameChar = (item.char || '').trim() === targetChar;
          const samePy = targetPy ? (item.pinyin || '').trim().toLowerCase() === targetPy : true;
          if (sameChar && samePy) found = true;
        });
      });
    });
    return found;
  },

  filterNewSuggestions(suggestions = []) {
    return (suggestions || []).filter(s => s && s.word && !this.existsInVocabulary(s.word, s.pinyin));
  },

  getPOSClass(pos) {
    if (!pos) return '';
    return `pos-${this.slugify(pos)}`;
  },

  renderCompoundTags(word) {
    const compounds = Array.isArray(word?.compounds) ? word.compounds : [];
    if (!compounds.length) return '';
    return compounds.map(c => `<span class="compound-chip">${c.char || ''}</span>`).join('');
  },

  setAiFillLoading(isLoading) {
    if (!this.aiFillBtn) return;
    this.aiFillBtn.disabled = isLoading;
    if (isLoading) {
      this.aiFillBtn.classList.add('is-loading');
      this.aiFillBtn.innerHTML = '<span class="dots-loading"><span>.</span><span>.</span><span>.</span></span>';
    } else {
      this.aiFillBtn.classList.remove('is-loading');
      this.aiFillBtn.textContent = 'Auto';
    }
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
      const targetHSK = this.state.filterHSK.toUpperCase();
      filtered = filtered.filter(w => this.formatHSK(w.hsk).toUpperCase() === targetHSK);
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
    this.lastFocusEl = document.activeElement;
    this.formModal.dataset.mode = 'word';
    this.formModal.dataset.parentId = '';
    this.formModal.dataset.compoundIdx = '';
    this.formModal.dataset.compoundId = '';
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
    if (this.lastFocusEl) {
      this.lastFocusEl.focus();
      this.lastFocusEl = null;
    }
  },

  openCompoundForm(compound, parentId, compoundIndex = null) {
    if (!this.formModal) return;
    this.formModal.dataset.mode = 'compound';
    this.formModal.dataset.parentId = parentId || '';
    this.formModal.dataset.compoundIdx = compoundIndex !== null ? String(compoundIndex) : '';
    const cid = compound.id || `compound-${Date.now()}-${Math.random()}`;
    this.formModal.dataset.compoundId = cid;
    if (this.wordForm) this.wordForm.reset();
    this.formFields.id.value = cid;
    this.formFields.character.value = compound.char || '';
    this.formFields.pinyin.value = compound.pinyin || '';
    this.formFields.meaning.value = compound.meaning || '';
    this.formFields.hsk.value = compound.hsk || '';
    this.formFields.type.value = Array.isArray(compound.type) ? compound.type.join(', ') : (compound.type || '');
    this.formFields.exampleZh.value = compound.example?.zh || '';
    this.formFields.examplePt.value = compound.example?.pt || '';
    this.formFields.notes.value = (compound.notes || []).join(' ');
    this.formModal.dataset.radical = this.state.selectedRadical || '';
    if (this.formModalTitle) this.formModalTitle.textContent = 'Editar Palavra Relacionada';
    this.formModal.classList.remove('hidden');
    requestAnimationFrame(() => this.formModal.classList.add('active'));
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
      this.setAiFillLoading(true);
      const aiData = await this.lookupWordWithAI(prompt);
      this.applyAIData(aiData);
    } catch (e) {
      console.error(e);
      alert('Não foi possível obter dados da IA.');
    } finally {
      this.setAiFillLoading(false);
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
    const mode = this.formModal?.dataset.mode || 'word';
    const targetRadical = this.formModal?.dataset.radical || this.state.selectedRadical;
    if (mode === 'word' && !targetRadical) { alert('Escolhe um radical antes de guardar.'); return; }
    const radEntry = mode === 'word' ? VOCABULARY_DATA.radicals[targetRadical] : null;
    if (mode === 'word' && !radEntry) { alert('Radical não encontrado.'); return; }
    if (mode === 'word' && !Array.isArray(radEntry.characters)) radEntry.characters = [];

    const idExisting = this.formFields.id.value || null;
    const isCompoundEdit = mode === 'compound';
    const parentId = isCompoundEdit ? (this.formModal?.dataset.parentId || '') : '';
    const compoundIdx = isCompoundEdit ? Number(this.formModal?.dataset.compoundIdx || -1) : -1;

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

    if (mode === 'word') {
      const existingWord = idExisting ? radEntry.characters.find(w => w.id === idExisting) : null;
      if (existingWord?.example?.pinyin && !wordData.example.pinyin) {
        wordData.example.pinyin = existingWord.example.pinyin;
      }
      const duplicate = this.isDuplicateWord(wordData.char, wordData.pinyin, idExisting || null);
      if (duplicate) {
        alert('Esta palavra já existe.');
        return;
      }
      if (idExisting) {
        const idx = radEntry.characters.findIndex((w, i) => {
          if (w.id && w.id === idExisting) return true;
          return this.buildWordId(targetRadical, w, i) === idExisting;
        });
        if (idx >= 0) radEntry.characters[idx] = { ...radEntry.characters[idx], ...wordData };
        else radEntry.characters.unshift(wordData);
      } else {
        radEntry.characters.unshift(wordData);
      }
      this.lastAddedWordRef = { id: wordData.id, radicalKey: targetRadical };
      this.state.selectedRadical = targetRadical;
      this.render();
      this.renderFeedback('✓ Palavra guardada com sucesso!', [], true, false);
      this.fetchSuggestionsFor(wordData.char).then(suggestions => {
        if (suggestions?.length) this.renderFeedback('✓ Palavra guardada com sucesso!', suggestions, false, false);
        else this.renderFeedback('✓ Palavra guardada com sucesso!', [], false, false);
      });
    } else {
      const parent = parentId ? this.findWordById(parentId) : null;
      const baseWord = parent?.word;
      if (!baseWord) { alert('Palavra base não encontrada.'); return; }
      if (!Array.isArray(baseWord.compounds)) baseWord.compounds = [];
      const existingCompound = (compoundIdx >= 0 && baseWord.compounds[compoundIdx]) ? baseWord.compounds[compoundIdx] : null;
      if (existingCompound?.example?.pinyin && !wordData.example.pinyin) {
        wordData.example.pinyin = existingCompound.example.pinyin;
      }
      const duplicate = this.existsInVocabulary(wordData.char, wordData.pinyin, wordData.id);
      const duplicateInCompounds = baseWord.compounds.some((c, idx) =>
        idx !== compoundIdx &&
        (c.char || '').trim() === wordData.char &&
        (c.pinyin || '').trim().toLowerCase() === wordData.pinyin.toLowerCase()
      );
      if (duplicate || duplicateInCompounds) {
        alert('Esta palavra já existe.');
        return;
      }
      if (compoundIdx >= 0 && compoundIdx < baseWord.compounds.length) {
        baseWord.compounds[compoundIdx] = { ...baseWord.compounds[compoundIdx], ...wordData };
      } else {
        baseWord.compounds.unshift(wordData);
      }
      this.render();
      this.closeFormModal();
      if (this.detailOverlay && !this.detailOverlay.classList.contains('hidden')) {
        const idxToOpen = compoundIdx >= 0 ? compoundIdx : 0;
        this.openCompoundDetail(baseWord.compounds[idxToOpen], parentId, idxToOpen);
      }
      this.renderFeedback('Palavra relacionada atualizada!', [], false, false);
    }
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

  isDuplicateWord(char, pinyin, excludeId = null) {
    const targetChar = (char || '').trim();
    const targetPy = (pinyin || '').trim().toLowerCase();
    if (!targetChar) return false;
    let duplicate = false;
    Object.entries(VOCABULARY_DATA.radicals).forEach(([key, data]) => {
      if (duplicate) return;
      (data.characters || []).forEach((w, idx) => {
        if (duplicate) return;
        const genId = this.buildWordId(key, w, idx);
        if (excludeId && ((w.id && w.id === excludeId) || genId === excludeId)) return;
        const sameChar = (w.char || '').trim() === targetChar;
        const samePy = targetPy ? (w.pinyin || '').trim().toLowerCase() === targetPy : true;
        if (sameChar && samePy) duplicate = true;
      });
    });
    return duplicate;
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
    this.currentSuggestions = [];
  },

  fetchSuggestionsFor(word) {
    return this.lookupWordWithAI(word)
      .then(aiData => this.filterNewSuggestions(aiData.related || []))
      .catch(() => []);
  },

  renderFeedback(message = '✓ Palavra guardada com sucesso!', suggestions = [], loading = false, adding = false) {
    if (!this.feedbackBox) return;
    const filteredSuggestions = this.filterNewSuggestions(suggestions || []);
    this.currentSuggestions = filteredSuggestions;
    const hasSuggestions = filteredSuggestions.length > 0;
    const suggestionLines = hasSuggestions
      ? filteredSuggestions.map((s, idx) => `<li>
            <label class="feedback-suggestion">
              <input type="checkbox" class="suggestion-checkbox" data-suggest-idx="${idx}">
              <span class="suggestion-label">${s.word} ${s.pinyin ? `(${s.pinyin})` : ''} - ${s.meaning || ''}</span>
            </label>
          </li>`).join('')
      : '';
    this.feedbackBox.innerHTML = `
      <div class="vocab-feedback-body">
        <div class="vocab-feedback-text">
          <p class="feedback-title">${message}</p>
          ${loading ? `<p class="feedback-sub">A obter palavras relacionadas...</p>` : ''}
          ${adding ? `<p class="feedback-sub">A adicionar palavras relacionadas...</p>` : ''}
          ${hasSuggestions ? `<p class="feedback-sub">Seleciona palavras relacionadas que podes adicionar:</p><ul class="feedback-list">${suggestionLines}</ul>` : ''}
        </div>
        <div class="feedback-actions">
          ${hasSuggestions ? `<button type="button" class="word-btn add-suggestions-btn" ${adding ? 'disabled' : ''}>${adding ? 'A adicionar...' : 'Adicionar selecionadas'}</button>` : ''}
          <button type="button" class="word-btn ghost close-feedback-btn"${adding ? ' disabled' : ''}>Fechar</button>
        </div>
      </div>
    `;
    if (hasSuggestions && !loading && !adding) {
      this.feedbackBox.querySelectorAll('.suggestion-checkbox').forEach(cb => { cb.checked = false; });
    }
    const closeBtn = this.feedbackBox.querySelector('.close-feedback-btn');
    if (closeBtn) closeBtn.onclick = () => {
      this.clearFeedback();
      if (this.formModal && this.formModal.classList.contains('active')) this.closeFormModal();
    };
    const addBtn = this.feedbackBox.querySelector('.add-suggestions-btn');
    if (addBtn) addBtn.onclick = () => this.handleAddSuggestions();
  },

  handleAddSuggestions() {
    const suggestions = this.currentSuggestions || [];
    if (!suggestions.length) {
      this.clearFeedback();
      return;
    }
    const toAdd = [];
    const selectedIndexes = [];
    if (this.feedbackBox) {
      this.feedbackBox.querySelectorAll('.suggestion-checkbox').forEach(cb => {
        if (cb.checked) selectedIndexes.push(Number(cb.dataset.suggestIdx));
      });
    }
    const selectedSuggestions = suggestions.filter((_, idx) => selectedIndexes.includes(idx));
    if (!selectedSuggestions.length) {
      alert('Seleciona pelo menos uma palavra.');
      return;
    }
    const baseWordRef = this.lastAddedWordRef || { id: this.formFields.id.value || '' };
    const base = baseWordRef?.id ? this.findWordById(baseWordRef.id) : null;
    const baseWord = base?.word || null;
    if (!baseWord) {
      this.renderFeedback('Não foi possível ligar sugestões à palavra base.', suggestions, false, false);
      return;
    }
    if (!Array.isArray(baseWord.compounds)) baseWord.compounds = [];
    const baseCompounds = baseWord.compounds;

    selectedSuggestions.forEach(s => {
      const existsInAll = this.existsInVocabulary(s.word, s.pinyin);
      const existsInCompounds = baseCompounds.find(c => c.char === s.word && (c.pinyin || '').toLowerCase() === (s.pinyin || '').toLowerCase());
      if (existsInAll || existsInCompounds) return;
      const newEntry = {
        id: `sug-${Date.now()}-${Math.random()}`,
        char: s.word,
        pinyin: s.pinyin || '',
        meaning: s.meaning || '',
        hsk: s.hsk || '',
        type: s.pos ? [s.pos] : [],
        notes: s.notes ? [].concat(s.notes) : [],
        example: {
          zh: s.example_sentence || '',
          pinyin: s.example_pinyin || '',
          pt: s.example_translation || ''
        },
        compounds: Array.isArray(s.compounds) ? s.compounds : []
      };
      toAdd.push(newEntry);
    });

    if (!toAdd.length) {
      this.renderFeedback('Nenhuma nova palavra para adicionar.', suggestions, false, false);
      return;
    }

    baseWord.compounds = [...toAdd, ...baseCompounds];
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
