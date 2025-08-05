const { Pool } = require('pg');

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

async function createSimpleTrainingTables() {
  try {
    console.log('Creating simplified training system tables...');

    // Enable UUID extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    console.log('✓ UUID extension enabled');

    // Create training_runs table - this is the core table we need
    await query(`
      CREATE TABLE IF NOT EXISTS training_runs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
        error_message TEXT,
        performance_metrics JSONB DEFAULT '{}',
        resource_usage JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Training runs table ready');

    // Create training_queue table for queue management
    await query(`
      CREATE TABLE IF NOT EXISTS training_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    // Create training_metrics table for real-time monitoring
    await query(`
      CREATE TABLE IF NOT EXISTS training_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    // Create model_versions table with simplified structure
    await query(`
      CREATE TABLE IF NOT EXISTS model_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        training_run_id UUID REFERENCES training_runs(id) ON DELETE CASCADE,
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

    // Create training_datasets table for processed data
    await query(`
      CREATE TABLE IF NOT EXISTS training_datasets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    // Create necessary indexes for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_training_runs_user_id ON training_runs(user_id);
      CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status);
      CREATE INDEX IF NOT EXISTS idx_training_runs_run_id ON training_runs(run_id);
      CREATE INDEX IF NOT EXISTS idx_model_versions_user_id ON model_versions(user_id);
      CREATE INDEX IF NOT EXISTS idx_model_versions_active ON model_versions(is_active);
      CREATE INDEX IF NOT EXISTS idx_training_queue_status ON training_queue(status);
      CREATE INDEX IF NOT EXISTS idx_training_queue_priority ON training_queue(priority);
      CREATE INDEX IF NOT EXISTS idx_training_metrics_job_id ON training_metrics(job_id);
      CREATE INDEX IF NOT EXISTS idx_training_metrics_timestamp ON training_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_training_datasets_user_id ON training_datasets(user_id);
    `);
    console.log('✓ Training system indexes ready');

    console.log('🎉 Simplified training system tables created successfully!');
  } catch (error) {
    console.error('❌ Training tables creation failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  createSimpleTrainingTables().then(() => {
    console.log('Training tables setup complete, exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('Training tables setup failed:', error);
    process.exit(1);
  });
}

module.exports = { createSimpleTrainingTables };