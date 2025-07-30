import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

interface RTXMetrics {
  timestamp: string
  gpuUtilization: number
  memoryUsed: number
  memoryTotal: number
  temperature: number
  powerUsage: number
  clockSpeed: number
  throughputTokensPerSecond: number
  batchSize: number
  currentLoss: number
  currentEpoch: number
  totalEpochs: number
  estimatedTimeRemaining: number
  jobId?: string
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

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get RTX metrics from database
    let query = `
      SELECT 
        timestamp,
        gpu_utilization as gpuUtilization,
        memory_used as memoryUsed,
        memory_total as memoryTotal,
        temperature,
        power_usage as powerUsage,
        clock_speed as clockSpeed,
        throughput_tokens_per_second as throughputTokensPerSecond,
        batch_size as batchSize,
        current_loss as currentLoss,
        current_epoch as currentEpoch,
        total_epochs as totalEpochs,
        estimated_time_remaining as estimatedTimeRemaining,
        job_id as jobId
      FROM rtx_metrics 
    `
    
    const params: any[] = []
    
    if (jobId) {
      query += ` WHERE job_id = ?`
      params.push(jobId)
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ?`
    params.push(limit)

    const metrics = await db.query(query, params)

    // If no metrics exist, generate sample data for demonstration
    if (metrics.length === 0) {
      const sampleMetrics: RTXMetrics[] = []
      const now = Date.now()
      
      for (let i = 0; i < 20; i++) {
        sampleMetrics.push({
          timestamp: new Date(now - i * 30000).toISOString(), // Every 30 seconds
          gpuUtilization: 75 + Math.random() * 20, // 75-95%
          memoryUsed: 12 + Math.random() * 8, // 12-20GB
          memoryTotal: 24,
          temperature: 65 + Math.random() * 15, // 65-80°C
          powerUsage: 300 + Math.random() * 150, // 300-450W
          clockSpeed: 2200 + Math.random() * 300, // 2200-2500 MHz
          throughputTokensPerSecond: 80 + Math.random() * 40, // 80-120 tokens/sec
          batchSize: 4,
          currentLoss: 0.8 - (i * 0.02), // Decreasing loss
          currentEpoch: Math.floor(i / 5) + 1,
          totalEpochs: 4,
          estimatedTimeRemaining: Math.max(0, 3600 - (i * 180)), // Decreasing time
          jobId: jobId || 'sample-job'
        })
      }
      
      return NextResponse.json({ 
        metrics: sampleMetrics.reverse(),
        realTime: false 
      })
    }

    return NextResponse.json({ 
      metrics: metrics.reverse(),
      realTime: true 
    })

  } catch (error) {
    console.error('Error fetching RTX metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch RTX metrics' },
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

    // Check admin access
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const metrics: RTXMetrics = body

    // Store metrics in database
    await db.query(`
      INSERT INTO rtx_metrics (
        timestamp, job_id, gpu_utilization, memory_used, memory_total,
        temperature, power_usage, clock_speed, throughput_tokens_per_second,
        batch_size, current_loss, current_epoch, total_epochs, estimated_time_remaining
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      metrics.timestamp,
      metrics.jobId,
      metrics.gpuUtilization,
      metrics.memoryUsed,
      metrics.memoryTotal,
      metrics.temperature,
      metrics.powerUsage,
      metrics.clockSpeed,
      metrics.throughputTokensPerSecond,
      metrics.batchSize,
      metrics.currentLoss,
      metrics.currentEpoch,
      metrics.totalEpochs,
      metrics.estimatedTimeRemaining
    ])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error storing RTX metrics:', error)
    return NextResponse.json(
      { error: 'Failed to store RTX metrics' },
      { status: 500 }
    )
  }
}