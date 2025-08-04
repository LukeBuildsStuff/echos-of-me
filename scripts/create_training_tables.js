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

async function createTrainingTables() {
  try {
    console.log('Creating training system tables...');

    // Enable UUID extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    console.log('✓ UUID extension enabled');

    // First add missing columns to users table
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS primary_role VARCHAR(100),
      ADD COLUMN IF NOT EXISTS important_people JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS cultural_background TEXT[],
      ADD COLUMN IF NOT EXISTS significant_events JSONB DEFAULT '[]'
    `);
    console.log('✓ Users table updated');

    // Create training_runs table
    await query(`
      CREATE TABLE IF NOT EXISTS training_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'queued',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        training_samples INTEGER DEFAULT 0,
        training_params JSONB DEFAULT '{}',
        base_model VARCHAR(255) DEFAULT 'microsoft/DialoGPT-medium',
        model_name VARCHAR(255),
        admin_initiated BOOLEAN DEFAULT false,
        batch_id UUID,
        model_version VARCHAR(10) DEFAULT '1',
        checkpoint_path TEXT,
        training_data JSONB DEFAULT '[]',
        error_message TEXT,
        performance_metrics JSONB DEFAULT '{}',
        resource_usage JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Training runs table ready');

    // Create model_versions table  
    await query(`
      CREATE TABLE IF NOT EXISTS model_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        base_model VARCHAR(255) NOT NULL,
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

    // Create voice_profiles table
    await query(`
      CREATE TABLE IF NOT EXISTS voice_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        voice_id VARCHAR(255) NOT NULL,
        profile_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'training',
        audio_files JSONB DEFAULT '[]',
        model_path TEXT,
        sample_rate INTEGER DEFAULT 22050,
        quality_score FLOAT DEFAULT 0,
        training_completed_at TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Voice profiles table ready');

    // Create voice_llm_integrations table
    await query(`
      CREATE TABLE IF NOT EXISTS voice_llm_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        voice_profile_id UUID REFERENCES voice_profiles(id) ON DELETE CASCADE,
        model_version_id UUID REFERENCES model_versions(id) ON DELETE CASCADE,
        integration_status VARCHAR(50) DEFAULT 'pending',
        alignment_score FLOAT DEFAULT 0,
        voice_text_mappings JSONB DEFAULT '{}',
        emotional_consistency JSONB DEFAULT '{}',
        speech_patterns JSONB DEFAULT '{}',
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Voice-LLM integrations table ready');

    // Create training_queue table
    await query(`
      CREATE TABLE IF NOT EXISTS training_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        priority VARCHAR(10) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'queued',
        queue_position INTEGER DEFAULT 0,
        estimated_duration INTEGER DEFAULT 120,
        resource_requirements JSONB DEFAULT '{}',
        queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_details JSONB DEFAULT '{}'
      )
    `);
    console.log('✓ Training queue table ready');

    // Create admin_training_queues table
    await query(`
      CREATE TABLE IF NOT EXISTS admin_training_queues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        queue_name VARCHAR(255) NOT NULL,
        config JSONB DEFAULT '{}',
        stats JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Admin training queues table ready');

    // Create training_metrics table for real-time monitoring
    await query(`
      CREATE TABLE IF NOT EXISTS training_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id VARCHAR(255) NOT NULL,
        epoch INTEGER DEFAULT 0,
        step INTEGER DEFAULT 0,
        loss FLOAT DEFAULT 0,
        learning_rate FLOAT DEFAULT 0,
        gpu_utilization FLOAT DEFAULT 0,
        memory_usage FLOAT DEFAULT 0,
        throughput FLOAT DEFAULT 0,
        estimated_time_remaining INTEGER DEFAULT 0,
        rtx5090_metrics JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Training metrics table ready');

    // Create model_deployments table
    await query(`
      CREATE TABLE IF NOT EXISTS model_deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        model_version_id UUID REFERENCES model_versions(id) ON DELETE CASCADE,
        deployment_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'deploying',
        endpoint_url TEXT,
        deployment_config JSONB DEFAULT '{}',
        health_status VARCHAR(50) DEFAULT 'unknown',
        last_health_check TIMESTAMP,
        deployed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Model deployments table ready');

    // Create training session analytics
    await query(`
      CREATE TABLE IF NOT EXISTS training_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_date DATE DEFAULT CURRENT_DATE,
        total_responses INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        categories_covered TEXT[] DEFAULT '{}',
        completion_rate FLOAT DEFAULT 0,
        quality_score FLOAT DEFAULT 0,
        emotional_range JSONB DEFAULT '{}',
        session_duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Training analytics table ready');

    // Create training datasets table for processed data
    await query(`
      CREATE TABLE IF NOT EXISTS training_datasets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        training_examples JSONB DEFAULT '[]',
        training_examples_count INTEGER DEFAULT 0,
        quality_metrics JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);
    console.log('✓ Training datasets table ready');

    // Create formatted training data table
    await query(`
      CREATE TABLE IF NOT EXISTS formatted_training_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        format_type VARCHAR(50) NOT NULL,
        formatted_data JSONB DEFAULT '[]',
        format_stats JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, format_type)
      )
    `);
    console.log('✓ Formatted training data table ready');

    // Create inference logs table
    await query(`
      CREATE TABLE IF NOT EXISTS inference_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        deployment_id UUID REFERENCES model_deployments(id) ON DELETE CASCADE,
        prompt_text TEXT NOT NULL,
        response_text TEXT,
        response_time_ms INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT false,
        options JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Inference logs table ready');

    // Create training workflows table
    await query(`
      CREATE TABLE IF NOT EXISTS training_workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'initializing',
        stages JSONB DEFAULT '{}',
        overall_progress INTEGER DEFAULT 0,
        estimated_completion TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log('✓ Training workflows table ready');

    // Create necessary indexes for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_training_runs_user_id ON training_runs(user_id);
      CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status);
      CREATE INDEX IF NOT EXISTS idx_training_runs_run_id ON training_runs(run_id);
      CREATE INDEX IF NOT EXISTS idx_model_versions_user_id ON model_versions(user_id);
      CREATE INDEX IF NOT EXISTS idx_model_versions_active ON model_versions(is_active);
      CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id ON voice_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_voice_profiles_voice_id ON voice_profiles(voice_id);
      CREATE INDEX IF NOT EXISTS idx_voice_llm_integrations_user_id ON voice_llm_integrations(user_id);
      CREATE INDEX IF NOT EXISTS idx_training_queue_status ON training_queue(status);
      CREATE INDEX IF NOT EXISTS idx_training_queue_priority ON training_queue(priority);
      CREATE INDEX IF NOT EXISTS idx_training_metrics_job_id ON training_metrics(job_id);
      CREATE INDEX IF NOT EXISTS idx_training_metrics_timestamp ON training_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_model_deployments_user_id ON model_deployments(user_id);
      CREATE INDEX IF NOT EXISTS idx_training_analytics_user_id ON training_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_training_analytics_date ON training_analytics(session_date);
      CREATE INDEX IF NOT EXISTS idx_training_datasets_user_id ON training_datasets(user_id);
      CREATE INDEX IF NOT EXISTS idx_formatted_training_data_user_id ON formatted_training_data(user_id);
      CREATE INDEX IF NOT EXISTS idx_formatted_training_data_format ON formatted_training_data(format_type);
      CREATE INDEX IF NOT EXISTS idx_inference_logs_user_id ON inference_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_inference_logs_deployment_id ON inference_logs(deployment_id);
      CREATE INDEX IF NOT EXISTS idx_inference_logs_created_at ON inference_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_training_workflows_user_id ON training_workflows(user_id);
      CREATE INDEX IF NOT EXISTS idx_training_workflows_status ON training_workflows(status);
    `);
    console.log('✓ Training system indexes ready');

    console.log('🎉 Training system tables created successfully!');
  } catch (error) {
    console.error('❌ Training tables creation failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  createTrainingTables().then(() => {
    console.log('Training tables setup complete, exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('Training tables setup failed:', error);
    process.exit(1);
  });
}

module.exports = { createTrainingTables };