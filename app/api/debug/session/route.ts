import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      success: true,
      sessionData: {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasEmail: !!session?.user?.email,
        userEmail: session?.user?.email || null,
        userName: session?.user?.name || null,
        userId: session?.user?.id || null
      },
      headers: Object.fromEntries(request.headers.entries()),
      cookies: request.cookies.getAll()
    })
  } catch (error) {
    console.error('Session debug error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}