'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface ModelVersion {
  id: string
  version: string
  userId: string
  userName: string
  userEmail: string
  status: 'training' | 'testing' | 'ready' | 'deployed' | 'archived' | 'failed'
  trainedAt: string
  deployedAt?: string
  archivedAt?: string
  
  // Model metadata
  baseModel: string
  architecture: string
  trainingMethod: string
  modelSize: number // MB
  contextLength: number
  
  // Performance metrics
  performance: {
    loss: number
    coherenceScore: number
    personaMatchScore: number
    factualAccuracyScore: number
    responseQuality: number
    benchmarkScores: Record<string, number>
  }
  
  // Training details
  trainingTime: number // minutes
  trainingExamples: number
  epochs: number
  hardwareUsed: string
  
  // Deployment info
  deploymentConfig?: {
    endpoint: string
    maxConcurrentUsers: number
    autoScaling: boolean
    memoryLimit: number
    cpuLimit: number
  }
  
  // Usage statistics
  usage?: {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    activeUsers: number
    lastUsed: string
  }
  
  // Quality assurance
  testResults?: {
    conversationQuality: number
    safetyScore: number
    personalityConsistency: number
    factualAccuracy: number
    testCases: Array<{
      test: string
      passed: boolean
      score: number
      notes?: string
    }>
  }
}

interface DeploymentEnvironment {
  id: string
  name: string
  description: string
  status: 'active' | 'maintenance' | 'offline'
  capacity: {
    maxModels: number
    currentModels: number
    memoryAvailable: number
    memoryUsed: number
  }
  config: {
    autoScaling: boolean
    loadBalancing: boolean
    monitoring: boolean
    backup: boolean
  }
}

interface Props {
  isAdmin?: boolean
  userId?: string
}

