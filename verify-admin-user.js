// Use a direct database connection since we can't import TS file directly
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev'
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function verifyAdminUser() {
  console.log('🔍 Verifying Admin User Setup...\n');
  
  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    const dbTest = await query('SELECT NOW() as current_time');
    console.log(`   ✅ Database connected successfully at: ${dbTest.rows[0].current_time}`);
    
    // Check if admin user exists
    console.log('\n2️⃣ Checking admin user existence...');
    const userResult = await query(`
      SELECT 
        id, email, name, is_admin, admin_role_id, created_at
      FROM users 
      WHERE email = $1
    `, ['lukemoeller@yahoo.com']);
    
    if (userResult.rows.length === 0) {
      console.log('   ❌ Admin user not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('   ✅ Admin user found:');
    console.log(`     - ID: ${user.id}`);
    console.log(`     - Email: ${user.email}`);
    console.log(`     - Name: ${user.name}`);
    console.log(`     - Is Admin: ${user.is_admin}`);
    console.log(`     - Admin Role ID: ${user.admin_role_id}`);
    console.log(`     - Created: ${user.created_at}`);
    
    // Check admin role details
    console.log('\n3️⃣ Checking admin role details...');
    if (user.admin_role_id) {
      const roleResult = await query(`
        SELECT role_name, display_name, permissions, created_at
        FROM admin_roles 
        WHERE id = $1
      `, [user.admin_role_id]);
      
      if (roleResult.rows.length > 0) {
        const role = roleResult.rows[0];
        console.log('   ✅ Admin role found:');
        console.log(`     - Role Name: ${role.role_name}`);
        console.log(`     - Display Name: ${role.display_name}`);
        console.log(`     - Permissions: ${JSON.stringify(role.permissions, null, 2)}`);
        console.log(`     - Created: ${role.created_at}`);
      } else {
        console.log('   ❌ Admin role not found');
      }
    } else {
      console.log('   ⚠️ User has no admin role assigned');
    }
    
    // Test password hash verification
    console.log('\n4️⃣ Testing password verification...');
    const bcrypt = require('bcryptjs');
    const passwordResult = await query('SELECT password_hash FROM users WHERE email = $1', ['lukemoeller@yahoo.com']);
    
    if (passwordResult.rows.length > 0) {
      const passwordHash = passwordResult.rows[0].password_hash;
      const isPasswordValid = await bcrypt.compare('password123', passwordHash);
      
      if (isPasswordValid) {
        console.log('   ✅ Password verification successful');
      } else {
        console.log('   ❌ Password verification failed');
      }
    } else {
      console.log('   ❌ Could not retrieve password hash');
    }
    
    // Check admin tables structure
    console.log('\n5️⃣ Checking admin table structure...');
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%admin%'
      ORDER BY table_name
    `);
    
    console.log('   📊 Admin-related tables:');
    tableCheck.rows.forEach(row => {
      console.log(`     - ${row.table_name}`);
    });
    
    // Check recent admin actions
    console.log('\n6️⃣ Checking admin audit logs table...');
    try {
      const auditTableCheck = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables 
        WHERE table_name = 'admin_audit_logs'
      `);
      
      if (auditTableCheck.rows[0].count > 0) {
        console.log('   ✅ Admin audit logs table exists');
      } else {
        console.log('   ⚠️ Admin audit logs table not found (this is okay for basic testing)');
      }
    } catch (error) {
      console.log('   ⚠️ Could not check audit logs table');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ADMIN USER VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    
    if (user.is_admin && user.admin_role_id) {
      console.log('🎉 Admin user is properly configured and ready for testing!');
      console.log('');
      console.log('🔑 Login Credentials:');
      console.log('   Email: lukemoeller@yahoo.com');
      console.log('   Password: password123');
      console.log('');
      console.log('🌐 Access URLs:');
      console.log('   Admin Portal: http://localhost:3000/admin');
      console.log('   Sign In: http://localhost:3000/auth/signin');
    } else {
      console.log('❌ Admin user configuration issues detected');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error.stack);
  }
}

// Run the verification
verifyAdminUser().catch(console.error);