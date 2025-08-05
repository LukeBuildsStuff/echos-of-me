const { Pool } = require('pg');

// Production database migration script for Neon PostgreSQL
// This script handles the migration from local Docker setup to Neon

// Validate environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.log('\nPlease set these variables in your environment or .env file');
  process.exit(1);
}

// Enhanced connection pool for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Neon has connection limits
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 60000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Enhanced query function with retry logic for Neon
async function query(text, params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`✓ Query executed (attempt ${attempt}/${retries})`, { 
        duration: `${duration}ms`, 
        rows: res.rowCount,
        query: text.substring(0, 80) + (text.length > 80 ? '...' : '')
      });
      return res;
    } catch (error) {
      console.error(`❌ Query failed (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) {
        throw error;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Check if we're migrating from existing data
async function checkExistingData() {
  try {
    const result = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    return result.rows.length > 0;
  } catch (error) {
    console.log('No existing tables found (fresh database)');
    return false;
  }
}

async function migrateToProduction() {
  try {
    console.log('🚀 Starting production database migration for Neon PostgreSQL...');
    console.log(`📡 Connecting to: ${process.env.DATABASE_URL.split('@')[1]}`);

    const hasExistingData = await checkExistingData();
    if (hasExistingData) {
      console.log('📋 Existing tables found, performing incremental migration...');
    } else {
      console.log('🗄️ Fresh database detected, performing full migration...');
    }

    // Create core tables with enhanced schema for production
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        last_login_at TIMESTAMP,
        login_count INTEGER DEFAULT 0,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table ready with enhanced security features');

    // Add user preferences for production
    await query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'light',
        timezone VARCHAR(50) DEFAULT 'UTC',
        email_notifications BOOLEAN DEFAULT true,
        privacy_level VARCHAR(20) DEFAULT 'normal',
        ai_training_consent BOOLEAN DEFAULT false,
        data_retention_days INTEGER DEFAULT 365,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✓ User preferences table ready');

    // Enhanced questions table with AI training metadata
    await query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question_text TEXT NOT NULL,
        category VARCHAR(100),
        subcategory VARCHAR(100),
        role_preference VARCHAR(50),
        difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
        question_type VARCHAR(50) DEFAULT 'reflection',
        tags TEXT[],
        ai_generated BOOLEAN DEFAULT false,
        quality_score DECIMAL(3,2) DEFAULT 0.00,
        usage_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Questions table ready with AI training features');

    // Enhanced responses table with training metadata
    await query(`
      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        response_text TEXT NOT NULL,
        word_count INTEGER DEFAULT 0,
        character_count INTEGER DEFAULT 0,
        is_draft BOOLEAN DEFAULT false,
        is_training_data BOOLEAN DEFAULT false,
        quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
        emotional_tone VARCHAR(50),
        privacy_level VARCHAR(20) DEFAULT 'private',
        processing_status VARCHAR(50) DEFAULT 'pending',
        ai_feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Responses table ready with training metadata');

    // Training runs table for RTX 5090 integration
    await query(`
      CREATE TABLE IF NOT EXISTS training_runs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        run_name VARCHAR(255) NOT NULL,
        model_type VARCHAR(100) DEFAULT 'personal-ai',
        training_data_size INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'queued',
        progress_percentage DECIMAL(5,2) DEFAULT 0.00,
        gpu_utilized VARCHAR(50),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        model_output_path TEXT,
        performance_metrics JSONB,
        resource_usage JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Training runs table ready for RTX integration');

    // Voice training data for voice cloning
    await query(`
      CREATE TABLE IF NOT EXISTS voice_samples (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sample_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        duration_seconds DECIMAL(10,2),
        quality_score DECIMAL(3,2),
        processing_status VARCHAR(50) DEFAULT 'uploaded',
        transcription TEXT,
        voice_characteristics JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Voice samples table ready');

    // All other existing tables...
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
        delivery_status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Milestone messages table ready');

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
        ai_analysis JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Life detail entries table ready');

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✓ User roles table ready');

    // Admin tables for monitoring and analytics
    await query(`
      CREATE TABLE IF NOT EXISTS admin_analytics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15,2) NOT NULL,
        metric_type VARCHAR(50) DEFAULT 'counter',
        tags JSONB DEFAULT '{}',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Admin analytics table ready');

    await query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        log_level VARCHAR(20) NOT NULL,
        service_name VARCHAR(100),
        message TEXT NOT NULL,
        metadata JSONB,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ System logs table ready');

    // Create comprehensive indexes for production performance
    const indexes = [
      // User-related indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at)',
      
      // Response-related indexes
      'CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_responses_question_id ON responses(question_id)',
      'CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_responses_training_data ON responses(is_training_data)',
      'CREATE INDEX IF NOT EXISTS idx_responses_privacy ON responses(privacy_level)',
      
      // Question-related indexes
      'CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category)',
      'CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type)',
      'CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags)',
      
      // Training-related indexes
      'CREATE INDEX IF NOT EXISTS idx_training_runs_user_id ON training_runs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status)',
      'CREATE INDEX IF NOT EXISTS idx_training_runs_created_at ON training_runs(created_at)',
      
      // Voice-related indexes
      'CREATE INDEX IF NOT EXISTS idx_voice_samples_user_id ON voice_samples(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_voice_samples_status ON voice_samples(processing_status)',
      
      // Life detail indexes
      'CREATE INDEX IF NOT EXISTS idx_life_detail_entries_user_id ON life_detail_entries(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_life_detail_entries_category ON life_detail_entries(category)',
      'CREATE INDEX IF NOT EXISTS idx_life_detail_entries_entry_date ON life_detail_entries(entry_date)',
      'CREATE INDEX IF NOT EXISTS idx_life_detail_entries_tags ON life_detail_entries USING GIN(tags)',
      
      // Milestone indexes
      'CREATE INDEX IF NOT EXISTS idx_milestone_messages_user_id ON milestone_messages(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_milestone_messages_trigger_date ON milestone_messages(trigger_date)',
      'CREATE INDEX IF NOT EXISTS idx_milestone_messages_status ON milestone_messages(delivery_status)',
      
      // Analytics indexes
      'CREATE INDEX IF NOT EXISTS idx_analytics_metric_name ON admin_analytics(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_recorded_at ON admin_analytics(recorded_at)',
      
      // System log indexes
      'CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(log_level)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service_name)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id)',
    ];

    console.log('📊 Creating production indexes...');
    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
      } catch (error) {
        console.warn(`⚠️ Index creation warning: ${error.message}`);
      }
    }
    console.log('✓ Production indexes ready');

    // Create updated_at trigger function for automatic timestamp updates
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Apply triggers to tables with updated_at columns
    const tablesWithUpdatedAt = [
      'users', 'user_preferences', 'questions', 'responses', 
      'training_runs', 'voice_samples', 'milestone_messages', 
      'life_detail_entries', 'user_roles'
    ];

    for (const table of tablesWithUpdatedAt) {
      await query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    console.log('✓ Automatic timestamp triggers ready');

    // Insert default admin user if none exists
    const adminCheck = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    if (parseInt(adminCheck.rows[0].count) === 0) {
      await query(`
        INSERT INTO users (email, name, role, is_active, email_verified) 
        VALUES ('admin@echosofme.io', 'System Admin', 'admin', true, true)
        ON CONFLICT (email) DO NOTHING
      `);
      console.log('✓ Default admin user created');
    }

    // Database health and performance check
    const healthCheck = await query('SELECT version(), current_database(), current_user, NOW()');
    console.log('📊 Database Health Check:');
    console.log(`   PostgreSQL Version: ${healthCheck.rows[0].version.split(' ')[0]} ${healthCheck.rows[0].version.split(' ')[1]}`);
    console.log(`   Database: ${healthCheck.rows[0].current_database}`);
    console.log(`   User: ${healthCheck.rows[0].current_user}`);
    console.log(`   Connection Time: ${healthCheck.rows[0].now}`);

    console.log('🎉 Production database migration completed successfully!');
    console.log('🔧 Database is ready for Neon PostgreSQL with enhanced features');
    
  } catch (error) {
    console.error('❌ Production migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateToProduction().then(() => {
    console.log('Migration complete, exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateToProduction };