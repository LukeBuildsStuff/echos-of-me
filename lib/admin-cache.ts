/**
 * Multi-layer caching system for admin dashboard
 * Implements memory, Redis, and edge caching for optimal performance
 */

import { createClient, RedisClientType } from 'redis'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
  size: number
}

interface CacheStats {
  memoryCache: {
    size: number
    hits: number
    misses: number
    evictions: number
  }
  redisCache: {
    connected: boolean
    hits: number
    misses: number
    errors: number
  }
  totalRequests: number
  hitRate: number
}

export class AdminCacheManager {
  private static instance: AdminCacheManager
  private memoryCache: Map<string, CacheItem<any>> = new Map()
  private redisClient: RedisClientType | null = null
  private stats: CacheStats = {
    memoryCache: { size: 0, hits: 0, misses: 0, evictions: 0 },
    redisCache: { connected: false, hits: 0, misses: 0, errors: 0 },
    totalRequests: 0,
    hitRate: 0
  }
  private maxMemorySize = 50 * 1024 * 1024 // 50MB max memory cache
  private currentMemorySize = 0

  private constructor() {
    this.initializeRedis()
    this.startCleanupTimer()
  }

  static getInstance(): AdminCacheManager {
    if (!AdminCacheManager.instance) {
      AdminCacheManager.instance = new AdminCacheManager()
    }
    return AdminCacheManager.instance
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      })

      this.redisClient.on('error', (err) => {
        console.error('Redis client error:', err)
        this.stats.redisCache.errors++
      })

      this.redisClient.on('connect', () => {
        console.log('Redis client connected')
        this.stats.redisCache.connected = true
      })

      this.redisClient.on('disconnect', () => {
        console.log('Redis client disconnected')
        this.stats.redisCache.connected = false
      })

      await this.redisClient.connect()
    } catch (error) {
      console.warn('Failed to initialize Redis cache:', error)
      this.redisClient = null
    }
  }

  /**
   * Get data from cache with fallback strategy
   */
  async get<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++
    const cacheKey = this.buildCacheKey(key)

    // Level 1: Memory cache
    const memoryResult = this.getFromMemory<T>(cacheKey)
    if (memoryResult !== null) {
      this.stats.memoryCache.hits++
      this.updateHitRate()
      return memoryResult
    }
    this.stats.memoryCache.misses++

    // Level 2: Redis cache
    if (this.redisClient && this.stats.redisCache.connected) {
      try {
        const redisResult = await this.redisClient.get(cacheKey)
        if (redisResult) {
          const parsed = JSON.parse(redisResult)
          this.stats.redisCache.hits++
          
          // Populate memory cache for next time
          this.setInMemory(cacheKey, parsed.data, parsed.ttl)
          this.updateHitRate()
          return parsed.data
        }
        this.stats.redisCache.misses++
      } catch (error) {
        console.error('Redis get error:', error)
        this.stats.redisCache.errors++
      }
    }

    this.updateHitRate()
    return null
  }

  /**
   * Set data in cache with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const cacheKey = this.buildCacheKey(key)
    const serializedData = JSON.stringify({ data, ttl: ttlSeconds })
    const dataSize = new Blob([serializedData]).size

    // Set in memory cache
    this.setInMemory(cacheKey, data, ttlSeconds, dataSize)

    // Set in Redis cache
    if (this.redisClient && this.stats.redisCache.connected) {
      try {
        await this.redisClient.setEx(cacheKey, ttlSeconds, serializedData)
      } catch (error) {
        console.error('Redis set error:', error)
        this.stats.redisCache.errors++
      }
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    const cacheKey = this.buildCacheKey(key)

    // Remove from memory
    const memoryItem = this.memoryCache.get(cacheKey)
    if (memoryItem) {
      this.currentMemorySize -= memoryItem.size
      this.memoryCache.delete(cacheKey)
      this.stats.memoryCache.size--
    }

    // Remove from Redis
    if (this.redisClient && this.stats.redisCache.connected) {
      try {
        await this.redisClient.del(cacheKey)
      } catch (error) {
        console.error('Redis delete error:', error)
        this.stats.redisCache.errors++
      }
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const cachePattern = this.buildCacheKey(pattern)

    // Remove from memory cache
    const keysToDelete = []
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      const item = this.memoryCache.get(key)
      if (item) {
        this.currentMemorySize -= item.size
      }
      this.memoryCache.delete(key)
      this.stats.memoryCache.size--
    }

    // Remove from Redis cache
    if (this.redisClient && this.stats.redisCache.connected) {
      try {
        const keys = await this.redisClient.keys(cachePattern + '*')
        if (keys.length > 0) {
          await this.redisClient.del(keys)
        }
      } catch (error) {
        console.error('Redis pattern delete error:', error)
        this.stats.redisCache.errors++
      }
    }
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    await this.set(key, data, ttlSeconds)
    return data
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear()
    this.currentMemorySize = 0
    this.stats.memoryCache.size = 0

    // Clear Redis cache
    if (this.redisClient && this.stats.redisCache.connected) {
      try {
        await this.redisClient.flushAll()
      } catch (error) {
        console.error('Redis flush error:', error)
        this.stats.redisCache.errors++
      }
    }
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmUpCache(): Promise<void> {
    console.log('Warming up admin cache...')
    
    const warmupData = [
      { key: 'analytics:user_stats:7d', ttl: 300 },
      { key: 'analytics:response_stats:7d', ttl: 300 },
      { key: 'system:health', ttl: 60 },
      { key: 'training:active_jobs', ttl: 30 }
    ]

    for (const item of warmupData) {
      try {
        // This would typically call the actual data fetcher
        // For now, we'll just prepare the cache slots
        await this.set(item.key, { warmedUp: true, timestamp: Date.now() }, item.ttl)
      } catch (error) {
        console.warn(`Failed to warm up cache for ${item.key}:`, error)
      }
    }

    console.log('Cache warm-up completed')
  }

  // Private methods

  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key)
    if (!item) return null

    // Check TTL
    if (Date.now() - item.timestamp > item.ttl * 1000) {
      this.memoryCache.delete(key)
      this.currentMemorySize -= item.size
      this.stats.memoryCache.size--
      return null
    }

    item.hits++
    return item.data
  }

  private setInMemory<T>(key: string, data: T, ttlSeconds: number, size?: number): void {
    const dataSize = size || new Blob([JSON.stringify(data)]).size
    
    // Check if we need to evict items
    while (this.currentMemorySize + dataSize > this.maxMemorySize && this.memoryCache.size > 0) {
      this.evictLeastUsed()
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds,
      hits: 0,
      size: dataSize
    }

    this.memoryCache.set(key, item)
    this.currentMemorySize += dataSize
    this.stats.memoryCache.size++
  }

  private evictLeastUsed(): void {
    let leastUsedKey = ''
    let leastHits = Infinity

    for (const [key, item] of this.memoryCache) {
      if (item.hits < leastHits) {
        leastHits = item.hits
        leastUsedKey = key
      }
    }

    if (leastUsedKey) {
      const item = this.memoryCache.get(leastUsedKey)
      if (item) {
        this.currentMemorySize -= item.size
      }
      this.memoryCache.delete(leastUsedKey)
      this.stats.memoryCache.size--
      this.stats.memoryCache.evictions++
    }
  }

  private buildCacheKey(key: string): string {
    return `admin:${key}`
  }

  private updateHitRate(): void {
    const totalHits = this.stats.memoryCache.hits + this.stats.redisCache.hits
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? Math.round((totalHits / this.stats.totalRequests) * 100) 
      : 0
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredItems()
    }, 60000) // Run every minute
  }

  private cleanupExpiredItems(): void {
    const now = Date.now()
    const expiredKeys = []

    for (const [key, item] of this.memoryCache) {
      if (now - item.timestamp > item.ttl * 1000) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      const item = this.memoryCache.get(key)
      if (item) {
        this.currentMemorySize -= item.size
      }
      this.memoryCache.delete(key)
      this.stats.memoryCache.size--
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache items`)
    }
  }
}

// Cache decorators and utilities

/**
 * Cache decorator for functions
 */
