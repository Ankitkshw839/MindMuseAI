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
        const apiKey = localStorage.getItem('openrouter_api_key') || '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';
        
        // Get user settings for AI model and response style
        const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
        const selectedModel = savedSettings.aiModel || "anthropic/claude-3.7-sonnet"; // Updated correct model name
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

        // Remove typing indicator
        const typingMessage = chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            chatMessages.removeChild(typingMessage);
        }

        // Create bot message element for streaming
        const botMessageDiv = document.createElement('div');
        botMessageDiv.classList.add('message', 'bot-message');
        
        const botContentDiv = document.createElement('div');
        botContentDiv.classList.add('message-content');
        
        const botTextDiv = document.createElement('div');
        botTextDiv.classList.add('message-text');
        botTextDiv.innerHTML = `<p></p>`;
        
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
        
        // Reference to paragraph element for streaming content
        const botTextParagraph = botTextDiv.querySelector('p');

        // Make API request
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://mindmuseai.app",
                "X-Title": "MindMuseAI"
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                max_tokens: responseStyle === 'detailed' ? 500 : 
                           responseStyle === 'concise' ? 250 : 400,
                temperature: temperature,
                stream: true // Enable streaming
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                console.error("API Error:", errorData);
                throw new Error(`API error: ${errorData.error?.message || response.status}`);
            } catch (e) {
                throw new Error(`API error: ${response.status}`);
            }
        }

        // Process the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            // Decode and process chunk
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(line => line.trim() !== "");
            
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.substring(6);
                    if (data === "[DONE]") continue;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        const contentDelta = jsonData.choices[0]?.delta?.content || "";
                        if (contentDelta) {
                            fullContent += contentDelta;
                            botTextParagraph.textContent = fullContent;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.warn("Could not parse JSON:", e);
                    }
                }
            }
        }
        
        // Save to conversation history
        messageHistory.push({
            role: "assistant",
            content: fullContent
        });
        window.messageHistory = messageHistory;
        
    } catch (error) {
        console.error("Error generating response:", error);
        
        // Remove typing indicator if still present
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

    // Initialize file upload functionality
    initFileUpload();
    
    // Initialize voice input functionality
    initVoiceInput();
    
    // Initialize text-to-speech functionality
    initTextToSpeech();
});

