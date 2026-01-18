const Vocabulary = {
  initialized: false,
  
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
        this.state.filterHSK = e.target.value === 'HSK (todos)' ? '' : e.target.value;
        if (this.state.currentView === 'words') this.renderWords();
      });
    }

    if (this.filterPOSSelect) {
      this.filterPOSSelect.addEventListener('change', (e) => {
        this.state.filterPOS = e.target.value === 'Função (todas)' ? '' : e.target.value;
        if (this.state.currentView === 'words') this.renderWords();
      });
    }

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
    const firstKey = Object.keys(categoryData.radicals)[0];
    const first = categoryData.radicals[firstKey];
    
    this.state.currentView = first.characters ? 'radicals' : 'subcategories';
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
    this.breadcrumbEl.textContent = this.state.breadcrumb.length === 0 
      ? 'Categorias' 
      : this.state.breadcrumb.join(' > ');
  },

  renderMetrics() {
    if (this.metricTotal) this.metricTotal.textContent = this.getAllWords().length;
    if (this.metricTrain) this.metricTrain.textContent = '0';
  },

  renderCategories() {
    const categories = Object.keys(VOCABULARY_DATA.categories);
    
    const html = categories.map(cat => {
      const count = this.getWordsInCategory(cat).length;
      return `<button class="category-btn" data-category="${cat}">${cat}<br><small>${count} palavras</small></button>`;
    }).join('');

    this.panelEl.innerHTML = html;

    this.panelEl.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.goToCategory(e.currentTarget.dataset.category);
      });
    });
  },

  renderSubcategories() {
    const categoryData = VOCABULARY_DATA.categories[this.state.selectedCategory];
    const subs = Object.keys(categoryData.radicals);

    const html = subs.map(sub => {
      const count = this.getRadicalsInSubcategory(sub).length;
      return `<button class="subcategory-btn" data-sub="${sub}">${sub}<br><small>${count} radicais</small></button>`;
    }).join('');

    this.panelEl.innerHTML = html;

    this.panelEl.querySelectorAll('.subcategory-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.goToSubcategory(e.currentTarget.dataset.sub);
      });
    });
  },

  renderRadicals() {
    let radicals;

    if (this.state.selectedSubcategory) {
      radicals = this.getRadicalsInSubcategory(this.state.selectedSubcategory);
    } else {
      const categoryData = VOCABULARY_DATA.categories[this.state.selectedCategory];
      radicals = Object.keys(categoryData.radicals).map(key => ({
        key,
        data: VOCABULARY_DATA.radicals[key]
      }));
    }

    const html = radicals.map(({ key, data }) => {
      const count = data.characters ? data.characters.length : 0;
      return `<button class="radical-btn" data-radical="${key}">${key}<br><small>${count} palavras</small></button>`;
    }).join('');

    this.panelEl.innerHTML = html;

    this.panelEl.querySelectorAll('.radical-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.goToRadical(e.currentTarget.dataset.radical);
      });
    });
  },

  renderWords() {
    const radicalData = VOCABULARY_DATA.radicals[this.state.selectedRadical];
    let words = radicalData.characters || [];

    words = this.applyFilters(words);

    if (words.length === 0) {
      this.panelEl.innerHTML = '<div class="empty-message">Nenhuma palavra encontrada.</div>';
      return;
    }

    const html = words.map(w => `
      <div class="word-card">
        <div class="word-char">${w.char}</div>
        <div class="word-pinyin">${w.pinyin}</div>
        <div class="word-meaning">${w.meaning}</div>
        <div class="word-meta">
          ${w.hsk ? `<span class="tag">${w.hsk}</span>` : ''}
          ${w.type ? `<span class="tag">${Array.isArray(w.type) ? w.type.join(', ') : w.type}</span>` : ''}
        </div>
      </div>
    `).join('');

    this.panelEl.innerHTML = html;
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
    
    Object.keys(catData.radicals).forEach(key => {
      const rad = VOCABULARY_DATA.radicals[key];
      if (rad && rad.characters) words.push(...rad.characters);
    });
    
    return words;
  },

  getRadicalsInSubcategory(sub) {
    const radicals = [];
    Object.entries(VOCABULARY_DATA.radicals).forEach(([key, data]) => {
      if (data.category === sub && data.characters) {
        radicals.push({ key, data });
      }
    });
    return radicals;
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
      filtered = filtered.filter(w => String(w.hsk) === this.state.filterHSK);
    }

    if (this.state.filterPOS) {
      filtered = filtered.filter(w => {
        if (Array.isArray(w.type)) return w.type.includes(this.state.filterPOS);
        return w.type === this.state.filterPOS;
      });
    }

    return filtered;
  }
};

window.Vocabulary = Vocabulary;

if (document.readyState !== 'loading') {
  window.Vocabulary.init();
} else {
  document.addEventListener('DOMContentLoaded', () => window.Vocabulary.init(), { once: true });
}
