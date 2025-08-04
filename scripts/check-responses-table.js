const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
})

async function checkResponsesTable() {
  const client = await pool.connect()
  
  try {
    console.log('Checking responses table structure...')
    
    // Check responses table structure
    const responseColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'responses'
      ORDER BY ordinal_position
    `)
    
    console.log('\n🔍 Responses table structure:')
    responseColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // Check if there are any responses
    const responseCount = await client.query('SELECT COUNT(*) FROM responses')
    console.log(`\n📈 Total responses in database: ${responseCount.rows[0].count}`)
    
    // Check sample responses
    if (parseInt(responseCount.rows[0].count) > 0) {
      const sampleResponses = await client.query(`
        SELECT id, user_id, question_id, response_text, is_draft, created_at
        FROM responses 
        LIMIT 3
      `)
      
      console.log('\n📋 Sample responses:')
      sampleResponses.rows.forEach((r, i) => {
        console.log(`${i+1}. User ${r.user_id}, Question ${r.question_id}, Draft: ${r.is_draft}`)
        console.log(`   Text: ${r.response_text.substring(0, 50)}...`)
        console.log(`   Created: ${r.created_at}`)
      })
    }
    
  } catch (error) {
    console.error('Error checking responses table:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

checkResponsesTable()