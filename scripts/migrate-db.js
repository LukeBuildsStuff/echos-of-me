/**
 * Database Migration Script
 * Creates tables needed for the HTML-based Personal AI Clone
 * Reuses existing NextJS database schema with minor additions
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Migration SQL statements
const migrations = [
  {
    name: 'add_ai_conversations_table',
    description: 'Create AI conversations table for chat history',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_id ON ai_conversations(session_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);
    `
  },
  
  {
    name: 'add_user_sessions_table',
    description: 'Create user sessions table for daily activity tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_date DATE NOT NULL,
        questions_answered INTEGER DEFAULT 0,
        total_words INTEGER DEFAULT 0,
        avg_response_time DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, session_date)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_date ON user_sessions(user_id, session_date);
    `
  },
  
  {
    name: 'ensure_required_columns',
    description: 'Ensure all required columns exist in existing tables',
    sql: `
      -- Add is_admin column to users if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_admin'
        ) THEN
          ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
      
      -- Add is_active column to questions if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'questions' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE questions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
      END $$;
      
      -- Add word_count column to responses if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'responses' AND column_name = 'word_count'
        ) THEN
          ALTER TABLE responses ADD COLUMN word_count INTEGER DEFAULT 0;
        END IF;
      END $$;
      
      -- Add is_draft column to responses if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'responses' AND column_name = 'is_draft'
        ) THEN
          ALTER TABLE responses ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `
  },
  
  {
    name: 'create_indexes',
    description: 'Create performance indexes',
    sql: `
      -- Indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
      CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id);
      CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
      CREATE INDEX IF NOT EXISTS idx_responses_is_draft ON responses(is_draft);
      
      CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
      CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
    `
  },
  
  {
    name: 'update_existing_data',
    description: 'Update existing data to work with new schema',
    sql: `
      -- Update word counts for existing responses
      UPDATE responses 
      SET word_count = array_length(string_to_array(trim(response_text), ' '), 1)
      WHERE word_count = 0 OR word_count IS NULL;
      
      -- Ensure at least one admin user exists (update lukemoeller@yahoo.com if it exists)
      UPDATE users 
      SET is_admin = TRUE 
      WHERE email = 'lukemoeller@yahoo.com' AND is_admin = FALSE;
      
      -- Mark all existing questions as active
      UPDATE questions 
      SET is_active = TRUE 
      WHERE is_active IS NULL;
    `
  }
];

// Track completed migrations
const createMigrationsTable = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations tracking table
    await client.query(createMigrationsTable);
    console.log('✅ Migrations table ready');
    
    // Get already executed migrations
    const executedResult = await client.query('SELECT name FROM migrations');
    const executedMigrations = new Set(executedResult.rows.map(row => row.name));
    
    // Run pending migrations
    for (const migration of migrations) {
      if (executedMigrations.has(migration.name)) {
        console.log(`⏭️  Skipping ${migration.name} (already executed)`);
        continue;
      }
      
      console.log(`🔄 Running migration: ${migration.name}`);
      console.log(`   Description: ${migration.description}`);
      
      try {
        // Start transaction for this migration
        await client.query('BEGIN');
        
        // Execute migration SQL
        await client.query(migration.sql);
        
        // Record migration as completed
        await client.query(
          'INSERT INTO migrations (name, description) VALUES ($1, $2)',
          [migration.name, migration.description]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Migration ${migration.name} completed successfully`);
        
      } catch (migrationError) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error(`❌ Migration ${migration.name} failed:`, migrationError.message);
        throw migrationError;
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
    // Verify database structure
    await verifyDatabaseStructure(client);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

async function verifyDatabaseStructure(client) {
  console.log('🔍 Verifying database structure...');
  
  try {
    // Check that all required tables exist
    const tables = ['users', 'questions', 'responses', 'ai_conversations', 'user_sessions'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        throw new Error(`Required table '${table}' does not exist`);
      }
    }
    
    // Check admin user exists
    const adminResult = await client.query('SELECT COUNT(*) as count FROM users WHERE is_admin = true');
    const adminCount = parseInt(adminResult.rows[0].count);
    
    if (adminCount === 0) {
      console.log('⚠️  Warning: No admin users found. You may need to manually set a user as admin.');
    } else {
      console.log(`✅ Found ${adminCount} admin user(s)`);
    }
    
    // Check questions exist
    const questionsResult = await client.query('SELECT COUNT(*) as count FROM questions WHERE is_active = true');
    const questionsCount = parseInt(questionsResult.rows[0].count);
    
    if (questionsCount === 0) {
      console.log('⚠️  Warning: No active questions found. Run the seed script to add questions.');
    } else {
      console.log(`✅ Found ${questionsCount} active questions`);
    }
    
    console.log('✅ Database structure verification completed');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    throw error;
  }
}

// Show help information
function showHelp() {
  console.log(`
Personal AI Clone - Database Migration Tool

Usage: node scripts/migrate-db.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what migrations would run without executing
  --force        Force re-run all migrations (destructive!)

Environment Variables:
  DATABASE_URL   PostgreSQL connection string (required)

Examples:
  node scripts/migrate-db.js
  node scripts/migrate-db.js --dry-run
  node scripts/migrate-db.js --help
  `);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('🏃 Dry run mode - showing pending migrations:');
  migrations.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration.name}`);
    console.log(`   Description: ${migration.description}`);
  });
  console.log(`\\nTotal migrations: ${migrations.length}`);
  process.exit(0);
}

// Check required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.log('   Set it in your .env file or environment');
  process.exit(1);
}

// Run migrations
runMigrations().catch(error => {
  console.error('💥 Migration process failed:', error);
  process.exit(1);
});