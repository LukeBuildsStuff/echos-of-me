const axios = require('axios');

async function testRealLogin() {
  console.log('=== TESTING ACTUAL LOGIN FUNCTIONALITY ===');
  console.log('This will test if the login ACTUALLY works, not just database access\n');
  
  try {
    // Test 1: Check if signin page loads
    console.log('1. Testing signin page accessibility...');
    const signinResponse = await axios.get('http://localhost:3000/auth/signin');
    console.log(`✓ Signin page returns status: ${signinResponse.status}`);
    
    // Test 2: Get CSRF token
    console.log('\n2. Getting CSRF token...');
    const csrfResponse = await axios.get('http://localhost:3000/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('✓ CSRF token obtained:', csrfToken.substring(0, 20) + '...');
    
    // Test 3: Attempt login with credentials that agents claimed work
    console.log('\n3. Testing login with lukemoeller@yahoo.com / password123...');
    
    const loginData = new URLSearchParams({
      email: 'lukemoeller@yahoo.com',
      password: 'password123',
      csrfToken: csrfToken,
      callbackUrl: 'http://localhost:3000/dashboard'
    });
    
    const loginResponse = await axios.post(
      'http://localhost:3000/api/auth/callback/credentials',
      loginData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status < 500; // Accept redirects and other responses
        }
      }
    );
    
    console.log(`Login response status: ${loginResponse.status}`);
    console.log('Response headers:', Object.keys(loginResponse.headers));
    
    // Check for redirect loop indicators
    if (loginResponse.status === 302) {
      const location = loginResponse.headers.location;
      console.log(`Redirect location: ${location}`);
      
      if (location && location.includes('/auth/signin')) {
        console.log('❌ CRITICAL: Login redirects back to signin - LOGIN LOOP STILL EXISTS');
        console.log('❌ Agents FALSELY claimed this was fixed');
      } else if (location && location.includes('/dashboard')) {
        console.log('✓ Login redirects to dashboard - this suggests success');
      } else {
        console.log('⚠️  Unexpected redirect location');
      }
    } else if (loginResponse.status === 200) {
      console.log('⚠️  Login returned 200 instead of redirect - may indicate form error');
    }
    
    // Test 4: Check session after login attempt
    console.log('\n4. Checking session state...');
    const sessionResponse = await axios.get('http://localhost:3000/api/auth/session', {
      headers: {
        Cookie: loginResponse.headers['set-cookie'] ? loginResponse.headers['set-cookie'].join('; ') : ''
      }
    });
    
    console.log('Session response:', sessionResponse.data);
    
    if (sessionResponse.data && sessionResponse.data.user) {
      console.log('✓ User session exists - login may have worked');
    } else {
      console.log('❌ No user session - login FAILED');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to application - development server may not be running');
    } else {
      console.log('❌ Login test error:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
    }
  }
}

testRealLogin();