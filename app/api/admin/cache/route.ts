import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import adminCache from '@/lib/admin-cache'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cache management and monitoring endpoint for admin dashboard
 * Provides cache statistics, management operations, and health monitoring
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        return NextResponse.json({
          stats: adminCache.getStats(),
          timestamp: new Date().toISOString()
        })

      case 'health':
        const stats = adminCache.getStats()
        const healthScore = calculateCacheHealthScore(stats)
        
        return NextResponse.json({
          health: {
            score: healthScore,
            status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
            memoryCache: {
              status: stats.memoryCache.size > 0 ? 'active' : 'inactive',
              hitRate: stats.memoryCache.hits + stats.memoryCache.misses > 0 
                ? Math.round((stats.memoryCache.hits / (stats.memoryCache.hits + stats.memoryCache.misses)) * 100)
                : 0
            },
            redisCache: {
              status: stats.redisCache.connected ? 'connected' : 'disconnected',
              hitRate: stats.redisCache.hits + stats.redisCache.misses > 0
                ? Math.round((stats.redisCache.hits / (stats.redisCache.hits + stats.redisCache.misses)) * 100)
                : 0,
              errorRate: stats.redisCache.hits + stats.redisCache.misses + stats.redisCache.errors > 0
                ? Math.round((stats.redisCache.errors / (stats.redisCache.hits + stats.redisCache.misses + stats.redisCache.errors)) * 100)
                : 0
            }
          },
          recommendations: getCacheRecommendations(stats),
          timestamp: new Date().toISOString()
        })

      default:
        // Return comprehensive cache information
        const cacheStats = adminCache.getStats()
        
        return NextResponse.json({
          overview: {
            totalRequests: cacheStats.totalRequests,
            overallHitRate: cacheStats.hitRate,
            status: cacheStats.redisCache.connected ? 'optimal' : 'memory-only'
          },
          memoryCache: {
            size: cacheStats.memoryCache.size,
            hits: cacheStats.memoryCache.hits,
            misses: cacheStats.memoryCache.misses,
            evictions: cacheStats.memoryCache.evictions,
            hitRate: cacheStats.memoryCache.hits + cacheStats.memoryCache.misses > 0
              ? Math.round((cacheStats.memoryCache.hits / (cacheStats.memoryCache.hits + cacheStats.memoryCache.misses)) * 100)
              : 0
          },
          redisCache: {
            connected: cacheStats.redisCache.connected,
            hits: cacheStats.redisCache.hits,
            misses: cacheStats.redisCache.misses,
            errors: cacheStats.redisCache.errors,
            hitRate: cacheStats.redisCache.hits + cacheStats.redisCache.misses > 0
              ? Math.round((cacheStats.redisCache.hits / (cacheStats.redisCache.hits + cacheStats.redisCache.misses)) * 100)
              : 0
          },
          performance: {
            cacheEfficiency: calculateCacheEfficiency(cacheStats),
            recommendations: getCacheRecommendations(cacheStats)
          },
          timestamp: new Date().toISOString()
        })
    }

  } catch (error) {
    console.error('Cache monitoring error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to retrieve cache information',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

/**
 * Cache management operations
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, key, pattern } = body

    switch (action) {
      case 'clear':
        await adminCache.clearAll()
        return NextResponse.json({
          message: 'All caches cleared successfully',
          timestamp: new Date().toISOString()
        })

      case 'invalidate':
        if (!key) {
          return NextResponse.json(
            { error: 'Key is required for invalidate action' },
            { status: 400 }
          )
        }
        await adminCache.invalidate(key)
        return NextResponse.json({
          message: `Cache key '${key}' invalidated successfully`,
          timestamp: new Date().toISOString()
        })

      case 'invalidate-pattern':
        if (!pattern) {
          return NextResponse.json(
            { error: 'Pattern is required for invalidate-pattern action' },
            { status: 400 }
          )
        }
        await adminCache.invalidatePattern(pattern)
        return NextResponse.json({
          message: `Cache pattern '${pattern}' invalidated successfully`,
          timestamp: new Date().toISOString()
        })

      case 'warmup':
        await adminCache.warmUpCache()
        return NextResponse.json({
          message: 'Cache warm-up completed successfully',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: clear, invalidate, invalidate-pattern, warmup' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Cache management error:', error)
    return NextResponse.json(
      { 
        error: 'Cache management operation failed',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
})

// Helper functions

function calculateCacheHealthScore(stats: any): number {
  let score = 100

  // Deduct points for low hit rate
  if (stats.hitRate < 50) score -= 30
  else if (stats.hitRate < 70) score -= 15

  // Deduct points for Redis connection issues
  if (!stats.redisCache.connected) score -= 20

  // Deduct points for high error rate
  const totalRedisOps = stats.redisCache.hits + stats.redisCache.misses + stats.redisCache.errors
  if (totalRedisOps > 0) {
    const errorRate = (stats.redisCache.errors / totalRedisOps) * 100
    if (errorRate > 10) score -= 25
    else if (errorRate > 5) score -= 10
  }

  // Deduct points for excessive evictions
  const totalMemoryOps = stats.memoryCache.hits + stats.memoryCache.misses
  if (totalMemoryOps > 0) {
    const evictionRate = (stats.memoryCache.evictions / totalMemoryOps) * 100
    if (evictionRate > 20) score -= 15
    else if (evictionRate > 10) score -= 8
  }

  return Math.max(0, score)
}

function calculateCacheEfficiency(stats: any): string {
  const hitRate = stats.hitRate
  
  if (hitRate >= 90) return 'excellent'
  if (hitRate >= 75) return 'good'
  if (hitRate >= 60) return 'fair'
  if (hitRate >= 40) return 'poor'
  return 'critical'
}

function getCacheRecommendations(stats: any): string[] {
  const recommendations = []

  if (stats.hitRate < 60) {
    recommendations.push('Cache hit rate is below 60%. Consider increasing TTL values or reviewing cache key strategies.')
  }

  if (!stats.redisCache.connected) {
    recommendations.push('Redis cache is not connected. Check Redis server status and connection configuration.')
  }

  const totalRedisOps = stats.redisCache.hits + stats.redisCache.misses + stats.redisCache.errors
  if (totalRedisOps > 0) {
    const errorRate = (stats.redisCache.errors / totalRedisOps) * 100
    if (errorRate > 5) {
      recommendations.push(`Redis error rate is ${errorRate.toFixed(1)}%. Check Redis server health and network connectivity.`)
    }
  }

  if (stats.memoryCache.evictions > stats.memoryCache.size * 0.2) {
    recommendations.push('High memory cache eviction rate detected. Consider increasing memory cache size limit.')
  }

  if (stats.totalRequests > 1000 && stats.hitRate > 85) {
    recommendations.push('Cache performance is excellent! Consider implementing additional caching layers for further optimization.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache performance is optimal. No immediate optimizations needed.')
  }

  return recommendations
}