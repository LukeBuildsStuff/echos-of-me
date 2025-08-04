import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { lukeAIModelEngine } from '@/lib/luke-ai-model-engine'

/**
 * AI Echo Sessions API
 * Manages Luke's AI chat sessions
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, settings } = body

    // Create new Luke AI session
    const chatSession = await lukeAIModelEngine.createChatSession(
      title || `Chat ${new Date().toLocaleString()}`
    )

    return NextResponse.json({
      session: {
        id: chatSession.id,
        title: chatSession.title,
        createdAt: chatSession.createdAt,
        lastActiveAt: chatSession.lastActiveAt
      }
    })

  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all chat sessions
    const sessions = lukeAIModelEngine.getAllChatSessions()

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        messageCount: s.messages.length
      }))
    })

  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to get sessions' },
      { status: 500 }
    )
  }
}