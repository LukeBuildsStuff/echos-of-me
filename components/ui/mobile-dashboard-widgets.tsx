'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react'

// Mobile-optimized metric card
interface MobileMetricCardProps {
  title: string
  value: string | number
  unit?: string
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period?: string
  }
  icon?: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  onRefresh?: () => void
  className?: string
}

export function MobileMetricCard({
  title,
  value,
  unit,
  change,
  icon: Icon,
  color = 'blue',
  size = 'md',
  loading = false,
  onRefresh,
  className
}: MobileMetricCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const colorConfig = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  }

  const sizeConfig = {
    sm: { padding: 'p-3', titleSize: 'text-sm', valueSize: 'text-lg' },
    md: { padding: 'p-4', titleSize: 'text-sm', valueSize: 'text-2xl' },
    lg: { padding: 'p-6', titleSize: 'text-base', valueSize: 'text-3xl' }
  }

  const config = colorConfig[color]
  const sizes = sizeConfig[size]

  const getTrendIcon = () => {
    if (!change) return null
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'decrease':
        return <TrendingDown className="h-3 w-3 text-red-600" />
      default:
        return <Minus className="h-3 w-3 text-gray-600" />
    }
  }

  const getTrendColor = () => {
    if (!change) return 'text-gray-600'
    
    switch (change.type) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card className={cn(`border ${config.border}`, className)}>
      <CardContent className={sizes.padding}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {Icon && (
                <div className={`${config.bg} p-1.5 rounded-md`}>
                  <Icon className={`h-4 w-4 ${config.text}`} />
                </div>
              )}
              <h3 className={`${sizes.titleSize} font-medium text-gray-700 truncate`}>
                {title}
              </h3>
            </div>
            
            <div className="flex items-baseline gap-2">
              {loading ? (
                <div className="animate-pulse bg-gray-200 rounded h-8 w-16" />
              ) : (
                <span className={`${sizes.valueSize} font-bold text-gray-900`}>
                  {value}
                </span>
              )}
              {unit && (
                <span className="text-sm text-gray-500">{unit}</span>
              )}
            </div>

            {change && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>
                  {change.value > 0 ? '+' : ''}{change.value}%
                  {change.period && ` ${change.period}`}
                </span>
              </div>
            )}
          </div>

          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 w-8 p-0 flex-shrink-0"
              aria-label="Refresh metric"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Expandable widget container
interface ExpandableWidgetProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  actions?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ExpandableWidget({
  title,
  children,
  defaultExpanded = false,
  actions,
  className,
  size = 'md'
}: ExpandableWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const sizeConfig = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <Card className={className}>
      <CardHeader 
        className="pb-2 cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="widget-content"
      >
        <div className="flex items-center justify-between">
          <CardTitle className={cn("font-semibold text-gray-900", sizeConfig[size])}>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {actions}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              aria-label={isExpanded ? "Collapse widget" : "Expand widget"}
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent id="widget-content" className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

// Mobile-optimized table widget
interface MobileTableWidgetProps {
  title: string
  headers: string[]
  rows: Array<Array<React.ReactNode>>
  maxVisibleRows?: number
  actions?: React.ReactNode
  className?: string
  emptyMessage?: string
}

export function MobileTableWidget({
  title,
  headers,
  rows,
  maxVisibleRows = 5,
  actions,
  className,
  emptyMessage = "No data available"
}: MobileTableWidgetProps) {
  const [showAll, setShowAll] = useState(false)
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const displayRows = showAll ? rows : rows.slice(0, maxVisibleRows)
  const hasMoreRows = rows.length > maxVisibleRows

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">
            {title}
          </CardTitle>
          {actions}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="space-y-2 sm:hidden">
              {displayRows.map((row, rowIndex) => (
                <div key={rowIndex} className="bg-gray-50 rounded-lg p-3">
                  {row.map((cell, cellIndex) => (
                    <div key={cellIndex} className="flex justify-between items-center py-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {headers[cellIndex]}:
                      </span>
                      <div className="text-sm text-gray-900">
                        {cell}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {headers.map((header, index) => (
                      <th key={index} className="text-left py-2 px-3 font-medium text-gray-700">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="py-2 px-3 text-gray-900">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMoreRows && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs"
                >
                  {showAll ? (
                    <>
                      <Minimize2 className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3 w-3 mr-1" />
                      Show All ({rows.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Status list widget
interface StatusItem {
  id: string
  label: string
  status: 'online' | 'offline' | 'warning' | 'error'
  description?: string
  lastUpdated?: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface StatusListWidgetProps {
  title: string
  items: StatusItem[]
  className?: string
  showDescriptions?: boolean
}

export function StatusListWidget({
  title,
  items,
  className,
  showDescriptions = true
}: StatusListWidgetProps) {
  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'offline':
        return 'bg-gray-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: StatusItem['status']) => {
    switch (status) {
      case 'online':
        return 'Online'
      case 'offline':
        return 'Offline'
      case 'warning':
        return 'Warning'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No items to display</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    getStatusColor(item.status),
                    item.status === 'online' && "animate-pulse"
                  )} />
                  <span className="sr-only">{getStatusText(item.status)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.label}
                    </h4>
                    <Badge 
                      variant={item.status === 'error' ? 'destructive' : 'secondary'}
                      className="text-xs flex-shrink-0"
                    >
                      {getStatusText(item.status)}
                    </Badge>
                  </div>
                  
                  {showDescriptions && item.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    {item.lastUpdated && (
                      <span className="text-xs text-gray-500">
                        Updated {item.lastUpdated}
                      </span>
                    )}
                    
                    {item.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={item.action.onClick}
                        className="text-xs h-6 px-2"
                      >
                        {item.action.label}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick actions widget
interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline'
  description?: string
}

interface QuickActionsWidgetProps {
  title: string
  actions: QuickAction[]
  className?: string
  layout?: 'grid' | 'list'
}

export function QuickActionsWidget({
  title,
  actions,
  className,
  layout = 'grid'
}: QuickActionsWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className={cn(
          layout === 'grid' 
            ? "grid grid-cols-2 gap-2" 
            : "space-y-2"
        )}>
          {actions.map((action) => {
            const IconComponent = action.icon
            
            return (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "flex items-center gap-2 h-auto p-3",
                  layout === 'list' && "justify-start w-full"
                )}
                aria-label={action.description || action.label}
              >
                <IconComponent className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-medium truncate">
                    {action.label}
                  </div>
                  {action.description && layout === 'list' && (
                    <div className="text-xs text-gray-600 truncate">
                      {action.description}
                    </div>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}