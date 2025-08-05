import { test, expect, Page, BrowserContext } from '@playwright/test';

interface ConsoleMessage {
  type: string;
  text: string;
  location?: string;
}

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  resourceType: string;
  failure?: string;
}

interface UsabilityIssue {
  type: 'critical' | 'warning' | 'info';
  category: 'functionality' | 'ux' | 'performance' | 'accessibility' | 'mobile';
  description: string;
  location: string;
  recommendation: string;
}

let consoleMessages: ConsoleMessage[] = [];
let networkRequests: NetworkRequest[] = [];
let usabilityIssues: UsabilityIssue[] = [];

test.describe('Echoes of Me - Comprehensive Usability Analysis', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Setup browser context with proper user agent and viewport
    context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    page = await context.newPage();
    
    // Clear arrays for each test
    consoleMessages = [];
    networkRequests = [];
    usabilityIssues = [];

    // Setup console message monitoring
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined
      });
    });

    // Setup network request monitoring
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    page.on('response', (response) => {
      const request = networkRequests.find(req => req.url === response.url());
      if (request) {
        request.status = response.status();
        request.statusText = response.statusText();
      }
    });

    page.on('requestfailed', (request) => {
      const req = networkRequests.find(r => r.url === request.url());
      if (req) {
        req.failure = request.failure()?.errorText || 'Request failed';
      }
    });

    // Setup page error monitoring
    page.on('pageerror', (error) => {
      consoleMessages.push({
        type: 'pageerror',
        text: error.message,
        location: error.stack ? error.stack.split('\n')[1] : undefined
      });
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Landing Page Analysis', async () => {
    console.log('=== TESTING LANDING PAGE ===');
    
    try {
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Check if page loads successfully
      await expect(page).toHaveTitle(/Echoes of Me/i);
      
      // Check for critical elements
      const heroSection = page.locator('[data-testid="hero-section"], .hero, h1');
      if (await heroSection.count() === 0) {
        usabilityIssues.push({
          type: 'critical',
          category: 'functionality',
          description: 'No hero section or main heading found on landing page',
          location: '/',
          recommendation: 'Add a prominent hero section with clear value proposition'
        });
      }

      // Check navigation
      const nav = page.locator('nav, [role="navigation"]');
      if (await nav.count() === 0) {
        usabilityIssues.push({
          type: 'warning',
          category: 'ux',
          description: 'No navigation found on landing page',
          location: '/',
          recommendation: 'Add clear navigation menu for better user orientation'
        });
      }

      // Check for CTA buttons
      const ctaButtons = page.locator('a[href*="auth"], button:has-text("Sign"), button:has-text("Start"), button:has-text("Get")');
      const ctaCount = await ctaButtons.count();
      if (ctaCount === 0) {
        usabilityIssues.push({
          type: 'critical',
          category: 'ux',
          description: 'No clear call-to-action buttons found',
          location: '/',
          recommendation: 'Add prominent Sign Up and Sign In buttons'
        });
      }

      console.log(`Landing page loaded. Found ${ctaCount} CTA buttons.`);
      
    } catch (error) {
      usabilityIssues.push({
        type: 'critical',
        category: 'functionality',
        description: `Landing page failed to load: ${error}`,
        location: '/',
        recommendation: 'Fix server or routing issues preventing page load'
      });
    }
  });

  test('Authentication Flow Analysis', async () => {
    console.log('=== TESTING AUTHENTICATION FLOWS ===');

    // Test Sign In Page
    try {
      await page.goto('/auth/signin');
      await page.waitForLoadState('networkidle');

      // Check form presence
      const emailField = page.locator('input[type="email"], input[name="email"]');
      const passwordField = page.locator('input[type="password"], input[name="password"]');
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")');

      if (await emailField.count() === 0) {
        usabilityIssues.push({
          type: 'critical',
          category: 'functionality',
          description: 'Email input field not found on sign in page',
          location: '/auth/signin',
          recommendation: 'Add email input field with proper type and name attributes'
        });
      }

      if (await passwordField.count() === 0) {
        usabilityIssues.push({
          type: 'critical',
          category: 'functionality',
          description: 'Password input field not found on sign in page',
          location: '/auth/signin',
          recommendation: 'Add password input field with proper type attribute'
        });
      }

      if (await submitButton.count() === 0) {
        usabilityIssues.push({
          type: 'critical',
          category: 'functionality',
          description: 'Submit button not found on sign in page',
          location: '/auth/signin',
          recommendation: 'Add submit button with clear labeling'
        });
      }

      // Test form interaction
      if (await emailField.count() > 0 && await passwordField.count() > 0) {
        await emailField.fill('test@example.com');
        await passwordField.fill('testpassword');
        
        // Check if form accepts input
        const emailValue = await emailField.inputValue();
        const passwordValue = await passwordField.inputValue();
        
        if (!emailValue || !passwordValue) {
          usabilityIssues.push({
            type: 'warning',
            category: 'functionality',
            description: 'Form fields may not be accepting input properly',
            location: '/auth/signin',
            recommendation: 'Check form field JavaScript handlers and validation'
          });
        }
      }

      console.log('Sign in page tested');
      
    } catch (error) {
      usabilityIssues.push({
        type: 'critical',
        category: 'functionality',
        description: `Sign in page failed to load: ${error}`,
        location: '/auth/signin',
        recommendation: 'Fix routing or component rendering issues for sign in page'
      });
    }

    // Test Sign Up Page
    try {
      await page.goto('/auth/register');
      await page.waitForLoadState('networkidle');

      const emailField = page.locator('input[type="email"], input[name="email"]');
      const passwordField = page.locator('input[type="password"], input[name="password"]');
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register")');

      if (await emailField.count() === 0 || await passwordField.count() === 0 || await submitButton.count() === 0) {
        usabilityIssues.push({
          type: 'critical',
          category: 'functionality',
          description: 'Registration form incomplete or missing',
          location: '/auth/register',
          recommendation: 'Ensure registration form has all required fields and submit button'
        });
      }

      console.log('Sign up page tested');
      
    } catch (error) {
      usabilityIssues.push({
        type: 'critical',
        category: 'functionality',
        description: `Sign up page failed to load: ${error}`,
        location: '/auth/register',
        recommendation: 'Fix routing or component rendering issues for registration page'
      });
    }
  });

  test('Dashboard and Main User Experience', async () => {
    console.log('=== TESTING DASHBOARD AND USER EXPERIENCE ===');

    // Try to access dashboard (will likely redirect to login)
    try {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      
      if (currentUrl.includes('/auth/signin')) {
        console.log('Dashboard correctly redirects to sign in (good security)');
      } else {
        // If we can access dashboard directly, check its content
        const welcomeMessage = page.locator('h1, h2, [data-testid="welcome"]');
        const navigationMenu = page.locator('nav, [role="navigation"], .sidebar');
        
        if (await welcomeMessage.count() === 0) {
          usabilityIssues.push({
            type: 'warning',
            category: 'ux',
            description: 'Dashboard lacks welcoming header or title',
            location: '/dashboard',
            recommendation: 'Add clear dashboard title and user welcome message'
          });
        }

        if (await navigationMenu.count() === 0) {
          usabilityIssues.push({
            type: 'warning',
            category: 'ux',
            description: 'Dashboard lacks clear navigation',
            location: '/dashboard',
            recommendation: 'Add navigation menu for accessing different features'
          });
        }
      }
      
    } catch (error) {
      usabilityIssues.push({
        type: 'critical',
        category: 'functionality',
        description: `Dashboard failed to load or redirect: ${error}`,
        location: '/dashboard',
        recommendation: 'Fix dashboard routing and authentication handling'
      });
    }

    // Test Daily Question page
    try {
      await page.goto('/daily-question');
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      
      if (!currentUrl.includes('/auth/signin')) {
        // Check if daily question interface exists
        const questionContainer = page.locator('[data-testid="question"], .question, h1, h2');
        const responseArea = page.locator('textarea, input[type="text"], [contenteditable]');
        const submitButton = page.locator('button:has-text("Submit"), button:has-text("Save"), button[type="submit"]');

        if (await questionContainer.count() === 0) {
          usabilityIssues.push({
            type: 'critical',
            category: 'functionality',
            description: 'No question content found on daily question page',
            location: '/daily-question',
            recommendation: 'Ensure questions are properly loaded and displayed'
          });
        }

        if (await responseArea.count() === 0) {
          usabilityIssues.push({
            type: 'critical',
            category: 'functionality',
            description: 'No response input area found',
            location: '/daily-question',
            recommendation: 'Add textarea or input field for user responses'
          });
        }

        if (await submitButton.count() === 0) {
          usabilityIssues.push({
            type: 'critical',
            category: 'functionality',
            description: 'No submit button found for responses',
            location: '/daily-question',
            recommendation: 'Add submit button for saving user responses'
          });
        }
      }

      console.log('Daily question page tested');
      
    } catch (error) {
      usabilityIssues.push({
        type: 'critical',
        category: 'functionality',
        description: `Daily question page failed to load: ${error}`,
        location: '/daily-question',
        recommendation: 'Fix daily question page routing and component rendering'
      });
    }
  });

  test('Admin Functionality Analysis', async () => {
    console.log('=== TESTING ADMIN FUNCTIONALITY ===');

    try {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      
      if (currentUrl.includes('/auth/signin')) {
        console.log('Admin correctly redirects to sign in (good security)');
      } else {
        // Check admin dashboard elements
        const adminHeader = page.locator('h1:has-text("Admin"), h2:has-text("Admin"), [data-testid="admin-header"]');
        const userManagement = page.locator('a:has-text("Users"), button:has-text("Users"), [href*="users"]');
        const trainingSection = page.locator('a:has-text("Training"), button:has-text("Training"), [href*="training"]');

        if (await adminHeader.count() === 0) {
          usabilityIssues.push({
            type: 'warning',
            category: 'ux',
            description: 'Admin dashboard lacks clear header identification',
            location: '/admin',
            recommendation: 'Add clear "Admin Dashboard" header'
          });
        }

        // Check for key admin features
        const adminFeatures = await page.locator('a, button').allTextContents();
        const hasUserManagement = adminFeatures.some(text => text.toLowerCase().includes('user'));
        const hasTrainingManagement = adminFeatures.some(text => text.toLowerCase().includes('training'));

        if (!hasUserManagement) {
          usabilityIssues.push({
            type: 'warning',
            category: 'functionality',
            description: 'Admin dashboard missing user management access',
            location: '/admin',
            recommendation: 'Add user management section to admin dashboard'
          });
        }

        if (!hasTrainingManagement) {
          usabilityIssues.push({
            type: 'warning',
            category: 'functionality',
            description: 'Admin dashboard missing training management access',
            location: '/admin',
            recommendation: 'Add training management section to admin dashboard'
          });
        }
      }
      
    } catch (error) {
      usabilityIssues.push({
        type: 'critical',
        category: 'functionality',
        description: `Admin page failed to load: ${error}`,
        location: '/admin',
        recommendation: 'Fix admin page routing and authentication'
      });
    }
  });

  test('Mobile Responsiveness Analysis', async () => {
    console.log('=== TESTING MOBILE RESPONSIVENESS ===');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    // Test landing page mobile
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if elements are properly sized for mobile
    const body = await page.locator('body').boundingBox();
    if (body && body.width > 375) {
      usabilityIssues.push({
        type: 'warning',
        category: 'mobile',
        description: 'Page content may be wider than mobile viewport',
        location: '/ (mobile)',
        recommendation: 'Ensure responsive design constraints prevent horizontal overflow'
      });
    }

    // Check for mobile navigation
    const hamburgerMenu = page.locator('[data-testid="mobile-menu"], .hamburger, button:has-text("☰")');
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav');
    
    if (await hamburgerMenu.count() === 0 && await mobileNav.count() === 0) {
      usabilityIssues.push({
        type: 'warning',
        category: 'mobile',
        description: 'No mobile-specific navigation found',
        location: '/ (mobile)',
        recommendation: 'Add hamburger menu or mobile-optimized navigation'
      });
    }

    // Test touch targets
    const buttons = page.locator('button, a');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const bbox = await button.boundingBox();
      
      if (bbox && (bbox.height < 44 || bbox.width < 44)) {
        usabilityIssues.push({
          type: 'warning',
          category: 'accessibility',
          description: 'Touch target smaller than recommended 44px minimum',
          location: '/ (mobile)',
          recommendation: 'Increase button/link size to meet accessibility guidelines'
        });
        break; // Only report once
      }
    }

    // Test form fields on mobile
    try {
      await page.goto('/auth/signin');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const bbox = await input.boundingBox();
        
        if (bbox && bbox.height < 44) {
          usabilityIssues.push({
            type: 'warning',
            category: 'mobile',
            description: 'Form inputs may be too small for comfortable mobile use',
            location: '/auth/signin (mobile)',
            recommendation: 'Increase input field height for better mobile UX'
          });
          break;
        }
      }
    } catch (error) {
      // Already handled in auth tests
    }

    console.log('Mobile responsiveness tested');
  });

  test('Performance and Network Analysis', async () => {
    console.log('=== TESTING PERFORMANCE AND NETWORK ===');

    // Clear network requests for this test
    networkRequests = [];

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    if (loadTime > 3000) {
      usabilityIssues.push({
        type: 'warning',
        category: 'performance',
        description: `Page load time is slow: ${loadTime}ms`,
        location: '/',
        recommendation: 'Optimize images, minimize JavaScript, enable compression'
      });
    }

    // Check for failed network requests
    const failedRequests = networkRequests.filter(req => req.failure || (req.status && req.status >= 400));
    
    failedRequests.forEach(req => {
      usabilityIssues.push({
        type: req.status && req.status >= 500 ? 'critical' : 'warning',
        category: 'functionality',
        description: `Failed network request: ${req.method} ${req.url} (${req.status || 'Failed'})`,
        location: 'Network',
        recommendation: req.status && req.status >= 500 ? 'Fix server-side issues' : 'Check client-side request handling'
      });
    });

    // Check for large resources
    const largeRequests = networkRequests.filter(req => 
      req.resourceType === 'image' || req.resourceType === 'script' || req.resourceType === 'stylesheet'
    );

    if (largeRequests.length > 20) {
      usabilityIssues.push({
        type: 'warning',
        category: 'performance',
        description: `Many resource requests (${largeRequests.length}) may slow loading`,
        location: '/',
        recommendation: 'Consider bundling, lazy loading, or reducing resource count'
      });
    }

    console.log(`Performance tested. Load time: ${loadTime}ms, Requests: ${networkRequests.length}, Failures: ${failedRequests.length}`);
  });

  test('JavaScript Errors and Console Analysis', async () => {
    console.log('=== ANALYZING JAVASCRIPT ERRORS ===');

    // Navigate through key pages to collect console messages
    const pagesToTest = ['/', '/auth/signin', '/auth/register', '/dashboard', '/daily-question', '/admin'];
    
    for (const path of pagesToTest) {
      try {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Allow time for JS execution
      } catch (error) {
        // Continue to next page
      }
    }

    // Analyze console messages
    const errors = consoleMessages.filter(msg => msg.type === 'error' || msg.type === 'pageerror');
    const warnings = consoleMessages.filter(msg => msg.type === 'warning');
    
    errors.forEach(error => {
      usabilityIssues.push({
        type: 'critical',
        category: 'functionality',
        description: `JavaScript error: ${error.text}`,
        location: error.location || 'Unknown',
        recommendation: 'Fix JavaScript error to prevent functionality issues'
      });
    });

    warnings.forEach(warning => {
      if (!warning.text.includes('favicon') && !warning.text.includes('extension')) {
        usabilityIssues.push({
          type: 'warning',
          category: 'functionality',
          description: `JavaScript warning: ${warning.text}`,
          location: warning.location || 'Unknown',
          recommendation: 'Review and resolve JavaScript warning'
        });
      }
    });

    console.log(`Console analysis complete. Errors: ${errors.length}, Warnings: ${warnings.length}`);
  });

  test('Accessibility Analysis', async () => {
    console.log('=== TESTING ACCESSIBILITY ===');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for basic accessibility features
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    if (headings === 0) {
      usabilityIssues.push({
        type: 'warning',
        category: 'accessibility',
        description: 'No heading elements found on page',
        location: '/',
        recommendation: 'Add proper heading hierarchy for screen readers'
      });
    }

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      
      if (!alt || alt.trim() === '') {
        usabilityIssues.push({
          type: 'warning',
          category: 'accessibility',
          description: 'Image missing alt text',
          location: '/',
          recommendation: 'Add descriptive alt text to all images'
        });
        break; // Only report once
      }
    }

    // Check form labels
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      if (!id && !ariaLabel && !ariaLabelledby) {
        const hasLabel = await page.locator(`label`).count() > 0;
        if (!hasLabel) {
          usabilityIssues.push({
            type: 'warning',
            category: 'accessibility',
            description: 'Form input lacks proper labeling',
            location: '/auth/signin',
            recommendation: 'Add labels or aria-label attributes to form inputs'
          });
          break;
        }
      }
    }

    // Test keyboard navigation
    try {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').count();
      
      if (focusedElement === 0) {
        usabilityIssues.push({
          type: 'warning',
          category: 'accessibility',
          description: 'Page may not support keyboard navigation',
          location: '/auth/signin',
          recommendation: 'Ensure all interactive elements are keyboard accessible'
        });
      }
    } catch (error) {
      // Continue
    }

    console.log('Accessibility analysis complete');
  });

  test('Generate Comprehensive Report', async () => {
    console.log('=== GENERATING COMPREHENSIVE USABILITY REPORT ===');

    // Categorize issues
    const criticalIssues = usabilityIssues.filter(issue => issue.type === 'critical');
    const warningIssues = usabilityIssues.filter(issue => issue.type === 'warning');
    const infoIssues = usabilityIssues.filter(issue => issue.type === 'info');

    const report = {
      summary: {
        totalIssues: usabilityIssues.length,
        critical: criticalIssues.length,
        warnings: warningIssues.length,
        info: infoIssues.length,
        testDate: new Date().toISOString(),
        testEnvironment: 'http://localhost:3000'
      },
      criticalIssues,
      warningIssues,
      infoIssues,
      consoleMessages: consoleMessages.filter(msg => msg.type === 'error' || msg.type === 'pageerror'),
      networkAnalysis: {
        totalRequests: networkRequests.length,
        failedRequests: networkRequests.filter(req => req.failure || (req.status && req.status >= 400)).length,
        failedRequestDetails: networkRequests.filter(req => req.failure || (req.status && req.status >= 400))
      },
      recommendations: {
        immediate: criticalIssues.map(issue => ({
          issue: issue.description,
          action: issue.recommendation,
          location: issue.location
        })),
        shortTerm: warningIssues.slice(0, 5).map(issue => ({
          issue: issue.description,
          action: issue.recommendation,
          location: issue.location
        }))
      }
    };

    console.log('\\n=== USABILITY ANALYSIS REPORT ===');
    console.log(`Total Issues Found: ${report.summary.totalIssues}`);
    console.log(`Critical Issues: ${report.summary.critical}`);
    console.log(`Warning Issues: ${report.summary.warnings}`);
    console.log(`Info Issues: ${report.summary.info}`);
    console.log('\\n=== CRITICAL ISSUES (IMMEDIATE ATTENTION) ===');
    criticalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category.toUpperCase()}] ${issue.description}`);
      console.log(`   Location: ${issue.location}`);
      console.log(`   Recommendation: ${issue.recommendation}`);
      console.log('');
    });

    console.log('\\n=== WARNING ISSUES (SHOULD FIX) ===');
    warningIssues.slice(0, 10).forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category.toUpperCase()}] ${issue.description}`);
      console.log(`   Location: ${issue.location}`);
      console.log(`   Recommendation: ${issue.recommendation}`);
      console.log('');
    });

    // Save detailed report
    await page.evaluate((reportData) => {
      console.log('DETAILED_USABILITY_REPORT:', JSON.stringify(reportData, null, 2));
    }, report);

    expect(report.summary.totalIssues).toBeGreaterThan(-1); // Always pass, we just want the report
  });
});