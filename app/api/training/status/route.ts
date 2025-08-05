import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { promises as fs } from 'fs'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Training Status API
 * Get real-time status and metrics for training jobs
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const userId = session.user.email

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Get job information from database
    const jobResult = await query(`
      SELECT 
        run_id,
        user_id,
        status,
        started_at,
        completed_at,
        training_samples,
        training_params,
        base_model,
        model_name,
        integration_type,
        voice_profile_id,
        integration_metrics,
        voice_quality_score,
        error_message
      FROM training_runs 
      WHERE run_id = $1 AND user_id = $2
    `, [jobId, userId])

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Training job not found' }, { status: 404 })
    }

    const job = jobResult.rows[0]
    let progress = null
    let metrics = null

    // Load real-time metrics if training is active
    if (job.status === 'running') {
      try {
        // Try to load current training metrics
        const metricsPath = `/tmp/ai-training/${jobId}_metrics.json`
        if (existsSync(metricsPath)) {
          const metricsData = await fs.readFile(metricsPath, 'utf8')
          metrics = JSON.parse(metricsData)
        }

        // Try to load RTX 5090 specific metrics
        const rtx5090MetricsPath = `/tmp/ai-training/${jobId}_rtx5090_metrics.json`
        if (existsSync(rtx5090MetricsPath)) {
          const rtx5090Data = await fs.readFile(rtx5090MetricsPath, 'utf8')
          const rtx5090Metrics = JSON.parse(rtx5090Data)
          
          progress = {
            currentEpoch: rtx5090Metrics.currentEpoch || 0,
            totalEpochs: JSON.parse(job.training_params || '{}').training?.epochs || 100,
            currentLoss: rtx5090Metrics.currentLoss || 0,
            learningRate: rtx5090Metrics.learningRate || 0,
            gpuUtilization: rtx5090Metrics.gpuUtilization || 0,
            memoryUsage: rtx5090Metrics.memoryPressure || 0,
            estimatedTimeRemaining: calculateEstimatedTime(rtx5090Metrics),
            voiceAlignment: rtx5090Metrics.flashAttention2Speedup > 1 ? 0.85 : 0.75, // Approximation
            status: 'training'
          }
        }
      } catch (error) {
        console.warn('Error loading training metrics:', error)
      }
    }

    // Calculate basic progress for completed jobs
    if (job.status === 'completed' && !progress) {
      const params = JSON.parse(job.training_params || '{}')
      progress = {
        currentEpoch: params.training?.epochs || 100,
        totalEpochs: params.training?.epochs || 100,
        currentLoss: 0.1, // Placeholder for completed job
        learningRate: 0,
        gpuUtilization: 0,
        memoryUsage: 0,
        estimatedTimeRemaining: 0,
        voiceAlignment: 0.9, // High alignment for completed jobs
        status: 'completed'
      }
    }

    // Get model information if training is completed
    let modelInfo = null
    if (job.status === 'completed') {
      const modelPath = `/tmp/ai-training/models/${jobId}`
      if (existsSync(modelPath)) {
        try {
          const resultsPath = `/tmp/ai-training/${jobId}_results.json`
          if (existsSync(resultsPath)) {
            const resultsData = await fs.readFile(resultsPath, 'utf8')
            const results = JSON.parse(resultsData)
            
            modelInfo = {
              modelPath: results.model_path,
              finalLoss: results.final_loss,
              trainingTime: results.training_time,
              completionTime: results.completion_time
            }
          }
        } catch (error) {
          console.warn('Error loading model info:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      jobId: job.run_id,
      status: job.status,
      progress,
      metrics,
      modelInfo,
      job: {
        userId: job.user_id,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        trainingSamples: job.training_samples,
        baseModel: job.base_model,
        modelName: job.model_name,
        integrationType: job.integration_type,
        voiceProfileId: job.voice_profile_id,
        voiceQualityScore: job.voice_quality_score,
        errorMessage: job.error_message
      },
      timestamps: {
        startedAt: job.started_at,
        completedAt: job.completed_at,
        lastUpdate: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Training status API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get training status',
        message: 'Unable to retrieve training status. Please try again.',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate estimated time remaining based on current progress
 */
function calculateEstimatedTime(metrics: any): number {
  if (!metrics.currentEpoch || !metrics.totalEpochs || metrics.currentEpoch >= metrics.totalEpochs) {
    return 0
  }

  // Rough estimation based on typical training speeds
  const epochsRemaining = metrics.totalEpochs - metrics.currentEpoch
  const avgTimePerEpoch = 72 // seconds per epoch (rough estimate)
  
  return epochsRemaining * avgTimePerEpoch
}

/**
 * Update training status (for training engine to call)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, status, metrics, error } = body

    // Update training run status
    await query(`
      UPDATE training_runs 
      SET 
        status = $1,
        integration_metrics = $2,
        error_message = $3,
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE run_id = $4 AND user_id = $5
    `, [status, JSON.stringify(metrics), error, jobId, session.user.email])

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Training status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update training status' },
      { status: 500 }
    )
  }
}