export default function ModelDeploymentInterface({ isAdmin = false, userId }: Props) {
  const [models, setModels] = useState<ModelVersion[]>([])
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([])
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('models')
  
  // Deployment state
  const [deploymentInProgress, setDeploymentInProgress] = useState(false)
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('')
  const [deploymentConfig, setDeploymentConfig] = useState({
    maxConcurrentUsers: 10,
    autoScaling: true,
    memoryLimit: 8,
    cpuLimit: 4,
    customEndpoint: '',
    enableLogging: true,
    enableMetrics: true
  })
  
  // Testing state
  const [testingInProgress, setTestingInProgress] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [customTestPrompts, setCustomTestPrompts] = useState<string[]>([''])

  useEffect(() => {
    loadModelsAndEnvironments()
  }, [userId])

  const loadModelsAndEnvironments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (isAdmin) params.append('admin', 'true')
      
      const [modelsResponse, envsResponse] = await Promise.all([
        fetch(`/api/admin/models/versions?${params}`),
        fetch(`/api/admin/deployment/environments?${params}`)
      ])
      
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json()
        setModels(modelsData.models || [])
      }
      
      if (envsResponse.ok) {
        const envsData = await envsResponse.json()
        setEnvironments(envsData.environments || [])
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployment data')
    } finally {
      setLoading(false)
    }
  }

  const runModelTests = async (modelId: string) => {
    setTestingInProgress(true)
    try {
      const response = await fetch('/api/admin/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          customPrompts: customTestPrompts.filter(p => p.trim()),
          testSuites: ['conversation_quality', 'safety', 'personality_consistency', 'factual_accuracy']
        })
      })
      
      if (!response.ok) throw new Error('Model testing failed')
      
      const results = await response.json()
      setTestResults(results)
      
      // Refresh model data to get updated test results
      await loadModelsAndEnvironments()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Model testing failed')
    } finally {
      setTestingInProgress(false)
    }
  }

  const deployModel = async (modelId: string, environmentId: string) => {
    setDeploymentInProgress(true)
    try {
      const response = await fetch('/api/admin/models/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          environmentId,
          config: deploymentConfig
        })
      })
      
      if (!response.ok) throw new Error('Model deployment failed')
      
      const result = await response.json()
      
      // Refresh data
      await loadModelsAndEnvironments()
      
      alert(`Model deployed successfully!\nEndpoint: ${result.endpoint}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Model deployment failed')
    } finally {
      setDeploymentInProgress(false)
    }
  }

  const undeployModel = async (modelId: string) => {
    if (confirm('Are you sure you want to undeploy this model? Active users will lose access.')) {
      try {
        const response = await fetch('/api/admin/models/undeploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId })
        })
        
        if (response.ok) {
          await loadModelsAndEnvironments()
        }
      } catch (error) {
        console.error('Failed to undeploy model:', error)
      }
    }
  }

  const archiveModel = async (modelId: string) => {
    if (confirm('Archive this model version? It will be moved to long-term storage.')) {
      try {
        const response = await fetch('/api/admin/models/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId })
        })
        
        if (response.ok) {
          await loadModelsAndEnvironments()
        }
      } catch (error) {
        console.error('Failed to archive model:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'bg-green-100 text-green-800'
      case 'ready': return 'bg-blue-100 text-blue-800'
      case 'testing': return 'bg-yellow-100 text-yellow-800'
      case 'training': return 'bg-purple-100 text-purple-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb > 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`
  }

  if (loading) {
    return <Loading message="Loading model deployment interface..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Model Deployment & Versioning</h2>
        <p className="text-gray-600">Deploy and manage trained AI models across environments</p>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models">Model Versions</TabsTrigger>
          <TabsTrigger value="deployment">Deploy Models</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
        </TabsList>

        {/* Model Versions Tab */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Available Model Versions</h3>
              <p className="text-sm text-gray-600">{models.length} models across all users</p>
            </div>
            <Button onClick={loadModelsAndEnvironments} variant="outline">
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {models.map((model) => (
              <Card key={model.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      {/* Model Header */}
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-semibold">{model.userName} - v{model.version}</h4>
                          <p className="text-sm text-gray-600">{model.userEmail}</p>
                        </div>
                        <Badge className={getStatusColor(model.status)}>
                          {model.status}
                        </Badge>
                        {model.status === 'deployed' && (
                          <Badge variant="outline" className="text-green-600">
                            Live
                          </Badge>
                        )}
                      </div>

                      {/* Model Details */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-blue-600">{model.baseModel}</div>
                          <div className="text-gray-600">Base Model</div>
                        </div>
                        <div>
                          <div className="font-medium text-green-600">{formatBytes(model.modelSize * 1024 * 1024)}</div>
                          <div className="text-gray-600">Size</div>
                        </div>
                        <div>
                          <div className="font-medium text-purple-600">{model.performance.coherenceScore.toFixed(1)}%</div>
                          <div className="text-gray-600">Coherence</div>
                        </div>
                        <div>
                          <div className="font-medium text-orange-600">{model.performance.personaMatchScore.toFixed(1)}%</div>
                          <div className="text-gray-600">Persona Match</div>
                        </div>
                        <div>
                          <div className="font-medium text-teal-600">{model.trainingExamples}</div>
                          <div className="text-gray-600">Examples</div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>Loss: {model.performance.loss.toFixed(4)}</div>
                          <div>Quality: {model.performance.responseQuality}%</div>
                          <div>Training: {model.trainingTime}min</div>
                          <div>Trained: {formatDate(model.trainedAt)}</div>
                        </div>
                      </div>

                      {/* Usage Stats (if deployed) */}
                      {model.usage && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>Requests: {model.usage.totalRequests.toLocaleString()}</div>
                            <div>Users: {model.usage.activeUsers}</div>
                            <div>Avg Response: {model.usage.averageResponseTime}ms</div>
                            <div>Error Rate: {model.usage.errorRate.toFixed(2)}%</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Model Version Details - v{model.version}</DialogTitle>
                            <DialogDescription>
                              Complete model information and performance metrics
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Technical Details */}
                            <div>
                              <h4 className="font-semibold mb-3">Technical Specifications</h4>
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div><strong>Architecture:</strong> {model.architecture}</div>
                                <div><strong>Context Length:</strong> {model.contextLength.toLocaleString()}</div>
                                <div><strong>Training Method:</strong> {model.trainingMethod}</div>
                                <div><strong>Hardware:</strong> {model.hardwareUsed}</div>
                              </div>
                            </div>

                            {/* Performance Breakdown */}
                            <div>
                              <h4 className="font-semibold mb-3">Performance Metrics</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span>Coherence Score</span>
                                  <span>{model.performance.coherenceScore.toFixed(1)}%</span>
                                </div>
                                <Progress value={model.performance.coherenceScore} className="h-2" />
                                
                                <div className="flex justify-between">
                                  <span>Persona Match</span>
                                  <span>{model.performance.personaMatchScore.toFixed(1)}%</span>
                                </div>
                                <Progress value={model.performance.personaMatchScore} className="h-2" />
                                
                                <div className="flex justify-between">
                                  <span>Factual Accuracy</span>
                                  <span>{model.performance.factualAccuracyScore.toFixed(1)}%</span>
                                </div>
                                <Progress value={model.performance.factualAccuracyScore} className="h-2" />
                              </div>
                            </div>

                            {/* Test Results */}
                            {model.testResults && (
                              <div>
                                <h4 className="font-semibold mb-3">Quality Assurance Test Results</h4>
                                <div className="space-y-3">
                                  {model.testResults.testCases.map((test, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg ${test.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">{test.test}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">{test.score}%</span>
                                          <Badge className={test.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                            {test.passed ? 'Pass' : 'Fail'}
                                          </Badge>
                                        </div>
                                      </div>
                                      {test.notes && (
                                        <div className="text-sm text-gray-600 mt-1">{test.notes}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Deployment Info */}
                            {model.deploymentConfig && (
                              <div>
                                <h4 className="font-semibold mb-3">Deployment Configuration</h4>
                                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                  <div><strong>Endpoint:</strong> {model.deploymentConfig.endpoint}</div>
                                  <div><strong>Max Users:</strong> {model.deploymentConfig.maxConcurrentUsers}</div>
                                  <div><strong>Memory Limit:</strong> {model.deploymentConfig.memoryLimit}GB</div>
                                  <div><strong>Auto Scaling:</strong> {model.deploymentConfig.autoScaling ? 'Enabled' : 'Disabled'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      {model.status === 'ready' && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedModel(model)
                            setActiveTab('deployment')
                          }}
                        >
                          Deploy
                        </Button>
                      )}

                      {model.status === 'deployed' && isAdmin && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => undeployModel(model.id)}
                        >
                          Undeploy
                        </Button>
                      )}

                      {model.status === 'training' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => runModelTests(model.id)}
                          disabled={testingInProgress}
                        >
                          Test
                        </Button>
                      )}

                      {(model.status === 'ready' || model.status === 'deployed') && isAdmin && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => archiveModel(model.id)}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {models.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">No trained models available for deployment</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Deployment Tab */}
        <TabsContent value="deployment" className="space-y-6">
          {selectedModel ? (
            <Card>
              <CardHeader>
                <CardTitle>Deploy Model: {selectedModel.userName} v{selectedModel.version}</CardTitle>
                <CardDescription>Configure deployment settings for this model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Environment Selection */}
                <div>
                  <Label>Deployment Environment</Label>
                  <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {environments.filter(env => env.status === 'active').map(env => (
                        <SelectItem key={env.id} value={env.id}>
                          {env.name} ({env.capacity.currentModels}/{env.capacity.maxModels} models)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Deployment Configuration */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Max Concurrent Users</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={deploymentConfig.maxConcurrentUsers}
                        onChange={(e) => setDeploymentConfig(prev => ({
                          ...prev,
                          maxConcurrentUsers: parseInt(e.target.value)
                        }))}
                      />
                    </div>

                    <div>
                      <Label>Memory Limit (GB)</Label>
                      <Input
                        type="number"
                        min="2"
                        max="32"
                        value={deploymentConfig.memoryLimit}
                        onChange={(e) => setDeploymentConfig(prev => ({
                          ...prev,
                          memoryLimit: parseInt(e.target.value)
                        }))}
                      />
                    </div>

                    <div>
                      <Label>CPU Limit (cores)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="16"
                        value={deploymentConfig.cpuLimit}
                        onChange={(e) => setDeploymentConfig(prev => ({
                          ...prev,
                          cpuLimit: parseInt(e.target.value)
                        }))}
                      />
                    </div>

                    <div>
                      <Label>Custom Endpoint (optional)</Label>
                      <Input
                        placeholder="e.g., custom-model-name"
                        value={deploymentConfig.customEndpoint}
                        onChange={(e) => setDeploymentConfig(prev => ({
                          ...prev,
                          customEndpoint: e.target.value
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="autoScaling"
                        checked={deploymentConfig.autoScaling}
                        onChange={(e) => setDeploymentConfig(prev => ({
                          ...prev,
                          autoScaling: e.target.checked
                        }))}
                      />
                      <Label htmlFor="autoScaling">Enable Auto-scaling</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableLogging"
                        checked={deploymentConfig.enableLogging}
                        onChange={(e) => setDeploymentConfig(prev => ({
                          ...prev,
                          enableLogging: e.target.checked
                        }))}
                      />
                      <Label htmlFor="enableLogging">Enable Request Logging</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableMetrics"
                        checked={deploymentConfig.enableMetrics}
                        onChange={(e) => setDeploymentConfig(prev => ({
                          ...prev,
                          enableMetrics: e.target.checked
                        }))}
                      />
                      <Label htmlFor="enableMetrics">Enable Performance Metrics</Label>
                    </div>

                    {/* Resource Estimates */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Resource Estimates</h4>
                      <div className="text-sm space-y-1">
                        <div>Model Size: {formatBytes(selectedModel.modelSize * 1024 * 1024)}</div>
                        <div>Base Memory: {Math.ceil(selectedModel.modelSize / 1024 * 1.5)}GB</div>
                        <div>With {deploymentConfig.maxConcurrentUsers} users: ~{Math.ceil(selectedModel.modelSize / 1024 * 1.5 + deploymentConfig.maxConcurrentUsers * 0.1)}GB</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deploy Button */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => selectedModel && selectedEnvironment && deployModel(selectedModel.id, selectedEnvironment)}
                    disabled={!selectedEnvironment || deploymentInProgress}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {deploymentInProgress ? 'Deploying...' : 'Deploy Model'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedModel(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a Model to Deploy</CardTitle>
                <CardDescription>Choose a ready model from the Models tab to configure deployment</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('models')}>
                  Go to Model Versions
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Environments Tab */}
        <TabsContent value="environments" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Deployment Environments</h3>
            <p className="text-sm text-gray-600">Manage deployment environments and their capacity</p>
          </div>

          <div className="grid gap-4">
            {environments.map((env) => (
              <Card key={env.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{env.name}</h4>
                        <Badge className={env.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {env.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600">{env.description}</p>
                      
                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">{env.capacity.currentModels}/{env.capacity.maxModels}</div>
                          <div className="text-gray-600">Models</div>
                        </div>
                        <div>
                          <div className="font-medium">{env.capacity.memoryUsed.toFixed(1)}/{env.capacity.memoryAvailable}GB</div>
                          <div className="text-gray-600">Memory</div>
                        </div>
                        <div>
                          <div className="font-medium">{env.config.autoScaling ? 'Yes' : 'No'}</div>
                          <div className="text-gray-600">Auto-scaling</div>
                        </div>
                        <div>
                          <div className="font-medium">{env.config.monitoring ? 'Yes' : 'No'}</div>
                          <div className="text-gray-600">Monitoring</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Model Capacity</span>
                          <span>{Math.round((env.capacity.currentModels / env.capacity.maxModels) * 100)}%</span>
                        </div>
                        <Progress value={(env.capacity.currentModels / env.capacity.maxModels) * 100} />
                        
                        <div className="flex justify-between text-sm">
                          <span>Memory Usage</span>
                          <span>{Math.round((env.capacity.memoryUsed / env.capacity.memoryAvailable) * 100)}%</span>
                        </div>
                        <Progress value={(env.capacity.memoryUsed / env.capacity.memoryAvailable) * 100} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>Performance metrics and usage statistics for deployed models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Stats */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {models.filter(m => m.status === 'deployed').length}
                    </div>
                    <div className="text-sm text-gray-600">Deployed Models</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {models.reduce((sum, m) => sum + (m.usage?.totalRequests || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {models.reduce((sum, m) => sum + (m.usage?.activeUsers || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {(models.reduce((sum, m) => sum + (m.usage?.averageResponseTime || 0), 0) / Math.max(models.filter(m => m.usage).length, 1)).toFixed(0)}ms
                    </div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                </div>

                {/* Per-Model Analytics */}
                <div>
                  <h4 className="font-semibold mb-3">Per-Model Performance</h4>
                  <div className="space-y-4">
                    {models.filter(m => m.usage).map((model) => (
                      <div key={model.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium">{model.userName} v{model.version}</h5>
                          <Badge className={getStatusColor(model.status)}>
                            {model.status}
                          </Badge>
                        </div>
                        
                        {model.usage && (
                          <div className="grid md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-blue-600">{model.usage.totalRequests.toLocaleString()}</div>
                              <div className="text-gray-600">Requests</div>
                            </div>
                            <div>
                              <div className="font-medium text-green-600">{model.usage.activeUsers}</div>
                              <div className="text-gray-600">Active Users</div>
                            </div>
                            <div>
                              <div className="font-medium text-purple-600">{model.usage.averageResponseTime}ms</div>
                              <div className="text-gray-600">Avg Response</div>
                            </div>
                            <div>
                              <div className={`font-medium ${model.usage.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                                {model.usage.errorRate.toFixed(2)}%
                              </div>
                              <div className="text-gray-600">Error Rate</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-600">{formatDate(model.usage.lastUsed)}</div>
                              <div className="text-gray-600">Last Used</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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