'use client'

import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useOptimizedRealTime, usePerformanceMonitor } from '@/hooks/useOptimizedRealTime'
import { useAutoRetry } from '@/hooks/useErrorRecovery'
import { useErrorRecovery } from '@/components/providers/ErrorRecoveryProvider'
import { MonitoringErrorBoundary } from '@/components/ui/specialized-error-boundaries'
import { LoadingSpinner } from '@/components/ui/loading'
import { useAccessibility } from '@/components/providers/AccessibilityProvider'
import { ErrorRecoveryPanel } from '@/components/ui/error-recovery'
import { 
  MetricCard, 
  SystemStatus, 
  ActivityFeed, 
  ProgressTracker 
} from './DashboardWidgets'
import { 
  Zap, 
  Thermometer, 
  HardDrive, 
  Cpu, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  RefreshCw,
  Pause,
  Play,
  Square,
  Download,
  FileText,
  Eye,
  Brain
} from 'lucide-react'

// Types for real-time GPU monitoring
interface GPUMetrics {
  timestamp: string
  temperature: number
  utilization: number
  memoryUsed: number
  memoryTotal: number
  powerDraw: number
  powerLimit: number
  clockCore: number
  clockMemory: number
  fanSpeed: number
}

interface TrainingJob {
  id: string
  jobId: string
  userId: string
  userName: string
  userEmail: string
  modelName: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  startedAt: string
  estimatedEndTime?: string
  progress: {
    currentEpoch: number
    totalEpochs: number
    currentStep: number
    totalSteps: number
    percentage: number
    estimatedTimeRemaining?: number
  }
  metrics: {
    currentLoss: number
    averageLoss: number
    learningRate: number
    samplesPerSecond: number
    lossHistory: Array<{ epoch: number; loss: number }>
  }
  resources: {
    gpuUtilization: number
    memoryUsage: number
    diskUsage: number
  }
  logs: Array<{
    timestamp: string
    level: 'info' | 'warning' | 'error'
    message: string
  }>
}

