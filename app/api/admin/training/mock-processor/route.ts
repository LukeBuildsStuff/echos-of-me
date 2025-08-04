import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

/**
 * Mock Training Processor API
 * Simulates training progress for development/testing
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action = 'process' } = body

    if (action === 'process') {
      return await processQueue()
    } else if (action === 'simulate') {
      return await simulateTraining()
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Mock processor error:', error)
    return NextResponse.json(
      { error: 'Mock processor failed', details: error.message },
      { status: 500 }
    )
  }
})

async function processQueue() {
  // Get queued training jobs
  const queuedJobs = await query(`
    SELECT 
      tr.id, tr.run_id, tr.user_id, tr.model_name,
      u.name as user_name,
      tq.estimated_duration
    FROM training_runs tr
    JOIN users u ON tr.user_id = u.id
    JOIN training_queue tq ON tr.run_id = tq.job_id
    WHERE tr.status = 'queued' AND tq.status = 'queued'
    ORDER BY tq.queue_position ASC, tr.created_at ASC
    LIMIT 1
  `)

  if (queuedJobs.rows.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No jobs in queue to process',
      processed: 0
    })
  }

  const job = queuedJobs.rows[0]
  
  // Start the first job
  await query(`
    UPDATE training_runs 
    SET status = 'running', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [job.id])

  await query(`
    UPDATE training_queue 
    SET status = 'running', started_at = CURRENT_TIMESTAMP
    WHERE job_id = $1
  `, [job.run_id])

  // Add initial metrics
  await query(`
    INSERT INTO training_metrics (
      id, job_id, epoch, step, loss, learning_rate, 
      gpu_utilization, memory_usage, throughput, 
      estimated_time_remaining, timestamp
    ) VALUES ($1, $2, 0, 0, 2.5, 0.001, 75, 8.5, 150, $3, CURRENT_TIMESTAMP)
  `, [
    require('crypto').randomUUID(),
    job.run_id,
    job.estimated_duration
  ])

  return NextResponse.json({
    success: true,
    message: `Started training for ${job.user_name}`,
    jobId: job.run_id,
    jobDetails: {
      userName: job.user_name,
      modelName: job.model_name,
      estimatedDuration: job.estimated_duration
    }
  })
}

async function simulateTraining() {
  // Get running training jobs
  const runningJobs = await query(`
    SELECT 
      tr.id, tr.run_id, tr.user_id, tr.started_at, tr.model_name,
      u.name as user_name,
      tq.estimated_duration,
      tm.epoch, tm.step, tm.loss
    FROM training_runs tr
    JOIN users u ON tr.user_id = u.id
    JOIN training_queue tq ON tr.run_id = tq.job_id
    LEFT JOIN LATERAL (
      SELECT * FROM training_metrics
      WHERE job_id = tr.run_id
      ORDER BY timestamp DESC
      LIMIT 1
    ) tm ON true
    WHERE tr.status = 'running'
  `)

  if (runningJobs.rows.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No running jobs to simulate',
      simulated: 0
    })
  }

  const results = []

  for (const job of runningJobs.rows) {
    const elapsedMinutes = job.started_at ? 
      (Date.now() - new Date(job.started_at).getTime()) / (1000 * 60) : 0
    
    const progressPercent = Math.min(95, (elapsedMinutes / job.estimated_duration) * 100)
    const currentEpoch = Math.floor(progressPercent / 33) + 1 // 3 epochs total
    const currentStep = Math.floor((progressPercent % 33) * 10)
    const currentLoss = Math.max(0.1, 2.5 - (progressPercent / 100) * 2.0) // Loss decreases
    const remainingTime = Math.max(0, job.estimated_duration - elapsedMinutes)

    // Add new metrics
    await query(`
      INSERT INTO training_metrics (
        id, job_id, epoch, step, loss, learning_rate, 
        gpu_utilization, memory_usage, throughput, 
        estimated_time_remaining, timestamp
      ) VALUES ($1, $2, $3, $4, $5, 0.001, $6, $7, $8, $9, CURRENT_TIMESTAMP)
    `, [
      require('crypto').randomUUID(),
      job.run_id,
      currentEpoch,
      currentStep,
      currentLoss,
      Math.floor(70 + Math.random() * 20), // GPU utilization 70-90%
      Math.floor(6 + Math.random() * 4), // Memory usage 6-10GB
      Math.floor(100 + Math.random() * 100), // Throughput 100-200
      Math.round(remainingTime)
    ])

    // Complete job if it's been running long enough or progress is high enough
    if (elapsedMinutes >= job.estimated_duration || progressPercent >= 95) {
      await query(`
        UPDATE training_runs 
        SET status = 'completed', 
            completed_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP,
            performance_metrics = $2
        WHERE id = $1
      `, [job.id, JSON.stringify({
        finalLoss: currentLoss,
        totalEpochs: currentEpoch,
        totalSteps: currentStep,
        trainingTime: elapsedMinutes,
        avgGpuUtilization: 80,
        avgMemoryUsage: 8
      })])

      await query(`
        UPDATE training_queue 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE job_id = $1
      `, [job.run_id])

      // Create model version record
      await query(`
        INSERT INTO model_versions (
          id, user_id, training_run_id, version, trained_at,
          base_model, training_examples, performance, status,
          checkpoint_path, model_size, training_time, is_active
        ) VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, 'microsoft/DialoGPT-medium',
                 50, $4, 'completed', $5, 1024, $6, true)
      `, [
        require('crypto').randomUUID(),
        job.user_id,
        job.id,
        JSON.stringify({
          finalLoss: currentLoss,
          accuracy: Math.round(85 + Math.random() * 10),
          perplexity: Math.round(15 + Math.random() * 10)
        }),
        `/models/${job.user_name.replace(/\s+/g, '_')}_${job.run_id.slice(0, 8)}/`,
        Math.round(elapsedMinutes)
      ])

      results.push({
        jobId: job.run_id,
        userName: job.user_name,
        status: 'completed',
        finalProgress: 100,
        trainingTime: Math.round(elapsedMinutes)
      })
    } else {
      results.push({
        jobId: job.run_id,
        userName: job.user_name,
        status: 'running',
        progress: Math.round(progressPercent),
        epoch: currentEpoch,
        loss: currentLoss,
        remainingTime: Math.round(remainingTime)
      })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Simulated progress for ${results.length} jobs`,
    results,
    timestamp: new Date().toISOString()
  })
}