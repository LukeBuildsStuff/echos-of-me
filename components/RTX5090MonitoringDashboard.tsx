'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface RTXMetrics {
  timestamp: string
  gpuUtilization: number
  memoryUsed: number
  memoryTotal: number
  temperature: number
  powerUsage: number
  clockSpeed: number
  throughputTokensPerSecond: number
  batchSize: number
  currentLoss: number
  currentEpoch: number
  totalEpochs: number
  estimatedTimeRemaining: number
}

interface TrainingJob {
  id: string
  userId: string
  userName: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  startedAt: string
  progress: number
  currentMetrics?: RTXMetrics
  config: {
    modelName: string
    method: string
    epochs: number
    batchSize: number
  }
  estimatedCompletion?: string
  actualCompletion?: string
}

interface SystemStatus {
  gpuAvailable: boolean
  gpuTemperature: number
  gpuMemoryFree: number
  gpuMemoryTotal: number
  systemMemoryFree: number
  systemMemoryTotal: number
  diskSpaceUsed: number
  diskSpaceTotal: number
  activeJobs: number
  queuedJobs: number
  averageWaitTime: number
}

interface Props {
  jobId?: string
  isAdmin?: boolean
}

export default function RTX5090MonitoringDashboard({ jobId, isAdmin = false }: Props) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [activeJobs, setActiveJobs] = useState<TrainingJob[]>([])
  const [metricsHistory, setMetricsHistory] = useState<RTXMetrics[]>([])
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const metricsCanvasRef = useRef<HTMLCanvasElement>(null)
  const temperatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const memoryCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    loadDashboardData()
    
    if (autoRefresh) {
      intervalRef.current = setInterval(loadDashboardData, refreshInterval)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, jobId])

  useEffect(() => {
    if (metricsHistory.length > 0) {
      drawMetricsCharts()
    }
  }, [metricsHistory])

  const loadDashboardData = async () => {
    try {
      setError(null)
      
      const params = new URLSearchParams()
      if (jobId) params.append('jobId', jobId)
      if (isAdmin) params.append('admin', 'true')
      
      const [statusResponse, jobsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/admin/training/system-status?${params}`),
        fetch(`/api/admin/training/active-jobs?${params}`),
        fetch(`/api/admin/training/rtx-metrics?${params}`)
      ])
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setSystemStatus(statusData)
      }
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setActiveJobs(jobsData.jobs || [])
        if (jobsData.jobs.length > 0 && !selectedJob) {
          setSelectedJob(jobsData.jobs[0])
        }
      }
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetricsHistory(prev => {
          const newMetrics = [...prev, ...metricsData.metrics]
          // Keep only last 100 data points for performance
          return newMetrics.slice(-100)
        })
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data')
    } finally {
      setLoading(false)
    }
  }

  const drawMetricsCharts = () => {
    drawChart(metricsCanvasRef.current, metricsHistory, 'gpuUtilization', 'GPU Utilization (%)', '#3B82F6', 0, 100)
    drawChart(temperatureCanvasRef.current, metricsHistory, 'temperature', 'Temperature (°C)', '#EF4444', 30, 90)
    drawChart(memoryCanvasRef.current, metricsHistory, 'memoryUsed', 'Memory Usage (GB)', '#10B981', 0, 24)
  }

  const drawChart = (canvas: HTMLCanvasElement | null, data: RTXMetrics[], key: keyof RTXMetrics, title: string, color: string, minY: number, maxY: number) => {
    if (!canvas || data.length === 0) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    const padding = 40
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Set up drawing context
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.font = '12px Arial'
    ctx.fillStyle = '#666'
    
    // Draw title
    ctx.fillText(title, padding, 20)
    
    // Draw axes
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
    
    // Draw data points
    if (data.length > 1) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      
      const xStep = (width - 2 * padding) / (data.length - 1)
      const yRange = maxY - minY
      
      data.forEach((point, index) => {
        const x = padding + index * xStep
        const value = typeof point[key] === 'number' ? point[key] as number : 0
        const y = height - padding - ((value - minY) / yRange) * (height - 2 * padding)
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
    }
    
    // Draw current value
    if (data.length > 0) {
      const currentValue = data[data.length - 1][key]
      ctx.fillStyle = color
      ctx.font = 'bold 14px Arial'
      ctx.fillText(`${currentValue}`, width - padding - 50, 35)
    }
  }

  const pauseResumeJob = async (jobId: string, action: 'pause' | 'resume') => {
    try {
      const response = await fetch(`/api/admin/training/job-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action })
      })
      
      if (response.ok) {
        await loadDashboardData()
      }
    } catch (error) {
      console.error(`Failed to ${action} job:`, error)
    }
  }

  const stopJob = async (jobId: string) => {
    if (confirm('Are you sure you want to stop this training job? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/admin/training/job-control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, action: 'stop' })
        })
        
        if (response.ok) {
          await loadDashboardData()
        }
      } catch (error) {
        console.error('Failed to stop job:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'queued': return 'bg-yellow-100 text-yellow-800'
      case 'paused': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  if (loading && !systemStatus) {
    return <Loading message="Loading RTX 5090 monitoring dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">RTX 5090 Training Monitor</h2>
          <p className="text-gray-600">Real-time performance monitoring and job management</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
          
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Refresh Now
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* System Status Overview */}
      {systemStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">GPU Status</div>
                  <div className="text-2xl font-bold text-green-600">
                    {systemStatus.gpuAvailable ? 'Available' : 'Busy'}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${systemStatus.gpuAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">GPU Temperature</div>
              <div className={`text-2xl font-bold ${
                systemStatus.gpuTemperature > 80 ? 'text-red-600' : 
                systemStatus.gpuTemperature > 70 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {systemStatus.gpuTemperature}°C
              </div>
              <Progress 
                value={(systemStatus.gpuTemperature / 90) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">GPU Memory</div>
              <div className="text-2xl font-bold text-blue-600">
                {(systemStatus.gpuMemoryTotal - systemStatus.gpuMemoryFree).toFixed(1)}GB
              </div>
              <div className="text-xs text-gray-500">
                {systemStatus.gpuMemoryFree.toFixed(1)}GB free of {systemStatus.gpuMemoryTotal}GB
              </div>
              <Progress 
                value={((systemStatus.gpuMemoryTotal - systemStatus.gpuMemoryFree) / systemStatus.gpuMemoryTotal) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">Active Jobs</div>
              <div className="text-2xl font-bold text-purple-600">{systemStatus.activeJobs}</div>
              <div className="text-xs text-gray-500">
                {systemStatus.queuedJobs} queued • Avg wait: {formatTime(systemStatus.averageWaitTime)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard */}
      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="realtime">Real-time Metrics</TabsTrigger>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
        </TabsList>

        {/* Real-time Metrics Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* GPU Utilization Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">GPU Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas 
                  ref={metricsCanvasRef}
                  width={300}
                  height={200}
                  className="w-full h-32"
                />
              </CardContent>
            </Card>

            {/* Temperature Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Temperature Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas 
                  ref={temperatureCanvasRef}
                  width={300}
                  height={200}
                  className="w-full h-32"
                />
              </CardContent>
            </Card>

            {/* Memory Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas 
                  ref={memoryCanvasRef}
                  width={300}
                  height={200}
                  className="w-full h-32"
                />
              </CardContent>
            </Card>
          </div>

          {/* Current Training Details */}
          {selectedJob?.status === 'running' && selectedJob.currentMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Current Training Session - {selectedJob.userName}</CardTitle>
                <CardDescription>{selectedJob.config.modelName} • {selectedJob.config.method}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedJob.currentMetrics.currentEpoch}</div>
                    <div className="text-sm text-gray-600">Epoch</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedJob.currentMetrics.currentLoss.toFixed(4)}</div>
                    <div className="text-sm text-gray-600">Loss</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedJob.currentMetrics.throughputTokensPerSecond}</div>
                    <div className="text-sm text-gray-600">Tokens/sec</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{selectedJob.currentMetrics.batchSize}</div>
                    <div className="text-sm text-gray-600">Batch Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-600">{formatTime(selectedJob.currentMetrics.estimatedTimeRemaining)}</div>
                    <div className="text-sm text-gray-600">ETA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{selectedJob.progress}%</div>
                    <div className="text-sm text-gray-600">Progress</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Progress value={selectedJob.progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Active Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          {activeJobs.length > 0 ? (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <Card key={job.id} className={selectedJob?.id === job.id ? 'ring-2 ring-blue-500' : ''}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{job.userName}</h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {job.config.modelName} • {job.config.method} • {job.config.epochs} epochs
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          Started: {formatDate(job.startedAt)}
                          {job.estimatedCompletion && (
                            <span> • ETA: {formatDate(job.estimatedCompletion)}</span>
                          )}
                        </div>
                        
                        {job.status === 'running' && (
                          <div className="space-y-2">
                            <Progress value={job.progress} className="w-64" />
                            <div className="text-xs text-gray-500">{job.progress}% complete</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedJob(job)}
                        >
                          Monitor
                        </Button>
                        
                        {isAdmin && job.status === 'running' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => pauseResumeJob(job.id, 'pause')}
                            >
                              Pause
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => stopJob(job.id)}
                            >
                              Stop
                            </Button>
                          </>
                        )}
                        
                        {isAdmin && job.status === 'paused' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => pauseResumeJob(job.id, 'resume')}
                          >
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">No active training jobs</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Analysis Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>RTX 5090 Optimization Analysis</CardTitle>
              <CardDescription>Performance insights and optimization recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsHistory.length > 0 ? (
                <div className="space-y-6">
                  {/* Performance Summary */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(metricsHistory.reduce((sum, m) => sum + m.gpuUtilization, 0) / metricsHistory.length)}%
                      </div>
                      <div className="text-sm text-gray-600">Avg GPU Utilization</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(metricsHistory.reduce((sum, m) => sum + m.throughputTokensPerSecond, 0) / metricsHistory.length)}
                      </div>
                      <div className="text-sm text-gray-600">Avg Tokens/sec</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(metricsHistory.reduce((sum, m) => sum + m.temperature, 0) / metricsHistory.length)}°C
                      </div>
                      <div className="text-sm text-gray-600">Avg Temperature</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(metricsHistory.reduce((sum, m) => sum + m.powerUsage, 0) / metricsHistory.length)}W
                      </div>
                      <div className="text-sm text-gray-600">Avg Power Usage</div>
                    </div>
                  </div>

                  {/* Optimization Recommendations */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Optimization Recommendations</h4>
                    <div className="space-y-2">
                      {metricsHistory.length > 0 && (
                        <>
                          {metricsHistory[metricsHistory.length - 1].gpuUtilization < 80 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="text-sm text-yellow-800">
                                <strong>Low GPU Utilization:</strong> Consider increasing batch size or enabling model compilation to improve GPU efficiency.
                              </div>
                            </div>
                          )}
                          
                          {metricsHistory[metricsHistory.length - 1].temperature > 80 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="text-sm text-red-800">
                                <strong>High Temperature:</strong> GPU running hot. Consider reducing batch size or improving cooling.
                              </div>
                            </div>
                          )}
                          
                          {metricsHistory[metricsHistory.length - 1].memoryUsed > 20 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-sm text-blue-800">
                                <strong>High Memory Usage:</strong> Consider enabling gradient checkpointing or using quantization to reduce memory usage.
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No performance data available. Start a training job to see analysis.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts & Issues Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Hardware issues and training warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemStatus && (
                  <>
                    {systemStatus.gpuTemperature > 85 && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-red-900">Critical Temperature</div>
                          <div className="text-sm text-red-700">GPU temperature is {systemStatus.gpuTemperature}°C - exceeding safe limits</div>
                        </div>
                      </div>
                    )}
                    
                    {systemStatus.gpuMemoryFree < 2 && (
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-yellow-900">Low GPU Memory</div>
                          <div className="text-sm text-yellow-700">Only {systemStatus.gpuMemoryFree.toFixed(1)}GB free - may impact performance</div>
                        </div>
                      </div>
                    )}
                    
                    {systemStatus.diskSpaceUsed / systemStatus.diskSpaceTotal > 0.9 && (
                      <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-orange-900">Low Disk Space</div>
                          <div className="text-sm text-orange-700">Storage is {Math.round((systemStatus.diskSpaceUsed / systemStatus.diskSpaceTotal) * 100)}% full</div>
                        </div>
                      </div>
                    )}
                    
                    {systemStatus?.gpuTemperature < 70 && systemStatus?.gpuMemoryFree > 4 && systemStatus?.diskSpaceUsed / systemStatus?.diskSpaceTotal < 0.8 && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-green-900">System Healthy</div>
                          <div className="text-sm text-green-700">All systems operating within normal parameters</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}