const http = require('http');

class SimpleTestClient {
  constructor() {
    this.cookies = '';
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3003,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (this.cookies) {
        options.headers['Cookie'] = this.cookies;
      }

      const req = http.request(options, (res) => {
        let body = '';
        
        if (res.headers['set-cookie']) {
          this.cookies = res.headers['set-cookie'].join('; ');
        }
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = body ? JSON.parse(body) : {};
          } catch (e) {
            parsedBody = body;
          }
          
          resolve({
            status: res.statusCode,
            body: parsedBody
          });
        });
      });
      
      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async authenticate() {
    // Get CSRF token
    const csrfResponse = await this.makeRequest('GET', '/api/auth/csrf');
    const csrfToken = csrfResponse.body.csrfToken;
    
    // Sign in
    await this.makeRequest('POST', '/api/auth/callback/credentials', {
      email: 'testuser@example.com',
      password: 'testpassword123',
      csrfToken: csrfToken,
      callbackUrl: '/dashboard',
      json: true
    });
    
    // Verify session
    const sessionResponse = await this.makeRequest('GET', '/api/auth/session');
    return sessionResponse.body && sessionResponse.body.user;
  }
}

async function testGetResponses() {
  console.log('🔍 Testing GET /api/responses specifically...\n');
  
  const client = new SimpleTestClient();
  
  try {
    // Authenticate first
    console.log('1. 🔐 Authenticating...');
    const user = await client.authenticate();
    
    if (!user) {
      console.log('❌ Authentication failed');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email} (ID: ${user.id || 'not set'})`);
    
    // Test GET responses
    console.log('2. 📥 Testing GET /api/responses...');
    const response = await client.makeRequest('GET', '/api/responses?limit=5');
    
    console.log(`Status: ${response.status}`);
    console.log(`Body: ${JSON.stringify(response.body, null, 2)}`);
    
    if (response.status === 200) {
      console.log('✅ GET responses endpoint working correctly');
    } else {
      console.log('❌ GET responses endpoint has issues');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testGetResponses();