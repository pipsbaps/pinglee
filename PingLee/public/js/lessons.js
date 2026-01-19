const Lessons = {
  STORAGE_KEY: 'lessons_data_v1',
  lessons: [],
  selectedId: null,

  init() {
    this.cacheDOM();
    if (!this.section) return;
    this.loadLessons();
    this.attachEvents();
    this.render();
  },

  cacheDOM() {
    this.section = document.getElementById('lessons');
    if (!this.section) return;
    this.listEl = this.section.querySelector('#lessons-list');
    this.emptyEl = this.section.querySelector('#lessons-empty');
    this.addBtn = this.section.querySelector('#add-lesson-btn');
    this.modal = document.getElementById('lesson-modal');
    this.modalClose = this.modal?.querySelector('.lesson-close-btn');
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
    if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.closeModal());
    if (this.form) this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    if (this.modal) {
      this.modal.addEventListener('modal:closed', () => this.closeModal());
    }
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
    if (!this.lessons.length) {
      this.listEl.innerHTML = '';
      if (this.emptyEl) this.emptyEl.classList.remove('hidden');
      return;
    }
    if (this.emptyEl) this.emptyEl.classList.add('hidden');
    this.listEl.innerHTML = this.lessons.map(lesson => this.renderCard(lesson)).join('');
    this.listEl.querySelectorAll('.lesson-card').forEach(card => {
      card.addEventListener('click', () => this.openModal(card.dataset.id));
    });
  },

  renderCard(lesson) {
    const wordsCount = this.countWords(lesson.words, lesson.notes);
    const preview = this.buildPreview(lesson.notes);
    const date = lesson.date || this.today();
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
      </div>
    `;
  },

  openModal(id = null) {
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
    this.persist();
    this.render();
    this.closeModal();
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

  today() {
    return new Date().toISOString().slice(0, 10);
  }
};

window.Lessons = Lessons;

if (document.readyState !== 'loading') {
  window.Lessons.init();
} else {
  document.addEventListener('DOMContentLoaded', () => window.Lessons.init(), { once: true });
}
