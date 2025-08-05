const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
})

async function testApis() {
  const client = await pool.connect()
  
  try {
    console.log('Testing question API queries...')
    
    // Test user lookup
    console.log('\n1. Testing user lookup...')
    const users = await client.query('SELECT id, email FROM users LIMIT 5')
    console.log(`Found ${users.rows.length} users`)
    if (users.rows.length > 0) {
      console.log('Sample user:', users.rows[0])
      
      const testUserId = users.rows[0].id
      
      // Test basic questions query
      console.log('\n2. Testing basic questions query...')
      const basicQuery = `
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
      `
      
      const basicResult = await client.query(basicQuery, [testUserId, 5])
      console.log(`Basic query returned ${basicResult.rows.length} questions`)
      if (basicResult.rows.length > 0) {
        console.log('Sample question:', JSON.stringify(basicResult.rows[0], null, 2))
      }
      
      // Test daily status query
      console.log('\n3. Testing daily status query...')
      const today = new Date().toISOString().split('T')[0]
      const dailyQuery = `
        SELECT COUNT(*) as count
        FROM responses 
        WHERE user_id = $1 
          AND DATE(created_at) = $2 
          AND is_draft = false
      `
      
      const dailyResult = await client.query(dailyQuery, [testUserId, today])
      console.log(`User has answered ${dailyResult.rows[0].count} questions today`)
      
      // Test total responses
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM responses 
        WHERE user_id = $1 AND is_draft = false
      `
      
      const totalResult = await client.query(totalQuery, [testUserId])
      console.log(`User has ${totalResult.rows[0].total} total responses`)
    }
    
  } catch (error) {
    console.error('Error testing APIs:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

testApis()