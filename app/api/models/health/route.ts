import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { mistralInferenceEngine } from '@/lib/mistral-inference-engine'
import { query } from '@/lib/db'

/**
 * Model Health Check API
 * 
 * Provides health status of deployed models and inference engine
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
    
    // Get user's deployments with health info
    const deployments = await mistralInferenceEngine.getUserDeployments(userId)
    
    // Check database connectivity
    let dbHealthy = false
    try {
      await query('SELECT 1')
      dbHealthy = true
    } catch (error) {
      console.error('Database health check failed:', error)
    }

    // Calculate overall health status
    const healthyDeployments = deployments.filter(d => d.status === 'ready').length
    const totalDeployments = deployments.length
    const deploymentHealthRatio = totalDeployments > 0 ? healthyDeployments / totalDeployments : 1

    const overallHealth = dbHealthy && deploymentHealthRatio >= 0.5 ? 'healthy' : 'degraded'

    return NextResponse.json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealthy,
        status: dbHealthy ? 'connected' : 'error'
      },
      inferenceEngine: {
        healthy: engineStats.loadedModels > 0,
        loadedModels: engineStats.loadedModels,
        maxModels: engineStats.maxLoadedModels,
        totalMemoryUsage: engineStats.totalMemoryUsage,
        activeInferences: engineStats.activeInferences,
        conversationContexts: engineStats.conversationContexts
      },
      userDeployments: {
        total: totalDeployments,
        ready: healthyDeployments,
        loading: deployments.filter(d => d.status === 'loading').length,
        error: deployments.filter(d => d.status === 'error').length,
        healthRatio: Math.round(deploymentHealthRatio * 100)
      },
      systemResources: {
        rtx5090Available: true, // Would check actual GPU status
        vramUsageEstimate: `${engineStats.totalMemoryUsage}GB / 32GB`,
        memoryEfficiency: Math.round((engineStats.totalMemoryUsage / 32) * 100)
      }
    })

  } catch (error) {
    console.error('Health check API error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}