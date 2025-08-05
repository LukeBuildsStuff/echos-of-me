const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
});

async function createSecondTestStory() {
  try {
    console.log('📝 Creating second test life story...\n');

    const userId = '2fd2fb48-d74b-4046-b57e-de0110f8efdb'; // lukemoeller@yahoo.com
    
    const testEntry = {
      user_id: userId,
      entry_date: new Date(),
      title: 'The Day I Learned to Drive',
      content: 'Dad took me out to the empty parking lot behind the old shopping center. His hands were white-knuckling the door handle, but he tried to stay calm. "Easy on the brake," he kept saying. I was so nervous I stalled the car three times before we even left the parking spot. But when I finally got it going and made my first successful turn, the look of pride on his face was worth all the embarrassment. That day I learned that patience and practice can turn fear into confidence.',
      category: 'story',
      tags: ['driving', 'father', 'learning', 'pride'],
      related_people: ['Dad'],
      emotional_depth: 8,
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

    console.log('✅ Second test life story created successfully!');
    console.log('📊 Entry Details:', {
      id: result.rows[0].id,
      title: result.rows[0].title,
      category: result.rows[0].category,
      created_at: result.rows[0].created_at
    });

    // Verify total count
    const countResult = await pool.query('SELECT COUNT(*) FROM life_detail_entries WHERE user_id = $1', [userId]);
    console.log(`📈 User now has ${countResult.rows[0].count} life stories total`);

  } catch (error) {
    console.error('❌ Failed to create second test life story:', error);
  } finally {
    await pool.end();
  }
}

createSecondTestStory();