'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
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

interface EligibleUser {
  id: string
  name: string
  email: string
  training: {
    isEligible: boolean
    hasActiveTraining: boolean
    completedModels: number
    canStartNew: boolean
  }
  data: {
    responses: { total: number; quality: number; wordCount: number }
    lifeEntries: { count: number; wordCount: number }
    milestones: { count: number; wordCount: number }
    totalWords: number
    categoriesCovered: number
    qualityScore: number
  }
  estimatedTrainingTime: number
}

interface TrainingJob {
  id: string
  runId: string
  userId: string
  userName: string
  status: string
  startedAt: string | null
  completedAt: string | null
  progress: number
  trainingInfo: {
    samples: number
    baseModel: string
    modelName: string
  }
  currentMetrics: {
    epoch: number
    loss: number
    gpuUtilization: number
    estimatedTimeRemaining: number
  } | null
}

export default function SimpleTrainingManager() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'queue' | 'history'>('dashboard')
  const [stats, setStats] = useState<TrainingStats | null>(null)
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([])
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadData()
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setError(null)
      
      const [statsRes, usersRes, statusRes] = await Promise.all([
        fetch('/api/admin/training/stats'),
        fetch('/api/admin/training/dev-eligible-users'),
        fetch('/api/admin/training/status')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setEligibleUsers(usersData.users || [])
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setTrainingJobs(statusData.jobs || [])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const startTraining = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user')
      return
    }

    try {
      setActionLoading(true)
      setError(null)

      const response = await fetch('/api/admin/training/simple-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          priority: 'high',
          config: {
            quickStart: true
          }
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSelectedUsers([])
        await loadData()
        setActiveTab('queue')
        alert(`Training started for ${result.results?.length || 0} users`)
      } else {
        setError(result.error || 'Failed to start training')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training')
    } finally {
      setActionLoading(false)
    }
  }

  const cancelJob = async (jobId: string) => {
    try {
      setActionLoading(true)
      
      const response = await fetch('/api/admin/training/queue-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          jobId
        })
      })

      if (response.ok) {
        await loadData()
        alert('Job cancelled successfully')
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to cancel job')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllEligible = () => {
    const availableUsers = eligibleUsers.filter(u => u.training.canStartNew)
    setSelectedUsers(availableUsers.map(u => u.id))
  }

  const clearSelection = () => {
    setSelectedUsers([])
  }

  const simulateTraining = async () => {
    try {
      setActionLoading(true)
      setError(null)

      const response = await fetch('/api/admin/training/mock-processor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate' })
      })

      const result = await response.json()

      if (response.ok) {
        await loadData()
        alert(`Training simulation completed: ${result.message}`)
      } else {
        setError(result.error || 'Failed to process queue')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process queue')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !stats) {
    return <Loading message="Loading training management..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Training Management</h1>
          <p className="text-gray-600">Simple, functional training system for your RTX 5090</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={simulateTraining} variant="outline" disabled={actionLoading}>
            {actionLoading ? 'Processing...' : 'Process Queue'}
          </Button>
        </div>
      </div>

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
              <p className="text-sm text-gray-600">Ready to Train</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.activeTraining}</div>
              <p className="text-sm text-gray-600">Training Now</p>
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

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Select Users</TabsTrigger>
          <TabsTrigger value="queue">Training Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Start training for users with sufficient data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => setActiveTab('users')} className="h-16">
                    Select Users
                  </Button>
                  <Button onClick={() => setActiveTab('queue')} variant="outline" className="h-16">
                    View Queue
                  </Button>
                </div>
                
                {selectedUsers.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">{selectedUsers.length} users selected</p>
                    <Button 
                      onClick={startTraining} 
                      disabled={actionLoading}
                      className="mt-2 w-full"
                    >
                      {actionLoading ? 'Starting...' : 'Start Training'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Training */}
            <Card>
              <CardHeader>
                <CardTitle>Active Training</CardTitle>
                <CardDescription>Currently running training jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {trainingJobs.filter(job => ['queued', 'running'].includes(job.status)).length > 0 ? (
                  <div className="space-y-3">
                    {trainingJobs
                      .filter(job => ['queued', 'running'].includes(job.status))
                      .slice(0, 3)
                      .map(job => (
                      <div key={job.id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{job.userName}</span>
                          <Badge className={
                            job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {job.status}
                          </Badge>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                        <div className="flex text-xs text-gray-500 justify-between">
                          <span>{job.trainingInfo.samples} samples</span>
                          {job.currentMetrics && (
                            <span>GPU: {job.currentMetrics.gpuUtilization}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
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
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Select Users for Training</CardTitle>
              <CardDescription>
                Choose users with sufficient data to train AI models
              </CardDescription>
              <div className="flex gap-2">
                <Button onClick={selectAllEligible} variant="outline" size="sm">
                  Select All Eligible
                </Button>
                <Button onClick={clearSelection} variant="outline" size="sm">
                  Clear Selection
                </Button>
                {selectedUsers.length > 0 && (
                  <Button onClick={startTraining} disabled={actionLoading}>
                    {actionLoading ? 'Starting...' : `Start Training (${selectedUsers.length})`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eligibleUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Checkbox 
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                      disabled={!user.training.canStartNew}
                    />
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        
                        <div className="text-right text-sm">
                          <Badge className={
                            user.data.qualityScore >= 80 ? 'bg-green-100 text-green-800' :
                            user.data.qualityScore >= 60 ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {user.data.qualityScore}% Quality
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-4 gap-4 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">{user.data.responses.total}</span> responses
                        </div>
                        <div>
                          <span className="font-medium">{user.data.totalWords.toLocaleString()}</span> words
                        </div>
                        <div>
                          <span className="font-medium">{user.data.categoriesCovered}</span> categories
                        </div>
                        <div>
                          <span className="font-medium">{user.estimatedTrainingTime}min</span> estimated
                        </div>
                      </div>
                      
                      {user.training.hasActiveTraining && (
                        <div className="mt-2">
                          <Badge className="bg-orange-100 text-orange-800">
                            Training in Progress
                          </Badge>
                        </div>
                      )}
                      
                      {user.training.completedModels > 0 && (
                        <div className="mt-2">
                          <Badge variant="outline">
                            {user.training.completedModels} model{user.training.completedModels > 1 ? 's' : ''} completed
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {eligibleUsers.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>No users currently eligible for training</p>
                    <p className="text-sm mt-1">Users need at least 10 responses, 1000 words, and 3 categories</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Training Queue</CardTitle>
              <CardDescription>Manage active and queued training jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingJobs.filter(job => ['queued', 'running'].includes(job.status)).map(job => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{job.userName}</h4>
                          <p className="text-sm text-gray-600">{job.trainingInfo.modelName}</p>
                        </div>
                        
                        <Badge className={
                          job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {job.status}
                        </Badge>
                      </div>
                      
                      <Progress value={job.progress} className="h-2 mb-2" />
                      
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{job.trainingInfo.samples} samples</span>
                        {job.currentMetrics && (
                          <>
                            <span>Epoch {job.currentMetrics.epoch}</span>
                            <span>Loss: {job.currentMetrics.loss.toFixed(4)}</span>
                            <span>GPU: {job.currentMetrics.gpuUtilization}%</span>
                            {job.currentMetrics.estimatedTimeRemaining && (
                              <span>ETA: {job.currentMetrics.estimatedTimeRemaining}min</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => cancelJob(job.runId)}
                        disabled={actionLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
                
                {trainingJobs.filter(job => ['queued', 'running'].includes(job.status)).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>No jobs in queue</p>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Training History</CardTitle>
              <CardDescription>Recent completed and failed training jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainingJobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status)).map(job => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{job.userName}</h4>
                        <Badge className={
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{job.trainingInfo.modelName}</p>
                      <p className="text-xs text-gray-500">
                        {job.completedAt && new Date(job.completedAt).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="text-right text-sm text-gray-600">
                      <p>{job.trainingInfo.samples} samples</p>
                      {job.status === 'completed' && (
                        <p className="text-green-600">Training successful</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {trainingJobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status)).length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <p>No training history yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}