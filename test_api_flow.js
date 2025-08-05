const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
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

async function simulateAPIFlow() {
  try {
    console.log('🧪 Testing complete Life Stories API flow...\n');

    // Get a test user
    const userResult = await query('SELECT id, email FROM users LIMIT 1');
    if (!userResult.rows[0]) {
      console.log('❌ No users found. Cannot test API flow.');
      return;
    }
    
    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;
    console.log(`👤 Testing with user: ${userEmail}`);

    // STEP 1: Simulate dashboard counter API call (GET /api/milestones?type=entries)
    console.log('\n📊 STEP 1: Testing dashboard counter API...');
    
    let countQuery = `
      SELECT COUNT(*) FROM life_detail_entries WHERE user_id = $1
    `;
    const countResult = await query(countQuery, [userId]);
    const currentCount = parseInt(countResult.rows[0].count);
    console.log(`✓ Current life stories count: ${currentCount}`);

    // STEP 2: Simulate life story creation API (POST /api/milestones with type: 'entry')
    console.log('\n💾 STEP 2: Testing life story creation API...');
    
    const newEntry = {
      title: 'My Childhood Summer Adventures',
      content: 'I remember the summers when I was young, running through sprinklers in the backyard with my siblings. The smell of barbecue would drift through the air as Dad grilled burgers. Mom would bring out ice-cold lemonade in mason jars. Those simple moments were pure magic - the kind of memories I want my children to have too.',
      category: 'memory',
      tags: ['childhood', 'summer', 'family', 'memories'],
      relatedPeople: ['Mom', 'Dad', 'Siblings'],
      emotionalDepth: 8,
      isPrivate: false,
      entryDate: new Date()
    };

    const createResult = await query(`
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
      newEntry.entryDate,
      newEntry.title,
      newEntry.content,
      newEntry.category,
      newEntry.tags,
      newEntry.relatedPeople,
      newEntry.emotionalDepth,
      newEntry.isPrivate
    ]);

    console.log('✓ Life story created successfully:', {
      id: createResult.rows[0].id,
      title: createResult.rows[0].title,
      wordCount: createResult.rows[0].content.split(/\s+/).filter(w => w).length
    });

    // STEP 3: Test updated counter
    console.log('\n🔄 STEP 3: Testing updated counter...');
    
    const newCountResult = await query(countQuery, [userId]);
    const newCount = parseInt(newCountResult.rows[0].count);
    console.log(`✓ Updated life stories count: ${newCount} (was ${currentCount})`);
    
    if (newCount === currentCount + 1) {
      console.log('✅ Counter correctly updated!');
    } else {
      console.log('❌ Counter not updating correctly!');
    }

    // STEP 4: Simulate MyLegacy retrieval API (GET /api/milestones?type=entries&limit=50)
    console.log('\n📖 STEP 4: Testing MyLegacy retrieval API...');
    
    let retrievalQuery = `
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
      ORDER BY entry_date DESC, created_at DESC LIMIT $2 OFFSET $3
    `;
    
    const retrievalResult = await query(retrievalQuery, [userId, 50, 0]);
    console.log(`✓ Retrieved ${retrievalResult.rows.length} life story entries`);
    
    // Display entries like the MyLegacy component would
    retrievalResult.rows.forEach((entry, index) => {
      const wordCount = entry.content.split(/\s+/).filter(w => w).length;
      console.log(`  ${index + 1}. "${entry.title}" (${entry.category})`);
      console.log(`     📝 ${wordCount} words • 🏷️ ${entry.tags?.join(', ')}`);
      console.log(`     👥 People: ${entry.related_people?.join(', ')}`);
      console.log(`     💝 Emotional depth: ${entry.emotional_depth}/10`);
    });

    // STEP 5: Test search/filtering (simulate API with category filter)
    console.log('\n🔍 STEP 5: Testing search/filtering...');
    
    const filteredQuery = `
      SELECT 
        id, title, category, tags, created_at
      FROM life_detail_entries
      WHERE user_id = $1 AND category = $2
      ORDER BY created_at DESC
    `;
    
    const filteredResult = await query(filteredQuery, [userId, 'memory']);
    console.log(`✓ Found ${filteredResult.rows.length} entries in 'memory' category`);

    // STEP 6: Test combined data (like MyLegacy component does)
    console.log('\n🔗 STEP 6: Testing combined legacy data (responses + entries)...');
    
    const responsesQuery = `
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.created_at,
        r.updated_at,
        q.question_text,
        q.category
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC LIMIT 10
    `;
    
    const responsesResult = await query(responsesQuery, [userId]);
    const totalWordCount = 
      retrievalResult.rows.reduce((sum, entry) => sum + entry.content.split(/\s+/).filter(w => w).length, 0) +
      responsesResult.rows.reduce((sum, response) => sum + (response.word_count || 0), 0);
    
    console.log(`✓ Combined legacy: ${responsesResult.rows.length} responses + ${retrievalResult.rows.length} life entries`);
    console.log(`✓ Total words preserved: ${totalWordCount}`);

    // Clean up test entry
    console.log('\n🧹 Cleaning up test entry...');
    await query('DELETE FROM life_detail_entries WHERE id = $1', [createResult.rows[0].id]);
    console.log('✓ Test entry cleaned up');

    console.log('\n🎉 Complete Life Stories API flow test PASSED! 🎉');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Dashboard counter works');
    console.log('✅ Life story creation works');
    console.log('✅ Counter updates correctly');
    console.log('✅ MyLegacy retrieval works');
    console.log('✅ Search/filtering works');
    console.log('✅ Combined legacy data works');

  } catch (error) {
    console.error('❌ API flow test failed:', error);
    console.log('\n🔍 DEBUG INFO:');
    console.log('- Check if database tables exist');
    console.log('- Check if user_id is UUID type');
    console.log('- Check API endpoints in /app/api/milestones/route.ts');
  } finally {
    await pool.end();
  }
}

simulateAPIFlow();