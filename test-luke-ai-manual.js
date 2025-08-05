const fs = require('fs');
const path = require('path');

class ManualLukeAITester {
  constructor() {
    this.testResults = {
      serverStatus: null,
      authEndpointTest: null,
      aiEchoEndpointTest: null,
      codeAnalysis: {
        aiEchoComponent: null,
        modelEngineStatus: null,
        authenticationFlow: null,
        voiceIntegration: null
      },
      trainingData: null,
      databaseConnection: null
    };
  }

  async testServerStatus() {
    console.log('🔍 Testing server status...');
    
    try {
      const { exec } = require('child_process');
      
      // Test main page
      const mainPageTest = await this.execPromise('curl -s -w "%{http_code}" -o /dev/null http://localhost:3001');
      
      // Test AI Echo endpoint directly
      const aiEchoTest = await this.execPromise('curl -s -w "%{http_code}" -o /dev/null http://localhost:3001/ai-echo');
      
      this.testResults.serverStatus = {
        mainPage: {
          status: mainPageTest.trim(),
          success: mainPageTest.trim() === '200'
        },
        aiEchoPage: {
          status: aiEchoTest.trim(),
          success: aiEchoTest.trim() === '200' || aiEchoTest.trim() === '302'
        }
      };
      
      console.log(`Main page status: ${mainPageTest.trim()}`);
      console.log(`AI Echo page status: ${aiEchoTest.trim()}`);
      
    } catch (error) {
      console.error('❌ Server status test failed:', error.message);
      this.testResults.serverStatus = { error: error.message };
    }
  }

  async testAPIEndpoints() {
    console.log('🔌 Testing API endpoints...');
    
    try {
      // Test health endpoint
      const healthTest = await this.execPromise('curl -s -w "%{http_code}" -o /dev/null http://localhost:3001/api/health');
      
      // Test AI Echo chat endpoint (should require auth)
      const chatTest = await this.execPromise('curl -s -w "%{http_code}" -o /dev/null http://localhost:3001/api/ai-echo/chat');
      
      this.testResults.authEndpointTest = {
        health: {
          status: healthTest.trim(),
          success: healthTest.trim() === '200'
        },
        chatEndpoint: {
          status: chatTest.trim(),
          requiresAuth: chatTest.trim() === '401' || chatTest.trim() === '403'
        }
      };
      
      console.log(`Health endpoint: ${healthTest.trim()}`);
      console.log(`Chat endpoint: ${chatTest.trim()}`);
      
    } catch (error) {
      console.error('❌ API endpoint test failed:', error.message);
      this.testResults.authEndpointTest = { error: error.message };
    }
  }

  async analyzeCodeStructure() {
    console.log('📋 Analyzing code structure...');
    
    try {
      // Check AI Echo component
      const aiEchoPath = '/home/luke/personal-ai-clone/web/components/AIEchoChat.tsx';
      if (fs.existsSync(aiEchoPath)) {
        const aiEchoContent = fs.readFileSync(aiEchoPath, 'utf8');
        
        this.testResults.codeAnalysis.aiEchoComponent = {
          exists: true,
          hasLukeModelReference: aiEchoContent.includes('LUKE') || aiEchoContent.includes('luke'),
          hasTrainedModelLogic: aiEchoContent.includes('trained') || aiEchoContent.includes('model'),
          hasConsoleLogging: aiEchoContent.includes('console.log') && aiEchoContent.includes('SUCCESS'),
          hasVoiceIntegration: aiEchoContent.includes('voice') || aiEchoContent.includes('audio'),
          fileSize: aiEchoContent.length
        };
      } else {
        this.testResults.codeAnalysis.aiEchoComponent = { exists: false };
      }
      
      // Check model engine
      const modelEnginePath = '/home/luke/personal-ai-clone/web/lib/luke-ai-model-engine.ts';
      if (fs.existsSync(modelEnginePath)) {
        const modelEngineContent = fs.readFileSync(modelEnginePath, 'utf8');
        
        this.testResults.codeAnalysis.modelEngineStatus = {
          exists: true,
          hasInferenceLogic: modelEngineContent.includes('inference') || modelEngineContent.includes('generate'),
          hasAuthenticityChecks: modelEngineContent.includes('authentic') || modelEngineContent.includes('fallback'),
          hasConsoleSuccess: modelEngineContent.includes('LUKE TRAINED MODEL SUCCESS'),
          hasPersonalityData: modelEngineContent.includes('personality') || modelEngineContent.includes('training'),
          fileSize: modelEngineContent.length
        };
      } else {
        this.testResults.codeAnalysis.modelEngineStatus = { exists: false };
      }
      
      // Check training data
      const trainingPath = '/home/luke/personal-ai-clone/web/training';
      if (fs.existsSync(trainingPath)) {
        const trainingFiles = fs.readdirSync(trainingPath, { recursive: true });
        const modelFiles = trainingFiles.filter(f => f.includes('model') || f.includes('checkpoint'));
        
        this.testResults.trainingData = {
          trainingDirectoryExists: true,
          totalFiles: trainingFiles.length,
          modelFiles: modelFiles.length,
          hasTrainedModel: modelFiles.some(f => f.includes('final') || f.includes('adapter'))
        };
      }
      
    } catch (error) {
      console.error('❌ Code analysis failed:', error.message);
      this.testResults.codeAnalysis.error = error.message;
    }
  }

