'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { 
  AlertTriangle, 
  Heart, 
  Shield, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  Eye,
  Calendar
} from 'lucide-react'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

interface ErrorLog {
  id: number
  error_id: string
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  family_impact: 'none' | 'low' | 'medium' | 'high' | 'severe'
  title: string
  message: string
  category_name: string
  category_code: string
  user_email?: string
  affected_feature?: string
  timestamp: string
  resolved_at?: string
  crisis_indicator: boolean
  grief_context_detected: boolean
  family_notifications_count: number
  resolution_type?: string
  resolver_email?: string
}

interface ErrorStats {
  total_errors: number
  unresolved_count: number
  crisis_count: number
  grief_context_count: number
  high_family_impact_count: number
  emergency_count: number
  critical_count: number
  last_24h_count: number
  last_hour_count: number
}

interface ErrorFilters {
  severity: string[]
  category: string[]
  familyImpact: string[]
  dateFrom?: string
  dateTo?: string
  resolved?: boolean
  crisisOnly: boolean
  griefContextOnly: boolean
  search: string
}

export default function ErrorLoggingDashboard() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [filters, setFilters] = useState<ErrorFilters>({
    severity: [],
    category: [],
    familyImpact: [],
    resolved: undefined,
    crisisOnly: false,
    griefContextOnly: false,
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchErrors = useCallback(async () => {
    try {
      const searchParams = new URLSearchParams()
      
      if (filters.severity.length) searchParams.set('severity', filters.severity.join(','))
      if (filters.category.length) searchParams.set('category', filters.category.join(','))
      if (filters.familyImpact.length) searchParams.set('familyImpact', filters.familyImpact.join(','))
      if (filters.dateFrom) searchParams.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) searchParams.set('dateTo', filters.dateTo)
      if (filters.resolved !== undefined) searchParams.set('resolved', filters.resolved.toString())
      if (filters.crisisOnly) searchParams.set('crisisOnly', 'true')
      if (filters.griefContextOnly) searchParams.set('griefContextOnly', 'true')
      if (filters.search) searchParams.set('search', filters.search)
      searchParams.set('page', currentPage.toString())
      searchParams.set('limit', '20')
      
      const response = await fetch(`/api/admin/error-logs?${searchParams}`)
      const data = await response.json()
      
      if (data.success) {
        setErrors(data.data.errors)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, currentPage])

  useEffect(() => {
    fetchErrors()
  }, [fetchErrors])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchErrors, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchErrors])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return griefSensitiveColors.warning[500]
      case 'critical': return griefSensitiveColors.warning[400]
      case 'warning': return griefSensitiveColors.hope[500]
      case 'info': return griefSensitiveColors.peace[500]
      default: return griefSensitiveColors.peace[300]
    }
  }

  const getFamilyImpactColor = (impact: string) => {
    switch (impact) {
      case 'severe': return griefSensitiveColors.warning[600]
      case 'high': return griefSensitiveColors.warning[500]
      case 'medium': return griefSensitiveColors.hope[500]
      case 'low': return griefSensitiveColors.comfort[500]
      case 'none': return griefSensitiveColors.peace[400]
      default: return griefSensitiveColors.peace[300]
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const errorTime = new Date(timestamp)
    const diffMs = now.getTime() - errorTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const handleResolveError = async (errorId: number) => {
    try {
      const response = await fetch(`/api/admin/error-logs/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          resolutionType: 'fixed',
          stepsTaken: 'Manually resolved from dashboard'
        })
      })
      
      if (response.ok) {
        fetchErrors()
      }
    } catch (error) {
      console.error('Failed to resolve error:', error)
    }
  }

  const handleEscalateError = async (errorId: number) => {
    try {
      const response = await fetch(`/api/admin/error-logs/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'escalate' })
      })
      
      if (response.ok) {
        fetchErrors()
      }
    } catch (error) {
      console.error('Failed to escalate error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: griefSensitiveColors.comfort[500] }} />
          <p style={{ color: griefSensitiveColors.peace[600] }}>Loading error monitoring system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Compassionate Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8" style={{ color: griefSensitiveColors.comfort[500] }} />
            <h1 className="text-3xl font-semibold" style={{ color: griefSensitiveColors.peace[800] }}>
              Family Guardian Error Monitor
            </h1>
          </div>
          <p className="text-lg" style={{ color: griefSensitiveColors.peace[600] }}>
            Protecting families by monitoring and resolving issues with deep care and urgency
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchErrors}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Auto-Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* Critical Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className={`border-0 shadow-sm ${stats.crisis_count > 0 ? 'ring-2 ring-red-200 bg-red-50' : ''}`}
            style={{ 
              backgroundColor: stats.crisis_count > 0 ? griefSensitiveColors.warning[50] : 'white',
              border: `1px solid ${stats.crisis_count > 0 ? griefSensitiveColors.warning[300] : griefSensitiveColors.peace[200]}`
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle 
                className="text-sm font-medium flex items-center gap-2"
                style={{ color: stats.crisis_count > 0 ? griefSensitiveColors.warning[700] : griefSensitiveColors.peace[700] }}
              >
                <AlertTriangle className="h-4 w-4" />
                Crisis Situations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-3xl font-semibold mb-1"
                style={{ color: stats.crisis_count > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600] }}
              >
                {stats.crisis_count}
              </div>
              <p 
                className="text-sm"
                style={{ color: griefSensitiveColors.peace[600] }}
              >
                {stats.crisis_count > 0 ? 'Require immediate attention' : 'All families protected'}
              </p>
            </CardContent>
          </Card>

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
                {stats.grief_context_count}
              </div>
              <p 
                className="text-sm"
                style={{ color: griefSensitiveColors.peace[600] }}
              >
                Affecting family memories
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
                High Family Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-3xl font-semibold mb-1"
                style={{ color: griefSensitiveColors.memory[600] }}
              >
                {stats.high_family_impact_count}
              </div>
              <p 
                className="text-sm"
                style={{ color: griefSensitiveColors.peace[600] }}
              >
                Severely affecting families
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
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-3xl font-semibold mb-1"
                style={{ color: griefSensitiveColors.hope[600] }}
              >
                {stats.last_hour_count}
              </div>
              <p 
                className="text-sm"
                style={{ color: griefSensitiveColors.peace[600] }}
              >
                Errors in last hour
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compassionate Filters */}
      <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
            <Filter className="h-5 w-5" />
            Filter Errors with Family Sensitivity
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            Find errors that need your immediate compassionate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                Search Errors
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: griefSensitiveColors.peace[400] }} />
                <Input
                  placeholder="Search error messages..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                Quick Filters
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filters.crisisOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, crisisOnly: !filters.crisisOnly })}
                  className="flex items-center gap-1"
                  style={{
                    backgroundColor: filters.crisisOnly ? griefSensitiveColors.warning[500] : 'transparent',
                    borderColor: griefSensitiveColors.warning[300],
                    color: filters.crisisOnly ? 'white' : griefSensitiveColors.warning[600]
                  }}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Crisis Only
                </Button>
                <Button
                  variant={filters.griefContextOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, griefContextOnly: !filters.griefContextOnly })}
                  className="flex items-center gap-1"
                  style={{
                    backgroundColor: filters.griefContextOnly ? griefSensitiveColors.comfort[500] : 'transparent',
                    borderColor: griefSensitiveColors.comfort[300],
                    color: filters.griefContextOnly ? 'white' : griefSensitiveColors.comfort[600]
                  }}
                >
                  <Heart className="h-3 w-3" />
                  Grief Context
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List with Family-Sensitive Design */}
      <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
        <CardHeader>
          <CardTitle style={{ color: griefSensitiveColors.peace[700] }}>
            Error Monitoring ({errors.length} errors requiring attention)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {errors.map((error) => (
              <div
                key={error.id}
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  error.crisis_indicator ? 'ring-2 ring-red-200 bg-red-50' : ''
                } ${
                  error.grief_context_detected ? 'border-l-4' : ''
                }`}
                style={{
                  backgroundColor: error.crisis_indicator ? griefSensitiveColors.warning[50] : 'white',
                  border: `1px solid ${error.crisis_indicator ? griefSensitiveColors.warning[300] : griefSensitiveColors.peace[200]}`,
                  borderLeftColor: error.grief_context_detected ? griefSensitiveColors.comfort[400] : undefined,
                  borderLeftWidth: error.grief_context_detected ? '4px' : undefined
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge
                        className="text-xs px-2 py-1"
                        style={{
                          backgroundColor: getSeverityColor(error.severity),
                          color: 'white'
                        }}
                      >
                        {error.severity.toUpperCase()}
                      </Badge>
                      
                      {error.family_impact !== 'none' && (
                        <Badge
                          className="text-xs px-2 py-1"
                          style={{
                            backgroundColor: getFamilyImpactColor(error.family_impact),
                            color: 'white'
                          }}
                        >
                          {error.family_impact.toUpperCase()} FAMILY IMPACT
                        </Badge>
                      )}
                      
                      {error.crisis_indicator && (
                        <Badge className="text-xs px-2 py-1 bg-red-100 text-red-800 animate-pulse">
                          CRISIS
                        </Badge>
                      )}
                      
                      {error.grief_context_detected && (
                        <Badge 
                          className="text-xs px-2 py-1"
                          style={{
                            backgroundColor: griefSensitiveColors.comfort[100],
                            color: griefSensitiveColors.comfort[700]
                          }}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          GRIEF SENSITIVE
                        </Badge>
                      )}
                      
                      {error.resolved_at && (
                        <Badge className="text-xs px-2 py-1 bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          RESOLVED
                        </Badge>
                      )}
                    </div>
                    
                    <h3 
                      className="font-semibold text-lg"
                      style={{ color: griefSensitiveColors.peace[800] }}
                    >
                      {error.title}
                    </h3>
                    
                    <p 
                      className="text-sm line-clamp-2"
                      style={{ color: griefSensitiveColors.peace[600] }}
                    >
                      {error.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm" style={{ color: griefSensitiveColors.peace[500] }}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(error.timestamp)}
                      </span>
                      
                      {error.category_name && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {error.category_name}
                        </span>
                      )}
                      
                      {error.affected_feature && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {error.affected_feature}
                        </span>
                      )}
                      
                      {error.family_notifications_count > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {error.family_notifications_count} family notification{error.family_notifications_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedError(error)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View Details
                    </Button>
                    
                    {!error.resolved_at && (
                      <>
                        {error.crisis_indicator && (
                          <Button
                            size="sm"
                            onClick={() => handleEscalateError(error.id)}
                            style={{
                              backgroundColor: griefSensitiveColors.warning[500],
                              color: 'white'
                            }}
                            className="flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Escalate
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          onClick={() => handleResolveError(error.id)}
                          style={{
                            backgroundColor: griefSensitiveColors.hope[500],
                            color: 'white'
                          }}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Resolve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {errors.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle 
                  className="h-16 w-16 mx-auto mb-4" 
                  style={{ color: griefSensitiveColors.hope[500] }} 
                />
                <h3 
                  className="text-xl font-semibold mb-2"
                  style={{ color: griefSensitiveColors.peace[700] }}
                >
                  All Clear - Families Are Protected
                </h3>
                <p 
                  className="text-lg"
                  style={{ color: griefSensitiveColors.peace[600] }}
                >
                  No errors match your current filters. The system is running smoothly for all families.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}