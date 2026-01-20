const RolePlay = {
    initialized: false,
    currentScenario: null,
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    isStarting: false,
    startSeq: 0,
    stage: null,
    titleEl: null,
    contextEl: null,
    backBtn: null,
    startBtn: null,
    micButton: null,
    audioSpeed: 1,
    micHandlers: {},
    recordingStartedAt: 0,
    recordingTimeoutId: null,
    micEnabled: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        const scenarioButtons = document.querySelectorAll('.scenario-button');
        this.stage = document.getElementById('roleplay-stage');
        this.messagesContainer = this.stage?.querySelector('.roleplay-messages');
        this.titleEl = document.getElementById('roleplay-title');
        this.contextEl = document.getElementById('roleplay-context');
        this.micButton = this.stage?.querySelector('.mic-button');
        this.backBtn = this.stage?.querySelector('.roleplay-back');
        this.startBtn = document.getElementById('roleplay-start-btn');
        this.setStartIdle();

        scenarioButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (this.isStarting) return; // evita duplos
                this.currentScenario = button.dataset.scenario;
                this.messagesContainer.innerHTML = '';
                this.showStage(button.dataset.scenario);
                this.setMicEnabled(false);
                this.setStartReady(false);
                this.scrollToBottomSmooth();
            });
        });

        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => this.resetStage());
        }
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.start());
        }

        if (this.micButton) {
            this.attachMicEvents();
        }

        UI.attachAudioSpeedToggle('#roleplay-audio-slow-toggle', (speed) => {
            this.audioSpeed = speed;
        }, 'roleplay_audio_slow');

        // Começa desativado até chegar a 1.ª fala do tutor
        this.setMicEnabled(false);
    },

    async start() {
        if (!this.currentScenario || this.isStarting) return;
        this.isStarting = true;
        const seq = ++this.startSeq;
        this.activeStartSeq = seq;
        this.toggleStage(true);
        this.messagesContainer.innerHTML = '';
        const loadingElement = UI.addTutorMessage('...', null, null, null, this.messagesContainer, true);
        this.setStartBusy();
        this.scrollToBottomSmooth();
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Envia o cenário de forma estruturada
                body: JSON.stringify({ message: '##START_SCENARIO##', scenario: this.currentScenario, mode: 'voice' })
            });
            const data = await response.json();
            if (this.activeStartSeq !== seq) return;
            loadingElement.remove();
            UI.addTutorMessage(data.chinese, data.pinyin, data.translation, data.feedback, this.messagesContainer);
            this.scrollToBottomSmooth();
            this.playTutorAudio(data.chinese);
            this.setMicEnabled(true);
            this.setStartReady(true);
        } catch (error) {
            console.error('Role-play start error:', error);
            loadingElement.remove();
            UI.addTutorMessage('Não foi possível iniciar o cenário.', null, null, null, this.messagesContainer);
            this.scrollToBottomSmooth();
            this.setMicEnabled(true);
            this.setStartReady();
        } finally {
            this.isStarting = false;
        }
    },

    async handleMicPress(event) {
        event.preventDefault();
        if (this.isRecording || !this.micEnabled || this.micButton?.disabled) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
            this.mediaRecorder.onstop = this.handleRecordingStop.bind(this);
            this.audioChunks = [];
            this.mediaRecorder.start();
            this.setRecordingState(true);
            this.recordingStartedAt = Date.now();
            this.startRecordingTimeout();
        } catch (error) { alert("Não foi possível aceder ao microfone."); }
    },

    handleMicRelease() {
        if (!this.isRecording || !this.mediaRecorder) return;
        try {
            this.mediaRecorder.stop();
        } catch (_) {
            // ignore stop errors
        }
        this.setRecordingState(false);
        this.clearRecordingTimeout();
    },

    async handleRecordingStop() {
        this.clearRecordingTimeout();
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        // Evita enviar áudio vazio ou demasiado curto
        const durationMs = Date.now() - this.recordingStartedAt;
        if (audioBlob.size < 500 || durationMs < 400) {
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result;
            const userMsgElement = UI.addUserMessage('...', this.messagesContainer, true);
            this.scrollToBottomSmooth();

            try {
                const sttResponse = await fetch('/api/speech-to-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioBase64: base64Audio }) });
                const sttData = await sttResponse.json();
                userMsgElement.querySelector('.msg-chinese').textContent = sttData.transcription;
                userMsgElement.classList.remove('loading');
                this.scrollToBottomSmooth();

            const chatResponse = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: sttData.transcription, scenario: this.currentScenario, mode: 'voice' }) });
            const chatData = await chatResponse.json();
            UI.addTutorMessage(chatData.chinese, chatData.pinyin, chatData.translation, chatData.feedback, this.messagesContainer);
            this.scrollToBottomSmooth();
            this.playTutorAudio(chatData.chinese);
            this.setMicEnabled(true);
        } catch (error) {
            userMsgElement.querySelector('.msg-chinese').textContent = "Erro ao processar áudio.";
        }
        };
    },

    setRecordingState(isRecording) {
        this.isRecording = isRecording;
        const micBtn = this.micButton;
        const indicator = this.stage?.querySelector('.recording-indicator');
        if (micBtn) micBtn.classList.toggle('recording', isRecording);
        if (indicator) indicator.classList.toggle('hidden', !isRecording);
    },

    playTutorAudio(text) {
        if (!text) return;
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        // Use UI.playAudio para TTS mas guarda referência do Audio
        const tempBtn = document.createElement('button');
        UI.playAudio(tempBtn, text, (audioInstance) => {
            this.currentAudio = audioInstance;
        }, this.audioSpeed);
    },

    scrollToBottomSmooth() {
        if (!this.messagesContainer) return;
        UI.scrollToBottom(this.messagesContainer);
    },

    attachMicEvents() {
        const press = this.handleMicPress.bind(this);
        const release = this.handleMicRelease.bind(this);
        this.micHandlers = { press, release };

        this.micButton.addEventListener('pointerdown', press);
        this.micButton.addEventListener('pointerup', release);
        this.micButton.addEventListener('pointerleave', release);
        this.micButton.addEventListener('pointercancel', release);
        this.micButton.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    startRecordingTimeout() {
        this.clearRecordingTimeout();
        this.recordingTimeoutId = setTimeout(() => {
            this.handleMicRelease();
        }, 15000); // 15s segurança
    },

    clearRecordingTimeout() {
        if (this.recordingTimeoutId) {
            clearTimeout(this.recordingTimeoutId);
            this.recordingTimeoutId = null;
        }
    },

    toggleStage(show) {
        if (!this.stage) return;
        this.stage.classList.toggle('hidden', !show);
    },

    showStage(scenarioKey) {
        const meta = this.getScenarioMeta(scenarioKey);
        if (this.titleEl) this.titleEl.textContent = meta.title;
        if (this.contextEl) this.contextEl.textContent = meta.desc;
        this.toggleStage(true);
        this.setStartReady(false);
    },

    resetStage() {
        this.handleMicRelease();
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.messagesContainer.innerHTML = '';
        this.currentScenario = null;
        this.isStarting = false;
        this.activeStartSeq = 0;
        this.setMicEnabled(false);
        if (this.mediaRecorder?.stream) {
            this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
        this.toggleStage(false);
    },

    getScenarioMeta(key) {
        const map = {
            restaurant: { title: 'No Restaurante', desc: 'Pratique pedidos de comida e interações com o empregado.' },
            shopping: { title: 'Fazer Compras', desc: 'Simule uma ida às compras e peça tamanhos ou preços.' },
            introductions: { title: 'Apresentações', desc: 'Conheça novas pessoas e fale sobre si de forma simples.' },
            taxi: { title: 'Táxi', desc: 'Peça direções e explique ao motorista para onde quer ir.' }
        };
        return map[key] || { title: 'Roleplay', desc: 'Pratique uma situação do dia a dia em Mandarim.' };
    },

    setMicEnabled(on) {
        this.micEnabled = !!on;
        if (this.micButton) {
            this.micButton.disabled = !on;
            this.micButton.classList.toggle('is-disabled', !on);
        }
    },

    setStartReady(labelRestart = false) {
        if (!this.startBtn) return;
        this.startBtn.disabled = false;
        this.startBtn.textContent = labelRestart ? 'Recomeçar' : 'Começar';
    },

    setStartBusy() {
        if (!this.startBtn) return;
        this.startBtn.disabled = true;
        this.startBtn.textContent = 'A iniciar...';
    },

    setStartIdle() {
        if (!this.startBtn) return;
        this.startBtn.disabled = true;
        this.startBtn.textContent = 'Começar';
    }
};

// Exporta para lazy load
window.RolePlay = RolePlay;
