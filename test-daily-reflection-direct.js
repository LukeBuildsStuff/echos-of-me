const { Pool } = require('pg');

// Test configuration
const config = {
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
  testName: 'Daily Reflection Direct Database Test',
  testDate: new Date().toISOString(),
  testUser: config.testUser.email,
  results: {
    databaseStructure: [],
    userData: [],
    questionData: [],
    responseFlow: [],
    dataIntegrity: []
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
async function runQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

async function runTests() {
  try {
    console.log('🚀 Starting Daily Reflection Direct Database Tests...\n');
    
    // ============================
    // 1. DATABASE STRUCTURE TESTS
    // ============================
    console.log('🏗️ Testing Database Structure...');
    
    // Check if responses table exists
    const responseTableCheck = await runQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'responses' AND table_schema = 'public'
    `);
    
    addTestResult('databaseStructure', {
      name: 'Responses Table Exists',
      status: responseTableCheck.rows.length > 0 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: 'Responses table is present in database'
    });
    
    // Check responses table structure
    if (responseTableCheck.rows.length > 0) {
      const responseColumns = await runQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'responses'
        ORDER BY ordinal_position
      `);
      
      const requiredColumns = ['id', 'user_id', 'question_id', 'response_text', 'word_count', 'is_draft', 'created_at'];
      const presentColumns = responseColumns.rows.map(col => col.column_name);
      const missingColumns = requiredColumns.filter(col => !presentColumns.includes(col));
      
      addTestResult('databaseStructure', {
        name: 'Required Columns Present',
        status: missingColumns.length === 0 ? 'PASS' : 'FAIL',
        severity: 'Critical',
        details: missingColumns.length === 0 ? 'All required columns present' : `Missing: ${missingColumns.join(', ')}`
      });
    }
    
    // Check if questions table exists
    const questionTableCheck = await runQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'questions' AND table_schema = 'public'
    `);
    
    addTestResult('databaseStructure', {
      name: 'Questions Table Exists',
      status: questionTableCheck.rows.length > 0 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: 'Questions table is present in database'
    });
    
    // Check if users table exists
    const userTableCheck = await runQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    
    addTestResult('databaseStructure', {
      name: 'Users Table Exists',
      status: userTableCheck.rows.length > 0 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: 'Users table is present in database'
    });
    
    // ===================
    // 2. USER DATA TESTS
    // ===================
    console.log('👤 Testing User Data...');
    
    // Find test user
    const testUser = await runQuery('SELECT id, email, name FROM users WHERE email = $1', [config.testUser.email]);
    
    addTestResult('userData', {
      name: 'Test User Exists',
      status: testUser.rows.length > 0 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: testUser.rows.length > 0 ? `User ID: ${testUser.rows[0].id}` : 'Test user not found'
    });
    
    let userId = null;
    if (testUser.rows.length > 0) {
      userId = testUser.rows[0].id;
      
      // Check user profile completeness
      const userProfile = testUser.rows[0];
      addTestResult('userData', {
        name: 'User Profile Complete',
        status: userProfile.name ? 'PASS' : 'FAIL',
        severity: 'Medium',
        details: `Name: ${userProfile.name || 'Not set'}`
      });
    }
    
    // ======================
    // 3. QUESTION DATA TESTS
    // ======================
    console.log('❓ Testing Question Data...');
    
    // Check if questions are available
    const questionCount = await runQuery('SELECT COUNT(*) as count FROM questions WHERE is_active = true');
    
    addTestResult('questionData', {
      name: 'Active Questions Available',
      status: parseInt(questionCount.rows[0].count) > 0 ? 'PASS' : 'FAIL',
      severity: 'Critical',
      details: `Active questions: ${questionCount.rows[0].count}`
    });
    
    // Check question structure
    const sampleQuestion = await runQuery('SELECT * FROM questions WHERE is_active = true LIMIT 1');
    
    if (sampleQuestion.rows.length > 0) {
      const question = sampleQuestion.rows[0];
      
      addTestResult('questionData', {
        name: 'Question Structure Valid',
        status: question.question_text && question.category ? 'PASS' : 'FAIL',
        severity: 'High',
        details: `Text: ${question.question_text ? 'Present' : 'Missing'}, Category: ${question.category || 'Missing'}`
      });
    }
    
    // =========================
    // 4. RESPONSE FLOW TESTING
    // =========================
    console.log('📝 Testing Response Flow...');
    
    if (userId && sampleQuestion.rows.length > 0) {
      const questionId = sampleQuestion.rows[0].id;
      const testResponseText = `TEST RESPONSE: Direct database test at ${new Date().toISOString()}. This is a comprehensive test of the response submission flow to verify that all components are working correctly.`;
      
      // Check initial response count
      const initialCount = await runQuery('SELECT COUNT(*) as count FROM responses WHERE user_id = $1', [userId]);
      const initialResponseCount = parseInt(initialCount.rows[0].count);
      
      // Simulate response insertion (as would happen via API)
      try {
        const insertResult = await runQuery(`
          INSERT INTO responses (
            user_id, 
            question_id, 
            response_text, 
            response_time_seconds, 
            word_count, 
            is_draft
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, created_at, updated_at
        `, [
          userId,
          questionId,
          testResponseText,
          120, // 2 minutes
          testResponseText.split(/\s+/).filter(word => word.length > 0).length,
          false
        ]);
        
        addTestResult('responseFlow', {
          name: 'Response Insertion',
          status: insertResult.rows.length > 0 ? 'PASS' : 'FAIL',
          severity: 'Critical',
          details: `Response ID: ${insertResult.rows[0]?.id || 'Not created'}`
        });
        
        const responseId = insertResult.rows[0]?.id;
        
        // Verify response was saved correctly
        const savedResponse = await runQuery(`
          SELECT r.*, q.question_text
          FROM responses r
          JOIN questions q ON r.question_id = q.id
          WHERE r.id = $1
        `, [responseId]);
        
        if (savedResponse.rows.length > 0) {
          const response = savedResponse.rows[0];
          
          addTestResult('responseFlow', {
            name: 'Response Text Preservation',
            status: response.response_text === testResponseText ? 'PASS' : 'FAIL',
            severity: 'Critical',
            details: 'Response text matches exactly'
          });
          
          addTestResult('responseFlow', {
            name: 'User Association',
            status: response.user_id === userId ? 'PASS' : 'FAIL',
            severity: 'Critical',
            details: `User ID: ${response.user_id}`
          });
          
          addTestResult('responseFlow', {
            name: 'Question Association',
            status: response.question_id === questionId ? 'PASS' : 'FAIL',
            severity: 'Critical',
            details: `Question ID: ${response.question_id}`
          });
          
          addTestResult('responseFlow', {
            name: 'Word Count Calculation',
            status: response.word_count > 0 ? 'PASS' : 'FAIL',
            severity: 'Medium',
            details: `Word count: ${response.word_count}`
          });
          
          addTestResult('responseFlow', {
            name: 'Draft Status',
            status: response.is_draft === false ? 'PASS' : 'FAIL',
            severity: 'High',
            details: `Is draft: ${response.is_draft}`
          });
          
          addTestResult('responseFlow', {
            name: 'Timestamps',
            status: response.created_at && response.updated_at ? 'PASS' : 'FAIL',
            severity: 'Medium',
            details: `Created: ${response.created_at}, Updated: ${response.updated_at}`
          });
        }
        
        // Check response count increased
        const newCount = await runQuery('SELECT COUNT(*) as count FROM responses WHERE user_id = $1', [userId]);
        const newResponseCount = parseInt(newCount.rows[0].count);
        
        addTestResult('responseFlow', {
          name: 'Response Count Increment',
          status: newResponseCount > initialResponseCount ? 'PASS' : 'FAIL',
          severity: 'High',
          details: `Initial: ${initialResponseCount}, New: ${newResponseCount}`
        });
        
        // Clean up test response
        await runQuery('DELETE FROM responses WHERE id = $1', [responseId]);
        console.log(`Cleaned up test response ${responseId}`);
        
      } catch (error) {
        addTestResult('responseFlow', {
          name: 'Response Insertion',
          status: 'FAIL',
          severity: 'Critical',
          details: `Error: ${error.message}`
        });
      }
    }
    
    // ==========================
    // 5. DATA INTEGRITY TESTS
    // ==========================
    console.log('🔍 Testing Data Integrity...');
    
    // Check for orphaned responses (responses without valid users)
    const orphanedResponses = await runQuery(`
      SELECT COUNT(*) as count
      FROM responses r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE u.id IS NULL
    `);
    
    addTestResult('dataIntegrity', {
      name: 'No Orphaned Responses',
      status: parseInt(orphanedResponses.rows[0].count) === 0 ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Orphaned responses: ${orphanedResponses.rows[0].count}`
    });
    
    // Check for responses with invalid question IDs
    const invalidQuestionResponses = await runQuery(`
      SELECT COUNT(*) as count
      FROM responses r
      LEFT JOIN questions q ON r.question_id = q.id
      WHERE q.id IS NULL
    `);
    
    addTestResult('dataIntegrity', {
      name: 'Valid Question References',
      status: parseInt(invalidQuestionResponses.rows[0].count) === 0 ? 'PASS' : 'FAIL',
      severity: 'High',
      details: `Invalid question references: ${invalidQuestionResponses.rows[0].count}`
    });
    
    // Check for duplicate responses (same user, same question, both non-draft)
    const duplicateResponses = await runQuery(`
      SELECT user_id, question_id, COUNT(*) as count
      FROM responses
      WHERE is_draft = false
      GROUP BY user_id, question_id
      HAVING COUNT(*) > 1
    `);
    
    addTestResult('dataIntegrity', {
      name: 'No Duplicate Responses',
      status: duplicateResponses.rows.length === 0 ? 'PASS' : 'FAIL',
      severity: 'Medium',
      details: `Duplicate response sets: ${duplicateResponses.rows.length}`
    });
    
    // Check response text constraints
    const emptyResponses = await runQuery(`
      SELECT COUNT(*) as count
      FROM responses
      WHERE response_text IS NULL OR TRIM(response_text) = ''
    `);
    
    addTestResult('dataIntegrity', {
      name: 'No Empty Responses',
      status: parseInt(emptyResponses.rows[0].count) === 0 ? 'PASS' : 'FAIL',
      severity: 'Medium',
      details: `Empty responses: ${emptyResponses.rows[0].count}`
    });
    
    // Check word count accuracy (sample check)
    const wordCountCheck = await runQuery(`
      SELECT id, response_text, word_count
      FROM responses
      WHERE word_count > 0
      LIMIT 5
    `);
    
    let wordCountAccurate = true;
    for (const response of wordCountCheck.rows) {
      const actualWordCount = response.response_text.split(/\s+/).filter(word => word.length > 0).length;
      if (Math.abs(actualWordCount - response.word_count) > 1) { // Allow 1 word variance
        wordCountAccurate = false;
        break;
      }
    }
    
    addTestResult('dataIntegrity', {
      name: 'Word Count Accuracy',
      status: wordCountAccurate ? 'PASS' : 'FAIL',
      severity: 'Low',
      details: `Checked ${wordCountCheck.rows.length} responses`
    });
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
    addTestResult('databaseStructure', {
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
      console.log(`\n📋 ${category.replace(/([A-Z])/g, ' $1').toUpperCase().trim()}:`);
      tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        const severityIcon = test.severity === 'Critical' ? '🚨' : 
                           test.severity === 'High' ? '⚠️' : 
                           test.severity === 'Medium' ? '⚡' : 'ℹ️';
        console.log(`  ${icon} ${test.name} ${severityIcon}`);
        if (test.status === 'FAIL' || test.details !== test.name) {
          console.log(`     ${test.details}`);
        }
      });
    }
  });
  
  // Save report to file
  const fs = require('fs');
  const reportPath = './daily-reflection-database-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Generate assessment
  console.log('\n' + '='.repeat(80));
  console.log('🎯 SYSTEM ASSESSMENT:');
  
  const successRate = (testReport.summary.passed / testReport.summary.totalTests) * 100;
  const criticalFailures = testReport.summary.critical.length;
  
  // Component status
  const componentStatus = {
    'Database Structure': getComponentStatus('databaseStructure'),
    'User Data': getComponentStatus('userData'),
    'Question Data': getComponentStatus('questionData'),
    'Response Flow': getComponentStatus('responseFlow'),
    'Data Integrity': getComponentStatus('dataIntegrity')
  };
  
  console.log('\n📋 Component Status:');
  Object.entries(componentStatus).forEach(([component, status]) => {
    console.log(`  ${status.icon} ${component}: ${status.text}`);
  });
  
  // Overall verdict
  console.log('\n🏆 Overall Verdict:');
  if (successRate === 100) {
    console.log('✅ EXCELLENT! All systems are functioning perfectly.');
    console.log('   The daily reflection submission flow is ready for production use.');
  } else if (successRate >= 90 && criticalFailures === 0) {
    console.log('✅ GOOD! Core functionality is working with minor issues.');
    console.log('   The system is usable but some improvements are recommended.');
  } else if (successRate >= 70 && criticalFailures === 0) {
    console.log('⚠️ ACCEPTABLE! Main features work but several issues need attention.');
    console.log('   System is functional but requires fixes for optimal performance.');
  } else if (criticalFailures > 0) {
    console.log('❌ CRITICAL ISSUES DETECTED! Immediate attention required.');
    console.log('   Core functionality is compromised and needs urgent fixes.');
  } else {
    console.log('❌ MULTIPLE FAILURES! System needs significant work.');
    console.log('   Extensive debugging and fixes required before production use.');
  }
  
  // Recommendations
  const failedTests = [];
  Object.values(testReport.results).forEach(tests => {
    tests.filter(t => t.status === 'FAIL').forEach(t => failedTests.push(t));
  });
  
  if (failedTests.length > 0) {
    console.log('\n📝 RECOMMENDATIONS:');
    
    const critical = failedTests.filter(t => t.severity === 'Critical');
    const high = failedTests.filter(t => t.severity === 'High');
    
    if (critical.length > 0) {
      console.log('\n🚨 CRITICAL (Fix Immediately):');
      critical.forEach((test, i) => {
        console.log(`  ${i + 1}. ${test.name}`);
        console.log(`     Issue: ${test.details}`);
      });
    }
    
    if (high.length > 0) {
      console.log('\n⚠️ HIGH PRIORITY:');
      high.forEach((test, i) => {
        console.log(`  ${i + 1}. ${test.name}`);
        console.log(`     Issue: ${test.details}`);
      });
    }
  } else {
    console.log('\n✅ No critical issues found. System is ready for use!');
  }
  
  console.log('\n' + '='.repeat(80));
}

function getComponentStatus(category) {
  const tests = testReport.results[category] || [];
  const passed = tests.filter(t => t.status === 'PASS').length;
  const total = tests.length;
  const critical = tests.filter(t => t.status === 'FAIL' && t.severity === 'Critical').length;
  
  if (total === 0) return { icon: '⚪', text: 'Not tested' };
  if (critical > 0) return { icon: '🚨', text: 'Critical issues' };
  if (passed === total) return { icon: '✅', text: 'Working perfectly' };
  if (passed >= total * 0.8) return { icon: '⚠️', text: 'Mostly working' };
  return { icon: '❌', text: 'Multiple issues' };
}

// Run the tests
runTests().catch(console.error);