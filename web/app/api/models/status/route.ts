import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { mistralInferenceEngine } from '@/lib/mistral-inference-engine'
import { rtx5090MemoryManager } from '@/lib/rtx5090-memory-manager'
import { inferenceErrorHandler } from '@/lib/inference-error-handler'
import { query } from '@/lib/db'

/**
 * Comprehensive System Status API
 * 
 * Provides detailed status of Mistral inference system, memory management,
 * error handling, and overall system health
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    // Get engine statistics
    const engineStats = mistralInferenceEngine.getEngineStats()
    
    // Get user's deployments
    const userDeployments = await mistralInferenceEngine.getUserDeployments(userId)
    
    // Get memory statistics
    const memoryStats = rtx5090MemoryManager.getMemoryStats()
    const memoryAllocations = rtx5090MemoryManager.getAllocations()
    const fragmentationInfo = rtx5090MemoryManager.getFragmentationInfo()
    
    // Get error statistics for user's deployments
    const errorStats = userDeployments.map(deployment => ({
      deploymentId: deployment.id,
      ...inferenceErrorHandler.getErrorStats(deployment.id),
      isHealthy: inferenceErrorHandler.isDeploymentHealthy(deployment.id)
    }))
    
    // Check system health indicators
    const systemHealth = {
      database: await checkDatabaseHealth(),
      gpu: await checkGPUHealth(),
      memory: checkMemoryHealth(memoryStats),
      deployments: checkDeploymentHealth(userDeployments),
      errors: checkErrorHealth(errorStats)
    }
    
    // Calculate overall system status
    const overallStatus = calculateOverallStatus(systemHealth)

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      
      // System Components
      inference: {
        loadedModels: engineStats.loadedModels,
        maxLoadedModels: engineStats.maxLoadedModels,
        activeInferences: engineStats.activeInferences,
        conversationContexts: engineStats.conversationContexts,
        modelsInQueue: engineStats.modelsInQueue
      },
      
      memory: {
        stats: memoryStats,
        allocations: memoryAllocations.length,
        fragmentation: {
          totalFragments: fragmentationInfo.totalFragments,
          freeFragments: fragmentationInfo.freeFragments,
          fragmentationRatio: memoryStats.fragmentationRatio
        }
      },
      
      deployments: userDeployments.map(d => ({
        id: d.id,
        modelVersion: d.modelVersion,
        status: d.status,
        loadedAt: d.loadedAt,
        memoryUsage: d.memoryUsage,
        inferenceCount: d.inferenceCount,
        lastUsed: d.lastUsed,
        isHealthy: inferenceErrorHandler.isDeploymentHealthy(d.id)
      })),
      
      errors: {
        byDeployment: errorStats,
        systemWide: inferenceErrorHandler.getErrorStats()
      },
      
      health: systemHealth,
      
      recommendations: generateRecommendations(systemHealth, memoryStats, errorStats)
    })

  } catch (error) {
    console.error('System status API error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function checkDatabaseHealth() {
  try {
    await query('SELECT 1')
    return { healthy: true, status: 'connected' }
  } catch (error) {
    return { 
      healthy: false, 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function checkGPUHealth() {
  // In a real implementation, this would check actual GPU status
  // For now, simulate based on memory usage and system load
  try {
    const memoryStats = rtx5090MemoryManager.getMemoryStats()
    const utilizationNormal = memoryStats.utilizationPercent < 95
    
    return {
      healthy: utilizationNormal,
      status: utilizationNormal ? 'operational' : 'high_utilization',
      utilizationPercent: memoryStats.utilizationPercent,
      totalVRAM: memoryStats.totalVRAM,
      availableVRAM: memoryStats.availableVRAM
    }
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function checkMemoryHealth(memoryStats: any) {
  const utilizationHealthy = memoryStats.utilizationPercent < 90
  const fragmentationHealthy = memoryStats.fragmentationRatio < 0.4
  const cacheHealthy = memoryStats.cacheHitRatio > 0.7
  
  const healthy = utilizationHealthy && fragmentationHealthy && cacheHealthy
  
  return {
    healthy,
    status: healthy ? 'optimal' : 'needs_attention',
    issues: [
      !utilizationHealthy && 'High memory utilization',
      !fragmentationHealthy && 'High memory fragmentation',
      !cacheHealthy && 'Low cache hit ratio'
    ].filter(Boolean)
  }
}

function checkDeploymentHealth(deployments: any[]) {
  const totalDeployments = deployments.length
  const readyDeployments = deployments.filter(d => d.status === 'ready').length
  const errorDeployments = deployments.filter(d => d.status === 'error').length
  
  const healthRatio = totalDeployments > 0 ? readyDeployments / totalDeployments : 1
  const healthy = healthRatio >= 0.8 && errorDeployments === 0
  
  return {
    healthy,
    status: healthy ? 'operational' : 'degraded',
    readyDeployments,
    totalDeployments,
    errorDeployments,
    healthRatio: Math.round(healthRatio * 100)
  }
}

function checkErrorHealth(errorStats: any[]) {
  const deploymentsWithErrors = errorStats.filter(s => s.recentErrors > 0).length
  const totalDeployments = errorStats.length
  const unhealthyDeployments = errorStats.filter(s => !s.isHealthy).length
  
  const healthy = deploymentsWithErrors === 0 && unhealthyDeployments === 0
  
  return {
    healthy,
    status: healthy ? 'stable' : 'issues_detected',
    deploymentsWithErrors,
    unhealthyDeployments,
    totalDeployments
  }
}

function calculateOverallStatus(health: any) {
  const components = [health.database, health.gpu, health.memory, health.deployments, health.errors]
  const healthyComponents = components.filter(c => c.healthy).length
  const totalComponents = components.length
  
  if (healthyComponents === totalComponents) {
    return 'healthy'
  } else if (healthyComponents >= totalComponents * 0.8) {
    return 'degraded'
  } else {
    return 'critical'
  }
}

function generateRecommendations(health: any, memoryStats: any, errorStats: any[]) {
  const recommendations = []
  
  // Memory recommendations
  if (memoryStats.utilizationPercent > 85) {
    recommendations.push({
      type: 'memory',
      priority: 'high',
      message: 'High memory utilization detected. Consider unloading unused models.',
      action: 'optimize_memory'
    })
  }
  
  if (memoryStats.fragmentationRatio > 0.4) {
    recommendations.push({
      type: 'memory',
      priority: 'medium',
      message: 'High memory fragmentation detected. Memory defragmentation recommended.',
      action: 'defragment_memory'
    })
  }
  
  // Error recommendations
  const deploymentsWithManyErrors = errorStats.filter(s => s.recentErrors > 3)
  if (deploymentsWithManyErrors.length > 0) {
    recommendations.push({
      type: 'error',
      priority: 'high',
      message: `${deploymentsWithManyErrors.length} deployment(s) experiencing frequent errors. Investigation recommended.`,
      action: 'investigate_errors'
    })
  }
  
  // Deployment recommendations
  if (!health.deployments.healthy) {
    recommendations.push({
      type: 'deployment',
      priority: 'medium',
      message: 'Some deployments are not operational. Check individual deployment status.',
      action: 'check_deployments'
    })
  }
  
  // Performance recommendations
  if (memoryStats.cacheHitRatio < 0.7) {
    recommendations.push({
      type: 'performance',
      priority: 'low',
      message: 'Low cache hit ratio detected. Consider adjusting access patterns.',
      action: 'optimize_cache'
    })
  }
  
  return recommendations
}