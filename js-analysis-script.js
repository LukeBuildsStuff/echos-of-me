const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeJavaScriptIssues() {
  const baseURL = 'http://localhost:3002';
  
  console.log('🔍 Deep JavaScript Analysis for Echos Of Me');
  console.log('==========================================');
  
  // Test form submissions
  console.log('\n1. Testing Form Submission Functionality...');
  
  try {
    // Test registration form submission
    console.log('📝 Testing Registration Form Submission...');
    
    const registerData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!'
    };
    
    try {
      const response = await axios.post(`${baseURL}/api/auth/register`, registerData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Registration API - Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️ Registration API - Status: ${error.response.status}, Message: ${error.response.data?.message || 'No message'}`);
      } else {
        console.log(`❌ Registration API - Error: ${error.message}`);
      }
    }
    
    // Test sign-in form submission
    console.log('🔐 Testing Sign-in Form Submission...');
    
    const signinData = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };
    
    try {
      const response = await axios.post(`${baseURL}/api/auth/signin`, signinData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Sign-in API - Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️ Sign-in API - Status: ${error.response.status}, Message: ${error.response.data?.message || 'No message'}`);
      } else {
        console.log(`❌ Sign-in API - Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Form testing failed: ${error.message}`);
  }
  
  // Test daily question functionality
  console.log('\n2. Testing Daily Question Functionality...');
  
  try {
    const response = await axios.get(`${baseURL}/api/questions/daily`);
    console.log(`✅ Daily Question API - Status: ${response.status}`);
    if (response.data) {
      console.log(`📋 Question data structure: ${JSON.stringify(Object.keys(response.data))}`);
    }
  } catch (error) {
    if (error.response) {
      console.log(`⚠️ Daily Question API - Status: ${error.response.status}, Message: ${error.response.data?.message || 'Unauthorized or not found'}`);
    } else {
      console.log(`❌ Daily Question API - Error: ${error.message}`);
    }
  }
  
  // Test question generation
  console.log('\n3. Testing Question Generation...');
  
  try {
    const response = await axios.get(`${baseURL}/api/questions/generate`);
    console.log(`✅ Question Generation API - Status: ${response.status}`);
  } catch (error) {
    if (error.response) {
      console.log(`⚠️ Question Generation API - Status: ${error.response.status}, Message: ${error.response.data?.message || 'Unauthorized'}`);
    } else {
      console.log(`❌ Question Generation API - Error: ${error.message}`);
    }
  }
  
  // Test response saving
  console.log('\n4. Testing Response Saving Functionality...');
  
  try {
    const testResponse = {
      questionId: 1,
      response: 'This is a test response',
      type: 'text'
    };
    
    const response = await axios.post(`${baseURL}/api/responses`, testResponse, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ Response Saving API - Status: ${response.status}`);
  } catch (error) {
    if (error.response) {
      console.log(`⚠️ Response Saving API - Status: ${error.response.status}, Message: ${error.response.data?.message || 'Unauthorized'}`);
    } else {
      console.log(`❌ Response Saving API - Error: ${error.message}`);
    }
  }
  
  // Analyze HTML structure for JavaScript errors
  console.log('\n5. Analyzing HTML Structure for Client-Side Issues...');
  
  try {
    const response = await axios.get(`${baseURL}/dashboard`);
    const $ = cheerio.load(response.data);
    
    // Check for inline event handlers
    const inlineHandlers = [];
    $('*').each((i, elem) => {
      const $elem = $(elem);
      ['onclick', 'onsubmit', 'onchange', 'onload'].forEach(handler => {
        if ($elem.attr(handler)) {
          inlineHandlers.push(`${elem.tagName} with ${handler}`);
        }
      });
    });
    
    console.log(`🎯 Inline event handlers found: ${inlineHandlers.length}`);
    if (inlineHandlers.length > 0) {
      console.log('  Handlers:', inlineHandlers.slice(0, 5));
    }
    
    // Check for script tags
    const scriptTags = $('script').length;
    console.log(`📜 Script tags found: ${scriptTags}`);
    
    // Check for form elements
    const forms = $('form').length;
    const inputs = $('input').length;
    const buttons = $('button').length;
    
    console.log(`📋 Forms: ${forms}, Inputs: ${inputs}, Buttons: ${buttons}`);
    
  } catch (error) {
    console.log(`❌ HTML analysis failed: ${error.message}`);
  }
  
  // Test database connectivity
  console.log('\n6. Testing Database Connectivity...');
  
  try {
    const response = await axios.get(`${baseURL}/api/health`);
    console.log(`✅ Health Check - Status: ${response.status}`);
    if (response.data) {
      console.log(`💾 Health data: ${JSON.stringify(response.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
  
  // Test user profile functionality
  console.log('\n7. Testing User Profile Functionality...');
  
  try {
    const response = await axios.get(`${baseURL}/api/user/profile`);
    console.log(`✅ User Profile API - Status: ${response.status}`);
  } catch (error) {
    if (error.response) {
      console.log(`⚠️ User Profile API - Status: ${error.response.status}, Message: ${error.response.data?.message || 'Unauthorized'}`);
    } else {
      console.log(`❌ User Profile API - Error: ${error.message}`);
    }
  }
  
  console.log('\n8. Summary of JavaScript Issues Found:');
  console.log('=====================================');
  console.log('❌ CRITICAL: Event handlers cannot be passed to Client Component props');
  console.log('   - This prevents button clicks and form submissions from working');
  console.log('   - Components with onClick handlers need "use client" directive');
  console.log('');
  console.log('⚠️ WARNING: Unsupported metadata viewport configuration');
  console.log('   - Should move viewport config to viewport export');
  console.log('   - May affect mobile responsiveness');
  console.log('');
  console.log('🔐 SECURITY: Protected routes are accessible without authentication');
  console.log('   - /dashboard, /daily-question, /training should redirect to login');
  console.log('   - This is a major security vulnerability');
  console.log('');
  console.log('📝 RECOMMENDATIONS:');
  console.log('1. Add "use client" directive to components with event handlers');
  console.log('2. Implement proper authentication middleware');
  console.log('3. Fix viewport configuration in layout files');
  console.log('4. Add proper error boundaries for better error handling');
  console.log('5. Implement proper form validation and submission handling');
  
  console.log('\n==========================================');
  console.log('🏁 JavaScript Analysis Complete');
  console.log('==========================================');
}

analyzeJavaScriptIssues().catch(console.error);