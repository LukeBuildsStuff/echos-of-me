const puppeteer = require('puppeteer');

async function testSigninForm() {
  console.log('Starting signin form test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
    
    console.log('Navigating to signin page...');
    await page.goto('http://localhost:3003/auth/signin', { waitUntil: 'networkidle0' });
    
    console.log('Page loaded, checking form elements...');
    
    // Check if form exists
    const form = await page.$('form');
    if (!form) {
      console.error('Form not found!');
      return;
    }
    console.log('Form found');
    
    // Check if email input exists
    const emailInput = await page.$('input[type="email"]');
    if (!emailInput) {
      console.error('Email input not found!');
      return;
    }
    console.log('Email input found');
    
    // Check if password input exists
    const passwordInput = await page.$('input[type="password"]');
    if (!passwordInput) {
      console.error('Password input not found!');
      return;
    }
    console.log('Password input found');
    
    // Check if submit button exists
    const submitButton = await page.$('button[type="submit"]');
    if (!submitButton) {
      console.error('Submit button not found!');
      return;
    }
    console.log('Submit button found');
    
    // Fill in test credentials
    console.log('Filling in test credentials...');
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'testpassword');
    
    // Set up network monitoring
    await page.setRequestInterception(true);
    let loginRequest = null;
    
    page.on('request', request => {
      console.log('REQUEST:', request.method(), request.url());
      if (request.url().includes('/api/auth/simple-login')) {
        loginRequest = request;
        console.log('LOGIN REQUEST BODY:', request.postData());
      }
      request.continue();
    });
    
    page.on('response', response => {
      console.log('RESPONSE:', response.status(), response.url());
      if (response.url().includes('/api/auth/simple-login')) {
        console.log('LOGIN RESPONSE STATUS:', response.status());
      }
    });
    
    console.log('Clicking submit button...');
    
    // Click submit and wait for network activity
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/auth/simple-login'), { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    console.log('Form submitted, waiting for result...');
    
    // Wait a bit to see what happens
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL after submission:', currentUrl);
    
    // Check for error messages
    const errorElement = await page.$('.text-red-700');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent, errorElement);
      console.log('Error message found:', errorText);
    }
    
    // Check if loading state is active
    const submitButtonText = await page.evaluate(button => button.textContent, submitButton);
    console.log('Submit button text:', submitButtonText);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSigninForm();