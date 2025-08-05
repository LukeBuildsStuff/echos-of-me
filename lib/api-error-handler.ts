import { NextRequest, NextResponse } from 'next/server'
import { ServerErrorLogger } from './error-logging'

interface APIErrorContext {
  endpoint: string
  method: string
  userId?: number
  familyId?: number
  requestId?: string
  additionalData?: Record<string, any>
}

export class APIError extends Error {
  public statusCode: number
  public familyImpact: 'none' | 'low' | 'medium' | 'high' | 'severe'
  public categoryCode: string
  public context?: APIErrorContext

  constructor(
    message: string,
    statusCode: number = 500,
    familyImpact: 'none' | 'low' | 'medium' | 'high' | 'severe' = 'low',
    categoryCode: string = 'API_ERROR',
    context?: APIErrorContext
  ) {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.familyImpact = familyImpact
    this.categoryCode = categoryCode
    this.context = context
  }
}

// Specific error types for different scenarios
export class DatabaseError extends APIError {
  constructor(message: string, context?: APIErrorContext) {
    super(message, 500, 'high', 'DB_ERROR', context)
    this.name = 'DatabaseError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication failed', context?: APIErrorContext) {
    super(message, 401, 'medium', 'AUTH_FAIL', context)
    this.name = 'AuthenticationError'
  }
}

export class FamilyDataError extends APIError {
  constructor(message: string, impact: 'medium' | 'high' | 'severe' = 'high', context?: APIErrorContext) {
    super(message, 500, impact, 'MEMORY_ERROR', context)
    this.name = 'FamilyDataError'
  }
}

export class AIModelError extends APIError {
  constructor(message: string, context?: APIErrorContext) {
    super(message, 500, 'high', 'AI_ERROR', context)
    this.name = 'AIModelError'
  }
}

export class VoiceProcessingError extends APIError {
  constructor(message: string, context?: APIErrorContext) {
    super(message, 500, 'medium', 'VOICE_ERROR', context)
    this.name = 'VoiceProcessingError'
  }
}

export class CrisisDetectionError extends APIError {
  constructor(message: string, context?: APIErrorContext) {
    super(message, 500, 'severe', 'CRISIS_ERROR', context)
    this.name = 'CrisisDetectionError'
  }
}

export class PrivacyBreachError extends APIError {
  constructor(message: string, context?: APIErrorContext) {
    super(message, 500, 'severe', 'PRIVACY_BREACH', context)
    this.name = 'PrivacyBreachError'
  }
}

// Error handler middleware for API routes
export function withErrorHandler<T>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      return await handler(request, context)
    } catch (error) {
      console.error(`API Error [${requestId}]:`, error)
      
      // Extract user context from request if available
      let userId: number | undefined
      let familyId: number | undefined
      
      try {
        // Try to get session info from headers or cookies
        const sessionData = await extractSessionFromRequest(request)
        userId = sessionData?.userId
        familyId = sessionData?.familyId
      } catch (sessionError) {
        // Session extraction failed, continue without user context
      }

      const errorContext: APIErrorContext = {
        endpoint: new URL(request.url).pathname,
        method: request.method,
        userId,
        familyId,
        requestId,
        additionalData: {
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
          timestamp: new Date().toISOString()
        }
      }

      // Handle different error types
      if (error instanceof APIError) {
        // Log the error with family-sensitive context
        await ServerErrorLogger.logServerError({
          title: `${error.name}: ${error.message}`,
          message: error.message,
          severity: error.familyImpact === 'severe' ? 'emergency' : 
                   error.familyImpact === 'high' ? 'critical' : 'warning',
          categoryCode: error.categoryCode,
          stackTrace: error.stack,
          familyImpact: error.familyImpact,
          affectedFeature: determineAffectedFeature(errorContext.endpoint),
          errorContext: {
            ...error.context,
            ...errorContext
          }
        }, request)

        return NextResponse.json(
          {
            error: error.message,
            familyImpact: error.familyImpact,
            supportMessage: getFamilySupportMessage(error.familyImpact),
            requestId
          },
          { 
            status: error.statusCode,
            headers: {
              'X-Request-ID': requestId,
              'X-Family-Impact': error.familyImpact
            }
          }
        )
      } else {
        // Handle unexpected errors
        const familyImpact = assessUnknownErrorFamilyImpact(errorContext.endpoint, error)
        
        await ServerErrorLogger.logServerError({
          title: 'Unexpected Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          severity: familyImpact === 'severe' ? 'emergency' : 'critical',
          categoryCode: 'SERVER_ERROR',
          stackTrace: error instanceof Error ? error.stack : '',
          familyImpact,
          affectedFeature: determineAffectedFeature(errorContext.endpoint),
          errorContext
        }, request)

        return NextResponse.json(
          {
            error: 'An unexpected error occurred',
            familyImpact,
            supportMessage: getFamilySupportMessage(familyImpact),
            requestId
          },
          { 
            status: 500,
            headers: {
              'X-Request-ID': requestId,
              'X-Family-Impact': familyImpact
            }
          }
        )
      }
    }
  }
}

