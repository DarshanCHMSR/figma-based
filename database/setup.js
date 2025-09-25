const mysql = require('mysql2');
require('dotenv').config();

// Database setup and table creation
async function setupDatabase() {
    console.log('🔄 Setting up database...');
    
    // First, create connection without database
    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    });

    const promiseConnection = connection.promise();

    try {
        // Create database if it doesn't exist
        await promiseConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'figma_chat_db'}`);
        console.log('✅ Database created/verified');

        // Use the database
        await promiseConnection.execute(`USE ${process.env.DB_NAME || 'figma_chat_db'}`);

        // Create users table
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                avatar VARCHAR(255) DEFAULT NULL,
                status ENUM('online', 'offline', 'away') DEFAULT 'offline',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        await promiseConnection.execute(createUsersTable);
        console.log('✅ Users table created/verified');

        // Create chat_rooms table
        const createChatRoomsTable = `
            CREATE TABLE IF NOT EXISTS chat_rooms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_by INT,
                is_group BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `;
        await promiseConnection.execute(createChatRoomsTable);
        console.log('✅ Chat rooms table created/verified');

        // Create room_members table
        const createRoomMembersTable = `
            CREATE TABLE IF NOT EXISTS room_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_id INT,
                user_id INT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                role ENUM('admin', 'member') DEFAULT 'member',
                FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_room_user (room_id, user_id)
            )
        `;
        await promiseConnection.execute(createRoomMembersTable);
        console.log('✅ Room members table created/verified');

        // Create messages table
        const createMessagesTable = `
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT,
                room_id INT,
                message_text TEXT NOT NULL,
                message_type ENUM('text', 'image', 'file') DEFAULT 'text',
                file_url VARCHAR(255) DEFAULT NULL,
                reply_to_id INT DEFAULT NULL,
                is_edited BOOLEAN DEFAULT FALSE,
                is_deleted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
                FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
            )
        `;
        await promiseConnection.execute(createMessagesTable);
        console.log('✅ Messages table created/verified');

        // Create message_reactions table
        const createMessageReactionsTable = `
            CREATE TABLE IF NOT EXISTS message_reactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id INT,
                user_id INT,
                reaction VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_message_user_reaction (message_id, user_id, reaction)
            )
        `;
        await promiseConnection.execute(createMessageReactionsTable);
        console.log('✅ Message reactions table created/verified');

        // Insert default chat room (Fun Friday Group)
        const checkDefaultRoom = await promiseConnection.execute(
            'SELECT id FROM chat_rooms WHERE name = ?',
            ['Fun Friday Group']
        );

        if (checkDefaultRoom[0].length === 0) {
            await promiseConnection.execute(
                'INSERT INTO chat_rooms (name, description, is_group) VALUES (?, ?, ?)',
                ['Fun Friday Group', 'Default group chat for everyone', true]
            );
            console.log('✅ Default chat room created');
        }

        // Insert sample users for testing (optional)
        const sampleUsers = [
            {
                username: 'Anonymous',
                email: 'anonymous@example.com',
                password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
            },
            {
                username: 'Kirtidan Gadhvi',
                email: 'kirtidan@example.com',
                password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
            }
        ];

        for (const user of sampleUsers) {
            try {
                await promiseConnection.execute(
                    'INSERT IGNORE INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                    [user.username, user.email, user.password_hash]
                );
            } catch (err) {
                // Ignore duplicate entry errors
                if (!err.message.includes('Duplicate entry')) {
                    throw err;
                }
            }
        }
        console.log('✅ Sample users created/verified');

        console.log('🎉 Database setup completed successfully!');

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        await promiseConnection.end();
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('✨ Setup complete! You can now start the server.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = setupDatabase;