# Authentication Middleware Fix Guide

## Problem Summary
The AI chat functionality was blocked because NextAuth middleware was redirecting API calls (307 redirects) to the signin page instead of returning proper 401 unauthorized responses.

## Root Cause
- The original middleware used `withAuth` wrapper for all routes
- `withAuth` is designed for page protection and automatically redirects to signin
- API routes need different handling - they should return 401 JSON responses, not redirects

## Fix Implementation

### 1. Updated Middleware (`/middleware.ts`)
**Before:** Used `withAuth` for all routes, causing API redirects
**After:** Split handling between API routes and page routes

```typescript
// API routes: Return 401 JSON response
if (pathname.startsWith('/api/')) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
  }
  return NextResponse.next()
}

// Page routes: Use standard withAuth (redirects to signin)
return withAuth(/* standard behavior */)(req)
```

### 2. Fixed Environment Variable
**Before:** `NEXTAUTH_URL=http://localhost:3001`
**After:** `NEXTAUTH_URL=http://localhost:3000` (matches dev server port)

## Testing the Fix

### Quick Test
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Run the authentication test:
   ```bash
   node test-auth-fix.js
   ```

**Expected Results:**
- ✅ All API endpoints return `401 Unauthorized` (not 307 redirect)
- ✅ Error messages are JSON format: `{"error": "Unauthorized - Please sign in"}`
- ❌ No more redirects to `/auth/signin`

### Manual Browser Test
1. Open browser dev tools (Network tab)
2. Go to `http://localhost:3000/ai-echo` (without signing in)
3. Try to send a chat message
4. Check network requests:
   - API calls should return `401` status
   - No redirects to signin page
   - Chat interface should show "Please sign in" message

### Full Integration Test
1. Sign in to the application
2. Go to AI Echo chat page
3. Send a message to Luke's AI
4. Verify:
   - ✅ Message sends successfully
   - ✅ AI responds (using trained model or fallback)
   - ✅ No authentication errors
   - ✅ Session maintains properly

## What This Fixes

### Before the Fix:
- `/api/ai-echo/chat` → 307 redirect to `/auth/signin`
- `/api/ai-echo/stream` → 307 redirect to `/auth/signin`
- `/api/ai-echo/sessions` → 307 redirect to `/auth/signin`
- Chat interface couldn't communicate with backend

### After the Fix:
- `/api/ai-echo/chat` → 401 JSON response when unauthenticated
- `/api/ai-echo/stream` → 401 JSON response when unauthenticated
- `/api/ai-echo/sessions` → 401 JSON response when unauthenticated
- Authenticated requests work normally
- Chat interface can handle auth errors gracefully

## Technical Details

### API Authentication Flow
1. Request hits middleware
2. Middleware extracts JWT token using `getToken()`
3. If no token: Return 401 JSON response
4. If valid token: Allow request to continue to API handler
5. API handler gets session with `getServerSession()`
6. API processes request normally

### Page Authentication Flow
1. Request hits middleware
2. Non-API routes use standard `withAuth` behavior
3. If no token: Redirect to `/auth/signin`
4. If valid token: Allow access to protected pages

## Benefits
- ✅ API routes return proper HTTP status codes
- ✅ Frontend can handle authentication errors gracefully
- ✅ No more unexpected redirects during API calls
- ✅ Maintains existing page protection behavior
- ✅ Better debugging and error tracking
- ✅ Follows REST API best practices

## Next Steps for Luke
1. **Test the fix:** Run `node test-auth-fix.js` after starting dev server
2. **Try the AI chat:** Sign in and test conversation with your trained AI
3. **Verify voice features:** Test voice synthesis if available
4. **Check session management:** Ensure sessions persist correctly

The authentication barrier is now removed - you should be able to chat with your trained AI echo immediately after signing in!