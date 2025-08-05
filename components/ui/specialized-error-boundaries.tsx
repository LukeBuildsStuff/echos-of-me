'use client'

import React, { ReactNode } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { AlertTriangle, Database, Brain, Zap, RefreshCw, Settings } from 'lucide-react'

// Admin Dashboard Error Boundary
interface AdminErrorBoundaryProps {
  children: ReactNode
  section?: string
  onError?: (error: Error) => void
}

export function AdminErrorBoundary({ children, section, onError }: AdminErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context="admin"
      level="page"
      onError={onError}
      customMessage={section ? `Error in ${section}` : undefined}
      allowRetry={true}
      allowReload={true}
    >
      {children}
    </ErrorBoundary>
  )
}

// Training System Error Boundary
interface TrainingErrorBoundaryProps {
  children: ReactNode
  jobId?: string
  onError?: (error: Error) => void
}

export function TrainingErrorBoundary({ children, jobId, onError }: TrainingErrorBoundaryProps) {
  const handleError = (error: Error) => {
    // Log training-specific error context
    console.error(`Training system error${jobId ? ` for job ${jobId}` : ''}:`, error)
    onError?.(error)
  }

  return (
    <ErrorBoundary
      context="training"
      level="component"
      onError={handleError}
      allowRetry={true}
      allowReload={false}
      fallbackComponent={
        <Alert className="my-4 border-orange-200 bg-orange-50" role="alert" aria-live="assertive">
          <Brain className="h-4 w-4 text-orange-600" aria-hidden="true" />
          <div className="ml-2">
            <h4 className="font-medium text-orange-800">Training System Error</h4>
            <p className="text-sm text-orange-700 mt-1">
              {jobId ? `Training job ${jobId} encountered an error.` : 'The training system encountered an error.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <Button 
                size="sm" 
                onClick={() => window.location.reload()}
                className="min-h-[44px] w-full sm:w-auto touch-manipulation"
                aria-label="Refresh training view"
              >
                <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                Refresh Training View
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.href = '/admin/training'}
                className="min-h-[44px] w-full sm:w-auto touch-manipulation"
                aria-label="Go to training dashboard"
              >
                Training Dashboard
              </Button>
            </div>
          </div>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Real-time Monitoring Error Boundary
interface MonitoringErrorBoundaryProps {
  children: ReactNode
  component?: string
  onError?: (error: Error) => void
}

export function MonitoringErrorBoundary({ children, component, onError }: MonitoringErrorBoundaryProps) {
  const handleError = (error: Error) => {
    console.error(`Monitoring component error${component ? ` in ${component}` : ''}:`, error)
    
    // Try to re-establish connections if it's a real-time component
    if (component?.includes('rtx') || component?.includes('monitoring')) {
      setTimeout(() => {
        // Trigger reconnection logic
        window.dispatchEvent(new CustomEvent('monitoring-reconnect'))
      }, 3000)
    }
    
    onError?.(error)
  }

  return (
    <ErrorBoundary
      context="admin"
      level="widget"
      onError={handleError}
      allowRetry={true}
      allowReload={false}
      fallbackComponent={
        <Card className="border-yellow-200 bg-yellow-50" role="alert" aria-live="assertive">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Zap className="h-5 w-5 text-yellow-600 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-yellow-800">
                  {component ? `${component} Error` : 'Monitoring Error'}
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Real-time monitoring temporarily unavailable. Attempting to reconnect...
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 min-h-[44px] w-full sm:w-auto touch-manipulation"
                aria-label="Refresh monitoring component"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span className="ml-1 sm:sr-only">Refresh</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Data Table Error Boundary (for admin tables)
interface TableErrorBoundaryProps {
  children: ReactNode
  tableName?: string
  onError?: (error: Error) => void
  onRetry?: () => void
}

export function TableErrorBoundary({ children, tableName, onError, onRetry }: TableErrorBoundaryProps) {
  const handleError = (error: Error) => {
    console.error(`Table error${tableName ? ` in ${tableName}` : ''}:`, error)
    onError?.(error)
  }

  return (
    <ErrorBoundary
      context="admin"
      level="component"
      onError={handleError}
      allowRetry={true}
      allowReload={false}
      fallbackComponent={
        <Card className="border-red-200 bg-red-50" role="alert" aria-live="assertive">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Database className="h-8 w-8 text-red-600 mx-auto mb-4" aria-hidden="true" />
              <h3 className="font-medium text-red-800 mb-2">
                {tableName ? `Error Loading ${tableName}` : 'Table Loading Error'}
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Unable to load the data table. This might be a temporary issue.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 max-w-xs mx-auto">
                <Button 
                  size="sm" 
                  onClick={onRetry || (() => window.location.reload())}
                  className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] w-full sm:w-auto touch-manipulation"
                  aria-label="Retry loading table data"
                >
                  <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                  Retry Loading
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/admin'}
                  className="border-red-300 text-red-700 hover:bg-red-100 min-h-[44px] w-full sm:w-auto touch-manipulation"
                  aria-label="Go to admin dashboard"
                >
                  Admin Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Voice System Error Boundary
interface VoiceErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error) => void
}

export function VoiceErrorBoundary({ children, onError }: VoiceErrorBoundaryProps) {
  const handleError = (error: Error) => {
    console.error('Voice system error:', error)
    
    // Clean up any audio contexts or media streams
    try {
      // Stop any ongoing audio processes
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop())
        })
        .catch(() => {}) // Ignore cleanup errors
    } catch (e) {
      // Ignore cleanup errors
    }
    
    onError?.(error)
  }

  return (
    <ErrorBoundary
      context="voice"
      level="component"
      onError={handleError}
      allowRetry={true}
      allowReload={false}
      customMessage="Voice System Error"
    >
      {children}
    </ErrorBoundary>
  )
}

// Settings/Configuration Error Boundary
interface SettingsErrorBoundaryProps {
  children: ReactNode
  section?: string
  onError?: (error: Error) => void
}

export function SettingsErrorBoundary({ children, section, onError }: SettingsErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context="admin"
      level="component"
      onError={onError}
      allowRetry={true}
      allowReload={false}
      fallbackComponent={
        <Alert className="my-4 border-gray-200 bg-gray-50">
          <Settings className="h-4 w-4 text-gray-600" />
          <div className="ml-2">
            <h4 className="font-medium text-gray-800">Settings Error</h4>
            <p className="text-sm text-gray-600 mt-1">
              {section ? `Unable to load ${section} settings.` : 'Unable to load configuration settings.'}
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Reload Settings
              </Button>
            </div>
          </div>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Utility: Higher Order Component for error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps: {
    context?: 'admin' | 'user' | 'training' | 'voice' | 'default'
    level?: 'page' | 'component' | 'widget'
    fallback?: ReactNode
    onError?: (error: Error) => void
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary
      context={boundaryProps.context}
      level={boundaryProps.level}
      onError={boundaryProps.onError}
      fallbackComponent={boundaryProps.fallback}
    >
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Hook for manual error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: string, additionalData?: any) => {
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: context || 'manual',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      additionalData
    }

    console.error('Manual error report:', errorReport)
    
    // Send to monitoring service if available
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      }).catch(() => {
        // Silently handle reporting errors
      })
    }
  }

  return { reportError }
}