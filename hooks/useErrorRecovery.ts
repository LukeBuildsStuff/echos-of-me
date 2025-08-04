'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  backoffMultiplier: number
  maxDelay: number
  shouldRetry?: (error: Error, attempt: number) => boolean
}

export interface ErrorRecoveryState {
  error: Error | null
  isRetrying: boolean
  attemptCount: number
  lastAttemptTime: number | null
  nextRetryTime: number | null
  isRecoverable: boolean
  canRetry: boolean
}

export interface ErrorRecoveryOptions {
  retryConfig?: Partial<RetryConfig>
  persistErrors?: boolean
  storageKey?: string
  onError?: (error: Error, state: ErrorRecoveryState) => void
  onRetry?: (attempt: number) => void
  onRecovery?: () => void
  fallbackMode?: boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  shouldRetry: (error: Error, attempt: number) => {
    // Don't retry on authentication errors or client errors (4xx)
    if (error.message.includes('401') || error.message.includes('403')) return false
    if (error.message.includes('400') || error.message.includes('404')) return false
    
    // Retry on network errors and server errors (5xx)
    return attempt < 3
  }
}

// Hook for automatic retry with exponential backoff
export function useAutoRetry<T>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
) {
  const {
    retryConfig: partialRetryConfig,
    persistErrors = false,
    storageKey = 'error-recovery-state',
    onError,
    onRetry,
    onRecovery,
    fallbackMode = false
  } = options

  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...partialRetryConfig }
  const { toast } = useToast()
  
  const [state, setState] = useState<ErrorRecoveryState>(() => {
    if (persistErrors && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = JSON.parse(saved)
          return {
            error: parsed.error ? new Error(parsed.error.message) : null,
            isRetrying: false,
            attemptCount: parsed.attemptCount || 0,
            lastAttemptTime: parsed.lastAttemptTime || null,
            nextRetryTime: null,
            isRecoverable: parsed.isRecoverable || false,
            canRetry: parsed.canRetry || false
          }
        }
      } catch (e) {
        console.warn('Failed to load persisted error state:', e)
      }
    }
    
    return {
      error: null,
      isRetrying: false,
      attemptCount: 0,
      lastAttemptTime: null,
      nextRetryTime: null,
      isRecoverable: false,
      canRetry: false
    }
  })

  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const isExecutingRef = useRef(false)

  // Persist error state
  useEffect(() => {
    if (persistErrors && typeof window !== 'undefined') {
      try {
        const toSave = {
          error: state.error ? { message: state.error.message } : null,
          attemptCount: state.attemptCount,
          lastAttemptTime: state.lastAttemptTime,
          isRecoverable: state.isRecoverable,
          canRetry: state.canRetry
        }
        localStorage.setItem(storageKey, JSON.stringify(toSave))
      } catch (e) {
        console.warn('Failed to persist error state:', e)
      }
    }
  }, [state, persistErrors, storageKey])

  const calculateDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
      retryConfig.maxDelay
    )
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }, [retryConfig])

  const executeWithRetry = useCallback(async (): Promise<T> => {
    if (isExecutingRef.current) {
      throw new Error('Operation already in progress')
    }

    isExecutingRef.current = true

    try {
      const result = await operation()
      
      // Success - reset error state
      setState(prev => ({
        ...prev,
        error: null,
        isRetrying: false,
        attemptCount: 0,
        lastAttemptTime: null,
        nextRetryTime: null,
        isRecoverable: false,
        canRetry: false
      }))

      if (state.error && onRecovery) {
        onRecovery()
        toast({
          title: "Connection Restored",
          description: "Operation completed successfully after recovery.",
          variant: "success"
        })
      }

      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const newAttemptCount = state.attemptCount + 1
      const canRetry = newAttemptCount < retryConfig.maxAttempts && 
                      (retryConfig.shouldRetry?.(err, newAttemptCount) ?? true)
      
      const newState: ErrorRecoveryState = {
        error: err,
        isRetrying: false,
        attemptCount: newAttemptCount,
        lastAttemptTime: Date.now(),
        nextRetryTime: null,
        isRecoverable: canRetry || fallbackMode,
        canRetry
      }

      setState(newState)
      
      if (onError) {
        onError(err, newState)
      }

      // Auto-retry if possible
      if (canRetry) {
        const delay = calculateDelay(newAttemptCount)
        const nextRetryTime = Date.now() + delay
        
        setState(prev => ({
          ...prev,
          isRetrying: true,
          nextRetryTime
        }))

        if (onRetry) {
          onRetry(newAttemptCount)
        }

        toast({
          title: "Operation Failed",
          description: `Retrying in ${Math.round(delay / 1000)} seconds... (Attempt ${newAttemptCount}/${retryConfig.maxAttempts})`,
          variant: "destructive"
        })

        retryTimeoutRef.current = setTimeout(() => {
          isExecutingRef.current = false
          executeWithRetry()
        }, delay)
      } else {
        toast({
          title: "Operation Failed",
          description: fallbackMode 
            ? `${err.message}. Switching to offline mode.`
            : `${err.message}. Please try again manually.`,
          variant: "destructive",
          action: canRetry ? {
            label: "Retry Now",
            onClick: () => manualRetry()
          } : undefined
        })
      }

      throw err
    } finally {
      if (!state.isRetrying) {
        isExecutingRef.current = false
      }
    }
  }, [operation, state, retryConfig, calculateDelay, onError, onRetry, onRecovery, fallbackMode, toast])

  const manualRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    
    setState(prev => ({
      ...prev,
      isRetrying: false,
      nextRetryTime: null
    }))

    isExecutingRef.current = false
    return executeWithRetry()
  }, [executeWithRetry])

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    
    setState({
      error: null,
      isRetrying: false,
      attemptCount: 0,
      lastAttemptTime: null,
      nextRetryTime: null,
      isRecoverable: false,
      canRetry: false
    })

    if (persistErrors && typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }

    isExecutingRef.current = false
  }, [persistErrors, storageKey])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    execute: executeWithRetry,
    manualRetry,
    reset,
    timeUntilNextRetry: state.nextRetryTime ? Math.max(0, state.nextRetryTime - Date.now()) : 0
  }
}

