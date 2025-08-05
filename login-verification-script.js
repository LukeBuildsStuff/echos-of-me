const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

console.log('=== LOGIN VERIFICATION SCRIPT ===\n');

// Test configuration
const baseUrl = 'http://localhost:3000';
const credentials = {
  email: 'lukemoeller@yahoo.com',
  password: 'password123'
};

// Store test results
let testResults = {
  signinPageLoads: false,
  formElementsVisible: false,
  loginSubmissionWorks: false,
  redirectsToCorrectPage: false,
  sessionPersists: false,
  noRedirectLoops: true,
  consoleErrors: [],
  networkErrors: [],
  navigationHistory: []
};

async function testWithPuppeteer() {
  let browser = null;
  let page = null;
  
  try {
    console.log('🔍 Starting Puppeteer browser test...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    page = await browser.newPage();
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        testResults.consoleErrors.push(msg.text());
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    // Capture page errors
    page.on('pageerror', (error) => {
      testResults.consoleErrors.push(`Page Error: ${error.message}`);
      console.log(`❌ Page Error: ${error.message}`);
    });
    
    // Capture network errors
    page.on('response', (response) => {
      if (response.status() >= 400) {
        testResults.networkErrors.push({
          url: response.url(),
          status: response.status()
        });
        console.log(`❌ Network Error: ${response.status()} - ${response.url()}`);
      }
    });
    
    // Test 1: Navigate to signin page
    console.log('\n📋 Test 1: Navigate to signin page');
    await page.goto(`${baseUrl}/auth/signin`, { waitUntil: 'networkidle2' });
    testResults.navigationHistory.push(page.url());
    
    if (page.url().includes('/auth/signin')) {
      testResults.signinPageLoads = true;
      console.log('✅ Signin page loads successfully');
    } else {
      console.log(`❌ Unexpected redirect to: ${page.url()}`);
    }
    
    // Test 2: Check form elements
    console.log('\n📋 Test 2: Check form elements');
    try {
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
      await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 5000 });
      await page.waitForSelector('button[type="submit"], button:contains("Sign"), button:contains("Login")', { timeout: 5000 });
      testResults.formElementsVisible = true;
      console.log('✅ All form elements are visible');
    } catch (error) {
      console.log('❌ Form elements not found or not visible');
    }
    
    // Test 3: Fill and submit login form
    console.log('\n📋 Test 3: Fill and submit login form');
    await page.type('input[type="email"], input[name="email"]', credentials.email);
    await page.type('input[type="password"], input[name="password"]', credentials.password);
    
    console.log('✅ Credentials filled');
    
    // Click submit and wait for navigation
    const submitButton = await page.$('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
    if (submitButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
        submitButton.click()
      ]);
      
      testResults.navigationHistory.push(page.url());
      testResults.loginSubmissionWorks = true;
      console.log('✅ Login form submitted successfully');
    } else {
      console.log('❌ Submit button not found');
    }
    
    // Test 4: Check final destination
    console.log('\n📋 Test 4: Check login result');
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('/dashboard')) {
      testResults.redirectsToCorrectPage = true;
      console.log('✅ Successfully redirected to dashboard');
    } else if (finalUrl.includes('/auth/signin')) {
      console.log('❌ Still on signin page - login may have failed');
      
      // Check for error messages
      const errorElements = await page.$$('.error, .alert, [role="alert"]');
      if (errorElements.length > 0) {
        for (let element of errorElements) {
          const text = await element.textContent();
          console.log(`❌ Error message: ${text}`);
        }
      }
    } else {
      console.log(`❌ Unexpected redirect to: ${finalUrl}`);
    }
    
    // Test 5: Check for redirect loops
    console.log('\n📋 Test 5: Check for redirect loops');
    const urlCounts = testResults.navigationHistory.reduce((acc, url) => {
      acc[url] = (acc[url] || 0) + 1;
      return acc;
    }, {});
    
    const hasLoops = Object.values(urlCounts).some(count => count > 2);
    if (hasLoops) {
      testResults.noRedirectLoops = false;
      console.log('❌ Redirect loops detected:');
      Object.entries(urlCounts).forEach(([url, count]) => {
        if (count > 2) {
          console.log(`  - ${url} visited ${count} times`);
        }
      });
    } else {
      console.log('✅ No redirect loops detected');
    }
    
    // Test 6: Test session persistence (if login was successful)
    if (testResults.redirectsToCorrectPage) {
      console.log('\n📋 Test 6: Test session persistence');
      
      // Navigate away and back
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2' });
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
      
      if (page.url().includes('/dashboard')) {
        testResults.sessionPersists = true;
        console.log('✅ Session persists - can access dashboard without re-login');
      } else if (page.url().includes('/auth/signin')) {
        console.log('❌ Session lost - redirected back to signin');
      } else {
        console.log(`❌ Unexpected redirect to: ${page.url()}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Puppeteer test failed: ${error.message}`);
    return false;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
  
  return true;
}

async function testWithCurl() {
  console.log('\n🔍 Testing with cURL (fallback method)...');
  
  try {
    // Test signin page
    console.log('\n📋 Test 1: Check signin page with cURL');
    const response = await fetch(`${baseUrl}/auth/signin`);
    if (response.ok) {
      const html = await response.text();
      console.log('✅ Signin page responds with 200 OK');
      
      // Check for form elements in HTML
      if (html.includes('type="email"') && html.includes('type="password"')) {
        console.log('✅ Form elements found in HTML');
      } else {
        console.log('❌ Form elements not found in HTML');
      }
    } else {
      console.log(`❌ Signin page returned ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ cURL test failed: ${error.message}`);
  }
}

async function runTests() {
  const puppeteerWorked = await testWithPuppeteer();
  
  if (!puppeteerWorked) {
    await testWithCurl();
  }
  
  // Generate final report
  console.log('\n=== FINAL TEST RESULTS ===');
  console.log(`✅ Signin page loads: ${testResults.signinPageLoads}`);
  console.log(`✅ Form elements visible: ${testResults.formElementsVisible}`);
  console.log(`✅ Login submission works: ${testResults.loginSubmissionWorks}`);
  console.log(`✅ Redirects to correct page: ${testResults.redirectsToCorrectPage}`);
  console.log(`✅ Session persists: ${testResults.sessionPersists}`);
  console.log(`✅ No redirect loops: ${testResults.noRedirectLoops}`);
  console.log(`❌ Console errors: ${testResults.consoleErrors.length}`);
  console.log(`❌ Network errors: ${testResults.networkErrors.length}`);
  
  console.log('\n=== NAVIGATION HISTORY ===');
  testResults.navigationHistory.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
  });
  
  if (testResults.consoleErrors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    testResults.consoleErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  if (testResults.networkErrors.length > 0) {
    console.log('\n=== NETWORK ERRORS ===');
    testResults.networkErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.status} - ${error.url}`);
    });
  }
  
  // Final assessment
  console.log('\n=== ASSESSMENT ===');
  if (testResults.redirectsToCorrectPage && testResults.noRedirectLoops) {
    console.log('🎉 LOGIN FIX VERIFIED: The NEXTAUTH_URL fix appears to be working!');
    console.log('✅ Users can successfully log in and access the dashboard');
  } else if (!testResults.noRedirectLoops) {
    console.log('❌ LOGIN LOOP STILL EXISTS: The fix did not resolve the redirect loop issue');
  } else if (!testResults.redirectsToCorrectPage) {
    console.log('❌ LOGIN FAILS: Users cannot successfully authenticate');
  } else {
    console.log('⚠️  PARTIAL SUCCESS: Some issues remain but basic login may work');
  }
}

// Check if puppeteer is available
async function checkPuppeteer() {
  try {
    require('puppeteer');
    return true;
  } catch (error) {
    console.log('⚠️  Puppeteer not available, will use fallback methods');
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testResults };