import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { trainingEngine } from '@/lib/training-engine'
import { defaultTrainingConfig, TrainingJob, TrainingExample } from '@/lib/ai-training-config'
import crypto from 'crypto'

/**
 * Start Training API
 * Initiates training job with comprehensive validation and queue management
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { userId, config } = body

    // Validate user has sufficient data
    const dataCheck = await query(`
      SELECT 
        COUNT(*) as response_count,
        COUNT(DISTINCT q.category) as category_count,
        SUM(r.word_count) as total_words,
        u.name as user_name
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      JOIN users u ON r.user_id = u.id
      WHERE 
        ($1::uuid IS NULL OR r.user_id = $1)
        AND r.word_count >= 20
        AND r.response_text IS NOT NULL
    `, [userId])

    const userData = dataCheck.rows[0]
    const trainingConfig = { ...defaultTrainingConfig, ...config }
    
    // Check if data meets requirements
    const isReady = userData && 
      userData.response_count >= trainingConfig.dataRequirements.minResponses &&
      userData.category_count >= trainingConfig.dataRequirements.minQuestionCategories &&
      userData.total_words >= trainingConfig.dataRequirements.minWordCount

    if (!isReady) {
      return NextResponse.json({
        error: 'Insufficient data for training',
        requirements: {
          responses: { 
            current: parseInt(userData?.response_count) || 0, 
            required: trainingConfig.dataRequirements.minResponses 
          },
          categories: { 
            current: parseInt(userData?.category_count) || 0, 
            required: trainingConfig.dataRequirements.minQuestionCategories 
          },
          words: { 
            current: parseInt(userData?.total_words) || 0, 
            required: trainingConfig.dataRequirements.minWordCount 
          }
        }
      }, { status: 400 })
    }

    // Check for existing active training
    const existingTraining = await query(`
      SELECT id FROM training_runs 
      WHERE user_id = $1 AND status IN ('queued', 'running')
      LIMIT 1
    `, [userId])

    if (existingTraining.rows.length > 0) {
      return NextResponse.json({
        error: 'Training already in progress for this user'
      }, { status: 409 })
    }

    // Get training data
    const trainingData = await getTrainingData(userId)
    
    // Create job ID
    const jobId = crypto.randomUUID()
    
    // Calculate resource requirements
    const resourceRequirements = {
      gpuMemoryGB: Math.min(20, Math.max(8, Math.ceil(trainingData.length / 100))),
      diskSpaceGB: Math.ceil(trainingData.length * 0.01), // Rough estimate
      estimatedCost: Math.min(10, trainingData.length * 0.005)
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
        model_name
      ) VALUES ($1, $2, $3, 'queued', CURRENT_TIMESTAMP, $4, $5, $6, $7)
      RETURNING id, run_id
    `, [
      crypto.randomUUID(),
      jobId,
      userId, 
      trainingData.length, 
      JSON.stringify(trainingConfig),
      trainingConfig.model.baseModel,
      `${userData.user_name?.replace(/\s+/g, '_')}_v${await getNextModelVersion(userId)}`
    ])

    // Create training job object
    const trainingJob: TrainingJob = {
      id: jobId,
      userId: userId || 'system',
      priority: 'medium',
      status: 'queued',
      queuedAt: new Date(),
      estimatedDuration: 120, // 2 hours
      config: trainingConfig,
      dataHash: generateDataHash(trainingData),
      retryCount: 0,
      maxRetries: 3,
      resourceRequirements
    }

    // Check system capacity and start training if possible
    const queueStatus = await trainingEngine.getQueueStatus()
    const runningJobs = queueStatus.filter(job => job.status === 'running').length
    
    if (runningJobs < trainingConfig.hardware.maxConcurrentTraining) {
      // Start training immediately
      trainingEngine.startTraining(trainingJob, trainingData).catch(error => {
        console.error(`Failed to start training for job ${jobId}:`, error)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Training job created successfully',
      jobId,
      status: runningJobs < trainingConfig.hardware.maxConcurrentTraining ? 'starting' : 'queued',
      queuePosition: runningJobs >= trainingConfig.hardware.maxConcurrentTraining ? queueStatus.length + 1 : 0,
      estimatedCompletion: new Date(Date.now() + trainingJob.estimatedDuration * 60 * 1000),
      resourceRequirements,
      trainingData: {
        examples: trainingData.length,
        totalWords: trainingData.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0),
        categories: new Set(trainingData.map(ex => ex.metadata.questionCategory)).size
      }
    })

  } catch (error: any) {
    console.error('Error starting training:', error)
    return NextResponse.json(
      { error: 'Failed to start training', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
})

/**
 * Get formatted training data for a user
 */
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

  return [...responseExamples, ...lifeEntryExamples]
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
    SELECT COALESCE(MAX(CAST(model_version AS INTEGER)), 0) + 1 as next_version
    FROM training_runs 
    WHERE user_id = $1 AND model_version ~ '^[0-9]+$'
  `, [userId])
  
  return result.rows[0]?.next_version || 1
}