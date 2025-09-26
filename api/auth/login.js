import bcrypt from 'bcryptjs';
import VercelKVDatabase from '../../lib/database.js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user by username or email
        let user = await VercelKVDatabase.getUserByUsername(username);
        if (!user || Object.keys(user).length === 0) {
            user = await VercelKVDatabase.getUserByEmail(username);
        }

        if (!user || Object.keys(user).length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last seen
        await VercelKVDatabase.updateUserOnlineStatus(user.id, true);

        // Set user session cookie
        res.setHeader('Set-Cookie', [
            `userId=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
            `username=${user.username}; Path=/; SameSite=Lax; Max-Age=86400`
        ]);

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
}