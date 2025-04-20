// Initialize Firebase auth and app state
import { 
    auth, 
    db, 
    storage,
    getCurrentUser 
} from './firebase-config.js';

import {
    saveMoodEntry,
    getMoodHistoryForPeriod,
    getMoodStatistics
} from './mood-tracker.js';

// Configuration for the API
const apiConfig = {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: localStorage.getItem('api_key') || '',
    headers: {
        'Content-Type': 'application/json'
    },
    model: 'gpt-3.5-turbo',
    systemPrompt: `You are MindfulAI, a mental health companion chatbot designed to provide emotional support,
    practical advice, and guidance to users. Your responses should be:
    - Empathetic and compassionate
    - Non-judgmental and validating
    - Calm and reassuring
    - Clear and structured
    - Focused on evidence-based techniques
    - Realistic about your limitations (you are not a replacement for professional help)

    Important guidelines:
    1. Always prioritize user safety. If someone expresses thoughts of self-harm or suicide, 
       gently encourage them to contact crisis resources like the 988 Suicide & Crisis Lifeline.
    2. Never diagnose conditions or prescribe medications.
    3. Recommend professional help when appropriate, especially for serious concerns.
    4. Validate users' feelings while offering constructive perspectives.
    5. Suggest practical coping strategies from evidence-based approaches (like CBT, mindfulness, etc.)
    6. Keep responses concise and focused on the most relevant advice.
    7. Balance empathy with actionable guidance.
    8. Maintain appropriate boundaries and remind users you are an AI tool, not a therapist.

    In crisis situations, prioritize immediate safety over other conversational goals.`
};

// Instead of importing config, we'll create an inline config object
// that reads from localStorage
const config = {
    api: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: localStorage.getItem('openrouter_api_key') || "YOUR_OPENROUTER_API_KEY", // Get API key from localStorage
        defaultHeaders: {
            "HTTP-Referer": "https://mindfulchat.ai", // Replace with your actual site URL
            "X-Title": "MindfulChat", // Your app name for OpenRouter rankings
        }
    },
    models: {
        default: "deepseek/deepseek-r1:free", // Free tier model
        alternatives: [
            "anthropic/claude-3-opus:beta",
            "anthropic/claude-3-sonnet:beta",
            "meta-llama/llama-3-70b-instruct",
            "google/gemini-pro"
        ]
    },
    // System prompt defining the AI assistant's persona
    systemPrompt: "You are a compassionate, calming mental health companion who helps users with anxiety and stress using CBT and mindfulness. Provide supportive responses that incorporate cognitive-behavioral techniques and mindfulness practices. Focus on helping users identify negative thought patterns, practice grounding exercises, and develop healthy coping mechanisms. Your tone should be gentle, reassuring, and empathetic at all times."
};

// Global variables to ensure availability across event listeners
let messageHistory = [];
let currentChatId = null;
let moodChart;
let meditationPlayer = {
    init: function() {
        console.log("Meditation player disabled - feature removed as per user request");
        // Meditation feature has been removed
        return;
    }
};

// Import mood tracker functions
import { 
    loadMoodHistory, 
} from './mood-tracker.js';

