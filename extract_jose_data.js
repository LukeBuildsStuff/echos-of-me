const { Pool } = require('pg')
const fs = require('fs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
})

async function extractJoseData() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Looking for Jose character data...')
    
    // First, check responses table structure
    const responseColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'responses'
      ORDER BY ordinal_position
    `)
    
    console.log('\n📊 Responses table structure:')
    responseColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // Check all users to find lukemoeller@yahoo.com
    const users = await client.query('SELECT * FROM users ORDER BY created_at DESC')
    console.log('\n👥 Available users:')
    users.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`)
    })
    
    // Find the user with lukemoeller@yahoo.com
    const targetUser = users.rows.find(user => user.email === 'lukemoeller@yahoo.com')
    
    if (!targetUser) {
      console.log('\n❌ User lukemoeller@yahoo.com not found in database')
      return
    }
    
    console.log(`\n✅ Found target user: ${targetUser.name} (ID: ${targetUser.id})`)
    
    // Check total responses count
    const totalResponses = await client.query('SELECT COUNT(*) FROM responses')
    console.log(`\n📈 Total responses in database: ${totalResponses.rows[0].count}`)
    
    // Get responses for the target user
    const userResponses = await client.query(`
      SELECT r.*, q.question_text 
      FROM responses r 
      JOIN questions q ON r.question_id = q.id 
      WHERE r.user_id = $1 
      ORDER BY r.created_at DESC
    `, [targetUser.id])
    
    console.log(`\n📋 Found ${userResponses.rows.length} responses for ${targetUser.email}`)
    
    if (userResponses.rows.length === 0) {
      console.log('\n❌ No responses found for this user')
      return
    }
    
    // Display sample responses to understand the data
    console.log('\n📝 Sample responses (first 3):')
    userResponses.rows.slice(0, 3).forEach((response, idx) => {
      console.log(`\n--- Response ${idx + 1} ---`)
      console.log(`Question: ${response.question_text}`)
      console.log(`Answer: ${response.response_text ? response.response_text.substring(0, 200) + '...' : 'N/A'}`)
      console.log(`Created: ${response.created_at}`)
    })
    
    // Look for Jose-specific characteristics in the responses
    console.log('\n🔍 Analyzing responses for Jose character traits...')
    
    const joseKeywords = ['construction', 'brooklyn', 'ny', 'new york', 'work', 'job', 'site', 'building', 'contractor', 'foreman', 'worker']
    let joseResponses = []
    
    userResponses.rows.forEach(response => {
      const text = (response.response_text || '').toLowerCase()
      const hasJoseTraits = joseKeywords.some(keyword => text.includes(keyword))
      
      if (hasJoseTraits || response.response_text) {
        joseResponses.push({
          question: response.question_text,
          answer: response.response_text,
          created_at: response.created_at,
          id: response.id
        })
      }
    })
    
    console.log(`\n✅ Identified ${joseResponses.length} potential Jose character responses`)
    
    // Save to file for training
    const trainingData = {
      user_info: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role
      },
      character_description: "Jose - Brooklyn construction worker with authentic NY speech patterns and construction industry experience",
      responses: joseResponses.slice(0, 150), // Limit to 150 as requested
      total_available: joseResponses.length,
      extracted_at: new Date().toISOString()
    }
    
    // Save raw data
    fs.writeFileSync('/home/luke/personal-ai-clone/web/jose_training_data.json', JSON.stringify(trainingData, null, 2))
    console.log('\n💾 Saved training data to jose_training_data.json')
    
    // Create formatted training dataset
    const formattedData = joseResponses.slice(0, 150).map(item => ({
      instruction: "You are Jose, a seasoned construction worker from Brooklyn, NY. Respond authentically in your voice with your experience and personality.",
      input: item.question,
      output: item.answer
    }))
    
    fs.writeFileSync('/home/luke/personal-ai-clone/web/jose_formatted_training.json', JSON.stringify(formattedData, null, 2))
    console.log('💾 Saved formatted training data to jose_formatted_training.json')
    
    console.log(`\n🎯 Summary:`)
    console.log(`  - User: ${targetUser.email}`)
    console.log(`  - Total responses available: ${userResponses.rows.length}`)
    console.log(`  - Jose character responses: ${joseResponses.length}`)
    console.log(`  - Selected for training: ${Math.min(150, joseResponses.length)}`)
    
  } catch (error) {
    console.error('❌ Error extracting data:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

extractJoseData()