// Standalone chat functionality that doesn't depend on other scripts
window.sendMessage = async function(e) {
    if (e) e.preventDefault();

    // Get elements directly when function is called
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');

    // Validate required elements
    if (!userInput || !chatMessages) {
        console.error("Required elements not found");
        return;
    }

    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    // Add user message to chat
    const message = {
        sender: 'user',
        text: userMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user-message');
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    textDiv.innerHTML = `<p>${userMessage}</p>`;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('message-timestamp');
    timestampDiv.textContent = message.timestamp;
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timestampDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Clear input
    userInput.value = '';
    
    // Keep track of conversation history
    const messageHistory = window.messageHistory || [];
    messageHistory.push({
        role: "user",
        content: userMessage
    });
    window.messageHistory = messageHistory;
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-message');

    const typingContentDiv = document.createElement('div');
    typingContentDiv.classList.add('message-content');

    const indicatorDiv = document.createElement('div');
    indicatorDiv.classList.add('typing-indicator');
    indicatorDiv.innerHTML = '<span></span><span></span><span></span>';

    typingContentDiv.appendChild(indicatorDiv);

    const typingAvatarDiv = document.createElement('div');
    typingAvatarDiv.classList.add('avatar');
    typingAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';

    typingDiv.appendChild(typingContentDiv);
    typingDiv.appendChild(typingAvatarDiv);

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Try to get API response using OpenRouter
        const apiKey = localStorage.getItem('openrouter_api_key');
        if (!apiKey) {
            throw new Error("API key not found. Please set up your API key in settings.");
        }
        
        // Get user settings for AI model and response style
        const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
        const selectedModel = savedSettings.aiModel || "deepseek/deepseek-r1:free"; // Default model
        const responseStyle = savedSettings.responseStyle || 'balanced';
            
        // System prompt defining the AI assistant's persona
        let systemPrompt = "You are a compassionate, calming mental health companion who helps users with anxiety and stress using CBT and mindfulness. Provide supportive responses that incorporate cognitive-behavioral techniques and mindfulness practices. Focus on helping users identify negative thought patterns, practice grounding exercises, and develop healthy coping mechanisms. Your tone should be gentle, reassuring, and empathetic at all times.";
            
        // Adjust system prompt based on response style
        if (responseStyle === 'concise') {
            systemPrompt += " Keep your responses brief and to the point.";
        } else if (responseStyle === 'detailed') {
            systemPrompt += " Provide detailed explanations and additional context in your responses.";
        }

        // Prepare messages for API including conversation history
        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            ...messageHistory.slice(-10) // Keep last 10 messages for context
        ];

        // Adjust temperature based on response style
        const temperature = responseStyle === 'detailed' ? 0.8 : 
                           responseStyle === 'concise' ? 0.5 : 0.7;

        // Make API request
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://mindfulchat.ai", // Replace with your actual site URL
                "X-Title": "MindfulChat" // Your app name for OpenRouter rankings
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                max_tokens: responseStyle === 'detailed' ? 1000 : 
                           responseStyle === 'concise' ? 400 : 800,
                temperature: temperature,
                stream: false
            })
        });

        // Remove typing indicator
        const typingMessage = chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            chatMessages.removeChild(typingMessage);
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const botResponse = data.choices[0].message.content;
        
        // Save to conversation history
        messageHistory.push({
            role: "assistant",
            content: botResponse
        });
        window.messageHistory = messageHistory;
        
        // Add bot response to chat
        const botMessageDiv = document.createElement('div');
        botMessageDiv.classList.add('message', 'bot-message');
        
        const botContentDiv = document.createElement('div');
        botContentDiv.classList.add('message-content');
        
        const botTextDiv = document.createElement('div');
        botTextDiv.classList.add('message-text');
        botTextDiv.innerHTML = `<p>${botResponse}</p>`;
        
        const botTimestampDiv = document.createElement('div');
        botTimestampDiv.classList.add('message-timestamp');
        botTimestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        botContentDiv.appendChild(botTextDiv);
        botContentDiv.appendChild(botTimestampDiv);
        
        const botAvatarDiv = document.createElement('div');
        botAvatarDiv.classList.add('avatar');
        botAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        
        botMessageDiv.appendChild(botContentDiv);
        botMessageDiv.appendChild(botAvatarDiv);
        
        chatMessages.appendChild(botMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error("Error generating response:", error);
        
        // Remove typing indicator
        const typingMessage = chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            chatMessages.removeChild(typingMessage);
        }
        
        // Fallback to simple responses if API fails
        const fallbackResponses = {
            hello: "Hello! How can I help you today?",
            sad: "I'm sorry to hear you're feeling down. Would you like to talk more about what's troubling you?",
            anxious: "Anxiety can be challenging. Would you like to try a breathing exercise?",
            stressed: "It sounds like you're feeling stressed. Taking a short break might help.",
            default: "I'm here to support you. Tell me more about how you're feeling."
        };
        
        // Determine which fallback to use based on keywords
        let botResponse;
        const lowerCaseMessage = userMessage.toLowerCase();
        if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
            botResponse = fallbackResponses.hello;
        } else if (lowerCaseMessage.includes('sad') || lowerCaseMessage.includes('depressed')) {
            botResponse = fallbackResponses.sad;
        } else if (lowerCaseMessage.includes('anxious') || lowerCaseMessage.includes('anxiety')) {
            botResponse = fallbackResponses.anxious;
        } else if (lowerCaseMessage.includes('stressed') || lowerCaseMessage.includes('stress')) {
            botResponse = fallbackResponses.stressed;
        } else {
            botResponse = fallbackResponses.default;
        }
        
        // Add fallback error message to explain API issue
        if (error.message.includes("API key")) {
            botResponse = "I'm having trouble connecting to my AI service. Please make sure you've set up your API key in the settings page.";
        }
        
        // Add bot response to chat
        const botMessageDiv = document.createElement('div');
        botMessageDiv.classList.add('message', 'bot-message');
        
        const botContentDiv = document.createElement('div');
        botContentDiv.classList.add('message-content');
        
        const botTextDiv = document.createElement('div');
        botTextDiv.classList.add('message-text');
        botTextDiv.innerHTML = `<p>${botResponse}</p>`;
        
        const botTimestampDiv = document.createElement('div');
        botTimestampDiv.classList.add('message-timestamp');
        botTimestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        botContentDiv.appendChild(botTextDiv);
        botContentDiv.appendChild(botTimestampDiv);
        
        const botAvatarDiv = document.createElement('div');
        botAvatarDiv.classList.add('avatar');
        botAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        
        botMessageDiv.appendChild(botContentDiv);
        botMessageDiv.appendChild(botAvatarDiv);
        
        chatMessages.appendChild(botMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

// Set up event listeners when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            window.sendMessage(e);
        });
    }
    
    // Also handle Enter key in the input field
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (window.sendMessage) {
                    window.sendMessage(e);
                }
                return false;
            }
        });
    }
    
    // Initialize message history
    if (!window.messageHistory) {
        window.messageHistory = [{
            role: "assistant", 
            content: "Hello! I'm MindfulBot, your mental health companion. How are you feeling today?"
        }];
    }
}); 