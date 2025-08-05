const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
})

async function checkQuestions() {
  const client = await pool.connect()
  
  try {
    console.log('Checking questions in database...')
    
    // Get sample questions
    const questions = await client.query(`
      SELECT id, question_text, category, subcategory, difficulty_level
      FROM questions 
      LIMIT 10
    `)
    
    console.log('\n📋 Sample questions:')
    questions.rows.forEach((q, i) => {
      console.log(`${i+1}. [${q.category}/${q.subcategory}] ${q.question_text}`)
    })
    
    // Check category distribution
    const categories = await client.query(`
      SELECT category, COUNT(*) as count
      FROM questions 
      GROUP BY category
      ORDER BY count DESC
    `)
    
    console.log('\n📊 Questions by category:')
    categories.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} questions`)
    })
    
    // Test the exact API query
    console.log('\n🔍 Testing API query (role-based)...')
    try {
      const apiQuery = `
        SELECT 
          q.id,
          q.question_text,
          q.category,
          q.difficulty_level as complexity_level,
          NULL as answered
        FROM questions q
        ORDER BY RANDOM()
        LIMIT 10
      `
      
      const apiResult = await client.query(apiQuery)
      console.log(`API query returned ${apiResult.rows.length} questions`)
      
      if (apiResult.rows.length > 0) {
        console.log('Sample API result:')
        console.log(JSON.stringify(apiResult.rows[0], null, 2))
      }
    } catch (apiError) {
      console.error('API query failed:', apiError.message)
    }
    
  } catch (error) {
    console.error('Error checking questions:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

checkQuestions()