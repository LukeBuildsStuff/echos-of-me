const { Pool } = require('pg');

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
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

async function createAIConversationsTable() {
  try {
    console.log('Checking users table schema...');
    
    // Check users table structure
    const usersResult = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    if (usersResult.rows.length === 0) {
      console.error('❌ Users table not found');
      process.exit(1);
    }
    
    const userIdType = usersResult.rows[0].data_type;
    console.log(`Users table id column type: ${userIdType}`);
    
    // Determine the correct type for foreign keys
    const userIdColumnType = userIdType === 'uuid' ? 'UUID' : 'INTEGER';
    
    console.log('Creating AI conversations and related tables...');

    // Create ai_conversations table
    await query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id ${userIdColumnType === 'UUID' ? 'UUID' : 'SERIAL'} PRIMARY KEY ${userIdColumnType === 'UUID' ? 'DEFAULT gen_random_uuid()' : ''},
        user_id ${userIdColumnType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id VARCHAR(255) NOT NULL,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        model_version VARCHAR(50),
        response_source VARCHAR(50) DEFAULT 'synthesis',
        confidence_score FLOAT DEFAULT 0.8,
        response_time_ms INTEGER DEFAULT 1000,
        emotional_tone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ AI conversations table ready');

    // Create model_deployments table if it doesn't exist (with correct foreign key type)
    await query(`
      CREATE TABLE IF NOT EXISTS model_deployments (
        id ${userIdColumnType === 'UUID' ? 'UUID' : 'SERIAL'} PRIMARY KEY ${userIdColumnType === 'UUID' ? 'DEFAULT gen_random_uuid()' : ''},
        user_id ${userIdColumnType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        model_path TEXT NOT NULL,
        model_version VARCHAR(50) NOT NULL,
        deployment_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'deploying',
        endpoint_url TEXT,
        deployment_config JSONB DEFAULT '{}',
        health_status VARCHAR(50) DEFAULT 'unknown',
        last_health_check TIMESTAMP,
        deployed_at TIMESTAMP,
        unloaded_at TIMESTAMP,
        memory_usage_gb FLOAT DEFAULT 4.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Model deployments table ready');

    // Create inference_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS inference_logs (
        id ${userIdColumnType === 'UUID' ? 'UUID' : 'SERIAL'} PRIMARY KEY ${userIdColumnType === 'UUID' ? 'DEFAULT gen_random_uuid()' : ''},
        user_id ${userIdColumnType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        model_version VARCHAR(50),
        query_length INTEGER DEFAULT 0,
        response_length INTEGER DEFAULT 0,
        response_time_ms INTEGER DEFAULT 0,
        confidence_score FLOAT DEFAULT 0.8,
        emotional_tone VARCHAR(50),
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Inference logs table ready');

    // Create model_versions table (simplified version compatible with existing users table)
    await query(`
      CREATE TABLE IF NOT EXISTS model_versions (
        id ${userIdColumnType === 'UUID' ? 'UUID' : 'SERIAL'} PRIMARY KEY ${userIdColumnType === 'UUID' ? 'DEFAULT gen_random_uuid()' : ''},
        user_id ${userIdColumnType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        base_model VARCHAR(255) NOT NULL DEFAULT 'mistralai/Mistral-7B-Instruct-v0.3',
        training_examples INTEGER DEFAULT 0,
        performance JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'training',
        checkpoint_path TEXT,
        model_size INTEGER DEFAULT 0,
        training_time FLOAT DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Model versions table ready');

    // Create indexes for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_conversation_id ON ai_conversations(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);
      CREATE INDEX IF NOT EXISTS idx_model_deployments_user_id ON model_deployments(user_id);
      CREATE INDEX IF NOT EXISTS idx_model_deployments_status ON model_deployments(status);
      CREATE INDEX IF NOT EXISTS idx_model_versions_user_id ON model_versions(user_id);
      CREATE INDEX IF NOT EXISTS idx_model_versions_active ON model_versions(is_active);
      CREATE INDEX IF NOT EXISTS idx_inference_logs_user_id ON inference_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_inference_logs_created_at ON inference_logs(created_at);
    `);
    console.log('✓ AI conversation indexes ready');

    console.log('🎉 AI conversations tables created successfully!');
  } catch (error) {
    console.error('❌ AI conversations table creation failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  createAIConversationsTable().then(() => {
    console.log('AI conversations tables setup complete, exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('AI conversations tables setup failed:', error);
    process.exit(1);
  });
}

module.exports = { createAIConversationsTable };