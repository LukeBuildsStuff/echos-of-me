import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

/**
 * Server-Sent Events endpoint for real-time training progress
 * Provides live updates on training metrics, RTX 5090 performance, and job status
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const jobId = searchParams.get('jobId')
  
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connection',
        jobId,
        timestamp: new Date().toISOString(),
        message: 'Connected to training progress stream'
      })}\n\n`))

      // Function to send training metrics
      const sendTrainingMetrics = async () => {
        try {
          // Get latest training metrics
          const metricsResult = await query(`
            SELECT 
              job_id,
              epoch,
              step,
              loss,
              learning_rate,
              gpu_utilization,
              memory_usage,
              throughput,
              estimated_time_remaining,
              rtx5090_metrics,
              timestamp,
              samples_per_second,
              current_lr,
              gradient_norm,
              total_steps,
              total_epochs
            FROM training_metrics
            WHERE job_id = $1
            ORDER BY timestamp DESC
            LIMIT 1
          `, [jobId])

          if (metricsResult.rows.length > 0) {
            const metrics = metricsResult.rows[0]
            
            // Parse RTX 5090 specific metrics
            let rtx5090Metrics = {}
            try {
              rtx5090Metrics = JSON.parse(metrics.rtx5090_metrics || '{}')
            } catch (e) {
              // Ignore parsing errors
            }

            // Calculate progress percentage
            const progressPercentage = metrics.total_epochs > 0 
              ? Math.min(100, Math.round((metrics.epoch / metrics.total_epochs) * 100))
              : 0

            const progressData = {
              type: 'progress',
              jobId: metrics.job_id,
              timestamp: metrics.timestamp,
              
              // Basic training metrics
              currentEpoch: metrics.epoch || 0,
              totalEpochs: metrics.total_epochs || 0,
              currentStep: metrics.step || 0,
              totalSteps: metrics.total_steps || 0,
              progressPercentage,
              
              // Performance metrics
              currentLoss: parseFloat(metrics.loss || 0),
              learningRate: parseFloat(metrics.learning_rate || 0),
              currentLr: parseFloat(metrics.current_lr || 0),
              gradientNorm: parseFloat(metrics.gradient_norm || 0),
              
              // GPU and system metrics
              gpuUtilization: parseFloat(metrics.gpu_utilization || 0),
              memoryUsage: parseFloat(metrics.memory_usage || 0),
              throughput: parseFloat(metrics.throughput || 0),
              samplesPerSecond: parseFloat(metrics.samples_per_second || 0),
              estimatedTimeRemaining: parseInt(metrics.estimated_time_remaining || 0),
              
              // RTX 5090 specific metrics
              rtx5090: {
                tensorCoreUtilization: rtx5090Metrics.tensorCoreUtilization || 0,
                vramFragmentation: rtx5090Metrics.vramFragmentation || 0,
                flashAttention2Speedup: rtx5090Metrics.flashAttention2Speedup || 1.0,
                memoryBandwidthUtilization: rtx5090Metrics.memoryBandwidthUtilization || 0,
                computeEfficiency: rtx5090Metrics.computeEfficiency || 0,
                currentBatchSize: rtx5090Metrics.currentBatchSize || 0,
                batchSizeAdaptations: rtx5090Metrics.batchSizeAdaptations || 0,
                memoryPressure: rtx5090Metrics.memoryPressure || 0,
                gpuTemperature: rtx5090Metrics.gpuTemperature || 0,
                powerDraw: rtx5090Metrics.powerDraw || 0,
                thermalThrottling: rtx5090Metrics.thermalThrottling || false
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))
          }

          // Get job status updates
          const jobResult = await query(`
            SELECT 
              run_id, status, started_at, completed_at, error_message,
              EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at))/60 as runtime_minutes
            FROM training_runs
            WHERE run_id = $1
          `, [jobId])

          if (jobResult.rows.length > 0) {
            const job = jobResult.rows[0]
            
            const statusData = {
              type: 'status',
              jobId: job.run_id,
              timestamp: new Date().toISOString(),
              status: job.status,
              startedAt: job.started_at,
              completedAt: job.completed_at,
              runtimeMinutes: Math.round(job.runtime_minutes || 0),
              errorMessage: job.error_message
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusData)}\n\n`))
          }

        } catch (error) {
          console.error('Error fetching training metrics:', error)
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            jobId,
            timestamp: new Date().toISOString(),
            error: 'Failed to fetch training metrics',
            details: error.message
          })}\n\n`))
        }
      }

      // Send initial metrics
      sendTrainingMetrics()

      // Set up periodic updates every 5 seconds
      const interval = setInterval(sendTrainingMetrics, 5000)

      // Clean up when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
})