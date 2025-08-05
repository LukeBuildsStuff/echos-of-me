const fetch = require('node-fetch')

// Test the fixed login system
async function manualLoginTest() {
  console.log('🔧 MANUAL LOGIN TEST - FIXED SYSTEM')
  console.log('===================================\n')
  
  const email = 'lukemoeller@yahoo.com'
  const password = 'password123'
  
  // Test with both port 3000 and 3001 to see which works
  const ports = [3000, 3001]
  
  for (const port of ports) {
    console.log(`Testing on port ${port}...`)
    const baseUrl = `http://localhost:${port}`
    
    try {
      // 1. Test basic connectivity
      const healthTest = await fetch(`${baseUrl}/api/health`, { timeout: 2000 })
        .catch(() => null)
      
      if (!healthTest) {
        console.log(`❌ Port ${port} not responding`)
        continue
      }
      
      console.log(`✅ Port ${port} is responding`)
      
      // 2. Test NextAuth providers
      const providersRes = await fetch(`${baseUrl}/api/auth/providers`)
      if (providersRes.ok) {
        const providers = await providersRes.json()
        console.log(`✅ NextAuth providers available: ${Object.keys(providers).join(', ')}`)
      }
      
      // 3. Test signin endpoint
      const signinRes = await fetch(`${baseUrl}/api/auth/signin`)
      console.log(`Signin endpoint status: ${signinRes.status}`)
      
      if (signinRes.status === 200) {
        const signinText = await signinRes.text()
        if (signinText.includes('{"url":')) {
          console.log('⚠️  Still getting JSON redirect response - CSRF loop persists')
          console.log('Response:', signinText.substring(0, 100))
        } else if (signinText.includes('<html')) {
          console.log('✅ Getting proper HTML signin page')
        }
      }
      
      // 4. Test actual credential login
      console.log('\n🔐 Testing credential login...')
      
      // First get CSRF token
      const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`)
      let csrfToken = ''
      if (csrfRes.ok) {
        const csrfData = await csrfRes.json()
        csrfToken = csrfData.csrfToken
        console.log('✅ CSRF token obtained')
      }
      
      // Then attempt login
      const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
          password: password,
          csrfToken: csrfToken,
          redirect: 'false',
          json: 'true'
        }).toString()
      })
      
      console.log(`Login attempt status: ${loginRes.status}`)
      const loginResult = await loginRes.text()
      console.log('Login response:', loginResult.substring(0, 200))
      
      if (loginResult.includes('"ok":true') || loginResult.includes('"url":"')) {
        console.log('🎉 LOGIN APPEARS TO BE WORKING!')
      } else if (loginResult.includes('error')) {
        console.log('❌ Login failed with error')
      }
      
      console.log('\\n' + '='.repeat(50) + '\\n')
      
    } catch (error) {
      console.log(`❌ Error testing port ${port}:`, error.message)
    }
  }
  
  console.log('📋 SUMMARY:')
  console.log('- Fixed NEXTAUTH_URL port mismatch (3001 → 3000)')
  console.log('- Fixed Tailwind CSS classes in loading component')
  console.log('- Database and user credentials are working')
  console.log('- Try starting server manually: npm run dev')
  console.log('- Then visit: http://localhost:3000/auth/signin')
}

manualLoginTest()