'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useLiveRegion, useSkipLinks } from '@/hooks/useAccessibility'

interface AccessibilityContextType {
  // Live region functions
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  clearAnnouncement: () => void
  
  // Skip links
  addSkipLink: (id: string, label: string) => void
  removeSkipLink: (id: string) => void
  skipToContent: (targetId: string) => void
  
  // User preferences
  prefersReducedMotion: boolean
  prefersHighContrast: boolean
  fontSize: 'small' | 'medium' | 'large' | 'xl'
  
  // Settings
  updateFontSize: (size: 'small' | 'medium' | 'large' | 'xl') => void
  
  // Focus management
  focusManagement: {
    trapFocus: boolean
    restoreFocus: boolean
  }
  updateFocusManagement: (settings: Partial<{ trapFocus: boolean; restoreFocus: boolean }>) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  // Live region and skip links
  const { announcement, politeness, announce, clear } = useLiveRegion()
  const { skipLinks, addSkipLink, removeSkipLink, skipToContent } = useSkipLinks()
  
  // User preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xl'>('medium')
  const [focusManagement, setFocusManagement] = useState({
    trapFocus: true,
    restoreFocus: true
  })

  // Media query listeners
  useEffect(() => {
    // Reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(motionQuery.matches)
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    motionQuery.addEventListener('change', handleMotionChange)

    // High contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    setPrefersHighContrast(contrastQuery.matches)
    
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches)
    }
    
    contrastQuery.addEventListener('change', handleContrastChange)

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      contrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [])

  // Load saved preferences
  useEffect(() => {
    try {
      const savedFontSize = localStorage.getItem('accessibility-font-size')
      if (savedFontSize && ['small', 'medium', 'large', 'xl'].includes(savedFontSize)) {
        setFontSize(savedFontSize as any)
      }

      const savedFocusManagement = localStorage.getItem('accessibility-focus-management')
      if (savedFocusManagement) {
        setFocusManagement(JSON.parse(savedFocusManagement))
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error)
    }
  }, [])

  // Apply font size to document
  useEffect(() => {
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xl: '20px'
    }
    
    document.documentElement.style.fontSize = fontSizeMap[fontSize]
    
    // Save preference
    try {
      localStorage.setItem('accessibility-font-size', fontSize)
    } catch (error) {
      console.warn('Failed to save font size preference:', error)
    }
  }, [fontSize])

  // Apply motion preferences
  useEffect(() => {
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    } else {
      document.documentElement.classList.remove('reduce-motion')
    }
  }, [prefersReducedMotion])

  // Apply contrast preferences
  useEffect(() => {
    if (prefersHighContrast) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [prefersHighContrast])

  const updateFontSize = (size: 'small' | 'medium' | 'large' | 'xl') => {
    setFontSize(size)
  }

  const updateFocusManagement = (settings: Partial<{ trapFocus: boolean; restoreFocus: boolean }>) => {
    const newSettings = { ...focusManagement, ...settings }
    setFocusManagement(newSettings)
    
    try {
      localStorage.setItem('accessibility-focus-management', JSON.stringify(newSettings))
    } catch (error) {
      console.warn('Failed to save focus management preferences:', error)
    }
  }

  const contextValue: AccessibilityContextType = {
    announce,
    clearAnnouncement: clear,
    addSkipLink,
    removeSkipLink,
    skipToContent,
    prefersReducedMotion,
    prefersHighContrast,
    fontSize,
    updateFontSize,
    focusManagement,
    updateFocusManagement
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {/* Skip Links */}
      <div className="sr-only focus-within:not-sr-only">
        <div className="fixed top-0 left-0 z-[9999] bg-white border border-gray-300 p-2 shadow-lg">
          {skipLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => skipToContent(link.id)}
              className="block w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Region */}
      <div
        aria-live={politeness}
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      {/* Main Content */}
      <div className={`accessibility-root font-size-${fontSize}`}>
        {children}
      </div>
    </AccessibilityContext.Provider>
  )
}

// Hook to use accessibility context
export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Component for accessibility settings panel
interface AccessibilitySettingsProps {
  className?: string
}

export function AccessibilitySettings({ className }: AccessibilitySettingsProps) {
  const {
    fontSize,
    updateFontSize,
    focusManagement,
    updateFocusManagement,
    prefersReducedMotion,
    prefersHighContrast
  } = useAccessibility()

  return (
    <div className={className} role="region" aria-labelledby="accessibility-settings-title">
      <h2 id="accessibility-settings-title" className="text-lg font-semibold mb-4">
        Accessibility Settings
      </h2>
      
      <div className="space-y-6">
        {/* Font Size */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">Font Size</legend>
          <div className="space-y-2">
            {(['small', 'medium', 'large', 'xl'] as const).map((size) => (
              <div key={size} className="flex items-center">
                <input
                  type="radio"
                  id={`font-${size}`}
                  name="fontSize"
                  value={size}
                  checked={fontSize === size}
                  onChange={() => updateFontSize(size)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor={`font-${size}`} className="ml-2 text-sm text-gray-700 capitalize">
                  {size}
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        {/* Focus Management */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">Focus Management</legend>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="trapFocus"
                checked={focusManagement.trapFocus}
                onChange={(e) => updateFocusManagement({ trapFocus: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="trapFocus" className="ml-2 text-sm text-gray-700">
                Trap focus in modals and dropdowns
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="restoreFocus"
                checked={focusManagement.restoreFocus}
                onChange={(e) => updateFocusManagement({ restoreFocus: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="restoreFocus" className="ml-2 text-sm text-gray-700">
                Restore focus when closing modals
              </label>
            </div>
          </div>
        </fieldset>

        {/* System Preferences (Read-only) */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">System Preferences</legend>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Reduced Motion:</span>
              <span>{prefersReducedMotion ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span>High Contrast:</span>
              <span>{prefersHighContrast ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            These settings are controlled by your system preferences and cannot be changed here.
          </p>
        </fieldset>
      </div>
    </div>
  )
}

// Component for main content wrapper with skip target
interface MainContentProps {
  children: ReactNode
  id?: string
  className?: string
}

export function MainContent({ children, id = 'main-content', className }: MainContentProps) {
  const { addSkipLink, removeSkipLink } = useAccessibility()

  useEffect(() => {
    addSkipLink(id, 'Skip to main content')
    return () => removeSkipLink(id)
  }, [id, addSkipLink, removeSkipLink])

  return (
    <main 
      id={id} 
      className={className}
      tabIndex={-1}
      role="main"
      aria-label="Main content"
    >
      {children}
    </main>
  )
}

// Component for section with skip target
interface SectionProps {
  children: ReactNode
  id: string
  title: string
  className?: string
  skipLinkLabel?: string
}

export function AccessibleSection({ 
  children, 
  id, 
  title, 
  className,
  skipLinkLabel 
}: SectionProps) {
  const { addSkipLink, removeSkipLink } = useAccessibility()

  useEffect(() => {
    addSkipLink(id, skipLinkLabel || `Skip to ${title}`)
    return () => removeSkipLink(id)
  }, [id, title, skipLinkLabel, addSkipLink, removeSkipLink])

  return (
    <section 
      id={id} 
      className={className}
      tabIndex={-1}
      aria-labelledby={`${id}-heading`}
    >
      <h2 id={`${id}-heading`} className="sr-only">
        {title}
      </h2>
      {children}
    </section>
  )
}