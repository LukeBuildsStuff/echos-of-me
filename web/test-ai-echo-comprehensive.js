const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3004';
const TEST_USER = {
  email: 'luke.moeller@yahoo.com',
  password: 'testpassword123'
};

// Store session cookie
let sessionCookie = '';

// Test results
const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  errors: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Helper function to make requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.hostname.startsWith('https') ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test functions
async function testLandingPage() {
  console.log('\n1. Testing Landing Page...');
  const test = { name: 'Landing Page', status: 'running' };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/',
      method: 'GET'
    });

    if (response.statusCode === 200 && response.body.includes('Echos Of Me')) {
      test.status = 'passed';
      test.message = 'Landing page loaded successfully';
    } else {
      test.status = 'failed';
      test.message = `Unexpected response: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
}

async function testAuthentication() {
  console.log('\n2. Testing Authentication...');
  const test = { name: 'Authentication', status: 'running' };

  try {
    // First get CSRF token
    const signinResponse = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/auth/signin',
      method: 'GET'
    });

    // Extract CSRF token
    const csrfMatch = signinResponse.body.match(/name="csrfToken" value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    // Attempt authentication
    const authData = new URLSearchParams({
      email: TEST_USER.email,
      password: TEST_USER.password,
      csrfToken: csrfToken,
      callbackUrl: '/dashboard',
      json: 'true'
    }).toString();

    const authResponse = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': signinResponse.headers['set-cookie'] ? signinResponse.headers['set-cookie'].join('; ') : ''
      }
    }, authData);

    if (authResponse.headers['set-cookie']) {
      sessionCookie = authResponse.headers['set-cookie'].join('; ');
      test.status = 'passed';
      test.message = 'Authentication successful';
    } else {
      test.status = 'failed';
      test.message = 'No session cookie received';
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
}

async function testDashboardAccess() {
  console.log('\n3. Testing Dashboard Access...');
  const test = { name: 'Dashboard Access', status: 'running' };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/dashboard',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    if (response.statusCode === 200) {
      test.status = 'passed';
      test.message = 'Dashboard accessible';
      
      // Check for AI Echo button
      if (response.body.includes('AI Echo')) {
        test.aiEchoPresent = true;
      }
    } else if (response.statusCode === 302 || response.statusCode === 307) {
      test.status = 'failed';
      test.message = 'Redirected - authentication may have failed';
    } else {
      test.status = 'failed';
      test.message = `Unexpected status: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  if (test.aiEchoPresent) console.log('   AI Echo button: Present');
}

async function testAIEchoPage() {
  console.log('\n4. Testing AI Echo Page...');
  const test = { name: 'AI Echo Page Load', status: 'running', features: {} };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/ai-echo',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    if (response.statusCode === 200) {
      test.status = 'passed';
      test.message = 'AI Echo page loaded';
      
      // Check for essential elements
      test.features.chatInterface = response.body.includes('textarea') || response.body.includes('input');
      test.features.sendButton = response.body.includes('Send') || response.body.includes('Submit');
      test.features.messageArea = response.body.includes('message') || response.body.includes('chat');
      test.features.voiceFeatures = response.body.includes('voice') || response.body.includes('audio');
      
      // Check for JavaScript errors
      test.features.jsErrors = response.body.includes('error') && response.body.includes('Error');
    } else {
      test.status = 'failed';
      test.message = `Unexpected status: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  if (test.features) {
    console.log('   Features detected:');
    Object.entries(test.features).forEach(([key, value]) => {
      console.log(`     - ${key}: ${value ? 'Yes' : 'No'}`);
    });
  }
}

async function testAIEchoChat() {
  console.log('\n5. Testing AI Echo Chat API...');
  const test = { name: 'AI Echo Chat Messaging', status: 'running' };

  try {
    const chatData = JSON.stringify({
      message: 'Hello, this is a test message. Can you respond?',
      userId: 'test-user',
      context: {
        familyMember: 'test'
      }
    });

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/api/ai-echo/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    }, chatData);

    test.apiResponse = {
      statusCode: response.statusCode,
      hasBody: response.body.length > 0
    };

    if (response.statusCode === 200) {
      try {
        const responseData = JSON.parse(response.body);
        test.status = 'passed';
        test.message = 'Chat API responding';
        test.responseData = {
          hasMessage: !!responseData.message,
          hasId: !!responseData.id,
          messageLength: responseData.message ? responseData.message.length : 0
        };
      } catch (parseError) {
        test.status = 'partial';
        test.message = 'API responded but response not JSON';
      }
    } else if (response.statusCode === 401) {
      test.status = 'failed';
      test.message = 'Unauthorized - authentication issue';
    } else if (response.statusCode === 500 || response.statusCode === 503) {
      test.status = 'warning';
      test.message = 'AI service may be unavailable';
      test.errorBody = response.body;
    } else {
      test.status = 'failed';
      test.message = `Unexpected status: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  if (test.apiResponse) console.log(`   API Response: ${JSON.stringify(test.apiResponse)}`);
  if (test.responseData) console.log(`   Response Data: ${JSON.stringify(test.responseData)}`);
}

