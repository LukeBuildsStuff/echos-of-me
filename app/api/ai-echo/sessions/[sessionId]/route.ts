import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { lukeAIModelEngine } from '@/lib/luke-ai-model-engine'

/**
 * Individual AI Echo Session API
 * Manages specific Luke's AI chat sessions
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = params
    const chatSession = lukeAIModelEngine.getChatSession(sessionId)

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      session: {
        id: chatSession.id,
        title: chatSession.title,
        messages: chatSession.messages,
        createdAt: chatSession.createdAt,
        lastActiveAt: chatSession.lastActiveAt,
        context: chatSession.context
      }
    })

  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = params
    await lukeAIModelEngine.deleteChatSession(sessionId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}