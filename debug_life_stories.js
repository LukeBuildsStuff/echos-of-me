const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
});

async function debugLifeStories() {
  try {
    console.log('🔍 Debugging Life Stories System...\n');

    // Check if life_detail_entries table exists and has data
    const entriesResult = await pool.query('SELECT COUNT(*) FROM life_detail_entries');
    console.log(`📊 Life Detail Entries Count: ${entriesResult.rows[0].count}`);

    // Get sample entries if any exist
    const sampleEntries = await pool.query('SELECT id, title, content, category, created_at FROM life_detail_entries LIMIT 3');
    console.log(`📝 Sample Entries:`, sampleEntries.rows);

    // Check users table to understand user IDs
    const usersResult = await pool.query('SELECT id, email FROM users LIMIT 3');
    console.log(`👤 Sample Users:`, usersResult.rows);

    // Check if there are milestone messages for comparison
    const milestonesResult = await pool.query('SELECT COUNT(*) FROM milestone_messages');
    console.log(`💌 Milestone Messages Count: ${milestonesResult.rows[0].count}`);

    console.log('\n✅ Debug complete!');
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugLifeStories();