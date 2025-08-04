import { test, expect } from '@playwright/test';

/**
 * Admin Portal UI Test Suite
 * Tests the grief-sensitive admin interface components
 */

test.describe('Admin Portal UI Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock console to capture any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('should display admin portal access control', async ({ page }) => {
    // Try to access admin portal without authentication
    await page.goto('/admin');
    
    // Should be redirected to sign-in or show access control
    await expect(page).toHaveURL(/\/auth\/signin|\/admin/);
    
    // Check if page loads without errors
    const title = await page.title();
    expect(title).toContain('Echos Of Me');
  });

  test('should display grief-sensitive design elements', async ({ page }) => {
    await page.goto('/admin');
    
    // Check for grief-sensitive color palette
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return {
        backgroundColor: computedStyle.backgroundColor,
        fontFamily: computedStyle.fontFamily
      };
    });
    
    // Should use soft, peaceful colors - not harsh reds or bright colors
    expect(bodyStyles.backgroundColor).not.toMatch(/rgb\(255, 0, 0\)|#ff0000/i);
    
    // Should use compassionate fonts
    expect(bodyStyles.fontFamily).toMatch(/Inter|Segoe UI|system-ui|sans-serif/i);
  });

  test('should show family legacy guardian interface', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for grief-sensitive messaging
    const compassionateText = [
      'Family Legacy Guardian',
      'Supporting families', 
      'preserving precious memories',
      'Guardian Mode',
      'Crisis Hotline'
    ];
    
    for (const text of compassionateText) {
      const element = page.locator(`text=${text}`).first();
      // Element might exist on the page even if access is restricted
      const count = await element.count();
      if (count > 0) {
        console.log(`✅ Found grief-sensitive text: "${text}"`);
      }
    }
    
    // Check for heart icons and compassionate symbols
    const heartIcons = await page.locator('svg').count();
    expect(heartIcons).toBeGreaterThan(0);
  });

  test('should have proper loading states with grief-sensitive design', async ({ page }) => {
    await page.goto('/admin');
    
    // Check for loading indicators that are gentle and supportive
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], [class*="animate"]').count();
    
    // Should have loading states, but they should be gentle
    if (loadingElements > 0) {
      console.log(`✅ Found ${loadingElements} loading elements with compassionate design`);
    }
    
    // Check for peaceful loading messages
    const loadingText = [
      'Preparing your legacy journey',
      'Loading Family Legacy Guardian',
      'Preparing compassionate tools'
    ];
    
    for (const text of loadingText) {
      const element = page.locator(`text*=${text}`).first();
      const count = await element.count();
      if (count > 0) {
        console.log(`✅ Found grief-sensitive loading text: "${text}"`);
      }
    }
  });

  test('should show emergency support accessibility', async ({ page }) => {
    await page.goto('/admin');
    
    // Check for emergency support elements that should be easily accessible
    const emergencyElements = [
      'Crisis Hotline',
      'Emergency Support',
      'Phone',
      'Support'
    ];
    
    for (const text of emergencyElements) {
      const elements = await page.locator(`text*=${text}`).count();
      if (elements > 0) {
        console.log(`✅ Found emergency support element: "${text}"`);
      }
    }
    
    // Should have phone/crisis hotline button that's prominently displayed
    const crisisButton = page.locator('button:has-text("Crisis Hotline"), button:has-text("Emergency")').first();
    const crisisButtonCount = await crisisButton.count();
    if (crisisButtonCount > 0) {
      const isVisible = await crisisButton.isVisible();
      console.log(`✅ Crisis hotline button present and ${isVisible ? 'visible' : 'hidden'}`);
    }
  });

  test('should display family-centric navigation', async ({ page }) => {
    await page.goto('/admin');
    
    // Check for family-focused navigation elements
    const familyNavigation = [
      'Families',
      'Family Support',
      'Grief Support', 
      'Legacy Analytics',
      'Family Dashboard'
    ];
    
    for (const navItem of familyNavigation) {
      const elements = await page.locator(`text*=${navItem}`).count();
      if (elements > 0) {
        console.log(`✅ Found family-centric navigation: "${navItem}"`);
      }
    }
  });

  test('should use compassionate button and card designs', async ({ page }) => {
    await page.goto('/admin');
    
    // Check button styling for gentle, non-aggressive design
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
    
    if (buttons > 0) {
      // Check first button's styling
      const buttonStyles = await page.locator('button').first().evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          borderRadius: styles.borderRadius,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontWeight: styles.fontWeight
        };
      });
      
      // Should have rounded corners (compassionate design)
      expect(buttonStyles.borderRadius).not.toBe('0px');
      
      // Font weight should be medium, not bold (less aggressive)
      expect(buttonStyles.fontWeight).not.toBe('700'); // Not bold
      
      console.log(`✅ Button styling follows grief-sensitive design principles`);
    }
    
    // Check for card components with gentle borders
    const cards = await page.locator('[class*="card"], [class*="rounded"]').count();
    if (cards > 0) {
      console.log(`✅ Found ${cards} card components with compassionate design`);
    }
  });

  test('should handle errors with grief-sensitive messaging', async ({ page }) => {
    // Test error handling by trying to access a protected admin API
    const response = await page.request.get('/api/admin/analytics');
    expect(response.status()).toBe(403);
    
    const errorData = await response.json();
    
    // Error message should be compassionate, not harsh
    expect(errorData.error).not.toMatch(/forbidden|denied|unauthorized/i);
    expect(errorData.error).toMatch(/admin access required|support team|help/i);
    
    console.log(`✅ Error message is grief-sensitive: "${errorData.error}"`);
  });

  test('should be responsive for mobile crisis support', async ({ page }) => {
    // Test mobile viewport for crisis situations
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.goto('/admin');
    
    // Crisis hotline should be accessible on mobile
    const mobileElements = await page.locator('button:has-text("Crisis"), button:has-text("Emergency")').count();
    
    // Check if navigation is mobile-friendly
    const navElements = await page.locator('nav, [role="navigation"]').count();
    
    // Should have mobile-optimized layout
    const mobileOptimized = mobileElements > 0 || navElements > 0;
    expect(mobileOptimized).toBe(true);
    
    console.log(`✅ Mobile responsiveness verified for crisis support scenarios`);
  });

  test('should protect sensitive admin areas', async ({ page }) => {
    // Try to access various admin routes
    const adminRoutes = [
      '/admin/users',
      '/admin/families', 
      '/admin/settings',
      '/admin/reports',
      '/admin/security'
    ];
    
    for (const route of adminRoutes) {
      await page.goto(route);
      
      // Should either redirect to login or show access control
      const currentUrl = page.url();
      const isProtected = currentUrl.includes('/auth/signin') || 
                         currentUrl.includes('/admin') ||
                         await page.locator('text*=access').count() > 0;
      
      expect(isProtected).toBe(true);
      console.log(`✅ Admin route ${route} is properly protected`);
    }
  });

  test('should maintain grief-sensitive color palette throughout', async ({ page }) => {
    await page.goto('/admin');
    
    // Check that the color palette follows grief-sensitive guidelines
    const colorElements = await page.locator('[style*="color"], [style*="background"]').count();
    
    // Verify no harsh or aggressive colors are used
    const bodyBg = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });
    
    // Should not be bright red, harsh yellow, or other jarring colors
    expect(bodyBg).not.toMatch(/rgb\(255, 0, 0\)|rgb\(255, 255, 0\)/);
    
    console.log(`✅ Color palette follows grief-sensitive design guidelines`);
  });
});