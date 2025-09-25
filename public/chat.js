// Chat application with backend integration
class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentRoom = null;
        this.messages = [];
        this.isTyping = false;
        this.typingTimeout = null;
        
        this.init();
    }

    async init() {
        try {
            // Check authentication
            await this.checkAuth();
            
            // Initialize Socket.io
            this.initSocket();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadRooms();
            
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

    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('🔌 Connected to server');
            
            // Join user to socket
            this.socket.emit('user-joined', {
                id: this.currentUser.id,
                username: this.currentUser.username,
                avatar: this.currentUser.avatar
            });
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
        });

        // Handle new messages
        this.socket.on('new-message', (messageData) => {
            this.addMessageToUI(messageData);
        });

        // Handle typing indicators
        this.socket.on('user-typing', (data) => {
            this.showTypingIndicator(data);
        });

        this.socket.on('user-stop-typing', (data) => {
            this.hideTypingIndicator(data);
        });

        // Handle online/offline users
        this.socket.on('user-online', (userData) => {
            console.log('👋 User came online:', userData.username);
        });

        this.socket.on('user-offline', (userData) => {
            console.log('👋 User went offline:', userData.username);
        });
    }

    setupEventListeners() {
        // Send message
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');

        if (sendButton) {
            sendButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                } else {
                    this.handleTyping();
                }
            });

            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Logout functionality
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    async loadRooms() {
        try {
            const response = await fetch('/api/chat/rooms');
            if (!response.ok) {
                throw new Error('Failed to load rooms');
            }
            
            const data = await response.json();
            
            // For now, join the first room (or Fun Friday Group)
            const defaultRoom = data.rooms.find(room => room.name === 'Fun Friday Group') || data.rooms[0];
            
            if (defaultRoom) {
                await this.joinRoom(defaultRoom.id);
            }
            
        } catch (error) {
            console.error('Failed to load rooms:', error);
        }
    }

    async joinRoom(roomId) {
        try {
            this.currentRoom = roomId;
            
            // Join room via socket
            this.socket.emit('join-room', roomId);
            
            // Load room messages
            await this.loadMessages(roomId);
            
            console.log('🏠 Joined room:', roomId);
            
        } catch (error) {
            console.error('Failed to join room:', error);
        }
    }

    async loadMessages(roomId) {
        try {
            const response = await fetch(`/api/chat/rooms/${roomId}/messages?limit=50`);
            if (!response.ok) {
                throw new Error('Failed to load messages');
            }
            
            const data = await response.json();
            this.messages = data.messages;
            
            // Render messages
            this.renderMessages();
            
            console.log(`📨 Loaded ${this.messages.length} messages`);
            
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        messagesList.innerHTML = '';
        
        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesList.appendChild(messageElement);
        });
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const messageGroup = document.createElement('div');
        const isOwn = message.sender_id === this.currentUser.id;
        messageGroup.className = `message-group ${isOwn ? 'own' : ''}`;

        if (!isOwn) {
            // Add avatar for other users
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            if (message.sender_avatar) {
                avatar.style.backgroundImage = `url(${message.sender_avatar})`;
            }
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
            senderElement.textContent = message.sender_username;
            messageContent.appendChild(senderElement);
        }

        // Message body container
        const messageBody = document.createElement('div');
        messageBody.className = 'message-body';

        // Message text
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = message.message_text;

        // Message time
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        
        const time = new Date(message.created_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        if (isOwn) {
            messageTime.innerHTML = `${time} <div class="read-receipt"></div>`;
        } else {
            messageTime.textContent = time;
        }

        messageBody.appendChild(messageText);
        messageBody.appendChild(messageTime);
        messageContent.appendChild(messageBody);
        messageBubble.appendChild(messageContent);
        messageGroup.appendChild(messageBubble);

        return messageGroup;
    }

    addMessageToUI(messageData) {
        this.messages.push(messageData);
        
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            const messageElement = this.createMessageElement(messageData);
            messagesList.appendChild(messageElement);
            this.scrollToBottom();
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
            
            // Stop typing indicator
            this.stopTyping();
            
            // Send via socket
            this.socket.emit('send-message', {
                senderId: this.currentUser.id,
                roomId: this.currentRoom,
                text: messageText
            });
            
            console.log('📤 Message sent:', messageText);
            
        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore message text if failed
            messageInput.value = messageText;
        }
    }

    handleTyping() {
        if (!this.isTyping && this.currentRoom) {
            this.isTyping = true;
            this.socket.emit('typing-start', {
                userId: this.currentUser.id,
                username: this.currentUser.username,
                roomId: this.currentRoom
            });
        }
        
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Set new timeout
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 2000);
    }

    stopTyping() {
        if (this.isTyping && this.currentRoom) {
            this.isTyping = false;
            this.socket.emit('typing-stop', {
                userId: this.currentUser.id,
                roomId: this.currentRoom
            });
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }

    showTypingIndicator(data) {
        // Implementation for showing typing indicator
        console.log(`${data.username} is typing...`);
    }

    hideTypingIndicator(data) {
        // Implementation for hiding typing indicator
        console.log(`${data.username} stopped typing`);
    }

    scrollToBottom() {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    updateUserInfo() {
        // Update UI elements with current user info
        const groupName = document.querySelector('.group-name');
        if (groupName) {
            // Keep the original group name, but could add user status here
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            
            if (response.ok) {
                // Disconnect socket
                if (this.socket) {
                    this.socket.disconnect();
                }
                
                // Redirect to login
                window.location.href = '/login.html';
            }
            
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing chat app...');
    window.chatApp = new ChatApp();
});

// Add some demo messages for initial display (remove in production)
const demoMessages = [
    {
        id: 1,
        sender_id: 2,
        sender_username: "Anonymous",
        message_text: "Someone order Bornvita!!",
        created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 2,
        sender_id: 2,
        sender_username: "Anonymous", 
        message_text: "hahahahah!!",
        created_at: new Date(Date.now() - 3500000).toISOString()
    },
    {
        id: 3,
        sender_id: 2,
        sender_username: "Anonymous",
        message_text: "I'm Excited For this Event! Ho-Ho",
        created_at: new Date(Date.now() - 3000000).toISOString()
    },
    {
        id: 4,
        sender_id: 3,
        sender_username: "Kirtidan Gadhvi",
        message_text: "We have Surprise For you!!",
        created_at: new Date(Date.now() - 1800000).toISOString()
    }
];

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatApp;
}