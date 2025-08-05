const http = require('http');
const { URL } = require('url');

class ResponseTestClient {
  constructor() {
    this.cookies = '';
    this.sessionToken = null;
  }

  async makeRequest(method, path, data = null, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, 'http://localhost:3003');
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ResponseTestClient/1.0',
          ...extraHeaders
        }
      };

      // Add cookies if we have them
      if (this.cookies) {
        options.headers['Cookie'] = this.cookies;
      }

      const req = http.request(options, (res) => {
        let body = '';
        
        // Store cookies from response
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
            headers: res.headers,
            body: parsedBody,
            rawBody: body
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async authenticateUser(email, password) {
    console.log(`🔐 Attempting to authenticate user: ${email}`);
    
    try {
      // First get the CSRF token
      console.log('  📋 Getting CSRF token...');
      const csrfResponse = await this.makeRequest('GET', '/api/auth/csrf');
      
      if (csrfResponse.status !== 200) {
        throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`);
      }
      
      const csrfToken = csrfResponse.body.csrfToken;
      console.log(`  ✅ CSRF token obtained: ${csrfToken.substring(0, 20)}...`);
      
      // Now attempt to sign in
      console.log('  🔑 Attempting sign in...');
      const signInResponse = await this.makeRequest('POST', '/api/auth/callback/credentials', {
        email: email,
        password: password,
        csrfToken: csrfToken,
        callbackUrl: '/dashboard',
        json: true
      });
      
      console.log(`  📡 Sign in response: ${signInResponse.status}`);
      
      // Check session
      const sessionResponse = await this.makeRequest('GET', '/api/auth/session');
      
      if (sessionResponse.body && sessionResponse.body.user) {
        console.log(`  ✅ Authentication successful! User: ${sessionResponse.body.user.email}`);
        this.sessionToken = sessionResponse.body.user;
        return true;
      } else {
        console.log('  ❌ Authentication failed - no session created');
        return false;
      }
      
    } catch (error) {
      console.log(`  ❌ Authentication error: ${error.message}`);
      return false;
    }
  }

  async testDailyQuestionFlow() {
    console.log('\n📝 Testing daily question flow...');
    
    try {
      // 1. Check daily status
      console.log('1. 📊 Checking daily status...');
      const statusResponse = await this.makeRequest('GET', '/api/daily-status');
      
      if (statusResponse.status === 200) {
        console.log(`   ✅ Daily status: ${JSON.stringify(statusResponse.body)}`);
      } else {
        console.log(`   ❌ Daily status failed: ${statusResponse.status} - ${JSON.stringify(statusResponse.body)}`);
        return false;
      }
      
      // 2. Load questions
      console.log('2. 📋 Loading questions...');
      const questionsResponse = await this.makeRequest('GET', '/api/questions/role-based?count=10');
      
      if (questionsResponse.status === 200 && questionsResponse.body.questions) {
        console.log(`   ✅ Questions loaded: ${questionsResponse.body.questions.length} questions available`);
        
        if (questionsResponse.body.questions.length === 0) {
          console.log('   ❌ No questions available for testing');
          return false;
        }
        
        // Use the first question for testing
        const testQuestion = questionsResponse.body.questions[0];
        console.log(`   📝 Using question: "${testQuestion.question_text.substring(0, 50)}..."`);
        
        // 3. Submit a response
        console.log('3. 💾 Submitting response...');
        const testResponse = {
          questionId: testQuestion.id.toString(),
          responseText: "This is a comprehensive test response to verify that the entire response submission system is working correctly. I'm testing authentication, question loading, response submission, and data persistence. This response should be saved to the database and associated with my user account.",
          isDraft: false
        };
        
        const submitResponse = await this.makeRequest('POST', '/api/responses', testResponse);
        
        if (submitResponse.status === 200 || submitResponse.status === 201) {
          console.log('   ✅ Response submitted successfully!');
          console.log(`   📊 Response data: ${JSON.stringify(submitResponse.body, null, 2)}`);
          
          // 4. Verify the response was saved by fetching it back
          console.log('4. 🔍 Verifying response was saved...');
          const getResponsesResponse = await this.makeRequest('GET', '/api/responses?limit=1');
          
          if (getResponsesResponse.status === 200 && getResponsesResponse.body.responses) {
            const savedResponses = getResponsesResponse.body.responses;
            console.log(`   ✅ Found ${savedResponses.length} saved responses`);
            
            if (savedResponses.length > 0) {
              const lastResponse = savedResponses[0];
              console.log(`   📝 Last response: "${lastResponse.response_text.substring(0, 50)}..."`);
              console.log(`   🎯 Question ID: ${lastResponse.question_id}, User ID: ${lastResponse.user_id || 'N/A'}`);
            }
            
            return true;
          } else {
            console.log(`   ❌ Failed to verify saved response: ${getResponsesResponse.status}`);
            return false;
          }
          
        } else {
          console.log(`   ❌ Response submission failed: ${submitResponse.status}`);
          console.log(`   📋 Error details: ${JSON.stringify(submitResponse.body, null, 2)}`);
          return false;
        }
        
      } else {
        console.log(`   ❌ Questions loading failed: ${questionsResponse.status} - ${JSON.stringify(questionsResponse.body)}`);
        return false;
      }
      
    } catch (error) {
      console.log(`❌ Daily question flow error: ${error.message}`);
      return false;
    }
  }
}

async function runCompleteTest() {
  console.log('🚀 Starting Complete User Flow Test\n');
  
  const client = new ResponseTestClient();
  
  // Test with the known test user
  const testEmail = 'testuser@example.com';
  const testPassword = 'testpassword123';
  
  try {
    // Step 1: Authenticate
    const authSuccess = await client.authenticateUser(testEmail, testPassword);
    
    if (!authSuccess) {
      console.log('\n❌ Authentication failed - cannot proceed with response testing');
      return;
    }
    
    // Step 2: Test the complete daily question flow
    const flowSuccess = await client.testDailyQuestionFlow();
    
    if (flowSuccess) {
      console.log('\n🎉 Complete user flow test PASSED!');
      console.log('✅ User can successfully authenticate and submit responses');
    } else {
      console.log('\n❌ Complete user flow test FAILED!');
      console.log('❌ Issues found in the response submission process');
    }
    
  } catch (error) {
    console.log(`\n❌ Test suite error: ${error.message}`);
  }
}

// Run the complete test
runCompleteTest();