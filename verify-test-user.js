const { Client } = require('pg');

async function verifyTestUser() {
  console.log('=== VERIFYING TEST USER IN DATABASE ===\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev'
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table exists');
      
      // Check for the test user
      const userCheck = await client.query(`
        SELECT id, email, password, created_at 
        FROM users 
        WHERE email = $1
      `, ['lukemoeller@yahoo.com']);
      
      if (userCheck.rows.length > 0) {
        const user = userCheck.rows[0];
        console.log('✅ Test user found in database:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password hash: ${user.password.substring(0, 20)}...`);
        console.log(`   Created: ${user.created_at}`);
        
        // Check if password looks like a bcrypt hash
        if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
          console.log('✅ Password appears to be properly hashed with bcrypt');
        } else {
          console.log('❌ Password does not appear to be bcrypt hashed');
        }
        
      } else {
        console.log('❌ Test user NOT found in database');
        console.log('🔧 Need to create test user with email: lukemoeller@yahoo.com');
        
        // Show existing users (limited)
        const existingUsers = await client.query(`
          SELECT email, created_at 
          FROM users 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        
        console.log(`\nFound ${existingUsers.rows.length} existing users:`);
        existingUsers.rows.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.created_at})`);
        });
      }
      
    } else {
      console.log('❌ Users table does not exist');
      console.log('🔧 Database schema needs to be initialized');
    }
    
  } catch (error) {
    console.log(`❌ Database error: ${error.message}`);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('🔧 Database connection failed - is PostgreSQL running?');
    }
  } finally {
    await client.end();
  }
}

async function createTestUser() {
  console.log('\n=== CREATING TEST USER ===\n');
  
  const bcrypt = require('bcryptjs');
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev'
  });
  
  try {
    await client.connect();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 12);
    console.log('✅ Password hashed successfully');
    
    // Insert the test user
    const result = await client.query(`
      INSERT INTO users (email, password, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        updated_at = NOW()
      RETURNING id, email, created_at
    `, ['lukemoeller@yahoo.com', hashedPassword]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Test user created/updated successfully:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${user.created_at}`);
    }
    
  } catch (error) {
    console.log(`❌ Error creating test user: ${error.message}`);
  } finally {
    await client.end();
  }
}

async function run() {
  await verifyTestUser();
  
  // Ask if we should create the user if not found
  console.log('\n📋 If test user was not found, run this script with "create" argument to create it:');
  console.log('   node verify-test-user.js create');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('create')) {
  createTestUser().catch(console.error);
} else {
  run().catch(console.error);
}

module.exports = { verifyTestUser, createTestUser };