import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

/**
 * Training Queue Management API
 * Manage training job queue (pause, resume, cancel, reorder)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, jobId, newPriority, newPosition } = body

    if (!action || !jobId) {
      return NextResponse.json({
        error: 'Action and jobId are required'
      }, { status: 400 })
    }

    let result = null

    switch (action) {
      case 'pause':
        result = await pauseJob(jobId)
        break
        
      case 'resume':
        result = await resumeJob(jobId)
        break
        
      case 'cancel':
        result = await cancelJob(jobId)
        break
        
      case 'retry':
        result = await retryJob(jobId)
        break
        
      case 'priority':
        if (!newPriority) {
          return NextResponse.json({ error: 'newPriority required for priority action' }, { status: 400 })
        }
        result = await changePriority(jobId, newPriority)
        break
        
      case 'reorder':
        if (newPosition === undefined) {
          return NextResponse.json({ error: 'newPosition required for reorder action' }, { status: 400 })
        }
        result = await reorderJob(jobId, newPosition)
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      jobId,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Queue management error:', error)
    return NextResponse.json(
      { error: 'Queue management failed', details: error.message },
      { status: 500 }
    )
  }
})

async function pauseJob(jobId: string) {
  // Update training run status
  await query(`
    UPDATE training_runs 
    SET status = 'paused', updated_at = CURRENT_TIMESTAMP
    WHERE run_id = $1 AND status IN ('queued', 'running')
  `, [jobId])

  // Update queue status
  await query(`
    UPDATE training_queue 
    SET status = 'paused'
    WHERE job_id = $1 AND status IN ('queued', 'running')
  `, [jobId])

  return { message: 'Job paused successfully' }
}

async function resumeJob(jobId: string) {
  // Update training run status
  await query(`
    UPDATE training_runs 
    SET status = 'queued', updated_at = CURRENT_TIMESTAMP
    WHERE run_id = $1 AND status = 'paused'
  `, [jobId])

  // Update queue status and reset position
  await query(`
    UPDATE training_queue 
    SET status = 'queued', queue_position = (
      SELECT COALESCE(MAX(queue_position), 0) + 1 
      FROM training_queue 
      WHERE status = 'queued'
    )
    WHERE job_id = $1 AND status = 'paused'
  `, [jobId])

  return { message: 'Job resumed and added back to queue' }
}

async function cancelJob(jobId: string) {
  // Update training run status
  await query(`
    UPDATE training_runs 
    SET status = 'cancelled', 
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        error_message = 'Cancelled by admin'
    WHERE run_id = $1 AND status IN ('queued', 'running', 'paused')
  `, [jobId])

  // Update queue status
  await query(`
    UPDATE training_queue 
    SET status = 'cancelled',
        completed_at = CURRENT_TIMESTAMP
    WHERE job_id = $1 AND status IN ('queued', 'running', 'paused')
  `, [jobId])

  return { message: 'Job cancelled successfully' }
}

async function retryJob(jobId: string) {
  // Check retry count
  const queueEntry = await query(`
    SELECT retry_count, max_retries FROM training_queue 
    WHERE job_id = $1
  `, [jobId])

  if (queueEntry.rows.length === 0) {
    throw new Error('Job not found in queue')
  }

  const { retry_count, max_retries } = queueEntry.rows[0]
  
  if (retry_count >= max_retries) {
    throw new Error('Maximum retry attempts exceeded')
  }

  // Reset training run
  await query(`
    UPDATE training_runs 
    SET status = 'queued',
        started_at = NULL,
        completed_at = NULL,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE run_id = $1
  `, [jobId])

  // Update queue with retry count
  await query(`
    UPDATE training_queue 
    SET status = 'queued',
        retry_count = retry_count + 1,
        started_at = NULL,
        completed_at = NULL,
        queue_position = (
          SELECT COALESCE(MAX(queue_position), 0) + 1 
          FROM training_queue 
          WHERE status = 'queued'
        )
    WHERE job_id = $1
  `, [jobId])

  return { 
    message: 'Job retried successfully',
    retryCount: retry_count + 1,
    maxRetries: max_retries
  }
}

async function changePriority(jobId: string, newPriority: string) {
  if (!['low', 'medium', 'high'].includes(newPriority)) {
    throw new Error('Invalid priority. Must be low, medium, or high')
  }

  await query(`
    UPDATE training_queue 
    SET priority = $1
    WHERE job_id = $2
  `, [newPriority, jobId])

  // Reorder queue based on new priority
  await reorderQueue()

  return { message: `Priority changed to ${newPriority}` }
}

async function reorderJob(jobId: string, newPosition: number) {
  // Get current queue
  const queueJobs = await query(`
    SELECT job_id, queue_position 
    FROM training_queue 
    WHERE status = 'queued'
    ORDER BY queue_position ASC
  `)

  const jobs = queueJobs.rows
  const currentJobIndex = jobs.findIndex(job => job.job_id === jobId)
  
  if (currentJobIndex === -1) {
    throw new Error('Job not found in queue or not in queued status')
  }

  // Remove job from current position
  jobs.splice(currentJobIndex, 1)
  
  // Insert at new position
  const insertIndex = Math.max(0, Math.min(newPosition, jobs.length))
  jobs.splice(insertIndex, 0, { job_id: jobId })

  // Update all positions
  for (let i = 0; i < jobs.length; i++) {
    await query(`
      UPDATE training_queue 
      SET queue_position = $1
      WHERE job_id = $2
    `, [i + 1, jobs[i].job_id])
  }

  return { message: `Job moved to position ${insertIndex + 1}` }
}

async function reorderQueue() {
  // Reorder queue by priority and creation time
  const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 }
  
  const queueJobs = await query(`
    SELECT job_id, priority, queued_at
    FROM training_queue 
    WHERE status = 'queued'
    ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END,
      queued_at ASC
  `)

  // Update positions
  for (let i = 0; i < queueJobs.rows.length; i++) {
    await query(`
      UPDATE training_queue 
      SET queue_position = $1
      WHERE job_id = $2
    `, [i + 1, queueJobs.rows[i].job_id])
  }
}