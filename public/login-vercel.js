// Login functionality for Vercel serverless backend
class LoginApp {
    constructor() {
        this.init();
    }

    init() {
        // Check if already logged in
        this.checkExistingAuth();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('🔐 Login app initialized');
    }

    async checkExistingAuth() {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                // Already logged in, redirect to chat
                window.location.href = '/chat.html';
            }
        } catch (error) {
            // Not logged in, stay on login page
            console.log('User not authenticated');
        }
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form submission
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Tab switching
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        
        if (loginTab) {
            loginTab.addEventListener('click', () => {
                this.switchToLogin();
            });
        }
        
        if (registerTab) {
            registerTab.addEventListener('click', () => {
                this.switchToRegister();
            });
        }
    }

    switchToLogin() {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('registerTab').classList.remove('active');
        document.getElementById('loginForm').classList.add('active');
        document.getElementById('registerForm').classList.remove('active');
    }

    switchToRegister() {
        document.getElementById('registerTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('registerForm').classList.add('active');
        document.getElementById('loginForm').classList.remove('active');
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!username || !password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to chat after short delay
            setTimeout(() => {
                window.location.href = '/chat.html';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(error.message || 'Login failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister() {
        const username = document.getElementById('registerUsername')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (!username || !email || !password || !confirmPassword) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    username, 
                    email, 
                    password,
                    displayName: username // Use username as display name for now
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            this.showMessage('Registration successful! Redirecting...', 'success');
            
            // Redirect to chat after short delay
            setTimeout(() => {
                window.location.href = '/chat.html';
            }, 1000);

        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage(error.message || 'Registration failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message element
        const messageElement = document.createElement('div');
        messageElement.className = `auth-message ${type}`;
        messageElement.textContent = message;

        // Add to form container
        const container = document.querySelector('.login-container');
        if (container) {
            container.insertBefore(messageElement, container.firstChild);
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 5000);
    }

    showLoading(isLoading) {
        const loginButton = document.querySelector('#loginForm button[type="submit"]');
        const registerButton = document.querySelector('#registerForm button[type="submit"]');

        if (isLoading) {
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.textContent = 'Logging in...';
            }
            if (registerButton) {
                registerButton.disabled = true;
                registerButton.textContent = 'Registering...';
            }
        } else {
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
            }
            if (registerButton) {
                registerButton.disabled = false;
                registerButton.textContent = 'Register';
            }
        }
    }
}

// Initialize the login app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginApp();
});

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginApp;
}