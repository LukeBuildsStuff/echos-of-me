/**
 * Comprehensive Error Handling and Recovery for Mistral Inference
 * 
 * Handles model failures, GPU issues, inference timeouts, and automatic recovery
 */

export interface InferenceError {
  type: 'model_failure' | 'gpu_error' | 'timeout' | 'memory_error' | 'process_error' | 'network_error'
  deploymentId: string
  userId: string
  message: string
  timestamp: Date
  recoverable: boolean
  retryCount: number
  context?: any
}

export interface RecoveryStrategy {
  name: string
  canRecover: (error: InferenceError) => boolean
  recover: (error: InferenceError) => Promise<boolean>
  maxRetries: number
  backoffMs: number
}

export class InferenceErrorHandler {
  private errorHistory: Map<string, InferenceError[]> = new Map()
  private recoveryStrategies: RecoveryStrategy[] = []
  private maxErrorHistory = 100
  
  constructor() {
    this.initializeRecoveryStrategies()
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies() {
    this.recoveryStrategies = [
      {
        name: 'process_restart',
        canRecover: (error) => error.type === 'process_error' || error.type === 'model_failure',
        recover: async (error) => {
          try {
            console.log(`Attempting process restart for deployment ${error.deploymentId}`)
            
            // Import inference engine dynamically to avoid circular dependencies
            const { mistralInferenceEngine } = await import('./mistral-inference-engine')
            
            // Unload and redeploy the model
            await mistralInferenceEngine.unloadModel(error.deploymentId)
            
            // Wait for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Find user's model info and redeploy
            const userDeployments = await mistralInferenceEngine.getUserDeployments(error.userId)
            const failedDeployment = userDeployments.find(d => d.id === error.deploymentId)
            
            if (failedDeployment) {
              await mistralInferenceEngine.deployModel(
                error.userId,
                failedDeployment.modelPath,
                failedDeployment.modelVersion
              )
              console.log(`Process restart successful for deployment ${error.deploymentId}`)
              return true
            }
            
            return false
          } catch (recoveryError) {
            console.error(`Process restart failed for deployment ${error.deploymentId}:`, recoveryError)
            return false
          }
        },
        maxRetries: 2,
        backoffMs: 5000
      },
      
      {
        name: 'memory_cleanup',
        canRecover: (error) => error.type === 'memory_error' || error.type === 'gpu_error',
        recover: async (error) => {
          try {
            console.log(`Attempting memory cleanup for deployment ${error.deploymentId}`)
            
            const { rtx5090MemoryManager } = await import('./rtx5090-memory-manager')
            const { mistralInferenceEngine } = await import('./mistral-inference-engine')
            
            // Optimize memory layout
            await rtx5090MemoryManager.optimizeMemory()
            
            // Get memory stats to verify cleanup
            const memoryStats = rtx5090MemoryManager.getMemoryStats()
            console.log(`Memory cleanup completed. Utilization: ${memoryStats.utilizationPercent}%`)
            
            // If still high utilization, try to free more memory
            if (memoryStats.utilizationPercent > 85) {
              // Get user deployments and unload least recently used
              const allDeployments = await mistralInferenceEngine.getUserDeployments(error.userId)
              const lruDeployment = allDeployments
                .filter(d => d.id !== error.deploymentId)
                .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime())[0]
              
              if (lruDeployment) {
                await mistralInferenceEngine.unloadModel(lruDeployment.id)
                console.log(`Unloaded LRU deployment ${lruDeployment.id} for memory recovery`)
              }
            }
            
            return true
          } catch (recoveryError) {
            console.error(`Memory cleanup failed for deployment ${error.deploymentId}:`, recoveryError)
            return false
          }
        },
        maxRetries: 1,
        backoffMs: 3000
      },
      
      {
        name: 'timeout_retry',
        canRecover: (error) => error.type === 'timeout',
        recover: async (error) => {
          try {
            console.log(`Attempting timeout retry for deployment ${error.deploymentId}`)
            
            // Simple retry with longer timeout - the actual retry logic is handled by the caller
            // This strategy just validates that a retry is appropriate
            
            const timeouts = this.getErrorHistory(error.deploymentId)
              .filter(e => e.type === 'timeout')
              .filter(e => Date.now() - e.timestamp.getTime() < 300000) // Last 5 minutes
            
            // If too many timeouts recently, don't retry
            if (timeouts.length > 3) {
              console.warn(`Too many timeouts for deployment ${error.deploymentId}, not retrying`)
              return false
            }
            
            return true
          } catch (recoveryError) {
            console.error(`Timeout retry validation failed for deployment ${error.deploymentId}:`, recoveryError)
            return false
          }
        },
        maxRetries: 3,
        backoffMs: 2000
      },
      
      {
        name: 'gpu_reset',
        canRecover: (error) => error.type === 'gpu_error',
        recover: async (error) => {
          try {
            console.log(`Attempting GPU reset for deployment ${error.deploymentId}`)
            
            const { mistralInferenceEngine } = await import('./mistral-inference-engine')
            
            // Unload all models to reset GPU state
            const userDeployments = await mistralInferenceEngine.getUserDeployments(error.userId)
            for (const deployment of userDeployments) {
              if (deployment.status === 'ready' || deployment.status === 'error') {
                await mistralInferenceEngine.unloadModel(deployment.id)
              }
            }
            
            // Wait for GPU cleanup
            await new Promise(resolve => setTimeout(resolve, 5000))
            
            // Force garbage collection and memory cleanup
            const { rtx5090MemoryManager } = await import('./rtx5090-memory-manager')
            rtx5090MemoryManager.reset()
            
            console.log(`GPU reset completed for deployment ${error.deploymentId}`)
            return true
          } catch (recoveryError) {
            console.error(`GPU reset failed for deployment ${error.deploymentId}:`, recoveryError)
            return false
          }
        },
        maxRetries: 1,
        backoffMs: 10000
      }
    ]
  }

