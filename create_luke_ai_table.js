const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL
})

async function createLukeAITable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS luke_ai_sessions (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        messages JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        context TEXT,
        UNIQUE(id)
      )
    `)
    
    console.log('Luke AI sessions table created successfully')
    process.exit(0)
  } catch (error) {
    console.error('Failed to create table:', error)
    process.exit(1)
  }
}

createLukeAITable()