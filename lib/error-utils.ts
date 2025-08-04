// Comprehensive error handling utilities for Echos Of Me
// Designed with grief-sensitive UX principles

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'network' | 'validation' | 'api' | 'auth' | 'storage' | 'system' | 'user'

export interface AppError {
  id: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: Date
  context?: string
  originalError?: Error
  userFriendlyMessage?: string
  actionable?: boolean
  retryable?: boolean
}

// Error classification system
export class ErrorClassifier {
  static classify(error: any, context?: string): AppError {
    const id = generateErrorId()
    const timestamp = new Date()
    
    // Handle different error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        id,
        message: error.message,
        category: 'network',
        severity: 'medium',
        timestamp,
        context,
        originalError: error,
        userFriendlyMessage: 'We\'re having trouble connecting to preserve your memories. Your responses are safe.',
        actionable: true,
        retryable: true
      }
    }

    if (error instanceof Response) {
      const severity = error.status >= 500 ? 'high' : 'medium'
      return {
        id,
        message: `HTTP ${error.status}: ${error.statusText}`,
        category: 'api',
        severity,
        timestamp,
        context,
        userFriendlyMessage: this.getApiErrorMessage(error.status),
        actionable: error.status < 500,
        retryable: error.status >= 500 || error.status === 408 || error.status === 429
      }
    }

    if (error?.code === 'UNAUTHORIZED' || error?.status === 401) {
      return {
        id,
        message: 'Authentication required',
        category: 'auth',
        severity: 'medium',
        timestamp,
        context,
        userFriendlyMessage: 'Please sign in again to continue preserving your legacy.',
        actionable: true,
        retryable: false
      }
    }

    // Validation errors
    if (error?.errors || (typeof error === 'object' && error.message?.includes('validation'))) {
      return {
        id,
        message: error.message || 'Validation failed',
        category: 'validation',
        severity: 'low',
        timestamp,
        context,
        userFriendlyMessage: 'Please check the information you entered and try again.',
        actionable: true,
        retryable: false
      }
    }

    // Storage/persistence errors
    if (error?.message?.includes('storage') || error?.message?.includes('database')) {
      return {
        id,
        message: error.message,
        category: 'storage',
        severity: 'high',
        timestamp,
        context,
        userFriendlyMessage: 'We\'re having trouble saving your precious memories. Please try again.',
        actionable: true,
        retryable: true
      }
    }

    // Default unknown error
    return {
      id,
      message: error?.message || String(error) || 'An unexpected error occurred',
      category: 'system',
      severity: 'medium',
      timestamp,
      context,
      originalError: error instanceof Error ? error : undefined,
      userFriendlyMessage: 'Something unexpected happened. Your memories are safe and we\'re here to help.',
      actionable: true,
      retryable: true
    }
  }

  private static getApiErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'There was an issue with the information provided. Please check and try again.',
      401: 'Please sign in again to continue preserving your legacy.',
      403: 'You don\'t have permission to access this feature.',
      404: 'The requested information couldn\'t be found.',
      408: 'The request timed out. Please try again.',
      409: 'There was a conflict with your request. Please refresh and try again.',
      422: 'The information provided couldn\'t be processed. Please check and try again.',
      429: 'Too many requests. Please wait a moment before trying again.',
      500: 'We\'re experiencing technical difficulties. Your memories are safe.',
      502: 'We\'re having connectivity issues. Please try again shortly.',
      503: 'Our service is temporarily unavailable. Your data is secure.',
      504: 'The request timed out. Please try again.'
    }
    
    return messages[status] || 'We encountered an unexpected issue. Your memories remain safe.'
  }
}

// Error reporting and logging
export class ErrorReporter {
  private static errors: AppError[] = []
  private static readonly MAX_ERRORS = 100

  static report(error: AppError) {
    // Add to local error log
    this.errors.unshift(error)
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(0, this.MAX_ERRORS)
    }

    // Console logging based on severity
    const logMethod = this.getLogMethod(error.severity)
    logMethod(`[${error.category.toUpperCase()}] ${error.message}`, {
      id: error.id,
      context: error.context,
      timestamp: error.timestamp,
      actionable: error.actionable,
      retryable: error.retryable
    })

