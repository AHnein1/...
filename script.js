// Configuration
let apiKey = localStorage.getItem('openaiApiKey') || '';
let selectedModel = localStorage.getItem('selectedModel') || 'gpt-3.5-turbo';
let temperature = parseFloat(localStorage.getItem('temperature') || '0.7');

const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
let conversationHistory = [];
let isLoading = false;

// Load settings on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    checkApiKey();
});

// Load conversation history from localStorage
function loadSettings() {
    const savedHistory = localStorage.getItem('conversationHistory');
    if (savedHistory) {
        try {
            conversationHistory = JSON.parse(savedHistory);
            displayConversationHistory();
        } catch (e) {
            console.error('Error loading conversation history:', e);
            conversationHistory = [];
        }
    }

    // Update modal with saved settings
    document.getElementById('apiKeyInput').value = apiKey ? '••••••••' : '';
    document.getElementById('modelSelect').value = selectedModel;
    document.getElementById('temperatureInput').value = temperature;
}

// Display conversation history on page load
function displayConversationHistory() {
    const chatMessages = document.getElementById('chatMessages');
    if (conversationHistory.length > 0) {
        chatMessages.innerHTML = '';
        conversationHistory.forEach(msg => {
            displayMessage(msg.content, msg.role);
        });
        scrollToBottom();
    }
}

// Check if API key is set
function checkApiKey() {
    const notice = document.getElementById('apiKeyNotice');
    if (!apiKey) {
        notice.classList.add('show');
        document.getElementById('sendBtn').disabled = true;
    } else {
        notice.classList.remove('show');
        document.getElementById('sendBtn').disabled = false;
    }
}

// Send message function
async function sendMessage(event) {
    event.preventDefault();

    if (!apiKey) {
        alert('Please set your OpenAI API Key in settings first!');
        openSettings();
        return;
    }

    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();

    if (!message) return;

    if (isLoading) return;

    // Display user message
    displayMessage(message, 'user');
    conversationHistory.push({ role: 'user', content: message });

    userInput.value = '';
    userInput.focus();

    // Show typing indicator
    showTypingIndicator();

    try {
        isLoading = true;
        document.getElementById('sendBtn').disabled = true;

        // Prepare messages for API
        const messages = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Call OpenAI API
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                temperature: temperature,
                max_tokens: 2000
            })
        });

        // Remove typing indicator
        removeTypingIndicator();

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;

        // Display assistant message
        displayMessage(assistantMessage, 'assistant');
        conversationHistory.push({ role: 'assistant', content: assistantMessage });

        // Save conversation history
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));

    } catch (error) {
        removeTypingIndicator();
        displayMessage(`❌ Error: ${error.message}`, 'error');
        console.error('Error:', error);
    } finally {
        isLoading = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('userInput').focus();
    }
}

// Display message in chat
function displayMessage(content, role) {
    const chatMessages = document.getElementById('chatMessages');

    // Remove welcome message if it exists
    const welcomeMsg = chatMessages.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Parse markdown-like formatting
    let formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    
    contentDiv.innerHTML = formattedContent;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingDiv = document.getElementById('typingIndicator');
    if (typingDiv) {
        typingDiv.remove();
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Settings functions
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    const apiKeyInput = document.getElementById('apiKeyInput').value.trim();
    const modelSelect = document.getElementById('modelSelect').value;
    const temperatureInput = parseFloat(document.getElementById('temperatureInput').value);

    // Only update API key if a new one is provided (not the masked one)
    if (apiKeyInput && !apiKeyInput.includes('•')) {
        if (!apiKeyInput.startsWith('sk-')) {
            alert('❌ Invalid API Key! It should start with "sk-"');
            return;
        }
        apiKey = apiKeyInput;
        localStorage.setItem('openaiApiKey', apiKey);
    }

    selectedModel = modelSelect;
    temperature = temperatureInput;

    localStorage.setItem('selectedModel', selectedModel);
    localStorage.setItem('temperature', temperature);

    alert('✅ Settings saved successfully!');
    checkApiKey();
    closeSettings();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
        conversationHistory = [];
        localStorage.removeItem('conversationHistory');
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome! 👋</h2>
                <p>Ask me anything and I'll provide you with an answer powered by ChatGPT.</p>
            </div>
        `;

        alert('✅ Chat history cleared!');
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('settingsModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Allow Enter key to send message
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            document.getElementById('chatForm').dispatchEvent(new Event('submit'));
        }
    });
});
