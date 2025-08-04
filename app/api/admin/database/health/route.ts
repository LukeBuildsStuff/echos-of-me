import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { checkDatabaseHealth, getQueryMetrics, resetQueryMetrics } from '@/lib/db'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Database health monitoring endpoint for admin dashboard
 * Provides real-time database performance metrics and connection pool status
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeMetrics = searchParams.get('metrics') !== 'false'
    const resetMetrics = searchParams.get('reset') === 'true'
    
    // Reset metrics if requested (useful for testing)
    if (resetMetrics && process.env.NODE_ENV === 'development') {
      resetQueryMetrics()
    }

    // Get comprehensive database health check
    const healthCheck = await checkDatabaseHealth()
    
    // Get current query performance metrics
    const queryMetrics = includeMetrics ? getQueryMetrics() : null

    // Calculate health score based on various factors
    let healthScore = 100
    
    if (healthCheck.status !== 'healthy') {
      healthScore = 0
    } else {
      // Deduct points for performance issues
      if (healthCheck.latency && healthCheck.latency > 1000) healthScore -= 20
      if (healthCheck.pool && healthCheck.pool.waitingCount > 5) healthScore -= 15
      if (queryMetrics && queryMetrics.avgDuration > 500) healthScore -= 15
      if (queryMetrics && queryMetrics.errors > 0) healthScore -= 10
      if (queryMetrics && queryMetrics.slowQueries > queryMetrics.totalQueries * 0.1) healthScore -= 20
    }

    const response = {
      status: healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
      healthScore: Math.max(0, healthScore),
      database: {
        connected: healthCheck.status === 'healthy',
        responseTime: healthCheck.latency,
        timestamp: new Date().toISOString(),
        error: healthCheck.error
      },
      connectionPool: healthCheck.status === 'healthy' && healthCheck.pool ? {
        totalConnections: healthCheck.pool.totalCount,
        idleConnections: healthCheck.pool.idleCount,
        waitingClients: healthCheck.pool.waitingCount,
        utilizationPercentage: Math.round((healthCheck.pool.totalCount - healthCheck.pool.idleCount) / healthCheck.pool.totalCount * 100)
      } : null,
      queryPerformance: queryMetrics ? {
        totalQueries: queryMetrics.totalQueries,
        averageDuration: queryMetrics.totalQueries > 0 ? queryMetrics.totalTime / queryMetrics.totalQueries : 0,
        slowQueries: queryMetrics.slowQueries,
        errors: queryMetrics.errors,
        slowQueryPercentage: queryMetrics.totalQueries > 0 ? Math.round((queryMetrics.slowQueries / queryMetrics.totalQueries) * 100) : 0,
        errorRate: queryMetrics.totalQueries > 0 ? Math.round((queryMetrics.errors / queryMetrics.totalQueries) * 100) : 0
      } : null,
      recommendations: [] as Array<{
        type: string
        priority: string
        message: string
      }>
    }

    // Add performance recommendations
    if (healthCheck.status === 'healthy') {
      const recommendations = []
      
      if (healthCheck.latency && healthCheck.latency > 1000) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          message: `Database response time is ${healthCheck.latency}ms. Consider optimizing queries or checking network latency.`
        })
      }
      
      if (healthCheck.pool && healthCheck.pool.waitingCount > 5) {
        recommendations.push({
          type: 'capacity',
          priority: 'high',
          message: `${healthCheck.pool.waitingCount} clients waiting for connections. Consider increasing pool size.`
        })
      }
      
      if (queryMetrics && queryMetrics.avgDuration > 500) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: `Average query duration is ${queryMetrics.avgDuration.toFixed(2)}ms. Review slow queries and add indexes.`
        })
      }
      
      if (queryMetrics && queryMetrics.slowQueries > 0) {
        recommendations.push({
          type: 'optimization',
          priority: 'medium',
          message: `${queryMetrics.slowQueries} slow queries detected. Review query plans and add proper indexes.`
        })
      }
      
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'status',
          priority: 'info',
          message: 'Database performance is optimal.'
        })
      }
      
      response.recommendations = recommendations
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Database-Health-Check': 'v1.0'
      }
    })

  } catch (error) {
    console.error('Database health check error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        healthScore: 0,
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        error: 'Failed to check database health',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

/**
 * Reset query metrics (admin only, development only)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    resetQueryMetrics()
    
    return NextResponse.json({
      message: 'Query metrics reset successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error resetting query metrics:', error)
    return NextResponse.json(
      { error: 'Failed to reset query metrics' },
      { status: 500 }
    )
  }
})