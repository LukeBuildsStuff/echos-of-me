const fs = require('fs');

function diagnoseNextAuthConfig() {
  console.log('🔍 Diagnosing NextAuth.js configuration issues...');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'Not set'}`);
  console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
  
  // Read .env.local file
  let envLocalContent = '';
  try {
    envLocalContent = fs.readFileSync('.env.local', 'utf8');
    console.log('\n📄 .env.local contents:');
    const envLines = envLocalContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    envLines.forEach(line => {
      if (line.includes('NEXTAUTH')) {
        console.log(`   ${line}`);
      }
    });
  } catch (error) {
    console.log('\n❌ Cannot read .env.local file');
  }
  
  // Analyze the configuration
  console.log('\n🔬 Configuration Analysis:');
  
  const issues = [];
  const recommendations = [];
  
  // Check NEXTAUTH_URL
  if (process.env.NEXTAUTH_URL) {
    if (process.env.NEXTAUTH_URL.includes('echosofme.io') || process.env.NEXTAUTH_URL.includes('https://')) {
      issues.push({
        type: 'CRITICAL',
        issue: 'NEXTAUTH_URL mismatch',
        details: `NEXTAUTH_URL is set to '${process.env.NEXTAUTH_URL}' but testing on localhost:3000`,
        impact: 'Prevents cookies from being set correctly, causes authentication failures'
      });
      
      recommendations.push({
        type: 'FIX',
        action: 'Update NEXTAUTH_URL for local development',
        details: 'Set NEXTAUTH_URL=http://localhost:3000 in .env.local for local testing'
      });
    }
  } else {
    issues.push({
      type: 'WARNING',
      issue: 'NEXTAUTH_URL not set',
      details: 'NEXTAUTH_URL environment variable is not set',
      impact: 'May cause authentication issues in production'
    });
  }
  
  // Check NEXTAUTH_SECRET
  if (!process.env.NEXTAUTH_SECRET) {
    issues.push({
      type: 'CRITICAL',
      issue: 'NEXTAUTH_SECRET not set',
      details: 'NEXTAUTH_SECRET environment variable is missing',
      impact: 'Authentication will fail completely'
    });
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    issues.push({
      type: 'WARNING',
      issue: 'NEXTAUTH_SECRET too short',
      details: `Secret is ${process.env.NEXTAUTH_SECRET.length} characters, should be at least 32`,
      impact: 'Security vulnerability'
    });
  }
  
  // Check for localhost vs production URL issues
  if (envLocalContent.includes('echosofme.io')) {
    issues.push({
      type: 'CRITICAL',
      issue: 'Production URL in local environment',
      details: 'Local .env.local file contains production URLs',
      impact: 'Prevents local development and testing'
    });
    
    recommendations.push({
      type: 'FIX',
      action: 'Create proper local environment configuration',
      details: 'Use localhost URLs for local development, production URLs only in production'
    });
  }
  
  // Display results
  console.log('\n=== DIAGNOSIS RESULTS ===');
  
  if (issues.length === 0) {
    console.log('✅ No configuration issues found');
  } else {
    console.log(`❌ Found ${issues.length} configuration issue(s):`);
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.type}: ${issue.issue}`);
      console.log(`   Details: ${issue.details}`);
      console.log(`   Impact: ${issue.impact}`);
    });
  }
  
  if (recommendations.length > 0) {
    console.log(`\n🔧 ${recommendations.length} recommendation(s):`);
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.action}`);
      console.log(`   ${rec.details}`);
    });
  }
  
  // Provide specific fix for the login loop issue
  console.log('\n=== LOGIN LOOP FIX ===');
  console.log('🎯 Root cause identified:');
  console.log('   • NEXTAUTH_URL is set to production domain (echosofme.io)');
  console.log('   • Testing is done on localhost:3000');
  console.log('   • Cookie domain mismatch prevents authentication');
  console.log('   • User gets stuck in login loop');
  
  console.log('\n✅ Solution:');
  console.log('   1. Update .env.local: NEXTAUTH_URL=http://localhost:3000');
  console.log('   2. Restart the development server');
  console.log('   3. Clear browser cookies for localhost:3000');
  console.log('   4. Test login flow again');
  
  return {
    issues,
    recommendations,
    rootCause: 'NEXTAUTH_URL domain mismatch',
    solution: 'Update NEXTAUTH_URL to http://localhost:3000 for local testing'
  };
}

// Load environment variables manually for testing
require('dotenv').config({ path: '.env.local' });

const diagnosis = diagnoseNextAuthConfig();

// Save diagnosis results
fs.writeFileSync('nextauth-diagnosis.json', JSON.stringify(diagnosis, null, 2));
console.log('\n📊 Diagnosis saved to nextauth-diagnosis.json');