const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection with fallback
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

async function checkUserInDatabase() {
  console.log('🔍 Checking user database for lukemoeller@yahoo.com...');
  
  try {
    // First, check if user exists
    const userResult = await query(`
      SELECT 
        u.id, u.email, u.name, u.password_hash, u.is_admin, u.admin_role_id,
        u.failed_login_attempts, u.locked_until, u.memorial_account, u.is_active,
        u.created_at, u.last_login_at
      FROM users u
      WHERE u.email = $1
    `, ['lukemoeller@yahoo.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      
      // Check if there are any users at all
      const allUsersResult = await query('SELECT COUNT(*) as count FROM users');
      console.log(`📊 Total users in database: ${allUsersResult.rows[0].count}`);
      
      // Show first 5 users for debugging
      const sampleUsersResult = await query('SELECT email, is_active FROM users LIMIT 5');
      console.log('📋 Sample users:');
      sampleUsersResult.rows.forEach(user => {
        console.log(`   • ${user.email} (active: ${user.is_active})`);
      });
      
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found in database:');
    console.log(`   • ID: ${user.id}`);
    console.log(`   • Email: ${user.email}`);
    console.log(`   • Name: ${user.name}`);
    console.log(`   • Is Active: ${user.is_active}`);
    console.log(`   • Is Admin: ${user.is_admin}`);
    console.log(`   • Failed Login Attempts: ${user.failed_login_attempts}`);
    console.log(`   • Locked Until: ${user.locked_until}`);
    console.log(`   • Created At: ${user.created_at}`);
    console.log(`   • Last Login: ${user.last_login_at}`);
    console.log(`   • Password Hash: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'null'}`);
    
    // Test password verification
    if (user.password_hash) {
      console.log('\n🔐 Testing password verification...');
      const testPassword = 'password123';
      const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log(`   • Password '${testPassword}' is ${isPasswordValid ? 'VALID' : 'INVALID'}`);
      
      if (!isPasswordValid) {
        console.log('❌ Password verification failed - this explains the login issue');
        
        // Generate a new hash for comparison
        const newHash = await bcrypt.hash(testPassword, 12);
        console.log(`   • New hash would be: ${newHash.substring(0, 20)}...`);
        
        // Test if the user might need a password reset
        console.log('💡 Recommendation: Password may need to be reset for this user');
      } else {
        console.log('✅ Password verification successful');
      }
    } else {
      console.log('❌ No password hash found for user');
    }
    
    // Check account status
    console.log('\n🔒 Checking account restrictions...');
    
    if (!user.is_active) {
      console.log('❌ Account is INACTIVE - this will prevent login');
    } else {
      console.log('✅ Account is active');
    }
    
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      console.log(`❌ Account is LOCKED until ${user.locked_until}`);
    } else {
      console.log('✅ Account is not locked');
    }
    
    if (user.failed_login_attempts > 0) {
      console.log(`⚠️ Account has ${user.failed_login_attempts} failed login attempts`);
    } else {
      console.log('✅ No recent failed login attempts');
    }
    
  } catch (error) {
    console.log('❌ Database error:', error.message);
    console.log('🔧 Error details:', error);
  }
}

checkUserInDatabase().catch(console.error);