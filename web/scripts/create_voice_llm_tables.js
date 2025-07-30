const { Client } = require('pg');

async function createVoiceLLMTables() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'personal_ai_clone',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create voice_llm_integrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_llm_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        voice_id VARCHAR(255) NOT NULL,
        training_job_id UUID,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        integration_config JSONB,
        voice_quality_score DECIMAL(5,2),
        training_metrics JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        
        UNIQUE(user_id, voice_id)
      );
    `);

    // Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_llm_integrations_user_id 
      ON voice_llm_integrations(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_llm_integrations_status 
      ON voice_llm_integrations(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_llm_integrations_training_job_id 
      ON voice_llm_integrations(training_job_id);
    `);

    // Add columns to existing training_runs table for voice integration
    await client.query(`
      ALTER TABLE training_runs 
      ADD COLUMN IF NOT EXISTS integration_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS voice_profile_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS integration_metrics JSONB,
      ADD COLUMN IF NOT EXISTS voice_quality_score DECIMAL(5,2);
    `);

    // Create index for integration type
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_runs_integration_type 
      ON training_runs(integration_type);
    `);

    // Create voice_training_sessions table for detailed tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_training_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        voice_id VARCHAR(255) NOT NULL,
        session_type VARCHAR(50) NOT NULL, -- 'recording', 'processing', 'integration'
        session_data JSONB NOT NULL,
        quality_metrics JSONB,
        duration_seconds INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Add indexes for voice training sessions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_training_sessions_user_id 
      ON voice_training_sessions(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_training_sessions_voice_id 
      ON voice_training_sessions(voice_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_training_sessions_type 
      ON voice_training_sessions(session_type);
    `);

    console.log('✅ Voice-LLM integration tables created successfully');

    // Insert sample data for testing
    console.log('Creating sample voice-LLM integration data...');
    
    // This would typically be populated by actual integration processes
    await client.query(`
      INSERT INTO voice_llm_integrations (user_id, voice_id, status, integration_config, voice_quality_score)
      SELECT 
        u.id,
        'sample_voice_latest',
        'ready',
        '{"voice_weight": 0.7, "text_weight": 0.8, "emotional_alignment": true}',
        85.5
      FROM users u
      WHERE u.email = 'demo@example.com'
      ON CONFLICT (user_id, voice_id) DO NOTHING;
    `);

    console.log('✅ Sample data created');

  } catch (error) {
    console.error('❌ Error creating voice-LLM tables:', error);
    throw error;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  createVoiceLLMTables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createVoiceLLMTables;