// Chat functionality using OpenRouter API with Claude 3.7 Sonnet
document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const clearChatBtn = document.getElementById('clear-chat');
    
    // Initialize message history
    let messages = [
        {
            role: 'assistant',
            content: "Hello! I'm MindMuseAI Bot, your mental health companion. How are you feeling today?"
        }
    ];
    
    // Get current time in HH:MM format
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Create message element
    function createMessageElement(message, sender, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        
        const textDiv = document.createElement('div');
        textDiv.classList.add('message-text');
        textDiv.innerHTML = `<p>${message}</p>`;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('message-timestamp');
        timestampDiv.textContent = timestamp;
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timestampDiv);
        
        if (sender === 'bot') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarDiv);
        } else {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
        }
        
        return messageDiv;
    }
    
    // Add message to UI
    function addMessageToUI(message, sender) {
        const time = getCurrentTime();
        const messageElement = createMessageElement(message, sender, time);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Show feedback modal function
    function showFeedbackModal() {
        const feedbackModal = document.getElementById('feedback-modal');
        if (feedbackModal) {
            feedbackModal.style.display = 'flex';
            // Add active class after a small delay to trigger CSS transition
            setTimeout(() => {
                feedbackModal.classList.add('active');
            }, 10);
        }
    }
    
    // Handle user message submission
    async function sendMessage(e) {
        if (e) e.preventDefault();
        
        // Validate required elements
        if (!userInput || !chatMessages) {
            console.error("Required elements not found");
            return;
        }
        
        const userMessage = userInput.value.trim();
        if (!userMessage) return;
        
        // Add user message to UI
        addMessageToUI(userMessage, 'user');
        
        // Clear input field
        userInput.value = '';
        
        // Add user message to history
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.innerHTML = `
            <div class="message-content">
                <div class="message-text">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Get API key from settings, with fallback to default
            const apiKey = localStorage.getItem('openrouter_api_key') || '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';
            
            // Get user settings for AI model and response style
            const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
            const selectedModel = savedSettings.aiModel || "anthropic/claude-3.7-sonnet"; // Updated correct model name
            const responseStyle = savedSettings.responseStyle || 'balanced';
                
            // System prompt defining the AI assistant's persona
            let systemPrompt = "You are a compassionate, calming mental health companion who helps users with anxiety and stress using CBT and mindfulness. Provide supportive responses that incorporate cognitive-behavioral techniques and mindfulness practices. Focus on helping users identify negative thought patterns, practice grounding exercises, and develop healthy coping mechanisms. Your tone should be gentle, reassuring, and empathetic at all times.";
                
            // Adjust system prompt based on response style
            if (responseStyle === 'concise') {
                systemPrompt += " Keep your responses brief and to the point.";
            } else if (responseStyle === 'detailed') {
                systemPrompt += " Provide detailed explanations and additional context in your responses.";
            }
            
            // Add system message to the beginning of the messages array
            const messagesWithSystem = [
                {
                    role: "system",
                    content: systemPrompt
                },
                ...messages.slice(-10) // Keep last 10 messages for context
            ];
            
            console.log('Making API request with model:', selectedModel);
            
            // Create message element for streaming response
            const botMessageElement = createMessageElement("", "bot", getCurrentTime());
            chatMessages.appendChild(botMessageElement);
            const botTextElement = botMessageElement.querySelector('.message-text p');
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Make streaming API request to OpenRouter
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": "https://mindmuseai.app",
                    "X-Title": "MindMuseAI",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": selectedModel,
                    "messages": messagesWithSystem,
                    "temperature": responseStyle === 'detailed' ? 0.8 : 
                                 responseStyle === 'concise' ? 0.5 : 0.7,
                    "max_tokens": responseStyle === 'detailed' ? 500 : 
                               responseStyle === 'concise' ? 250 : 400,
                    "stream": true // Enable streaming
                })
            });
            
            // Remove typing indicator
            if (typingIndicator.parentNode) {
                chatMessages.removeChild(typingIndicator);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    console.error('Detailed API Error:', errorData);
                    throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
                } catch (parseError) {
                    throw new Error(`API request failed with status ${response.status}: ${errorText || 'Unknown error'}`);
                }
            }
            
            // Process the streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullContent = "";
            
            let readNextChunk = async () => {
                try {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        console.log("Stream complete");
                        
                        // Update message history after stream completes
                        messages.push({
                            role: 'assistant',
                            content: fullContent
                        });
                        
                        // Show feedback modal after a delay
                        setTimeout(() => {
                            showFeedbackModal();
                        }, 1000);
                        
                        return;
                    }
                    
                    // Decode the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    
                    // Process each line in the chunk
                    const lines = chunk.split("\n").filter(line => line.trim() !== "");
                    
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.substring(6);
                            if (data === "[DONE]") continue;
                            
                            try {
                                const jsonData = JSON.parse(data);
                                const contentDelta = jsonData.choices[0]?.delta?.content || "";
                                if (contentDelta) {
                                    fullContent += contentDelta;
                                    botTextElement.innerHTML = fullContent;
                                    chatMessages.scrollTop = chatMessages.scrollHeight;
                                }
                            } catch (e) {
                                console.warn("Could not parse JSON: ", e);
                            }
                        }
                    }
                    
                    // Continue reading
                    return readNextChunk();
                } catch (error) {
                    console.error("Error reading stream:", error);
                }
            };
            
            // Start reading the stream
            await readNextChunk();
            
        } catch (error) {
            console.error('Error calling OpenRouter API:', error);
            
            // Remove typing indicator if still present
            const typingMessage = chatMessages.querySelector('.typing-indicator');
            if (typingMessage) {
                chatMessages.removeChild(typingMessage);
            }
            
            // Determine error message to display
            let errorMessage = "I'm sorry, I couldn't process your request. Please try again later.";
            
            if (error.message.includes("API key")) {
                errorMessage = "I'm having trouble connecting to my AI service. Please make sure you've set up your API key in the settings page.";
            } else if (error.message.includes("model")) {
                errorMessage = "There seems to be an issue with the AI model selection. Please try selecting a different model in settings.";
            }
            
            // Show error message
            addMessageToUI(errorMessage, 'bot');
        }
    }
    
    // Make sendMessage available globally
    window.sendMessage = sendMessage;
    
    // Event listener for form submission
    if (messageForm) {
        messageForm.addEventListener('submit', sendMessage);
    }
    
    // Also handle Enter key in the input field
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
                return false;
            }
        });
    }
    
    // Handle feedback submission
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackBtns = document.querySelectorAll('.feedback-btn');
    const submitFeedbackBtn = document.getElementById('submit-feedback');
    const closeFeedbackBtn = document.getElementById('close-feedback');
    
    if (feedbackBtns) {
        feedbackBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                feedbackBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener('click', function() {
            const rating = document.querySelector('.feedback-btn.active')?.getAttribute('data-rating');
            const feedbackText = document.getElementById('feedback-text')?.value;
            
            if (rating) {
                // Here you would send the feedback to your backend
                console.log('Feedback submitted:', { rating, feedbackText });
                
                // Close the modal
                if (feedbackModal) {
                    feedbackModal.classList.remove('active');
                    setTimeout(() => {
                        feedbackModal.style.display = 'none';
                    }, 300); // Matches the transition time
                }
                
                // Reset the form
                feedbackBtns.forEach(btn => btn.classList.remove('active'));
                if (document.getElementById('feedback-text')) {
                    document.getElementById('feedback-text').value = '';
                }
            }
        });
    }
    
    if (closeFeedbackBtn) {
        closeFeedbackBtn.addEventListener('click', function() {
            if (feedbackModal) {
                feedbackModal.classList.remove('active');
                setTimeout(() => {
                    feedbackModal.style.display = 'none';
                }, 300); // Matches the transition time
            }
        });
    }
    
    // Close modal when clicking outside
    if (feedbackModal) {
        feedbackModal.addEventListener('click', function(e) {
            if (e.target === feedbackModal) {
                feedbackModal.classList.remove('active');
                setTimeout(() => {
                    feedbackModal.style.display = 'none';
                }, 300); // Matches the transition time
            }
        });
    }
    
    // Expose showFeedbackModal globally (for testing)
    window.showFeedbackModal = showFeedbackModal;

    // Add event listener for clearing chat
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', function() {
            // Clear chat history
            chatMessages.innerHTML = '';
            
            // Add initial bot message
            const initialMessage = "Hello! I'm MindMuseAI Bot, your mental health companion. How are you feeling today?";
            addMessageToUI(initialMessage, 'bot');
            
            // Reset message history
            messages = [
                {
                    role: 'assistant',
                    content: initialMessage
                }
            ];
            
            // Show notification
            const notification = document.createElement('div');
            notification.className = 'notification success';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-check-circle"></i>
                    <span>Chat history cleared</span>
                </div>
            `;
            document.body.appendChild(notification);
            
            // Show and then hide notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        });
    }
});

