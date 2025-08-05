#!/usr/bin/env node

// Test script to verify authentication issues
const { query } = require('./lib/db.ts');

async function testAuthentication() {
  console.log('=== AUTHENTICATION VERIFICATION AUDIT ===\n');
  
  try {
    console.log('1. Testing database connection...');
    await query('SELECT 1 as test');
    console.log('✓ Database connection successful');
  } catch (error) {
    console.log('✗ Database connection failed:', error.message);
    return;
  }

  try {
    console.log('\n2. Checking if users table exists...');
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('✗ CRITICAL: users table does not exist');
      console.log('Previous agents claimed to have created this table - THIS IS FALSE');
      return;
    }
    console.log('✓ Users table exists');
  } catch (error) {
    console.log('✗ Error checking users table:', error.message);
    return;
  }

  try {
    console.log('\n3. Checking users table structure...');
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('Users table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  } catch (error) {
    console.log('✗ Error checking table structure:', error.message);
  }

  try {
    console.log('\n4. Checking for test user lukemoeller@yahoo.com...');
    const userCheck = await query('SELECT id, email, password_hash, is_active, created_at FROM users WHERE email = $1', ['lukemoeller@yahoo.com']);
    
    if (userCheck.rows.length === 0) {
      console.log('✗ CRITICAL: Test user lukemoeller@yahoo.com does not exist');
      console.log('Previous agents claimed to have created this user - THIS IS FALSE');
      return;
    }
    
    const user = userCheck.rows[0];
    console.log('✓ Test user found:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Active: ${user.is_active}`);
    console.log(`  - Created: ${user.created_at}`);
    console.log(`  - Password hash length: ${user.password_hash ? user.password_hash.length : 'null'}`);
    
  } catch (error) {
    console.log('✗ Error checking test user:', error.message);
  }
  
  try {
    console.log('\n5. Testing password hash for password123...');
    const bcrypt = require('bcryptjs');
    const userResult = await query('SELECT password_hash FROM users WHERE email = $1', ['lukemoeller@yahoo.com']);
    
    if (userResult.rows.length > 0) {
      const storedHash = userResult.rows[0].password_hash;
      const isValid = await bcrypt.compare('password123', storedHash);
      console.log(`Password validation result: ${isValid ? '✓ VALID' : '✗ INVALID'}`);
      
      if (!isValid) {
        console.log('Previous agents claimed to have updated password hash - THIS APPEARS TO BE FALSE');
      }
    }
  } catch (error) {
    console.log('✗ Error testing password:', error.message);
  }

  try {
    console.log('\n6. Checking for comprehensive_audit_log table...');
    const auditTableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'comprehensive_audit_log'
    `);
    
    if (auditTableCheck.rows.length === 0) {
      console.log('✗ CRITICAL: comprehensive_audit_log table does not exist');
      console.log('Previous agents claimed to have created this table - THIS IS FALSE');
    } else {
      console.log('✓ comprehensive_audit_log table exists');
    }
  } catch (error) {
    console.log('✗ Error checking audit table:', error.message);
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

testAuthentication().catch(console.error);