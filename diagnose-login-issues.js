const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const fetch = require('node-fetch')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const testEmail = 'lukemoeller@yahoo.com'
const testPassword = 'password123'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

async function diagnoseProblem() {
  console.log('🔍 COMPREHENSIVE LOGIN SYSTEM DIAGNOSIS')
  console.log('==========================================\n')
  
  try {
    // 1. Test database connectivity
    console.log('1. Testing database connectivity...')
    const dbResult = await pool.query('SELECT NOW()')
    console.log('✅ Database connection successful')
    
    // 2. Check user exists and get details
    console.log('\n2. Checking user account...')
    const userResult = await pool.query(`
      SELECT id, email, name, password_hash, is_admin, is_active, 
             failed_login_attempts, locked_until, created_at
      FROM users WHERE email = $1
    `, [testEmail])
    
    if (userResult.rows.length === 0) {
      console.log('❌ User does NOT exist in database')
      return
    }
    
    const user = userResult.rows[0]
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      is_active: user.is_active,
      failed_attempts: user.failed_login_attempts,
      locked_until: user.locked_until,
      created: user.created_at
    })
    
    // 3. Test password verification
    console.log('\n3. Testing password verification...')
    const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash)
    if (isPasswordValid) {
      console.log('✅ Password verification successful')
    } else {
      console.log('❌ Password verification FAILED')
      console.log('   This means the password hash is incorrect or corrupted')
    }
    
    // 4. Test NextAuth API endpoint
    console.log('\n4. Testing NextAuth API endpoint...')
    try {
      const authResponse = await fetch('http://localhost:3001/api/auth/providers')
      if (authResponse.ok) {
        const providers = await authResponse.json()
        console.log('✅ NextAuth API responding:', Object.keys(providers))
      } else {
        console.log('❌ NextAuth API not responding:', authResponse.status)
      }
    } catch (error) {
      console.log('❌ NextAuth API connection failed:', error.message)
      console.log('   This suggests the Next.js server is not running')
    }
    
    // 5. Test login API directly
    console.log('\n5. Testing login API directly...')
    try {
      const loginResponse = await fetch('http://localhost:3001/api/auth/signin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      console.log('Login API status:', loginResponse.status)
      
      if (loginResponse.status === 200) {
        const text = await loginResponse.text()
        if (text.includes('csrf')) {
          console.log('⚠️  CSRF token detected in response - this might be causing the loop')
          console.log('Response preview:', text.substring(0, 200) + '...')
        } else {
          console.log('✅ Login API responding normally')
        }
      }
    } catch (error) {
      console.log('❌ Login API test failed:', error.message)
    }
    
    // 6. Check for table structure issues
    console.log('\n6. Checking database table structure...')
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)
    
    console.log('✅ Users table structure:')
    tableCheck.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`)
    })
    
    // 7. Summary and recommendations
    console.log('\n📋 DIAGNOSIS SUMMARY')
    console.log('====================')
    
    if (!isPasswordValid) {
      console.log('🚨 CRITICAL: Password verification is failing')
      console.log('   Recommendation: Reset the user password or check bcrypt hashing')
    }
    
    console.log('\n🔧 NEXT STEPS:')
    console.log('1. Start the Next.js development server: npm run dev')
    console.log('2. Visit http://localhost:3001/auth/signin')
    console.log('3. Try logging in with the credentials')
    console.log('4. Check browser network tab for API call details')
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message)
  } finally {
    await pool.end()
  }
}

diagnoseProblem()