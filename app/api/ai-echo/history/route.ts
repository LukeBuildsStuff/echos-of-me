import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * AI Echo Conversation History API
 * 
 * Provides access to previous conversations for context and continuity
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    // Get recent conversations with metadata
    const conversations = await query(`
      SELECT 
        user_message,
        ai_response,
        conversation_id,
        model_version,
        response_source,
        created_at
      FROM ai_conversations
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId])

    // Transform to chat message format
    const chatHistory = []
    for (const conv of conversations.rows) {
      // Add user message
      chatHistory.push({
        id: `user_${conv.created_at.getTime()}`,
        role: 'user',
        content: conv.user_message,
        timestamp: conv.created_at,
        conversationId: conv.conversation_id
      })
      
      // Add AI response
      chatHistory.push({
        id: `ai_${conv.created_at.getTime()}`,
        role: 'assistant',
        content: conv.ai_response,
        timestamp: conv.created_at,
        source: conv.response_source,
        modelVersion: conv.model_version,
        conversationId: conv.conversation_id
      })
    }

    // Get conversation statistics
    const stats = await query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT conversation_id) as unique_sessions,
        AVG(LENGTH(ai_response)) as avg_response_length,
        MAX(created_at) as last_conversation
      FROM ai_conversations
      WHERE user_id = $1
    `, [userId])

    return NextResponse.json({
      conversations: chatHistory,
      statistics: stats.rows[0] || {
        total_conversations: 0,
        unique_sessions: 0,
        avg_response_length: 0,
        last_conversation: null
      }
    })

  } catch (error) {
    console.error('Conversation history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation history' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    // Get user ID
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userId = userResult.rows[0].id

    if (conversationId) {
      // Delete specific conversation
      await query(`
        DELETE FROM ai_conversations 
        WHERE user_id = $1 AND conversation_id = $2
      `, [userId, conversationId])
      
      return NextResponse.json({ message: 'Conversation deleted successfully' })
    } else {
      // Delete all conversations (with confirmation)
      const confirmation = searchParams.get('confirm')
      if (confirmation !== 'true') {
        return NextResponse.json({ 
          error: 'Confirmation required. Add ?confirm=true to delete all conversations' 
        }, { status: 400 })
      }
      
      await query(`
        DELETE FROM ai_conversations 
        WHERE user_id = $1
      `, [userId])
      
      return NextResponse.json({ message: 'All conversations deleted successfully' })
    }

  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}