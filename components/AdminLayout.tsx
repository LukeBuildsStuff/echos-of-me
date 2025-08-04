'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AdminSidebar from './AdminSidebar'
import MobileNavigation, { MobileNavTrigger, MobileBreadcrumb } from '@/components/ui/mobile-navigation'
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { useAccessibility } from '@/components/providers/AccessibilityProvider'
import { AdminErrorBoundary } from '@/components/ui/specialized-error-boundaries'
import { 
  Menu, 
  X, 
  Bell, 
  Settings, 
  User,
  ChevronDown,
  Search,
  HelpCircle,
  LogOut,
  Shield
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  showBackButton?: boolean
  onBack?: () => void
}

interface SystemAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: string
  actionLabel?: string
  actionHref?: string
}

const mockSystemAlerts: SystemAlert[] = [
  {
    id: '1',
    type: 'warning',
    title: 'High GPU Usage',
    message: 'RTX 5090 running at 87% capacity for 2+ hours',
    timestamp: '2 minutes ago',
    actionLabel: 'View Details',
    actionHref: '/admin/monitoring/gpu'
  },
  {
    id: '2',
    type: 'info',
    title: 'Training Completed',
    message: 'Model training for user@example.com finished successfully',
    timestamp: '15 minutes ago',
    actionLabel: 'Deploy Model',
    actionHref: '/admin/training/models'
  }
]

export default function AdminLayout({ 
  children, 
  title, 
  subtitle, 
  actions, 
  breadcrumbs = [],
  showBackButton = false,
  onBack
}: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>(mockSystemAlerts)
  const [isMobile, setIsMobile] = useState(false)
  
  const { announce } = useAccessibility()
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      
      // Auto-close sidebar on mobile when switching to desktop
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [sidebarOpen])

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
      setAlertsOpen(false)
      setUserMenuOpen(false)
      
      // Announce page navigation for screen readers
      const pageTitle = title || 'Admin page'
      announce(`Navigated to ${pageTitle}`, 'polite')
    }
  }, [pathname, isMobile, title, announce])

  // Handle escape key for mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        setAlertsOpen(false)
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const getAlertColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200 text-red-800'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'success': return 'bg-green-50 border-green-200 text-green-800'
      default: return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const dismissAlert = (id: string) => {
    setSystemAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  const unreadAlertsCount = systemAlerts.length

  return (
    <AdminErrorBoundary section="Admin Layout">
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Navigation */}
        {isMobile && (
          <MobileNavigation
            items={[]} // Will be passed from AdminSidebar data
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            title="Admin Dashboard"
            subtitle="System Management"
            logo={
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
            }
          />
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="fixed inset-y-0 left-0 z-50 w-80">
            <AdminSidebar />
          </div>
        )}

        {/* Main content area */}
        <div className={cn(
          "transition-all duration-300",
          !isMobile && "ml-80"
        )}>
          {/* Mobile breadcrumbs */}
          {isMobile && breadcrumbs.length > 0 && (
            <MobileBreadcrumb items={breadcrumbs} />
          )}

          {/* Top header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                {/* Left side */}
                <div className="flex items-center gap-4">
                  {/* Mobile menu button */}
                  {isMobile && (
                    <MobileNavTrigger
                      onOpen={() => setSidebarOpen(true)}
                      label="Open admin navigation"
                    />
                  )}


                  {/* Back button */}
                  {showBackButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onBack}
                      className="flex items-center gap-2"
                      aria-label="Go back"
                    >
                      ←
                      <span className="hidden sm:inline">Back</span>
                    </Button>
                  )}

                  {/* Desktop Breadcrumbs */}
                  {!isMobile && (
                    <BreadcrumbNav items={breadcrumbs} />
                  )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                  {/* Mobile search button */}
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      aria-label="Search"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Desktop search */}
                  {!isMobile && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search admin panel..."
                        className="w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        aria-label="Search admin panel"
                      />
                    </div>
                  )}

                  {/* Notifications */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAlertsOpen(!alertsOpen)}
                      className={cn(
                        "relative",
                        isMobile ? "h-9 w-9 p-0" : ""
                      )}
                      aria-label={`Notifications${unreadAlertsCount > 0 ? ` (${unreadAlertsCount} unread)` : ''}`}
                    >
                      <Bell className="h-4 w-4" />
                      {unreadAlertsCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center min-w-[1rem]"
                        >
                          {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                        </Badge>
                      )}
                    </Button>

                    {/* Mobile-optimized alerts dropdown */}
                    {alertsOpen && (
                      <div className={cn(
                        "absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50",
                        isMobile ? "w-screen max-w-sm -mr-4" : "w-96"
                      )}>
                        <div className="p-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">System Alerts</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAlertsOpen(false)}
                              className="h-8 w-8 p-0"
                              aria-label="Close alerts"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className={cn(
                          "overflow-y-auto",
                          isMobile ? "max-h-80" : "max-h-96"
                        )}>
                          {systemAlerts.length > 0 ? (
                            <div className="p-2 space-y-2">
                              {systemAlerts.map((alert) => (
                                <div
                                  key={alert.id}
                                  className={cn(
                                    "p-3 rounded-lg border",
                                    getAlertColor(alert.type)
                                  )}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm truncate">{alert.title}</h4>
                                      <p className="text-sm mt-1 opacity-90 line-clamp-2">{alert.message}</p>
                                      <p className="text-xs mt-2 opacity-75">{alert.timestamp}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => dismissAlert(alert.id)}
                                      className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                                      aria-label={`Dismiss ${alert.title}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {alert.actionLabel && alert.actionHref && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        router.push(alert.actionHref!)
                                        setAlertsOpen(false)
                                      }}
                                      className="mt-2 text-xs w-full"
                                    >
                                      {alert.actionLabel}
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-gray-500">
                              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No new alerts</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Help */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={isMobile ? "h-9 w-9 p-0" : ""}
                    aria-label="Help and support"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>

                  {/* User menu */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2"
                    >
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <ChevronDown className="h-4 w-4 hidden sm:block" />
                    </Button>

                    {/* User dropdown */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-3 border-b border-gray-200">
                          <p className="font-medium text-gray-900">Admin User</p>
                          <p className="text-sm text-gray-500">admin@echosofme.com</p>
                        </div>
                        <div className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              router.push('/admin/settings')
                              setUserMenuOpen(false)
                            }}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              // Handle logout
                              setUserMenuOpen(false)
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page header */}
          {(title || actions) && (
            <div className="bg-white border-b border-gray-200">
              <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                <div className={cn(
                  "flex items-start justify-between gap-4",
                  isMobile ? "flex-col" : "flex-row items-center"
                )}>
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h1 className={cn(
                        "font-bold text-gray-900",
                        isMobile ? "text-xl" : "text-2xl"
                      )}>{title}</h1>
                    )}
                    {subtitle && (
                      <p className="mt-1 text-sm sm:text-base text-gray-600">{subtitle}</p>
                    )}
                  </div>
                  {actions && (
                    <div className={cn(
                      "flex items-center gap-2 flex-shrink-0",
                      isMobile ? "w-full justify-end" : "gap-3"
                    )}>
                      {actions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <main className={cn(
            "px-4 sm:px-6 lg:px-8",
            isMobile ? "py-4" : "py-8"
          )}>
            {children}
          </main>
        </div>
      </div>
    </AdminErrorBoundary>
  )
}