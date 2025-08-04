import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { rtx5090TrainingPipeline } from '@/lib/rtx5090-training-pipeline'

/**
 * Start Personal AI Training Pipeline
 * 
 * Initiates complete training pipeline from data processing to model deployment
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userResult = await query(
      'SELECT id, name FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = userResult.rows[0]

    // Check if user has sufficient responses for training
    const responseCount = await query(`
      SELECT COUNT(*) as count 
      FROM responses 
      WHERE user_id = $1 AND response_text IS NOT NULL
    `, [user.id])

    const totalResponses = parseInt(responseCount.rows[0].count)

    if (totalResponses < 20) {
      return NextResponse.json({ 
        error: 'Insufficient training data',
        details: `Need at least 20 responses for training. You have ${totalResponses} responses.`,
        recommendedAction: 'Answer more reflection questions to build your AI'
      }, { status: 400 })
    }

    // Check if training is already in progress
    const existingTraining = await query(`
      SELECT run_id, status, started_at 
      FROM training_runs 
      WHERE user_id = $1 AND status IN ('pending', 'running')
      ORDER BY started_at DESC 
      LIMIT 1
    `, [user.id])

    if (existingTraining.rows.length > 0) {
      return NextResponse.json({
        error: 'Training already in progress',
        trainingId: existingTraining.rows[0].run_id,
        status: existingTraining.rows[0].status,
        startedAt: existingTraining.rows[0].started_at
      }, { status: 409 })
    }

    // Parse optional configuration
    const body = await request.json().catch(() => ({}))
    const { config = {} } = body

    // Start training pipeline
    console.log(`Starting personal AI training for user ${user.id} (${user.name}) with ${totalResponses} responses`)

    // Start training pipeline in background
    const trainingPromise = rtx5090TrainingPipeline.trainPersonalAI(user.id)
    
    // Don't await - let it run in background
    trainingPromise
      .then(result => {
        console.log(`Training completed for user ${user.id}:`, result.success ? 'SUCCESS' : 'FAILED')
      })
      .catch(error => {
        console.error(`Training failed for user ${user.id}:`, error)
      })

    return NextResponse.json({
      message: 'Personal AI training started successfully',
      userId: user.id,
      userName: user.name,
      trainingData: {
        totalResponses,
        estimatedTrainingTime: '2-3 hours',
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      },
      config: {
        baseModel: 'mistralai/Mistral-7B-Instruct-v0.3',
        method: 'QLoRA',
        precision: '4bit',
        optimizations: ['flash_attention_2', 'gradient_checkpointing', 'dynamic_batching']
      },
      monitoring: {
        statusEndpoint: '/api/training/status',
        metricsEndpoint: '/api/training/metrics',
        logsEndpoint: '/api/training/logs'
      }
    })

  } catch (error) {
    console.error('Training start error:', error)
    return NextResponse.json(
      { error: 'Failed to start training', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = userResult.rows[0]

    // Get training readiness information
    const responseCount = await query(`
      SELECT COUNT(*) as count, 
             SUM(word_count) as total_words,
             AVG(word_count) as avg_words
      FROM responses 
      WHERE user_id = $1 AND response_text IS NOT NULL
    `, [user.id])

    const stats = responseCount.rows[0]
    const totalResponses = parseInt(stats.count)
    const totalWords = parseInt(stats.total_words || 0)
    const avgWords = parseFloat(stats.avg_words || 0)

    // Get category distribution
    const categoryStats = await query(`
      SELECT q.category, COUNT(*) as count
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1 AND r.response_text IS NOT NULL
      GROUP BY q.category
      ORDER BY count DESC
    `, [user.id])

    // Check existing training runs
    const trainingHistory = await query(`
      SELECT run_id, status, started_at, completed_at, final_loss
      FROM training_runs 
      WHERE user_id = $1
      ORDER BY started_at DESC 
      LIMIT 5
    `, [user.id])

    // Assess training readiness
    const readiness = assessTrainingReadiness(totalResponses, totalWords, avgWords, categoryStats.rows)

    return NextResponse.json({
      trainingReadiness: readiness,
      dataStats: {
        totalResponses,
        totalWords,
        averageWordsPerResponse: Math.round(avgWords),
        categories: categoryStats.rows
      },
      trainingHistory: trainingHistory.rows,
      requirements: {
        minimumResponses: 20,
        recommendedResponses: 50,
        optimalResponses: 100,
        minimumWordsPerResponse: 30,
        recommendedCategories: 5
      },
      estimatedPerformance: estimatePerformance(totalResponses, totalWords, categoryStats.rows.length)
    })

  } catch (error) {
    console.error('Training readiness check error:', error)
    return NextResponse.json(
      { error: 'Failed to check training readiness' },
      { status: 500 }
    )
  }
}

function assessTrainingReadiness(
  totalResponses: number, 
  totalWords: number, 
  avgWords: number,
  categories: any[]
): {
  ready: boolean
  score: number
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 0

  // Response count assessment
  if (totalResponses >= 100) {
    score += 40
  } else if (totalResponses >= 50) {
    score += 30
    recommendations.push('Add more responses for better personality capture')
  } else if (totalResponses >= 20) {
    score += 20
    recommendations.push('Minimum met, but more responses will improve quality significantly')
  } else {
    issues.push(`Need ${20 - totalResponses} more responses to start training`)
  }

  // Word count assessment
  if (avgWords >= 100) {
    score += 20
  } else if (avgWords >= 50) {
    score += 15
    recommendations.push('Try to provide more detailed responses for richer training data')
  } else if (avgWords >= 30) {
    score += 10
    recommendations.push('Responses are quite brief - more detail would help')
  } else {
    issues.push('Responses are too brief (average < 30 words)')
  }

  // Category diversity assessment
  const uniqueCategories = categories.length
  if (uniqueCategories >= 8) {
    score += 20
  } else if (uniqueCategories >= 5) {
    score += 15
    recommendations.push('Answer questions from more categories for a well-rounded AI')
  } else if (uniqueCategories >= 3) {
    score += 10
    recommendations.push('Try answering questions from different life areas')
  } else {
    issues.push('Need responses from more question categories')
  }

  // Content quality assessment
  if (totalWords >= 5000) {
    score += 20
  } else if (totalWords >= 2000) {
    score += 15
    recommendations.push('More content will help create a more expressive AI')
  } else if (totalWords >= 1000) {
    score += 10
    recommendations.push('Additional content recommended for better results')
  } else {
    issues.push('Need more total content for effective training')
  }

  const ready = issues.length === 0 && score >= 60

  if (ready && recommendations.length === 0) {
    recommendations.push('Your data looks great for training! Expected results: high-quality personal AI')
  }

  return {
    ready,
    score: Math.min(100, score),
    issues,
    recommendations
  }
}

function estimatePerformance(
  totalResponses: number, 
  totalWords: number, 
  categories: number
): {
  expectedQuality: 'excellent' | 'good' | 'fair' | 'basic'
  personalityCapture: number
  responseCoherence: number
  contextAwareness: number
  estimatedAccuracy: number
} {
  // Calculate performance scores based on data quality
  let personalityCapture = Math.min(95, (totalResponses / 100) * 80 + (categories / 10) * 15)
  let responseCoherence = Math.min(95, (totalWords / 5000) * 60 + (totalResponses / 50) * 30)
  let contextAwareness = Math.min(90, (totalResponses / 75) * 70 + (categories / 8) * 20)
  
  const estimatedAccuracy = (personalityCapture + responseCoherence + contextAwareness) / 3

  let expectedQuality: 'excellent' | 'good' | 'fair' | 'basic' = 'basic'
  
  if (estimatedAccuracy >= 85) {
    expectedQuality = 'excellent'
  } else if (estimatedAccuracy >= 75) {
    expectedQuality = 'good'
  } else if (estimatedAccuracy >= 65) {
    expectedQuality = 'fair'
  }

  return {
    expectedQuality,
    personalityCapture: Math.round(personalityCapture),
    responseCoherence: Math.round(responseCoherence),
    contextAwareness: Math.round(contextAwareness),
    estimatedAccuracy: Math.round(estimatedAccuracy)
  }
}