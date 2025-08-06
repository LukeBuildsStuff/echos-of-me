#!/usr/bin/env node

/**
 * Simple Chat Server for Luke AI
 * Provides a basic web interface to test Luke's trained model
 */

const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const port = 4000; // Use different port to avoid conflicts

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Simple chat API endpoint that mimics the Next.js API
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        console.log(`💬 Received message: "${message}"`);
        
        // Call the GPU container directly
        const postData = JSON.stringify({ message });
        
        const options = {
            hostname: 'localhost',
            port: 8000,
            path: '/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const containerResponse = await new Promise((resolve, reject) => {
            const request = http.request(options, (containerRes) => {
                let data = '';
                
                containerRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                containerRes.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('Failed to parse container response: ' + data));
                    }
                });
            });
            
            request.on('error', (e) => {
                reject(e);
            });
            
            request.write(postData);
            request.end();
        });
        
        console.log(`✅ Luke AI responded (${containerResponse.response.length} chars, ${containerResponse.inference_time.toFixed(2)}s)`);
        
        // Return in the format expected by the chat interface
        res.json({
            response: containerResponse.response,
            confidence: containerResponse.confidence,
            source: 'luke_trained_model',
            modelVersion: containerResponse.model_version || 'TinyLlama-1.1B-Chat-v1.0+Luke-PEFT',
            emotionalTone: 'warm',
            inference_time: containerResponse.inference_time,
            gpu_memory_used: containerResponse.gpu_memory_used,
            success: true
        });
        
    } catch (error) {
        console.error('❌ Chat API error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate response',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        server: 'simple_chat_server',
        luke_model: 'available'
    });
});

// Simple HTML chat interface
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat with Luke AI</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .chat-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        .header h1 {
            color: #333;
            margin: 0 0 10px 0;
        }
        .header p {
            color: #666;
            margin: 0;
        }
        .messages {
            height: 400px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            background: #fafafa;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
            max-width: 80%;
        }
        .user-message {
            background: #007bff;
            color: white;
            margin-left: auto;
            text-align: right;
        }
        .ai-message {
            background: #e9ecef;
            color: #333;
            margin-right: auto;
        }
        .input-container {
            display: flex;
            gap: 10px;
        }
        #messageInput {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
        }
        #sendButton {
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        }
        #sendButton:hover {
            background: #0056b3;
        }
        #sendButton:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .thinking {
            font-style: italic;
            color: #666;
            opacity: 0.8;
        }
        .metadata {
            font-size: 12px;
            color: #888;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            <h1>🤖 Chat with Luke AI</h1>
            <p>Trained TinyLlama model running on RTX 5090 GPU</p>
        </div>
        
        <div id="messages" class="messages">
            <div class="message ai-message">
                <div>Hello! I'm Luke's AI echo, trained to share thoughts and insights in his authentic voice. What would you like to talk about?</div>
                <div class="metadata">Luke AI • Ready</div>
            </div>
        </div>
        
        <div class="input-container">
            <input type="text" id="messageInput" placeholder="Type your message here..." />
            <button id="sendButton">Send</button>
        </div>
    </div>

    <script>
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        function addMessage(content, isUser = false, metadata = '') {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'ai-message'}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.textContent = content;
            messageDiv.appendChild(contentDiv);
            
            if (metadata) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'metadata';
                metaDiv.textContent = metadata;
                messageDiv.appendChild(metaDiv);
            }
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            // Add user message
            addMessage(message, true);
            messageInput.value = '';
            
            // Show thinking indicator
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'message ai-message thinking';
            thinkingDiv.innerHTML = '<div>Luke is thinking...</div>';
            messagesDiv.appendChild(thinkingDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Disable input while processing
            sendButton.disabled = true;
            messageInput.disabled = true;
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                });
                
                const data = await response.json();
                
                // Remove thinking indicator
                messagesDiv.removeChild(thinkingDiv);
                
                if (data.error) {
                    addMessage(\`Error: \${data.error}\`, false, 'System Error');
                } else {
                    const metadata = \`Luke AI • \${data.inference_time.toFixed(2)}s • \${data.confidence.toFixed(2)} confidence\`;
                    addMessage(data.response, false, metadata);
                }
                
            } catch (error) {
                messagesDiv.removeChild(thinkingDiv);
                addMessage(\`Error: Failed to get response (\${error.message})\`, false, 'Connection Error');
            }
            
            // Re-enable input
            sendButton.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        }
        
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Focus input on page load
        messageInput.focus();
    </script>
</body>
</html>
    `);
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Luke AI Chat Server started!`);
    console.log(`   📍 URL: http://localhost:${port}`);
    console.log(`   🤖 Model: Luke's trained TinyLlama on RTX 5090`);
    console.log(`   🎯 Status: Ready for testing`);
    console.log(`\n💡 Open your browser and go to http://localhost:${port} to chat with Luke!`);
});

process.on('SIGINT', () => {
    console.log('\n👋 Luke AI Chat Server shutting down...');
    process.exit(0);
});