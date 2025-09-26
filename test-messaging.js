#!/usr/bin/env node

const io = require('socket.io-client');

console.log('🧪 Testing Real-time Chat Messaging...\n');

// Connect to the server
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Join as a test user
    socket.emit('user-joined', {
        userId: 999,
        username: 'TestBot'
    });
    
    // Send a test message after a short delay
    setTimeout(() => {
        console.log('📤 Sending test message...');
        socket.emit('send-message', {
            senderId: 999,
            roomId: 1,
            text: 'Hello from automated test! This message should work now. 🎉'
        });
    }, 1000);
});

socket.on('new-message', (messageData) => {
    console.log('📨 Received message:', {
        sender: messageData.sender?.username || 'Unknown',
        content: messageData.content,
        timestamp: messageData.created_at
    });
    
    if (messageData.sender_id === 999) {
        console.log('✅ Test message sent and received successfully!');
        console.log('🎉 Chat messaging is working correctly!');
        process.exit(0);
    }
});

socket.on('message-error', (error) => {
    console.log('❌ Message error:', error);
    process.exit(1);
});

socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('❌ Test timed out - no response received');
    process.exit(1);
}, 10000);