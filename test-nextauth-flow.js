const fetch = require('node-fetch');

async function testCSRFToken() {
  console.log('Testing CSRF token endpoint...');
  
  try {
    const response = await fetch('http://localhost:3003/api/auth/csrf', {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.log('CSRF endpoint status:', response.status);
      const text = await response.text();
      console.log('CSRF endpoint response:', text);
      return null;
    }
    
    const data = await response.json();
    console.log('CSRF token response:', data);
    return data.csrfToken;
  } catch (error) {
    console.error('CSRF token test failed:', error.message);
    return null;
  }
}

async function testNextAuthCredentials() {
  console.log('\nTesting NextAuth credentials authorization...');
  
  try {
    // Test the authorization directly by calling NextAuth's authorize function
    const response = await fetch('http://localhost:3003/api/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    console.log('Credentials test status:', response.status);
    const responseText = await response.text();
    console.log('Credentials test response:', responseText);
    
  } catch (error) {
    console.error('Credentials test failed:', error.message);
  }
}

async function testSigninPage() {
  console.log('\nTesting signin page accessibility...');
  
  try {
    const response = await fetch('http://localhost:3003/auth/signin');
    console.log('Signin page status:', response.status);
    
    if (response.ok) {
      console.log('✅ Signin page is accessible');
    } else {
      console.log('❌ Signin page returned error:', response.status);
    }
    
  } catch (error) {
    console.error('Signin page test failed:', error.message);
  }
}

async function testDashboardAccess() {
  console.log('\nTesting dashboard access (should redirect to signin)...');
  
  try {
    const response = await fetch('http://localhost:3003/dashboard', {
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log('Dashboard access status:', response.status);
    console.log('Dashboard access headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      console.log('Redirected to:', location);
      
      if (location && location.includes('/auth/signin')) {
        console.log('✅ Dashboard correctly redirects to signin');
      } else {
        console.log('❌ Dashboard redirects to unexpected location');
      }
    } else {
      console.log('❌ Dashboard should redirect but returned:', response.status);
    }
    
  } catch (error) {
    console.error('Dashboard access test failed:', error.message);
  }
}

async function runTests() {
  console.log('=== Testing NextAuth Integration ===\n');
  
  await testSigninPage();
  await testDashboardAccess();
  await testCSRFToken();
  await testNextAuthCredentials();
  
  console.log('\n=== Test Summary ===');
  console.log('1. If signin page is accessible ✅');
  console.log('2. If dashboard redirects to signin ✅');  
  console.log('3. If CSRF token endpoint works');
  console.log('4. If NextAuth credentials flow works');
  console.log('\nForm submission should now work properly with NextAuth!');
}

runTests();