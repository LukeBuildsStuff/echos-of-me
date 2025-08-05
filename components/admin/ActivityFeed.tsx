'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Users, 
  MessageCircle, 
  Brain,
  Server,
  RefreshCw,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react'

interface ActivityEvent {
  event_type: string
  user_id?: number
  email?: string
  name?: string
  created_at: string
  time_ago: string
  description: string
  metadata: any
}

interface ActivityData {
  activities: ActivityEvent[]
  summary: {
    registrations?: { today: number; week: number }
    responses?: { today: number; week: number }
    training_jobs?: { today: number; week: number }
  }
  pagination: {
    limit: number
    offset: number
    total: number
    has_more: boolean
  }
}

interface ActivityFeedProps {
  initialData?: ActivityData | null
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function ActivityFeed({ 
  initialData = null, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: ActivityFeedProps) {
  const [data, setData] = useState<ActivityData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchActivityFeed = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/analytics/activity-feed?limit=15')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activity feed: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setLastRefresh(new Date())
      } else {
        throw new Error(result.error || 'Failed to load activity feed')
      }
    } catch (err) {
      console.error('Activity feed error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      fetchActivityFeed()
    }
  }, [initialData])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchActivityFeed(false) // Silent refresh
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'user_registration':
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case 'response_submitted':
        return <MessageCircle className="h-4 w-4 text-purple-500" />
      case 'training_job':
        return <Brain className="h-4 w-4 text-indigo-500" />
      case 'system_backup':
      case 'system_maintenance':
        return <Server className="h-4 w-4 text-gray-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getEventBadgeColor = (eventType: string, metadata: any) => {
    switch (eventType) {
      case 'user_registration':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'response_submitted':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'training_job':
        if (metadata?.job_status === 'completed') {
          return 'bg-green-100 text-green-800 border-green-200'
        } else if (metadata?.job_status === 'failed') {
          return 'bg-red-100 text-red-800 border-red-200'
        }
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'system_backup':
      case 'system_maintenance':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const formatEventDescription = (event: ActivityEvent) => {
    const userName = event.name || event.email || 'Unknown User'
    
    switch (event.event_type) {
      case 'user_registration':
        return (
          <div>
            <p className="text-sm font-medium text-gray-900">{event.description}</p>
            <p className="text-xs text-gray-500">{event.email}</p>
          </div>
        )
      case 'response_submitted':
        return (
          <div>
            <p className="text-sm font-medium text-gray-900">Response submitted</p>
            <p className="text-xs text-gray-500">
              {userName} • {event.metadata?.response_length} characters
            </p>
          </div>
        )
      case 'training_job':
        return (
          <div>
            <p className="text-sm font-medium text-gray-900">{event.description}</p>
            <p className="text-xs text-gray-500">
              {userName} • {event.metadata?.model_type || 'AI Model'}
            </p>
          </div>
        )
      default:
        return (
          <div>
            <p className="text-sm font-medium text-gray-900">{event.description}</p>
            {event.metadata && (
              <p className="text-xs text-gray-500">
                {Object.entries(event.metadata)
                  .slice(0, 2)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(' • ')}
              </p>
            )}
          </div>
        )
    }
  }

  if (loading && !data) {
    return (
      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Activity Feed Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button 
            onClick={() => fetchActivityFeed()} 
            size="sm" 
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-200 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button 
              onClick={() => fetchActivityFeed(false)} 
              size="sm" 
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Activity Summary */}
        {data?.summary && (
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
            {data.summary.registrations && (
              <div className="text-xs">
                <span className="font-medium text-gray-700">Registrations:</span>
                <span className="ml-1 text-gray-600">
                  {data.summary.registrations.today} today, {data.summary.registrations.week} this week
                </span>
              </div>
            )}
            {data.summary.responses && (
              <div className="text-xs">
                <span className="font-medium text-gray-700">Responses:</span>
                <span className="ml-1 text-gray-600">
                  {data.summary.responses.today} today, {data.summary.responses.week} this week
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!data?.activities?.length ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No recent activity to display</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.activities.map((event, index) => (
              <div 
                key={`${event.event_type}-${event.created_at}-${index}`}
                className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(event.event_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  {formatEventDescription(event)}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs whitespace-nowrap ${getEventBadgeColor(event.event_type, event.metadata)}`}
                  >
                    {event.time_ago}
                  </Badge>
                  
                  {event.user_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {data.pagination.has_more && (
              <div className="pt-4 text-center">
                <Button variant="outline" size="sm">
                  Load More Activity
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}