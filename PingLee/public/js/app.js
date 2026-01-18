document.addEventListener('DOMContentLoaded', () => {
    const App = {
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('main section'),
        headerTitle: document.querySelector('.header-title'),

        init() {
            this.setupNavigation();
            this.showInitialSection();

            // CORREÇÃO FINAL: As verificações `if (window.XXX)` que adicionei
            // estavam erradas e impediam a inicialização de TODOS os módulos.
            // A forma correta é chamar as funções `init` diretamente.
            // Isto vai restaurar o Chat, o Vocabulário e o Role-Play.
            TextChat.init();
            RolePlay.init();
            Vocabulary.init();
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
        },

        showInitialSection() {
            const initialSection = window.location.hash.substring(1) || 'chat';
            this.showSection(initialSection);
        }
    };

    App.init();
});
