'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import AdminUserSelector from './AdminUserSelector'
import AdminTrainingConfigurator from './AdminTrainingConfigurator'
import AdminDataPrivacyDashboard from './AdminDataPrivacyDashboard'
import TrainingQueueManager from './TrainingQueueManager'
import TrainingDashboard from './TrainingDashboard'
import RTX5090MonitoringDashboard from './RTX5090MonitoringDashboard'
import ModelDeploymentInterface from './ModelDeploymentInterface'
import ModelTestingInterface from './ModelTestingInterface'
import EchoDeploymentInterface from './EchoDeploymentInterface'
import DeploymentManagementInterface from './DeploymentManagementInterface'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface TrainingStats {
  totalUsers: number
  eligibleUsers: number
  activeTraining: number
  completedModels: number
  queueLength: number
  averageTrainingTime: number
}

interface LiveTrainingProgress {
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  progress: {
    percentage: number
    currentEpoch: number
    totalEpochs: number
    currentStep: number
    estimatedTimeRemaining: number | null
  }
  metrics: {
    current: {
      loss: number
      learning_rate: number
      gpu_utilization: number
      memory_usage: number
      samples_per_second: number
      timestamp: string
    } | null
    system: {
      gpu: {
        available: boolean
        temperature: number
        memoryUsed: number
        memoryTotal: number
        utilization: number
      }
      system: {
        memoryUsed: number
        memoryTotal: number
        diskUsage: number
      }
    }
  }
  jobInfo: {
    modelName: string
    userName: string
    userEmail: string
    startedAt: string
    runtimeMinutes: number
    trainingSamples: number
    errorMessage?: string
  }
  performance: {
    averageLoss: number | null
    lossReduction: number | null
    averageGpuUtilization: number | null
    trainingEfficiency: number | null
  }
}

interface SystemNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: string
  dismissible: boolean
}

interface UserTrainingData {
  id: string
  email: string
  name: string
  responses: {
    count: number
    categories: string[]
    wordCount: number
    lastResponseAt: string | null
    qualityScore: number
  }
  lifeEntries: {
    count: number
    categories: string[]
    wordCount: number
    lastEntryAt: string | null
  }
  milestones: {
    count: number
    types: string[]
    wordCount: number
    lastMilestoneAt: string | null
  }
  training: {
    isEligible: boolean
    dataQuality: 'poor' | 'fair' | 'good' | 'excellent'
    estimatedTrainingTime: number
    lastTrainingAt: string | null
    modelVersions: number
  }
  privacy: {
    consentStatus: 'unknown' | 'granted' | 'denied' | 'pending'
    lastConsentUpdate: string | null
  }
}

