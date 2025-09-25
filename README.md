# 🚀 Fun Friday Group Chat - Full Stack Application

A complete real-time chat application built with HTML, CSS, JavaScript, Node.js, Express, Socket.io, and MySQL.

## 📋 Prerequisites

Before running the application, make sure you have the following installed:

1. **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
2. **MySQL** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/)
3. **Git** (optional) - [Download here](https://git-scm.com/)

## 🔧 Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

**Option A: SQLite (Recommended for Easy Setup)**
```bash
# Setup SQLite database (no external database required)
npm run setup-db-sqlite

# Start the SQLite version
node server-sqlite.js
```

**Option B: MySQL (Advanced Setup)**
1. **Start MySQL service** on your system
2. **Create a MySQL user** (or use root):
   ```sql
   CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON *.* TO 'chat_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Configure environment variables**:
   - Update `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root  # or your MySQL username
   DB_PASSWORD=your_mysql_password
   DB_NAME=figma_chat_db
   ```

4. **Run database setup**:
   ```bash
   npm run setup-db
   ```

### 3. Start the Application

**SQLite Version (Recommended):**
```bash
node server-sqlite.js
```

**MySQL Version:**
```bash
npm start
# Or for development with auto-restart:
npm run dev
```

The application will be available at: **http://localhost:3000**

### 4. Test the Setup

```bash
node test-setup.js
```

This will verify all components are working correctly.

## 🌟 Features

### ✅ Authentication System
- **User Registration** with email and username
- **Secure Login** with password hashing (bcrypt)
- **Session Management** with Express sessions
- **Auto-redirect** based on authentication status

### ✅ Real-time Chat
- **Instant messaging** with Socket.io
- **Message persistence** in MySQL database
- **Typing indicators** (shows when users are typing)
- **Online/offline status** tracking
- **Message timestamps** with proper formatting

### ✅ User Interface
- **Figma-based design** - exact replica of the provided design
- **Mobile-responsive** layout (390px width optimized)
- **Message bubbles** with proper styling
- **Read receipts** for sent messages
- **Smooth animations** and hover effects

### ✅ Database Features
- **User management** (registration, login, profile)
- **Chat rooms** support (currently using default "Fun Friday Group")
- **Message storage** with sender, timestamp, and room association
- **Room membership** tracking
- **Message reactions** support (infrastructure ready)

## 🗄️ Database Schema

The application creates the following tables:

1. **users** - User accounts and profiles
2. **chat_rooms** - Chat room information
3. **room_members** - User-room relationships
4. **messages** - All chat messages
5. **message_reactions** - Message reactions (likes, etc.)

## 🎯 Usage

### First Time Setup
1. **Start the server**: `npm start`
2. **Open browser**: Go to `http://localhost:3000`
3. **Register**: Create a new account
4. **Start chatting**: Begin sending messages!

### Testing the Chat
1. **Open multiple browser windows/tabs**
2. **Register different users** in each window
3. **Send messages** and see real-time updates
4. **Test typing indicators** by typing without sending

## 🔨 Development

### Project Structure
```
figma-based/
├── server.js              # Main server file (MySQL)
├── server-sqlite.js       # SQLite server file (recommended)
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration
├── figma_chat.db          # SQLite database file (auto-created)
├── test-setup.js          # Setup verification script
├── database/
│   ├── connection.js      # MySQL database connection
│   ├── setup.js          # MySQL database setup script
│   ├── sqlite-connection.js  # SQLite database connection
│   └── sqlite-setup.js    # SQLite database setup script
├── routes/
│   ├── auth.js           # MySQL authentication routes
│   ├── chat.js           # MySQL chat API routes
│   ├── sqlite-auth.js    # SQLite authentication routes
│   └── sqlite-chat.js    # SQLite chat API routes
└── public/
    ├── login.html        # Login/Register page
    ├── chat.html         # Main chat interface
    ├── chat.js           # Frontend chat logic
    └── styles.css        # Styling
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/status` - Check auth status

#### Chat
- `GET /api/chat/rooms` - Get user's chat rooms
- `GET /api/chat/rooms/:id/messages` - Get room messages
- `POST /api/chat/rooms/:id/messages` - Send message
- `GET /api/chat/rooms/:id/members` - Get room members
- `POST /api/chat/rooms/:id/join` - Join a room
- `GET /api/chat/search` - Search messages

#### Socket Events
- `user-joined` - User connects to chat
- `join-room` - Join specific chat room
- `send-message` - Send a message
- `new-message` - Receive new message
- `typing-start/stop` - Typing indicators
- `user-online/offline` - User status updates

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL is running
   - Verify credentials in `.env` file
   - Ensure user has proper permissions

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing process: `pkill -f node`

3. **Socket.io Connection Issues**
   - Check if server is running
   - Verify no firewall blocking connections
   - Clear browser cache

4. **Messages Not Sending**
   - Check browser console for errors
   - Verify user is authenticated
   - Check database connectivity

### Debug Mode
To see detailed logs, set environment variable:
```bash
DEBUG=* npm start
```

## 🚀 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
SESSION_SECRET=your-super-secure-session-secret
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
```

### Security Considerations
- Change default session secret
- Use HTTPS in production
- Set secure cookie flags
- Implement rate limiting
- Add input validation
- Use environment variables for all secrets

## 📝 Sample Accounts

The setup script creates these sample accounts for testing:

| Username | Email | Password |
|----------|-------|----------|
| Anonymous | anonymous@example.com | password |
| Kirtidan Gadhvi | kirtidan@example.com | password |

## 🔄 Updates & Extensions

The application is designed to be easily extensible:

- **Add file sharing** - Extend message types
- **Add private messaging** - Create 1-on-1 rooms  
- **Add emoji reactions** - Use message_reactions table
- **Add user profiles** - Extend user table
- **Add admin features** - Use room roles
- **Add message search** - Already implemented in API

## 📞 Support

If you encounter any issues:

1. Check the console logs (browser F12 and server terminal)
2. Verify all dependencies are installed
3. Ensure MySQL is running and accessible
4. Check the troubleshooting section above

## 🎉 Success!

If everything is working correctly, you should see:
- ✅ Database connected successfully
- ✅ Server running on port 3000
- ✅ Real-time message updates
- ✅ Login/Register functionality
- ✅ Beautiful Figma-based UI

Happy chatting! 🎊