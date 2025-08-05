'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface RTX5090Metrics {
  timestamp: string
  gpuUtilization: number
  memoryUsed: number
  memoryTotal: number
  temperature: number
  powerDraw: number
  clockSpeed: number
  tensorCoreUtilization: number
  flashAttention2Speedup: number
  memoryBandwidthUtilization: number
  currentBatchSize: number
  batchSizeAdaptations: number
  thermalThrottling: boolean
}

interface MistralTrainingJob {
  id: string
  userId: string
  modelName: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: {
    currentEpoch: number
    totalEpochs: number
    currentStep: number
    totalSteps: number
    percentage: number
  }
  metrics: {
    currentLoss: number
    learningRate: number
    tokensPerSecond: number
    estimatedTimeRemaining: number
  }
  rtx5090Metrics: RTX5090Metrics
  optimizations: {
    flashAttention2: boolean
    loraRank: number
    loraAlpha: number
    quantization: string
    gradientCheckpointing: boolean
  }
  startedAt: string
  estimatedCompletion: string
}

interface SystemStatus {
  hardware: {
    vramTotal: number
    vramUsed: number
    vramFree: number
    computeCapability: string
    flashAttention2Enabled: boolean
  }
  performance: {
    averageGpuUtilization: number
    peakMemoryUsage: number
    thermalThrottlingEvents: number
    averageTrainingSpeed: number
  }
  queue: {
    activeJobs: number
    queuedJobs: number
    completedJobs: number
    maxConcurrentJobs: number
  }
}

