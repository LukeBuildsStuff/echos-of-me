#!/usr/bin/env node

/**
 * Test script to verify authentication middleware fix
 * Tests both authenticated and unauthenticated requests to AI Echo endpoints
 */

const https = require('https');
const http = require('http');

const baseUrl = 'http://localhost:3000';

async function makeRequest(endpoint, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testAuthenticationFix() {
  console.log('🔍 Testing Authentication Middleware Fix\n');
  
  const testEndpoints = [
    '/api/ai-echo/chat',
    '/api/ai-echo/stream',
    '/api/ai-echo/sessions'
  ];

  for (const endpoint of testEndpoints) {
    console.log(`Testing ${endpoint}:`);
    
    try {
      // Test without authentication (should return 401, not redirect)
      const unauthResponse = await makeRequest(endpoint, 'POST', {}, { message: 'test' });
      
      console.log(`  ❌ Unauthenticated: ${unauthResponse.status}`);
      
      if (unauthResponse.status === 401) {
        console.log(`  ✅ Correctly returns 401 (no redirect)`);
        try {
          const errorBody = JSON.parse(unauthResponse.body);
          console.log(`  📝 Error message: "${errorBody.error}"`);
        } catch (e) {
          console.log(`  📝 Response body: ${unauthResponse.body.substring(0, 100)}...`);
        }
      } else if (unauthResponse.status === 307 || unauthResponse.status === 302) {
        console.log(`  ❌ STILL REDIRECTING (Status: ${unauthResponse.status})`);
        console.log(`  📍 Location: ${unauthResponse.headers.location}`);
      } else {
        console.log(`  ⚠️  Unexpected status: ${unauthResponse.status}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎯 Authentication Fix Test Summary:');
  console.log('- If all endpoints return 401 (not 307/302), the fix is working!');
  console.log('- If any still return 307/302, there may be additional middleware issues.');
  console.log('\n💡 Next step: Start the development server and run this test');
  console.log('   npm run dev (in another terminal)');
  console.log('   node test-auth-fix.js');
}

// Check if server is running first
async function checkServerHealth() {
  try {
    const response = await makeRequest('/api/health');
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm run dev');
    console.log('   Then run this test again.');
    return false;
  }
}

async function main() {
  console.log('🚀 Authentication Middleware Fix Test\n');
  
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    return;
  }
  
  await testAuthenticationFix();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAuthenticationFix, makeRequest };