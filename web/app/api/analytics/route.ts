import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logAnalyticsEvent } from '@/lib/admin'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    const {
      eventType,
      eventData,
      pageUrl
    } = body

    if (!eventType) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 })
    }

    // Get user ID if session exists
    let userId = null
    if (session?.user?.email) {
      // Could optionally look up user ID, but for now just use email as identifier
      userId = session.user.email
    }

    // Get session ID from headers or generate one
    const sessionId = request.headers.get('x-session-id') || `anon-${Date.now()}`

    await logAnalyticsEvent(
      eventType,
      eventData,
      pageUrl,
      userId,
      sessionId
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Analytics logging error:', error)
    return NextResponse.json(
      { error: 'Failed to log analytics' },
      { status: 500 }
    )
  }
}