async function testVoiceSynthesis() {
  console.log('\n6. Testing Voice Synthesis API...');
  const test = { name: 'Voice Synthesis', status: 'running' };

  try {
    const voiceData = JSON.stringify({
      text: 'Hello, this is a test of the voice synthesis system.',
      voice: 'default',
      userId: 'test-user'
    });

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/api/voice/synthesize',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    }, voiceData);

    test.apiResponse = {
      statusCode: response.statusCode,
      contentType: response.headers['content-type']
    };

    if (response.statusCode === 200) {
      if (response.headers['content-type']?.includes('audio')) {
        test.status = 'passed';
        test.message = 'Voice synthesis API working';
      } else {
        test.status = 'partial';
        test.message = 'API responded but not with audio';
      }
    } else if (response.statusCode === 503 || response.statusCode === 500) {
      test.status = 'warning';
      test.message = 'Voice service may be unavailable';
    } else {
      test.status = 'failed';
      test.message = `Unexpected status: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  if (test.apiResponse) console.log(`   API Response: ${JSON.stringify(test.apiResponse)}`);
}

async function testChatHistory() {
  console.log('\n7. Testing Chat History API...');
  const test = { name: 'Chat History', status: 'running' };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/api/ai-echo/history',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    if (response.statusCode === 200) {
      try {
        const history = JSON.parse(response.body);
        test.status = 'passed';
        test.message = 'Chat history API working';
        test.historyData = {
          isArray: Array.isArray(history),
          count: Array.isArray(history) ? history.length : 0
        };
      } catch (parseError) {
        test.status = 'partial';
        test.message = 'API responded but response not JSON';
      }
    } else {
      test.status = 'failed';
      test.message = `Unexpected status: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  if (test.historyData) console.log(`   History Data: ${JSON.stringify(test.historyData)}`);
}

async function testFamilyContext() {
  console.log('\n8. Testing Family Context Support...');
  const test = { name: 'Family Context', status: 'running' };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/ai-echo?family=daughter&name=Sarah',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    if (response.statusCode === 200) {
      test.status = 'passed';
      test.message = 'Family context page loads';
      test.contextPresent = response.body.includes('daughter') || response.body.includes('Sarah');
    } else {
      test.status = 'failed';
      test.message = `Unexpected status: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  console.log(`   Context visible: ${test.contextPresent ? 'Yes' : 'No'}`);
}

async function testMobileViewport() {
  console.log('\n9. Testing Mobile Viewport Configuration...');
  const test = { name: 'Mobile Viewport', status: 'running' };

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/ai-echo',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      }
    });

    if (response.statusCode === 200) {
      test.status = 'passed';
      test.message = 'Mobile page loads';
      test.viewportTag = response.body.includes('viewport');
      test.mobileOptimized = response.body.includes('width=device-width');
    } else {
      test.status = 'failed';
      test.message = `Unexpected status: ${response.statusCode}`;
    }
  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  console.log(`   Viewport tag present: ${test.viewportTag ? 'Yes' : 'No'}`);
  console.log(`   Mobile optimized: ${test.mobileOptimized ? 'Yes' : 'No'}`);
}

async function testErrorHandling() {
  console.log('\n10. Testing Error Handling...');
  const test = { name: 'Error Handling', status: 'running', scenarios: {} };

  try {
    // Test with invalid message
    const invalidData = JSON.stringify({
      message: '',  // Empty message
      userId: null
    });

    const response = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/api/ai-echo/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    }, invalidData);

    test.scenarios.emptyMessage = {
      statusCode: response.statusCode,
      handled: response.statusCode !== 500
    };

    // Test with malformed JSON
    const malformedResponse = await makeRequest({
      hostname: 'localhost',
      port: 3004,
      path: '/api/ai-echo/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    }, '{invalid json');

    test.scenarios.malformedJson = {
      statusCode: malformedResponse.statusCode,
      handled: malformedResponse.statusCode === 400
    };

    // Evaluate overall error handling
    const allHandled = Object.values(test.scenarios).every(s => s.handled);
    test.status = allHandled ? 'passed' : 'partial';
    test.message = allHandled ? 'Error handling working' : 'Some errors not properly handled';

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
  }

  testResults.tests.push(test);
  console.log(`   Status: ${test.status}`);
  if (test.message) console.log(`   Message: ${test.message}`);
  if (test.error) console.log(`   Error: ${test.error}`);
  if (test.scenarios) {
    console.log('   Error scenarios:');
    Object.entries(test.scenarios).forEach(([scenario, result]) => {
      console.log(`     - ${scenario}: ${result.handled ? 'Handled' : 'Not handled'} (${result.statusCode})`);
    });
  }
}

// Main test runner
async function runTests() {
  console.log('=== AI Echo Chat Comprehensive Test Suite ===');
  console.log(`Testing: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('============================================');

  try {
    await testLandingPage();
    await testAuthentication();
    
    if (sessionCookie) {
      await testDashboardAccess();
      await testAIEchoPage();
      await testAIEchoChat();
      await testVoiceSynthesis();
      await testChatHistory();
      await testFamilyContext();
      await testMobileViewport();
      await testErrorHandling();
    } else {
      console.log('\n⚠️  Skipping authenticated tests due to authentication failure');
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    testResults.errors.push(error.message);
  }

  // Calculate summary
  testResults.summary.total = testResults.tests.length;
  testResults.summary.passed = testResults.tests.filter(t => t.status === 'passed').length;
  testResults.summary.failed = testResults.tests.filter(t => t.status === 'failed').length;
  testResults.summary.partial = testResults.tests.filter(t => t.status === 'partial').length;
  testResults.summary.warning = testResults.tests.filter(t => t.status === 'warning').length;

  // Print summary
  console.log('\n============================================');
  console.log('TEST SUMMARY');
  console.log('============================================');
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warning}`);
  console.log(`🔶 Partial: ${testResults.summary.partial}`);
  console.log('\n============================================');

  // Key findings
  console.log('\nKEY FINDINGS:');
  console.log('============================================');
  
  const aiEchoTest = testResults.tests.find(t => t.name === 'AI Echo Page Load');
  if (aiEchoTest?.status === 'passed') {
    console.log('✅ AI Echo page is accessible');
    if (aiEchoTest.features) {
      console.log('   Features detected:');
      Object.entries(aiEchoTest.features).forEach(([key, value]) => {
        console.log(`   - ${key}: ${value ? '✓' : '✗'}`);
      });
    }
  }

  const chatTest = testResults.tests.find(t => t.name === 'AI Echo Chat Messaging');
  if (chatTest) {
    console.log(`\n${chatTest.status === 'passed' ? '✅' : '❌'} Chat API: ${chatTest.message}`);
  }

  const voiceTest = testResults.tests.find(t => t.name === 'Voice Synthesis');
  if (voiceTest) {
    console.log(`${voiceTest.status === 'passed' ? '✅' : '❌'} Voice Synthesis: ${voiceTest.message}`);
  }

  // Save detailed report
  const fs = require('fs');
  fs.writeFileSync('ai-echo-test-report.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Detailed report saved to: ai-echo-test-report.json');
}

// Run the tests
runTests();