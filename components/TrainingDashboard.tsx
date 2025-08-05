'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TrainingMetrics, ModelVersion, TrainingJob } from '@/lib/ai-training-config'
import PersonalizedAIChat from './PersonalizedAIChat'
import TrainingQueueManager from './TrainingQueueManager'
import TrainingTestSuite from './TrainingTestSuite'

interface TrainingDashboardProps {
  userId?: string
  isAdmin?: boolean
}

interface TrainingStatus {
  currentJob?: TrainingJob
  metrics?: TrainingMetrics
  models: ModelVersion[]
  queuePosition?: number
  estimatedWaitTime?: number
}

export default function TrainingDashboard({ userId, isAdmin = false }: TrainingDashboardProps) {
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ models: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'interact' | 'queue' | 'testing'>('overview')
  const [modelInteraction, setModelInteraction] = useState({
    selectedModel: '',
    query: '',
    response: '',
    loading: false
  })

  const loadTrainingStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      
      const response = await fetch(`/api/training/status?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTrainingStatus(data)
      }
    } catch (error) {
      console.error('Failed to load training status:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Real-time updates
  useEffect(() => {
    loadTrainingStatus()
    
    // Setup real-time updates
    const interval = setInterval(loadTrainingStatus, 5000)
    return () => clearInterval(interval)
  }, [userId, loadTrainingStatus])

  const startTraining = async () => {
    try {
      const response = await fetch('/api/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Training started:', data)
        await loadTrainingStatus()
      } else {
        const error = await response.json()
        alert(`Training failed to start: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to start training:', error)
      alert('Failed to start training')
    }
  }

  const interactWithModel = async () => {
    if (!modelInteraction.selectedModel || !modelInteraction.query) return

    setModelInteraction(prev => ({ ...prev, loading: true, response: '' }))

    try {
      const response = await fetch('/api/training/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: modelInteraction.selectedModel,
          query: modelInteraction.query,
          userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setModelInteraction(prev => ({ 
          ...prev, 
          response: data.response,
          loading: false 
        }))
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Model interaction failed:', error)
      setModelInteraction(prev => ({ 
        ...prev, 
        response: 'Error: Failed to get response from model',
        loading: false 
      }))
    }
  }

  const handleFeedback = async (messageId: string, satisfaction: 'positive' | 'negative' | 'neutral', feedback?: string) => {
    try {
      await fetch('/api/training/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          satisfaction,
          feedback,
          userId
        })
      })
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-peace-600">Loading training dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-peace-100 p-1 rounded-embrace">
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'models', label: '🤖 Models', icon: '🤖' },
          { id: 'interact', label: '💬 Interact', icon: '💬' },
          ...(isAdmin ? [
            { id: 'queue', label: '⏳ Queue', icon: '⏳' },
            { id: 'testing', label: '🧪 Testing', icon: '🧪' }
          ] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 rounded-embrace text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-hope-700 shadow-md'
                : 'text-peace-600 hover:text-hope-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Current Training Status */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Training Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trainingStatus.currentJob ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-peace-600">Status:</span>
                    <Badge variant={
                      trainingStatus.currentJob.status === 'running' ? 'default' :
                      trainingStatus.currentJob.status === 'completed' ? 'secondary' :
                      'destructive'
                    }>
                      {trainingStatus.currentJob.status}
                    </Badge>
                  </div>
                  
                  {trainingStatus.metrics && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress:</span>
                          <span>{trainingStatus.metrics.currentEpoch}/{trainingStatus.metrics.totalEpochs} epochs</span>
                        </div>
                        <div className="w-full bg-peace-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-hope-400 to-comfort-400 h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(trainingStatus.metrics.currentEpoch / trainingStatus.metrics.totalEpochs) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-peace-600">Loss:</span>
                          <span className="font-mono">{trainingStatus.metrics.currentLoss.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-peace-600">GPU Usage:</span>
                          <span className="font-mono">{trainingStatus.metrics.gpuUtilization}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-peace-600">ETA:</span>
                          <span className="font-mono">{Math.round(trainingStatus.metrics.estimatedTimeRemaining)}m</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-peace-600 mb-4">No active training</p>
                  <Button
                    onClick={startTraining}
                    className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
                  >
                    Start Training
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Performance */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 Latest Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trainingStatus.models.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    const latestModel = trainingStatus.models[0]
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-peace-600">Version:</span>
                          <Badge variant="outline">v{latestModel.version}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-peace-600">Status:</span>
                          <Badge variant={latestModel.status === 'deployed' ? 'default' : 'secondary'}>
                            {latestModel.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-peace-600">Performance:</span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Loss:</span>
                              <span className="font-mono">{latestModel.performance.loss.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Coherence:</span>
                              <span className="font-mono">{(latestModel.performance.coherenceScore * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Persona Match:</span>
                              <span className="font-mono">{(latestModel.performance.personaMatchScore * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-peace-600">
                          Trained: {new Date(latestModel.trainedAt).toLocaleDateString()}
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="text-center py-4 text-peace-600">
                  No models trained yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-peace-600">Total Models:</span>
                  <span className="font-semibold">{trainingStatus.models.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-peace-600">Training Time:</span>
                  <span className="font-semibold">
                    {trainingStatus.models.reduce((sum, model) => sum + model.trainingTime, 0).toFixed(0)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-peace-600">Model Size:</span>
                  <span className="font-semibold">
                    {trainingStatus.models[0]?.modelSize || 0}MB
                  </span>
                </div>
                {trainingStatus.queuePosition && (
                  <div className="flex justify-between">
                    <span className="text-peace-600">Queue Position:</span>
                    <Badge variant="outline">#{trainingStatus.queuePosition}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Models Tab */}
      {activeTab === 'models' && (
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Model Versions</CardTitle>
            <CardDescription>All trained model versions and their performance</CardDescription>
          </CardHeader>
          <CardContent>
            {trainingStatus.models.length > 0 ? (
              <div className="space-y-4">
                {trainingStatus.models.map((model, index) => (
                  <div key={model.id} className="p-4 bg-peace-50 rounded-embrace">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">Version {model.version}</h3>
                          <Badge variant={model.status === 'deployed' ? 'default' : 'secondary'}>
                            {model.status}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">Latest</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-peace-600">Trained:</span>
                            <div className="font-medium">{new Date(model.trainedAt).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <span className="text-peace-600">Examples:</span>
                            <div className="font-medium">{model.trainingExamples}</div>
                          </div>
                          <div>
                            <span className="text-peace-600">Loss:</span>
                            <div className="font-mono">{model.performance.loss.toFixed(4)}</div>
                          </div>
                          <div>
                            <span className="text-peace-600">Size:</span>
                            <div className="font-medium">{model.modelSize}MB</div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-4 text-xs text-peace-600">
                          <span>Coherence: {(model.performance.coherenceScore * 100).toFixed(1)}%</span>
                          <span>Persona: {(model.performance.personaMatchScore * 100).toFixed(1)}%</span>
                          <span>Host: {model.metadata.trainingHost}</span>
                          {model.metadata.totalCost && (
                            <span>Cost: ${model.metadata.totalCost.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveTab('interact')
                            setModelInteraction(prev => ({ ...prev, selectedModel: model.id }))
                          }}
                        >
                          Test
                        </Button>
                        {model.status === 'deployed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-comfort-600 border-comfort-300 hover:bg-comfort-50"
                          >
                            Active
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-peace-600">
                No models trained yet. Start your first training to see models here.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interact Tab - Enhanced Chat Interface */}
      {activeTab === 'interact' && (
        <div className="space-y-6">
          {trainingStatus.models.filter(model => model.status === 'deployed').length > 0 ? (
            <PersonalizedAIChat
              userId={userId || 'anonymous'}
              availableModels={trainingStatus.models.filter(model => model.status === 'deployed')}
              onFeedback={handleFeedback}
            />
          ) : (
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">🤖</div>
                  <h3 className="text-xl font-semibold text-peace-700">No AI Models Available</h3>
                  <p className="text-peace-600 max-w-md mx-auto">
                    You need to train your first AI model before you can start chatting. 
                    Complete more responses and life entries, then start your training.
                  </p>
                  <Button
                    onClick={() => setActiveTab('overview')}
                    className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
                  >
                    Check Training Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Queue Tab (Admin Only) */}
      {activeTab === 'queue' && isAdmin && (
        <TrainingQueueManager />
      )}

      {/* Testing Tab (Admin Only) */}
      {activeTab === 'testing' && isAdmin && (
        <TrainingTestSuite 
          userId={userId} 
          modelId={trainingStatus.models[0]?.id}
        />
      )}
    </div>
  )
}