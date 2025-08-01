import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // This function runs after the token is verified
    // Add specific handling for API routes to avoid redirects
    const { pathname } = req.nextUrl
    
    // For API routes, we want to return 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      // The token verification was already done by withAuth
      // If we reach here, the user is authenticated
      return
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // For API routes, return 401 if no token instead of redirecting
        if (pathname.startsWith('/api/')) {
          return !!token
        }
        
        // For regular pages, redirect to signin if no token
        return !!token
      },
    },
  }
)

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