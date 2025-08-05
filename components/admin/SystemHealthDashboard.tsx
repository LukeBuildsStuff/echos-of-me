'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { 
  MetricCard, 
  SystemStatus, 
  ActivityFeed,
  SimpleChart
} from './DashboardWidgets'
import { 
  Server, 
  Database, 
  Wifi, 
  HardDrive,
  Cpu,
  MemoryStick,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Download,
  Eye,
  Zap,
  Cloud,
  Shield,
  Globe,
  Monitor,
  Thermometer
} from 'lucide-react'

// Types for system health monitoring
interface SystemMetrics {
  timestamp: string
  cpu: {
    usage: number
    cores: number
    temperature: number
    load: number[]
  }
  memory: {
    used: number
    total: number
    cached: number
    buffers: number
  }
  disk: {
    used: number
    total: number
    io: {
      read: number
      write: number
    }
  }
  network: {
    bandwidth: {
      in: number
      out: number
    }
    connections: number
    latency: number
  }
  services: ServiceStatus[]
}

interface ServiceStatus {
  id: string
  name: string
  status: 'running' | 'stopped' | 'error' | 'starting'
  uptime: number
  cpu: number
  memory: number
  restarts: number
  port?: number
  version?: string
  lastChecked: string
}

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  component: string
  timestamp: string
  acknowledged: boolean
  resolvedAt?: string
}

