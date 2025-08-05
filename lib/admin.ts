import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export interface AdminUser {
  id: string
  email: string
  name: string
  isAdmin: boolean
}

export async function checkAdminAuth(): Promise<AdminUser | null> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return null
    }

    const result = await query(`
      SELECT id, email, name, is_admin 
      FROM users 
      WHERE email = $1 AND is_admin = true
    `, [session.user.email])

    if (!result.rows[0]) {
      return null
    }

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      isAdmin: result.rows[0].is_admin
    }
  } catch (error) {
    console.error('Admin auth check failed:', error)
    return null
  }
}

export function withAdminAuth(handler: (request: NextRequest, admin: AdminUser) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const admin = await checkAdminAuth()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return handler(request, admin)
  }
}

export async function isAdmin(email?: string): Promise<boolean> {
  if (!email) {
    const session = await getServerSession(authOptions)
    email = session?.user?.email
  }
  
  if (!email) return false
  
  try {
    const result = await query(`
      SELECT is_admin 
      FROM users 
      WHERE email = $1 AND is_admin = true
    `, [email])
    
    return result.rows.length > 0
  } catch (error) {
    console.error('Failed to check admin status:', error)
    return false
  }
}

export async function logAnalyticsEvent(
  eventType: string,
  eventData?: any,
  pageUrl?: string,
  userId?: string,
  sessionId?: string
) {
  try {
    await query(`
      INSERT INTO analytics_events (
        user_id, session_id, event_type, event_data, page_url
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      userId || null,
      sessionId || null,
      eventType,
      eventData ? JSON.stringify(eventData) : null,
      pageUrl || null
    ])
  } catch (error) {
    console.error('Failed to log analytics event:', error)
  }
}