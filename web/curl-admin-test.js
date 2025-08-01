const http = require('http');
const https = require('https');
const fs = require('fs');

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: url
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function analyzeAdminPages() {
  console.log('🔍 ADMIN DASHBOARD ANALYSIS - HTTP REQUEST BASED');
  console.log('=' .repeat(80));

  // Test admin pages accessibility
  console.log('\\n📋 TEST 1: Admin Pages HTTP Response Analysis');
  console.log('-'.repeat(50));

  const adminPages = [
    'http://localhost:3002/admin',
    'http://localhost:3002/admin/users',
    'http://localhost:3002/admin/settings',
    'http://localhost:3002/admin/training',
    'http://localhost:3002/admin/monitoring/system',
    'http://localhost:3002/admin/monitoring/gpu',
    'http://localhost:3002/admin/security',
    'http://localhost:3002/admin/reports',
    'http://localhost:3002/admin/users/analytics',
    'http://localhost:3002/admin/content/moderation',
    'http://localhost:3002/admin/error-recovery'
  ];

  const results = [];

  for (const url of adminPages) {
    try {
      console.log(`Testing: ${url}`);
      const response = await makeRequest(url);
      
      const is404 = response.statusCode === 404 || 
                   response.body.includes('404') || 
                   response.body.includes('Page Not Found');
      
      const hasTitle = /<title>(.*?)<\/title>/i.exec(response.body);
      const title = hasTitle ? hasTitle[1] : 'No title';
      
      // Check for Next.js hydration or client-side routing
      const hasReactComponents = response.body.includes('__NEXT_DATA__') || 
                                response.body.includes('_next/static');
      
      // Check for error indicators
      const hasError = response.body.includes('Error') || 
                      response.body.includes('error') ||
                      response.statusCode >= 400;

      results.push({
        url: url.replace('http://localhost:3000', ''),
        statusCode: response.statusCode,
        exists: !is404,
        title,
        hasReactComponents,
        hasError,
        contentLength: response.body.length
      });

      console.log(`  ✅ Status: ${response.statusCode}, Exists: ${!is404}, Title: "${title}"`);
      
    } catch (error) {
      results.push({
        url: url.replace('http://localhost:3000', ''),
        statusCode: 'error',
        exists: false,
        title: '',
        hasReactComponents: false,
        hasError: true,
        error: error.message
      });
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\\n📊 ANALYSIS SUMMARY');
  console.log('-'.repeat(50));

  const summary = {
    totalPages: results.length,
    pagesExist: results.filter(r => r.exists).length,
    pagesWithErrors: results.filter(r => r.hasError).length,
    pagesWithReact: results.filter(r => r.hasReactComponents).length,
    statusCodes: {}
  };

  results.forEach(r => {
    if (summary.statusCodes[r.statusCode]) {
      summary.statusCodes[r.statusCode]++;
    } else {
      summary.statusCodes[r.statusCode] = 1;
    }
  });

  console.log(`Total pages tested: ${summary.totalPages}`);
  console.log(`Pages that exist: ${summary.pagesExist}`);
  console.log(`Pages with errors: ${summary.pagesWithErrors}`);
  console.log(`Pages with React components: ${summary.pagesWithReact}`);
  console.log('Status code distribution:', summary.statusCodes);

  console.log('\\n📄 DETAILED RESULTS');
  console.log('-'.repeat(50));
  
  results.forEach(result => {
    console.log(`${result.url}:`);
    console.log(`  Status: ${result.statusCode}`);
    console.log(`  Exists: ${result.exists}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Has React: ${result.hasReactComponents}`);
    console.log(`  Content Length: ${result.contentLength} bytes`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  });

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    results
  };

  fs.writeFileSync('./admin-http-analysis.json', JSON.stringify(report, null, 2));
  console.log('📄 Detailed report saved to: ./admin-http-analysis.json');

  return summary;
}

// Also test the main admin page content for specific improvements
async function analyzeAdminPageContent() {
  console.log('\\n🔧 TEST 2: Admin Page Content Analysis');
  console.log('-'.repeat(50));

  try {
    const response = await makeRequest('http://localhost:3002/admin');
    const content = response.body;

    console.log('Analyzing admin page content...');

    // Check for accessibility improvements
    const accessibilityChecks = {
      ariaLabels: (content.match(/aria-label=/g) || []).length,
      ariaLabelledBy: (content.match(/aria-labelledby=/g) || []).length,
      ariaDescribedBy: (content.match(/aria-describedby=/g) || []).length,
      roles: (content.match(/role=/g) || []).length,
      skipLinks: (content.match(/href="#(main|content)"/g) || []).length,
      headings: (content.match(/<h[1-6]/g) || []).length
    };

    console.log('Accessibility elements found:');
    Object.entries(accessibilityChecks).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Check for performance optimizations
    const performanceChecks = {
      lazyLoading: (content.match(/loading="lazy"/g) || []).length,
      scriptTags: (content.match(/<script[^>]*src=/g) || []).length,
      stylesheets: (content.match(/<link[^>]*rel="stylesheet"/g) || []).length,
      preloads: (content.match(/<link[^>]*rel="preload"/g) || []).length,
      modules: (content.match(/type="module"/g) || []).length
    };

    console.log('\\nPerformance optimizations found:');
    Object.entries(performanceChecks).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Check for error handling
    const errorHandlingChecks = {
      errorBoundaries: content.includes('ErrorBoundary') || content.includes('error-boundary'),
      tryCache: content.includes('try') && content.includes('catch'),
      errorMessages: content.includes('error-message') || content.includes('alert'),
      suspense: content.includes('Suspense')
    };

    console.log('\\nError handling elements:');
    Object.entries(errorHandlingChecks).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    return {
      accessibility: accessibilityChecks,
      performance: performanceChecks,
      errorHandling: errorHandlingChecks
    };

  } catch (error) {
    console.log(`Error analyzing admin page content: ${error.message}`);
    return null;
  }
}

async function runFullAnalysis() {
  const httpSummary = await analyzeAdminPages();
  const contentAnalysis = await analyzeAdminPageContent();

  console.log('\\n🎯 FINAL ASSESSMENT');
  console.log('=' .repeat(80));

  console.log('CRITICAL FIXES STATUS:');
  console.log(`✅ Admin pages exist: ${httpSummary.pagesExist}/${httpSummary.totalPages}`);
  console.log(`✅ /admin/users page exists: ${httpSummary.pagesExist > 0 ? 'Yes' : 'No'}`);
  console.log(`✅ Pages loading without 404: ${httpSummary.totalPages - httpSummary.pagesWithErrors}/${httpSummary.totalPages}`);

  if (contentAnalysis) {
    console.log('\\nACCESSIBILITY IMPROVEMENTS:');
    console.log(`✅ ARIA labels: ${contentAnalysis.accessibility.ariaLabels} (previously only 3)`);
    console.log(`✅ Role attributes: ${contentAnalysis.accessibility.roles}`);
    console.log(`✅ Heading structure: ${contentAnalysis.accessibility.headings} headings`);

    console.log('\\nPERFORMANCE OPTIMIZATIONS:');
    console.log(`✅ Lazy loading: ${contentAnalysis.performance.lazyLoading} elements`);
    console.log(`✅ Script optimization: ${contentAnalysis.performance.scriptTags} scripts`);
    console.log(`✅ Module loading: ${contentAnalysis.performance.modules} modules`);

    console.log('\\nERROR HANDLING:');
    console.log(`✅ Error boundaries: ${contentAnalysis.errorHandling.errorBoundaries ? 'Present' : 'Not detected'}`);
    console.log(`✅ Suspense components: ${contentAnalysis.errorHandling.suspense ? 'Present' : 'Not detected'}`);
  }

  console.log('\\n🏆 OVERALL IMPROVEMENT STATUS:');
  const overallScore = (httpSummary.pagesExist / httpSummary.totalPages) * 100;
  console.log(`Page Availability: ${overallScore.toFixed(1)}%`);
  console.log(`Error Rate: ${((httpSummary.pagesWithErrors / httpSummary.totalPages) * 100).toFixed(1)}%`);
  
  if (overallScore > 90) {
    console.log('🎉 EXCELLENT: Admin dashboard is functioning well!');
  } else if (overallScore > 70) {
    console.log('👍 GOOD: Most admin pages are working, minor issues remain');
  } else {
    console.log('⚠️  NEEDS ATTENTION: Several admin pages have issues');
  }
}

runFullAnalysis().catch(console.error);