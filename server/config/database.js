const { Pool } = require('pg');
const winston = require('winston');

// Database configuration based on environment
const config = {
  development: {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    statement_timeout: 10000,
    query_timeout: 10000,
  },
  production: {
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    statement_timeout: 10000,
    query_timeout: 10000,
    ssl: {
      rejectUnauthorized: false
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ...config[env]
};

// Create connection pool
const pool = new Pool(dbConfig);

// Query metrics tracking
let queryMetrics = {
  totalQueries: 0,
  totalTime: 0,
  slowQueries: 0,
  errors: 0,
  lastReset: new Date()
};

// Enhanced query function with metrics and logging
async function query(text, params = []) {
  const start = Date.now();
  queryMetrics.totalQueries++;
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    queryMetrics.totalTime += duration;
    
    // Track slow queries (>1 second)
    if (duration > 1000) {
      queryMetrics.slowQueries++;
      winston.warn('Slow query detected', {
        query: text.substring(0, 100),
        duration,
        params: params.length
      });
    }
    
    // Log query in development
    if (env === 'development') {
      console.log('Query executed:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: res.rowCount
      });
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    queryMetrics.totalTime += duration;
    queryMetrics.errors++;
    
    winston.error('Database query failed', {
      query: text.substring(0, 100),
      duration,
      error: error.message,
      code: error.code,
      detail: error.detail
    });
    
    throw error;
  }
}

// Get database client for transactions
async function getClient() {
  return await pool.connect();
}

// Database health monitoring
async function checkHealth() {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;
    
    // Get connection stats
    const stats = await pool.query(`
      SELECT 
        count(*) as total_connections,
        count(*) filter (where state = 'active') as active_connections,
        count(*) filter (where state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    
    return {
      status: 'healthy',
      latency,
      connections: stats.rows[0],
      pool: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      },
      metrics: queryMetrics
    };
  } catch (error) {
    winston.error('Database health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      error: error.message,
      metrics: queryMetrics
    };
  }
}

// Get query metrics
function getQueryMetrics() {
  return { ...queryMetrics };
}

// Reset query metrics
function resetQueryMetrics() {
  queryMetrics = {
    totalQueries: 0,
    totalTime: 0,
    slowQueries: 0,
    errors: 0,
    lastReset: new Date()
  };
  return queryMetrics;
}

// Database error handler with user-friendly messages
function handleDbError(error) {
  queryMetrics.errors++;
  
  winston.error('Database error occurred', {
    message: error.message,
    code: error.code,
    detail: error.detail,
    stack: error.stack
  });
  
  // Map common PostgreSQL errors to user-friendly messages
  const errorMappings = {
    '23505': 'A record with this information already exists',
    '23503': 'Referenced record does not exist',
    '23502': 'Required field is missing',
    '42P01': 'Database table not found',
    '42601': 'Invalid query syntax',
    '08006': 'Database connection failed',
    '08001': 'Unable to connect to database',
    '53300': 'Too many database connections'
  };
  
  const userMessage = errorMappings[error.code] || 'A database error occurred';
  
  const dbError = new Error(userMessage);
  dbError.originalError = error;
  dbError.code = error.code;
  
  throw dbError;
}

// Connection event handlers
pool.on('connect', (client) => {
  winston.info('New database client connected');
});

pool.on('error', (err, client) => {
  winston.error('Unexpected database pool error', { error: err.message });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  winston.info('Shutting down database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  winston.info('Shutting down database pool...');
  await pool.end();
  process.exit(0);
});

// Health check interval (every 30 seconds)
if (env === 'production') {
  setInterval(async () => {
    try {
      const health = await checkHealth();
      if (health.status !== 'healthy') {
        winston.warn('Database health check warning', health);
      }
    } catch (error) {
      winston.error('Health check interval failed', { error: error.message });
    }
  }, 30000);
}

module.exports = {
  pool,
  query,
  getClient,
  checkHealth,
  getQueryMetrics,
  resetQueryMetrics,
  handleDbError
};