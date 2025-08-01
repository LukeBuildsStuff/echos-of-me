'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// Global keyboard shortcut management
export function useGlobalKeyboardShortcuts() {
  const shortcutsRef = useRef<Map<string, () => void>>(new Map())
  const [isEnabled, setIsEnabled] = useState(true)

  const registerShortcut = useCallback((key: string, callback: () => void) => {
    shortcutsRef.current.set(key.toLowerCase(), callback)
  }, [])

  const unregisterShortcut = useCallback((key: string) => {
    shortcutsRef.current.delete(key.toLowerCase())
  }, [])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return

    // Don't trigger shortcuts when user is typing in inputs
    const activeElement = document.activeElement
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       activeElement.tagName === 'SELECT' ||
       activeElement.isContentEditable)
    ) {
      return
    }

    // Build key combination string
    const parts = []
    if (event.ctrlKey || event.metaKey) parts.push('ctrl')
    if (event.shiftKey) parts.push('shift')
    if (event.altKey) parts.push('alt')
    
    // Use the actual key for single keys, or combine with modifiers
    const key = event.key.toLowerCase()
    if (parts.length > 0) {
      parts.push(key)
    }
    
    const shortcutKey = parts.length > 0 ? parts.join('+') : key
    
    const callback = shortcutsRef.current.get(shortcutKey)
    if (callback) {
      event.preventDefault()
      event.stopPropagation()
      callback()
    }
  }, [isEnabled])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    registerShortcut,
    unregisterShortcut,
    isEnabled,
    setIsEnabled
  }
}

// Menu/List keyboard navigation
export function useMenuNavigation(
  items: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical'
    wrap?: boolean
    disabled?: boolean
    onSelect?: (index: number) => void
    onEscape?: () => void
  } = {}
) {
  const {
    orientation = 'vertical',
    wrap = true,
    disabled = false,
    onSelect,
    onEscape
  } = options

  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isActive, setIsActive] = useState(false)

  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      items[index].focus()
      setCurrentIndex(index)
    }
  }, [items])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || !isActive) return

    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical') {
          event.preventDefault()
          newIndex = currentIndex + 1
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1
          }
        }
        break

      case 'ArrowUp':
        if (orientation === 'vertical') {
          event.preventDefault()
          newIndex = currentIndex - 1
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0
          }
        }
        break

      case 'ArrowRight':
        if (orientation === 'horizontal') {
          event.preventDefault()
          newIndex = currentIndex + 1
          if (newIndex >= items.length) {
            newIndex = wrap ? 0 : items.length - 1
          }
        }
        break

      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          event.preventDefault()
          newIndex = currentIndex - 1
          if (newIndex < 0) {
            newIndex = wrap ? items.length - 1 : 0
          }
        }
        break

      case 'Home':
        event.preventDefault()
        newIndex = 0
        break

      case 'End':
        event.preventDefault()
        newIndex = items.length - 1
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        if (currentIndex >= 0 && onSelect) {
          onSelect(currentIndex)
        }
        break

      case 'Escape':
        event.preventDefault()
        if (onEscape) {
          onEscape()
        }
        break

      default:
        return
    }

    if (newIndex !== currentIndex) {
      focusItem(newIndex)
    }
  }, [currentIndex, items, orientation, wrap, disabled, isActive, onSelect, onEscape, focusItem])

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, isActive])

  return {
    currentIndex,
    isActive,
    setIsActive,
    focusItem,
    focusFirst: () => focusItem(0),
    focusLast: () => focusItem(items.length - 1)
  }
}

// Table keyboard navigation
export function useTableNavigation(
  rows: number,
  cols: number,
  options: {
    disabled?: boolean
    onCellSelect?: (row: number, col: number) => void
    onRowSelect?: (row: number) => void
  } = {}
) {
  const { disabled = false, onCellSelect, onRowSelect } = options
  
  const [currentCell, setCurrentCell] = useState({ row: 0, col: 0 })
  const [isActive, setIsActive] = useState(false)

  const focusCell = useCallback((row: number, col: number) => {
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement
      if (cell) {
        cell.focus()
        setCurrentCell({ row, col })
        if (onCellSelect) {
          onCellSelect(row, col)
        }
      }
    }
  }, [rows, cols, onCellSelect])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || !isActive) return

    const { row, col } = currentCell
    let newRow = row
    let newCol = col

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        newRow = Math.min(row + 1, rows - 1)
        break

      case 'ArrowUp':
        event.preventDefault()
        newRow = Math.max(row - 1, 0)
        break

      case 'ArrowRight':
        event.preventDefault()
        newCol = Math.min(col + 1, cols - 1)
        break

      case 'ArrowLeft':
        event.preventDefault()
        newCol = Math.max(col - 1, 0)
        break

      case 'Home':
        event.preventDefault()
        if (event.ctrlKey) {
          newRow = 0
          newCol = 0
        } else {
          newCol = 0
        }
        break

      case 'End':
        event.preventDefault()
        if (event.ctrlKey) {
          newRow = rows - 1
          newCol = cols - 1
        } else {
          newCol = cols - 1
        }
        break

      case 'PageDown':
        event.preventDefault()
        newRow = Math.min(row + 10, rows - 1)
        break

      case 'PageUp':
        event.preventDefault()
        newRow = Math.max(row - 10, 0)
        break

      case 'Enter':
        event.preventDefault()
        if (onRowSelect) {
          onRowSelect(row)
        }
        break

      default:
        return
    }

    if (newRow !== row || newCol !== col) {
      focusCell(newRow, newCol)
    }
  }, [currentCell, rows, cols, disabled, isActive, onCellSelect, onRowSelect, focusCell])

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, isActive])

  return {
    currentCell,
    isActive,
    setIsActive,
    focusCell,
    focusFirst: () => focusCell(0, 0),
    focusLast: () => focusCell(rows - 1, cols - 1)
  }
}

