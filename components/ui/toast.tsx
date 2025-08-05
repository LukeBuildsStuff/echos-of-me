'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info, 
  X, 
  RefreshCw,
  Clock,
  Zap
} from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  persistent?: boolean
  progress?: number
  onDismiss?: () => void
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<Toast>) => void
  clearAllToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Toast Provider Component
interface ToastProviderProps {
  children: React.ReactNode
  position?: ToastPosition
  maxToasts?: number
  defaultDuration?: number
}

export function ToastProvider({ 
  children, 
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 4000
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration
    }

    setToasts(prev => {
      const filtered = prev.slice(-(maxToasts - 1))
      return [...filtered, newToast]
    })

    // Auto remove if not persistent and not loading
    if (!newToast.persistent && newToast.type !== 'loading' && newToast.duration! > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [defaultDuration, maxToasts])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id)
      if (toast?.onDismiss) {
        toast.onDismiss()
      }
      return prev.filter(t => t.id !== id)
    })
  }, [])

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAllToasts
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted && createPortal(
        <ToastContainer toasts={toasts} position={position} onRemove={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  )
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[]
  position: ToastPosition
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, position, onRemove }: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4 sm:top-4 sm:right-4'
      case 'top-left':
        return 'top-4 left-4 sm:top-4 sm:left-4'
      case 'bottom-right':
        return 'bottom-4 right-4 sm:bottom-4 sm:right-4'
      case 'bottom-left':
        return 'bottom-4 left-4 sm:bottom-4 sm:left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2 sm:top-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2 sm:bottom-4'
      default:
        return 'top-4 right-4 sm:top-4 sm:right-4'
    }
  }

  const getMobilePositionClasses = () => {
    // On mobile, always position at bottom with full width for better UX
    return 'sm:relative sm:w-auto bottom-4 left-4 right-4 w-auto'
  }

  if (toasts.length === 0) return null

  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2 pointer-events-none',
        'w-full max-w-sm', // Default sizing
        'sm:w-full sm:max-w-sm', // Desktop sizing
        'max-sm:left-4 max-sm:right-4 max-sm:bottom-4 max-sm:max-w-none', // Mobile: full width at bottom
        getPositionClasses()
      )}
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
          index={index}
          position={position}
          totalToasts={toasts.length}
        />
      ))}
    </div>
  )
}

// Individual Toast Item Component
interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
  index: number
  position: ToastPosition
  totalToasts: number
}

