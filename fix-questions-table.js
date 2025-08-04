const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
})

async function fixQuestionsTable() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Fixing questions table structure...')
    
    // Check if is_active column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questions' AND column_name = 'is_active'
    `)
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding is_active column to questions table...')
      await client.query('ALTER TABLE questions ADD COLUMN is_active BOOLEAN DEFAULT true')
      console.log('✅ Added is_active column')
    } else {
      console.log('✅ is_active column already exists')
    }
    
    // Update all existing questions to be active
    await client.query('UPDATE questions SET is_active = true WHERE is_active IS NULL')
    console.log('✅ Updated existing questions to be active')
    
    // Check table structure
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'questions'
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Updated questions table structure:')
    structure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`)
    })
    
  } catch (error) {
    console.error('❌ Error fixing questions table:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

fixQuestionsTable()