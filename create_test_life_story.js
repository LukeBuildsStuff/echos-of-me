const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
});

async function createTestLifeStory() {
  try {
    console.log('📝 Creating test life story...\n');

    // Use the first user from our debug results
    const userId = '2fd2fb48-d74b-4046-b57e-de0110f8efdb'; // lukemoeller@yahoo.com
    
    const testEntry = {
      user_id: userId,
      entry_date: new Date(),
      title: 'My First Day at High School',
      content: 'I remember walking through those big oak doors for the first time. I was terrified but excited at the same time. The hallways seemed endless, and I was worried I would get lost. But then I met Mrs. Johnson, my English teacher, who gave me the most welcoming smile and made me feel like I belonged. That moment taught me that sometimes the things we fear most can lead to wonderful new experiences.',
      category: 'memory',
      tags: ['school', 'first day', 'teacher', 'growth'],
      related_people: ['Mrs. Johnson'],
      emotional_depth: 7,
      attached_question_id: null,
      is_private: false
    };

    const result = await pool.query(`
      INSERT INTO life_detail_entries (
        user_id,
        entry_date,
        title,
        content,
        category,
        tags,
        related_people,
        emotional_depth,
        attached_question_id,
        is_private
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      testEntry.user_id,
      testEntry.entry_date,
      testEntry.title,
      testEntry.content,
      testEntry.category,
      testEntry.tags,
      testEntry.related_people,
      testEntry.emotional_depth,
      testEntry.attached_question_id,
      testEntry.is_private
    ]);

    console.log('✅ Test life story created successfully!');
    console.log('📊 Entry Details:', {
      id: result.rows[0].id,
      title: result.rows[0].title,
      category: result.rows[0].category,
      created_at: result.rows[0].created_at
    });

    // Verify it exists
    const countResult = await pool.query('SELECT COUNT(*) FROM life_detail_entries WHERE user_id = $1', [userId]);
    console.log(`📈 User now has ${countResult.rows[0].count} life stories`);

  } catch (error) {
    console.error('❌ Failed to create test life story:', error);
  } finally {
    await pool.end();
  }
}

createTestLifeStory();