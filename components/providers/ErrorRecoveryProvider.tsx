'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface GlobalErrorState {
  errors: Array<{
    id: string
    error: Error
    context: string
    timestamp: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    recovered: boolean
    retryCount: number
  }>
  isOnline: boolean
  hasConnectivity: boolean
  lastConnectivityCheck: number
  globalRetryMode: boolean
  maintenanceMode: boolean
}

export interface ErrorRecoveryContextType {
  globalState: GlobalErrorState
  reportError: (error: Error, context: string, severity?: 'low' | 'medium' | 'high' | 'critical') => string
  markErrorRecovered: (errorId: string) => void
  clearError: (errorId: string) => void
  clearAllErrors: () => void
  setMaintenanceMode: (enabled: boolean) => void
  retryFailedOperations: () => Promise<void>
  checkConnectivity: () => Promise<boolean>
  getErrorsForContext: (context: string) => GlobalErrorState['errors']
  getErrorSummary: () => {
    total: number
    byContext: Record<string, number>
    bySeverity: Record<string, number>
    unrecovered: number
  }
}

const ErrorRecoveryContext = createContext<ErrorRecoveryContextType | undefined>(undefined)

interface ErrorRecoveryProviderProps {
  children: ReactNode
  maxErrors?: number
  errorRetentionTime?: number
  connectivityCheckInterval?: number
}

