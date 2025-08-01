'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronRight, 
  Search,
  Settings,
  Users,
  BarChart3,
  Shield,
  Brain,
  Database,
  Server,
  AlertTriangle,
  FileText,
  Eye,
  Zap,
  Cloud,
  Lock,
  Activity,
  MessageSquare,
  Cpu,
  HardDrive,
  Network,
  Bell
} from 'lucide-react'

interface AdminNavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  badge?: {
    text: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    pulse?: boolean
  }
  children?: AdminNavItem[]
  comingSoon?: boolean
  isNew?: boolean
}

const adminNavItems: AdminNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    href: '/admin',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    children: [
      {
        id: 'users-overview',
        label: 'User Overview',
        icon: Users,
        href: '/admin/users',
        badge: { text: '127', variant: 'secondary' }
      },
      {
        id: 'users-analytics',
        label: 'User Analytics',
        icon: BarChart3,
        href: '/admin/users/analytics',
      },
      {
        id: 'users-roles',
        label: 'Roles & Permissions',
        icon: Shield,
        href: '/admin/users/roles',
      },
      {
        id: 'users-activity',
        label: 'Activity Logs',
        icon: Activity,
        href: '/admin/users/activity',
      }
    ]
  },
  {
    id: 'training',
    label: 'AI Training',
    icon: Brain,
    children: [
      {
        id: 'training-overview',
        label: 'Training Dashboard',
        icon: Brain,
        href: '/admin/training',
        badge: { text: '3', variant: 'destructive', pulse: true }
      },
      {
        id: 'training-queue',
        label: 'Training Queue',
        icon: Database,
        href: '/admin/training/queue',
        badge: { text: '12', variant: 'secondary' }
      },
      {
        id: 'training-models',
        label: 'Model Management',
        icon: Cpu,
        href: '/admin/training/models',
      },
      {
        id: 'training-datasets',
        label: 'Dataset Management',
        icon: HardDrive,
        href: '/admin/training/datasets',
      }
    ]
  },
  {
    id: 'monitoring',
    label: 'System Monitoring',
    icon: Server,
    children: [
      {
        id: 'monitoring-system',
        label: 'System Health',
        icon: Activity,
        href: '/admin/monitoring/system',
        badge: { text: 'Online', variant: 'default' }
      },
      {
        id: 'monitoring-gpu',
        label: 'GPU Monitoring',
        icon: Zap,
        href: '/admin/monitoring/gpu',
        badge: { text: '87%', variant: 'secondary' }
      },
      {
        id: 'monitoring-performance',
        label: 'Performance Metrics',
        icon: BarChart3,
        href: '/admin/monitoring/performance',
      },
      {
        id: 'monitoring-alerts',
        label: 'Alerts & Notifications',
        icon: Bell,
        href: '/admin/monitoring/alerts',
        badge: { text: '2', variant: 'destructive' }
      }
    ]
  },
  {
    id: 'content',
    label: 'Content Management',
    icon: FileText,
    children: [
      {
        id: 'content-moderation',
        label: 'Content Moderation',
        icon: Eye,
        href: '/admin/content/moderation',
        badge: { text: '5', variant: 'destructive' }
      },
      {
        id: 'content-responses',
        label: 'Response Analytics',
        icon: MessageSquare,
        href: '/admin/content/responses',
      },
      {
        id: 'content-quality',
        label: 'Quality Control',
        icon: Shield,
        href: '/admin/content/quality',
      },
      {
        id: 'content-export',
        label: 'Data Export',
        icon: Database,
        href: '/admin/content/export',
      }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    children: [
      {
        id: 'analytics-usage',
        label: 'Usage Analytics',
        icon: BarChart3,
        href: '/admin/analytics/usage',
      },
      {
        id: 'analytics-engagement',
        label: 'User Engagement',
        icon: Users,
        href: '/admin/analytics/engagement',
      },
      {
        id: 'analytics-training',
        label: 'Training Metrics',
        icon: Brain,
        href: '/admin/analytics/training',
      },
      {
        id: 'analytics-reports',
        label: 'Custom Reports',
        icon: FileText,
        href: '/admin/analytics/reports',
        isNew: true
      }
    ]
  },
  {
    id: 'security',
    label: 'Security & Privacy',
    icon: Lock,
    children: [
      {
        id: 'security-overview',
        label: 'Security Overview',
        icon: Shield,
        href: '/admin/security',
      },
      {
        id: 'security-privacy',
        label: 'Privacy Controls',
        icon: Lock,
        href: '/admin/security/privacy',
      },
      {
        id: 'security-audit',
        label: 'Audit Logs',
        icon: FileText,
        href: '/admin/security/audit',
      },
      {
        id: 'security-backup',
        label: 'Backup & Recovery',
        icon: Cloud,
        href: '/admin/security/backup',
      }
    ]
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: Network,
    children: [
      {
        id: 'infrastructure-deployment',
        label: 'Deployment',
        icon: Cloud,
        href: '/admin/infrastructure/deployment',
      },
      {
        id: 'infrastructure-scaling',
        label: 'Auto Scaling',
        icon: Server,
        href: '/admin/infrastructure/scaling',
        comingSoon: true
      },
      {
        id: 'infrastructure-cdn',
        label: 'CDN Management',
        icon: Network,
        href: '/admin/infrastructure/cdn',
        comingSoon: true
      }
    ]
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: Settings,
    children: [
      {
        id: 'settings-general',
        label: 'General Settings',
        icon: Settings,
        href: '/admin/settings',
      },
      {
        id: 'settings-integrations',
        label: 'Integrations',
        icon: Network,
        href: '/admin/settings/integrations',
      },
      {
        id: 'settings-notifications',
        label: 'Notifications',
        icon: Bell,
        href: '/admin/settings/notifications',
      }
    ]
  }
]

