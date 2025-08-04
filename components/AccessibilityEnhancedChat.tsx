'use client'

import React, { useState, useRef, useEffect, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AccessibilityIcon, TypeIcon, EyeIcon, EarIcon, MousePointerIcon } from 'lucide-react'

interface AccessibilitySettings {
  fontSize: 'small' | 'normal' | 'large' | 'extra-large'
  contrast: 'normal' | 'high' | 'enhanced'
  reduceMotion: boolean
  screenReaderOptimized: boolean
  keyboardNavigation: boolean
  colorBlindFriendly: boolean
  focusIndicators: 'normal' | 'enhanced' | 'high-contrast'
  announcements: boolean
  hapticFeedback: boolean
  voiceGuidance: boolean
}

interface AccessibilityEnhancedChatProps {
  children: ReactNode
  onSettingsChange?: (settings: AccessibilitySettings) => void
  className?: string
}

interface ScreenReaderAnnouncementProps {
  message: string
  priority?: 'polite' | 'assertive'
  live?: boolean
}

const ScreenReaderAnnouncement: React.FC<ScreenReaderAnnouncementProps> = ({
  message,
  priority = 'polite',
  live = true
}) => {
  const [currentMessage, setCurrentMessage] = useState('')
  
  useEffect(() => {
    if (live && message) {
      setCurrentMessage(message)
      // Clear after announcement to allow re-announcing same message
      const timer = setTimeout(() => setCurrentMessage(''), 1000)
      return () => clearTimeout(timer)
    }
  }, [message, live])
  
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {currentMessage}
    </div>
  )
}

