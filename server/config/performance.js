/**
 * Performance Optimization Configuration
 * Handles caching, compression, and optimization for HTML frontend
 */

const Redis = require('ioredis');
const { logger } = require('./logger');

/**
 * Cache Service for performance optimization
 */
class CacheService {
  constructor(config) {
    this.enabled = config.redis.enabled;
    this.keyPrefix = config.redis.keyPrefix || 'luke_ai:';
    this.defaultTTL = config.redis.ttl || 300;
    
    if (this.enabled) {
      this.redis = new Redis({
        ...config.redis,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
      
      this.redis.on('connect', () => {
        logger.info('✅ Redis cache connected');
      });
      
      this.redis.on('error', (error) => {
        logger.error('Redis cache error', { error: error.message });
        // Don't fail the application on Redis errors
      });
      
      this.redis.on('close', () => {
        logger.warn('Redis cache connection closed');
      });
    }
  }
  
  /**
   * Get cached value
   */
  async get(key) {
    if (!this.enabled) return null;
    
    try {
      const cached = await this.redis.get(this.keyPrefix + key);
      if (cached) {
        logger.debug('Cache hit', { key });
        return JSON.parse(cached);
      }
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.warn('Cache get error', { key, error: error.message });
      return null;
    }
  }
  
  /**
   * Set cached value
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.enabled) return;
    
    try {
      await this.redis.setex(
        this.keyPrefix + key, 
        ttl, 
        JSON.stringify(value)
      );
      logger.debug('Cache set', { key, ttl });
    } catch (error) {
      logger.warn('Cache set error', { key, error: error.message });
    }
  }
  
  /**
   * Delete cached value
   */
  async del(key) {
    if (!this.enabled) return;
    
    try {
      await this.redis.del(this.keyPrefix + key);
      logger.debug('Cache delete', { key });
    } catch (error) {
      logger.warn('Cache delete error', { key, error: error.message });
    }
  }
  
  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    if (!this.enabled) return;
    
    try {
      const keys = await this.redis.keys(this.keyPrefix + pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Cache pattern invalidated', { pattern, keysDeleted: keys.length });
      }
    } catch (error) {
      logger.warn('Cache pattern invalidation error', { pattern, error: error.message });
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.enabled) {
      return { enabled: false };
    }
    
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        enabled: true,
        connected: this.redis.status === 'ready',
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace)
      };
    } catch (error) {
      logger.warn('Cache stats error', { error: error.message });
      return { enabled: true, connected: false, error: error.message };
    }
  }
  
  /**
   * Parse Redis INFO output
   */
  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(value) ? value : parseFloat(value);
        }
      }
    });
    
    return result;
  }
  
  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    if (this.enabled && this.redis) {
      logger.info('Shutting down cache service');
      this.redis.disconnect();
    }
  }
}

/**
 * Response caching middleware
 */
function responseCache(ttl = 300, keyGenerator = null) {
  return async (req, res, next) => {
    // Skip caching for authenticated requests or POST/PUT/DELETE
    if (req.session?.userId || req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = keyGenerator ? 
      keyGenerator(req) : 
      `response:${req.path}:${JSON.stringify(req.query)}`;
    
    try {
      // Try to get cached response
      const cached = await req.app.locals.cache?.get(cacheKey);
      if (cached) {
        logger.debug('Serving cached response', { cacheKey });
        return res.json(cached);
      }
      
      // Capture response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode === 200 && data.success !== false) {
          req.app.locals.cache?.set(cacheKey, data, ttl);
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.warn('Response cache error', { cacheKey, error: error.message });
      next();
    }
  };
}

/**
 * Static asset optimization middleware
 */
function staticOptimization() {
  return (req, res, next) => {
    // Set appropriate cache headers for static assets
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      // Cache static assets for 1 day in development, 30 days in production
      const maxAge = process.env.NODE_ENV === 'production' ? 
        30 * 24 * 60 * 60 : // 30 days
        24 * 60 * 60;       // 1 day
      
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
    }
    
    next();
  };
}

/**
 * Database query result caching
 */
class QueryCache {
  constructor(cacheService) {
    this.cache = cacheService;
  }
  
