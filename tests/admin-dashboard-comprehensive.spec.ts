import { test, expect, Page } from '@playwright/test';

// Test configuration
const ADMIN_USERNAME = 'admin@test.com';
const ADMIN_PASSWORD = 'testpassword';

test.describe('Admin Dashboard Comprehensive Analysis', () => {
  let consoleErrors: string[] = [];
  let networkErrors: string[] = [];
  let jsErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    consoleErrors = [];
    networkErrors = [];
    jsErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
      }
      if (msg.type() === 'warning') {
        consoleErrors.push(`Console Warning: ${msg.text()}`);
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', error => {
      jsErrors.push(`JavaScript Error: ${error.message}`);
    });

    // Capture network failures
    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        networkErrors.push(`Network Error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Report errors found during test
    if (consoleErrors.length > 0) {
      console.log('Console Errors/Warnings found:', consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log('Network Errors found:', networkErrors);
    }
    if (jsErrors.length > 0) {
      console.log('JavaScript Errors found:', jsErrors);
    }
  });

  test('Critical Fix Verification - Admin Pages Exist and Load', async ({ page }) => {
    console.log('Testing critical fixes - admin pages existence and loading...');

    // Test main admin page
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin');

    // Test that /admin/users page exists (previously missing)
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin/users');
    
    // Verify the page loads without 404 error
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('404');
    expect(pageContent).not.toContain('Page Not Found');

    // Test other admin sub-pages
    const adminPages = [
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

    for (const adminPage of adminPages) {
      await page.goto(adminPage);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(adminPage);
      
      const content = await page.textContent('body');
      expect(content).not.toContain('404');
      expect(content).not.toContain('Page Not Found');
    }

    // Verify no critical JavaScript errors
    expect(jsErrors.filter(error => error.includes('serialization'))).toHaveLength(0);
  });

  test('JavaScript Error Resolution Verification', async ({ page }) => {
    console.log('Testing JavaScript error resolution...');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);

    // Check for common error patterns that should be resolved
    const criticalErrorPatterns = [
      'serialization',
      'undefined is not a function',
      'Cannot read property',
      'ReferenceError',
      'TypeError: Cannot read properties of undefined'
    ];

    const foundCriticalErrors = jsErrors.filter(error => 
      criticalErrorPatterns.some(pattern => error.toLowerCase().includes(pattern.toLowerCase()))
    );

    expect(foundCriticalErrors).toHaveLength(0);

    // Test specific components that might have had serialization issues
    await page.click('button, [role="button"]', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Verify no new serialization errors after interactions
    const newSerializationErrors = jsErrors.filter(error => 
      error.toLowerCase().includes('serialization')
    );
    expect(newSerializationErrors).toHaveLength(0);
  });

  test('Accessibility Improvements Verification', async ({ page }) => {
    console.log('Testing accessibility improvements...');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Test ARIA labels implementation
    const elementsWithAriaLabels = await page.locator('[aria-label]').count();
    console.log(`Found ${elementsWithAriaLabels} elements with aria-label`);
    expect(elementsWithAriaLabels).toBeGreaterThan(3); // Should be much more than the previous 3

    // Test aria-labelledby usage
    const elementsWithAriaLabelledBy = await page.locator('[aria-labelledby]').count();
    console.log(`Found ${elementsWithAriaLabelledBy} elements with aria-labelledby`);

    // Test aria-describedby usage
    const elementsWithAriaDescribedBy = await page.locator('[aria-describedby]').count();
    console.log(`Found ${elementsWithAriaDescribedBy} elements with aria-describedby`);

    // Test role attributes
    const elementsWithRoles = await page.locator('[role]').count();
    console.log(`Found ${elementsWithRoles} elements with role attributes`);
    expect(elementsWithRoles).toBeGreaterThan(0);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    expect(await focusedElement.count()).toBe(1);

    // Test tab navigation through multiple elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Test live regions for dynamic content
    const liveRegions = await page.locator('[aria-live]').count();
    console.log(`Found ${liveRegions} live regions`);

    // Test skip links
    const skipLinks = await page.locator('a[href^="#main"], a[href^="#content"]').count();
    console.log(`Found ${skipLinks} skip links`);
  });

  test('Performance Optimizations Verification', async ({ page }) => {
    console.log('Testing performance optimizations...');

    // Measure page load performance
    const startTime = Date.now();
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    console.log(`Admin page load time: ${loadTime}ms`);

    // Test lazy loading implementation
    const lazyComponents = await page.locator('[data-lazy], [loading="lazy"]').count();
    console.log(`Found ${lazyComponents} lazy-loaded components`);

    // Test code splitting by checking for chunk files in network requests
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('.js') && response.url().includes('chunk')) {
        responses.push(response.url());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    console.log(`Found ${responses.length} JavaScript chunks (code splitting)`);

    // Test bundle optimization by checking for reduced script tags
    const scriptTags = await page.locator('script[src]').count();
    console.log(`Found ${scriptTags} script tags`);

    // Performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.fetchStart,
        loadComplete: perf.loadEventEnd - perf.fetchStart,
        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    console.log('Performance Metrics:', performanceMetrics);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('Admin Dashboard Functionality Verification', async ({ page }) => {
    console.log('Testing admin dashboard functionality...');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Test navigation functionality
    const navigationLinks = await page.locator('nav a, [role="navigation"] a').count();
    console.log(`Found ${navigationLinks} navigation links`);
    expect(navigationLinks).toBeGreaterThan(0);

    // Test sidebar navigation if present
    const sidebarLinks = await page.locator('aside a, .sidebar a').count();
    console.log(`Found ${sidebarLinks} sidebar links`);

    // Test dashboard widgets
    const dashboardWidgets = await page.locator('[data-widget], .widget, .dashboard-card').count();
    console.log(`Found ${dashboardWidgets} dashboard widgets`);

    // Test data tables
    const dataTables = await page.locator('table, [role="table"]').count();
    console.log(`Found ${dataTables} data tables`);

    // Test form elements in admin pages
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    const formElements = await page.locator('input, select, textarea').count();
    console.log(`Found ${formElements} form elements in settings`);

    // Test user management interface
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    const userManagementElements = await page.locator('button, [role="button"]').count();
    console.log(`Found ${userManagementElements} interactive elements in user management`);
  });

  test('Mobile Responsiveness Testing', async ({ page }) => {
    console.log('Testing mobile responsiveness...');

    // Test with mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Test mobile navigation
    const mobileMenuButton = await page.locator('[aria-label*="menu"], .mobile-menu-button, [data-mobile-menu]').count();
    console.log(`Found ${mobileMenuButton} mobile menu buttons`);

    // Test responsive elements
    const responsiveElements = await page.locator('.sm\\:, .md\\:, .lg\\:, .xl\\:').count();
    console.log(`Found ${responsiveElements} responsive utility classes`);

    // Test touch targets (should be at least 44px)
    const buttons = await page.locator('button, [role="button"]').all();
    for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(40); // Minimum touch target
        expect(boundingBox.width).toBeGreaterThanOrEqual(40);
      }
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Test horizontal scrolling (should not occur)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('Real-time Connection and Data Virtualization', async ({ page }) => {
    console.log('Testing real-time connections and data virtualization...');

    await page.goto('/admin/monitoring/system');
    await page.waitForLoadState('networkidle');

    // Test for WebSocket connections or Server-Sent Events
    const webSocketConnections = await page.evaluate(() => {
      return window.WebSocket ? 'WebSocket available' : 'No WebSocket';
    });
    console.log('WebSocket availability:', webSocketConnections);

    // Test data virtualization (large lists)
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Look for virtualization indicators
    const virtualizedElements = await page.locator('[data-virtualized], .virtual-list, [role="grid"]').count();
    console.log(`Found ${virtualizedElements} virtualized elements`);

    // Test pagination
    const paginationElements = await page.locator('[role="navigation"] button, .pagination button').count();
    console.log(`Found ${paginationElements} pagination elements`);

    // Test infinite scroll or virtual scrolling
    const scrollContainer = await page.locator('[data-scroll-container], .scroll-container').first();
    if (await scrollContainer.count() > 0) {
      await scrollContainer.evaluate((el) => el.scrollTop = 1000);
      await page.waitForTimeout(1000);
      console.log('Tested virtual scrolling');
    }
  });

  test('Error Handling and Recovery Mechanisms', async ({ page }) => {
    console.log('Testing error handling and recovery mechanisms...');

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Test error boundaries
    const errorBoundaries = await page.locator('[data-error-boundary]').count();
    console.log(`Found ${errorBoundaries} error boundaries`);

    // Test error recovery page
    await page.goto('/admin/error-recovery');
    await page.waitForLoadState('networkidle');
    
    const errorRecoveryContent = await page.textContent('body');
    expect(errorRecoveryContent).toContain('error'); // Should contain error-related content

    // Test 404 handling by visiting a non-existent admin page
    const response = await page.goto('/admin/non-existent-page');
    console.log('404 page response status:', response?.status());

    // Test retry mechanisms
    const retryButtons = await page.locator('[data-retry], button[aria-label*="retry"]').count();
    console.log(`Found ${retryButtons} retry buttons`);

    // Test toast notifications or error messages
    const errorMessages = await page.locator('[role="alert"], .error-message, .toast').count();
    console.log(`Found ${errorMessages} error message containers`);
  });

  test('Security and Monitoring Features', async ({ page }) => {
    console.log('Testing security and monitoring features...');

    await page.goto('/admin/security');
    await page.waitForLoadState('networkidle');

    // Test security dashboard elements
    const securityWidgets = await page.locator('[data-security], .security-widget').count();
    console.log(`Found ${securityWidgets} security widgets`);

    // Test monitoring dashboard
    await page.goto('/admin/monitoring/system');
    await page.waitForLoadState('networkidle');

    const monitoringCharts = await page.locator('canvas, svg, [data-chart]').count();
    console.log(`Found ${monitoringCharts} monitoring charts/visualizations`);

    // Test GPU monitoring
    await page.goto('/admin/monitoring/gpu');
    await page.waitForLoadState('networkidle');

    const gpuMetrics = await page.locator('[data-gpu-metric], .gpu-metric').count();
    console.log(`Found ${gpuMetrics} GPU metrics elements`);

    // Test reports functionality
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');

    const reportElements = await page.locator('button, [role="button"]').count();
    console.log(`Found ${reportElements} interactive elements in reports`);
  });

  test('Final Error Summary and Performance Report', async ({ page }) => {
    console.log('Generating final error summary and performance report...');

    // Visit all major admin pages and collect comprehensive data
    const adminPages = [
      '/admin',
      '/admin/users',
      '/admin/settings',
      '/admin/training',
      '/admin/monitoring/system',
      '/admin/monitoring/gpu',
      '/admin/security',
      '/admin/reports'
    ];

    const pageMetrics = [];

    for (const adminPage of adminPages) {
      const startTime = Date.now();
      await page.goto(adminPage);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      const pageData = {
        page: adminPage,
        loadTime,
        consoleErrors: [...consoleErrors],
        networkErrors: [...networkErrors],
        jsErrors: [...jsErrors]
      };

      pageMetrics.push(pageData);

      // Reset error arrays for next page
      consoleErrors = [];
      networkErrors = [];
      jsErrors = [];
    }

    // Log comprehensive report
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE ADMIN DASHBOARD ANALYSIS REPORT');
    console.log('='.repeat(80));

    for (const metric of pageMetrics) {
      console.log(`\\nPage: ${metric.page}`);
      console.log(`Load Time: ${metric.loadTime}ms`);
      console.log(`Console Errors: ${metric.consoleErrors.length}`);
      console.log(`Network Errors: ${metric.networkErrors.length}`);
      console.log(`JavaScript Errors: ${metric.jsErrors.length}`);
      
      if (metric.consoleErrors.length > 0) {
        console.log('Console Issues:', metric.consoleErrors);
      }
      if (metric.networkErrors.length > 0) {
        console.log('Network Issues:', metric.networkErrors);
      }
      if (metric.jsErrors.length > 0) {
        console.log('JavaScript Issues:', metric.jsErrors);
      }
    }

    console.log('\\n' + '='.repeat(80));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(80));
  });
});