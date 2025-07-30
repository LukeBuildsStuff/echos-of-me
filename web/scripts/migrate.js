const { Pool } = require('pg');

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.log('Please set DATABASE_URL in your .env.local file');
  console.log('Example: DATABASE_URL=postgresql://username:password@localhost:5432/database_name');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 100) + '...', duration, rows: res.rowCount });
  return res;
}

async function migrate() {
  try {
    console.log('Starting database migration...');

    // Create users table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table ready');

    // Create questions table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question_text TEXT NOT NULL,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        role_preference VARCHAR(50),
        difficulty_level INTEGER DEFAULT 1,
        question_type VARCHAR(50) DEFAULT 'reflection',
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Questions table ready');

    // Create responses table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        response_text TEXT NOT NULL,
        word_count INTEGER DEFAULT 0,
        is_draft BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Responses table ready');

    // Create milestone_messages table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS milestone_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        milestone_type VARCHAR(100) NOT NULL,
        custom_milestone_name VARCHAR(255),
        recipient_name VARCHAR(255),
        message_title VARCHAR(500) NOT NULL,
        message_content TEXT NOT NULL,
        trigger_date DATE,
        trigger_age INTEGER,
        trigger_event VARCHAR(255),
        emotional_tone VARCHAR(50) DEFAULT 'loving',
        tags TEXT[] DEFAULT '{}',
        is_private BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Milestone messages table ready');

    // Create life_detail_entries table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS life_detail_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        entry_date DATE DEFAULT CURRENT_DATE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'memory',
        tags TEXT[] DEFAULT '{}',
        related_people TEXT[] DEFAULT '{}',
        emotional_depth INTEGER DEFAULT 5 CHECK (emotional_depth >= 1 AND emotional_depth <= 10),
        attached_question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
        is_private BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Life detail entries table ready');

    // Create user_roles table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        primary_role VARCHAR(100) NOT NULL,
        secondary_roles TEXT[] DEFAULT '{}',
        family_members JSONB DEFAULT '{}',
        interests TEXT[] DEFAULT '{}',
        life_stage VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ User roles table ready');

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_milestone_messages_user_id ON milestone_messages(user_id);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_life_detail_entries_user_id ON life_detail_entries(user_id);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_life_detail_entries_category ON life_detail_entries(category);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_life_detail_entries_entry_date ON life_detail_entries(entry_date);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
    `);
    console.log('✓ Database indexes ready');

    console.log('🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrate().then(() => {
    console.log('Migration complete, exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrate };