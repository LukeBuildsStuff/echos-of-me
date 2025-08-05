import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { defaultTrainingConfig } from '@/lib/ai-training-config'

/**
 * Manages the weekly training schedule for AI models
 */

// GET - Get current training status and schedule
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    // Get user's training history
    const trainingHistory = await query(`
      SELECT 
        tr.id,
        tr.status,
        tr.started_at,
        tr.completed_at,
        tr.model_version,
        tr.training_examples_count,
        tr.final_loss,
        tr.validation_loss,
        tr.error_message,
        u.name as user_name
      FROM training_runs tr
      JOIN users u ON tr.user_id = u.id
      WHERE ($1::uuid IS NULL OR tr.user_id = $1)
      ORDER BY tr.started_at DESC
      LIMIT 10
    `, [userId])

    // Get next scheduled training time
    const now = new Date()
    const nextSunday = getNextSunday(now)
    
    // Check if user has enough data for training
    const dataCheck = await query(`
      SELECT 
        COUNT(*) as response_count,
        COUNT(DISTINCT q.category) as category_count,
        SUM(r.word_count) as total_words,
        u.name
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      JOIN users u ON r.user_id = u.id
      WHERE ($1::uuid IS NULL OR r.user_id = $1)
        AND r.word_count >= 20
    `, [userId])

    const userData = dataCheck.rows[0]
    const isReady = userData && 
      userData.response_count >= defaultTrainingConfig.dataRequirements.minResponses &&
      userData.category_count >= defaultTrainingConfig.dataRequirements.minQuestionCategories &&
      userData.total_words >= defaultTrainingConfig.dataRequirements.minWordCount

    // Calculate training progress
    const progress = {
      responses: {
        current: parseInt(userData?.response_count || '0'),
        required: defaultTrainingConfig.dataRequirements.minResponses,
        percentage: Math.min(100, (parseInt(userData?.response_count || '0') / defaultTrainingConfig.dataRequirements.minResponses) * 100)
      },
      categories: {
        current: parseInt(userData?.category_count || '0'),
        required: defaultTrainingConfig.dataRequirements.minQuestionCategories,
        percentage: Math.min(100, (parseInt(userData?.category_count || '0') / defaultTrainingConfig.dataRequirements.minQuestionCategories) * 100)
      },
      words: {
        current: parseInt(userData?.total_words || '0'),
        required: defaultTrainingConfig.dataRequirements.minWordCount,
        percentage: Math.min(100, (parseInt(userData?.total_words || '0') / defaultTrainingConfig.dataRequirements.minWordCount) * 100)
      }
    }

    return NextResponse.json({
      currentStatus: {
        isReady,
        nextTraining: isReady ? nextSunday : null,
        lastTraining: trainingHistory.rows[0] || null
      },
      progress,
      schedule: {
        frequency: 'weekly',
        dayOfWeek: 'Sunday',
        timeUTC: '03:00',
        timezone: 'Automatic based on user location'
      },
      trainingHistory: trainingHistory.rows,
      config: defaultTrainingConfig
    })

  } catch (error) {
    console.error('Error getting training schedule:', error)
    return NextResponse.json(
      { error: 'Failed to get training schedule' },
      { status: 500 }
    )
  }
})

// POST - Trigger manual training or update schedule
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, userId, config } = body

    if (action === 'trigger_training') {
      // Validate user has enough data
      const dataCheck = await query(`
        SELECT 
          COUNT(*) as response_count,
          COUNT(DISTINCT q.category) as category_count,
          SUM(r.word_count) as total_words
        FROM responses r
        JOIN questions q ON r.question_id = q.id
        WHERE r.user_id = $1 AND r.word_count >= 20
      `, [userId])

      const userData = dataCheck.rows[0]
      const isReady = userData && 
        userData.response_count >= defaultTrainingConfig.dataRequirements.minResponses &&
        userData.category_count >= defaultTrainingConfig.dataRequirements.minQuestionCategories &&
        userData.total_words >= defaultTrainingConfig.dataRequirements.minWordCount

      if (!isReady) {
        return NextResponse.json({
          error: 'Insufficient data for training',
          requirements: {
            responses: { current: userData.response_count, required: defaultTrainingConfig.dataRequirements.minResponses },
            categories: { current: userData.category_count, required: defaultTrainingConfig.dataRequirements.minQuestionCategories },
            words: { current: userData.total_words, required: defaultTrainingConfig.dataRequirements.minWordCount }
          }
        }, { status: 400 })
      }

      // Create training run record
      const trainingRun = await query(`
        INSERT INTO training_runs (
          user_id, 
          status, 
          started_at, 
          training_examples_count,
          config
        ) VALUES ($1, 'queued', CURRENT_TIMESTAMP, $2, $3)
        RETURNING id
      `, [userId, userData.response_count, JSON.stringify(config || defaultTrainingConfig)])

      // In a real implementation, this would trigger the training job
      // For now, we'll simulate it
      const trainingId = trainingRun.rows[0].id
      
      // Update status to training
      await query(`
        UPDATE training_runs 
        SET status = 'training', started_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [trainingId])

      return NextResponse.json({
        success: true,
        message: 'Training started',
        trainingId,
        estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
      })

    } else if (action === 'update_schedule') {
      // Update training schedule (would be stored in user preferences)
      // For now, just return the updated config
      return NextResponse.json({
        success: true,
        message: 'Schedule updated',
        newConfig: { ...defaultTrainingConfig, ...config }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error managing training schedule:', error)
    return NextResponse.json(
      { error: 'Failed to manage training schedule' },
      { status: 500 }
    )
  }
})

function getNextSunday(date: Date): Date {
  const nextSunday = new Date(date)
  const daysUntilSunday = (7 - date.getDay()) % 7
  if (daysUntilSunday === 0 && date.getHours() >= 3) {
    // If it's already Sunday after 3 AM, get next Sunday
    nextSunday.setDate(date.getDate() + 7)
  } else {
    nextSunday.setDate(date.getDate() + daysUntilSunday)
  }
  nextSunday.setHours(3, 0, 0, 0) // 3 AM UTC
  return nextSunday
}