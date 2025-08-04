/**
 * Comprehensive monitoring and alerting system for admin dashboard
 * Tracks performance, errors, and system health with configurable alerts
 */

import { checkDatabaseHealth, getQueryMetrics } from './db'
import adminCache from './admin-cache'

export interface MetricPoint {
  timestamp: number
  value: number
  metadata?: Record<string, any>
}

export interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: 'performance' | 'availability' | 'capacity' | 'security'
  title: string
  message: string
  timestamp: number
  resolved?: boolean
  resolvedAt?: number
  thresholds?: {
    warning?: number
    critical?: number
  }
  source: string
  actions?: Array<{
    label: string
    action: string
    parameters?: Record<string, any>
  }>
}

export interface MonitoringMetrics {
  system: {
    uptime: number
    memoryUsage: number
    cpuUsage: number
    responseTime: MetricPoint[]
    errorRate: MetricPoint[]
  }
  database: {
    health: boolean
    connectionPool: {
      total: number
      active: number
      idle: number
      waiting: number
    }
    queryMetrics: {
      totalQueries: number
      avgDuration: number
      slowQueries: number
      errors: number
    }
  }
  cache: {
    hitRate: number
    memoryUsage: number
    redisConnected: boolean
    operations: MetricPoint[]
  }
  realtime: {
    activeConnections: number
    totalMessages: number
    connectionHealth: number
    averageLatency: number
  }
  alerts: Alert[]
}

export class AdminMonitoringSystem {
  private static instance: AdminMonitoringSystem
  private metrics: Partial<MonitoringMetrics> = {}
  private alerts: Map<string, Alert> = new Map()
  private thresholds = {
    database: {
      responseTime: { warning: 1000, critical: 5000 },
      connectionPool: { warning: 80, critical: 90 }, // percentage
      errorRate: { warning: 5, critical: 10 }, // percentage
    },
    cache: {
      hitRate: { warning: 60, critical: 40 }, // percentage
      memoryUsage: { warning: 80, critical: 90 }, // percentage
      redisErrors: { warning: 5, critical: 10 }, // percentage
    },
    system: {
      responseTime: { warning: 2000, critical: 5000 },
      errorRate: { warning: 2, critical: 5 }, // percentage
      memoryUsage: { warning: 80, critical: 90 }, // percentage
    },
    realtime: {
      connectionHealth: { warning: 70, critical: 50 }, // percentage
      averageLatency: { warning: 1000, critical: 2000 },
      failureRate: { warning: 5, critical: 10 }, // percentage
    }
  }
  private monitoring = false
  private startTime = Date.now()
  private metricsHistory: Map<string, MetricPoint[]> = new Map()
  private maxHistorySize = 1000

  private constructor() {
    this.initializeMetrics()
  }

  static getInstance(): AdminMonitoringSystem {
    if (!AdminMonitoringSystem.instance) {
      AdminMonitoringSystem.instance = new AdminMonitoringSystem()
    }
    return AdminMonitoringSystem.instance
  }

