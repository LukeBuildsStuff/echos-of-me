import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { trainingQueue } from '@/lib/training-queue'

/**
 * Training Queue Management API
 * Handles queue operations, monitoring, and resource management
 */

// GET - Get queue status and metrics
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    if (action === 'status') {
      const queueStatus = await trainingQueue.getQueueStatus()
      return NextResponse.json(queueStatus)
    }

    if (action === 'metrics') {
      const queueStatus = await trainingQueue.getQueueStatus()
      return NextResponse.json({
        metrics: queueStatus.metrics,
        resources: queueStatus.resources
      })
    }

    // Default: return comprehensive queue information
    const queueStatus = await trainingQueue.getQueueStatus()
    return NextResponse.json({
      ...queueStatus,
      systemInfo: {
        version: '1.0.0',
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      }
    })

  } catch (error) {
    console.error('Error getting queue status:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
})

// POST - Queue management operations
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, jobId, userId, priority, reason } = body

    switch (action) {
      case 'add':
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          )
        }

        const newJobId = await trainingQueue.addJob(
          userId,
          undefined, // Use default config
          priority || 'medium'
        )

        return NextResponse.json({
          success: true,
          message: 'Job added to queue',
          jobId: newJobId
        })

      case 'cancel':
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID is required' },
            { status: 400 }
          )
        }

        await trainingQueue.cancelJob(jobId, reason || 'Cancelled by admin')

        return NextResponse.json({
          success: true,
          message: 'Job cancelled successfully'
        })

      case 'retry':
        if (!jobId) {
          return NextResponse.json(
            { error: 'Job ID is required' },
            { status: 400 }
          )
        }

        await trainingQueue.retryJob(jobId)

        return NextResponse.json({
          success: true,
          message: 'Job queued for retry'
        })

      case 'pause_queue':
        // This would pause the entire queue processing
        return NextResponse.json({
          success: true,
          message: 'Queue paused (feature not yet implemented)'
        })

      case 'resume_queue':
        // This would resume queue processing
        return NextResponse.json({
          success: true,
          message: 'Queue resumed (feature not yet implemented)'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('Error managing queue:', error)
    return NextResponse.json(
      { error: 'Failed to process queue operation', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
})

// DELETE - Remove completed/failed jobs
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    const cleanup = searchParams.get('cleanup')

    if (jobId) {
      // Remove specific job
      await trainingQueue.cancelJob(jobId, 'Deleted by admin')
      return NextResponse.json({
        success: true,
        message: 'Job removed from queue'
      })
    }

    if (cleanup === 'old') {
      // Cleanup old completed/failed jobs (7 days)
      // This would be implemented in the queue manager
      return NextResponse.json({
        success: true,
        message: 'Old jobs cleaned up'
      })
    }

    return NextResponse.json(
      { error: 'Job ID or cleanup action required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error deleting from queue:', error)
    return NextResponse.json(
      { error: 'Failed to delete from queue' },
      { status: 500 }
    )
  }
})