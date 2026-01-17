const TextChat = {
    init() {
        const form = document.querySelector('#chat .chat-form');
        const input = document.querySelector('#chat .message-input');
        const messagesContainer = document.querySelector('#chat .chat-messages');

        // Inicia a conversa e adiciona sugestões
        this.startConversation(messagesContainer, input);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if (!message) return;

            // 1. Adiciona a mensagem do utilizador e foca o input
            UI.addUserMessage(message, messagesContainer);
            input.value = '';
            input.focus(); // Garante que o foco regressa ao input

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
                UI.addTutorMessage(data.chinese, data.pinyin, data.translation, null, messagesContainer);

            } catch (error) {
                console.error('Text chat error:', error);
                loadingElement.remove();
                UI.addTutorMessage('Desculpe, ocorreu um erro ao contactar a API.', null, null, null, messagesContainer);
            }
        });
    },

    startConversation(container, input) {
        // Garante que a mensagem inicial e as sugestões só são adicionadas uma vez.
        if (container.children.length > 0) return;

        // Adiciona a mensagem de boas-vindas do Tutor
        UI.addTutorMessage(
            "你好! 我是PingLee, 你的专属中文老师。有什么可以帮你的吗?", 
            "Nǐ hǎo! Wǒ shì PingLee, nǐ de zhuānshǔ Zhōngwén lǎoshī. Yǒu shé me kěyǐ bāng nǐ de ma?", 
            "Olá! Eu sou o PingLee, o seu tutor pessoal de Mandarim. Como posso ajudá-lo hoje?", 
            null, 
            container
        );
        
        // Adiciona os chips de sugestão
        this.addSuggestionChips(container, input);
    },

    addSuggestionChips(container, input) {
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'suggestion-chips-container';

        const suggestions = [
            'Como se diz "aeroporto" em Mandarim?',
            'Qual é a diferença entre 你 e 您?'
        ];

        suggestions.forEach(text => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = text;
            chip.onclick = () => {
                input.value = text;
                input.focus();
                suggestionsContainer.remove(); // Remove as sugestões após o clique
            };
            suggestionsContainer.appendChild(chip);
        });

        container.appendChild(suggestionsContainer);
        UI.scrollToBottom(container);
    }
};
