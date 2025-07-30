import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

/**
 * Test Training Pipeline API
 * Comprehensive test of the training system with simulated data
 * Used to verify all components work together correctly
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { createTestUser = true, runFullPipeline = false } = await request.json()

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0, total: 0 }
    }

    // Test 1: Database connectivity
    try {
      await query('SELECT 1 as test')
      testResults.tests.push({
        name: 'Database Connectivity',
        status: 'passed',
        message: 'Database connection successful'
      })
      testResults.summary.passed++
    } catch (error) {
      testResults.tests.push({
        name: 'Database Connectivity',
        status: 'failed',
        message: error.message
      })
      testResults.summary.failed++
    }
    testResults.summary.total++

    // Test 2: Training tables exist
    try {
      const tables = ['training_runs', 'model_versions', 'training_metrics', 'training_queue']
      for (const table of tables) {
        await query(`SELECT COUNT(*) FROM ${table}`)
      }
      testResults.tests.push({
        name: 'Training Tables Schema',
        status: 'passed',
        message: 'All required training tables exist'
      })
      testResults.summary.passed++
    } catch (error) {
      testResults.tests.push({
        name: 'Training Tables Schema',
        status: 'failed',
        message: `Missing training tables: ${error.message}`
      })
      testResults.summary.failed++
    }
    testResults.summary.total++

    // Test 3: Create test user with training data
    let testUserId = null
    if (createTestUser) {
      try {
        // Create test user
        const userResult = await query(`
          INSERT INTO users (email, name, password_hash, primary_role, is_active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [
          'test-training@example.com',
          'Test Training User',
          'dummy_hash_for_testing',
          'parent',
          true
        ])
        
        testUserId = userResult.rows[0].id

        // Create sample questions
        const questions = [
          { category: 'personal_history', text: 'What is your favorite childhood memory?' },
          { category: 'philosophy_values', text: 'What values are most important to you?' },
          { category: 'relationships', text: 'Tell me about someone who influenced your life.' },
          { category: 'daily_life', text: 'What does a typical day look like for you?' },
          { category: 'professional', text: 'What career advice would you give?' }
        ]

        for (const q of questions) {
          const questionResult = await query(`
            INSERT INTO questions (category, question_text)
            VALUES ($1, $2)
            ON CONFLICT (question_text) DO UPDATE SET
              category = EXCLUDED.category
            RETURNING id
          `, [q.category, q.text])

          // Create sample responses
          await query(`
            INSERT INTO responses (user_id, question_id, response_text, word_count)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
          `, [
            testUserId,
            questionResult.rows[0].id,
            `This is a detailed response to the question "${q.text}". It contains meaningful content that would be valuable for training a personalized AI model. The response demonstrates the user's personality, experiences, and way of thinking. It has enough content to be useful for fine-tuning purposes.`,
            45
          ])
        }

        // Create sample life entries
        await query(`
          INSERT INTO life_detail_entries (user_id, title, content, category)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [
          testUserId,
          'Growing Up',
          'I grew up in a small town where everyone knew each other. This shaped my values of community and helping others. The experiences from my childhood taught me the importance of strong relationships and being there for one another during difficult times.',
          'childhood'
        ])

        // Create sample milestone
        await query(`
          INSERT INTO milestone_messages (user_id, milestone_type, message_title, message_content)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [
          testUserId,
          'achievement',
          'Career Milestone',
          'When I achieved my biggest career goal, I realized that success is not just about personal accomplishments but about how you can use your position to help others grow and succeed as well.'
        ])

        testResults.tests.push({
          name: 'Test User Creation',
          status: 'passed',
          message: `Test user created with ID: ${testUserId}`,
          data: { userId: testUserId }
        })
        testResults.summary.passed++
      } catch (error) {
        testResults.tests.push({
          name: 'Test User Creation',
          status: 'failed',
          message: error.message
        })
        testResults.summary.failed++
      }
      testResults.summary.total++
    }

    // Test 4: Verify training data availability
    if (testUserId) {
      try {
        const dataCheck = await query(`
          SELECT 
            COUNT(DISTINCT r.id) as response_count,
            COUNT(DISTINCT le.id) as life_entry_count,
            COUNT(DISTINCT mm.id) as milestone_count,
            COALESCE(SUM(LENGTH(r.response_text)), 0) as response_words,
            COALESCE(SUM(LENGTH(le.content)), 0) as life_entry_words,
            COALESCE(SUM(LENGTH(mm.message_content)), 0) as milestone_words
          FROM users u
          LEFT JOIN responses r ON u.id = r.user_id
          LEFT JOIN life_detail_entries le ON u.id = le.user_id
          LEFT JOIN milestone_messages mm ON u.id = mm.user_id
          WHERE u.id = $1
          GROUP BY u.id
        `, [testUserId])

        const data = dataCheck.rows[0]
        const totalWords = parseInt(data.response_words || 0) + 
                          parseInt(data.life_entry_words || 0) + 
                          parseInt(data.milestone_words || 0)

        testResults.tests.push({
          name: 'Training Data Verification',
          status: totalWords >= 500 ? 'passed' : 'warning',
          message: `Training data: ${data.response_count} responses, ${data.life_entry_count} life entries, ${data.milestone_count} milestones, ${totalWords} total words`,
          data: {
            responses: parseInt(data.response_count || 0),
            lifeEntries: parseInt(data.life_entry_count || 0),
            milestones: parseInt(data.milestone_count || 0),
            totalWords
          }
        })
        testResults.summary.passed++
      } catch (error) {
        testResults.tests.push({
          name: 'Training Data Verification',
          status: 'failed',
          message: error.message
        })
        testResults.summary.failed++
      }
      testResults.summary.total++
    }

    // Test 5: Docker container connectivity
    try {
      const { spawn } = require('child_process')
      const dockerTest = spawn('docker', ['exec', 'personal-ai-clone-ml-trainer-1', 'python3', '-c', 'print("Container accessible")'])
      
      let dockerOutput = ''
      let dockerError = ''
      
      await new Promise((resolve, reject) => {
        dockerTest.stdout.on('data', (data) => {
          dockerOutput += data.toString()
        })
        
        dockerTest.stderr.on('data', (data) => {
          dockerError += data.toString()
        })
        
        dockerTest.on('close', (code) => {
          if (code === 0) {
            resolve(code)
          } else {
            reject(new Error(`Docker test failed with code ${code}: ${dockerError}`))
          }
        })
        
        dockerTest.on('error', reject)
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Docker test timeout')), 10000)
      })

      testResults.tests.push({
        name: 'Docker Container Access',
        status: 'passed',
        message: 'ML training container is accessible',
        data: { output: dockerOutput.trim() }
      })
      testResults.summary.passed++
    } catch (error) {
      testResults.tests.push({
        name: 'Docker Container Access',
        status: 'failed',
        message: error.message
      })
      testResults.summary.failed++
    }
    testResults.summary.total++

    // Test 6: Training API endpoints
    try {
      // Test training data API
      const trainingDataResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/training-data?limit=5`, {
        headers: { 'Cookie': request.headers.get('cookie') || '' }
      })
      
      if (!trainingDataResponse.ok) {
        throw new Error(`Training data API returned ${trainingDataResponse.status}`)
      }
      
      const trainingDataResult = await trainingDataResponse.json()
      
      testResults.tests.push({
        name: 'Training Data API',
        status: 'passed',
        message: `API returned ${trainingDataResult.users?.length || 0} users`,
        data: { userCount: trainingDataResult.users?.length || 0 }
      })
      testResults.summary.passed++
    } catch (error) {
      testResults.tests.push({
        name: 'Training Data API',
        status: 'failed',
        message: error.message
      })
      testResults.summary.failed++
    }
    testResults.summary.total++

    // Test 7: Full training pipeline (if requested)
    if (runFullPipeline && testUserId) {
      try {
        // Attempt to start a training job
        const trainingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/training/start-training`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            userIds: [testUserId],
            quickStart: true,
            priority: 'high'
          })
        })

        const trainingResult = await trainingResponse.json()
        
        if (trainingResponse.ok && trainingResult.success) {
          testResults.tests.push({
            name: 'Full Training Pipeline',
            status: 'passed',
            message: `Training job created: ${trainingResult.results[0]?.jobId}`,
            data: trainingResult.results[0]
          })
          testResults.summary.passed++
        } else {
          testResults.tests.push({
            name: 'Full Training Pipeline',
            status: 'failed',
            message: trainingResult.error || 'Training job creation failed',
            data: trainingResult
          })
          testResults.summary.failed++
        }
      } catch (error) {
        testResults.tests.push({
          name: 'Full Training Pipeline',
          status: 'failed',
          message: error.message
        })
        testResults.summary.failed++
      }
      testResults.summary.total++
    }

    // Generate overall assessment
    const successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100)
    testResults.summary.successRate = successRate
    testResults.summary.status = successRate >= 80 ? 'healthy' : successRate >= 60 ? 'warning' : 'critical'

    return NextResponse.json({
      success: true,
      message: `Training pipeline test completed: ${testResults.summary.passed}/${testResults.summary.total} tests passed (${successRate}%)`,
      testResults,
      recommendations: generateRecommendations(testResults.tests)
    })

  } catch (error: any) {
    console.error('Training pipeline test error:', error)
    return NextResponse.json(
      { 
        error: 'Training pipeline test failed',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
})

function generateRecommendations(tests: any[]): string[] {
  const recommendations = []
  
  const failedTests = tests.filter(t => t.status === 'failed')
  
  if (failedTests.some(t => t.name === 'Database Connectivity')) {
    recommendations.push('Check database connection and credentials')
  }
  
  if (failedTests.some(t => t.name === 'Training Tables Schema')) {
    recommendations.push('Run database migration: node scripts/create_training_tables.js')
  }
  
  if (failedTests.some(t => t.name === 'Docker Container Access')) {
    recommendations.push('Ensure ml-trainer container is running: docker-compose up -d ml-trainer')
  }
  
  if (failedTests.some(t => t.name === 'Training Data API')) {
    recommendations.push('Check API routes and authentication')
  }
  
  if (failedTests.some(t => t.name === 'Full Training Pipeline')) {
    recommendations.push('Review training engine configuration and GPU compatibility')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All tests passed! Training pipeline is ready for production use.')
  }
  
  return recommendations
}