interface AdminSidebarProps {
  className?: string
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['overview']))
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState(adminNavItems)

  // Auto-expand current section
  useEffect(() => {
    const currentSection = adminNavItems.find(item => 
      item.href === pathname || 
      item.children?.some(child => child.href === pathname)
    )
    if (currentSection && currentSection.children) {
      setExpandedItems(prev => new Set([...prev, currentSection.id]))
    }
  }, [pathname])

  // Filter items based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(adminNavItems)
      return
    }

    const filtered = adminNavItems.map(item => ({
      ...item,
      children: item.children?.filter(child =>
        child.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.children && item.children.length > 0)
    )

    setFilteredItems(filtered)
  }, [searchQuery])

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

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderNavItem = (item: AdminNavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.has(item.id)
    const active = isActive(item.href)

    return (
      <div key={item.id} className="relative">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-auto p-3 text-left transition-all duration-200 focus:ring-2 focus:ring-primary/20",
            depth > 0 && "ml-4 pl-6 border-l border-gray-200",
            active && "bg-primary/10 text-primary font-medium border-r-2 border-primary",
            !active && "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
            item.comingSoon && "opacity-60 cursor-not-allowed"
          )}
          onClick={() => {
            if (item.comingSoon) return
            
            if (hasChildren) {
              toggleExpanded(item.id)
            } else if (item.href) {
              router.push(item.href)
            }
          }}
          disabled={item.comingSoon}
          aria-label={hasChildren ? 
            `${item.label}. ${isExpanded ? 'Expanded' : 'Collapsed'}. ${item.children?.length || 0} sub-items.` :
            item.label
          }
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-current={active ? 'page' : undefined}
          role={hasChildren ? 'button' : 'link'}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <item.icon className={cn(
              "h-4 w-4 flex-shrink-0",
              active ? "text-primary" : "text-gray-500"
            )} />
            
            <span className="flex-1 truncate text-sm">
              {item.label}
            </span>

            <div className="flex items-center gap-2 flex-shrink-0">
              {item.isNew && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  New
                </Badge>
              )}
              
              {item.comingSoon && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  Soon
                </Badge>
              )}
              
              {item.badge && (
                <Badge 
                  variant={item.badge.variant} 
                  className={cn(
                    "text-xs px-1.5 py-0.5",
                    item.badge.pulse && "animate-pulse"
                  )}
                >
                  {item.badge.text}
                </Badge>
              )}

              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(item.id)
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </Button>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("w-80 bg-white border-r border-gray-200 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Admin Dashboard</h2>
            <p className="text-xs text-gray-500">System Management</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search admin features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label="Search admin features"
            role="searchbox"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav 
          className="space-y-1 px-2" 
          role="navigation" 
          aria-label="Admin dashboard navigation"
        >
          {filteredItems.map(item => renderNavItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>System Online</span>
          <div className="ml-auto">v1.2.3</div>
        </div>
      </div>
    </div>
  )
}