// Initialize file upload functionality
function initFileUpload() {
    const uploadBtn = document.getElementById('upload-file-btn');
    const fileInput = document.getElementById('file-input');
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', async function(e) {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const fileType = file.type;
                
                // Add the file to the chat as a user message
                await handleFileUpload(file);
                
                // Reset file input for next upload
                this.value = '';
            }
        });
    }
    
    // Add image preview functionality
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('message-image')) {
            showImagePreview(e.target.src);
        }
    });
}

// Function to handle file uploads
async function handleFileUpload(file) {
    const chatMessages = document.getElementById('chat-messages');
    const fileType = file.type;
    const fileName = file.name;
    
    if (!chatMessages) return;
    
    // Create user message with file
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user-message');
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    
    // If it's an image, add preview
    if (fileType.startsWith('image/')) {
        const imgElement = document.createElement('img');
        imgElement.classList.add('message-image');
        imgElement.alt = "Uploaded image";
        
        // Read the image file as a data URL
        const reader = new FileReader();
        reader.onload = function(e) {
            imgElement.src = e.target.result;
            textDiv.appendChild(document.createElement('p')).textContent = "Uploaded image for analysis:";
            textDiv.appendChild(imgElement);
        };
        reader.readAsDataURL(file);
    } else {
        // For non-image files
        const fileAttachment = document.createElement('div');
        fileAttachment.classList.add('file-attachment');
        
        const fileIcon = document.createElement('i');
        // Choose icon based on file type
        if (fileType.includes('pdf')) {
            fileIcon.className = 'fas fa-file-pdf';
        } else if (fileType.includes('word') || fileType.includes('doc')) {
            fileIcon.className = 'fas fa-file-word';
        } else if (fileType.includes('text')) {
            fileIcon.className = 'fas fa-file-alt';
        } else {
            fileIcon.className = 'fas fa-file';
        }
        
        const fileNameSpan = document.createElement('span');
        fileNameSpan.classList.add('file-name');
        fileNameSpan.textContent = fileName;
        
        fileAttachment.appendChild(fileIcon);
        fileAttachment.appendChild(fileNameSpan);
        
        textDiv.appendChild(document.createElement('p')).textContent = "Uploaded file for analysis:";
        textDiv.appendChild(fileAttachment);
    }
    
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('message-timestamp');
    timestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timestampDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Convert file to base64 for API transmission
    const base64Data = await fileToBase64(file);
    
    // Add typing indicator
    showTypingIndicator();
    
    // Process file with AI
    await processFileWithAI(file, base64Data, fileType);
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Extract the base64 data from the result
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

// Show typing indicator while AI processes the file
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatMessages) return;
    
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
    typingIndicator.innerHTML = `
        <div class="message-content">
            <div class="message-text">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
    `;
    
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Process the uploaded file with AI
async function processFileWithAI(file, base64Data, fileType) {
    try {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Get API key from settings
        const apiKey = localStorage.getItem('openrouter_api_key') || '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';
        
        // Get user settings
        const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
        const selectedModel = savedSettings.aiModel || "anthropic/claude-3.7-sonnet";
        
        // Create message object based on file type
        let message;
        if (fileType.startsWith('image/')) {
            message = {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Please analyze this image and describe what you see. If it contains text, charts, or data, please provide a thorough analysis."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${fileType};base64,${base64Data}`
                        }
                    }
                ]
            };
        } else {
            // For non-image files (not fully supported by most AI models yet)
            message = {
                role: "user",
                content: `I've uploaded a file named "${file.name}". Please acknowledge this and let me know what types of files you can analyze.`
            };
        }
        
        // System message for context
        const systemMessage = {
            role: "system",
            content: "You are a helpful assistant that can analyze images and documents. When analyzing images, be thorough and describe what you see in detail. For medical or health-related images, mention that you're not a medical professional and your analysis should not replace professional medical advice."
        };
        
        // Remove existing typing indicator
        const typingIndicator = chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            chatMessages.removeChild(typingIndicator);
        }
        
        // Create bot message element for streaming response
        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('message', 'bot-message');
        
        const botContentDiv = document.createElement('div');
        botContentDiv.classList.add('message-content');
        
        const botTextDiv = document.createElement('div');
        botTextDiv.classList.add('message-text');
        botTextDiv.innerHTML = '<p></p>';
        
        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('message-timestamp');
        timestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        botContentDiv.appendChild(botTextDiv);
        botContentDiv.appendChild(timestampDiv);
        
        const botAvatarDiv = document.createElement('div');
        botAvatarDiv.classList.add('avatar');
        botAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        
        botMessageElement.appendChild(botContentDiv);
        botMessageElement.appendChild(botAvatarDiv);
        
        chatMessages.appendChild(botMessageElement);
        const botTextParagraph = botTextDiv.querySelector('p');
        
        // Make API request
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://mindmuseai.app",
                "X-Title": "MindMuseAI"
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [systemMessage, message],
                max_tokens: 1000,
                stream: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === "[DONE]") continue;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        const contentDelta = jsonData.choices[0]?.delta?.content || "";
                        
                        if (contentDelta) {
                            fullContent += contentDelta;
                            botTextParagraph.innerHTML = fullContent;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.warn("Could not parse JSON:", e);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error("Error processing file:", error);
        // Display error message
        showErrorMessage("I'm sorry, I couldn't process this file. The error might be due to file size limitations or API restrictions.");
    }
}

