const axios = require('axios');

const BASE_URL = 'https://echosofme.io';
const credentials = {
  email: 'lukemoeller@yahoo.com',
  password: 'password123'
};

async function testLoginFlow() {
  try {
    console.log('🧪 Testing Complete Login Flow...\n');
    
    // Step 1: Get CSRF token
    console.log('1️⃣ Getting CSRF token...');
    const csrfResponse = await axios.get(`${BASE_URL}/api/auth/csrf`);
    const csrfToken = csrfResponse.data.csrfToken;
    console.log(`   ✅ CSRF Token: ${csrfToken.substring(0, 20)}...`);
    
    // Step 2: Sign in with credentials
    console.log('\n2️⃣ Attempting sign in...');
    const signInResponse = await axios.post(
      `${BASE_URL}/api/auth/signin`,
      new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        csrfToken: csrfToken,
        callbackUrl: `${BASE_URL}/dashboard`
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0,
        validateStatus: () => true, // Accept all status codes
      }
    );
    
    console.log(`   📊 Sign in response status: ${signInResponse.status}`);
    console.log(`   📍 Redirect location: ${signInResponse.headers.location || 'None'}`);
    
    // Step 3: Try alternative approach - direct credentials callback
    console.log('\n3️⃣ Testing credentials callback directly...');
    const callbackResponse = await axios.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      new URLSearchParams({
        email: credentials.email,
        password: credentials.password,
        csrfToken: csrfToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );
    
    console.log(`   📊 Callback response status: ${callbackResponse.status}`);
    console.log(`   📍 Callback redirect: ${callbackResponse.headers.location || 'None'}`);
    
    // Check if we got a session cookie
    const cookies = callbackResponse.headers['set-cookie'] || [];
    const sessionCookie = cookies.find(cookie => cookie.includes('next-auth.session-token'));
    
    if (sessionCookie) {
      console.log(`   🍪 Session cookie found: ${sessionCookie.substring(0, 50)}...`);
    } else {
      console.log('   ❌ No session cookie found');
    }
    
    // Step 4: Try to access the session
    console.log('\n4️⃣ Testing session endpoint...');
    const sessionResponse = await axios.get(`${BASE_URL}/api/auth/session`, {
      headers: {
        Cookie: cookies.join('; ')
      },
      validateStatus: () => true,
    });
    
    console.log(`   📊 Session status: ${sessionResponse.status}`);
    console.log(`   📄 Session data:`, sessionResponse.data);
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   User: ${credentials.email}`);
    console.log(`   CSRF: ${csrfToken ? '✅' : '❌'}`);
    console.log(`   Callback Status: ${callbackResponse.status}`);
    console.log(`   Session Cookie: ${sessionCookie ? '✅' : '❌'}`);
    console.log(`   Session Valid: ${sessionResponse.data?.user ? '✅' : '❌'}`);
    
    if (sessionResponse.data?.user) {
      console.log(`   Logged in as: ${sessionResponse.data.user.name || sessionResponse.data.user.email}`);
      console.log(`   Admin: ${sessionResponse.data.user.isAdmin ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testLoginFlow();