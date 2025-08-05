// Debug authentication flow by testing the authorize function directly
const bcrypt = require('bcryptjs');

async function debugAuth() {
  try {
    console.log('Debugging authentication flow...\n');

    const credentials = {
      email: 'test@example.com',
      password: 'testpassword123'
    };

    console.log('1. Testing authorize function logic manually...');

    if (!credentials?.email || !credentials?.password) {
      console.log('❌ Missing credentials');
      return null;
    }

    console.log('✓ Credentials provided');

    try {
      console.log('2. Querying database for user...');
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: "postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev"
      });

      const result = await pool.query(
        'SELECT id, email, name, password_hash FROM users WHERE email = $1 AND is_active = true',
        [credentials.email]
      );

      console.log('Query result rows:', result.rows.length);

      if (result.rows.length === 0) {
        console.log('❌ No user found');
        return null;
      }

      const user = result.rows[0];
      console.log('✓ User found:', {
        id: user.id,
        email: user.email,
        name: user.name
      });

      console.log('3. Validating password...');
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

      if (!isPasswordValid) {
        console.log('❌ Invalid password');
        return null;
      }

      console.log('✓ Password valid');

      console.log('4. Updating last login...');
      await pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
      console.log('✓ Last login updated');

      const authResult = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      console.log('✓ Auth result:', authResult);
      console.log('\n🎉 Manual authorize function test passed!');

      await pool.end();
      return authResult;

    } catch (error) {
      console.error('❌ Database error:', error.message);
      return null;
    }

  } catch (error) {
    console.error('❌ Debug auth failed:', error);
  }
}

debugAuth();