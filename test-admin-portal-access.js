const puppeteer = require('puppeteer');

async function testAdminPortalAccess() {
  let browser;
  
  try {
    console.log('🔍 Starting Admin Portal Access Test...\n');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Enable request/response logging
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ HTTP Error: ${response.status()} - ${response.url()}`);
      }
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🐛 Console Error: ${msg.text()}`);
      }
    });
    
    console.log('📱 Testing Admin Portal Access Flow');
    console.log('='.repeat(50));
    
    // Test 1: Navigate to admin portal directly (should redirect to login)
    console.log('\n1️⃣ Testing direct admin portal access...');
    await page.goto('http://localhost:3004/admin', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('   ✅ Correctly redirected to login page');
    } else {
      console.log('   ❌ Expected redirect to login page');
    }
    
    // Test 2: Login with admin credentials
    console.log('\n2️⃣ Testing login with admin credentials...');
    
    // Wait for login form elements
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    
    // Fill in login credentials
    await page.type('input[name="email"]', 'lukemoeller@yahoo.com');
    await page.type('input[name="password"]', 'password123');
    
    console.log('   📝 Filled in credentials: lukemoeller@yahoo.com / password123');
    
    // Submit login form
    const submitButton = await page.$('button[type="submit"]') || await page.$('button:contains("Sign In")');
    if (submitButton) {
      await submitButton.click();
      console.log('   🔄 Submitted login form');
    } else {
      console.log('   ❌ Could not find submit button');
      return;
    }
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
    
    // Test 3: Verify successful login and admin access
    console.log('\n3️⃣ Verifying admin portal access...');
    
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/admin')) {
      console.log('   ✅ Successfully accessed admin portal');
      
      // Test 4: Check for Family Legacy Guardian dashboard
      console.log('\n4️⃣ Testing Family Legacy Guardian dashboard...');
      
      // Wait for dashboard to load
      await page.waitForTimeout(2000);
      
      // Check for key dashboard elements
      const dashboardTitle = await page.$eval('h1', el => el.textContent).catch(() => null);
      console.log(`   Dashboard Title: ${dashboardTitle}`);
      
      if (dashboardTitle && dashboardTitle.includes('Family Legacy Guardian')) {
        console.log('   ✅ Family Legacy Guardian dashboard loaded successfully');
      } else {
        console.log('   ❌ Expected "Family Legacy Guardian" dashboard title');
      }
      
      // Test 5: Check for admin navigation elements
      console.log('\n5️⃣ Testing admin navigation elements...');
      
      const navigationButtons = await page.$$eval('button', buttons => 
        buttons.map(btn => btn.textContent?.trim()).filter(Boolean)
      );
      
      console.log('   Navigation buttons found:');
      navigationButtons.forEach(btn => console.log(`     - ${btn}`));
      
      const expectedButtons = ['Overview', 'Families', 'Grief Support', 'Legacy Analytics', 'Emergency Support'];
      const foundButtons = expectedButtons.filter(expected => 
        navigationButtons.some(btn => btn.includes(expected))
      );
      
      console.log(`   ✅ Found ${foundButtons.length}/${expectedButtons.length} expected navigation buttons`);
      
      // Test 6: Check for crisis hotline button
      const crisisButton = navigationButtons.find(btn => btn.includes('Crisis Hotline'));
      if (crisisButton) {
        console.log('   ✅ Crisis Hotline button found');
      } else {
        console.log('   ❌ Crisis Hotline button not found');
      }
      
      // Test 7: Verify admin stats are loading
      console.log('\n6️⃣ Testing admin statistics loading...');
      
      const statsCards = await page.$$eval('.card, [class*="card"]', cards => cards.length);
      console.log(`   Found ${statsCards} statistics cards`);
      
      if (statsCards > 0) {
        console.log('   ✅ Statistics cards are present');
      } else {
        console.log('   ❌ No statistics cards found');
      }
      
      // Test 8: Test navigation between views
      console.log('\n7️⃣ Testing navigation between admin views...');
      
      // Try clicking on Families button
      const familiesButton = await page.$('button:contains("Families")') || 
                            await page.$('button[aria-label*="Families"]') ||
                            await page.evaluateHandle(() => {
                              const buttons = Array.from(document.querySelectorAll('button'));
                              return buttons.find(btn => btn.textContent?.includes('Families'));
                            });
      
      if (familiesButton && familiesButton.asElement) {
        await familiesButton.asElement().click();
        await page.waitForTimeout(1000);
        console.log('   ✅ Successfully navigated to Families view');
      } else {
        console.log('   ❌ Could not find or click Families button');
      }
      
    } else if (finalUrl.includes('/dashboard')) {
      console.log('   ❌ Redirected to regular dashboard - admin access denied');
    } else {
      console.log('   ❌ Unexpected redirect - login may have failed');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Admin Portal Access Test Complete');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testAdminPortalAccess().catch(console.error);