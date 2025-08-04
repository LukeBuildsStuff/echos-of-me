const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function auditConstraints() {
  const client = await pool.connect();
  try {
    console.log('🔍 Auditing Database Constraints and Security...\n');
    
    // 1. Foreign Key Constraint Testing
    console.log('1. Testing Foreign Key Constraints:');
    
    // Test user -> admin_role constraint
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO users (email, name, admin_role_id) 
        VALUES ('test@invalid.com', 'Test', '00000000-0000-0000-0000-000000000000')
      `);
      await client.query('ROLLBACK');
      console.log('  ❌ Foreign key constraint failed - invalid admin_role_id accepted');
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('  ✅ Foreign key constraint working - invalid admin_role_id rejected');
    }
    
    // 2. Check for missing constraints that should exist
    console.log('\n2. Checking Critical Constraint Coverage:');
    
    const constraintQuery = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('FOREIGN KEY', 'PRIMARY KEY', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_type
    `);
    
    const constraintsByTable = {};
    constraintQuery.rows.forEach(row => {
      if (!constraintsByTable[row.table_name]) {
        constraintsByTable[row.table_name] = { pk: 0, fk: 0, unique: 0 };
      }
      if (row.constraint_type === 'PRIMARY KEY') constraintsByTable[row.table_name].pk++;
      if (row.constraint_type === 'FOREIGN KEY') constraintsByTable[row.table_name].fk++;
      if (row.constraint_type === 'UNIQUE') constraintsByTable[row.table_name].unique++;
    });
    
    Object.entries(constraintsByTable).forEach(([table, counts]) => {
      const status = counts.pk > 0 ? '✅' : '⚠️';
      console.log(`  ${status} ${table}: PK(${counts.pk}) FK(${counts.fk}) UNIQUE(${counts.unique})`);
    });
    
    // 3. Data Integrity Checks
    console.log('\n3. Data Integrity Verification:');
    
    // Check for orphaned records
    const orphanChecks = [
      {
        name: 'Users with invalid admin_role_id',
        query: `
          SELECT COUNT(*) FROM users u 
          WHERE u.admin_role_id IS NOT NULL 
          AND NOT EXISTS (SELECT 1 FROM admin_roles ar WHERE ar.id = u.admin_role_id)
        `
      },
      {
        name: 'Responses with invalid user_id',
        query: `
          SELECT COUNT(*) FROM responses r 
          WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id)
        `
      }
    ];
    
    for (const check of orphanChecks) {
      try {
        const result = await client.query(check.query);
        const count = parseInt(result.rows[0].count);
        const status = count === 0 ? '✅' : '❌';
        console.log(`  ${status} ${check.name}: ${count} issues`);
      } catch (error) {
        console.log(`  ⚠️  ${check.name}: Query failed - ${error.message}`);
      }
    }
    
    // 4. Security Configuration Check
    console.log('\n4. Security Configuration:');
    
    // Check password hashing
    const passwordCheck = await client.query(`
      SELECT 
        email,
        CASE 
          WHEN password_hash IS NULL THEN 'No password'
          WHEN password_hash LIKE '$2%' THEN 'Bcrypt (Good)'
          WHEN LENGTH(password_hash) < 50 THEN 'Weak hash'
          ELSE 'Unknown hash type'
        END as hash_status
      FROM users 
      WHERE email = 'lukemoeller@yahoo.com'
    `);
    
    passwordCheck.rows.forEach(user => {
      const status = user.hash_status.includes('Good') ? '✅' : '⚠️';
      console.log(`  ${status} ${user.email}: ${user.hash_status}`);
    });
    
    // Check admin permissions structure
    const permissionCheck = await client.query(`
      SELECT role_name, permissions, is_system_role
      FROM admin_roles 
      WHERE role_name = 'super_admin'
    `);
    
    if (permissionCheck.rows.length > 0) {
      const role = permissionCheck.rows[0];
      const permCount = Object.keys(role.permissions).length;
      console.log(`  ✅ Super admin role: ${permCount} permission groups configured`);
      console.log(`  ✅ System role protection: ${role.is_system_role}`);
    }
    
    // 5. Performance Index Check
    console.log('\n5. Performance Index Coverage:');
    
    const criticalIndexes = [
      { table: 'users', column: 'email' },
      { table: 'users', column: 'admin_role_id' },
      { table: 'comprehensive_audit_log', column: 'admin_email' },
      { table: 'comprehensive_audit_log', column: 'created_at' }
    ];
    
    for (const { table, column } of criticalIndexes) {
      const indexCheck = await client.query(`
        SELECT COUNT(*) as index_count
        FROM pg_indexes 
        WHERE tablename = $1 AND indexdef LIKE '%' || $2 || '%'
      `, [table, column]);
      
      const hasIndex = parseInt(indexCheck.rows[0].index_count) > 0;
      const status = hasIndex ? '✅' : '⚠️';
      console.log(`  ${status} ${table}.${column}: ${hasIndex ? 'Indexed' : 'Missing index'}`);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

auditConstraints().catch(console.error);