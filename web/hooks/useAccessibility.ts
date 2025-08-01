'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

// Hook for managing focus
export function useFocusManagement() {
  const focusedElementRef = useRef<HTMLElement | null>(null)
  
  const saveFocus = useCallback(() => {
    focusedElementRef.current = document.activeElement as HTMLElement
  }, [])
  
  const restoreFocus = useCallback(() => {
    if (focusedElementRef.current && typeof focusedElementRef.current.focus === 'function') {
      focusedElementRef.current.focus()
    }
  }, [])
  
  const focusElement = useCallback((element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus()
    }
  }, [])

  return { saveFocus, restoreFocus, focusElement }
}

// Hook for focus trap (useful for modals, dropdowns)
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    previousFocusRef.current = document.activeElement as HTMLElement

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus first element
    if (firstElement) {
      firstElement.focus()
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Let parent components handle escape
        return
      }
    }

    document.addEventListener('keydown', handleTabKey)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      document.removeEventListener('keydown', handleEscapeKey)
      
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [isActive])

  return containerRef
}

// Hook for live region announcements
export function useLiveRegion() {
  const [announcement, setAnnouncement] = useState('')
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite')
  const timeoutRef = useRef<NodeJS.Timeout>()

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setPoliteness(priority)
    setAnnouncement('')

    // Small delay to ensure screen readers pick up the change
    timeoutRef.current = setTimeout(() => {
      setAnnouncement(message)
      
      // Clear after announcement to allow for repeated messages
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('')
      }, 1000)
    }, 50)
  }, [])

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setAnnouncement('')
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { announcement, politeness, announce, clear }
}

// Hook for keyboard navigation in lists/grids
export function useKeyboardNavigation(
  items: HTMLElement[], 
  orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical',
  wrap: boolean = true
) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { key } = e
    let newIndex = currentIndex

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          e.preventDefault()
          newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1)
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          e.preventDefault()
          newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0)
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          e.preventDefault()
          newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1)
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          e.preventDefault()
          newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0)
        }
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = items.length - 1
        break
      default:
        return
    }

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex)
      items[newIndex]?.focus()
    }
  }, [currentIndex, items, orientation, wrap])

  return { currentIndex, setCurrentIndex, handleKeyDown }
}

// Hook for reduced motion preferences
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

// Hook for high contrast preferences
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setPrefersHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersHighContrast
}

// Hook for managing ARIA expanded state
export function useAriaExpanded(initialExpanded: boolean = false) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  const [triggerId] = useState(() => `trigger-${Math.random().toString(36).substr(2, 9)}`)
  const [contentId] = useState(() => `content-${Math.random().toString(36).substr(2, 9)}`)

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const expand = useCallback(() => {
    setIsExpanded(true)
  }, [])

  const collapse = useCallback(() => {
    setIsExpanded(false)
  }, [])

  const triggerProps = {
    id: triggerId,
    'aria-expanded': isExpanded,
    'aria-controls': contentId
  }

  const contentProps = {
    id: contentId,
    'aria-labelledby': triggerId,
    hidden: !isExpanded
  }

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    triggerProps,
    contentProps
  }
}

// Hook for managing ARIA selected state in lists
export function useAriaSelection(itemCount: number, multiSelect: boolean = false) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const selectItem = useCallback((index: number) => {
    if (multiSelect) {
      setSelectedIndices(prev => {
        const newSet = new Set(prev)
        if (newSet.has(index)) {
          newSet.delete(index)
        } else {
          newSet.add(index)
        }
        return newSet
      })
    } else {
      setSelectedIndices(new Set([index]))
    }
  }, [multiSelect])

  const selectAll = useCallback(() => {
    if (multiSelect) {
      setSelectedIndices(new Set(Array.from({ length: itemCount }, (_, i) => i)))
    }
  }, [itemCount, multiSelect])

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set())
  }, [])

  const isSelected = useCallback((index: number) => {
    return selectedIndices.has(index)
  }, [selectedIndices])

  const getItemProps = useCallback((index: number) => ({
    'aria-selected': selectedIndices.has(index),
    'tabIndex': index === activeIndex ? 0 : -1,
    role: multiSelect ? 'option' : 'option'
  }), [selectedIndices, activeIndex, multiSelect])

  return {
    selectedIndices: Array.from(selectedIndices),
    activeIndex,
    setActiveIndex,
    selectItem,
    selectAll,
    clearSelection,
    isSelected,
    getItemProps
  }
}

