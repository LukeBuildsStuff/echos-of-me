import React from 'react'
import { useSession } from 'next-auth/react'

interface ErrorContext {
  userId?: number
  familyId?: number
  sessionId?: string
  userAgent?: string
  url?: string
  component?: string
  action?: string
  additionalData?: Record<string, any>
  emotionalContext?: {
    currentActivity?: string
    conversationContext?: any
    griefState?: string
    memoryBeingAccessed?: string
    aiInteractionType?: string
  }
  technicalContext?: {
    apiEndpoint?: string
    databaseOperation?: string
    modelInference?: boolean
    feature?: string
    memoryStorageType?: string
    voiceProcessingStage?: string
  }
}

interface ErrorLogData {
  title: string
  message: string
  severity?: 'info' | 'warning' | 'critical' | 'emergency'
  categoryCode?: string
  stackTrace?: string
  errorContext?: ErrorContext
  affectedFeature?: string
  familyImpact?: 'none' | 'low' | 'medium' | 'high' | 'severe'
  griefContextDetected?: boolean
  memoryPreservationRisk?: boolean
  conversationContext?: any
  emotionalTriggers?: string[]
  crisisIndicator?: boolean
  escalationUrgency?: 'low' | 'medium' | 'high' | 'critical'
}

class ErrorLogger {
  private static instance: ErrorLogger
  private sessionId: string
  private userId?: number
  private familyId?: number

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupGlobalErrorHandlers()
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setUserContext(userId: number, familyId?: number) {
    this.userId = userId
    this.familyId = familyId
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          title: 'Uncaught JavaScript Error',
          message: event.message || 'Unknown error occurred',
          severity: 'warning',
          categoryCode: 'FRONTEND_ERROR',
          stackTrace: event.error?.stack || '',
          errorContext: {
            userId: this.userId,
            familyId: this.familyId,
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            component: 'Global Error Handler',
            additionalData: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          },
          affectedFeature: this.determineAffectedFeature(window.location.href),
          familyImpact: this.assessFamilyImpact(event.message || '', window.location.href)
        })
      })

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          title: 'Unhandled Promise Rejection',
          message: event.reason?.message || event.reason || 'Promise rejected without handling',
          severity: 'warning',
          categoryCode: 'FRONTEND_ERROR',
          stackTrace: event.reason?.stack || '',
          errorContext: {
            userId: this.userId,
            familyId: this.familyId,
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            url: window.location.href,
            component: 'Promise Handler',
            additionalData: {
              reason: event.reason
            }
          },
          affectedFeature: this.determineAffectedFeature(window.location.href),
          familyImpact: this.assessFamilyImpact(event.reason?.message || '', window.location.href)
        })
      })

      // Handle network errors for fetch requests
      this.interceptFetchErrors()
    }
  }

  private interceptFetchErrors() {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch
      
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args)
          
          // Log API errors
          if (!response.ok) {
            const url = args[0] instanceof Request ? args[0].url : args[0] as string
            
            this.logError({
              title: `API Error: ${response.status} ${response.statusText}`,
              message: `Failed to fetch ${url}`,
              severity: response.status >= 500 ? 'critical' : 'warning',
              categoryCode: 'API_ERROR',
              errorContext: {
                userId: this.userId,
                familyId: this.familyId,
                sessionId: this.sessionId,
                userAgent: navigator.userAgent,
                url: window.location.href,
                component: 'Fetch Interceptor',
                additionalData: {
                  requestUrl: url,
                  status: response.status,
                  statusText: response.statusText
                }
              },
              affectedFeature: this.determineAffectedFeature(url),
              familyImpact: this.assessAPIFamilyImpact(url, response.status)
            })
          }
          
          return response
        } catch (error) {
          const url = args[0] instanceof Request ? args[0].url : args[0] as string
          
          this.logError({
            title: 'Network Error',
            message: error instanceof Error ? error.message : 'Network request failed',
            severity: 'critical',
            categoryCode: 'API_ERROR',
            stackTrace: error instanceof Error ? error.stack : '',
            errorContext: {
              userId: this.userId,
              familyId: this.familyId,
              sessionId: this.sessionId,
              userAgent: navigator.userAgent,
              url: window.location.href,
              component: 'Fetch Interceptor',
              additionalData: {
                requestUrl: url,
                errorName: error instanceof Error ? error.name : 'Unknown'
              }
            },
            affectedFeature: this.determineAffectedFeature(url),
            familyImpact: this.assessAPIFamilyImpact(url, 0)
          })
          
          throw error
        }
      }
    }
  }

  private determineAffectedFeature(url: string): string {
    // Determine which family-facing feature is affected
    if (url.includes('/ai-echo')) return 'AI Echo Conversations'
    if (url.includes('/daily-question')) return 'Daily Reflection'
    if (url.includes('/responses')) return 'Memory Recording'
    if (url.includes('/voice')) return 'Voice Processing'
    if (url.includes('/training')) return 'AI Training'
    if (url.includes('/auth')) return 'Authentication'
    if (url.includes('/dashboard')) return 'Family Dashboard'
    if (url.includes('/admin')) return 'Admin Portal'
    
    return 'Unknown Feature'
  }

  private assessFamilyImpact(message: string, url: string): 'none' | 'low' | 'medium' | 'high' | 'severe' {
    // Assess how much this error affects families emotionally and functionally
    
    // Severe impact: Memory loss, conversation failures, authentication issues
    const severeKeywords = [
      'data loss', 'memory lost', 'conversation failed', 'cannot save', 
      'authentication failed', 'login failed', 'voice lost', 'memories deleted',
      'backup failed', 'storage corruption', 'privacy breach'
    ]
    if (severeKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      return 'severe'
    }
    
    // High impact: AI Echo errors, voice processing failures, daily reflection issues
    if (url.includes('/ai-echo') || url.includes('/voice') || url.includes('/daily-question')) {
      return 'high'
    }
    
    // Medium impact: Dashboard issues, general API failures
    if (url.includes('/dashboard') || url.includes('/api/')) {
      return 'medium'
    }
    
    // Low impact: Admin portal, training issues
    if (url.includes('/admin') || url.includes('/training')) {
      return 'low'
    }
    
    return 'none'
  }

  // Enhanced grief context detection
  private detectGriefContext(message: string, url: string, context?: ErrorContext): boolean {
    const griefKeywords = [
      'memory', 'memorial', 'legacy', 'conversation', 'ai echo', 'family', 'loved one', 
      'remembrance', 'deceased', 'passed away', 'death', 'funeral', 'grief', 'mourning',
      'memories', 'photos', 'videos', 'voice', 'stories', 'heritage', 'ancestry'
    ]
    
    const emotionalKeywords = [
      'heartbreak', 'devastating', 'precious', 'irreplaceable', 'cherished', 'beloved',
      'miss', 'missing', 'lost forever', 'never again', 'final', 'last'
    ]

    const content = `${message} ${url} ${context?.component || ''}`.toLowerCase()
    const griefDetected = griefKeywords.some(keyword => content.includes(keyword))
    const emotionalTriggers = emotionalKeywords.filter(keyword => content.includes(keyword))
    
    return griefDetected || emotionalTriggers.length > 0
  }

  // Assess memory preservation risk
  private assessMemoryPreservationRisk(message: string, url: string, context?: ErrorContext): boolean {
    const memoryRiskKeywords = [
      'storage failed', 'backup failed', 'database corruption', 'file system error',
      'memory storage', 'conversation storage', 'photo storage', 'voice storage',
      'data loss', 'memory lost', 'conversation failed', 'voice lost', 'photos lost'
    ]
    
    const content = `${message} ${context?.technicalContext?.databaseOperation || ''}`.toLowerCase()
    const hasMemoryRisk = memoryRiskKeywords.some(keyword => content.includes(keyword))
    
    // Check if affecting memory-related features
    const memoryFeatures = ['ai-echo', 'voice', 'photos', 'videos', 'memories', 'conversation']
    const affectsMemoryFeature = memoryFeatures.some(feature => url.includes(feature))
    
    return hasMemoryRisk || (affectsMemoryFeature && message.toLowerCase().includes('fail'))
  }

  // Detect crisis indicators
  private detectCrisisIndicators(errorData: Partial<ErrorLogData>): {
    crisisIndicator: boolean
    escalationUrgency: 'low' | 'medium' | 'high' | 'critical'
    emotionalTriggers: string[]
  } {
    const criticalKeywords = [
      'data loss', 'memory lost', 'conversation failed', 'cannot access', 
      'authentication failed', 'privacy breach', 'unauthorized access',
      'memories deleted', 'photos lost', 'voice lost', 'stories deleted'
    ]
    
    const emotionalKeywords = [
      'heartbreak', 'devastating', 'precious', 'irreplaceable', 'cherished'
    ]

    const content = `${errorData.title || ''} ${errorData.message || ''}`.toLowerCase()
    const hasCriticalKeywords = criticalKeywords.some(keyword => content.includes(keyword))
    const emotionalTriggers = emotionalKeywords.filter(keyword => content.includes(keyword))
    
    let escalationUrgency: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let crisisIndicator = false

    if (errorData.severity === 'emergency' || hasCriticalKeywords) {
      escalationUrgency = 'critical'
      crisisIndicator = true
    } else if (errorData.severity === 'critical' && errorData.familyImpact === 'severe') {
      escalationUrgency = 'high'
      crisisIndicator = true
    } else if (errorData.familyImpact === 'high' && errorData.memoryPreservationRisk) {
      escalationUrgency = 'medium'
      crisisIndicator = true
    }

    return { crisisIndicator, escalationUrgency, emotionalTriggers }
  }

  private assessAPIFamilyImpact(url: string, status: number): 'none' | 'low' | 'medium' | 'high' | 'severe' {
    // Critical family features
    const criticalEndpoints = ['/ai-echo/', '/responses/', '/voice/', '/daily-status/']
    const importantEndpoints = ['/auth/', '/questions/', '/milestones/']
    
    if (criticalEndpoints.some(endpoint => url.includes(endpoint))) {
      return status >= 500 ? 'severe' : 'high'
    }
    
    if (importantEndpoints.some(endpoint => url.includes(endpoint))) {
      return status >= 500 ? 'high' : 'medium'
    }
    
    if (url.includes('/admin/')) {
      return 'low'
    }
    
    return 'none'
  }

  async logError(errorData: ErrorLogData): Promise<void> {
    try {
      const currentUrl = errorData.errorContext?.url || (typeof window !== 'undefined' ? window.location.href : '')
      
      // Enhanced grief-sensitive analysis
      const griefContextDetected = this.detectGriefContext(
        errorData.message, 
        currentUrl, 
        errorData.errorContext
      )
      
      const memoryPreservationRisk = this.assessMemoryPreservationRisk(
        errorData.message, 
        currentUrl, 
        errorData.errorContext
      )
      
      const crisisAnalysis = this.detectCrisisIndicators({
        ...errorData,
        griefContextDetected,
        memoryPreservationRisk
      })

      // Prepare enhanced error log data
      const logData = {
        ...errorData,
        griefContextDetected,
        memoryPreservationRisk,
        crisisIndicator: crisisAnalysis.crisisIndicator,
        escalationUrgency: crisisAnalysis.escalationUrgency,
        emotionalTriggers: crisisAnalysis.emotionalTriggers,
        errorContext: {
          ...errorData.errorContext,
          userId: errorData.errorContext?.userId || this.userId,
          familyId: errorData.errorContext?.familyId || this.familyId,
          sessionId: errorData.errorContext?.sessionId || this.sessionId,
          userAgent: errorData.errorContext?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
          url: currentUrl,
          timestamp: new Date().toISOString()
        },
        // Include conversation context if this is a conversation-related error
        conversationContext: errorData.errorContext?.emotionalContext?.conversationContext
      }

      // Send to error logging API
      const response = await fetch('/api/admin/error-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
      })

      if (!response.ok) {
        throw new Error(`Error logging API failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      // Handle crisis escalation
      if (result.data?.crisisIndicator && result.data?.crisisLevel === 'critical') {
        this.handleCrisisEscalation(result.data)
      }

      // In development, also log to console for debugging
      if (process.env.NODE_ENV === 'development') {
        console.group(`🚨 Family Guardian Error: ${errorData.title}`)
        console.error('Message:', errorData.message)
        console.error('Severity:', errorData.severity)
        console.error('Family Impact:', errorData.familyImpact)
        console.error('Grief Context:', griefContextDetected)
        console.error('Memory Risk:', memoryPreservationRisk)
        console.error('Crisis Indicator:', crisisAnalysis.crisisIndicator)
        console.error('Escalation Urgency:', crisisAnalysis.escalationUrgency)
        console.error('Affected Feature:', errorData.affectedFeature)
        console.error('Context:', errorData.errorContext)
        if (errorData.stackTrace) {
          console.error('Stack Trace:', errorData.stackTrace)
        }
        console.groupEnd()
      }

    } catch (loggingError) {
      // Fallback logging to console if API fails
      console.error('Failed to log error to monitoring system:', loggingError)
      console.error('Original error:', errorData)
    }
  }

  private handleCrisisEscalation(crisisData: any) {
    console.warn('🚨 CRISIS ESCALATION DETECTED:', crisisData)
    
    // If in browser, could show crisis support UI
    if (typeof window !== 'undefined') {
      // Dispatch custom event for crisis handling
      window.dispatchEvent(new CustomEvent('family-crisis-detected', { 
        detail: crisisData 
      }))
      
      // Could also show immediate support notification
      if (crisisData.memoryPreservationRisk) {
        console.warn('⚠️ Memory preservation at risk - family support activated')
      }
    }
  }

  // Convenience methods for common error types
  logUserError(title: string, message: string, context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: 'warning',
      categoryCode: 'FRONTEND_ERROR',
      familyImpact: 'low',
      errorContext: context
    })
  }

  logCriticalError(title: string, message: string, stackTrace?: string, context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: 'critical',
      categoryCode: 'FRONTEND_ERROR',
      stackTrace,
      familyImpact: 'high',
      errorContext: context
    })
  }

  logFamilyImpactError(title: string, message: string, impact: 'low' | 'medium' | 'high' | 'severe', context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: impact === 'severe' ? 'emergency' : impact === 'high' ? 'critical' : 'warning',
      categoryCode: 'FAMILY_IMPACT',
      familyImpact: impact,
      errorContext: context
    })
  }

  logAPIError(url: string, status: number, message: string, context?: Partial<ErrorContext>) {
    this.logError({
      title: `API Error: ${status}`,
      message: `${url}: ${message}`,
      severity: status >= 500 ? 'critical' : 'warning',
      categoryCode: 'API_ERROR',
      familyImpact: this.assessAPIFamilyImpact(url, status),
      affectedFeature: this.determineAffectedFeature(url),
      errorContext: {
        ...context,
        additionalData: {
          ...context?.additionalData,
          requestUrl: url,
          statusCode: status
        }
      }
    })
  }

  // New grief-sensitive convenience methods
  logMemoryPreservationError(title: string, message: string, context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: 'critical',
      categoryCode: 'MEMORY_ERROR',
      familyImpact: 'severe',
      memoryPreservationRisk: true,
      griefContextDetected: true,
      errorContext: {
        ...context,
        emotionalContext: {
          ...context?.emotionalContext,
          memoryBeingAccessed: context?.emotionalContext?.memoryBeingAccessed || 'unknown'
        }
      }
    })
  }

  logConversationError(title: string, message: string, conversationContext?: any, context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: 'critical',
      categoryCode: 'CONVERSATION_FAIL',
      familyImpact: 'high',
      griefContextDetected: true,
      conversationContext,
      affectedFeature: 'AI Echo Conversations',
      errorContext: {
        ...context,
        emotionalContext: {
          ...context?.emotionalContext,
          conversationContext,
          aiInteractionType: 'ai-echo'
        }
      }
    })
  }

  logVoiceProcessingError(title: string, message: string, stage?: string, context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: 'warning',
      categoryCode: 'VOICE_ERROR',
      familyImpact: 'medium',
      griefContextDetected: true,
      affectedFeature: 'Voice Processing',
      errorContext: {
        ...context,
        technicalContext: {
          ...context?.technicalContext,
          voiceProcessingStage: stage,
          feature: 'voice'
        }
      }
    })
  }

  logDatabaseError(operation: string, message: string, tableName?: string, context?: Partial<ErrorContext>) {
    const isMemoryRelated = tableName && [
      'conversations', 'memories', 'photos', 'videos', 'voice_recordings', 'life_stories'
    ].some(table => tableName.includes(table))

    this.logError({
      title: `Database Error: ${operation}`,
      message,
      severity: isMemoryRelated ? 'critical' : 'warning',
      categoryCode: 'DB_ERROR',
      familyImpact: isMemoryRelated ? 'high' : 'medium',
      memoryPreservationRisk: isMemoryRelated,
      griefContextDetected: isMemoryRelated,
      errorContext: {
        ...context,
        technicalContext: {
          ...context?.technicalContext,
          databaseOperation: `${operation} on ${tableName || 'unknown_table'}`,
          memoryStorageType: tableName
        }
      }
    })
  }

  logAuthenticationError(title: string, message: string, context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: 'critical',
      categoryCode: 'AUTH_FAIL',
      familyImpact: 'high',
      errorContext: {
        ...context,
        technicalContext: {
          ...context?.technicalContext,
          feature: 'authentication'
        }
      }
    })
  }

  logCrisisDetected(title: string, message: string, griefState?: string, context?: Partial<ErrorContext>) {
    this.logError({
      title,
      message,
      severity: 'emergency',
      categoryCode: 'GRIEF_CRISIS',
      familyImpact: 'severe',
      griefContextDetected: true,
      crisisIndicator: true,
      escalationUrgency: 'critical',
      errorContext: {
        ...context,
        emotionalContext: {
          ...context?.emotionalContext,
          griefState: griefState || 'crisis_detected'
        }
      }
    })
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance()

// React hook for easy integration with enhanced grief-sensitive methods
export function useErrorLogger() {
  const { data: session } = useSession()
  
  React.useEffect(() => {
    if (session?.user) {
      errorLogger.setUserContext(session.user.id, session.user.familyId)
    }
  }, [session])

  return {
    // Core error logging
    logError: errorLogger.logError.bind(errorLogger),
    logUserError: errorLogger.logUserError.bind(errorLogger),
    logCriticalError: errorLogger.logCriticalError.bind(errorLogger),
    logFamilyImpactError: errorLogger.logFamilyImpactError.bind(errorLogger),
    logAPIError: errorLogger.logAPIError.bind(errorLogger),
    
    // Grief-sensitive specialized methods
    logMemoryPreservationError: errorLogger.logMemoryPreservationError.bind(errorLogger),
    logConversationError: errorLogger.logConversationError.bind(errorLogger),
    logVoiceProcessingError: errorLogger.logVoiceProcessingError.bind(errorLogger),
    logDatabaseError: errorLogger.logDatabaseError.bind(errorLogger),
    logAuthenticationError: errorLogger.logAuthenticationError.bind(errorLogger),
    logCrisisDetected: errorLogger.logCrisisDetected.bind(errorLogger)
  }
}

// For server-side error logging
export class ServerErrorLogger {
  static async logServerError(errorData: ErrorLogData, request?: Request) {
    try {
      const serverContext = {
        ...errorData.errorContext,
        serverInstance: process.env.SERVER_INSTANCE || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        requestUrl: request?.url,
        requestMethod: request?.method,
        requestHeaders: request ? Object.fromEntries(request.headers.entries()) : undefined,
        timestamp: new Date().toISOString()
      }

      // In a real deployment, this would use a direct database connection
      // For now, we'll use the internal API
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/error-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...errorData,
          errorContext: serverContext
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to log server error: ${response.statusText}`)
      }

    } catch (loggingError) {
      // Fallback to console logging
      console.error('Failed to log server error:', loggingError)
      console.error('Original error:', errorData)
    }
  }
}

export default errorLogger