const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
});

async function testTrainingDataPreparation() {
  try {
    console.log('🧪 Testing Training Data Preparation...\n');

    const userId = '2fd2fb48-d74b-4046-b57e-de0110f8efdb'; // lukemoeller@yahoo.com

    // 1. Check available responses for training
    console.log('1️⃣ Checking Question Responses...');
    const responses = await pool.query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.created_at,
        q.question_text,
        q.category
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE 
        r.user_id = $1
        AND r.word_count >= 20
        AND r.response_text IS NOT NULL
        AND LENGTH(r.response_text) > 50
      ORDER BY r.created_at ASC
    `, [userId]);

    console.log(`   ✅ Found ${responses.rows.length} question responses for training`);
    responses.rows.forEach((response, i) => {
      console.log(`   📝 ${i+1}. ${response.category}: ${response.word_count} words`);
    });

    // 2. Check life detail entries
    console.log('\n2️⃣ Checking Life Detail Entries...');
    const lifeEntries = await pool.query(`
      SELECT 
        id,
        title,
        content,
        category,
        tags,
        related_people,
        emotional_depth,
        created_at
      FROM life_detail_entries
      WHERE 
        user_id = $1
        AND LENGTH(content) > 100
        AND is_private = false
      ORDER BY created_at ASC
    `, [userId]);

    console.log(`   ✅ Found ${lifeEntries.rows.length} life entries for training`);
    lifeEntries.rows.forEach((entry, i) => {
      const wordCount = entry.content.split(/\s+/).filter(w => w).length;
      console.log(`   📖 ${i+1}. "${entry.title}" (${entry.category}): ${wordCount} words`);
      console.log(`       People: ${entry.related_people?.join(', ') || 'none'} | Depth: ${entry.emotional_depth}/10`);
    });

    // 3. Check milestone messages
    console.log('\n3️⃣ Checking Milestone Messages...');
    const milestones = await pool.query(`
      SELECT 
        id,
        milestone_type,
        recipient_name,
        message_title,
        message_content,
        trigger_date,
        trigger_age,
        emotional_tone,
        created_at
      FROM milestone_messages
      WHERE 
        user_id = $1
        AND LENGTH(message_content) > 50
      ORDER BY created_at ASC
    `, [userId]);

    console.log(`   ✅ Found ${milestones.rows.length} milestone messages for training`);
    milestones.rows.forEach((milestone, i) => {
      const wordCount = milestone.message_content.split(/\s+/).filter(w => w).length;
      console.log(`   💌 ${i+1}. ${milestone.milestone_type}: "${milestone.message_title}" (${wordCount} words)`);
    });

    // 4. Get user profile for context
    console.log('\n4️⃣ Checking User Profile Context...');
    const userProfile = await pool.query(`
      SELECT 
        name,
        email,
        primary_role,
        important_people,
        cultural_background,
        significant_events,
        created_at
      FROM users
      WHERE id = $1
    `, [userId]);

    if (userProfile.rows.length > 0) {
      const user = userProfile.rows[0];
      console.log(`   ✅ User Profile: ${user.name} (${user.primary_role || 'No role set'})`);
      console.log(`   👥 Important People: ${user.important_people?.join(', ') || 'Not specified'}`);
      console.log(`   🌍 Cultural Background: ${user.cultural_background || 'Not specified'}`);
      console.log(`   📅 Significant Events: ${user.significant_events?.join(', ') || 'Not specified'}`);
    }

    // 5. Calculate training data sufficiency
    console.log('\n5️⃣ Training Data Assessment...');
    const totalResponses = responses.rows.length;
    const totalLifeEntries = lifeEntries.rows.length;
    const totalMilestones = milestones.rows.length;
    const totalTrainingExamples = totalResponses + totalLifeEntries + totalMilestones;

    const totalWordCount = [
      ...responses.rows.map(r => r.word_count || 0),
      ...lifeEntries.rows.map(e => e.content.split(/\s+/).filter(w => w).length),
      ...milestones.rows.map(m => m.message_content.split(/\s+/).filter(w => w).length)
    ].reduce((sum, count) => sum + count, 0);

    console.log(`   📊 Total Training Examples: ${totalTrainingExamples}`);
    console.log(`   📝 Total Word Count: ${totalWordCount}`);
    console.log(`   🎯 Training Readiness: ${totalTrainingExamples >= 50 && totalWordCount >= 5000 ? '✅ READY' : '⚠️ NEEDS MORE DATA'}`);

    if (totalTrainingExamples < 50) {
      console.log(`   💡 Recommendation: Need ${50 - totalTrainingExamples} more examples (current: ${totalTrainingExamples})`);
    }

    if (totalWordCount < 5000) {
      console.log(`   💡 Recommendation: Need ${5000 - totalWordCount} more words (current: ${totalWordCount})`);
    }

    // 6. Sample training format
    if (totalTrainingExamples > 0) {
      console.log('\n6️⃣ Sample Training Format...');
      
      if (responses.rows.length > 0) {
        const sampleResponse = responses.rows[0];
        console.log('   📋 Sample Question Response Training Example:');
        console.log(`   Input: "${sampleResponse.question_text}"`);
        console.log(`   Output: "${sampleResponse.response_text.substring(0, 150)}..."`);
      }

      if (lifeEntries.rows.length > 0) {
        const sampleEntry = lifeEntries.rows[0];
        console.log('\n   📋 Sample Life Entry Training Example:');
        console.log(`   Input: "Tell me about ${sampleEntry.title.toLowerCase()}"`);
        console.log(`   Output: "${sampleEntry.content.substring(0, 150)}..."`);
      }
    }

    console.log('\n🎉 Training Data Preparation Test Complete!');

  } catch (error) {
    console.error('❌ Training data preparation test failed:', error);
  } finally {
    await pool.end();
  }
}

testTrainingDataPreparation();