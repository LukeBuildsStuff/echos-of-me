const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  email: 'lukemoeller@yahoo.com',
  password: 'testpassword123'
};

// Store session cookie
let sessionCookie = '';

// Test results
const testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  user: TEST_USER.email,
  tests: [],
  chatInteractions: [],
  errors: [],
  apiResponses: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
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
          body: data,
          url: `${options.protocol || 'http:'}//` + options.hostname + ':' + options.port + options.path
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

// Helper function to log test result
function logTest(name, status, message, details = {}) {
  const test = {
    name,
    status,
    message,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  testResults.tests.push(test);
  
  const statusIcon = {
    'passed': '✅',
    'failed': '❌',
    'warning': '⚠️',
    'partial': '🔶'
  }[status] || '❓';
  
  console.log(`${statusIcon} ${name}: ${message}`);
  if (details.error) console.log(`   Error: ${details.error}`);
  if (details.statusCode) console.log(`   Status: ${details.statusCode}`);
  
  return test;
}

// Extract cookies from response headers
function extractCookies(headers) {
  const cookies = headers['set-cookie'];
  if (!cookies) return '';
  
  return cookies.map(cookie => cookie.split(';')[0]).join('; ');
}

// Parse HTML for specific content
function parseHTML(html, searchTerms) {
  const results = {};
  searchTerms.forEach(term => {
    results[term] = html.toLowerCase().includes(term.toLowerCase());
  });
  return results;
}

async function testAIChatAPIFunctionality() {
  console.log('=== AI Chat API Functionality Test Suite ===');
  console.log(`Testing: ${BASE_URL}`);
  console.log(`User: ${TEST_USER.email}`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('============================================\n');

  try {
    // Test 1: Landing Page
    console.log('\n1. Testing Landing Page...');
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/',
        method: 'GET'
      });

      testResults.apiResponses.push({
        test: 'Landing Page',
        url: response.url,
        statusCode: response.statusCode,
        contentLength: response.body.length
      });

      if (response.statusCode === 200) {
        const content = parseHTML(response.body, ['Echoes of Me', 'Echos Of Me', 'Sign In', 'Login', 'Welcome']);
        const hasExpectedContent = Object.values(content).some(Boolean);
        
        if (hasExpectedContent) {
          logTest('Landing Page', 'passed', 'Landing page loaded with expected content', {
            statusCode: response.statusCode,
            contentFound: content
          });
        } else {
          logTest('Landing Page', 'warning', 'Page loaded but missing expected content', {
            statusCode: response.statusCode
          });
        }
      } else {
        logTest('Landing Page', 'failed', `Unexpected response code`, {
          statusCode: response.statusCode
        });
      }
    } catch (error) {
      logTest('Landing Page', 'failed', 'Failed to load landing page', { error: error.message });
    }

    // Test 2: Authentication Process
    console.log('\n2. Testing Authentication...');
    try {
      // Get signin page first
      const signinResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/auth/signin',
        method: 'GET'
      });

      if (signinResponse.statusCode === 200) {
        // Extract CSRF token
        const csrfMatch = signinResponse.body.match(/name="csrfToken" value="([^"]+)"/);
        const csrfToken = csrfMatch ? csrfMatch[1] : '';
        
        console.log(`   CSRF Token found: ${csrfToken ? 'Yes' : 'No'}`);

        // Extract cookies
        const initialCookies = extractCookies(signinResponse.headers);
        
        // Attempt authentication
        const authData = querystring.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
          csrfToken: csrfToken,
          callbackUrl: '/dashboard',
          json: 'true'
        });

        const authResponse = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/auth/callback/credentials',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(authData),
            'Cookie': initialCookies
          }
        }, authData);

        testResults.apiResponses.push({
          test: 'Authentication',
          url: authResponse.url,
          statusCode: authResponse.statusCode,
          hasSetCookie: !!authResponse.headers['set-cookie']
        });

        if (authResponse.headers['set-cookie']) {
          sessionCookie = extractCookies(authResponse.headers);
          if (initialCookies) {
            sessionCookie = initialCookies + '; ' + sessionCookie;
          }
          
          logTest('Authentication', 'passed', 'Authentication successful - session cookie received', {
            statusCode: authResponse.statusCode,
            hasCookie: true
          });
        } else if (authResponse.statusCode === 302 || authResponse.statusCode === 200) {
          // Check if response indicates success
          logTest('Authentication', 'partial', 'Auth response received but no session cookie', {
            statusCode: authResponse.statusCode
          });
        } else {
          logTest('Authentication', 'failed', 'Authentication failed', {
            statusCode: authResponse.statusCode
          });
        }
      } else {
        logTest('Authentication', 'failed', 'Could not access signin page', {
          statusCode: signinResponse.statusCode
        });
      }
    } catch (error) {
      logTest('Authentication', 'failed', 'Error during authentication', { error: error.message });
    }

    // Test 3: Dashboard Access
    console.log('\n3. Testing Dashboard Access...');
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/dashboard',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      });

      testResults.apiResponses.push({
        test: 'Dashboard Access',
        url: response.url,
        statusCode: response.statusCode,
        contentLength: response.body.length
      });

      if (response.statusCode === 200) {
        const content = parseHTML(response.body, ['Dashboard', 'AI Echo', 'Chat', 'Welcome', 'Logout']);
        
        logTest('Dashboard Access', 'passed', 'Dashboard accessible', {
          statusCode: response.statusCode,
          contentFound: content
        });
      } else if (response.statusCode === 302 || response.statusCode === 307) {
        logTest('Dashboard Access', 'warning', 'Redirected - may need to re-authenticate', {
          statusCode: response.statusCode,
          location: response.headers.location
        });
      } else {
        logTest('Dashboard Access', 'failed', 'Could not access dashboard', {
          statusCode: response.statusCode
        });
      }
    } catch (error) {
      logTest('Dashboard Access', 'failed', 'Error accessing dashboard', { error: error.message });
    }

    // Test 4: AI Echo Page Access
    console.log('\n4. Testing AI Echo Page Access...');
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/ai-echo',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      });

      testResults.apiResponses.push({
        test: 'AI Echo Page',
        url: response.url,
        statusCode: response.statusCode,
        contentLength: response.body.length
      });

      if (response.statusCode === 200) {
        const content = parseHTML(response.body, ['textarea', 'input', 'Send', 'Message', 'Chat', 'AI Echo']);
        const hasFormElements = content.textarea || content.input;
        
        if (hasFormElements) {
          logTest('AI Echo Page Access', 'passed', 'AI Echo page loaded with chat interface', {
            statusCode: response.statusCode,
            interfaceElements: content
          });
        } else {
          logTest('AI Echo Page Access', 'warning', 'Page loaded but chat interface not detected', {
            statusCode: response.statusCode,
            contentFound: content
          });
        }
      } else {
        logTest('AI Echo Page Access', 'failed', 'Could not access AI Echo page', {
          statusCode: response.statusCode
        });
      }
    } catch (error) {
      logTest('AI Echo Page Access', 'failed', 'Error accessing AI Echo page', { error: error.message });
    }

    // Test 5: AI Chat API Endpoints
    console.log('\n5. Testing AI Chat API Endpoints...');
    
    const testMessages = [
      "Hello, this is a test message. Can you respond?",
      "What is your name?",
      "Tell me about yourself",
      "What can you help me with?"
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n   Testing message ${i + 1}: "${message}"`);
      
      try {
        const chatData = JSON.stringify({
          message: message,
          userId: 'test-user',
          context: {
            familyMember: 'test'
          }
        });

        const response = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/ai-echo/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(chatData),
            'Cookie': sessionCookie
          }
        }, chatData);

        const chatInteraction = {
          messageNumber: i + 1,
          userMessage: message,
          statusCode: response.statusCode,
          responseLength: response.body.length,
          timestamp: new Date().toISOString()
        };

        testResults.apiResponses.push({
          test: `Chat Message ${i + 1}`,
          url: response.url,
          statusCode: response.statusCode,
          requestData: chatData,
          responseLength: response.body.length
        });

        if (response.statusCode === 200) {
          try {
            const responseData = JSON.parse(response.body);
            chatInteraction.responseData = responseData;
            chatInteraction.hasMessage = !!responseData.message;
            chatInteraction.messageLength = responseData.message ? responseData.message.length : 0;
            
            console.log(`   ✅ API Response: ${response.statusCode}`);
            if (responseData.message) {
              console.log(`   📝 Response: ${responseData.message.substring(0, 100)}${responseData.message.length > 100 ? '...' : ''}`);
            }
          } catch (parseError) {
            chatInteraction.parseError = parseError.message;
            console.log(`   ⚠️ API responded but response not JSON: ${response.body.substring(0, 100)}`);
          }
        } else if (response.statusCode === 401) {
          console.log(`   ❌ Unauthorized - authentication issue`);
        } else if (response.statusCode === 500 || response.statusCode === 503) {
          console.log(`   ⚠️ Server error - AI service may be unavailable`);
          console.log(`   Error details: ${response.body}`);
        } else {
          console.log(`   ❌ Unexpected status: ${response.statusCode}`);
        }

        testResults.chatInteractions.push(chatInteraction);
        
        // Wait between requests
        if (i < testMessages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        testResults.errors.push({
          type: 'chat_api_error',
          messageNumber: i + 1,
          message: message,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Evaluate chat API functionality
    const totalInteractions = testResults.chatInteractions.length;
    const successfulInteractions = testResults.chatInteractions.filter(i => i.statusCode === 200 && i.hasMessage).length;
    const partialInteractions = testResults.chatInteractions.filter(i => i.statusCode === 200 && !i.hasMessage).length;
    
    if (successfulInteractions > 0) {
      logTest('AI Chat API', 'passed', `${successfulInteractions}/${totalInteractions} API calls successful with responses`, {
        totalMessages: totalInteractions,
        successfulResponses: successfulInteractions,
        partialResponses: partialInteractions
      });
    } else if (partialInteractions > 0) {
      logTest('AI Chat API', 'warning', 'API responds but no message content received', {
        totalMessages: totalInteractions,
        partialResponses: partialInteractions
      });
    } else {
      logTest('AI Chat API', 'failed', 'AI Chat API not working');
    }

    // Test 6: Chat History API
    console.log('\n6. Testing Chat History API...');
    try {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/ai-echo/history',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      });

      testResults.apiResponses.push({
        test: 'Chat History',
        url: response.url,
        statusCode: response.statusCode,
        responseLength: response.body.length
      });

      if (response.statusCode === 200) {
        try {
          const history = JSON.parse(response.body);
          logTest('Chat History API', 'passed', 'Chat history API working', {
            statusCode: response.statusCode,
            isArray: Array.isArray(history),
            count: Array.isArray(history) ? history.length : 0
          });
        } catch (parseError) {
          logTest('Chat History API', 'partial', 'API responded but response not JSON', {
            statusCode: response.statusCode
          });
        }
      } else {
        logTest('Chat History API', 'failed', 'Chat history API not accessible', {
          statusCode: response.statusCode
        });
      }
    } catch (error) {
      logTest('Chat History API', 'failed', 'Error accessing chat history', { error: error.message });
    }

    // Test 7: Voice Synthesis API (if available)
    console.log('\n7. Testing Voice Synthesis API...');
    try {
      const voiceData = JSON.stringify({
        text: 'Hello, this is a test of the voice synthesis system.',
        voice: 'default',
        userId: 'test-user'
      });

      const response = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/voice/synthesize',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(voiceData),
          'Cookie': sessionCookie
        }
      }, voiceData);

      testResults.apiResponses.push({
        test: 'Voice Synthesis',
        url: response.url,
        statusCode: response.statusCode,
        contentType: response.headers['content-type']
      });

      if (response.statusCode === 200) {
        if (response.headers['content-type']?.includes('audio')) {
          logTest('Voice Synthesis API', 'passed', 'Voice synthesis API working', {
            statusCode: response.statusCode,
            contentType: response.headers['content-type']
          });
        } else {
          logTest('Voice Synthesis API', 'partial', 'API responded but not with audio', {
            statusCode: response.statusCode,
            contentType: response.headers['content-type']
          });
        }
      } else if (response.statusCode === 404) {
        logTest('Voice Synthesis API', 'warning', 'Voice synthesis API not implemented', {
          statusCode: response.statusCode
        });
      } else {
        logTest('Voice Synthesis API', 'failed', 'Voice synthesis API error', {
          statusCode: response.statusCode
        });
      }
    } catch (error) {
      logTest('Voice Synthesis API', 'warning', 'Voice synthesis API not available', { error: error.message });
    }

  } catch (error) {
    console.error('\n🔴 Critical test error:', error.message);
    testResults.errors.push({
      type: 'critical_error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Generate Summary
  console.log('\n============================================');
  console.log('TEST SUMMARY');
  console.log('============================================');
  
  testResults.summary.total = testResults.tests.length;
  testResults.summary.passed = testResults.tests.filter(t => t.status === 'passed').length;
  testResults.summary.failed = testResults.tests.filter(t => t.status === 'failed').length;
  testResults.summary.warnings = testResults.tests.filter(t => t.status === 'warning').length;
  testResults.summary.partial = testResults.tests.filter(t => t.status === 'partial').length;
  
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warnings}`);
  console.log(`🔶 Partial: ${testResults.summary.partial}`);
  
  console.log('\n============================================');
  console.log('AI CHAT FUNCTIONALITY ASSESSMENT');
  console.log('============================================');
  
  const chatTest = testResults.tests.find(t => t.name === 'AI Chat API');
  if (chatTest) {
    console.log(`Overall Status: ${chatTest.status === 'passed' ? '✅ WORKING' : chatTest.status === 'warning' ? '⚠️ PARTIAL' : '❌ NOT WORKING'}`);
    console.log(`Assessment: ${chatTest.message}`);
  }
  
  if (testResults.chatInteractions.length > 0) {
    console.log(`\n📊 Chat Interaction Results:`);
    testResults.chatInteractions.forEach((interaction, idx) => {
      const status = interaction.statusCode === 200 && interaction.hasMessage ? '✅' : 
                    interaction.statusCode === 200 ? '🔶' : '❌';
      console.log(`  ${idx + 1}. ${status} "${interaction.userMessage.substring(0, 50)}..."`);
      console.log(`     Status: ${interaction.statusCode}, Response: ${interaction.hasMessage ? 'Yes' : 'No'}`);
      if (interaction.messageLength) {
        console.log(`     Length: ${interaction.messageLength} characters`);
      }
    });
  }

  if (testResults.errors.length > 0) {
    console.log('\n⚠️ ERRORS AND ISSUES:');
    testResults.errors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. [${error.type}] ${error.message}`);
    });
  }

  console.log('\n🔗 API ENDPOINTS TESTED:');
  const uniqueUrls = [...new Set(testResults.apiResponses.map(r => r.url))];
  uniqueUrls.forEach(url => {
    const responses = testResults.apiResponses.filter(r => r.url === url);
    const statusCodes = responses.map(r => r.statusCode);
    console.log(`  ${url} - Status codes: [${statusCodes.join(', ')}]`);
  });

  console.log('\n📋 RECOMMENDATIONS:');
  
  const authTest = testResults.tests.find(t => t.name === 'Authentication');
  if (authTest?.status !== 'passed') {
    console.log('  🔐 Fix authentication flow - this is blocking other tests');
  }
  
  if (chatTest?.status === 'failed') {
    console.log('  🤖 AI Chat API is not working - check server logs for errors');
    console.log('  📝 Verify AI service configuration and API endpoints');
  } else if (chatTest?.status === 'warning') {
    console.log('  ⚠️  AI Chat API responds but may not be generating content');
    console.log('  🔍 Check AI model integration and training data');
  }
  
  if (testResults.chatInteractions.some(i => i.statusCode === 500)) {
    console.log('  🔧 Server errors detected - check application logs');
  }

  // Save detailed report
  const reportFile = require('path').join(__dirname, 'ai-chat-api-test-report.json');
  require('fs').writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportFile}`);
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testAIChatAPIFunctionality()
    .then(results => {
      console.log('\n🏁 Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testAIChatAPIFunctionality };