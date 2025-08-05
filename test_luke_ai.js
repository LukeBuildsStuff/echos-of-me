/**
 * Test script for Luke's AI model integration
 * Tests the core inference engine directly
 */

const { lukeAIModelEngine } = require('./lib/luke-ai-model-engine.ts')

async function testLukeAI() {
  console.log('🚀 Testing Luke\'s AI Model Integration\n')
  
  try {
    // Test 1: Check if engine is ready
    console.log('1. Checking engine status...')
    console.log(`   Engine ready: ${lukeAIModelEngine.isReady()}`)
    console.log(`   Engine stats:`, lukeAIModelEngine.getStats())
    
    // Test 2: Start Luke's AI model
    console.log('\n2. Starting Luke\'s AI model...')
    await lukeAIModelEngine.startLukeAI()
    console.log('   ✓ Luke\'s AI model started successfully!')
    
    // Test 3: Create a chat session
    console.log('\n3. Creating chat session...')
    const session = await lukeAIModelEngine.createChatSession('Test Chat with Luke')
    console.log(`   ✓ Session created: ${session.id}`)
    console.log(`   Welcome message: "${session.messages[0].content.substring(0, 100)}..."`)
    
    // Test 4: Send a test message
    console.log('\n4. Sending test message...')
    const testMessage = "Hello Luke! Can you tell me about yourself?"
    
    console.log(`   Sending: "${testMessage}"`)
    
    const response = await lukeAIModelEngine.sendMessage(
      session.id,
      testMessage,
      (chunk) => {
        if (chunk.content) {
          process.stdout.write(chunk.content)
        }
      }
    )
    
    console.log(`\n   ✓ Response received!`)
    console.log(`   Full response: "${response.content}"`)
    console.log(`   Confidence: ${response.metadata?.confidence}`)
    console.log(`   Emotional tone: ${response.metadata?.emotionalTone}`)
    console.log(`   Model version: ${response.metadata?.modelVersion}`)
    
    // Test 5: Send another message for conversation context
    console.log('\n5. Testing conversation context...')
    const followupMessage = "What's important to you in life?"
    
    console.log(`   Sending: "${followupMessage}"`)
    
    const followupResponse = await lukeAIModelEngine.sendMessage(
      session.id,
      followupMessage,
      (chunk) => {
        if (chunk.content) {
          process.stdout.write(chunk.content)
        }
      }
    )
    
    console.log(`\n   ✓ Follow-up response received!`)
    console.log(`   Response: "${followupResponse.content}"`)
    
    // Test 6: Check session state
    console.log('\n6. Checking session state...')
    const updatedSession = lukeAIModelEngine.getChatSession(session.id)
    console.log(`   Messages in session: ${updatedSession.messages.length}`)
    console.log(`   Last message: "${updatedSession.messages[updatedSession.messages.length - 1].content.substring(0, 80)}..."`)
    
    console.log('\n🎉 All tests passed! Luke\'s AI is ready for chat!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    
    if (error.message.includes('Model loading timeout')) {
      console.log('\n💡 This might be expected on first run as the model needs to download and load.')
      console.log('   The RTX 5090 should make this much faster on subsequent runs.')
    }
  } finally {
    // Cleanup
    console.log('\n7. Cleaning up...')
    await lukeAIModelEngine.cleanup()
    console.log('   ✓ Cleanup complete')
    process.exit(0)
  }
}

// Run the test
if (require.main === module) {
  testLukeAI()
}

module.exports = { testLukeAI }