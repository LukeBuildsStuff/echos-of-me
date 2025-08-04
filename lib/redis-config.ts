import { Redis } from 'ioredis'

// Redis configuration for both development (local) and production (Upstash)
class RedisConfig {
  private static instance: Redis | null = null
  private static isConnected = false

  static getInstance(): Redis {
    if (!this.instance) {
      this.instance = this.createConnection()
    }
    return this.instance
  }

  private static createConnection(): Redis {
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
      console.error('❌ REDIS_URL environment variable is required')
      throw new Error('Redis URL not configured')
    }

    console.log(`🔗 Connecting to Redis: ${redisUrl.includes('upstash') ? 'Upstash Cloud' : 'Local/Docker'}`)

    const redis = new Redis(redisUrl, {
      // Connection settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      
      // Upstash-specific optimizations
      ...(redisUrl.includes('upstash') && {
        connectTimeout: 10000,
        lazyConnect: true,
        keepAlive: 30000,
        family: 6, // Use IPv6 for better Upstash connectivity
        tls: {
          rejectUnauthorized: false
        }
      }),

      // Local development settings
      ...(redisUrl.includes('localhost') && {
        connectTimeout: 5000,
        lazyConnect: false
      })
    })

    // Connection event handlers
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully')
      this.isConnected = true
    })

    redis.on('ready', () => {
      console.log('🚀 Redis ready for operations')
    })

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message)
      this.isConnected = false
    })

    redis.on('close', () => {
      console.log('🔌 Redis connection closed')
      this.isConnected = false
    })

    redis.on('reconnecting', (delay: number) => {
      console.log(`🔄 Redis reconnecting in ${delay}ms`)
    })

    return redis
  }

  static isRedisConnected(): boolean {
    return this.isConnected && this.instance?.status === 'ready'
  }

  static async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now()
      const redis = this.getInstance()
      await redis.ping()
      const latency = Date.now() - start

      return {
        healthy: true,
        latency
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit()
      this.instance = null
      this.isConnected = false
    }
  }
}

// Cache utilities optimized for both local and Upstash Redis
export class CacheManager {
  private redis: Redis

  constructor() {
    this.redis = RedisConfig.getInstance()
  }

  // Set with TTL (Time To Live)
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value)
      await this.redis.setex(key, ttlSeconds, serializedValue)
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      throw error
    }
  }

  // Get with automatic deserialization
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      if (value === null) return null
      return JSON.parse(value)
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  // Delete single key
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key)
      return result === 1
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
      return false
    }
  }

  // Delete multiple keys
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length === 0) return 0
      return await this.redis.del(...keys)
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error)
      return 0
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error)
      return false
    }
  }

  // Get TTL of a key
  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key)
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error)
      return -1
    }
  }

  // Increment counter (useful for rate limiting)
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key)
      if (ttlSeconds && result === 1) {
        await this.redis.expire(key, ttlSeconds)
      }
      return result
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error)
      throw error
    }
  }

  // Hash operations (useful for complex objects)
  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value)
      await this.redis.hset(key, field, serializedValue)
    } catch (error) {
      console.error(`Cache hset error for key ${key}, field ${field}:`, error)
      throw error
    }
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redis.hget(key, field)
      if (value === null) return null
      return JSON.parse(value)
    } catch (error) {
      console.error(`Cache hget error for key ${key}, field ${field}:`, error)
      return null
    }
  }

  async hgetall<T = any>(key: string): Promise<Record<string, T>> {
    try {
      const hash = await this.redis.hgetall(key)
      const result: Record<string, T> = {}
      
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value)
        } catch {
          result[field] = value as T
        }
      }
      
      return result
    } catch (error) {
      console.error(`Cache hgetall error for key ${key}:`, error)
      return {}
    }
  }

  // List operations (useful for queues)
  async lpush(key: string, ...values: any[]): Promise<number> {
    try {
      const serializedValues = values.map(v => JSON.stringify(v))
      return await this.redis.lpush(key, ...serializedValues)
    } catch (error) {
      console.error(`Cache lpush error for key ${key}:`, error)
      throw error
    }
  }

  async rpop<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.rpop(key)
      if (value === null) return null
      return JSON.parse(value)
    } catch (error) {
      console.error(`Cache rpop error for key ${key}:`, error)
      return null
    }
  }

  async llen(key: string): Promise<number> {
    try {
      return await this.redis.llen(key)
    } catch (error) {
      console.error(`Cache llen error for key ${key}:`, error)
      return 0
    }
  }
}

// Specialized cache for common application patterns
export class ApplicationCache extends CacheManager {
  // User session cache
  async setUserSession(userId: string, sessionData: any, ttlSeconds: number = 86400): Promise<void> {
    await this.set(`user:session:${userId}`, sessionData, ttlSeconds)
  }

  async getUserSession(userId: string): Promise<any> {
    return await this.get(`user:session:${userId}`)
  }

  async clearUserSession(userId: string): Promise<boolean> {
    return await this.delete(`user:session:${userId}`)
  }

  // Admin analytics cache
  async setAnalytics(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    await this.set(`analytics:${key}`, data, ttlSeconds)
  }

  async getAnalytics(key: string): Promise<any> {
    return await this.get(`analytics:${key}`)
  }

  // Training job cache
  async setTrainingJob(jobId: string, jobData: any, ttlSeconds: number = 3600): Promise<void> {
    await this.set(`training:job:${jobId}`, jobData, ttlSeconds)
  }

  async getTrainingJob(jobId: string): Promise<any> {
    return await this.get(`training:job:${jobId}`)
  }

  // Rate limiting
  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate_limit:${identifier}`
    const current = await this.increment(key, windowSeconds)
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current)
    }
  }

  // API response cache
  async cacheApiResponse(endpoint: string, params: string, response: any, ttlSeconds: number = 300): Promise<void> {
    const key = `api:${endpoint}:${Buffer.from(params).toString('base64')}`
    await this.set(key, response, ttlSeconds)
  }

  async getCachedApiResponse(endpoint: string, params: string): Promise<any> {
    const key = `api:${endpoint}:${Buffer.from(params).toString('base64')}`
    return await this.get(key)
  }
}

// Export singleton instances
export const redis = RedisConfig.getInstance()
export const cache = new ApplicationCache()

// Export utilities
export { RedisConfig }

// Health check function for monitoring
export async function checkRedisHealth() {
  return await RedisConfig.healthCheck()
}