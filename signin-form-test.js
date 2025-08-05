const puppeteer = require('puppeteer');

async function testSigninForm() {
  console.log('🚀 Starting Signin Form Functionality Test\n');
  
  let browser;
  let results = {
    formLoading: 'PENDING',
    buttonFunctionality: 'PENDING', 
    authenticationFlow: 'PENDING',
    errorHandling: 'PENDING',
    loadingStates: 'PENDING',
    successRedirect: 'PENDING',
    consoleErrors: 'PENDING'
  };

  try {
    browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Collect console messages and errors
    const consoleLogs = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // TEST 1: Form Loading
    console.log('📋 TEST 1: Form Loading');
    try {
      const response = await page.goto('http://localhost:3003/auth/signin', { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      
      if (response && response.ok()) {
        // Check if form elements are present
        const emailInput = await page.$('#email');
        const passwordInput = await page.$('#password');
        const submitButton = await page.$('button[type="submit"]');
        
        if (emailInput && passwordInput && submitButton) {
          results.formLoading = 'PASS';
          console.log('   ✅ PASS: Page loaded successfully with all form elements');
        } else {
          results.formLoading = 'FAIL';
          console.log('   ❌ FAIL: Missing form elements');
        }
      } else {
        results.formLoading = 'FAIL';
        console.log('   ❌ FAIL: Page failed to load');
      }
    } catch (error) {
      results.formLoading = 'FAIL';
      console.log(`   ❌ FAIL: ${error.message}`);
    }

    // Wait a moment for any hydration to complete
    await page.waitForTimeout(2000);

    // TEST 2: Button Functionality (Form Submission)
    console.log('\n🔘 TEST 2: Button Functionality');
    try {
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'testpass');
      
      // Monitor network requests to see if form submission occurs
      let formSubmitted = false;
      page.on('request', request => {
        if (request.url().includes('/api/auth/callback/credentials')) {
          formSubmitted = true;
        }
      });
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      if (formSubmitted) {
        results.buttonFunctionality = 'PASS';
        console.log('   ✅ PASS: Form submission triggered successfully');
      } else {
        results.buttonFunctionality = 'FAIL';
        console.log('   ❌ FAIL: Form submission not detected');
      }
    } catch (error) {
      results.buttonFunctionality = 'FAIL';
      console.log(`   ❌ FAIL: ${error.message}`);
    }

    // TEST 3: Authentication Flow (Valid Credentials)
    console.log('\n🔑 TEST 3: Authentication Flow');
    try {
      // Clear form and enter valid credentials
      await page.goto('http://localhost:3003/auth/signin', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      await page.type('#email', 'lukemoeller@yahoo.com');
      await page.type('#password', 'password123');
      
      await page.click('button[type="submit"]');
      
      // Wait for either redirect or error message
      try {
        await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle2' });
        
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard')) {
          results.authenticationFlow = 'PASS';
          results.successRedirect = 'PASS';
          console.log('   ✅ PASS: Authentication successful');
          console.log('   ✅ PASS: Redirected to dashboard');
        } else {
          results.authenticationFlow = 'FAIL';
          results.successRedirect = 'FAIL';
          console.log(`   ❌ FAIL: Unexpected redirect to ${currentUrl}`);
        }
      } catch (navigationError) {
        // Check if we stayed on signin page with error message
        const errorElement = await page.$('.bg-red-50');
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          results.authenticationFlow = 'FAIL';
          console.log(`   ❌ FAIL: Authentication failed with error: ${errorText}`);
        } else {
          results.authenticationFlow = 'FAIL';  
          console.log('   ❌ FAIL: No navigation occurred and no error shown');
        }
      }
    } catch (error) {
      results.authenticationFlow = 'FAIL';
      console.log(`   ❌ FAIL: ${error.message}`);
    }

    // TEST 4: Error Handling (Invalid Credentials)
    console.log('\n⚠️  TEST 4: Error Handling');
    try {
      await page.goto('http://localhost:3003/auth/signin', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      await page.type('#email', 'wrong@email.com');
      await page.type('#password', 'wrongpassword');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      const errorElement = await page.$('.bg-red-50');
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        results.errorHandling = 'PASS';
        console.log(`   ✅ PASS: Error message displayed: ${errorText.trim()}`);
      } else {
        results.errorHandling = 'FAIL';
        console.log('   ❌ FAIL: No error message displayed for invalid credentials');
      }
    } catch (error) {
      results.errorHandling = 'FAIL';
      console.log(`   ❌ FAIL: ${error.message}`);
    }

    // TEST 5: Loading States
    console.log('\n⏳ TEST 5: Loading States');
    try {
      await page.goto('http://localhost:3003/auth/signin', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);
      
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'testpass');
      
      // Click submit and immediately check for loading state
      await page.click('button[type="submit"]');
      
      // Check for loading spinner or disabled state very quickly
      const loadingFound = await page.waitForFunction(() => {
        const button = document.querySelector('button[type="submit"]');
        return button && (
          button.textContent.includes('Signing in...') || 
          button.disabled ||
          button.querySelector('.animate-spin')
        );
      }, { timeout: 2000 }).catch(() => false);
      
      if (loadingFound) {
        results.loadingStates = 'PASS';
        console.log('   ✅ PASS: Loading state displayed during form submission');
      } else {
        results.loadingStates = 'FAIL';
        console.log('   ❌ FAIL: No loading state detected');
      }
    } catch (error) {
      results.loadingStates = 'FAIL';
      console.log(`   ❌ FAIL: ${error.message}`);
    }

    // TEST 7: Console Errors (NextJS Hydration)
    console.log('\n🔍 TEST 7: Console Errors');
    const hydrationErrors = consoleErrors.filter(error => 
      error.includes('hydration') || 
      error.includes('Hydration') ||
      error.includes('Event handlers cannot be passed to Client Component props')
    );
    
    if (hydrationErrors.length === 0) {
      results.consoleErrors = 'PASS';
      console.log('   ✅ PASS: No hydration errors detected');
    } else {
      results.consoleErrors = 'FAIL';
      console.log('   ❌ FAIL: Hydration errors found:');
      hydrationErrors.forEach(error => console.log(`       ${error}`));
    }

    // Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`1. Form Loading: ${results.formLoading}`);
    console.log(`2. Button Functionality: ${results.buttonFunctionality}`);
    console.log(`3. Authentication Flow: ${results.authenticationFlow}`);
    console.log(`4. Error Handling: ${results.errorHandling}`);
    console.log(`5. Loading States: ${results.loadingStates}`);
    console.log(`6. Success Redirect: ${results.successRedirect}`);
    console.log(`7. Console Errors: ${results.consoleErrors}`);
    
    const passCount = Object.values(results).filter(result => result === 'PASS').length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passCount}/${totalTests} tests passed`);
    
    if (passCount === totalTests) {
      console.log('🎉 All tests passed! The signin form is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above.');
    }

    // Log all console messages if there were any significant issues
    if (consoleErrors.length > 0) {
      console.log('\n📝 All Console Messages:');
      consoleLogs.forEach(log => console.log(`   ${log}`));
    }

    return results;

  } catch (error) {
    console.error('Test execution failed:', error);
    return results;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSigninForm().then(results => {
  process.exit(Object.values(results).includes('FAIL') ? 1 : 0);
});