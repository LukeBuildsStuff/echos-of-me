'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Menu, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Search,
  Home,
  ArrowLeft,
  MoreHorizontal
} from 'lucide-react'

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  badge?: {
    text: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    pulse?: boolean
  }
  children?: NavigationItem[]
  comingSoon?: boolean
  isNew?: boolean
  accessibilityLabel?: string
}

interface MobileNavigationProps {
  items: NavigationItem[]
  isOpen: boolean
  onClose: () => void
  onItemClick?: (item: NavigationItem) => void
  title?: string
  subtitle?: string
  logo?: React.ReactNode
  className?: string
  searchable?: boolean
  showBreadcrumbs?: boolean
}

function MobileNavigation({
  items,
  isOpen,
  onClose,
  onItemClick,
  title = "Navigation",
  subtitle,
  logo,
  className,
  searchable = true,
  showBreadcrumbs = true
}: MobileNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState(items)
  const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([])
  const overlayRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Auto-expand current section
  useEffect(() => {
    const currentSection = items.find(item => 
      item.href === pathname || 
      item.children?.some(child => child.href === pathname)
    )
    if (currentSection && currentSection.children) {
      setExpandedItems(prev => new Set([...prev, currentSection.id]))
    }
  }, [pathname, items])

  // Filter items based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    const filtered = items.map(item => ({
      ...item,
      children: item.children?.filter(child =>
        child.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.children && item.children.length > 0)
    )

    setFilteredItems(filtered)
    
    // Auto-expand matching items when searching
    if (searchQuery.trim()) {
      const matchingParents = new Set<string>()
      filtered.forEach(item => {
        if (item.children && item.children.length > 0) {
          matchingParents.add(item.id)
        }
      })
      setExpandedItems(matchingParents)
    }
  }, [searchQuery, items])

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && overlayRef.current === e.target) {
        onClose()
      }
    }

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      const focusableElements = sidebarRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      if (!focusableElements || focusableElements.length === 0) return
      
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTab)
    document.addEventListener('mousedown', handleClickOutside)
    
    // Focus first focusable element when opened
    setTimeout(() => {
      const firstFocusable = sidebarRef.current?.querySelector(
        'button, [href], input'
      ) as HTMLElement
      firstFocusable?.focus()
    }, 100)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleItemClick = (item: NavigationItem) => {
    if (item.comingSoon) return
    
    if (item.children && item.children.length > 0) {
      // For parent items, either expand or navigate to overview
      if (item.href) {
        router.push(item.href)
        onClose()
      } else {
        toggleExpanded(item.id)
      }
    } else if (item.href) {
      router.push(item.href)
      onClose()
    }
    
    onItemClick?.(item)
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const active = isActive(item.href)
    const IconComponent = item.icon

    return (
      <div key={item.id} className="relative">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-auto p-4 text-left transition-all duration-200 text-base min-h-[44px] touch-manipulation",
            "focus:ring-2 focus:ring-primary/20 focus:ring-inset",
            depth > 0 && "ml-4 pl-8 border-l-2 border-gray-200",
            active && "bg-primary/10 text-primary font-medium border-r-4 border-primary",
            !active && "text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100",
            item.comingSoon && "opacity-60 cursor-not-allowed"
          )}
          onClick={() => handleItemClick(item)}
          disabled={item.comingSoon}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-current={active ? 'page' : undefined}
          aria-label={item.accessibilityLabel || item.label}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <IconComponent className={cn(
              "h-5 w-5 flex-shrink-0",
              active ? "text-primary" : "text-gray-500"
            )} />
            
            <span className="flex-1 truncate font-medium">
              {item.label}
            </span>

            <div className="flex items-center gap-2 flex-shrink-0">
              {item.isNew && (
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  New
                </Badge>
              )}
              
              {item.comingSoon && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  Soon
                </Badge>
              )}
              
              {item.badge && (
                <Badge 
                  variant={item.badge.variant} 
                  className={cn(
                    "text-xs px-2 py-0.5 min-w-[1.5rem] text-center",
                    item.badge.pulse && "animate-pulse"
                  )}
                >
                  {item.badge.text}
                </Badge>
              )}

              {hasChildren && (
                <div className="p-1">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              )}
            </div>
          </div>
        </Button>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1" role="group" aria-label={`${item.label} submenu`}>
            {item.children?.map(child => renderNavigationItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={cn(
          "fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out",
          "flex flex-col",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {logo}
              <div>
                <h2 className="font-semibold text-gray-900">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0 min-h-[44px] min-w-[44px] touch-manipulation focus:ring-2 focus:ring-primary/20"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search */}
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px] touch-manipulation"
                aria-label="Search navigation items"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav className="space-y-1 px-2" role="navigation" aria-label="Main navigation">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500 text-sm">No navigation items found</p>
              </div>
            ) : (
              filteredItems.map(item => renderNavigationItem(item))
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
            <span>v1.2.3</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Mobile navigation trigger button
interface MobileNavTriggerProps {
  onOpen: () => void
  className?: string
  label?: string
}

export function MobileNavTrigger({ onOpen, className, label = "Open navigation" }: MobileNavTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onOpen}
      className={cn("lg:hidden h-10 w-10 p-0 min-h-[44px] min-w-[44px] touch-manipulation focus:ring-2 focus:ring-primary/20", className)}
      aria-label={label}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

// Breadcrumb component for mobile
interface MobileBreadcrumbProps {
  items: Array<{ label: string; href?: string }>
  className?: string
}

export function MobileBreadcrumb({ items, className }: MobileBreadcrumbProps) {
  const router = useRouter()
  
  if (items.length <= 1) return null

  return (
    <nav 
      className={cn("flex items-center space-x-1 text-sm text-gray-500 px-4 py-2 bg-gray-50 border-b", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-2">›</span>}
          {item.href && index < items.length - 1 ? (
            <button
              onClick={() => router.push(item.href!)}
              className="hover:text-gray-700 transition-colors min-h-[44px] py-2 px-1 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
            >
              {item.label}
            </button>
          ) : (
            <span className={index === items.length - 1 ? "text-gray-900 font-medium" : ""}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

// Named exports
export { MobileNavigation }
export default MobileNavigation