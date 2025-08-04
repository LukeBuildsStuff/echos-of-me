'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown,
  Heart, 
  Shield, 
  Clock, 
  Users,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Target,
  MessageCircle
} from 'lucide-react'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

interface ErrorAnalytics {
  summary: {
    total_errors: number
    unresolved_count: number
    crisis_count: number
    grief_context_count: number
    high_family_impact_count: number
    affected_families_count: number
    avg_resolution_time_minutes: number
  }
  trends: Array<{
    time_period: string
    total_errors: number
    emergency_count: number
    critical_count: number
    warning_count: number
    info_count: number
    crisis_count: number
    grief_context_count: number
    high_family_impact_count: number
  }>
  familyImpact: Array<{
    family_impact: string
    count: number
    avg_resolution_time_minutes: number
    unresolved_count: number
    crisis_count: number
  }>
  categories: Array<{
    category_name: string
    category_code: string
    error_count: number
    unresolved_count: number
    grief_context_count: number
    crisis_count: number
    high_impact_count: number
    avg_resolution_time: number
  }>
  familyFocusedInsights: {
    familiesMostAffected: number
    griefSensitiveErrorsPercent: number
    crisisResponseTime: number
    familyCommunicationRate: number
  }
}

export default function ErrorAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<ErrorAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [includeResolved, setIncludeResolved] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/error-logs/analytics?timeRange=${timeRange}&includeResolved=${includeResolved}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch error analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange, includeResolved])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`
    return `${Math.round(minutes / 1440)}d`
  }

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '1h': return 'Last Hour'
      case '24h': return 'Last 24 Hours'
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      default: return 'Last 24 Hours'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4" style={{ color: griefSensitiveColors.memory[500] }} />
          <p style={{ color: griefSensitiveColors.peace[600] }}>Analyzing error patterns with family sensitivity...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p style={{ color: griefSensitiveColors.peace[600] }}>Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Compassionate Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8" style={{ color: griefSensitiveColors.memory[500] }} />
            <h1 className="text-3xl font-semibold" style={{ color: griefSensitiveColors.peace[800] }}>
              Family-Focused Error Analytics
            </h1>
          </div>
          <p className="text-lg" style={{ color: griefSensitiveColors.peace[600] }}>
            Understanding how technical issues affect families in their time of grief
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Family-Focused Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.comfort[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.comfort[700] }}
            >
              <Heart className="h-4 w-4" />
              Grief-Sensitive Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.comfort[600] }}
            >
              {analytics.familyFocusedInsights.griefSensitiveErrorsPercent}%
            </div>
            <p 
              className="text-sm flex items-center gap-1"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              <TrendingUp className="h-3 w-3" style={{ color: griefSensitiveColors.hope[500] }} />
              {analytics.summary.grief_context_count} affecting family memories
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.warning[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.warning[700] }}
            >
              <Clock className="h-4 w-4" />
              Crisis Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.warning[600] }}
            >
              {formatTime(analytics.familyFocusedInsights.crisisResponseTime)}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Average time to help families in crisis
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.memory[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.memory[700] }}
            >
              <Users className="h-4 w-4" />
              Families Affected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.memory[600] }}
            >
              {analytics.summary.affected_families_count}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Families experiencing technical issues
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.hope[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.hope[700] }}
            >
              <MessageCircle className="h-4 w-4" />
              Family Communication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.hope[600] }}
            >
              {analytics.familyFocusedInsights.familyCommunicationRate}%
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Errors with compassionate family outreach
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Family Impact Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.peace[200]}`
          }}
        >
          <CardHeader>
            <CardTitle 
              className="flex items-center gap-2"
              style={{ color: griefSensitiveColors.peace[700] }}
            >
              <Shield className="h-5 w-5" />
              Family Impact Levels
            </CardTitle>
            <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
              How technical issues affect families emotionally and functionally
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.familyImpact.map((impact) => (
                <div key={impact.family_impact} className="flex items-center justify-between p-3 rounded-lg" 
                     style={{ backgroundColor: griefSensitiveColors.peace[50] }}>
                  <div className="flex items-center gap-3">
                    <Badge
                      className="text-xs px-2 py-1"
                      style={{
                        backgroundColor: impact.family_impact === 'severe' ? griefSensitiveColors.warning[500] :
                                       impact.family_impact === 'high' ? griefSensitiveColors.warning[400] :
                                       impact.family_impact === 'medium' ? griefSensitiveColors.hope[500] :
                                       impact.family_impact === 'low' ? griefSensitiveColors.comfort[500] :
                                       griefSensitiveColors.peace[400],
                        color: 'white'
                      }}
                    >
                      {impact.family_impact.toUpperCase()}
                    </Badge>
                    <span 
                      className="font-medium"
                      style={{ color: griefSensitiveColors.peace[700] }}
                    >
                      {impact.count} errors
                    </span>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-sm font-medium"
                      style={{ color: griefSensitiveColors.peace[600] }}
                    >
                      {impact.unresolved_count} unresolved
                    </div>
                    {impact.avg_resolution_time_minutes > 0 && (
                      <div 
                        className="text-xs"
                        style={{ color: griefSensitiveColors.peace[500] }}
                      >
                        Avg: {formatTime(impact.avg_resolution_time_minutes)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.peace[200]}`
          }}
        >
          <CardHeader>
            <CardTitle 
              className="flex items-center gap-2"
              style={{ color: griefSensitiveColors.peace[700] }}
            >
              <Target className="h-5 w-5" />
              Error Categories by Family Sensitivity
            </CardTitle>
            <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
              Technical areas most affecting family experiences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categories.slice(0, 6).map((category) => (
                <div key={category.category_code} className="flex items-center justify-between p-3 rounded-lg" 
                     style={{ backgroundColor: griefSensitiveColors.peace[50] }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-medium text-sm"
                        style={{ color: griefSensitiveColors.peace[700] }}
                      >
                        {category.category_name}
                      </span>
                      {category.grief_context_count > 0 && (
                        <Badge 
                          className="text-xs px-1 py-0.5"
                          style={{
                            backgroundColor: griefSensitiveColors.comfort[100],
                            color: griefSensitiveColors.comfort[700]
                          }}
                        >
                          <Heart className="h-2 w-2 mr-1" />
                          {category.grief_context_count}
                        </Badge>
                      )}
                      {category.crisis_count > 0 && (
                        <Badge className="text-xs px-1 py-0.5 bg-red-100 text-red-700">
                          <AlertTriangle className="h-2 w-2 mr-1" />
                          {category.crisis_count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                      <span>{category.error_count} total</span>
                      <span>{category.unresolved_count} unresolved</span>
                      {category.avg_resolution_time > 0 && (
                        <span>Avg: {formatTime(category.avg_resolution_time)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-lg font-semibold"
                      style={{ color: griefSensitiveColors.memory[600] }}
                    >
                      {category.high_impact_count}
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: griefSensitiveColors.peace[500] }}
                    >
                      High Impact
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Trends Visualization */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: 'white',
          border: `1px solid ${griefSensitiveColors.peace[200]}`
        }}
      >
        <CardHeader>
          <CardTitle 
            className="flex items-center gap-2"
            style={{ color: griefSensitiveColors.peace[700] }}
          >
            <Activity className="h-5 w-5" />
            Error Trends - {getTimeRangeLabel(timeRange)}
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            How error patterns change over time, with focus on family-affecting issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.trends.length > 0 ? (
              <div className="grid gap-4">
                {analytics.trends.slice(-10).map((trend, index) => {
                  const maxErrors = Math.max(...analytics.trends.map(t => t.total_errors))
                  const width = maxErrors > 0 ? (trend.total_errors / maxErrors) * 100 : 0
                  
                  return (
                    <div key={trend.time_period} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: griefSensitiveColors.peace[600] }}>
                          {new Date(trend.time_period).toLocaleDateString()} {new Date(trend.time_period).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-3">
                          {trend.crisis_count > 0 && (
                            <Badge className="text-xs px-2 py-1 bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {trend.crisis_count} crisis
                            </Badge>
                          )}
                          {trend.grief_context_count > 0 && (
                            <Badge 
                              className="text-xs px-2 py-1"
                              style={{
                                backgroundColor: griefSensitiveColors.comfort[100],
                                color: griefSensitiveColors.comfort[700]
                              }}
                            >
                              <Heart className="h-3 w-3 mr-1" />
                              {trend.grief_context_count} grief
                            </Badge>
                          )}
                          <span 
                            className="font-medium"
                            style={{ color: griefSensitiveColors.peace[700] }}
                          >
                            {trend.total_errors} errors
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative h-6 rounded-lg overflow-hidden" style={{ backgroundColor: griefSensitiveColors.peace[100] }}>
                        {/* Emergency errors */}
                        <div 
                          className="absolute left-0 top-0 h-full"
                          style={{ 
                            width: `${maxErrors > 0 ? (trend.emergency_count / maxErrors) * 100 : 0}%`,
                            backgroundColor: griefSensitiveColors.warning[600]
                          }}
                        />
                        {/* Critical errors */}
                        <div 
                          className="absolute left-0 top-0 h-full"
                          style={{ 
                            width: `${maxErrors > 0 ? ((trend.emergency_count + trend.critical_count) / maxErrors) * 100 : 0}%`,
                            backgroundColor: griefSensitiveColors.warning[500]
                          }}
                        />
                        {/* Warning errors */}
                        <div 
                          className="absolute left-0 top-0 h-full"
                          style={{ 
                            width: `${maxErrors > 0 ? ((trend.emergency_count + trend.critical_count + trend.warning_count) / maxErrors) * 100 : 0}%`,
                            backgroundColor: griefSensitiveColors.hope[500]
                          }}
                        />
                        {/* Info errors */}
                        <div 
                          className="absolute left-0 top-0 h-full"
                          style={{ 
                            width: `${width}%`,
                            backgroundColor: griefSensitiveColors.peace[400]
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                        <div className="flex items-center gap-3">
                          {trend.emergency_count > 0 && <span className="text-red-600">{trend.emergency_count} emergency</span>}
                          {trend.critical_count > 0 && <span className="text-orange-600">{trend.critical_count} critical</span>}
                          {trend.warning_count > 0 && <span>{trend.warning_count} warning</span>}
                          {trend.info_count > 0 && <span>{trend.info_count} info</span>}
                        </div>
                        <span>{trend.high_family_impact_count} high family impact</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity 
                  className="h-12 w-12 mx-auto mb-4" 
                  style={{ color: griefSensitiveColors.peace[300] }} 
                />
                <p style={{ color: griefSensitiveColors.peace[600] }}>
                  No error trends available for the selected time range
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}