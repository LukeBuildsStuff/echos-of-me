import { test, expect, Page } from '@playwright/test';

test.describe('AI Echo Chat Functionality Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create a new context with permissions for clipboard
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    page = await context.newPage();

    // Set up console and error monitoring
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(`Page Error: ${error.message}`);
    });

    page.on('requestfailed', (request) => {
      networkErrors.push(`Network Error: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Navigate to the application
    await page.goto('http://localhost:3003');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Log initial state
    console.log('Initial page loaded');

    // Attach error reporting to test context
    page.context().on('close', () => {
      if (consoleErrors.length > 0) {
        console.error('Console Errors:', consoleErrors);
      }
      if (pageErrors.length > 0) {
        console.error('Page Errors:', pageErrors);
      }
      if (networkErrors.length > 0) {
        console.error('Network Errors:', networkErrors);
      }
    });
  });

  test('Authentication and Navigation to AI Echo Chat', async () => {
    // Check if we're on the landing page
    await expect(page).toHaveTitle(/Echos Of Me/i);
    
    // Navigate to sign in
    await page.click('text=Sign In');
    await page.waitForURL('**/auth/signin');
    
    // Fill in credentials
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Click on AI Echo button
    await page.click('text=AI Echo');
    
    // Wait for AI Echo chat page to load
    await page.waitForURL('**/ai-echo', { timeout: 10000 });
    
    // Verify we're on the AI Echo chat page
    await expect(page.locator('h1, h2').filter({ hasText: /AI Echo|Chat with/i })).toBeVisible();
  });

  test('Chat Interface Elements', async () => {
    // Navigate directly to AI Echo (assuming authenticated)
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Check for essential chat elements
    await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Send|Submit/i })).toBeVisible();
    
    // Check for chat history area
    await expect(page.locator('[class*="message"], [class*="chat"], [class*="conversation"]')).toBeVisible();
  });

  test('Send and Receive Messages', async () => {
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Wait for chat interface to load
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });
    
    // Send a test message
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await messageInput.fill('Hello, this is a test message');
    
    // Submit the message
    await page.keyboard.press('Enter');
    // Or click send button if Enter doesn't work
    const sendButton = page.locator('button').filter({ hasText: /Send|Submit/i });
    if (await sendButton.isVisible()) {
      await sendButton.click();
    }
    
    // Wait for response (with timeout)
    await page.waitForSelector('[class*="assistant"], [class*="ai"], [class*="response"]', { 
      timeout: 30000 
    });
    
    // Verify message was sent and response received
    await expect(page.locator('text=Hello, this is a test message')).toBeVisible();
  });

  test('Voice Synthesis Features', async () => {
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Send a message to get a response
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await messageInput.fill('Tell me about yourself');
    await page.keyboard.press('Enter');
    
    // Wait for AI response
    await page.waitForSelector('[class*="assistant"], [class*="ai"], [class*="response"]', { 
      timeout: 30000 
    });
    
    // Check for audio/voice buttons
    const audioButtons = page.locator('button').filter({ 
      hasText: /Play|Audio|Voice|Sound|🔊|🔉|🔈/i 
    });
    
    const audioButtonCount = await audioButtons.count();
    expect(audioButtonCount).toBeGreaterThan(0);
  });

  test('Keyboard Shortcuts', async () => {
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Test Alt+V shortcut (Voice)
    await page.keyboard.press('Alt+V');
    // Check if voice-related UI appears
    await page.waitForTimeout(500);
    
    // Test Alt+H shortcut (History)
    await page.keyboard.press('Alt+H');
    // Check if history-related UI appears
    await page.waitForTimeout(500);
  });

  test('Mobile Responsiveness', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Check that chat interface is visible and functional on mobile
    await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible();
    
    // Verify no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('Error Handling - AI Service Unavailable', async () => {
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Intercept AI chat API calls to simulate failure
    await page.route('**/api/ai-echo/chat', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI service temporarily unavailable' })
      });
    });
    
    await page.goto('http://localhost:3003/ai-echo');
    
    // Send a message
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await messageInput.fill('Test message');
    await page.keyboard.press('Enter');
    
    // Check for error message
    await expect(page.locator('text=/error|unavailable|failed/i')).toBeVisible({ timeout: 10000 });
  });

  test('Family Member Context via URL Parameters', async () => {
    // Authenticate first
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Navigate with family member context
    await page.goto('http://localhost:3003/ai-echo?family=daughter&name=Sarah');
    
    // Check if context is reflected in the UI
    await expect(page.locator('text=/daughter|Sarah/i')).toBeVisible();
  });

  test('Typing Indicators', async () => {
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Send a message
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await messageInput.fill('Test typing indicator');
    await page.keyboard.press('Enter');
    
    // Look for typing indicator
    const typingIndicator = page.locator('[class*="typing"], [class*="loading"], text=/typing|thinking/i');
    await expect(typingIndicator).toBeVisible({ timeout: 5000 });
  });

  test('Conversation History Persistence', async () => {
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Send a unique message
    const uniqueMessage = `Test message ${Date.now()}`;
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await messageInput.fill(uniqueMessage);
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForSelector('[class*="assistant"], [class*="ai"], [class*="response"]', { 
      timeout: 30000 
    });
    
    // Reload the page
    await page.reload();
    
    // Check if the message persists
    await expect(page.locator(`text=${uniqueMessage}`)).toBeVisible();
  });

  test('Comprehensive JavaScript Error Check', async () => {
    const jsErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    // Authenticate and navigate to AI Echo
    await page.goto('http://localhost:3003/auth/signin');
    await page.fill('input[name="email"]', 'luke.moeller@yahoo.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:3003/ai-echo');
    
    // Interact with the chat
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await messageInput.fill('Test for JS errors');
    await page.keyboard.press('Enter');
    
    // Wait for any async operations
    await page.waitForTimeout(3000);
    
    // Report any JavaScript errors
    if (jsErrors.length > 0) {
      console.error('JavaScript Errors Found:', jsErrors);
    }
    
    expect(jsErrors.length).toBe(0);
  });
});

test.afterAll(async () => {
  // Generate test report
  console.log('\n=== AI Echo Chat Test Summary ===');
  console.log('Tests completed. Check the results above for detailed findings.');
});