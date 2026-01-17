const RolePlay = {
    currentScenario: null,
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,

    init() {
        const scenarioListContainer = document.querySelector('.scenario-list-container');
        const rolePlayChatContainer = document.querySelector('.role-play-chat-container');
        const scenarioButtons = document.querySelectorAll('.scenario-button');
        const backToScenariosButton = document.querySelector('.back-to-scenarios');
        const micButton = document.querySelector('.mic-button');
        this.messagesContainer = document.querySelector('#role-play .chat-messages');
        
        scenarioButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.currentScenario = button.dataset.scenario;
                scenarioListContainer.classList.add('hidden');
                rolePlayChatContainer.classList.remove('hidden');
                this.start();
            });
        });

        backToScenariosButton.addEventListener('click', () => {
            rolePlayChatContainer.classList.add('hidden');
            scenarioListContainer.classList.remove('hidden');
            this.currentScenario = null;
            this.messagesContainer.innerHTML = '';
        });

        micButton.addEventListener('mousedown', this.handleMicPress.bind(this));
        micButton.addEventListener('mouseup', this.handleMicRelease.bind(this));
        micButton.addEventListener('touchstart', this.handleMicPress.bind(this), { passive: true });
        micButton.addEventListener('touchend', this.handleMicRelease.bind(this));
    },

    async start() {
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
                userMsgElement.querySelector('.content').textContent = sttData.transcription;
                userMsgElement.classList.remove('loading');

                const chatResponse = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: sttData.transcription, scenario: this.currentScenario, mode: 'voice' }) });
                const chatData = await chatResponse.json();
                UI.addTutorMessage(chatData.chinese, chatData.pinyin, chatData.translation, chatData.feedback, this.messagesContainer);
            } catch (error) {
                userMsgElement.querySelector('.content').textContent = "Erro ao processar áudio.";
            }
        };
    },

    setRecordingState(isRecording) {
        this.isRecording = isRecording;
        document.querySelector('.mic-button').classList.toggle('recording', isRecording);
        document.querySelector('.recording-indicator').classList.toggle('hidden', !isRecording);
    }
};