// Function to show error messages
function showErrorMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Remove existing typing indicator
    const typingIndicator = chatMessages.querySelector('.typing-indicator');
    if (typingIndicator) {
        chatMessages.removeChild(typingIndicator);
    }
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('message', 'bot-message');
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    textDiv.innerHTML = `<p>${message}</p>`;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('message-timestamp');
    timestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timestampDiv);
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
    
    errorDiv.appendChild(contentDiv);
    errorDiv.appendChild(avatarDiv);
    
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Image preview functionality
function showImagePreview(imageUrl) {
    // Check if preview container exists, create if not
    let previewContainer = document.querySelector('.image-preview-container');
    
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.classList.add('image-preview-container');
        
        const previewImage = document.createElement('img');
        previewImage.classList.add('image-preview');
        
        const closeButton = document.createElement('button');
        closeButton.classList.add('close-preview');
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.addEventListener('click', function() {
            previewContainer.classList.remove('active');
            setTimeout(() => {
                previewContainer.style.display = 'none';
            }, 300);
        });
        
        previewContainer.appendChild(previewImage);
        previewContainer.appendChild(closeButton);
        document.body.appendChild(previewContainer);
    }
    
    // Set the image source and show the preview
    const previewImage = previewContainer.querySelector('.image-preview');
    previewImage.src = imageUrl;
    
    previewContainer.style.display = 'flex';
    setTimeout(() => {
        previewContainer.classList.add('active');
    }, 10);
    
    // Close on clicking outside the image
    previewContainer.addEventListener('click', function(e) {
        if (e.target === previewContainer) {
            previewContainer.classList.remove('active');
            setTimeout(() => {
                previewContainer.style.display = 'none';
            }, 300);
        }
    });
}

