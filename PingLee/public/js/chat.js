const TextChat = {
    history: [],
    STORAGE_KEY: 'chat_history_v1',

    init() {
        const form = document.querySelector('#chat .chat-form');
        const input = document.querySelector('#chat .message-input');
        const messagesContainer = document.querySelector('#chat .chat-messages');
        UI.attachAudioSpeedToggle('#audio-slow-toggle', (speed) => {
            UI.audioSpeed = speed;
        }, 'chat_audio_slow');
        this.toggleSendButton(input, form?.querySelector('.send-button'));

        // Restaura histórico, se existir
        const restored = this.restoreHistory(messagesContainer);
        if (!restored) {
            // Inicia a conversa e adiciona sugestões
            this.startConversation(messagesContainer, input);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if (!message) return;

            this.clearEmptyState(messagesContainer);

            // 1. Adiciona a mensagem do utilizador e foca o input
            this.pushUserMessage(message, messagesContainer);
            input.value = '';
            input.focus(); // Garante que o foco regressa ao input
            this.toggleSendButton(input, form.querySelector('.send-button'));

            // 2. Mostra o indicador de "a escrever..."
            const loadingElement = UI.addTutorMessage('', null, null, null, messagesContainer, true);

            try {
                // 3. Envia a mensagem para a API
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message, mode: 'text' })
                });
                const data = await response.json();

                // 4. Substitui a mensagem de loading pela resposta do tutor
                loadingElement.remove();
                this.pushTutorMessage(data, messagesContainer);

            } catch (error) {
                console.error('Text chat error:', error);
                loadingElement.remove();
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
        emptyEl.innerHTML = `
            <div class="empty-copy">Comece a conversa ou escolha uma sugestão:</div>
            <div class="empty-suggestions">
                <button type="button" class="suggestion-btn">你好吗？</button>
                <button type="button" class="suggestion-btn">我们可以练习机场对话吗？</button>
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
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
        } catch (e) {
            console.warn('Não foi possível guardar histórico do chat', e);
        }
    },

    restoreHistory(container) {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
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
            return parsed.length > 0;
        } catch (e) {
            console.warn('Não foi possível restaurar histórico do chat', e);
            this.history = [];
            return false;
        }
    }
};

// Exporta para lazy load
window.TextChat = TextChat;
