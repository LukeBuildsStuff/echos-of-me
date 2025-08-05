const fetch = require('node-fetch');

async function testFormSubmission() {
  console.log('Testing form submission to /api/auth/simple-login...');
  
  try {
    const response = await fetch('http://localhost:3003/api/auth/simple-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok && data.success) {
      console.log('LOGIN SUCCESS: API is working correctly');
      console.log('User data:', data.user);
    } else {
      console.log('LOGIN FAILED:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// First, let's check if there are any valid test users
async function checkTestUser() {
  const { query } = require('./lib/db');
  
  try {
    console.log('Checking for test users in database...');
    const result = await query('SELECT email, name, is_active FROM users LIMIT 5');
    console.log('Users found:', result.rows);
    
    if (result.rows.length > 0) {
      console.log('\nTesting with first user:', result.rows[0].email);
      return result.rows[0];
    } else {
      console.log('No users found in database');
      return null;
    }
  } catch (error) {
    console.error('Database query failed:', error.message);
    return null;
  }
}

async function runTests() {
  // First test with invalid credentials
  await testFormSubmission();
  
  // Then check for valid test users and try with those
  const testUser = await checkTestUser();
  if (testUser) {
    console.log('\nTesting with a real user from database (password unknown)...');
    // We can't test with real credentials since we don't know the password
    // but at least we verified the API is reachable
  }
}

runTests();