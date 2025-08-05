'use client'

import { useState, useCallback } from 'react'

export interface ErrorState {
  error: string | null
  isError: boolean
  errorType?: 'network' | 'validation' | 'api' | 'unknown'
}

export interface ApiErrorHandlerOptions {
  showAlert?: boolean
  logError?: boolean
  context?: string
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false
  })

  const setError = useCallback((error: string | Error | null, type?: ErrorState['errorType']) => {
    if (error === null) {
      setErrorState({ error: null, isError: false })
      return
    }

    const errorMessage = error instanceof Error ? error.message : error
    const errorType = type || (
      errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')
        ? 'network'
        : errorMessage.toLowerCase().includes('validation')
        ? 'validation'
        : 'unknown'
    )

    setErrorState({
      error: errorMessage,
      isError: true,
      errorType
    })
  }, [])

  const clearError = useCallback(() => {
    setErrorState({ error: null, isError: false })
  }, [])

  const handleApiError = useCallback(async (
    error: any, 
    options: ApiErrorHandlerOptions = {}
  ) => {
    const { showAlert = false, logError = true, context } = options

    let errorMessage = 'An unexpected error occurred'
    let errorType: ErrorState['errorType'] = 'api'

    if (error instanceof Response) {
      try {
        const errorData = await error.json()
        errorMessage = errorData.error || errorData.message || `Server error: ${error.status}`
      } catch {
        errorMessage = `Server error: ${error.status} ${error.statusText}`
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorType = 'network'
        errorMessage = 'Unable to connect to the server. Please check your internet connection.'
      }
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    if (logError) {
      console.error(`Error ${context ? `in ${context}` : ''}:`, error)
    }

    if (showAlert) {
      alert(errorMessage)
    }

    setError(errorMessage, errorType)
    return errorMessage
  }, [setError])

  return {
    ...errorState,
    setError,
    clearError,
    handleApiError
  }
}

// Hook for handling async operations with loading and error states
export function useAsyncOperation<T = any>() {
  const [loading, setLoading] = useState(false)
  const { error, isError, setError, clearError, handleApiError } = useErrorHandler()

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options: ApiErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      setLoading(true)
      clearError()
      const result = await operation()
      return result
    } catch (err) {
      await handleApiError(err, options)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleApiError])

  const reset = useCallback(() => {
    setLoading(false)
    clearError()
  }, [clearError])

  return {
    loading,
    error,
    isError,
    execute,
    reset,
    setError,
    clearError
  }
}

// Hook for form error handling
export function useFormErrors<T extends Record<string, any>>() {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || undefined
    }))
  }, [])

  const clearFieldError = useCallback((field: keyof T) => {
    setFieldErrors(prev => {
      const updated = { ...prev }
      delete updated[field]
      return updated
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setFieldErrors({})
    setGeneralError(null)
  }, [])

  const hasErrors = Object.keys(fieldErrors).length > 0 || generalError !== null

  const getFieldError = useCallback((field: keyof T) => {
    return fieldErrors[field] || null
  }, [fieldErrors])

  const setApiErrors = useCallback((apiError: any) => {
    if (apiError && typeof apiError === 'object') {
      if (apiError.errors) {
        // Handle validation errors from API
        setFieldErrors(apiError.errors)
      } else if (apiError.error || apiError.message) {
        setGeneralError(apiError.error || apiError.message)
      }
    } else if (typeof apiError === 'string') {
      setGeneralError(apiError)
    }
  }, [])

  return {
    fieldErrors,
    generalError,
    hasErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    getFieldError,
    setGeneralError,
    setApiErrors
  }
}

// Hook for retry functionality
export function useRetry() {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const retry = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    delay: number = 1000
  ) => {
    if (retryCount >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded`)
    }

    setIsRetrying(true)
    setRetryCount(prev => prev + 1)

    try {
      // Add delay between retries
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * retryCount))
      }

      const result = await operation()
      setRetryCount(0) // Reset on success
      return result
    } catch (error) {
      if (retryCount >= maxRetries - 1) {
        setRetryCount(0)
        throw error
      }
      throw error
    } finally {
      setIsRetrying(false)
    }
  }, [retryCount])

  const reset = useCallback(() => {
    setRetryCount(0)
    setIsRetrying(false)
  }, [])

  return {
    retry,
    retryCount,
    isRetrying,
    reset
  }
}