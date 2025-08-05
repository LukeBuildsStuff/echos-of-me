import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import crypto from 'crypto'

/**
 * Simplified Training Start API
 * Creates training jobs without complex dependencies
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { userIds, priority = 'medium', config = {} } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        error: 'At least one user ID is required'
      }, { status: 400 })
    }

    const results = []
    const errors = []

    for (const userId of userIds) {
      try {
        // Check if user exists and has sufficient data
        const userCheck = await query(`
          SELECT 
            u.id, u.name, u.email,
            COUNT(DISTINCT r.id) as response_count,
            COUNT(DISTINCT le.id) as life_entry_count,
            COUNT(DISTINCT mm.id) as milestone_count,
            COUNT(DISTINCT q.category) as categories_covered,
            COALESCE(SUM(r.word_count), 0) as response_words,
            COALESCE(SUM(LENGTH(le.content)), 0) as life_entry_words,
            COALESCE(SUM(LENGTH(mm.message_content)), 0) as milestone_words
          FROM users u
          LEFT JOIN responses r ON u.id = r.user_id
          LEFT JOIN life_detail_entries le ON u.id = le.user_id
          LEFT JOIN milestone_messages mm ON u.id = mm.user_id
          LEFT JOIN questions q ON r.question_id = q.id
          WHERE u.id = $1 AND u.is_active = true
          GROUP BY u.id, u.name, u.email
        `, [userId])

        if (userCheck.rows.length === 0) {
          errors.push({ userId, error: 'User not found or inactive' })
          continue
        }

        const userData = userCheck.rows[0]
        const totalWords = parseInt(userData.response_words) + 
                          parseInt(userData.life_entry_words) + 
                          parseInt(userData.milestone_words)

        // Check data requirements
        if (parseInt(userData.response_count) < 10 || 
            totalWords < 1000 || 
            parseInt(userData.categories_covered) < 3) {
          errors.push({
            userId,
            error: 'Insufficient data for training',
            requirements: {
              responses: { current: parseInt(userData.response_count), required: 10 },
              words: { current: totalWords, required: 1000 },
              categories: { current: parseInt(userData.categories_covered), required: 3 }
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
            error: 'Training already in progress for this user'
          })
          continue
        }

        // Create training job
        const jobId = crypto.randomUUID()
        const runId = crypto.randomUUID()
        
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
          jobId,
          runId,
          userId,
          parseInt(userData.response_count) + parseInt(userData.life_entry_count) + parseInt(userData.milestone_count),
          JSON.stringify({
            priority,
            adminInitiated: true,
            trainingType: 'simple',
            ...config
          }),
          'microsoft/DialoGPT-medium',
          `${userData.name?.replace(/\s+/g, '_')}_${new Date().getFullYear()}`,
          true
        ])

        // Add to training queue
        await query(`
          INSERT INTO training_queue (
            id,
            job_id,
            user_id,
            priority,
            status,
            estimated_duration,
            resource_requirements
          ) VALUES ($1, $2, $3, $4, 'queued', $5, $6)
        `, [
          crypto.randomUUID(),
          runId,
          userId,
          priority,
          Math.max(30, Math.min(180, Math.round(totalWords / 100))), // Estimate duration
          JSON.stringify({
            gpuMemoryGB: 16,
            diskSpaceGB: 5,
            estimatedCost: 2
          })
        ])

        results.push({
          userId,
          userName: userData.name,
          userEmail: userData.email,
          jobId,
          runId,
          status: 'queued',
          trainingData: {
            responses: parseInt(userData.response_count),
            lifeEntries: parseInt(userData.life_entry_count),
            milestones: parseInt(userData.milestone_count),
            totalWords,
            categories: parseInt(userData.categories_covered)
          },
          estimatedDuration: Math.max(30, Math.min(180, Math.round(totalWords / 100))),
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
      message: `Created training jobs for ${results.length} of ${userIds.length} users`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    const statusCode = results.length > 0 ? 200 : (errors.length > 0 ? 400 : 500)
    return NextResponse.json(response, { status: statusCode })

  } catch (error: any) {
    console.error('Simple training start error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start training jobs', 
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
})