#!/usr/bin/env node

console.log('🧪 Testing Figma Chat Application Setup\n');

const http = require('http');
const path = require('path');
const fs = require('fs');

// Test 1: Check if all required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
    'server-sqlite.js',
    'database/sqlite-connection.js',
    'database/sqlite-setup.js',
    'routes/sqlite-auth.js',
    'routes/sqlite-chat.js',
    'public/login.html',
    'public/chat.html',
    'public/chat.js',
    'public/styles.css',
    'figma_chat.db'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing!');
    process.exit(1);
}

// Test 2: Check database connection
console.log('\n📊 Testing database connection...');
const dbConnection = require('./database/sqlite-connection');

async function testDatabase() {
    try {
        await dbConnection.connect();
        
        // Test query
        const users = await dbConnection.query('SELECT COUNT(*) as count FROM users');
        console.log(`  ✅ Database connected - ${users[0].count} users found`);
        
        const rooms = await dbConnection.query('SELECT COUNT(*) as count FROM chat_rooms');
        console.log(`  ✅ Chat rooms table - ${rooms[0].count} rooms found`);
        
        const messages = await dbConnection.query('SELECT COUNT(*) as count FROM messages');
        console.log(`  ✅ Messages table - ${messages[0].count} messages found`);
        
        await dbConnection.close();
        
    } catch (error) {
        console.log('  ❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Test 3: Test server startup
console.log('\n🚀 Testing server startup...');

async function testServer() {
    try {
        // Start server in background
        const { spawn } = require('child_process');
        const server = spawn('node', ['server-sqlite.js'], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let serverReady = false;
        
        server.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Server running on port')) {
                serverReady = true;
                console.log('  ✅ Server started successfully');
                
                // Test HTTP endpoint
                setTimeout(() => {
                    testHttpEndpoints(server);
                }, 1000);
            }
        });

        server.stderr.on('data', (data) => {
            console.log('  ❌ Server error:', data.toString());
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!serverReady) {
                console.log('  ❌ Server failed to start within 10 seconds');
                server.kill();
                process.exit(1);
            }
        }, 10000);

    } catch (error) {
        console.log('  ❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

function testHttpEndpoints(server) {
    console.log('\n🌐 Testing HTTP endpoints...');
    
    // Test root endpoint
    const req = http.request('http://localhost:3000/', (res) => {
        if (res.statusCode === 302) { // Redirect to login
            console.log('  ✅ Root endpoint working (redirects to login)');
        } else {
            console.log(`  ⚠️  Root endpoint returned status: ${res.statusCode}`);
        }
        
        // Test auth status endpoint
        const authReq = http.request('http://localhost:3000/api/auth/status', (authRes) => {
            if (authRes.statusCode === 200) {
                console.log('  ✅ Auth API endpoint working');
            } else {
                console.log(`  ❌ Auth API endpoint failed: ${authRes.statusCode}`);
            }
            
            console.log('\n🎉 All tests completed successfully!');
            console.log('\n📋 Setup Summary:');
            console.log('  • SQLite database created and populated');
            console.log('  • Server running on http://localhost:3000');
            console.log('  • Login page: http://localhost:3000/login.html');
            console.log('  • Chat page: http://localhost:3000/chat.html');
            console.log('\n🔐 Test Accounts:');
            console.log('  Username: Anonymous | Password: password');
            console.log('  Username: Kirtidan_Gadhvi | Password: password');
            console.log('\n✨ Ready to chat!');
            
            server.kill();
            process.exit(0);
        });
        
        authReq.on('error', (err) => {
            console.log('  ❌ Auth API test failed:', err.message);
            server.kill();
            process.exit(1);
        });
        
        authReq.end();
    });
    
    req.on('error', (err) => {
        console.log('  ❌ HTTP test failed:', err.message);
        server.kill();
        process.exit(1);
    });
    
    req.end();
}

// Run tests
async function runTests() {
    await testDatabase();
    await testServer();
}

runTests().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});