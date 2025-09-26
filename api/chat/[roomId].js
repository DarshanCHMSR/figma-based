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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const userId = getUserIdFromCookies(req);
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Get roomId from URL
    const { roomId } = req.query;
    if (!roomId) {
        return res.status(400).json({ error: 'Room ID is required' });
    }

    try {
        if (req.method === 'GET') {
            // Get messages for a specific room
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            // Check if user is member of the room
            const members = await VercelKVDatabase.getRoomMembers(roomId);
            const isMember = members.some(member => member.id === userId);

            if (!isMember) {
                return res.status(403).json({ error: 'Access denied to this room' });
            }

            const messages = await VercelKVDatabase.getRoomMessages(roomId, limit, offset);

            res.json({ messages });

        } else if (req.method === 'POST') {
            // Send a message to a room
            const { content, messageType = 'text', replyToId } = req.body;

            if (!content) {
                return res.status(400).json({ error: 'Message content is required' });
            }

            // Check if user is member of the room
            const members = await VercelKVDatabase.getRoomMembers(roomId);
            const isMember = members.some(member => member.id === userId);

            if (!isMember) {
                return res.status(403).json({ error: 'Access denied to this room' });
            }

            // Create message
            const message = await VercelKVDatabase.createMessage({
                room_id: roomId,
                sender_id: userId,
                content: content.trim(),
                message_type: messageType,
                reply_to_id: replyToId
            });

            // Get sender info
            const sender = await VercelKVDatabase.getUserById(userId);
            const messageWithSender = {
                ...message,
                sender: sender ? {
                    username: sender.username,
                    display_name: sender.display_name,
                    avatar_url: sender.avatar_url
                } : null
            };

            res.status(201).json({ 
                message: 'Message sent successfully',
                data: messageWithSender
            });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('Messages API error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
}