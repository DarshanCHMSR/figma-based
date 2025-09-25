const express = require('express');
const dbConnection = require('../database/sqlite-connection');

const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Get user's chat rooms
router.get('/rooms', requireAuth, async (req, res) => {
    try {
        const rooms = await dbConnection.query(`
            SELECT cr.*, rm.role, rm.joined_at
            FROM chat_rooms cr
            JOIN room_members rm ON cr.id = rm.room_id
            WHERE rm.user_id = ?
            ORDER BY cr.updated_at DESC
        `, [req.session.userId]);

        res.json({ rooms });

    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Failed to get chat rooms' });
    }
});

// Get messages for a specific room
router.get('/rooms/:id/messages', requireAuth, async (req, res) => {
    try {
        const roomId = req.params.id;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Check if user is member of the room
        const membership = await dbConnection.query(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, req.session.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied to this room' });
        }

        // Get messages with sender info
        const messages = await dbConnection.query(`
            SELECT 
                m.*,
                u.username,
                u.display_name,
                u.avatar_url
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.room_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [roomId, limit, offset]);

        res.json({ messages: messages.reverse() }); // Reverse to get chronological order

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Send a message to a room
router.post('/rooms/:id/messages', requireAuth, async (req, res) => {
    try {
        const roomId = req.params.id;
        const { content, messageType = 'text', replyToId } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Check if user is member of the room
        const membership = await dbConnection.query(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, req.session.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied to this room' });
        }

        // Insert message
        const result = await dbConnection.query(`
            INSERT INTO messages (room_id, sender_id, content, message_type, reply_to_id) 
            VALUES (?, ?, ?, ?, ?)
        `, [roomId, req.session.userId, content, messageType, replyToId]);

        // Update room's updated_at timestamp
        await dbConnection.query(
            'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [roomId]
        );

        // Get the created message with sender info
        const newMessages = await dbConnection.query(`
            SELECT 
                m.*,
                u.username,
                u.display_name,
                u.avatar_url
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);

        res.status(201).json({ 
            message: 'Message sent successfully',
            data: newMessages[0]
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get room members
router.get('/rooms/:id/members', requireAuth, async (req, res) => {
    try {
        const roomId = req.params.id;

        // Check if user is member of the room
        const membership = await dbConnection.query(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, req.session.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied to this room' });
        }

        // Get room members
        const members = await dbConnection.query(`
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.avatar_url,
                u.is_online,
                u.last_seen,
                rm.role,
                rm.joined_at
            FROM users u
            JOIN room_members rm ON u.id = rm.user_id
            WHERE rm.room_id = ?
            ORDER BY rm.joined_at ASC
        `, [roomId]);

        res.json({ members });

    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Failed to get room members' });
    }
});

// Join a room
router.post('/rooms/:id/join', requireAuth, async (req, res) => {
    try {
        const roomId = req.params.id;

        // Check if room exists and is not private
        const rooms = await dbConnection.query(
            'SELECT * FROM chat_rooms WHERE id = ? AND is_private = 0',
            [roomId]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found or is private' });
        }

        // Add user to room (ignore if already member)
        await dbConnection.query(
            'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)',
            [roomId, req.session.userId]
        );

        res.json({ message: 'Successfully joined room' });

    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});

// Search messages
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { q: query, roomId } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        let sql = `
            SELECT 
                m.*,
                u.username,
                u.display_name,
                cr.name as room_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            JOIN chat_rooms cr ON m.room_id = cr.id
            JOIN room_members rm ON cr.id = rm.room_id
            WHERE rm.user_id = ? AND m.content LIKE ?
        `;
        
        let params = [req.session.userId, `%${query}%`];

        if (roomId) {
            sql += ' AND m.room_id = ?';
            params.push(roomId);
        }

        sql += ' ORDER BY m.created_at DESC LIMIT 50';

        const results = await dbConnection.query(sql, params);

        res.json({ results });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;