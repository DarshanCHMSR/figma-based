const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Use SQLite database connection
const dbConnection = require('./database/sqlite-connection');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static('public'));

// Routes
const SQLiteAuthRoutes = require('./routes/sqlite-auth');
const SQLiteChatRoutes = require('./routes/sqlite-chat');

app.use('/api/auth', SQLiteAuthRoutes);
app.use('/api/chat', SQLiteChatRoutes);

// Root route
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/chat.html');
    } else {
        res.redirect('/login.html');
    }
});

// Socket.io connection handling
const activeUsers = new Map(); // Track active users

io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Handle user joining
    socket.on('user-joined', async (userData) => {
        try {
            console.log('📥 User joined:', userData);
            
            // Store user info with socket
            socket.userId = userData.userId;
            socket.username = userData.username;
            
            // Add to active users
            activeUsers.set(userData.userId, {
                socketId: socket.id,
                username: userData.username,
                joinedAt: new Date()
            });

            // Update user online status in database
            await dbConnection.query(
                'UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
                [userData.userId]
            );

            // Join default room
            socket.join('room-1');
            
            // Broadcast user joined to room
            socket.to('room-1').emit('user-online', {
                userId: userData.userId,
                username: userData.username
            });

            console.log(`✅ User ${userData.username} joined room-1`);
            
        } catch (error) {
            console.error('❌ Error handling user join:', error);
        }
    });

    // Handle joining specific rooms
    socket.on('join-room', async (roomId) => {
        try {
            socket.join(`room-${roomId}`);
            console.log(`🏠 User ${socket.username} joined room-${roomId}`);
        } catch (error) {
            console.error('❌ Error joining room:', error);
        }
    });

    // Handle sending messages
    socket.on('send-message', async (messageData) => {
        try {
            console.log('📨 Message received:', messageData);

            // Save message to database
            const result = await dbConnection.query(`
                INSERT INTO messages (room_id, sender_id, content, message_type) 
                VALUES (?, ?, ?, ?)
            `, [
                messageData.roomId || 1,
                messageData.senderId,
                messageData.content,
                messageData.type || 'text'
            ]);

            // Get sender info
            const sender = await dbConnection.query(
                'SELECT username, display_name FROM users WHERE id = ?',
                [messageData.senderId]
            );

            const newMessage = {
                id: result.insertId,
                room_id: messageData.roomId || 1,
                sender_id: messageData.senderId,
                content: messageData.content,
                message_type: messageData.type || 'text',
                created_at: new Date().toISOString(),
                sender: sender[0] || { username: 'Unknown', display_name: 'Unknown User' }
            };

            // Broadcast message to room
            io.to(`room-${messageData.roomId || 1}`).emit('new-message', newMessage);
            
            console.log('✅ Message broadcasted to room');

        } catch (error) {
            console.error('❌ Error handling message:', error);
            socket.emit('message-error', { error: 'Failed to send message' });
        }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
        socket.to(`room-${data.roomId || 1}`).emit('user-typing', {
            userId: socket.userId,
            username: socket.username,
            isTyping: true
        });
    });

    socket.on('typing-stop', (data) => {
        socket.to(`room-${data.roomId || 1}`).emit('user-typing', {
            userId: socket.userId,
            username: socket.username,
            isTyping: false
        });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        try {
            console.log('👋 User disconnected:', socket.id);

            if (socket.userId) {
                // Remove from active users
                activeUsers.delete(socket.userId);

                // Update user offline status
                await dbConnection.query(
                    'UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
                    [socket.userId]
                );

                // Broadcast user offline to all rooms
                socket.broadcast.emit('user-offline', {
                    userId: socket.userId,
                    username: socket.username
                });

                console.log(`📴 User ${socket.username} went offline`);
            }
        } catch (error) {
            console.error('❌ Error handling disconnect:', error);
        }
    });
});

// Initialize database connection and start server
async function startServer() {
    try {
        await dbConnection.connect();
        console.log('📊 Database connected successfully');

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log('🚀 Server running on port', PORT);
            console.log(`🌐 Open http://localhost:${PORT} to view the application`);
            console.log('📱 Chat UI: http://localhost:' + PORT + '/chat.html');
            console.log('🔐 Login: http://localhost:' + PORT + '/login.html');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();