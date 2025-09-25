const express = require('express');
const bcrypt = require('bcryptjs');
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

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const existingUsers = await dbConnection.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await dbConnection.query(`
            INSERT INTO users (username, email, password_hash, display_name) 
            VALUES (?, ?, ?, ?)
        `, [username, email, passwordHash, displayName || username]);

        // Create session
        req.session.userId = result.insertId;
        req.session.username = username;

        // Add user to default room
        await dbConnection.query(
            'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (1, ?)',
            [result.insertId]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: result.insertId,
                username: username,
                email: email,
                displayName: displayName || username
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user by username or email
        const users = await dbConnection.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;

        // Update last seen
        await dbConnection.query(
            'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout user
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Get current user info
router.get('/me', requireAuth, async (req, res) => {
    try {
        const users = await dbConnection.query(
            'SELECT id, username, email, display_name, avatar_url, is_online FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: users[0] });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Check authentication status  
router.get('/status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true, 
            userId: req.session.userId,
            username: req.session.username 
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;