export default function AdminTrainingManager() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'configure' | 'queue' | 'privacy' | 'monitor' | 'deployment'>('overview')
  const [stats, setStats] = useState<TrainingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Training workflow state
  const [selectedUser, setSelectedUser] = useState<UserTrainingData | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<UserTrainingData[]>([])
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [trainingInProgress, setTrainingInProgress] = useState(false)

  // Real-time training progress state
  const [liveProgress, setLiveProgress] = useState<LiveTrainingProgress[]>([])
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  
  // Refs for SSE connection
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize component
  useEffect(() => {
    loadStats()
    initializeRealtimeConnection()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000)
    
    return () => {
      clearInterval(interval)
      closeRealtimeConnection()
    }
  }, [])

  // Initialize Server-Sent Events connection for real-time updates
  const initializeRealtimeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const eventSource = new EventSource('/api/admin/training/live-progress?stream=true')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setRealtimeConnected(true)
        addNotification({
          type: 'success',
          title: 'Real-time Connection',
          message: 'Connected to live training updates',
          dismissible: true
        })
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastUpdate(data.timestamp)

          switch (data.type) {
            case 'connection':
              console.log('SSE Connection established:', data.message)
              break
              
            case 'progress_update':
              if (data.data.jobs) {
                // Multiple jobs update
                setLiveProgress(data.data.jobs)
              } else if (data.data.jobId) {
                // Single job update
                setLiveProgress(prev => {
                  const existing = prev.findIndex(p => p.jobId === data.data.jobId)
                  if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = data.data
                    return updated
                  } else {
                    return [...prev, data.data]
                  }
                })
              }
              break
              
            case 'error':
              addNotification({
                type: 'error',
                title: 'Real-time Update Error',
                message: data.error,
                dismissible: true
              })
              break
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        setRealtimeConnected(false)
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          addNotification({
            type: 'warning',
            title: 'Connection Lost',
            message: 'Attempting to reconnect to live updates...',
            dismissible: true
          })
          initializeRealtimeConnection()
        }, 5000)
      }

    } catch (error) {
      console.error('Failed to initialize SSE connection:', error)
      setRealtimeConnected(false)
    }
  }, [])

  const closeRealtimeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setRealtimeConnected(false)
  }, [])

  const addNotification = (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => {
    const newNotification: SystemNotification = {
      ...notification,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      timestamp: new Date().toISOString()
    }
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]) // Keep only last 5
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/training/stats')
      if (!response.ok) throw new Error('Failed to load training statistics')
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelected = (userId: string, userData: UserTrainingData) => {
    setSelectedUser(userData)
    setIsBatchMode(false)
    setShowConfigurator(true)
  }

  const handleBatchSelected = (userIds: string[], usersData: UserTrainingData[]) => {
    setSelectedUsers(usersData)
    setIsBatchMode(true)
    setShowConfigurator(true)
  }

  const handleTrainingStart = async (config: any, userId?: string) => {
    try {
      setTrainingInProgress(true)
      
      const targetUserIds = isBatchMode ? selectedUsers.map(u => u.id) : [userId || selectedUser?.id]
      const requestData = {
        config,
        userIds: targetUserIds,
        batchMode: isBatchMode,
        adminInitiated: true,
        priority: 'high'
      }
      
      addNotification({
        type: 'info',
        title: 'Training Starting',
        message: `Initiating training for ${targetUserIds.length} user${targetUserIds.length > 1 ? 's' : ''}...`,
        dismissible: false
      })
      
      const response = await fetch('/api/admin/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start training')
      }
      
      // Handle partial success scenarios
      if (result.errors && result.errors.length > 0) {
        const successCount = result.results?.length || 0
        const errorCount = result.errors.length
        
        addNotification({
          type: 'warning',
          title: 'Partial Success',
          message: `Training started for ${successCount} users, ${errorCount} failed. Check details for more info.`,
          dismissible: true
        })
        
        // Show detailed error information
        console.error('Training start errors:', result.errors)
      } else {
        const userCount = result.results?.length || targetUserIds.length
        addNotification({
          type: 'success',
          title: 'Training Started',
          message: `Successfully started training for ${userCount} user${userCount > 1 ? 's' : ''}`,
          dismissible: true
        })
      }
      
      // Handle batch summary if available
      if (result.batchSummary) {
        const { totalJobs, totalExamples, estimatedTotalTime, latestCompletion } = result.batchSummary
        addNotification({
          type: 'info',
          title: 'Batch Training Info',
          message: `${totalJobs} jobs queued with ${totalExamples} training examples. Est. completion: ${new Date(latestCompletion).toLocaleString()}`,
          dismissible: true
        })
      }
      
      // Reset state and switch to monitoring
      setShowConfigurator(false)
      setSelectedUser(null)
      setSelectedUsers([])
      setActiveTab('monitor')
      
      // Refresh stats and trigger immediate live update
      await loadStats()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start training'
      addNotification({
        type: 'error',
        title: 'Training Start Failed',
        message: errorMessage,
        dismissible: true
      })
      console.error('Training start error:', err)
    } finally {
      setTrainingInProgress(false)
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'fair': return 'text-yellow-600 bg-yellow-100'
      case 'poor': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading && !stats) {
    return <Loading message="Loading training management dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Management</h1>
          <div className="flex items-center gap-4">
            <p className="text-gray-600">Comprehensive LLM training system for RTX 5090</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {realtimeConnected ? 'Live' : 'Offline'}
              </span>
              {lastUpdate && (
                <span className="text-xs text-gray-400">
                  Updated {new Date(lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={isBatchMode ? 'bg-blue-50 text-blue-700' : ''}
          >
            {isBatchMode ? 'Single Mode' : 'Batch Mode'}
          </Button>
          <Button onClick={loadStats} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* System Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 ${
                notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                'bg-blue-50 border-blue-400 text-blue-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm mt-1">{notification.message}</p>
                </div>
                {notification.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissNotification(notification.id)}
                    className="ml-4 h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <p className="text-sm text-gray-600">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.eligibleUsers}</div>
              <p className="text-sm text-gray-600">Eligible</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.activeTraining}</div>
              <p className="text-sm text-gray-600">Active Training</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.completedModels}</div>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{stats.queueLength}</div>
              <p className="text-sm text-gray-600">In Queue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">{stats.averageTrainingTime}min</div>
              <p className="text-sm text-gray-600">Avg. Time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Select Users</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="deployment">Deploy</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current training system health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>GPU Status</span>
                  <Badge className={liveProgress.some(p => p.status === 'running') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                    {liveProgress.some(p => p.status === 'running') ? 'Training' : 'Available'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Real-time Connection</span>
                  <Badge className={realtimeConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {realtimeConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Jobs</span>
                  <Badge className="bg-blue-100 text-blue-800">{liveProgress.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Privacy Compliance</span>
                  <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Live Training Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Live Training Progress</CardTitle>
                <CardDescription>Real-time training updates</CardDescription>
              </CardHeader>
              <CardContent>
                {liveProgress.length > 0 ? (
                  <div className="space-y-4">
                    {liveProgress.slice(0, 3).map((progress) => (
                      <div key={progress.jobId} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{progress.jobInfo.userName}</span>
                          <Badge className={
                            progress.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            progress.status === 'completed' ? 'bg-green-100 text-green-800' :
                            progress.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {progress.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Epoch {progress.progress.currentEpoch}/{progress.progress.totalEpochs}</span>
                            <span>{progress.progress.percentage}%</span>
                          </div>
                          <Progress value={progress.progress.percentage} className="h-2" />
                          {progress.metrics.current && (
                            <div className="flex text-xs text-gray-500 gap-4">
                              <span>Loss: {progress.metrics.current.loss?.toFixed(4)}</span>
                              <span>GPU: {progress.metrics.current.gpu_utilization}%</span>
                              {progress.progress.estimatedTimeRemaining && (
                                <span>ETA: {Math.round(progress.progress.estimatedTimeRemaining)}min</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {liveProgress.length > 3 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setActiveTab('monitor')}
                        className="w-full"
                      >
                        View All {liveProgress.length} Active Jobs
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">🎯</div>
                    <p>No active training jobs</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab('users')}
                      className="mt-2"
                    >
                      Start New Training
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common training operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <Button 
                  onClick={() => setActiveTab('users')}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-lg mb-1">👥</span>
                  Start New Training
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('queue')}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-lg mb-1">📋</span>
                  Manage Queue
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('monitor')}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-lg mb-1">📊</span>
                  RTX Monitoring
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('deployment')}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <span className="text-lg mb-1">🚀</span>
                  Deploy Models
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Selection Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>
                {isBatchMode ? 'Select Multiple Users' : 'Select User for Training'}
              </CardTitle>
              <CardDescription>
                {isBatchMode 
                  ? 'Choose multiple users for batch training - more efficient for similar configurations'
                  : 'Choose a user with sufficient training data'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminUserSelector
                onUserSelected={handleUserSelected}
                onBatchSelected={handleBatchSelected}
                multiSelect={isBatchMode}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configure">
          {showConfigurator ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Training Configuration
                  {selectedUser && ` - ${selectedUser.name}`}
                  {isBatchMode && selectedUsers.length > 0 && ` - ${selectedUsers.length} Users`}
                </CardTitle>
                <CardDescription>
                  Configure training parameters and optimization settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Selected User(s) Summary */}
                {selectedUser && !isBatchMode && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Training for: {selectedUser.name}</h4>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Responses:</span> {selectedUser.responses.count}
                      </div>
                      <div>
                        <span className="text-gray-600">Total Words:</span> {(
                          selectedUser.responses.wordCount +
                          selectedUser.lifeEntries.wordCount +
                          selectedUser.milestones.wordCount
                        ).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-gray-600">Data Quality:</span>
                        <Badge className={`ml-2 ${getQualityColor(selectedUser.training.dataQuality)}`}>
                          {selectedUser.training.dataQuality}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {isBatchMode && selectedUsers.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium mb-2">Batch Training - {selectedUsers.length} Users</h4>
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Responses:</span> {selectedUsers.reduce((sum, u) => sum + u.responses.count, 0)}
                      </div>
                      <div>
                        <span className="text-gray-600">Total Words:</span> {selectedUsers.reduce((sum, u) => 
                          sum + u.responses.wordCount + u.lifeEntries.wordCount + u.milestones.wordCount, 0
                        ).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-gray-600">Est. Time:</span> {selectedUsers.reduce((sum, u) => sum + u.training.estimatedTrainingTime, 0)} min
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Quality:</span>
                        <Badge className="ml-2 bg-blue-100 text-blue-800">
                          {Math.round(selectedUsers.reduce((sum, u) => sum + u.responses.qualityScore, 0) / selectedUsers.length)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                <AdminTrainingConfigurator
                  onConfigurationComplete={handleTrainingStart}
                  initialUserId={selectedUser?.id}
                  initialUserData={selectedUser}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No User Selected</CardTitle>
                <CardDescription>Please select a user from the Users tab to configure training</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('users')}>
                  Go to User Selection
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Queue Management Tab */}
        <TabsContent value="queue">
          <TrainingQueueManager isAdmin={true} />
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <AdminDataPrivacyDashboard />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitor">
          <RTX5090MonitoringDashboard isAdmin={true} />
        </TabsContent>

        {/* Model Deployment Tab */}
        <TabsContent value="deployment">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="test">Test Models</TabsTrigger>
              <TabsTrigger value="deploy">Deploy to Echo</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ModelDeploymentInterface isAdmin={true} />
            </TabsContent>

            <TabsContent value="test">
              <ModelTestingInterface isAdmin={true} />
            </TabsContent>

            <TabsContent value="deploy">
              <EchoDeploymentInterface isAdmin={true} />
            </TabsContent>

            <TabsContent value="manage">
              <DeploymentManagementInterface isAdmin={true} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Training Progress Dialog */}
      <Dialog open={trainingInProgress} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Starting Training</DialogTitle>
            <DialogDescription>
              Please wait while we initialize the training process...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <Loading message="Initializing training..." />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}