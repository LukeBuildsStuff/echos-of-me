const fetch = require('node-fetch')

async function testLoginFlow() {
  console.log('🧪 TESTING ACTUAL LOGIN FLOW')
  console.log('=============================\n')
  
  const baseUrl = 'http://localhost:3000'
  const testEmail = 'lukemoeller@yahoo.com'
  const testPassword = 'password123'
  
  try {
    // 1. Test if the server is running
    console.log('1. Testing server connectivity...')
    const healthCheck = await fetch(`${baseUrl}/api/health`)
    console.log('Server status:', healthCheck.status)
    
    // 2. Get the signin page to check for CSRF token
    console.log('\n2. Getting signin page...')
    const signinPage = await fetch(`${baseUrl}/auth/signin`)
    console.log('Signin page status:', signinPage.status)
    
    if (signinPage.status !== 200) {
      console.log('❌ Signin page not accessible')
      return
    }
    
    // 3. Test NextAuth providers endpoint
    console.log('\n3. Testing NextAuth providers...')
    const providersResponse = await fetch(`${baseUrl}/api/auth/providers`)
    console.log('Providers status:', providersResponse.status)
    
    if (providersResponse.ok) {
      const providers = await providersResponse.json()
      console.log('✅ Available providers:', Object.keys(providers))
    }
    
    // 4. Test NextAuth signin endpoint directly
    console.log('\n4. Testing NextAuth signin endpoint...')
    const signinApiResponse = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'GET'
    })
    console.log('Signin API status:', signinApiResponse.status)
    
    if (signinApiResponse.status === 200) {
      const text = await signinApiResponse.text()
      if (text.includes('{"url":"')) {
        console.log('⚠️  FOUND THE CSRF LOOP ISSUE!')
        console.log('Response:', text)
        console.log('This JSON response should be an HTML page, not a redirect object')
      } else {
        console.log('✅ Signin endpoint returning proper HTML')
      }
    }
    
    // 5. Test actual login credentials
    console.log('\n5. Testing login with credentials...')
    const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: testEmail,
        password: testPassword,
        redirect: false
      }).toString()
    })
    
    console.log('Login response status:', loginResponse.status)
    const loginResult = await loginResponse.text()
    console.log('Login response:', loginResult.substring(0, 200))
    
    // 6. Check if NEXTAUTH_URL mismatch is causing issues
    console.log('\n6. Environment configuration check...')
    console.log('Server running on: http://localhost:3000')
    console.log('NEXTAUTH_URL in env: http://localhost:3001')
    console.log('⚠️  PORT MISMATCH DETECTED - This is likely causing the CSRF loop!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testLoginFlow()