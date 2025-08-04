import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { trainingEngine } from '@/lib/training-engine'
import { defaultTrainingConfig } from '@/lib/ai-training-config'
import crypto from 'crypto'

/**
 * Direct Training Start API
 * Starts training immediately without extensive validation
 * Used by admin interface for testing and quick training starts
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { 
      userIds, 
      config = {},
      priority = 'high',
      quickStart = false 
    } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        error: 'At least one user ID is required'
      }, { status: 400 })
    }

    const trainingConfig = { ...defaultTrainingConfig, ...config }
    const results = []
    const errors = []

    console.log(`Starting training for ${userIds.length} users with priority: ${priority}`)

    for (const userId of userIds) {
      try {
        // Quick data check for immediate training
        const userCheck = await query(`
          SELECT 
            u.id, u.name, u.email,
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
          WHERE u.id = $1 AND u.is_active = true
          GROUP BY u.id, u.name, u.email
        `, [userId])

        if (userCheck.rows.length === 0) {
          errors.push({ userId, error: 'User not found or inactive' })
          continue
        }

        const userData = userCheck.rows[0]
        const totalContent = parseInt(userData.response_words || 0) + 
                           parseInt(userData.life_entry_words || 0) + 
                           parseInt(userData.milestone_words || 0)

        // For quickStart, allow training with minimal data
        const minContentRequired = quickStart ? 100 : 1000
        const minResponsesRequired = quickStart ? 5 : 20

        if (totalContent < minContentRequired || parseInt(userData.response_count || 0) < minResponsesRequired) {
          if (!quickStart) {
            errors.push({
              userId,
              error: 'Insufficient data for training',
              requirements: {
                contentWords: { current: totalContent, required: minContentRequired },
                responses: { current: parseInt(userData.response_count || 0), required: minResponsesRequired }
              }
            })
            continue
          }
        }

        // Check for existing active training
        const existingTraining = await query(`
          SELECT id FROM training_runs 
          WHERE user_id = $1 AND status IN ('queued', 'running')
          LIMIT 1
        `, [userId])

        if (existingTraining.rows.length > 0) {
          errors.push({ 
            userId, 
            error: 'Training already in progress for this user',
            existingJobId: existingTraining.rows[0].id
          })
          continue
        }

        // Create training job
        const jobId = crypto.randomUUID()
        const runId = crypto.randomUUID()
        
        // Create training job record
        const trainingRun = await query(`
          INSERT INTO training_runs (
            id,
            run_id,
            user_id, 
            status, 
            started_at, 
            training_samples,
            training_params,
            base_model,
            model_name,
            admin_initiated
          ) VALUES ($1, $2, $3, 'queued', CURRENT_TIMESTAMP, $4, $5, $6, $7, $8)
          RETURNING id, run_id
        `, [
          runId,
          jobId,
          userId, 
          parseInt(userData.response_count || 0) + parseInt(userData.life_entry_count || 0) + parseInt(userData.milestone_count || 0), 
          JSON.stringify({
            ...trainingConfig,
            quickStart,
            priority,
            adminInitiated: true
          }),
          trainingConfig.model.baseModel,
          `${userData.name?.replace(/\s+/g, '_')}_${jobId.slice(0, 8)}`,
          true
        ])

        // Get training data
        const trainingData = await getTrainingDataForUser(userId)
        
        if (trainingData.length === 0) {
          errors.push({ userId, error: 'No valid training data found' })
          continue
        }

        // Create training job object
        const trainingJob = {
          id: jobId,
          userId: userId.toString(),
          priority: priority as 'low' | 'medium' | 'high',
          status: 'queued' as const,
          queuedAt: new Date(),
          estimatedDuration: quickStart ? 30 : 120,
          config: trainingConfig,
          dataHash: crypto.createHash('md5').update(JSON.stringify(trainingData)).digest('hex'),
          retryCount: 0,
          maxRetries: 3,
          resourceRequirements: {
            gpuMemoryGB: quickStart ? 10 : 20,
            diskSpaceGB: 5,
            estimatedCost: quickStart ? 1 : 3
          }
        }

        // Start training immediately
        console.log(`Starting training for user ${userId} with job ID: ${jobId}`)
        
        // Add job to queue with training data
        await trainingEngine.addJobToQueue(trainingJob, trainingData)
        
        // Process the training queue to start the job
        await trainingEngine.processQueue()

        results.push({
          userId,
          userName: userData.name,
          userEmail: userData.email,
          jobId,
          runId,
          status: 'queued',
          trainingData: {
            examples: trainingData.length,
            totalWords: trainingData.reduce((sum, ex) => sum + (ex.output?.length || 0), 0),
            categories: new Set(trainingData.map(ex => ex.metadata?.questionCategory)).size
          },
          quickStart,
          priority
        })

      } catch (userError: any) {
        console.error(`Error processing user ${userId}:`, userError)
        errors.push({ 
          userId, 
          error: 'Failed to create training job',
          details: userError.message 
        })
      }
    }

    const response = {
      success: results.length > 0,
      message: `Training jobs created for ${results.length} of ${userIds.length} users`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      quickStart,
      priority,
      timestamp: new Date().toISOString()
    }

    const statusCode = results.length > 0 ? 200 : (errors.length > 0 ? 400 : 500)
    return NextResponse.json(response, { status: statusCode })

  } catch (error: any) {
    console.error('Direct training start error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start training jobs', 
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
})

async function getTrainingDataForUser(userId: string) {
  const minWordCount = 10

  // Get user's responses
  const responses = await query(`
    SELECT 
      r.id,
      r.response_text,
      r.word_count,
      r.created_at,
      q.question_text,
      q.category,
      u.name as user_name,
      u.primary_role
    FROM responses r
    JOIN questions q ON r.question_id = q.id
    JOIN users u ON r.user_id = u.id
    WHERE 
      r.user_id = $1
      AND r.response_text IS NOT NULL
      AND LENGTH(r.response_text) > 20
      AND r.word_count >= $2
    ORDER BY r.created_at DESC
    LIMIT 100
  `, [userId, minWordCount])

  // Get life detail entries
  const lifeEntries = await query(`
    SELECT 
      title,
      content,
      category,
      created_at
    FROM life_detail_entries
    WHERE user_id = $1 AND LENGTH(content) > 50
    ORDER BY created_at DESC
    LIMIT 20
  `, [userId])

  // Get milestone messages
  const milestones = await query(`
    SELECT 
      message_title,
      message_content,
      milestone_type,
      created_at
    FROM milestone_messages
    WHERE user_id = $1 AND LENGTH(message_content) > 20
    ORDER BY created_at DESC
    LIMIT 10
  `, [userId])

  const trainingExamples = []

  // Format responses into training examples
  responses.rows.forEach(row => {
    const context = `You are ${row.user_name}, sharing your personal experiences and wisdom.`
    
    trainingExamples.push({
      instruction: row.question_text,
      input: context,
      output: row.response_text,
      metadata: {
        userId,
        timestamp: new Date(row.created_at),
        questionCategory: row.category,
        responseWordCount: row.word_count || 0,
        source: 'response'
      }
    })
  })

  // Format life entries
  lifeEntries.rows.forEach(row => {
    const instruction = `Tell me about ${row.title.toLowerCase()}`
    const context = `You are sharing a personal life story and the experiences that shaped you.`
    
    trainingExamples.push({
      instruction,
      input: context,
      output: row.content,
      metadata: {
        userId,
        timestamp: new Date(row.created_at),
        questionCategory: row.category || 'life_story',
        responseWordCount: row.content.split(' ').length,
        source: 'life_entry'
      }
    })
  })

  // Format milestones
  milestones.rows.forEach(row => {
    trainingExamples.push({
      instruction: `Share your thoughts about ${row.milestone_type}`,
      input: 'You are reflecting on an important milestone in your life and the wisdom you gained.',
      output: row.message_content,
      metadata: {
        userId,
        timestamp: new Date(row.created_at),
        questionCategory: 'milestone',
        responseWordCount: row.message_content.split(' ').length,
        source: 'milestone'
      }
    })
  })

  console.log(`Prepared ${trainingExamples.length} training examples for user ${userId}`)
  return trainingExamples
}