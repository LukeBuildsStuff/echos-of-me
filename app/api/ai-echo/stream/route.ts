import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { lukeAIModelEngine } from '@/lib/luke-ai-model-engine'

/**
 * Streaming AI Echo Chat API
 * 
 * Provides real-time streaming responses for enhanced user experience
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, sessionId, settings } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user ID
    const userResult = await query(
      'SELECT id, name FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = userResult.rows[0]

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // Send initial connection event
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send connection established
        sendEvent('connected', { 
          sessionId: sessionId || 'new',
          userId: user.id,
          timestamp: new Date().toISOString()
        })

        // Start chat session if needed
        let chatSession: any = null
        
        const initializeChat = async () => {
          try {
            // Start Luke's AI model if not already loaded
            if (!lukeAIModelEngine.isReady()) {
              sendEvent('status', { message: 'Loading Luke\'s AI model...' })
              await lukeAIModelEngine.startLukeAI()
            }

            if (sessionId) {
              chatSession = lukeAIModelEngine.getChatSession(sessionId)
            }
            
            if (!chatSession) {
              chatSession = await lukeAIModelEngine.createChatSession(
                `Chat ${new Date().toLocaleString()}`
              )
              
              sendEvent('session_created', {
                sessionId: chatSession.id,
                title: chatSession.title
              })
            }

            // Send message and get streaming response from Luke's trained model
            const response = await lukeAIModelEngine.sendMessage(
              chatSession.id,
              message,
              (chunk) => {
                // Send streaming chunk
                sendEvent('chunk', {
                  content: chunk.content,
                  isComplete: chunk.isComplete,
                  metadata: chunk.metadata
                })
              }
            )

            // Send final response
            sendEvent('complete', {
              response: response.content,
              metadata: response.metadata,
              sessionId: chatSession.id
            })

            // Close the stream
            sendEvent('end', { success: true })
            controller.close()

          } catch (error) {
            console.error('Luke AI streaming error:', error)
            sendEvent('error', {
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            })
            controller.close()
          }
        }

        // Start the chat process
        initializeChat()
      },

      cancel() {
        console.log('Stream cancelled by client')
      }
    })

    // Return streaming response with appropriate headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })

  } catch (error) {
    console.error('Streaming API error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize streaming chat' },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}