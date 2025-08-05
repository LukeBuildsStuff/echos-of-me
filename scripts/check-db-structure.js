const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
})

async function checkDbStructure() {
  const client = await pool.connect()
  
  try {
    console.log('Checking database structure...')
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('\n📊 Available tables:')
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    // Check questions table structure if it exists
    const questionTableExists = tables.rows.some(row => row.table_name === 'questions')
    
    if (questionTableExists) {
      console.log('\n🔍 Questions table structure:')
      const questionColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'questions'
        ORDER BY ordinal_position
      `)
      
      questionColumns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
      
      // Check if there are any questions
      const questionCount = await client.query('SELECT COUNT(*) FROM questions')
      console.log(`\n📈 Total questions in database: ${questionCount.rows[0].count}`)
    } else {
      console.log('\n❌ Questions table does not exist!')
    }
    
    // Check users table structure if it exists
    const userTableExists = tables.rows.some(row => row.table_name === 'users')
    
    if (userTableExists) {
      console.log('\n🔍 Users table structure:')
      const userColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `)
      
      userColumns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
      
      // Check if there are any users
      const userCount = await client.query('SELECT COUNT(*) FROM users')
      console.log(`\n📈 Total users in database: ${userCount.rows[0].count}`)
    } else {
      console.log('\n❌ Users table does not exist!')
    }
    
  } catch (error) {
    console.error('Error checking database:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

checkDbStructure()