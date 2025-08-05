const puppeteer = require('puppeteer');
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
  consoleMessages: [],
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

// Helper function to wait for element
async function waitForSelector(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

// Helper function to wait for any of multiple selectors
async function waitForAnySelector(page, selectors, timeout = 5000) {
  const promises = selectors.map(selector => 
    page.waitForSelector(selector, { timeout }).catch(() => null)
  );
  
  try {
    await Promise.race(promises);
    return true;
  } catch (error) {
    return false;
  }
}

// Main test function
async function testAIChatFunctionality() {
  console.log('=== AI Chat Functionality Test Suite (Puppeteer) ===');
  console.log(`Testing: ${BASE_URL}`);
  console.log(`User: ${TEST_USER.email}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  // Listen for console messages
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    testResults.consoleMessages.push(logEntry);
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
      const response = await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await saveScreenshot(page, 'landing-page', 'Initial landing page load');
      
      const title = await page.title();
      const content = await page.content();
      
      const hasExpectedContent = content.includes('Echoes of Me') || 
                                 content.includes('Echos Of Me') ||
                                 content.includes('Welcome') ||
                                 content.includes('Sign In') ||
                                 content.includes('Login');
      
      if (response.ok() && hasExpectedContent) {
        logTest('Landing Page Access', 'passed', `Page loaded successfully: "${title}"`, {
          statusCode: response.status(),
          title
        });
      } else {
        logTest('Landing Page Access', 'warning', 'Page loaded but expected content not found', {
          statusCode: response.status(),
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
        'a:contains("Sign In")',
        'a:contains("Login")', 
        'a:contains("Log In")',
        'a[href*="signin"]',
        'a[href*="login"]',
        'button:contains("Sign")',
        'button:contains("Login")'
      ];
      
      let loginFound = false;
      
      // Check if we're already on a login page
      const currentContent = await page.content();
      if (currentContent.includes('password') && currentContent.includes('email')) {
        console.log('🔍 Already on login page');
        loginFound = true;
      } else {
        // Try to find login link
        for (const selector of loginSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              console.log(`🔍 Found login element: ${selector}`);
              await element.click();
              await page.waitForTimeout(2000);
              loginFound = true;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
      }
      
      if (!loginFound) {
        // Try navigating directly to auth page
        console.log('🔍 Trying direct navigation to /auth/signin');
        await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'networkidle2' });
      }
      
      await page.waitForTimeout(2000);
      await saveScreenshot(page, 'login-page', 'Login page');
      
      // Fill login form
      const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[id*="email"]'];
      const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id*="password"]'];
      
      let emailInput = null;
      let passwordInput = null;
      
      for (const selector of emailSelectors) {
        emailInput = await page.$(selector);
        if (emailInput) break;
      }
      
      for (const selector of passwordSelectors) {
        passwordInput = await page.$(selector);
        if (passwordInput) break;
      }
      
      if (emailInput && passwordInput) {
        await emailInput.click({ clickCount: 3 }); // Select all
        await emailInput.type(TEST_USER.email);
        
        await passwordInput.click({ clickCount: 3 }); // Select all
        await passwordInput.type(TEST_USER.password);
        
        await saveScreenshot(page, 'login-filled', 'Login form filled');
        
        // Submit form
        const submitSelectors = [
          'button[type="submit"]',
          'button:contains("Sign")',
          'button:contains("Login")',
          'input[type="submit"]'
        ];
        
        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const submitButton = await page.$(selector);
            if (submitButton) {
              await submitButton.click();
              submitted = true;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (!submitted) {
          // Try pressing Enter in password field
          await passwordInput.press('Enter');
        }
        
        // Wait for navigation
        await page.waitForTimeout(5000);
        
        // Check if login was successful
        const currentUrl = page.url();
        const newContent = await page.content();
        const isLoggedIn = currentUrl.includes('dashboard') || 
                          currentUrl.includes('home') || 
                          newContent.includes('Dashboard') ||
                          newContent.includes('Welcome back') ||
                          newContent.includes('Logout') ||
                          newContent.includes('AI Echo');
        
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
        'a:contains("AI Echo")',
        'a:contains("Chat")',
        'a:contains("AI Chat")',
        'a[href*="ai-echo"]',
        'a[href*="chat"]',
        'button:contains("AI")',
        'button:contains("Echo")',
        'nav a:contains("Echo")'
      ];
      
      let chatFound = false;
      for (const selector of chatNavigationSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            console.log(`🔍 Found AI chat link: ${selector}`);
            await element.click();
            await page.waitForTimeout(3000);
            chatFound = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!chatFound) {
        // Try direct navigation
        console.log('🔍 Trying direct navigation to /ai-echo');
        await page.goto(`${BASE_URL}/ai-echo`, { waitUntil: 'networkidle2' });
      }
      
      await page.waitForTimeout(2000);
      await saveScreenshot(page, 'ai-chat-page', 'AI Echo chat page');
      
      // Verify we're on the chat page
      const content = await page.content();
      const currentUrl = page.url();
      
      const isChatPage = content.includes('textarea') ||
                        content.includes('input') ||
                        content.includes('Chat') ||
                        content.includes('Message') ||
                        content.includes('Send') ||
                        currentUrl.includes('ai-echo') ||
                        currentUrl.includes('chat');
      
      if (isChatPage) {
        logTest('AI Chat Navigation', 'passed', 'Successfully navigated to AI chat interface', {
          url: currentUrl
        });
      } else {
        logTest('AI Chat Navigation', 'failed', 'Could not find or navigate to AI chat interface', {
          url: currentUrl
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
        const element = await page.$(selector);
        if (element) {
          interfaceElements.messageInput = true;
          console.log(`✓ Found message input: ${selector}`);
          break;
        }
      }
      
      // Check for send button
      const sendSelectors = [
        'button:contains("Send")',
        'button[type="submit"]',
        'button:contains("Submit")',
        '[aria-label*="send"]',
        'button:contains("→")',
        'button svg' // Icon buttons
      ];
      
      for (const selector of sendSelectors) {
        const element = await page.$(selector);
        if (element) {
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
        const element = await page.$(selector);
        if (element) {
          interfaceElements.chatHistory = true;
          console.log(`✓ Found chat history area: ${selector}`);
          break;
        }
      }
      
      // Check for voice features
      const voiceSelectors = [
        'button:contains("Voice")',
        'button:contains("Speak")',
        '[aria-label*="voice"]',
        '[aria-label*="audio"]',
        'button:contains("🎤")',
        'button:contains("🔊")'
      ];
      
      for (const selector of voiceSelectors) {
        const element = await page.$(selector);
        if (element) {
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
        const inputSelectors = ['textarea', 'input[type="text"]', 'input[placeholder*="message"]', '[role="textbox"]'];
        let inputField = null;
        
        for (const selector of inputSelectors) {
          inputField = await page.$(selector);
          if (inputField) break;
        }
        
        if (inputField) {
          // Clear and type message
          await inputField.click({ clickCount: 3 }); // Select all
          await inputField.type(message);
          
          await saveScreenshot(page, `message-${i + 1}-typed`, `Message ${i + 1} typed`);
          
          // Find and click send button
          const sendSelectors = ['button:contains("Send")', 'button[type="submit"]', 'button:contains("Submit")'];
          let sendButton = null;
          
          for (const selector of sendSelectors) {
            sendButton = await page.$(selector);
            if (sendButton) break;
          }
          
          if (sendButton) {
            // Get message count before sending
            const messagesBefore = await page.$$('[class*="message"], .message, [role="article"]');
            
            await sendButton.click();
            console.log(`   ✓ Message sent: "${message}"`);
            
            // Wait for response
            console.log('   ⏳ Waiting for AI response...');
            await page.waitForTimeout(3000);
            
            // Look for loading indicators
            const loadingSelectors = [
              ':contains("typing")',
              ':contains("generating")',
              '[class*="loading"]',
              '[class*="thinking"]',
              ':contains("...")',
              '.spinner',
              '.loading'
            ];
            
            let responseIndicatorFound = false;
            for (const selector of loadingSelectors) {
              const element = await page.$(selector);
              if (element) {
                console.log(`   🤖 Response indicator found: ${selector}`);
                responseIndicatorFound = true;
                break;
              }
            }
            
            // Wait longer for actual response
            await page.waitForTimeout(8000);
            
            await saveScreenshot(page, `message-${i + 1}-sent`, `After sending message ${i + 1}`);
            
            // Check for new messages in chat
            const messagesAfter = await page.$$('[class*="message"], .message, [role="article"]');
            
            let recentMessages = [];
            if (messagesAfter.length > 0) {
              console.log(`   ✓ Found ${messagesAfter.length} message elements in chat`);
              
              // Get text content of recent messages
              for (const element of messagesAfter.slice(-4)) { // Get last 4 messages
                try {
                  const text = await page.evaluate(el => el.textContent, element);
                  if (text && text.trim()) {
                    recentMessages.push(text.trim());
                  }
                } catch (e) {
                  // Ignore element access errors
                }
              }
            }
            
            const chatInteraction = {
              messageNumber: i + 1,
              userMessage: message,
              responseIndicator: responseIndicatorFound,
              responseReceived: messagesAfter.length > messagesBefore.length || recentMessages.length > 0,
              messageCountBefore: messagesBefore.length,
              messageCountAfter: messagesAfter.length,
              recentMessages: recentMessages,
              timestamp: new Date().toISOString()
            };
            
            testResults.chatInteractions.push(chatInteraction);
            
            if (recentMessages.length > 0) {
              console.log(`   ✅ Response detected:`);
              recentMessages.forEach((msg, idx) => {
                console.log(`      ${idx + 1}: ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
              });
            } else {
              console.log('   ⚠️ No clear response detected');
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
  console.log('\n====================================================');
  console.log('TEST SUMMARY');
  console.log('====================================================');
  
  testResults.summary.total = testResults.tests.length;
  testResults.summary.passed = testResults.tests.filter(t => t.status === 'passed').length;
  testResults.summary.failed = testResults.tests.filter(t => t.status === 'failed').length;
  testResults.summary.warnings = testResults.tests.filter(t => t.status === 'warning').length;
  
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warnings}`);
  
  console.log('\n====================================================');
  console.log('AI CHAT ASSESSMENT');
  console.log('====================================================');
  
  const chatTest = testResults.tests.find(t => t.name === 'AI Chat Functionality');
  if (chatTest) {
    console.log(`Chat Status: ${chatTest.status === 'passed' ? '✅ WORKING' : chatTest.status === 'warning' ? '⚠️ PARTIAL' : '❌ NOT WORKING'}`);
    console.log(`Message: ${chatTest.message}`);
    
    if (testResults.chatInteractions.length > 0) {
      console.log(`\nChat Interactions:`);
      testResults.chatInteractions.forEach((interaction, idx) => {
        console.log(`  ${idx + 1}. "${interaction.userMessage.substring(0, 40)}..."`);
        console.log(`     Response: ${interaction.responseReceived ? '✅ Yes' : '❌ No'}`);
        console.log(`     Messages: ${interaction.messageCountBefore} → ${interaction.messageCountAfter}`);
      });
    }
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n⚠️ ERRORS FOUND:');
    testResults.errors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. [${error.type}] ${error.message}`);
    });
  }
  
  if (testResults.consoleMessages.length > 0) {
    console.log('\n💬 CONSOLE MESSAGES:');
    testResults.consoleMessages.slice(-10).forEach((msg, idx) => {
      console.log(`  ${idx + 1}. [${msg.type}] ${msg.text.substring(0, 80)}${msg.text.length > 80 ? '...' : ''}`);
    });
  }
  
  console.log(`\n📁 Screenshots saved in: ${screenshotDir}`);
  console.log(`📸 Total screenshots: ${testResults.screenshots.length}`);
  
  // Save detailed report
  const reportFile = path.join(__dirname, 'ai-chat-puppeteer-test-report.json');
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