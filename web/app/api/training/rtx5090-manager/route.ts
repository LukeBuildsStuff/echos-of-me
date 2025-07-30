import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { trainingEngine } from '@/lib/training-engine'
import { defaultTrainingConfig, TrainingJob } from '@/lib/ai-training-config'
import crypto from 'crypto'

/**
 * RTX 5090 Training Job Management API
 * Handles GPU-optimized training job creation, monitoring, and management
 * Provides real-time GPU metrics and performance optimization
 */

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'start_training':
        return await startTrainingJob(params)
      case 'stop_training':
        return await stopTrainingJob(params)
      case 'get_gpu_status':
        return await getGPUStatus()
      case 'optimize_settings':
        return await optimizeRTX5090Settings(params)
      case 'create_admin_queue':
        return await createAdminQueue(params)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('RTX 5090 Manager error:', error)
    return NextResponse.json(
      { 
        error: 'RTX 5090 management failed',
        message: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
})

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'overview'

    switch (view) {
      case 'overview':
        return await getTrainingOverview()
      case 'active_jobs':
        return await getActiveJobs()
      case 'gpu_metrics':
        return await getRealTimeGPUMetrics()
      case 'performance_history':
        return await getPerformanceHistory()
      case 'system_status':
        return await getSystemStatus()
      default:
        return NextResponse.json({ error: 'Invalid view' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('RTX 5090 status error:', error)
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    )
  }
})

// Training Job Management Functions

async function startTrainingJob(params: any) {
  const { userId, config = {}, priority = 'medium', voiceIntegration = false } = params

  // Validate user has training data
  const dataset = await getTrainingDataset(userId)
  if (!dataset || dataset.training_examples_count < 50) {
    return NextResponse.json({
      error: 'Insufficient training data',
      required: 50,
      current: dataset?.training_examples_count || 0
    }, { status: 400 })
  }

  // Check for existing active jobs
  const activeJobs = await getActiveTrainingJobs(userId)
  if (activeJobs.length > 0) {
    return NextResponse.json({
      error: 'Training already in progress',
      activeJobId: activeJobs[0].job_id
    }, { status: 409 })
  }

  // Create optimized training configuration
  const trainingConfig = {
    ...defaultTrainingConfig,
    ...config,
    hardware: {
      ...defaultTrainingConfig.hardware,
      gpu: 'RTX_5090',
      vramOptimization: true,
      flashAttention2: true,
      tensorCoreUtilization: true
    }
  }

  // Generate job ID and create training job
  const jobId = crypto.randomUUID()
  const resourceRequirements = calculateRTX5090Requirements(dataset.training_examples_count)

  // Create training job record
  await query(`
    INSERT INTO training_runs (
      id, run_id, user_id, status, started_at, training_samples,
      training_params, base_model, model_name, training_data
    ) VALUES ($1, $2, $3, 'queued', CURRENT_TIMESTAMP, $4, $5, $6, $7, $8)
  `, [
    crypto.randomUUID(),
    jobId,
    userId,
    dataset.training_examples_count,
    JSON.stringify(trainingConfig),
    trainingConfig.model.baseModel,
    `user_${userId}_v${await getNextModelVersion(userId)}`,
    dataset.training_examples
  ])

  // Create training job object
  const trainingJob: TrainingJob = {
    id: jobId,
    userId: userId.toString(),
    priority,
    status: 'queued',
    queuedAt: new Date(),
    estimatedDuration: calculateTrainingDuration(dataset.training_examples_count),
    config: trainingConfig,
    dataHash: generateDataHash(dataset.training_examples),
    retryCount: 0,
    maxRetries: 3,
    resourceRequirements
  }

  // Add to training queue
  await addToTrainingQueue(trainingJob)

  // Start training if RTX 5090 is available
  const gpuStatus = await checkRTX5090Availability()
  if (gpuStatus.available) {
    try {
      const trainingData = JSON.parse(dataset.training_examples)
      await trainingEngine.startTraining(trainingJob, trainingData)
      
      // Add voice integration if requested
      if (voiceIntegration) {
        await scheduleVoiceIntegration(userId, jobId)
      }
      
    } catch (error) {
      console.error(`Failed to start training for job ${jobId}:`, error)
    }
  }

  return NextResponse.json({
    success: true,
    jobId,
    status: gpuStatus.available ? 'starting' : 'queued',
    estimatedCompletion: new Date(Date.now() + trainingJob.estimatedDuration * 60 * 1000),
    resourceRequirements,
    rtx5090Optimizations: {
      flashAttention2: trainingConfig.hardware.flashAttention2,
      dynamicBatching: true,
      memoryOptimization: true,
      tensorCoreAcceleration: true
    }
  })
}

async function stopTrainingJob(params: any) {
  const { jobId } = params

  try {
    await trainingEngine.cancelTraining(jobId)
    
    await query(`
      UPDATE training_runs 
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
      WHERE run_id = $1
    `, [jobId])

    return NextResponse.json({
      success: true,
      message: 'Training job stopped successfully',
      jobId
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to stop training job',
      jobId
    }, { status: 500 })
  }
}

