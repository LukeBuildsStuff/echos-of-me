const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function createTestUser() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    
    // Insert test user
    const result = await pool.query(`
      INSERT INTO users (email, name, password_hash, is_active, is_admin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, name, is_active
    `, ['test@example.com', 'Test User', hashedPassword, true, false]);
    
    console.log('Test user created/updated:', result.rows[0]);
    
    // Verify we can query the user
    const verifyResult = await pool.query('SELECT id, email, name, is_active FROM users WHERE email = $1', ['test@example.com']);
    console.log('Verification query result:', verifyResult.rows[0]);
    
  } catch (error) {
    console.error('Error creating test user:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUser();