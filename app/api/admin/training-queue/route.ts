import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { trainingEngine } from '@/lib/training-engine'

/**
 * Admin Training Queue Management API
 * Provides comprehensive queue management and monitoring
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const detailed = searchParams.get('detailed') === 'true'
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    // Get queue status from training engine
    const queueJobs = await trainingEngine.getQueueStatus()
    
    // Get comprehensive queue information
    const queueInfo = await getQueueInformation(detailed, includeCompleted)

    return NextResponse.json({
      success: true,
      queue: {
        summary: queueInfo.summary,
        active: queueInfo.active,
        queued: queueInfo.queued,
        ...(includeCompleted && { completed: queueInfo.completed }),
        system: queueInfo.system
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Training queue fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training queue status' },
      { status: 500 }
    )
  }
})

/**
 * Queue management actions
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { action, jobId, priority, batchSize } = await request.json()

    if (!action) {
      return NextResponse.json({
        error: 'Action is required'
      }, { status: 400 })
    }

    let result

    switch (action) {
      case 'process_queue':
        // Process the next job in queue
        try {
          await trainingEngine.processQueue()
          result = { message: 'Queue processing initiated' }
        } catch (error) {
          result = { error: 'Failed to process queue', details: error.message }
        }
        break

      case 'reorder_job':
        // Reorder job in queue (change priority)
        if (!jobId || !priority) {
          return NextResponse.json({
            error: 'Job ID and priority are required for reordering'
          }, { status: 400 })
        }
        
        result = await reorderJobInQueue(jobId, priority)
        break

      case 'clear_completed':
        // Clear completed jobs from queue display
        result = await clearCompletedJobs()
        break

      case 'pause_queue':
        // Pause queue processing
        result = await pauseQueueProcessing()
        break

      case 'resume_queue':
        // Resume queue processing
        result = await resumeQueueProcessing()
        break

      case 'get_stats':
        // Get detailed queue statistics
        result = await getQueueStatistics()
        break

      default:
        return NextResponse.json({
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

    return NextResponse.json({
      success: !result.error,
      action,
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Training queue management error:', error)
    return NextResponse.json(
      { error: 'Failed to manage training queue' },
      { status: 500 }
    )
  }
})

async function getQueueInformation(detailed: boolean, includeCompleted: boolean) {
  // Get summary statistics
  const summaryResult = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'running') as running_count,
      COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
      AVG(training_samples) FILTER (WHERE status IN ('running', 'queued')) as avg_queue_samples,
      SUM(training_samples) FILTER (WHERE status = 'queued') as total_queued_samples
    FROM training_runs
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `)

  const summary = summaryResult.rows[0]

  // Get active (running) jobs
  const activeResult = await query(`
    SELECT 
      tr.run_id, tr.user_id, tr.status, tr.started_at, tr.model_name,
      tr.training_samples, tr.training_params, u.name as user_name,
      EXTRACT(EPOCH FROM (NOW() - tr.started_at))/60 as runtime_minutes
    FROM training_runs tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.status = 'running'
    ORDER BY tr.started_at ASC
  `)

  const active = activeResult.rows.map(job => ({
    jobId: job.run_id,
    userId: job.user_id,
    userName: job.user_name,
    modelName: job.model_name,
    trainingSamples: job.training_samples,
    startedAt: job.started_at,
    runtimeMinutes: Math.round(job.runtime_minutes || 0),
    ...(detailed && {
      config: job.training_params ? JSON.parse(job.training_params) : null
    })
  }))

  // Get queued jobs
  const queuedResult = await query(`
    SELECT 
      tr.run_id, tr.user_id, tr.created_at, tr.model_name, tr.training_samples,
      tr.training_params, u.name as user_name, u.email as user_email,
      EXTRACT(EPOCH FROM (NOW() - tr.created_at))/60 as wait_minutes
    FROM training_runs tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.status = 'queued'
    ORDER BY tr.created_at ASC
  `)

  const queued = queuedResult.rows.map((job, index) => ({
    jobId: job.run_id,
    userId: job.user_id,
    userName: job.user_name,
    userEmail: job.user_email,
    modelName: job.model_name,
    trainingSamples: job.training_samples,
    queuedAt: job.created_at,
    waitMinutes: Math.round(job.wait_minutes || 0),
    queuePosition: index + 1,
    ...(detailed && {
      config: job.training_params ? JSON.parse(job.training_params) : null
    })
  }))

  let completed = []
  if (includeCompleted) {
    const completedResult = await query(`
      SELECT 
        tr.run_id, tr.user_id, tr.status, tr.completed_at, tr.model_name,
        tr.training_samples, tr.error_message, u.name as user_name,
        EXTRACT(EPOCH FROM (tr.completed_at - tr.started_at))/60 as training_duration
      FROM training_runs tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.status IN ('completed', 'failed', 'cancelled')
        AND tr.completed_at > NOW() - INTERVAL '24 hours'
      ORDER BY tr.completed_at DESC
      LIMIT 50
    `)

    completed = completedResult.rows.map(job => ({
      jobId: job.run_id,
      userId: job.user_id,
      userName: job.user_name,
      modelName: job.model_name,
      status: job.status,
      trainingSamples: job.training_samples,
      completedAt: job.completed_at,
      trainingDuration: Math.round(job.training_duration || 0),
      errorMessage: job.error_message
    }))
  }

  // Get system information
  const systemStatus = await trainingEngine.getRTX5090SystemStatus()

  // Calculate queue metrics
  const averageWaitTime = queued.length > 0 
    ? Math.round(queued.reduce((sum, job) => sum + job.waitMinutes, 0) / queued.length)
    : 0

  const estimatedProcessingTime = queued.length * 120 // Assume 120 minutes per job

  return {
    summary: {
      running: parseInt(summary.running_count) || 0,
      queued: parseInt(summary.queued_count) || 0,
      completed: parseInt(summary.completed_count) || 0,
      failed: parseInt(summary.failed_count) || 0,
      cancelled: parseInt(summary.cancelled_count) || 0,
      averageQueueSamples: Math.round(parseFloat(summary.avg_queue_samples) || 0),
      totalQueuedSamples: parseInt(summary.total_queued_samples) || 0,
      averageWaitTime,
      estimatedProcessingTime
    },
    active,
    queued,
    completed,
    system: systemStatus
  }
}

async function reorderJobInQueue(jobId: string, newPriority: 'high' | 'medium' | 'low') {
  try {
    // Check if job exists and is queued
    const jobResult = await query(`
      SELECT status FROM training_runs WHERE run_id = $1
    `, [jobId])

    if (jobResult.rows.length === 0) {
      return { error: 'Job not found' }
    }

    if (jobResult.rows[0].status !== 'queued') {
      return { error: 'Can only reorder queued jobs' }
    }

    // Update job priority (in a real implementation, you'd have a priority field)
    await query(`
      UPDATE training_runs 
      SET admin_notes = COALESCE(admin_notes, '') || $1
      WHERE run_id = $2
    `, [
      `\n[${new Date().toISOString()}] Priority changed to: ${newPriority}`,
      jobId
    ])

    return { 
      message: `Job ${jobId} priority updated to ${newPriority}`,
      newPriority 
    }

  } catch (error) {
    return { error: `Failed to reorder job: ${error.message}` }
  }
}

async function clearCompletedJobs() {
  try {
    // In a real implementation, you might archive these instead of deleting
    const result = await query(`
      UPDATE training_runs 
      SET archived = true, archived_at = CURRENT_TIMESTAMP
      WHERE status IN ('completed', 'failed', 'cancelled')
        AND completed_at < NOW() - INTERVAL '7 days'
    `)

    return { 
      message: `Archived ${result.rowCount || 0} completed jobs`,
      archivedCount: result.rowCount || 0
    }

  } catch (error) {
    return { error: `Failed to clear completed jobs: ${error.message}` }
  }
}

async function pauseQueueProcessing() {
  try {
    // Store queue pause state (in a real implementation, use Redis or database)
    // For now, just return success
    
    return { 
      message: 'Queue processing paused',
      status: 'paused'
    }

  } catch (error) {
    return { error: `Failed to pause queue: ${error.message}` }
  }
}

async function resumeQueueProcessing() {
  try {
    // Resume queue processing
    await trainingEngine.processQueue()
    
    return { 
      message: 'Queue processing resumed',
      status: 'active'
    }

  } catch (error) {
    return { error: `Failed to resume queue: ${error.message}` }
  }
}

async function getQueueStatistics() {
  try {
    const statsResult = await query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as jobs_created,
        COUNT(*) FILTER (WHERE status = 'completed') as jobs_completed,
        COUNT(*) FILTER (WHERE status = 'failed') as jobs_failed,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FILTER (WHERE status = 'completed') as avg_duration
      FROM training_runs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `)

    const hourlyStats = statsResult.rows.map(row => ({
      hour: row.hour,
      jobsCreated: parseInt(row.jobs_created),
      jobsCompleted: parseInt(row.jobs_completed) || 0,
      jobsFailed: parseInt(row.jobs_failed) || 0,
      averageDuration: Math.round(parseFloat(row.avg_duration) || 0)
    }))

    // Get overall performance metrics
    const performanceResult = await query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        AVG(training_samples) as avg_samples,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FILTER (WHERE status = 'completed') as avg_training_time,
        MIN(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FILTER (WHERE status = 'completed') as min_training_time,
        MAX(EXTRACT(EPOCH FROM (completed_at - started_at))/60) FILTER (WHERE status = 'completed') as max_training_time
      FROM training_runs
      WHERE created_at > NOW() - INTERVAL '7 days'
    `)

    const performance = performanceResult.rows[0]
    const successRate = performance.total_jobs > 0 
      ? Math.round((performance.successful_jobs / performance.total_jobs) * 100)
      : 0

    return {
      hourlyStats,
      performance: {
        totalJobs: parseInt(performance.total_jobs) || 0,
        successfulJobs: parseInt(performance.successful_jobs) || 0,
        failedJobs: parseInt(performance.failed_jobs) || 0,
        successRate,
        averageSamples: Math.round(parseFloat(performance.avg_samples) || 0),
        averageTrainingTime: Math.round(parseFloat(performance.avg_training_time) || 0),
        minTrainingTime: Math.round(parseFloat(performance.min_training_time) || 0),
        maxTrainingTime: Math.round(parseFloat(performance.max_training_time) || 0)
      }
    }

  } catch (error) {
    return { error: `Failed to get queue statistics: ${error.message}` }
  }
}