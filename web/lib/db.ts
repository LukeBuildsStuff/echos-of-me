import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export { pool }

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  console.log('Executed query', { text, duration, rows: res.rowCount })
  return res
}

export async function getClient() {
  const client = await pool.connect()
  return client
}

// Helper function to handle database errors
export function handleDbError(error: any) {
  console.error('Database error:', error)
  if (error.code === '23505') {
    throw new Error('A user with this email already exists')
  }
  if (error.code === '23503') {
    throw new Error('Referenced record does not exist')
  }
  throw new Error('Database operation failed')
}