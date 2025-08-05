'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

interface Props {
  children: ReactNode
  fallbackComponent?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent
      }

      // Default grief-sensitive error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-peace-50 to-comfort-50">
          <Card className="w-full max-w-lg mx-auto shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="text-6xl mb-4">😔</div>
              <CardTitle className="text-2xl font-gentle text-peace-800 mb-2">
                Something Unexpected Happened
              </CardTitle>
              <p className="text-comfort text-peace-600 leading-relaxed">
                We&apos;re sorry, but something went wrong while preserving your memories. 
                Your data is safe, and we&apos;re here to help you continue your legacy journey.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Details (Development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-warning-50 border border-warning-200 rounded-embrace p-4">
                  <h4 className="font-gentle text-warning-800 mb-2">Error Details (Development):</h4>
                  <div className="text-xs font-mono text-warning-700 bg-white rounded p-2 overflow-auto">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Helpful Actions */}
              <div className="bg-gradient-to-r from-hope-50 to-comfort-50 rounded-embrace p-4 border border-hope-200">
                <h4 className="font-gentle text-hope-800 mb-3">What you can do:</h4>
                <ul className="space-y-2 text-comfort text-hope-700">
                  <li className="flex items-start gap-2">
                    <span className="text-hope-500 mt-1">•</span>
                    <span>Try refreshing the page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-hope-500 mt-1">•</span>
                    <span>Your responses and memories are safely stored</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-hope-500 mt-1">•</span>
                    <span>Contact support if the problem continues</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleReset}
                  className="flex-1 bg-hope-500 hover:bg-hope-600 text-white"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1 border-peace-300 text-peace-700 hover:bg-peace-50"
                >
                  Refresh Page
                </Button>
              </div>

              {/* Support Information */}
              <div className="text-center p-4 bg-comfort-50 rounded-embrace border border-comfort-200">
                <p className="text-comfort text-comfort-600 mb-2">
                  💜 Need help? We&apos;re here for you
                </p>
                <p className="text-whisper text-comfort-500">
                  Your legacy is precious to us - let&apos;s resolve this together
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Functional component wrapper for easier usage
export function ErrorBoundaryWrapper({ 
  children,
  fallback,
  onError 
}: {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}) {
  return (
    <ErrorBoundary fallbackComponent={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  )
}

// Hook for manual error reporting
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error)
    
    // Could integrate with error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  return { handleError }
}