const AccessibilityEnhancedChat: React.FC<AccessibilityEnhancedChatProps> = ({
  children,
  onSettingsChange,
  className = ''
}) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 'normal',
    contrast: 'normal',
    reduceMotion: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    colorBlindFriendly: false,
    focusIndicators: 'normal',
    announcements: true,
    hapticFeedback: false,
    voiceGuidance: false
  })
  
  const [showA11yPanel, setShowA11yPanel] = useState(false)
  const [currentFocus, setCurrentFocus] = useState<string | null>(null)
  const [announcements, setAnnouncements] = useState<string[]>([])
  
  const chatRef = useRef<HTMLDivElement>(null)
  const a11yButtonRef = useRef<HTMLButtonElement>(null)
  
  // Load accessibility preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('echoes-accessibility-settings')
    if (saved) {
      try {
        const savedSettings = JSON.parse(saved)
        setSettings(savedSettings)
        applyAccessibilitySettings(savedSettings)
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error)
      }
    }
    
    // Detect user preferences
    detectUserPreferences()
  }, [])
  
  // Detect system accessibility preferences
  const detectUserPreferences = () => {
    const updates: Partial<AccessibilitySettings> = {}
    
    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      updates.reduceMotion = true
    }
    
    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      updates.contrast = 'high'
    }
    
    // Detect if user is using keyboard navigation
    const detectKeyboardUser = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        updates.keyboardNavigation = true
        setSettings(prev => ({ ...prev, ...updates }))
        document.removeEventListener('keydown', detectKeyboardUser)
      }
    }
    document.addEventListener('keydown', detectKeyboardUser)
    
    if (Object.keys(updates).length > 0) {
      setSettings(prev => ({ ...prev, ...updates }))
    }
  }
  
  // Apply accessibility settings to DOM
  const applyAccessibilitySettings = (newSettings: AccessibilitySettings) => {
    const root = document.documentElement
    
    // Font size
    root.style.setProperty('--a11y-font-scale', {
      'small': '0.875',
      'normal': '1',
      'large': '1.125',
      'extra-large': '1.25'
    }[newSettings.fontSize])
    
    // Contrast
    root.setAttribute('data-contrast', newSettings.contrast)
    
    // Reduced motion
    if (newSettings.reduceMotion) {
      root.style.setProperty('--animation-duration', '0.01s')
      root.style.setProperty('--transition-duration', '0.01s')
    } else {
      root.style.removeProperty('--animation-duration')
      root.style.removeProperty('--transition-duration')
    }
    
    // Color blind friendly mode
    if (newSettings.colorBlindFriendly) {
      root.setAttribute('data-colorblind-friendly', 'true')
    } else {
      root.removeAttribute('data-colorblind-friendly')
    }
    
    // Focus indicators
    root.setAttribute('data-focus-indicators', newSettings.focusIndicators)
    
    // Screen reader optimizations
    if (newSettings.screenReaderOptimized) {
      root.setAttribute('data-screen-reader-optimized', 'true')
    } else {
      root.removeAttribute('data-screen-reader-optimized')
    }
  }
  
  // Update settings and persist
  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    applyAccessibilitySettings(newSettings)
    
    // Persist to localStorage
    localStorage.setItem('echoes-accessibility-settings', JSON.stringify(newSettings))
    
    // Notify parent component
    onSettingsChange?.(newSettings)
    
    // Announce changes
    if (settings.announcements) {
      announceChange(updates)
    }
  }
  
  // Announce accessibility changes
  const announceChange = (updates: Partial<AccessibilitySettings>) => {
    const changes = Object.entries(updates).map(([key, value]) => {
      switch (key) {
        case 'fontSize':
          return `Font size changed to ${value}`
        case 'contrast':
          return `Contrast changed to ${value}`
        case 'reduceMotion':
          return value ? 'Motion reduction enabled' : 'Motion reduction disabled'
        case 'voiceGuidance':
          return value ? 'Voice guidance enabled' : 'Voice guidance disabled'
        default:
          return `${key} ${value ? 'enabled' : 'disabled'}`
      }
    }).join(', ')
    
    addAnnouncement(changes)
  }
  
  // Add screen reader announcement
  const addAnnouncement = (message: string) => {
    setAnnouncements(prev => [...prev, message])
    
    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1))
    }, 3000)
  }
  
  // Keyboard navigation helpers
  const handleKeyNavigation = (e: KeyboardEvent) => {
    if (!settings.keyboardNavigation) return
    
    // Global keyboard shortcuts
    if (e.altKey) {
      switch (e.key) {
        case 'a':
          e.preventDefault()
          setShowA11yPanel(!showA11yPanel)
          addAnnouncement('Accessibility panel toggled')
          break
        case '1':
          e.preventDefault()
          updateSettings({ fontSize: 'small' })
          break
        case '2':
          e.preventDefault()
          updateSettings({ fontSize: 'normal' })
          break
        case '3':
          e.preventDefault()
          updateSettings({ fontSize: 'large' })
          break
        case '4':
          e.preventDefault()
          updateSettings({ fontSize: 'extra-large' })
          break
        case 'c':
          e.preventDefault()
          const nextContrast = {
            'normal': 'high',
            'high': 'enhanced',
            'enhanced': 'normal'
          }[settings.contrast] as AccessibilitySettings['contrast']
          updateSettings({ contrast: nextContrast })
          break
        case 'm':
          e.preventDefault()
          updateSettings({ reduceMotion: !settings.reduceMotion })
          break
      }
    }
    
    // Escape key handling
    if (e.key === 'Escape' && showA11yPanel) {
      setShowA11yPanel(false)
      a11yButtonRef.current?.focus()
      addAnnouncement('Accessibility panel closed')
    }
  }
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation)
    return () => document.removeEventListener('keydown', handleKeyNavigation)
  }, [settings, showA11yPanel])
  
  // Focus management
  const handleFocusChange = (elementId: string) => {
    setCurrentFocus(elementId)
    if (settings.announcements) {
      addAnnouncement(`Focused on ${elementId}`)
    }
  }
  
  // Get accessibility class names
  const getA11yClasses = () => {
    const classes = []
    
    if (settings.fontSize !== 'normal') {
      classes.push(`text-${settings.fontSize}`)
    }
    
    if (settings.contrast !== 'normal') {
      classes.push(`contrast-${settings.contrast}`)
    }
    
    if (settings.reduceMotion) {
      classes.push('motion-reduced')
    }
    
    if (settings.screenReaderOptimized) {
      classes.push('sr-optimized')
    }
    
    if (settings.colorBlindFriendly) {
      classes.push('colorblind-friendly')
    }
    
    classes.push(`focus-${settings.focusIndicators}`)
    
    return classes.join(' ')
  }
  
  return (
    <div 
      ref={chatRef}
      className={`accessibility-enhanced-chat ${getA11yClasses()} ${className}`}
      role="main"
      aria-label="AI Echo Chat Interface"
    >
      {/* Screen reader announcements */}
      {announcements.map((announcement, index) => (
        <ScreenReaderAnnouncement
          key={index}
          message={announcement}
          priority="polite"
        />
      ))}
      
      {/* Skip link */}
      <a
        href="#main-chat"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-hope-600 text-white px-4 py-2 rounded-comfort z-50"
      >
        Skip to main chat
      </a>
      
      {/* Accessibility floating action button */}
      <Button
        ref={a11yButtonRef}
        onClick={() => setShowA11yPanel(!showA11yPanel)}
        className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-hope-600 hover:bg-hope-700 text-white shadow-lg z-40 transition-all duration-300"
        aria-label="Open accessibility settings"
        aria-expanded={showA11yPanel}
        aria-controls="accessibility-panel"
      >
        <AccessibilityIcon className="w-6 h-6" />
      </Button>
      
      {/* Accessibility settings panel */}
      {showA11yPanel && (
        <div
          id="accessibility-panel"
          className="fixed bottom-36 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-hope-200 z-50"
          role="dialog"
          aria-label="Accessibility Settings"
          aria-modal="false"
        >
          <Card className="border-0 shadow-none">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-supportive text-peace-800">
                  Accessibility Settings
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowA11yPanel(false)}
                  aria-label="Close accessibility settings"
                >
                  ✕
                </Button>
              </div>
              
              {/* Font Size */}
              <div className="space-y-3">
                <label className="text-sm font-supportive text-peace-700 flex items-center gap-2">
                  <TypeIcon className="w-4 h-4" />
                  Text Size
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'small', label: 'Small', shortcut: 'Alt+1' },
                    { key: 'normal', label: 'Normal', shortcut: 'Alt+2' },
                    { key: 'large', label: 'Large', shortcut: 'Alt+3' },
                    { key: 'extra-large', label: 'X-Large', shortcut: 'Alt+4' }
                  ].map(({ key, label, shortcut }) => (
                    <Button
                      key={key}
                      variant={settings.fontSize === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ fontSize: key as AccessibilitySettings['fontSize'] })}
                      className="text-xs"
                      aria-label={`Set text size to ${label}, keyboard shortcut ${shortcut}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Contrast */}
              <div className="space-y-3">
                <label className="text-sm font-supportive text-peace-700 flex items-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  Contrast
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'normal', label: 'Normal' },
                    { key: 'high', label: 'High' },
                    { key: 'enhanced', label: 'Enhanced' }
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={settings.contrast === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ contrast: key as AccessibilitySettings['contrast'] })}
                      className="text-xs"
                      aria-label={`Set contrast to ${label}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Toggle Settings */}
              <div className="space-y-4">
                {[
                  {
                    key: 'reduceMotion',
                    label: 'Reduce Motion',
                    description: 'Minimize animations and transitions',
                    icon: MousePointerIcon,
                    shortcut: 'Alt+M'
                  },
                  {
                    key: 'voiceGuidance',
                    label: 'Voice Guidance',
                    description: 'Spoken descriptions of interface actions',
                    icon: EarIcon
                  },
                  {
                    key: 'announcements',
                    label: 'Screen Reader Announcements',
                    description: 'Announce important changes and updates',
                    icon: AccessibilityIcon
                  },
                  {
                    key: 'colorBlindFriendly',
                    label: 'Color Blind Friendly',
                    description: 'Enhanced patterns and indicators',
                    icon: EyeIcon
                  }
                ].map(({ key, label, description, icon: Icon, shortcut }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-peace-600" />
                        <span className="text-sm font-supportive text-peace-700">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {shortcut && (
                          <Badge variant="outline" className="text-xs">
                            {shortcut}
                          </Badge>
                        )}
                        <input
                          type="checkbox"
                          checked={settings[key as keyof AccessibilitySettings] as boolean}
                          onChange={(e) => updateSettings({ [key]: e.target.checked })}
                          className="w-4 h-4 text-hope-600 bg-white border-hope-300 rounded focus:ring-hope-500 focus:ring-2"
                          aria-describedby={`${key}-desc`}
                        />
                      </div>
                    </div>
                    <p id={`${key}-desc`} className="text-xs text-peace-600 pl-6">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Keyboard shortcuts help */}
              <div className="pt-4 border-t border-hope-200">
                <h4 className="text-sm font-supportive text-peace-700 mb-2">
                  Keyboard Shortcuts
                </h4>
                <div className="text-xs text-peace-600 space-y-1">
                  <div>Alt+A: Toggle this panel</div>
                  <div>Alt+1-4: Change text size</div>
                  <div>Alt+C: Cycle contrast modes</div>
                  <div>Alt+M: Toggle motion reduction</div>
                  <div>Escape: Close panels</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main content with accessibility enhancements */}
      <div id="main-chat" className="h-full">
        {children}
      </div>
      
      {/* Accessibility styles */}
      <style jsx global>{`
        .accessibility-enhanced-chat {
          --focus-ring-color: #0ea5e9;
          --focus-ring-width: 2px;
          --focus-ring-offset: 2px;
        }
        
        /* Font size scaling */
        .accessibility-enhanced-chat.text-small {
          font-size: calc(1rem * 0.875);
        }
        
        .accessibility-enhanced-chat.text-large {
          font-size: calc(1rem * 1.125);
        }
        
        .accessibility-enhanced-chat.text-extra-large {
          font-size: calc(1rem * 1.25);
        }
        
        /* High contrast mode */
        .accessibility-enhanced-chat.contrast-high {
          --hope-500: #0066cc;
          --peace-600: #000000;
          --peace-800: #000000;
          filter: contrast(150%);
        }
        
        .accessibility-enhanced-chat.contrast-enhanced {
          --hope-500: #003d7a;
          --peace-600: #000000;
          --peace-800: #000000;
          filter: contrast(200%);
        }
        
        /* Reduced motion */
        .accessibility-enhanced-chat.motion-reduced * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        
        /* Enhanced focus indicators */
        .accessibility-enhanced-chat.focus-enhanced *:focus {
          outline: var(--focus-ring-width) solid var(--focus-ring-color);
          outline-offset: var(--focus-ring-offset);
          box-shadow: 0 0 0 calc(var(--focus-ring-width) + var(--focus-ring-offset)) rgba(14, 165, 233, 0.25);
        }
        
        .accessibility-enhanced-chat.focus-high-contrast *:focus {
          outline: 3px solid #000000;
          outline-offset: 2px;
          box-shadow: 0 0 0 6px #ffff00;
        }
        
        /* Color blind friendly mode */
        .accessibility-enhanced-chat.colorblind-friendly {
          /* Add patterns and shapes to convey meaning beyond color */
        }
        
        .accessibility-enhanced-chat.colorblind-friendly .bg-green-400::before {
          content: "✓";
          color: white;
          font-weight: bold;
        }
        
        .accessibility-enhanced-chat.colorblind-friendly .bg-red-400::before {
          content: "✗";
          color: white;
          font-weight: bold;
        }
        
        /* Screen reader optimizations */
        .accessibility-enhanced-chat.sr-optimized .animate-pulse,
        .accessibility-enhanced-chat.sr-optimized .animate-bounce,
        .accessibility-enhanced-chat.sr-optimized .animate-spin {
          animation: none;
        }
        
        /* Large touch targets for mobile accessibility */
        @media (hover: none) and (pointer: coarse) {
          .accessibility-enhanced-chat button,
          .accessibility-enhanced-chat [role="button"],
          .accessibility-enhanced-chat input[type="checkbox"],
          .accessibility-enhanced-chat input[type="radio"] {
            min-height: 44px;
            min-width: 44px;
          }
        }
        
        /* High contrast mode for Windows */
        @media (prefers-contrast: high) {
          .accessibility-enhanced-chat {
            forced-color-adjust: none;
          }
        }
        
        /* Print styles for accessibility */
        @media print {
          .accessibility-enhanced-chat {
            color: black !important;
            background: white !important;
          }
          
          .accessibility-enhanced-chat .bg-gradient-to-br {
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}

export default AccessibilityEnhancedChat