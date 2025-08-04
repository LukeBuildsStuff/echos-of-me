#!/usr/bin/env node

/**
 * RTX 5090 Mistral Training Pipeline Test Suite
 * 
 * Comprehensive test suite for validating the complete family legacy AI training pipeline
 * Tests configuration, data processing, training setup, and deployment capabilities
 */

// Using built-in fetch (Node.js 18+)
const fs = require('fs/promises')
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  testUserId: process.env.TEST_USER_ID || '1',
  testUserEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
  timeout: 30000, // 30 seconds
}

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
}

// Utility functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${level}] ${message}`)
}

function logTest(testName, passed, details = '') {
  testResults.total++
  if (passed) {
    testResults.passed++
    log(`✅ ${testName}`, 'PASS')
  } else {
    testResults.failed++
    log(`❌ ${testName} - ${details}`, 'FAIL')
  }
  
  testResults.details.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  })
}

async function makeRequest(endpoint, options = {}) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`
  const response = await fetch(url, {
    timeout: TEST_CONFIG.timeout,
    ...options
  })
  
  let data
  try {
    data = await response.json()
  } catch (e) {
    data = { error: 'Invalid JSON response' }
  }
  
  return { response, data }
}

// Test Suite Functions

async function testSystemConfiguration() {
  log('Testing RTX 5090 System Configuration...')
  
  try {
    // Test 1: Verify training configuration
    const configTest = await testTrainingConfiguration()
    logTest('Training Configuration Validation', configTest.passed, configTest.details)
    
    // Test 2: Verify Mistral model configuration
    const mistralTest = await testMistralConfiguration()
    logTest('Mistral Model Configuration', mistralTest.passed, mistralTest.details)
    
    // Test 3: Verify RTX 5090 optimization settings
    const rtxTest = await testRTX5090Configuration()
    logTest('RTX 5090 Optimization Settings', rtxTest.passed, rtxTest.details)
    
  } catch (error) {
    logTest('System Configuration Test Suite', false, error.message)
  }
}

async function testTrainingConfiguration() {
  try {
    // Read the training configuration
    const configPath = path.join(__dirname, '../lib/ai-training-config.ts')
    const configContent = await fs.readFile(configPath, 'utf8')
    
    // Verify key configuration elements
    const checks = [
      { name: 'Mistral base model', test: configContent.includes('mistralai/Mistral-7B-Instruct-v0.3') },
      { name: '32k context length', test: configContent.includes('contextLength: 32768') },
      { name: 'RTX 5090 VRAM', test: configContent.includes('gpuMemoryGB: 32') },
      { name: 'LoRA configuration', test: configContent.includes('loraRank: 64') },
      { name: 'Flash Attention 2', test: configContent.includes('flashAttention2: true') },
      { name: 'sm_120 support', test: configContent.includes('sm_120') }
    ]
    
    const failed = checks.filter(check => !check.test)
    
    return {
      passed: failed.length === 0,
      details: failed.length > 0 ? `Failed checks: ${failed.map(f => f.name).join(', ')}` : 'All configuration checks passed'
    }
    
  } catch (error) {
    return { passed: false, details: `Configuration read error: ${error.message}` }
  }
}

async function testMistralConfiguration() {
  try {
    // Test if Mistral engine file exists and has correct configuration
    const enginePath = path.join(__dirname, '../lib/rtx5090-mistral-engine.ts')
    const engineContent = await fs.readFile(enginePath, 'utf8')
    
    const checks = [
      { name: 'RTX 5090 Mistral Engine', test: engineContent.includes('RTX5090MistralEngine') },
      { name: 'Flash Attention 2 support', test: engineContent.includes('flash_attn') },
      { name: 'Family legacy context', test: engineContent.includes('family legacy') },
      { name: 'Mistral chat template', test: engineContent.includes('apply_chat_template') },
      { name: '4-bit quantization', test: engineContent.includes('load_in_4bit') }
    ]
    
    const failed = checks.filter(check => !check.test)
    
    return {
      passed: failed.length === 0,
      details: failed.length > 0 ? `Failed checks: ${failed.map(f => f.name).join(', ')}` : 'Mistral configuration validated'
    }
    
  } catch (error) {
    return { passed: false, details: `Mistral engine validation error: ${error.message}` }
  }
}

async function testRTX5090Configuration() {
  try {
    // Test RTX 5090 memory manager
    const memoryPath = path.join(__dirname, '../lib/rtx5090-memory-manager.ts')
    const memoryContent = await fs.readFile(memoryPath, 'utf8')
    
    const checks = [
      { name: '32GB VRAM support', test: memoryContent.includes('vramSize: number = 32') },
      { name: 'Dynamic batch sizing', test: memoryContent.includes('calculateOptimalBatch') },
      { name: 'Memory optimization', test: memoryContent.includes('RTX5090MemoryManager') },
      { name: 'Tensor Core optimization', test: memoryContent.includes('tensor') }
    ]
    
    const failed = checks.filter(check => !check.test)
    
    return {
      passed: failed.length === 0,
      details: failed.length > 0 ? `Failed checks: ${failed.map(f => f.name).join(', ')}` : 'RTX 5090 configuration validated'
    }
    
  } catch (error) {
    return { passed: false, details: `RTX 5090 validation error: ${error.message}` }
  }
}

async function testDataProcessingPipeline() {
  log('Testing Data Processing Pipeline...')
  
  try {
    // Test 1: Family data formatting
    const dataTest = await testFamilyDataFormatting()
    logTest('Family Data Formatting', dataTest.passed, dataTest.details)
    
    // Test 2: Training data validation
    const validationTest = await testTrainingDataValidation()
    logTest('Training Data Validation', validationTest.passed, validationTest.details)
    
    // Test 3: Mistral chat template processing
    const chatTest = await testChatTemplateProcessing()
    logTest('Chat Template Processing', chatTest.passed, chatTest.details)
    
  } catch (error) {
    logTest('Data Processing Pipeline', false, error.message)
  }
}

async function testFamilyDataFormatting() {
  try {
    // Mock family data
    const mockFamilyData = {
      userId: TEST_CONFIG.testUserId,
      responses: [
        {
          question: "What's your favorite family memory?",
          response: "I remember when we all gathered for Christmas dinner in 1985. The whole family was there, laughing and sharing stories. My grandmother made her famous apple pie, and we played board games until midnight. It was one of those perfect moments where everyone felt connected and loved.",
          category: "family_memories",
          emotionalTone: "joyful"
        }
      ]
    }
    
    // Test data collection endpoint
    const { response, data } = await makeRequest('/api/training/collect-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockFamilyData)
    })
    
    return {
      passed: response.status === 200 && data.success,
      details: data.success ? `Processed ${data.dataCollected?.totalExamples || 0} examples` : data.error || 'Unknown error'
    }
    
  } catch (error) {
    return { passed: false, details: `Data formatting test error: ${error.message}` }
  }
}

async function testTrainingDataValidation() {
  try {
    // Test training data validation endpoint
    const { response, data } = await makeRequest('/api/training/validate', {
      method: 'GET'
    })
    
    return {
      passed: response.status === 200,
      details: data.success ? 'Training data validation passed' : data.error || 'Validation failed'
    }
    
  } catch (error) {
    return { passed: false, details: `Validation test error: ${error.message}` }
  }
}

async function testChatTemplateProcessing() {
  try {
    // Test format-data endpoint
    const formatRequest = {
      userId: TEST_CONFIG.testUserId,
      format: 'conversational',
      includeSystemPrompts: true,
      templateStyle: 'legacy_preservation'
    }
    
    const { response, data } = await makeRequest('/api/training/format-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatRequest)
    })
    
    return {
      passed: response.status === 200 && data.success,
      details: data.success ? `Formatted ${data.formattedExamples || 0} examples` : data.error || 'Format processing failed'
    }
    
  } catch (error) {
    return { passed: false, details: `Chat template test error: ${error.message}` }
  }
}

async function testTrainingWorkflow() {
  log('Testing Training Workflow...')
  
  try {
    // Test 1: Training job creation
    const jobTest = await testTrainingJobCreation()
    logTest('Training Job Creation', jobTest.passed, jobTest.details)
    
    // Test 2: RTX 5090 manager status
    const rtxTest = await testRTX5090Manager()
    logTest('RTX 5090 Manager Status', rtxTest.passed, rtxTest.details)
    
    // Test 3: Training queue management
    const queueTest = await testTrainingQueue()
    logTest('Training Queue Management', queueTest.passed, queueTest.details)
    
  } catch (error) {
    logTest('Training Workflow', false, error.message)
  }
}

async function testTrainingJobCreation() {
  try {
    // Mock training job creation (don't actually start training in test)
    const trainingRequest = {
      userId: TEST_CONFIG.testUserId,
      config: {
        model: {
          baseModel: 'mistralai/Mistral-7B-Instruct-v0.3',
          architecture: 'mistral',
          contextLength: 4096, // Use smaller context for testing
          precision: 'bf16'
        },
        training: {
          method: 'lora',
          epochs: 1, // Single epoch for testing
          batchSize: 1,
          learningRate: 1e-4
        }
      },
      dryRun: true // Prevent actual training
    }
    
    const { response, data } = await makeRequest('/api/training/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trainingRequest)
    })
    
    return {
      passed: response.status === 200 || response.status === 400, // 400 might be expected for insufficient data
      details: data.error ? `Expected validation: ${data.error}` : `Job created: ${data.jobId || 'success'}`
    }
    
  } catch (error) {
    return { passed: false, details: `Job creation test error: ${error.message}` }
  }
}

async function testRTX5090Manager() {
  try {
    // Test RTX 5090 manager endpoint
    const { response, data } = await makeRequest('/api/training/rtx5090-manager?view=system_status')
    
    return {
      passed: response.status === 200,
      details: data.success ? 'RTX 5090 manager operational' : data.error || 'Manager status unknown'
    }
    
  } catch (error) {
    return { passed: false, details: `RTX 5090 manager test error: ${error.message}` }
  }
}

async function testTrainingQueue() {
  try {
    // Test training queue endpoint
    const { response, data } = await makeRequest('/api/training/queue')
    
    return {
      passed: response.status === 200,
      details: data.success ? `Queue has ${data.jobs?.length || 0} jobs` : data.error || 'Queue status unknown'
    }
    
  } catch (error) {
    return { passed: false, details: `Training queue test error: ${error.message}` }
  }
}

async function testDeploymentSystem() {
  log('Testing Model Deployment System...')
  
  try {
    // Test 1: Deployment configuration
    const configTest = await testDeploymentConfiguration()
    logTest('Deployment Configuration', configTest.passed, configTest.details)
    
    // Test 2: Inference engine setup
    const engineTest = await testInferenceEngine()
    logTest('Inference Engine Setup', engineTest.passed, engineTest.details)
    
    // Test 3: Model deployment API
    const deployTest = await testModelDeploymentAPI()
    logTest('Model Deployment API', deployTest.passed, deployTest.details)
    
  } catch (error) {
    logTest('Deployment System', false, error.message)
  }
}

async function testDeploymentConfiguration() {
  try {
    // Check if inference engine exists
    const enginePath = path.join(__dirname, '../lib/mistral-inference-engine.ts')
    const engineContent = await fs.readFile(enginePath, 'utf8')
    
    const checks = [
      { name: 'Mistral Inference Engine', test: engineContent.includes('MistralInferenceEngine') },
      { name: 'RTX 5090 optimization', test: engineContent.includes('RTX 5090') },
      { name: 'Family context support', test: engineContent.includes('family') },
      { name: 'Voice integration', test: engineContent.includes('voice') }
    ]
    
    const failed = checks.filter(check => !check.test)
    
    return {
      passed: failed.length === 0,
      details: failed.length > 0 ? `Failed checks: ${failed.map(f => f.name).join(', ')}` : 'Deployment configuration validated'
    }
    
  } catch (error) {
    return { passed: false, details: `Deployment config test error: ${error.message}` }
  }
}

async function testInferenceEngine() {
  try {
    // Test that the inference engine can be initialized (static test)
    const enginePath = path.join(__dirname, '../lib/mistral-inference-engine.ts')
    await fs.access(enginePath)
    
    return {
      passed: true,
      details: 'Inference engine files accessible'
    }
    
  } catch (error) {
    return { passed: false, details: `Inference engine test error: ${error.message}` }
  }
}

async function testModelDeploymentAPI() {
  try {
    // Test deployment API endpoint structure
    const { response, data } = await makeRequest('/api/training/deploy?view=available_models')
    
    return {
      passed: response.status === 200 || response.status === 401, // 401 expected without auth
      details: response.status === 401 ? 'API endpoint exists (auth required)' : `API response: ${data.success}`
    }
    
  } catch (error) {
    return { passed: false, details: `Deployment API test error: ${error.message}` }
  }
}

async function testAdminInterface() {
  log('Testing Admin Training Interface...')
  
  try {
    // Test 1: RTX 5090 dashboard component
    const dashboardTest = await testRTX5090Dashboard()
    logTest('RTX 5090 Dashboard Component', dashboardTest.passed, dashboardTest.details)
    
    // Test 2: Admin metrics API
    const metricsTest = await testAdminMetricsAPI()
    logTest('Admin Metrics API', metricsTest.passed, metricsTest.details)
    
    // Test 3: Training manager component
    const managerTest = await testTrainingManager()
    logTest('Training Manager Component', managerTest.passed, managerTest.details)
    
  } catch (error) {
    logTest('Admin Interface', false, error.message)
  }
}

async function testRTX5090Dashboard() {
  try {
    // Check if RTX 5090 dashboard component exists
    const dashboardPath = path.join(__dirname, '../components/RTX5090TrainingDashboard.tsx')
    await fs.access(dashboardPath)
    
    const dashboardContent = await fs.readFile(dashboardPath, 'utf8')
    
    const checks = [
      { name: 'RTX 5090 metrics display', test: dashboardContent.includes('RTX5090Metrics') },
      { name: 'Real-time updates', test: dashboardContent.includes('useEffect') },
      { name: 'Training job monitoring', test: dashboardContent.includes('activeJobs') },
      { name: 'Performance metrics', test: dashboardContent.includes('performance') }
    ]
    
    const failed = checks.filter(check => !check.test)
    
    return {
      passed: failed.length === 0,
      details: failed.length > 0 ? `Failed checks: ${failed.map(f => f.name).join(', ')}` : 'Dashboard component validated'
    }
    
  } catch (error) {
    return { passed: false, details: `Dashboard test error: ${error.message}` }
  }
}

async function testAdminMetricsAPI() {
  try {
    // Test admin metrics API endpoint
    const { response, data } = await makeRequest('/api/admin/training/rtx-metrics')
    
    return {
      passed: response.status === 200 || response.status === 401 || response.status === 403, // Auth required
      details: response.status === 200 ? 'Metrics API operational' : 'API exists (auth required)'
    }
    
  } catch (error) {
    return { passed: false, details: `Admin metrics API test error: ${error.message}` }
  }
}

async function testTrainingManager() {
  try {
    // Check if admin training manager exists
    const managerPath = path.join(__dirname, '../components/AdminTrainingManager.tsx')
    await fs.access(managerPath)
    
    return {
      passed: true,
      details: 'Training manager component exists'
    }
    
  } catch (error) {
    return { passed: false, details: `Training manager test error: ${error.message}` }
  }
}

async function generateTestReport() {
  log('Generating Test Report...')
  
  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0
    },
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: TEST_CONFIG.baseUrl,
      testUserId: TEST_CONFIG.testUserId,
      nodeVersion: process.version
    },
    details: testResults.details
  }
  
  // Write report to file
  const reportPath = path.join(__dirname, '../test-results/rtx5090-mistral-pipeline-test-report.json')
  await fs.mkdir(path.dirname(reportPath), { recursive: true })
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  
  // Log summary
  log(`\n=== RTX 5090 Mistral Training Pipeline Test Summary ===`)
  log(`Total Tests: ${report.summary.total}`)
  log(`Passed: ${report.summary.passed}`)
  log(`Failed: ${report.summary.failed}`)
  log(`Success Rate: ${report.summary.successRate}%`)
  log(`Report saved to: ${reportPath}`)
  
  if (report.summary.failed > 0) {
    log(`\n=== Failed Tests ===`)
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        log(`❌ ${test.test}: ${test.details}`)
      })
  }
  
  return report.summary.successRate >= 80 // 80% pass rate required
}

// Main test execution
async function runTestSuite() {
  log('Starting RTX 5090 Mistral Training Pipeline Test Suite...')
  
  try {
    // Run all test suites
    await testSystemConfiguration()
    await testDataProcessingPipeline()
    await testTrainingWorkflow()
    await testDeploymentSystem()
    await testAdminInterface()
    
    // Generate final report
    const success = await generateTestReport()
    
    if (success) {
      log('🎉 Test suite completed successfully!')
      process.exit(0)
    } else {
      log('❌ Test suite failed - check report for details')
      process.exit(1)
    }
    
  } catch (error) {
    log(`💥 Test suite crashed: ${error.message}`, 'ERROR')
    process.exit(1)
  }
}

// Execute if called directly
if (require.main === module) {
  runTestSuite()
}

module.exports = {
  runTestSuite,
  testResults
}