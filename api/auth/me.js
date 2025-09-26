import VercelKVDatabase from '../../lib/database.js';

// Helper function to get user ID from cookies
function getUserIdFromCookies(req) {
    if (!req.headers.cookie) return null;
    
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {});
    
    return cookies.userId || null;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userId = getUserIdFromCookies(req);
        
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await VercelKVDatabase.getUserById(userId);
        
        if (!user || Object.keys(user).length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                is_online: user.is_online
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
}