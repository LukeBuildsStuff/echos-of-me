import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Test database connectivity and performance
    const dbHealthStart = Date.now()
    await query('SELECT 1 as health_check')
    const dbResponseTime = Date.now() - dbHealthStart

    // Get database statistics
    const dbStats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM responses) as total_responses,
        (SELECT COUNT(*) FROM training_jobs) as total_training_jobs,
        (SELECT pg_database_size(current_database())) as db_size_bytes
    `)

    // Get recent error counts
    const errorStats = await query(`
      SELECT 
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as errors_last_hour,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as errors_last_day,
        COUNT(CASE WHEN severity = 'critical' AND created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as critical_errors_day
      FROM error_logs
    `)

    // Check training system health
    const trainingHealth = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'running' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN status = 'failed' AND created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_failures,
        AVG(CASE WHEN status = 'completed' AND updated_at >= NOW() - INTERVAL '1 day' 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))/60 END) as avg_completion_time_minutes
      FROM training_jobs
    `)

    // System performance metrics (simulated - replace with real monitoring)
    const systemPerformance = {
      cpu_usage: Math.floor(Math.random() * 30) + 15, // 15-45%
      memory_usage: Math.floor(Math.random() * 40) + 25, // 25-65%
      disk_usage: Math.floor(Math.random() * 20) + 10, // 10-30%
      active_connections: Math.floor(Math.random() * 50) + 20, // 20-70
      response_time_p95: Math.floor(Math.random() * 100) + 50, // 50-150ms
      uptime_seconds: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400 * 7) // Last 7 days
    }

    // Calculate health scores
    const dbHealth = {
      status: dbResponseTime < 100 ? 'healthy' : dbResponseTime < 500 ? 'warning' : 'critical',
      response_time_ms: dbResponseTime,
      size_mb: Math.round((dbStats.rows[0]?.db_size_bytes || 0) / 1024 / 1024),
      total_records: parseInt(dbStats.rows[0]?.total_users || 0) + 
                    parseInt(dbStats.rows[0]?.total_responses || 0) + 
                    parseInt(dbStats.rows[0]?.total_training_jobs || 0)
    }

    const errorHealth = {
      status: (errorStats.rows[0]?.critical_errors_day || 0) > 0 ? 'critical' :
              (errorStats.rows[0]?.errors_last_hour || 0) > 10 ? 'warning' : 'healthy',
      errors_last_hour: parseInt(errorStats.rows[0]?.errors_last_hour || 0),
      errors_last_day: parseInt(errorStats.rows[0]?.errors_last_day || 0),
      critical_errors_day: parseInt(errorStats.rows[0]?.critical_errors_day || 0)
    }

    const trainingSystemHealth = {
      status: (trainingHealth.rows[0]?.recent_failures || 0) > 3 ? 'critical' :
              (trainingHealth.rows[0]?.active_jobs || 0) > 10 ? 'warning' : 'healthy',
      active_jobs: parseInt(trainingHealth.rows[0]?.active_jobs || 0),
      recent_failures: parseInt(trainingHealth.rows[0]?.recent_failures || 0),
      avg_completion_time_minutes: parseFloat(trainingHealth.rows[0]?.avg_completion_time_minutes) || null
    }

    // Overall system health
    const healthStatuses = [dbHealth.status, errorHealth.status, trainingSystemHealth.status]
    const overallHealth = healthStatuses.includes('critical') ? 'critical' :
                         healthStatuses.includes('warning') ? 'warning' : 'healthy'

    // Service availability checks (simulated)
    const services = [
      {
        name: 'API Gateway',
        status: 'healthy',
        response_time_ms: Math.floor(Math.random() * 50) + 10,
        uptime_percentage: 99.9
      },
      {
        name: 'Authentication Service',
        status: 'healthy',
        response_time_ms: Math.floor(Math.random() * 30) + 20,
        uptime_percentage: 99.8
      },
      {
        name: 'Training Engine',
        status: trainingSystemHealth.status,
        response_time_ms: Math.floor(Math.random() * 200) + 100,
        uptime_percentage: trainingSystemHealth.status === 'healthy' ? 99.5 : 
                          trainingSystemHealth.status === 'warning' ? 98.5 : 95.0
      },
      {
        name: 'Voice Processing',
        status: Math.random() > 0.1 ? 'healthy' : 'warning',
        response_time_ms: Math.floor(Math.random() * 500) + 200,
        uptime_percentage: 99.2
      },
      {
        name: 'File Storage',
        status: 'healthy',
        response_time_ms: Math.floor(Math.random() * 100) + 50,
        uptime_percentage: 99.9
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        overall_health: {
          status: overallHealth,
          last_checked: new Date().toISOString(),
          uptime_percentage: Math.min(99.9, 100 - (errorHealth.errors_last_day * 0.1))
        },
        database: dbHealth,
        errors: errorHealth,
        training_system: trainingSystemHealth,
        system_performance: {
          ...systemPerformance,
          uptime_days: Math.floor(systemPerformance.uptime_seconds / 86400),
          status: systemPerformance.cpu_usage > 80 || systemPerformance.memory_usage > 90 ? 'warning' : 'healthy'
        },
        services,
        alerts: [
          ...(errorHealth.critical_errors_day > 0 ? [{
            id: 'critical_errors',
            type: 'critical',
            message: `${errorHealth.critical_errors_day} critical error(s) in the last 24 hours`,
            timestamp: new Date().toISOString()
          }] : []),
          ...(trainingSystemHealth.recent_failures > 2 ? [{
            id: 'training_failures',
            type: 'warning',
            message: `${trainingSystemHealth.recent_failures} training job failures in the last hour`,
            timestamp: new Date().toISOString()
          }] : []),
          ...(systemPerformance.memory_usage > 85 ? [{
            id: 'high_memory',
            type: 'warning',
            message: `High memory usage: ${systemPerformance.memory_usage}%`,
            timestamp: new Date().toISOString()
          }] : [])
        ],
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform health check',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: {
          overall_health: {
            status: 'critical',
            last_checked: new Date().toISOString(),
            uptime_percentage: 0
          },
          database: { status: 'critical', response_time_ms: null },
          errors: { status: 'unknown' },
          training_system: { status: 'unknown' },
          system_performance: { status: 'unknown' },
          services: [],
          alerts: [{
            id: 'system_error',
            type: 'critical',
            message: 'Health check system is experiencing issues',
            timestamp: new Date().toISOString()
          }]
        }
      },
      { status: 500 }
    )
  }
})