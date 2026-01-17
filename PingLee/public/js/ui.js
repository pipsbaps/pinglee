const UI = {

    // --- 1. FUNÇÕES DE CRIAÇÃO DE MENSAGENS ---

    addUserMessage(text, container) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message message-user';
        
        messageEl.innerHTML = \`
            <div class="bubble">
                <div class="msg-chinese">${text}</div>
            </div>
        \`;
        
        container.appendChild(messageEl);
        this.scrollToBottom(container);
        return messageEl;
    },

    addTutorMessage(chinese, pinyin, translation, feedback, container, isLoading = false) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message message-tutor';
        if (isLoading) {
            messageEl.classList.add('loading');
        }

        // Estrutura da bolha de mensagem
        messageEl.innerHTML = \`
            <div class="bubble">
                <div class="msg-chinese">${isLoading ? '...' : chinese}</div>
                ${pinyin ? \`<div class="msg-pinyin hidden">${pinyin}</div>\` : ''}
                ${translation ? \`<div class="msg-translation hidden">${translation}</div>\` : ''}
                ${feedback ? \`<div class="msg-feedback hidden">${feedback}</div>\` : ''}
            </div>
        \`;

        // Adiciona ações apenas se não for uma mensagem de loading
        if (!isLoading) {
            const actionsContainer = this.createActions(messageEl, chinese, pinyin, translation, feedback);
            messageEl.appendChild(actionsContainer);
        }

        // Remove a mensagem de loading anterior, se houver
        const loadingElement = container.querySelector('.message.loading');
        if (loadingElement) {
            loadingElement.remove();
        }

        container.appendChild(messageEl);
        this.scrollToBottom(container);
        return messageEl;
    },

    // --- 2. CRIAÇÃO DE AÇÕES E BOTÕES ---

    createActions(messageEl, chinese, pinyin, translation, feedback) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'actions-container';

        if (pinyin) {
            actionsContainer.appendChild(this.createActionButton('pinyin-btn', 'Aa', () => this.toggleBlock(messageEl, '.msg-pinyin')));
        }
        if (translation) {
            actionsContainer.appendChild(this.createActionButton('translation-btn', '文A', () => this.toggleBlock(messageEl, '.msg-translation')));
        }
        if (feedback) {
             actionsContainer.appendChild(this.createActionButton('feedback-btn', '💡', () => this.toggleBlock(messageEl, '.msg-feedback')));
        }
        if (chinese) {
            const audioBtn = this.createActionButton('audio-btn', '🔊', () => this.playAudio(audioBtn, chinese));
            actionsContainer.appendChild(audioBtn);
        }

        return actionsContainer;
    },

    createActionButton(className, text, onClick) {
        const button = document.createElement('button');
        button.className = \`action-btn ${className}\`;
        button.textContent = text;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return button;
    },

    // --- 3. LÓGICA DE INTERAÇÃO ---

    toggleBlock(messageEl, selector) {
        const block = messageEl.querySelector(selector);
        if (block) {
            block.classList.toggle('hidden');
        }
    },

    playAudio(button, text) {
        if (button.classList.contains('is-pending')) return;

        button.classList.add('is-pending');
        button.classList.remove('is-error');

        fetch('/api/text-to-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch audio');
            return res.blob();
        })
        .then(blob => {
            const audioURL = URL.createObjectURL(blob);
            new Audio(audioURL).play();
            button.classList.remove('is-pending');
        })
        .catch(error => {
            console.error('Audio playback error:', error);
            button.classList.remove('is-pending');
            button.classList.add('is-error');
        });
    },

    scrollToBottom(container) {
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
};
