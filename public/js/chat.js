/**
 * Personal AI Clone - Chat Interface JavaScript
 * Handles real-time chat functionality with AI
 */

// Chat application
window.ChatApp = {
    // State
    state: {
        currentSessionId: null,
        isTyping: false,
        messageHistory: [],
        settings: {
            responseStyle: 'conversational',
            contextWindow: 10,
            autoScroll: true,
            showTimestamps: true
        }
    },
    
    // Elements
    elements: {},
    
    // WebSocket connection (for future enhancement)
    ws: null,
    
    // Initialize chat application
    init() {
        console.log('Initializing chat interface...');
        
        // Cache DOM elements
        this.cacheElements();
        
        // Load settings
        this.loadSettings();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load chat history
        this.loadChatHistory();
        
        // Initialize chat session
        this.initializeSession();
        
        console.log('Chat interface ready');
    },
    
    // Cache frequently used DOM elements
    cacheElements() {
        this.elements = {
            chatMessages: document.getElementById('chat-messages'),
            messageInput: document.getElementById('message-input'),
            sendButton: document.getElementById('send-button'),
            sendIcon: document.getElementById('send-icon'),
            sendLoading: document.getElementById('send-loading'),
            chatForm: document.getElementById('chat-form'),
            typingIndicator: document.getElementById('typing-indicator'),
            charCount: document.getElementById('char-count'),
            clearChat: document.getElementById('clear-chat'),
            chatSettings: document.getElementById('chat-settings'),
            connectionStatus: document.getElementById('connection-status'),
            statusText: document.getElementById('status-text'),
            chatSidebar: document.getElementById('chat-sidebar'),
            toggleSidebar: document.getElementById('toggle-sidebar'),
            chatSessions: document.getElementById('chat-sessions'),
            newChat: document.getElementById('new-chat'),
            voiceInput: document.getElementById('voice-input')
        };
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Chat form submission
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Message input handling
        this.elements.messageInput.addEventListener('input', () => {
            this.handleMessageInput();
        });
        
        // Enter key handling (with Shift+Enter for new line)
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
        
        // Clear chat button
        this.elements.clearChat.addEventListener('click', () => {
            this.clearCurrentChat();
        });
        
        // Settings button
        this.elements.chatSettings.addEventListener('click', () => {
            this.openSettingsModal();
        });
        
        // Sidebar toggle
        this.elements.toggleSidebar.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // New chat button
        this.elements.newChat.addEventListener('click', () => {
            this.startNewChat();
        });
        
        // Voice input (placeholder for future implementation)
        if (this.elements.voiceInput) {
            this.elements.voiceInput.addEventListener('click', () => {
                PersonalAI.ui.showToast('Voice input coming soon!', 'info');
            });
        }
        
        // Auto-scroll on new messages (if enabled)
        const observer = new MutationObserver(() => {
            if (this.state.settings.autoScroll) {
                this.scrollToBottom();
            }
        });
        
        observer.observe(this.elements.chatMessages, {
            childList: true,
            subtree: true
        });
    },
    
    // Handle message input changes
    handleMessageInput() {
        const message = this.elements.messageInput.value;
        const charCount = message.length;
        const maxLength = parseInt(this.elements.messageInput.getAttribute('maxlength'));
        
        // Update character count
        if (this.elements.charCount) {
            this.elements.charCount.textContent = `${charCount}/${maxLength}`;
        }
        
        // Enable/disable send button
        this.elements.sendButton.disabled = !message.trim();
        
        // Auto-resize textarea
        this.autoResizeTextarea();
    },
    
    // Auto-resize textarea based on content
    autoResizeTextarea() {
        const textarea = this.elements.messageInput;
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of 120px
        textarea.style.height = newHeight + 'px';
    },
    
    // Send message to AI
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.state.isTyping) return;
        
        try {
            // Add user message to chat
            this.addMessage(message, 'user');
            
            // Clear input and show loading state
            this.elements.messageInput.value = '';
            this.handleMessageInput();
            this.setTypingState(true);
            
            // Send to AI API
            const response = await PersonalAI.api.chatWithAI(message, this.state.currentSessionId);
            
            if (response.success) {
                // Add AI response to chat
                this.addMessage(response.message, 'ai');
                
                // Update session ID if new session
                if (response.sessionId && response.sessionId !== this.state.currentSessionId) {
                    this.state.currentSessionId = response.sessionId;
                    this.updateChatHistory();
                }
                
                // Update context for next message
                this.updateMessageContext(message, response.message);
                
            } else {
                throw new Error(response.error || 'Failed to get AI response');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai', true);
            PersonalAI.handlers.errors.handleApiError(error, 'sending chat message');
        } finally {
            this.setTypingState(false);
        }
    },
    
    // Add message to chat interface
    addMessage(text, sender, isError = false) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message`;
        
        const timestamp = new Date().toISOString();
        const avatar = sender === 'user' ? '👤' : '🤖';
        const senderName = sender === 'user' ? 'You' : 'Your AI';
        
        messageElement.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                ${this.state.settings.showTimestamps ? `
                    <div class="message-header">
                        <span class="message-sender">${senderName}</span>
                        <span class="message-time" data-time="${timestamp}">
                            ${PersonalAI.utils.formatDate(timestamp, { relative: true })}
                        </span>
                    </div>
                ` : ''}
                <div class="message-text ${isError ? 'error-message' : ''}">
                    ${this.formatMessageText(text)}
                </div>
            </div>
        `;
        
        // Add to message history
        this.state.messageHistory.push({
            text,
            sender,
            timestamp,
            isError
        });
        
        // Add to DOM
        this.elements.chatMessages.appendChild(messageElement);
        
        // Animate in
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            messageElement.style.transition = 'all 0.3s ease-out';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        });
        
        // Update timestamps periodically
        this.scheduleTimestampUpdate();
        
        // Scroll to bottom if auto-scroll is enabled
        if (this.state.settings.autoScroll) {
            this.scrollToBottom();
        }
    },
    
    // Format message text (handle links, mentions, etc.)
    formatMessageText(text) {
        // Escape HTML
        let formatted = PersonalAI.utils.escapeHtml(text);
        
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    },
    
    // Set typing state
    setTypingState(isTyping) {
        this.state.isTyping = isTyping;
        
        if (isTyping) {
            this.elements.typingIndicator.style.display = 'flex';
            this.elements.sendIcon.style.display = 'none';
            this.elements.sendLoading.style.display = 'inline-block';
            this.scrollToBottom();
        } else {
            this.elements.typingIndicator.style.display = 'none';
            this.elements.sendIcon.style.display = 'inline';
            this.elements.sendLoading.style.display = 'none';
        }
        
        this.elements.sendButton.disabled = isTyping || !this.elements.messageInput.value.trim();
    },
    
    // Scroll to bottom of chat
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        });
    },
    
    // Clear current chat
    clearCurrentChat() {
        PersonalAI.ui.showConfirmDialog(
            'Are you sure you want to clear this chat? This action cannot be undone.',
            () => {
                // Clear messages except welcome message
                const messages = this.elements.chatMessages.querySelectorAll('.message');
                messages.forEach((message, index) => {
                    if (index > 0) { // Keep first welcome message
                        message.remove();
                    }
                });
                
                // Reset state
                this.state.messageHistory = [];
                this.state.currentSessionId = null;
                PersonalAI.utils.storage.remove('chatContext');
                
                PersonalAI.ui.showToast('Chat cleared', 'success');
            }
        );
    },
    
    // Start new chat session
    startNewChat() {
        this.clearCurrentChat();
        this.closeSidebar();
    },
    
    // Toggle sidebar
    toggleSidebar() {
        this.elements.chatSidebar.classList.toggle('open');
        const isOpen = this.elements.chatSidebar.classList.contains('open');
        this.elements.toggleSidebar.textContent = isOpen ? '→' : '←';
    },
    
    // Close sidebar
    closeSidebar() {
        this.elements.chatSidebar.classList.remove('open');
        this.elements.toggleSidebar.textContent = '←';
    },
    
    // Load chat history from server
    async loadChatHistory() {
        try {
            const loadingId = PersonalAI.ui.showLoading(this.elements.chatSessions, 'Loading chat history...');
            
            // This would be implemented to fetch actual chat history
            // const history = await PersonalAI.api.request('/ai-echo/sessions');
            
            // For now, show placeholder
            setTimeout(() => {
                PersonalAI.ui.hideLoading(loadingId);
                this.elements.chatSessions.innerHTML = `
                    <div class="text-center text-gray-500 py-4">
                        <p class="text-sm">No chat history yet</p>
                        <p class="text-xs mt-1">Start a conversation to see your chat sessions here</p>
                    </div>
                `;
            }, 1000);
            
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.elements.chatSessions.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <p class="text-sm">Unable to load chat history</p>
                    <button onclick="ChatApp.loadChatHistory()" class="text-primary text-xs mt-1">Try again</button>
                </div>
            `;
        }
    },
    
    // Update chat history display
    updateChatHistory() {
        // This would update the sidebar with the current session
        // For now, just log that a new session was created
        console.log('New chat session created:', this.state.currentSessionId);
    },
    
    // Initialize chat session
    initializeSession() {
        // Load any existing session context
        const savedContext = PersonalAI.utils.storage.get('chatContext', []);
        if (savedContext.length > 0) {
            console.log('Restored chat context with', savedContext.length, 'messages');
        }
        
        // Focus message input
        this.elements.messageInput.focus();
        
        // Show connection status
        this.showConnectionStatus('Connected to AI', 'success');
    },
    
    // Show connection status
    showConnectionStatus(message, type = 'info') {
        this.elements.statusText.textContent = message;
        this.elements.connectionStatus.className = `alert alert-${type}`;
        this.elements.connectionStatus.style.display = 'block';
        
        // Auto-hide after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                this.elements.connectionStatus.style.display = 'none';
            }, 3000);
        }
    },
    
    // Update message context for AI
    updateMessageContext(userMessage, aiResponse) {
        let context = PersonalAI.utils.storage.get('chatContext', []);
        
        // Add new messages to context
        context.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: aiResponse }
        );
        
        // Limit context to configured window size
        const maxMessages = this.state.settings.contextWindow === 'full' 
            ? context.length 
            : parseInt(this.state.settings.contextWindow) * 2; // *2 because each exchange has 2 messages
        
        if (context.length > maxMessages) {
            context = context.slice(-maxMessages);
        }
        
        // Save updated context
        PersonalAI.utils.storage.set('chatContext', context);
    },
    
    // Load settings from storage
    loadSettings() {
        const savedSettings = PersonalAI.utils.storage.get('chatSettings');
        if (savedSettings) {
            this.state.settings = { ...this.state.settings, ...savedSettings };
        }
    },
    
    // Save settings to storage
    saveSettings() {
        PersonalAI.utils.storage.set('chatSettings', this.state.settings);
    },
    
    // Open settings modal
    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            // Update form with current settings
            document.getElementById('response-style').value = this.state.settings.responseStyle;
            document.getElementById('context-window').value = this.state.settings.contextWindow;
            document.getElementById('auto-scroll').checked = this.state.settings.autoScroll;
            document.getElementById('show-timestamps').checked = this.state.settings.showTimestamps;
            
            modal.style.display = 'flex';
        }
    },
    
    // Schedule timestamp updates
    scheduleTimestampUpdate() {
        // Update timestamps every minute
        if (!this.timestampInterval) {
            this.timestampInterval = setInterval(() => {
                this.updateTimestamps();
            }, 60000);
        }
    },
    
    // Update all timestamps in chat
    updateTimestamps() {
        const timeElements = this.elements.chatMessages.querySelectorAll('.message-time[data-time]');
        timeElements.forEach(element => {
            const timestamp = element.getAttribute('data-time');
            element.textContent = PersonalAI.utils.formatDate(timestamp, { relative: true });
        });
    }
};

// Global functions for modal handling (called from HTML)
window.closeSettingsModal = function() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.saveSettings = function() {
    // Get form values
    const responseStyle = document.getElementById('response-style').value;
    const contextWindow = document.getElementById('context-window').value;
    const autoScroll = document.getElementById('auto-scroll').checked;
    const showTimestamps = document.getElementById('show-timestamps').checked;
    
    // Update settings
    ChatApp.state.settings = {
        responseStyle,
        contextWindow,
        autoScroll,
        showTimestamps
    };
    
    // Save to storage
    ChatApp.saveSettings();
    
    // Apply timestamp visibility change immediately
    const timestamps = document.querySelectorAll('.message-header');
    timestamps.forEach(header => {
        header.style.display = showTimestamps ? 'flex' : 'none';
    });
    
    // Close modal
    closeSettingsModal();
    
    // Show confirmation
    PersonalAI.ui.showToast('Settings saved', 'success');
};

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the chat page
    if (document.getElementById('chat-messages')) {
        ChatApp.init();
    }
});

// Export for debugging
window.ChatApp = ChatApp;