const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

async function testUserExists() {
  try {
    console.log('Testing database connection...')
    const result = await pool.query('SELECT id, email, name, is_admin, password_hash FROM users WHERE email = $1', ['lukemoeller@yahoo.com'])
    
    if (result.rows.length === 0) {
      console.log('❌ User lukemoeller@yahoo.com does NOT exist in database')
    } else {
      const user = result.rows[0]
      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin,
        has_password: !!user.password_hash
      })
    }
  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await pool.end()
  }
}

testUserExists()