// Initialize voice input functionality
function initVoiceInput() {
    const voiceButton = document.getElementById('voice-input-btn');
    const userInput = document.getElementById('user-input');
    
    if (!voiceButton || !userInput) return;
    
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn("This browser doesn't support speech recognition");
        voiceButton.style.display = 'none';
        return;
    }
    
    // Create speech recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let isRecording = false;
    let recordingIndicator = null;
    
    voiceButton.addEventListener('click', function() {
        if (!isRecording) {
            // Start recording
            recognition.start();
            voiceButton.classList.add('active');
            voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
            isRecording = true;
            
            // Add recording indicator
            recordingIndicator = document.createElement('div');
            recordingIndicator.classList.add('voice-recording');
            recordingIndicator.innerHTML = `
                <div class="voice-recording-text">Recording...</div>
                <div class="voice-waves">
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                </div>
            `;
            userInput.parentNode.appendChild(recordingIndicator);
            
        } else {
            // Stop recording
            recognition.stop();
            voiceButton.classList.remove('active');
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            isRecording = false;
            
            // Remove recording indicator
            if (recordingIndicator) {
                recordingIndicator.remove();
                recordingIndicator = null;
            }
        }
    });
    
    // Handle speech recognition results
    recognition.onresult = function(event) {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        
        userInput.value = transcript;
    };
    
    // Handle end of speech recognition
    recognition.onend = function() {
        voiceButton.classList.remove('active');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        isRecording = false;
        
        // Remove recording indicator
        if (recordingIndicator) {
            recordingIndicator.remove();
            recordingIndicator = null;
        }
    };
    
    // Handle errors
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        
        voiceButton.classList.remove('active');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        isRecording = false;
        
        // Remove recording indicator
        if (recordingIndicator) {
            recordingIndicator.remove();
            recordingIndicator = null;
        }
        
        // Show error notification
        if (event.error === 'not-allowed') {
            showNotification('Microphone access denied. Please check your browser permissions.', 'error');
        } else {
            showNotification('Speech recognition error. Please try again.', 'error');
        }
    };
}

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize text-to-speech functionality
function initTextToSpeech() {
    if (!('speechSynthesis' in window)) {
        console.warn("This browser doesn't support speech synthesis");
        const voiceToggle = document.getElementById('toggle-voice-mode');
        if (voiceToggle) voiceToggle.style.display = 'none';
        return;
    }
    
    const voiceToggle = document.getElementById('toggle-voice-mode');
    let voiceMode = localStorage.getItem('voice_mode') === 'true';
    let currentlySpeaking = false;
    let speechQueue = [];
    let activeSpeech = null;
    
    // Create voice mode indicator
    const indicator = document.createElement('div');
    indicator.classList.add('voice-mode-indicator');
    indicator.innerHTML = `
        <i class="fas fa-volume-up"></i>
        <span>Voice mode active</span>
    `;
    document.body.appendChild(indicator);
    
    // Set initial state
    if (voiceMode) {
        voiceToggle.classList.add('active');
        setTimeout(() => {
            indicator.classList.add('active');
            setTimeout(() => {
                indicator.classList.remove('active');
            }, 2000);
        }, 500);
    }
    
    // Toggle voice mode
    voiceToggle.addEventListener('click', function() {
        voiceMode = !voiceMode;
        localStorage.setItem('voice_mode', voiceMode);
        
        if (voiceMode) {
            voiceToggle.classList.add('active');
            indicator.classList.add('active');
            
            // If there's a most recent bot message, read it
            const lastBotMessage = document.querySelector('.bot-message:last-child .message-text p');
            if (lastBotMessage && lastBotMessage.textContent.trim() !== '') {
                speakText(lastBotMessage.textContent);
            }
            
            setTimeout(() => {
                indicator.classList.remove('active');
            }, 2000);
        } else {
            voiceToggle.classList.remove('active');
            stopSpeaking();
        }
    });
    
    // Listen for new bot messages
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        // Use MutationObserver to detect new messages
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        // Check if the added node is a bot message
                        if (node.nodeType === 1 && node.classList.contains('bot-message') && !node.classList.contains('typing-indicator')) {
                            // Find the text content
                            const messageText = node.querySelector('.message-text p');
                            if (messageText && voiceMode) {
                                // Wait for the full message to be rendered (in case of streaming)
                                let lastTextContent = messageText.textContent;
                                
                                // Check periodically if message is still updating
                                const checkInterval = setInterval(() => {
                                    if (messageText.textContent !== lastTextContent) {
                                        lastTextContent = messageText.textContent;
                                    } else {
                                        clearInterval(checkInterval);
                                        // Wait a short delay to ensure any final updates are complete
                                        setTimeout(() => {
                                            speakText(messageText.textContent);
                                        }, 500);
                                    }
                                }, 1000);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(chatMessages, { childList: true });
    }
    
    // Text-to-speech function with queue
    function speakText(text) {
        if (!text) return;
        
        // Add to queue
        speechQueue.push(text);
        
        // If not currently speaking, start
        if (!currentlySpeaking) {
            processQueue();
        }
    }
    
    // Process speech queue
    function processQueue() {
        if (speechQueue.length === 0 || !voiceMode) {
            currentlySpeaking = false;
            return;
        }
        
        currentlySpeaking = true;
        const textToSpeak = speechQueue.shift();
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Get available voices and select a good one
        let voices = speechSynthesis.getVoices();
        
        // Wait for voices to load if not available immediately
        if (voices.length === 0) {
            speechSynthesis.addEventListener('voiceschanged', () => {
                voices = speechSynthesis.getVoices();
                selectVoice();
            }, { once: true });
        } else {
            selectVoice();
        }
        
        function selectVoice() {
            // Try to find a good female voice
            const preferredVoices = [
                'Google UK English Female',
                'Microsoft Zira Desktop',
                'Samantha',
                'Female'
            ];
            
            // Find the first matching voice from our preferences
            for (const name of preferredVoices) {
                const voice = voices.find(v => v.name.includes(name));
                if (voice) {
                    utterance.voice = voice;
                    break;
                }
            }
            
            // If no preferred voice is found, try to find any female voice
            if (!utterance.voice) {
                const femaleVoice = voices.find(v => v.name.includes('female') || v.name.includes('Female'));
                if (femaleVoice) {
                    utterance.voice = femaleVoice;
                }
            }
            
            // Fall back to first voice if still no match
            if (!utterance.voice && voices.length > 0) {
                utterance.voice = voices[0];
            }
            
            // Set properties
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            // Show speaking indicator on voice button
            voiceToggle.classList.add('speaking');
            
            // Events
            utterance.onend = () => {
                voiceToggle.classList.remove('speaking');
                processQueue(); // Process next item in queue
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                voiceToggle.classList.remove('speaking');
                processQueue(); // Try next item despite error
            };
            
            // Start speaking
            activeSpeech = utterance;
            speechSynthesis.speak(utterance);
        }
    }
    
    // Stop currently active speech
    function stopSpeaking() {
        speechSynthesis.cancel();
        speechQueue = [];
        currentlySpeaking = false;
        voiceToggle.classList.remove('speaking');
    }
    
    // Listen for clicks on bot messages to speak them
    document.addEventListener('click', function(e) {
        // Check if clicked element is a bot message text
        const messageText = e.target.closest('.bot-message .message-text p');
        if (messageText && voiceMode) {
            stopSpeaking(); // Stop current speech if any
            speakText(messageText.textContent);
        }
    });
    
    // Add keyboard shortcut for voice toggle (Alt+V)
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'v') {
            voiceToggle.click();
        }
    });
    
    // Add global functions for controlling speech
    window.tts = {
        speak: speakText,
        stop: stopSpeaking,
        toggle: () => voiceToggle.click()
    };
}

