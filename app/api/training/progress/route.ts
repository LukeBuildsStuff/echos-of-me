import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * Real-time Training Progress API
 * Provides live updates on training progress, metrics, and status
 * Supports WebSocket-like polling for real-time dashboard updates
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    const userId = searchParams.get('userId')
    const realTime = searchParams.get('realTime') === 'true'

    const userIdFromEmail = await getUserIdByEmail(session.user.email)
    const targetUserId = userId ? parseInt(userId) : userIdFromEmail

    if (jobId) {
      return await getJobProgress(jobId, targetUserId)
    } else {
      return await getUserTrainingProgress(targetUserId, realTime)
    }

  } catch (error: any) {
    console.error('Training progress error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get training progress',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, jobId, ...params } = body

    switch (action) {
      case 'pause_training':
        return await pauseTraining(jobId)
      case 'resume_training':
        return await resumeTraining(jobId)
      case 'get_detailed_metrics':
        return await getDetailedMetrics(jobId)
      case 'export_progress':
        return await exportProgressData(jobId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Training progress action error:', error)
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    )
  }
}

// Progress Tracking Functions

async function getJobProgress(jobId: string, userId: number) {
  // Get basic job information
  const jobInfo = await query(`
    SELECT 
      tr.run_id, tr.user_id, tr.status, tr.started_at, tr.completed_at,
      tr.training_samples, tr.model_name, tr.training_params, tr.error_message,
      u.name as user_name,
      EXTRACT(EPOCH FROM (COALESCE(tr.completed_at, NOW()) - tr.started_at))/60 as runtime_minutes
    FROM training_runs tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.run_id = $1 AND tr.user_id = $2
  `, [jobId, userId])

  if (jobInfo.rows.length === 0) {
    return NextResponse.json({
      error: 'Training job not found or access denied'
    }, { status: 404 })
  }

  const job = jobInfo.rows[0]

  // Get latest training metrics
  const latestMetrics = await query(`
    SELECT 
      epoch, step, loss, learning_rate, gpu_utilization, memory_usage,
      throughput, estimated_time_remaining, rtx5090_metrics, timestamp
    FROM training_metrics
    WHERE job_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [jobId])

  // Get training history (last 50 metrics)
  const metricsHistory = await query(`
    SELECT 
      epoch, step, loss, learning_rate, gpu_utilization, memory_usage,
      timestamp
    FROM training_metrics
    WHERE job_id = $1
    ORDER BY timestamp DESC
    LIMIT 50
  `, [jobId])

  // Calculate progress percentage
  const progress = calculateTrainingProgress(job, latestMetrics.rows[0])

  // Get RTX 5090 specific metrics if available
  const rtx5090Metrics = latestMetrics.rows[0]?.rtx5090_metrics 
    ? JSON.parse(latestMetrics.rows[0].rtx5090_metrics) 
    : null

  const response = {
    success: true,
    jobId,
    jobInfo: {
      status: job.status,
      modelName: job.model_name,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      runtimeMinutes: Math.round(job.runtime_minutes || 0),
      trainingSamples: job.training_samples,
      errorMessage: job.error_message
    },
    progress: {
      percentage: progress.percentage,
      currentEpoch: latestMetrics.rows[0]?.epoch || 0,
      totalEpochs: progress.totalEpochs,
      currentStep: latestMetrics.rows[0]?.step || 0,
      estimatedTimeRemaining: latestMetrics.rows[0]?.estimated_time_remaining || 0
    },
    metrics: {
      current: latestMetrics.rows[0] || null,
      history: metricsHistory.rows.reverse(), // Oldest first for charts
      rtx5090: rtx5090Metrics
    },
    performance: {
      averageLoss: calculateAverageLoss(metricsHistory.rows),
      lossReduction: calculateLossReduction(metricsHistory.rows),
      trainingEfficiency: calculateTrainingEfficiency(metricsHistory.rows)
    }
  }

  return NextResponse.json(response)
}

async function getUserTrainingProgress(userId: number, realTime: boolean) {
  // Get all training jobs for user
  const allJobs = await query(`
    SELECT 
      run_id, status, started_at, completed_at, model_name,
      training_samples, training_params,
      EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at))/60 as runtime_minutes
    FROM training_runs
    WHERE user_id = $1
    ORDER BY started_at DESC
    LIMIT 10
  `, [userId])

  // Get active job details
  const activeJob = allJobs.rows.find(job => job.status === 'running')
  let activeJobProgress = null

  if (activeJob) {
    const metrics = await query(`
      SELECT 
        epoch, step, loss, learning_rate, gpu_utilization, memory_usage,
        estimated_time_remaining, timestamp
      FROM training_metrics
      WHERE job_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `, [activeJob.run_id])

    if (metrics.rows[0]) {
      const progress = calculateTrainingProgress(activeJob, metrics.rows[0])
      activeJobProgress = {
        jobId: activeJob.run_id,
        modelName: activeJob.model_name,
        progress: progress.percentage,
        currentEpoch: metrics.rows[0].epoch,
        totalEpochs: progress.totalEpochs,
        estimatedTimeRemaining: metrics.rows[0].estimated_time_remaining,
        currentMetrics: metrics.rows[0]
      }
    }
  }

  // Get overall user statistics
  const userStats = await query(`
    SELECT 
      COUNT(*) as total_jobs,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
      COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
      AVG(training_time) FILTER (WHERE status = 'completed') as avg_training_time
    FROM training_runs
    WHERE user_id = $1
  `, [userId])

  // Get recent model versions
  const modelVersions = await query(`
    SELECT 
      id, version, trained_at, performance, status, model_size
    FROM model_versions
    WHERE user_id = $1
    ORDER BY trained_at DESC
    LIMIT 5
  `, [userId])

  const response = {
    success: true,
    userId,
    timestamp: new Date().toISOString(),
    activeJob: activeJobProgress,
    recentJobs: allJobs.rows.slice(0, 5),
    statistics: userStats.rows[0],
    modelVersions: modelVersions.rows,
    canStartTraining: !activeJob
  }

  return NextResponse.json(response)
}

async function getDetailedMetrics(jobId: string) {
  // Get comprehensive metrics data
  const metrics = await query(`
    SELECT 
      epoch, step, loss, learning_rate, gpu_utilization, memory_usage,
      throughput, estimated_time_remaining, rtx5090_metrics, timestamp
    FROM training_metrics
    WHERE job_id = $1
    ORDER BY timestamp ASC
  `, [jobId])

  if (metrics.rows.length === 0) {
    return NextResponse.json({
      error: 'No metrics found for job'
    }, { status: 404 })
  }

  // Process RTX 5090 metrics
  const processedMetrics = metrics.rows.map(row => ({
    ...row,
    rtx5090_metrics: row.rtx5090_metrics ? JSON.parse(row.rtx5090_metrics) : null
  }))

  // Calculate detailed analytics
  const analytics = {
    lossProgression: processedMetrics.map(m => ({ timestamp: m.timestamp, loss: m.loss })),
    gpuUtilization: processedMetrics.map(m => ({ 
      timestamp: m.timestamp, 
      utilization: m.gpu_utilization 
    })),
    memoryUsage: processedMetrics.map(m => ({ 
      timestamp: m.timestamp, 
      usage: m.memory_usage 
    })),
    learningRateSchedule: processedMetrics.map(m => ({ 
      step: m.step, 
      rate: m.learning_rate 
    })),
    rtx5090Performance: processedMetrics
      .filter(m => m.rtx5090_metrics)
      .map(m => ({
        timestamp: m.timestamp,
        tensorCoreUtilization: m.rtx5090_metrics.tensorCoreUtilization,
        flashAttention2Speedup: m.rtx5090_metrics.flashAttention2Speedup,
        memoryBandwidthUtilization: m.rtx5090_metrics.memoryBandwidthUtilization
      }))
  }

  return NextResponse.json({
    success: true,
    jobId,
    detailedMetrics: processedMetrics,
    analytics,
    summary: {
      totalMetrics: metrics.rows.length,
      trainingDuration: processedMetrics[processedMetrics.length - 1]?.timestamp - processedMetrics[0]?.timestamp,
      finalLoss: processedMetrics[processedMetrics.length - 1]?.loss,
      averageGpuUtilization: processedMetrics.reduce((sum, m) => sum + (m.gpu_utilization || 0), 0) / processedMetrics.length
    }
  })
}

async function pauseTraining(jobId: string) {
  // Implementation would depend on training engine capabilities
  // For now, return a placeholder response
  return NextResponse.json({
    success: false,
    message: 'Training pause/resume not yet implemented',
    jobId
  })
}

async function resumeTraining(jobId: string) {
  // Implementation would depend on training engine capabilities
  return NextResponse.json({
    success: false,
    message: 'Training pause/resume not yet implemented',
    jobId
  })
}

async function exportProgressData(jobId: string) {
  const metrics = await query(`
    SELECT * FROM training_metrics
    WHERE job_id = $1
    ORDER BY timestamp ASC
  `, [jobId])

  const jobInfo = await query(`
    SELECT run_id, user_id, status, model_name, training_params
    FROM training_runs
    WHERE run_id = $1
  `, [jobId])

  const exportData = {
    jobInfo: jobInfo.rows[0],
    metrics: metrics.rows,
    exportedAt: new Date().toISOString(),
    format: 'JSON'
  }

  return NextResponse.json({
    success: true,
    exportData,
    downloadUrl: `/api/training/export/${jobId}` // Would implement actual file download
  })
}

// Helper Functions

async function getUserIdByEmail(email: string): Promise<number> {
  const result = await query('SELECT id FROM users WHERE email = $1', [email])
  if (result.rows.length === 0) {
    throw new Error('User not found')
  }
  return result.rows[0].id
}

function calculateTrainingProgress(job: any, latestMetrics: any) {
  const trainingParams = job.training_params ? JSON.parse(job.training_params) : {}
  const totalEpochs = trainingParams.training?.epochs || 3
  const currentEpoch = latestMetrics?.epoch || 0
  
  const percentage = Math.min(100, (currentEpoch / totalEpochs) * 100)
  
  return {
    percentage: Math.round(percentage),
    totalEpochs
  }
}

function calculateAverageLoss(metricsHistory: any[]) {
  if (metricsHistory.length === 0) return null
  
  const totalLoss = metricsHistory.reduce((sum, metric) => sum + (metric.loss || 0), 0)
  return totalLoss / metricsHistory.length
}

function calculateLossReduction(metricsHistory: any[]) {
  if (metricsHistory.length < 2) return null
  
  const firstLoss = metricsHistory[0]?.loss
  const lastLoss = metricsHistory[metricsHistory.length - 1]?.loss
  
  if (!firstLoss || !lastLoss) return null
  
  return ((firstLoss - lastLoss) / firstLoss) * 100 // Percentage reduction
}

function calculateTrainingEfficiency(metricsHistory: any[]) {
  if (metricsHistory.length === 0) return null
  
  const avgGpuUtil = metricsHistory.reduce((sum, m) => sum + (m.gpu_utilization || 0), 0) / metricsHistory.length
  const avgThroughput = metricsHistory.reduce((sum, m) => sum + (m.throughput || 0), 0) / metricsHistory.length
  
  return {
    averageGpuUtilization: Math.round(avgGpuUtil),
    averageThroughput: Math.round(avgThroughput),
    efficiency: Math.round((avgGpuUtil + Math.min(avgThroughput, 100)) / 2) // Combined efficiency score
  }
}