// Chat messages data based on the Figma design
const chatMessages = [
    {
        id: 1,
        sender: "Anonymous",
        text: "Someone order Bornvita!!",
        time: "11:35 AM",
        isOwn: false
    },
    {
        id: 2,
        sender: "Anonymous",
        text: "hahahahah!!",
        time: "11:38 AM",
        isOwn: false
    },
    {
        id: 3,
        sender: "Anonymous",
        text: "I'm Excited For this Event! Ho-Ho",
        time: "11:56 AM",
        isOwn: false
    },
    {
        id: 4,
        sender: "You",
        text: "Hi Guysss 👋",
        time: "12:31 PM",
        isOwn: true,
        hasReadReceipt: true
    },
    {
        id: 5,
        sender: "Anonymous",
        text: "Hello!",
        time: "12:35 PM",
        isOwn: false
    },
    {
        id: 6,
        sender: "Anonymous",
        text: "Yessss!!!!!!!",
        time: "12:42 PM",
        isOwn: false
    },
    {
        id: 7,
        sender: "You",
        text: "Maybe I am not attending this event!",
        time: "1:36 PM",
        isOwn: true,
        hasReadReceipt: true
    },
    {
        id: 8,
        sender: "Kirtidan Gadhvi",
        text: "We have Surprise For you!!",
        time: "11:35 AM",
        isOwn: false
    }
];

// Function to create a message element
function createMessageElement(message) {
    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${message.isOwn ? 'own' : ''}`;

    if (!message.isOwn) {
        // Add avatar for other users
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        messageGroup.appendChild(avatar);
    }

    // Create message bubble
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Add sender name (only for non-own messages)
    if (!message.isOwn) {
        const senderElement = document.createElement('div');
        senderElement.className = 'message-sender';
        senderElement.textContent = message.sender;
        messageContent.appendChild(senderElement);
    }

    // Message body container
    const messageBody = document.createElement('div');
    messageBody.className = 'message-body';

    // Message text
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.text;

    // Message time
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    
    if (message.isOwn && message.hasReadReceipt) {
        messageTime.innerHTML = `${message.time} <div class="read-receipt"></div>`;
    } else {
        messageTime.textContent = message.time;
    }

    messageBody.appendChild(messageText);
    messageBody.appendChild(messageTime);
    messageContent.appendChild(messageBody);
    messageBubble.appendChild(messageContent);
    messageGroup.appendChild(messageBubble);

    return messageGroup;
}

// Function to render all messages
function renderMessages() {
    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = '';

    chatMessages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesList.appendChild(messageElement);
    });

    // Scroll to bottom
    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to add a new message
function addMessage(text, isOwn = true) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });

    const newMessage = {
        id: chatMessages.length + 1,
        sender: isOwn ? "You" : "Anonymous",
        text: text,
        time: time,
        isOwn: isOwn,
        hasReadReceipt: isOwn
    };

    chatMessages.push(newMessage);
    
    // Re-render messages
    renderMessages();
}

// Function to handle sending message
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (messageText !== '') {
        addMessage(messageText);
        messageInput.value = '';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Render initial messages
    renderMessages();

    // Send button click
    const sendButton = document.getElementById('sendButton');
    sendButton.addEventListener('click', sendMessage);

    // Enter key press in input
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Back button click
    const backButton = document.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        // In a real app, this would navigate back
        console.log('Back button clicked');
        alert('Back button clicked - would navigate back in a real app');
    });

    // Menu button click
    const menuButton = document.querySelector('.menu-button');
    menuButton.addEventListener('click', function() {
        // In a real app, this would show menu options
        console.log('Menu button clicked');
        alert('Menu button clicked - would show options in a real app');
    });

    // Camera button click
    const cameraButton = document.querySelector('.camera-button');
    cameraButton.addEventListener('click', function() {
        console.log('Camera button clicked');
        alert('Camera feature - would open camera in a real app');
    });

    // Attachment button click
    const attachmentButton = document.querySelector('.attachment-button');
    attachmentButton.addEventListener('click', function() {
        console.log('Attachment button clicked');
        alert('Attachment feature - would open file picker in a real app');
    });
});

// Simulate receiving messages from other users (for demo purposes)
function simulateIncomingMessage() {
    const sampleMessages = [
        "Great! Looking forward to it!",
        "Count me in! 🎉",
        "What time should we meet?",
        "This is going to be fun!",
        "See you all there!"
    ];

    const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
    addMessage(randomMessage, false);
}

// Simulate incoming messages every 15-30 seconds (for demo)
setInterval(() => {
    if (Math.random() > 0.7) { // 30% chance every interval
        simulateIncomingMessage();
    }
}, 20000); // Every 20 seconds