  /**
   * Handle an inference error
   */
  async handleError(error: InferenceError): Promise<boolean> {
    // Record error in history
    this.recordError(error)
    
    console.error(`Inference error [${error.type}] for deployment ${error.deploymentId}:`, error.message)
    
    // If not recoverable, return false immediately
    if (!error.recoverable) {
      console.warn(`Error for deployment ${error.deploymentId} is not recoverable`)
      return false
    }
    
    // Find appropriate recovery strategy
    const strategy = this.recoveryStrategies.find(s => s.canRecover(error))
    if (!strategy) {
      console.warn(`No recovery strategy found for error type ${error.type}`)
      return false
    }
    
    // Check if we've exceeded max retries for this strategy
    const recentErrors = this.getErrorHistory(error.deploymentId)
      .filter(e => e.type === error.type)
      .filter(e => Date.now() - e.timestamp.getTime() < 600000) // Last 10 minutes
    
    if (recentErrors.length > strategy.maxRetries) {
      console.warn(`Max retries exceeded for strategy ${strategy.name} on deployment ${error.deploymentId}`)
      return false
    }
    
    // Apply backoff delay
    if (recentErrors.length > 0) {
      const backoffDelay = strategy.backoffMs * Math.pow(2, recentErrors.length - 1)
      console.log(`Applying backoff delay: ${backoffDelay}ms`)
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
    }
    
    // Attempt recovery
    try {
      const recovered = await strategy.recover(error)
      if (recovered) {
        console.log(`Recovery successful using strategy ${strategy.name} for deployment ${error.deploymentId}`)
        return true
      } else {
        console.warn(`Recovery failed using strategy ${strategy.name} for deployment ${error.deploymentId}`)
        return false
      }
    } catch (recoveryError) {
      console.error(`Recovery strategy ${strategy.name} threw error for deployment ${error.deploymentId}:`, recoveryError)
      return false
    }
  }

  /**
   * Create error from exception
   */
  createError(
    deploymentId: string,
    userId: string,
    exception: any,
    retryCount: number = 0,
    context?: any
  ): InferenceError {
    const message = exception instanceof Error ? exception.message : String(exception)
    
    // Categorize error type based on message content
    let type: InferenceError['type'] = 'model_failure'
    let recoverable = true
    
    if (message.includes('timeout') || message.includes('Timeout')) {
      type = 'timeout'
      recoverable = retryCount < 3
    } else if (message.includes('CUDA') || message.includes('GPU') || message.includes('VRAM')) {
      type = 'gpu_error'
      recoverable = retryCount < 2
    } else if (message.includes('memory') || message.includes('Memory') || message.includes('OOM')) {
      type = 'memory_error'
      recoverable = retryCount < 2
    } else if (message.includes('process') || message.includes('killed') || message.includes('spawn')) {
      type = 'process_error'
      recoverable = retryCount < 2
    } else if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      type = 'network_error'
      recoverable = retryCount < 3
    }
    
    return {
      type,
      deploymentId,
      userId,
      message,
      timestamp: new Date(),
      recoverable,
      retryCount,
      context
    }
  }

  /**
   * Record error in history
   */
  private recordError(error: InferenceError) {
    if (!this.errorHistory.has(error.deploymentId)) {
      this.errorHistory.set(error.deploymentId, [])
    }
    
    const history = this.errorHistory.get(error.deploymentId)!
    history.push(error)
    
    // Limit history size
    if (history.length > this.maxErrorHistory) {
      history.splice(0, history.length - this.maxErrorHistory)
    }
  }

  /**
   * Get error history for deployment
   */
  getErrorHistory(deploymentId: string): InferenceError[] {
    return this.errorHistory.get(deploymentId) || []
  }

  /**
   * Get error statistics
   */
  getErrorStats(deploymentId?: string) {
    const allErrors = deploymentId 
      ? this.getErrorHistory(deploymentId)
      : Array.from(this.errorHistory.values()).flat()
    
    const now = Date.now()
    const recent = allErrors.filter(e => now - e.timestamp.getTime() < 3600000) // Last hour
    
    const byType = allErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalErrors: allErrors.length,
      recentErrors: recent.length,
      errorsByType: byType,
      recoverableErrors: allErrors.filter(e => e.recoverable).length,
      averageRetryCount: allErrors.length > 0 
        ? allErrors.reduce((sum, e) => sum + e.retryCount, 0) / allErrors.length 
        : 0
    }
  }

  /**
   * Clear error history for deployment
   */
  clearErrorHistory(deploymentId: string) {
    this.errorHistory.delete(deploymentId)
  }

  /**
   * Check if deployment is healthy based on error history
   */
  isDeploymentHealthy(deploymentId: string): boolean {
    const history = this.getErrorHistory(deploymentId)
    const recentErrors = history.filter(e => Date.now() - e.timestamp.getTime() < 300000) // Last 5 minutes
    
    // Consider unhealthy if more than 3 errors in 5 minutes
    if (recentErrors.length > 3) return false
    
    // Consider unhealthy if consecutive critical errors
    const lastThreeErrors = history.slice(-3)
    if (lastThreeErrors.length === 3 && 
        lastThreeErrors.every(e => e.type === 'gpu_error' || e.type === 'memory_error')) {
      return false
    }
    
    return true
  }
}

// Export singleton instance
export const inferenceErrorHandler = new InferenceErrorHandler()