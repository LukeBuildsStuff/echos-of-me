#!/usr/bin/env node

/**
 * Test Luke's AI integration by simulating the actual API flow
 */

const { lukeAIModelEngine } = require('./lib/luke-ai-model-engine')

console.log('=== Live Luke AI Integration Test ===\n')

async function testLukeAIIntegration() {
  try {
    console.log('🚀 Testing Luke AI Model Engine...')
    
    // Check if ready
    console.log(`📊 Initial status: ${lukeAIModelEngine.isReady() ? 'Ready' : 'Not Ready'}`)
    
    // Start the engine
    console.log('⚡ Starting Luke AI engine...')
    await lukeAIModelEngine.startLukeAI()
    
    console.log('✅ Luke AI engine started successfully!')
    console.log(`📊 Status after start: ${lukeAIModelEngine.isReady() ? 'Ready' : 'Not Ready'}`)
    
    // Create a chat session
    console.log('📝 Creating chat session...')
    const session = await lukeAIModelEngine.createChatSession('Test Chat')
    console.log(`✅ Session created: ${session.id}`)
    
    // Send a test message
    console.log('💬 Sending test message...')
    const testMessage = "What's the most important thing you've learned in life?"
    
    let streamingContent = ''
    const response = await lukeAIModelEngine.sendMessage(
      session.id,
      testMessage,
      (chunk) => {
        // Handle streaming
        streamingContent += chunk.content
        if (!chunk.isComplete) {
          process.stdout.write(chunk.content)
        }
      }
    )
    
    console.log('\n\n🎉 LUKE AI RESPONSE:')
    console.log('=' * 50)
    console.log(response.content)
    console.log('=' * 50)
    
    console.log('\n📊 Response Metadata:')
    console.log(`   Confidence: ${response.metadata?.confidence || 'N/A'}`)
    console.log(`   Emotional Tone: ${response.metadata?.emotionalTone || 'N/A'}`)
    console.log(`   Model Version: ${response.metadata?.modelVersion || 'N/A'}`)
    console.log(`   Response Time: ${response.metadata?.responseTime || 'N/A'}ms`)
    
    // Get engine stats
    const stats = lukeAIModelEngine.getStats()
    console.log('\n🔧 Engine Statistics:')
    console.log(`   Model Loaded: ${stats.isModelLoaded}`)
    console.log(`   Active Sessions: ${stats.activeSessions}`)
    console.log(`   Model Path: ${stats.modelPath}`)
    console.log(`   Process ID: ${stats.processId || 'N/A'}`)
    
    console.log('\n✅ INTEGRATION TEST PASSED!')
    console.log('🎯 Luke\'s trained model is working through the API!')
    
    // Cleanup
    await lukeAIModelEngine.cleanup()
    console.log('🧹 Cleanup completed')
    
    return true
    
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:')
    console.error(error.message)
    console.error('\nFull error:', error)
    
    // Try to cleanup even on error
    try {
      await lukeAIModelEngine.cleanup()
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message)
    }
    
    return false
  }
}

// Run the integration test
testLukeAIIntegration().then((success) => {
  if (success) {
    console.log('\n🎉 CONCLUSION: Luke\'s AI is fully functional!')
    console.log('Users will now get responses from Luke\'s trained model!')
  } else {
    console.log('\n❌ CONCLUSION: Luke\'s AI needs attention')
    console.log('Users will get fallback responses instead')
  }
  
  process.exit(success ? 0 : 1)
}).catch((error) => {
  console.error('Test runner error:', error)
  process.exit(1)
})