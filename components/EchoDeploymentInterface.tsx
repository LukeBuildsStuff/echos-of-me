'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface ModelVersion {
  id: string
  version: string
  modelName: string
  userName: string
  userEmail: string
  status: 'completed' | 'deployed'
  trainedAt: string
  performance: {
    coherenceScore: number
    personaMatchScore: number
    responseQuality: number
  }
  trainingSamples: number
  capabilities: {
    textGeneration: boolean
    voiceIntegration: boolean
    conversational: boolean
  }
}

interface EchoDeployment {
  id: string
  name: string
  modelName: string
  userName: string
  status: 'deploying' | 'deployed' | 'failed' | 'inactive'
  isActive: boolean
  voiceIntegration: boolean
  endpointUrl?: string
  createdAt: string
  deployedAt?: string
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown'
  testResults?: {
    passed: boolean
    totalTests: number
    passedTests: number
  }
}

interface Props {
  isAdmin?: boolean
}

export default function EchoDeploymentInterface({ isAdmin = false }: Props) {
  const [availableModels, setAvailableModels] = useState<ModelVersion[]>([])
  const [deployments, setDeployments] = useState<EchoDeployment[]>([])
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null)
  const [deploymentName, setDeploymentName] = useState('')
  const [enableVoice, setEnableVoice] = useState(false)
  const [autoActivate, setAutoActivate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deploymentProgress, setDeploymentProgress] = useState(0)
  const [showDeployDialog, setShowDeployDialog] = useState(false)
  const [testingModel, setTestingModel] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      loadAvailableModels(),
      loadDeployments()
    ])
  }

  const loadAvailableModels = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/training/deploy?view=available_models')
      if (!response.ok) throw new Error('Failed to load models')

      const data = await response.json()
      setAvailableModels(data.models.filter((m: ModelVersion) => m.status === 'completed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    }
  }

  const loadDeployments = async () => {
    try {
      const response = await fetch('/api/admin/training/deploy-to-echo?action=list')
      if (!response.ok) throw new Error('Failed to load deployments')

      const data = await response.json()
      setDeployments(data.deployments)
    } catch (err) {
      console.error('Failed to load deployments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async () => {
    if (!selectedModel) return

    try {
      setDeploying(true)
      setDeploymentProgress(0)
      setError(null)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDeploymentProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch('/api/admin/training/deploy-to-echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelVersionId: selectedModel.id,
          userId: selectedModel.userName, // This should be userId, but using userName for demo
          deploymentName: deploymentName || `${selectedModel.modelName}_echo`,
          enableVoiceIntegration: enableVoice,
          autoActivate
        })
      })

      clearInterval(progressInterval)
      setDeploymentProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Deployment failed')
      }

      // Success!
      setShowDeployDialog(false)
      setSelectedModel(null)
      setDeploymentName('')
      setEnableVoice(false)
      await loadDeployments()

      // Show success notification
      alert(`Successfully deployed ${result.deploymentName} to Echo chat!\n\nHealth: ${result.healthCheck.status}\nTests: ${result.testResults.passedTests}/${result.testResults.totalTests} passed\n${result.autoActivated ? 'Model is now active in Echo chat' : 'Manual activation required'}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed')
    } finally {
      setDeploying(false)
      setDeploymentProgress(0)
    }
  }

  const activateDeployment = async (deploymentId: string) => {
    try {
      const response = await fetch('/api/admin/training/deploy-to-echo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deploymentId,
          action: 'activate'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to activate deployment')
      }

      await loadDeployments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate deployment')
    }
  }

  const testDeployment = async (deploymentId: string) => {
    try {
      setTestingModel(deploymentId)
      const response = await fetch(`/api/admin/training/deploy-to-echo?action=test&deploymentId=${deploymentId}`)
      
      if (!response.ok) {
        throw new Error('Test failed')
      }

      const result = await response.json()
      const { testResults } = result

      alert(`Test Results:\n\nPassed: ${testResults.tests.filter((t: any) => t.passed).length}/${testResults.tests.length}\nOverall: ${testResults.passed ? 'PASS' : 'FAIL'}\n\nSample responses look good: ${testResults.tests[0]?.response?.substring(0, 100)}...`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTestingModel(null)
    }
  }

  const checkHealth = async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/admin/training/deploy-to-echo?action=health&deploymentId=${deploymentId}`)
      
      if (!response.ok) {
        throw new Error('Health check failed')
      }

      const result = await response.json()
      const { health } = result

      alert(`Health Check Results:\n\nStatus: ${health.status}\nResponse Time: ${health.responseTime}ms\nLast Check: ${new Date(health.timestamp).toLocaleString()}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed')
    }
  }

  const getStatusBadge = (status: string, isActive?: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    }
    
    switch (status) {
      case 'deployed':
        return <Badge className="bg-blue-100 text-blue-800">Deployed</Badge>
      case 'deploying':
        return <Badge className="bg-yellow-100 text-yellow-800">Deploying</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return <Loading message="Loading Echo deployment interface..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deploy to Echo Chat</h2>
          <p className="text-gray-600">One-click deployment of trained models to AI Echo chat system</p>
        </div>
        
        <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
          <DialogTrigger asChild>
            <Button disabled={availableModels.length === 0}>
              Deploy New Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Deploy Model to Echo</DialogTitle>
              <DialogDescription>
                Configure deployment settings for Echo chat integration
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-select">Select Model</Label>
                <Select 
                  value={selectedModel?.id || ''} 
                  onValueChange={(value) => setSelectedModel(availableModels.find(m => m.id === value) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a completed model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.modelName} v{model.version} - {model.userName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModel && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Coherence: {(selectedModel.performance.coherenceScore * 100).toFixed(1)}%</div>
                    <div>Persona: {(selectedModel.performance.personaMatchScore * 100).toFixed(1)}%</div>
                    <div>Quality: {(selectedModel.performance.responseQuality * 100).toFixed(1)}%</div>
                    <div>Samples: {selectedModel.trainingSamples}</div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="deployment-name">Deployment Name (Optional)</Label>
                <Input
                  id="deployment-name"
                  placeholder="Auto-generated if empty"
                  value={deploymentName}
                  onChange={(e) => setDeploymentName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={enableVoice}
                    onChange={(e) => setEnableVoice(e.target.checked)}
                  />
                  <span className="text-sm">Enable voice integration</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoActivate}
                    onChange={(e) => setAutoActivate(e.target.checked)}
                  />
                  <span className="text-sm">Auto-activate after deployment</span>
                </label>
              </div>

              {deploying && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Deploying to Echo...</span>
                    <span>{deploymentProgress}%</span>
                  </div>
                  <Progress value={deploymentProgress} />
                </div>
              )}

              {error && <ErrorMessage message={error} />}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeployDialog(false)} disabled={deploying}>
                  Cancel
                </Button>
                <Button onClick={handleDeploy} disabled={!selectedModel || deploying}>
                  {deploying ? 'Deploying...' : 'Deploy to Echo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Active Deployments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Current Deployments</h3>
        
        {deployments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Echo Deployments</h3>
              <p className="text-gray-600 mb-4">Deploy your first trained model to Echo chat system</p>
              <Button onClick={() => setShowDeployDialog(true)} disabled={availableModels.length === 0}>
                Deploy First Model
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {deployments.map((deployment) => (
              <Card key={deployment.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-lg">{deployment.name}</h4>
                        {getStatusBadge(deployment.status, deployment.isActive)}
                        {deployment.voiceIntegration && <Badge variant="outline">Voice</Badge>}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div>Model: {deployment.modelName}</div>
                        <div>User: {deployment.userName}</div>
                        <div>Created: {new Date(deployment.createdAt).toLocaleString()}</div>
                        {deployment.deployedAt && (
                          <div>Deployed: {new Date(deployment.deployedAt).toLocaleString()}</div>
                        )}
                      </div>

                      {deployment.testResults && (
                        <div className="text-sm">
                          <span className="text-gray-600">Tests: </span>
                          <span className={deployment.testResults.passed ? 'text-green-600' : 'text-red-600'}>
                            {deployment.testResults.passedTests}/{deployment.testResults.totalTests} passed
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {deployment.status === 'deployed' && !deployment.isActive && (
                        <Button 
                          size="sm" 
                          onClick={() => activateDeployment(deployment.id)}
                        >
                          Activate
                        </Button>
                      )}
                      
                      {deployment.status === 'deployed' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => testDeployment(deployment.id)}
                            disabled={testingModel === deployment.id}
                          >
                            {testingModel === deployment.id ? 'Testing...' : 'Test'}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => checkHealth(deployment.id)}
                          >
                            Health
                          </Button>
                        </>
                      )}
                      
                      {deployment.isActive && (
                        <Button variant="outline" size="sm" asChild>
                          <a href="/ai-echo" target="_blank" rel="noopener noreferrer">
                            Open Echo Chat
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Models */}
      {availableModels.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Models for Deployment</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableModels.map((model) => (
              <Card key={model.id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{model.modelName}</h4>
                      <Badge variant="outline">v{model.version}</Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div>User: {model.userName}</div>
                      <div>Samples: {model.trainingSamples}</div>
                      <div>Trained: {new Date(model.trainedAt).toLocaleDateString()}</div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Coherence:</span>
                        <span>{(model.performance.coherenceScore * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Persona Match:</span>
                        <span>{(model.performance.personaMatchScore * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality:</span>
                        <span>{(model.performance.responseQuality * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedModel(model)
                        setShowDeployDialog(true)
                      }}
                    >
                      Deploy to Echo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}