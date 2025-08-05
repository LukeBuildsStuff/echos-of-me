const https = require('https');
const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAdminPortalAPI() {
  console.log('🔍 Starting Admin Portal API Test...\n');
  
  try {
    // Test 1: Check if server is responding
    console.log('1️⃣ Testing server connectivity...');
    const healthCheck = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    
    console.log(`   Health check status: ${healthCheck.statusCode}`);
    if (healthCheck.statusCode === 200) {
      console.log('   ✅ Server is responding');
    } else {
      console.log('   ❌ Server health check failed');
    }
    
    // Test 2: Test authentication endpoint
    console.log('\n2️⃣ Testing authentication...');
    
    const authData = JSON.stringify({
      email: 'lukemoeller@yahoo.com',
      password: 'password123'
    });
    
    const authResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(authData)
      }
    }, authData);
    
    console.log(`   Auth response status: ${authResponse.statusCode}`);
    console.log(`   Auth response headers:`, Object.keys(authResponse.headers));
    
    // Extract session cookie if present
    let sessionCookie = '';
    if (authResponse.cookies) {
      const sessionCookieHeader = authResponse.cookies.find(cookie => 
        cookie.includes('next-auth.session-token') || cookie.includes('__Secure-next-auth.session-token')
      );
      if (sessionCookieHeader) {
        sessionCookie = sessionCookieHeader.split(';')[0];
        console.log('   ✅ Session cookie obtained');
      }
    }
    
    // Test 3: Test admin analytics endpoint (should require auth)
    console.log('\n3️⃣ Testing admin analytics endpoint...');
    
    const analyticsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/analytics',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Analytics response status: ${analyticsResponse.statusCode}`);
    
    if (analyticsResponse.statusCode === 200) {
      console.log('   ✅ Admin analytics endpoint accessible');
      try {
        const analyticsData = JSON.parse(analyticsResponse.data);
        console.log('   📊 Analytics data structure:');
        console.log(`     - User Stats: ${analyticsData.userStats ? 'Present' : 'Missing'}`);
        console.log(`     - Response Stats: ${analyticsData.responseStats ? 'Present' : 'Missing'}`);
        console.log(`     - System Stats: ${analyticsData.systemStats ? 'Present' : 'Missing'}`);
      } catch (e) {
        console.log('   ⚠️ Analytics response not valid JSON');
      }
    } else if (analyticsResponse.statusCode === 401 || analyticsResponse.statusCode === 403) {
      console.log('   ❌ Admin access denied - authentication issue');
    } else {
      console.log(`   ❌ Unexpected response: ${analyticsResponse.statusCode}`);
    }
    
    // Test 4: Test other admin endpoints
    console.log('\n4️⃣ Testing additional admin endpoints...');
    
    const adminEndpoints = [
      '/api/admin/users',
      '/api/admin/families',
      '/api/admin/audit-logs',
      '/api/admin/crisis-detection',
      '/api/admin/emergency-support'
    ];
    
    for (const endpoint of adminEndpoints) {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   ${endpoint}: ${response.statusCode} ${response.statusCode === 200 ? '✅' : response.statusCode === 401 || response.statusCode === 403 ? '🔒' : '❌'}`);
    }
    
    // Test 5: Test admin portal page directly
    console.log('\n5️⃣ Testing admin portal page access...');
    
    const adminPageResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/admin',
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log(`   Admin page response status: ${adminPageResponse.statusCode}`);
    
    if (adminPageResponse.statusCode === 200) {
      console.log('   ✅ Admin portal page accessible');
      
      // Check for key content
      const pageContent = adminPageResponse.data;
      const hasTitle = pageContent.includes('Family Legacy Guardian');
      const hasAdminElements = pageContent.includes('admin') || pageContent.includes('Admin');
      const hasNavigation = pageContent.includes('Families') && pageContent.includes('Grief Support');
      
      console.log(`   📄 Page content analysis:`);
      console.log(`     - Family Legacy Guardian title: ${hasTitle ? '✅' : '❌'}`);
      console.log(`     - Admin elements: ${hasAdminElements ? '✅' : '❌'}`);
      console.log(`     - Navigation elements: ${hasNavigation ? '✅' : '❌'}`);
      
    } else if (adminPageResponse.statusCode === 302 || adminPageResponse.statusCode === 307) {
      const redirectLocation = adminPageResponse.headers.location;
      console.log(`   🔄 Redirected to: ${redirectLocation}`);
      
      if (redirectLocation && redirectLocation.includes('/auth/signin')) {
        console.log('   ⚠️ Redirected to login - authentication required');
      }
    } else {
      console.log(`   ❌ Unexpected response: ${adminPageResponse.statusCode}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Admin Portal API Test Complete');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testAdminPortalAPI().catch(console.error);