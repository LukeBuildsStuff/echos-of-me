const fs = require('fs');
const { execSync } = require('child_process');

console.log('Analyzing Admin Section Structure...\n');

// Fetch the admin page HTML
try {
  console.log('Fetching admin page HTML...');
  const htmlContent = execSync('curl -s http://localhost:3001/admin', { encoding: 'utf8' });
  
  // Save HTML for analysis
  fs.writeFileSync('admin-page.html', htmlContent);
  console.log('Saved admin page HTML to admin-page.html');
  
  // Basic HTML analysis
  console.log('\n=== HTML Analysis ===');
  
  // Check for React hydration errors
  const hydrationErrors = htmlContent.match(/hydration|mismatch/gi) || [];
  console.log(`Hydration error indicators: ${hydrationErrors.length}`);
  
  // Check for error messages
  const errorPatterns = [
    /error|exception|failed/gi,
    /404|500|503/g,
    /undefined|null reference/gi
  ];
  
  errorPatterns.forEach((pattern, index) => {
    const matches = htmlContent.match(pattern) || [];
    if (matches.length > 0) {
      console.log(`Error pattern ${index + 1} matches: ${matches.length} - Examples:`, matches.slice(0, 3));
    }
  });
  
  // Check for key admin elements
  const elements = {
    'Navigation/Sidebar': /<(nav|aside|.*sidebar.*)/gi,
    'Admin Header': /<header|.*admin.*header/gi,
    'Dashboard Content': /dashboard|admin.*content/gi,
    'User Management': /user.*management|users.*admin/gi,
    'Charts/Analytics': /chart|analytics|graph/gi,
    'Tables': /<table|.*data.*table/gi,
    'Forms': /<form|input.*type/gi,
    'Buttons': /<button|.*btn.*/gi
  };
  
  console.log('\n=== Admin Elements Found ===');
  Object.entries(elements).forEach(([name, pattern]) => {
    const matches = htmlContent.match(pattern) || [];
    console.log(`${name}: ${matches.length > 0 ? '✓ Found' : '✗ Not found'} (${matches.length} occurrences)`);
  });
  
  // Check for accessibility attributes
  const a11yChecks = {
    'ARIA labels': /aria-label/gi,
    'ARIA roles': /role=/gi,
    'Alt text': /alt=/gi,
    'Tab index': /tabindex/gi,
    'Screen reader content': /sr-only|visually-hidden/gi
  };
  
  console.log('\n=== Accessibility Checks ===');
  Object.entries(a11yChecks).forEach(([name, pattern]) => {
    const matches = htmlContent.match(pattern) || [];
    console.log(`${name}: ${matches.length} occurrences`);
  });
  
  // Check for responsive classes
  const responsivePatterns = {
    'Mobile classes': /sm:|md:|lg:|xl:/gi,
    'Hidden mobile': /hidden.*sm|sm:hidden/gi,
    'Flex responsive': /flex.*col.*sm|sm:flex/gi,
    'Grid responsive': /grid.*cols.*sm|sm:grid/gi
  };
  
  console.log('\n=== Responsive Design ===');
  Object.entries(responsivePatterns).forEach(([name, pattern]) => {
    const matches = htmlContent.match(pattern) || [];
    console.log(`${name}: ${matches.length} occurrences`);
  });
  
  // Extract inline scripts for error checking
  const scriptTags = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  console.log(`\n=== Scripts Found ===`);
  console.log(`Total script tags: ${scriptTags.length}`);
  
  // Check for common JavaScript issues
  const jsIssues = [];
  scriptTags.forEach((script, index) => {
    if (script.includes('console.error')) jsIssues.push(`Script ${index}: Contains console.error`);
    if (script.includes('undefined')) jsIssues.push(`Script ${index}: References undefined`);
    if (script.includes('catch')) jsIssues.push(`Script ${index}: Has error handling`);
  });
  
  if (jsIssues.length > 0) {
    console.log('JavaScript issues found:');
    jsIssues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  // Check meta tags and performance hints
  const metaTags = htmlContent.match(/<meta[^>]*>/gi) || [];
  const linkTags = htmlContent.match(/<link[^>]*>/gi) || [];
  
  console.log('\n=== Performance & Meta ===');
  console.log(`Meta tags: ${metaTags.length}`);
  console.log(`Link tags: ${linkTags.length}`);
  
  // Check for preload/prefetch
  const preloadCount = linkTags.filter(tag => tag.includes('preload')).length;
  const prefetchCount = linkTags.filter(tag => tag.includes('prefetch')).length;
  console.log(`Preload hints: ${preloadCount}`);
  console.log(`Prefetch hints: ${prefetchCount}`);
  
  // Test other admin endpoints
  console.log('\n=== Testing Admin Endpoints ===');
  const endpoints = [
    '/admin/users',
    '/admin/users/analytics',
    '/admin/training',
    '/admin/monitoring/system',
    '/admin/monitoring/gpu',
    '/admin/content/moderation',
    '/admin/error-recovery'
  ];
  
  endpoints.forEach(endpoint => {
    try {
      const response = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3001${endpoint}`, { encoding: 'utf8' });
      console.log(`${endpoint}: HTTP ${response}`);
    } catch (error) {
      console.log(`${endpoint}: Failed to connect`);
    }
  });
  
} catch (error) {
  console.error('Error fetching admin page:', error.message);
}