// Modal/Dialog keyboard navigation
export function useModalNavigation(
  isOpen: boolean,
  options: {
    onClose?: () => void
    closeOnEscape?: boolean
    restoreFocus?: boolean
  } = {}
) {
  const { onClose, closeOnEscape = true, restoreFocus = true } = options
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const modalRef = useRef<HTMLElement | null>(null)

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!modalRef.current || !isOpen) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    if (event.key === 'Escape' && closeOnEscape && onClose) {
      event.preventDefault()
      onClose()
    }
  }, [isOpen, closeOnEscape, onClose])

  useEffect(() => {
    if (isOpen) {
      // Save current focus
      previousFocusRef.current = document.activeElement as HTMLElement
      
      // Focus first element in modal
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement
          firstFocusable?.focus()
        }
      }, 100)

      document.addEventListener('keydown', trapFocus)
      
      return () => {
        document.removeEventListener('keydown', trapFocus)
        
        // Restore focus when closing
        if (restoreFocus && previousFocusRef.current) {
          previousFocusRef.current.focus()
        }
      }
    }
  }, [isOpen, trapFocus, restoreFocus])

  return {
    modalRef,
    setModalRef: (element: HTMLElement | null) => {
      modalRef.current = element
    }
  }
}

// Form keyboard navigation
export function useFormNavigation(
  formRef: React.RefObject<HTMLFormElement>,
  options: {
    onSubmit?: () => void
    onCancel?: () => void
    submitOnCtrlEnter?: boolean
  } = {}
) {
  const { onSubmit, onCancel, submitOnCtrlEnter = true } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!formRef.current?.contains(event.target as Node)) return

    switch (event.key) {
      case 'Enter':
        if (event.ctrlKey && submitOnCtrlEnter && onSubmit) {
          event.preventDefault()
          onSubmit()
        }
        break

      case 'Escape':
        if (onCancel) {
          event.preventDefault()
          onCancel()
        }
        break

      default:
        return
    }
  }, [formRef, onSubmit, onCancel, submitOnCtrlEnter])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    formRef
  }
}

// Dropdown/Combobox keyboard navigation
export function useDropdownNavigation(
  isOpen: boolean,
  items: string[],
  options: {
    onSelect?: (index: number, value: string) => void
    onClose?: () => void
    filter?: string
  } = {}
) {
  const { onSelect, onClose, filter } = options
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const filteredItems = filter 
    ? items.filter(item => item.toLowerCase().includes(filter.toLowerCase()))
    : items

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        )
        break

      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        )
        break

      case 'Home':
        event.preventDefault()
        setHighlightedIndex(0)
        break

      case 'End':
        event.preventDefault()
        setHighlightedIndex(filteredItems.length - 1)
        break

      case 'Enter':
        event.preventDefault()
        if (highlightedIndex >= 0 && onSelect) {
          onSelect(highlightedIndex, filteredItems[highlightedIndex])
        }
        break

      case 'Escape':
        event.preventDefault()
        if (onClose) {
          onClose()
        }
        break

      default:
        return
    }
  }, [isOpen, highlightedIndex, filteredItems, onSelect, onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, isOpen])

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0)
    } else {
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  return {
    highlightedIndex,
    setHighlightedIndex
  }
}

// Tab navigation system
export function useTabNavigation(
  tabs: string[],
  defaultTab: string = tabs[0]
) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [focusedTab, setFocusedTab] = useState(defaultTab)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const currentIndex = tabs.indexOf(focusedTab)

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        const nextIndex = (currentIndex + 1) % tabs.length
        setFocusedTab(tabs[nextIndex])
        break

      case 'ArrowLeft':
        event.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
        setFocusedTab(tabs[prevIndex])
        break

      case 'Home':
        event.preventDefault()
        setFocusedTab(tabs[0])
        break

      case 'End':
        event.preventDefault()
        setFocusedTab(tabs[tabs.length - 1])
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        setActiveTab(focusedTab)
        break

      default:
        return
    }
  }, [tabs, focusedTab])

  return {
    activeTab,
    focusedTab,
    setActiveTab,
    setFocusedTab,
    handleKeyDown
  }
}