function ToastItem({ toast, onRemove, index, position, totalToasts }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isFocused, setIsFocused] = useState(false)
  const toastRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Staggered entrance animation based on index
    const delay = Math.min(index * 100, 500) // Cap at 500ms
    const timer = setTimeout(() => setIsVisible(true), delay + 50)
    return () => clearTimeout(timer)
  }, [index])

  useEffect(() => {
    if (toast.type === 'loading' || toast.persistent || !toast.duration || toast.duration <= 0) {
      return
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (toast.duration! / 100))
        return Math.max(0, newProgress)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [toast.duration, toast.type, toast.persistent])

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleRemove()
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (toast.action && e.target === toastRef.current) {
        e.preventDefault()
        toast.action.onClick()
        handleRemove()
      }
    }
  }

  // Auto-focus for high-severity toasts
  useEffect(() => {
    if (toast.type === 'error' && toastRef.current) {
      toastRef.current.focus()
    }
  }, [toast.type])

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      case 'loading':
        return <RefreshCw className="h-5 w-5 text-gray-600 animate-spin" />
      default:
        return null
    }
  }

  const getToastStyles = () => {
    const baseStyles = cn(
      'pointer-events-auto relative overflow-hidden rounded-lg border bg-white shadow-lg transition-all duration-200',
      'p-4 sm:p-4', // Responsive padding
      'min-h-[60px] sm:min-h-auto', // Minimum height for mobile
      'w-full', // Full width
      // Mobile-specific styling
      'max-sm:mx-0 max-sm:rounded-lg',
      // Dark mode support
      'dark:bg-gray-800 dark:border-gray-700'
    )
    
    switch (toast.type) {
      case 'success':
        return cn(baseStyles, 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20')
      case 'error':
        return cn(baseStyles, 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20')
      case 'warning':
        return cn(baseStyles, 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20')
      case 'info':
        return cn(baseStyles, 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20')
      case 'loading':
        return cn(baseStyles, 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800')
      default:
        return baseStyles
    }
  }

  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none'
    const isFromRight = position.includes('right')
    const isFromLeft = position.includes('left')
    const isFromTop = position.includes('top')
    
    if (isExiting) {
      if (isFromRight) return cn(baseClasses, 'translate-x-full opacity-0 motion-reduce:translate-x-0 motion-reduce:opacity-0')
      if (isFromLeft) return cn(baseClasses, '-translate-x-full opacity-0 motion-reduce:translate-x-0 motion-reduce:opacity-0')
      return cn(baseClasses, 'scale-95 opacity-0 motion-reduce:scale-100 motion-reduce:opacity-0')
    }
    
    if (!isVisible) {
      if (isFromRight) return cn(baseClasses, 'translate-x-full motion-reduce:translate-x-0 motion-reduce:opacity-0')
      if (isFromLeft) return cn(baseClasses, '-translate-x-full motion-reduce:translate-x-0 motion-reduce:opacity-0')
      if (isFromTop) return cn(baseClasses, '-translate-y-full motion-reduce:translate-y-0 motion-reduce:opacity-0')
      return cn(baseClasses, 'translate-y-full motion-reduce:translate-y-0 motion-reduce:opacity-0')
    }
    
    return cn(baseClasses, 'translate-x-0 translate-y-0 opacity-100')
  }

  return (
    <div
      ref={toastRef}
      className={cn(
        getToastStyles(),
        getAnimationClasses(),
        'transform',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        isFocused && 'ring-2 ring-blue-500'
      )}
      role={toast.type === 'loading' ? 'status' : 'alert'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      tabIndex={toast.action ? 0 : -1}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        zIndex: totalToasts - index, // Stack newer toasts on top
        '--toast-index': index,
      } as React.CSSProperties & { '--toast-index': number }}
    >
      {/* Progress bar */}
      {!toast.persistent && toast.type !== 'loading' && toast.duration! > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-100 ease-linear"
             style={{ width: `${progress}%` }} />
      )}
      
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getToastIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={cn(
                'text-sm font-medium',
                toast.type === 'success' && 'text-green-800 dark:text-green-200',
                toast.type === 'error' && 'text-red-800 dark:text-red-200',
                toast.type === 'warning' && 'text-yellow-800 dark:text-yellow-200',
                toast.type === 'info' && 'text-blue-800 dark:text-blue-200',
                toast.type === 'loading' && 'text-gray-800 dark:text-gray-200'
              )}>
                <span className="sr-only">{toast.type} notification: </span>
                {toast.title}
              </p>
              
              {toast.description && (
                <p className={cn(
                  'mt-1 text-sm',
                  toast.type === 'success' && 'text-green-700 dark:text-green-300',
                  toast.type === 'error' && 'text-red-700 dark:text-red-300',
                  toast.type === 'warning' && 'text-yellow-700 dark:text-yellow-300',
                  toast.type === 'info' && 'text-blue-700 dark:text-blue-300',
                  toast.type === 'loading' && 'text-gray-700 dark:text-gray-300'
                )}>
                  {toast.description}
                </p>
              )}
              
              {/* Progress indicator for loading */}
              {toast.type === 'loading' && typeof toast.progress === 'number' && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(toast.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-gray-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${toast.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity',
                'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                'min-h-[44px] min-w-[44px] sm:h-6 sm:w-6 sm:min-h-[24px] sm:min-w-[24px]' // Touch target size
              )}
              onClick={handleRemove}
              aria-label={`Dismiss ${toast.type} notification: ${toast.title}`}
              title="Press Escape to dismiss"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
          
          {/* Action button */}
          {toast.action && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.action!.onClick()
                  handleRemove()
                }}
                className={cn(
                  'text-xs',
                  toast.type === 'success' && 'border-green-300 text-green-800 hover:bg-green-100',
                  toast.type === 'error' && 'border-red-300 text-red-800 hover:bg-red-100',
                  toast.type === 'warning' && 'border-yellow-300 text-yellow-800 hover:bg-yellow-100',
                  toast.type === 'info' && 'border-blue-300 text-blue-800 hover:bg-blue-100'
                )}
              >
                {toast.action.label}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const { addToast, removeToast, updateToast, clearAllToasts } = context

  // Convenience methods
  const toast = {
    success: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'success', title, description, ...options }),
    
    error: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'error', title, description, ...options }),
    
    warning: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'warning', title, description, ...options }),
    
    info: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'info', title, description, ...options }),
    
    loading: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'loading', title, description, persistent: true, ...options }),
    
    promise: async function<T>(
      promise: Promise<T>,
      config: {
        loading: { title: string; description?: string }
        success: { title: string; description?: string } | ((data: T) => { title: string; description?: string })
        error: { title: string; description?: string } | ((error: any) => { title: string; description?: string })
      }
    ) {
      const { loading: loadingContent, success: successContent, error: errorContent } = config
      const toastId = addToast({
        type: 'loading',
        title: loadingContent.title,
        description: loadingContent.description,
        persistent: true
      })

      try {
        const result = await promise
        const successToast = typeof successContent === 'function' 
          ? successContent(result) 
          : successContent
        
        updateToast(toastId, {
          type: 'success',
          title: successToast.title,
          description: successToast.description,
          persistent: false,
          duration: 4000
        })
        
        return result
      } catch (error) {
        const errorToast = typeof errorContent === 'function' 
          ? errorContent(error) 
          : errorContent
        
        updateToast(toastId, {
          type: 'error',
          title: errorToast.title,
          description: errorToast.description,
          persistent: false,
          duration: 6000
        })
        
        throw error
      }
    },

    custom: (toast: Omit<Toast, 'id'>) => addToast(toast)
  }

  return {
    toast,
    dismiss: removeToast,
    update: updateToast,
    clear: clearAllToasts
  }
}

// Helper components for common use cases
export function ToastAction({ 
  altText, 
  onClick, 
  children 
}: { 
  altText?: string
  onClick: () => void
  children: React.ReactNode 
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={altText}
      className="h-8 text-xs"
    >
      {children}
    </Button>
  )
}

// Toast notification for network status
export function useNetworkToast() {
  const { toast } = useToast()
  
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Connection restored', 'You are back online')
    }
    
    const handleOffline = () => {
      toast.error('Connection lost', 'Please check your internet connection', {
        persistent: true,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      })
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])
}