// Chat functionality using Firebase for persistence
import { ChatManager } from './firebase-chat.js';
import { auth } from './firebase-config.js';

// Initialize message history
let messages = [
    {
        role: 'assistant',
        content: "Hello! I'm MindMuseAI Bot, your mental health companion. How are you feeling today?"
    }
];

let currentChatId = null;

// Get current time in HH:MM format
function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Create message element
function createMessageElement(message, sender, timestamp) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    textDiv.innerHTML = `<p>${message}</p>`;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('message-timestamp');
    timestampDiv.textContent = timestamp;
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timestampDiv);
    
    if (sender === 'bot') {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    } else {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    }
    
    return messageDiv;
}

// Add message to UI
function addMessageToUI(message, sender) {
    const time = getCurrentTime();
    const messageElement = createMessageElement(message, sender, time);
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Initialize chat history
async function initChatHistory() {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;

    try {
        const chats = await ChatManager.getAllChats();
        chatList.innerHTML = '';

        chats.forEach(chat => {
            addChatToHistory(chat.title || 'New Chat', chat.lastUpdated, chat.id);
        });
    } catch (error) {
        console.error('Error initializing chat history:', error);
    }
}

// Add chat to history UI
function addChatToHistory(title, timestamp, chatId) {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;

    const chatItem = document.createElement('div');
    chatItem.classList.add('chat-item');
    chatItem.setAttribute('data-id', chatId);
    
    chatItem.innerHTML = `
        <div class="chat-info">
            <div class="chat-title">${title}</div>
            <div class="chat-timestamp">${new Date(timestamp).toLocaleString()}</div>
        </div>
        <div class="chat-actions">
            <button class="edit-chat-btn" aria-label="Edit chat">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-chat-btn" aria-label="Delete chat">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Add click event to load chat
    chatItem.addEventListener('click', () => loadChat(chatId));
    
    // Add delete button functionality
    const deleteBtn = chatItem.querySelector('.delete-chat-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteChat(chatId);
    });
    
    // Add edit button functionality
    const editBtn = chatItem.querySelector('.edit-chat-btn');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renameChat(chatId);
    });
    
    // Add to the top of the list
    chatList.insertBefore(chatItem, chatList.firstChild);
    
    // Set as active if it's the current chat
    if (chatId === currentChatId) {
        setActiveChatInUI(chatId);
    }
}

// Set active chat in UI
function setActiveChatInUI(chatId) {
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeChat = document.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (activeChat) {
        activeChat.classList.add('active');
    }
}

// Load a specific chat
async function loadChat(chatId) {
    const chat = await ChatManager.getChat(chatId);
    if (!chat) return;
    
    // Update current chat ID
    currentChatId = chatId;
    
    // Update message history
    messages = chat.messages || [];
    
    // Display messages
    const displayMessages = messages.map(msg => ({
        sender: msg.role === 'assistant' ? 'bot' : 'user',
        text: msg.content,
        timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    
    renderMessages(displayMessages);
    
    // Update active chat in UI
    setActiveChatInUI(chatId);
}

// Delete a chat
async function deleteChat(chatId) {
    try {
        await ChatManager.deleteChat(chatId);
        
        // Remove from UI
        const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
        if (chatItem) {
            chatItem.remove();
        }
        
        // If current chat was deleted, create a new one
        if (currentChatId === chatId) {
            createNewChat();
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

// Create a new chat
async function createNewChat() {
    // Create a new chat ID
    currentChatId = 'chat_' + Date.now();
    
    // Reset message history with initial message
    messages = [{
        role: 'assistant',
        content: "Hello! I'm MindMuseAI Bot, your mental health companion. How are you feeling today?"
    }];
    
    // Save initial chat
    await ChatManager.saveChat(currentChatId, {
        title: 'New Chat',
        messages,
        created: new Date().toISOString()
    });
    
    // Display initial message
    renderMessages([{
        sender: 'bot',
        text: messages[0].content,
        timestamp: getCurrentTime()
    }]);
    
    // Add to chat history in UI
    addChatToHistory('New Chat', new Date().toISOString(), currentChatId);
    
    // Close sidebar on mobile
    const chatHistorySidebar = document.getElementById('chat-history-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (window.innerWidth < 992 && chatHistorySidebar && chatHistorySidebar.classList.contains('active')) {
        chatHistorySidebar.classList.remove('active');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
    }
}

// Render messages in the chat
function renderMessages(messages) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message.text, message.sender, message.timestamp);
        chatMessages.appendChild(messageElement);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send a message
async function sendMessage(e) {
    if (e) e.preventDefault();
    
    const userInput = document.getElementById('user-input');
    if (!userInput) return;
    
    const userMessage = userInput.value.trim();
    if (!userMessage) return;
    
    // Create new chat if none exists
    if (!currentChatId) {
        await createNewChat();
    }
    
    // Add user message to UI
    addMessageToUI(userMessage, 'user');
    userInput.value = '';
    
    // Add to messages array
    const messageObj = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
    };
    messages.push(messageObj);
    
    // Save to Firebase
    await ChatManager.addMessageToChat(currentChatId, messageObj);
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Get bot response from API
        const botResponse = await generateBotResponse(userMessage);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add bot response to UI
        addMessageToUI(botResponse, 'bot');
        
        // Add bot response to messages array
        const botMessageObj = {
            role: 'assistant',
            content: botResponse,
            timestamp: new Date().toISOString()
        };
        messages.push(botMessageObj);
        
        // Save to Firebase
        await ChatManager.addMessageToChat(currentChatId, botMessageObj);
        
        // Update chat title
        const chatTitle = extractChatTitle(messages);
        await ChatManager.saveChat(currentChatId, {
            title: chatTitle,
            messages
        });
        
        // Update chat title in UI
        const chatItem = document.querySelector(`.chat-item[data-id="${currentChatId}"]`);
        if (chatItem) {
            chatItem.querySelector('.chat-title').textContent = chatTitle;
            chatItem.querySelector('.chat-timestamp').textContent = 'Now';
        }
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        addMessageToUI('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

// Show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
    typingDiv.innerHTML = `
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Extract chat title from first user message
function extractChatTitle(messages) {
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
        const title = firstUserMessage.content.substring(0, 30);
        return title.length === 30 ? title + '...' : title;
    }
    return 'New Chat';
}

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('message-form');
    const clearChatBtn = document.getElementById('clear-chat');
    const newChatBtn = document.getElementById('new-chat');
    
    // Initialize chat history
    initChatHistory();
    
    // Add event listeners
    if (messageForm) {
        messageForm.addEventListener('submit', sendMessage);
    }
    
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', createNewChat);
    }
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', createNewChat);
    }
    
    // Create initial chat if none exists
    if (!currentChatId) {
        createNewChat();
    }
}); 