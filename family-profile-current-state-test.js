#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Family Profile Current State Test
 * This script tests the current live state of the family profile interface
 * to document what the user is actually seeing vs what should be there.
 */

class FamilyProfileTester {
  constructor() {
    this.baseUrl = 'http://localhost:3003';
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      issues: [],
      recommendations: []
    };
  }

  async makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FamilyProfileTester/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          ...options.headers
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: url.href
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  addTestResult(testName, status, details, issue = null) {
    this.testResults.tests.push({
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    
    if (issue) {
      this.testResults.issues.push(issue);
    }
  }

  async testApplicationAccessibility() {
    try {
      console.log('🔍 Testing application accessibility...');
      const response = await this.makeRequest('/');
      
      if (response.statusCode === 200) {
        this.addTestResult('Application Load', 'PASS', 
          `Application accessible at ${this.baseUrl}`);
        
        // Check if it's the landing page
        if (response.body.includes('Echos Of Me')) {
          this.addTestResult('Landing Page', 'PASS', 
            'Landing page loads correctly with expected content');
        }
        
        return true;
      } else {
        this.addTestResult('Application Load', 'FAIL', 
          `HTTP ${response.statusCode}`, 
          { type: 'accessibility', description: 'Application not accessible' });
        return false;
      }
    } catch (error) {
      this.addTestResult('Application Load', 'ERROR', 
        error.message, 
        { type: 'connectivity', description: 'Connection failed' });
      return false;
    }
  }

  async testSignInPage() {
    try {
      console.log('🔍 Testing sign-in page...');
      const response = await this.makeRequest('/auth/signin');
      
      if (response.statusCode === 200) {
        const hasEmailField = response.body.includes('id="email"');
        const hasPasswordField = response.body.includes('id="password"');
        const hasSignInButton = response.body.includes('Sign In');
        
        if (hasEmailField && hasPasswordField && hasSignInButton) {
          this.addTestResult('Sign-in Form', 'PASS', 
            'Sign-in page loads with all required form elements');
        } else {
          this.addTestResult('Sign-in Form', 'INCOMPLETE', 
            'Sign-in page missing some form elements',
            { 
              type: 'ui', 
              description: 'Sign-in form incomplete',
              details: { hasEmailField, hasPasswordField, hasSignInButton }
            });
        }
        
        return true;
      } else {
        this.addTestResult('Sign-in Page', 'FAIL', 
          `HTTP ${response.statusCode}`, 
          { type: 'navigation', description: 'Sign-in page not accessible' });
        return false;
      }
    } catch (error) {
      this.addTestResult('Sign-in Page', 'ERROR', error.message);
      return false;
    }
  }

  async testDashboardAccess() {
    try {
      console.log('🔍 Testing dashboard access (without authentication)...');
      const response = await this.makeRequest('/dashboard');
      
      // Expecting redirect or 401 without authentication
      if (response.statusCode === 401 || response.statusCode === 302 || response.statusCode === 307) {
        this.addTestResult('Dashboard Protection', 'PASS', 
          `Dashboard properly protected (HTTP ${response.statusCode})`);
        return true;
      } else if (response.statusCode === 200) {
        // Dashboard accessible without auth - potential security issue
        this.addTestResult('Dashboard Protection', 'SECURITY_CONCERN', 
          'Dashboard accessible without authentication',
          { 
            type: 'security', 
            description: 'Dashboard may be accessible without proper authentication'
          });
        return false;
      } else {
        this.addTestResult('Dashboard Access', 'UNEXPECTED', 
          `Unexpected response: HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      this.addTestResult('Dashboard Access', 'ERROR', error.message);
      return false;
    }
  }

  async testFamilyMemberAPI() {
    try {
      console.log('🔍 Testing family member API endpoints...');
      const response = await this.makeRequest('/api/user/family-members');
      
      // Should be protected (401) without authentication
      if (response.statusCode === 401) {
        this.addTestResult('Family Member API', 'PASS', 
          'API properly protected with authentication');
        return true;
      } else {
        this.addTestResult('Family Member API', 'UNEXPECTED', 
          `Unexpected response: HTTP ${response.statusCode}`,
          { 
            type: 'api', 
            description: 'API response unexpected without authentication'
          });
        return false;
      }
    } catch (error) {
      this.addTestResult('Family Member API', 'ERROR', error.message);
      return false;
    }
  }

  async analyzeCurrentFamilyProfileComponents() {
    console.log('🔍 Analyzing family profile components...');
    
    // Check if key components exist
    const fs = require('fs').promises;
    const path = require('path');
    
    const componentChecks = [
      { name: 'GroupedFamilyView', path: 'components/family/GroupedFamilyView.tsx' },
      { name: 'InlineEditableFamilyMember', path: 'components/family/InlineEditableFamilyMember.tsx' },
      { name: 'QuickAddFamilyModal', path: 'components/family/QuickAddFamilyModal.tsx' },
      { name: 'UserSettings', path: 'components/UserSettings.tsx' }
    ];
    
    for (const component of componentChecks) {
      try {
        const fullPath = path.join(__dirname, component.path);
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        
        if (exists) {
          const content = await fs.readFile(fullPath, 'utf8');
          const hasEditFunctionality = content.includes('edit') || content.includes('Edit');
          const hasModalSupport = content.includes('modal') || content.includes('Modal');
          const hasGrouping = content.includes('group') || content.includes('Group');
          
          this.addTestResult(`${component.name} Component`, 'EXISTS', 
            `Component found with features: ${[
              hasEditFunctionality ? 'edit' : null,
              hasModalSupport ? 'modal' : null,
              hasGrouping ? 'grouping' : null
            ].filter(Boolean).join(', ') || 'basic'}`);
        } else {
          this.addTestResult(`${component.name} Component`, 'MISSING', 
            'Component file not found',
            { 
              type: 'component', 
              description: `${component.name} component missing`,
              path: component.path
            });
        }
      } catch (error) {
        this.addTestResult(`${component.name} Component`, 'ERROR', 
          `Error checking component: ${error.message}`);
      }
    }
  }

  async simulateUserFlow() {
    console.log('🔍 Simulating typical user flow...');
    
    const userFlow = [
      { step: 'Load homepage', url: '/' },
      { step: 'Navigate to sign-in', url: '/auth/signin' },
      { step: 'Attempt dashboard access', url: '/dashboard' },
      { step: 'Check API availability', url: '/api/user/family-members' }
    ];
    
    for (const flow of userFlow) {
      try {
        const response = await this.makeRequest(flow.url);
        this.addTestResult(`User Flow: ${flow.step}`, 'TESTED', 
          `${flow.url} → HTTP ${response.statusCode}`);
      } catch (error) {
        this.addTestResult(`User Flow: ${flow.step}`, 'ERROR', 
          `${flow.url} → ${error.message}`,
          { 
            type: 'user_flow', 
            description: `User flow interrupted at ${flow.step}`
          });
      }
    }
  }

  generateRecommendations() {
    console.log('📋 Generating recommendations...');
    
    // Based on test results, generate specific recommendations
    const hasComponentIssues = this.testResults.issues.some(issue => issue.type === 'component');
    const hasAPIIssues = this.testResults.issues.some(issue => issue.type === 'api');
    const hasUIIssues = this.testResults.issues.some(issue => issue.type === 'ui');
    
    if (hasComponentIssues) {
      this.testResults.recommendations.push({
        priority: 'HIGH',
        category: 'Component Architecture',
        description: 'Family profile components need to be properly integrated and deployed',
        action: 'Verify component loading and integration in UserSettings'
      });
    }
    
    if (hasAPIIssues) {
      this.testResults.recommendations.push({
        priority: 'HIGH',
        category: 'API Integration',
        description: 'Family member API endpoints need verification',
        action: 'Test authenticated API calls and data persistence'
      });
    }
    
    if (hasUIIssues) {
      this.testResults.recommendations.push({
        priority: 'MEDIUM',
        category: 'User Interface',
        description: 'UI components may need refinement or bug fixes',
        action: 'Test specific UI interactions and edit functionality'
      });
    }
    
    // Always recommend manual testing for family profile
    this.testResults.recommendations.push({
      priority: 'HIGH',
      category: 'Manual Verification',
      description: 'Family profile edit functionality requires manual testing with authenticated user',
      action: 'Sign in as authenticated user and test: 1) Family member display, 2) Edit buttons visibility, 3) Add new member functionality'
    });
  }

  async runFullTest() {
    console.log('🚀 Starting Family Profile Current State Test');
    console.log(`Target: ${this.baseUrl}`);
    console.log('=' * 50);
    
    // Run all tests
    await this.testApplicationAccessibility();
    await this.testSignInPage();
    await this.testDashboardAccess();
    await this.testFamilyMemberAPI();
    await this.analyzeCurrentFamilyProfileComponents();
    await this.simulateUserFlow();
    
    // Generate insights
    this.generateRecommendations();
    
    return this.testResults;
  }

  printReport() {
    console.log('\n📊 FAMILY PROFILE CURRENT STATE TEST REPORT');
    console.log('=' * 60);
    console.log(`Timestamp: ${this.testResults.timestamp}`);
    console.log(`Total Tests: ${this.testResults.tests.length}`);
    console.log(`Issues Found: ${this.testResults.issues.length}`);
    
    console.log('\n📋 Test Results:');
    console.log('-' * 40);
    this.testResults.tests.forEach(test => {
      const statusIcon = {
        'PASS': '✅',
        'FAIL': '❌',
        'ERROR': '🚨',
        'INCOMPLETE': '⚠️',
        'MISSING': '❌',
        'EXISTS': '✅',
        'TESTED': '🔄',
        'UNEXPECTED': '❓',
        'SECURITY_CONCERN': '🔐'
      }[test.status] || '❓';
      
      console.log(`${statusIcon} ${test.test}: ${test.details}`);
    });
    
    if (this.testResults.issues.length > 0) {
      console.log('\n🚨 Issues Found:');
      console.log('-' * 40);
      this.testResults.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.type.toUpperCase()}] ${issue.description}`);
        if (issue.details) {
          console.log(`   Details: ${JSON.stringify(issue.details, null, 2)}`);
        }
      });
    }
    
    console.log('\n💡 Recommendations:');
    console.log('-' * 40);
    this.testResults.recommendations.forEach((rec, index) => {
      const priorityIcon = {
        'HIGH': '🔴',
        'MEDIUM': '🟡',
        'LOW': '🟢'
      }[rec.priority] || '⚪';
      
      console.log(`${index + 1}. ${priorityIcon} [${rec.category}] ${rec.description}`);
      console.log(`   Action: ${rec.action}`);
    });
    
    console.log('\n' + '=' * 60);
  }
}

// Run the test
async function main() {
  const tester = new FamilyProfileTester();
  
  try {
    const results = await tester.runFullTest();
    tester.printReport();
    
    // Save results to file
    const fs = require('fs').promises;
    await fs.writeFile(
      'family-profile-current-state-report.json', 
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n💾 Detailed report saved to: family-profile-current-state-report.json');
    
    // Exit with appropriate code
    const hasErrors = results.issues.some(issue => 
      ['component', 'api', 'ui'].includes(issue.type)
    );
    
    if (hasErrors) {
      console.log('\n⚠️  Issues found that require attention');
      process.exit(1);
    } else {
      console.log('\n✅ Test completed - ready for manual verification');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n🚨 Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { FamilyProfileTester };