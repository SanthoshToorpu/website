document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-message');
    const toggleButton = document.getElementById('toggle-chatbot');
    const chatbotToggle = document.getElementById('chatbot-toggle');

    // State
    let isMinimized = false;
    let isTyping = false;
    let socket = null;
    let isConnected = false;
    
    // Initialize WebSocket connection
    function connectWebSocket() {
        try {
            console.log('Attempting to connect to WebSocket...');
            socket = new WebSocket('wss://rag-fastapi-app.azurewebsites.net/ws');
            
            socket.onopen = function(e) {
                console.log('WebSocket connection established successfully');
                isConnected = true;
                addSystemMessage('Connected to server');
            };
            
            socket.onmessage = function(event) {
                console.log('Received message from server:', event.data);
                try {
                    const response = JSON.parse(event.data);
                    if (response.type === 'response') {
                        removeTypingIndicator();
                        addMessage(response.response, 'bot');
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    removeTypingIndicator();
                    addMessage('Sorry, there was an error processing your request.', 'bot');
                }
            };
            
            socket.onclose = function(event) {
                console.log('WebSocket connection closed, code:', event.code, 'reason:', event.reason);
                isConnected = false;
                addSystemMessage('Disconnected from server');
                setTimeout(connectWebSocket, 3000);
            };
            
            socket.onerror = function(error) {
                console.error('WebSocket error:', error);
                isConnected = false;
                addSystemMessage('Connection error');
            };
        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            addSystemMessage('Failed to connect');
        }
    }

    // Connect to WebSocket when page loads
    connectWebSocket();

    // Event Listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    toggleButton.addEventListener('click', hideChatbot);
    chatbotToggle.addEventListener('click', showChatbot);

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });

    // Functions
    function handleSendMessage() {
        const message = userInput.value.trim();
        if (!message || isTyping) return;

        // Add user message
        addMessage(message, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';

        // Show typing indicator
        showTypingIndicator();

        // Send message to WebSocket server
        if (socket && socket.readyState === WebSocket.OPEN) {
            try {
                const messageData = {
                    type: 'query',
                    query: message
                };
                const jsonMessage = JSON.stringify(messageData);
                console.log('Sending message to server:', jsonMessage);
                socket.send(jsonMessage);
            } catch (error) {
                console.error('Error sending message:', error);
                removeTypingIndicator();
                addSystemMessage('Failed to send message');
                addMessage('Error sending your message. Please try again.', 'bot');
            }
        } else {
            // If WebSocket is not connected, show an error message
            console.error('WebSocket not connected. Current state:', socket ? socket.readyState : 'No socket');
            removeTypingIndicator();
            addSystemMessage('Not connected to server');
            addMessage('Unable to connect to the server. Please try again later.', 'bot');
            // Try to reconnect
            connectWebSocket();
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const paragraph = document.createElement('p');
        
        // Use enhanced parsing for bot messages to handle markdown
        if (sender === 'bot') {
            // Handle markdown bold text (**text**)
            const formattedText = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            paragraph.innerHTML = formattedText;
        } else {
            paragraph.textContent = text;
        }
        
        contentDiv.appendChild(paragraph);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        
        contentDiv.appendChild(paragraph);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const dots = document.createElement('div');
        dots.className = 'typing-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        
        contentDiv.appendChild(dots);
        typingDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showChatbot() {
        isMinimized = false;
        chatbotContainer.classList.remove('minimized');
        chatbotContainer.classList.add('active');
        chatbotToggle.classList.add('hidden');
        toggleButton.querySelector('.minimize-icon').textContent = '×';
        scrollToBottom();
    }

    function hideChatbot() {
        chatbotContainer.classList.remove('active');
        chatbotToggle.classList.remove('hidden');
        setTimeout(() => {
            chatbotContainer.classList.add('minimized');
            toggleButton.querySelector('.minimize-icon').textContent = '+';
        }, 300);
    }

    // Initialize chatbot state
    chatbotContainer.classList.add('minimized');
    toggleButton.querySelector('.minimize-icon').textContent = '+';
}); 