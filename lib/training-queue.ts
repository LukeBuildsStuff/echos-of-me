/**
 * Training Queue Management System
 * 
 * Handles scheduling, prioritization, and resource allocation for LLM training jobs
 * Supports multi-user environments with RTX 5090 optimization
 */

import { TrainingJob, TrainingConfig, defaultTrainingConfig } from './ai-training-config'
import { trainingEngine } from './training-engine'
import { query } from './db'
import EventEmitter from 'events'

interface QueueMetrics {
  totalJobs: number
  runningJobs: number
  queuedJobs: number
  completedToday: number
  failedToday: number
  averageWaitTime: number // minutes
  averageTrainingTime: number // minutes
  systemUtilization: number // percentage
}

interface ResourceUsage {
  gpuMemoryUsed: number // GB
  gpuMemoryTotal: number // GB
  diskSpaceUsed: number // GB
  diskSpaceTotal: number // GB
  activeCores: number
  estimatedCost: number // USD per hour
}

export class TrainingQueueManager extends EventEmitter {
  private static instance: TrainingQueueManager
  private isProcessing = false
  private resourceLimits: ResourceUsage
  private checkInterval: NodeJS.Timeout | null = null

  private constructor() {
    super()
    this.resourceLimits = {
      gpuMemoryUsed: 0,
      gpuMemoryTotal: 24, // RTX 5090
      diskSpaceUsed: 0,
      diskSpaceTotal: 1000, // 1TB
      activeCores: 0,
      estimatedCost: 0
    }
    
    this.startQueueProcessor()
  }

  static getInstance(): TrainingQueueManager {
    if (!TrainingQueueManager.instance) {
      TrainingQueueManager.instance = new TrainingQueueManager()
    }
    return TrainingQueueManager.instance
  }

