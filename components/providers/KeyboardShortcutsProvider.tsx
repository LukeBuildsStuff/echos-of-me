'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useGlobalKeyboardShortcuts } from '@/hooks/useKeyboardNavigation'
import { useAccessibility } from './AccessibilityProvider'
import { Button } from '@/components/ui/button'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { Badge } from '@/components/ui/badge'
import { Keyboard, Search, HelpCircle, Command } from 'lucide-react'

interface KeyboardShortcut {
  key: string
  description: string
  category: string
  action: () => void
  global?: boolean
  contexts?: string[]
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[]
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (key: string) => void
  isEnabled: boolean
  setIsEnabled: (enabled: boolean) => void
  showHelp: () => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined)

interface KeyboardShortcutsProviderProps {
  children: ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])
  const [showHelpModal, setShowHelpModal] = useState(false)
  const { registerShortcut: registerGlobalShortcut, unregisterShortcut: unregisterGlobalShortcut, isEnabled, setIsEnabled } = useGlobalKeyboardShortcuts()
  const { announce } = useAccessibility()

  const registerShortcut = (shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      const filtered = prev.filter(s => s.key !== shortcut.key)
      return [...filtered, shortcut]
    })

    if (shortcut.global !== false) {
      registerGlobalShortcut(shortcut.key, shortcut.action)
    }
  }

  const unregisterShortcut = (key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key))
    unregisterGlobalShortcut(key)
  }

  const showHelp = () => {
    setShowHelpModal(true)
    announce('Keyboard shortcuts help opened', 'polite')
  }

  // Register default global shortcuts
  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        category: 'Help',
        action: showHelp
      },
      {
        key: 'ctrl+/',
        description: 'Show keyboard shortcuts',
        category: 'Help',
        action: showHelp
      },
      {
        key: 'ctrl+k',
        description: 'Open search',
        category: 'Navigation',
        action: () => {
          const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
            announce('Search focused', 'polite')
          }
        }
      },
      {
        key: 'ctrl+shift+p',
        description: 'Open command palette',
        category: 'Navigation',
        action: () => {
          // Command palette implementation would go here
          announce('Command palette opened', 'polite')
        }
      },
      {
        key: 'alt+m',
        description: 'Open main menu',
        category: 'Navigation',
        action: () => {
          const menuButton = document.querySelector('[aria-label*="menu" i], [aria-label*="navigation" i]') as HTMLButtonElement
          if (menuButton) {
            menuButton.click()
            announce('Main menu opened', 'polite')
          }
        }
      },
      {
        key: 'ctrl+home',
        description: 'Go to dashboard',
        category: 'Navigation',
        action: () => {
          window.location.href = '/dashboard'
        }
      },
      {
        key: 'alt+1',
        description: 'Focus main content',
        category: 'Navigation',
        action: () => {
          const mainContent = document.getElementById('main-content') || document.querySelector('main')
          if (mainContent) {
            (mainContent as HTMLElement).focus()
            announce('Main content focused', 'polite')
          }
        }
      }
    ]

    defaultShortcuts.forEach(registerShortcut)

    return () => {
      defaultShortcuts.forEach(shortcut => unregisterShortcut(shortcut.key))
    }
  }, [])

  const contextValue: KeyboardShortcutsContextType = {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    isEnabled,
    setIsEnabled,
    showHelp
  }

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      <KeyboardShortcutsHelpModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        shortcuts={shortcuts}
      />
    </KeyboardShortcutsContext.Provider>
  )
}

// Help modal component
interface KeyboardShortcutsHelpModalProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
}

