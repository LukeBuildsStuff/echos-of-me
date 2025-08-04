const fetch = require('node-fetch');

// Disable SSL verification for local testing
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

async function testAdminAuth() {
  console.log('🔐 Testing Admin Authentication Flow...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Check /api/admin/analytics endpoint
    console.log('1. Testing admin analytics endpoint...');
    const analyticsResponse = await fetch(`${baseUrl}/api/admin/analytics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${analyticsResponse.status}`);
    console.log(`   Headers: ${JSON.stringify([...analyticsResponse.headers.entries()])}`);
    
    if (analyticsResponse.status === 403) {
      console.log('   ✅ Correctly blocking unauthenticated access');
    } else {
      const data = await analyticsResponse.text();
      console.log(`   Response: ${data.substring(0, 200)}...`);
    }
    
    // Test 2: Check if health endpoint exists
    console.log('\n2. Testing system health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      method: 'GET'
    });
    
    console.log(`   Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`   Health: ${JSON.stringify(healthData)}`);
    }
    
    // Test 3: Check NextAuth API
    console.log('\n3. Testing NextAuth configuration...');
    const nextAuthResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
      method: 'GET'
    });
    
    console.log(`   CSRF Status: ${nextAuthResponse.status}`);
    if (nextAuthResponse.ok) {
      const csrfData = await nextAuthResponse.json();
      console.log(`   CSRF Token: ${csrfData.csrfToken ? 'Present' : 'Missing'}`);
    }
    
    // Test 4: Check protected admin routes
    const adminRoutes = [
      '/api/admin/users',
      '/api/admin/audit-logs', 
      '/api/admin/settings',
      '/api/admin/security/events'
    ];
    
    console.log('\n4. Testing protected admin endpoints...');
    for (const route of adminRoutes) {
      try {
        const response = await fetch(`${baseUrl}${route}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log(`   ${route}: ${response.status} (${response.status === 403 ? 'Protected ✅' : 'Check needed ⚠️'})`);
      } catch (error) {
        console.log(`   ${route}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminAuth();