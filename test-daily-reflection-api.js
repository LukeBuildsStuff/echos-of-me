const fetch = require('node-fetch');
const { Pool } = require('pg');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3000',
  testUser: {
    email: 'lukemoeller@yahoo.com',
    password: 'password123'
  },
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://echosofme:secure_dev_password@localhost:5432/echosofme_dev'
  }
};

// Database connection
const pool = new Pool({
  connectionString: config.database.connectionString
});

// Test report structure
const testReport = {
  testName: 'Daily Reflection API End-to-End Test',
  testDate: new Date().toISOString(),
  testUser: config.testUser.email,
  results: {
    authentication: [],
    questionLoading: [],
    responseSubmission: [],
    dataValidation: [],
    errorHandling: [],
    databaseVerification: []
  },
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    critical: []
  }
};

// Helper function to add test result
function addTestResult(category, test) {
  testReport.results[category].push(test);
  testReport.summary.totalTests++;
  if (test.status === 'PASS') {
    testReport.summary.passed++;
  } else {
    testReport.summary.failed++;
    if (test.severity === 'Critical') {
      testReport.summary.critical.push(test.name);
    }
  }
}

// Database helper functions
async function getUserId(email) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

async function getResponseCount(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT COUNT(*) FROM responses WHERE user_id = $1', [userId]);
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

async function getLatestResponse(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT r.*, q.question_text 
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [userId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function deleteTestResponses(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      DELETE FROM responses 
      WHERE user_id = $1 
      AND created_at > NOW() - INTERVAL '1 hour'
      AND response_text LIKE 'TEST RESPONSE:%'
      RETURNING id
    `, [userId]);
    console.log(`Cleaned up ${result.rows.length} test responses`);
  } finally {
    client.release();
  }
}

// Main test function
async function runTests() {
  let sessionCookie = null;
  let userId = null;
  let testQuestionId = null;
  
  try {
    console.log('🚀 Starting Daily Reflection API E2E Tests...\n');
    
    // Get user ID from database
    userId = await getUserId(config.testUser.email);
    if (!userId) {
      throw new Error('Test user not found in database');
    }
    console.log(`✅ Found test user ID: ${userId}`);
    
    // =====================
    // 1. AUTHENTICATION TEST
    // =====================
    console.log('\n🔐 Testing Authentication...');
    
    // Test NextAuth signin
    const signinResponse = await fetch(`${config.baseUrl}/api/auth/signin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: config.testUser.email,
        password: config.testUser.password,
        csrfToken: 'test', // In real scenario, would get this from the signin page
        callbackUrl: `${config.baseUrl}/dashboard`,
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    // Extract session cookie
    const setCookieHeader = signinResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
    }
    
    addTestResult('authentication', {
      name: 'NextAuth Sign In',
      status: signinResponse.ok || signinResponse.status === 302 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: `Status: ${signinResponse.status}, Cookie: ${sessionCookie ? 'Present' : 'Missing'}`
    });
    
    // Verify session
    const sessionResponse = await fetch(`${config.baseUrl}/api/auth/session`, {
      headers: {
        'Cookie': sessionCookie || ''
      }
    });
    const sessionData = await sessionResponse.json();
    
    addTestResult('authentication', {
      name: 'Session Verification',
      status: sessionData.user?.email === config.testUser.email ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: `Session user: ${sessionData.user?.email || 'Not found'}`
    });
    
    // =======================
    // 2. QUESTION LOADING TEST
    // =======================
    console.log('\n❓ Testing Question Loading...');
    
    // Test daily status endpoint
    const dailyStatusResponse = await fetch(`${config.baseUrl}/api/daily-status`, {
      headers: {
        'Cookie': sessionCookie || ''
      }
    });
    const dailyStatus = await dailyStatusResponse.json();
    
    addTestResult('questionLoading', {
      name: 'Daily Status Check',
      status: dailyStatusResponse.ok ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Can answer more: ${dailyStatus.canAnswerMore}, Today count: ${dailyStatus.todayCount}`
    });
    
    // Test questions endpoint
    const questionsResponse = await fetch(`${config.baseUrl}/api/questions/role-based`, {
      headers: {
        'Cookie': sessionCookie || ''
      }
    });
    const questionsData = await questionsResponse.json();
    
    addTestResult('questionLoading', {
      name: 'Load Role-Based Questions',
      status: questionsData.questions && questionsData.questions.length > 0 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: `Questions loaded: ${questionsData.questions?.length || 0}`
    });
    
    // Select a test question
    if (questionsData.questions && questionsData.questions.length > 0) {
      testQuestionId = questionsData.questions[0].id;
      
      addTestResult('questionLoading', {
        name: 'Question Structure Validation',
        status: questionsData.questions[0].question_text && questionsData.questions[0].category ? 'PASS' : 'FAIL',
        severity: 'High',
        details: `Question ID: ${testQuestionId}, Category: ${questionsData.questions[0].category}`
      });
    }
    
    // ==========================
    // 3. RESPONSE SUBMISSION TEST
    // ==========================
    console.log('\n📤 Testing Response Submission...');
    
    if (!testQuestionId) {
      addTestResult('responseSubmission', {
        name: 'Response Submission',
        status: 'FAIL',
        severity: 'Critical',
        details: 'No question ID available for testing'
      });
    } else {
      // Get initial response count
      const initialResponseCount = await getResponseCount(userId);
      
      // Test different response scenarios
      const testScenarios = [
        {
          name: 'Short Response',
          response: 'TEST RESPONSE: This is a short answer to test the submission flow.',
          expectedStatus: 201
        },
        {
          name: 'Medium Response',
          response: 'TEST RESPONSE: This is a medium-length response that contains multiple sentences. It demonstrates how the system handles typical user responses with more detail. The response includes personal reflection and meaningful content that would be valuable for AI training.',
          expectedStatus: 201
        },
        {
          name: 'Long Response',
          response: 'TEST RESPONSE: ' + 'This is a very detailed response. '.repeat(50) + 'It tests the system\'s ability to handle longer, more comprehensive answers.',
          expectedStatus: 201
        }
      ];
      
      for (const scenario of testScenarios) {
        console.log(`\n  Testing: ${scenario.name}`);
        
        const submitResponse = await fetch(`${config.baseUrl}/api/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie || ''
          },
          body: JSON.stringify({
            questionId: testQuestionId,
            responseText: scenario.response,
            isDraft: false
          })
        });
        
        const submitResult = await submitResponse.json();
        
        addTestResult('responseSubmission', {
          name: `Submit ${scenario.name}`,
          status: submitResponse.status === scenario.expectedStatus ? 'PASS' : 'FAIL',
          severity: 'Critical',
          details: `Status: ${submitResponse.status}, Success: ${submitResult.success}`
        });
        
        // Verify response structure
        if (submitResult.success) {
          addTestResult('dataValidation', {
            name: `Response Data - ${scenario.name}`,
            status: submitResult.response?.id && submitResult.response?.wordCount ? 'PASS' : 'FAIL',
            severity: 'High',
            details: `Response ID: ${submitResult.response?.id}, Word count: ${submitResult.response?.wordCount}`
          });
          
          // Check quality score
          addTestResult('dataValidation', {
            name: `Quality Score - ${scenario.name}`,
            status: submitResult.quality?.score !== undefined ? 'PASS' : 'FAIL',
            severity: 'Medium',
            details: `Quality score: ${submitResult.quality?.score || 'Not provided'}`
          });
          
          // Clean up this test response immediately
          await deleteTestResponses(userId);
          
          // Use a different question for next test to avoid duplicate response error
          if (questionsData.questions.length > testScenarios.indexOf(scenario) + 1) {
            testQuestionId = questionsData.questions[testScenarios.indexOf(scenario) + 1].id;
          }
        }
      }
    }
    
    // ======================
    // 4. ERROR HANDLING TEST
    // ======================
    console.log('\n⚠️ Testing Error Scenarios...');
    
    // Test empty response
    const emptyResponse = await fetch(`${config.baseUrl}/api/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie || ''
      },
      body: JSON.stringify({
        questionId: testQuestionId,
        responseText: '',
        isDraft: false
      })
    });
    
    addTestResult('errorHandling', {
      name: 'Empty Response Rejection',
      status: emptyResponse.status === 400 ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Status: ${emptyResponse.status}`
    });
    
    // Test invalid question ID
    const invalidQuestionResponse = await fetch(`${config.baseUrl}/api/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie || ''
      },
      body: JSON.stringify({
        questionId: '99999',
        responseText: 'TEST RESPONSE: Invalid question test',
        isDraft: false
      })
    });
    
    addTestResult('errorHandling', {
      name: 'Invalid Question ID Handling',
      status: invalidQuestionResponse.status === 404 ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Status: ${invalidQuestionResponse.status}`
    });
    
    // Test without authentication
    const unauthResponse = await fetch(`${config.baseUrl}/api/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        questionId: testQuestionId,
        responseText: 'TEST RESPONSE: Unauthenticated test',
        isDraft: false
      })
    });
    
    addTestResult('errorHandling', {
      name: 'Unauthenticated Request Rejection',
      status: unauthResponse.status === 401 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: `Status: ${unauthResponse.status}`
    });
    
    // Test whitespace-only response
    const whitespaceResponse = await fetch(`${config.baseUrl}/api/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie || ''
      },
      body: JSON.stringify({
        questionId: testQuestionId,
        responseText: '   \n\t   ',
        isDraft: false
      })
    });
    
    addTestResult('errorHandling', {
      name: 'Whitespace-Only Response Rejection',
      status: whitespaceResponse.status === 400 ? 'PASS' : 'FAIL',
      severity: 'Medium',
      details: `Status: ${whitespaceResponse.status}`
    });
    
    // ===========================
    // 5. DATABASE VERIFICATION
    // ===========================
    console.log('\n💾 Verifying Database Storage...');
    
    // Submit a final test response for database verification
    const finalTestResponse = 'TEST RESPONSE: Final submission for database verification. This response should be properly stored with all required fields.';
    
    // Get a fresh question ID
    const freshQuestionsResponse = await fetch(`${config.baseUrl}/api/questions/role-based`, {
      headers: {
        'Cookie': sessionCookie || ''
      }
    });
    const freshQuestionsData = await freshQuestionsResponse.json();
    const freshQuestionId = freshQuestionsData.questions?.[freshQuestionsData.questions.length - 1]?.id;
    
    if (freshQuestionId) {
      const finalSubmitResponse = await fetch(`${config.baseUrl}/api/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie || ''
        },
        body: JSON.stringify({
          questionId: freshQuestionId,
          responseText: finalTestResponse,
          isDraft: false
        })
      });
      
      if (finalSubmitResponse.ok) {
        // Wait a moment for database write
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify in database
        const latestResponse = await getLatestResponse(userId);
        
        addTestResult('databaseVerification', {
          name: 'Response Text Storage',
          status: latestResponse?.response_text === finalTestResponse ? 'PASS' : 'FAIL',
          severity: 'Critical',
          details: 'Text stored correctly in database'
        });
        
        addTestResult('databaseVerification', {
          name: 'User ID Association',
          status: latestResponse?.user_id === userId ? 'PASS' : 'FAIL',
          severity: 'Critical',
          details: `User ID matches: ${latestResponse?.user_id === userId}`
        });
        
        addTestResult('databaseVerification', {
          name: 'Question ID Association',
          status: latestResponse?.question_id == freshQuestionId ? 'PASS' : 'FAIL',
          severity: 'Critical',
          details: `Question ID: ${latestResponse?.question_id}`
        });
        
        addTestResult('databaseVerification', {
          name: 'Word Count Calculation',
          status: latestResponse?.word_count > 0 ? 'PASS' : 'FAIL',
          severity: 'Medium',
          details: `Word count: ${latestResponse?.word_count}`
        });
        
        addTestResult('databaseVerification', {
          name: 'Timestamps',
          status: latestResponse?.created_at && latestResponse?.updated_at ? 'PASS' : 'FAIL',
          severity: 'Medium',
          details: 'Created and updated timestamps present'
        });
        
        addTestResult('databaseVerification', {
          name: 'Draft Status',
          status: latestResponse?.is_draft === false ? 'PASS' : 'FAIL',
          severity: 'High',
          details: `Is draft: ${latestResponse?.is_draft}`
        });
      }
    }
    
    // Test data retrieval
    const retrieveResponse = await fetch(`${config.baseUrl}/api/responses?limit=5`, {
      headers: {
        'Cookie': sessionCookie || ''
      }
    });
    const retrievedData = await retrieveResponse.json();
    
    addTestResult('databaseVerification', {
      name: 'Response Retrieval API',
      status: retrieveResponse.ok && retrievedData.responses ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Retrieved ${retrievedData.responses?.length || 0} responses`
    });
    
    // Clean up all test responses
    await deleteTestResponses(userId);
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
    addTestResult('authentication', {
      name: 'Test Execution',
      status: 'FAIL',
      severity: 'Critical',
      details: error.message
    });
  } finally {
    await pool.end();
  }
  
  // Generate test report
  generateReport();
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\nTest Name: ${testReport.testName}`);
  console.log(`Test Date: ${testReport.testDate}`);
  console.log(`Test User: ${testReport.testUser}`);
  
  console.log('\n📈 Overall Results:');
  console.log(`Total Tests: ${testReport.summary.totalTests}`);
  console.log(`✅ Passed: ${testReport.summary.passed}`);
  console.log(`❌ Failed: ${testReport.summary.failed}`);
  console.log(`Success Rate: ${((testReport.summary.passed / testReport.summary.totalTests) * 100).toFixed(1)}%`);
  
  if (testReport.summary.critical.length > 0) {
    console.log('\n🚨 CRITICAL FAILURES:');
    testReport.summary.critical.forEach(test => {
      console.log(`  - ${test}`);
    });
  }
  
  // Detailed results by category
  Object.entries(testReport.results).forEach(([category, tests]) => {
    if (tests.length > 0) {
      console.log(`\n📋 ${category.toUpperCase().replace(/_/g, ' ')}:`);
      tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${test.name}`);
        if (test.status === 'FAIL' || test.details !== test.name) {
          console.log(`     ${test.details}`);
        }
      });
    }
  });
  
  // Save report to file
  const fs = require('fs');
  const reportPath = './daily-reflection-api-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport();
  fs.writeFileSync('./DAILY_REFLECTION_TEST_REPORT.md', markdownReport);
  console.log(`📝 Markdown report saved to: ./DAILY_REFLECTION_TEST_REPORT.md`);
  
  // Overall assessment
  console.log('\n' + '='.repeat(80));
  console.log('🎯 OVERALL ASSESSMENT:');
  
  const successRate = (testReport.summary.passed / testReport.summary.totalTests) * 100;
  
  if (successRate === 100) {
    console.log('✅ EXCELLENT! All tests passed. The daily reflection submission flow is working perfectly.');
  } else if (successRate >= 90 && testReport.summary.critical.length === 0) {
    console.log('✅ GOOD! Core functionality is working with minor issues.');
  } else if (successRate >= 70 && testReport.summary.critical.length === 0) {
    console.log('⚠️ ACCEPTABLE! Main features work but several issues need attention.');
  } else {
    console.log('❌ NEEDS WORK! Critical issues detected that require immediate fixes.');
  }
  
  // Specific feature assessments
  console.log('\n📝 FEATURE STATUS:');
  console.log(`  Authentication: ${getFeatureStatus('authentication')}`);
  console.log(`  Question Loading: ${getFeatureStatus('questionLoading')}`);
  console.log(`  Response Submission: ${getFeatureStatus('responseSubmission')}`);
  console.log(`  Error Handling: ${getFeatureStatus('errorHandling')}`);
  console.log(`  Database Storage: ${getFeatureStatus('databaseVerification')}`);
  
  console.log('\n' + '='.repeat(80));
}

function getFeatureStatus(category) {
  const tests = testReport.results[category] || [];
  const passed = tests.filter(t => t.status === 'PASS').length;
  const total = tests.length;
  
  if (total === 0) return '⚪ Not tested';
  if (passed === total) return '✅ Working';
  if (passed > total / 2) return '⚠️ Partial';
  return '❌ Failing';
}

function generateMarkdownReport() {
  const report = [];
  
  report.push('# Daily Reflection Submission Test Report');
  report.push(`\n**Test Date:** ${testReport.testDate}`);
  report.push(`**Test User:** ${testReport.testUser}`);
  report.push(`**Environment:** Local Development`);
  
  report.push('\n## Executive Summary');
  report.push(`\n- **Total Tests:** ${testReport.summary.totalTests}`);
  report.push(`- **Passed:** ${testReport.summary.passed} ✅`);
  report.push(`- **Failed:** ${testReport.summary.failed} ❌`);
  report.push(`- **Success Rate:** ${((testReport.summary.passed / testReport.summary.totalTests) * 100).toFixed(1)}%`);
  
  if (testReport.summary.critical.length > 0) {
    report.push('\n### 🚨 Critical Issues');
    testReport.summary.critical.forEach(issue => {
      report.push(`- ${issue}`);
    });
  }
  
  report.push('\n## Test Results by Category');
  
  Object.entries(testReport.results).forEach(([category, tests]) => {
    if (tests.length > 0) {
      report.push(`\n### ${category.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase())}`);
      report.push('\n| Test | Status | Details |');
      report.push('|------|--------|---------|');
      
      tests.forEach(test => {
        const status = test.status === 'PASS' ? '✅ Pass' : '❌ Fail';
        report.push(`| ${test.name} | ${status} | ${test.details} |`);
      });
    }
  });
  
  report.push('\n## Recommendations');
  
  const failedTests = [];
  Object.values(testReport.results).forEach(tests => {
    tests.filter(t => t.status === 'FAIL').forEach(t => failedTests.push(t));
  });
  
  if (failedTests.length === 0) {
    report.push('\nNo issues found. The system is working as expected.');
  } else {
    const critical = failedTests.filter(t => t.severity === 'Critical');
    const high = failedTests.filter(t => t.severity === 'High');
    const medium = failedTests.filter(t => t.severity === 'Medium');
    
    if (critical.length > 0) {
      report.push('\n### 1. Critical Issues (Fix Immediately)');
      critical.forEach(test => {
        report.push(`- **${test.name}**: ${test.details}`);
      });
    }
    
    if (high.length > 0) {
      report.push('\n### 2. High Priority Issues');
      high.forEach(test => {
        report.push(`- **${test.name}**: ${test.details}`);
      });
    }
    
    if (medium.length > 0) {
      report.push('\n### 3. Medium Priority Issues');
      medium.forEach(test => {
        report.push(`- **${test.name}**: ${test.details}`);
      });
    }
  }
  
  report.push('\n## Conclusion');
  const successRate = (testReport.summary.passed / testReport.summary.totalTests) * 100;
  
  if (successRate === 100) {
    report.push('\nThe daily reflection submission flow is working perfectly. All tests passed successfully.');
  } else if (successRate >= 90) {
    report.push('\nThe core functionality is working well with minor issues that should be addressed.');
  } else if (successRate >= 70) {
    report.push('\nThe system is functional but has several issues that need attention to ensure reliability.');
  } else {
    report.push('\nThe system has critical issues that must be resolved before it can be considered production-ready.');
  }
  
  return report.join('\n');
}

// Run the tests
runTests().catch(console.error);