const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Test authentication functionality
async function testAuth() {
  const pool = new Pool({
    connectionString: "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev"
  });

  try {
    console.log('Testing authentication functionality...\n');

    // 1. Check if user exists
    console.log('1. Checking if test user exists...');
    const userCheck = await pool.query(
      'SELECT id, email, name, password_hash, is_active FROM users WHERE email = $1',
      ['test@example.com']
    );

    if (userCheck.rows.length === 0) {
      console.log('❌ Test user not found');
      return;
    }

    const user = userCheck.rows[0];
    console.log('✓ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      is_active: user.is_active
    });

    // 2. Test password verification
    console.log('\n2. Testing password verification...');
    const testPassword = 'testpassword123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
    
    if (isPasswordValid) {
      console.log('✓ Password verification successful');
    } else {
      console.log('❌ Password verification failed');
      return;
    }

    // 3. Test login update
    console.log('\n3. Testing login timestamp update...');
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    console.log('✓ Login timestamp updated');

    // 4. Verify user is active
    console.log('\n4. Checking user active status...');
    if (user.is_active) {
      console.log('✓ User is active');
    } else {
      console.log('❌ User is not active');
    }

    console.log('\n🎉 All authentication tests passed!');
    console.log('Login credentials:');
    console.log('Email: test@example.com');
    console.log('Password: testpassword123');

  } catch (error) {
    console.error('❌ Authentication test failed:', error);
  } finally {
    await pool.end();
  }
}

// Test NextAuth API endpoint
async function testAuthAPI() {
  const axios = require('axios');
  
  try {
    console.log('\n🧪 Testing NextAuth API endpoint...');
    
    // First get CSRF token
    const csrfResponse = await axios.get('http://localhost:3001/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('✓ CSRF token retrieved');
    
    // Test login
    const loginResponse = await axios.post('http://localhost:3001/api/auth/callback/credentials', {
      email: 'test@example.com',
      password: 'testpassword123',
      csrfToken: csrfToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status < 500; // Accept redirects
      }
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Response headers:', loginResponse.headers);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to application - is it running on port 3001?');
    } else {
      console.log('Auth API test result:', error.response?.status, error.response?.statusText);
    }
  }
}

// Run tests
testAuth().then(() => {
  return testAuthAPI();
}).catch(console.error);