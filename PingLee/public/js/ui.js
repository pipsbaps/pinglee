const UI = {
    audioSpeed: 1,

    // --- 1. FUNÇÕES DE CRIAÇÃO DE MENSAGENS ---

    addUserMessage(text, container, isLoading = false) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message message-user';
        if (isLoading) {
            messageEl.classList.add('loading');
        }

        messageEl.innerHTML = `
            <div class="bubble">
                <div class="msg-chinese">${text}</div>
            </div>
        `;
        
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
        messageEl.innerHTML = `
            <div class="avatar"><img src="/images/pingicon.png" alt="PingLee"></div>
            <div class="message-body">
                <div class="author">PingLee</div>
                <div class="bubble">
                    <div class="msg-chinese ${isLoading ? 'thinking-indicator' : ''}">${isLoading ? '...' : chinese}</div>
                    ${pinyin ? `<div class="msg-pinyin hidden">${pinyin}</div>` : ''}
                    ${translation ? `<div class="msg-translation hidden">${translation}</div>` : ''}
                    ${feedback ? `<div class="msg-feedback hidden">${feedback}</div>` : ''}
                </div>
            </div>
        `;

        // Adiciona ações apenas se não for uma mensagem de loading
        if (!isLoading) {
            const actionsContainer = this.createActions(messageEl, chinese, pinyin, translation, feedback);
            messageEl.querySelector('.message-body')?.appendChild(actionsContainer);
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
            const btn = this.createActionButton('pinyin-btn', 'Aa', (btn) => this.toggleBlock(messageEl, '.msg-pinyin', btn));
            if (!messageEl.querySelector('.msg-pinyin')?.classList.contains('hidden')) {
                btn.classList.add('is-active');
            }
            actionsContainer.appendChild(btn);
        }
        if (translation) {
            const btn = this.createActionButton('translation-btn', '文A', (btn) => this.toggleBlock(messageEl, '.msg-translation', btn));
            if (!messageEl.querySelector('.msg-translation')?.classList.contains('hidden')) {
                btn.classList.add('is-active');
            }
            actionsContainer.appendChild(btn);
        }
        if (feedback) {
             actionsContainer.appendChild(this.createActionButton('feedback-btn', '💡', (btn) => this.toggleBlock(messageEl, '.msg-feedback', btn)));
        }
        if (chinese) {
            const audioBtn = this.createActionButton('audio-btn', 'Ouvir', (btn) => this.playAudio(btn, chinese));
            actionsContainer.appendChild(audioBtn);
        }

        return actionsContainer;
    },

    createActionButton(className, text, onClick) {
        const button = document.createElement('button');
        button.className = `action-btn ${className}`;
        if (className.includes('audio-btn')) {
            button.setAttribute('aria-label', text);
            button.innerHTML = `<svg class="icon-speaker" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5z"/><path d="M16 8.82a4 4 0 0 1 0 6.36"/><path d="M18.5 6a7 7 0 0 1 0 12"/></svg>`;
        } else {
            button.textContent = text;
        }
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick(button);
        });
        return button;
    },

    // --- 3. LÓGICA DE INTERAÇÃO ---

    toggleBlock(messageEl, selector, button) {
        const block = messageEl.querySelector(selector);
        if (block) {
            const isVisible = !block.classList.toggle('hidden');
            if (button) {
                button.classList.toggle('is-active', isVisible);
            }
            return isVisible;
        }
        return false;
    },

    playAudio(button, text, onAudioInstance) {
        if (button.classList.contains('is-pending')) return;

        button.classList.add('is-pending');
        button.classList.remove('is-error');

        fetch('/api/text-to-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, speed: this.audioSpeed })
        })
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch audio');
            return res.blob();
        })
        .then(blob => {
            const audioURL = URL.createObjectURL(blob);
            const audio = new Audio(audioURL);
            audio.play();
            if (typeof onAudioInstance === 'function') {
                onAudioInstance(audio);
            }
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
    },

    attachAudioSpeedToggle() {
        const toggle = document.querySelector('#audio-slow-toggle');
        if (!toggle) return;
        const applyState = (on) => {
            this.audioSpeed = on ? 0.85 : 1;
            toggle.classList.toggle('is-active', on);
        };
        toggle.addEventListener('click', () => {
            const on = !toggle.classList.contains('is-active');
            applyState(on);
        });
        applyState(false);
    }
};