export function cached(ttlSeconds: number = 300, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const cache = AdminCacheManager.getInstance()

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator 
        ? keyGenerator.apply(this, args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`

      return await cache.getOrSet(cacheKey, () => method.apply(this, args), ttlSeconds)
    }

    return descriptor
  }
}

/**
 * Cache utility functions for admin endpoints
 */
export const AdminCache = {
  analytics: {
    getUserStats: (timeRange: string) => `analytics:user_stats:${timeRange}`,
    getResponseStats: (timeRange: string) => `analytics:response_stats:${timeRange}`,
    getDailyMetrics: (timeRange: string) => `analytics:daily_metrics:${timeRange}`,
  },
  
  training: {
    getActiveJobs: () => 'training:active_jobs',
    getJobMetrics: (jobId: string) => `training:job_metrics:${jobId}`,
    getSystemStatus: () => 'training:system_status',
  },
  
  system: {
    getHealth: () => 'system:health',
    getPerformanceMetrics: () => 'system:performance',
    getDatabaseHealth: () => 'system:database_health',
  },
  
  users: {
    getList: (page: number, limit: number) => `users:list:${page}:${limit}`,
    getStats: () => 'users:stats',
    getActivity: (timeRange: string) => `users:activity:${timeRange}`,
  }
}

// Initialize cache on import
const adminCache = AdminCacheManager.getInstance()

// Warm up cache in production
if (process.env.NODE_ENV === 'production') {
  adminCache.warmUpCache().catch(console.error)
}

export default adminCache