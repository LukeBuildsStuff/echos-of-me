'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Server, 
  Database, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Clock,
  Activity,
  Zap
} from 'lucide-react'

interface HealthData {
  overall_health: {
    status: 'healthy' | 'warning' | 'critical'
    last_checked: string
    uptime_percentage: number
  }
  database: {
    status: 'healthy' | 'warning' | 'critical'
    response_time_ms: number
    size_mb: number
    total_records: number
  }
  errors: {
    status: 'healthy' | 'warning' | 'critical'
    errors_last_hour: number
    errors_last_day: number
    critical_errors_day: number
  }
  training_system: {
    status: 'healthy' | 'warning' | 'critical'
    active_jobs: number
    recent_failures: number
    avg_completion_time_minutes: number | null
  }
  system_performance: {
    cpu_usage: number
    memory_usage: number
    disk_usage: number
    active_connections: number
    response_time_p95: number
    uptime_days: number
    status: 'healthy' | 'warning' | 'critical'
  }
  services: Array<{
    name: string
    status: 'healthy' | 'warning' | 'critical'
    response_time_ms: number
    uptime_percentage: number
  }>
  alerts: Array<{
    id: string
    type: 'critical' | 'warning' | 'info'
    message: string
    timestamp: string
  }>
}

interface HealthStatusProps {
  initialData?: HealthData | null
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function HealthStatus({ 
  initialData = null, 
  autoRefresh = true, 
  refreshInterval = 60000 
}: HealthStatusProps) {
  const [data, setData] = useState<HealthData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchHealthData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/analytics/health')
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setLastRefresh(new Date())
      } else {
        setData(result.data) // Still show partial data on error
        setError(result.error || 'Health check failed')
      }
    } catch (err) {
      console.error('Health check error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialData) {
      fetchHealthData()
    }
  }, [initialData])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchHealthData(false)
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading && !data) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-gray-200 bg-white">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Header */}
      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button 
                onClick={() => fetchHealthData(false)} 
                size="sm" 
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {data?.overall_health && (
            <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(data.overall_health.status)}
                <div>
                  <p className="font-medium text-gray-900">
                    System Status: {data.overall_health.status.charAt(0).toUpperCase() + data.overall_health.status.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Uptime: {data.overall_health.uptime_percentage.toFixed(2)}%
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(data.overall_health.status)}>
                {data.overall_health.status.toUpperCase()}
              </Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Health Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Database Health */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Database className="h-5 w-5 text-blue-600" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.database ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge className={getStatusColor(data.database.status)}>
                    {data.database.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium">
                    {data.database.response_time_ms}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database Size</span>
                  <span className="text-sm font-medium">
                    {data.database.size_mb} MB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Records</span>
                  <span className="text-sm font-medium">
                    {data.database.total_records.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Database health data unavailable</p>
            )}
          </CardContent>
        </Card>

        {/* System Performance */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Cpu className="h-5 w-5 text-green-600" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.system_performance ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      CPU Usage
                    </span>
                    <span className={`text-sm font-medium ${getUsageColor(data.system_performance.cpu_usage)}`}>
                      {data.system_performance.cpu_usage}%
                    </span>
                  </div>
                  <Progress 
                    value={data.system_performance.cpu_usage} 
                    className={`h-2 ${getProgressColor(data.system_performance.cpu_usage)}`}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <MemoryStick className="h-3 w-3" />
                      Memory
                    </span>
                    <span className={`text-sm font-medium ${getUsageColor(data.system_performance.memory_usage)}`}>
                      {data.system_performance.memory_usage}%
                    </span>
                  </div>
                  <Progress 
                    value={data.system_performance.memory_usage} 
                    className={`h-2 ${getProgressColor(data.system_performance.memory_usage)}`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      Disk Space
                    </span>
                    <span className={`text-sm font-medium ${getUsageColor(data.system_performance.disk_usage)}`}>
                      {data.system_performance.disk_usage}%
                    </span>
                  </div>
                  <Progress 
                    value={data.system_performance.disk_usage} 
                    className={`h-2 ${getProgressColor(data.system_performance.disk_usage)}`}
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <span className="text-sm font-medium">
                      {data.system_performance.uptime_days} days
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Performance data unavailable</p>
            )}
          </CardContent>
        </Card>

        {/* Training System */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Zap className="h-5 w-5 text-purple-600" />
              Training System
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.training_system ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge className={getStatusColor(data.training_system.status)}>
                    {data.training_system.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Jobs</span>
                  <span className="text-sm font-medium">
                    {data.training_system.active_jobs}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recent Failures</span>
                  <span className="text-sm font-medium">
                    {data.training_system.recent_failures}
                  </span>
                </div>
                {data.training_system.avg_completion_time_minutes && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Completion</span>
                    <span className="text-sm font-medium">
                      {data.training_system.avg_completion_time_minutes.toFixed(1)}min
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Training system data unavailable</p>
            )}
          </CardContent>
        </Card>

        {/* Error Monitoring */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Error Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.errors ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge className={getStatusColor(data.errors.status)}>
                    {data.errors.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Hour</span>
                  <span className="text-sm font-medium">
                    {data.errors.errors_last_hour} errors
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Day</span>
                  <span className="text-sm font-medium">
                    {data.errors.errors_last_day} errors
                  </span>
                </div>
                {data.errors.critical_errors_day > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600 font-medium">Critical Today</span>
                    <span className="text-sm font-medium text-red-600">
                      {data.errors.critical_errors_day}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Error monitoring data unavailable</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      {data?.services && data.services.length > 0 && (
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Wifi className="h-5 w-5 text-blue-600" />
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.services.map((service, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{service.name}</span>
                    {getStatusIcon(service.status)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Response</span>
                      <span>{service.response_time_ms}ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Uptime</span>
                      <span>{service.uptime_percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <Card className="border border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({data.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.map((alert, index) => (
                <div key={alert.id || index} className="flex items-start gap-3 p-3 bg-white border border-red-200 rounded-lg">
                  {alert.type === 'critical' ? 
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" /> :
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  }
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge 
                    className={alert.type === 'critical' ? 
                      'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}