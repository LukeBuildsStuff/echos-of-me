const { chromium } = require('playwright');

async function analyzeAdminSection() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Collect console messages and errors
  const consoleMessages = [];
  const pageErrors = [];
  const networkFailures = [];
  
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  page.on('requestfailed', request => {
    networkFailures.push({
      url: request.url(),
      failure: request.failure(),
      method: request.method()
    });
  });

  // Performance metrics
  const performanceMetrics = {};
  
  try {
    console.log('Navigating to admin section...');
    const startTime = Date.now();
    
    // Navigate to admin page
    const response = await page.goto('http://localhost:3001/admin', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    performanceMetrics.loadTime = Date.now() - startTime;
    performanceMetrics.status = response.status();
    
    console.log(`Page loaded with status: ${response.status()}`);
    
    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);
    
    // Check if authentication is required
    const currentUrl = page.url();
    if (currentUrl !== 'http://localhost:3001/admin') {
      console.log(`Redirected to: ${currentUrl}`);
      
      // If redirected to login, attempt to authenticate
      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        console.log('Authentication required. Attempting to login...');
        
        // Look for login form
        const emailInput = await page.$('input[type="email"], input[name="email"], input[id="email"]');
        const passwordInput = await page.$('input[type="password"], input[name="password"], input[id="password"]');
        
        if (emailInput && passwordInput) {
          // Use test credentials (adjust as needed)
          await emailInput.fill('admin@example.com');
          await passwordInput.fill('admin123');
          
          // Find and click submit button
          const submitButton = await page.$('button[type="submit"], input[type="submit"]');
          if (submitButton) {
            await submitButton.click();
            await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
          }
        }
      }
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: 'admin-initial.png', fullPage: true });
    
    // Analyze page structure
    console.log('\nAnalyzing page structure...');
    
    // Check for main admin elements
    const adminElements = {
      sidebar: await page.$('[data-testid="admin-sidebar"], nav, aside, .sidebar, #sidebar'),
      header: await page.$('header, .header, [role="banner"]'),
      mainContent: await page.$('main, .main-content, [role="main"]'),
      dashboard: await page.$('.dashboard, [data-testid="dashboard"]')
    };
    
    // Get all navigation links
    const navLinks = await page.$$eval('a[href*="/admin"], nav a, aside a, .sidebar a', links => 
      links.map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        visible: link.offsetParent !== null
      }))
    );
    
    console.log(`Found ${navLinks.length} navigation links`);
    
    // Check for interactive elements
    const buttons = await page.$$('button');
    const forms = await page.$$('form');
    const inputs = await page.$$('input, select, textarea');
    
    console.log(`Found ${buttons.length} buttons, ${forms.length} forms, ${inputs.length} input elements`);
    
    // Test responsive behavior
    console.log('\nTesting responsive behavior...');
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];
    
    const responsiveIssues = [];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // Check if sidebar is visible/hidden appropriately
      const sidebarVisible = await page.evaluate(() => {
        const sidebar = document.querySelector('nav, aside, .sidebar');
        return sidebar && window.getComputedStyle(sidebar).display !== 'none';
      });
      
      responsiveIssues.push({
        viewport: viewport.name,
        sidebarVisible,
        screenshot: `admin-${viewport.name}.png`
      });
      
      await page.screenshot({ path: `admin-${viewport.name}.png` });
    }
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check accessibility
    console.log('\nChecking accessibility...');
    const accessibilityIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for missing alt text
      document.querySelectorAll('img').forEach(img => {
        if (!img.alt) {
          issues.push({
            type: 'missing-alt',
            element: img.outerHTML.substring(0, 100)
          });
        }
      });
      
      // Check for proper heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let lastLevel = 0;
      headings.forEach(h => {
        const level = parseInt(h.tagName.charAt(1));
        if (level - lastLevel > 1) {
          issues.push({
            type: 'heading-hierarchy',
            element: h.outerHTML.substring(0, 100)
          });
        }
        lastLevel = level;
      });
      
      // Check for form labels
      document.querySelectorAll('input, select, textarea').forEach(input => {
        if (!input.labels?.length && !input.getAttribute('aria-label')) {
          issues.push({
            type: 'missing-label',
            element: input.outerHTML.substring(0, 100)
          });
        }
      });
      
      return issues;
    });
    
    // Performance metrics
    const performanceTiming = await page.evaluate(() => performance.timing);
    const paintTiming = await page.evaluate(() => 
      performance.getEntriesByType('paint').map(entry => ({
        name: entry.name,
        startTime: entry.startTime
      }))
    );
    
    // Generate report
    const report = {
      url: page.url(),
      timestamp: new Date().toISOString(),
      performance: {
        ...performanceMetrics,
        domContentLoaded: performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart,
        loadComplete: performanceTiming.loadEventEnd - performanceTiming.navigationStart,
        paintTiming
      },
      structure: {
        hasAdminElements: adminElements,
        navigationLinks: navLinks,
        interactiveElements: {
          buttons: buttons.length,
          forms: forms.length,
          inputs: inputs.length
        }
      },
      issues: {
        console: consoleMessages,
        errors: pageErrors,
        networkFailures: networkFailures,
        accessibility: accessibilityIssues
      },
      responsive: responsiveIssues
    };
    
    console.log('\n=== ANALYSIS COMPLETE ===\n');
    console.log(JSON.stringify(report, null, 2));
    
    await browser.close();
    return report;
    
  } catch (error) {
    console.error('Error during analysis:', error);
    await browser.close();
    throw error;
  }
}

// Run the analysis
analyzeAdminSection().catch(console.error);