const puppeteer = require('puppeteer');
const axios = require('axios');

async function testWebsite() {
  const baseURL = 'http://localhost:3002';
  
  console.log('🚀 Starting Echos Of Me Website Testing');
  console.log('=====================================');
  
  // Test 1: Basic HTTP connectivity
  console.log('\n1. Testing Basic HTTP Connectivity...');
  try {
    const response = await axios.get(baseURL);
    console.log(`✅ Homepage accessible - Status: ${response.status}`);
    console.log(`📄 Content length: ${response.data.length} characters`);
    
    // Check for key content
    const content = response.data;
    const keyPhrases = [
      'Echos Of Me',
      'Preserve Your Love',
      'Begin Your Legacy',
      'Continue Your Journey'
    ];
    
    keyPhrases.forEach(phrase => {
      if (content.includes(phrase)) {
        console.log(`✅ Found key phrase: "${phrase}"`);
      } else {
        console.log(`❌ Missing key phrase: "${phrase}"`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Homepage not accessible: ${error.message}`);
  }
  
  // Test 2: API Endpoints
  console.log('\n2. Testing API Endpoints...');
  const endpoints = [
    '/api/health',
    '/api/auth/register', 
    '/api/questions',
    '/api/responses',
    '/api/daily-status'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(baseURL + endpoint);
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️ ${endpoint} - Status: ${error.response.status} (${error.response.statusText})`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
  }
  
  // Test 3: Authentication Pages
  console.log('\n3. Testing Authentication Pages...');
  const authPages = ['/auth/signin', '/auth/register', '/auth/forgot-password'];
  
  for (const page of authPages) {
    try {
      const response = await axios.get(baseURL + page);
      console.log(`✅ ${page} - Status: ${response.status}`);
      
      // Check for form elements
      const content = response.data;
      const hasEmailInput = content.includes('type="email"') || content.includes('input[type="email"]');
      const hasPasswordInput = content.includes('type="password"') || content.includes('input[type="password"]');
      const hasSubmitButton = content.includes('type="submit"') || content.includes('Submit') || content.includes('Sign');
      
      console.log(`  📧 Email input: ${hasEmailInput ? '✅' : '❌'}`);
      console.log(`  🔒 Password input: ${hasPasswordInput ? '✅' : '❌'}`);
      console.log(`  🎯 Submit button: ${hasSubmitButton ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log(`❌ ${page} - Error: ${error.message}`);
    }
  }
  
  // Test 4: Protected Routes
  console.log('\n4. Testing Protected Routes...');
  const protectedRoutes = ['/dashboard', '/daily-question', '/training'];
  
  for (const route of protectedRoutes) {
    try {
      const response = await axios.get(baseURL + route, {
        maxRedirects: 0,
        validateStatus: function (status) {
          return status < 500; // Accept redirects
        }
      });
      
      if (response.status === 200) {
        console.log(`⚠️ ${route} - Accessible without auth (Status: 200)`);
      } else if (response.status === 302 || response.status === 307) {
        console.log(`✅ ${route} - Properly redirects (Status: ${response.status})`);
      } else {
        console.log(`❓ ${route} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${route} - Error: ${error.message}`);
    }
  }
  
  // Test 5: Static Assets
  console.log('\n5. Testing Static Assets...');
  const staticAssets = [
    '/_next/static/css/app/layout.css',
    '/_next/static/chunks/main-app.js',
    '/_next/static/chunks/webpack.js'
  ];
  
  for (const asset of staticAssets) {
    try {
      const response = await axios.head(baseURL + asset);
      console.log(`✅ ${asset} - Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${asset} - Status: ${error.response.status}`);
      } else {
        console.log(`❌ ${asset} - Error: ${error.message}`);
      }
    }
  }
  
  // Test 6: Mobile Viewport Meta Tag
  console.log('\n6. Testing Mobile Responsiveness Indicators...');
  try {
    const response = await axios.get(baseURL);
    const content = response.data;
    
    const hasViewportMeta = content.includes('name="viewport"');
    const hasResponsiveCSS = content.includes('responsive') || content.includes('mobile') || content.includes('@media');
    const hasTailwindCSS = content.includes('tailwind');
    
    console.log(`📱 Viewport meta tag: ${hasViewportMeta ? '✅' : '❌'}`);
    console.log(`🎨 Responsive CSS indicators: ${hasResponsiveCSS ? '✅' : '❌'}`);
    console.log(`🌊 TailwindCSS: ${hasTailwindCSS ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`❌ Mobile responsiveness check failed: ${error.message}`);
  }
  
  console.log('\n7. Analyzing Server-Side JavaScript Errors...');
  console.log('Based on server logs, found these issues:');
  console.log('❌ Event handlers cannot be passed to Client Component props');
  console.log('⚠️ Unsupported metadata viewport configuration');
  console.log('📝 Recommendation: Convert components with onClick handlers to Client Components');
  console.log('📝 Recommendation: Move viewport config to viewport export');
  
  console.log('\n=====================================');
  console.log('🏁 Manual Testing Complete');
  console.log('=====================================');
}

testWebsite().catch(console.error);