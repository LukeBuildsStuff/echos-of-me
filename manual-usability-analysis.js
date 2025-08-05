#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

// Usability Analysis Script for Echoes of Me
// This script will test basic functionality without Playwright

const BASE_URL = 'http://localhost:3000';
const usabilityIssues = [];
const networkRequests = [];

function addIssue(type, category, description, location, recommendation) {
  usabilityIssues.push({
    type,
    category,
    description,
    location,
    recommendation,
    timestamp: new Date().toISOString()
  });
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'User-Agent': 'Echoes-Usability-Analyzer/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    if (data && method === 'POST') {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const requestInfo = {
          path,
          method,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          responseTime,
          headers: res.headers,
          bodyLength: body.length,
          body: body.substring(0, 10000) // Limit body size for logging
        };
        
        networkRequests.push(requestInfo);
        resolve(requestInfo);
      });
    });

    req.on('error', (error) => {
      const requestInfo = {
        path,
        method,
        error: error.message,
        responseTime: Date.now() - startTime
      };
      networkRequests.push(requestInfo);
      reject(requestInfo);
    });

    if (data && method === 'POST') {
      req.write(data);
    }
    
    req.end();
  });
}

function analyzeHTML(html, pagePath) {
  const issues = [];
  
  // Check for basic HTML structure
  if (!html.includes('<html')) {
    issues.push({
      type: 'critical',
      category: 'functionality',
      description: 'Invalid HTML structure - missing html tag',
      location: pagePath,
      recommendation: 'Ensure proper HTML5 document structure'
    });
  }

  // Check for title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    issues.push({
      type: 'warning',
      category: 'ux',
      description: 'Missing or empty page title',
      location: pagePath,
      recommendation: 'Add descriptive page titles for SEO and user orientation'
    });
  }

  // Check for forms
  const formCount = (html.match(/<form/gi) || []).length;
  if (formCount > 0) {
    // Check for CSRF protection
    if (!html.includes('csrf') && !html.includes('_token')) {
      issues.push({
        type: 'warning',
        category: 'functionality',
        description: 'Forms may lack CSRF protection',
        location: pagePath,
        recommendation: 'Implement CSRF tokens for form security'
      });
    }
  }

  // Check for navigation
  if (!html.includes('<nav') && !html.includes('role="navigation"')) {
    issues.push({
      type: 'warning',
      category: 'ux',
      description: 'No semantic navigation found',
      location: pagePath,
      recommendation: 'Add semantic navigation elements for better accessibility'
    });
  }

  // Check for accessibility features
  if (!html.includes('alt=') && html.includes('<img')) {
    issues.push({
      type: 'warning',
      category: 'accessibility',
      description: 'Images may be missing alt text',
      location: pagePath,
      recommendation: 'Add alt text to all images for accessibility'
    });
  }

  // Check for headings
  const h1Count = (html.match(/<h1/gi) || []).length;
  if (h1Count === 0) {
    issues.push({
      type: 'warning',
      category: 'accessibility',
      description: 'No H1 heading found',
      location: pagePath,
      recommendation: 'Add H1 heading for proper document structure'
    });
  } else if (h1Count > 1) {
    issues.push({
      type: 'warning',
      category: 'accessibility',
      description: 'Multiple H1 headings found',
      location: pagePath,
      recommendation: 'Use only one H1 per page for proper hierarchy'
    });
  }

  // Check for meta viewport (mobile responsiveness)
  if (!html.includes('name="viewport"')) {
    issues.push({
      type: 'warning',
      category: 'mobile',
      description: 'Missing viewport meta tag',
      location: pagePath,
      recommendation: 'Add viewport meta tag for mobile responsiveness'
    });
  }

  // Check for JavaScript errors in inline scripts
  const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
  if (scriptMatches) {
    scriptMatches.forEach(script => {
      if (script.includes('console.error') || script.includes('throw ')) {
        issues.push({
          type: 'warning',
          category: 'functionality',
          description: 'Potential JavaScript errors in inline scripts',
          location: pagePath,
          recommendation: 'Review and fix JavaScript errors'
        });
      }
    });
  }

  // Check for loading indicators
  if (html.includes('loading') || html.includes('spinner') || html.includes('loader')) {
    // Good - has loading states
  } else {
    issues.push({
      type: 'info',
      category: 'ux',
      description: 'Consider adding loading indicators for better UX',
      location: pagePath,
      recommendation: 'Add loading states for asynchronous operations'
    });
  }

  return issues;
}