export function ErrorRecoveryProvider({
  children,
  maxErrors = 50,
  errorRetentionTime = 5 * 60 * 1000, // 5 minutes
  connectivityCheckInterval = 30000 // 30 seconds
}: ErrorRecoveryProviderProps) {
  const { toast } = useToast()
  
  const [globalState, setGlobalState] = useState<GlobalErrorState>({
    errors: [],
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    hasConnectivity: true,
    lastConnectivityCheck: Date.now(),
    globalRetryMode: false,
    maintenanceMode: false
  })

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setGlobalState(prev => ({ ...prev, isOnline: true }))
      toast({
        title: "Connection Restored",
        description: "You're back online!",
        variant: "success"
      })
    }

    const handleOffline = () => {
      setGlobalState(prev => ({ ...prev, isOnline: false }))
      toast({
        title: "Connection Lost",
        description: "You're now offline. Some features may be limited.",
        variant: "warning"
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])

  // Periodic connectivity check
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        // Try to fetch a small resource to verify actual connectivity
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache'
        })
        
        const hasConnectivity = response.ok
        setGlobalState(prev => ({
          ...prev,
          hasConnectivity,
          lastConnectivityCheck: Date.now()
        }))

        return hasConnectivity
      } catch (error) {
        setGlobalState(prev => ({
          ...prev,
          hasConnectivity: false,
          lastConnectivityCheck: Date.now()
        }))
        return false
      }
    }

    // Initial check
    checkConnectivity()

    // Set up interval
    const interval = setInterval(checkConnectivity, connectivityCheckInterval)

    return () => clearInterval(interval)
  }, [connectivityCheckInterval])

  // Clean up old errors
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now()
      setGlobalState(prev => ({
        ...prev,
        errors: prev.errors.filter(error => 
          now - error.timestamp < errorRetentionTime
        )
      }))
    }

    const interval = setInterval(cleanup, 60000) // Clean up every minute
    return () => clearInterval(interval)
  }, [errorRetentionTime])

  const reportError = useCallback((
    error: Error, 
    context: string, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): string => {
    const errorId = `${context}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const errorEntry = {
      id: errorId,
      error,
      context,
      timestamp: Date.now(),
      severity,
      recovered: false,
      retryCount: 0
    }

    setGlobalState(prev => {
      const newErrors = [...prev.errors, errorEntry]
      
      // Limit the number of stored errors
      if (newErrors.length > maxErrors) {
        newErrors.splice(0, newErrors.length - maxErrors)
      }
      
      return {
        ...prev,
        errors: newErrors
      }
    })

    // Show toast for high/critical errors
    if (severity === 'high' || severity === 'critical') {
      toast({
        title: severity === 'critical' ? "Critical Error" : "Error Occurred",
        description: `${context}: ${error.message}`,
        variant: "destructive"
      })
    }

    // Log to console for debugging
    console.error(`[${severity.toUpperCase()}] ${context}:`, error)

    return errorId
  }, [maxErrors, toast])

  const markErrorRecovered = useCallback((errorId: string) => {
    setGlobalState(prev => ({
      ...prev,
      errors: prev.errors.map(error =>
        error.id === errorId ? { ...error, recovered: true } : error
      )
    }))
  }, [])

  const clearError = useCallback((errorId: string) => {
    setGlobalState(prev => ({
      ...prev,
      errors: prev.errors.filter(error => error.id !== errorId)
    }))
  }, [])

  const clearAllErrors = useCallback(() => {
    setGlobalState(prev => ({
      ...prev,
      errors: []
    }))
  }, [])

  const setMaintenanceMode = useCallback((enabled: boolean) => {
    setGlobalState(prev => ({
      ...prev,
      maintenanceMode: enabled
    }))

    if (enabled) {
      toast({
        title: "Maintenance Mode",
        description: "System is in maintenance mode. Some features may be unavailable.",
        variant: "warning"
      })
    }
  }, [toast])

  const retryFailedOperations = useCallback(async () => {
    setGlobalState(prev => ({
      ...prev,
      globalRetryMode: true
    }))

    try {
      // Here you would implement logic to retry failed operations
      // This is a placeholder for application-specific retry logic
      
      toast({
        title: "Retrying Operations",
        description: "Attempting to recover from previous errors...",
        variant: "default"
      })

      // Simulate retry delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mark recoverable errors as recovered (placeholder logic)
      setGlobalState(prev => ({
        ...prev,
        errors: prev.errors.map(error => ({
          ...error,
          recovered: error.severity !== 'critical' ? true : error.recovered,
          retryCount: error.retryCount + 1
        })),
        globalRetryMode: false
      }))

      toast({
        title: "Recovery Complete",
        description: "Attempted to recover from previous errors.",
        variant: "success"
      })
    } catch (error) {
      setGlobalState(prev => ({
        ...prev,
        globalRetryMode: false
      }))

      toast({
        title: "Recovery Failed",
        description: "Unable to recover from some errors. Please try again.",
        variant: "destructive"
      })
    }
  }, [toast])

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      const hasConnectivity = response.ok
      setGlobalState(prev => ({
        ...prev,
        hasConnectivity,
        lastConnectivityCheck: Date.now()
      }))

      return hasConnectivity
    } catch (error) {
      setGlobalState(prev => ({
        ...prev,
        hasConnectivity: false,
        lastConnectivityCheck: Date.now()
      }))
      return false
    }
  }, [])

  const getErrorsForContext = useCallback((context: string) => {
    return globalState.errors.filter(error => error.context === context)
  }, [globalState.errors])

  const getErrorSummary = useCallback(() => {
    const { errors } = globalState
    
    const summary = {
      total: errors.length,
      byContext: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      unrecovered: 0
    }

    errors.forEach(error => {
      // Count by context
      summary.byContext[error.context] = (summary.byContext[error.context] || 0) + 1
      
      // Count by severity
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1
      
      // Count unrecovered
      if (!error.recovered) {
        summary.unrecovered++
      }
    })

    return summary
  }, [globalState.errors])

  const contextValue: ErrorRecoveryContextType = {
    globalState,
    reportError,
    markErrorRecovered,
    clearError,
    clearAllErrors,
    setMaintenanceMode,
    retryFailedOperations,
    checkConnectivity,
    getErrorsForContext,
    getErrorSummary
  }

  return (
    <ErrorRecoveryContext.Provider value={contextValue}>
      {children}
    </ErrorRecoveryContext.Provider>
  )
}

export function useErrorRecovery() {
  const context = useContext(ErrorRecoveryContext)
  if (!context) {
    throw new Error('useErrorRecovery must be used within an ErrorRecoveryProvider')
  }
  return context
}

// Higher-order component for automatic error reporting
export function withErrorRecovery<P extends object>(
  Component: React.ComponentType<P>,
  context: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  return function ErrorRecoveryWrapper(props: P) {
    const { reportError } = useErrorRecovery()

    const handleError = (error: Error) => {
      reportError(error, context, severity)
    }

    return (
      <ErrorBoundary onError={handleError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Simple error boundary for the HOC
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-800 text-sm">
            Something went wrong. The error has been reported.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}