#!/usr/bin/env node

console.log('🚀 Figma Chat Application - Quick Setup\n');

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if Node.js modules are installed
if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    const install = spawn('npm', ['install'], { stdio: 'inherit' });
    
    install.on('close', (code) => {
        if (code !== 0) {
            console.log('❌ Failed to install dependencies');
            process.exit(1);
        }
        setupDatabase();
    });
} else {
    console.log('✅ Dependencies already installed');
    setupDatabase();
}

function setupDatabase() {
    console.log('\n📊 Setting up SQLite database...');
    
    const setup = spawn('npm', ['run', 'setup-db-sqlite'], { stdio: 'inherit' });
    
    setup.on('close', (code) => {
        if (code !== 0) {
            console.log('❌ Failed to setup database');
            process.exit(1);
        }
        
        console.log('\n🧪 Running tests...');
        runTests();
    });
}

function runTests() {
    const test = spawn('node', ['test-setup.js'], { stdio: 'inherit' });
    
    test.on('close', (code) => {
        if (code !== 0) {
            console.log('❌ Tests failed');
            process.exit(1);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 SETUP COMPLETE! Your chat application is ready!');
        console.log('='.repeat(60));
        console.log('\n📋 Quick Start:');
        console.log('  1. Start server: node server-sqlite.js');
        console.log('  2. Open browser: http://localhost:3000');
        console.log('  3. Login with: Anonymous / password');
        console.log('\n🔗 Direct Links:');
        console.log('  • Chat: http://localhost:3000/chat.html');
        console.log('  • Login: http://localhost:3000/login.html');
        console.log('\n🛠️  Commands:');
        console.log('  • Start server: node server-sqlite.js');
        console.log('  • Run tests: node test-setup.js');
        console.log('  • View logs: DEBUG=* node server-sqlite.js');
        console.log('\n✨ Happy chatting!');
    });
}