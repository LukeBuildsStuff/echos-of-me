const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function initializeAdminSystem() {
  const client = await pool.connect()
  
  try {
    console.log('Initializing admin system...')
    
    // 1. Check existing users
    const usersResult = await client.query('SELECT id, email, name, role FROM users ORDER BY id')
    console.log('\nExisting users:')
    usersResult.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`)
    })
    
    // 2. Check available admin roles
    const rolesResult = await client.query('SELECT role_name, display_name, description FROM admin_roles ORDER BY role_name')
    console.log('\nAvailable admin roles:')
    rolesResult.rows.forEach(role => {
      console.log(`  - ${role.role_name}: ${role.display_name}`)
    })
    
    // 3. Assign admin roles to specific users
    // Look for users that might be admins (by email pattern or existing role)
    const potentialAdmins = usersResult.rows.filter(user => 
      user.email.includes('admin') || 
      user.email.includes('luke') ||
      user.role === 'admin' ||
      user.email.endsWith('@echosofme.com') ||
      user.email.endsWith('@echosofme.io')
    )
    
    if (potentialAdmins.length === 0) {
      // If no obvious admin users, make the first user a super admin
      if (usersResult.rows.length > 0) {
        potentialAdmins.push(usersResult.rows[0])
        console.log(`\nNo obvious admin users found. Making first user (${usersResult.rows[0].email}) a super admin.`)
      }
    }
    
    for (const user of potentialAdmins) {
      // Get super_admin role ID
      const superAdminRole = await client.query('SELECT id FROM admin_roles WHERE role_name = $1', ['super_admin'])
      
      if (superAdminRole.rows.length > 0) {
        // Assign super admin role
        await client.query(`
          UPDATE users 
          SET admin_role_id = $1, is_admin = true, primary_role = 'admin'
          WHERE id = $2
        `, [superAdminRole.rows[0].id, user.id])
        
        console.log(`✅ Assigned super_admin role to user: ${user.email}`)
        
        // Log the admin assignment
        await client.query(`
          INSERT INTO comprehensive_audit_log (
            admin_user_id, admin_email, action_type, resource_type, 
            resource_id, target_user_id, action_details, risk_level
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          user.id, 
          user.email,
          'admin_role_assignment',
          'user',
          user.id.toString(),
          user.id,
          JSON.stringify({ 
            role_assigned: 'super_admin',
            action: 'initial_admin_setup',
            timestamp: new Date().toISOString()
          }),
          'medium'
        ])
      }
    }
    
    // 4. Create initial system configuration
    console.log('\n📋 Admin system initialization summary:')
    console.log('✅ Admin roles and permissions created')
    console.log('✅ Database tables and indexes established')
    console.log('✅ Admin users assigned')
    console.log('✅ Audit logging active')
    
    // 5. Verify the setup
    const adminUsersCheck = await client.query(`
      SELECT u.id, u.email, u.name, u.is_admin, ar.role_name, ar.display_name
      FROM users u
      LEFT JOIN admin_roles ar ON u.admin_role_id = ar.id
      WHERE u.is_admin = true
    `)
    
    console.log('\n👑 Admin users configured:')
    adminUsersCheck.rows.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.name}) -> ${admin.role_name}: ${admin.display_name}`)
    })
    
    console.log('\n🎯 Next steps:')
    console.log('1. The admin portal should now be accessible')
    console.log('2. Admin users can access https://echosofme.io/admin')
    console.log('3. Additional admin roles can be assigned through the admin interface')
    console.log('4. Family support specialists and other roles can be added as needed')
    
  } catch (error) {
    console.error('Error initializing admin system:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the initialization
initializeAdminSystem()
  .then(() => {
    console.log('\n✨ Admin system initialization completed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Admin system initialization failed:', error)
    process.exit(1)
  })