document.addEventListener('DOMContentLoaded', () => {
    const App = {
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('main section'),
        headerTitle: document.querySelector('.header-title'),
        moduleLoaders: {
            chat: { path: '/js/chat.js', loaded: false, initialized: false, loading: null, initFn: () => window.TextChat?.init() },
            'role-play': { path: '/js/role-play.js', loaded: false, initialized: false, loading: null, initFn: () => window.RolePlay?.init() },
            vocabulary: { path: '/js/vocabulary.js', loaded: false, initialized: false, loading: null, initFn: () => window.Vocabulary?.init() },
            lessons: { path: '/js/lessons.js', loaded: false, initialized: false, loading: null, initFn: () => window.Lessons?.init() },
        },

        disableAutocorrect() {
            const attrs = {
                autocorrect: 'off',
                autocapitalize: 'none',
                spellcheck: 'false'
            };
            document.querySelectorAll('input, textarea').forEach(el => {
                Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
            });
        },

        setAppHeight() {
            const apply = () => {
                const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                document.documentElement.style.setProperty('--app-height', `${h}px`);
            };
            apply();
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', apply);
            } else {
                window.addEventListener('resize', apply);
            }
        },

        init() {
            this.setAppHeight();
            this.setupNavigation();
            this.setupHashListener();
            this.showInitialSection();
            // Preload vocabulário para evitar atraso na primeira abertura
            this.ensureModule('vocabulary');
            this.disableAutocorrect();
        },

        setupNavigation() {
            this.navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = e.currentTarget.dataset.target;
                    window.location.hash = targetId;
                    this.showSection(targetId);
                });
            });
        },

        setupHashListener() {
            window.addEventListener('hashchange', () => {
                const targetId = window.location.hash.substring(1);
                if (targetId) this.showSection(targetId);
            });
        },

        showSection(targetId) {
            if (!targetId) return;
            this.sections.forEach(section => {
                section.classList.toggle('active', section.id === targetId);
            });
            this.navItems.forEach(item => {
                item.classList.toggle('active', item.dataset.target === targetId);
            });

            if (this.headerTitle) {
                if (targetId === 'role-play') {
                    this.headerTitle.textContent = 'Role-Play';
                    this.headerTitle.classList.remove('hidden');
                } else {
                    this.headerTitle.textContent = '';
                    this.headerTitle.classList.add('hidden');
                }
            }
            try {
                localStorage.setItem('activeSection', targetId);
            } catch (_) {}
            this.ensureModule(targetId);
        },

        showInitialSection() {
            const stored = localStorage.getItem('activeSection');
            const initialSection = window.location.hash.substring(1) || stored || 'chat';
            this.showSection(initialSection);
            document.querySelectorAll('.modal-overlay').forEach(modal => this.setupModal(modal));
        },

        async ensureModule(targetId) {
            const mod = this.moduleLoaders[targetId];
            if (!mod) return;
            if (mod.initialized) return;
            if (mod.loaded) {
                mod.initFn?.();
                mod.initialized = true;
                return;
            }
            if (!mod.loading) {
                mod.loading = new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = mod.path;
                    s.async = true;
                    s.onload = () => {
                        mod.loaded = true;
                        try {
                            mod.initFn?.();
                            mod.initialized = true;
                        } catch (e) {
                            console.error(`Erro ao inicializar módulo ${targetId}`, e);
                        }
                        resolve();
                    };
                    s.onerror = (err) => reject(err);
                    document.body.appendChild(s);
                });
            }
            try {
                await mod.loading;
            } catch (err) {
                console.error(`Falha a carregar módulo ${targetId}`, err);
            }
        },

        setupModal(modal) {
            if (modal.dataset.trapInit === '1') return;
            modal.dataset.trapInit = '1';
            modal.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab') return;
                const focusable = modal.querySelectorAll(
                    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                const list = Array.from(focusable).filter(el => el.offsetParent !== null);
                if (!list.length) return;
                const first = list[0];
                const last = list[list.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });
            modal.addEventListener('transitionend', () => {
                if (!modal.classList.contains('active')) return;
                const firstFocusable = modal.querySelector(
                    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (firstFocusable) firstFocusable.focus();
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    setTimeout(() => modal.classList.add('hidden'), 150);
                    const evt = new CustomEvent('modal:closed', { detail: { id: modal.id, reason: 'backdrop' } });
                    modal.dispatchEvent(evt);
                }
            });
        }
    };

    App.init();
});
