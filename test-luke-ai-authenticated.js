const axios = require('axios');
const fs = require('fs');

class AuthenticatedLukeAITester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.sessionCookie = null;
    this.testResults = {
      authentication: null,
      aiChatTests: [],
      consoleCapture: [],
      responseAnalysis: [],
      overallAssessment: null
    };
  }

  async authenticate() {
    console.log('🔐 Authenticating with credentials...');
    
    try {
      // First, get the CSRF token
      const csrfResponse = await axios.get(`${this.baseURL}/api/auth/csrf`);
      const csrfToken = csrfResponse.data.csrfToken;
      
      // Then authenticate using NextAuth credentials
      const authResponse = await axios.post(`${this.baseURL}/api/auth/callback/credentials`, {
        email: 'lukemoeller@yahoo.com',
        password: 'password123',
        csrfToken: csrfToken
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': csrfResponse.headers['set-cookie']?.join('; ') || ''
        },
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });
      
      // Extract session cookie from response
      const cookies = authResponse.headers['set-cookie'];
      if (cookies) {
        this.sessionCookie = cookies.find(cookie => 
          cookie.includes('next-auth.session-token') || 
          cookie.includes('__Secure-next-auth.session-token')
        );
      }
      
      console.log('Auth response status:', authResponse.status);
      console.log('Session cookie found:', !!this.sessionCookie);
      
      // Test if we're authenticated by accessing a protected endpoint
      const testResponse = await axios.get(`${this.baseURL}/api/user/profile`, {
        headers: {
          'Cookie': this.sessionCookie || ''
        },
        withCredentials: true,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      const isAuthenticated = testResponse.status === 200;
      
      this.testResults.authentication = {
        success: isAuthenticated,
        method: 'NextAuth credentials',
        status: testResponse.status,
        hasCookie: !!this.sessionCookie,
        timestamp: new Date().toISOString()
      };
      
      console.log(isAuthenticated ? '✅ Authentication successful' : '❌ Authentication failed');
      return isAuthenticated;
      
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      this.testResults.authentication = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async testAIChatMessage(question, expectedPersonality = []) {
    console.log(`\\n💬 Testing: "${question}"`);
    
    try {
      const chatPayload = {
        message: question,
        sessionId: `test-session-${Date.now()}`,
        includeVoice: false,
        isDemo: false
      };
      
      console.log('Sending chat request...');
      const response = await axios.post(`${this.baseURL}/api/ai-echo/chat`, chatPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.sessionCookie || ''
        },
        withCredentials: true,
        timeout: 30000 // 30 second timeout for AI generation
      });
      
      const data = response.data;
      
      // Analyze response
      const analysis = this.analyzeResponse(data, expectedPersonality);
      
      const testResult = {
        question,
        response: data.response,
        confidence: data.confidence,
        source: data.source,
        modelVersion: data.modelVersion,
        emotionalTone: data.emotionalTone,
        sessionId: data.sessionId,
        voiceAvailable: !!data.voice,
        analysis,
        modelInfo: data.modelInfo,
        trainingData: data.trainingData,
        debug: data.debug,
        timestamp: new Date().toISOString()
      };
      
      this.testResults.aiChatTests.push(testResult);
      
      console.log(`📝 Response (${data.response.length} chars):`, data.response.substring(0, 200) + '...');
      console.log(`🎯 Source: ${data.source} (Confidence: ${data.confidence})`);
      console.log(`🤖 Model: ${data.modelVersion} | Tone: ${data.emotionalTone}`);
      console.log(`✨ Authenticity: ${analysis.isAuthentic ? 'LUKE PERSONALITY' : 'GENERIC FALLBACK'}`);
      console.log(`🎙️ Voice: ${testResult.voiceAvailable ? 'Available' : 'Not generated'}`);
      
      return testResult;
      
    } catch (error) {
      console.error(`❌ Chat test failed: ${error.message}`);
      const errorResult = {
        question,
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      };
      this.testResults.aiChatTests.push(errorResult);
      return errorResult;
    }
  }

  analyzeResponse(data, expectedPersonality) {
    const response = data.response.toLowerCase();
    
    // Check for Luke's personal voice indicators
    const personalVoiceIndicators = [
      response.includes('from my experience'),
      response.includes("i've learned"),
      response.includes('i remember'),
      response.includes('in my view'),
      response.includes('looking back'),
      response.includes("what i've found"),
      response.includes('personally'),
      response.includes('my perspective'),
      response.includes('i believe'),
      response.includes('in my opinion')
    ];
    
    const personalPronounCount = (response.match(/\b(i|my|me|myself)\b/gi) || []).length;
    
    // Check for generic grief counseling phrases (should NOT appear)
    const genericPhrases = [
      'i am sorry for your loss',
      'grief counseling',
      'please seek professional help',
      'i cannot provide therapy',
      'as an ai',
      "i'm an artificial intelligence",
      'as a language model'
    ];
    
    const hasGenericPhrases = genericPhrases.some(phrase => response.includes(phrase));
    
    // Check for expected personality traits
    const personalityMatch = expectedPersonality.length === 0 || 
      expectedPersonality.some(trait => response.includes(trait.toLowerCase()));
    
    const personalVoiceScore = personalVoiceIndicators.filter(Boolean).length;
    
    return {
      isAuthentic: personalVoiceScore >= 1 && !hasGenericPhrases && personalPronounCount >= 2,
      personalVoiceScore: personalVoiceScore,
      personalPronounCount: personalPronounCount,
      hasGenericPhrases: hasGenericPhrases,
      personalityMatch: personalityMatch,
      isTrainedModel: data.source === 'luke_trained_model',
      confidence: data.confidence,
      responseLength: data.response.length
    };
  }

  async runFullTest() {
    console.log('🚀 Starting authenticated Luke AI testing...');
    console.log('================================================');
    
    // Step 1: Authenticate
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('❌ Cannot proceed without authentication');
      return this.generateReport();
    }
    
    // Step 2: Test specific questions
    const testQuestions = [
      {
        question: "What's the most important thing you've learned in life?",
        expectedPersonality: ['learn', 'life', 'important', 'experience', 'wisdom']
      },
      {
        question: "Tell me about your philosophy on work",
        expectedPersonality: ['work', 'philosophy', 'believe', 'approach']
      },
      {
        question: "What advice would you give about handling challenges?",
        expectedPersonality: ['advice', 'challenge', 'difficulty', 'overcome', 'learn']
      },
      {
        question: "What matters most to you in relationships?",
        expectedPersonality: ['relationship', 'matter', 'important', 'love', 'connection']
      }
    ];
    
    for (const test of testQuestions) {
      await this.testAIChatMessage(test.question, test.expectedPersonality);
      
      // Wait between requests to allow processing
      if (testQuestions.indexOf(test) < testQuestions.length - 1) {
        console.log('⏳ Waiting 5 seconds before next question...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return this.generateReport();
  }

  generateReport() {
    const successfulTests = this.testResults.aiChatTests.filter(t => t.response && !t.error);
    const authenticResponses = this.testResults.aiChatTests.filter(t => t.analysis?.isAuthentic);
    const trainedModelResponses = this.testResults.aiChatTests.filter(t => t.analysis?.isTrainedModel);
    
    const summary = {
      authentication: this.testResults.authentication?.success || false,
      totalTests: this.testResults.aiChatTests.length,
      successfulTests: successfulTests.length,
      authenticResponses: authenticResponses.length,
      trainedModelResponses: trainedModelResponses.length,
      avgConfidence: successfulTests.length > 0 ? 
        (successfulTests.reduce((sum, t) => sum + (t.confidence || 0), 0) / successfulTests.length).toFixed(2) : 0,
      avgResponseLength: successfulTests.length > 0 ?
        Math.round(successfulTests.reduce((sum, t) => sum + (t.response?.length || 0), 0) / successfulTests.length) : 0
    };
    
    this.testResults.overallAssessment = summary;
    
    // Save detailed report
    const reportPath = './luke-ai-authenticated-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    
    console.log('\\n📋 LUKE AI TESTING RESULTS:');
    console.log('=====================================');
    console.log(`Authentication: ${summary.authentication ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Chat Tests: ${summary.successfulTests}/${summary.totalTests} successful`);
    console.log(`Authentic Luke Responses: ${summary.authenticResponses}/${summary.totalTests} (${((summary.authenticResponses/summary.totalTests)*100).toFixed(1)}%)`);
    console.log(`Trained Model Used: ${summary.trainedModelResponses}/${summary.totalTests} (${((summary.trainedModelResponses/summary.totalTests)*100).toFixed(1)}%)`);
    console.log(`Average Confidence: ${summary.avgConfidence}`);
    console.log(`Average Response Length: ${summary.avgResponseLength} characters`);
    
    console.log('\\n🔍 INDIVIDUAL TEST RESULTS:');
    this.testResults.aiChatTests.forEach((test, i) => {
      if (test.error) {
        console.log(`${i + 1}. ❌ FAILED: ${test.question}`);
        console.log(`   Error: ${test.error}`);
      } else {
        const authIcon = test.analysis?.isAuthentic ? '✅' : '⚠️';
        const modelIcon = test.analysis?.isTrainedModel ? '🤖' : '🔄';
        console.log(`${i + 1}. ${authIcon} ${modelIcon} ${test.question}`);
        console.log(`   Source: ${test.source} | Confidence: ${test.confidence}`);
        console.log(`   Personal Voice Score: ${test.analysis?.personalVoiceScore}/10`);
        console.log(`   Response: "${test.response.substring(0, 100)}..."`);
      }
    });
    
    console.log('\\n📊 CONSOLE LOG ANALYSIS:');
    
    // Check if we captured any success logs
    const hasSuccessLogs = this.testResults.aiChatTests.some(test => 
      test.debug?.modelEngineReady || 
      test.source === 'luke_trained_model'
    );
    
    console.log(`Console Success Logging: ${hasSuccessLogs ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
    console.log(`Model Engine Ready: ${this.testResults.aiChatTests.some(t => t.debug?.modelEngineReady) ? '✅ YES' : '❌ NO'}`);
    
    console.log('\\n🎯 RECOMMENDATIONS:');
    if (summary.authenticResponses < summary.totalTests) {
      console.log('- Response authenticity could be improved - check training data quality');
    }
    if (summary.trainedModelResponses < summary.totalTests) {
      console.log('- Not all responses used trained model - verify model deployment');
    }
    if (summary.avgConfidence < 0.8) {
      console.log('- Low confidence scores - consider additional training');
    }
    if (!hasSuccessLogs) {
      console.log('- Console success logging not detected - check log implementation');
    }
    
    console.log(`\\n📁 Detailed report saved: ${reportPath}`);
    
    return this.testResults;
  }
}

// Run the test
async function main() {
  const tester = new AuthenticatedLukeAITester();
  await tester.runFullTest();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AuthenticatedLukeAITester;