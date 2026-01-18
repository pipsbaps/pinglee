const RolePlay = {
    currentScenario: null,
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,

    init() {
        const scenarioButtons = document.querySelectorAll('.scenario-button');
        const exitButton = document.querySelector('.role-play-exit');
        this.messagesContainer = document.querySelector('#role-play .chat-messages');

        scenarioButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.currentScenario = button.dataset.scenario;
                this.messagesContainer.innerHTML = '';
                this.start();
            });
        });

        if (exitButton) {
            exitButton.addEventListener('click', () => {
                this.messagesContainer.innerHTML = '';
                this.currentScenario = null;
            });
        }

        const micButton = document.querySelector('#role-play .mic-button');
        if (micButton) {
            micButton.addEventListener('mousedown', this.handleMicPress.bind(this));
            micButton.addEventListener('mouseup', this.handleMicRelease.bind(this));
            micButton.addEventListener('touchstart', this.handleMicPress.bind(this), { passive: true });
            micButton.addEventListener('touchend', this.handleMicRelease.bind(this));
        }
    },

    async start() {
        if (!this.currentScenario) return;
        this.messagesContainer.innerHTML = '';
        const loadingElement = UI.addTutorMessage('...', null, null, null, this.messagesContainer, true);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Envia o cenário de forma estruturada
                body: JSON.stringify({ message: '##START_SCENARIO##', scenario: this.currentScenario, mode: 'voice' })
            });
            const data = await response.json();
            loadingElement.remove();
            UI.addTutorMessage(data.chinese, data.pinyin, data.translation, data.feedback, this.messagesContainer);
            this.playTutorAudio(data.chinese);
        } catch (error) {
            console.error('Role-play start error:', error);
            loadingElement.remove();
            UI.addTutorMessage('Não foi possível iniciar o cenário.', null, null, null, this.messagesContainer);
        }
    },

    async handleMicPress(event) {
        event.preventDefault();
        if (this.isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
            this.mediaRecorder.onstop = this.handleRecordingStop.bind(this);
            this.audioChunks = [];
            this.mediaRecorder.start();
            this.setRecordingState(true);
        } catch (error) { alert("Não foi possível aceder ao microfone."); }
    },

    handleMicRelease() {
        if (!this.isRecording) return;
        this.mediaRecorder.stop();
        this.setRecordingState(false);
    },

    async handleRecordingStop() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result;
            const userMsgElement = UI.addUserMessage('...', this.messagesContainer, true);

            try {
                const sttResponse = await fetch('/api/speech-to-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioBase64: base64Audio }) });
                const sttData = await sttResponse.json();
                userMsgElement.querySelector('.msg-chinese').textContent = sttData.transcription;
                userMsgElement.classList.remove('loading');

                const chatResponse = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: sttData.transcription, scenario: this.currentScenario, mode: 'voice' }) });
                const chatData = await chatResponse.json();
                UI.addTutorMessage(chatData.chinese, chatData.pinyin, chatData.translation, chatData.feedback, this.messagesContainer);
                this.playTutorAudio(chatData.chinese);
            } catch (error) {
                userMsgElement.querySelector('.msg-chinese').textContent = "Erro ao processar áudio.";
            }
        };
    },

    setRecordingState(isRecording) {
        this.isRecording = isRecording;
        const micBtn = document.querySelector('#role-play .mic-button');
        const indicator = document.querySelector('#role-play .recording-indicator');
        if (micBtn) micBtn.classList.toggle('recording', isRecording);
        if (indicator) indicator.classList.toggle('hidden', !isRecording);
    },

    playTutorAudio(text) {
        if (!text) return;
        const tempBtn = document.createElement('button');
        UI.playAudio(tempBtn, text);
    }
};