// Hook for graceful degradation
export function useGracefulDegradation<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation?: () => Promise<T> | T,
  options: {
    fallbackDelay?: number
    onFallback?: (error: Error) => void
    onRestore?: () => void
  } = {}
) {
  const { fallbackDelay = 5000, onFallback, onRestore } = options
  const [isFallbackMode, setIsFallbackMode] = useState(false)
  const [lastError, setLastError] = useState<Error | null>(null)
  const { toast } = useToast()

  const execute = useCallback(async (): Promise<T> => {
    try {
      const result = await primaryOperation()
      
      // If we were in fallback mode and primary succeeded, restore
      if (isFallbackMode) {
        setIsFallbackMode(false)
        setLastError(null)
        if (onRestore) {
          onRestore()
        }
        toast({
          title: "Service Restored",
          description: "Primary service is now available.",
          variant: "success"
        })
      }
      
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setLastError(err)
      
      if (fallbackOperation && !isFallbackMode) {
        setIsFallbackMode(true)
        
        if (onFallback) {
          onFallback(err)
        }
        
        toast({
          title: "Service Unavailable",
          description: "Switching to offline mode with limited functionality.",
          variant: "warning"
        })

        // Try fallback after delay
        setTimeout(async () => {
          try {
            return await fallbackOperation()
          } catch (fallbackError) {
            console.error('Fallback operation also failed:', fallbackError)
            throw err // Throw original error
          }
        }, fallbackDelay)
      }
      
      throw err
    }
  }, [primaryOperation, fallbackOperation, isFallbackMode, fallbackDelay, onFallback, onRestore, toast])

  return {
    execute,
    isFallbackMode,
    lastError,
    reset: () => {
      setIsFallbackMode(false)
      setLastError(null)
    }
  }
}

// Hook for circuit breaker pattern
export function useCircuitBreaker<T>(
  operation: () => Promise<T>,
  options: {
    failureThreshold: number
    resetTimeout: number
    monitoringPeriod: number
    onStateChange?: (state: 'closed' | 'open' | 'half-open') => void
  }
) {
  const { failureThreshold, resetTimeout, monitoringPeriod, onStateChange } = options
  const [state, setState] = useState<'closed' | 'open' | 'half-open'>('closed')
  const [failureCount, setFailureCount] = useState(0)
  const [lastFailureTime, setLastFailureTime] = useState<number | null>(null)
  const [nextAttemptTime, setNextAttemptTime] = useState<number | null>(null)
  const { toast } = useToast()

  const execute = useCallback(async (): Promise<T> => {
    const now = Date.now()

    // Check if we should transition from open to half-open
    if (state === 'open' && lastFailureTime && now - lastFailureTime > resetTimeout) {
      setState('half-open')
      if (onStateChange) {
        onStateChange('half-open')
      }
    }

    // Reject if circuit is open
    if (state === 'open') {
      const timeUntilReset = nextAttemptTime ? nextAttemptTime - now : 0
      throw new Error(`Service temporarily unavailable. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`)
    }

    try {
      const result = await operation()
      
      // Success - reset failure count and close circuit if it was half-open
      if (state === 'half-open') {
        setState('closed')
        setFailureCount(0)
        setLastFailureTime(null)
        setNextAttemptTime(null)
        
        if (onStateChange) {
          onStateChange('closed')
        }
        
        toast({
          title: "Service Restored",
          description: "Connection is stable again.",
          variant: "success"
        })
      }
      
      return result
    } catch (error) {
      const newFailureCount = failureCount + 1
      setFailureCount(newFailureCount)
      setLastFailureTime(now)
      
      // Open circuit if failure threshold exceeded
      if (newFailureCount >= failureThreshold) {
        setState('open')
        const nextAttempt = now + resetTimeout
        setNextAttemptTime(nextAttempt)
        
        if (onStateChange) {
          onStateChange('open')
        }
        
        toast({
          title: "Service Circuit Opened",
          description: `Too many failures. Service will be unavailable for ${resetTimeout / 1000} seconds.`,
          variant: "destructive"
        })
      }
      
      throw error
    }
  }, [operation, state, failureCount, lastFailureTime, nextAttemptTime, failureThreshold, resetTimeout, onStateChange, toast])

  return {
    execute,
    state,
    failureCount,
    timeUntilReset: nextAttemptTime ? Math.max(0, nextAttemptTime - Date.now()) : 0,
    reset: () => {
      setState('closed')
      setFailureCount(0)
      setLastFailureTime(null)
      setNextAttemptTime(null)
    }
  }
}