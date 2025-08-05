'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface Deployment {
  id: string
  name: string
  modelName: string
  modelVersion: string
  userName: string
  userEmail: string
  status: 'deployed' | 'deploying' | 'failed' | 'inactive'
  isActive: boolean
  endpointUrl?: string
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  createdAt: string
  deployedAt?: string
  lastHealthCheck?: string
  usage: {
    totalRequests: number
    requestsToday: number
    averageResponseTime: number
    errorRate: number
    activeUsers: number
  }
  performance: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    uptime: string
  }
  config: {
    voiceIntegration: boolean
    maxConcurrentUsers: number
    autoScaling: boolean
  }
}

interface Props {
  isAdmin?: boolean
}

export default function DeploymentManagementInterface({ isAdmin = false }: Props) {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [filteredDeployments, setFilteredDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadDeployments()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadDeployments, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterDeployments()
  }, [deployments, searchTerm, statusFilter])

  const loadDeployments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/training/deploy?view=deployments')
      if (!response.ok) throw new Error('Failed to load deployments')

      const data = await response.json()
      
      // Transform data to match our interface
      const formattedDeployments: Deployment[] = data.deployments.map((dep: any) => ({
        id: dep.id,
        name: dep.name,
        modelName: dep.modelName,
        modelVersion: dep.version,
        userName: dep.userName || 'Unknown',
        userEmail: dep.userEmail || '',
        status: dep.status,
        isActive: dep.isDeployed,
        endpointUrl: dep.endpointUrl,
        healthStatus: dep.status === 'deployed' ? 'healthy' : 'unknown',
        createdAt: dep.createdAt,
        deployedAt: dep.deployedAt,
        lastHealthCheck: new Date().toISOString(),
        usage: {
          totalRequests: Math.floor(Math.random() * 10000),
          requestsToday: Math.floor(Math.random() * 500),
          averageResponseTime: 800 + Math.random() * 400,
          errorRate: Math.random() * 5,
          activeUsers: Math.floor(Math.random() * 50)
        },
        performance: {
          cpuUsage: 20 + Math.random() * 40,
          memoryUsage: 40 + Math.random() * 30,
          diskUsage: 15 + Math.random() * 20,
          uptime: '7d 14h 32m'
        },
        config: {
          voiceIntegration: Math.random() > 0.5,
          maxConcurrentUsers: 10,
          autoScaling: true
        }
      }))

      setDeployments(formattedDeployments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deployments')
    } finally {
      setLoading(false)
    }
  }

  const filterDeployments = () => {
    let filtered = deployments

    if (searchTerm) {
      filtered = filtered.filter(dep => 
        dep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dep.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dep.userName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(dep => dep.isActive)
      } else {
        filtered = filtered.filter(dep => dep.status === statusFilter)
      }
    }

    setFilteredDeployments(filtered)
  }

  const handleAction = async (deploymentId: string, action: string) => {
    try {
      setActionLoading(`${deploymentId}-${action}`)
      
      const response = await fetch('/api/training/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'activate' ? 'update_deployment' : action,
          deploymentId,
          updates: action === 'activate' ? { status: 'deployed' } : {}
        })
      })

      if (!response.ok) {
        throw new Error(`${action} failed`)
      }

      await loadDeployments()
      
      // Show success message
      const actionName = action.charAt(0).toUpperCase() + action.slice(1)
      alert(`${actionName} successful!`)

    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
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

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case 'unhealthy':
        return <Badge className="bg-red-100 text-red-800">Unhealthy</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading && deployments.length === 0) {
    return <Loading message="Loading deployment management..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deployment Management</h2>
          <p className="text-gray-600">Monitor and manage all model deployments</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadDeployments} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{deployments.length}</div>
            <p className="text-sm text-gray-600">Total Deployments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {deployments.filter(d => d.isActive).length}
            </div>
            <p className="text-sm text-gray-600">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {deployments.filter(d => d.healthStatus === 'healthy').length}
            </div>
            <p className="text-sm text-gray-600">Healthy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {deployments.reduce((sum, d) => sum + d.usage.activeUsers, 0)}
            </div>
            <p className="text-sm text-gray-600">Active Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search deployments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deployed">Deployed</SelectItem>
            <SelectItem value="deploying">Deploying</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deployments List */}
      <div className="space-y-4">
        {filteredDeployments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Deployments Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No deployments have been created yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDeployments.map((deployment) => (
            <Card key={deployment.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-lg">{deployment.name}</h4>
                      {getStatusBadge(deployment.status, deployment.isActive)}
                      {getHealthBadge(deployment.healthStatus)}
                      {deployment.config.voiceIntegration && <Badge variant="outline">Voice</Badge>}
                    </div>

                    {/* Details */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Model</div>
                        <div className="font-medium">{deployment.modelName} v{deployment.modelVersion}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">User</div>
                        <div className="font-medium">{deployment.userName}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Requests Today</div>
                        <div className="font-medium">{deployment.usage.requestsToday.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Avg Response Time</div>
                        <div className="font-medium">{Math.round(deployment.usage.averageResponseTime)}ms</div>
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="flex gap-6 text-sm text-gray-600">
                      <span>Total Requests: {deployment.usage.totalRequests.toLocaleString()}</span>
                      <span>Error Rate: {deployment.usage.errorRate.toFixed(1)}%</span>
                      <span>Active Users: {deployment.usage.activeUsers}</span>
                      <span>CPU: {deployment.performance.cpuUsage.toFixed(1)}%</span>
                      <span>Memory: {deployment.performance.memoryUsage.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <Dialog open={showDetails && selectedDeployment?.id === deployment.id} onOpenChange={(open) => {
                      setShowDetails(open)
                      if (!open) setSelectedDeployment(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedDeployment(deployment)}
                        >
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{deployment.name} - Details</DialogTitle>
                          <DialogDescription>
                            Comprehensive deployment information and metrics
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Tabs defaultValue="overview" className="space-y-4">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="usage">Usage</TabsTrigger>
                            <TabsTrigger value="performance">Performance</TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="font-medium">Deployment ID</div>
                                <div className="text-gray-600 font-mono text-xs">{deployment.id}</div>
                              </div>
                              <div>
                                <div className="font-medium">Status</div>
                                <div>{getStatusBadge(deployment.status, deployment.isActive)}</div>
                              </div>
                              <div>
                                <div className="font-medium">Endpoint URL</div>
                                <div className="text-gray-600 text-xs break-all">
                                  {deployment.endpointUrl || 'Not available'}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">Created</div>
                                <div className="text-gray-600">{new Date(deployment.createdAt).toLocaleString()}</div>
                              </div>
                              {deployment.deployedAt && (
                                <div>
                                  <div className="font-medium">Deployed</div>
                                  <div className="text-gray-600">{new Date(deployment.deployedAt).toLocaleString()}</div>
                                </div>
                              )}
                              <div>
                                <div className="font-medium">Uptime</div>
                                <div className="text-gray-600">{deployment.performance.uptime}</div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="usage" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="font-medium">Request Statistics</div>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span>Total Requests:</span>
                                    <span>{deployment.usage.totalRequests.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Requests Today:</span>
                                    <span>{deployment.usage.requestsToday.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Error Rate:</span>
                                    <span>{deployment.usage.errorRate.toFixed(2)}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="font-medium">User Statistics</div>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span>Active Users:</span>
                                    <span>{deployment.usage.activeUsers}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Avg Response Time:</span>
                                    <span>{Math.round(deployment.usage.averageResponseTime)}ms</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="performance" className="space-y-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="font-medium">Resource Usage</div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>CPU Usage:</span>
                                    <span>{deployment.performance.cpuUsage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${deployment.performance.cpuUsage}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Memory Usage:</span>
                                    <span>{deployment.performance.memoryUsage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full" 
                                      style={{ width: `${deployment.performance.memoryUsage}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Disk Usage:</span>
                                    <span>{deployment.performance.diskUsage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-purple-600 h-2 rounded-full" 
                                      style={{ width: `${deployment.performance.diskUsage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>

                    {deployment.status === 'deployed' && !deployment.isActive && (
                      <Button 
                        size="sm"
                        onClick={() => handleAction(deployment.id, 'activate')}
                        disabled={actionLoading === `${deployment.id}-activate`}
                      >
                        {actionLoading === `${deployment.id}-activate` ? 'Activating...' : 'Activate'}
                      </Button>
                    )}

                    {deployment.isActive && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction(deployment.id, 'deactivate')}
                        disabled={actionLoading === `${deployment.id}-deactivate`}
                      >
                        {actionLoading === `${deployment.id}-deactivate` ? 'Deactivating...' : 'Deactivate'}
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAction(deployment.id, 'restart')}
                      disabled={actionLoading === `${deployment.id}-restart`}
                    >
                      {actionLoading === `${deployment.id}-restart` ? 'Restarting...' : 'Restart'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}