const http = require('http');
const { URL } = require('url');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const req = http.request(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
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

async function finalLoginTest() {
  console.log('🔍 FINAL COMPREHENSIVE LOGIN TEST');
  console.log('Testing credentials: lukemoeller@yahoo.com / password123');
  console.log('========================================================');

  try {
    // Step 1: Get CSRF token
    console.log('🔑 Step 1: Getting CSRF token...');
    const csrfResponse = await makeRequest('http://localhost:3001/api/auth/csrf');
    const csrfData = JSON.parse(csrfResponse.data);
    const csrfToken = csrfData.csrfToken;
    console.log(`✅ CSRF Token: ${csrfToken}`);

    // Step 2: Get session cookies
    console.log('🍪 Step 2: Establishing session...');
    const sessionResponse = await makeRequest('http://localhost:3001/api/auth/session');
    const sessionCookies = sessionResponse.headers['set-cookie'] || [];
    const cookieHeader = sessionCookies.map(cookie => cookie.split(';')[0]).join('; ');
    console.log(`✅ Session established: ${cookieHeader ? 'Yes' : 'No'}`);

    // Step 3: Attempt login with proper NextAuth format
    console.log('🚀 Step 3: Attempting login...');
    
    const loginData = new URLSearchParams({
      csrfToken: csrfToken,
      email: 'lukemoeller@yahoo.com',
      password: 'password123',
      callbackUrl: 'http://localhost:3001/dashboard',
      json: 'true'
    });

    const loginResponse = await makeRequest('http://localhost:3001/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': loginData.toString().length,
        'Cookie': cookieHeader,
        'Referer': 'http://localhost:3001/auth/signin'
      },
      body: loginData.toString()
    });

    console.log(`📍 Login response status: ${loginResponse.statusCode}`);
    console.log(`📍 Login response headers:`, JSON.stringify(loginResponse.headers, null, 2));

    let loginSuccess = false;
    let redirectUrl = null;

    if (loginResponse.statusCode === 302) {
      redirectUrl = loginResponse.headers.location;
      console.log(`📍 Redirected to: ${redirectUrl}`);
      
      if (redirectUrl && redirectUrl.includes('dashboard')) {
        console.log('✅ SUCCESS: Login redirected to dashboard');
        loginSuccess = true;
      } else if (redirectUrl && redirectUrl.includes('signin')) {
        console.log('❌ FAILURE: Login redirected back to signin (login loop detected)');
      } else if (redirectUrl && redirectUrl.includes('error')) {
        console.log('❌ FAILURE: Login redirected to error page');
      } else {
        console.log('⚠️  UNKNOWN: Unexpected redirect');
      }
    } else if (loginResponse.statusCode === 200) {
      try {
        const responseData = JSON.parse(loginResponse.data);
        console.log(`📍 Login response data:`, JSON.stringify(responseData, null, 2));
        
        if (responseData.url && responseData.url.includes('dashboard')) {
          console.log('✅ SUCCESS: Login returned dashboard URL');
          loginSuccess = true;
          redirectUrl = responseData.url;
        } else if (responseData.error) {
          console.log(`❌ FAILURE: Login returned error: ${responseData.error}`);
        }
      } catch (e) {
        console.log('📍 Non-JSON response from login attempt');
        console.log(`📍 Response preview: ${loginResponse.data.substring(0, 200)}...`);
      }
    } else {
      console.log(`❌ FAILURE: Login returned status ${loginResponse.statusCode}`);
    }

    // Step 4: Test dashboard access if login appeared to work
    if (loginSuccess && redirectUrl) {
      console.log('🛡️  Step 4: Testing dashboard access...');
      
      const newCookies = loginResponse.headers['set-cookie'] || [];
      const allCookies = [...sessionCookies, ...newCookies]
        .map(cookie => cookie.split(';')[0])
        .join('; ');

      try {
        const dashboardResponse = await makeRequest(redirectUrl.startsWith('http') ? 
          redirectUrl : 
          `http://localhost:3001${redirectUrl}`, {
          headers: {
            'Cookie': allCookies
          }
        });

        console.log(`📍 Dashboard access status: ${dashboardResponse.statusCode}`);
        
        if (dashboardResponse.statusCode === 200) {
          console.log('✅ Dashboard accessible with authenticated session');
          
          // Check if dashboard content actually loaded
          if (dashboardResponse.data.includes('dashboard') || 
              dashboardResponse.data.includes('Welcome') ||
              dashboardResponse.data.includes('profile')) {
            console.log('✅ Dashboard content verified');
          } else {
            console.log('⚠️  Dashboard URL returned 200 but content unclear');
          }
        } else if (dashboardResponse.statusCode === 302) {
          const dashboardRedirect = dashboardResponse.headers.location;
          console.log(`📍 Dashboard redirected to: ${dashboardRedirect}`);
          
          if (dashboardRedirect && dashboardRedirect.includes('signin')) {
            console.log('❌ Dashboard access failed - redirected back to signin');
            loginSuccess = false;
          }
        } else {
          console.log(`❌ Dashboard access failed with status ${dashboardResponse.statusCode}`);
          loginSuccess = false;
        }

      } catch (error) {
        console.log(`❌ Dashboard test error: ${error.message}`);
        loginSuccess = false;
      }
    }

    // Step 5: Test session persistence
    if (loginSuccess) {
      console.log('🔄 Step 5: Testing session persistence...');
      
      const newCookies = loginResponse.headers['set-cookie'] || [];
      const persistentCookies = [...sessionCookies, ...newCookies]
        .map(cookie => cookie.split(';')[0])
        .join('; ');

      try {
        const sessionTestResponse = await makeRequest('http://localhost:3001/api/auth/session', {
          headers: {
            'Cookie': persistentCookies
          }
        });

        console.log(`📍 Session check status: ${sessionTestResponse.statusCode}`);
        
        if (sessionTestResponse.statusCode === 200) {
          try {
            const sessionData = JSON.parse(sessionTestResponse.data);
            console.log(`📍 Session data:`, JSON.stringify(sessionData, null, 2));
            
            if (sessionData && sessionData.user) {
              console.log('✅ Session persistence verified - user session active');
            } else {
              console.log('❌ Session persistence failed - no user data');
              loginSuccess = false;
            }
          } catch (e) {
            console.log('⚠️  Session response not JSON');
          }
        } else {
          console.log('❌ Session persistence failed');
          loginSuccess = false;
        }

      } catch (error) {
        console.log(`❌ Session persistence test error: ${error.message}`);
      }
    }

    // Final verdict
    console.log('\n🎯 FINAL VERDICT');
    console.log('================');
    
    if (loginSuccess) {
      console.log('🎉 LOGIN SYSTEM IS WORKING CORRECTLY');
      console.log('✅ All authentication tests passed');
      console.log('✅ User can login and access protected pages');
      console.log('✅ Session persistence is working');
    } else {
      console.log('💥 LOGIN SYSTEM IS BROKEN');
      console.log('❌ Authentication is not working properly');
      console.log('❌ User cannot successfully login');
      console.log('❌ The user was right - previous agents were lying about fixes');
    }

    return { success: loginSuccess };

  } catch (error) {
    console.log(`💥 Test execution error: ${error.message}`);
    console.log('💥 LOGIN SYSTEM IS BROKEN - TEST COULD NOT COMPLETE');
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  finalLoginTest().then(result => {
    console.log('\n' + '='.repeat(60));
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.log(`\n💥 CRITICAL TEST FAILURE: ${error.message}`);
    console.log('💥 LOGIN SYSTEM IS BROKEN');
    process.exit(1);
  });
}

module.exports = { finalLoginTest };