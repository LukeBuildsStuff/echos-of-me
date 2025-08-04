const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class LukeAIChatTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      loginTest: null,
      navigationTest: null,
      chatTests: [],
      consoleLogValidation: [],
      voiceIntegrationTest: null,
      sessionManagementTest: null,
      responseAuthenticityTest: null,
      errors: []
    };
    this.screenshotDir = './ai-chat-test-screenshots';
    this.ensureScreenshotDir();
  }

  ensureScreenshotDir() {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async init() {
    console.log('🚀 Initializing Luke AI Chat Tester...');
    
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Capture console logs
    this.page.on('console', (msg) => {
      const text = msg.text();
      console.log('🖥️ Console:', text);
      
      if (text.includes('✅ LUKE TRAINED MODEL SUCCESS')) {
        this.testResults.consoleLogValidation.push({
          type: 'success',
          message: text,
          timestamp: new Date().toISOString()
        });
      } else if (text.includes('ERROR') || text.includes('Error')) {
        this.testResults.consoleLogValidation.push({
          type: 'error',
          message: text,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Capture network errors
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        this.testResults.errors.push({
          type: 'network',
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async takeScreenshot(name) {
    const screenshotPath = path.join(this.screenshotDir, `${name}_${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  async testLogin() {
    console.log('🔐 Testing login functionality...');
    
    try {
      // Navigate to the application
      await this.page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
      await this.takeScreenshot('01_homepage_load');
      
      // Check if we need to sign in
      const signInButton = await this.page.$('button:contains("Sign In")') || 
                          await this.page.$('a[href*="signin"]') ||
                          await this.page.$('a[href*="auth"]');
      
      if (signInButton) {
        await signInButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      } else {
        // Try to navigate directly to sign in
        await this.page.goto('http://localhost:3001/auth/signin', { waitUntil: 'networkidle2' });
      }
      
      await this.takeScreenshot('02_signin_page');
      
      // Fill in login credentials
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      await this.page.type('input[type="email"], input[name="email"]', 'lukemoeller@yahoo.com');
      await this.page.type('input[type="password"], input[name="password"]', 'password123');
      
      await this.takeScreenshot('03_credentials_filled');
      
      // Click sign in button
      const submitButton = await this.page.$('button[type="submit"]') || 
                          await this.page.$('button:contains("Sign In")') ||
                          await this.page.$('input[type="submit"]');
      
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      }
      
      await this.takeScreenshot('04_after_login');
      
      // Verify successful login
      const currentUrl = this.page.url();
      const isLoggedIn = !currentUrl.includes('/auth/signin') && 
                        (currentUrl.includes('/dashboard') || 
                         currentUrl.includes('/') ||
                         await this.page.$('[data-testid="user-menu"]') !== null);
      
      this.testResults.loginTest = {
        success: isLoggedIn,
        finalUrl: currentUrl,
        timestamp: new Date().toISOString()
      };
      
      console.log(isLoggedIn ? '✅ Login successful' : '❌ Login failed');
      return isLoggedIn;
      
    } catch (error) {
      console.error('❌ Login test failed:', error.message);
      this.testResults.loginTest = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async navigateToAIEcho() {
    console.log('🧭 Navigating to AI Echo chat page...');
    
    try {
      // Try different navigation methods
      const navMethods = [
        () => this.page.goto('http://localhost:3001/ai-echo', { waitUntil: 'networkidle2' }),
        () => this.clickNavLink('AI Echo'),
        () => this.clickNavLink('Echo'),
        () => this.clickNavLink('Chat')
      ];
      
      let navigationSuccess = false;
      
      for (const method of navMethods) {
        try {
          await method();
          await this.page.waitForTimeout(2000);
          
          // Check if we're on the AI Echo page
          const isAIEchoPage = await this.page.evaluate(() => {
            return window.location.pathname.includes('ai-echo') ||
                   document.querySelector('[data-testid="ai-echo-chat"]') !== null ||
                   document.querySelector('.ai-echo') !== null ||
                   document.title.toLowerCase().includes('echo');
          });
          
          if (isAIEchoPage) {
            navigationSuccess = true;
            break;
          }
        } catch (e) {
          console.log(`Navigation method failed: ${e.message}`);
        }
      }
      
      await this.takeScreenshot('05_ai_echo_page');
      
      this.testResults.navigationTest = {
        success: navigationSuccess,
        finalUrl: this.page.url(),
        timestamp: new Date().toISOString()
      };
      
      console.log(navigationSuccess ? '✅ Navigation to AI Echo successful' : '❌ Navigation to AI Echo failed');
      return navigationSuccess;
      
    } catch (error) {
      console.error('❌ Navigation test failed:', error.message);
      this.testResults.navigationTest = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async clickNavLink(linkText) {
    const link = await this.page.$x(`//a[contains(text(), "${linkText}")]`);
    if (link.length > 0) {
      await link[0].click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    } else {
      throw new Error(`Navigation link "${linkText}" not found`);
    }
  }

  async testChatMessage(question, expectedKeywords = []) {
    console.log(`💬 Testing chat message: "${question}"`);
    
    try {
      // Find chat input
      const inputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="question"]',
        'input[placeholder*="message"]',
        'input[placeholder*="question"]',
        '[data-testid="chat-input"]',
        '.chat-input',
        'textarea',
        'input[type="text"]'
      ];
      
      let chatInput = null;
      for (const selector of inputSelectors) {
        chatInput = await this.page.$(selector);
        if (chatInput) break;
      }
      
      if (!chatInput) {
        throw new Error('Chat input not found');
      }
      
      // Clear and type message
      await chatInput.click();
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.type(chatInput, question);
      
      await this.takeScreenshot(`06_message_typed_${Date.now()}`);
      
      // Send message
      const sendSelectors = [
        'button[type="submit"]',
        'button:contains("Send")',
        '[data-testid="send-button"]',
        '.send-button'
      ];
      
      let sendButton = null;
      for (const selector of sendSelectors) {
        try {
          sendButton = await this.page.$(selector);
          if (sendButton) break;
        } catch (e) {
          // Try XPath for text-based selection
          const buttons = await this.page.$x('//button[contains(text(), "Send")]');
          if (buttons.length > 0) {
            sendButton = buttons[0];
            break;
          }
        }
      }
      
      if (sendButton) {
        await sendButton.click();
      } else {
        // Try pressing Enter
        await this.page.keyboard.press('Enter');
      }
      
      // Wait for response
      await this.page.waitForTimeout(5000);
      
      // Look for response
      const response = await this.page.evaluate(() => {
        const messages = document.querySelectorAll('.message, .chat-message, [data-testid="chat-message"]');
        const lastMessage = messages[messages.length - 1];
        return lastMessage ? lastMessage.textContent : null;
      });
      
      await this.takeScreenshot(`07_response_received_${Date.now()}`);
      
      // Analyze response authenticity
      const isAuthentic = this.analyzeResponseAuthenticity(response, expectedKeywords);
      
      const testResult = {
        question,
        response,
        isAuthentic,
        responseLength: response ? response.length : 0,
        containsPersonalPronouns: this.containsPersonalPronouns(response),
        timestamp: new Date().toISOString()
      };
      
      this.testResults.chatTests.push(testResult);
      console.log(`📝 Response: ${response ? response.substring(0, 100) + '...' : 'No response received'}`);
      console.log(`✨ Authenticity Score: ${isAuthentic ? 'AUTHENTIC' : 'GENERIC'}`);
      
      return testResult;
      
    } catch (error) {
      console.error(`❌ Chat test failed for "${question}":`, error.message);
      const errorResult = {
        question,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.testResults.chatTests.push(errorResult);
      return errorResult;
    }
  }

  analyzeResponseAuthenticity(response, expectedKeywords = []) {
    if (!response) return false;
    
    const personalPronounCount = (response.match(/\\b(I|my|me|myself)\\b/gi) || []).length;
    const genericPhrases = [
      'I am sorry for your loss',
      'grief counseling',
      'please seek professional help',
      'I cannot provide therapy',
      'as an AI'
    ];
    
    const hasGenericPhrases = genericPhrases.some(phrase => 
      response.toLowerCase().includes(phrase.toLowerCase())
    );
    
    const hasExpectedKeywords = expectedKeywords.length === 0 || 
      expectedKeywords.some(keyword => 
        response.toLowerCase().includes(keyword.toLowerCase())
      );
    
    return personalPronounCount >= 2 && !hasGenericPhrases && hasExpectedKeywords;
  }

  containsPersonalPronouns(response) {
    if (!response) return false;
    return /\\b(I|my|me|myself)\\b/i.test(response);
  }

  async testVoiceIntegration() {
    console.log('🎵 Testing voice synthesis integration...');
    
    try {
      // Look for voice/audio buttons
      const voiceButtons = await this.page.$$('[data-testid*="voice"], [data-testid*="audio"], button[title*="play"], .voice-button, .audio-button');
      
      this.testResults.voiceIntegrationTest = {
        voiceButtonsFound: voiceButtons.length,
        hasVoiceIntegration: voiceButtons.length > 0,
        timestamp: new Date().toISOString()
      };
      
      console.log(`🎵 Voice buttons found: ${voiceButtons.length}`);
      return voiceButtons.length > 0;
      
    } catch (error) {
      console.error('❌ Voice integration test failed:', error.message);
      this.testResults.voiceIntegrationTest = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async runFullTestSuite() {
    console.log('🏁 Starting comprehensive Luke AI chat test suite...');
    
    try {
      await this.init();
      
      // Test 1: Login
      const loginSuccess = await this.testLogin();
      if (!loginSuccess) {
        console.log('❌ Cannot proceed without successful login');
        return this.generateReport();
      }
      
      // Test 2: Navigate to AI Echo
      const navigationSuccess = await this.navigateToAIEcho();
      if (!navigationSuccess) {
        console.log('❌ Cannot proceed without successful navigation to AI Echo');
        return this.generateReport();
      }
      
      // Test 3: Chat Tests with specific questions
      const testQuestions = [
        {
          question: "What's the most important thing you've learned in life?",
          keywords: ['learn', 'life', 'important', 'experience']
        },
        {
          question: "Tell me about your philosophy on work",
          keywords: ['work', 'philosophy', 'career', 'job']
        },
        {
          question: "What advice would you give about handling challenges?",
          keywords: ['advice', 'challenge', 'difficulty', 'problem']
        },
        {
          question: "What matters most to you in relationships?",
          keywords: ['relationship', 'matter', 'important', 'people']
        }
      ];
      
      for (const test of testQuestions) {
        await this.testChatMessage(test.question, test.keywords);
        await this.page.waitForTimeout(3000); // Wait between messages
      }
      
      // Test 4: Voice Integration
      await this.testVoiceIntegration();
      
      // Test 5: Session Management (simple test)
      this.testResults.sessionManagementTest = {
        pageStillActive: this.page && !this.page.isClosed(),
        currentUrl: this.page.url(),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Full test suite completed!');
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.errors.push({
        type: 'suite_failure',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return this.generateReport();
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  generateReport() {
    const report = {
      testSummary: {
        totalChatTests: this.testResults.chatTests.length,
        successfulChatTests: this.testResults.chatTests.filter(t => t.response && !t.error).length,
        authenticResponses: this.testResults.chatTests.filter(t => t.isAuthentic).length,
        consoleSuccessMessages: this.testResults.consoleLogValidation.filter(l => l.type === 'success').length,
        consoleErrorMessages: this.testResults.consoleLogValidation.filter(l => l.type === 'error').length,
        totalErrors: this.testResults.errors.length
      },
      detailedResults: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, 'luke-ai-chat-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\\n📋 TEST REPORT SUMMARY:');
    console.log('========================');
    console.log(`Login Test: ${this.testResults.loginTest?.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Navigation Test: ${this.testResults.navigationTest?.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Chat Tests: ${report.testSummary.successfulChatTests}/${report.testSummary.totalChatTests} successful`);
    console.log(`Authentic Responses: ${report.testSummary.authenticResponses}/${report.testSummary.totalChatTests}`);
    console.log(`Console Success Messages: ${report.testSummary.consoleSuccessMessages}`);
    console.log(`Console Error Messages: ${report.testSummary.consoleErrorMessages}`);
    console.log(`Voice Integration: ${this.testResults.voiceIntegrationTest?.hasVoiceIntegration ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`Total Errors: ${report.testSummary.totalErrors}`);
    console.log(`\\n📁 Full report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: ${this.screenshotDir}`);
    
    return report;
  }
}

// Run the test suite
async function main() {
  const tester = new LukeAIChatTester();
  const report = await tester.runFullTestSuite();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LukeAIChatTester;