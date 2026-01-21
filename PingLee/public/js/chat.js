const TextChat = {
    history: [],
    STORAGE_KEY_BASE: 'chat_history_v1',
    MODE_KEY: 'chat_mode_v1',
    mode: 'aulas',
    modeHistories: {},

    init() {
        this.restoreMode();
        const form = document.querySelector('#chat .chat-form');
        const input = document.querySelector('#chat .message-input');
        const messagesContainer = document.querySelector('#chat .chat-messages');
        this.modeButtons = document.querySelectorAll('.chat-mode-switch .mode-btn');
        this.resetBtn = document.querySelector('#chat .reset-chat-btn');
        this.saveLessonBtn = document.querySelector('#chat .save-lesson-btn');
        this.bindModeButtons(messagesContainer, input);
        this.bindReset(messagesContainer, input);
        this.bindSaveLesson(messagesContainer);
        this.bindViewportHeight();
        this.bindScrollBlur(messagesContainer, input);
        this.bindEnterBehavior(form, input);
        UI.attachAudioSpeedToggle('#audio-slow-toggle', (speed) => {
            UI.audioSpeed = speed;
        }, 'chat_audio_slow');
        this.toggleSendButton(input, form?.querySelector('.send-button'));
        this.setupInputFocusScroll();

        // Restaura histórico, se existir
        const restored = this.restoreHistory(messagesContainer, this.mode);
        if (!restored) {
            // Inicia a conversa e adiciona sugestões
            this.startConversation(messagesContainer, input);
        } else {
            this.modeHistories[this.mode] = [...this.history];
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if (!message) return;

            this.clearEmptyState(messagesContainer);

            // 1. Adiciona a mensagem do utilizador e foca o input
            this.pushUserMessage(message, messagesContainer);
            input.value = '';
            this.toggleSendButton(input, form.querySelector('.send-button'));

            // 2. Mostra o indicador de "a escrever..."
            const typingEl = UI.addTypingIndicator(messagesContainer);

            try {
                // 3. Envia a mensagem para a API
                const history = this.getHistoryForApi();
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message, mode: 'text', variant: this.mode, history })
                });
                const data = await response.json();

                // 4. Substitui a mensagem de loading pela resposta do tutor
                UI.removeTypingIndicator(typingEl);
                this.pushTutorMessage(data, messagesContainer);

            } catch (error) {
                console.error('Text chat error:', error);
                UI.removeTypingIndicator(typingEl);
                this.pushTutorMessage({ chinese: 'Desculpe, ocorreu um erro ao contactar a API.' }, messagesContainer);
            }
        });
    },

    toggleSendButton(input, sendButton) {
        if (!input || !sendButton) return;
        const updateState = () => {
            const hasText = input.value.trim().length > 0;
            sendButton.disabled = !hasText;
        };
        input.addEventListener('input', updateState);
        updateState();
    },

    startConversation(container, input) {
        // Garante que a mensagem inicial e as sugestões só são adicionadas uma vez.
        if (container.children.length > 0) return;

        // Adiciona a mensagem de boas-vindas do Tutor
        UI.addTutorMessage(
            "你好！我是PingLee，咱们一步一步练中文吧。要不要先问我一个简单的问题？", 
            "Nǐ hǎo! Wǒ shì PingLee, zánmen yī bù yī bù liàn Zhōngwén ba. Yào bú yào xiān wèn wǒ yīgè jiǎndān de wèntí?", 
            "Olá! Eu sou o PingLee, vamos praticar chinês passo a passo. Quer começar fazendo uma pergunta simples?", 
            null, 
            container
        );
        // Adiciona estado inicial com sugestões
        this.addEmptyState(container, input);
    },

    addEmptyState(container, input) {
        if (!container || !input) return;
        const existing = container.querySelector('.empty-state');
        if (existing) return;

        const emptyEl = document.createElement('div');
        emptyEl.className = 'empty-state';
        const isExplore = this.mode === 'explora';
        emptyEl.innerHTML = `
            <div class="empty-copy">${isExplore ? 'Conversa livre. Pergunta o que quiseres:' : 'Comece a conversa ou escolha uma sugestão:'}</div>
            <div class="empty-suggestions">
                ${isExplore
                    ? `<button type="button" class="suggestion-btn">Como se diz "internet" em chinês?</button>
                       <button type="button" class="suggestion-btn">Podes explicar um provérbio chinês?</button>`
                    : `<button type="button" class="suggestion-btn">你好吗？</button>
                       <button type="button" class="suggestion-btn">我们可以练习机场对话吗？</button>`}
            </div>
        `;

        emptyEl.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.textContent;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                const form = document.querySelector('#chat .chat-form');
                if (form) form.requestSubmit();
            });
        });

        container.appendChild(emptyEl);
        UI.scrollToBottom(container);
    },

    clearEmptyState(container) {
        const emptyEl = container.querySelector('.empty-state');
        if (emptyEl) emptyEl.remove();
    },

    getHistoryForApi() {
        return this.history.map(msg => {
            if (msg.role === 'user') {
                return { role: 'user', content: msg.text };
            } else if (msg.role === 'tutor') {
                return {
                    role: 'assistant',
                    content: JSON.stringify({
                        chinese: msg.chinese,
                        pinyin: msg.pinyin,
                        translation: msg.translation,
                        feedback: msg.feedback
                    })
                };
            }
            return null;
        }).filter(Boolean);
    },

    pushUserMessage(text, container) {
        UI.addUserMessage(text, container);
        this.history.push({ role: 'user', text });
        this.trimHistory();
        this.persistHistory();
    },

    pushTutorMessage(data, container) {
        UI.addTutorMessage(data.chinese, data.pinyin, data.translation, data.feedback, container);
        this.history.push({
            role: 'tutor',
            chinese: data.chinese || '',
            pinyin: data.pinyin || '',
            translation: data.translation || '',
            feedback: data.feedback || ''
        });
        this.trimHistory();
        this.persistHistory();
    },

    trimHistory() {
        const MAX = 50;
        if (this.history.length > MAX) {
            this.history = this.history.slice(this.history.length - MAX);
        }
    },

    persistHistory() {
        try {
            localStorage.setItem(this.storageKey(), JSON.stringify(this.history));
            this.modeHistories[this.mode] = [...this.history];
        } catch (e) {
            console.warn('Não foi possível guardar histórico do chat', e);
        }
    },

    restoreHistory(container, mode = this.mode) {
        try {
            const rawLegacy = mode === 'aulas' ? localStorage.getItem(this.STORAGE_KEY_BASE) : null; // legacy key só para aulas
            const raw = localStorage.getItem(this.storageKeyFor(mode)) || rawLegacy;
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return false;
            this.history = [];
            parsed.forEach(msg => {
                if (msg.role === 'user') {
                    UI.addUserMessage(msg.text || '', container);
                } else if (msg.role === 'tutor') {
                    UI.addTutorMessage(msg.chinese, msg.pinyin, msg.translation, msg.feedback, container);
                }
                this.history.push(msg);
            });
            this.modeHistories[mode] = [...this.history];
            return parsed.length > 0;
        } catch (e) {
            console.warn('Não foi possível restaurar histórico do chat', e);
            this.history = [];
            return false;
        }
    },

    storageKey() {
        return this.storageKeyFor(this.mode);
    },

    storageKeyFor(mode) {
        return `${this.STORAGE_KEY_BASE}_${mode}`;
    },

    bindModeButtons(container, input) {
        if (!this.modeButtons?.length) return;
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const selected = btn.dataset.mode;
                if (!selected || selected === this.mode) return;
                this.setMode(selected, container, input);
            });
        });
        this.updateModeUI();
    },

    setMode(mode, container, input) {
        this.cacheCurrentHistory();
        this.mode = mode;
        try { localStorage.setItem(this.MODE_KEY, mode); } catch (_) {}
        this.updateModeUI();
        container.innerHTML = '';
        const cached = this.modeHistories[this.mode];
        if (cached?.length) {
            this.history = [...cached];
            this.renderHistory(container);
            return;
        }
        const restored = this.restoreHistory(container, this.mode);
        if (!restored) this.startConversation(container, input);
    },

    bindReset(container, input) {
        if (!this.resetBtn) return;
        this.resetBtn.addEventListener('click', () => this.resetChat(container, input));
    },

    bindSaveLesson(container) {
        if (!this.saveLessonBtn) return;
        this.saveLessonBtn.addEventListener('click', () => {
            const payload = this.buildLessonFromChat();
            if (!payload) return;
            window.Lessons?.addFromChat?.(payload);
            this.flashAction(this.saveLessonBtn);
        });
    },

    bindViewportHeight() {
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

    bindScrollBlur(container, input) {
        if (!container || !input) return;
        const blurInput = () => input.blur();
        container.addEventListener('touchmove', blurInput, { passive: true });
        container.addEventListener('wheel', blurInput, { passive: true });
        container.addEventListener('scroll', () => {
            const nearBottom = (container.scrollHeight - container.clientHeight - container.scrollTop) < 80;
            container.dataset.stickToBottom = nearBottom ? '1' : '0';
        }, { passive: true });
    },

    bindEnterBehavior(form, input) {
        if (!form || !input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.requestSubmit();
            }
        });
    },

    buildLessonFromChat() {
        if (!this.history.length) {
            alert('Ainda não tens mensagens para guardar.');
            return null;
        }
        const lastTutor = [...this.history].reverse().find(m => m.role === 'tutor');
        const lastUser = [...this.history].reverse().find(m => m.role === 'user');
        const title = lastUser ? lastUser.text.slice(0, 40) : 'Chat note';
        const summary = lastTutor
            ? `${lastTutor.chinese || ''} ${lastTutor.translation || ''}`.trim()
            : 'Resumo do chat';
        const keywords = this.extractKeywords(summary);
        return {
            title: title || 'Nota do chat',
            notes: summary,
            source: 'chat',
            words: keywords.join(', ')
        };
    },

    extractKeywords(text) {
        const words = (text || '')
            .toLowerCase()
            .replace(/[^a-zà-ú0-9\s]/gi, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);
        const unique = [...new Set(words)];
        return unique.slice(0, 6);
    },

    resetChat(container, input) {
        this.history = [];
        container.innerHTML = '';
        try {
            localStorage.removeItem(this.storageKey());
        } catch (_) {}
        this.modeHistories[this.mode] = [];
        if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        this.startConversation(container, input);
    },

    updateModeUI() {
        if (!this.modeButtons?.length) return;
        this.modeButtons.forEach(btn => {
            const isActive = btn.dataset.mode === this.mode;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    },

    restoreMode() {
        try {
            const saved = localStorage.getItem(this.MODE_KEY);
            if (saved) this.mode = saved;
        } catch (_) {}
    },

    cacheCurrentHistory() {
        this.modeHistories[this.mode] = [...this.history];
    },

    renderHistory(container) {
        if (!container) return;
        container.innerHTML = '';
        this.history.forEach(msg => {
            if (msg.role === 'user') {
                UI.addUserMessage(msg.text || '', container);
            } else if (msg.role === 'tutor') {
                UI.addTutorMessage(msg.chinese, msg.pinyin, msg.translation, msg.feedback, container);
            }
        });
        UI.scrollToBottom(container);
    },

    flashAction(btn) {
        if (!btn) return;
        btn.classList.add('is-active-action');
        setTimeout(() => btn.classList.remove('is-active-action'), 220);
    },

    setupInputFocusScroll() {
        const input = document.querySelector('#chat .message-input');
        const messagesContainer = document.querySelector('#chat .chat-messages');
        const formContainer = document.querySelector('#chat .chat-form-container');

        if (!input || !messagesContainer) return;

        let focusTimeout;

        input.addEventListener('focus', () => {
            clearTimeout(focusTimeout);

            focusTimeout = setTimeout(() => {
                // Scroll container para o fundo
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // iOS precisa de scroll extra
                if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                    // Garante que o form fica visível
                    if (formContainer) {
                        formContainer.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                            inline: 'nearest'
                        });
                    }

                    // Scroll adicional para iOS
                    setTimeout(() => {
                        window.scrollBy(0, 50);
                    }, 100);
                }
            }, 350); // Delay para o teclado abrir completamente
        });

        input.addEventListener('blur', () => {
            clearTimeout(focusTimeout);
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        });
    }
};

// Exporta para lazy load
window.TextChat = TextChat;
