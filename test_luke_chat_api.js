#!/usr/bin/env node

/**
 * Test Luke AI Chat API
 * Tests the chat API endpoint directly with Luke's trained model
 */

const http = require('http');

// Test Luke's AI model directly via the GPU container first
async function testGPUContainer() {
    console.log('🧪 Testing GPU Container directly...')
    
    const postData = JSON.stringify({
        message: "Hello Luke, what's most important to you in life?"
    });
    
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
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('✅ GPU Container Response:');
                    console.log('   📏 Response length:', response.response?.length || 0, 'chars');
                    console.log('   ⏱️ Inference time:', response.inference_time, 'seconds');
                    console.log('   🎯 Confidence:', response.confidence);
                    console.log('   🔧 Source:', response.source);
                    console.log('   📝 Response preview:', response.response?.substring(0, 150) + '...');
                    console.log('   🖥️ GPU Memory Used:', response.gpu_memory_used, 'GB');
                    resolve(response);
                } catch (e) {
                    reject(new Error('Failed to parse JSON: ' + data));
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        req.write(postData);
        req.end();
    });
}

// Test the Luke AI Model Engine directly
async function testLukeModelEngine() {
    console.log('\n🧪 Testing Luke AI Model Engine...')
    
    const { lukeAIModelEngine } = require('./lib/luke-ai-model-engine');
    
    try {
        // Check status first
        console.log('📊 Checking model status...');
        const status = await lukeAIModelEngine.getStatus();
        console.log('   Model loaded:', status.model_loaded);
        console.log('   Device:', status.device);
        console.log('   Inference count:', status.inference_count);
        
        // Start the model if not ready
        if (!lukeAIModelEngine.isReady()) {
            console.log('⚡ Starting Luke AI model...');
            await lukeAIModelEngine.startLukeAI();
        }
        
        // Create a chat session
        console.log('💬 Creating chat session...');
        const session = await lukeAIModelEngine.createChatSession('Test Chat Session');
        console.log('   Session ID:', session.id);
        console.log('   Session title:', session.title);
        
        // Send a test message
        console.log('🗣️ Sending test message...');
        const testMessage = "Luke, tell me about what matters most to you in your work and personal life?";
        const response = await lukeAIModelEngine.sendMessage(session.id, testMessage);
        
        console.log('✅ Luke Model Response:');
        console.log('   📏 Response length:', response.content.length, 'chars');
        console.log('   ⏱️ Response time:', response.metadata?.responseTime, 'seconds');
        console.log('   📊 Confidence:', response.metadata?.confidence);
        console.log('   🎭 Emotional tone:', response.metadata?.emotionalTone);
        console.log('   🔧 Model version:', response.metadata?.modelVersion);
        console.log('   🎬 Tokens:', response.metadata?.tokens);
        console.log('   📝 Response preview:', response.content.substring(0, 200) + '...');
        
        return {
            success: true,
            sessionId: session.id,
            response: response.content,
            metadata: response.metadata
        };
        
    } catch (error) {
        console.error('❌ Luke Model Engine test failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 Starting Luke AI Chat API Tests\n');
    
    try {
        // Test 1: GPU Container Direct
        const gpuResult = await testGPUContainer();
        
        // Test 2: Luke Model Engine
        const engineResult = await testLukeModelEngine();
        
        console.log('\n📋 Test Summary:');
        console.log('   🐳 GPU Container:', gpuResult.response ? '✅ SUCCESS' : '❌ FAILED');
        console.log('   🤖 Model Engine:', engineResult.success ? '✅ SUCCESS' : '❌ FAILED');
        
        if (gpuResult.response && engineResult.success) {
            console.log('\n🎉 LUKE AI IS FULLY OPERATIONAL!');
            console.log('   The trained Luke model is working correctly');
            console.log('   Both GPU container and model engine are functional');
            console.log('   Ready for chat interface integration');
        } else {
            console.log('\n⚠️ Some components failed - check logs above');
        }
        
    } catch (error) {
        console.error('💥 Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
main().catch(console.error);