export default function RTX5090TrainingDashboard() {
  const [activeJobs, setActiveJobs] = useState<MistralTrainingJob[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState<RTX5090Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  // Real-time updates
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch('/api/admin/training/rtx-metrics')
        if (!response.ok) throw new Error('Failed to fetch system status')
        
        const data = await response.json()
        setSystemStatus(data.systemStatus)
        setActiveJobs(data.activeJobs || [])
        setRealTimeMetrics(data.realTimeMetrics)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSystemStatus()
    const interval = setInterval(fetchSystemStatus, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'queued': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 90) return 'text-red-600'
    if (utilization > 70) return 'text-orange-600'
    if (utilization > 50) return 'text-green-600'
    return 'text-blue-600'
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading RTX 5090 Training Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">RTX 5090 Mistral Training Dashboard</h2>
          <p className="text-gray-600">Real-time monitoring for family legacy AI training</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${systemStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-500">
            {systemStatus ? 'RTX 5090 Online' : 'RTX 5090 Offline'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* System Overview */}
      {systemStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {systemStatus.hardware.vramUsed.toFixed(1)}GB
              </div>
              <p className="text-sm text-gray-600">VRAM Used</p>
              <div className="mt-2">
                <Progress 
                  value={(systemStatus.hardware.vramUsed / systemStatus.hardware.vramTotal) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${getUtilizationColor(systemStatus.performance.averageGpuUtilization)}`}>
                {systemStatus.performance.averageGpuUtilization.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">GPU Utilization</p>
              <Badge className="mt-1 bg-green-100 text-green-800">
                {systemStatus.hardware.computeCapability}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {systemStatus.queue.activeJobs}
              </div>
              <p className="text-sm text-gray-600">Active Training Jobs</p>
              <p className="text-xs text-gray-500 mt-1">
                {systemStatus.queue.queuedJobs} queued
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {systemStatus.performance.averageTrainingSpeed.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">Tokens/sec</p>
              <Badge className={`mt-1 ${systemStatus.hardware.flashAttention2Enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                Flash Attention 2
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="active-jobs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="gpu-metrics">GPU Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Active Jobs Tab */}
        <TabsContent value="active-jobs" className="space-y-4">
          {activeJobs.length > 0 ? (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <Card 
                  key={job.id} 
                  className={`cursor-pointer transition-colors ${selectedJob === job.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.modelName}</CardTitle>
                        <CardDescription>Job ID: {job.id}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Epoch {job.progress.currentEpoch}/{job.progress.totalEpochs}</span>
                        <span>{job.progress.percentage}%</span>
                      </div>
                      <Progress value={job.progress.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Step {job.progress.currentStep}/{job.progress.totalSteps}</span>
                        <span>ETA: {formatDuration(job.metrics.estimatedTimeRemaining)}</span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Loss:</span>
                        <div className="font-mono">{job.metrics.currentLoss.toFixed(4)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">LR:</span>
                        <div className="font-mono">{job.metrics.learningRate.toExponential(2)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Speed:</span>
                        <div className="font-mono">{job.metrics.tokensPerSecond.toFixed(1)} tok/s</div>
                      </div>
                      <div>
                        <span className="text-gray-600">GPU:</span>
                        <div className={`font-mono ${getUtilizationColor(job.rtx5090Metrics.gpuUtilization)}`}>
                          {job.rtx5090Metrics.gpuUtilization.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* RTX 5090 Specific Metrics */}
                    {selectedJob === job.id && (
                      <div className="border-t pt-4 space-y-3">
                        <h4 className="font-medium text-gray-900">RTX 5090 Optimizations</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${job.optimizations.flashAttention2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span>Flash Attention 2</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${job.optimizations.gradientCheckpointing ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span>Gradient Checkpointing</span>
                          </div>
                          <div>
                            <span className="text-gray-600">LoRA Rank:</span>
                            <span className="ml-1 font-mono">{job.optimizations.loraRank}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">LoRA Alpha:</span>
                            <span className="ml-1 font-mono">{job.optimizations.loraAlpha}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Quantization:</span>
                            <span className="ml-1 font-mono">{job.optimizations.quantization}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Batch Size:</span>
                            <span className="ml-1 font-mono">{job.rtx5090Metrics.currentBatchSize}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Temperature:</span>
                            <div className={`font-mono ${job.rtx5090Metrics.temperature > 80 ? 'text-red-600' : 'text-green-600'}`}>
                              {job.rtx5090Metrics.temperature}°C
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Memory:</span>
                            <div className="font-mono">{job.rtx5090Metrics.memoryUsed.toFixed(1)}GB</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Tensor Core:</span>
                            <div className="font-mono">{job.rtx5090Metrics.tensorCoreUtilization.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-gray-600">FA2 Speedup:</span>
                            <div className="font-mono">{job.rtx5090Metrics.flashAttention2Speedup.toFixed(1)}x</div>
                          </div>
                        </div>

                        {job.rtx5090Metrics.thermalThrottling && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-red-800 text-sm font-medium">Thermal throttling detected</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-medium">No Active Training Jobs</h3>
                <p className="text-gray-600 mt-1">Your RTX 5090 is ready for new family legacy training</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GPU Metrics Tab */}
        <TabsContent value="gpu-metrics" className="space-y-4">
          {realTimeMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">GPU Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getUtilizationColor(realTimeMetrics.gpuUtilization)}`}>
                    {realTimeMetrics.gpuUtilization.toFixed(1)}%
                  </div>
                  <Progress value={realTimeMetrics.gpuUtilization} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">VRAM Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {realTimeMetrics.memoryUsed.toFixed(1)}GB
                  </div>
                  <Progress value={(realTimeMetrics.memoryUsed / realTimeMetrics.memoryTotal) * 100} className="mt-2" />
                  <p className="text-sm text-gray-500 mt-1">
                    of {realTimeMetrics.memoryTotal}GB total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Temperature</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${realTimeMetrics.temperature > 80 ? 'text-red-600' : 'text-green-600'}`}>
                    {realTimeMetrics.temperature}°C
                  </div>
                  <Progress value={(realTimeMetrics.temperature / 100) * 100} className="mt-2" />
                  {realTimeMetrics.thermalThrottling && (
                    <Badge className="mt-2 bg-red-100 text-red-800">Throttling</Badge>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Power Draw</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {realTimeMetrics.powerDraw}W
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Current power consumption</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Clock Speed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {realTimeMetrics.clockSpeed}MHz
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Current GPU clock</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Tensor Core Util</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {realTimeMetrics.tensorCoreUtilization.toFixed(1)}%
                  </div>
                  <Progress value={realTimeMetrics.tensorCoreUtilization} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {systemStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Training Performance</CardTitle>
                  <CardDescription>Overall training efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average GPU Utilization</span>
                    <span className={`font-bold ${getUtilizationColor(systemStatus.performance.averageGpuUtilization)}`}>
                      {systemStatus.performance.averageGpuUtilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Peak Memory Usage</span>
                    <span className="font-bold">{systemStatus.performance.peakMemoryUsage.toFixed(1)}GB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Training Speed</span>
                    <span className="font-bold">{systemStatus.performance.averageTrainingSpeed.toFixed(1)} tok/s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Thermal Events</span>
                    <span className={`font-bold ${systemStatus.performance.thermalThrottlingEvents > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {systemStatus.performance.thermalThrottlingEvents}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Statistics</CardTitle>
                  <CardDescription>Training job queue performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Active Jobs</span>
                    <span className="font-bold text-blue-600">{systemStatus.queue.activeJobs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Queued Jobs</span>
                    <span className="font-bold text-yellow-600">{systemStatus.queue.queuedJobs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed Jobs</span>
                    <span className="font-bold text-green-600">{systemStatus.queue.completedJobs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Max Concurrent</span>
                    <span className="font-bold">{systemStatus.queue.maxConcurrentJobs}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>RTX 5090 Specifications</CardTitle>
              <CardDescription>Hardware capabilities and optimizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">32GB</div>
                  <p className="text-sm text-gray-600">GDDR7 Memory</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">sm_120</div>
                  <p className="text-sm text-gray-600">Compute Capability</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">5th Gen</div>
                  <p className="text-sm text-gray-600">Tensor Cores</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">900GB/s</div>
                  <p className="text-sm text-gray-600">Memory Bandwidth</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Optimizations</CardTitle>
              <CardDescription>Current optimization settings for family legacy training</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Flash Attention 2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>4-bit Quantization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Gradient Checkpointing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Dynamic Batching</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>LoRA Fine-tuning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Mistral Architecture</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Current Settings</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Base Model:</span>
                    <div className="font-mono">Mistral-7B-v0.3</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Context Length:</span>
                    <div className="font-mono">32K tokens</div>
                  </div>
                  <div>
                    <span className="text-gray-600">LoRA Rank:</span>
                    <div className="font-mono">64</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Precision:</span>
                    <div className="font-mono">bfloat16</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
              <CardDescription>Suggestions to optimize your RTX 5090 training</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-blue-900">GPU Utilization Optimal</p>
                    <p className="text-sm text-blue-700">Your GPU utilization is in the optimal range for training efficiency.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-green-900">Memory Usage Efficient</p>
                    <p className="text-sm text-green-700">VRAM usage is well-optimized. Consider slightly larger batch sizes for better throughput.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-yellow-900">Temperature Monitoring</p>
                    <p className="text-sm text-yellow-700">GPU temperature is normal. Ensure adequate cooling for sustained training.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}