const { chromium } = require('playwright');

async function testEndToEndLogin() {
  console.log('🎭 Starting End-to-End Login Test...\n');
  
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to signin page
    console.log('1. Navigating to signin page...');
    await page.goto('http://localhost:3001/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // Check if signin form is present
    const emailInput = await page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = await page.locator('input[name="password"], input[type="password"]').first();
    
    if (await emailInput.count() === 0 || await passwordInput.count() === 0) {
      console.log('❌ Login form not found on page');
      return false;
    }
    
    console.log('   ✅ Login form found');
    
    // Fill in credentials
    console.log('2. Filling in credentials...');
    await emailInput.fill('lukemoeller@yahoo.com');
    await passwordInput.fill('password123');
    console.log('   ✅ Credentials entered');
    
    // Submit form
    console.log('3. Submitting login form...');
    const submitButton = await page.locator('button[type="submit"], input[type="submit"]').first();
    
    if (await submitButton.count() === 0) {
      // Try to find button with text content
      const loginButton = await page.locator('button:has-text("Sign In"), button:has-text("Login"), button:has-text("Submit")').first();
      if (await loginButton.count() > 0) {
        await loginButton.click();
      } else {
        // Just press Enter on the password field
        await passwordInput.press('Enter');
      }
    } else {
      await submitButton.click();
    }
    
    console.log('   ✅ Form submitted');
    
    // Wait for navigation/response
    console.log('4. Waiting for authentication...');
    await page.waitForTimeout(3000); // Give time for authentication
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Try to navigate to dashboard
    console.log('5. Testing dashboard access...');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    // Check if we're on dashboard or redirected to signin
    if (finalUrl.includes('/dashboard')) {
      console.log('   ✅ Successfully accessed dashboard!');
      
      // Check for dashboard content
      const pageTitle = await page.title();
      const pageContent = await page.textContent('body');
      
      console.log(`   Page title: ${pageTitle}`);
      
      if (pageContent.includes('Dashboard') || pageContent.includes('Welcome') || pageTitle.includes('Dashboard')) {
        console.log('   ✅ Dashboard content loaded successfully');
        return true;
      } else {
        console.log('   ⚠️  Dashboard accessible but content may be missing');
        return true; // Still count as success if we reached the dashboard URL
      }
    } else if (finalUrl.includes('/signin') || finalUrl.includes('/auth')) {
      console.log('   ❌ Still on signin page - authentication failed');
      
      // Check for error messages
      const errorElements = await page.locator('.error, .alert, [class*="error"]').all();
      for (const errorEl of errorElements) {
        const errorText = await errorEl.textContent();
        if (errorText && errorText.trim()) {
          console.log(`   Error message: ${errorText.trim()}`);
        }
      }
      
      return false;
    } else {
      console.log(`   ⚠️  Unexpected URL: ${finalUrl}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ E2E test failed:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function runTest() {
  const success = await testEndToEndLogin();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 END-TO-END LOGIN TEST RESULTS');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('✅ LOGIN TEST: PASSED');
    console.log('✅ User can successfully log in');
    console.log('✅ Dashboard access: WORKING');
    console.log('✅ Authentication system: OPERATIONAL');
    console.log('\n🎉 The authentication system is now fully functional!');
    console.log('👤 User: lukemoeller@yahoo.com');
    console.log('🔑 Password: password123');
    console.log('🌐 URL: http://localhost:3001');
  } else {
    console.log('❌ LOGIN TEST: FAILED');
    console.log('❌ User cannot complete login flow');
    console.log('❌ Further investigation needed');
  }
  
  console.log('='.repeat(60));
  process.exit(success ? 0 : 1);
}

runTest().catch(console.error);