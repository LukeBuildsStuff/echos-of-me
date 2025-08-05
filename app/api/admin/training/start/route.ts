import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { trainingEngine } from '@/lib/training-engine'
import { defaultTrainingConfig, TrainingJob, TrainingExample } from '@/lib/ai-training-config'
import crypto from 'crypto'

/**
 * Admin Training Start API
 * Provides centralized admin control for starting training jobs
 * Supports both single user and batch training operations
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { 
      config, 
      userIds, 
      batchMode = false, 
      adminInitiated = true,
      priority = 'high'
    } = body

    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        error: 'At least one user ID is required'
      }, { status: 400 })
    }

    const trainingConfig = { ...defaultTrainingConfig, ...config }
    const results = []
    const errors = []

    // Process each user
    for (const userId of userIds) {
      try {
        // Validate user has sufficient data
        const dataCheck = await query(`
          SELECT 
            u.id, u.name, u.email,
            COUNT(DISTINCT r.id) as response_count,
            COUNT(DISTINCT le.id) as life_entry_count,
            COUNT(DISTINCT mm.id) as milestone_count,
            COUNT(DISTINCT q.category) as category_count,
            COALESCE(SUM(r.word_count), 0) as response_words,
            COALESCE(SUM(LENGTH(le.content)), 0) as life_entry_words,
            COALESCE(SUM(LENGTH(mm.message_content)), 0) as milestone_words
          FROM users u
          LEFT JOIN responses r ON u.id = r.user_id AND r.word_count >= 20
          LEFT JOIN life_detail_entries le ON u.id = le.user_id
          LEFT JOIN milestone_messages mm ON u.id = mm.user_id
          LEFT JOIN questions q ON r.question_id = q.id
          WHERE u.id = $1 AND u.is_active = true
          GROUP BY u.id, u.name, u.email
        `, [userId])

        if (dataCheck.rows.length === 0) {
          errors.push({ userId, error: 'User not found or inactive' })
          continue
        }

        const userData = dataCheck.rows[0]
        const totalWords = parseInt(userData.response_words) + 
                          parseInt(userData.life_entry_words) + 
                          parseInt(userData.milestone_words)

        // Check if data meets requirements
        const isReady = userData.response_count >= trainingConfig.dataRequirements.minResponses &&
                       userData.category_count >= trainingConfig.dataRequirements.minQuestionCategories &&
                       totalWords >= trainingConfig.dataRequirements.minWordCount

        if (!isReady) {
          errors.push({
            userId,
            error: 'Insufficient data for training',
            requirements: {
              responses: { 
                current: parseInt(userData.response_count), 
                required: trainingConfig.dataRequirements.minResponses 
              },
              categories: { 
                current: parseInt(userData.category_count), 
                required: trainingConfig.dataRequirements.minQuestionCategories 
              },
              words: { current: totalWords, required: trainingConfig.dataRequirements.minWordCount }
            }
          })
          continue
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

        // Get training data
        const trainingData = await getTrainingData(userId)
        
        // Create job ID
        const jobId = crypto.randomUUID()
        
        // Calculate resource requirements
        const resourceRequirements = {
          gpuMemoryGB: Math.min(20, Math.max(8, Math.ceil(trainingData.length / 100))),
          diskSpaceGB: Math.ceil(trainingData.length * 0.01),
          estimatedCost: Math.min(10, trainingData.length * 0.005),
          priority: batchMode ? 'medium' : priority
        }

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
            admin_initiated,
            batch_id
          ) VALUES ($1, $2, $3, 'queued', CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
          RETURNING id, run_id
        `, [
          crypto.randomUUID(),
          jobId,
          userId, 
          trainingData.length, 
          JSON.stringify({
            ...trainingConfig,
            adminInitiated: true,
            batchMode,
            priority
          }),
          trainingConfig.model.baseModel,
          `${userData.name?.replace(/\s+/g, '_')}_admin_v${await getNextModelVersion(userId)}`,
          true,
          batchMode ? crypto.randomUUID() : null
        ])

        // Create training job object
        const trainingJob: TrainingJob = {
          id: jobId,
          userId: userId.toString(),
          priority: resourceRequirements.priority as 'low' | 'medium' | 'high',
          status: 'queued',
          queuedAt: new Date(),
          estimatedDuration: calculateTrainingDuration(trainingData.length, trainingConfig),
          config: trainingConfig,
          dataHash: generateDataHash(trainingData),
          retryCount: 0,
          maxRetries: 3,
          resourceRequirements
        }

        results.push({
          userId,
          userName: userData.name,
          userEmail: userData.email,
          jobId,
          status: 'queued',
          trainingData: {
            examples: trainingData.length,
            totalWords: trainingData.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0),
            categories: new Set(trainingData.map(ex => ex.metadata.questionCategory)).size
          },
          estimatedCompletion: new Date(Date.now() + trainingJob.estimatedDuration * 60 * 1000),
          resourceRequirements
        })

        // Add to training queue
        await trainingEngine.addJobToQueue(trainingJob, trainingData)

      } catch (userError: any) {
        console.error(`Error processing user ${userId}:`, userError)
        errors.push({ 
          userId, 
          error: 'Failed to create training job',
          details: userError.message 
        })
      }
    }

    // Try to start any jobs that can run immediately
    try {
      await trainingEngine.processQueue()
    } catch (queueError) {
      console.error('Queue processing error:', queueError)
    }

    // Prepare response
    const response: any = {
      success: results.length > 0,
      message: `Training jobs created for ${results.length} of ${userIds.length} users`,
      results,
      batchMode,
      adminInitiated: true
    }

    if (errors.length > 0) {
      response.errors = errors
      response.partialSuccess = results.length > 0
    }

    if (batchMode && results.length > 1) {
      response.batchSummary = {
        totalJobs: results.length,
        totalExamples: results.reduce((sum, r) => sum + r.trainingData.examples, 0),
        totalWords: results.reduce((sum, r) => sum + r.trainingData.totalWords, 0),
        estimatedTotalTime: results.reduce((sum, r) => sum + (r.resourceRequirements.estimatedCost * 60), 0),
        earliestCompletion: new Date(Math.min(...results.map(r => new Date(r.estimatedCompletion).getTime()))),
        latestCompletion: new Date(Math.max(...results.map(r => new Date(r.estimatedCompletion).getTime())))
      }
    }

    const statusCode = results.length > 0 ? 200 : (errors.length > 0 ? 400 : 500)
    return NextResponse.json(response, { status: statusCode })

  } catch (error: any) {
    console.error('Admin training start error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start training jobs', 
        details: error?.message || 'Unknown error',
        adminInitiated: true
      },
      { status: 500 }
    )
  }
})

// Helper functions
async function getTrainingData(userId: string): Promise<TrainingExample[]> {
  const minWordCount = 20

  // Get user's responses with question details and user profile
  const responses = await query(`
    SELECT 
      r.id,
      r.response_text,
      r.word_count,
      r.created_at,
      q.question_text,
      q.category,
      u.name as user_name,
      u.primary_role,
      u.important_people
    FROM responses r
    JOIN questions q ON r.question_id = q.id
    JOIN users u ON r.user_id = u.id
    WHERE 
      r.user_id = $1
      AND r.word_count >= $2
      AND r.response_text IS NOT NULL
      AND LENGTH(r.response_text) > 50
    ORDER BY r.created_at ASC
  `, [userId, minWordCount])

  // Also get life detail entries for additional context
  const lifeEntries = await query(`
    SELECT 
      title,
      content,
      category,
      tags,
      related_people,
      emotional_depth,
      created_at
    FROM life_detail_entries
    WHERE user_id = $1 AND LENGTH(content) > 100
    ORDER BY created_at ASC
  `, [userId])

  // Get milestone messages
  const milestones = await query(`
    SELECT 
      message_title,
      message_content,
      milestone_type,
      created_at
    FROM milestone_messages
    WHERE user_id = $1 AND LENGTH(message_content) > 50
    ORDER BY created_at ASC
  `, [userId])

  // Format responses into training examples
  const responseExamples: TrainingExample[] = responses.rows.map(row => {
    const context = buildUserContext(row)
    return {
      instruction: row.question_text,
      input: context,
      output: row.response_text,
      metadata: {
        userId: row.user_id,
        timestamp: new Date(row.created_at),
        questionCategory: row.category,
        responseWordCount: row.word_count,
        emotionalTone: detectEmotionalTone(row.response_text),
        importantPeople: parseImportantPeople(row.important_people)
      }
    }
  })

  // Format life entries as additional training examples
  const lifeEntryExamples: TrainingExample[] = lifeEntries.rows.map(row => {
    const instruction = `Tell me about ${row.title.toLowerCase()}`
    const context = `You are sharing personal memories and experiences.`
    
    return {
      instruction,
      input: context,
      output: row.content,
      metadata: {
        userId,
        timestamp: new Date(row.created_at),
        questionCategory: row.category || 'life_story',
        responseWordCount: row.content.split(' ').length,
        emotionalTone: detectEmotionalTone(row.content),
        importantPeople: row.related_people || []
      }
    }
  })

  // Format milestones
  const milestoneExamples: TrainingExample[] = milestones.rows.map(row => {
    return {
      instruction: `Share a milestone message about ${row.milestone_type}`,
      input: 'You are sharing an important life milestone and the wisdom gained from it.',
      output: row.message_content,
      metadata: {
        userId,
        timestamp: new Date(row.created_at),
        questionCategory: 'milestone',
        responseWordCount: row.message_content.split(' ').length,
        emotionalTone: detectEmotionalTone(row.message_content),
        importantPeople: []
      }
    }
  })

  return [...responseExamples, ...lifeEntryExamples, ...milestoneExamples]
}

function buildUserContext(row: any): string {
  const contexts = []
  
  if (row.primary_role) {
    contexts.push(`You are a ${row.primary_role}`)
  }
  
  if (row.important_people) {
    try {
      const people = JSON.parse(row.important_people)
      if (people.length > 0) {
        const names = people.map((p: any) => p.name).filter(Boolean).join(', ')
        if (names) {
          contexts.push(`speaking about your relationships with ${names}`)
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  contexts.push('sharing your wisdom, memories, and personal experiences for future generations')
  
  return contexts.join(', ') + '.'
}

function detectEmotionalTone(text: string): string {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('love') || lowerText.includes('joy') || lowerText.includes('happy')) {
    return 'joyful'
  }
  if (lowerText.includes('proud') || lowerText.includes('accomplish')) {
    return 'proud'
  }
  if (lowerText.includes('miss') || lowerText.includes('wish') || lowerText.includes('regret')) {
    return 'nostalgic'
  }
  if (lowerText.includes('advice') || lowerText.includes('learn') || lowerText.includes('important')) {
    return 'wise'
  }
  if (lowerText.includes('difficult') || lowerText.includes('hard') || lowerText.includes('struggle')) {
    return 'reflective'
  }
  
  return 'neutral'
}

function parseImportantPeople(importantPeopleJson: string): string[] {
  try {
    if (importantPeopleJson) {
      const parsed = JSON.parse(importantPeopleJson)
      return parsed.map((p: any) => p.name).filter(Boolean)
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return []
}

function generateDataHash(trainingData: TrainingExample[]): string {
  const content = trainingData.map(ex => ex.output).join('|')
  return crypto.createHash('md5').update(content).digest('hex')
}

async function getNextModelVersion(userId: string): Promise<number> {
  const result = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(model_name FROM '.*_v([0-9]+)$') AS INTEGER)), 0) + 1 as next_version
    FROM training_runs 
    WHERE user_id = $1 AND model_name ~ '.*_v[0-9]+$'
  `, [userId])
  
  return result.rows[0]?.next_version || 1
}

function calculateTrainingDuration(dataSize: number, config: any): number {
  // Base time calculation considering data size and epochs
  const baseTimePerExample = 0.1 // minutes per example
  const epochs = config.training?.epochs || 3
  const complexityMultiplier = config.model?.size === 'large' ? 1.5 : 1.0
  
  return Math.max(30, Math.ceil(dataSize * baseTimePerExample * epochs * complexityMultiplier))
}