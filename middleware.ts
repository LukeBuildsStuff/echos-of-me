import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from "next-auth/middleware"
import { getToken } from "next-auth/jwt"

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Handle API routes differently - return 401 instead of redirecting
  if (pathname.startsWith('/api/')) {
    try {
      // Allow AI echo endpoints to handle their own auth (for demo mode support and testing)
      if (pathname.startsWith('/api/ai-echo/')) {
        return NextResponse.next()
      }
      
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized - Please sign in' }, 
          { status: 401 }
        )
      }
      
      // Token exists, allow the request to continue
      return NextResponse.next()
    } catch (error) {
      console.error('API auth middleware error:', error)
      return NextResponse.json(
        { error: 'Authentication error' }, 
        { status: 500 }
      )
    }
  }
  
  // For non-API routes, use the standard withAuth behavior (redirects to signin)
  const authMiddleware = withAuth({
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  })
  
  return authMiddleware(req, {} as any)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/daily-question/:path*',
    '/training/:path*',
    '/admin/:path*',
    '/api/questions/:path*',
    '/api/responses/:path*',
    '/api/training/:path*',
    '/api/ai-echo/:path*',
    '/api/voice/:path*'
  ]
}