async function testPage(path, expectedContent = null) {
  console.log(`\\n🔍 Testing page: ${path}`);
  
  try {
    const response = await makeRequest(path);
    
    if (response.statusCode >= 500) {
      addIssue('critical', 'functionality', 
        `Server error (${response.statusCode}) on ${path}`, 
        path, 
        'Fix server-side errors preventing page access'
      );
    } else if (response.statusCode >= 400) {
      addIssue('warning', 'functionality', 
        `Client error (${response.statusCode}) on ${path}`, 
        path, 
        'Check routing and authentication requirements'
      );
    }

    if (response.responseTime > 3000) {
      addIssue('warning', 'performance', 
        `Slow response time (${response.responseTime}ms) for ${path}`, 
        path, 
        'Optimize server response time and resource loading'
      );
    }

    if (response.body) {
      const htmlIssues = analyzeHTML(response.body, path);
      htmlIssues.forEach(issue => {
        usabilityIssues.push(issue);
      });

      if (expectedContent && !response.body.includes(expectedContent)) {
        addIssue('warning', 'functionality', 
          `Expected content "${expectedContent}" not found on ${path}`, 
          path, 
          'Ensure page content loads correctly'
        );
      }
    }

    console.log(`✅ ${path}: ${response.statusCode} (${response.responseTime}ms)`);
    return response;
    
  } catch (error) {
    addIssue('critical', 'functionality', 
      `Failed to load ${path}: ${error.error || error.message}`, 
      path, 
      'Fix network connectivity or server startup issues'
    );
    console.log(`❌ ${path}: Failed - ${error.error || error.message}`);
    return null;
  }
}

async function testAPIEndpoint(path, method = 'GET', data = null) {
  console.log(`\\n🔌 Testing API: ${method} ${path}`);
  
  try {
    const response = await makeRequest(path, method, data);
    
    if (response.statusCode >= 500) {
      addIssue('critical', 'functionality', 
        `API server error (${response.statusCode}) on ${method} ${path}`, 
        path, 
        'Fix server-side API errors'
      );
    }

    console.log(`✅ API ${path}: ${response.statusCode} (${response.responseTime}ms)`);
    return response;
    
  } catch (error) {
    addIssue('critical', 'functionality', 
      `API endpoint ${path} failed: ${error.error || error.message}`, 
      path, 
      'Fix API endpoint connectivity and error handling'
    );
    console.log(`❌ API ${path}: Failed - ${error.error || error.message}`);
    return null;
  }
}

