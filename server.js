const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Import database connection and routes
const db = require('./database/connection');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Main route
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'chat.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Socket.io connection handling
const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining
    socket.on('user-joined', (userData) => {
        activeUsers.set(socket.id, userData);
        socket.broadcast.emit('user-online', userData);
        
        // Send current online users to the new user
        const onlineUsers = Array.from(activeUsers.values());
        socket.emit('online-users', onlineUsers);
    });

    // Handle joining a chat room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Handle sending messages
    socket.on('send-message', async (messageData) => {
        try {
            // Save message to database
            const query = `
                INSERT INTO messages (sender_id, room_id, message_text, created_at) 
                VALUES (?, ?, ?, NOW())
            `;
            
            await db.execute(query, [
                messageData.senderId,
                messageData.roomId,
                messageData.text
            ]);

            // Get sender info
            const [senderResult] = await db.execute(
                'SELECT username, avatar FROM users WHERE id = ?',
                [messageData.senderId]
            );

            const messageWithSender = {
                ...messageData,
                sender: senderResult[0],
                timestamp: new Date().toISOString(),
                id: Date.now() // Temporary ID, in production use proper UUID
            };

            // Broadcast message to room
            io.to(messageData.roomId).emit('new-message', messageWithSender);
            
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('message-error', 'Failed to send message');
        }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
        socket.to(data.roomId).emit('user-typing', {
            userId: data.userId,
            username: data.username
        });
    });

    socket.on('typing-stop', (data) => {
        socket.to(data.roomId).emit('user-stop-typing', {
            userId: data.userId
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const userData = activeUsers.get(socket.id);
        if (userData) {
            activeUsers.delete(socket.id);
            socket.broadcast.emit('user-offline', userData);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to access the chat app`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});