const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testLifeStories() {
  try {
    console.log('Testing life stories functionality...');

    // Get a test user ID
    const userResult = await pool.query('SELECT id, email FROM users LIMIT 1');
    if (!userResult.rows[0]) {
      console.log('No users found in database. Cannot test life stories.');
      return;
    }
    
    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;
    console.log(`Testing with user: ${userEmail} (${userId})`);

    // Test creating a life detail entry
    console.log('\n1. Testing life story creation...');
    const createResult = await pool.query(`
      INSERT INTO life_detail_entries (
        user_id,
        entry_date,
        title,
        content,
        category,
        tags,
        related_people,
        emotional_depth,
        is_private
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      userId,
      new Date(),
      'Test Life Story Entry',
      'This is a test life story content. It contains memories and reflections about my life.',
      'memory',
      ['test', 'memory', 'family'],
      ['Mom', 'Dad', 'Sister'],
      8,
      false
    ]);

    console.log('✓ Life story entry created:', {
      id: createResult.rows[0].id,
      title: createResult.rows[0].title,
      category: createResult.rows[0].category
    });

    // Test retrieving life detail entries
    console.log('\n2. Testing life story retrieval...');
    const retrievalResult = await pool.query(`
      SELECT 
        id,
        entry_date,
        title,
        content,
        category,
        tags,
        related_people,
        emotional_depth,
        is_private,
        created_at,
        updated_at
      FROM life_detail_entries
      WHERE user_id = $1
      ORDER BY entry_date DESC, created_at DESC
    `, [userId]);

    console.log(`✓ Found ${retrievalResult.rows.length} life story entries for user`);
    retrievalResult.rows.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.title} (${entry.category}) - ${entry.tags?.join(', ')}`);
    });

    // Test counting entries
    console.log('\n3. Testing life story counter...');
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM life_detail_entries WHERE user_id = $1',
      [userId]
    );
    console.log(`✓ Total life stories count: ${countResult.rows[0].count}`);

    // Test API-like query with filtering
    console.log('\n4. Testing filtered retrieval (like API)...');
    const filteredResult = await pool.query(`
      SELECT 
        id,
        entry_date,
        title,
        content,
        category,
        tags,
        related_people,
        emotional_depth,
        is_private,
        created_at,
        updated_at
      FROM life_detail_entries
      WHERE user_id = $1 AND category = $2
      ORDER BY entry_date DESC, created_at DESC 
      LIMIT $3 OFFSET $4
    `, [userId, 'memory', 20, 0]);

    console.log(`✓ Filtered query returned ${filteredResult.rows.length} entries`);

    // Clean up test entry
    console.log('\n5. Cleaning up test entry...');
    await pool.query('DELETE FROM life_detail_entries WHERE user_id = $1 AND title = $2', 
      [userId, 'Test Life Story Entry']);
    console.log('✓ Test entry cleaned up');

    console.log('\n🎉 All life stories tests passed successfully!');

  } catch (error) {
    console.error('❌ Life stories test failed:', error);
  } finally {
    await pool.end();
  }
}

testLifeStories();