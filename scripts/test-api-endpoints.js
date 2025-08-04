// Simple test to simulate API calls without authentication
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
})

async function testEndpointLogic() {
  const client = await pool.connect()
  
  try {
    console.log('Testing endpoint logic (simulating API calls)...')
    
    // Get a test user
    const userResult = await client.query('SELECT id, email FROM users LIMIT 1')
    if (!userResult.rows[0]) {
      console.log('❌ No users found in database')
      return
    }
    
    const userId = userResult.rows[0].id
    const userEmail = userResult.rows[0].email
    console.log(`🧪 Testing with user: ${userEmail} (ID: ${userId})`)
    
    // Test 1: Role-based questions API logic
    console.log('\n1. Testing role-based questions API logic...')
    const count = 10
    
    const roleBasedResult = await client.query(`
      SELECT 
        q.id,
        q.question_text,
        q.category,
        q.difficulty_level as complexity_level,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as answered
      FROM questions q
      LEFT JOIN responses r ON r.question_id = q.id AND r.user_id = $1
      ORDER BY 
        CASE WHEN r.id IS NULL THEN 0 ELSE 1 END,  -- Unanswered first
        RANDOM()
      LIMIT $2
    `, [userId, count])
    
    console.log(`✅ Role-based API would return ${roleBasedResult.rows.length} questions`)
    if (roleBasedResult.rows.length > 0) {
      console.log('Sample question:', {
        id: roleBasedResult.rows[0].id,
        question_text: roleBasedResult.rows[0].question_text.substring(0, 60) + '...',
        category: roleBasedResult.rows[0].category,
        answered: roleBasedResult.rows[0].answered
      })
    }
    
    // Test 2: Basic questions API logic
    console.log('\n2. Testing basic questions API logic...')
    
    const basicResult = await client.query(`
      SELECT 
        q.id,
        q.question_text,
        q.category,
        q.difficulty_level as complexity_level,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as answered
      FROM questions q
      LEFT JOIN responses r ON r.question_id = q.id AND r.user_id = $1
      ORDER BY 
        CASE WHEN r.id IS NULL THEN 0 ELSE 1 END,  -- Unanswered first
        RANDOM()
      LIMIT $2
    `, [userId, count])
    
    console.log(`✅ Basic API would return ${basicResult.rows.length} questions`)
    
    // Test 3: Daily status logic
    console.log('\n3. Testing daily status logic...')
    const today = new Date().toISOString().split('T')[0]
    
    const todayResponses = await client.query(`
      SELECT COUNT(*) as count
      FROM responses 
      WHERE user_id = $1 
        AND DATE(created_at) = $2 
        AND is_draft = false
    `, [userId, today])
    
    const totalResponses = await client.query(`
      SELECT COUNT(*) as total
      FROM responses 
      WHERE user_id = $1 AND is_draft = false
    `, [userId])
    
    const dailyCount = parseInt(todayResponses.rows[0].count)
    const totalCount = parseInt(totalResponses.rows[0].total)
    const hasAnsweredToday = dailyCount > 0
    
    console.log(`✅ Daily status:`)
    console.log(`   - Has answered today: ${hasAnsweredToday}`)
    console.log(`   - Today's count: ${dailyCount}`)
    console.log(`   - Total responses: ${totalCount}`)
    console.log(`   - Can answer more: ${!hasAnsweredToday}`)
    
    // Test 4: Simulating the daily question page logic
    console.log('\n4. Testing daily question page logic...')
    
    if (hasAnsweredToday) {
      console.log('🔄 User has answered today - would redirect to dashboard')
    } else {
      console.log('✅ User hasn\'t answered today - would show question')
      
      // Get a random question like the daily question page does
      const randomQuestion = await client.query(`
        SELECT 
          q.id,
          q.question_text,
          q.category,
          q.difficulty_level as complexity_level
        FROM questions q
        LEFT JOIN responses r ON r.question_id = q.id AND r.user_id = $1
        WHERE r.id IS NULL  -- Only unanswered questions
        ORDER BY RANDOM()
        LIMIT 1
      `, [userId])
      
      if (randomQuestion.rows.length > 0) {
        console.log('   Daily question would be:', {
          id: randomQuestion.rows[0].id,
          question_text: randomQuestion.rows[0].question_text.substring(0, 80) + '...',
          category: randomQuestion.rows[0].category
        })
      } else {
        console.log('   ⚠️ No unanswered questions available')
      }
    }
    
    console.log('\n🎉 All API endpoint logic tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Error testing endpoint logic:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

testEndpointLogic()