import { NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: 'up' | 'down' | 'degraded'
    redis: 'up' | 'down' | 'degraded'
    filesystem: 'up' | 'down' | 'degraded'
    external_apis: 'up' | 'down' | 'degraded'
  }
  performance: {
    response_time_ms: number
    memory_usage_mb: number
    cpu_usage_percent: number
  }
}

// Simple health check endpoint
export async function GET() {
  const startTime = Date.now()
  
  try {
    // Simulate health checks
    const checks = await performHealthChecks()
    const responseTime = Date.now() - startTime
    
    const health: HealthStatus = {
      status: determineOverallStatus(checks),
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      checks,
      performance: {
        response_time_ms: responseTime,
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpu_usage_percent: Math.random() * 100 // Mock CPU usage
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      response_time_ms: Date.now() - startTime
    }, { status: 503 })
  }
}

// Simple HEAD endpoint for connectivity checks
export async function HEAD() {
  try {
    // Quick connectivity check - no body response
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}

async function performHealthChecks(): Promise<HealthStatus['checks']> {
  // Simulate various service checks
  let database: 'up' | 'down' | 'degraded' = 'up'
  let redis: 'up' | 'down' | 'degraded' = 'up'
  let filesystem: 'up' | 'down' | 'degraded' = 'up'
  let external_apis: 'up' | 'down' | 'degraded' = 'up'

  // Simulate some occasional failures for demo purposes
  if (Math.random() < 0.1) {
    database = 'degraded'
  }
  
  if (Math.random() < 0.05) {
    external_apis = 'down'
  }

  // Add realistic delays
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100))

  return {
    database,
    redis,
    filesystem,
    external_apis
  }
}

function determineOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
  const values = Object.values(checks)
  
  if (values.some(status => status === 'down')) {
    return 'unhealthy'
  }
  
  if (values.some(status => status === 'degraded')) {
    return 'degraded'
  }
  
  return 'healthy'
}