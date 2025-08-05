const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Disable SSL verification for localhost testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const request = http.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data,
          response
        });
      });
    });
    
    request.on('error', reject);
    
    if (postData) {
      request.write(postData);
    }
    
    request.end();
  });
}

async function testLoginAPIFlow() {
  console.log('🚀 Testing login API flow...');
  const baseUrl = 'http://localhost:3000';
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    requests: []
  };

  try {
    // Test 1: Check if signin page loads
    console.log('\n📋 Test 1: Loading signin page...');
    const signinPageResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/auth/signin',
      method: 'GET',
      headers: {
        'User-Agent': 'Login-Flow-Test'
      }
    });
    
    results.requests.push({
      url: '/auth/signin',
      method: 'GET',
      status: signinPageResult.statusCode,
      timestamp: new Date().toISOString()
    });
    
    const signinPageTest = {
      name: 'Load signin page',
      status: signinPageResult.statusCode === 200 ? 'PASS' : 'FAIL',
      details: `HTTP ${signinPageResult.statusCode}`,
      timestamp: new Date().toISOString()
    };
    results.tests.push(signinPageTest);
    console.log(`${signinPageTest.status === 'PASS' ? '✅' : '❌'} Signin page: ${signinPageTest.details}`);

    // Test 2: Check NextAuth.js configuration
    console.log('\n📋 Test 2: Checking NextAuth configuration...');
    const nextAuthConfigResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/providers',
      method: 'GET',
      headers: {
        'User-Agent': 'Login-Flow-Test'
      }
    });
    
    results.requests.push({
      url: '/api/auth/providers',
      method: 'GET',
      status: nextAuthConfigResult.statusCode,
      timestamp: new Date().toISOString()
    });
    
    const nextAuthTest = {
      name: 'NextAuth providers endpoint',
      status: nextAuthConfigResult.statusCode === 200 ? 'PASS' : 'FAIL',
      details: `HTTP ${nextAuthConfigResult.statusCode}`,
      timestamp: new Date().toISOString()
    };
    results.tests.push(nextAuthTest);
    console.log(`${nextAuthTest.status === 'PASS' ? '✅' : '❌'} NextAuth config: ${nextAuthTest.details}`);

    // Test 3: Check CSRF token endpoint
    console.log('\n📋 Test 3: Getting CSRF token...');
    const csrfResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/csrf',
      method: 'GET',
      headers: {
        'User-Agent': 'Login-Flow-Test'
      }
    });
    
    results.requests.push({
      url: '/api/auth/csrf',
      method: 'GET',
      status: csrfResult.statusCode,
      timestamp: new Date().toISOString()
    });
    
    let csrfToken = null;
    if (csrfResult.statusCode === 200) {
      try {
        const csrfData = JSON.parse(csrfResult.body);
        csrfToken = csrfData.csrfToken;
        console.log(`✅ CSRF token obtained: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'null'}`);
      } catch (e) {
        console.log('❌ Failed to parse CSRF response');
      }
    }
    
    const csrfTest = {
      name: 'CSRF token retrieval',
      status: csrfToken ? 'PASS' : 'FAIL',
      details: csrfToken ? 'CSRF token obtained' : 'Failed to get CSRF token',
      timestamp: new Date().toISOString()
    };
    results.tests.push(csrfTest);

    // Test 4: Attempt login with credentials
    if (csrfToken) {
      console.log('\n📋 Test 4: Attempting login with credentials...');
      
      const loginData = querystring.stringify({
        email: 'lukemoeller@yahoo.com',
        password: 'password123',
        csrfToken: csrfToken,
        callbackUrl: 'http://localhost:3000/dashboard',
        json: 'true'
      });
      
      const loginResult = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/callback/credentials',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(loginData),
          'User-Agent': 'Login-Flow-Test'
        }
      }, loginData);
      
      results.requests.push({
        url: '/api/auth/callback/credentials',
        method: 'POST',
        status: loginResult.statusCode,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🔗 Login response status: ${loginResult.statusCode}`);
      console.log(`🔗 Login response headers:`, loginResult.headers);
      
      // Check for redirect or success indicators
      const isRedirect = loginResult.statusCode >= 300 && loginResult.statusCode < 400;
      const hasLocation = loginResult.headers.location;
      
      const loginTest = {
        name: 'Credentials authentication',
        status: 'UNKNOWN',
        details: `HTTP ${loginResult.statusCode}`,
        timestamp: new Date().toISOString()
      };
      
      if (isRedirect && hasLocation) {
        console.log(`🔄 Redirect to: ${loginResult.headers.location}`);
        if (loginResult.headers.location.includes('dashboard')) {
          loginTest.status = 'PASS';
          loginTest.details += ' - Redirected to dashboard';
        } else if (loginResult.headers.location.includes('signin') || loginResult.headers.location.includes('error')) {
          loginTest.status = 'FAIL';
          loginTest.details += ' - Redirected back to signin (auth failed)';
        } else {
          loginTest.details += ` - Redirected to: ${loginResult.headers.location}`;
        }
      } else if (loginResult.statusCode === 200) {
        // Check response body for success/error indicators
        try {
          const loginResponseData = JSON.parse(loginResult.body);
          if (loginResponseData.url && loginResponseData.url.includes('dashboard')) {
            loginTest.status = 'PASS';
            loginTest.details += ' - Success response with dashboard URL';
          } else if (loginResponseData.error) {
            loginTest.status = 'FAIL';
            loginTest.details += ` - Error: ${loginResponseData.error}`;
          }
        } catch (e) {
          loginTest.details += ' - Non-JSON response';
        }
      } else {
        loginTest.status = 'FAIL';
        loginTest.details += ' - Unexpected response';
      }
      
      results.tests.push(loginTest);
      console.log(`${loginTest.status === 'PASS' ? '✅' : loginTest.status === 'FAIL' ? '❌' : '⚠️'} Login attempt: ${loginTest.details}`);
    }

    // Test 5: Check session endpoint
    console.log('\n📋 Test 5: Checking session endpoint...');
    const sessionResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/session',
      method: 'GET',
      headers: {
        'User-Agent': 'Login-Flow-Test'
      }
    });
    
    results.requests.push({
      url: '/api/auth/session',
      method: 'GET',
      status: sessionResult.statusCode,
      timestamp: new Date().toISOString()
    });
    
    let hasActiveSession = false;
    if (sessionResult.statusCode === 200) {
      try {
        const sessionData = JSON.parse(sessionResult.body);
        hasActiveSession = !!sessionData.user;
        console.log(`📊 Session data:`, sessionData);
      } catch (e) {
        console.log('❌ Failed to parse session response');
      }
    }
    
    const sessionTest = {
      name: 'Session check',
      status: hasActiveSession ? 'PASS' : 'FAIL',
      details: hasActiveSession ? 'Active session found' : 'No active session',
      timestamp: new Date().toISOString()
    };
    results.tests.push(sessionTest);
    console.log(`${sessionTest.status === 'PASS' ? '✅' : '❌'} Session: ${sessionTest.details}`);

  } catch (error) {
    console.log('❌ Test execution error:', error.message);
    results.tests.push({
      name: 'Test execution',
      status: 'FAIL',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Save results
  require('fs').writeFileSync('login-api-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📊 Results saved to login-api-test-results.json');
  
  // Print summary
  console.log('\n=== API TEST SUMMARY ===');
  const passedTests = results.tests.filter(t => t.status === 'PASS').length;
  const failedTests = results.tests.filter(t => t.status === 'FAIL').length;
  const totalTests = results.tests.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${failedTests}/${totalTests}`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`   • ${test.name}: ${test.details}`);
    });
  }
  
  return results;
}

testLoginAPIFlow().catch(console.error);