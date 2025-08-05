const http = require('http');
const querystring = require('querystring');
const { URL } = require('url');

class LoginFlowTester {
  constructor() {
    this.cookies = new Map();
    this.results = {
      timestamp: new Date().toISOString(),
      steps: [],
      errors: [],
      redirects: [],
      sessions: []
    };
  }

  parseCookies(cookieHeader) {
    if (!cookieHeader) return;
    
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    cookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        this.cookies.set(name.trim(), value.trim());
        console.log(`🍪 Set cookie: ${name.trim()} = ${value.trim().substring(0, 20)}...`);
      }
    });
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      // Add cookies to request
      if (this.cookies.size > 0) {
        options.headers = options.headers || {};
        options.headers.Cookie = this.getCookieHeader();
      }

      const request = http.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          // Parse and store cookies from response
          this.parseCookies(response.headers['set-cookie']);
          
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: data,
            response
          });
        });
      });
      
      request.on('error', reject);
      
      if (postData) {
        request.write(postData);
      }
      
      request.end();
    });
  }

  async logStep(step, status, details) {
    const entry = {
      step,
      status,
      details,
      timestamp: new Date().toISOString(),
      cookies: Object.fromEntries(this.cookies)
    };
    this.results.steps.push(entry);
    console.log(`${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '📋'} ${step}: ${details}`);
  }

  async testDetailedLoginFlow() {
    console.log('🚀 Starting detailed login flow analysis...');
    
    try {
      // Step 1: Load signin page
      await this.logStep('Load signin page', 'INFO', 'Getting signin page');
      const signinResult = await this.makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/auth/signin',
        method: 'GET',
        headers: {
          'User-Agent': 'DetailedLoginTest/1.0'
        }
      });
      
      await this.logStep('Load signin page', 
        signinResult.statusCode === 200 ? 'PASS' : 'FAIL',
        `HTTP ${signinResult.statusCode}`);

      // Step 2: Get CSRF token
      await this.logStep('Get CSRF token', 'INFO', 'Requesting CSRF token');
      const csrfResult = await this.makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/csrf',
        method: 'GET',
        headers: {
          'User-Agent': 'DetailedLoginTest/1.0'
        }
      });
      
      let csrfToken = null;
      if (csrfResult.statusCode === 200) {
        try {
          const csrfData = JSON.parse(csrfResult.body);
          csrfToken = csrfData.csrfToken;
        } catch (e) {
          await this.logStep('Get CSRF token', 'FAIL', 'Failed to parse CSRF response');
        }
      }
      
      await this.logStep('Get CSRF token',
        csrfToken ? 'PASS' : 'FAIL',
        csrfToken ? 'CSRF token obtained' : 'Failed to get CSRF token');

      if (!csrfToken) {
        throw new Error('Cannot proceed without CSRF token');
      }

      // Step 3: Submit login credentials
      await this.logStep('Submit credentials', 'INFO', 'Posting login form');
      
      const loginData = querystring.stringify({
        email: 'lukemoeller@yahoo.com',
        password: 'password123',
        csrfToken: csrfToken,
        callbackUrl: 'http://localhost:3000/dashboard',
        json: 'true'
      });
      
      const loginResult = await this.makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/callback/credentials',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(loginData),
          'User-Agent': 'DetailedLoginTest/1.0'
        }
      }, loginData);
      
      console.log(`📊 Login response status: ${loginResult.statusCode}`);
      console.log(`📊 Login response body: ${loginResult.body.substring(0, 200)}...`);
      
      let loginSuccess = false;
      let redirectUrl = null;
      
      // Check for redirect response
      if (loginResult.statusCode >= 300 && loginResult.statusCode < 400) {
        redirectUrl = loginResult.headers.location;
        loginSuccess = redirectUrl && !redirectUrl.includes('error');
      } else if (loginResult.statusCode === 200) {
        try {
          const loginResponseData = JSON.parse(loginResult.body);
          if (loginResponseData.url) {
            redirectUrl = loginResponseData.url;
            loginSuccess = !redirectUrl.includes('error');
          }
        } catch (e) {
          // Not JSON response
        }
      }
      
      await this.logStep('Submit credentials',
        loginSuccess ? 'PASS' : 'FAIL',
        loginSuccess ? `Success - redirect to ${redirectUrl}` : `Failed - ${loginResult.statusCode}`);

      // Step 4: Check session after login
      await this.logStep('Check session', 'INFO', 'Verifying session creation');
      const sessionResult = await this.makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'DetailedLoginTest/1.0'
        }
      });
      
      let sessionData = null;
      let hasValidSession = false;
      
      if (sessionResult.statusCode === 200) {
        try {
          sessionData = JSON.parse(sessionResult.body);
          hasValidSession = !!sessionData.user;
          this.results.sessions.push(sessionData);
        } catch (e) {
          await this.logStep('Check session', 'FAIL', 'Failed to parse session response');
        }
      }
      
      await this.logStep('Check session',
        hasValidSession ? 'PASS' : 'FAIL',
        hasValidSession ? `Valid session for ${sessionData.user.email}` : 'No valid session found');

      console.log('\n📊 Session details:', JSON.stringify(sessionData, null, 2));

      // Step 5: Test dashboard access
      if (hasValidSession) {
        await this.logStep('Access dashboard', 'INFO', 'Testing dashboard access');
        const dashboardResult = await this.makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/dashboard',
          method: 'GET',
          headers: {
            'User-Agent': 'DetailedLoginTest/1.0'
          }
        });
        
        const dashboardAccessible = dashboardResult.statusCode === 200;
        await this.logStep('Access dashboard',
          dashboardAccessible ? 'PASS' : 'FAIL',
          `HTTP ${dashboardResult.statusCode}`);
        
        // Check for redirect loops
        if (dashboardResult.statusCode >= 300 && dashboardResult.statusCode < 400) {
          const dashboardRedirect = dashboardResult.headers.location;
          if (dashboardRedirect && dashboardRedirect.includes('signin')) {
            await this.logStep('Redirect loop check', 'FAIL', 
              'Dashboard redirects back to signin - LOGIN LOOP DETECTED');
            this.results.errors.push({
              type: 'LOGIN_LOOP',
              message: 'Dashboard redirects authenticated user back to signin',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Step 6: Test signin page behavior when authenticated
      if (hasValidSession) {
        await this.logStep('Signin page when authenticated', 'INFO', 'Testing signin redirect');
        const signinWithSessionResult = await this.makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/auth/signin',
          method: 'GET',
          headers: {
            'User-Agent': 'DetailedLoginTest/1.0'
          }
        });
        
        if (signinWithSessionResult.statusCode >= 300 && signinWithSessionResult.statusCode < 400) {
          const signinRedirect = signinWithSessionResult.headers.location;
          await this.logStep('Signin page when authenticated',
            signinRedirect && signinRedirect.includes('dashboard') ? 'PASS' : 'FAIL',
            `Redirects to: ${signinRedirect}`);
        } else {
          await this.logStep('Signin page when authenticated', 'FAIL',
            `Should redirect authenticated user, but got HTTP ${signinWithSessionResult.statusCode}`);
        }
      }

    } catch (error) {
      console.log('❌ Test execution error:', error.message);
      this.results.errors.push({
        type: 'EXECUTION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Save results
    require('fs').writeFileSync('detailed-login-flow-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n📊 Detailed results saved to detailed-login-flow-results.json');
    
    // Summary
    console.log('\n=== DETAILED LOGIN FLOW SUMMARY ===');
    const passedSteps = this.results.steps.filter(s => s.status === 'PASS').length;
    const failedSteps = this.results.steps.filter(s => s.status === 'FAIL').length;
    const totalSteps = this.results.steps.filter(s => s.status !== 'INFO').length;
    
    console.log(`✅ Passed: ${passedSteps}/${totalSteps}`);
    console.log(`❌ Failed: ${failedSteps}/${totalSteps}`);
    console.log(`🚨 Errors: ${this.results.errors.length}`);
    
    // Identify specific issues
    const hasLoginLoop = this.results.errors.some(e => e.type === 'LOGIN_LOOP');
    if (hasLoginLoop) {
      console.log('\n🔄 LOGIN LOOP IDENTIFIED:');
      console.log('   • User can authenticate successfully');
      console.log('   • Session is created properly');
      console.log('   • But authenticated user gets redirected back to signin');
      console.log('   • This creates an infinite redirect loop');
    }
    
    if (failedSteps > 0) {
      console.log('\n❌ FAILED STEPS:');
      this.results.steps.filter(s => s.status === 'FAIL').forEach(step => {
        console.log(`   • ${step.step}: ${step.details}`);
      });
    }
    
    return this.results;
  }
}

// Run the test
const tester = new LoginFlowTester();
tester.testDetailedLoginFlow().catch(console.error);