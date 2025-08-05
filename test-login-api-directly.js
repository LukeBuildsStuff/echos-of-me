const fetch = require('node-fetch');

console.log('=== TESTING LOGIN API DIRECTLY ===\n');

const baseUrl = 'http://localhost:3000';
const credentials = {
  email: 'lukemoeller@yahoo.com',
  password: 'password123'
};

async function testDirectLoginAPI() {
  try {
    console.log('🔐 Testing NextAuth credentials provider API directly...');
    
    // Step 1: Get CSRF token first (NextAuth requires this for security)
    console.log('\n📋 Step 1: Getting CSRF token');
    
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      }
    });
    
    if (!csrfResponse.ok) {
      console.log(`❌ Failed to get CSRF token: ${csrfResponse.status}`);
      return;
    }
    
    const csrfData = await csrfResponse.json();
    console.log(`✅ Got CSRF token: ${csrfData.csrfToken.substring(0, 20)}...`);
    
    // Step 2: Attempt login with proper CSRF token
    console.log('\n📋 Step 2: Attempting login with credentials and CSRF token');
    
    const loginData = new URLSearchParams({
      email: credentials.email,
      password: credentials.password,
      csrfToken: csrfData.csrfToken,
      callbackUrl: `${baseUrl}/dashboard`,
      json: 'true'
    });
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      },
      body: loginData.toString(),
      redirect: 'manual'
    });
    
    console.log(`Login response status: ${loginResponse.status} ${loginResponse.statusText}`);
    
    // Check response headers
    const locationHeader = loginResponse.headers.get('location');
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'] || [];
    
    console.log(`Location header: ${locationHeader}`);
    console.log(`Set-Cookie headers: ${setCookieHeaders.length} cookies set`);
    
    if (setCookieHeaders.length > 0) {
      console.log('Cookie details:');
      setCookieHeaders.forEach((cookie, index) => {
        const cookieName = cookie.split('=')[0];
        console.log(`  ${index + 1}. ${cookieName} (${cookie.length} chars)`);
      });
    }
    
    // Analyze the response
    if (loginResponse.status === 302 || loginResponse.status === 307) {
      if (locationHeader) {
        if (locationHeader.includes('/dashboard')) {
          console.log('🎉 SUCCESS: Login successful! Redirected to dashboard');
          console.log('✅ The NEXTAUTH_URL fix is working perfectly');
          console.log('✅ User credentials are valid');
          console.log('✅ Authentication flow is complete');
        } else if (locationHeader.includes('/auth/signin')) {
          console.log('❌ FAILED: Redirected back to signin page');
          console.log('🔍 This suggests login credentials failed');
          
          // Check if there's an error parameter in the redirect
          if (locationHeader.includes('error=')) {
            const urlObj = new URL(locationHeader);
            const error = urlObj.searchParams.get('error');
            console.log(`❌ NextAuth error: ${error}`);
          }
        } else {
          console.log(`⚠️  UNEXPECTED: Redirected to ${locationHeader}`);
        }
      } else {
        console.log('❌ FAILED: Got redirect status but no location header');
      }
    } else if (loginResponse.status === 200) {
      const responseText = await loginResponse.text();
      console.log('⚠️  Got 200 OK response instead of redirect');
      
      if (responseText.includes('error')) {
        console.log('❌ Response contains error content');
        console.log('Response preview:', responseText.substring(0, 200));
      } else {
        console.log('Response preview:', responseText.substring(0, 200));
      }
    } else {
      console.log(`❌ FAILED: Unexpected status ${loginResponse.status}`);
    }
    
    // Step 3: Test session endpoint to see if we're logged in
    console.log('\n📋 Step 3: Checking session after login attempt');
    
    const sessionCookies = setCookieHeaders
      .map(cookie => cookie.split(';')[0])
      .join('; ');
    
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ...(sessionCookies && { 'Cookie': sessionCookies })
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      
      if (sessionData && sessionData.user) {
        console.log('🎉 SUCCESS: User session found after login!');
        console.log(`✅ Logged in as: ${sessionData.user.email}`);
        console.log(`✅ User name: ${sessionData.user.name}`);
        console.log(`✅ User ID: ${sessionData.user.id}`);
        console.log('✅ The login system is working correctly!');
      } else {
        console.log('❌ No session found after login attempt');
      }
    } else {
      console.log(`❌ Failed to check session: ${sessionResponse.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
  }
}

async function testPasswordDirectly() {
  console.log('\n=== TESTING PASSWORD VERIFICATION DIRECTLY ===\n');
  
  const bcrypt = require('bcryptjs');
  const { Client } = require('pg');
  
  try {
    // Connect to database directly
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'echosofme_dev',
      user: 'echosofme',
      password: 'secure_dev_password'
    });
    
    await client.connect();
    console.log('✅ Connected to database');
    
    // Get the user's password hash
    const result = await client.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [credentials.email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = result.rows[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Test password verification
    const isValid = await bcrypt.compare(credentials.password, user.password_hash);
    console.log(`Password verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (isValid) {
      console.log('🎉 Password verification successful!');
      console.log('✅ The test credentials are correct');
    } else {
      console.log('❌ Password verification failed');
      console.log('🔧 Either the password is wrong or the hash is corrupted');
    }
    
    await client.end();
    
  } catch (error) {
    console.log(`❌ Password test failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log(`Testing login at: ${baseUrl}`);
  console.log(`Using credentials: ${credentials.email} / ${credentials.password}\n`);
  
  await testDirectLoginAPI();
  await testPasswordDirectly();
  
  console.log('\n=== FINAL ASSESSMENT ===');
  console.log('This test directly verifies:');
  console.log('1. NEXTAUTH_URL configuration (via redirect behavior)');
  console.log('2. Database user existence and password validation');
  console.log('3. NextAuth API endpoints functionality');
  console.log('4. Session management after login');
  console.log('\nIf all tests pass, the NEXTAUTH_URL fix is working correctly!');
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testDirectLoginAPI, testPasswordDirectly };