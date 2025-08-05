import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

interface SystemStatus {
  gpuAvailable: boolean
  gpuTemperature: number
  gpuMemoryFree: number
  gpuMemoryTotal: number
  systemMemoryFree: number
  systemMemoryTotal: number
  diskSpaceUsed: number
  diskSpaceTotal: number
  activeJobs: number
  queuedJobs: number
  averageWaitTime: number
}

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

    // Get active and queued jobs
    const activeJobs = await db.query(`
      SELECT COUNT(*) as count 
      FROM training_jobs 
      WHERE status = 'running'
    `)

    const queuedJobs = await db.query(`
      SELECT COUNT(*) as count 
      FROM training_jobs 
      WHERE status = 'queued'
    `)

    // Calculate average wait time
    const waitTimeQuery = await db.query(`
      SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, started_at)) as avg_wait
      FROM training_jobs 
      WHERE status = 'completed' 
      AND started_at IS NOT NULL 
      AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `)

    // Get latest RTX metrics for current system status
    const latestMetrics = await db.query(`
      SELECT 
        temperature,
        memory_used,
        memory_total
      FROM rtx_metrics 
      ORDER BY timestamp DESC 
      LIMIT 1
    `)

    // Generate system status (in production, this would come from actual system monitoring)
    const systemStatus: SystemStatus = {
      gpuAvailable: activeJobs[0]?.count === 0,
      gpuTemperature: latestMetrics[0]?.temperature || 67,
      gpuMemoryFree: 24 - (latestMetrics[0]?.memory_used || 14.2),
      gpuMemoryTotal: 24,
      systemMemoryFree: 16, // GB
      systemMemoryTotal: 64, // GB
      diskSpaceUsed: 450, // GB
      diskSpaceTotal: 1000, // GB
      activeJobs: activeJobs[0]?.count || 0,
      queuedJobs: queuedJobs[0]?.count || 0,
      averageWaitTime: waitTimeQuery[0]?.avg_wait || 0
    }

    return NextResponse.json(systemStatus)

  } catch (error) {
    console.error('Error fetching system status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    )
  }
}