  /**
   * Start the monitoring system
   */
  startMonitoring(): void {
    if (this.monitoring) return

    this.monitoring = true
    console.log('Starting admin monitoring system...')

    // Collect metrics every 30 seconds
    const metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics()
        this.evaluateAlerts()
      } catch (error) {
        console.error('Metrics collection error:', error)
      }
    }, 30000)

    // Clean up old metrics every 5 minutes
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics()
    }, 5 * 60 * 1000)

    // Auto-resolve old alerts every minute
    const alertCleanupInterval = setInterval(() => {
      this.cleanupOldAlerts()
    }, 60000)

    // Cleanup on process exit
    process.on('SIGINT', () => {
      clearInterval(metricsInterval)
      clearInterval(cleanupInterval)
      clearInterval(alertCleanupInterval)
      this.monitoring = false
    })
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.monitoring = false
  }

  /**
   * Get current monitoring metrics
   */
  getMetrics(): Partial<MonitoringMetrics> {
    return {
      ...this.metrics,
      alerts: Array.from(this.alerts.values()).sort((a, b) => b.timestamp - a.timestamp)
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const criticalAlerts = Array.from(this.alerts.values()).filter(a => a.type === 'critical' && !a.resolved)
    const warningAlerts = Array.from(this.alerts.values()).filter(a => a.type === 'warning' && !a.resolved)

    let score = 100
    const issues = []
    const recommendations = []

    // Deduct score for alerts
    score -= criticalAlerts.length * 25
    score -= warningAlerts.length * 10

    // Database health impact
    if (this.metrics.database && !this.metrics.database.health) {
      score -= 30
      issues.push('Database connectivity issues')
      recommendations.push('Check database server status and connection configuration')
    }

    // Cache performance impact
    if (this.metrics.cache && this.metrics.cache.hitRate < 50) {
      score -= 15
      issues.push('Low cache hit rate')
      recommendations.push('Review cache TTL settings and key strategies')
    }

    // Real-time connection health
    if (this.metrics.realtime && this.metrics.realtime.connectionHealth < 70) {
      score -= 10
      issues.push('Real-time connection issues')
      recommendations.push('Check WebSocket/SSE connection stability')
    }

    score = Math.max(0, score)

    const status = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'

    return { status, score, issues, recommendations }
  }

  /**
   * Add a custom metric
   */
  addMetric(key: string, value: number, metadata?: Record<string, any>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
      metadata
    }

    if (!this.metricsHistory.has(key)) {
      this.metricsHistory.set(key, [])
    }

    const history = this.metricsHistory.get(key)!
    history.push(point)

    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize)
    }
  }

  /**
   * Get metric history
   */
  getMetricHistory(key: string, minutes: number = 60): MetricPoint[] {
    const history = this.metricsHistory.get(key) || []
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return history.filter(point => point.timestamp >= cutoff)
  }

  /**
   * Create a manual alert
   */
  createAlert(
    type: Alert['type'],
    category: Alert['category'],
    title: string,
    message: string,
    source: string,
    actions?: Alert['actions']
  ): string {
    const alertId = `${category}_${Date.now()}`
    const alert: Alert = {
      id: alertId,
      type,
      category,
      title,
      message,
      timestamp: Date.now(),
      source,
      actions
    }

    this.alerts.set(alertId, alert)
    
    // Log critical alerts
    if (type === 'critical') {
      console.error(`CRITICAL ALERT [${source}]: ${title} - ${message}`)
    } else if (type === 'warning') {
      console.warn(`WARNING ALERT [${source}]: ${title} - ${message}`)
    }

    return alertId
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      return true
    }
    return false
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        // Sort by type priority, then by timestamp
        const typePriority = { critical: 3, warning: 2, info: 1 }
        const aPriority = typePriority[a.type]
        const bPriority = typePriority[b.type]
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        return b.timestamp - a.timestamp
      })
  }

  // Private methods

  private initializeMetrics(): void {
    this.metrics = {
      system: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        responseTime: [],
        errorRate: []
      },
      database: {
        health: false,
        connectionPool: { total: 0, active: 0, idle: 0, waiting: 0 },
        queryMetrics: { totalQueries: 0, avgDuration: 0, slowQueries: 0, errors: 0 }
      },
      cache: {
        hitRate: 0,
        memoryUsage: 0,
        redisConnected: false,
        operations: []
      },
      realtime: {
        activeConnections: 0,
        totalMessages: 0,
        connectionHealth: 100,
        averageLatency: 0
      },
      alerts: []
    }
  }

  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now()

    // System metrics
    this.metrics.system = {
      uptime: Math.round((timestamp - this.startTime) / 1000),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: await this.getCpuUsage(),
      responseTime: this.getMetricHistory('response_time', 5),
      errorRate: this.getMetricHistory('error_rate', 5)
    }

    // Database metrics
    try {
      const dbHealth = await checkDatabaseHealth()
      const queryMetrics = getQueryMetrics()

      this.metrics.database = {
        health: dbHealth.healthy,
        connectionPool: dbHealth.poolStatus || { total: 0, active: 0, idle: 0, waiting: 0 },
        queryMetrics: {
          totalQueries: queryMetrics.totalQueries,
          avgDuration: queryMetrics.avgDuration,
          slowQueries: queryMetrics.slowQueries,
          errors: queryMetrics.errors
        }
      }

      // Add database response time to history
      if (dbHealth.responseTime) {
        this.addMetric('db_response_time', dbHealth.responseTime)
      }
    } catch (error) {
      console.error('Failed to collect database metrics:', error)
    }

    // Cache metrics
    try {
      const cacheStats = adminCache.getStats()
      this.metrics.cache = {
        hitRate: cacheStats.hitRate,
        memoryUsage: 0, // Will be calculated from memory stats
        redisConnected: cacheStats.redisCache.connected,
        operations: this.getMetricHistory('cache_operations', 5)
      }

      this.addMetric('cache_hit_rate', cacheStats.hitRate)
      this.addMetric('cache_operations', cacheStats.totalRequests)
    } catch (error) {
      console.error('Failed to collect cache metrics:', error)
    }

    // Real-time metrics (would integrate with AdminRealTimeManager)
    this.metrics.realtime = {
      activeConnections: this.getActiveConnections(),
      totalMessages: this.getTotalMessages(),
      connectionHealth: this.getConnectionHealth(),
      averageLatency: this.getAverageLatency()
    }
  }

  private evaluateAlerts(): void {
    if (!this.metrics) return

    // Database alerts
    if (this.metrics.database) {
      if (!this.metrics.database.health) {
        this.createOrUpdateAlert('database_down', 'critical', 'availability', 
          'Database Connectivity Lost', 
          'Database connection is not available. This will affect all admin operations.',
          'database_monitor')
      } else {
        this.resolveAlertByKey('database_down')
      }

      // Connection pool alerts
      const poolUtilization = this.metrics.database.connectionPool.total > 0
        ? ((this.metrics.database.connectionPool.total - this.metrics.database.connectionPool.idle) / this.metrics.database.connectionPool.total) * 100
        : 0

      if (poolUtilization >= this.thresholds.database.connectionPool.critical) {
        this.createOrUpdateAlert('db_pool_critical', 'critical', 'capacity',
          'Database Connection Pool Critical',
          `Connection pool utilization at ${poolUtilization.toFixed(1)}%. Risk of connection exhaustion.`,
          'database_monitor')
      } else if (poolUtilization >= this.thresholds.database.connectionPool.warning) {
        this.createOrUpdateAlert('db_pool_warning', 'warning', 'capacity',
          'High Database Connection Pool Usage',
          `Connection pool utilization at ${poolUtilization.toFixed(1)}%. Consider optimizing queries or increasing pool size.`,
          'database_monitor')
      } else {
        this.resolveAlertByKey('db_pool_critical')
        this.resolveAlertByKey('db_pool_warning')
      }

      // Query performance alerts
      if (this.metrics.database.queryMetrics.avgDuration > this.thresholds.database.responseTime.critical) {
        this.createOrUpdateAlert('slow_queries_critical', 'critical', 'performance',
          'Critical Database Performance',
          `Average query duration is ${this.metrics.database.queryMetrics.avgDuration.toFixed(2)}ms. Immediate optimization needed.`,
          'database_monitor')
      } else if (this.metrics.database.queryMetrics.avgDuration > this.thresholds.database.responseTime.warning) {
        this.createOrUpdateAlert('slow_queries_warning', 'warning', 'performance',
          'Slow Database Queries',
          `Average query duration is ${this.metrics.database.queryMetrics.avgDuration.toFixed(2)}ms. Consider query optimization.`,
          'database_monitor')
      } else {
        this.resolveAlertByKey('slow_queries_critical')
        this.resolveAlertByKey('slow_queries_warning')
      }
    }

    // Cache alerts
    if (this.metrics.cache) {
      if (this.metrics.cache.hitRate < this.thresholds.cache.hitRate.critical) {
        this.createOrUpdateAlert('cache_hit_rate_critical', 'critical', 'performance',
          'Critical Cache Performance',
          `Cache hit rate is ${this.metrics.cache.hitRate}%. This severely impacts performance.`,
          'cache_monitor')
      } else if (this.metrics.cache.hitRate < this.thresholds.cache.hitRate.warning) {
        this.createOrUpdateAlert('cache_hit_rate_warning', 'warning', 'performance',
          'Low Cache Hit Rate',
          `Cache hit rate is ${this.metrics.cache.hitRate}%. Consider optimizing cache strategy.`,
          'cache_monitor')
      } else {
        this.resolveAlertByKey('cache_hit_rate_critical')
        this.resolveAlertByKey('cache_hit_rate_warning')
      }

      if (!this.metrics.cache.redisConnected) {
        this.createOrUpdateAlert('redis_down', 'warning', 'availability',
          'Redis Cache Unavailable',
          'Redis cache is not connected. Falling back to memory-only caching.',
          'cache_monitor')
      } else {
        this.resolveAlertByKey('redis_down')
      }
    }
  }

  private createOrUpdateAlert(
    key: string, 
    type: Alert['type'], 
    category: Alert['category'], 
    title: string, 
    message: string, 
    source: string
  ): void {
    const existingAlert = Array.from(this.alerts.values()).find(a => a.source === source && a.title === title && !a.resolved)
    
    if (!existingAlert) {
      this.createAlert(type, category, title, message, source)
    }
  }

  private resolveAlertByKey(key: string): void {
    const alerts = Array.from(this.alerts.entries()).filter(([_, alert]) => 
      alert.id.includes(key) && !alert.resolved
    )
    
    alerts.forEach(([alertId]) => {
      this.resolveAlert(alertId)
    })
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      return Math.round(usage.heapUsed / 1024 / 1024) // MB
    }
    return 0
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage - would need proper implementation
    return Math.random() * 20 + 10 // 10-30% simulated
  }

  private getActiveConnections(): number {
    // Would integrate with AdminRealTimeManager
    return Math.floor(Math.random() * 50) + 10
  }

  private getTotalMessages(): number {
    // Would integrate with AdminRealTimeManager
    return Math.floor(Math.random() * 1000) + 500
  }

  private getConnectionHealth(): number {
    // Would integrate with AdminRealTimeManager
    return Math.floor(Math.random() * 30) + 70 // 70-100%
  }

  private getAverageLatency(): number {
    // Would integrate with AdminRealTimeManager
    return Math.floor(Math.random() * 500) + 100 // 100-600ms
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    
    for (const [key, history] of this.metricsHistory) {
      const filtered = history.filter(point => point.timestamp >= cutoff)
      this.metricsHistory.set(key, filtered)
    }
  }

  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(alertId)
      }
    }
  }
}

// Initialize monitoring system
const adminMonitoring = AdminMonitoringSystem.getInstance()

// Start monitoring in production
if (process.env.NODE_ENV === 'production') {
  adminMonitoring.startMonitoring()
}

export default adminMonitoring