// Hook for skip links functionality
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null)
  const [skipLinks, setSkipLinks] = useState<Array<{ id: string; label: string }>>([])

  const addSkipLink = useCallback((id: string, label: string) => {
    setSkipLinks(prev => {
      const exists = prev.find(link => link.id === id)
      if (exists) return prev
      return [...prev, { id, label }]
    })
  }, [])

  const removeSkipLink = useCallback((id: string) => {
    setSkipLinks(prev => prev.filter(link => link.id !== id))
  }, [])

  const skipToContent = useCallback((targetId: string) => {
    const element = document.getElementById(targetId)
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return {
    skipLinksRef,
    skipLinks,
    addSkipLink,
    removeSkipLink,
    skipToContent
  }
}

// Hook for form validation with ARIA
export function useAriaFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }))
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
  }, [])

  const getFieldProps = useCallback((fieldName: string) => {
    const hasError = errors[fieldName] && touched[fieldName]
    const errorId = hasError ? `${fieldName}-error` : undefined

    return {
      'aria-invalid': hasError,
      'aria-describedby': errorId,
      onBlur: () => setFieldTouched(fieldName)
    }
  }, [errors, touched, setFieldTouched])

  const getErrorProps = useCallback((fieldName: string) => {
    const hasError = errors[fieldName] && touched[fieldName]
    
    return {
      id: `${fieldName}-error`,
      role: 'alert',
      'aria-live': 'polite',
      hidden: !hasError
    }
  }, [errors, touched])

  return {
    errors,
    touched,
    setFieldError,
    clearFieldError,
    setFieldTouched,
    getFieldProps,
    getErrorProps
  }
}

// Hook for screen reader detection
export function useScreenReader() {
  const [isScreenReader, setIsScreenReader] = useState(false)

  useEffect(() => {
    // Check for common screen reader indicators
    const checkScreenReader = () => {
      // Check for NVDA, JAWS, VoiceOver, etc.
      const userAgent = navigator.userAgent.toLowerCase()
      const hasScreenReaderUA = /nvda|jaws|voiceover|talkback/.test(userAgent)
      
      // Check for reduced motion (often indicates assistive technology)
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      
      // Check for no-js fallbacks being used
      const hasNoJSClass = document.documentElement.classList.contains('no-js')
      
      setIsScreenReader(hasScreenReaderUA || prefersReducedMotion || hasNoJSClass)
    }

    checkScreenReader()

    // Listen for accessibility preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', checkScreenReader)

    return () => {
      motionQuery.removeEventListener('change', checkScreenReader)
    }
  }, [])

  return isScreenReader
}

// Custom hook for managing roving tabindex
export function useRovingTabIndex(items: React.RefObject<HTMLElement>[]) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    items.forEach((item, index) => {
      if (item.current) {
        item.current.tabIndex = index === currentIndex ? 0 : -1
      }
    })
  }, [items, currentIndex])

  const setFocusIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index)
      items[index].current?.focus()
    }
  }, [items])

  return { currentIndex, setFocusIndex }
}

// Main accessibility hook that combines common functionality
export function useAccessibility() {
  const focusManagement = useFocusManagement()
  const liveRegion = useLiveRegion()
  const reducedMotion = useReducedMotion()
  const highContrast = useHighContrast()
  const screenReader = useScreenReader()
  const skipLinks = useSkipLinks()

  return {
    ...focusManagement,
    ...liveRegion,
    reducedMotion,
    highContrast,
    screenReader,
    ...skipLinks
  }
}