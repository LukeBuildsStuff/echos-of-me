import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    // Get active training jobs with user information
    let query = `
      SELECT 
        tj.id,
        tj.user_id as userId,
        u.name as userName,
        tj.status,
        tj.started_at as startedAt,
        tj.progress,
        tj.config,
        tj.estimated_completion as estimatedCompletion,
        tj.completed_at as actualCompletion,
        rm.gpu_utilization,
        rm.memory_used,
        rm.temperature,
        rm.current_loss as currentLoss,
        rm.current_epoch as currentEpoch,
        rm.total_epochs as totalEpochs,
        rm.estimated_time_remaining as estimatedTimeRemaining,
        rm.throughput_tokens_per_second as throughputTokensPerSecond,
        rm.batch_size as batchSize
      FROM training_jobs tj
      LEFT JOIN users u ON tj.user_id = u.id
      LEFT JOIN rtx_metrics rm ON tj.id = rm.job_id
      WHERE tj.status IN ('queued', 'running', 'completed', 'failed', 'paused')
    `

    const params: any[] = []

    if (jobId) {
      query += ` AND tj.id = ?`
      params.push(jobId)
    }

    query += ` ORDER BY tj.created_at DESC`

    const jobs = await db.query(query, params)

    // Process jobs to group metrics and extract config
    const processedJobs = jobs.rows.reduce((acc: any[], job: any) => {
      const existingJob = acc.find(j => j.id === job.id)
      
      if (existingJob) {
        // Add current metrics if available
        if (job.gpu_utilization !== null) {
          existingJob.currentMetrics = {
            timestamp: new Date().toISOString(), // In production, use actual timestamp
            gpuUtilization: job.gpu_utilization,
            memoryUsed: job.memory_used,
            temperature: job.temperature,
            currentLoss: job.currentLoss,
            currentEpoch: job.currentEpoch,
            totalEpochs: job.totalEpochs,
            estimatedTimeRemaining: job.estimatedTimeRemaining,
            throughputTokensPerSecond: job.throughputTokensPerSecond,
            batchSize: job.batchSize
          }
        }
      } else {
        // Parse config JSON
        let config = {}
        try {
          config = job.config ? JSON.parse(job.config) : {}
        } catch (e) {
          console.warn('Failed to parse job config:', e)
        }

        const processedJob = {
          id: job.id,
          userId: job.userId,
          userName: job.userName || 'Unknown User',
          status: job.status,
          startedAt: job.startedAt,
          progress: job.progress || 0,
          config: {
            modelName: config.model?.baseModel || 'Unknown Model',
            method: config.training?.method || 'lora',
            epochs: config.training?.epochs || 3,
            batchSize: config.training?.batchSize || 4
          },
          estimatedCompletion: job.estimatedCompletion,
          actualCompletion: job.actualCompletion
        }

        // Add current metrics if available
        if (job.gpu_utilization !== null) {
          processedJob.currentMetrics = {
            timestamp: new Date().toISOString(),
            gpuUtilization: job.gpu_utilization,
            memoryUsed: job.memory_used,
            temperature: job.temperature,
            currentLoss: job.currentLoss,
            currentEpoch: job.currentEpoch,
            totalEpochs: job.totalEpochs,
            estimatedTimeRemaining: job.estimatedTimeRemaining,
            throughputTokensPerSecond: job.throughputTokensPerSecond,
            batchSize: job.batchSize
          }
        }

        acc.push(processedJob)
      }
      
      return acc
    }, [])

    return NextResponse.json({ jobs: processedJobs })

  } catch (error) {
    console.error('Error fetching active jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active jobs' },
      { status: 500 }
    )
  }
}