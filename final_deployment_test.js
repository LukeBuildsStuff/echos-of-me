#!/usr/bin/env node

/**
 * Final Deployment Test for Luke AI
 * Comprehensive test suite to verify all components are working
 */

const http = require('http');

async function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = res.headers['content-type']?.includes('application/json') 
                        ? JSON.parse(data) 
                        : data;
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function testGPUContainer() {
    console.log('🐳 Testing GPU Container...');
    
    try {
        // Health check
        const health = await makeRequest({
            hostname: 'localhost',
            port: 8000,
            path: '/health',
            method: 'GET'
        });
        
        if (health.status !== 200 || !health.data.model_loaded) {
            throw new Error(`GPU container health check failed: ${JSON.stringify(health.data)}`);
        }
        
        console.log('   ✅ Health check passed');
        console.log(`   📊 Status: ${health.data.status}`);
        console.log(`   🖥️ GPU Available: ${health.data.gpu_available}`);
        console.log(`   🤖 Model Loaded: ${health.data.model_loaded}`);
        console.log(`   💾 GPU Memory: ${health.data.gpu_memory_gb}GB`);
        
        // Chat test
        const chatResponse = await makeRequest({
            hostname: 'localhost',
            port: 8000,
            path: '/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({
            message: "Luke, what's your philosophy on building meaningful technology?"
        }));
        
        if (chatResponse.status !== 200 || !chatResponse.data.response) {
            throw new Error(`GPU container chat failed: ${JSON.stringify(chatResponse.data)}`);
        }
        
        console.log('   ✅ Chat response generated');
        console.log(`   📏 Response: ${chatResponse.data.response.length} chars`);
        console.log(`   ⏱️ Time: ${chatResponse.data.inference_time.toFixed(2)}s`);
        console.log(`   🎯 Confidence: ${chatResponse.data.confidence}`);
        console.log(`   💬 Preview: "${chatResponse.data.response.substring(0, 100)}..."`);
        
        return { success: true, data: chatResponse.data };
        
    } catch (error) {
        console.log(`   ❌ GPU Container failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testChatInterface() {
    console.log('\n🌐 Testing Chat Interface...');
    
    try {
        // Health check
        const health = await makeRequest({
            hostname: 'localhost',
            port: 4000,
            path: '/api/health',
            method: 'GET'
        });
        
        if (health.status !== 200) {
            throw new Error(`Chat interface health check failed: ${health.status}`);
        }
        
        console.log('   ✅ Health check passed');
        console.log(`   🖥️ Server: ${health.data.server}`);
        console.log(`   🤖 Luke Model: ${health.data.luke_model}`);
        
        // Chat API test
        const chatResponse = await makeRequest({
            hostname: 'localhost',
            port: 4000,
            path: '/api/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({
            message: "What advice would you give to someone who wants to make a positive impact through technology?"
        }));
        
        if (chatResponse.status !== 200 || !chatResponse.data.response) {
            throw new Error(`Chat API failed: ${JSON.stringify(chatResponse.data)}`);
        }
        
        console.log('   ✅ Chat API working');
        console.log(`   📏 Response: ${chatResponse.data.response.length} chars`);
        console.log(`   ⏱️ Time: ${chatResponse.data.inference_time.toFixed(2)}s`);
        console.log(`   🎯 Confidence: ${chatResponse.data.confidence}`);
        console.log(`   🔧 Source: ${chatResponse.data.source}`);
        console.log(`   📱 Model: ${chatResponse.data.modelVersion}`);
        console.log(`   💬 Preview: "${chatResponse.data.response.substring(0, 100)}..."`);
        
        return { success: true, data: chatResponse.data };
        
    } catch (error) {
        console.log(`   ❌ Chat Interface failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testWebInterface() {
    console.log('\n🖥️ Testing Web Interface...');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 4000,
            path: '/',
            method: 'GET'
        });
        
        if (response.status !== 200) {
            throw new Error(`Web interface failed: ${response.status}`);
        }
        
        const htmlContent = response.data;
        const hasTitle = htmlContent.includes('Chat with Luke AI');
        const hasChat = htmlContent.includes('messagesDiv');
        const hasInput = htmlContent.includes('messageInput');
        
        if (!hasTitle || !hasChat || !hasInput) {
            throw new Error('Web interface missing required elements');
        }
        
        console.log('   ✅ Web interface loaded');
        console.log('   📄 HTML page generated correctly');
        console.log('   🎨 Chat UI elements present');
        console.log('   💬 JavaScript chat functionality included');
        console.log('   🌐 Available at: http://localhost:4000');
        
        return { success: true };
        
    } catch (error) {
        console.log(`   ❌ Web Interface failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runQualityAssessment(responses) {
    console.log('\n🎯 Quality Assessment...');
    
    const allResponses = responses.filter(r => r.success && r.data.response).map(r => r.data.response);
    
    if (allResponses.length === 0) {
        console.log('   ⚠️ No responses to analyze');
        return;
    }
    
    // Analyze response characteristics
    const avgLength = Math.round(allResponses.reduce((sum, r) => sum + r.length, 0) / allResponses.length);
    const avgInferenceTime = responses
        .filter(r => r.success && r.data.inference_time)
        .reduce((sum, r) => sum + r.data.inference_time, 0) / responses.length;
    
    // Check for authenticity indicators
    const authenticityChecks = allResponses.map(response => {
        const text = response.toLowerCase();
        const indicators = [
            text.includes('from my experience'),
            text.includes('i\'ve learned'),
            text.includes('i believe'),
            text.includes('in my view'),
            text.includes('personally'),
            text.includes('what i\'ve found'),
            text.includes('looking back'),
            text.includes('i think')
        ];
        return indicators.filter(Boolean).length;
    });
    
    const avgAuthenticity = Math.round(authenticityChecks.reduce((sum, score) => sum + score, 0) / authenticityChecks.length * 10) / 10;
    
    console.log(`   📊 Average Response Length: ${avgLength} characters`);
    console.log(`   ⏱️ Average Inference Time: ${avgInferenceTime.toFixed(2)} seconds`);
    console.log(`   🎭 Authenticity Score: ${avgAuthenticity}/8 indicators per response`);
    console.log(`   🤖 Model Performance: ${avgInferenceTime < 6 ? 'Excellent' : avgInferenceTime < 10 ? 'Good' : 'Needs optimization'}`);
    console.log(`   🎯 Response Quality: ${avgLength > 200 ? 'Detailed' : avgLength > 100 ? 'Adequate' : 'Brief'}`);
}

async function main() {
    console.log('🚀 Luke AI Final Deployment Test Suite');
    console.log('=====================================\n');
    
    const results = {
        gpuContainer: null,
        chatInterface: null,
        webInterface: null
    };
    
    // Run all tests
    results.gpuContainer = await testGPUContainer();
    results.chatInterface = await testChatInterface();
    results.webInterface = await testWebInterface();
    
    // Quality assessment
    await runQualityAssessment([results.gpuContainer, results.chatInterface]);
    
    // Final summary
    console.log('\n📋 Final Test Summary');
    console.log('====================');
    
    const gpuStatus = results.gpuContainer.success ? '✅ PASS' : '❌ FAIL';
    const chatStatus = results.chatInterface.success ? '✅ PASS' : '❌ FAIL';
    const webStatus = results.webInterface.success ? '✅ PASS' : '❌ FAIL';
    
    console.log(`🐳 GPU Container:     ${gpuStatus}`);
    console.log(`🌐 Chat Interface:    ${chatStatus}`);
    console.log(`🖥️ Web Interface:     ${webStatus}`);
    
    const allPassed = results.gpuContainer.success && results.chatInterface.success && results.webInterface.success;
    
    if (allPassed) {
        console.log('\n🎉 DEPLOYMENT VERIFICATION: SUCCESS!');
        console.log('====================================');
        console.log('✅ Luke AI is fully operational');
        console.log('✅ All components working correctly');
        console.log('✅ Model generating responses');
        console.log('✅ Chat interface accessible');
        console.log('✅ Ready for production use');
        console.log('\n💬 Start chatting: http://localhost:4000');
        console.log('🔧 Direct API: curl -X POST -H "Content-Type: application/json" -d \'{"message": "Hello Luke!"}\' http://localhost:4000/api/chat');
    } else {
        console.log('\n⚠️ DEPLOYMENT VERIFICATION: ISSUES FOUND');
        console.log('=========================================');
        
        if (!results.gpuContainer.success) {
            console.log(`❌ GPU Container: ${results.gpuContainer.error}`);
        }
        if (!results.chatInterface.success) {
            console.log(`❌ Chat Interface: ${results.chatInterface.error}`);
        }
        if (!results.webInterface.success) {
            console.log(`❌ Web Interface: ${results.webInterface.error}`);
        }
        
        process.exit(1);
    }
}

main().catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
});