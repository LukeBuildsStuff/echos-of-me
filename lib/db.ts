import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export { pool }
export const db = { query, getClient, pool }

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  queryMetrics.totalQueries++
  
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    queryMetrics.totalTime += duration
    
    if (duration > 1000) {
      queryMetrics.slowQueries++
    }
    
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount })
    return res
  } catch (error: any) {
    const duration = Date.now() - start
    queryMetrics.totalTime += duration
    queryMetrics.errors++
    
    console.error('Query failed', { 
      text: text.substring(0, 100), 
      duration, 
      error: error.message,
      code: error.code,
      detail: error.detail 
    })
    throw error
  }
}

export async function getClient() {
  const client = await pool.connect()
  return client
}

// Query metrics tracking
let queryMetrics = {
  totalQueries: 0,
  totalTime: 0,
  slowQueries: 0,
  errors: 0,
  lastReset: new Date()
}

// Database health monitoring functions
export async function checkDatabaseHealth() {
  try {
    const start = Date.now()
    await pool.query('SELECT 1')
    const latency = Date.now() - start
    
    const stats = await pool.query(`
      SELECT 
        count(*) as total_connections,
        count(*) filter (where state = 'active') as active_connections,
        count(*) filter (where state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `)
    
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
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      metrics: queryMetrics
    }
  }
}

export function getQueryMetrics() {
  return { ...queryMetrics }
}

export function resetQueryMetrics() {
  queryMetrics = {
    totalQueries: 0,
    totalTime: 0,
    slowQueries: 0,
    errors: 0,
    lastReset: new Date()
  }
  return queryMetrics
}

// Helper function to handle database errors
export function handleDbError(error: any) {
  queryMetrics.errors++
  console.error('Database error:', error)
  if (error.code === '23505') {
    throw new Error('A user with this email already exists')
  }
  if (error.code === '23503') {
    throw new Error('Referenced record does not exist')
  }
  throw new Error('Database operation failed')
}