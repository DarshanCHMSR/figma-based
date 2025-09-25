const dbConnection = require('./sqlite-connection');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    try {
        console.log('🔄 Setting up SQLite database...');
        
        await dbConnection.connect();
        const db = dbConnection.getConnection();

        // Create tables
        console.log('📋 Creating tables...');

        // Users table
        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(100),
                avatar_url VARCHAR(255),
                is_online BOOLEAN DEFAULT 0,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Chat rooms table
        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS chat_rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                is_private BOOLEAN DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        // Room members table
        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS room_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role VARCHAR(20) DEFAULT 'member',
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(room_id, user_id)
            )
        `);

        // Messages table
        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                message_type VARCHAR(20) DEFAULT 'text',
                reply_to_id INTEGER,
                edited_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
            )
        `);

        // Message reactions table
        await dbConnection.query(`
            CREATE TABLE IF NOT EXISTS message_reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                reaction VARCHAR(50) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(message_id, user_id, reaction)
            )
        `);

        console.log('✅ Tables created successfully');

        // Insert sample data
        console.log('📝 Creating sample data...');

        // Hash passwords for sample users
        const password1 = await bcrypt.hash('password', 10);
        const password2 = await bcrypt.hash('password', 10);

        // Insert sample users
        try {
            await dbConnection.query(`
                INSERT OR IGNORE INTO users (username, email, password_hash, display_name) 
                VALUES (?, ?, ?, ?)
            `, ['Anonymous', 'anonymous@example.com', password1, 'Anonymous User']);

            await dbConnection.query(`
                INSERT OR IGNORE INTO users (username, email, password_hash, display_name) 
                VALUES (?, ?, ?, ?)
            `, ['Kirtidan_Gadhvi', 'kirtidan@example.com', password2, 'Kirtidan Gadhvi']);

            console.log('👥 Sample users created');
        } catch (error) {
            console.log('ℹ️  Sample users already exist');
        }

        // Create default chat room
        try {
            const roomResult = await dbConnection.query(`
                INSERT OR IGNORE INTO chat_rooms (name, description, created_by) 
                VALUES (?, ?, ?)
            `, ['Fun Friday Group', 'Fun Friday Group Chat', 1]);

            // Add users to the default room
            if (roomResult.insertId || roomResult.changes) {
                await dbConnection.query(`
                    INSERT OR IGNORE INTO room_members (room_id, user_id, role) 
                    VALUES (1, 1, 'admin'), (1, 2, 'member')
                `);
            }

            console.log('🏠 Default chat room created');
        } catch (error) {
            console.log('ℹ️  Default room already exists');
        }

        // Insert some sample messages
        try {
            await dbConnection.query(`
                INSERT OR IGNORE INTO messages (room_id, sender_id, content) 
                VALUES (1, 2, 'Hey! Welcome to Fun Friday Group chat! 🎉')
            `);

            await dbConnection.query(`
                INSERT OR IGNORE INTO messages (room_id, sender_id, content) 
                VALUES (1, 1, 'Thanks! Excited to be here! 😊')
            `);

            console.log('💬 Sample messages created');
        } catch (error) {
            console.log('ℹ️  Sample messages already exist');
        }

        console.log('🎉 Database setup completed successfully!');
        console.log('📊 Database file created at: figma_chat.db');
        
        await dbConnection.close();

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };