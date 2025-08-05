'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  Brain,
  Server,
  MessageSquare,
  Eye,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'

// Types for widget data
interface MetricValue {
  current: number
  previous?: number
  unit?: string
  format?: 'number' | 'percentage' | 'currency' | 'bytes' | 'duration'
}

interface TrendData {
  direction: 'up' | 'down' | 'neutral'
  percentage: number
  period: string
}

interface ChartDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, any>
}

interface StatusItem {
  id: string
  label: string
  status: 'online' | 'offline' | 'warning' | 'error'
  value?: string
  lastUpdated?: string
}

// Metric Card Component
interface MetricCardProps {
  title: string
  value: MetricValue
  trend?: TrendData
  icon?: React.ComponentType<{ className?: string }>
  description?: string
  className?: string
  onClick?: () => void
  loading?: boolean
  actionLabel?: string
}

export function MetricCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  description, 
  className,
  onClick,
  loading = false,
  actionLabel
}: MetricCardProps) {
  const formatValue = (val: number, format?: MetricValue['format'], unit?: string) => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'currency':
        return `$${val.toLocaleString()}`
      case 'bytes':
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(val) / Math.log(1024))
        return `${(val / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
      case 'duration':
        return `${val}min`
      default:
        return `${val.toLocaleString()}${unit ? ` ${unit}` : ''}`
    }
  }

  const getTrendIcon = () => {
    if (!trend) return null
    switch (trend.direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500'
    switch (trend.direction) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  const cardId = `metric-${title.toLowerCase().replace(/\s+/g, '-')}`
  
  return (
    <Card 
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary/20",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : "article"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${title}: ${formatValue(value.current, value.format, value.unit)}. Click to view details` : undefined}
      aria-describedby={description ? `${cardId}-description` : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 animate-pulse rounded" />
              ) : (
                formatValue(value.current, value.format, value.unit)
              )}
            </div>
            {actionLabel && onClick && (
              <Button variant="ghost" size="sm" className="text-xs">
                {actionLabel}
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          
          {trend && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              <span>{trend.percentage}% {trend.period}</span>
            </div>
          )}
          
          {description && (
            <p id={`${cardId}-description`} className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Stats Grid Component
interface QuickStatsProps {
  stats: Array<{
    id: string
    title: string
    value: MetricValue
    trend?: TrendData
    icon?: React.ComponentType<{ className?: string }>
    onClick?: () => void
  }>
  loading?: boolean
  className?: string
}

export function QuickStats({ stats, loading = false, className }: QuickStatsProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {stats.map((stat) => (
        <MetricCard
          key={stat.id}
          title={stat.title}
          value={stat.value}
          trend={stat.trend}
          icon={stat.icon}
          onClick={stat.onClick}
          loading={loading}
        />
      ))}
    </div>
  )
}

// System Status Component
interface SystemStatusProps {
  title: string
  items: StatusItem[]
  className?: string
  showLastUpdated?: boolean
}

export function SystemStatus({ title, items, className, showLastUpdated = true }: SystemStatusProps) {
  const statusId = `status-${title.toLowerCase().replace(/\s+/g, '-')}`
  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: StatusItem['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'error': return <XCircle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <Card className={className} role="region" aria-labelledby={`${statusId}-title`}>
      <CardHeader>
        <CardTitle id={`${statusId}-title`} className="flex items-center justify-between">
          {title}
          <Button 
            variant="ghost" 
            size="sm" 
            aria-label={`Refresh ${title}`}
            className="focus:ring-2 focus:ring-primary/20"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" role="list" aria-label={`${title} status items`}>
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between" role="listitem">
              <div className="flex items-center gap-3">
                <Badge 
                  className={cn("text-xs", getStatusColor(item.status))}
                  aria-label={`Status: ${item.status}`}
                >
                  {getStatusIcon(item.status)}
                  <span className="ml-1 capitalize">{item.status}</span>
                </Badge>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className="text-right">
                {item.value && (
                  <div className="text-sm font-medium">{item.value}</div>
                )}
                {showLastUpdated && item.lastUpdated && (
                  <div className="text-xs text-gray-500">{item.lastUpdated}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Activity Feed Component
interface ActivityItem {
  id: string
  type: 'user' | 'system' | 'training' | 'security'
  title: string
  description: string
  timestamp: string
  user?: string
  metadata?: Record<string, any>
}

interface ActivityFeedProps {
  title: string
  activities: ActivityItem[]
  className?: string
  maxItems?: number
  showSeeAll?: boolean
  onSeeAll?: () => void
}

export function ActivityFeed({ 
  title, 
  activities, 
  className, 
  maxItems = 10,
  showSeeAll = true,
  onSeeAll
}: ActivityFeedProps) {
  const feedId = `activity-${title.toLowerCase().replace(/\s+/g, '-')}`
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user': return <Users className="h-4 w-4 text-blue-500" />
      case 'training': return <Brain className="h-4 w-4 text-purple-500" />
      case 'security': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const displayedActivities = activities.slice(0, maxItems)

  return (
    <Card className={className} role="region" aria-labelledby={`${feedId}-title`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle id={`${feedId}-title`}>{title}</CardTitle>
          {showSeeAll && onSeeAll && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSeeAll}
              aria-label={`View all ${title.toLowerCase()}`}
              className="focus:ring-2 focus:ring-primary/20"
            >
              See All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" role="list" aria-label={`${title} items`}>
          {displayedActivities.map((activity, index) => (
            <div key={activity.id} className="flex gap-3" role="listitem">
              <div className="flex-shrink-0" aria-hidden="true">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <time 
                    className="text-xs text-gray-500 flex-shrink-0 ml-2"
                    dateTime={activity.timestamp}
                    aria-label={`Activity occurred ${activity.timestamp}`}
                  >
                    {activity.timestamp}
                  </time>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                {activity.user && (
                  <p className="text-xs text-gray-500 mt-1">by {activity.user}</p>
                )}
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Progress Tracker Component
interface ProgressItem {
  id: string
  label: string
  value: number
  max: number
  status: 'active' | 'completed' | 'paused' | 'error'
  eta?: string
  details?: string
}

interface ProgressTrackerProps {
  title: string
  items: ProgressItem[]
  className?: string
}

export function ProgressTracker({ title, items, className }: ProgressTrackerProps) {
  const getStatusColor = (status: ProgressItem['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'active': return 'text-blue-600'
      case 'paused': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs capitalize", getStatusColor(item.status))}
                  >
                    {item.status}
                  </Badge>
                </div>
                <span className="text-sm text-gray-500">
                  {Math.round((item.value / item.max) * 100)}%
                </span>
              </div>
              <Progress 
                value={(item.value / item.max) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{item.details || `${item.value}/${item.max}`}</span>
                {item.eta && <span>ETA: {item.eta}</span>}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active progress items</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Simple Chart Placeholder Component
interface SimpleChartProps {
  title: string
  data: ChartDataPoint[]
  type: 'bar' | 'line' | 'pie'
  className?: string
  height?: number
}

export function SimpleChart({ title, data, type, className, height = 200 }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const chartId = `chart-${title.toLowerCase().replace(/\s+/g, '-')}`
  
  return (
    <Card className={className} role="img" aria-labelledby={`${chartId}-title`} aria-describedby={`${chartId}-description`}>
      <CardHeader>
        <CardTitle id={`${chartId}-title`} className="flex items-center gap-2">
          {type === 'bar' && <BarChart3 className="h-4 w-4" aria-hidden="true" />}
          {type === 'line' && <LineChart className="h-4 w-4" aria-hidden="true" />}
          {type === 'pie' && <PieChart className="h-4 w-4" aria-hidden="true" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Screen reader description */}
        <div id={`${chartId}-description`} className="sr-only">
          Chart showing {title}. Data points: {data.map(d => `${d.label}: ${d.value}`).join(', ')}.
        </div>
        
        <div 
          style={{ height }} 
          className="flex items-end justify-between gap-2"
          role="presentation"
          aria-hidden="true"
        >
          {data.map((point, index) => (
            <div 
              key={index} 
              className="flex-1 flex flex-col items-center"
              title={`${point.label}: ${point.value}`}
            >
              <div 
                className="w-full bg-primary/20 rounded-t transition-all duration-300 hover:bg-primary/30 focus:bg-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ 
                  height: `${(point.value / maxValue) * 80}%`,
                  minHeight: '4px'
                }}
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: ${point.value}`}
              />
              <div className="text-xs text-gray-500 mt-2 text-center">
                <div className="font-medium">{point.value}</div>
                <div className="truncate max-w-16">{point.label}</div>
              </div>
            </div>
          ))}
        </div>
        {data.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No data available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}