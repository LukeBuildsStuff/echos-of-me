const puppeteer = require('puppeteer');

async function testResponseSubmissionFlow() {
  let browser;
  try {
    console.log('🚀 Starting response submission flow test...\n');
    
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Enable console logging from the page
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
      } else if (type === 'warn') {
        console.log('⚠️  Browser Console Warning:', msg.text());
      }
    });

    // Listen for network errors
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        console.log(`❌ API Error: ${response.status()} ${response.url()}`);
      }
    });

    console.log('1. 🔗 Navigating to application...');
    await page.goto('http://localhost:3003');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to sign-in
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('2. 🔐 Filling in login credentials...');
      
      // Try to find and fill login form
      await page.waitForSelector('input[name="email"]', { timeout: 5000 });
      await page.type('input[name="email"]', 'test@example.com');
      await page.type('input[name="password"]', 'password');
      
      // Find and click login button
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
    
    console.log('3. 📝 Navigating to daily question page...');
    await page.goto('http://localhost:3003/daily-question');
    
    // Wait for question to load
    await page.waitForTimeout(3000);
    
    // Check if question loaded
    const questionText = await page.$eval('p', el => el.textContent).catch(() => null);
    if (questionText) {
      console.log(`✅ Question loaded: "${questionText.substring(0, 100)}..."`);
    } else {
      console.log('❌ No question found on page');
    }
    
    // Find the textarea
    console.log('4. ✏️  Finding response textarea...');
    const textarea = await page.$('textarea');
    if (!textarea) {
      console.log('❌ Response textarea not found');
      return;
    }
    
    console.log('✅ Response textarea found');
    
    // Type a test response
    console.log('5. 📝 Typing test response...');
    const testResponse = "This is a test response to verify the submission functionality. I'm testing whether responses can be saved properly to the database and whether the user flow works as expected.";
    
    await page.click('textarea');
    await page.type('textarea', testResponse);
    
    // Wait for quality indicator to appear
    await page.waitForTimeout(1000);
    
    // Check if quality indicator appears
    const qualityIndicator = await page.$('.bg-gradient-to-r').catch(() => null);
    if (qualityIndicator) {
      console.log('✅ Quality indicator appeared');
    } else {
      console.log('⚠️  Quality indicator not found');
    }
    
    // Find and click save button
    console.log('6. 💾 Finding and clicking save button...');
    const saveButton = await page.$('button:not([variant="outline"])');
    if (!saveButton) {
      console.log('❌ Save button not found');
      return;
    }
    
    const buttonText = await page.evaluate(btn => btn.textContent, saveButton);
    console.log(`✅ Save button found: "${buttonText}"`);
    
    // Check if button is disabled
    const isDisabled = await page.evaluate(btn => btn.disabled, saveButton);
    if (isDisabled) {
      console.log('❌ Save button is disabled');
      return;
    }
    
    console.log('✅ Save button is enabled');
    
    // Monitor network requests before clicking
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/responses') && response.request().method() === 'POST'
    );
    
    // Click the save button
    await saveButton.click();
    console.log('✅ Save button clicked');
    
    // Wait for the API response
    try {
      const response = await responsePromise;
      const status = response.status();
      console.log(`✅ API Response received: ${status}`);
      
      if (status === 200 || status === 201) {
        const responseData = await response.json();
        console.log('✅ Response saved successfully:', responseData.success);
      } else if (status === 401) {
        console.log('❌ Authentication error - user needs to log in');
      } else {
        console.log(`❌ API Error: ${status}`);
      }
    } catch (error) {
      console.log('❌ Failed to get API response:', error.message);
    }
    
    // Wait for any UI changes
    await page.waitForTimeout(2000);
    
    // Check if we were redirected or if completion feedback appears
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard');
    } else {
      console.log('⚠️  Still on daily question page - checking for completion feedback');
      
      // Check for completion feedback modal/overlay
      const completionFeedback = await page.$('[class*="completion"]').catch(() => null);
      if (completionFeedback) {
        console.log('✅ Completion feedback displayed');
      } else {
        console.log('❌ No completion feedback found');
      }
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testResponseSubmissionFlow();