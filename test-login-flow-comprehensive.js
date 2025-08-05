const puppeteer = require('puppeteer');
const fs = require('fs');

async function testLoginFlow() {
  console.log('🚀 Starting comprehensive login flow test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000,    // Slow down for observation
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    errors: [],
    networkRequests: [],
    redirects: [],
    consoleMessages: []
  };

  // Capture console messages and errors
  page.on('console', msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    results.consoleMessages.push(entry);
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });

  // Capture network requests
  page.on('response', response => {
    results.networkRequests.push({
      url: response.url(),
      status: response.status(),
      timestamp: new Date().toISOString()
    });
    
    if (response.status() >= 400) {
      console.log(`❌ Network Error: ${response.status()} - ${response.url()}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    results.errors.push({
      message: error.message,
      timestamp: new Date().toISOString()
    });
    console.log('❌ Page Error:', error.message);
  });

  try {
    // Test 1: Load signin page
    console.log('\n📋 Test 1: Loading signin page...');
    const signinResponse = await page.goto('http://localhost:3000/auth/signin', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    results.tests.push({
      name: 'Load signin page',
      status: signinResponse.status() === 200 ? 'PASS' : 'FAIL',
      details: `HTTP ${signinResponse.status()}`,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Signin page loaded: HTTP ${signinResponse.status()}`);
    
    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 5000 });
    console.log('✅ Login form found');

    // Test 2: Check for loading states or redirect loops initially
    console.log('\n📋 Test 2: Checking for infinite loading states...');
    const loadingElements = await page.$$('[data-testid*="loading"], .spinner, [class*="loading"]');
    const isStuckLoading = loadingElements.length > 0;
    
    results.tests.push({
      name: 'Check for stuck loading states',
      status: isStuckLoading ? 'FAIL' : 'PASS',
      details: `Found ${loadingElements.length} loading elements`,
      timestamp: new Date().toISOString()
    });

    // Test 3: Fill out and submit login form
    console.log('\n📋 Test 3: Testing login with credentials...');
    
    // Fill in email
    await page.type('#email', 'lukemoeller@yahoo.com');
    console.log('✅ Email entered');
    
    // Fill in password
    await page.type('#password', 'password123');
    console.log('✅ Password entered');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'login-before-submit.png' });
    console.log('📸 Screenshot taken: login-before-submit.png');
    
    // Track current URL before submit
    const urlBeforeSubmit = page.url();
    console.log(`🔗 URL before submit: ${urlBeforeSubmit}`);
    
    // Submit form and track redirects
    const navigationPromise = page.waitForNavigation({ 
      waitUntil: 'networkidle2', 
      timeout: 15000 
    }).catch(err => {
      console.log('⚠️ Navigation timeout or error:', err.message);
      return null;
    });
    
    await page.click('button[type="submit"]');
    console.log('✅ Login form submitted');
    
    // Wait for either redirect or error
    await Promise.race([
      navigationPromise,
      page.waitForSelector('[class*="error"], [class*="destructive"]', { timeout: 5000 }).catch(() => null),
      new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
    ]);

    // Check current URL after submit
    const urlAfterSubmit = page.url();
    console.log(`🔗 URL after submit: ${urlAfterSubmit}`);
    
    results.redirects.push({
      from: urlBeforeSubmit,
      to: urlAfterSubmit,
      timestamp: new Date().toISOString()
    });

    // Test 4: Check for redirect loops or infinite loading
    console.log('\n📋 Test 4: Checking for redirect loops...');
    let redirectCount = 0;
    const maxRedirects = 5;
    const urlHistory = [urlAfterSubmit];
    
    // Monitor for additional redirects
    for (let i = 0; i < maxRedirects; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      const currentUrl = page.url();
      
      if (currentUrl !== urlHistory[urlHistory.length - 1]) {
        urlHistory.push(currentUrl);
        redirectCount++;
        console.log(`🔄 Redirect ${redirectCount}: ${currentUrl}`);
        
        // Check if we're in a loop (same URL appears twice)
        if (urlHistory.slice(0, -1).includes(currentUrl)) {
          console.log('❌ REDIRECT LOOP DETECTED!');
          results.tests.push({
            name: 'Check for redirect loops',
            status: 'FAIL',
            details: `Redirect loop detected. URL history: ${urlHistory.join(' -> ')}`,
            timestamp: new Date().toISOString()
          });
          break;
        }
      } else {
        break; // No more redirects
      }
    }
    
    if (redirectCount === 0) {
      console.log('✅ No redirect loops detected');
      results.tests.push({
        name: 'Check for redirect loops',
        status: 'PASS',
        details: 'No redirect loops found',
        timestamp: new Date().toISOString()
      });
    }

    // Test 5: Check final authentication state
    console.log('\n📋 Test 5: Checking final authentication state...');
    const finalUrl = page.url();
    const isOnDashboard = finalUrl.includes('/dashboard');
    const isOnSignin = finalUrl.includes('/auth/signin');
    
    console.log(`🔗 Final URL: ${finalUrl}`);
    console.log(`📍 On dashboard: ${isOnDashboard}`);
    console.log(`📍 On signin: ${isOnSignin}`);
    
    // Check for error messages
    const errorElements = await page.$$('[class*="error"], [class*="destructive"], [role="alert"]');
    const hasErrors = errorElements.length > 0;
    
    if (hasErrors) {
      console.log('❌ Error messages found on page');
      for (let i = 0; i < errorElements.length; i++) {
        const errorText = await page.evaluate(el => el.textContent, errorElements[i]);
        console.log(`   Error ${i + 1}: ${errorText}`);
      }
    }
    
    // Test authentication success
    let authTest = {
      name: 'Authentication success',
      status: 'UNKNOWN',
      details: '',
      timestamp: new Date().toISOString()
    };
    
    if (isOnDashboard && !hasErrors) {
      authTest.status = 'PASS';
      authTest.details = 'Successfully redirected to dashboard';
      console.log('✅ Authentication successful - on dashboard');
    } else if (isOnSignin) {
      authTest.status = 'FAIL';
      authTest.details = 'Still on signin page - authentication failed';
      console.log('❌ Authentication failed - still on signin page');
    } else {
      authTest.status = 'FAIL';
      authTest.details = `Unexpected final URL: ${finalUrl}`;
      console.log(`❌ Authentication unclear - unexpected URL: ${finalUrl}`);
    }
    
    results.tests.push(authTest);

    // Test 6: If on dashboard, check for loading states
    if (isOnDashboard) {
      console.log('\n📋 Test 6: Checking dashboard for infinite loading states...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for page to settle
      
      const dashboardLoadingElements = await page.$$('[data-testid*="loading"], .spinner, [class*="loading"]');
      const dashboardStuckLoading = dashboardLoadingElements.length > 0;
      
      results.tests.push({
        name: 'Dashboard loading states',
        status: dashboardStuckLoading ? 'FAIL' : 'PASS',
        details: `Found ${dashboardLoadingElements.length} loading elements on dashboard`,
        timestamp: new Date().toISOString()
      });
      
      if (dashboardStuckLoading) {
        console.log(`❌ Dashboard has ${dashboardLoadingElements.length} stuck loading elements`);
      } else {
        console.log('✅ Dashboard loaded without stuck loading states');
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'login-final-state.png' });
    console.log('📸 Final screenshot taken: login-final-state.png');

  } catch (error) {
    console.log('❌ Test execution error:', error.message);
    results.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  await browser.close();
  
  // Save results
  fs.writeFileSync('login-flow-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📊 Test results saved to login-flow-test-results.json');
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  const passedTests = results.tests.filter(t => t.status === 'PASS').length;
  const failedTests = results.tests.filter(t => t.status === 'FAIL').length;
  const totalTests = results.tests.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${failedTests}/${totalTests}`);
  console.log(`🚨 Errors: ${results.errors.length}`);
  console.log(`📝 Console messages: ${results.consoleMessages.length}`);
  console.log(`🌐 Network requests: ${results.networkRequests.length}`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`   • ${test.name}: ${test.details}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    results.errors.forEach(error => {
      console.log(`   • ${error.message}`);
    });
  }
  
  return results;
}

// Run the test
testLoginFlow().catch(console.error);