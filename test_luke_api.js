#!/usr/bin/env node

/**
 * Test Luke's AI API to verify the trained model is working
 */

const https = require('https')
const fs = require('fs')

console.log('=== Testing Luke AI API ===\n')

// First, let's start the development server and test the API
console.log('🚀 Starting test of Luke AI API...')
console.log('Note: Make sure the development server is running with "npm run dev"')

const testMessage = "What's the most important thing you've learned in life?"

console.log(`💬 Test message: "${testMessage}"`)
console.log('\n📋 Instructions for manual testing:')
console.log('1. Start the development server: npm run dev')
console.log('2. Go to the AI Echo page at http://localhost:3000/ai-echo')
console.log('3. Send this message: "What\'s the most important thing you\'ve learned in life?"')
console.log('4. Watch the browser console logs for these indicators:')
console.log('   ✅ "🧠 Generating response using Luke\'s trained TinyLlama model..."')
console.log('   ✅ "✅ LUKE TRAINED MODEL SUCCESS: Generated X chars in Yms"')
console.log('   ✅ "🎯 Source: luke_trained_model, Version: tinyllama-luke-v1.0"')
console.log('\n🔍 What to look for in the response:')
console.log('- Personal, thoughtful tone (not generic)')
console.log('- References to life experiences and wisdom')
console.log('- Warm, caring language')
console.log('- Mentions of relationships, family, or personal growth')
console.log('\n❌ If you see these, the fallback is being used:')
console.log('   "❌ LUKE TRAINED MODEL FAILED - falling back to synthesis"')
console.log('   "⚠️ FALLBACK USED: response_synthesis"')

console.log('\n🧪 Testing model infrastructure directly...')

// Test the infrastructure first
const { spawn } = require('child_process')

function testInfrastructure() {
  return new Promise((resolve) => {
    console.log('🔧 Checking if Luke AI model engine can start...')
    
    const testScript = `
import sys
sys.path.append('/home/luke/personal-ai-clone/web')

from lib.luke_ai_model_engine import LukeAIInference

try:
    print("🚀 Testing Luke AI infrastructure...")
    
    luke_ai = LukeAIInference("/home/luke/personal-ai-clone/web/training/final_model")
    print("✅ Luke's AI model loaded successfully!")
    
    # Test a simple request
    test_request = {
        'message': 'Hello, Luke. How are you?',
        'context': [],
        'session_id': 'test_session'
    }
    
    print("🧠 Testing inference...")
    luke_ai.generate_luke_response(test_request)
    print("✅ Inference test completed!")
    
except Exception as e:
    print(f"❌ Infrastructure test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
`
    
    const python = spawn('python3', ['-c', testScript], { stdio: 'pipe' })
    
    let success = false
    
    python.stdout.on('data', (data) => {
      const output = data.toString()
      console.log(output.trim())
      
      if (output.includes('Luke\'s AI model loaded successfully!')) {
        success = true
      }
    })
    
    python.stderr.on('data', (data) => {
      console.log(data.toString().trim())
    })
    
    python.on('close', (code) => {
      if (code === 0 && success) {
        console.log('\n✅ Infrastructure test PASSED')
        console.log('🎯 Luke\'s trained model is ready for API usage!')
      } else {
        console.log('\n❌ Infrastructure test FAILED')
        console.log('⚠️ The API will fall back to response synthesis')
      }
      resolve(code === 0)
    })
    
    python.on('error', (error) => {
      console.log(`❌ Python error: ${error.message}`)
      resolve(false)
    })
  })
}

// Run the infrastructure test
testInfrastructure().then((success) => {
  if (success) {
    console.log('\n🎉 SUMMARY: Luke\'s trained model is functional!')
    console.log('📝 Users should now get responses from Luke\'s trained TinyLlama model')
    console.log('🔍 Check the browser console logs to confirm the trained model is being used')
  } else {
    console.log('\n❌ SUMMARY: Luke\'s trained model has issues')
    console.log('⚠️ Users will get fallback responses instead of the trained model')
    console.log('🔧 Review the error logs above to fix the issues')
  }
}).catch(console.error)