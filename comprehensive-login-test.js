const puppeteer = require('puppeteer');
const fs = require('fs');

async function comprehensiveLoginTest() {
  console.log('🔍 STARTING COMPREHENSIVE LOGIN VERIFICATION TEST');
  console.log('Testing credentials: lukemoeller@yahoo.com / password123');
  console.log('Expected: Login should succeed and redirect to dashboard');
  console.log('========================================================');

  let browser;
  let page;
  const consoleMessages = [];
  const errorMessages = [];
  const networkFailures = [];
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Capture console messages and errors
    page.on('console', (msg) => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', (error) => {
      const errorMsg = `Page Error: ${error.message}`;
      errorMessages.push(errorMsg);
      console.log(`🚨 ${errorMsg}`);
    });

    // Capture network failures
    page.on('response', (response) => {
      if (response.status() >= 400) {
        const failure = `${response.status()} ${response.url()}`;
        networkFailures.push(failure);
        console.log(`🚨 Network Failure: ${failure}`);
      }
    });

    // Step 1: Navigate to signin page
    console.log('📄 Step 1: Navigating to signin page...');
    await page.goto('http://localhost:3001/auth/signin', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Verify page loaded correctly
    const title = await page.title();
    console.log(`📍 Page title: ${title}`);
    
    if (!title.toLowerCase().includes('sign')) {
      console.log('⚠️  Warning: Page title doesn\'t contain "sign" - might be wrong page');
    } else {
      console.log('✅ Signin page loaded successfully');
    }

    // Take screenshot of signin page
    await page.screenshot({ path: 'signin-page.png', fullPage: true });
    console.log('📸 Screenshot saved: signin-page.png');

    // Step 2: Check for form elements
    console.log('📋 Step 2: Verifying login form elements...');
    
    // Look for email input with multiple selectors
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]', 
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      'input[id*="email" i]'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.$(selector);
        if (emailInput) {
          console.log(`✅ Found email input with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    // Look for password input
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[id*="password" i]'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.$(selector);
        if (passwordInput) {
          console.log(`✅ Found password input with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    // Look for submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign")',
      'button:has-text("Login")',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          console.log(`✅ Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!emailInput) {
      console.log('❌ CRITICAL: Email input not found');
      const allInputs = await page.$$eval('input', inputs => 
        inputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          className: input.className
        }))
      );
      console.log('🔍 All inputs found:', JSON.stringify(allInputs, null, 2));
      throw new Error('Email input not found');
    }

    if (!passwordInput) {
      console.log('❌ CRITICAL: Password input not found');
      throw new Error('Password input not found');
    }

    if (!submitButton) {
      console.log('❌ CRITICAL: Submit button not found');
      const allButtons = await page.$$eval('button', buttons => 
        buttons.map(button => ({
          type: button.type,
          textContent: button.textContent,
          className: button.className
        }))
      );
      console.log('🔍 All buttons found:', JSON.stringify(allButtons, null, 2));
      throw new Error('Submit button not found');
    }

    console.log('✅ All login form elements are present');

    // Step 3: Fill login form
    console.log('📝 Step 3: Filling login form with test credentials...');
    await emailInput.type('lukemoeller@yahoo.com', { delay: 50 });
    await passwordInput.type('password123', { delay: 50 });
    console.log('✅ Credentials entered');

    // Clear previous messages to focus on login attempt
    consoleMessages.length = 0;
    errorMessages.length = 0;
    networkFailures.length = 0;

    // Step 4: Submit login form and monitor response
    console.log('🚀 Step 4: Submitting login form...');
    const currentUrl = page.url();
    console.log(`📍 URL before submission: ${currentUrl}`);

    // Wait for navigation or specific conditions
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      page.waitForSelector('[role="alert"], .error, .text-red', { timeout: 5000 }).catch(() => null),
      new Promise(resolve => setTimeout(resolve, 10000))
    ]);

    await submitButton.click();

    // Wait a bit more for any async processing
    await page.waitForTimeout(3000);
    
    const newUrl = page.url();
    console.log(`📍 URL after login attempt: ${newUrl}`);

    // Step 5: Analyze the result
    console.log('🔍 Step 5: Analyzing login result...');
    
    if (newUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS: Login succeeded - redirected to dashboard');
      
      // Verify dashboard loaded
      const dashboardElements = await page.$$('h1, h2, [role="heading"], .dashboard, main');
      if (dashboardElements.length > 0) {
        console.log('✅ Dashboard content is visible');
      } else {
        console.log('⚠️  Dashboard URL reached but content unclear');
      }

    } else if (newUrl.includes('/auth/signin') || newUrl.includes('/signin')) {
      console.log('❌ FAILURE: Login loop detected - still on signin page');
      
      // Check for error messages
      const errorSelectors = ['[role="alert"]', '.error', '.text-red', '[class*="error"]', '.text-red-500'];
      let errorFound = false;
      
      for (const selector of errorSelectors) {
        try {
          const errorElement = await page.$(selector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            if (errorText && errorText.trim()) {
              console.log(`🚨 Error message displayed: "${errorText.trim()}"`);
              errorFound = true;
            }
          }
        } catch (e) {}
      }
      
      if (!errorFound) {
        console.log('🚨 No error message shown - silent failure');
      }
    } else {
      console.log(`⚠️  UNEXPECTED: Redirected to unexpected page: ${newUrl}`);
    }

    // Take screenshot of result
    await page.screenshot({ path: 'login-result.png', fullPage: true });
    console.log('📸 Screenshot saved: login-result.png');

    // Step 6: Test session persistence if login succeeded
    if (newUrl.includes('/dashboard')) {
      console.log('🔄 Step 6: Testing session persistence...');
      
      // Refresh the page
      await page.reload({ waitUntil: 'networkidle2' });
      const urlAfterRefresh = page.url();
      
      if (urlAfterRefresh.includes('/dashboard')) {
        console.log('✅ Session persisted - user stayed on dashboard after refresh');
      } else {
        console.log('❌ Session failed - user redirected after refresh');
        console.log(`📍 URL after refresh: ${urlAfterRefresh}`);
      }

      // Test access to protected pages
      console.log('🛡️  Step 7: Testing protected page access...');
      await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle2' });
      const protectedPageUrl = page.url();
      
      if (protectedPageUrl.includes('/dashboard')) {
        console.log('✅ Protected page access succeeded');
      } else {
        console.log('❌ Protected page access failed - redirected to signin');
        console.log(`📍 Protected page redirect URL: ${protectedPageUrl}`);
      }
    }

    // Step 8: Report all captured issues
    console.log('\n📊 DIAGNOSTIC REPORT');
    console.log('===================');
    
    console.log('🖥️  Console Messages:');
    if (consoleMessages.length > 0) {
      consoleMessages.forEach(msg => console.log(`  - ${msg}`));
    } else {
      console.log('  - No console messages');
    }

    console.log('\n⚠️  JavaScript Errors:');
    if (errorMessages.length > 0) {
      errorMessages.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('  - No JavaScript errors');
    }

    console.log('\n🌐 Network Failures:');
    if (networkFailures.length > 0) {
      networkFailures.forEach(failure => console.log(`  - ${failure}`));
    } else {
      console.log('  - No network failures');
    }

    // Final verification
    const finalUrl = page.url();
    const loginSuccess = finalUrl.includes('/dashboard');
    
    console.log(`\n🎯 FINAL RESULT: ${loginSuccess ? 'LOGIN SUCCESS' : 'LOGIN FAILURE'}`);
    console.log(`📍 Final URL: ${finalUrl}`);

    // Take final screenshot
    await page.screenshot({ path: 'final-state.png', fullPage: true });
    console.log('📸 Final screenshot saved: final-state.png');

    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      testCredentials: 'lukemoeller@yahoo.com / password123',
      loginSuccess,
      finalUrl,
      consoleMessages,
      errorMessages,
      networkFailures,
      conclusion: loginSuccess ? 'LOGIN SYSTEM IS WORKING' : 'LOGIN SYSTEM IS BROKEN'
    };
    
    fs.writeFileSync('login-test-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Test report saved: login-test-report.json');

    return { success: loginSuccess, report };

  } catch (error) {
    console.log(`\n💥 TEST EXECUTION ERROR: ${error.message}`);
    
    if (page) {
      try {
        await page.screenshot({ path: 'error-state.png', fullPage: true });
        console.log('📸 Error screenshot saved: error-state.png');
      } catch (e) {}
    }
    
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  comprehensiveLoginTest().then(result => {
    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log('🎉 VERDICT: LOGIN SYSTEM IS WORKING CORRECTLY');
      process.exit(0);
    } else {
      console.log('💥 VERDICT: LOGIN SYSTEM IS BROKEN');
      console.log('The user was right - previous agents were lying about fixes.');
      process.exit(1);
    }
  }).catch(error => {
    console.log(`\n💥 TEST FAILED TO RUN: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { comprehensiveLoginTest };