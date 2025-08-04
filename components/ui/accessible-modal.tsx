'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useFocusTrap, useAccessibility } from '@/hooks/useAccessibility'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react'

interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  overlayClassName?: string
  preventScroll?: boolean
  restoreFocus?: boolean
  initialFocusRef?: React.RefObject<HTMLElement>
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  footer,
  className,
  overlayClassName,
  preventScroll = true,
  restoreFocus = true,
  initialFocusRef
}: AccessibleModalProps) {
  const { announce, focusManagement } = useAccessibility()
  const modalRef = useFocusTrap(isOpen && focusManagement.trapFocus)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)

  // Handle mounting for SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Save current focus
      previousActiveElement.current = document.activeElement as HTMLElement
      
      // Announce modal opening
      announce(`${title} dialog opened`, 'polite')
      
      // Focus initial element or first focusable element
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
      }
    } else if (restoreFocus && focusManagement.restoreFocus && previousActiveElement.current) {
      // Restore focus when closing
      previousActiveElement.current.focus()
    }
  }, [isOpen, title, announce, restoreFocus, focusManagement.restoreFocus, initialFocusRef])

  // Handle body scroll
  useEffect(() => {
    if (!preventScroll) return

    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen, preventScroll])

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeOnEscape, isOpen, onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-sm'
      case 'md': return 'max-w-md'
      case 'lg': return 'max-w-lg'
      case 'xl': return 'max-w-2xl'
      case 'full': return 'max-w-none m-4'
      default: return 'max-w-md'
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          headerBg: 'bg-red-50',
          headerText: 'text-red-900',
          borderColor: 'border-red-200'
        }
      case 'success':
        return {
          headerBg: 'bg-green-50',
          headerText: 'text-green-900',
          borderColor: 'border-green-200'
        }
      case 'warning':
        return {
          headerBg: 'bg-yellow-50',
          headerText: 'text-yellow-900',
          borderColor: 'border-yellow-200'
        }
      case 'info':
        return {
          headerBg: 'bg-blue-50',
          headerText: 'text-blue-900',
          borderColor: 'border-blue-200'
        }
      default:
        return {
          headerBg: 'bg-white',
          headerText: 'text-gray-900',
          borderColor: 'border-gray-200'
        }
    }
  }

  const getVariantIcon = () => {
    switch (variant) {
      case 'destructive': return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info': return <Info className="h-5 w-5 text-blue-500" />
      default: return null
    }
  }

  if (!mounted || !isOpen) return null

  const variantStyles = getVariantStyles()
  const variantIcon = getVariantIcon()

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        overlayClassName
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          "relative bg-white rounded-lg shadow-xl w-full",
          getSizeClasses(),
          variantStyles.borderColor,
          "border",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-6 border-b",
          variantStyles.borderColor,
          variantStyles.headerBg
        )}>
          <div className="flex items-center gap-3">
            {variantIcon}
            <div>
              <h2 
                id="modal-title"
                className={cn("text-lg font-semibold", variantStyles.headerText)}
              >
                {title}
              </h2>
              {description && (
                <p id="modal-description" className="text-sm text-gray-600 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={cn(
            "flex items-center justify-end gap-3 p-6 border-t bg-gray-50",
            variantStyles.borderColor
          )}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Confirmation Dialog Component
interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmationDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Error handling is left to the parent component
      console.error('Error in confirmation action:', error)
    }
  }

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      size="sm"
      initialFocusRef={confirmButtonRef}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-700">{message}</p>
    </AccessibleModal>
  )
}

// Alert Dialog Component
interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  variant?: 'info' | 'warning' | 'destructive' | 'success'
  actionText?: string
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  actionText = 'OK'
}: AlertDialogProps) {
  const actionButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      size="sm"
      initialFocusRef={actionButtonRef}
      footer={
        <Button
          ref={actionButtonRef}
          onClick={onClose}
          variant={variant === 'destructive' ? 'destructive' : 'default'}
        >
          {actionText}
        </Button>
      }
    >
      <p className="text-gray-700">{message}</p>
    </AccessibleModal>
  )
}

// Loading Dialog Component
interface LoadingDialogProps {
  isOpen: boolean
  title?: string
  message?: string
  progress?: number
  onCancel?: () => void
}

export function LoadingDialog({
  isOpen,
  title = 'Loading',
  message = 'Please wait...',
  progress,
  onCancel
}: LoadingDialogProps) {
  const { announce } = useAccessibility()

  useEffect(() => {
    if (isOpen) {
      announce(`${title}: ${message}`, 'polite')
    }
  }, [isOpen, title, message, announce])

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing unless onCancel is provided
      title={title}
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={!!onCancel}
      size="sm"
      footer={onCancel && (
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
    >
      <div className="text-center py-4">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        
        <p className="text-gray-700 mb-4">{message}</p>
        
        {typeof progress === 'number' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${Math.round(progress)}%`}
            />
            <p className="text-sm text-gray-600 mt-2" aria-live="polite">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
      </div>
    </AccessibleModal>
  )
}

// Hook for managing modal state
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    open,
    close,
    toggle
  }
}

// Hook for confirmation dialogs
export function useConfirmation() {
  const [state, setState] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm?: () => void | Promise<void>
    variant?: 'default' | 'destructive'
  }>({
    isOpen: false,
    title: '',
    message: ''
  })

  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    variant: 'default' | 'destructive' = 'default'
  ) => {
    setState({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant
    })
  }

  const close = () => {
    setState(prev => ({ ...prev, isOpen: false }))
  }

  const handleConfirm = async () => {
    if (state.onConfirm) {
      await state.onConfirm()
    }
    close()
  }

  return {
    confirmDialog: (
      <ConfirmationDialog
        isOpen={state.isOpen}
        onClose={close}
        onConfirm={handleConfirm}
        title={state.title}
        message={state.message}
        variant={state.variant}
      />
    ),
    confirm
  }
}