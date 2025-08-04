const puppeteer = require('puppeteer');

async function testAIEchoChat() {
  console.log('=== AI Echo Chat Browser Test ===');
  console.log('Starting comprehensive test of AI Echo functionality...\n');

  let browser;
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    errors: [],
    consoleErrors: [],
    networkErrors: []
  };

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set up error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.consoleErrors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });

    page.on('pageerror', error => {
      testResults.errors.push({
        message: error.message,
        stack: error.stack
      });
    });

    page.on('requestfailed', request => {
      testResults.networkErrors.push({
        url: request.url(),
        failure: request.failure()
      });
    });

    // Test 1: Landing Page
    console.log('1. Testing Landing Page...');
    await page.goto('http://localhost:3004', { waitUntil: 'networkidle2' });
    const title = await page.title();
    testResults.tests.push({
      name: 'Landing Page',
      status: title.includes('Echos Of Me') ? 'passed' : 'failed',
      details: { title }
    });
    console.log(`   ✓ Page title: ${title}`);

    // Test 2: Authentication
    console.log('\n2. Testing Authentication...');
    await page.click('a[href="/auth/signin"]');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    
    await page.type('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.type('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const isOnDashboard = page.url().includes('/dashboard');
    testResults.tests.push({
      name: 'Authentication',
      status: isOnDashboard ? 'passed' : 'failed',
      details: { finalUrl: page.url() }
    });
    console.log(`   ${isOnDashboard ? '✓' : '✗'} Redirected to dashboard: ${page.url()}`);

    // Test 3: Navigate to AI Echo
    console.log('\n3. Testing AI Echo Navigation...');
    await page.waitForSelector('text/AI Echo', { timeout: 5000 });
    await page.click('text/AI Echo');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const isOnAIEcho = page.url().includes('/ai-echo');
    testResults.tests.push({
      name: 'AI Echo Navigation',
      status: isOnAIEcho ? 'passed' : 'failed',
      details: { url: page.url() }
    });
    console.log(`   ${isOnAIEcho ? '✓' : '✗'} Navigated to AI Echo: ${page.url()}`);

    // Test 4: Check UI Elements
    console.log('\n4. Checking AI Echo UI Elements...');
    const uiElements = {
      textarea: await page.$('textarea') !== null,
      sendButton: await page.$('button:has-text("Send")') !== null || await page.$('button:has(span:has-text("Send"))') !== null,
      chatArea: await page.$('[class*="chat"], [class*="message"], [class*="Card"]') !== null,
      header: await page.$('h1, h2, h3') !== null
    };
    
    testResults.tests.push({
      name: 'UI Elements',
      status: Object.values(uiElements).every(v => v) ? 'passed' : 'partial',
      details: uiElements
    });
    
    console.log('   UI Elements found:');
    Object.entries(uiElements).forEach(([key, found]) => {
      console.log(`     ${found ? '✓' : '✗'} ${key}`);
    });

    // Test 5: Send Message
    console.log('\n5. Testing Message Sending...');
    const messageToSend = 'Hello, this is a test message from the automated test.';
    
    // Type message
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.type(messageToSend);
      
      // Try to send via Enter key first
      await page.keyboard.press('Enter');
      
      // If that doesn't work, try clicking send button
      const sendButton = await page.$('button:has-text("Send")') || await page.$('button:has(span:has-text("Send"))');
      if (sendButton) {
        await sendButton.click();
      }
      
      // Wait for response
      try {
        await page.waitForFunction(
          text => document.body.innerText.includes(text),
          { timeout: 10000 },
          messageToSend
        );
        
        testResults.tests.push({
          name: 'Message Sending',
          status: 'passed',
          details: { messageSent: true, messageVisible: true }
        });
        console.log('   ✓ Message sent and displayed');
      } catch (e) {
        testResults.tests.push({
          name: 'Message Sending',
          status: 'failed',
          details: { error: 'Message not visible after sending' }
        });
        console.log('   ✗ Message not visible after sending');
      }
    } else {
      testResults.tests.push({
        name: 'Message Sending',
        status: 'failed',
        details: { error: 'No textarea found' }
      });
      console.log('   ✗ No textarea found');
    }

    // Test 6: Check for Voice Features
    console.log('\n6. Checking Voice Synthesis Features...');
    const voiceButtons = await page.$$('button[aria-label*="play"], button[aria-label*="voice"], button:has-text("🔊"), button:has([class*="volume"])');
    testResults.tests.push({
      name: 'Voice Features',
      status: voiceButtons.length > 0 ? 'found' : 'not found',
      details: { voiceButtonCount: voiceButtons.length }
    });
    console.log(`   Voice buttons found: ${voiceButtons.length}`);

    // Test 7: Mobile Responsiveness
    console.log('\n7. Testing Mobile Responsiveness...');
    await page.setViewport({ width: 375, height: 667 });
    
    const mobileTests = {
      viewportMeta: await page.$('meta[name="viewport"]') !== null,
      noHorizontalScroll: await page.evaluate(() => {
        return document.body.scrollWidth <= window.innerWidth;
      }),
      textareaVisible: await page.$('textarea') !== null
    };
    
    testResults.tests.push({
      name: 'Mobile Responsiveness',
      status: Object.values(mobileTests).every(v => v) ? 'passed' : 'failed',
      details: mobileTests
    });
    
    console.log('   Mobile tests:');
    Object.entries(mobileTests).forEach(([key, passed]) => {
      console.log(`     ${passed ? '✓' : '✗'} ${key}`);
    });

    // Test 8: Keyboard Shortcuts
    console.log('\n8. Testing Keyboard Shortcuts...');
    await page.setViewport({ width: 1280, height: 720 }); // Back to desktop
    
    // Test Alt+V
    await page.keyboard.down('Alt');
    await page.keyboard.press('V');
    await page.keyboard.up('Alt');
    await page.waitForTimeout(500);
    
    // Test Alt+H
    await page.keyboard.down('Alt');
    await page.keyboard.press('H');
    await page.keyboard.up('Alt');
    await page.waitForTimeout(500);
    
    testResults.tests.push({
      name: 'Keyboard Shortcuts',
      status: 'tested',
      details: { shortcuts: ['Alt+V', 'Alt+H'] }
    });
    console.log('   Keyboard shortcuts tested: Alt+V, Alt+H');

    // Test 9: Family Context
    console.log('\n9. Testing Family Member Context...');
    await page.goto('http://localhost:3004/ai-echo?family=daughter&name=Sarah', { waitUntil: 'networkidle2' });
    
    const pageContent = await page.content();
    const hasFamily = pageContent.includes('daughter') || pageContent.includes('Sarah');
    
    testResults.tests.push({
      name: 'Family Context',
      status: hasFamily ? 'passed' : 'failed',
      details: { contextFound: hasFamily }
    });
    console.log(`   ${hasFamily ? '✓' : '✗'} Family context visible`);

    // Test 10: Error Handling
    console.log('\n10. Testing Error Handling...');
    // This would normally test API failures, but we'll check UI error states
    const hasErrorBoundary = await page.evaluate(() => {
      return window.React && window.React.ErrorBoundary !== undefined;
    });
    
    testResults.tests.push({
      name: 'Error Handling',
      status: 'checked',
      details: { 
        hasErrorBoundary,
        consoleErrors: testResults.consoleErrors.length,
        networkErrors: testResults.networkErrors.length
      }
    });
    console.log(`   Console errors: ${testResults.consoleErrors.length}`);
    console.log(`   Network errors: ${testResults.networkErrors.length}`);

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    testResults.errors.push({
      fatal: true,
      message: error.message,
      stack: error.stack
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  const passed = testResults.tests.filter(t => t.status === 'passed').length;
  const failed = testResults.tests.filter(t => t.status === 'failed').length;
  const total = testResults.tests.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🔶 Other: ${total - passed - failed}`);
  
  if (testResults.consoleErrors.length > 0) {
    console.log(`\n⚠️  Console Errors (${testResults.consoleErrors.length}):`);
    testResults.consoleErrors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.text}`);
    });
  }
  
  if (testResults.networkErrors.length > 0) {
    console.log(`\n⚠️  Network Errors (${testResults.networkErrors.length}):`);
    testResults.networkErrors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.url} - ${err.failure?.errorText}`);
    });
  }

  // Save results
  const fs = require('fs');
  fs.writeFileSync('ai-echo-browser-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Detailed results saved to: ai-echo-browser-test-results.json');

  return testResults;
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testAIEchoChat();
} catch (e) {
  console.error('Puppeteer is not installed. Please run: npm install puppeteer');
  console.log('\nAlternatively, the Playwright tests would work better in a full environment.');
}