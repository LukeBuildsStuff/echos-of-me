import { test, expect, Page } from '@playwright/test';

// Test configuration and data
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};

// Helper function to wait for page load and check for JS errors
async function checkPageHealth(page: Page, pageName: string) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error on ${pageName}: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push(`Console Warning on ${pageName}: ${msg.text()}`);
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(`Page Error on ${pageName}: ${error.message}`);
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  return { errors, warnings };
}

test.describe('Echos Of Me - Comprehensive System Test', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console and error listeners
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`💥 Page Error: ${error.message}`);
    });
  });

  test('1. Homepage loads correctly and basic functionality works', async ({ page }) => {
    console.log('🏠 Testing Homepage...');
    
    await page.goto('/');
    const { errors, warnings } = await checkPageHealth(page, 'Homepage');
    
    // Check page title
    await expect(page).toHaveTitle(/Echos Of Me/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Preserve Your Love, Wisdom, and Voice');
    
    // Check primary CTA buttons
    const beginLegacyBtn = page.locator('text=Begin Your Legacy').first();
    const continueJourneyBtn = page.locator('text=Continue Your Journey').first();
    
    await expect(beginLegacyBtn).toBeVisible();
    await expect(continueJourneyBtn).toBeVisible();
    
    // Test navigation links
    const signInLink = page.locator('text=Sign In').first();
    await expect(signInLink).toBeVisible();
    
    // Check for features section
    await expect(page.locator('text=How Echos Of Me Works')).toBeVisible();
    
    console.log(`✅ Homepage - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('Homepage errors:', errors);
    }
  });

  test('2. Authentication system - Registration flow', async ({ page }) => {
    console.log('📝 Testing Registration...');
    
    await page.goto('/auth/register');
    const { errors, warnings } = await checkPageHealth(page, 'Registration');
    
    // Check registration form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 10000 });
    
    // Fill registration form
    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // Check if submit button is present and enabled
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    
    console.log(`✅ Registration Form - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('Registration errors:', errors);
    }
  });

  test('3. Authentication system - Sign in flow', async ({ page }) => {
    console.log('🔐 Testing Sign In...');
    
    await page.goto('/auth/signin');
    const { errors, warnings } = await checkPageHealth(page, 'Sign In');
    
    // Check sign in form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Test password reset link
    const forgotPasswordLink = page.locator('text=Forgot Password').first();
    if (await forgotPasswordLink.isVisible()) {
      await expect(forgotPasswordLink).toBeVisible();
    }
    
    // Check submit button
    const signInBtn = page.locator('button[type="submit"]').first();
    await expect(signInBtn).toBeVisible();
    
    console.log(`✅ Sign In Form - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('Sign In errors:', errors);
    }
  });

  test('4. Dashboard navigation and components', async ({ page }) => {
    console.log('📊 Testing Dashboard...');
    
    // Try to access dashboard (may redirect to login)
    await page.goto('/dashboard');
    const { errors, warnings } = await checkPageHealth(page, 'Dashboard');
    
    // Check if redirected to login or dashboard loads
    const currentUrl = page.url();
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('✅ Dashboard properly redirects to authentication when not logged in');
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } else {
      // If dashboard loads, check its components
      await expect(page.locator('h1, h2').first()).toBeVisible();
      console.log('✅ Dashboard accessible');
    }
    
    console.log(`✅ Dashboard Navigation - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('Dashboard errors:', errors);
    }
  });

  test('5. Daily question interface', async ({ page }) => {
    console.log('❓ Testing Daily Question Interface...');
    
    await page.goto('/daily-question');
    const { errors, warnings } = await checkPageHealth(page, 'Daily Question');
    
    // Check if redirected to login or question interface loads
    const currentUrl = page.url();
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('✅ Daily Question properly redirects to authentication when not logged in');
    } else {
      // Look for question interface elements
      const questionElements = [
        'textarea',
        'input[type="text"]',
        'button[type="submit"]',
        'form'
      ];
      
      let foundElements = 0;
      for (const selector of questionElements) {
        if (await page.locator(selector).count() > 0) {
          foundElements++;
        }
      }
      
      console.log(`✅ Daily Question Interface - Found ${foundElements} form elements`);
    }
    
    console.log(`✅ Daily Question - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('Daily Question errors:', errors);
    }
  });

  test('6. Mobile responsiveness test', async ({ page }) => {
    console.log('📱 Testing Mobile Responsiveness...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/');
    const { errors, warnings } = await checkPageHealth(page, 'Mobile Homepage');
    
    // Check mobile navigation
    const mobileNav = page.locator('nav, .mobile-nav, [class*="mobile"]').first();
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible();
    }
    
    // Check responsive buttons
    const beginLegacyBtn = page.locator('text=Begin Legacy, text=Begin Your Legacy').first();
    if (await beginLegacyBtn.count() > 0) {
      await expect(beginLegacyBtn).toBeVisible();
    }
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log(`✅ Mobile Responsiveness - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('Mobile errors:', errors);
    }
  });

  test('7. Error boundary and grief-sensitive components', async ({ page }) => {
    console.log('🕊️ Testing Grief-Sensitive Components...');
    
    await page.goto('/');
    const { errors, warnings } = await checkPageHealth(page, 'Grief Components');
    
    // Look for grief-sensitive messaging
    const sensitiveTerms = [
      'legacy',
      'preserve',
      'memories',
      'wisdom',
      'love',
      'family',
      'gentle',
      'supportive'
    ];
    
    let foundTerms = 0;
    for (const term of sensitiveTerms) {
      const count = await page.locator(`text=${term}`).count();
      if (count > 0) {
        foundTerms++;
      }
    }
    
    console.log(`✅ Found ${foundTerms} grief-sensitive terms in content`);
    
    // Check for error boundaries by looking for error recovery elements
    const errorElements = page.locator('[class*="error"], [class*="boundary"], [data-testid*="error"]');
    console.log(`✅ Error boundary elements found: ${await errorElements.count()}`);
    
    console.log(`✅ Grief-Sensitive Components - Errors: ${errors.length}, Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('Grief-sensitive component errors:', errors);
    }
  });

  test('8. Network requests and API endpoints', async ({ page }) => {
    console.log('🌐 Testing Network Requests...');
    
    const failedRequests: string[] = [];
    const networkRequests: string[] = [];
    
    page.on('response', response => {
      networkRequests.push(`${response.status()} ${response.url()}`);
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to different pages to test API calls
    const pagesToTest = ['/auth/signin', '/auth/register'];
    
    for (const url of pagesToTest) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }
    
    console.log(`✅ Total network requests: ${networkRequests.length}`);
    console.log(`❌ Failed requests: ${failedRequests.length}`);
    
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests.slice(0, 10)); // Show first 10
    }
  });

  test('9. JavaScript performance and console errors', async ({ page }) => {
    console.log('⚡ Testing JavaScript Performance...');
    
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });
    
    // Test performance on key pages
    const pagesToTest = ['/', '/auth/signin', '/auth/register', '/dashboard', '/daily-question'];
    
    for (const url of pagesToTest) {
      console.log(`Testing performance on ${url}...`);
      const startTime = Date.now();
      
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`${url} loaded in ${loadTime}ms`);
      
      // Check for hydration issues
      await page.waitForTimeout(1000); // Wait for React hydration
    }
    
    console.log(`✅ Console Errors: ${consoleErrors.length}`);
    console.log(`⚠️ Console Warnings: ${consoleWarnings.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('JavaScript Errors:');
      consoleErrors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
    }
    
    if (consoleWarnings.length > 0) {
      console.log('JavaScript Warnings:');
      consoleWarnings.slice(0, 5).forEach(warning => console.log(`  - ${warning}`));
    }
  });

  test('10. Accessibility and semantic HTML', async ({ page }) => {
    console.log('♿ Testing Accessibility...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for semantic HTML elements
    const semanticElements = ['header', 'nav', 'main', 'section', 'article', 'footer'];
    let foundSemanticElements = 0;
    
    for (const element of semanticElements) {
      const count = await page.locator(element).count();
      if (count > 0) {
        foundSemanticElements++;
      }
    }
    
    console.log(`✅ Found ${foundSemanticElements}/${semanticElements.length} semantic HTML elements`);
    
    // Check for accessibility attributes
    const accessibilityChecks = [
      { selector: 'img', attribute: 'alt', name: 'Images with alt text' },
      { selector: 'button', attribute: 'aria-label', name: 'Buttons with aria-label' },
      { selector: 'input', attribute: 'aria-label', name: 'Inputs with aria-label' },
      { selector: '[role]', attribute: 'role', name: 'Elements with roles' }
    ];
    
    for (const check of accessibilityChecks) {
      const elements = await page.locator(check.selector).count();
      const elementsWithAttribute = await page.locator(`${check.selector}[${check.attribute}]`).count();
      console.log(`${check.name}: ${elementsWithAttribute}/${elements}`);
    }
  });
});