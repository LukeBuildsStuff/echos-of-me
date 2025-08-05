import { test, expect, Page } from '@playwright/test';

test.describe('Authentication System Verification', () => {
  let page: Page;
  let consoleMessages: string[] = [];
  let errorMessages: string[] = [];
  let networkFailures: string[] = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capture console messages and errors
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', (error) => {
      errorMessages.push(`Page Error: ${error.message}`);
    });

    // Capture network failures
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkFailures.push(`${response.status()} ${response.url()}`);
      }
    });
  });

  test('Complete Login Flow Verification', async () => {
    console.log('🔍 STARTING COMPREHENSIVE LOGIN VERIFICATION TEST');
    console.log('Testing credentials: lukemoeller@yahoo.com / password123');
    console.log('Expected: Login should succeed and redirect to dashboard');
    console.log('========================================================');

    // Step 1: Navigate to signin page
    console.log('📄 Step 1: Navigating to signin page...');
    await page.goto('http://localhost:3001/auth/signin', { waitUntil: 'networkidle' });
    
    // Verify page loaded correctly
    await expect(page).toHaveTitle(/Sign/i);
    console.log('✅ Signin page loaded successfully');

    // Take screenshot of signin page
    await page.screenshot({ path: 'signin-page.png', fullPage: true });

    // Step 2: Check for form elements
    console.log('📋 Step 2: Verifying login form elements...');
    const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    console.log('✅ All login form elements are present');

    // Step 3: Fill login form
    console.log('📝 Step 3: Filling login form with test credentials...');
    await emailInput.fill('lukemoeller@yahoo.com');
    await passwordInput.fill('password123');
    console.log('✅ Credentials entered');

    // Clear previous messages to focus on login attempt
    consoleMessages = [];
    errorMessages = [];
    networkFailures = [];

    // Step 4: Submit login form and monitor response
    console.log('🚀 Step 4: Submitting login form...');
    const navigationPromise = page.waitForURL(/dashboard|signin/, { timeout: 10000 });
    await submitButton.click();

    // Wait for navigation or timeout
    try {
      await navigationPromise;
      const currentUrl = page.url();
      console.log(`📍 Current URL after login attempt: ${currentUrl}`);

      // Step 5: Analyze the result
      console.log('🔍 Step 5: Analyzing login result...');
      
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ SUCCESS: Login succeeded - redirected to dashboard');
        
        // Verify dashboard loaded
        await expect(page.locator('h1, h2, [role="heading"]')).toBeVisible();
        console.log('✅ Dashboard content is visible');

      } else if (currentUrl.includes('/auth/signin') || currentUrl.includes('/signin')) {
        console.log('❌ FAILURE: Login loop detected - still on signin page');
        
        // Check for error messages
        const errorElement = page.locator('[role="alert"], .error, .text-red, [class*="error"]');
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          console.log(`🚨 Error message displayed: ${errorText}`);
        } else {
          console.log('🚨 No error message shown - silent failure');
        }
      } else {
        console.log(`⚠️  UNEXPECTED: Redirected to unexpected page: ${currentUrl}`);
      }

    } catch (error) {
      console.log(`⏰ TIMEOUT: Login form submission timed out - ${error}`);
      const currentUrl = page.url();
      console.log(`📍 URL after timeout: ${currentUrl}`);
    }

    // Step 6: Test session persistence if login succeeded
    if (page.url().includes('/dashboard')) {
      console.log('🔄 Step 6: Testing session persistence...');
      
      // Refresh the page
      await page.reload({ waitUntil: 'networkidle' });
      
      if (page.url().includes('/dashboard')) {
        console.log('✅ Session persisted - user stayed on dashboard after refresh');
      } else {
        console.log('❌ Session failed - user redirected after refresh');
      }

      // Test access to protected pages
      console.log('🛡️  Step 7: Testing protected page access...');
      await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });
      
      if (page.url().includes('/dashboard')) {
        console.log('✅ Protected page access succeeded');
      } else {
        console.log('❌ Protected page access failed - redirected to signin');
      }
    }

    // Step 8: Report all captured issues
    console.log('📊 DIAGNOSTIC REPORT');
    console.log('===================');
    
    console.log('🖥️  Console Messages:');
    if (consoleMessages.length > 0) {
      consoleMessages.forEach(msg => console.log(`  - ${msg}`));
    } else {
      console.log('  - No console messages');
    }

    console.log('⚠️  JavaScript Errors:');
    if (errorMessages.length > 0) {
      errorMessages.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('  - No JavaScript errors');
    }

    console.log('🌐 Network Failures:');
    if (networkFailures.length > 0) {
      networkFailures.forEach(failure => console.log(`  - ${failure}`));
    } else {
      console.log('  - No network failures');
    }

    // Final verification
    const finalUrl = page.url();
    console.log(`\n🎯 FINAL RESULT: ${finalUrl.includes('/dashboard') ? 'LOGIN SUCCESS' : 'LOGIN FAILURE'}`);
    console.log(`📍 Final URL: ${finalUrl}`);

    // Take final screenshot
    await page.screenshot({ path: 'final-state.png', fullPage: true });

    // Make test fail if login didn't work
    if (!finalUrl.includes('/dashboard')) {
      throw new Error(`LOGIN VERIFICATION FAILED: Expected to be on dashboard, but on ${finalUrl}`);
    }
  });

  test.afterEach(async () => {
    await page.close();
  });
});