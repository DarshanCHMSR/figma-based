const express = require('express');
const db = require('../database/connection');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Get user's chat rooms
router.get('/rooms', requireAuth, async (req, res) => {
    try {
        const [rooms] = await db.execute(`
            SELECT 
                cr.id,
                cr.name,
                cr.description,
                cr.is_group,
                cr.created_at,
                COUNT(rm.user_id) as member_count,
                (SELECT message_text FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_time
            FROM chat_rooms cr
            JOIN room_members rm ON cr.id = rm.room_id
            WHERE rm.user_id = ?
            GROUP BY cr.id, cr.name, cr.description, cr.is_group, cr.created_at
            ORDER BY last_message_time DESC
        `, [req.session.userId]);

        res.json({ rooms });

    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get messages for a specific room
router.get('/rooms/:roomId/messages', requireAuth, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Check if user is member of the room
        const [membership] = await db.execute(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, req.session.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied to this room' });
        }

        // Get messages
        const [messages] = await db.execute(`
            SELECT 
                m.id,
                m.message_text,
                m.message_type,
                m.file_url,
                m.created_at,
                m.is_edited,
                u.id as sender_id,
                u.username as sender_username,
                u.avatar as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.room_id = ? AND m.is_deleted = FALSE
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [roomId, parseInt(limit), parseInt(offset)]);

        // Reverse to show oldest first
        messages.reverse();

        res.json({ messages });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send a message
router.post('/rooms/:roomId/messages', requireAuth, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { message_text, message_type = 'text' } = req.body;

        if (!message_text || message_text.trim() === '') {
            return res.status(400).json({ error: 'Message text is required' });
        }

        // Check if user is member of the room
        const [membership] = await db.execute(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, req.session.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied to this room' });
        }

        // Insert message
        const [result] = await db.execute(
            'INSERT INTO messages (sender_id, room_id, message_text, message_type) VALUES (?, ?, ?, ?)',
            [req.session.userId, roomId, message_text.trim(), message_type]
        );

        // Get the complete message data
        const [messageData] = await db.execute(`
            SELECT 
                m.id,
                m.message_text,
                m.message_type,
                m.created_at,
                u.id as sender_id,
                u.username as sender_username,
                u.avatar as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);

        res.status(201).json({ 
            message: 'Message sent successfully',
            data: messageData[0]
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get room members
router.get('/rooms/:roomId/members', requireAuth, async (req, res) => {
    try {
        const { roomId } = req.params;

        // Check if user is member of the room
        const [membership] = await db.execute(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, req.session.userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied to this room' });
        }

        // Get room members
        const [members] = await db.execute(`
            SELECT 
                u.id,
                u.username,
                u.avatar,
                u.status,
                rm.role,
                rm.joined_at
            FROM room_members rm
            JOIN users u ON rm.user_id = u.id
            WHERE rm.room_id = ?
            ORDER BY rm.joined_at ASC
        `, [roomId]);

        res.json({ members });

    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Join a room
router.post('/rooms/:roomId/join', requireAuth, async (req, res) => {
    try {
        const { roomId } = req.params;

        // Check if room exists
        const [rooms] = await db.execute(
            'SELECT id, name FROM chat_rooms WHERE id = ?',
            [roomId]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Check if already a member
        const [membership] = await db.execute(
            'SELECT id FROM room_members WHERE room_id = ? AND user_id = ?',
            [roomId, req.session.userId]
        );

        if (membership.length > 0) {
            return res.status(409).json({ error: 'Already a member of this room' });
        }

        // Add user to room
        await db.execute(
            'INSERT INTO room_members (room_id, user_id) VALUES (?, ?)',
            [roomId, req.session.userId]
        );

        res.json({ message: 'Successfully joined the room' });

    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search messages
router.get('/search', requireAuth, async (req, res) => {
    try {
        const { q, roomId } = req.query;

        if (!q || q.trim() === '') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        let query = `
            SELECT 
                m.id,
                m.message_text,
                m.created_at,
                m.room_id,
                u.username as sender_username,
                cr.name as room_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            JOIN chat_rooms cr ON m.room_id = cr.id
            JOIN room_members rm ON cr.id = rm.room_id
            WHERE rm.user_id = ? 
            AND m.is_deleted = FALSE 
            AND m.message_text LIKE ?
        `;

        const params = [req.session.userId, `%${q.trim()}%`];

        if (roomId) {
            query += ' AND m.room_id = ?';
            params.push(roomId);
        }

        query += ' ORDER BY m.created_at DESC LIMIT 20';

        const [results] = await db.execute(query, params);

        res.json({ results });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;