import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import adminMonitoring from '@/lib/admin-monitoring'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin monitoring and alerting endpoint
 * Provides system health metrics, alerts, and performance monitoring
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const metricKey = searchParams.get('metric')
    const minutes = parseInt(searchParams.get('minutes') || '60')

    switch (action) {
      case 'health':
        const healthStatus = adminMonitoring.getHealthStatus()
        return NextResponse.json({
          health: healthStatus,
          timestamp: new Date().toISOString()
        })

      case 'alerts':
        const activeAlerts = adminMonitoring.getActiveAlerts()
        return NextResponse.json({
          alerts: activeAlerts,
          summary: {
            total: activeAlerts.length,
            critical: activeAlerts.filter(a => a.type === 'critical').length,
            warning: activeAlerts.filter(a => a.type === 'warning').length,
            info: activeAlerts.filter(a => a.type === 'info').length
          },
          timestamp: new Date().toISOString()
        })

      case 'metrics':
        if (metricKey) {
          const history = adminMonitoring.getMetricHistory(metricKey, minutes)
          return NextResponse.json({
            metric: metricKey,
            history,
            summary: {
              points: history.length,
              latest: history[history.length - 1] || null,
              average: history.length > 0 
                ? history.reduce((sum, p) => sum + p.value, 0) / history.length 
                : 0,
              min: history.length > 0 ? Math.min(...history.map(p => p.value)) : 0,
              max: history.length > 0 ? Math.max(...history.map(p => p.value)) : 0
            },
            timestamp: new Date().toISOString()
          })
        } else {
          const allMetrics = adminMonitoring.getMetrics()
          return NextResponse.json({
            metrics: allMetrics,
            timestamp: new Date().toISOString()
          })
        }

      case 'dashboard':
        // Comprehensive dashboard data
        const metrics = adminMonitoring.getMetrics()
        const health = adminMonitoring.getHealthStatus()
        const alerts = adminMonitoring.getActiveAlerts()

        // Calculate performance scores
        const performanceScores = {
          database: calculateDatabaseScore(metrics.database),
          cache: calculateCacheScore(metrics.cache),
          realtime: calculateRealtimeScore(metrics.realtime),
          overall: health.score
        }

        // Get trending data
        const trends = {
          responseTime: adminMonitoring.getMetricHistory('db_response_time', 60),
          cacheHitRate: adminMonitoring.getMetricHistory('cache_hit_rate', 60),
          errorRate: adminMonitoring.getMetricHistory('error_rate', 60)
        }

        return NextResponse.json({
          overview: {
            status: health.status,
            score: health.score,
            uptime: metrics.system?.uptime || 0,
            activeAlerts: alerts.length,
            criticalAlerts: alerts.filter(a => a.type === 'critical').length
          },
          performanceScores,
          systemMetrics: {
            database: metrics.database,
            cache: metrics.cache,
            realtime: metrics.realtime,
            system: metrics.system
          },
          alerts: alerts.slice(0, 10), // Latest 10 alerts
          trends,
          recommendations: health.recommendations,
          timestamp: new Date().toISOString()
        })

      default:
        // Default: return current metrics and health
        const currentMetrics = adminMonitoring.getMetrics()
        const currentHealth = adminMonitoring.getHealthStatus()
        
        return NextResponse.json({
          health: currentHealth,
          metrics: currentMetrics,
          timestamp: new Date().toISOString()
        })
    }

  } catch (error) {
    console.error('Monitoring endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to retrieve monitoring data',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

/**
 * Monitoring management operations
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, alertId, metric, value, metadata } = body

    switch (action) {
      case 'resolve_alert':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          )
        }

        const resolved = adminMonitoring.resolveAlert(alertId)
        if (resolved) {
          return NextResponse.json({
            message: `Alert ${alertId} resolved successfully`,
            timestamp: new Date().toISOString()
          })
        } else {
          return NextResponse.json(
            { error: 'Alert not found or already resolved' },
            { status: 404 }
          )
        }

      case 'create_alert':
        const { type, category, title, message, source } = body
        if (!type || !category || !title || !message || !source) {
          return NextResponse.json(
            { error: 'type, category, title, message, and source are required' },
            { status: 400 }
          )
        }

        const newAlertId = adminMonitoring.createAlert(type, category, title, message, source)
        return NextResponse.json({
          message: 'Alert created successfully',
          alertId: newAlertId,
          timestamp: new Date().toISOString()
        })

      case 'add_metric':
        if (!metric || value === undefined) {
          return NextResponse.json(
            { error: 'metric and value are required' },
            { status: 400 }
          )
        }

        adminMonitoring.addMetric(metric, value, metadata)
        return NextResponse.json({
          message: `Metric ${metric} added successfully`,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: resolve_alert, create_alert, add_metric' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Monitoring management error:', error)
    return NextResponse.json(
      { 
        error: 'Monitoring operation failed',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

// Helper functions for performance scoring

function calculateDatabaseScore(dbMetrics: any): number {
  if (!dbMetrics) return 0
  
  let score = 100
  
  if (!dbMetrics.health) score -= 50
  if (dbMetrics.queryMetrics.avgDuration > 1000) score -= 20
  if (dbMetrics.queryMetrics.avgDuration > 5000) score -= 30
  if (dbMetrics.queryMetrics.errors > 0) score -= 10
  
  const poolUtilization = dbMetrics.connectionPool.total > 0
    ? ((dbMetrics.connectionPool.total - dbMetrics.connectionPool.idle) / dbMetrics.connectionPool.total) * 100
    : 0
  
  if (poolUtilization > 90) score -= 25
  else if (poolUtilization > 80) score -= 10
  
  return Math.max(0, score)
}

function calculateCacheScore(cacheMetrics: any): number {
  if (!cacheMetrics) return 0
  
  let score = 100
  
  if (!cacheMetrics.redisConnected) score -= 20
  if (cacheMetrics.hitRate < 40) score -= 40
  else if (cacheMetrics.hitRate < 60) score -= 20
  else if (cacheMetrics.hitRate < 80) score -= 10
  
  return Math.max(0, score)
}

function calculateRealtimeScore(realtimeMetrics: any): number {
  if (!realtimeMetrics) return 0
  
  let score = 100
  
  if (realtimeMetrics.connectionHealth < 50) score -= 40
  else if (realtimeMetrics.connectionHealth < 70) score -= 20
  
  if (realtimeMetrics.averageLatency > 2000) score -= 30
  else if (realtimeMetrics.averageLatency > 1000) score -= 15
  
  if (realtimeMetrics.activeConnections === 0) score -= 10
  
  return Math.max(0, score)
}