import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

// Database utility functions for Vercel KV
export class VercelKVDatabase {
    
    // User management
    static async createUser(userData) {
        const userId = uuidv4();
        const user = {
            id: userId,
            username: userData.username,
            email: userData.email,
            password_hash: userData.password_hash,
            display_name: userData.display_name || userData.username,
            avatar_url: userData.avatar_url || null,
            is_online: false,
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Store user by ID
        await kv.hset(`user:${userId}`, user);
        
        // Store username->userId mapping for lookups
        await kv.set(`username:${userData.username}`, userId);
        await kv.set(`email:${userData.email}`, userId);
        
        // Add to users list
        await kv.sadd('users', userId);
        
        return user;
    }
    
    static async getUserById(userId) {
        return await kv.hgetall(`user:${userId}`);
    }
    
    static async getUserByUsername(username) {
        const userId = await kv.get(`username:${username}`);
        if (!userId) return null;
        return await this.getUserById(userId);
    }
    
    static async getUserByEmail(email) {
        const userId = await kv.get(`email:${email}`);
        if (!userId) return null;
        return await this.getUserById(userId);
    }
    
    static async updateUserOnlineStatus(userId, isOnline) {
        await kv.hset(`user:${userId}`, {
            is_online: isOnline,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    
    // Room management
    static async createRoom(roomData) {
        const roomId = uuidv4();
        const room = {
            id: roomId,
            name: roomData.name,
            description: roomData.description || '',
            is_private: roomData.is_private || false,
            created_by: roomData.created_by,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        await kv.hset(`room:${roomId}`, room);
        await kv.sadd('rooms', roomId);
        
        return room;
    }
    
    static async getRoomById(roomId) {
        return await kv.hgetall(`room:${roomId}`);
    }
    
    static async getUserRooms(userId) {
        const roomIds = await kv.smembers(`user_rooms:${userId}`);
        const rooms = [];
        
        for (const roomId of roomIds) {
            const room = await this.getRoomById(roomId);
            if (room && Object.keys(room).length > 0) {
                rooms.push(room);
            }
        }
        
        return rooms;
    }
    
    static async addUserToRoom(userId, roomId, role = 'member') {
        const memberData = {
            user_id: userId,
            room_id: roomId,
            role: role,
            joined_at: new Date().toISOString()
        };
        
        await kv.hset(`room_member:${roomId}:${userId}`, memberData);
        await kv.sadd(`room_members:${roomId}`, userId);
        await kv.sadd(`user_rooms:${userId}`, roomId);
    }
    
    static async getRoomMembers(roomId) {
        const userIds = await kv.smembers(`room_members:${roomId}`);
        const members = [];
        
        for (const userId of userIds) {
            const user = await this.getUserById(userId);
            const memberInfo = await kv.hgetall(`room_member:${roomId}:${userId}`);
            
            if (user && Object.keys(user).length > 0) {
                members.push({
                    ...user,
                    role: memberInfo.role || 'member',
                    joined_at: memberInfo.joined_at
                });
            }
        }
        
        return members;
    }
    
    // Message management
    static async createMessage(messageData) {
        const messageId = uuidv4();
        const message = {
            id: messageId,
            room_id: messageData.room_id,
            sender_id: messageData.sender_id,
            content: messageData.content,
            message_type: messageData.message_type || 'text',
            reply_to_id: messageData.reply_to_id || null,
            created_at: new Date().toISOString(),
            edited_at: null
        };
        
        await kv.hset(`message:${messageId}`, message);
        
        // Add to room messages list (with timestamp for ordering)
        const timestamp = Date.now();
        await kv.zadd(`room_messages:${messageData.room_id}`, { score: timestamp, member: messageId });
        
        // Update room's last activity
        await kv.hset(`room:${messageData.room_id}`, {
            updated_at: new Date().toISOString()
        });
        
        return message;
    }
    
    static async getRoomMessages(roomId, limit = 50, offset = 0) {
        // Get message IDs ordered by timestamp (newest first)
        const messageIds = await kv.zrevrange(`room_messages:${roomId}`, offset, offset + limit - 1);
        const messages = [];
        
        for (const messageId of messageIds) {
            const message = await kv.hgetall(`message:${messageId}`);
            if (message && Object.keys(message).length > 0) {
                // Get sender info
                const sender = await this.getUserById(message.sender_id);
                messages.push({
                    ...message,
                    sender: sender ? {
                        username: sender.username,
                        display_name: sender.display_name,
                        avatar_url: sender.avatar_url
                    } : null
                });
            }
        }
        
        return messages.reverse(); // Return in chronological order
    }
    
    static async searchMessages(userId, query, roomId = null) {
        // For simplicity, we'll get all user's rooms and search through recent messages
        const roomIds = roomId ? [roomId] : await kv.smembers(`user_rooms:${userId}`);
        const results = [];
        
        for (const rId of roomIds) {
            const messages = await this.getRoomMessages(rId, 100); // Search last 100 messages per room
            
            for (const message of messages) {
                if (message.content && message.content.toLowerCase().includes(query.toLowerCase())) {
                    const room = await this.getRoomById(rId);
                    results.push({
                        ...message,
                        room_name: room ? room.name : 'Unknown Room'
                    });
                }
            }
        }
        
        return results.slice(0, 50); // Return max 50 results
    }
    
    // Initialize default data
    static async initializeDefaults() {
        // Check if default room exists
        const defaultRoomExists = await kv.get('default_room_initialized');
        
        if (!defaultRoomExists) {
            // Create default room
            const defaultRoom = await this.createRoom({
                name: 'Fun Friday Group',
                description: 'Fun Friday Group Chat',
                created_by: 'system'
            });
            
            await kv.set('default_room_id', defaultRoom.id);
            await kv.set('default_room_initialized', 'true');
            
            console.log('✅ Default room created:', defaultRoom.id);
        }
        
        return await kv.get('default_room_id');
    }
    
    // Get default room ID
    static async getDefaultRoomId() {
        let roomId = await kv.get('default_room_id');
        if (!roomId) {
            roomId = await this.initializeDefaults();
        }
        return roomId;
    }
}

export default VercelKVDatabase;