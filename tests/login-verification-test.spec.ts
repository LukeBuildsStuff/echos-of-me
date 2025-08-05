import { test, expect, Page } from '@playwright/test';

test.describe('Login Experience Verification', () => {
  let page: Page;
  let consoleErrors: string[] = [];
  let networkErrors: { url: string; status: number; error?: string }[] = [];
  let redirectHistory: string[] = [];

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Reset arrays for each test
    consoleErrors = [];
    networkErrors = [];
    redirectHistory = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`Console Error: ${msg.text()}`);
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
      console.log(`Page Error: ${error.message}`);
    });

    // Capture network failures
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          error: response.statusText()
        });
        console.log(`Network Error: ${response.status()} - ${response.url()}`);
      }
    });

    // Track navigation/redirects
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        redirectHistory.push(frame.url());
        console.log(`Navigation: ${frame.url()}`);
      }
    });
  });

  test('1. Navigate to signin page and check for loading errors', async () => {
    console.log('\n=== TEST 1: Navigate to signin page ===');
    
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    
    // Wait a bit for any delayed errors
    await page.waitForTimeout(2000);
    
    // Check if page loaded successfully
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Check for sign-in form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Sign-in form elements are visible');
    
    // Report any errors found
    if (consoleErrors.length > 0) {
      console.log(`❌ Console errors found: ${consoleErrors.length}`);
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✓ No console errors detected');
    }
    
    if (networkErrors.length > 0) {
      console.log(`❌ Network errors found: ${networkErrors.length}`);
      networkErrors.forEach(error => console.log(`  - ${error.status} ${error.url}`));
    } else {
      console.log('✓ No network errors detected');
    }
  });

  test('2. Test login form with provided credentials', async () => {
    console.log('\n=== TEST 2: Test login form submission ===');
    
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    
    // Fill in the login form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    await emailInput.fill('lukemoeller@yahoo.com');
    await passwordInput.fill('password123');
    
    console.log('✓ Credentials filled in form');
    
    // Take screenshot before submitting
    await page.screenshot({ path: 'before-login-submit.png', fullPage: true });
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    
    // Clear redirect history before clicking
    redirectHistory = [];
    
    await submitButton.click();
    
    console.log('✓ Login form submitted');
    
    // Wait for navigation or error
    try {
      await page.waitForURL('http://localhost:3000/dashboard', { timeout: 15000 });
      console.log('✓ Successfully redirected to dashboard');
    } catch (error) {
      console.log(`❌ Redirect timeout or failed: ${error.message}`);
      
      // Check current URL
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      // Take screenshot of current state
      await page.screenshot({ path: 'after-login-attempt.png', fullPage: true });
    }
    
    // Report redirect history
    console.log(`Redirect history (${redirectHistory.length} steps):`);
    redirectHistory.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    
    // Check for redirect loops (same URL appearing multiple times)
    const urlCounts = redirectHistory.reduce((acc, url) => {
      acc[url] = (acc[url] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const loopDetected = Object.values(urlCounts).some(count => count > 2);
    if (loopDetected) {
      console.log('❌ REDIRECT LOOP DETECTED!');
      Object.entries(urlCounts).forEach(([url, count]) => {
        if (count > 2) {
          console.log(`  - ${url} visited ${count} times`);
        }
      });
    } else {
      console.log('✓ No redirect loops detected');
    }
  });

  test('3. Verify authentication success and dashboard access', async () => {
    console.log('\n=== TEST 3: Verify authentication and dashboard access ===');
    
    // Go to signin page
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    
    // Fill and submit login form
    await page.locator('input[type="email"], input[name="email"]').first().fill('lukemoeller@yahoo.com');
    await page.locator('input[type="password"], input[name="password"]').first().fill('password123');
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    await submitButton.click();
    
    // Wait for either dashboard or error
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`Final URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✓ Successfully authenticated and reached dashboard');
      
      // Check if dashboard content loads
      try {
        await page.waitForSelector('h1, h2, .dashboard, [data-testid="dashboard"]', { timeout: 10000 });
        console.log('✓ Dashboard content loaded');
        
        // Take screenshot of successful dashboard
        await page.screenshot({ path: 'successful-dashboard.png', fullPage: true });
        
      } catch (error) {
        console.log('❌ Dashboard content failed to load');
        await page.screenshot({ path: 'dashboard-load-failed.png', fullPage: true });
      }
      
    } else if (currentUrl.includes('/auth/signin')) {
      console.log('❌ Still on signin page - authentication may have failed');
      
      // Check for error messages
      const errorMessages = await page.locator('.error, .alert, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('Error messages found:');
        errorMessages.forEach(msg => console.log(`  - ${msg}`));
      }
      
    } else {
      console.log(`❌ Unexpected redirect to: ${currentUrl}`);
    }
  });

  test('4. Test session persistence', async () => {
    console.log('\n=== TEST 4: Test session persistence ===');
    
    // First, login
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"], input[name="email"]').first().fill('lukemoeller@yahoo.com');
    await page.locator('input[type="password"], input[name="password"]').first().fill('password123');
    await page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first().click();
    
    await page.waitForTimeout(5000);
    
    if (page.url().includes('/dashboard')) {
      console.log('✓ Initial login successful');
      
      // Navigate away and back to test session persistence
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
      console.log('✓ Navigated to home page');
      
      await page.waitForTimeout(2000);
      
      // Try to access dashboard directly
      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
      
      await page.waitForTimeout(3000);
      
      if (page.url().includes('/dashboard')) {
        console.log('✓ Session persisted - can access dashboard without re-login');
      } else if (page.url().includes('/auth/signin')) {
        console.log('❌ Session lost - redirected back to signin');
      } else {
        console.log(`❌ Unexpected redirect to: ${page.url()}`);
      }
      
    } else {
      console.log('❌ Cannot test session persistence - initial login failed');
    }
  });

  test('5. Test signin redirect when already authenticated', async () => {
    console.log('\n=== TEST 5: Test signin redirect when already authenticated ===');
    
    // First, login
    await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"], input[name="email"]').first().fill('lukemoeller@yahoo.com');
    await page.locator('input[type="password"], input[name="password"]').first().fill('password123');
    await page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first().click();
    
    await page.waitForTimeout(5000);
    
    if (page.url().includes('/dashboard')) {
      console.log('✓ Initial login successful');
      
      // Now try to visit signin page while authenticated
      redirectHistory = []; // Clear history
      
      await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const finalUrl = page.url();
      
      if (finalUrl.includes('/dashboard')) {
        console.log('✓ Correctly redirected to dashboard when already authenticated');
      } else if (finalUrl.includes('/auth/signin')) {
        console.log('❌ Allowed to stay on signin page while authenticated');
      } else {
        console.log(`❌ Unexpected redirect to: ${finalUrl}`);
      }
      
      console.log(`Navigation path:`);
      redirectHistory.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
      
    } else {
      console.log('❌ Cannot test authenticated redirect - initial login failed');
    }
  });

  test.afterEach(async () => {
    // Generate final report
    console.log('\n=== FINAL ERROR SUMMARY ===');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    console.log(`Navigation Steps: ${redirectHistory.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\nNetwork Errors:');
      networkErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.status} - ${error.url}`);
      });
    }
    
    await page.close();
  });
});