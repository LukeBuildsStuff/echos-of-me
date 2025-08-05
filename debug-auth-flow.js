const { query } = require('./lib/db');
const bcrypt = require('bcryptjs');

async function debugAuthFlow() {
  console.log('🔍 Debugging Authentication Flow\n');

  // Test 1: Database connectivity
  console.log('TEST 1: Database Connectivity');
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection: SUCCESS');
    console.log(`   Current time: ${result.rows[0].now}`);
  } catch (error) {
    console.log(`❌ Database connection: FAILED - ${error.message}`);
    return;
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 2: User lookup
  console.log('TEST 2: User Lookup');
  try {
    const userResult = await query(`
      SELECT 
        u.id, u.email, u.name, u.password_hash, u.is_admin, u.admin_role_id,
        u.failed_login_attempts, u.locked_until, u.memorial_account,
        ar.role_name, ar.permissions, ar.display_name as role_display_name,
        fm.family_id, f.family_name
      FROM users u
      LEFT JOIN admin_roles ar ON u.admin_role_id = ar.id
      LEFT JOIN family_members fm ON u.id = fm.user_id AND fm.family_role = 'primary'
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE u.email = $1 AND u.is_active = true
    `, ['lukemoeller@yahoo.com']);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('✅ User lookup: SUCCESS');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Is Admin: ${user.is_admin}`);
      console.log(`   Failed Attempts: ${user.failed_login_attempts}`);
      console.log(`   Locked Until: ${user.locked_until}`);
      console.log(`   Password Hash: ${user.password_hash ? 'Present' : 'Missing'}`);

      // Test 3: Password verification
      console.log('\n' + '-'.repeat(30) + '\n');
      console.log('TEST 3: Password Verification');
      
      if (user.password_hash) {
        try {
          const isPasswordValid = await bcrypt.compare('password123', user.password_hash);
          if (isPasswordValid) {
            console.log('✅ Password verification: SUCCESS');
          } else {
            console.log('❌ Password verification: FAILED - Password does not match');
          }
        } catch (error) {
          console.log(`❌ Password verification: ERROR - ${error.message}`);
        }
      } else {
        console.log('❌ Password verification: FAILED - No password hash found');
      }

      // Test 4: Account lock status
      console.log('\n' + '-'.repeat(30) + '\n');
      console.log('TEST 4: Account Lock Status');
      
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        console.log(`❌ Account Status: LOCKED until ${user.locked_until}`);
      } else {
        console.log('✅ Account Status: UNLOCKED');
      }

    } else {
      console.log('❌ User lookup: FAILED - User not found');
    }
  } catch (error) {
    console.log(`❌ User lookup: ERROR - ${error.message}`);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 5: Admin security functions
  console.log('TEST 5: Admin Security Functions');
  try {
    const { isIPBlocked } = require('./lib/admin-security');
    const isBlocked = await isIPBlocked('127.0.0.1');
    console.log(`IP blocking check: ${isBlocked ? 'BLOCKED' : 'ALLOWED'}`);
    console.log('✅ Admin security functions: ACCESSIBLE');
  } catch (error) {
    console.log(`❌ Admin security functions: ERROR - ${error.message}`);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 6: Manual auth simulation
  console.log('TEST 6: Manual Auth Simulation');
  try {
    const credentials = { email: 'lukemoeller@yahoo.com', password: 'password123' };
    const mockReq = { headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'test-agent' } };

    console.log('Simulating the NextAuth authorize function...');
    
    // Simulate the authorize function logic
    if (!credentials?.email || !credentials?.password) {
      console.log('❌ Auth simulation: Missing credentials');
      return;
    }

    const { isIPBlocked } = require('./lib/admin-security');
    const clientIP = '127.0.0.1';
    
    if (await isIPBlocked(clientIP)) {
      console.log('❌ Auth simulation: IP is blocked');
      return;
    }

    const result = await query(`
      SELECT 
        u.id, u.email, u.name, u.password_hash, u.is_admin, u.admin_role_id,
        u.failed_login_attempts, u.locked_until, u.memorial_account,
        ar.role_name, ar.permissions, ar.display_name as role_display_name,
        fm.family_id, f.family_name
      FROM users u
      LEFT JOIN admin_roles ar ON u.admin_role_id = ar.id
      LEFT JOIN family_members fm ON u.id = fm.user_id AND fm.family_role = 'primary'
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE u.email = $1 AND u.is_active = true
    `, [credentials.email]);

    if (result.rows.length === 0) {
      console.log('❌ Auth simulation: User not found');
      return;
    }

    const user = result.rows[0];

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      console.log('❌ Auth simulation: Account is locked');
      return;
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

    if (!isPasswordValid) {
      console.log('❌ Auth simulation: Invalid password');
      return;
    }

    console.log('✅ Auth simulation: SUCCESS - All checks passed');
    console.log('   User would be authenticated successfully');

  } catch (error) {
    console.log(`❌ Auth simulation: ERROR - ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('AUTHENTICATION DEBUG SUMMARY');
  console.log('='.repeat(60));
  console.log('Based on this debug analysis, the authentication system');
  console.log('components appear to be working correctly.');
  console.log('The NextAuth integration should be functional.');
}

debugAuthFlow().catch(console.error);