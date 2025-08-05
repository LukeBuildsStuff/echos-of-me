/**
 * Direct Luke AI Model Test
 * Tests the trained model without authentication
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DirectLukeAITester {
  constructor() {
    this.pythonScriptPath = '/home/luke/personal-ai-clone/web/luke_ai_inference_engine.py';
    this.testResults = {
      modelStatus: null,
      chatTests: [],
      consoleCapture: [],
      performanceMetrics: [],
      authenticity: []
    };
    this.testQuestions = [
      "What's the most important thing you've learned in life?",
      "Tell me about your philosophy on work",
      "What advice would you give about handling challenges?",
      "What matters most to you in relationships?"
    ];
  }

  async testPythonInference(prompt) {
    return new Promise((resolve, reject) => {
      console.log(`🐍 Testing Python inference: "${prompt.substring(0, 50)}..."`);
      
      const startTime = Date.now();
      const python = spawn('python3', [this.pythonScriptPath, prompt], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let consoleOutput = [];

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        const stderrText = data.toString();
        stderr += stderrText;
        consoleOutput.push(stderrText.trim());
        
        // Log in real-time
        if (stderrText.trim()) {
          console.log(`   🖥️ ${stderrText.trim()}`);
        }
      });

      python.on('close', (code) => {
        const processingTime = Date.now() - startTime;
        console.log(`   ⏱️ Process completed in ${processingTime}ms with code ${code}`);
        
        if (code === 0) {
          try {
            const response = JSON.parse(stdout.trim());
            
            const result = {
              success: true,
              response,
              processingTime,
              consoleOutput,
              timestamp: new Date().toISOString()
            };
            
            console.log(`   ✅ Response: "${response.response?.substring(0, 100) || 'No response'}..."`);
            console.log(`   📊 Tokens: ${response.tokens_generated || 'N/A'} | Speed: ${response.tokens_per_second?.toFixed(1) || 'N/A'} tok/s`);
            
            resolve(result);
          } catch (error) {
            console.log(`   ❌ JSON Parse Error: ${error.message}`);
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          console.log(`   ❌ Python process failed with code ${code}`);
          console.log(`   📝 Error output: ${stderr.substring(0, 300)}`);
          reject(new Error(`Python process failed: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        console.log(`   ❌ Failed to start Python process: ${error.message}`);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  async testModelStatus() {
    console.log('🔍 Testing model status...');
    
    try {
      const result = await this.testPythonInference('status');
      
      this.testResults.modelStatus = {
        modelLoaded: result.response.model_loaded,
        device: result.response.device,
        inferenceCount: result.response.inference_count,
        totalTokens: result.response.total_tokens_generated,
        gpuMemory: result.response.gpu_memory,
        error: result.response.error,
        processingTime: result.processingTime,
        timestamp: result.timestamp
      };
      
      console.log(`📊 Model Status:`, {
        loaded: result.response.model_loaded,
        device: result.response.device,
        inferences: result.response.inference_count,
        tokens: result.response.total_tokens_generated
      });
      
      return result.response.model_loaded;
      
    } catch (error) {
      console.error('❌ Model status test failed:', error.message);
      this.testResults.modelStatus = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async testChatQuestion(question, index) {
    console.log(`\\n💬 Test ${index + 1}: "${question}"`);
    
    try {
      const result = await this.testPythonInference(question);
      
      // Analyze response authenticity
      const analysis = this.analyzeResponseAuthenticity(result.response.response, question);
      
      const testResult = {
        question,
        response: result.response.response,
        tokensGenerated: result.response.tokens_generated,
        generationTime: result.response.generation_time,
        tokensPerSecond: result.response.tokens_per_second,
        processingTime: result.processingTime,
        analysis,
        consoleOutput: result.consoleOutput,
        timestamp: result.timestamp
      };
      
      this.testResults.chatTests.push(testResult);
      
      console.log(`   📏 Response length: ${testResult.response.length} chars`);
      console.log(`   🎬 Tokens: ${testResult.tokensGenerated} | Speed: ${testResult.tokensPerSecond?.toFixed(1)} tok/s`);
      console.log(`   ✨ Authenticity: ${analysis.isAuthentic ? 'LUKE PERSONALITY' : 'GENERIC'}`);
      console.log(`   🔤 Personal pronouns: ${analysis.personalPronounCount}`);
      console.log(`   🎯 Voice indicators: ${analysis.personalVoiceScore}/10`);
      
      return testResult;
      
    } catch (error) {
      console.error(`   ❌ Chat test failed: ${error.message}`);
      const errorResult = {
        question,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.testResults.chatTests.push(errorResult);
      return errorResult;
    }
  }

  analyzeResponseAuthenticity(response, question) {
    if (!response) return { isAuthentic: false, reason: 'No response' };
    
    const lowerResponse = response.toLowerCase();
    
    // Check for Luke's personal voice indicators
    const personalVoiceIndicators = [
      lowerResponse.includes('from my experience'),
      lowerResponse.includes("i've learned"),
      lowerResponse.includes('i remember'),
      lowerResponse.includes('in my view'),
      lowerResponse.includes('looking back'),
      lowerResponse.includes("what i've found"),
      lowerResponse.includes('personally'),
      lowerResponse.includes('my perspective'),
      lowerResponse.includes('i believe'),
      lowerResponse.includes('in my opinion')
    ];
    
    const personalPronounCount = (response.match(/\b(i|my|me|myself)\b/gi) || []).length;
    
    // Check for generic AI phrases (bad signs)
    const genericPhrases = [
      'i am sorry for your loss',
      'grief counseling',
      'please seek professional help',
      'i cannot provide therapy',
      'as an ai',
      "i'm an artificial intelligence",
      'as a language model',
      "i don't have personal experiences"
    ];
    
    const hasGenericPhrases = genericPhrases.some(phrase => lowerResponse.includes(phrase));
    
    // Check for conversational depth
    const conversationalIndicators = [
      response.length > 50, // Substantial response
      lowerResponse.includes('because'),
      lowerResponse.includes('when'),
      lowerResponse.includes('that'),
      response.split('.').length > 2 // Multiple sentences
    ];
    
    const personalVoiceScore = personalVoiceIndicators.filter(Boolean).length;
    const conversationalScore = conversationalIndicators.filter(Boolean).length;
    
    // Determine authenticity
    const isAuthentic = personalVoiceScore >= 1 && 
                       !hasGenericPhrases && 
                       personalPronounCount >= 2 &&
                       conversationalScore >= 3;
    
    return {
      isAuthentic,
      personalVoiceScore,
      personalPronounCount,
      conversationalScore,
      hasGenericPhrases,
      responseLength: response.length,
      reason: !isAuthentic ? this.getAuthenticityFailureReason(personalVoiceScore, hasGenericPhrases, personalPronounCount, conversationalScore) : 'Authentic Luke voice detected'
    };
  }

  getAuthenticityFailureReason(voiceScore, hasGeneric, pronounCount, convScore) {
    if (hasGeneric) return 'Contains generic AI phrases';
    if (pronounCount < 2) return 'Insufficient personal pronouns';
    if (voiceScore < 1) return 'No personal voice indicators';
    if (convScore < 3) return 'Lacks conversational depth';
    return 'Multiple authenticity issues';
  }

  async runFullTest() {
    console.log('🚀 Starting Direct Luke AI Model Test');
    console.log('=====================================');
    
    // Step 1: Test model status
    const modelReady = await this.testModelStatus();
    if (!modelReady) {
      console.log('❌ Model not ready - cannot proceed with chat tests');
      return this.generateReport();
    }
    
    // Step 2: Test each question
    for (let i = 0; i < this.testQuestions.length; i++) {
      await this.testChatQuestion(this.testQuestions[i], i);
      
      // Wait between tests
      if (i < this.testQuestions.length - 1) {
        console.log('   ⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    return this.generateReport();
  }

  generateReport() {
    const successfulTests = this.testResults.chatTests.filter(t => t.response && !t.error);
    const authenticResponses = this.testResults.chatTests.filter(t => t.analysis?.isAuthentic);
    
    const summary = {
      modelStatus: this.testResults.modelStatus?.modelLoaded || false,
      totalTests: this.testResults.chatTests.length,
      successfulTests: successfulTests.length,
      authenticResponses: authenticResponses.length,
      avgTokensGenerated: successfulTests.length > 0 ? 
        Math.round(successfulTests.reduce((sum, t) => sum + (t.tokensGenerated || 0), 0) / successfulTests.length) : 0,
      avgProcessingTime: successfulTests.length > 0 ?
        Math.round(successfulTests.reduce((sum, t) => sum + (t.processingTime || 0), 0) / successfulTests.length) : 0,
      avgTokensPerSecond: successfulTests.length > 0 ?
        (successfulTests.reduce((sum, t) => sum + (t.tokensPerSecond || 0), 0) / successfulTests.length).toFixed(1) : 0,
      device: this.testResults.modelStatus?.device || 'Unknown'
    };
    
    // Save detailed report
    const reportPath = './luke-ai-direct-test-report.json';
    const fullReport = {
      summary,
      testResults: this.testResults,
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
    
    console.log('\\n📋 DIRECT LUKE AI TEST RESULTS:');
    console.log('====================================');
    console.log(`Model Status: ${summary.modelStatus ? '✅ LOADED' : '❌ NOT LOADED'}`);
    console.log(`Device: ${summary.device}`);
    console.log(`Chat Tests: ${summary.successfulTests}/${summary.totalTests} successful`);
    console.log(`Authentic Responses: ${summary.authenticResponses}/${summary.totalTests} (${((summary.authenticResponses/summary.totalTests)*100).toFixed(1)}%)`);
    console.log(`Avg Tokens Generated: ${summary.avgTokensGenerated}`);
    console.log(`Avg Processing Time: ${summary.avgProcessingTime}ms`);
    console.log(`Avg Speed: ${summary.avgTokensPerSecond} tokens/sec`);
    
    console.log('\\n🔍 INDIVIDUAL TEST RESULTS:');
    this.testResults.chatTests.forEach((test, i) => {
      if (test.error) {
        console.log(`${i + 1}. ❌ FAILED: ${test.question}`);
        console.log(`   Error: ${test.error}`);
      } else {
        const authIcon = test.analysis?.isAuthentic ? '✅' : '⚠️';
        console.log(`${i + 1}. ${authIcon} ${test.question}`);
        console.log(`   Tokens: ${test.tokensGenerated} | Speed: ${test.tokensPerSecond?.toFixed(1)} tok/s`);
        console.log(`   Authenticity: ${test.analysis?.reason || 'Unknown'}`);
        console.log(`   Response: "${test.response.substring(0, 100)}..."`);
      }
    });
    
    console.log('\\n🎯 SUCCESS CRITERIA VERIFICATION:');
    console.log(`✅ Model loads and responds: ${summary.successfulTests > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Authentic Luke personality: ${summary.authenticResponses >= 2 ? 'PASS' : 'FAIL'} (${summary.authenticResponses}/4 authentic)`);
    console.log(`✅ Response performance: ${summary.avgTokensPerSecond >= 10 ? 'PASS' : 'FAIL'} (${summary.avgTokensPerSecond} tok/s)`);
    console.log(`✅ Console logging present: ${this.hasConsoleLogging() ? 'PASS' : 'FAIL'}`);
    
    console.log(`\\n📁 Detailed report saved: ${reportPath}`);
    
    return fullReport;
  }

  hasConsoleLogging() {
    // Check if any console output contains success indicators
    return this.testResults.chatTests.some(test => 
      test.consoleOutput && test.consoleOutput.some(log => 
        log.includes('SUCCESS') || 
        log.includes('✅') ||
        log.includes('Model loaded') ||
        log.includes('Response generated')
      )
    );
  }
}

// Run the test
async function main() {
  const tester = new DirectLukeAITester();
  await tester.runFullTest();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DirectLukeAITester;