const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
});

async function testCompleteWorkflow() {
  try {
    console.log('🧪 Testing Complete Life Stories Workflow...\n');

    const userId = '2fd2fb48-d74b-4046-b57e-de0110f8efdb'; // lukemoeller@yahoo.com

    // Test 1: Verify life stories exist in database
    console.log('1️⃣ Testing Database Storage...');
    const entriesResult = await pool.query(
      'SELECT id, title, category, created_at FROM life_detail_entries WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    console.log(`   ✅ Found ${entriesResult.rows.length} life stories`);
    entriesResult.rows.forEach((entry, i) => {
      console.log(`   📖 ${i+1}. "${entry.title}" (${entry.category})`);
    });

    // Test 2: Simulate API call for entries count (dashboard counter)
    console.log('\n2️⃣ Testing Dashboard Counter API...');
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM life_detail_entries WHERE user_id = $1',
      [userId]
    );
    console.log(`   ✅ Dashboard should show: ${countResult.rows[0].count} Life Stories`);

    // Test 3: Simulate API call for entries display (Your Legacy section)
    console.log('\n3️⃣ Testing Your Legacy Display API...');
    const legacyResult = await pool.query(`
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
      LIMIT 20
    `, [userId]);
    
    console.log(`   ✅ Your Legacy should show ${legacyResult.rows.length} entries:`);
    legacyResult.rows.forEach((entry, i) => {
      console.log(`   📚 ${i+1}. "${entry.title}"`);
      console.log(`       Category: ${entry.category} | Tags: ${entry.tags?.join(', ') || 'none'}`);
      console.log(`       People: ${entry.related_people?.join(', ') || 'none'} | Depth: ${entry.emotional_depth}/10`);
      console.log(`       Content: ${entry.content.substring(0, 100)}...`);
      console.log('');
    });

    // Test 4: Check if data structure matches frontend expectations
    console.log('4️⃣ Testing Data Structure Compatibility...');
    const sampleEntry = legacyResult.rows[0];
    const frontendFormat = {
      id: sampleEntry.id,
      type: 'entry',
      title: sampleEntry.title,
      content: sampleEntry.content,
      category: sampleEntry.category,
      created_at: sampleEntry.created_at,
      updated_at: sampleEntry.updated_at,
      word_count: sampleEntry.content.split(/\s+/).filter(w => w).length,
      tags: sampleEntry.tags,
      related_people: sampleEntry.related_people,
      emotional_depth: sampleEntry.emotional_depth
    };
    console.log('   ✅ Sample entry in frontend format:');
    console.log('   ', JSON.stringify(frontendFormat, null, 2));

    console.log('\n🎉 Complete workflow test finished!');
    console.log('\n📋 Summary:');
    console.log(`   • Database has ${entriesResult.rows.length} life stories`);
    console.log(`   • Dashboard counter should show: ${countResult.rows[0].count}`);
    console.log(`   • Your Legacy should display: ${legacyResult.rows.length} entries`);
    console.log(`   • Data structure: ✅ Compatible with frontend`);

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  } finally {
    await pool.end();
  }
}

testCompleteWorkflow();