async function extractSessionFromRequest(request: NextRequest): Promise<{ userId?: number, familyId?: number } | null> {
  // This is a simplified session extraction
  // In a real implementation, you'd properly decode the session token
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      // Extract user info from auth header if available
      // This would need to be implemented based on your auth system
    }
    
    // For now, return null - session extraction would be implemented based on your auth system
    return null
  } catch (error) {
    return null
  }
}

function determineAffectedFeature(endpoint: string): string {
  if (endpoint.includes('/ai-echo')) return 'AI Echo Conversations'
  if (endpoint.includes('/daily-status')) return 'Daily Reflection'
  if (endpoint.includes('/responses')) return 'Memory Recording'
  if (endpoint.includes('/voice')) return 'Voice Processing'
  if (endpoint.includes('/training')) return 'AI Training'
  if (endpoint.includes('/auth')) return 'Authentication'
  if (endpoint.includes('/questions')) return 'Question Generation'
  if (endpoint.includes('/milestones')) return 'Milestone Tracking'
  if (endpoint.includes('/admin')) return 'Admin Portal'
  
  return 'Unknown Feature'
}

function assessUnknownErrorFamilyImpact(endpoint: string, error: unknown): 'none' | 'low' | 'medium' | 'high' | 'severe' {
  // Critical family endpoints
  const criticalEndpoints = ['/ai-echo/', '/responses/', '/voice/', '/daily-status/']
  const importantEndpoints = ['/auth/', '/questions/', '/milestones/']
  
  // Database errors affecting family data are severe
  if (error instanceof Error && error.message.toLowerCase().includes('database')) {
    if (criticalEndpoints.some(ep => endpoint.includes(ep))) {
      return 'severe'
    }
    return 'high'
  }
  
  // Memory or conversation-related errors are high impact
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('memory') || message.includes('conversation') || message.includes('save')) {
      return 'high'
    }
  }
  
  if (criticalEndpoints.some(ep => endpoint.includes(ep))) {
    return 'high'
  }
  
  if (importantEndpoints.some(ep => endpoint.includes(ep))) {
    return 'medium'
  }
  
  if (endpoint.includes('/admin/')) {
    return 'low'
  }
  
  return 'medium'
}

function getFamilySupportMessage(familyImpact: 'none' | 'low' | 'medium' | 'high' | 'severe'): string {
  switch (familyImpact) {
    case 'severe':
      return 'We understand this affects something precious to your family. Our support team has been notified and will reach out with compassionate assistance.'
    case 'high':
      return 'This issue may affect your family memories. We\'re working to resolve it quickly and will update you with care.'
    case 'medium':
      return 'We\'re working to resolve this issue promptly. Your family\'s experience is important to us.'
    case 'low':
      return 'We\'re addressing this technical issue. Thank you for your patience.'
    case 'none':
    default:
      return 'We\'re working to resolve this issue.'
  }
}

// Helper functions for common scenarios
export function handleDatabaseError(error: unknown, context?: Partial<APIErrorContext>): never {
  const message = error instanceof Error ? error.message : 'Database operation failed'
  throw new DatabaseError(`Database error: ${message}`, context as APIErrorContext)
}

export function handleAuthError(message: string = 'Authentication required', context?: Partial<APIErrorContext>): never {
  throw new AuthenticationError(message, context as APIErrorContext)
}

export function handleFamilyDataError(message: string, impact: 'medium' | 'high' | 'severe' = 'high', context?: Partial<APIErrorContext>): never {
  throw new FamilyDataError(message, impact, context as APIErrorContext)
}

export function handleAIError(message: string, context?: Partial<APIErrorContext>): never {
  throw new AIModelError(message, context as APIErrorContext)
}

export function handleVoiceError(message: string, context?: Partial<APIErrorContext>): never {
  throw new VoiceProcessingError(message, context as APIErrorContext)
}

export function handleCrisisError(message: string, context?: Partial<APIErrorContext>): never {
  throw new CrisisDetectionError(message, context as APIErrorContext)
}

export function handlePrivacyError(message: string, context?: Partial<APIErrorContext>): never {
  throw new PrivacyBreachError(message, context as APIErrorContext)
}

export default withErrorHandler