#!/usr/bin/env node

// Simple database test without TypeScript dependencies
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testDatabase() {
  console.log('=== DATABASE VERIFICATION AUDIT ===\n');
  console.log('Database URL:', process.env.DATABASE_URL);
  
  try {
    console.log('1. Testing database connection...');
    const result = await pool.query('SELECT 1 as test');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.log('✗ Database connection failed:', error.message);
    return;
  }

  try {
    console.log('\n2. Listing all tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    if (tables.rows.length === 0) {
      console.log('\n✗ CRITICAL FINDING: Database is completely empty!');
      console.log('Previous agents claimed to have created tables - THIS IS COMPLETELY FALSE');
      return;
    }
  } catch (error) {
    console.log('✗ Error listing tables:', error.message);
    return;
  }

  // Check for specific tables claimed by previous agents
  const claimedTables = ['users', 'comprehensive_audit_log', 'admin_roles'];
  
  for (const tableName of claimedTables) {
    try {
      console.log(`\n3. Checking for ${tableName} table...`);
      const tableCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      if (tableCheck.rows.length === 0) {
        console.log(`✗ CRITICAL: ${tableName} table does not exist`);
        console.log(`Previous agents claimed to have created this table - FALSE CLAIM`);
      } else {
        console.log(`✓ ${tableName} table exists`);
        
        // If users table exists, check for the test user
        if (tableName === 'users') {
          const userCheck = await pool.query('SELECT count(*) FROM users WHERE email = $1', ['lukemoeller@yahoo.com']);
          const userExists = parseInt(userCheck.rows[0].count) > 0;
          console.log(`  Test user lukemoeller@yahoo.com exists: ${userExists ? '✓ YES' : '✗ NO'}`);
          
          if (!userExists) {
            console.log('  Previous agents claimed to have created this user - FALSE CLAIM');
          }
        }
      }
    } catch (error) {
      console.log(`✗ Error checking ${tableName}:`, error.message);
    }
  }

  await pool.end();
  console.log('\n=== VERIFICATION COMPLETE ===');
}

testDatabase().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});