async function getGPUStatus() {
  try {
    const rtx5090Status = await trainingEngine.getRTX5090SystemStatus()
    const activeJobs = await query(`
      SELECT run_id, user_id, status, started_at, training_params
      FROM training_runs 
      WHERE status IN ('running', 'queued')
      ORDER BY started_at ASC
    `)

    return NextResponse.json({
      success: true,
      rtx5090: rtx5090Status,
      activeJobs: activeJobs.rows,
      capacity: {
        maxConcurrentJobs: rtx5090Status?.queues?.maxConcurrentJobs || 1,
        currentJobs: activeJobs.rows.filter(job => job.status === 'running').length,
        queuedJobs: activeJobs.rows.filter(job => job.status === 'queued').length
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get GPU status',
      details: error
    }, { status: 500 })
  }
}

async function optimizeRTX5090Settings(params: any) {
  const { jobId, optimizationType = 'auto' } = params

  // Get current job metrics
  const metrics = await query(`
    SELECT * FROM training_metrics 
    WHERE job_id = $1 
    ORDER BY timestamp DESC 
    LIMIT 10
  `, [jobId])

  if (metrics.rows.length === 0) {
    return NextResponse.json({
      error: 'No metrics found for job',
      jobId
    }, { status: 404 })
  }

  // Analyze performance and suggest optimizations
  const latestMetrics = metrics.rows[0]
  const avgGpuUtil = metrics.rows.reduce((sum, m) => sum + (m.gpu_utilization || 0), 0) / metrics.rows.length
  const avgMemoryUsage = metrics.rows.reduce((sum, m) => sum + (m.memory_usage || 0), 0) / metrics.rows.length

  const optimizations = generateRTX5090Optimizations(avgGpuUtil, avgMemoryUsage, optimizationType)

  return NextResponse.json({
    success: true,
    jobId,
    currentMetrics: {
      gpuUtilization: avgGpuUtil,
      memoryUsage: avgMemoryUsage,
      currentLoss: latestMetrics.loss
    },
    optimizations,
    applied: false // Would need to implement application logic
  })
}

async function createAdminQueue(params: any) {
  const { adminId, queueName, maxConcurrentJobs = 2, priorityWeights } = params

  try {
    const queueId = await trainingEngine.createAdminQueue(adminId, {
      queueName,
      maxConcurrentJobs,
      priorityWeights
    })

    return NextResponse.json({
      success: true,
      queueId,
      message: 'Admin training queue created successfully'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create admin queue',
      details: error
    }, { status: 500 })
  }
}

// Status and Monitoring Functions

async function getTrainingOverview() {
  const overview = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
      COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
      AVG(training_time) FILTER (WHERE status = 'completed') as avg_training_time
    FROM training_runs 
    WHERE created_at > NOW() - INTERVAL '30 days'
  `)

  const rtx5090Status = await trainingEngine.getRTX5090SystemStatus()

  return NextResponse.json({
    success: true,
    overview: overview.rows[0],
    rtx5090Status,
    timestamp: new Date().toISOString()
  })
}

async function getActiveJobs() {
  const jobs = await query(`
    SELECT 
      tr.run_id, tr.user_id, tr.status, tr.started_at,
      tr.training_samples, tr.model_name, tr.training_params,
      u.name as user_name,
      EXTRACT(EPOCH FROM (NOW() - tr.started_at))/60 as runtime_minutes
    FROM training_runs tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.status IN ('running', 'queued')
    ORDER BY tr.started_at ASC
  `)

  // Get latest metrics for each job
  const jobsWithMetrics = await Promise.all(
    jobs.rows.map(async (job) => {
      const metrics = await query(`
        SELECT gpu_utilization, memory_usage, loss, learning_rate, timestamp
        FROM training_metrics 
        WHERE job_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [job.run_id])

      return {
        ...job,
        latestMetrics: metrics.rows[0] || null
      }
    })
  )

  return NextResponse.json({
    success: true,
    activeJobs: jobsWithMetrics
  })
}

async function getRealTimeGPUMetrics() {
  // Get RTX 5090 system status
  const systemStatus = await trainingEngine.getRTX5090SystemStatus()
  
  // Get recent metrics from all active jobs
  const recentMetrics = await query(`
    SELECT 
      job_id, gpu_utilization, memory_usage, 
      rtx5090_metrics, timestamp
    FROM training_metrics 
    WHERE timestamp > NOW() - INTERVAL '5 minutes'
    ORDER BY timestamp DESC
  `)

  return NextResponse.json({
    success: true,
    systemStatus,
    recentMetrics: recentMetrics.rows,
    timestamp: new Date().toISOString()
  })
}

