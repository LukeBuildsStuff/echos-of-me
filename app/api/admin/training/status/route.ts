import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

/**
 * Training Status API
 * Get current status of all training jobs
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get all training runs with user info
    const trainingRuns = await query(`
      SELECT 
        tr.id,
        tr.run_id,
        tr.user_id,
        tr.status,
        tr.started_at,
        tr.completed_at,
        tr.training_samples,
        tr.base_model,
        tr.model_name,
        tr.admin_initiated,
        tr.error_message,
        tr.created_at,
        u.name as user_name,
        u.email as user_email,
        
        -- Get latest metrics if available
        tm.epoch,
        tm.step,
        tm.loss,
        tm.gpu_utilization,
        tm.memory_usage,
        tm.estimated_time_remaining,
        tm.timestamp as metrics_timestamp
        
      FROM training_runs tr
      LEFT JOIN users u ON tr.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM training_metrics
        WHERE job_id = tr.run_id
        ORDER BY timestamp DESC
        LIMIT 1
      ) tm ON true
      
      WHERE tr.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY tr.created_at DESC
    `)

    // Get queue information
    const queueInfo = await query(`
      SELECT 
        tq.id,
        tq.job_id,
        tq.user_id,
        tq.priority,
        tq.status as queue_status,
        tq.queue_position,
        tq.estimated_duration,
        tq.queued_at,
        tq.started_at as queue_started_at,
        tq.retry_count,
        u.name as user_name
      FROM training_queue tq
      LEFT JOIN users u ON tq.user_id = u.id
      WHERE tq.status IN ('queued', 'running')
      ORDER BY tq.queue_position ASC, tq.queued_at ASC
    `)

    const jobs = trainingRuns.rows.map(row => ({
      id: row.id,
      runId: row.run_id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      
      trainingInfo: {
        samples: row.training_samples,
        baseModel: row.base_model,
        modelName: row.model_name,
        adminInitiated: row.admin_initiated
      },
      
      error: row.error_message,
      
      // Current metrics if available
      currentMetrics: row.metrics_timestamp ? {
        epoch: row.epoch,
        step: row.step,
        loss: row.loss,
        gpuUtilization: row.gpu_utilization,
        memoryUsage: row.memory_usage,
        estimatedTimeRemaining: row.estimated_time_remaining,
        timestamp: row.metrics_timestamp
      } : null,
      
      // Calculate progress percentage
      progress: calculateProgress(row.status, row.started_at, row.completed_at, row.estimated_time_remaining)
    }))

    const queue = queueInfo.rows.map(row => ({
      id: row.id,
      jobId: row.job_id,
      userId: row.user_id,
      userName: row.user_name,
      priority: row.priority,
      status: row.queue_status,
      position: row.queue_position,
      estimatedDuration: row.estimated_duration,
      queuedAt: row.queued_at,
      retryCount: row.retry_count
    }))

    // Calculate summary statistics
    const summary = {
      total: jobs.length,
      byStatus: {
        queued: jobs.filter(j => j.status === 'queued').length,
        running: jobs.filter(j => j.status === 'running').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        cancelled: jobs.filter(j => j.status === 'cancelled').length
      },
      activeJobs: jobs.filter(j => ['queued', 'running'].includes(j.status)).length,
      queueLength: queue.length,
      avgCompletionTime: calculateAverageCompletionTime(jobs.filter(j => j.status === 'completed'))
    }

    return NextResponse.json({
      success: true,
      jobs,
      queue,
      summary,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching training status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training status' },
      { status: 500 }
    )
  }
})

function calculateProgress(status: string, startedAt: any, completedAt: any, estimatedTimeRemaining: number | null): number {
  if (status === 'completed') return 100
  if (status === 'failed' || status === 'cancelled') return 0
  if (status === 'queued') return 0
  
  if (status === 'running' && startedAt) {
    const elapsed = Date.now() - new Date(startedAt).getTime()
    if (estimatedTimeRemaining && estimatedTimeRemaining > 0) {
      const totalEstimated = elapsed + (estimatedTimeRemaining * 60 * 1000)
      return Math.min(95, Math.round((elapsed / totalEstimated) * 100))
    }
    // Fallback: assume 120 minutes for completion
    const totalEstimated = 120 * 60 * 1000
    return Math.min(90, Math.round((elapsed / totalEstimated) * 100))
  }
  
  return 0
}

function calculateAverageCompletionTime(completedJobs: any[]): number {
  if (completedJobs.length === 0) return 0
  
  const times = completedJobs
    .filter(job => job.startedAt && job.completedAt)
    .map(job => {
      const start = new Date(job.startedAt).getTime()
      const end = new Date(job.completedAt).getTime()
      return (end - start) / (1000 * 60) // minutes
    })
  
  if (times.length === 0) return 0
  
  return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
}