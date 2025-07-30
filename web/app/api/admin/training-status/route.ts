import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { trainingEngine } from '@/lib/training-engine'

/**
 * Admin Training Status API
 * Provides comprehensive training status and progress information
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    const includeQueue = searchParams.get('includeQueue') === 'true'
    const includeMetrics = searchParams.get('includeMetrics') === 'true'

    if (jobId) {
      // Get specific job status
      const jobStatus = await getJobStatus(jobId, includeMetrics)
      return NextResponse.json({
        success: true,
        job: jobStatus,
        timestamp: new Date().toISOString()
      })
    } else {
      // Get overall training status
      const overallStatus = await getOverallTrainingStatus(includeQueue, includeMetrics)
      return NextResponse.json({
        success: true,
        ...overallStatus,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Training status fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training status' },
      { status: 500 }
    )
  }
})

async function getJobStatus(jobId: string, includeMetrics: boolean = false) {
  // Get job details
  const jobResult = await query(`
    SELECT 
      tr.run_id, tr.user_id, tr.status, tr.started_at, tr.completed_at,
      tr.training_samples, tr.model_name, tr.training_params, tr.error_message,
      tr.base_model, tr.created_at,
      u.name as user_name, u.email as user_email,
      EXTRACT(EPOCH FROM (COALESCE(tr.completed_at, NOW()) - tr.started_at))/60 as runtime_minutes
    FROM training_runs tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.run_id = $1
  `, [jobId])

  if (jobResult.rows.length === 0) {
    throw new Error('Training job not found')
  }

  const job = jobResult.rows[0]
  const trainingParams = job.training_params ? JSON.parse(job.training_params) : {}

  let metrics = null
  let progress = null

  if (includeMetrics && (job.status === 'running' || job.status === 'completed')) {
    // Get latest metrics
    const metricsResult = await query(`
      SELECT 
        epoch, step, loss, learning_rate, gpu_utilization, memory_usage,
        throughput, estimated_time_remaining, rtx5090_metrics, timestamp,
        samples_per_second, current_lr, gradient_norm
      FROM training_metrics
      WHERE job_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [jobId])

    if (metricsResult.rows.length > 0) {
      metrics = metricsResult.rows[0]
      
      // Calculate progress
      const totalEpochs = trainingParams.training?.epochs || 3
      const currentEpoch = metrics.epoch || 0
      const progressPercentage = Math.min(100, Math.round((currentEpoch / totalEpochs) * 100))

      progress = {
        percentage: progressPercentage,
        currentEpoch,
        totalEpochs,
        currentStep: metrics.step || 0,
        estimatedTimeRemaining: metrics.estimated_time_remaining
      }
    }
  }

  // Get model version if completed
  let modelVersion = null
  if (job.status === 'completed') {
    const versionResult = await query(`
      SELECT id, version, model_size, performance, checkpoint_path
      FROM model_versions
      WHERE user_id = $1
      ORDER BY version DESC
      LIMIT 1
    `, [job.user_id])

    if (versionResult.rows.length > 0) {
      modelVersion = versionResult.rows[0]
    }
  }

  return {
    jobId,
    status: job.status,
    userId: job.user_id,
    userName: job.user_name,
    userEmail: job.user_email,
    modelName: job.model_name,
    baseModel: job.base_model,
    trainingSamples: job.training_samples,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    runtimeMinutes: Math.round(job.runtime_minutes || 0),
    errorMessage: job.error_message,
    config: trainingParams,
    progress,
    metrics,
    modelVersion
  }
}

async function getOverallTrainingStatus(includeQueue: boolean = false, includeMetrics: boolean = false) {
  // Get training statistics
  const statsResult = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'running') as running_count,
      COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      AVG(training_samples) FILTER (WHERE status = 'completed') as avg_samples,
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL) as avg_training_time
    FROM training_runs
    WHERE created_at > NOW() - INTERVAL '7 days'
  `)

  const stats = statsResult.rows[0]

  // Get system status from training engine
  const systemStatus = await trainingEngine.getRTX5090SystemStatus()

  let activeJobs = []
  let queuedJobs = []

  if (includeQueue) {
    // Get active training jobs
    const activeResult = await query(`
      SELECT 
        tr.run_id, tr.user_id, tr.status, tr.started_at, tr.model_name,
        tr.training_samples, u.name as user_name, u.email as user_email,
        EXTRACT(EPOCH FROM (NOW() - tr.started_at))/60 as runtime_minutes
      FROM training_runs tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.status = 'running'
      ORDER BY tr.started_at DESC
    `)

    activeJobs = activeResult.rows.map(job => ({
      jobId: job.run_id,
      userId: job.user_id,
      userName: job.user_name,
      userEmail: job.user_email,
      modelName: job.model_name,
      trainingSamples: job.training_samples,
      startedAt: job.started_at,
      runtimeMinutes: Math.round(job.runtime_minutes || 0)
    }))

    // Get queued jobs
    const queuedResult = await query(`
      SELECT 
        tr.run_id, tr.user_id, tr.created_at, tr.model_name,
        tr.training_samples, u.name as user_name, u.email as user_email,
        EXTRACT(EPOCH FROM (NOW() - tr.created_at))/60 as wait_minutes
      FROM training_runs tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.status = 'queued'
      ORDER BY tr.created_at ASC
    `)

    queuedJobs = queuedResult.rows.map(job => ({
      jobId: job.run_id,
      userId: job.user_id,
      userName: job.user_name,
      userEmail: job.user_email,
      modelName: job.model_name,
      trainingSamples: job.training_samples,
      queuedAt: job.created_at,
      waitMinutes: Math.round(job.wait_minutes || 0)
    }))
  }

  // Calculate queue metrics
  const queueMetrics = {
    averageWaitTime: queuedJobs.length > 0 
      ? Math.round(queuedJobs.reduce((sum, job) => sum + job.waitMinutes, 0) / queuedJobs.length)
      : 0,
    estimatedProcessingTime: queuedJobs.length * (parseFloat(stats.avg_training_time) || 120),
    capacity: systemStatus ? (systemStatus.queues.maxConcurrentJobs - systemStatus.queues.activeJobs) : 1
  }

  return {
    summary: {
      runningJobs: parseInt(stats.running_count) || 0,
      queuedJobs: parseInt(stats.queued_count) || 0,
      completedJobs: parseInt(stats.completed_count) || 0,
      failedJobs: parseInt(stats.failed_count) || 0,
      averageTrainingSamples: Math.round(parseFloat(stats.avg_samples) || 0),
      averageTrainingTime: Math.round(parseFloat(stats.avg_training_time) || 0)
    },
    system: systemStatus,
    queue: {
      active: activeJobs,
      queued: queuedJobs,
      metrics: queueMetrics
    }
  }
}

/**
 * Update training job status (for internal use)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { jobId, status, errorMessage } = await request.json()

    if (!jobId || !status) {
      return NextResponse.json({
        error: 'Job ID and status are required'
      }, { status: 400 })
    }

    // Update job status
    await query(`
      UPDATE training_runs 
      SET status = $1, 
          error_message = $2,
          ${status === 'running' ? 'started_at = CURRENT_TIMESTAMP,' : ''}
          ${status === 'completed' || status === 'failed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE run_id = $3
    `.replace(/,\s*updated_at/, ', updated_at'), [status, errorMessage || null, jobId])

    // Get updated job status
    const updatedJob = await getJobStatus(jobId, true)

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} status updated to ${status}`,
      job: updatedJob
    })

  } catch (error) {
    console.error('Training status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update training status' },
      { status: 500 }
    )
  }
})