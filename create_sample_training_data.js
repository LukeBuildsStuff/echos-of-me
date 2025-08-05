const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://personalai:personalai123@localhost:5432/personalai",
});

async function createSampleTrainingData() {
  try {
    console.log('📝 Creating sample training data for LLM training...\n');

    const userId = '2fd2fb48-d74b-4046-b57e-de0110f8efdb'; // lukemoeller@yahoo.com

    // Create additional life detail entries
    const additionalEntries = [
      {
        title: 'The Lesson My Father Taught Me About Hard Work',
        content: 'My father was a man who believed that honest work was the foundation of character. Every morning at 5 AM, he would get up and prepare for his job at the factory. He never complained, even when his back ached or when times were tough. One summer when I was fifteen, he took me to work with him. I watched him operate those massive machines with such precision and care. During lunch, he said something that stuck with me forever: "Son, it\'s not about the money you make or the title you have. It\'s about doing your best every single day, treating people with respect, and knowing that your work matters." That day, I learned that dignity comes from effort, not from what others think of you. When I became a parent myself, I made sure to pass on this same work ethic to my children.',
        category: 'advice',
        tags: ['father', 'work ethic', 'life lessons', 'character'],
        related_people: ['Dad'],
        emotional_depth: 9
      },
      {
        title: 'The Christmas That Changed Everything',
        content: 'It was Christmas 1987, and we didn\'t have much money that year. Dad had been laid off from the plant, and Mom was working double shifts at the diner. I remember being so worried that Christmas would be ruined. But on Christmas morning, I found something amazing under our little tree - not expensive gifts, but handmade treasures. Dad had carved me a wooden toy truck, working late at night in the garage. Mom had sewn new clothes for my sister. That Christmas taught me that love isn\'t measured in dollars spent, but in time invested and thought given. Years later, when my own children were grown, they would tell me their favorite Christmas memories weren\'t the expensive toys, but the traditions we created together - making cookies, reading stories, and just being present with each other.',
        category: 'memory',
        tags: ['Christmas', 'family', 'love', 'values', 'tradition'],
        related_people: ['Dad', 'Mom', 'Sister'],
        emotional_depth: 8
      },
      {
        title: 'Why I Believe in Second Chances',
        content: 'When I was in my thirties, I made a mistake that nearly cost me everything. I had been too proud to ask for help when our business was failing, and I made some poor financial decisions. We almost lost the house, and I felt like I had failed my family. My wife, Sarah, could have left me. She had every right to. Instead, she sat me down and said, "We\'re going to figure this out together." That was the beginning of the hardest two years of our lives, but also the most important. We learned to communicate better, to plan together, and to support each other through anything. I\'ve carried that lesson forward - everyone deserves a second chance, including ourselves. When we forgive and rebuild, we often become stronger than we were before.',
        category: 'reflection',
        tags: ['forgiveness', 'marriage', 'growth', 'second chances'],
        related_people: ['Sarah'],
        emotional_depth: 9
      },
      {
        title: 'The Day I Became a Grandfather',
        content: 'Nothing prepares you for the moment you hold your first grandchild. When little Emma was born, I thought I understood love - after all, I had raised three children of my own. But this was different. This was love without the daily stress of parenting, love mixed with wisdom gained over decades. As I held her tiny hand in mine, I realized that this was what life was truly about - passing on not just our genes, but our values, our stories, and our love to the next generation. I made a promise to Emma that day: I would be the grandfather who always had time to listen, who would share the stories of our family, and who would make sure she knew how deeply she was loved.',
        category: 'feeling',
        tags: ['grandchildren', 'family', 'love', 'legacy'],
        related_people: ['Emma'],
        emotional_depth: 10
      }
    ];

    // Insert additional life entries
    for (const entry of additionalEntries) {
      await pool.query(`
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
      `, [
        userId,
        new Date(),
        entry.title,
        entry.content,
        entry.category,
        entry.tags,
        entry.related_people,
        entry.emotional_depth,
        false
      ]);
    }

    // Create some milestone messages
    const milestoneMessages = [
      {
        milestone_type: 'graduation',
        recipient_name: 'My Children',
        message_title: 'On Your High School Graduation',
        message_content: 'My dear child, today you\'ve reached a milestone that fills my heart with pride. As you graduate from high school, I want you to know that this is just the beginning of your incredible journey. The world is full of opportunities, and I believe in your ability to make a positive difference. Remember the values we\'ve talked about - work hard, treat others with kindness, and never stop learning. There will be challenges ahead, but you have the strength and character to overcome them. I may not always be there to guide you, but my love and belief in you will always be with you. Congratulations, and go show the world what you\'re made of!',
        trigger_age: 18,
        emotional_tone: 'celebratory',
        tags: ['graduation', 'pride', 'future', 'values']
      },
      {
        milestone_type: 'wedding',
        recipient_name: 'My Children',
        message_title: 'On Your Wedding Day',
        message_content: 'Today, as you start your married life, I want to share some wisdom about love and partnership. Marriage isn\'t just about the big romantic moments - it\'s about choosing each other every day, especially on the difficult days. It\'s about supporting each other\'s dreams, forgiving quickly, and never going to bed angry. Your mother and I learned that the secret to a lasting marriage is friendship, laughter, and lots of patience. There will be times when you disagree, times when life gets stressful, but if you face those challenges together as a team, your love will only grow stronger. May your marriage be filled with joy, understanding, and endless love.',
        trigger_date: null,
        emotional_tone: 'loving',
        tags: ['wedding', 'marriage', 'love', 'advice']
      }
    ];

    // Insert milestone messages
    for (const milestone of milestoneMessages) {
      await pool.query(`
        INSERT INTO milestone_messages (
          user_id,
          milestone_type,
          custom_milestone_name,
          recipient_name,
          message_title,
          message_content,
          trigger_date,
          trigger_age,
          trigger_event,
          emotional_tone,
          tags,
          is_private
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        userId,
        milestone.milestone_type,
        null,
        milestone.recipient_name,
        milestone.message_title,
        milestone.message_content,
        milestone.trigger_date,
        milestone.trigger_age,
        null,
        milestone.emotional_tone,
        milestone.tags,
        false
      ]);
    }

    // Final count check
    const finalCounts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM responses WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) FROM life_detail_entries WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) FROM milestone_messages WHERE user_id = $1', [userId])
    ]);

    const totalResponses = parseInt(finalCounts[0].rows[0].count);
    const totalLifeEntries = parseInt(finalCounts[1].rows[0].count);
    const totalMilestones = parseInt(finalCounts[2].rows[0].count);
    const totalTrainingExamples = totalResponses + totalLifeEntries + totalMilestones;

    console.log('✅ Sample training data created successfully!');
    console.log(`📊 Final Training Data Count:`);
    console.log(`   📝 Question Responses: ${totalResponses}`);
    console.log(`   📖 Life Detail Entries: ${totalLifeEntries}`);
    console.log(`   💌 Milestone Messages: ${totalMilestones}`);
    console.log(`   🎯 Total Training Examples: ${totalTrainingExamples}`);
    console.log(`   🚀 Training Readiness: ${totalTrainingExamples >= 50 ? '✅ READY FOR TRAINING!' : '⚠️ Need more data'}`);

  } catch (error) {
    console.error('❌ Failed to create sample training data:', error);
  } finally {
    await pool.end();
  }
}

createSampleTrainingData();