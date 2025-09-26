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
        const { username, email, password, displayName } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const existingUserByUsername = await VercelKVDatabase.getUserByUsername(username);
        const existingUserByEmail = await VercelKVDatabase.getUserByEmail(email);

        if (existingUserByUsername || existingUserByEmail) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await VercelKVDatabase.createUser({
            username,
            email,
            password_hash: passwordHash,
            display_name: displayName || username
        });

        // Add user to default room
        const defaultRoomId = await VercelKVDatabase.getDefaultRoomId();
        await VercelKVDatabase.addUserToRoom(user.id, defaultRoomId);

        // Set user session cookie (simple implementation)
        res.setHeader('Set-Cookie', [
            `userId=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
            `username=${user.username}; Path=/; SameSite=Lax; Max-Age=86400`
        ]);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
}