  /**
   * Cache database query results
   */
  async query(sql, params, ttl = 300) {
    const cacheKey = `query:${Buffer.from(sql + JSON.stringify(params)).toString('base64')}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.debug('Query cache hit', { sql: sql.substring(0, 50) });
      return cached;
    }
    
    // Execute query and cache result
    const result = await pool.query(sql, params);
    
    // Only cache successful queries
    if (result.rows) {
      await this.cache.set(cacheKey, result.rows, ttl);
      logger.debug('Query result cached', { 
        sql: sql.substring(0, 50), 
        rows: result.rows.length,
        ttl 
      });
    }
    
    return result.rows;
  }
  
  /**
   * Invalidate query cache for specific tables
   */
  async invalidateTable(tableName) {
    await this.cache.invalidatePattern(`query:*${tableName}*`);
    logger.info('Query cache invalidated for table', { tableName });
  }
}

/**
 * Performance monitoring middleware
 */
function performanceMonitoring() {
  const startTimes = new Map();
  
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const requestId = req.id || 'unknown';
    
    startTimes.set(requestId, startTime);
    
    // Monitor response
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const startTime = startTimes.get(requestId);
      
      if (startTime) {
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        startTimes.delete(requestId);
        
        // Log slow requests
        if (duration > 1000) { // > 1 second
          logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            duration: `${duration.toFixed(2)}ms`,
            statusCode: res.statusCode,
            userId: req.user?.id
          });
        }
        
        // Log performance metrics
        logger.debug('Request performance', {
          method: req.method,
          url: req.url,
          duration: `${duration.toFixed(2)}ms`,
          statusCode: res.statusCode,
          contentLength: res.get('Content-Length')
        });
      }
    });
    
    next();
  };
}

/**
 * Memory usage monitoring
 */
function memoryMonitoring(interval = 60000) {
  setInterval(() => {
    const usage = process.memoryUsage();
    const mb = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    logger.info('Memory usage', {
      rss: `${mb(usage.rss)}MB`,
      heapTotal: `${mb(usage.heapTotal)}MB`,
      heapUsed: `${mb(usage.heapUsed)}MB`,
      external: `${mb(usage.external)}MB`,
      heapUsedPercent: Math.round(usage.heapUsed / usage.heapTotal * 100)
    });
    
    // Warn if memory usage is high
    if (usage.heapUsed / usage.heapTotal > 0.9) {
      logger.warn('High memory usage detected', {
        heapUsedPercent: Math.round(usage.heapUsed / usage.heapTotal * 100)
      });
    }
  }, interval);
}

/**
 * Response compression middleware
 */
function optimizedCompression() {
  const compression = require('compression');
  
  return compression({
    // Only compress responses that are larger than 1kb
    threshold: 1024,
    
    // Compress all text-based responses
    filter: (req, res) => {
      const contentType = res.getHeader('Content-Type');
      if (!contentType) return false;
      
      return contentType.includes('text/') ||
             contentType.includes('application/json') ||
             contentType.includes('application/javascript') ||
             contentType.includes('application/xml');
    },
    
    // Use gzip level 6 (good balance of compression vs CPU)
    level: 6
  });
}

/**
 * HTML optimization middleware
 */
function htmlOptimization() {
  return (req, res, next) => {
    const originalRender = res.render;
    
    res.render = function(view, locals, callback) {
      // Add performance hints to HTML pages
      const optimizedLocals = {
        ...locals,
        performance: {
          renderTime: Date.now(),
          cacheEnabled: req.app.locals.cache?.enabled || false,
          environment: process.env.NODE_ENV
        }
      };
      
      return originalRender.call(this, view, optimizedLocals, callback);
    };
    
    next();
  };
}

/**
 * Initialize performance optimizations
 */
function initializePerformance(app, config) {
  // Initialize cache service
  const cacheService = new CacheService(config);
  app.locals.cache = cacheService;
  
  // Initialize query cache
  const queryCache = new QueryCache(cacheService);
  app.locals.queryCache = queryCache;
  
  // Add performance middleware
  if (config.performance.monitoring.enabled) {
    app.use(performanceMonitoring());
    
    // Start memory monitoring
    memoryMonitoring(config.performance.monitoring.interval);
  }
  
  // Add static asset optimization
  app.use(staticOptimization());
  
  // Add HTML optimization
  app.use(htmlOptimization());
  
  logger.info('Performance optimizations initialized', {
    cacheEnabled: cacheService.enabled,
    compressionEnabled: config.performance.compression,
    monitoringEnabled: config.performance.monitoring.enabled
  });
  
  return { cacheService, queryCache };
}

module.exports = {
  CacheService,
  QueryCache,
  responseCache,
  staticOptimization,
  performanceMonitoring,
  memoryMonitoring,
  optimizedCompression,
  htmlOptimization,
  initializePerformance
};