    // In production, this would integrate with error monitoring services
    if (process.env.NODE_ENV === 'production' && error.severity === 'critical') {
      // Send to error monitoring service (Sentry, LogRocket, etc.)
      console.error('CRITICAL ERROR - This should be sent to monitoring service:', error)
    }
  }

  private static getLogMethod(severity: ErrorSeverity) {
    switch (severity) {
      case 'critical':
      case 'high':
        return console.error
      case 'medium':
        return console.warn
      case 'low':
      default:
        return console.info
    }
  }

  static getRecentErrors(limit: number = 10): AppError[] {
    return this.errors.slice(0, limit)
  }

  static clearErrors() {
    this.errors = []
  }
}

// Error recovery strategies
export class ErrorRecovery {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      delay?: number
      backoff?: boolean
      retryCondition?: (error: any) => boolean
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = true,
      retryCondition = (error) => {
        const classified = ErrorClassifier.classify(error)
        return classified.retryable ?? false
      }
    } = options

    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries || !retryCondition(error)) {
          throw error
        }

        // Calculate delay with optional backoff
        const currentDelay = backoff ? delay * Math.pow(2, attempt) : delay
        await new Promise(resolve => setTimeout(resolve, currentDelay))
      }
    }

    throw lastError
  }

  static async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    condition?: (error: any) => boolean
  ): Promise<T> {
    try {
      return await primary()
    } catch (error) {
      if (condition && !condition(error)) {
        throw error
      }
      
      console.warn('Primary operation failed, attempting fallback:', error)
      return await fallback()
    }
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    })

    return Promise.race([operation(), timeout])
  }
}

// Grief-sensitive error messages
export class GriefSensitiveMessages {
  static getCompassionateMessage(error: AppError): string {
    const baseMessages = {
      network: [
        "We're having trouble connecting right now, but your precious memories are safe with us.",
        "There's a connection hiccup, but don't worry - your responses are securely stored.",
        "We're working to reconnect so you can continue your legacy journey."
      ],
      validation: [
        "Let's take another gentle look at the information together.",
        "There's something we can adjust to make this work perfectly.",
        "Your story matters - let's make sure we capture it just right."
      ],
      api: [
        "We encountered a small bump, but your memories remain safe and sound.",
        "Something needs our attention, but your legacy work is protected.",
        "We're resolving this quickly so you can continue preserving your wisdom."
      ],
      auth: [
        "Let's make sure it's really you so we can protect your precious memories.",
        "We need to verify your identity to keep your legacy secure.",
        "Your privacy and memories are important to us - please sign in again."
      ],
      storage: [
        "We're making sure your memories are saved properly - please try again.",
        "Your stories are too important to lose - we're working to preserve them safely.",
        "Let's ensure your precious responses are stored securely."
      ],
      system: [
        "Something unexpected happened, but your memories are safe with us.",
        "We're here to help you continue your legacy journey.",
        "Your wisdom is precious to us - let's work through this together."
      ],
      user: [
        "We understand this can be frustrating. Let's try a different approach.",
        "Your journey is important to us - let's find another way forward.",
        "Every story deserves to be told - let's work together on this."
      ]
    }

    const messages = baseMessages[error.category] || baseMessages.system
    return messages[Math.floor(Math.random() * messages.length)]
  }

  static getEncouragementMessage(): string {
    const messages = [
      "Every memory you share helps create something beautiful for your loved ones.",
      "Your legacy journey is meaningful - we're honored to help preserve your wisdom.",
      "Each response adds to the irreplaceable gift you're creating for your family.",
      "Your stories matter, and we're here to help you tell them perfectly.",
      "Thank you for trusting us with your precious memories."
    ]
    
    return messages[Math.floor(Math.random() * messages.length)]
  }
}

// Utility functions
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Error handling decorator for async functions
export function handleErrors<T extends any[], R>(
  target: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await target(...args)
    } catch (error) {
      const classifiedError = ErrorClassifier.classify(error, context)
      ErrorReporter.report(classifiedError)
      throw classifiedError
    }
  }
}

// Safe API call wrapper
export async function safeApiCall<T>(
  apiCall: () => Promise<Response>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const response = await apiCall()
    
    if (!response.ok) {
      const error = ErrorClassifier.classify(response, context)
      ErrorReporter.report(error)
      return { data: null, error }
    }
    
    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    const error = ErrorClassifier.classify(err, context)
    ErrorReporter.report(error)
    return { data: null, error }
  }
}