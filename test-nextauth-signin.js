const axios = require('axios');

async function testNextAuthSignIn() {
  try {
    console.log('Testing NextAuth signIn flow with correct format...\n');

    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await axios.get('http://localhost:3001/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('✓ CSRF Token received');

    // Step 2: Call signIn API endpoint (not callback)
    console.log('\n2. Calling NextAuth signin endpoint...');
    
    const signinData = new URLSearchParams({
      email: 'test@example.com',
      password: 'testpassword123',
      csrfToken: csrfToken,
      callbackUrl: '/dashboard',
      redirect: 'false',
      json: 'true'
    });

    const signinResponse = await axios.post(
      'http://localhost:3001/api/auth/signin/credentials',
      signinData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      }
    );

    console.log('SignIn Response Status:', signinResponse.status);
    console.log('Response Data:', signinResponse.data);
    console.log('Set-Cookie Headers:', signinResponse.headers['set-cookie']);

    // Step 3: If we got a session token, check the session
    if (signinResponse.headers['set-cookie']) {
      console.log('\n3. Checking session with cookies...');
      
      const cookies = signinResponse.headers['set-cookie']
        .map(cookie => cookie.split(';')[0])
        .join('; ');
      
      console.log('Cookies to send:', cookies);
      
      const sessionResponse = await axios.get('http://localhost:3001/api/auth/session', {
        headers: {
          'Cookie': cookies
        }
      });
      
      console.log('Session Response:', sessionResponse.data);
      
      if (sessionResponse.data.user) {
        console.log('✅ Login successful! User:', sessionResponse.data.user);
      } else {
        console.log('❌ No session found');
      }
    }

  } catch (error) {
    console.error('❌ NextAuth signin test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testNextAuthSignIn();