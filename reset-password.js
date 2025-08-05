const bcrypt = require('bcryptjs')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://personalai:personalai123@localhost:5432/personalai'
})

async function resetPassword() {
  try {
    console.log('Generating new hash for password123...')
    const newHash = await bcrypt.hash('password123', 12)
    console.log('New hash:', newHash)
    
    console.log('Updating password in database...')
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, is_admin',
      [newHash, 'lukemoeller@yahoo.com']
    )
    
    if (result.rows.length > 0) {
      console.log('Password updated successfully for:', result.rows[0].email)
      console.log('Admin status:', result.rows[0].is_admin)
    } else {
      console.log('No user found with that email')
    }
    
    // Test the new hash
    console.log('Testing new hash...')
    const isValid = await bcrypt.compare('password123', newHash)
    console.log('Hash verification:', isValid ? 'SUCCESS' : 'FAILED')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

resetPassword()