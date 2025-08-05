const fetch = require('node-fetch')

async function debug500Error() {
  console.log('🐛 DEBUGGING 500 ERROR IN AUTH')
  console.log('==============================\n')
  
  const baseUrl = 'http://localhost:3001'
  
  try {
    // 1. Check specific auth endpoints
    console.log('1. Testing auth endpoints...')
    
    const endpoints = [
      '/api/auth/providers',
      '/api/auth/csrf',
      '/api/auth/signin',
      '/api/auth/session'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${endpoint}`)
        console.log(`${endpoint}: ${res.status}`)
        
        if (res.status !== 200) {
          const text = await res.text()
          console.log(`  Error: ${text.substring(0, 100)}...`)
        } else {
          const text = await res.text()
          if (text.includes('{"url":')) {
            console.log('  ⚠️  CSRF redirect detected!')
            console.log(`  Response: ${text}`)
          } else {
            console.log('  ✅ Normal response')
          }
        }
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`)
      }
    }
    
    // 2. Test with specific headers
    console.log('\n2. Testing with proper headers...')
    const signinWithHeaders = await fetch(`${baseUrl}/api/auth/signin`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0'
      }
    })
    
    console.log(`Signin with headers: ${signinWithHeaders.status}`)
    if (signinWithHeaders.status !== 200) {
      const errorText = await signinWithHeaders.text()
      console.log('Error response:', errorText.substring(0, 200))
    }
    
    // 3. Check if it's a database connection issue
    console.log('\n3. Testing database connection in auth context...')
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev',
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
    
    try {
      const result = await pool.query('SELECT 1')
      console.log('✅ Database accessible from auth context')
    } catch (dbError) {
      console.log('❌ Database connection failed:', dbError.message)
    } finally {
      await pool.end()
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message)
  }
}

debug500Error()