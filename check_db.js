const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function checkDB() {
  try {
    console.log('Checking database structure...');
    
    // Check if users table exists and its structure
    const usersCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table structure:');
    console.log(usersCheck.rows);
    
    // Check if life_detail_entries table exists
    const lifeEntriesCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'life_detail_entries' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Life detail entries table structure:');
    console.log(lifeEntriesCheck.rows);
    
    // Check if milestone_messages table exists
    const milestonesCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'milestone_messages' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Milestone messages table structure:');
    console.log(milestonesCheck.rows);
    
    // Check existing data counts
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const lifeEntriesCount = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name = 'life_detail_entries'
    `);
    const milestonesCount = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name = 'milestone_messages'
    `);
    
    console.log('Data counts:');
    console.log('Users:', userCount.rows[0].count);
    console.log('Life entries table exists:', lifeEntriesCount.rows[0].count > 0);
    console.log('Milestones table exists:', milestonesCount.rows[0].count > 0);
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDB();