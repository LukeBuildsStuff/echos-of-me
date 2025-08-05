'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

import MetricsCards from './MetricsCards'
import ActivityFeed from './ActivityFeed'
import HealthStatus from './HealthStatus'
import QuickActions from './QuickActions'

interface OverviewData {
  metrics: any
  health: any
  activities: any
  last_updated: string
}

export default function OverviewDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchOverviewData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)

      // Fetch all dashboard data in parallel
      const [metricsResponse, healthResponse, activitiesResponse] = await Promise.all([
        fetch('/api/admin/analytics/overview'),
        fetch('/api/admin/analytics/health'),
        fetch('/api/admin/analytics/activity-feed?limit=10')
      ])

      if (!metricsResponse.ok || !healthResponse.ok || !activitiesResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const [metricsData, healthData, activitiesData] = await Promise.all([
        metricsResponse.json(),
        healthResponse.json(),
        activitiesResponse.json()
      ])

      if (!metricsData.success || !healthData.success || !activitiesData.success) {
        throw new Error('API returned error responses')
      }

      setData({
        metrics: metricsData.data,
        health: healthData.data,
        activities: activitiesData.data,
        last_updated: new Date().toISOString()
      })
      setLastRefresh(new Date())

    } catch (err) {
      console.error('Overview dashboard error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverviewData()
  }, [fetchOverviewData])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchOverviewData(false) // Silent refresh
      }, 120000) // 2 minutes

      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchOverviewData])

  const getOverallHealthStatus = () => {
    if (!data?.health?.overall_health) return 'unknown'
    return data.health.overall_health.status
  }

  const getTrainingStatus = () => {
    if (!data?.metrics?.training_metrics) return false
    return data.metrics.training_metrics.active_jobs > 0
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {/* Loading Header */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </CardHeader>
        </Card>

        {/* Loading Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="border border-gray-200 bg-white">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border border-gray-200 bg-white">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600" />
                Platform Overview
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Real-time insights into your platform's performance and user activity
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Overall Status Badge */}
              <Badge className={
                getOverallHealthStatus() === 'healthy' ? 'bg-green-100 text-green-800 border-green-200' :
                getOverallHealthStatus() === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                getOverallHealthStatus() === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                'bg-gray-100 text-gray-600 border-gray-200'
              }>
                {getOverallHealthStatus() === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
                {getOverallHealthStatus() === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {getOverallHealthStatus() === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                System {getOverallHealthStatus().charAt(0).toUpperCase() + getOverallHealthStatus().slice(1)}
              </Badge>

              {/* Last Refresh Time */}
              {lastRefresh && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastRefresh.toLocaleTimeString()}
                </span>
              )}

              {/* Auto-refresh Toggle */}
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="text-xs"
              >
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>

              {/* Manual Refresh */}
              <Button 
                size="sm"
                onClick={() => fetchOverviewData()}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Key Highlights */}
          {data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.metrics?.user_metrics?.total_users?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  Total Users
                </div>
                {data.metrics?.user_metrics?.new_users_today > 0 && (
                  <div className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +{data.metrics.user_metrics.new_users_today} today
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.metrics?.engagement_metrics?.responses_today?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600">Responses Today</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {data.metrics?.training_metrics?.active_jobs || '0'}
                </div>
                <div className="text-xs text-gray-600">Active Training</div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  getOverallHealthStatus() === 'healthy' ? 'text-green-600' : 
                  getOverallHealthStatus() === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {data.health?.overall_health?.uptime_percentage?.toFixed(1) || '99.9'}%
                </div>
                <div className="text-xs text-gray-600">Uptime</div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => fetchOverviewData()}
                className="ml-auto text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <MetricsCards 
        data={data?.metrics} 
        loading={loading && !data}
      />

      {/* Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Feed */}
        <ActivityFeed 
          initialData={data?.activities}
          autoRefresh={autoRefresh}
          refreshInterval={autoRefresh ? 45000 : 0} // 45 seconds
        />

        {/* Quick Actions */}
        <QuickActions 
          trainingActive={getTrainingStatus()}
          systemHealth={getOverallHealthStatus()}
        />
      </div>

      {/* System Health Status */}
      <HealthStatus 
        initialData={data?.health}
        autoRefresh={autoRefresh}
        refreshInterval={autoRefresh ? 90000 : 0} // 90 seconds
      />

      {/* Data Freshness Footer */}
      {data && (
        <Card className="border border-gray-100 bg-gray-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Dashboard last updated: {new Date(data.last_updated).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                Auto-refresh: {autoRefresh ? 'Enabled (2 min)' : 'Disabled'}
                <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}