'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react'

// Base error message component
interface ErrorMessageProps {
  title?: string
  message: string
  variant?: 'default' | 'gentle' | 'warning' | 'severe'
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  children?: React.ReactNode
}

export function ErrorMessage({
  title,
  message,
  variant = 'default',
  dismissible = false,
  onDismiss,
  className = '',
  children
}: ErrorMessageProps) {
  const variants = {
    default: 'bg-warning-50 border-warning-200 text-warning-800',
    gentle: 'bg-peace-50 border-peace-200 text-peace-700',
    warning: 'bg-memory-50 border-memory-200 text-memory-800',
    severe: 'bg-red-50 border-red-200 text-red-800'
  }

  const iconVariants = {
    default: 'text-warning-500',
    gentle: 'text-peace-400',
    warning: 'text-memory-500',
    severe: 'text-red-500'
  }

  return (
    <Alert className={`${variants[variant]} ${className}`}>
      <AlertTriangle className={`h-4 w-4 ${iconVariants[variant]}`} />
      <div className="flex-1">
        {title && (
          <div className="font-medium mb-1">{title}</div>
        )}
        <AlertDescription className="leading-relaxed">
          {message}
        </AlertDescription>
        {children}
      </div>
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  )
}

// Network error component
interface NetworkErrorProps {
  onRetry?: () => void
  isRetrying?: boolean
  dismissible?: boolean
  onDismiss?: () => void
}

export function NetworkError({ 
  onRetry, 
  isRetrying = false, 
  dismissible = false, 
  onDismiss 
}: NetworkErrorProps) {
  return (
    <div className="bg-gradient-to-r from-peace-50 to-comfort-50 border border-peace-200 rounded-embrace p-4">
      <div className="flex items-start gap-3">
        <WifiOff className="h-5 w-5 text-peace-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-gentle text-peace-800 mb-2">
            Connection Issue
          </h4>
          <p className="text-comfort text-peace-600 mb-3 leading-relaxed">
            We&apos;re having trouble connecting to preserve your memories. 
            Your responses are safe and we&apos;ll try again automatically.
          </p>
          <div className="flex items-center gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                size="sm"
                className="bg-hope-500 hover:bg-hope-600 text-white"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}
            {dismissible && onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-peace-600 hover:text-peace-700"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// API error component
interface ApiErrorProps {
  error: string | Error
  context?: string
  onRetry?: () => void
  dismissible?: boolean
  onDismiss?: () => void
}

export function ApiError({ 
  error, 
  context, 
  onRetry, 
  dismissible = true, 
  onDismiss 
}: ApiErrorProps) {
  const errorMessage = error instanceof Error ? error.message : error
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                        errorMessage.toLowerCase().includes('fetch')

  if (isNetworkError) {
    return <NetworkError onRetry={onRetry} dismissible={dismissible} onDismiss={onDismiss} />
  }

  return (
    <ErrorMessage
      title={context ? `Error in ${context}` : 'Something went wrong'}
      message={errorMessage}
      variant="gentle"
      dismissible={dismissible}
      onDismiss={onDismiss}
    >
      {onRetry && (
        <div className="mt-3">
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="border-peace-300 text-peace-700 hover:bg-peace-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </ErrorMessage>
  )
}

// Form validation error component
interface FormErrorProps {
  errors: string[]
  field?: string
  className?: string
}

export function FormError({ errors, field, className = '' }: FormErrorProps) {
  if (!errors.length) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error, index) => (
        <div
          key={index}
          className="text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-500 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">
              {field && <span className="font-medium">{field}:</span>} {error}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Inline field error component
interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className = '' }: FieldErrorProps) {
  if (!error) return null

  return (
    <div className={`text-sm text-warning-700 mt-1 flex items-center gap-1 ${className}`}>
      <AlertTriangle className="h-3 w-3 text-warning-500 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}

// Success message component for consistency
interface SuccessMessageProps {
  title?: string
  message: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function SuccessMessage({
  title,
  message,
  dismissible = false,
  onDismiss,
  className = ''
}: SuccessMessageProps) {
  return (
    <Alert className={`bg-hope-50 border-hope-200 text-hope-800 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-hope-500 text-lg">✅</span>
        <div className="flex-1">
          {title && (
            <div className="font-medium mb-1">{title}</div>
          )}
          <AlertDescription className="leading-relaxed">
            {message}
          </AlertDescription>
        </div>
        {dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  )
}