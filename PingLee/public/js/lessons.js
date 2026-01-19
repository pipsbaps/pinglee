const Lessons = {
  STORAGE_KEY: 'lessons_data_v1',
  lessons: [],
  selectedId: null,

  init() {
    this.cacheDOM();
    if (!this.section) return;
    this.loadLessons();
    this.attachEvents();
    this.setViewMode(true);
    this.render();
  },

  cacheDOM() {
    this.section = document.getElementById('lessons');
    if (!this.section) return;
    this.listEl = this.section.querySelector('#lessons-list');
    this.emptyEl = this.section.querySelector('#lessons-empty');
    this.addBtn = this.section.querySelector('#add-lesson-btn');
    this.searchInput = this.section.querySelector('#lessons-search');
    this.modal = document.getElementById('lesson-modal');
    this.modalClose = this.modal?.querySelector('.lesson-close-btn');
    this.modalEdit = this.modal?.querySelector('.lesson-edit-btn');
    this.form = document.getElementById('lesson-form');
    this.fields = {
      id: document.getElementById('lesson-id'),
      title: document.getElementById('lesson-title'),
      date: document.getElementById('lesson-date'),
      source: document.getElementById('lesson-source'),
      words: document.getElementById('lesson-words'),
      notes: document.getElementById('lesson-notes')
    };
    this.cancelBtn = document.getElementById('lesson-cancel');
  },

  attachEvents() {
    if (this.addBtn) this.addBtn.addEventListener('click', () => this.openModal());
    if (this.modalClose) this.modalClose.addEventListener('click', () => this.closeModal());
    if (this.modalEdit) this.modalEdit.addEventListener('click', () => this.setViewMode(false));
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.closeModal());
    if (this.form) this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    if (this.modal) {
      this.modal.addEventListener('modal:closed', () => this.closeModal());
    }
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => this.render(), 150);
      });
    }
  },

  addFromChat(payload) {
    if (!payload) return;
    const lesson = {
      id: `lesson-${Date.now()}`,
      title: payload.title || 'Nota do chat',
      date: this.today(),
      source: payload.source || 'chat',
      words: payload.words || '',
      notes: payload.notes || ''
    };
    lesson.quiz = this.buildQuiz(lesson);
    this.lessons.unshift(lesson);
    this.persist();
    this.render();
    this.openModal(lesson.id);
  },

  loadLessons() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) this.lessons = JSON.parse(raw) || [];
    } catch (_) {
      this.lessons = [];
    }
    if (!Array.isArray(this.lessons)) this.lessons = [];
    if (!this.lessons.length) {
      this.lessons = [
        {
          id: `lesson-${Date.now()}`,
          title: 'Apresentações básicas',
          date: this.today(),
          source: 'chat',
          words: '你好, 你好吗, 我叫, 高兴',
          notes: 'Resumi uma conversa sobre apresentações no chat. Pratiquei “你好，我叫…”.'
        }
      ];
      this.persist();
    }
  },

  persist() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.lessons));
    } catch (_) {}
  },

  render() {
    if (!this.listEl) return;
    const query = (this.searchInput?.value || '').toLowerCase();
    const list = this.lessons.filter(l => {
      if (!query) return true;
      return (
        (l.title || '').toLowerCase().includes(query) ||
        (l.notes || '').toLowerCase().includes(query) ||
        (l.words || '').toLowerCase().includes(query)
      );
    });
    if (!list.length) {
      this.listEl.innerHTML = '';
      if (this.emptyEl) this.emptyEl.classList.remove('hidden');
      return;
    }
    if (this.emptyEl) this.emptyEl.classList.add('hidden');
    this.listEl.innerHTML = list.map(lesson => this.renderCard(lesson)).join('');
    this.listEl.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });
  },

  renderCard(lesson) {
    const wordsCount = this.countWords(lesson.words, lesson.notes);
    const preview = this.buildPreview(lesson.notes);
    const date = lesson.date || this.today();
    const wordsLinked = this.renderKeywordLinks(lesson.words);
    return `
      <div class="lesson-card" data-id="${lesson.id}">
        <div class="lesson-meta">
          <span class="tag-badge">${lesson.source === 'role-play' ? 'Role-Play' : lesson.source === 'chat' ? 'Chat' : 'Notas'}</span>
          <span>${date}</span>
          <span>•</span>
          <span>${wordsCount} palavras</span>
        </div>
        <h4 class="lesson-title">${lesson.title || 'Sem título'}</h4>
        <div class="lesson-preview">${preview}</div>
        ${wordsLinked ? `<div class="lesson-keywords">${wordsLinked}</div>` : ''}
      </div>
    `;
  },

  openModal(id = null) {
    this.lastFocusEl = document.activeElement;
    const lesson = id ? this.lessons.find(l => l.id === id) : null;
    this.selectedId = lesson ? lesson.id : null;
    const today = this.today();
    this.fields.id.value = lesson?.id || '';
    this.fields.title.value = lesson?.title || '';
    this.fields.date.value = lesson?.date || today;
    this.fields.source.value = lesson?.source || 'chat';
    this.fields.words.value = lesson?.words || '';
    this.fields.notes.value = lesson?.notes || '';
    const titleEl = document.getElementById('lesson-modal-title');
    if (titleEl) titleEl.textContent = lesson ? 'Editar nota' : 'Nova nota';
    this.setViewMode(!!lesson);
    this.renderQuiz(lesson);
    if (this.modal) {
      this.modal.classList.remove('hidden');
      requestAnimationFrame(() => this.modal.classList.add('active'));
    }
  },

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    setTimeout(() => this.modal.classList.add('hidden'), 150);
    this.form?.reset();
    if (this.lastFocusEl) {
      this.lastFocusEl.focus();
      this.lastFocusEl = null;
    }
  },

  handleSubmit(e) {
    e.preventDefault();
    const payload = {
      id: this.fields.id.value || `lesson-${Date.now()}`,
      title: this.fields.title.value.trim(),
      date: this.fields.date.value || this.today(),
      source: this.fields.source.value || 'chat',
      words: this.fields.words.value.trim(),
      notes: this.fields.notes.value.trim()
    };
    if (!payload.title || !payload.notes) {
      alert('Título e notas são obrigatórios.');
      return;
    }
    const existingIdx = this.lessons.findIndex(l => l.id === payload.id);
    if (existingIdx >= 0) {
      this.lessons[existingIdx] = { ...this.lessons[existingIdx], ...payload };
    } else {
      this.lessons.unshift(payload);
    }
    payload.quiz = this.buildQuiz(payload);
    this.persist();
    this.render();
    this.closeModal();
  },

  setViewMode(isView) {
    if (!this.form) return;
    const asView = !!isView;
    this.form.querySelectorAll('input, textarea, select').forEach(el => {
      el.disabled = asView;
    });
    if (this.modalEdit) this.modalEdit.classList.toggle('hidden', !asView);
    if (this.form) this.form.classList.toggle('is-view', asView);
  },

  countWords(wordsField, notesField) {
    const words = (wordsField || '').split(',').map(w => w.trim()).filter(Boolean);
    if (words.length) return words.length;
    const notesWords = (notesField || '').split(/\s+/).filter(Boolean);
    return notesWords.length;
  },

  buildPreview(notes) {
    const clean = (notes || '').replace(/\s+/g, ' ').trim();
    return clean.length > 140 ? `${clean.slice(0, 140)}…` : clean || 'Sem notas';
  },

  renderKeywordLinks(words) {
    if (!words) return '';
    const list = words.split(',').map(w => w.trim()).filter(Boolean);
    if (!list.length) return '';
    return list.map(w => `<a class="keyword-pill" href="#vocabulary" data-word="${w}">${w}</a>`).join(' ');
  },

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  buildQuiz(lesson) {
    const keywords = (lesson.words || '').split(',').map(w => w.trim()).filter(Boolean);
    const baseText = (lesson.notes || '').split('.').map(p => p.trim()).filter(Boolean);
    const questions = [];
    if (keywords.length) {
      keywords.slice(0, 3).forEach(word => {
        questions.push({ type: 'keyword', prompt: `Usa "${word}" numa frase em chinês.` });
      });
    }
    if (baseText.length) {
      baseText.slice(0, 2).forEach(sentence => {
        const blank = sentence.replace(/\b(\w{4,})\b/, '____');
        questions.push({ type: 'fill', prompt: `Completa: ${blank}` });
      });
    }
    questions.push({ type: 'recall', prompt: 'Resumo rápido: o que foi praticado nesta nota?' });
    return questions;
  },

  renderQuiz(lesson) {
    const quizBox = this.modal?.querySelector('.lesson-quiz');
    if (!quizBox) return;
    const items = lesson?.quiz || this.buildQuiz(lesson || {});
    if (!items?.length) {
      quizBox.innerHTML = '<p class="muted">Sem quiz gerado.</p>';
      return;
    }
    quizBox.innerHTML = `
      <div class="quiz-header">
        <p class="eyebrow">Revisão</p>
        <span class="muted">${items.length} exercícios</span>
      </div>
      <ol class="quiz-list">
        ${items.map(q => `<li>${q.prompt}</li>`).join('')}
      </ol>
    `;
  }
};

window.Lessons = Lessons;

if (document.readyState !== 'loading') {
  window.Lessons.init();
} else {
  document.addEventListener('DOMContentLoaded', () => window.Lessons.init(), { once: true });
}