async function runAnalysis() {
  console.log('🚀 Starting Echoes of Me Usability Analysis');
  console.log('=' .repeat(60));

  // Test core pages
  console.log('\\n📄 TESTING CORE PAGES');
  await testPage('/', 'Echoes');
  await testPage('/auth/signin', 'sign in');
  await testPage('/auth/register', 'register');
  await testPage('/dashboard');
  await testPage('/daily-question');
  await testPage('/admin');
  await testPage('/training');
  await testPage('/ai-echo');

  // Test API endpoints
  console.log('\\n🔌 TESTING API ENDPOINTS');
  await testAPIEndpoint('/api/health');
  await testAPIEndpoint('/api/questions/daily');
  await testAPIEndpoint('/api/responses');
  await testAPIEndpoint('/api/admin/users');
  await testAPIEndpoint('/api/training/status');

  // Test static resources
  console.log('\\n📦 TESTING STATIC RESOURCES');
  await testAPIEndpoint('/favicon.ico');
  
  // Analyze results
  console.log('\\n📊 ANALYSIS RESULTS');
  console.log('=' .repeat(60));

  const criticalIssues = usabilityIssues.filter(issue => issue.type === 'critical');
  const warningIssues = usabilityIssues.filter(issue => issue.type === 'warning');
  const infoIssues = usabilityIssues.filter(issue => issue.type === 'info');

  console.log(`\\n📈 SUMMARY:`);
  console.log(`   Total Issues: ${usabilityIssues.length}`);
  console.log(`   🔴 Critical: ${criticalIssues.length}`);
  console.log(`   🟡 Warning: ${warningIssues.length}`);
  console.log(`   🔵 Info: ${infoIssues.length}`);
  console.log(`   🌐 Total Requests: ${networkRequests.length}`);

  if (criticalIssues.length > 0) {
    console.log('\\n🔴 CRITICAL ISSUES (Immediate Attention Required):');
    criticalIssues.forEach((issue, index) => {
      console.log(`\\n${index + 1}. [${issue.category.toUpperCase()}] ${issue.description}`);
      console.log(`   📍 Location: ${issue.location}`);
      console.log(`   💡 Recommendation: ${issue.recommendation}`);
    });
  }

  if (warningIssues.length > 0) {
    console.log('\\n🟡 WARNING ISSUES (Should Fix):');
    warningIssues.slice(0, 10).forEach((issue, index) => {
      console.log(`\\n${index + 1}. [${issue.category.toUpperCase()}] ${issue.description}`);
      console.log(`   📍 Location: ${issue.location}`);
      console.log(`   💡 Recommendation: ${issue.recommendation}`);
    });
    if (warningIssues.length > 10) {
      console.log(`\\n   ... and ${warningIssues.length - 10} more warning issues`);
    }
  }

  // Performance analysis
  const slowRequests = networkRequests.filter(req => req.responseTime > 1000);
  const failedRequests = networkRequests.filter(req => req.error || (req.statusCode >= 400));

  console.log('\\n⚡ PERFORMANCE ANALYSIS:');
  console.log(`   Slow requests (>1s): ${slowRequests.length}`);
  console.log(`   Failed requests: ${failedRequests.length}`);

  if (slowRequests.length > 0) {
    console.log('\\n   🐌 Slowest requests:');
    slowRequests
      .sort((a, b) => (b.responseTime || 0) - (a.responseTime || 0))
      .slice(0, 5)
      .forEach(req => {
        console.log(`      ${req.path}: ${req.responseTime}ms`);
      });
  }

  if (failedRequests.length > 0) {
    console.log('\\n   ❌ Failed requests:');
    failedRequests.slice(0, 10).forEach(req => {
      console.log(`      ${req.method} ${req.path}: ${req.statusCode || 'Network Error'} ${req.statusMessage || req.error || ''}`);
    });
  }

  // Generate report file
  const report = {
    summary: {
      totalIssues: usabilityIssues.length,
      critical: criticalIssues.length,
      warnings: warningIssues.length,
      info: infoIssues.length,
      testDate: new Date().toISOString(),
      testEnvironment: BASE_URL,
      totalRequests: networkRequests.length,
      slowRequests: slowRequests.length,
      failedRequests: failedRequests.length
    },
    issues: {
      critical: criticalIssues,
      warnings: warningIssues,
      info: infoIssues
    },
    networkAnalysis: {
      requests: networkRequests,
      slowRequests,
      failedRequests
    },
    recommendations: {
      immediate: criticalIssues.map(issue => ({
        issue: issue.description,
        action: issue.recommendation,
        location: issue.location
      })),
      shortTerm: warningIssues.slice(0, 10).map(issue => ({
        issue: issue.description,
        action: issue.recommendation,
        location: issue.location
      })),
      longTerm: infoIssues.map(issue => ({
        issue: issue.description,
        action: issue.recommendation,
        location: issue.location
      }))
    }
  };

  // Save report
  const reportPath = path.join(__dirname, 'usability-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\\n📄 Detailed report saved to: ${reportPath}`);

  console.log('\\n🎯 NEXT STEPS:');
  if (criticalIssues.length > 0) {
    console.log('   1. 🔴 Fix critical issues that prevent core functionality');
  }
  if (warningIssues.length > 0) {
    console.log('   2. 🟡 Address warning issues to improve user experience');
  }
  if (slowRequests.length > 0) {
    console.log('   3. ⚡ Optimize slow-loading pages and API endpoints');
  }
  console.log('   4. 🧪 Test with real user scenarios and authentication');
  console.log('   5. 📱 Verify mobile responsiveness with device testing');

  console.log('\\n✅ Analysis Complete!');
}

// Run the analysis
runAnalysis().catch(console.error);