#!/usr/bin/env node

// Test login functionality directly through NextAuth
const http = require('http');
const querystring = require('querystring');

async function testLogin() {
  console.log('=== DIRECT LOGIN TEST ===\n');
  
  // First get CSRF token
  console.log('1. Getting CSRF token...');
  const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfResponse.json();
  console.log('CSRF token:', csrfData.csrfToken);
  
  // Test login with credentials
  console.log('\n2. Testing login with lukemoeller@yahoo.com / password123...');
  
  const loginData = {
    email: 'lukemoeller@yahoo.com',
    password: 'password123',
    csrfToken: csrfData.csrfToken,
    callbackUrl: 'http://localhost:3000/dashboard',
    json: true
  };
  
  try {
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfResponse.headers.get('set-cookie') || ''
      },
      body: querystring.stringify(loginData),
      redirect: 'manual'
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    if (loginResponse.status === 302) {
      console.log('Login redirected to:', loginResponse.headers.get('location'));
    }
    
    const responseText = await loginResponse.text();
    console.log('Response body (first 500 chars):', responseText.substring(0, 500));
    
  } catch (error) {
    console.log('Login failed with error:', error.message);
  }
  
  console.log('\n=== TESTING COMPLETE ===');
}

// Polyfill fetch for older Node versions
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

testLogin().catch(console.error);