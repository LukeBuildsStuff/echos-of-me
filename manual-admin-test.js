const { chromium } = require('playwright');
const fs = require('fs');

async function analyzeAdminDashboard() {
  let browser;
  try {
    // Try to launch browser
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    // Track errors
    const errors = {
      console: [],
      javascript: [],
      network: []
    };

    // Set up error listeners
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        errors.console.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.javascript.push(`JS ERROR: ${error.message}`);
    });

    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        errors.network.push(`NETWORK ERROR: ${response.status()} ${response.url()}`);
      }
    });

    console.log('🔍 COMPREHENSIVE ADMIN DASHBOARD ANALYSIS');
    console.log('=' .repeat(80));

    // Test 1: Critical Fixes - Admin Pages Existence
    console.log('\\n📋 TEST 1: Critical Fixes - Admin Pages Existence');
    console.log('-'.repeat(50));

    const adminPages = [
      '/admin',
      '/admin/users',
      '/admin/settings', 
      '/admin/training',
      '/admin/monitoring/system',
      '/admin/monitoring/gpu',
      '/admin/security',
      '/admin/reports',
      '/admin/users/analytics',
      '/admin/content/moderation',
      '/admin/error-recovery'
    ];

    const pageResults = [];
    
    for (const adminPage of adminPages) {
      try {
        console.log(`Testing: ${adminPage}`);
        const response = await page.goto(`http://localhost:3000${adminPage}`, { 
          waitUntil: 'networkidle', 
          timeout: 10000 
        });
        
        const status = response?.status() || 'unknown';
        const title = await page.title();
        const bodyText = await page.textContent('body').catch(() => '');
        
        const is404 = bodyText.includes('404') || bodyText.includes('Page Not Found') || status === 404;
        
        pageResults.push({
          page: adminPage,
          status,
          title,
          exists: !is404,
          loadTime: 'measured'
        });

        console.log(`  ✅ Status: ${status}, Exists: ${!is404}, Title: "${title}"`);
        
      } catch (error) {
        pageResults.push({
          page: adminPage,
          status: 'error',
          title: '',
          exists: false,
          error: error.message
        });
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // Test 2: JavaScript Errors Analysis
    console.log('\\n🔧 TEST 2: JavaScript Errors Analysis');
    console.log('-'.repeat(50));
    
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Allow time for dynamic content
    
    // Try to interact with elements to trigger potential errors
    try {
      await page.click('button, [role="button"]', { timeout: 2000 });
    } catch (e) {
      console.log('No interactive buttons found or click failed');
    }

    console.log(`Console errors found: ${errors.console.length}`);
    console.log(`JavaScript errors found: ${errors.javascript.length}`);
    console.log(`Network errors found: ${errors.network.length}`);

    if (errors.console.length > 0) {
      console.log('Console issues:');
      errors.console.forEach(error => console.log(`  - ${error}`));
    }

    if (errors.javascript.length > 0) {
      console.log('JavaScript issues:');
      errors.javascript.forEach(error => console.log(`  - ${error}`));
    }

    if (errors.network.length > 0) {
      console.log('Network issues:');
      errors.network.forEach(error => console.log(`  - ${error}`));
    }

    // Test 3: Accessibility Analysis
    console.log('\\n♿ TEST 3: Accessibility Analysis');
    console.log('-'.repeat(50));

    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
    
    const accessibilityMetrics = await page.evaluate(() => {
      return {
        ariaLabels: document.querySelectorAll('[aria-label]').length,
        ariaLabelledBy: document.querySelectorAll('[aria-labelledby]').length,
        ariaDescribedBy: document.querySelectorAll('[aria-describedby]').length,
        roles: document.querySelectorAll('[role]').length,
        liveRegions: document.querySelectorAll('[aria-live]').length,
        skipLinks: document.querySelectorAll('a[href^="#main"], a[href^="#content"]').length,
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        landmarks: document.querySelectorAll('main, nav, aside, header, footer, [role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"]').length
      };
    });

    console.log('Accessibility metrics:');
    Object.entries(accessibilityMetrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Test 4: Performance Analysis
    console.log('\\n⚡ TEST 4: Performance Analysis');
    console.log('-'.repeat(50));

    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.navigationStart),
        loadComplete: Math.round(perf.loadEventEnd - perf.navigationStart),
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        scriptTags: document.querySelectorAll('script[src]').length,
        lazyElements: document.querySelectorAll('[data-lazy], [loading="lazy"]').length
      };
    });

    console.log('Performance metrics:');
    Object.entries(performanceMetrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}${key.includes('Time') || key.includes('loaded') || key.includes('Paint') ? 'ms' : ''}`);
    });

    // Test 5: UI Elements Analysis
    console.log('\\n🎨 TEST 5: UI Elements Analysis');
    console.log('-'.repeat(50));

    const uiMetrics = await page.evaluate(() => {
      return {
        navigationLinks: document.querySelectorAll('nav a, [role="navigation"] a').length,
        buttons: document.querySelectorAll('button, [role="button"]').length,
        forms: document.querySelectorAll('form').length,
        tables: document.querySelectorAll('table, [role="table"]').length,
        widgets: document.querySelectorAll('[data-widget], .widget, .dashboard-card').length,
        charts: document.querySelectorAll('canvas, svg, [data-chart]').length
      };
    });

    console.log('UI elements found:');
    Object.entries(uiMetrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Test 6: Mobile Responsiveness
    console.log('\\n📱 TEST 6: Mobile Responsiveness');
    console.log('-'.repeat(50));

    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });

    const mobileMetrics = await page.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const mobileMenus = document.querySelectorAll('[aria-label*="menu"], .mobile-menu-button, [data-mobile-menu]').length;
      const responsiveClasses = document.querySelectorAll('.sm\\\\:, .md\\\\:, .lg\\\\:, .xl\\\\:').length;
      
      return {
        hasHorizontalScroll,
        mobileMenus,
        responsiveClasses,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });

    console.log('Mobile responsiveness:');
    Object.entries(mobileMetrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Final Summary
    console.log('\\n📊 FINAL SUMMARY');
    console.log('=' .repeat(80));

    const summary = {
      totalPagesExist: pageResults.filter(p => p.exists).length,
      totalPagesTest: pageResults.length,
      consoleerrors: errors.console.length,
      javascriptErrors: errors.javascript.length,
      networkErrors: errors.network.length,
      accessibilityScore: Object.values(accessibilityMetrics).reduce((a, b) => a + b, 0),
      performanceGood: performanceMetrics.domContentLoaded < 3000,
      mobileResponsive: !mobileMetrics.hasHorizontalScroll
    };

    console.log('Overall Assessment:');
    console.log(`  Pages functioning: ${summary.totalPagesExist}/${summary.totalPagesTest}`);
    console.log(`  Total errors: ${summary.consoleerrors + summary.javascriptErrors + summary.networkErrors}`);
    console.log(`  Accessibility elements: ${summary.accessibilityScore}`);
    console.log(`  Performance good: ${summary.performanceGood ? 'Yes' : 'No'}`);
    console.log(`  Mobile responsive: ${summary.mobileResponsive ? 'Yes' : 'No'}`);

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      pageResults,
      errors,
      metrics: {
        accessibility: accessibilityMetrics,
        performance: performanceMetrics,
        ui: uiMetrics,
        mobile: mobileMetrics
      }
    };

    fs.writeFileSync('./admin-analysis-report.json', JSON.stringify(report, null, 2));
    console.log('\\n📄 Detailed report saved to: admin-analysis-report.json');

  } catch (error) {
    console.error('Analysis failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

analyzeAdminDashboard().catch(console.error);