  async testDatabaseConnection() {
    console.log('🗄️ Testing database connection...');
    
    try {
      // Check if database connection script exists
      const dbTestPath = '/home/luke/personal-ai-clone/web/check_db.js';
      if (fs.existsSync(dbTestPath)) {
        const dbTestResult = await this.execPromise('node check_db.js');
        
        this.testResults.databaseConnection = {
          testExists: true,
          result: dbTestResult,
          success: !dbTestResult.includes('Error') && !dbTestResult.includes('failed')
        };
      } else {
        this.testResults.databaseConnection = { testExists: false };
      }
    } catch (error) {
      console.error('❌ Database test failed:', error.message);
      this.testResults.databaseConnection = { error: error.message };
    }
  }

  async simulateChatRequest() {
    console.log('💬 Simulating chat request...');
    
    try {
      // Create a test chat request
      const chatPayload = {
        message: "What's the most important thing you've learned in life?",
        sessionId: "test-session-" + Date.now()
      };
      
      const chatRequest = await this.execPromise(`curl -s -X POST http://localhost:3001/api/ai-echo/chat \\
        -H "Content-Type: application/json" \\
        -d '${JSON.stringify(chatPayload)}' \\
        -w "\\nHTTP_STATUS:%{http_code}"`);
      
      this.testResults.aiEchoEndpointTest = {
        request: chatPayload,
        response: chatRequest,
        timestamp: new Date().toISOString()
      };
      
      console.log('Chat request response:', chatRequest.substring(0, 200) + '...');
      
    } catch (error) {
      console.error('❌ Chat simulation failed:', error.message);
      this.testResults.aiEchoEndpointTest = { error: error.message };
    }
  }

  execPromise(command) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout || stderr);
        }
      });
    });
  }

  async runFullAnalysis() {
    console.log('🔬 Starting comprehensive Luke AI analysis...');
    
    await this.testServerStatus();
    await this.testAPIEndpoints();
    await this.analyzeCodeStructure();
    await this.testDatabaseConnection();
    await this.simulateChatRequest();
    
    return this.generateReport();
  }

  generateReport() {
    const report = {
      testSummary: {
        serverRunning: this.testResults.serverStatus?.mainPage?.success || false,
        aiEchoPageAccessible: this.testResults.serverStatus?.aiEchoPage?.success || false,
        aiEchoComponentExists: this.testResults.codeAnalysis?.aiEchoComponent?.exists || false,
        modelEngineExists: this.testResults.codeAnalysis?.modelEngineStatus?.exists || false,
        hasTrainedModel: this.testResults.trainingData?.hasTrainedModel || false,
        hasConsoleSuccessLogging: this.testResults.codeAnalysis?.modelEngineStatus?.hasConsoleSuccess || false,
        hasVoiceIntegration: this.testResults.codeAnalysis?.aiEchoComponent?.hasVoiceIntegration || false
      },
      detailedResults: this.testResults,
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString()
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'luke-ai-manual-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\\n📋 LUKE AI ANALYSIS REPORT:');
    console.log('============================');
    console.log(`Server Status: ${report.testSummary.serverRunning ? '✅ RUNNING' : '❌ DOWN'}`);
    console.log(`AI Echo Page: ${report.testSummary.aiEchoPageAccessible ? '✅ ACCESSIBLE' : '❌ INACCESSIBLE'}`);
    console.log(`AI Echo Component: ${report.testSummary.aiEchoComponentExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`Model Engine: ${report.testSummary.modelEngineExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`Trained Model: ${report.testSummary.hasTrainedModel ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`Console Success Logging: ${report.testSummary.hasConsoleSuccessLogging ? '✅ IMPLEMENTED' : '❌ MISSING'}`);
    console.log(`Voice Integration: ${report.testSummary.hasVoiceIntegration ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    console.log('\\n📝 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    
    console.log(`\\n📁 Full report saved to: ${reportPath}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (!this.testResults.serverStatus?.mainPage?.success) {
      recommendations.push('Server is not responding properly - check for runtime errors');
    }
    
    if (!this.testResults.codeAnalysis?.aiEchoComponent?.exists) {
      recommendations.push('AI Echo component is missing - check component file structure');
    }
    
    if (!this.testResults.codeAnalysis?.modelEngineStatus?.hasConsoleSuccess) {
      recommendations.push('Console success logging not found - implement "✅ LUKE TRAINED MODEL SUCCESS" messages');
    }
    
    if (!this.testResults.trainingData?.hasTrainedModel) {
      recommendations.push('Trained model files not found - verify training completion and model deployment');
    }
    
    if (!this.testResults.codeAnalysis?.aiEchoComponent?.hasVoiceIntegration) {
      recommendations.push('Voice integration not detected - implement voice synthesis for responses');
    }
    
    if (this.testResults.aiEchoEndpointTest?.response?.includes('401') || 
        this.testResults.aiEchoEndpointTest?.response?.includes('403')) {
      recommendations.push('Authentication required for chat endpoint - ensure proper login flow');
    }
    
    return recommendations;
  }
}

// Run the analysis
async function main() {
  const tester = new ManualLukeAITester();
  const report = await tester.runFullAnalysis();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ManualLukeAITester;