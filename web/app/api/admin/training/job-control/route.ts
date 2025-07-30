import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { trainingEngine } from '@/lib/training-engine'

/**
 * Training Job Control API
 * Provides admin control over training jobs (pause, resume, stop, restart)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { jobId, action } = body

    if (!jobId || !action) {
      return NextResponse.json(
        { error: 'Job ID and action are required' },
        { status: 400 }
      )
    }

    // Validate action
    const validActions = ['pause', 'resume', 'stop', 'restart', 'cancel']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: pause, resume, stop, restart, cancel' },
        { status: 400 }
      )
    }

    // Get current job status
    const jobResult = await query(`
      SELECT run_id, status, user_id FROM training_runs WHERE run_id = $1
    `, [jobId])

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Training job not found' },
        { status: 404 }
      )
    }

    const currentJob = jobResult.rows[0]
    let newStatus: string
    let message: string

    // Determine new status based on action and current status
    switch (action) {
      case 'pause':
        if (currentJob.status !== 'running') {
          return NextResponse.json(
            { error: 'Can only pause running jobs' },
            { status: 400 }
          )
        }
        newStatus = 'paused'
        message = 'Training job paused successfully'
        break

      case 'resume':
        if (currentJob.status !== 'paused') {
          return NextResponse.json(
            { error: 'Can only resume paused jobs' },
            { status: 400 }
          )
        }
        newStatus = 'running'
        message = 'Training job resumed successfully'
        break

      case 'stop':
      case 'cancel':
        if (!['running', 'paused', 'queued'].includes(currentJob.status)) {
          return NextResponse.json(
            { error: 'Can only stop/cancel running, paused, or queued jobs' },
            { status: 400 }
          )
        }
        newStatus = 'cancelled'
        message = 'Training job cancelled successfully'
        
        // Cancel the actual training process
        try {
          await trainingEngine.cancelTraining(jobId)
        } catch (cancelError) {
          console.error(`Failed to cancel training process for job ${jobId}:`, cancelError)
        }
        break

      case 'restart':
        if (!['failed', 'cancelled', 'completed'].includes(currentJob.status)) {
          return NextResponse.json(
            { error: 'Can only restart failed, cancelled, or completed jobs' },
            { status: 400 }
          )
        }
        newStatus = 'queued'
        message = 'Training job restarted and added to queue'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update job status
    await query(`
      UPDATE training_runs 
      SET status = $1, 
          updated_at = CURRENT_TIMESTAMP,
          ${newStatus === 'cancelled' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
          ${newStatus === 'queued' ? 'error_message = NULL,' : ''}
          admin_notes = COALESCE(admin_notes, '') || $2
      WHERE run_id = $3
    `.replace(/,\s*admin_notes/, ', admin_notes'), [
      newStatus, 
      `\n[${new Date().toISOString()}] Admin action: ${action}`,
      jobId
    ])

    // If restarting, try to process the queue
    if (action === 'restart') {
      try {
        await trainingEngine.processQueue()
      } catch (queueError) {
        console.error('Failed to process queue after restart:', queueError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      jobId,
      action,
      previousStatus: currentJob.status,
      newStatus,
      message
    })

  } catch (error) {
    console.error('Error controlling training job:', error)
    return NextResponse.json(
      { error: 'Failed to control training job' },
      { status: 500 }
    )
  }
})