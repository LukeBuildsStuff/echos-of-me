const axios = require('axios');

async function testDirectLogin() {
  try {
    console.log('Testing direct credentials login...\n');

    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await axios.get('http://localhost:3001/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('✓ CSRF Token:', csrfToken.substring(0, 20) + '...');

    // Step 2: Test credentials provider directly
    console.log('\n2. Testing credentials provider...');
    
    const loginData = new URLSearchParams({
      email: 'test@example.com',
      password: 'testpassword123',
      csrfToken: csrfToken,
      callbackUrl: '/dashboard',
      json: 'true'
    });

    const loginResponse = await axios.post(
      'http://localhost:3001/api/auth/callback/credentials',
      loginData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects as success
        }
      }
    );

    console.log('Login Response Status:', loginResponse.status);
    console.log('Location Header:', loginResponse.headers.location);
    console.log('Set-Cookie Headers:', loginResponse.headers['set-cookie']);

    // Step 3: Check if session was created
    if (loginResponse.headers['set-cookie']) {
      console.log('\n3. Checking session...');
      
      const cookies = loginResponse.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
      
      const sessionResponse = await axios.get('http://localhost:3001/api/auth/session', {
        headers: {
          'Cookie': cookies
        }
      });
      
      console.log('Session Response:', sessionResponse.data);
      
      if (sessionResponse.data.user) {
        console.log('✓ Login successful! User:', sessionResponse.data.user);
      } else {
        console.log('❌ No session found');
      }
    }

  } catch (error) {
    console.error('❌ Direct login test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testDirectLogin();