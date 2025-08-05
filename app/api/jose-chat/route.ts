import { NextRequest, NextResponse } from 'next/server'
import { get_jose_response } from '@/lib/jose-inference-engine'

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Get Jose character response
    const joseResponse = await get_jose_response(message)
    
    return NextResponse.json({
      response: joseResponse.response,
      character: 'Jose',
      personality: 'Brooklyn Construction Worker',
      sessionId: sessionId || 'jose-session',
      timestamp: new Date().toISOString(),
      status: joseResponse.status
    })
    
  } catch (error) {
    console.error('Jose chat error:', error)
    return NextResponse.json(
      { error: 'Failed to get Jose response' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    character: 'Jose',
    description: 'Brooklyn construction worker with 20+ years experience',
    personality: 'Hardworking, family-oriented, authentic Brooklyn dialect',
    available: true,
    endpoint: '/api/jose-chat'
  })
}
