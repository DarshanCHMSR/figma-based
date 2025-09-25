const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ 
                error: 'Username, email, and password are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long' 
            });
        }

        // Check if user already exists
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                error: 'Username or email already exists' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );

        const userId = result.insertId;

        // Add user to default room
        const [defaultRoom] = await db.execute(
            'SELECT id FROM chat_rooms WHERE name = ?',
            ['Fun Friday Group']
        );

        if (defaultRoom.length > 0) {
            await db.execute(
                'INSERT INTO room_members (room_id, user_id) VALUES (?, ?)',
                [defaultRoom[0].id, userId]
            );
        }

        // Set session
        req.session.userId = userId;
        req.session.username = username;

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: userId,
                username: username,
                email: email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password are required' 
            });
        }

        // Find user
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update user status to online
        await db.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            ['online', user.id]
        );

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                status: 'online'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout user
router.post('/logout', async (req, res) => {
    try {
        if (req.session.userId) {
            // Update user status to offline
            await db.execute(
                'UPDATE users SET status = ? WHERE id = ?',
                ['offline', req.session.userId]
            );
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.json({ message: 'Logout successful' });
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [users] = await db.execute(
            'SELECT id, username, email, avatar, status FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check authentication status
router.get('/status', (req, res) => {
    res.json({ 
        authenticated: !!req.session.userId,
        userId: req.session.userId,
        username: req.session.username
    });
});

module.exports = router;