interface RTXMonitoringDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function RTXMonitoringDashboard({ 
  className,
  autoRefresh = true,
  refreshInterval = 2000 
}: RTXMonitoringDashboardProps) {
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'system' | 'logs'>('overview')
  const [showPerformanceStats, setShowPerformanceStats] = useState(false)
  
  const { announce } = useAccessibility()
  const { metrics: performanceMetrics, startRender, endRender } = usePerformanceMonitor()
  const { reportError } = useErrorRecovery()
  
  // Optimized real-time data fetching
  const {
    data: rtxData,
    error: rtxError,
    connectionStats,
    reconnect
  } = useOptimizedRealTime<{
    gpuMetrics: GPUMetrics
    trainingJobs: TrainingJob[]
  }>('/api/admin/monitoring/rtx-stream', {
    enabled: autoRefresh,
    refreshInterval,
    maxHistorySize: 50,
    throttleMs: 200,
    onError: (error) => {
      console.error('RTX monitoring error:', error)
      reportError(error, 'rtx-monitoring', 'high')
      announce('RTX monitoring connection lost', 'assertive')
    },
    onReconnect: () => {
      announce('RTX monitoring reconnected', 'polite')
    }
  })
  
  const gpuMetrics = rtxData?.gpuMetrics || null
  const trainingJobs = rtxData?.trainingJobs || []

  // Enhanced error recovery for RTX monitoring
  const rtxRecovery = useAutoRetry(
    async () => {
      const response = await fetch('/api/admin/monitoring/rtx-stream')
      if (!response.ok) throw new Error(`RTX monitoring failed: ${response.status}`)
      return response.json()
    },
    {
      retryConfig: {
        maxAttempts: 5,
        baseDelay: 2000,
        backoffMultiplier: 1.5,
        maxDelay: 30000
      },
      persistErrors: true,
      storageKey: 'rtx-monitoring-recovery',
      onError: (error, state) => {
        reportError(error, 'rtx-monitoring', 'high')
        console.log('RTX monitoring retry failed:', state)
      },
      onRecovery: () => {
        announce('RTX monitoring fully recovered', 'polite')
      }
    }
  )

  // Performance monitoring
  useEffect(() => {
    startRender()
    return () => {
      endRender()
    }
  })

  // Memoized computations for performance
  const activeJobs = useMemo(() => 
    trainingJobs.filter(job => ['running', 'queued', 'paused'].includes(job.status)),
    [trainingJobs]
  )
  
  const systemStatus = useMemo(() => {
    if (!gpuMetrics) return 'unknown'
    
    const tempStatus = getTemperatureStatus(gpuMetrics.temperature)
    const utilStatus = getUtilizationStatus(gpuMetrics.utilization)
    
    if (tempStatus.status === 'error' || utilStatus.status === 'error') return 'error'
    if (tempStatus.status === 'warning' || utilStatus.status === 'warning') return 'warning'
    return 'online'
  }, [gpuMetrics])
  
  // Memoized handlers
  const handleJobSelection = useCallback((job: TrainingJob) => {
    setSelectedJob(selectedJob?.id === job.id ? null : job)
  }, [selectedJob])
  
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as any)
  }, [])
  
  const handleReconnect = useCallback(() => {
    reconnect()
    announce('Attempting to reconnect to RTX monitoring', 'polite')
  }, [reconnect, announce])

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const getStatusColor = (status: TrainingJob['status']) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }


  const getTemperatureStatus = (temp: number) => {
    if (temp > 85) return { status: 'error', label: 'Critical' }
    if (temp > 75) return { status: 'warning', label: 'High' }
    return { status: 'online', label: 'Normal' }
  }

  const getUtilizationStatus = (util: number) => {
    if (util > 95) return { status: 'warning', label: 'Very High' }
    if (util > 80) return { status: 'online', label: 'High' }
    if (util > 50) return { status: 'online', label: 'Moderate' }
    return { status: 'online', label: 'Low' }
  }

  // Loading state
  if (!connectionStats.hasData && !rtxError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" showLabel label="Connecting to RTX 5090 monitoring..." />
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Error state
  if (rtxError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Connection Error</h3>
              <p className="text-sm text-gray-600 mt-2">{rtxError.message}</p>
            </div>
            <Button onClick={handleReconnect} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <MonitoringErrorBoundary component="RTX Monitoring" onError={console.error}>
      <div className={cn("space-y-6", className)}>
        {/* Header with connection status */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">RTX 5090 Monitoring</h2>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStats.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-sm text-gray-600">
                  {connectionStats.isConnected ? 'Live Monitoring' : 'Disconnected'}
                </span>
              </div>
              {connectionStats.lastUpdate && (
                <span className="text-sm text-gray-500">
                  Last update: {connectionStats.lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPerformanceStats(!showPerformanceStats)}
                className="text-xs"
              >
                {showPerformanceStats ? 'Hide' : 'Show'} Stats
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReconnect}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      
      {/* Performance Stats */}
      {showPerformanceStats && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
          <div className="flex justify-between">
            <span>Render Time:</span>
            <span>{performanceMetrics.renderTime}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Memory Usage:</span>
            <span>{performanceMetrics.memoryUsage}MB</span>
          </div>
          <div className="flex justify-between">
            <span>Connection Status:</span>
            <span className={connectionStats.isConnected ? 'text-green-600' : 'text-red-600'}>
              {connectionStats.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Retry Count:</span>
            <span>{connectionStats.retryCount}</span>
          </div>
        </div>
      )}

      {/* Error Recovery Panel */}
      {(rtxError || rtxRecovery.error) && (
        <ErrorRecoveryPanel
          title="RTX Monitoring Recovery"
          error={rtxError || rtxRecovery.error}
          recoveryState={{
            isRetrying: rtxRecovery.isRetrying,
            attemptCount: rtxRecovery.attemptCount,
            maxAttempts: 5,
            timeUntilNextRetry: rtxRecovery.timeUntilNextRetry,
            canRetry: rtxRecovery.canRetry
          }}
          connectionState={{
            isConnected: connectionStats.isConnected,
            lastSuccessTime: connectionStats.lastUpdate?.getTime()
          }}
          actions={{
            onRetry: rtxRecovery.manualRetry,
            onReset: rtxRecovery.reset,
            onRestore: () => {
              rtxRecovery.reset()
              reconnect()
            }
          }}
          className="mb-6"
        />
      )}

      {/* Real-time GPU metrics */}
      {gpuMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="GPU Temperature"
            value={{ current: gpuMetrics.temperature, unit: '°C' }}
            icon={Thermometer}
            description={getTemperatureStatus(gpuMetrics.temperature).label}
            className={
              gpuMetrics.temperature > 85 ? 'border-red-200 bg-red-50' :
              gpuMetrics.temperature > 75 ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }
          />
          
          <MetricCard
            title="GPU Utilization"
            value={{ current: gpuMetrics.utilization, format: 'percentage' }}
            icon={Zap}
            description={getUtilizationStatus(gpuMetrics.utilization).label}
          />
          
          <MetricCard
            title="VRAM Usage"
            value={{ 
              current: (gpuMetrics.memoryUsed / gpuMetrics.memoryTotal) * 100, 
              format: 'percentage' 
            }}
            icon={HardDrive}
            description={`${formatBytes(gpuMetrics.memoryUsed)} / ${formatBytes(gpuMetrics.memoryTotal)}`}
          />
          
          <MetricCard
            title="Power Draw"
            value={{ 
              current: gpuMetrics.powerDraw, 
              unit: `W / ${gpuMetrics.powerLimit}W` 
            }}
            icon={Activity}
            description={`${Math.round((gpuMetrics.powerDraw / gpuMetrics.powerLimit) * 100)}% of limit`}
          />
        </div>
      )}

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">
            Training Jobs
            {activeJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* System Status */}
            <SystemStatus
              title="Hardware Status"
              items={gpuMetrics ? [
                {
                  id: 'gpu',
                  label: 'RTX 5090',
                  status: gpuMetrics.temperature > 85 ? 'error' : 
                          gpuMetrics.temperature > 75 ? 'warning' : 'online',
                  value: `${gpuMetrics.temperature}°C`
                },
                {
                  id: 'memory',
                  label: 'VRAM',
                  status: (gpuMetrics.memoryUsed / gpuMetrics.memoryTotal) > 0.9 ? 'warning' : 'online',
                  value: `${Math.round((gpuMetrics.memoryUsed / gpuMetrics.memoryTotal) * 100)}%`
                },
                {
                  id: 'power',
                  label: 'Power',
                  status: (gpuMetrics.powerDraw / gpuMetrics.powerLimit) > 0.95 ? 'warning' : 'online',
                  value: `${gpuMetrics.powerDraw}W`
                },
                {
                  id: 'cooling',
                  label: 'Cooling',
                  status: gpuMetrics.fanSpeed > 80 ? 'warning' : 'online',
                  value: `${gpuMetrics.fanSpeed}%`
                }
              ] : []}
            />

            {/* Active Training Progress */}
            <ProgressTracker
              title="Active Training Jobs"
              items={activeJobs.map(job => ({
                id: job.id,
                label: `${job.userName} - ${job.modelName}`,
                value: job.progress.currentEpoch,
                max: job.progress.totalEpochs,
                status: job.status as any,
                eta: job.progress.estimatedTimeRemaining ? 
                      formatDuration(job.progress.estimatedTimeRemaining) : undefined,
                details: `Epoch ${job.progress.currentEpoch}/${job.progress.totalEpochs} (${job.progress.percentage}%)`
              }))}
            />
          </div>

          {/* Recent Activity */}
          <ActivityFeed
            title="Recent System Activity"
            activities={[
              {
                id: '1',
                type: 'training',
                title: 'Training job completed',
                description: 'Model training for user@example.com finished successfully',
                timestamp: '5 minutes ago',
                user: 'System'
              },
              {
                id: '2',
                type: 'system',
                title: 'GPU temperature warning',
                description: 'Temperature reached 78°C during intensive training',
                timestamp: '12 minutes ago',
                user: 'System'
              },
              {
                id: '3',
                type: 'training',
                title: 'New training job started',
                description: 'Started training job for john@doe.com with 2.1k samples',
                timestamp: '25 minutes ago',
                user: 'Administrator'
              }
            ]}
          />
        </TabsContent>

        {/* Training Jobs Tab */}
        <TabsContent value="training" className="space-y-6">
          <TrainingJobsList 
            jobs={activeJobs}
            selectedJob={selectedJob}
            onJobSelect={handleJobSelection}
            getStatusColor={getStatusColor}
            formatDuration={formatDuration}
          />
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <SystemStatus
              title="Hardware Components"
              items={gpuMetrics ? [
                {
                  id: 'gpu-core',
                  label: 'GPU Core',
                  status: 'online',
                  value: `${gpuMetrics.clockCore} MHz`,
                  lastUpdated: 'Just now'
                },
                {
                  id: 'gpu-memory',
                  label: 'GPU Memory',
                  status: 'online',
                  value: `${gpuMetrics.clockMemory} MHz`,
                  lastUpdated: 'Just now'
                },
                {
                  id: 'cooling',
                  label: 'Cooling System',
                  status: gpuMetrics.fanSpeed > 80 ? 'warning' : 'online',
                  value: `${gpuMetrics.fanSpeed}% RPM`,
                  lastUpdated: 'Just now'
                }
              ] : []}
            />

            <SystemStatus
              title="Training Infrastructure"
              items={[
                {
                  id: 'training-engine',
                  label: 'Training Engine',
                  status: activeJobs.length > 0 ? 'online' : 'offline',
                  value: activeJobs.length > 0 ? 'Running' : 'Idle'
                },
                {
                  id: 'model-storage',
                  label: 'Model Storage',
                  status: 'online',
                  value: '847 GB Available'
                },
                {
                  id: 'data-pipeline',
                  label: 'Data Pipeline',
                  status: 'online',
                  value: 'Operational'
                }
              ]}
            />
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>System Logs</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm max-h-96 overflow-y-auto">
                {/* Mock log entries */}
                <div className="p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">2024-01-20 14:23:15</span> [INFO] GPU temperature: 67°C, utilization: 95%
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <span className="text-gray-500">2024-01-20 14:23:10</span> [INFO] Training job started for user john@doe.com
                </div>
                <div className="p-2 bg-yellow-50 rounded">
                  <span className="text-gray-500">2024-01-20 14:22:45</span> [WARN] High memory usage detected: 89% VRAM utilized
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <span className="text-gray-500">2024-01-20 14:22:30</span> [INFO] Model checkpoint saved successfully
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </MonitoringErrorBoundary>
  )
}

// Optimized Training Jobs List Component
const TrainingJobsList = memo<{
  jobs: TrainingJob[]
  selectedJob: TrainingJob | null
  onJobSelect: (job: TrainingJob) => void
  getStatusColor: (status: TrainingJob['status']) => string
  formatDuration: (minutes: number) => string
}>(({ jobs, selectedJob, onJobSelect, getStatusColor, formatDuration }) => {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Training Jobs</h3>
          <p className="text-gray-500 mb-4">All training jobs have been completed or are queued</p>
          <Button onClick={() => window.location.href = '/admin/training'}>
            Start New Training
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <TrainingJobCard
          key={job.id}
          job={job}
          isSelected={selectedJob?.id === job.id}
          onSelect={() => onJobSelect(job)}
          getStatusColor={getStatusColor}
          formatDuration={formatDuration}
        />
      ))}
    </div>
  )
})

