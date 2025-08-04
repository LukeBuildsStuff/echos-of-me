const puppeteer = require('puppeteer');

async function testLoginForm() {
  let browser;
  try {
    console.log('Testing login form directly with browser automation...\n');

    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('requestfailed', request => console.log('FAILED REQUEST:', request.url(), request.failure().errorText));
    
    console.log('1. Navigating to signin page...');
    await page.goto('http://localhost:3001/auth/signin', { waitUntil: 'networkidle0' });
    console.log('✓ Page loaded');

    console.log('2. Filling in login form...');
    await page.type('#email', 'test@example.com');
    await page.type('#password', 'testpassword123');
    console.log('✓ Form filled');

    console.log('3. Submitting form...');
    
    // Listen for navigation
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    
    await page.click('button[type="submit"]');
    
    try {
      await navigationPromise;
      console.log('✓ Navigation completed');
      
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Login successful - redirected to dashboard!');
      } else if (currentUrl.includes('/auth/signin')) {
        console.log('❌ Login failed - still on signin page');
        
        // Check for error messages
        const errorMessage = await page.$eval('.text-destructive', el => el.textContent).catch(() => null);
        if (errorMessage) {
          console.log('Error message:', errorMessage);
        }
      } else {
        console.log('❓ Unexpected redirect to:', currentUrl);
      }
      
    } catch (timeoutError) {
      console.log('⏰ Navigation timeout - checking current state...');
      const currentUrl = page.url();
      console.log('Current URL after timeout:', currentUrl);
      
      // Check for any error messages on the page
      const pageContent = await page.content();
      if (pageContent.includes('Invalid email or password')) {
        console.log('❌ Found error message on page');
      }
    }

  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testLoginForm();