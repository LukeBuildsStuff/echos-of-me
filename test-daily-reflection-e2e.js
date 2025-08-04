const puppeteer = require('puppeteer');
const { Pool } = require('pg');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3000',
  testUser: {
    email: 'lukemoeller@yahoo.com',
    password: 'password123'
  },
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev'
  }
};

// Database connection
const pool = new Pool({
  connectionString: config.database.connectionString
});

// Test report structure
const testReport = {
  testName: 'Daily Reflection Submission End-to-End Test',
  testDate: new Date().toISOString(),
  testUser: config.testUser.email,
  results: {
    userFlow: [],
    formData: [],
    apiTesting: [],
    database: [],
    errorScenarios: []
  },
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    critical: []
  }
};

// Helper function to add test result
function addTestResult(category, test) {
  testReport.results[category].push(test);
  testReport.summary.totalTests++;
  if (test.status === 'PASS') {
    testReport.summary.passed++;
  } else {
    testReport.summary.failed++;
    if (test.severity === 'Critical') {
      testReport.summary.critical.push(test.name);
    }
  }
}

// Helper function to wait and check for elements
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

// Database helper functions
async function getUserId(email) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

async function getResponseCount(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT COUNT(*) FROM responses WHERE user_id = $1', [userId]);
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

async function getLatestResponse(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT r.*, q.question_text 
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [userId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function deleteTestResponses(userId) {
  const client = await pool.connect();
  try {
    // Delete test responses created in the last hour
    await client.query(`
      DELETE FROM responses 
      WHERE user_id = $1 
      AND created_at > NOW() - INTERVAL '1 hour'
      AND response_text LIKE '%TEST RESPONSE%'
    `, [userId]);
  } finally {
    client.release();
  }
}

// Main test function
async function runTests() {
  let browser;
  let userId;
  
  try {
    console.log('🚀 Starting Daily Reflection E2E Tests...\n');
    
    // Get user ID from database
    userId = await getUserId(config.testUser.email);
    if (!userId) {
      throw new Error('Test user not found in database');
    }
    console.log(`✅ Found test user ID: ${userId}`);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 50, // Slow down actions for visibility
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set up request interception for API monitoring
    const apiCalls = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
      request.continue();
    });
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // =================
    // 1. USER FLOW TEST
    // =================
    console.log('\n📱 Testing Complete User Flow...');
    
    // Navigate to login
    await page.goto(`${config.baseUrl}/auth/signin`);
    
    addTestResult('userFlow', {
      name: 'Navigate to Login Page',
      status: await waitForElement(page, 'input[name="email"]') ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: 'Login page loaded successfully'
    });
    
    // Perform login
    await page.type('input[name="email"]', config.testUser.email);
    await page.type('input[name="password"]', config.testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    addTestResult('userFlow', {
      name: 'User Authentication',
      status: page.url().includes('dashboard') ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: `Redirected to: ${page.url()}`
    });
    
    // Navigate to daily reflection
    await page.goto(`${config.baseUrl}/daily-question`);
    await page.waitForTimeout(2000); // Wait for page to fully load
    
    // Check if question loaded
    const questionLoaded = await waitForElement(page, 'textarea');
    addTestResult('userFlow', {
      name: 'Load Daily Question Page',
      status: questionLoaded ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: questionLoaded ? 'Question interface loaded' : 'Failed to load question interface'
    });
    
    // Check question text is displayed
    const questionText = await page.evaluate(() => {
      const questionContainer = document.querySelector('.bg-gradient-to-r.from-comfort-50\\/50');
      return questionContainer ? questionContainer.textContent : null;
    });
    
    addTestResult('userFlow', {
      name: 'Display Question Text',
      status: questionText && questionText.length > 20 ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Question text: ${questionText ? questionText.substring(0, 50) + '...' : 'Not found'}`
    });
    
    // =====================
    // 2. FORM DATA TESTING
    // =====================
    console.log('\n📝 Testing Form Data Capture...');
    
    // Test with short response
    const shortResponse = 'TEST RESPONSE: Short answer';
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.value = '';
    });
    await page.type('textarea', shortResponse);
    
    const capturedShortText = await page.$eval('textarea', el => el.value);
    addTestResult('formData', {
      name: 'Capture Short Response',
      status: capturedShortText === shortResponse ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Input: "${shortResponse}", Captured: "${capturedShortText}"`
    });
    
    // Test with medium response
    const mediumResponse = 'TEST RESPONSE: This is a medium-length response that contains multiple sentences. It should demonstrate that the form can handle reasonable amounts of text without any issues. The response quality indicator should show this as a good response.';
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.value = '';
    });
    await page.type('textarea', mediumResponse);
    
    const capturedMediumText = await page.$eval('textarea', el => el.value);
    addTestResult('formData', {
      name: 'Capture Medium Response',
      status: capturedMediumText === mediumResponse ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Captured ${capturedMediumText.length} characters`
    });
    
    // Check word count display
    const wordCountText = await page.evaluate(() => {
      const wordCountEl = document.querySelector('.text-xs.text-peace-500');
      return wordCountEl ? wordCountEl.textContent : null;
    });
    
    addTestResult('formData', {
      name: 'Word Count Display',
      status: wordCountText && wordCountText.includes('words') ? 'PASS' : 'FAIL',
      severity: 'Medium',
      details: wordCountText || 'Word count not displayed'
    });
    
    // Check response quality indicator
    const qualityIndicatorPresent = await waitForElement(page, '[class*="ResponseQualityIndicator"]', 1000);
    addTestResult('formData', {
      name: 'Response Quality Indicator',
      status: qualityIndicatorPresent ? 'PASS' : 'FAIL',
      severity: 'Low',
      details: 'Quality feedback component presence'
    });
    
    // ==================
    // 3. API TESTING
    // ==================
    console.log('\n🔌 Testing API Integration...');
    
    // Clear API calls array
    apiCalls.length = 0;
    
    // Get initial response count
    const initialResponseCount = await getResponseCount(userId);
    
    // Submit the form
    const submitButton = await page.$('button:has-text("Save & Continue")');
    if (submitButton) {
      await submitButton.click();
      await page.waitForTimeout(3000); // Wait for submission
    }
    
    // Check API calls
    const responsesApiCall = apiCalls.find(call => 
      call.url.includes('/api/responses') && call.method === 'POST'
    );
    
    addTestResult('apiTesting', {
      name: 'API Endpoint Called',
      status: responsesApiCall ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: responsesApiCall ? 'POST /api/responses called' : 'API call not detected'
    });
    
    if (responsesApiCall && responsesApiCall.postData) {
      const payload = JSON.parse(responsesApiCall.postData);
      
      addTestResult('apiTesting', {
        name: 'Request Payload Format',
        status: payload.questionId && payload.responseText ? 'PASS' : 'FAIL',
        severity: 'Critical',
        details: `Payload keys: ${Object.keys(payload).join(', ')}`
      });
      
      addTestResult('apiTesting', {
        name: 'Response Text in Payload',
        status: payload.responseText === mediumResponse ? 'PASS' : 'FAIL',
        severity: 'High',
        details: `Text matches: ${payload.responseText === mediumResponse}`
      });
    }
    
    // Check authentication headers
    if (responsesApiCall) {
      const hasAuthHeaders = responsesApiCall.headers.cookie && 
                           responsesApiCall.headers.cookie.includes('next-auth');
      
      addTestResult('apiTesting', {
        name: 'Authentication Headers',
        status: hasAuthHeaders ? 'PASS' : 'FAIL',
        severity: 'Critical',
        details: hasAuthHeaders ? 'NextAuth session cookie present' : 'No auth headers found'
      });
    }
    
    // ======================
    // 4. DATABASE TESTING
    // ======================
    console.log('\n💾 Testing Database Storage...');
    
    // Check if response count increased
    const newResponseCount = await getResponseCount(userId);
    addTestResult('database', {
      name: 'Response Saved to Database',
      status: newResponseCount > initialResponseCount ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: `Initial: ${initialResponseCount}, New: ${newResponseCount}`
    });
    
    // Get the latest response
    const latestResponse = await getLatestResponse(userId);
    if (latestResponse) {
      addTestResult('database', {
        name: 'Response Text Stored Correctly',
        status: latestResponse.response_text === mediumResponse ? 'PASS' : 'FAIL',
        severity: 'Critical',
        details: `Stored text matches: ${latestResponse.response_text === mediumResponse}`
      });
      
      addTestResult('database', {
        name: 'User ID Association',
        status: latestResponse.user_id === userId ? 'PASS' : 'FAIL',
        severity: 'Critical',
        details: `User ID: ${latestResponse.user_id}`
      });
      
      addTestResult('database', {
        name: 'Question ID Association',
        status: latestResponse.question_id ? 'PASS' : 'FAIL',
        severity: 'Critical',
        details: `Question ID: ${latestResponse.question_id}, Text: ${latestResponse.question_text?.substring(0, 50)}...`
      });
      
      addTestResult('database', {
        name: 'Word Count Stored',
        status: latestResponse.word_count > 0 ? 'PASS' : 'FAIL',
        severity: 'Medium',
        details: `Word count: ${latestResponse.word_count}`
      });
      
      addTestResult('database', {
        name: 'Timestamps Set',
        status: latestResponse.created_at && latestResponse.updated_at ? 'PASS' : 'FAIL',
        severity: 'Medium',
        details: `Created: ${latestResponse.created_at}`
      });
    }
    
    // =======================
    // 5. ERROR SCENARIOS
    // =======================
    console.log('\n⚠️ Testing Error Scenarios...');
    
    // Test very short response
    await page.goto(`${config.baseUrl}/daily-question`);
    await page.waitForTimeout(2000);
    
    const veryShortResponse = 'Hi';
    await page.type('textarea', veryShortResponse);
    
    // Check if button is enabled with short response
    const buttonEnabledShort = await page.evaluate(() => {
      const button = document.querySelector('button:has-text("Save")');
      return button && !button.disabled;
    });
    
    addTestResult('errorScenarios', {
      name: 'Very Short Response Handling',
      status: buttonEnabledShort ? 'PASS' : 'FAIL',
      severity: 'Medium',
      details: 'Button state with minimal text'
    });
    
    // Test empty response
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.value = '';
    });
    
    const buttonEnabledEmpty = await page.evaluate(() => {
      const button = document.querySelector('button:has-text("Save")');
      return button && !button.disabled;
    });
    
    addTestResult('errorScenarios', {
      name: 'Empty Response Prevention',
      status: !buttonEnabledEmpty ? 'PASS' : 'FAIL',
      severity: 'High',
      details: 'Submit button disabled for empty response'
    });
    
    // Test very long response (1000+ words)
    const longResponse = 'TEST RESPONSE: ' + 'This is a very long response. '.repeat(200);
    await page.evaluate((text) => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.value = text;
    }, longResponse);
    
    const capturedLongText = await page.$eval('textarea', el => el.value);
    addTestResult('errorScenarios', {
      name: 'Very Long Response Handling',
      status: capturedLongText.length === longResponse.length ? 'PASS' : 'FAIL',
      severity: 'Medium',
      details: `Captured ${capturedLongText.length} characters`
    });
    
    // Test network error simulation (if possible)
    // This would require more sophisticated testing setup
    
    // Clean up test data
    await deleteTestResponses(userId);
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
    addTestResult('userFlow', {
      name: 'Test Execution',
      status: 'FAIL',
      severity: 'Critical',
      details: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
    await pool.end();
  }
  
  // Generate test report
  generateReport();
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\nTest Name: ${testReport.testName}`);
  console.log(`Test Date: ${testReport.testDate}`);
  console.log(`Test User: ${testReport.testUser}`);
  
  console.log('\n📈 Overall Results:');
  console.log(`Total Tests: ${testReport.summary.totalTests}`);
  console.log(`✅ Passed: ${testReport.summary.passed}`);
  console.log(`❌ Failed: ${testReport.summary.failed}`);
  console.log(`Success Rate: ${((testReport.summary.passed / testReport.summary.totalTests) * 100).toFixed(1)}%`);
  
  if (testReport.summary.critical.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    testReport.summary.critical.forEach(test => {
      console.log(`  - ${test}`);
    });
  }
  
  // Detailed results by category
  Object.entries(testReport.results).forEach(([category, tests]) => {
    if (tests.length > 0) {
      console.log(`\n📋 ${category.toUpperCase()} Tests:`);
      tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${test.name}`);
        if (test.status === 'FAIL') {
          console.log(`     Severity: ${test.severity}`);
          console.log(`     Details: ${test.details}`);
        }
      });
    }
  });
  
  // Save report to file
  const fs = require('fs');
  const reportPath = './daily-reflection-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Overall assessment
  console.log('\n' + '='.repeat(80));
  console.log('🎯 OVERALL ASSESSMENT:');
  
  if (testReport.summary.failed === 0) {
    console.log('✅ All tests passed! The daily reflection submission flow is working correctly.');
  } else if (testReport.summary.critical.length === 0) {
    console.log('⚠️ Some non-critical issues found, but core functionality is working.');
  } else {
    console.log('❌ Critical issues detected! The submission flow has problems that need immediate attention.');
  }
  
  // Recommendations
  if (testReport.summary.failed > 0) {
    console.log('\n📝 RECOMMENDATIONS:');
    
    const failedTests = [];
    Object.values(testReport.results).forEach(tests => {
      tests.filter(t => t.status === 'FAIL').forEach(t => failedTests.push(t));
    });
    
    const criticalFails = failedTests.filter(t => t.severity === 'Critical');
    const highFails = failedTests.filter(t => t.severity === 'High');
    
    if (criticalFails.length > 0) {
      console.log('\n1. Fix Critical Issues First:');
      criticalFails.forEach(test => {
        console.log(`   - ${test.name}: ${test.details}`);
      });
    }
    
    if (highFails.length > 0) {
      console.log('\n2. Address High Priority Issues:');
      highFails.forEach(test => {
        console.log(`   - ${test.name}: ${test.details}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run the tests
runTests().catch(console.error);