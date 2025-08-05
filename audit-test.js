const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function auditAuthentication() {
  const pool = new Pool({
    connectionString: 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev'
  });
  
  try {
    console.log('=== CRITICAL AUTHENTICATION AUDIT ===');
    console.log('Testing ACTUAL database state vs agent claims...\n');
    
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');
    
    // Test 2: Check if user exists
    console.log('\n2. Checking for test user lukemoeller@yahoo.com...');
    const userResult = await pool.query(
      'SELECT id, email, password_hash, is_active, created_at FROM users WHERE email = $1',
      ['lukemoeller@yahoo.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ CRITICAL FINDING: User lukemoeller@yahoo.com does NOT exist');
      console.log('Previous agents FALSELY claimed to have created this user');
      await pool.end();
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✓ User found:', {
      id: user.id,
      email: user.email,
      is_active: user.is_active,
      created_at: user.created_at
    });
    
    // Test 3: Password verification
    console.log('\n3. Testing password verification for "password123"...');
    const isPasswordValid = await bcrypt.compare('password123', user.password_hash);
    console.log('Password validation result:', isPasswordValid ? '✓ VALID' : '❌ INVALID');
    
    if (!isPasswordValid) {
      console.log('❌ CRITICAL: Password "password123" does NOT match stored hash');
      console.log('Previous agents FALSELY claimed to have set this password');
    }
    
    // Test 4: Check for other users
    console.log('\n4. Checking total user count...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log('Total users in database:', countResult.rows[0].count);
    
    // Test 5: List all users
    console.log('\n5. Listing all users...');
    const allUsers = await pool.query('SELECT id, email, name, is_active FROM users LIMIT 10');
    allUsers.rows.forEach(u => {
      console.log(`  - ${u.email} (ID: ${u.id}, Active: ${u.is_active})`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    await pool.end();
  }
}

auditAuthentication();