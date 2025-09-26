// Chat application with Vercel serverless backend integration
class ChatApp {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.messages = [];
        this.pollInterval = null;
        
        this.init();
    }

    async init() {
        try {
            // Check authentication
            await this.checkAuth();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadRooms();
            
            // Start polling for new messages
            this.startMessagePolling();
            
            console.log('✅ Chat app initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize chat app:', error);
            window.location.href = '/login.html';
        }
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            
            const data = await response.json();
            this.currentUser = data.user;
            console.log('👤 Current user:', this.currentUser);
            
            // Update UI with user info
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Auth check failed:', error);
            throw error;
        }
    }

    updateUserInfo() {
        // Update user display name in UI if needed
        const userNameElement = document.querySelector('.group-name');
        if (userNameElement) {
            userNameElement.textContent = 'Fun Friday Group';
        }
    }

    async loadRooms() {
        try {
            const response = await fetch('/api/chat/rooms');
            if (!response.ok) {
                throw new Error('Failed to load rooms');
            }
            
            const data = await response.json();
            console.log('🏠 Loaded rooms:', data.rooms);
            
            // Use default room or first available room
            if (data.rooms && data.rooms.length > 0) {
                this.currentRoom = data.rooms[0].id;
            } else {
                // If no rooms, use default room ID (this should be created by the backend)
                this.currentRoom = '1'; // Default room
            }
            
            // Load messages for current room
            await this.loadMessages();
            
        } catch (error) {
            console.error('❌ Failed to load rooms:', error);
            // Use default room as fallback
            this.currentRoom = '1';
            await this.loadMessages();
        }
    }

    async loadMessages() {
        if (!this.currentRoom) return;
        
        try {
            const response = await fetch(`/api/chat/${this.currentRoom}`);
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            
            const data = await response.json();
            this.messages = data.messages || [];
            
            // Render messages
            this.renderMessages();
            
        } catch (error) {
            console.error('❌ Failed to load messages:', error);
            // Show sample messages if API fails
            this.showSampleMessages();
        }
    }

    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        messagesList.innerHTML = '';
        
        this.messages.forEach(message => {
            this.addMessageToUI(message);
        });
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    addMessageToUI(message) {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;

        const messageGroup = document.createElement('div');
        const isOwn = message.sender_id === this.currentUser.id;
        messageGroup.className = `message-group ${isOwn ? 'own' : ''}`;

        if (!isOwn) {
            // Add avatar for other users
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            
            // Generate initials from username
            const senderName = message.sender?.display_name || message.sender?.username || message.sender_username || 'U';
            const initials = this.generateInitials(senderName);
            avatar.textContent = initials;
            
            // Set random gradient color based on username
            const colors = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
            ];
            const colorIndex = this.hashCode(senderName) % colors.length;
            avatar.style.background = colors[colorIndex];
            
            messageGroup.appendChild(avatar);
        }

        // Create message bubble
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Add sender name (only for non-own messages)
        if (!isOwn) {
            const senderElement = document.createElement('div');
            senderElement.className = 'message-sender';
            senderElement.textContent = message.sender?.display_name || message.sender?.username || message.sender_username;
            messageContent.appendChild(senderElement);
        }

        // Message body container
        const messageBody = document.createElement('div');
        messageBody.className = 'message-body';

        // Message text
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = message.content || message.message_text;

        // Message time
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        
        if (message.created_at) {
            const date = new Date(message.created_at);
            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messageTime.textContent = time;
        }

        messageBody.appendChild(messageText);
        if (isOwn) {
            messageTime.innerHTML = `${messageTime.textContent} <span class="read-receipt">✓✓</span>`;
        }
        messageBody.appendChild(messageTime);
        messageContent.appendChild(messageBody);
        messageBubble.appendChild(messageContent);
        messageGroup.appendChild(messageBubble);
        messagesList.appendChild(messageGroup);
    }

    showSampleMessages() {
        // Show some sample messages if API fails
        const sampleMessages = [
            {
                id: 1,
                sender_id: 'sample1',
                sender_username: "Anonymous",
                content: "Someone order Bornvita!!",
                created_at: new Date(Date.now() - 4000000).toISOString()
            },
            {
                id: 2,
                sender_id: 'sample1',
                sender_username: "Anonymous", 
                content: "hahahahah!!",
                created_at: new Date(Date.now() - 3500000).toISOString()
            },
            {
                id: 3,
                sender_id: 'sample1',
                sender_username: "Anonymous",
                content: "I'm Excited For this Event! Ho-Ho",
                created_at: new Date(Date.now() - 3000000).toISOString()
            },
            {
                id: 4,
                sender_id: 'sample2',
                sender_username: "Kirtidan Gadhvi",
                content: "We have Surprise For you!!",
                created_at: new Date(Date.now() - 1800000).toISOString()
            }
        ];

        sampleMessages.forEach(message => {
            this.addMessageToUI(message);
        });
    }

    setupEventListeners() {
        // Send button click
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Enter key in input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput || !this.currentRoom) return;
        
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        try {
            // Clear input immediately for better UX
            messageInput.value = '';
            
            // Send message to API
            const response = await fetch(`/api/chat/${this.currentRoom}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: messageText,
                    messageType: 'text'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            console.log('📤 Message sent:', data.data);
            
            // Add message to UI immediately
            this.addMessageToUI(data.data);
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore message text if failed
            messageInput.value = messageText;
        }
    }

    startMessagePolling() {
        // Poll for new messages every 3 seconds
        this.pollInterval = setInterval(async () => {
            await this.loadMessages();
        }, 3000);
    }

    scrollToBottom() {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                // Clear polling interval
                if (this.pollInterval) {
                    clearInterval(this.pollInterval);
                }
                
                // Redirect to login
                window.location.href = '/login.html';
            }
            
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Helper function to generate initials from name
    generateInitials(name) {
        if (!name) return 'U';
        const words = name.trim().split(' ');
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }

    // Helper function to generate consistent hash for color selection
    hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatApp;
}