TrainingJobsList.displayName = 'TrainingJobsList'

// Optimized Training Job Card Component
const TrainingJobCard = memo<{
  job: TrainingJob
  isSelected: boolean
  onSelect: () => void
  getStatusColor: (status: TrainingJob['status']) => string
  formatDuration: (minutes: number) => string
}>(({ job, isSelected, onSelect, getStatusColor, formatDuration }) => {
  const lossChartData = useMemo(() => 
    job.metrics.lossHistory.slice(-20),
    [job.metrics.lossHistory]
  )

  const maxLoss = useMemo(() => 
    Math.max(...job.metrics.lossHistory.map(p => p.loss)),
    [job.metrics.lossHistory]
  )

  return (
    <Card 
      className={cn(
        "transition-all duration-200 cursor-pointer hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-expanded={isSelected}
      aria-label={`Training job for ${job.userName}, status: ${job.status}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{job.userName}</CardTitle>
            <CardDescription>{job.userEmail}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(job.status)}>
              {job.status}
            </Badge>
            <div className="flex gap-1">
              {job.status === 'running' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle pause
                    }}
                    aria-label="Pause training job"
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle stop
                    }}
                    aria-label="Stop training job"
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                </>
              )}
              {job.status === 'paused' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle resume
                  }}
                  aria-label="Resume training job"
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle view details
                }}
                aria-label="View job details"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Epoch {job.progress.currentEpoch}/{job.progress.totalEpochs}</span>
              <span>{job.progress.percentage}%</span>
            </div>
            <Progress value={job.progress.percentage} className="h-2" />
            {job.progress.estimatedTimeRemaining && (
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Step {job.progress.currentStep}/{job.progress.totalSteps}</span>
                <span>ETA: {formatDuration(job.progress.estimatedTimeRemaining)}</span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Loss</span>
              <div className="font-medium">{job.metrics.currentLoss.toFixed(4)}</div>
            </div>
            <div>
              <span className="text-gray-500">Learning Rate</span>
              <div className="font-medium">{job.metrics.learningRate.toExponential(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">Samples/sec</span>
              <div className="font-medium">{job.metrics.samplesPerSecond.toFixed(1)}</div>
            </div>
            <div>
              <span className="text-gray-500">GPU Usage</span>
              <div className="font-medium">{job.resources.gpuUtilization}%</div>
            </div>
          </div>

          {/* Expanded details */}
          {isSelected && (
            <div className="border-t pt-4 space-y-4" role="region" aria-label="Job details">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Optimized Loss history chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Training Loss</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 flex items-end justify-between gap-1" role="img" aria-label="Loss history chart">
                      {lossChartData.map((point, index) => (
                        <div
                          key={index}
                          className="bg-primary/20 rounded-t flex-1"
                          style={{
                            height: `${(1 - point.loss / maxLoss) * 100}%`,
                            minHeight: '4px'
                          }}
                          title={`Epoch ${point.epoch}: ${point.loss.toFixed(4)}`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent logs */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="space-y-1 text-xs font-mono max-h-32 overflow-y-auto"
                      role="log"
                      aria-label="Training logs"
                    >
                      {job.logs.slice(-5).map((log, index) => (
                        <div key={index} className={cn(
                          "p-1 rounded",
                          log.level === 'error' && "bg-red-50 text-red-700",
                          log.level === 'warning' && "bg-yellow-50 text-yellow-700",
                          log.level === 'info' && "text-gray-600"
                        )}>
                          <span className="text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>{' '}
                          {log.message}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

TrainingJobCard.displayName = 'TrainingJobCard'