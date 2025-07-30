'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrainingJob } from '@/lib/ai-training-config'

interface QueueMetrics {
  totalJobs: number
  runningJobs: number
  queuedJobs: number
  completedToday: number
  failedToday: number
  averageWaitTime: number
  averageTrainingTime: number
  systemUtilization: number
}

interface ResourceUsage {
  gpuMemoryUsed: number
  gpuMemoryTotal: number
  diskSpaceUsed: number
  diskSpaceTotal: number
  activeCores: number
  estimatedCost: number
}

interface QueueStatus {
  jobs: TrainingJob[]
  metrics: QueueMetrics
  resources: ResourceUsage
}

export default function TrainingQueueManager() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadQueueStatus()
    
    // Update every 10 seconds
    const interval = setInterval(loadQueueStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadQueueStatus = async () => {
    try {
      const response = await fetch('/api/training/queue')
      if (response.ok) {
        const data = await response.json()
        setQueueStatus(data)
      }
    } catch (error) {
      console.error('Failed to load queue status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJobAction = async (action: string, jobId?: string, options?: any) => {
    try {
      const response = await fetch('/api/training/queue', {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          jobId,
          ...options
        })
      })

      if (response.ok) {
        await loadQueueStatus()
        if (jobId) {
          setSelectedJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(jobId)
            return newSet
          })
        }
      } else {
        const error = await response.json()
        alert(`Action failed: ${error.error}`)
      }
    } catch (error) {
      console.error(`Failed to ${action} job:`, error)
      alert(`Failed to ${action} job`)
    }
  }

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500'
      case 'queued': return 'bg-yellow-500'
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'running': return 'default'
      case 'queued': return 'secondary'
      case 'completed': return 'outline'
      case 'failed': return 'destructive'
      case 'cancelled': return 'outline'
      default: return 'secondary'
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}GB`
    return `${(bytes / 1024).toFixed(1)}TB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-peace-600">Loading queue management...</div>
      </div>
    )
  }

  if (!queueStatus) {
    return (
      <div className="text-center p-8 text-peace-600">
        Failed to load queue status
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queueStatus.metrics.queuedJobs}
            </div>
            <div className="text-xs text-peace-600">
              {queueStatus.metrics.runningJobs} running
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((queueStatus.resources.gpuMemoryUsed / queueStatus.resources.gpuMemoryTotal) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-peace-600">
              {queueStatus.resources.gpuMemoryUsed.toFixed(1)} / {queueStatus.resources.gpuMemoryTotal}GB
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {queueStatus.metrics.completedToday}
            </div>
            <div className="text-xs text-peace-600">
              {queueStatus.metrics.failedToday} failed
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatDuration(queueStatus.metrics.averageWaitTime)}
            </div>
            <div className="text-xs text-peace-600">
              wait / {formatDuration(queueStatus.metrics.averageTrainingTime)} train
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardHeader>
          <CardTitle>System Resources</CardTitle>
          <CardDescription>Current hardware utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>GPU Memory</span>
                <span>{queueStatus.resources.gpuMemoryUsed.toFixed(1)}GB / {queueStatus.resources.gpuMemoryTotal}GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(queueStatus.resources.gpuMemoryUsed / queueStatus.resources.gpuMemoryTotal) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Disk Space</span>
                <span>{formatBytes(queueStatus.resources.diskSpaceUsed)} / {formatBytes(queueStatus.resources.diskSpaceTotal)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(queueStatus.resources.diskSpaceUsed / queueStatus.resources.diskSpaceTotal) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>System Load</span>
                <span>{queueStatus.metrics.systemUtilization.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${queueStatus.metrics.systemUtilization}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-peace-600">
            <span>Estimated hourly cost: ${queueStatus.resources.estimatedCost.toFixed(2)}</span>
            <span className="ml-4">Active cores: {queueStatus.resources.activeCores}</span>
          </div>
        </CardContent>
      </Card>

      {/* Queue Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => handleJobAction('pause_queue')}
          variant="outline"
          size="sm"
        >
          Pause Queue
        </Button>
        <Button
          onClick={() => handleJobAction('resume_queue')}
          variant="outline"
          size="sm"
        >
          Resume Queue
        </Button>
        <Button
          onClick={() => handleJobAction('cleanup', undefined, { cleanup: 'old' })}
          variant="outline"
          size="sm"
        >
          Cleanup Old Jobs
        </Button>
        {selectedJobs.size > 0 && (
          <>
            <Button
              onClick={() => {
                selectedJobs.forEach(jobId => handleJobAction('cancel', jobId))
              }}
              variant="destructive"
              size="sm"
            >
              Cancel Selected ({selectedJobs.size})
            </Button>
          </>
        )}
      </div>

      {/* Job Queue */}
      <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Training Queue</CardTitle>
          <CardDescription>
            Current and recent training jobs ({queueStatus.jobs.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueStatus.jobs.length > 0 ? (
            <div className="space-y-3">
              {queueStatus.jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-peace-50 rounded-embrace">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedJobs.has(job.id)}
                      onChange={() => toggleJobSelection(job.id)}
                      className="rounded border-peace-300"
                    />
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(job.status)}`} />
                    <div>
                      <div className="font-medium">
                        Job #{job.id.substring(0, 8)}
                      </div>
                      <div className="text-sm text-peace-600">
                        Priority: {job.priority} • 
                        Queued: {job.queuedAt.toLocaleString()} • 
                        Duration: {formatDuration(job.estimatedDuration)}
                      </div>
                      <div className="text-xs text-peace-600">
                        GPU: {job.resourceRequirements.gpuMemoryGB}GB • 
                        Disk: {formatBytes(job.resourceRequirements.diskSpaceGB)} • 
                        Cost: ${job.resourceRequirements.estimatedCost.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(job.status)}>
                      {job.status}
                    </Badge>
                    
                    <div className="flex gap-1">
                      {job.status === 'queued' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJobAction('cancel', job.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      {job.status === 'failed' && job.retryCount < job.maxRetries && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJobAction('retry', job.id)}
                        >
                          Retry ({job.retryCount}/{job.maxRetries})
                        </Button>
                      )}
                      {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJobAction('delete', job.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-peace-600">
              No jobs in queue
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}