function KeyboardShortcutsHelpModal({ isOpen, onClose, shortcuts }: KeyboardShortcutsHelpModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(shortcuts.map(s => s.category))).sort()

  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = !searchQuery || 
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || shortcut.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const formatKey = (key: string) => {
    return key
      .split('+')
      .map(part => {
        switch (part.toLowerCase()) {
          case 'ctrl': return '⌃'
          case 'cmd': 
          case 'meta': return '⌘'
          case 'alt': return '⌥'
          case 'shift': return '⇧'
          case ' ': return 'Space'
          case 'arrowup': return '↑'
          case 'arrowdown': return '↓'
          case 'arrowleft': return '←'
          case 'arrowright': return '→'
          case 'enter': return '↵'
          case 'escape': return 'Esc'
          case 'backspace': return '⌫'
          case 'delete': return '⌦'
          case 'tab': return '⇥'
          default: return part.charAt(0).toUpperCase() + part.slice(1)
        }
      })
  }

  const groupedShortcuts = categories.reduce((acc, category) => {
    acc[category] = filteredShortcuts.filter(s => s.category === category)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="lg"
      className="max-h-[80vh] overflow-hidden"
    >
      <div className="space-y-4">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Search keyboard shortcuts"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="max-h-96 overflow-y-auto">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            categoryShortcuts.length > 0 && (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map(shortcut => (
                    <div key={shortcut.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {formatKey(shortcut.key).map((keyPart, index) => (
                          <React.Fragment key={index}>
                            {index > 0 && <span className="text-gray-400 text-xs">+</span>}
                            <Badge variant="outline" className="text-xs font-mono px-2 py-1">
                              {keyPart}
                            </Badge>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {filteredShortcuts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Keyboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No shortcuts found</p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Press <Badge variant="outline" className="text-xs">?</Badge> or <Badge variant="outline" className="text-xs">Ctrl</Badge> + <Badge variant="outline" className="text-xs">/</Badge> to open this help anytime</li>
            <li>• Most shortcuts work globally, even when not focused on specific elements</li>
            <li>• Use <Badge variant="outline" className="text-xs">Tab</Badge> and <Badge variant="outline" className="text-xs">Shift</Badge> + <Badge variant="outline" className="text-xs">Tab</Badge> to navigate between interactive elements</li>
            <li>• Press <Badge variant="outline" className="text-xs">Escape</Badge> to close dialogs and menus</li>
          </ul>
        </div>
      </div>
    </AccessibleModal>
  )
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'navigation':
      return <Command className="h-3 w-3" />
    case 'help':
      return <HelpCircle className="h-3 w-3" />
    case 'editing':
      return <Keyboard className="h-3 w-3" />
    default:
      return <Keyboard className="h-3 w-3" />
  }
}

// Hook to use keyboard shortcuts
export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider')
  }
  return context
}

// Shortcut hint component
interface ShortcutHintProps {
  shortcut: string
  description?: string
  className?: string
}

export function ShortcutHint({ shortcut, description, className }: ShortcutHintProps) {
  const formatKey = (key: string) => {
    return key
      .split('+')
      .map(part => {
        switch (part.toLowerCase()) {
          case 'ctrl': return '⌃'
          case 'cmd': 
          case 'meta': return '⌘'
          case 'alt': return '⌥'
          case 'shift': return '⇧'
          default: return part.charAt(0).toUpperCase() + part.slice(1)
        }
      })
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      {description && <span>{description}</span>}
      <div className="flex items-center gap-1">
        {formatKey(shortcut).map((keyPart, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400">+</span>}
            <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">
              {keyPart}
            </Badge>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// Button with keyboard hint
interface ButtonWithShortcutProps {
  children: React.ReactNode
  shortcut?: string
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  className?: string
  disabled?: boolean
}

export function ButtonWithShortcut({ 
  children, 
  shortcut, 
  onClick, 
  variant = "default",
  className,
  disabled 
}: ButtonWithShortcutProps) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts()

  useEffect(() => {
    if (shortcut && !disabled) {
      registerShortcut({
        key: shortcut,
        description: typeof children === 'string' ? children : 'Button action',
        category: 'Actions',
        action: onClick
      })

      return () => {
        unregisterShortcut(shortcut)
      }
    }
  }, [shortcut, onClick, disabled, registerShortcut, unregisterShortcut, children])

  return (
    <Button 
      variant={variant} 
      onClick={onClick} 
      className={className}
      disabled={disabled}
      title={shortcut ? `Keyboard shortcut: ${shortcut}` : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {shortcut && (
          <ShortcutHint shortcut={shortcut} className="ml-auto" />
        )}
      </div>
    </Button>
  )
}