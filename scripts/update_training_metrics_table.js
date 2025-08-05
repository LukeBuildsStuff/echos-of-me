const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://personalai:personalai123@localhost:5432/personalai',
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

async function updateTrainingMetricsTable() {
  try {
    console.log('Updating training_metrics table with missing columns...');

    // Add missing columns to training_metrics table
    await query(`
      ALTER TABLE training_metrics 
      ADD COLUMN IF NOT EXISTS samples_per_second FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS current_lr FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gradient_norm FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_steps INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_epochs INTEGER DEFAULT 0
    `);
    console.log('✓ Training metrics table updated with missing columns');

    // Add unique constraint for job_id + timestamp to avoid duplicates
    try {
      await query(`
        ALTER TABLE training_metrics 
        ADD CONSTRAINT unique_job_timestamp 
        UNIQUE (job_id, timestamp)
      `);
      console.log('✓ Added unique constraint for training metrics');
    } catch (error) {
      if (error.code === '23505' || error.message.includes('already exists')) {
        console.log('✓ Unique constraint already exists');
      } else {
        console.log('⚠️ Could not add unique constraint (may already exist):', error.message);
      }
    }

    console.log('🎉 Training metrics table update completed successfully!');
  } catch (error) {
    console.error('❌ Training metrics table update failed:', error);
    process.exit(1);
  }
}

// Run update if this script is executed directly
if (require.main === module) {
  updateTrainingMetricsTable().then(() => {
    console.log('Training metrics table update complete, exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('Training metrics table update failed:', error);
    process.exit(1);
  });
}

module.exports = { updateTrainingMetricsTable };