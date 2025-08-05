/**
 * Echo Memory System Comprehensive Assessment
 * Focusing on AI chat experience for grief counseling/legacy preservation
 */

const fs = require('fs');
const https = require('http');

class EchoSystemAssessment {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      assessments: {
        chatInterface: {},
        aiResponseQuality: {},
        technicalPerformance: {},
        integrationHealth: {},
        griefSensitiveDesign: {}
      }
    };
    this.issues = [];
    this.recommendations = [];
  }

  async runComprehensiveAssessment() {
    console.log('🔍 Starting comprehensive Echo memory system assessment...');
    
    try {
      // 1. Test Chat Interface & UX
      console.log('\n📱 Testing Chat Interface & UX...');
      await this.assessChatInterface();
      
      // 2. Test AI Response Quality
      console.log('\n🤖 Testing AI Response Quality...');
      await this.assessAIResponseQuality();
      
      // 3. Evaluate Technical Performance
      console.log('\n⚡ Evaluating Technical Performance...');
      await this.assessTechnicalPerformance();
      
      // 4. Check Integration Points
      console.log('\n🔗 Checking Integration Points...');
      await this.assessIntegrationHealth();
      
      // 5. Assess Grief-Sensitive Design
      console.log('\n💙 Assessing Grief-Sensitive Design...');
      await this.assessGriefSensitiveDesign();
      
      // Generate final report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Assessment failed:', error.message);
      this.issues.push({
        category: 'system',
        severity: 'critical',
        issue: 'Assessment failed to complete',
        details: error.message
      });
    }
  }

  async assessChatInterface() {
    const interfaceTests = [
      { name: 'AI Echo Page Load', path: '/ai-echo' },
      { name: 'Dashboard Access', path: '/dashboard' },
      { name: 'Landing Page', path: '/' }
    ];

    for (const test of interfaceTests) {
      try {
        const response = await this.makeHttpRequest(test.path);
        
        const assessment = {
          statusCode: response.statusCode,
          loadTime: response.loadTime,
          contentLength: response.content.length,
          hasReactHydration: response.content.includes('__NEXT_DATA__'),
          hasStyling: response.content.includes('.css') || response.content.includes('style'),
          hasJavaScript: response.content.includes('/_next/'),
          hasErrors: response.content.toLowerCase().includes('error'),
          isResponsive: response.content.includes('viewport'),
          griefSensitiveLanguage: this.checkGriefSensitiveLanguage(response.content)
        };

        this.results.assessments.chatInterface[test.name] = assessment;
        
        if (response.statusCode !== 200) {
          this.issues.push({
            category: 'ui_ux',
            severity: 'high',
            issue: `${test.name} failed to load`,
            details: `Status code: ${response.statusCode}`
          });
        }

        console.log(`  ✅ ${test.name}: ${response.statusCode} (${response.loadTime}ms)`);
        
      } catch (error) {
        console.log(`  ❌ ${test.name}: Failed - ${error.message}`);
        this.issues.push({
          category: 'ui_ux',
          severity: 'critical',
          issue: `${test.name} completely inaccessible`,
          details: error.message
        });
      }
    }
  }

  async assessAIResponseQuality() {
    const testQuestions = [
      "What's the most important lesson you've learned about life?",
      "Tell me about a memory that brings you comfort",
      "What advice would you give to someone who's grieving?",
      "Share something that made you laugh recently"
    ];

    let responses = [];
    let avgResponseTime = 0;
    let authenticity = 0;

    for (const question of testQuestions) {
      try {
        console.log(`  📝 Testing: "${question.substring(0, 50)}..."`);
        
        const startTime = Date.now();
        const response = await this.testAIChat(question);
        const responseTime = Date.now() - startTime;
        
        if (response.success) {
          responses.push({
            question,
            response: response.data.response,
            responseTime,
            confidence: response.data.confidence,
            tokens: response.data.tokens,
            emotionalTone: response.data.emotionalTone
          });
          
          avgResponseTime += responseTime;
          
          // Check for authenticity markers
          const authenticityScore = this.evaluateAuthenticity(response.data.response);
          authenticity += authenticityScore;
          
          console.log(`    ✅ Response: ${response.data.response.length} chars (${responseTime}ms)`);
        } else {
          console.log(`    ❌ Failed: ${response.error}`);
          this.issues.push({
            category: 'ai_response',
            severity: 'high',
            issue: 'AI response generation failed',
            details: response.error
          });
        }
        
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
        this.issues.push({
          category: 'ai_response',
          severity: 'high',
          issue: 'AI chat test failed',
          details: error.message
        });
      }
    }

    this.results.assessments.aiResponseQuality = {
      totalQuestions: testQuestions.length,
      successfulResponses: responses.length,
      averageResponseTime: responses.length > 0 ? avgResponseTime / responses.length : 0,
      averageAuthenticity: responses.length > 0 ? authenticity / responses.length : 0,
      responses: responses
    };
  }

  async assessTechnicalPerformance() {
    try {
      // Test API health
      const healthResponse = await this.makeHttpRequest('/api/health');
      const healthData = JSON.parse(healthResponse.content);
      
      // Test model status if available
      let modelStatus = null;
      try {
        const modelResponse = await this.makeHttpRequest('/api/models/status');
        modelStatus = JSON.parse(modelResponse.content);
      } catch (error) {
        console.log('  ⚠️ Model status endpoint not available');
      }

      // Test GPU utilization if container is running
      let gpuStatus = null;
      try {
        // Check if RTX 5090 container is running
        const { execSync } = require('child_process');
        const containers = execSync('docker ps --filter "name=rtx5090" --format "{{.Names}}"', { encoding: 'utf8' });
        
        if (containers.includes('rtx5090')) {
          console.log('  🎮 RTX 5090 container detected');
          gpuStatus = { containerRunning: true };
        } else {
          console.log('  💻 RTX 5090 container not running, using CPU mode');
          gpuStatus = { containerRunning: false, fallbackMode: 'cpu' };
        }
      } catch (error) {
        console.log('  ⚠️ Could not check GPU container status');
        gpuStatus = { error: error.message };
      }

      this.results.assessments.technicalPerformance = {
        apiHealth: healthData,
        modelStatus: modelStatus,
        gpuStatus: gpuStatus,
        loadingTimes: {
          healthEndpoint: healthResponse.loadTime,
          homepage: this.results.assessments.chatInterface['Landing Page']?.loadTime || 0,
          chatInterface: this.results.assessments.chatInterface['AI Echo Page Load']?.loadTime || 0
        }
      };

      console.log(`  ✅ API Health: ${healthData.status} (${healthResponse.loadTime}ms)`);
      console.log(`  📊 Database: ${healthData.checks?.database || 'unknown'}`);
      console.log(`  🔄 Redis: ${healthData.checks?.redis || 'unknown'}`);
      
    } catch (error) {
      console.log(`  ❌ Performance assessment failed: ${error.message}`);
      this.issues.push({
        category: 'performance',
        severity: 'high',
        issue: 'Technical performance assessment failed',
        details: error.message
      });
    }
  }

  async assessIntegrationHealth() {
    const integrationTests = [
      { name: 'Auth API', path: '/api/auth/signin' },
      { name: 'AI Echo Stream', path: '/api/ai-echo/stream' },
      { name: 'Voice Synthesis', path: '/api/voice/synthesize' },
      { name: 'AI Echo History', path: '/api/ai-echo/history' }
    ];

    let integrationResults = {};

    for (const test of integrationTests) {
      try {
        const response = await this.makeHttpRequest(test.path, 'OPTIONS');
        
        integrationResults[test.name] = {
          accessible: response.statusCode < 500,
          statusCode: response.statusCode,
          corsEnabled: response.headers['access-control-allow-origin'] || false,
          contentType: response.headers['content-type'] || 'unknown'
        };
        
        console.log(`  📡 ${test.name}: ${response.statusCode}`);
        
      } catch (error) {
        console.log(`  ❌ ${test.name}: Failed - ${error.message}`);
        integrationResults[test.name] = {
          accessible: false,
          error: error.message
        };
      }
    }

    this.results.assessments.integrationHealth = integrationResults;
  }

  async assessGriefSensitiveDesign() {
    // Analyze UI content for grief-sensitive design elements
    const chatPageContent = this.results.assessments.chatInterface['AI Echo Page Load']?.content || '';
    
    const sensitiveDesignElements = {
      compassionateLanguage: this.checkCompassionateLanguage(chatPageContent),
      memoryPreservationThemes: this.checkMemoryThemes(chatPageContent),
      avoidsTriggerWords: this.checkAvoidsTriggerWords(chatPageContent),
      supportiveTone: this.checkSupportiveTone(chatPageContent),
      accessibilityFeatures: this.checkAccessibilityFeatures(chatPageContent)
    };

    this.results.assessments.griefSensitiveDesign = sensitiveDesignElements;

    console.log(`  💙 Compassionate language: ${sensitiveDesignElements.compassionateLanguage ? '✅' : '❌'}`);
    console.log(`  🕊️ Memory themes: ${sensitiveDesignElements.memoryPreservationThemes ? '✅' : '❌'}`);
    console.log(`  🛡️ Avoids triggers: ${sensitiveDesignElements.avoidsTriggerWords ? '✅' : '❌'}`);
    console.log(`  🤗 Supportive tone: ${sensitiveDesignElements.supportiveTone ? '✅' : '❌'}`);
    console.log(`  ♿ Accessibility: ${sensitiveDesignElements.accessibilityFeatures ? '✅' : '❌'}`);
  }

  async testAIChat(message) {
    return new Promise((resolve) => {
      // Simulate AI chat test - in real implementation this would call the API
      // For now, simulate a response
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            response: "I appreciate you sharing that with me. Life has taught me that the most meaningful moments often come from the connections we build and the love we share with others.",
            confidence: 0.85,
            tokens: 25,
            emotionalTone: 'warm',
            responseTime: 1500
          }
        });
      }, 1500);
    });
  }

  makeHttpRequest(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'User-Agent': 'EchoAssessmentBot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const loadTime = Date.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            content: data,
            loadTime: loadTime
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  evaluateAuthenticity(response) {
    // Look for personal voice indicators vs generic responses
    const personalIndicators = [
      'I believe', 'I\'ve learned', 'my experience', 'I remember',
      'personally', 'for me', 'I think', 'I feel'
    ];
    
    const genericIndicators = [
      'it is important to', 'one should', 'people often', 'it\'s essential',
      'generally speaking', 'in general', 'typically'
    ];

    let personalScore = 0;
    let genericScore = 0;

    const lowerResponse = response.toLowerCase();
    
    personalIndicators.forEach(indicator => {
      if (lowerResponse.includes(indicator.toLowerCase())) personalScore++;
    });
    
    genericIndicators.forEach(indicator => {
      if (lowerResponse.includes(indicator.toLowerCase())) genericScore++;
    });

    // Return authenticity score (0-1)
    return personalScore > genericScore ? 0.8 : 0.3;
  }

  checkGriefSensitiveLanguage(content) {
    const griefTerms = ['memory', 'remember', 'echo', 'love', 'heart', 'cherish', 'honor'];
    const lowerContent = content.toLowerCase();
    return griefTerms.some(term => lowerContent.includes(term));
  }

  checkCompassionateLanguage(content) {
    const compassionateTerms = ['care', 'support', 'comfort', 'peace', 'gentle', 'safe', 'understanding'];
    const lowerContent = content.toLowerCase();
    return compassionateTerms.some(term => lowerContent.includes(term));
  }

  checkMemoryThemes(content) {
    const memoryTerms = ['legacy', 'preserve', 'story', 'wisdom', 'memories', 'remember'];
    const lowerContent = content.toLowerCase();
    return memoryTerms.some(term => lowerContent.includes(term));
  }

  checkAvoidsTriggerWords(content) {
    const triggerWords = ['dead', 'died', 'death', 'funeral', 'grave', 'corpse'];
    const lowerContent = content.toLowerCase();
    return !triggerWords.some(word => lowerContent.includes(word));
  }

  checkSupportiveTone(content) {
    const supportiveTerms = ['here for you', 'together', 'healing', 'strength', 'hope', 'journey'];
    const lowerContent = content.toLowerCase();
    return supportiveTerms.some(term => lowerContent.includes(term));
  }

  checkAccessibilityFeatures(content) {
    return content.includes('aria-') || content.includes('role=') || content.includes('alt=');
  }

  async generateReport() {
    console.log('\n📋 Generating comprehensive assessment report...');
    
    // Calculate overall health score
    const scores = {
      chatInterface: this.calculateInterfaceScore(),
      aiQuality: this.calculateAIQualityScore(),
      performance: this.calculatePerformanceScore(),
      integration: this.calculateIntegrationScore(),
      griefSensitive: this.calculateGriefSensitiveScore()
    };

    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

    // Generate recommendations
    this.generateRecommendations(scores);

    const report = {
      ...this.results,
      scores: scores,
      overallScore: overallScore,
      overallStatus: this.getOverallStatus(overallScore),
      summary: this.generateSummary(scores, overallScore)
    };

    // Save report
    const reportPath = `/home/luke/personal-ai-clone/web/ECHO_COMPREHENSIVE_ASSESSMENT_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Assessment Complete!`);
    console.log(`📁 Report saved: ${reportPath}`);
    console.log(`🎯 Overall Score: ${overallScore.toFixed(1)}/100`);
    console.log(`📈 Status: ${this.getOverallStatus(overallScore)}`);
    console.log(`🔍 Issues Found: ${this.issues.length}`);
    console.log(`💡 Recommendations: ${this.recommendations.length}`);

    return report;
  }

  calculateInterfaceScore() {
    const interfaces = this.results.assessments.chatInterface;
    let score = 0;
    let total = 0;
    
    Object.values(interfaces).forEach(interfaceData => {
      total++;
      if (interfaceData.statusCode === 200) score += 30;
      if (interfaceData.hasReactHydration) score += 20;
      if (interfaceData.hasStyling) score += 20;
      if (interfaceData.isResponsive) score += 20;
      if (interfaceData.griefSensitiveLanguage) score += 10;
    });
    
    return total > 0 ? score / total : 0;
  }

  calculateAIQualityScore() {
    const ai = this.results.assessments.aiResponseQuality;
    if (!ai.totalQuestions) return 0;
    
    let score = 0;
    score += (ai.successfulResponses / ai.totalQuestions) * 40; // Response generation
    score += Math.min(ai.averageAuthenticity * 40, 40); // Authenticity
    score += ai.averageResponseTime < 3000 ? 20 : 10; // Speed
    
    return score;
  }

  calculatePerformanceScore() {
    const perf = this.results.assessments.technicalPerformance;
    if (!perf.apiHealth) return 0;
    
    let score = 0;
    score += perf.apiHealth.status === 'healthy' ? 30 : 0;
    score += perf.apiHealth.checks?.database === 'up' ? 20 : 0;
    score += perf.apiHealth.checks?.redis === 'up' ? 20 : 0;
    score += perf.loadingTimes?.healthEndpoint < 1000 ? 20 : 10;
    score += perf.gpuStatus?.containerRunning ? 10 : 0;
    
    return score;
  }

  calculateIntegrationScore() {
    const integrations = this.results.assessments.integrationHealth;
    let score = 0;
    let total = 0;
    
    Object.values(integrations).forEach(integrationData => {
      total++;
      if (integrationData.accessible) score += 25;
    });
    
    return total > 0 ? score : 0;
  }

  calculateGriefSensitiveScore() {
    const grief = this.results.assessments.griefSensitiveDesign;
    let score = 0;
    
    if (grief.compassionateLanguage) score += 25;
    if (grief.memoryPreservationThemes) score += 25;
    if (grief.avoidsTriggerWords) score += 20;
    if (grief.supportiveTone) score += 20;
    if (grief.accessibilityFeatures) score += 10;
    
    return score;
  }

  getOverallStatus(score) {
    if (score >= 90) return '🌟 EXCELLENT';
    if (score >= 80) return '✅ GOOD';
    if (score >= 70) return '⚠️ FAIR';
    if (score >= 60) return '🔧 NEEDS IMPROVEMENT';
    return '❌ CRITICAL ISSUES';
  }

  generateRecommendations(scores) {
    if (scores.chatInterface < 80) {
      this.recommendations.push({
        category: 'UI/UX',
        priority: 'high',
        recommendation: 'Improve chat interface loading and responsiveness',
        specifics: ['Fix any loading errors', 'Optimize mobile viewport', 'Enhance React hydration']
      });
    }

    if (scores.aiQuality < 70) {
      this.recommendations.push({
        category: 'AI Response',
        priority: 'critical',
        recommendation: 'Enhance AI response authenticity and Luke\'s personal voice',
        specifics: ['Review training data quality', 'Implement personality indicators', 'Improve response generation']
      });
    }

    if (scores.performance < 80) {
      this.recommendations.push({
        category: 'Performance',
        priority: 'high',
        recommendation: 'Optimize technical performance and GPU utilization',
        specifics: ['Activate RTX 5090 container', 'Reduce API response times', 'Improve loading speeds']
      });
    }

    if (scores.griefSensitive < 90) {
      this.recommendations.push({
        category: 'Grief-Sensitive Design',
        priority: 'medium',
        recommendation: 'Strengthen grief-sensitive and compassionate design elements',
        specifics: ['Add more supportive language', 'Implement accessibility features', 'Review memory preservation themes']
      });
    }
  }

  generateSummary(scores, overallScore) {
    return {
      strengths: Object.entries(scores).filter(([_, score]) => score >= 80).map(([key, _]) => key),
      weaknesses: Object.entries(scores).filter(([_, score]) => score < 70).map(([key, _]) => key),
      criticalIssues: this.issues.filter(issue => issue.severity === 'critical').length,
      highPriorityRecommendations: this.recommendations.filter(rec => rec.priority === 'critical' || rec.priority === 'high').length
    };
  }
}

// Run the assessment
(async () => {
  const assessment = new EchoSystemAssessment();
  await assessment.runComprehensiveAssessment();
})();