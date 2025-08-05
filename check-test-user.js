const { query } = require('./lib/db.ts');

async function checkTestUser() {
  try {
    console.log('🔍 Checking if test user exists in database...');
    
    const result = await query('SELECT id, email, name, is_active, password_hash FROM users WHERE email = $1', ['lukemoeller@yahoo.com']);
    
    if (result.rows.length === 0) {
      console.log('❌ CRITICAL ISSUE: Test user not found in database');
      console.log('❌ This explains why login is failing');
      console.log('❌ The user lukemoeller@yahoo.com does not exist');
      
      // Check if there are any users at all
      const allUsers = await query('SELECT email, is_active FROM users LIMIT 5');
      console.log('📍 Available users in database:');
      allUsers.rows.forEach(user => {
        console.log(`  - ${user.email} (active: ${user.is_active})`);
      });
      
      return false;
    } else {
      const user = result.rows[0];
      console.log('✅ Test user found in database');
      console.log(`📍 User ID: ${user.id}`);
      console.log(`📍 Email: ${user.email}`);
      console.log(`📍 Name: ${user.name}`);
      console.log(`📍 Active: ${user.is_active}`);
      console.log(`📍 Has password hash: ${user.password_hash ? 'Yes' : 'No'}`);
      
      if (!user.is_active) {
        console.log('❌ CRITICAL ISSUE: User account is inactive');
        return false;
      }
      
      if (!user.password_hash) {
        console.log('❌ CRITICAL ISSUE: User has no password hash');
        return false;
      }
      
      return true;
    }
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
    console.log('❌ This could explain authentication failures');
    return false;
  }
}

if (require.main === module) {
  checkTestUser().then(userExists => {
    console.log('\n' + '='.repeat(50));
    if (userExists) {
      console.log('✅ TEST USER IS VALID - Problem lies elsewhere in auth system');
    } else {
      console.log('❌ TEST USER ISSUE FOUND - This explains the login failure');
    }
    process.exit(userExists ? 0 : 1);
  });
}

module.exports = { checkTestUser };