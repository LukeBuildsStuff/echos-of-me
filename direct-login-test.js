const http = require('http');
const https = require('https');
const { URL } = require('url');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          redirectedTo: res.headers.location
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function directLoginTest() {
  console.log('🔍 DIRECT LOGIN API TEST');
  console.log('Testing credentials: lukemoeller@yahoo.com / password123');
  console.log('========================================================');

  try {
    // Step 1: Get the signin page first
    console.log('📄 Step 1: Getting signin page...');
    const signinResponse = await makeRequest('http://localhost:3001/auth/signin');
    console.log(`📍 Signin page status: ${signinResponse.statusCode}`);
    
    if (signinResponse.statusCode !== 200) {
      throw new Error(`Signin page failed with status ${signinResponse.statusCode}`);
    }

    // Extract any CSRF tokens or form data from the signin page
    const csrfMatch = signinResponse.data.match(/name="csrfToken"[^>]*value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    console.log(`🔑 CSRF Token found: ${csrfToken ? 'Yes' : 'No'}`);

    // Extract any session cookies
    const setCookieHeaders = signinResponse.headers['set-cookie'] || [];
    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
    console.log(`🍪 Session cookies: ${cookies || 'None'}`);

    // Step 2: Test the signin API directly
    console.log('🚀 Step 2: Attempting login via API...');
    
    // Try different potential endpoints
    const loginEndpoints = [
      '/api/auth/signin',
      '/api/auth/callback/credentials',
      '/auth/signin',
      '/api/auth/signin/credentials'
    ];

    let loginSuccess = false;
    let finalResult = null;

    for (const endpoint of loginEndpoints) {
      console.log(`🔗 Testing endpoint: ${endpoint}`);
      
      const loginData = {
        email: 'lukemoeller@yahoo.com',
        password: 'password123',
        redirect: false
      };

      if (csrfToken) {
        loginData.csrfToken = csrfToken;
      }

      const postData = JSON.stringify(loginData);
      
      try {
        const loginResponse = await makeRequest(`http://localhost:3001${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
            'Cookie': cookies,
            'User-Agent': 'LoginTest/1.0'
          },
          body: postData
        });

        console.log(`📍 Response status: ${loginResponse.statusCode}`);
        console.log(`📍 Response headers:`, JSON.stringify(loginResponse.headers, null, 2));
        
        if (loginResponse.data) {
          try {
            const responseData = JSON.parse(loginResponse.data);
            console.log(`📍 Response data:`, JSON.stringify(responseData, null, 2));
            
            if (responseData.url && responseData.url.includes('dashboard')) {
              console.log('✅ SUCCESS: Login API returned dashboard URL');
              loginSuccess = true;
              finalResult = responseData;
              break;
            } else if (responseData.error) {
              console.log(`❌ Login failed with error: ${responseData.error}`);
            }
          } catch (e) {
            // Not JSON, might be HTML redirect
            if (loginResponse.statusCode === 302 || loginResponse.statusCode === 301) {
              const location = loginResponse.headers.location;
              console.log(`📍 Redirect to: ${location}`);
              if (location && location.includes('dashboard')) {
                console.log('✅ SUCCESS: Login redirected to dashboard');
                loginSuccess = true;
                finalResult = { redirectedTo: location };
                break;
              }
            } else {
              console.log(`📍 Non-JSON response: ${loginResponse.data.substring(0, 200)}...`);
            }
          }
        }

      } catch (error) {
        console.log(`❌ Error testing ${endpoint}: ${error.message}`);
      }
    }

    // Step 3: Test form-based login (like a browser would)
    if (!loginSuccess) {
      console.log('🌐 Step 3: Testing form-based login...');
      
      const formData = new URLSearchParams({
        email: 'lukemoeller@yahoo.com',
        password: 'password123'
      });

      if (csrfToken) {
        formData.append('csrfToken', csrfToken);
      }

      try {
        const formLoginResponse = await makeRequest('http://localhost:3001/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': formData.toString().length,
            'Cookie': cookies,
            'User-Agent': 'LoginTest/1.0'
          },
          body: formData.toString()
        });

        console.log(`📍 Form login status: ${formLoginResponse.statusCode}`);
        
        if (formLoginResponse.statusCode === 302 || formLoginResponse.statusCode === 301) {
          const location = formLoginResponse.headers.location;
          console.log(`📍 Form login redirect: ${location}`);
          if (location && location.includes('dashboard')) {
            console.log('✅ SUCCESS: Form login redirected to dashboard');
            loginSuccess = true;
            finalResult = { redirectedTo: location };
          } else if (location && location.includes('signin')) {
            console.log('❌ FAILURE: Form login redirected back to signin (login loop)');
          }
        }

      } catch (error) {
        console.log(`❌ Form login error: ${error.message}`);
      }
    }

    // Step 4: Test NextAuth endpoints specifically
    if (!loginSuccess) {
      console.log('🔐 Step 4: Testing NextAuth endpoints...');
      
      try {
        // Test NextAuth callback
        const nextAuthData = new URLSearchParams({
          username: 'lukemoeller@yahoo.com',
          password: 'password123',
          callbackUrl: 'http://localhost:3001/dashboard'
        });

        if (csrfToken) {
          nextAuthData.append('csrfToken', csrfToken);
        }

        const nextAuthResponse = await makeRequest('http://localhost:3001/api/auth/callback/credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': nextAuthData.toString().length,
            'Cookie': cookies,
            'User-Agent': 'LoginTest/1.0'
          },
          body: nextAuthData.toString()
        });

        console.log(`📍 NextAuth callback status: ${nextAuthResponse.statusCode}`);
        console.log(`📍 NextAuth callback headers:`, JSON.stringify(nextAuthResponse.headers, null, 2));

        if (nextAuthResponse.statusCode === 302) {
          const location = nextAuthResponse.headers.location;
          console.log(`📍 NextAuth redirect: ${location}`);
          if (location && location.includes('dashboard')) {
            console.log('✅ SUCCESS: NextAuth login redirected to dashboard');
            loginSuccess = true;
            finalResult = { redirectedTo: location };
          }
        }

      } catch (error) {
        console.log(`❌ NextAuth test error: ${error.message}`);
      }
    }

    // Final report
    console.log('\n📊 FINAL RESULTS');
    console.log('================');
    console.log(`🎯 Login Success: ${loginSuccess ? 'YES' : 'NO'}`);
    
    if (finalResult) {
      console.log(`📍 Final Result:`, JSON.stringify(finalResult, null, 2));
    }

    // Test dashboard access if login worked
    if (loginSuccess && finalResult && finalResult.redirectedTo) {
      console.log('\n🛡️  Testing dashboard access...');
      try {
        const dashboardResponse = await makeRequest(finalResult.redirectedTo.startsWith('http') ? 
          finalResult.redirectedTo : 
          `http://localhost:3001${finalResult.redirectedTo}`);
        
        console.log(`📍 Dashboard access status: ${dashboardResponse.statusCode}`);
        if (dashboardResponse.statusCode === 200) {
          console.log('✅ Dashboard accessible');
        } else {
          console.log('❌ Dashboard access failed');
        }
      } catch (error) {
        console.log(`❌ Dashboard test error: ${error.message}`);
      }
    }

    return { success: loginSuccess, result: finalResult };

  } catch (error) {
    console.log(`💥 Test execution error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  directLoginTest().then(result => {
    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log('🎉 VERDICT: LOGIN SYSTEM IS WORKING');
      console.log('✅ The login API endpoints are functioning correctly');
    } else {
      console.log('💥 VERDICT: LOGIN SYSTEM IS BROKEN');
      console.log('❌ The login system is not working as expected');
      console.log('❌ The user was correct - previous agents were lying about fixes');
    }
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.log(`\n💥 TEST FAILED: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { directLoginTest };