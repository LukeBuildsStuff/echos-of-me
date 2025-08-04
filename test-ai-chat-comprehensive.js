const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'lukemoeller@yahoo.com',
  password: 'testpassword123'
};

// Create screenshots directory
const screenshotDir = path.join(__dirname, 'ai-chat-test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  user: TEST_USER.email,
  tests: [],
  screenshots: [],
  chatInteractions: [],
  errors: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper function to save screenshot
async function saveScreenshot(page, name, description) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${name}.png`;
  const filepath = path.join(screenshotDir, filename);
  
  await page.screenshot({ 
    path: filepath, 
    fullPage: true 
  });
  
  const screenshot = {
    name,
    description,
    filename,
    filepath,
    timestamp
  };
  
  testResults.screenshots.push(screenshot);
  console.log(`📸 Screenshot saved: ${filename}`);
  return screenshot;
}

// Helper function to log test result
function logTest(name, status, message, details = {}) {
  const test = {
    name,
    status,
    message,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  testResults.tests.push(test);
  
  const statusIcon = {
    'passed': '✅',
    'failed': '❌',
    'warning': '⚠️',
    'partial': '🔶'
  }[status] || '❓';
  
  console.log(`${statusIcon} ${name}: ${message}`);
  if (details.error) console.log(`   Error: ${details.error}`);
  
  return test;
}

// Main test function
async function testAIChatFunctionality() {
  console.log('=== AI Chat Functionality Test Suite ===');
  console.log(`Testing: ${BASE_URL}`);
  console.log(`User: ${TEST_USER.email}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('==========================================\n');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
    console.log(`🟦 Console [${msg.type()}]: ${msg.text()}`);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    testResults.errors.push({
      type: 'page_error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.log(`🔴 Page Error: ${error.message}`);
  });

  // Listen for failed requests
  page.on('requestfailed', request => {
    testResults.errors.push({
      type: 'request_failed',
      url: request.url(),
      failure: request.failure().errorText,
      timestamp: new Date().toISOString()
    });
    console.log(`🔴 Request Failed: ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    // Test 1: Navigate to landing page
    console.log('\n1. Testing Landing Page Access...');
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await saveScreenshot(page, 'landing-page', 'Initial landing page load');
      
      const title = await page.title();
      const hasExpectedContent = await page.isVisible('text=Echoes of Me') || 
                                 await page.isVisible('text=Echos Of Me') ||
                                 await page.isVisible('text=Welcome');
      
      if (hasExpectedContent) {
        logTest('Landing Page Access', 'passed', `Page loaded successfully: "${title}"`);
      } else {
        logTest('Landing Page Access', 'warning', 'Page loaded but expected content not found', {
          title,
          url: page.url()
        });
      }
    } catch (error) {
      logTest('Landing Page Access', 'failed', 'Failed to load landing page', { error: error.message });
    }

    // Test 2: Login Process
    console.log('\n2. Testing Login Process...');
    try {
      // Look for login link or button
      const loginSelectors = [
        'text=Sign In',
        'text=Login', 
        'text=Log In',
        '[href*="signin"]',
        '[href*="login"]',
        'button:has-text("Sign")',
        'a:has-text("Sign")'
      ];
      
      let loginFound = false;
      for (const selector of loginSelectors) {
        if (await page.isVisible(selector)) {
          console.log(`🔍 Found login element: ${selector}`);
          await page.click(selector);
          loginFound = true;
          break;
        }
      }
      
      if (!loginFound) {
        // Try navigating directly to auth page
        await page.goto(`${BASE_URL}/auth/signin`);
      }
      
      await page.waitForTimeout(2000);
      await saveScreenshot(page, 'login-page', 'Login page');
      
      // Fill login form
      const emailInput = await page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
      const passwordInput = await page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        await emailInput.fill(TEST_USER.email);
        await passwordInput.fill(TEST_USER.password);
        
        await saveScreenshot(page, 'login-filled', 'Login form filled');
        
        // Submit form
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("Sign")',
          'button:has-text("Login")',
          'input[type="submit"]'
        ];
        
        for (const selector of submitSelectors) {
          if (await page.isVisible(selector)) {
            await page.click(selector);
            break;
          }
        }
        
        // Wait for navigation
        await page.waitForTimeout(3000);
        
        // Check if login was successful
        const currentUrl = page.url();
        const isLoggedIn = currentUrl.includes('dashboard') || 
                          currentUrl.includes('home') || 
                          await page.isVisible('text=Dashboard') ||
                          await page.isVisible('text=Welcome back') ||
                          await page.isVisible('text=Logout');
        
        if (isLoggedIn) {
          logTest('Login Process', 'passed', 'Successfully logged in', { 
            redirectUrl: currentUrl 
          });
          await saveScreenshot(page, 'login-success', 'After successful login');
        } else {
          logTest('Login Process', 'failed', 'Login appears to have failed', { 
            currentUrl,
            expectedRedirect: 'dashboard or home page'
          });
          await saveScreenshot(page, 'login-failed', 'Login failed state');
        }
      } else {
        logTest('Login Process', 'failed', 'Could not find email/password input fields');
      }
    } catch (error) {
      logTest('Login Process', 'failed', 'Error during login process', { error: error.message });
    }

    // Test 3: Navigate to AI Echo Chat
    console.log('\n3. Finding AI Echo Chat Interface...');
    try {
      // Try multiple ways to find the AI chat
      const chatNavigationSelectors = [
        'text=AI Echo',
        'text=Chat',
        'text=AI Chat',
        '[href*="ai-echo"]',
        '[href*="chat"]',
        'button:has-text("AI")',
        'a:has-text("AI")',
        'nav a:has-text("Echo")'
      ];
      
      let chatFound = false;
      for (const selector of chatNavigationSelectors) {
        if (await page.isVisible(selector)) {
          console.log(`🔍 Found AI chat link: ${selector}`);
          await page.click(selector);
          chatFound = true;
          break;
        }
      }
      
      if (!chatFound) {
        // Try direct navigation
        console.log('🔍 Trying direct navigation to /ai-echo');
        await page.goto(`${BASE_URL}/ai-echo`);
      }
      
      await page.waitForTimeout(2000);
      await saveScreenshot(page, 'ai-chat-page', 'AI Echo chat page');
      
      // Verify we're on the chat page
      const isChatPage = await page.isVisible('textarea') ||
                        await page.isVisible('input[placeholder*="message"]') ||
                        await page.isVisible('text=Chat') ||
                        await page.isVisible('text=Message') ||
                        page.url().includes('ai-echo') ||
                        page.url().includes('chat');
      
      if (isChatPage) {
        logTest('AI Chat Navigation', 'passed', 'Successfully navigated to AI chat interface', {
          url: page.url()
        });
      } else {
        logTest('AI Chat Navigation', 'failed', 'Could not find or navigate to AI chat interface', {
          url: page.url()
        });
      }
    } catch (error) {
      logTest('AI Chat Navigation', 'failed', 'Error navigating to AI chat', { error: error.message });
    }

    // Test 4: Analyze Chat Interface
    console.log('\n4. Analyzing Chat Interface...');
    try {
      const interfaceElements = {
        messageInput: false,
        sendButton: false,
        chatHistory: false,
        voiceFeatures: false,
        settingsButton: false
      };
      
      // Check for message input
      const inputSelectors = [
        'textarea',
        'input[type="text"]',
        'input[placeholder*="message"]',
        'input[placeholder*="type"]',
        '[role="textbox"]'
      ];
      
      for (const selector of inputSelectors) {
        if (await page.isVisible(selector)) {
          interfaceElements.messageInput = true;
          console.log(`✓ Found message input: ${selector}`);
          break;
        }
      }
      
      // Check for send button
      const sendSelectors = [
        'button:has-text("Send")',
        'button[type="submit"]',
        'button:has-text("Submit")',
        '[aria-label*="send"]',
        'button:has-text("→")',
        'button svg' // Icon buttons
      ];
      
      for (const selector of sendSelectors) {
        if (await page.isVisible(selector)) {
          interfaceElements.sendButton = true;
          console.log(`✓ Found send button: ${selector}`);
          break;
        }
      }
      
      // Check for chat history area
      const historySelectors = [
        '[class*="message"]',
        '[class*="chat"]',
        '[class*="conversation"]',
        '[role="log"]',
        '.messages',
        '#messages'
      ];
      
      for (const selector of historySelectors) {
        if (await page.isVisible(selector)) {
          interfaceElements.chatHistory = true;
          console.log(`✓ Found chat history area: ${selector}`);
          break;
        }
      }
      
      // Check for voice features
      const voiceSelectors = [
        'button:has-text("Voice")',
        'button:has-text("Speak")',
        '[aria-label*="voice"]',
        '[aria-label*="audio"]',
        'button:has-text("🎤")',
        'button:has-text("🔊")'
      ];
      
      for (const selector of voiceSelectors) {
        if (await page.isVisible(selector)) {
          interfaceElements.voiceFeatures = true;
          console.log(`✓ Found voice features: ${selector}`);
          break;
        }
      }
      
      const elementCount = Object.values(interfaceElements).filter(Boolean).length;
      const status = elementCount >= 2 ? 'passed' : 'warning';
      const message = `Found ${elementCount}/5 expected interface elements`;
      
      logTest('Chat Interface Analysis', status, message, { 
        elements: interfaceElements 
      });
      
    } catch (error) {
      logTest('Chat Interface Analysis', 'failed', 'Error analyzing chat interface', { error: error.message });
    }

    // Test 5: Test AI Chat Functionality
    console.log('\n5. Testing AI Chat Functionality...');
    const testMessages = [
      "Hello, this is a test message. Can you respond?",
      "What is your name?",
      "Tell me something about yourself",
      "What can you help me with?"
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n   Testing message ${i + 1}: "${message}"`);
      
      try {
        // Find input field
        const inputField = await page.locator('textarea, input[type="text"], input[placeholder*="message"], [role="textbox"]').first();
        
        if (await inputField.isVisible()) {
          // Clear and type message
          await inputField.clear();
          await inputField.fill(message);
          
          await saveScreenshot(page, `message-${i + 1}-typed`, `Message ${i + 1} typed: ${message.substring(0, 30)}...`);
          
          // Find and click send button
          const sendButton = await page.locator('button:has-text("Send"), button[type="submit"], button:has-text("Submit")').first();
          
          if (await sendButton.isVisible()) {
            await sendButton.click();
            console.log(`   ✓ Message sent: "${message}"`);
            
            // Wait for response
            console.log('   ⏳ Waiting for AI response...');
            await page.waitForTimeout(5000);
            
            // Look for response indicators
            const responseIndicators = [
              'text=typing',
              'text=generating',
              '[class*="loading"]',
              '[class*="thinking"]',
              'text=...',
              '.spinner',
              '.loading'
            ];
            
            let responseIndicatorFound = false;
            for (const selector of responseIndicators) {
              if (await page.isVisible(selector)) {
                console.log(`   🤖 Response indicator found: ${selector}`);
                responseIndicatorFound = true;
                break;
              }
            }
            
            // Wait longer for actual response
            await page.waitForTimeout(10000);
            
            await saveScreenshot(page, `message-${i + 1}-sent`, `After sending message ${i + 1}`);
            
            // Check for new messages in chat
            const messageElements = await page.locator('[class*="message"], .message, [role="article"]').all();
            
            if (messageElements.length > 0) {
              console.log(`   ✓ Found ${messageElements.length} message elements in chat`);
              
              // Try to get the text content of recent messages
              const recentMessages = [];
              for (const element of messageElements.slice(-4)) { // Get last 4 messages
                try {
                  const text = await element.textContent();
                  if (text && text.trim()) {
                    recentMessages.push(text.trim());
                  }
                } catch (e) {
                  // Ignore element access errors
                }
              }
              
              const chatInteraction = {
                messageNumber: i + 1,
                userMessage: message,
                responseIndicator: responseIndicatorFound,
                responseReceived: recentMessages.length > 0,
                recentMessages: recentMessages,
                timestamp: new Date().toISOString()
              };
              
              testResults.chatInteractions.push(chatInteraction);
              
              if (recentMessages.length > 0) {
                console.log(`   ✅ Response detected:`);
                recentMessages.forEach((msg, idx) => {
                  console.log(`      ${idx + 1}: ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
                });
              }
            } else {
              console.log('   ⚠️ No message elements found in chat');
            }
            
          } else {
            console.log('   ❌ Send button not found');
          }
        } else {
          console.log('   ❌ Input field not found');
          break;
        }
        
        // Wait between messages
        if (i < testMessages.length - 1) {
          await page.waitForTimeout(3000);
        }
        
      } catch (error) {
        console.log(`   ❌ Error with message ${i + 1}: ${error.message}`);
        testResults.errors.push({
          type: 'chat_message_error',
          messageNumber: i + 1,
          message: message,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Evaluate chat functionality
    const totalInteractions = testResults.chatInteractions.length;
    const successfulInteractions = testResults.chatInteractions.filter(i => i.responseReceived).length;
    
    if (successfulInteractions > 0) {
      logTest('AI Chat Functionality', 'passed', `${successfulInteractions}/${totalInteractions} chat interactions successful`, {
        totalMessages: totalInteractions,
        responsesReceived: successfulInteractions,
        interactions: testResults.chatInteractions
      });
    } else if (totalInteractions > 0) {
      logTest('AI Chat Functionality', 'warning', 'Messages sent but no responses detected', {
        totalMessages: totalInteractions,
        responsesReceived: successfulInteractions
      });
    } else {
      logTest('AI Chat Functionality', 'failed', 'Could not send any messages');
    }

    // Test 6: Check for Real-time Features
    console.log('\n6. Testing Real-time Features...');
    try {
      const realtimeFeatures = {
        streamingText: false,
        typingIndicators: false,
        instantUpdates: false,
        websockets: false
      };
      
      // Check for streaming/typing indicators
      const streamingSelectors = [
        'text=typing',
        'text=generating',
        'text=thinking',
        '.typing-indicator',
        '.loading-dots',
        '[class*="stream"]',
        '[class*="typing"]'
      ];
      
      for (const selector of streamingSelectors) {
        if (await page.isVisible(selector)) {
          realtimeFeatures.typingIndicators = true;
          break;
        }
      }
      
      // Check for WebSocket connections in network
      const wsConnections = [];
      page.on('websocket', ws => {
        wsConnections.push({
          url: ws.url(),
          timestamp: new Date().toISOString()
        });
        realtimeFeatures.websockets = true;
        console.log(`🔌 WebSocket connection: ${ws.url()}`);
      });
      
      const featureCount = Object.values(realtimeFeatures).filter(Boolean).length;
      const status = featureCount > 0 ? 'passed' : 'warning';
      
      logTest('Real-time Features', status, `Found ${featureCount}/4 real-time features`, {
        features: realtimeFeatures,
        websocketConnections: wsConnections
      });
      
    } catch (error) {
      logTest('Real-time Features', 'failed', 'Error checking real-time features', { error: error.message });
    }

    // Final screenshot
    await saveScreenshot(page, 'final-state', 'Final state of chat interface');

  } catch (error) {
    console.error('\n🔴 Critical test error:', error.message);
    testResults.errors.push({
      type: 'critical_error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
  }

  // Generate Summary
  console.log('\n==========================================');
  console.log('TEST SUMMARY');
  console.log('==========================================');
  
  testResults.summary.total = testResults.tests.length;
  testResults.summary.passed = testResults.tests.filter(t => t.status === 'passed').length;
  testResults.summary.failed = testResults.tests.filter(t => t.status === 'failed').length;
  testResults.summary.warnings = testResults.tests.filter(t => t.status === 'warning').length;
  
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warnings}`);
  
  console.log('\n==========================================');
  console.log('AI CHAT ASSESSMENT');
  console.log('==========================================');
  
  const chatTest = testResults.tests.find(t => t.name === 'AI Chat Functionality');
  if (chatTest) {
    console.log(`Chat Status: ${chatTest.status === 'passed' ? '✅ WORKING' : chatTest.status === 'warning' ? '⚠️ PARTIAL' : '❌ NOT WORKING'}`);
    console.log(`Message: ${chatTest.message}`);
    
    if (testResults.chatInteractions.length > 0) {
      console.log(`\nChat Interactions:`);
      testResults.chatInteractions.forEach((interaction, idx) => {
        console.log(`  ${idx + 1}. "${interaction.userMessage.substring(0, 40)}..."`);
        console.log(`     Response: ${interaction.responseReceived ? '✅ Yes' : '❌ No'}`);
      });
    }
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n⚠️ ERRORS FOUND:');
    testResults.errors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. [${error.type}] ${error.message}`);
    });
  }
  
  console.log(`\n📁 Screenshots saved in: ${screenshotDir}`);
  console.log(`📸 Total screenshots: ${testResults.screenshots.length}`);
  
  // Save detailed report
  const reportFile = path.join(__dirname, 'ai-chat-test-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`📄 Detailed report saved: ${reportFile}`);
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testAIChatFunctionality()
    .then(results => {
      console.log('\n🏁 Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAIChatFunctionality };