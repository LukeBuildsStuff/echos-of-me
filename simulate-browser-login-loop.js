const http = require('http');
const { URL } = require('url');

class BrowserLoginSimulator {
  constructor() {
    this.cookies = new Map();
    this.history = [];
    this.redirectCount = 0;
    this.maxRedirects = 10;
  }

  parseCookies(cookieHeader) {
    if (!cookieHeader) return;
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    cookies.forEach(cookie => {
      const [nameValue] = cookie.split(';')[0];
      const [name, value] = nameValue.split('=');
      if (name && value) {
        this.cookies.set(name.trim(), value.trim());
      }
    });
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return '';
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async followRedirects(url, method = 'GET', postData = null) {
    let currentUrl = url;
    let requestCount = 0;
    const maxRequests = 15;
    
    while (requestCount < maxRequests) {
      requestCount++;
      console.log(`\n🌐 Request ${requestCount}: ${method} ${currentUrl}`);
      
      const urlObj = new URL(currentUrl);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'User-Agent': 'BrowserLoginSimulator/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };

      if (this.cookies.size > 0) {
        options.headers.Cookie = this.getCookieHeader();
      }

      if (postData) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const result = await this.makeRequest(options, postData);
      this.parseCookies(result.headers['set-cookie']);
      
      this.history.push({
        url: currentUrl,
        method: method,
        status: result.statusCode,
        timestamp: new Date().toISOString(),
        cookies: Object.fromEntries(this.cookies)
      });

      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Cookies: ${this.cookies.size} active`);

      // Check for redirect
      if (result.statusCode >= 300 && result.statusCode < 400 && result.headers.location) {
        currentUrl = new URL(result.headers.location, currentUrl).href;
        console.log(`   🔄 Redirect to: ${currentUrl}`);
        method = 'GET'; // Redirects are always GET
        postData = null;
        
        // Check for redirect loop
        const recentUrls = this.history.slice(-5).map(h => h.url);
        if (recentUrls.filter(u => u === currentUrl).length > 1) {
          console.log('❌ REDIRECT LOOP DETECTED!');
          console.log(`   Loop URL: ${currentUrl}`);
          console.log(`   Recent history: ${recentUrls.join(' -> ')}`);
          break;
        }
        continue;
      }

      // Final destination reached
      console.log(`✅ Final destination: ${currentUrl} (${result.statusCode})`);
      break;
    }

    if (requestCount >= maxRequests) {
      console.log('❌ Maximum request limit reached - possible infinite loop');
    }

    return this.history[this.history.length - 1];
  }

  async makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
      const request = http.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
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

  async simulateUserLoginJourney() {
    console.log('🧪 Simulating complete user login journey...');
    console.log('👤 User scenario: Goes to signin, logs in, expects to reach dashboard');
    
    // Scenario 1: User navigates to signin page
    console.log('\n=== SCENARIO 1: User visits signin page ===');
    await this.followRedirects('http://localhost:3000/auth/signin');
    
    // Get CSRF token
    console.log('\n📋 Getting CSRF token...');
    const csrfResult = await this.makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/csrf',
      method: 'GET',
      headers: { 'User-Agent': 'BrowserLoginSimulator/1.0' }
    });
    
    let csrfToken = null;
    if (csrfResult.statusCode === 200) {
      try {
        const csrfData = JSON.parse(csrfResult.body);
        csrfToken = csrfData.csrfToken;
        console.log(`   ✅ CSRF token obtained`);
      } catch (e) {
        console.log('   ❌ Failed to get CSRF token');
        return;
      }
    }
    
    // Scenario 2: User submits login form
    console.log('\n=== SCENARIO 2: User submits login form ===');
    const loginData = new URLSearchParams({
      email: 'lukemoeller@yahoo.com',
      password: 'password123',
      csrfToken: csrfToken,
      callbackUrl: 'http://localhost:3000/dashboard'
    }).toString();
    
    await this.followRedirects('http://localhost:3000/api/auth/callback/credentials', 'POST', loginData);
    
    // Scenario 3: Check what happens if user visits signin again (common browser back button scenario)
    console.log('\n=== SCENARIO 3: Authenticated user visits signin page again ===');
    console.log('(This simulates user pressing back button or typing signin URL)');
    await this.followRedirects('http://localhost:3000/auth/signin');
    
    // Scenario 4: Direct dashboard access
    console.log('\n=== SCENARIO 4: Direct dashboard access ===');
    await this.followRedirects('http://localhost:3000/dashboard');
    
    // Analysis
    console.log('\n=== JOURNEY ANALYSIS ===');
    console.log(`Total requests: ${this.history.length}`);
    
    const signinVisits = this.history.filter(h => h.url.includes('/auth/signin')).length;
    const dashboardVisits = this.history.filter(h => h.url.includes('/dashboard')).length;
    
    console.log(`Signin page visits: ${signinVisits}`);
    console.log(`Dashboard visits: ${dashboardVisits}`);
    
    // Check for potential loop conditions
    const loopIndicators = [];
    
    if (signinVisits > 2) {
      loopIndicators.push('Multiple signin page visits detected');
    }
    
    const authFailures = this.history.filter(h => 
      h.url.includes('/auth/signin') && h.status === 200 && 
      this.history.some(prev => prev.url.includes('/dashboard') && prev.timestamp < h.timestamp)
    );
    
    if (authFailures.length > 0) {
      loopIndicators.push('Authenticated user served signin page without redirect');
    }
    
    if (loopIndicators.length > 0) {
      console.log('\n❌ POTENTIAL LOGIN LOOP ISSUES:');
      loopIndicators.forEach(issue => console.log(`   • ${issue}`));
    } else {
      console.log('\n✅ No obvious login loop issues detected');
    }
    
    // Save detailed results
    const results = {
      timestamp: new Date().toISOString(),
      totalRequests: this.history.length,
      signinVisits,
      dashboardVisits,
      loopIndicators,
      fullHistory: this.history,
      finalCookies: Object.fromEntries(this.cookies)
    };
    
    require('fs').writeFileSync('browser-login-simulation-results.json', JSON.stringify(results, null, 2));
    console.log('\n📊 Results saved to browser-login-simulation-results.json');
    
    return results;
  }
}

// Run simulation
const simulator = new BrowserLoginSimulator();
simulator.simulateUserLoginJourney().catch(console.error);