interface SystemHealthDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function SystemHealthDashboard({ 
  className,
  autoRefresh = true,
  refreshInterval = 5000 
}: SystemHealthDashboardProps) {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'alerts' | 'performance'>('overview')
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const metricsHistoryRef = useRef<SystemMetrics[]>([])

  useEffect(() => {
    if (autoRefresh) {
      initializeRealTimeConnection()
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [autoRefresh])

  const initializeRealTimeConnection = () => {
    try {
      const eventSource = new EventSource('/api/admin/monitoring/system-health-stream')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setLoading(false)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastUpdate(new Date().toISOString())

          switch (data.type) {
            case 'system_metrics':
              setSystemMetrics(data.metrics)
              // Keep history for charts (last 60 points)
              metricsHistoryRef.current = [
                ...metricsHistoryRef.current.slice(-59),
                data.metrics
              ]
              break
              
            case 'alerts':
              setAlerts(data.alerts)
              break
              
            case 'new_alert':
              setAlerts(prev => [data.alert, ...prev])
              break
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        // Attempt reconnection after 5 seconds
        setTimeout(initializeRealTimeConnection, 5000)
      }

    } catch (error) {
      console.error('Failed to initialize SSE connection:', error)
      setIsConnected(false)
      // Mock data for demonstration
      loadMockData()
    }
  }

  const loadMockData = () => {
    // Mock system metrics
    const mockMetrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: 34.2,
        cores: 16,
        temperature: 62,
        load: [0.8, 1.2, 0.6, 0.9, 1.1, 0.7, 0.5, 0.8, 1.0, 0.9, 0.6, 0.8, 0.7, 0.9, 1.1, 0.6]
      },
      memory: {
        used: 45.8 * 1024 * 1024 * 1024, // 45.8 GB
        total: 64 * 1024 * 1024 * 1024,  // 64 GB
        cached: 8.2 * 1024 * 1024 * 1024,
        buffers: 2.1 * 1024 * 1024 * 1024
      },
      disk: {
        used: 450 * 1024 * 1024 * 1024,  // 450 GB
        total: 1024 * 1024 * 1024 * 1024, // 1 TB
        io: {
          read: 234.5,  // MB/s
          write: 189.2  // MB/s
        }
      },
      network: {
        bandwidth: {
          in: 125.6,  // Mbps
          out: 78.3   // Mbps
        },
        connections: 1247,
        latency: 12.5 // ms
      },
      services: [
        {
          id: 'nextjs',
          name: 'Next.js Web Server',
          status: 'running',
          uptime: 345600, // seconds
          cpu: 12.5,
          memory: 2.1 * 1024 * 1024 * 1024, // 2.1 GB
          restarts: 0,
          port: 3000,
          version: '14.0.0',
          lastChecked: new Date().toISOString()
        },
        {
          id: 'postgres',
          name: 'PostgreSQL Database',
          status: 'running',
          uptime: 864000,
          cpu: 8.7,
          memory: 4.5 * 1024 * 1024 * 1024, // 4.5 GB
          restarts: 1,
          port: 5432,
          version: '15.4',
          lastChecked: new Date().toISOString()
        },
        {
          id: 'rtx-training',
          name: 'RTX Training Service',
          status: 'running',
          uptime: 86400,
          cpu: 45.2,
          memory: 8.9 * 1024 * 1024 * 1024, // 8.9 GB
          restarts: 2,
          port: 8080,
          version: '1.2.3',
          lastChecked: new Date().toISOString()
        },
        {
          id: 'redis',
          name: 'Redis Cache',
          status: 'running',
          uptime: 432000,
          cpu: 2.1,
          memory: 512 * 1024 * 1024, // 512 MB
          restarts: 0,
          port: 6379,
          version: '7.0.12',
          lastChecked: new Date().toISOString()
        },
        {
          id: 'nginx',
          name: 'Nginx Reverse Proxy',
          status: 'running',
          uptime: 864000,
          cpu: 3.4,
          memory: 256 * 1024 * 1024, // 256 MB
          restarts: 0,
          port: 80,
          version: '1.24.0',
          lastChecked: new Date().toISOString()
        }
      ]
    }

    // Mock alerts
    const mockAlerts: Alert[] = [
      {
        id: '1',
        severity: 'warning',
        title: 'High Memory Usage',
        message: 'System memory usage has exceeded 70% for the last 15 minutes',
        component: 'System',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        acknowledged: false
      },
      {
        id: '2',
        severity: 'info',
        title: 'Service Restart',
        message: 'RTX Training Service was automatically restarted due to memory leak',
        component: 'RTX Training Service',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: true
      }
    ]

    setSystemMetrics(mockMetrics)
    setAlerts(mockAlerts)
    setIsConnected(true)
    setLoading(false)
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getServiceStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'starting': return 'bg-blue-100 text-blue-800'
      case 'stopped': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAlertSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    )
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged)
  const warningAlerts = alerts.filter(a => a.severity === 'warning' && !a.acknowledged)

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading system health data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Live Monitoring' : 'Offline'}
              </span>
            </div>
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalAlerts.length + warningAlerts.length} Active Alerts
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="CPU Usage"
            value={{ current: systemMetrics.cpu.usage, format: 'percentage' }}
            icon={Cpu}
            description={`${systemMetrics.cpu.cores} cores @ ${systemMetrics.cpu.temperature}°C`}
            className={
              systemMetrics.cpu.usage > 90 ? 'border-red-200 bg-red-50' :
              systemMetrics.cpu.usage > 70 ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }
          />
          
          <MetricCard
            title="Memory Usage"
            value={{ 
              current: (systemMetrics.memory.used / systemMetrics.memory.total) * 100, 
              format: 'percentage' 
            }}
            icon={MemoryStick}
            description={`${formatBytes(systemMetrics.memory.used)} / ${formatBytes(systemMetrics.memory.total)}`}
            className={
              (systemMetrics.memory.used / systemMetrics.memory.total) > 0.9 ? 'border-red-200 bg-red-50' :
              (systemMetrics.memory.used / systemMetrics.memory.total) > 0.7 ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }
          />
          
          <MetricCard
            title="Disk Usage"
            value={{ 
              current: (systemMetrics.disk.used / systemMetrics.disk.total) * 100, 
              format: 'percentage' 
            }}
            icon={HardDrive}
            description={`${formatBytes(systemMetrics.disk.used)} / ${formatBytes(systemMetrics.disk.total)}`}
            className={
              (systemMetrics.disk.used / systemMetrics.disk.total) > 0.9 ? 'border-red-200 bg-red-50' :
              (systemMetrics.disk.used / systemMetrics.disk.total) > 0.8 ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }
          />
          
          <MetricCard
            title="Network Latency"
            value={{ current: systemMetrics.network.latency, unit: 'ms' }}
            icon={Wifi}
            description={`${systemMetrics.network.connections} active connections`}
            className={
              systemMetrics.network.latency > 100 ? 'border-red-200 bg-red-50' :
              systemMetrics.network.latency > 50 ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }
          />
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">
            Services
            <Badge variant="secondary" className="ml-2">
              {systemMetrics?.services.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {(criticalAlerts.length + warningAlerts.length) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {criticalAlerts.length + warningAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* System Status Summary */}
            <SystemStatus
              title="Core Services"
              items={systemMetrics?.services.slice(0, 5).map(service => ({
                id: service.id,
                label: service.name,
                status: service.status === 'running' ? 'online' : 
                       service.status === 'error' ? 'error' : 'warning' as any,
                value: `${service.cpu.toFixed(1)}% CPU`,
                lastUpdated: formatUptime(service.uptime)
              })) || []}
            />

            {/* Resource Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>Current system resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemMetrics && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>CPU ({systemMetrics.cpu.cores} cores)</span>
                        <span>{systemMetrics.cpu.usage.toFixed(1)}%</span>
                      </div>
                      <Progress value={systemMetrics.cpu.usage} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Memory</span>
                        <span>{((systemMetrics.memory.used / systemMetrics.memory.total) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={(systemMetrics.memory.used / systemMetrics.memory.total) * 100} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Disk</span>
                        <span>{((systemMetrics.disk.used / systemMetrics.disk.total) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={(systemMetrics.disk.used / systemMetrics.disk.total) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <ActivityFeed
            title="System Activity"
            activities={[
              {
                id: '1',
                type: 'system',
                title: 'High memory usage detected',
                description: 'Memory usage exceeded 70% threshold',
                timestamp: '5 minutes ago',
                user: 'System Monitor'
              },
              {
                id: '2',
                type: 'system',
                title: 'Service restart',
                description: 'RTX Training Service automatically restarted',
                timestamp: '1 hour ago',
                user: 'Process Manager'
              },
              {
                id: '3',
                type: 'system',
                title: 'Disk cleanup completed',
                description: 'Freed 2.3 GB of temporary files',
                timestamp: '3 hours ago',
                user: 'Maintenance Script'
              }
            ]}
          />
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          {systemMetrics?.services && (
            <div className="grid gap-4">
              {systemMetrics.services.map((service) => (
                <Card key={service.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <CardDescription>
                          {service.version && `v${service.version} • `}
                          {service.port && `Port ${service.port} • `}
                          Uptime: {formatUptime(service.uptime)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getServiceStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                        {service.restarts > 0 && (
                          <Badge variant="outline">
                            {service.restarts} restarts
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">CPU Usage</span>
                        <div className="font-medium">{service.cpu.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Memory</span>
                        <div className="font-medium">{formatBytes(service.memory)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Status</span>
                        <div className="font-medium capitalize">{service.status}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Checked</span>
                        <div className="font-medium">
                          {new Date(service.lastChecked).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card 
                  key={alert.id}
                  className={cn(
                    "border-l-4",
                    alert.severity === 'critical' && "border-l-red-500",
                    alert.severity === 'warning' && "border-l-yellow-500",
                    alert.severity === 'info' && "border-l-blue-500",
                    alert.acknowledged && "opacity-60"
                  )}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{alert.title}</CardTitle>
                          <Badge className={getAlertSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.acknowledged && (
                            <Badge variant="outline">Acknowledged</Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {alert.component} • {new Date(alert.timestamp).toLocaleString()}
                        </CardDescription>
                      </div>
                      {!alert.acknowledged && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-gray-700">{alert.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                <p className="text-gray-500">All systems are operating normally</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {systemMetrics && (
              <>
                <SimpleChart
                  title="CPU Usage Over Time"
                  data={metricsHistoryRef.current.slice(-20).map((metric, index) => ({
                    label: index.toString(),
                    value: metric.cpu.usage
                  }))}
                  type="line"
                />
                
                <SimpleChart
                  title="Memory Usage Over Time"
                  data={metricsHistoryRef.current.slice(-20).map((metric, index) => ({
                    label: index.toString(),
                    value: (metric.memory.used / metric.memory.total) * 100
                  }))}
                  type="line"
                />
                
                <SimpleChart
                  title="Network Bandwidth"
                  data={[
                    { label: 'Inbound', value: systemMetrics.network.bandwidth.in },
                    { label: 'Outbound', value: systemMetrics.network.bandwidth.out }
                  ]}
                  type="bar"
                />
                
                <SimpleChart
                  title="Disk I/O"
                  data={[
                    { label: 'Read', value: systemMetrics.disk.io.read },
                    { label: 'Write', value: systemMetrics.disk.io.write }
                  ]}
                  type="bar"
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}