async function getPerformanceHistory() {
  const history = await query(`
    SELECT 
      DATE_TRUNC('hour', timestamp) as hour,
      AVG(gpu_utilization) as avg_gpu_util,
      AVG(memory_usage) as avg_memory_usage,
      COUNT(*) as metric_count
    FROM training_metrics 
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
    ORDER BY hour DESC
  `)

  const jobHistory = await query(`
    SELECT 
      DATE_TRUNC('day', started_at) as day,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      AVG(training_time) as avg_duration
    FROM training_runs
    WHERE started_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', started_at)
    ORDER BY day DESC
  `)

  return NextResponse.json({
    success: true,
    gpuHistory: history.rows,
    jobHistory: jobHistory.rows
  })
}

async function getSystemStatus() {
  const systemMetrics = await trainingEngine.getRTX5090SystemStatus()
  const queueStatus = await trainingEngine.getQueueStatus()

  return NextResponse.json({
    success: true,
    system: systemMetrics,
    queue: queueStatus,
    health: {
      status: systemMetrics ? 'healthy' : 'unknown',
      lastCheck: new Date().toISOString()
    }
  })
}

// Helper Functions

async function getTrainingDataset(userId: number) {
  const result = await query(`
    SELECT training_examples, training_examples_count, quality_metrics
    FROM training_datasets
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId])
  
  return result.rows[0] || null
}

async function getActiveTrainingJobs(userId: number) {
  const result = await query(`
    SELECT run_id, status, started_at
    FROM training_runs
    WHERE user_id = $1 AND status IN ('running', 'queued')
  `, [userId])
  
  return result.rows
}

function calculateRTX5090Requirements(exampleCount: number) {
  const baseVRAM = 8 // Base VRAM requirement in GB
  const exampleVRAM = Math.ceil(exampleCount / 1000) * 2 // 2GB per 1000 examples
  
  return {
    gpuMemoryGB: Math.min(30, baseVRAM + exampleVRAM), // RTX 5090 has 32GB
    diskSpaceGB: Math.ceil(exampleCount * 0.01),
    estimatedCost: Math.ceil(exampleCount * 0.002) // Cost estimation
  }
}

function calculateTrainingDuration(exampleCount: number): number {
  // Optimized for RTX 5090 - faster than default estimates
  const baseTime = 30 // 30 minutes base
  const exampleTime = Math.ceil(exampleCount / 100) * 5 // 5 minutes per 100 examples
  
  return Math.min(300, baseTime + exampleTime) // Max 5 hours
}

async function getNextModelVersion(userId: number): Promise<number> {
  const result = await query(`
    SELECT COALESCE(MAX(model_version::int), 0) + 1 as next_version
    FROM training_runs 
    WHERE user_id = $1
  `, [userId])
  
  return result.rows[0]?.next_version || 1
}

function generateDataHash(trainingExamples: string): string {
  return crypto.createHash('md5').update(trainingExamples.substring(0, 1000)).digest('hex')
}

async function addToTrainingQueue(job: TrainingJob) {
  await query(`
    INSERT INTO training_queue (
      job_id, user_id, priority, status, estimated_duration,
      resource_requirements, queued_at
    ) VALUES ($1, $2, $3, 'queued', $4, $5, CURRENT_TIMESTAMP)
  `, [
    job.id,
    parseInt(job.userId),
    job.priority,
    job.estimatedDuration,
    JSON.stringify(job.resourceRequirements)
  ])
}

async function checkRTX5090Availability() {
  try {
    const systemStatus = await trainingEngine.getRTX5090SystemStatus()
    const activeJobs = await query(`
      SELECT COUNT(*) as count FROM training_runs WHERE status = 'running'
    `)
    
    const maxJobs = systemStatus?.queues?.maxConcurrentJobs || 1
    const currentJobs = parseInt(activeJobs.rows[0].count)
    
    return {
      available: currentJobs < maxJobs,
      capacity: `${currentJobs}/${maxJobs}`,
      vramFree: systemStatus?.hardware?.vramFree || 0
    }
  } catch (error) {
    return { available: false, error: error.message }
  }
}

function generateRTX5090Optimizations(gpuUtil: number, memoryUsage: number, type: string) {
  const optimizations = []
  
  if (gpuUtil < 70) {
    optimizations.push({
      type: 'batch_size',
      suggestion: 'Increase batch size to improve GPU utilization',
      current: gpuUtil,
      target: 85
    })
  }
  
  if (memoryUsage > 90) {
    optimizations.push({
      type: 'memory',
      suggestion: 'Enable gradient checkpointing to reduce memory usage',
      current: memoryUsage,
      target: 80
    })
  }
  
  if (gpuUtil > 95) {
    optimizations.push({
      type: 'cooling',
      suggestion: 'Monitor GPU temperature to prevent thermal throttling',
      current: gpuUtil,
      warning: 'High utilization detected'
    })
  }
  
  return optimizations
}

async function scheduleVoiceIntegration(userId: number, jobId: string) {
  // Create voice integration record
  await query(`
    INSERT INTO voice_llm_integrations (
      user_id, model_version_id, integration_status, created_at
    ) VALUES ($1, 
      (SELECT id FROM model_versions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1),
      'scheduled', CURRENT_TIMESTAMP
    )
  `, [userId])
  
  console.log(`Voice integration scheduled for user ${userId}, job ${jobId}`)
}