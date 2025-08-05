const fetch = require('node-fetch');

async function testAuthenticationDetails() {
  console.log('🔐 Detailed Authentication Test\n');

  // Test 1: Valid credentials
  console.log('TEST 1: Valid Credentials');
  try {
    const validResponse = await fetch('http://localhost:3003/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'email=lukemoeller%40yahoo.com&password=password123&redirect=false&json=true'
    });
    
    console.log(`Status: ${validResponse.status}`);
    console.log(`Headers:`, validResponse.headers.raw());
    
    const validText = await validResponse.text();
    console.log(`Response: ${validText.substring(0, 300)}`);
    
    if (validResponse.status === 200) {
      try {
        const jsonResponse = JSON.parse(validText);
        if (jsonResponse.ok) {
          console.log('✅ Valid credentials: SUCCESS');
        } else {
          console.log('❌ Valid credentials: API returned error in JSON');
        }
      } catch {
        console.log('⚠️  Valid credentials: Non-JSON response (might be redirect)');
      }
    } else if (validResponse.status === 302) {
      console.log('✅ Valid credentials: SUCCESS (redirect response)');
    }
  } catch (error) {
    console.log(`❌ Valid credentials test failed: ${error.message}`);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 2: Invalid credentials
  console.log('TEST 2: Invalid Credentials');
  try {
    const invalidResponse = await fetch('http://localhost:3003/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'email=wrong%40email.com&password=wrongpassword&redirect=false&json=true'
    });
    
    console.log(`Status: ${invalidResponse.status}`);
    console.log(`Headers:`, invalidResponse.headers.raw());
    
    const invalidText = await invalidResponse.text();
    console.log(`Response: ${invalidText.substring(0, 300)}`);
    
    if (invalidResponse.status === 401 || invalidResponse.status === 403) {
      console.log('✅ Invalid credentials: CORRECTLY REJECTED');
    } else if (invalidResponse.status === 200) {
      try {
        const jsonResponse = JSON.parse(invalidText);
        if (jsonResponse.error) {
          console.log('✅ Invalid credentials: CORRECTLY REJECTED (JSON error)');
        } else {
          console.log('❌ Invalid credentials: INCORRECTLY ACCEPTED');
        }
      } catch {
        console.log('❌ Invalid credentials: Unexpected response format');
      }
    } else {
      console.log(`⚠️  Invalid credentials: Unexpected status ${invalidResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Invalid credentials test failed: ${error.message}`);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 3: Test the user exists in database
  console.log('TEST 3: User Database Check');
  try {
    const userCheckResponse = await fetch('http://localhost:3003/api/debug/session');
    console.log(`User check status: ${userCheckResponse.status}`);
    
    if (userCheckResponse.status === 200) {
      const userCheckText = await userCheckResponse.text();
      console.log(`User check response: ${userCheckText.substring(0, 300)}`);
    }
  } catch (error) {
    console.log(`User check failed: ${error.message}`);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 4: Check if the user exists directly
  console.log('TEST 4: Direct Database User Check');
  try {
    // This is a custom endpoint we might need to create
    const response = await fetch('http://localhost:3003/api/auth/simple-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'lukemoeller@yahoo.com',
        password: 'password123'
      })
    });
    
    console.log(`Simple login status: ${response.status}`);
    const text = await response.text();
    console.log(`Simple login response: ${text.substring(0, 300)}`);
    
  } catch (error) {
    console.log(`Simple login test failed: ${error.message}`);
  }
}

testAuthenticationDetails();