// Master initialization function to handle all required setup
function initializeApp() {
    console.log("Initializing app...");
    
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    const themeToggle = document.getElementById('theme-toggle');
    const feedbackModal = document.getElementById('feedback-modal');
    const closeModal = document.getElementById('close-feedback');
    const submitFeedback = document.getElementById('submit-feedback');
    const feedbackBtns = document.querySelectorAll('.feedback-btn');
    const moodBtns = document.querySelectorAll('.mood-btn');
    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    const loadingScreen = document.getElementById('loading-screen');
    const themeToggleIcon = themeToggle ? themeToggle.querySelector('i') : null;
    
    // Chat History Sidebar Elements
    const chatHistorySidebar = document.getElementById('chat-history-sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatList = document.getElementById('chat-list');

    // Check if API key is available, redirect to setup page if not
    if (!localStorage.getItem('openrouter_api_key') && 
        !window.location.pathname.includes('api-setup.html')) {
        window.location.href = 'api-setup.html';
        return; // Stop execution to prevent errors while redirecting
    }

    // Sample initial chat messages (in a real app, these would come from a backend)
    const initialMessages = [
        {
            sender: 'bot',
            text: "Hello! I'm MindfulBot, your mental health companion. How are you feeling today?",
            timestamp: getCurrentTime()
        }
    ];

    // Add initial message to history
    messageHistory.push({
        role: "assistant", 
        content: "Hello! I'm MindfulBot, your mental health companion. How are you feeling today?"
    });

    // Sample resources (in a real app, these would come from a backend)
    const resources = {
        anxiety: [
            { title: "Understanding Anxiety Disorders", url: "#" },
            { title: "5 Breathing Techniques for Anxiety", url: "#" },
            { title: "When to Seek Professional Help", url: "#" }
        ],
        depression: [
            { title: "Signs of Depression", url: "#" },
            { title: "Self-Care Strategies for Depression", url: "#" },
            { title: "Finding a Therapist", url: "#" }
        ],
        stress: [
            { title: "Healthy Coping Mechanisms", url: "#" },
            { title: "Meditation Guides for Beginners", url: "#" },
            { title: "Stress and Physical Health", url: "#" }
        ],
        emergency: [
            { title: "988 Suicide & Crisis Lifeline", url: "tel:988", isHelpline: true },
            { title: "1-800-273-8255 (TALK)", url: "tel:1-800-273-8255", isHelpline: true },
            { title: "Text HOME to 741741", url: "sms:741741", isHelpline: true }
        ]
    };

    // Mood tracking data (in a real app, these would be stored in a database)
    let moodHistory = [
        { date: '2023-06-01', mood: 'happy' },
        { date: '2023-06-02', mood: 'anxious' },
        { date: '2023-06-03', mood: 'sad' },
        { date: '2023-06-04', mood: 'calm' },
        { date: '2023-06-05', mood: 'happy' },
        { date: '2023-06-06', mood: 'stressed' },
        { date: '2023-06-07', mood: 'energetic' }
    ];

    // Initialize mood chart with minimal animations
    initMoodChart();

    // Initialize theme from localStorage or default to dark mode
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // Create or load chat
    if (!currentChatId) {
        createNewChat();
    }

    // Event listeners
    messageForm.addEventListener('submit', sendMessage);
    themeToggle.addEventListener('click', toggleTheme);
    closeModal.addEventListener('click', () => {
        feedbackModal.classList.remove('active');
    });
    submitFeedback.addEventListener('click', handleFeedbackSubmit);

    feedbackBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            feedbackBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
        });
    });

    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Handle mood selection
            const selectedMood = btn.getAttribute('data-mood');
            addMoodEntry(selectedMood);

            // Visual feedback
            moodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Trigger themed response based on mood - minimized theme changes
            applyMinimalMoodTheme(selectedMood);

            // Trigger bot response based on mood
            const moodResponses = {
                happy: "It's great to hear you're feeling happy! What's bringing you joy today?",
                sad: "I'm sorry to hear you're feeling sad. Would you like to talk about what's on your mind?",
                anxious: "I understand anxiety can be difficult. Remember to take deep breaths. Would it help to discuss what's making you anxious?",
                stressed: "I hear that you're feeling stressed. Would you like to explore some stress management techniques?",
                calm: "It's wonderful that you're feeling calm. What activities help you maintain this sense of peace?",
                energetic: "That's great! Having energy is wonderful. What are you looking forward to doing today?"
            };

            setTimeout(() => {
                const response = moodResponses[selectedMood] || "Thank you for sharing how you're feeling. How can I help you today?";
                addBotMessage(response);
                
                // Add to conversation history
                messageHistory.push({
                    role: "assistant",
                    content: response
                });
            }, 300); // Reduced delay for minimalism
        });
    });
    
    // Make sendMessage function globally available
    window.sendMessage = sendMessage;

    // Sidebar functions
    function initSidebar() {
        if (!toggleSidebarBtn || !chatHistorySidebar || !closeSidebarBtn || !sidebarOverlay || !newChatBtn || !chatList) {
            console.warn('Chat history sidebar elements not found');
            return;
        }
        
        // Toggle sidebar
        toggleSidebarBtn.addEventListener('click', function() {
            chatHistorySidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            
            // On desktop, shift main content
            if (window.innerWidth >= 992) {
                mainContent.classList.add('sidebar-active');
            }
        });
        
        // Close sidebar
        function closeSidebar() {
            chatHistorySidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            mainContent.classList.remove('sidebar-active');
        }
        
        closeSidebarBtn.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
        
        // New chat button
        newChatBtn.addEventListener('click', createNewChat);
        
        // Load chat history
        loadChatHistory();
    }
    
    // Create a new chat
    function createNewChat() {
        // Create a new chat ID
        currentChatId = 'chat_' + Date.now();
        
        // Clear message history
        messageHistory = [];
        
        // Add initial bot message
        const initialMessage = {
            role: "assistant",
            content: "Hello! I'm MindfulBot, your mental health companion. How are you feeling today?"
        };
        
        messageHistory.push(initialMessage);
        
        // Display initial message
        const displayMessage = {
            sender: 'bot',
            text: initialMessage.content,
            timestamp: getCurrentTime()
        };
        
        renderMessages([displayMessage]);
        
        // Add to chat history in UI
        addChatToHistory("New Chat", getCurrentTime(), currentChatId);
        
        // Save chat
        saveChat(currentChatId, "New Chat", messageHistory);
        
        // Close sidebar on mobile
        if (window.innerWidth < 992 && chatHistorySidebar.classList.contains('active')) {
            chatHistorySidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    }
    
    // Load chat history from localStorage
    function loadChatHistory() {
        if (!chatList) return;
        
        chatList.innerHTML = '';
        
        // Get saved chats from localStorage
        const savedChats = getAllChats();
        
        if (Object.keys(savedChats).length === 0) {
            // If no chats, create a new one
            createNewChat();
            return;
        }
        
        // Sort chats by timestamp (newest first)
        const sortedChats = Object.entries(savedChats)
            .sort(([, a], [, b]) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        // Add each chat to the UI
        sortedChats.forEach(([chatId, chat]) => {
            addChatToHistory(
                chat.title,
                formatTimestamp(chat.updatedAt),
                chatId
            );
        });
        
        // Load the most recent chat
        const [recentChatId, recentChat] = sortedChats[0];
        loadChat(recentChatId);
    }
    
    // Add chat to history UI
    function addChatToHistory(title, timestamp, chatId) {
        if (!chatList) return;
        
        const existingChat = document.querySelector(`.chat-item[data-id="${chatId}"]`);
        if (existingChat) {
            // Update existing chat
            existingChat.querySelector('.chat-title').textContent = title;
            existingChat.querySelector('.chat-timestamp').textContent = timestamp;
            return;
        }
        
        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-item');
        chatItem.setAttribute('data-id', chatId);
        
        chatItem.innerHTML = `
            <div class="chat-icon">
                <i class="fas fa-comment"></i>
            </div>
            <div class="chat-info">
                <div class="chat-title">${title}</div>
                <div class="chat-timestamp">${timestamp}</div>
            </div>
            <div class="chat-actions">
                <button class="chat-action-btn edit-chat-btn" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="chat-action-btn delete-chat-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Click event to load chat
        chatItem.addEventListener('click', function(e) {
            if (!e.target.closest('.chat-actions')) {
                loadChat(chatId);
                
                // Close sidebar on mobile
                if (window.innerWidth < 992) {
                    chatHistorySidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            }
        });
        
        // Add delete button functionality
        const deleteBtn = chatItem.querySelector('.delete-chat-btn');
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteChat(chatId);
        });
        
        // Add edit button functionality
        const editBtn = chatItem.querySelector('.edit-chat-btn');
        editBtn.addEventListener('click', function(e) {
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
    function loadChat(chatId) {
        const chat = getChat(chatId);
        if (!chat) return;
        
        // Update current chat ID
        currentChatId = chatId;
        
        // Update message history
        messageHistory = chat.messages;
        
        // Display messages
        const displayMessages = messageHistory.map(msg => {
            return {
                sender: msg.role === 'assistant' ? 'bot' : 'user',
                text: msg.content,
                timestamp: getCurrentTime() // We don't store timestamps per message yet
            };
        });
        
        renderMessages(displayMessages);
        
        // Update active chat in UI
        setActiveChatInUI(chatId);
    }
    
    // Rename a chat
    function renameChat(chatId) {
        const chat = getChat(chatId);
        if (!chat) return;
        
        const newTitle = prompt('Enter a new name for this chat:', chat.title);
        if (!newTitle || newTitle.trim() === '') return;
        
        // Update chat title
        chat.title = newTitle;
        chat.updatedAt = new Date().toISOString();
        
        // Save changes
        saveChat(chatId, newTitle, chat.messages);
        
        // Update UI
        const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
        if (chatItem) {
            chatItem.querySelector('.chat-title').textContent = newTitle;
            chatItem.querySelector('.chat-timestamp').textContent = formatTimestamp(chat.updatedAt);
        }
    }
    
    // Delete a chat
    function deleteChat(chatId) {
        if (!confirm('Are you sure you want to delete this chat?')) return;
        
        // Remove from localStorage
        localStorage.removeItem(`chat_${chatId}`);
        
        // Remove from UI
        const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
        if (chatItem) {
            chatItem.remove();
        }
        
        // If current chat was deleted, create a new one
        if (chatId === currentChatId) {
            createNewChat();
        }
    }
    
    // Save chat to localStorage
    function saveChat(chatId, title, messages) {
        const chat = {
            title: title,
            messages: messages,
            createdAt: getChat(chatId)?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`chat_${chatId}`, JSON.stringify(chat));
    }
    
    // Get a chat from localStorage
    function getChat(chatId) {
        const chatJson = localStorage.getItem(`chat_${chatId}`);
        return chatJson ? JSON.parse(chatJson) : null;
    }
    
    // Get all chats from localStorage
    function getAllChats() {
        const chats = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('chat_')) {
                const chatId = key;
                const chat = JSON.parse(localStorage.getItem(key));
                chats[chatId] = chat;
            }
        }
        
        return chats;
    }
    
    // Format timestamp for display
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Today
        if (date.toDateString() === now.toDateString()) {
            return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Yesterday
        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Last 7 days
        if (now - date < 7 * 24 * 60 * 60 * 1000) {
            const options = { weekday: 'short' };
            return `${date.toLocaleDateString([], options)}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        // Older
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
               ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Functions
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function renderMessages(messages) {
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        
        // Render messages directly without animations
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            chatMessages.appendChild(messageElement);
        });
        
        scrollToBottom();
    }

    function createMessageElement(message) {
        const { sender, text, timestamp } = message;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        const textDiv = document.createElement('div');
        textDiv.classList.add('message-text');
        textDiv.innerHTML = `<p>${text}</p>`;

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

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function sendMessage(e) {
        if (e) e.preventDefault();

        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        // Add user message to chat
        addUserMessage(userMessage);
        userInput.value = '';

        // Add to conversation history
        messageHistory.push({
            role: "user",
            content: userMessage
        });

        // Show typing indicator
        showTypingIndicator();

        try {
            // Get bot response from API
            const botResponse = await generateBotResponse(userMessage);
            
            // Remove typing indicator
            removeTypingIndicator();

            // Add bot response to chat
            addBotMessage(botResponse);

            // Add bot response to conversation history
            messageHistory.push({
                role: "assistant",
                content: botResponse
            });
            
            // Save chat with updated messages
            const chatTitle = extractChatTitle(messageHistory);
            saveChat(currentChatId, chatTitle, messageHistory);
            
            // Update chat title in UI
            const chatItem = document.querySelector(`.chat-item[data-id="${currentChatId}"]`);
            if (chatItem) {
                chatItem.querySelector('.chat-title').textContent = chatTitle;
                chatItem.querySelector('.chat-timestamp').textContent = 'Now';
            }

            // Show feedback modal for bot response - DISABLED as per user request
            /*
            setTimeout(() => {
                feedbackModal.classList.add('active');
            }, 1000);
            */
        } catch (error) {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Show error message
            console.error('Error generating response:', error);
            addBotMessage("I'm sorry, I'm having trouble connecting right now. Please try again later.");
            
            // Don't show feedback for error responses
        }
    }

    function addUserMessage(text) {
        const message = {
            sender: 'user',
            text,
            timestamp: getCurrentTime()
        };

        const messageElement = createMessageElement(message);
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    function addBotMessage(text) {
        const message = {
            sender: 'bot',
            text,
            timestamp: getCurrentTime()
        };

        const messageElement = createMessageElement(message);
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message', 'typing-message');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        const indicatorDiv = document.createElement('div');
        indicatorDiv.classList.add('typing-indicator');
        indicatorDiv.innerHTML = '<span></span><span></span><span></span>';

        contentDiv.appendChild(indicatorDiv);

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';

        typingDiv.appendChild(contentDiv);
        typingDiv.appendChild(avatarDiv);

        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const typingMessage = chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            chatMessages.removeChild(typingMessage);
        }
    }

    // New OpenRouter API integration for bot responses
    async function generateBotResponse(userMessage) {
        try {
            // Get user settings for AI model and response style
            const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
            const selectedModel = savedSettings.aiModel || config.models.default;
            const responseStyle = savedSettings.responseStyle || 'balanced';
            
            // Adjust system prompt based on response style
            let systemPrompt = config.systemPrompt;
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
            const response = await fetch(config.api.baseURL + "/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${config.api.apiKey}`,
                    "HTTP-Referer": config.api.defaultHeaders["HTTP-Referer"],
                    "X-Title": config.api.defaultHeaders["X-Title"]
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

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("Error generating bot response:", error);
            
            // Fallback to simple responses if API fails
            const fallbackResponses = {
                hello: "Hello! How can I help you today?",
                sad: "I'm sorry to hear you're feeling down. Would you like to talk more about what's troubling you?",
                anxious: "Anxiety can be challenging. Would you like to try a breathing exercise?",
                stressed: "It sounds like you're feeling stressed. Taking a short break might help.",
                default: "I'm here to support you. Tell me more about how you're feeling."
            };
            
            // Determine which fallback to use based on keywords
            const lowerCaseMessage = userMessage.toLowerCase();
            if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
                return fallbackResponses.hello;
        } else if (lowerCaseMessage.includes('sad') || lowerCaseMessage.includes('depressed')) {
                return fallbackResponses.sad;
            } else if (lowerCaseMessage.includes('anxious') || lowerCaseMessage.includes('anxiety')) {
                return fallbackResponses.anxious;
            } else if (lowerCaseMessage.includes('stressed') || lowerCaseMessage.includes('stress')) {
                return fallbackResponses.stressed;
        } else {
                return fallbackResponses.default;
            }
        }
    }

    function toggleTheme() {
        // Check if current theme is dark
        const isDarkTheme = document.documentElement.classList.contains('dark-theme') || 
                            (!document.documentElement.classList.contains('light-theme'));
        
        // Toggle theme
        const newTheme = isDarkTheme ? 'light' : 'dark';
        applyTheme(newTheme);
        
        // Save preference
        localStorage.setItem('theme', newTheme);
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.classList.remove('dark-theme');
            document.documentElement.classList.add('light-theme');
            document.documentElement.style.setProperty('--bg-color', '#f5f7fa');
            document.documentElement.style.setProperty('--bg-color-secondary', '#e9ecef');
            document.documentElement.style.setProperty('--text-color', '#343a40');
            document.documentElement.style.setProperty('--text-muted', '#6c757d');
            document.documentElement.style.setProperty('--border-color', '#ced4da');
            document.documentElement.style.setProperty('--input-bg', '#ffffff');
            document.documentElement.style.setProperty('--card-bg', '#ffffff');
            
            // Update icon
            themeToggleIcon.classList.remove('fa-sun');
            themeToggleIcon.classList.add('fa-moon');
        } else {
            document.documentElement.classList.remove('light-theme');
            document.documentElement.classList.add('dark-theme');
            document.documentElement.style.setProperty('--bg-color', '#0f0c1d');
            document.documentElement.style.setProperty('--bg-color-secondary', '#171429');
            document.documentElement.style.setProperty('--text-color', '#ffffff');
            document.documentElement.style.setProperty('--text-muted', '#a3a3b9');
            document.documentElement.style.setProperty('--border-color', '#2b2b45');
            document.documentElement.style.setProperty('--input-bg', '#202035');
            document.documentElement.style.setProperty('--card-bg', '#1c1a2e');
            
            // Update icon
            themeToggleIcon.classList.remove('fa-moon');
            themeToggleIcon.classList.add('fa-sun');
        }
    }

    function handleFeedbackSubmit() {
        const activeBtn = document.querySelector('.feedback-btn.active');
        const feedbackText = document.getElementById('feedback-text').value;

        if (activeBtn) {
            const rating = activeBtn.getAttribute('data-rating');
            // In a real app, this would be sent to a server
            console.log('Feedback submitted:', { rating, text: feedbackText });

            // Reset and close modal
            document.getElementById('feedback-text').value = '';
            feedbackBtns.forEach(btn => btn.classList.remove('active'));
            feedbackModal.classList.remove('active');

            // Thank the user
            addBotMessage("Thank you for your feedback! It helps me improve.");
        } else {
            // If no rating selected, just close
            feedbackModal.classList.remove('active');
        }
    }

    function addMoodEntry(mood) {
        const moodsList = document.getElementById('moods-list');
        
        // Create a formatted date (e.g., "Aug 15")
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Create the new mood entry
        const moodEntry = document.createElement('div');
        moodEntry.className = 'mood-entry';
        moodEntry.innerHTML = `
            <div class="mood-icon">${getMoodEmoji(mood)}</div>
            <div class="mood-date">${formattedDate}</div>
        `;
        
        // Add to the beginning of the list
        if (moodsList.firstChild) {
            moodsList.insertBefore(moodEntry, moodsList.firstChild);
        } else {
            moodsList.appendChild(moodEntry);
        }
        
        // Update localStorage
        const moodData = JSON.parse(localStorage.getItem('moodData') || '[]');
        moodData.unshift({
            date: formattedDate,
            mood: mood,
            timestamp: today.toISOString()
        });
        
        // Keep only the most recent 30 entries in localStorage
        if (moodData.length > 30) {
            moodData.pop();
        }
        localStorage.setItem('moodData', JSON.stringify(moodData));
        
        // Save to Firebase if user is logged in
        if (auth.currentUser) {
            saveMoodEntry(mood).then(result => {
                if (result.success) {
                    console.log("Mood saved to Firebase successfully");
                    // Update the chart with the latest data
                    initMoodChart();
                } else {
                    console.warn("Failed to save mood to Firebase:", result.error);
                }
            });
        } else {
            console.log("User not logged in - mood data saved locally only");
        }
        
        // Update the chart with the new mood
        addMoodToChart(mood);
        
        // Close the mood selector
        document.getElementById('mood-selector').classList.remove('active');
    }

    function getMoodEmoji(mood) {
        const moodEmojis = {
            'happy': '😊',
            'sad': '😢',
            'anxious': '😰',
            'stressed': '😫',
            'calm': '😌',
            'energetic': '⚡',
            'great': '😄',
            'good': '🙂',
            'okay': '😐',
            'bad': '🙁',
            'awful': '😞'
        };
        return moodEmojis[mood] || '😐';
    }

    // Function to add new mood to the chart
    function addMoodToChart(mood) {
        if (!window.moodChart) return;
        
        // Define mood values
        const moodValues = {
            'great': 5,
                'happy': 5,
            'good': 4,
                'energetic': 4,
                'calm': 3,
            'okay': 3,
            'anxious': 2,
                'stressed': 2,
            'sad': 2,
            'bad': 2,
            'awful': 1
        };
        
        // Format today's date
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Check if today's date is already in the chart
        const labels = window.moodChart.data.labels;
        const todayIndex = labels.indexOf(formattedDate);
        
        if (todayIndex !== -1) {
            // Update existing entry
            window.moodChart.data.datasets[0].data[todayIndex] = moodValues[mood] || 3;
        } else {
            // Add new entry
            window.moodChart.data.labels.push(formattedDate);
            window.moodChart.data.datasets[0].data.push(moodValues[mood] || 3);
            
            // Remove oldest entry if we have more than 7
            if (window.moodChart.data.labels.length > 7) {
                window.moodChart.data.labels.shift();
                window.moodChart.data.datasets[0].data.shift();
            }
        }
        
        // Update the chart
        window.moodChart.update();
    }

    async function initMoodChart() {
        // Get canvas context
        const ctx = document.getElementById('mood-chart').getContext('2d');
        
        // Define mood values
        const moodValues = {
            'great': 5,
            'good': 4,
            'okay': 3,
            'bad': 2,
            'awful': 1
        };
        
        // Initialize chart data
        let chartLabels = [];
        let chartData = [];
        
        try {
            // Try to load mood history from Firebase first
            const result = await getMoodHistoryForPeriod('week');
            
            if (result.success && result.data.length > 0) {
                console.log("Using mood data from Firebase");
                
                // Process the data
                const moodEntries = result.data.slice(0, 7); // Get up to 7 recent entries
                
                // Create labels and data arrays
                chartLabels = moodEntries.map(entry => {
                    const date = new Date(entry.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }).reverse();
                
                chartData = moodEntries.map(entry => moodValues[entry.mood] || 3).reverse();
            } else {
                console.log("Using local mood data from localStorage");
                
                // Fallback to localStorage
                const moodData = JSON.parse(localStorage.getItem('moodData') || '[]');
                
                // Create labels and data arrays
                chartLabels = moodData.slice(0, 7).map(entry => entry.date).reverse();
                chartData = moodData.slice(0, 7).map(entry => moodValues[entry.mood] || 3).reverse();
            }
            
            // If we have no data at all, add some placeholders
            if (chartLabels.length === 0) {
                const today = new Date();
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(today.getDate() - i);
                    chartLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                    chartData.push(null); // null for no data
                }
            }
            
            // Update or create the chart
            if (window.moodChart) {
                window.moodChart.data.labels = chartLabels;
                window.moodChart.data.datasets[0].data = chartData;
                window.moodChart.update();
            } else {
                window.moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                        labels: chartLabels,
                datasets: [{
                    label: 'Mood',
                            data: chartData,
                            borderColor: '#7C65C0',
                            backgroundColor: 'rgba(124, 101, 192, 0.1)',
                    borderWidth: 2,
                            pointBackgroundColor: '#7C65C0',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                            pointHoverRadius: 7,
                            tension: 0.3,
                            fill: true
                }]
            },
            options: {
                scales: {
                    y: {
                                min: 0,
                                max: 6,
                        ticks: {
                            stepSize: 1,
                                    callback: function(value) {
                                        const moodLabels = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great', ''];
                                return moodLabels[value] || '';
                            }
                                },
                                grid: {
                                    color: 'rgba(200, 200, 200, 0.1)'
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(200, 200, 200, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                                    label: function(context) {
                                        const value = context.raw;
                                        const moodLabels = ['No data', 'Awful', 'Bad', 'Okay', 'Good', 'Great'];
                                        return value ? moodLabels[value] : 'No data';
                            }
                        }
                    }
                }
            }
        });
    }

            // Update mood statistics if the user is logged in
            updateMoodStatistics();
            
        } catch (error) {
            console.error("Error initializing mood chart:", error);
            
            // Fallback to an empty chart
            if (!window.moodChart) {
                window.moodChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        datasets: [{
                            label: 'Mood',
                            data: [null, null, null, null, null, null, null],
                            borderColor: '#7C65C0',
                            backgroundColor: 'rgba(124, 101, 192, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                min: 0,
                                max: 6,
                                ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                        const moodLabels = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great', ''];
                                        return moodLabels[value] || '';
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }
        }
    }

    // Add a new function to update mood statistics
    async function updateMoodStatistics() {
        try {
            const result = await getMoodStatistics();
            
            if (result.success) {
                const stats = result.data;
                
                // Update statistics in the UI
                const statsContainer = document.getElementById('mood-stats');
                if (statsContainer) {
                    const streakElement = statsContainer.querySelector('.streak-count');
                    if (streakElement) {
                        streakElement.textContent = stats.streak || '0';
                    }
                    
                    const entriesElement = statsContainer.querySelector('.entries-count');
                    if (entriesElement) {
                        entriesElement.textContent = stats.totalEntries || '0';
                    }
                    
                    const moodElement = statsContainer.querySelector('.common-mood');
                    if (moodElement) {
                        moodElement.textContent = stats.mostFrequentMood ? 
                            stats.mostFrequentMood.charAt(0).toUpperCase() + stats.mostFrequentMood.slice(1) : 
                            'None';
                    }
                }
            }
        } catch (error) {
            console.error("Error updating mood statistics:", error);
        }
    }

    // Minimal mood theming - only change accent colors without gradients
    function applyMinimalMoodTheme(mood) {
            const moodColors = {
            'happy': '#27ae60',    // Green
            'energetic': '#3498db', // Blue
            'calm': '#2980b9',     // Dark Blue
            'anxious': '#9b59b6',  // Purple
            'stressed': '#e74c3c', // Red
            'sad': '#34495e'       // Dark Gray-Blue
        };
        
        // Just update the accent color subtly
        document.documentElement.style.setProperty('--accent-color', moodColors[mood] || '#3498db');
        
        // Update chart if needed
        if (moodChart) {
            updateMoodChart();
        }
    }

    // Accessibility: Enter key for buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // Extract a title from the chat messages
    function extractChatTitle(messages) {
        // Look for the first user message with reasonable length
        const userMessages = messages.filter(msg => msg.role === 'user');
        
        if (userMessages.length === 0) {
            return "New Chat";
        }
        
        // Get first message with reasonable length (at least 3 words)
        const firstMessage = userMessages[0].content;
        const words = firstMessage.split(' ');
        
        if (words.length >= 3) {
            return firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
        }
        
        return "Chat " + new Date().toLocaleDateString();
    }

    // Chat History Management
    let chatHistory = [];
    const CHAT_HISTORY_KEY = 'ai_mental_chat_history';

    function initChatHistory() {
        // Load chat history from localStorage
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            renderChatHistory();
        }
        
        // Set up event listeners
        document.getElementById('toggle-sidebar-btn').addEventListener('click', toggleChatSidebar);
        document.getElementById('new-chat-btn').addEventListener('click', startNewChat);
        document.querySelector('.sidebar-overlay').addEventListener('click', closeChatSidebar);
    }

    function toggleChatSidebar() {
        const sidebar = document.querySelector('.chat-history-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const mainContent = document.querySelector('.main-content');
        
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        mainContent.classList.toggle('shifted');
    }

    function closeChatSidebar() {
        const sidebar = document.querySelector('.chat-history-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const mainContent = document.querySelector('.main-content');
        
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        mainContent.classList.remove('shifted');
    }

    function startNewChat() {
        // Save current chat if it has messages
        if (messages.length > initialMessageCount) {
            saveChatToHistory();
        }
        
        // Clear chat and reset
        messages = [...initialMessages];
        document.getElementById('chat-messages').innerHTML = '';
        renderInitialMessages();
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            closeChatSidebar();
        }
    }

    function saveChatToHistory() {
        // Don't save if there are only initial messages
        if (messages.length <= initialMessageCount) return;
        
        const userMessages = messages.filter(msg => msg.role === 'user');
        let title = userMessages.length > 0 ? userMessages[0].content.substring(0, 30) : 'New Chat';
        if (title.length === 30) title += '...';
        
        const chatId = Date.now().toString();
        const newChat = {
            id: chatId,
            title: title,
            date: new Date().toISOString(),
            messages: [...messages]
        };
        
        // Add to beginning of array
        chatHistory.unshift(newChat);
        
        // Limit history to 20 chats
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(0, 20);
        }
        
        // Save to localStorage
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
        
        // Update UI
        renderChatHistory();
    }

    function renderChatHistory() {
        const chatList = document.querySelector('.chat-list');
        chatList.innerHTML = '';
        
        chatHistory.forEach(chat => {
            const chatDate = new Date(chat.date);
            const formattedDate = chatDate.toLocaleDateString();
            
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.setAttribute('data-id', chat.id);
            chatItem.innerHTML = `
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-info">
                    <div class="chat-item-date">${formattedDate}</div>
                    <div class="chat-item-actions">
                        <button class="delete-chat-btn" data-id="${chat.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            chatItem.addEventListener('click', (e) => {
                // Ignore if clicking on delete button
                if (e.target.closest('.delete-chat-btn')) return;
                
                loadChat(chat.id);
            });
            
            chatList.appendChild(chatItem);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(btn.getAttribute('data-id'));
            });
        });
    }

    function loadChat(chatId) {
        // Save current chat if needed
        if (messages.length > initialMessageCount) {
            saveChatToHistory();
        }
        
        // Find the chat
        const chat = chatHistory.find(c => c.id === chatId);
        if (!chat) return;
        
        // Load messages
        messages = [...chat.messages];
        
        // Render messages
        document.getElementById('chat-messages').innerHTML = '';
        messages.forEach(message => {
            renderMessage(message);
        });
        
        // Mark as active
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-id') === chatId) {
                item.classList.add('active');
            }
        });
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            closeChatSidebar();
        }
    }

    function deleteChat(chatId) {
        // Filter out the deleted chat
        chatHistory = chatHistory.filter(chat => chat.id !== chatId);
        
        // Save to localStorage
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
        
        // Update UI
        renderChatHistory();
    }

    // Modify sendMessage function to save chat after sending
    const originalSendMessage = sendMessage;
    sendMessage = function() {
        originalSendMessage();
        
        // Add a small delay to ensure the response is included
        setTimeout(() => {
            saveChatToHistory();
        }, 1000);
    };

    // Add chat history initialization to page load
    document.addEventListener('DOMContentLoaded', function() {
        // Existing initializations
        // ...
        
        // Initialize chat history
        initChatHistory();
    });

    // Main DOMContentLoaded handler - Simplified to ensure loading screen dismissal
    document.addEventListener('DOMContentLoaded', async function () {
        initializeApp();
        // Initialize mood chart when DOM is loaded
        await initMoodChart();
    });
} 