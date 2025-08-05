const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
});

async function checkTables() {
  const client = await pool.connect();
  try {
    // Check if user_sessions table exists
    const sessionsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_sessions'
      )
    `);
    
    console.log('user_sessions table exists:', sessionsExists.rows[0].exists);
    
    if (!sessionsExists.rows[0].exists) {
      console.log('Creating user_sessions table...');
      await client.query(`
        CREATE TABLE user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          session_date DATE NOT NULL,
          questions_answered INTEGER DEFAULT 0,
          total_words INTEGER DEFAULT 0,
          avg_response_time FLOAT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, session_date)
        )
      `);
      console.log('✅ user_sessions table created');
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();