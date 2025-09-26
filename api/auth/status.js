// Helper function to get user ID from cookies
function getUserIdFromCookies(req) {
    if (!req.headers.cookie) return null;
    
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {});
    
    return {
        userId: cookies.userId || null,
        username: cookies.username || null
    };
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
        const { userId, username } = getUserIdFromCookies(req);
        
        if (userId && username) {
            res.json({ 
                authenticated: true, 
                userId: userId,
                username: username 
            });
        } else {
            res.json({ authenticated: false });
        }

    } catch (error) {
        console.error('Auth status error:', error);
        res.status(500).json({ error: 'Failed to check auth status' });
    }
}