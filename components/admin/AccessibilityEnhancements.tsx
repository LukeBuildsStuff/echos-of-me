'use client'

import React, { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

// Custom hook for keyboard navigation
export function useKeyboardNavigation() {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const itemsRef = useRef<HTMLElement[]>([])

  const registerItem = (element: HTMLElement | null) => {
    if (element && !itemsRef.current.includes(element)) {
      itemsRef.current.push(element)
    }
  }

  const clearItems = () => {
    itemsRef.current = []
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const { key } = event
    const items = itemsRef.current.filter(item => 
      item && item.offsetParent !== null // Only visible items
    )

    if (items.length === 0) return

    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault()
        setFocusedIndex(prev => {
          const nextIndex = prev < items.length - 1 ? prev + 1 : 0
          items[nextIndex]?.focus()
          return nextIndex
        })
        break

      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault()
        setFocusedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : items.length - 1
          items[nextIndex]?.focus()
          return nextIndex
        })
        break

      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        items[0]?.focus()
        break

      case 'End':
        event.preventDefault()
        setFocusedIndex(items.length - 1)
        items[items.length - 1]?.focus()
        break

      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && items[focusedIndex]) {
          event.preventDefault()
          items[focusedIndex].click()
        }
        break

      case 'Escape':
        event.preventDefault()
        setFocusedIndex(-1)
        items[0]?.blur()
        break
    }
  }

  return {
    focusedIndex,
    registerItem,
    clearItems,
    handleKeyDown
  }
}

// Skip Link Component for screen readers
interface SkipLinkProps {
  href: string
  children: React.ReactNode
}

export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-foreground"
    >
      {children}
    </a>
  )
}

// Screen Reader Only Text
interface ScreenReaderOnlyProps {
  children: React.ReactNode
}

export function ScreenReaderOnly({ children }: ScreenReaderOnlyProps) {
  return <span className="sr-only">{children}</span>
}

// Accessible Button with loading and disabled states
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function AccessibleButton({
  children,
  isLoading = false,
  loadingText = 'Loading...',
  disabled,
  className,
  ...props
}: AccessibleButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Loading"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <ScreenReaderOnly>{loadingText}</ScreenReaderOnly>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Accessible Table with keyboard navigation
interface AccessibleTableProps {
  children: React.ReactNode
  caption?: string
  className?: string
}

export function AccessibleTable({ children, caption, className }: AccessibleTableProps) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [currentCell, setCurrentCell] = useState<{ row: number; col: number } | null>(null)

  useEffect(() => {
    const table = tableRef.current
    if (!table) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event
      const cells = Array.from(table.querySelectorAll('td, th')) as HTMLElement[]
      
      if (cells.length === 0 || !currentCell) return

      const rows = Array.from(table.querySelectorAll('tr'))
      const currentRow = rows[currentCell.row]
      const currentRowCells = Array.from(currentRow.querySelectorAll('td, th')) as HTMLElement[]

      let newRow = currentCell.row
      let newCol = currentCell.col

      switch (key) {
        case 'ArrowRight':
          event.preventDefault()
          newCol = Math.min(currentCell.col + 1, currentRowCells.length - 1)
          break
        case 'ArrowLeft':
          event.preventDefault()
          newCol = Math.max(currentCell.col - 1, 0)
          break
        case 'ArrowDown':
          event.preventDefault()
          newRow = Math.min(currentCell.row + 1, rows.length - 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          newRow = Math.max(currentCell.row - 1, 0)
          break
        case 'Home':
          event.preventDefault()
          newCol = 0
          break
        case 'End':
          event.preventDefault()
          newCol = currentRowCells.length - 1
          break
      }

      if (newRow !== currentCell.row || newCol !== currentCell.col) {
        const newRowElement = rows[newRow]
        const newCells = Array.from(newRowElement.querySelectorAll('td, th')) as HTMLElement[]
        const newCell = newCells[Math.min(newCol, newCells.length - 1)]
        
        if (newCell) {
          newCell.focus()
          setCurrentCell({ row: newRow, col: Math.min(newCol, newCells.length - 1) })
        }
      }
    }

    table.addEventListener('keydown', handleKeyDown)
    return () => table.removeEventListener('keydown', handleKeyDown)
  }, [currentCell])

  const handleCellFocus = (event: React.FocusEvent<HTMLTableElement>) => {
    const target = event.target as HTMLElement
    if (target.tagName === 'TD' || target.tagName === 'TH') {
      const table = tableRef.current
      if (!table) return

      const rows = Array.from(table.querySelectorAll('tr'))
      const rowIndex = rows.findIndex(row => row.contains(target))
      const row = rows[rowIndex]
      const cells = Array.from(row.querySelectorAll('td, th'))
      const colIndex = cells.indexOf(target)

      setCurrentCell({ row: rowIndex, col: colIndex })
    }
  }

  return (
    <div className="overflow-auto">
      <table
        ref={tableRef}
        className={cn("w-full", className)}
        role="table"
        onFocus={handleCellFocus}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}

// Live Region for dynamic content announcements
interface LiveRegionProps {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
}

export function LiveRegion({ 
  children, 
  politeness = 'polite', 
  atomic = false 
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  )
}

// Progress Indicator with accessibility features
interface AccessibleProgressProps {
  value: number
  max?: number
  label?: string
  description?: string
  className?: string
}

export function AccessibleProgress({
  value,
  max = 100,
  label,
  description,
  className
}: AccessibleProgressProps) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span id="progress-label">{label}</span>
          <span aria-hidden="true">{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-labelledby={label ? "progress-label" : undefined}
        aria-describedby={description ? "progress-description" : undefined}
        className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {description && (
        <p id="progress-description" className="text-xs text-gray-500 sr-only">
          {description}
        </p>
      )}
      <ScreenReaderOnly>
        Progress: {percentage}% complete
      </ScreenReaderOnly>
    </div>
  )
}

// Dialog with proper focus management
interface AccessibleDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  initialFocusRef?: React.RefObject<HTMLElement>
}

export function AccessibleDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  initialFocusRef
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      
      // Focus management
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
      } else if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }

      // Trap focus within dialog
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose()
          return
        }

        if (event.key === 'Tab') {
          if (focusableElements.length === 0) return

          const firstElement = focusableElements[0]
          const lastElement = focusableElements[focusableElements.length - 1]

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault()
              lastElement.focus()
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault()
              firstElement.focus()
            }
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'auto'
        previousActiveElement.current?.focus()
      }
    }
  }, [isOpen, onClose, initialFocusRef])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-auto"
      >
        <div className="p-6">
          <h2 id="dialog-title" className="text-lg font-semibold mb-2">
            {title}
          </h2>
          {description && (
            <p id="dialog-description" className="text-gray-600 mb-4">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

// Accessible Form Field wrapper
interface AccessibleFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function AccessibleField({
  label,
  error,
  hint,
  required = false,
  children,
  className
}: AccessibleFieldProps) {
  const fieldId = React.useId()
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {hint && (
        <p id={hintId} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        id: fieldId,
        'aria-describedby': [
          hint ? hintId : null,
          error ? errorId : null
        ].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Announce updates to screen readers
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// High contrast mode detection
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

// Reduced motion detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}