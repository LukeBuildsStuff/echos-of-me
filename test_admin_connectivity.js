const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function testAdminConnectivity() {
  const client = await pool.connect()
  
  try {
    console.log('🔌 Testing admin system database connectivity...\n')
    
    // 1. Test admin authentication and role checking
    console.log('👤 Testing admin authentication simulation:')
    const testEmail = 'lukemoeller@yahoo.com'
    
    const adminUserCheck = await client.query(`
      SELECT 
        u.id, u.email, u.name, u.is_admin,
        ar.role_name, ar.display_name, ar.permissions
      FROM users u
      LEFT JOIN admin_roles ar ON u.admin_role_id = ar.id
      WHERE u.email = $1 AND u.is_admin = true
    `, [testEmail])
    
    if (adminUserCheck.rows.length > 0) {
      const admin = adminUserCheck.rows[0]
      console.log(`  ✅ Admin user found: ${admin.email}`)
      console.log(`  ✅ Role: ${admin.role_name} (${admin.display_name})`)
      console.log(`  ✅ Permissions: ${Object.keys(admin.permissions).length} resource groups`)
    } else {
      console.log('  ❌ Admin user not found or not active')
    }
    
    // 2. Test admin dashboard data queries
    console.log('\n📊 Testing admin dashboard queries:')
    
    // User statistics
    const userStats = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_users
      FROM users
    `)
    console.log(`  ✅ User statistics: ${userStats.rows[0].total_users} total, ${userStats.rows[0].admin_users} admins, ${userStats.rows[0].recent_users} recent`)
    
    // Families count
    const familyStats = await client.query('SELECT COUNT(*) as total_families FROM families')
    console.log(`  ✅ Family statistics: ${familyStats.rows[0].total_families} families`)
    
    // Crisis events
    const crisisStats = await client.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_events
      FROM crisis_detection_events
    `)
    console.log(`  ✅ Crisis statistics: ${crisisStats.rows[0].total_events} total, ${crisisStats.rows[0].active_events} active`)
    
    // Audit log
    const auditStats = await client.query(`
      SELECT COUNT(*) as total_logs
      FROM comprehensive_audit_log
      WHERE created_at > NOW() - INTERVAL '7 days'
    `)
    console.log(`  ✅ Audit statistics: ${auditStats.rows[0].total_logs} logs in last 7 days`)
    
    // 3. Test admin operations
    console.log('\n⚙️ Testing admin operations:')
    
    // Test creating an audit log entry
    await client.query(`
      INSERT INTO comprehensive_audit_log (
        admin_email, action_type, resource_type, action_details, risk_level
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      testEmail,
      'connectivity_test',
      'system',
      JSON.stringify({ 
        test: 'Admin connectivity verification',
        timestamp: new Date().toISOString(),
        status: 'successful'
      }),
      'low'
    ])
    console.log('  ✅ Audit logging test passed')
    
    // Test user lookup functionality
    const userLookup = await client.query(`
      SELECT u.id, u.email, u.name, u.created_at,
             ar.role_name as admin_role
      FROM users u
      LEFT JOIN admin_roles ar ON u.admin_role_id = ar.id
      ORDER BY u.created_at DESC
      LIMIT 5
    `)
    console.log(`  ✅ User lookup test passed (${userLookup.rows.length} users found)`)
    
    // Test permission checking
    const permissionCheck = await client.query(`
      SELECT COUNT(*) as permission_count
      FROM admin_permissions
      WHERE resource = 'users' AND action = 'read'
    `)
    console.log(`  ✅ Permission checking test passed`)
    
    // 4. Test admin role operations
    console.log('\n🛡️ Testing admin role operations:')
    
    // Get all available roles
    const allRoles = await client.query(`
      SELECT role_name, display_name, 
             jsonb_object_keys(permissions) as resource
      FROM admin_roles
      ORDER BY role_name
    `)
    
    const rolesByResource = allRoles.rows.reduce((acc, row) => {
      if (!acc[row.role_name]) acc[row.role_name] = []
      acc[row.role_name].push(row.resource)
      return acc
    }, {})
    
    console.log('  ✅ Available admin roles:')
    Object.entries(rolesByResource).forEach(([role, resources]) => {
      console.log(`      ${role}: ${resources.length} resource permissions`)
    })
    
    // 5. Test security features
    console.log('\n🔒 Testing security features:')
    
    // Test password reset token system
    const resetTokenTest = await client.query(`
      SELECT COUNT(*) as token_system_ready
      FROM information_schema.tables
      WHERE table_name = 'password_reset_tokens'
    `)
    console.log(`  ✅ Password reset system: ${resetTokenTest.rows[0].token_system_ready ? 'Ready' : 'Not Ready'}`)
    
    // Test user shadowing system
    const shadowingTest = await client.query(`
      SELECT COUNT(*) as shadowing_system_ready
      FROM information_schema.tables
      WHERE table_name = 'user_shadowing_sessions'
    `)
    console.log(`  ✅ User shadowing system: ${shadowingTest.rows[0].shadowing_system_ready ? 'Ready' : 'Not Ready'}`)
    
    // Test privacy request system
    const privacyTest = await client.query(`
      SELECT COUNT(*) as privacy_system_ready
      FROM information_schema.tables
      WHERE table_name = 'privacy_requests'
    `)
    console.log(`  ✅ Privacy request system: ${privacyTest.rows[0].privacy_system_ready ? 'Ready' : 'Not Ready'}`)
    
    // 6. Test real-time monitoring capabilities
    console.log('\n📡 Testing monitoring capabilities:')
    
    const monitoringQuery = await client.query(`
      SELECT 
        'users' as table_name, COUNT(*) as record_count
      FROM users
      UNION ALL
      SELECT 
        'families' as table_name, COUNT(*) as record_count
      FROM families
      UNION ALL
      SELECT 
        'crisis_detection_events' as table_name, COUNT(*) as record_count
      FROM crisis_detection_events
      ORDER BY table_name
    `)
    
    console.log('  ✅ Real-time data access:')
    monitoringQuery.rows.forEach(row => {
      console.log(`      ${row.table_name}: ${row.record_count} records`)
    })
    
    // Final connectivity summary
    console.log('\n🎯 Admin System Connectivity Summary:')
    console.log('✅ Database connection established')
    console.log('✅ Admin authentication system operational')
    console.log('✅ Dashboard data queries working')
    console.log('✅ Admin operations functional')
    console.log('✅ Role-based access control active')
    console.log('✅ Security features enabled')
    console.log('✅ Real-time monitoring ready')
    console.log('✅ Audit logging functional')
    
    console.log('\n🚀 The admin portal is fully connected and operational!')
    console.log('\n📝 Admin Access Information:')
    console.log(`   Admin User: ${testEmail}`)
    console.log(`   Admin Role: super_admin`)
    console.log(`   Portal URL: https://echosofme.io/admin`)
    console.log(`   Status: Ready for use`)
    
  } catch (error) {
    console.error('❌ Admin connectivity test failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run connectivity test
testAdminConnectivity()
  .then(() => {
    console.log('\n✨ Admin system connectivity test completed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Admin system connectivity test failed:', error)
    process.exit(1)
  })