  /**
   * Add job to training queue with priority calculation
   */
  async addJob(
    userId: string,
    config: TrainingConfig = defaultTrainingConfig,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    try {
      // Calculate resource requirements
      const trainingData = await this.getTrainingDataSize(userId)
      const resourceRequirements = this.calculateResourceRequirements(trainingData, config)
      
      // Check if resources are available
      if (!this.canAccommodateJob(resourceRequirements)) {
        throw new Error('Insufficient system resources for training job')
      }

      // Create job record
      const jobId = await query(`
        INSERT INTO training_queue (
          id,
          user_id,
          priority,
          status,
          config,
          resource_requirements,
          estimated_duration,
          data_hash,
          retry_count,
          max_retries,
          queued_at
        ) VALUES (
          gen_random_uuid(),
          $1, $2, 'queued', $3, $4, $5, $6, 0, 3, CURRENT_TIMESTAMP
        ) RETURNING id
      `, [
        userId,
        priority,
        JSON.stringify(config),
        JSON.stringify(resourceRequirements),
        resourceRequirements.estimatedDuration,
        trainingData.hash
      ])

      const newJobId = jobId.rows[0].id

      // Emit event for real-time updates
      this.emit('jobAdded', {
        jobId: newJobId,
        userId,
        priority,
        resourceRequirements
      })

      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue()
      }

      return newJobId

    } catch (error) {
      console.error('Failed to add job to queue:', error)
      throw error
    }
  }

  /**
   * Get current queue status and metrics
   */
  async getQueueStatus(): Promise<{
    jobs: TrainingJob[]
    metrics: QueueMetrics
    resources: ResourceUsage
  }> {
    try {
      // Get all active jobs
      const jobsQuery = await query(`
        SELECT 
          tq.*,
          u.name as user_name
        FROM training_queue tq
        JOIN users u ON tq.user_id = u.id
        WHERE tq.status IN ('queued', 'running')
        ORDER BY 
          CASE tq.priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END,
          tq.queued_at ASC
      `)

      const jobs: TrainingJob[] = jobsQuery.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        priority: row.priority,
        status: row.status,
        queuedAt: new Date(row.queued_at),
        startedAt: row.started_at ? new Date(row.started_at) : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        estimatedDuration: row.estimated_duration,
        config: JSON.parse(row.config || '{}'),
        dataHash: row.data_hash,
        retryCount: row.retry_count,
        maxRetries: row.max_retries,
        resourceRequirements: JSON.parse(row.resource_requirements || '{}')
      }))

      // Calculate metrics
      const metrics = await this.calculateQueueMetrics()
      
      // Get current resource usage
      const resources = await this.getCurrentResourceUsage()

      return { jobs, metrics, resources }

    } catch (error) {
      console.error('Failed to get queue status:', error)
      throw error
    }
  }

  /**
   * Cancel a job in the queue
   */
  async cancelJob(jobId: string, reason = 'User requested'): Promise<void> {
    try {
      const job = await query(`
        SELECT status FROM training_queue WHERE id = $1
      `, [jobId])

      if (job.rows.length === 0) {
        throw new Error('Job not found')
      }

      const status = job.rows[0].status

      if (status === 'running') {
        // Cancel running training
        await trainingEngine.cancelTraining(jobId)
      }

      // Update job status
      await query(`
        UPDATE training_queue 
        SET 
          status = 'cancelled',
          completed_at = CURRENT_TIMESTAMP,
          error_message = $2
        WHERE id = $1
      `, [jobId, reason])

      this.emit('jobCancelled', { jobId, reason })
      
      // Process next job in queue
      this.processQueue()

    } catch (error) {
      console.error('Failed to cancel job:', error)
      throw error
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    try {
      const job = await query(`
        SELECT retry_count, max_retries FROM training_queue WHERE id = $1
      `, [jobId])

      if (job.rows.length === 0) {
        throw new Error('Job not found')
      }

      const { retry_count, max_retries } = job.rows[0]

      if (retry_count >= max_retries) {
        throw new Error('Maximum retry attempts exceeded')
      }

      // Reset job to queued status
      await query(`
        UPDATE training_queue 
        SET 
          status = 'queued',
          retry_count = retry_count + 1,
          queued_at = CURRENT_TIMESTAMP,
          started_at = NULL,
          error_message = NULL
        WHERE id = $1
      `, [jobId])

      this.emit('jobRetried', { jobId, attempt: retry_count + 1 })
      
      // Process queue
      this.processQueue()

    } catch (error) {
      console.error('Failed to retry job:', error)
      throw error
    }
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    // Process queue every 30 seconds
    this.checkInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue()
      }
    }, 30000)

    // Initial processing
    setTimeout(() => this.processQueue(), 5000)
  }

  /**
   * Process the next job in queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true

    try {
      // Get next job in priority order
      const nextJobQuery = await query(`
        SELECT * FROM training_queue
        WHERE status = 'queued'
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END,
          queued_at ASC
        LIMIT 1
      `)

      if (nextJobQuery.rows.length === 0) {
        return // No jobs in queue
      }

      const jobData = nextJobQuery.rows[0]
      const resourceRequirements = JSON.parse(jobData.resource_requirements)

      // Check if we can run this job now
      if (!this.canAccommodateJob(resourceRequirements)) {
        console.log('Insufficient resources for next job, waiting...')
        return
      }

      // Update job status to running
      await query(`
        UPDATE training_queue 
        SET 
          status = 'running',
          started_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [jobData.id])

      // Get training data and start training
      const trainingData = await this.getTrainingData(jobData.user_id)
      
      const trainingJob: TrainingJob = {
        id: jobData.id,
        userId: jobData.user_id,
        priority: jobData.priority,
        status: 'running',
        queuedAt: new Date(jobData.queued_at),
        startedAt: new Date(),
        estimatedDuration: jobData.estimated_duration,
        config: JSON.parse(jobData.config),
        dataHash: jobData.data_hash,
        retryCount: jobData.retry_count,
        maxRetries: jobData.max_retries,
        resourceRequirements
      }

      // Start training
      this.emit('jobStarted', trainingJob)
      
      try {
        await trainingEngine.startTraining(trainingJob, trainingData)
        
        // Update job completion
        await query(`
          UPDATE training_queue 
          SET 
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [jobData.id])

        this.emit('jobCompleted', { jobId: jobData.id, success: true })

      } catch (trainingError) {
        console.error('Training failed:', trainingError)
        
        // Mark job as failed
        await query(`
          UPDATE training_queue 
          SET 
            status = 'failed',
            completed_at = CURRENT_TIMESTAMP,
            error_message = $2
          WHERE id = $1
        `, [jobData.id, trainingError instanceof Error ? trainingError.message : String(trainingError)])

        this.emit('jobCompleted', { 
          jobId: jobData.id, 
          success: false, 
          error: trainingError instanceof Error ? trainingError.message : String(trainingError)
        })
      }

    } catch (error) {
      console.error('Queue processing error:', error)
    } finally {
      this.isProcessing = false
      
      // Schedule next processing cycle
      setTimeout(() => {
        if (!this.isProcessing) {
          this.processQueue()
        }
      }, 5000)
    }
  }

  /**
   * Calculate resource requirements for a training job
   */
  private calculateResourceRequirements(
    trainingData: { size: number; hash: string },
    config: TrainingConfig
  ) {
    const baseGPUMemory = 8 // GB base requirement
    const memoryPerExample = 0.01 // GB per training example
    const baseDiskSpace = 2 // GB for model and checkpoints
    const diskPerExample = 0.001 // GB per training example

    return {
      gpuMemoryGB: Math.min(
        config.hardware.gpuMemoryGB,
        baseGPUMemory + (trainingData.size * memoryPerExample)
      ),
      diskSpaceGB: baseDiskSpace + (trainingData.size * diskPerExample),
      estimatedCost: Math.min(5, trainingData.size * 0.002), // $0.002 per example
      estimatedDuration: Math.min(180, 60 + (trainingData.size * 0.5)) // minutes
    }
  }

  /**
   * Check if system can accommodate a new job
   */
  private canAccommodateJob(requirements: any): boolean {
    const currentUsage = this.getCurrentResourceUsageSync()
    
    return (
      currentUsage.gpuMemoryUsed + requirements.gpuMemoryGB <= this.resourceLimits.gpuMemoryTotal &&
      currentUsage.diskSpaceUsed + requirements.diskSpaceGB <= this.resourceLimits.diskSpaceTotal &&
      currentUsage.activeCores < defaultTrainingConfig.hardware.maxConcurrentTraining
    )
  }

  /**
   * Get training data size for resource calculation
   */
  private async getTrainingDataSize(userId: string): Promise<{ size: number; hash: string }> {
    const result = await query(`
      SELECT COUNT(*) as total_examples
      FROM (
        SELECT 1 FROM responses r 
        WHERE r.user_id = $1 AND r.word_count >= 20
        UNION ALL
        SELECT 1 FROM life_detail_entries lde 
        WHERE lde.user_id = $1 AND LENGTH(content) > 100
        UNION ALL
        SELECT 1 FROM milestone_messages mm 
        WHERE mm.user_id = $1 AND LENGTH(message_content) > 50
      ) as combined
    `, [userId])

    const size = parseInt(result.rows[0]?.total_examples) || 0
    const hash = require('crypto').createHash('md5').update(`${userId}-${size}`).digest('hex')

    return { size, hash }
  }

  /**
   * Get actual training data
   */
  private async getTrainingData(userId: string): Promise<any[]> {
    // This would fetch the actual training data
    // For now, return empty array as placeholder
    return []
  }

  /**
   * Calculate queue metrics
   */
  private async calculateQueueMetrics(): Promise<QueueMetrics> {
    const metricsQuery = await query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
        COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
        COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as completed_today,
        COUNT(*) FILTER (WHERE status = 'failed' AND DATE(completed_at) = CURRENT_DATE) as failed_today,
        AVG(EXTRACT(EPOCH FROM (started_at - queued_at)) / 60) FILTER (WHERE started_at IS NOT NULL) as avg_wait_time,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL) as avg_training_time
      FROM training_queue
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `)

    const metrics = metricsQuery.rows[0]
    
    return {
      totalJobs: parseInt(metrics.total_jobs) || 0,
      runningJobs: parseInt(metrics.running_jobs) || 0,
      queuedJobs: parseInt(metrics.queued_jobs) || 0,
      completedToday: parseInt(metrics.completed_today) || 0,
      failedToday: parseInt(metrics.failed_today) || 0,
      averageWaitTime: parseFloat(metrics.avg_wait_time) || 0,
      averageTrainingTime: parseFloat(metrics.avg_training_time) || 0,
      systemUtilization: (parseInt(metrics.running_jobs) || 0) / defaultTrainingConfig.hardware.maxConcurrentTraining * 100
    }
  }

  /**
   * Get current resource usage
   */
  private async getCurrentResourceUsage(): Promise<ResourceUsage> {
    // In production, this would query actual system resources
    return {
      gpuMemoryUsed: Math.random() * 20, // Simulate usage
      gpuMemoryTotal: 24,
      diskSpaceUsed: Math.random() * 100,
      diskSpaceTotal: 1000,
      activeCores: await this.getActiveTrainingCount(),
      estimatedCost: Math.random() * 5
    }
  }

  /**
   * Get current resource usage synchronously (for quick checks)
   */
  private getCurrentResourceUsageSync(): ResourceUsage {
    return {
      gpuMemoryUsed: 0, // Would query actual usage
      gpuMemoryTotal: 24,
      diskSpaceUsed: 0,
      diskSpaceTotal: 1000,
      activeCores: 0, // Would count active training processes
      estimatedCost: 0
    }
  }

  /**
   * Get count of active training jobs
   */
  private async getActiveTrainingCount(): Promise<number> {
    const result = await query(`SELECT COUNT(*) FROM training_queue WHERE status = 'running'`)
    return parseInt(result.rows[0]?.count) || 0
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }
}

// Export singleton instance
export const trainingQueue = TrainingQueueManager.getInstance()

// Ensure database table exists
async function ensureQueueTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS training_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        priority VARCHAR(10) NOT NULL DEFAULT 'medium',
        status VARCHAR(20) NOT NULL DEFAULT 'queued',
        config JSONB NOT NULL,
        resource_requirements JSONB NOT NULL,
        estimated_duration INTEGER NOT NULL,
        data_hash VARCHAR(32) NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        queued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await query(`
      CREATE INDEX IF NOT EXISTS idx_training_queue_status ON training_queue(status);
      CREATE INDEX IF NOT EXISTS idx_training_queue_priority ON training_queue(priority, queued_at);
      CREATE INDEX IF NOT EXISTS idx_training_queue_user ON training_queue(user_id);
    `)
  } catch (error) {
    console.error('Failed to ensure queue table exists:', error)
  }
}

// Initialize table on import
ensureQueueTable()