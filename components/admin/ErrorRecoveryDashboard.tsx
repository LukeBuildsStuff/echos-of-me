'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useAutoRetry, useGracefulDegradation, useCircuitBreaker } from '@/hooks/useErrorRecovery'
import { useErrorRecovery } from '@/components/providers/ErrorRecoveryProvider'
import { 
  ErrorRecoveryPanel, 
  ConnectionStatus, 
  CircuitBreakerStatus,
  QuickRecoveryActions 
} from '@/components/ui/error-recovery'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  RefreshCw,
  Settings,
  Activity,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  Database,
  Wifi,
  Server,
  Brain,
  User,
  HardDrive
} from 'lucide-react'

interface RecoveryAction {
  id: string
  type: 'retry' | 'reset' | 'fallback' | 'escalate'
  context: string
  description: string
  automated: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedTime?: number
}

interface SystemHealthCheck {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'failing' | 'unknown'
  lastCheck: number
  responseTime: number
  errorRate: number
  uptime: number
  icon: React.ComponentType<{ className?: string }>
}

export default function ErrorRecoveryDashboard() {
  const { toast } = useToast()
  const { 
    globalState, 
    retryFailedOperations,
    checkConnectivity,
    getErrorSummary,
    clearAllErrors
  } = useErrorRecovery()

  const [activeTab, setActiveTab] = useState<'overview' | 'recovery' | 'monitoring' | 'actions'>('overview')
  const [availableActions, setAvailableActions] = useState<Record<string, RecoveryAction[]>>({})
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set())
  const [systemHealth, setSystemHealth] = useState<SystemHealthCheck[]>([])

  // Demo system health data
  useEffect(() => {
    const mockHealthChecks: SystemHealthCheck[] = [
      {
        id: 'rtx-monitoring',
        name: 'RTX Monitoring',
        status: globalState.hasConnectivity ? 'healthy' : 'failing',
        lastCheck: Date.now(),
        responseTime: 150,
        errorRate: 0.02,
        uptime: 99.5,
        icon: Zap
      },
      {
        id: 'database',
        name: 'Database',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 45,
        errorRate: 0.001,
        uptime: 99.9,
        icon: Database
      },
      {
        id: 'training-engine',
        name: 'Training Engine',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 200,
        errorRate: 0.05,
        uptime: 98.2,
        icon: Brain
      },
      {
        id: 'auth-service',
        name: 'Authentication',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 80,
        errorRate: 0.01,
        uptime: 99.8,
        icon: User
      },
      {
        id: 'file-storage',
        name: 'File Storage',
        status: 'degraded',
        lastCheck: Date.now(),
        responseTime: 500,
        errorRate: 0.1,
        uptime: 97.5,
        icon: HardDrive
      }
    ]

    setSystemHealth(mockHealthChecks)
  }, [globalState.hasConnectivity])

  // Fetch available recovery actions
  useEffect(() => {
    const fetchRecoveryActions = async () => {
      try {
        const response = await fetch('/api/errors/recovery')
        const data = await response.json()
        
        const actionsByContext: Record<string, RecoveryAction[]> = {}
        data.recoveryActions?.forEach(({ context, actions }: { context: string, actions: RecoveryAction[] }) => {
          actionsByContext[context] = actions
        })
        
        setAvailableActions(actionsByContext)
      } catch (error) {
        console.error('Failed to fetch recovery actions:', error)
      }
    }

    fetchRecoveryActions()
  }, [])

  // Circuit breaker for critical operations
  const criticalOpsCircuit = useCircuitBreaker(
    async () => {
      // Simulate critical operation (e.g., health check)
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('Health check failed')
      return response.json()
    },
    {
      failureThreshold: 3,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
      onStateChange: (state) => {
        console.log(`Critical operations circuit breaker: ${state}`)
      }
    }
  )

  // Execute recovery action
  const executeRecoveryAction = useCallback(async (actionId: string, context: string) => {
    setExecutingActions(prev => new Set([...prev, actionId]))
    
    try {
      const response = await fetch('/api/errors/recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actionId,
          context,
          errorDetails: globalState.errors.filter(e => e.context === context)
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Recovery Action Successful",
          description: result.message,
          variant: "success"
        })
      } else {
        toast({
          title: "Recovery Action Failed",
          description: result.message,
          variant: "destructive"
        })
      }

      return result
    } catch (error) {
      toast({
        title: "Recovery Action Error",
        description: `Failed to execute ${actionId}`,
        variant: "destructive"
      })
      throw error
    } finally {
      setExecutingActions(prev => {
        const next = new Set(prev)
        next.delete(actionId)
        return next
      })
    }
  }, [globalState.errors, toast])

  // Auto-retry demonstration for RTX monitoring
  const rtxMonitoringRetry = useAutoRetry(
    async () => {
      const response = await fetch('/api/admin/monitoring/rtx-stream')
      if (!response.ok) throw new Error(`RTX monitoring failed: ${response.status}`)
      return response.json()
    },
    {
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 2000,
        backoffMultiplier: 1.5
      },
      persistErrors: true,
      storageKey: 'rtx-monitoring-recovery',
      onError: (error, state) => {
        console.log('RTX monitoring error:', error, state)
      },
      onRecovery: () => {
        console.log('RTX monitoring recovered')
      }
    }
  )

  // Graceful degradation for training jobs
  const trainingJobsWithFallback = useGracefulDegradation(
    async () => {
      const response = await fetch('/api/admin/training/jobs')
      if (!response.ok) throw new Error('Training jobs API failed')
      return response.json()
    },
    () => {
      // Fallback to cached data
      const cached = localStorage.getItem('cached-training-jobs')
      return cached ? JSON.parse(cached) : { jobs: [] }
    },
    {
      fallbackDelay: 3000,
      onFallback: (error) => {
        console.log('Training jobs fell back to cache:', error)
      },
      onRestore: () => {
        console.log('Training jobs service restored')
      }
    }
  )

  const errorSummary = getErrorSummary()

  const getHealthStatusColor = (status: SystemHealthCheck['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'degraded': return 'text-yellow-600 bg-yellow-100'
      case 'failing': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthIcon = (status: SystemHealthCheck['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'degraded': return <AlertTriangle className="h-4 w-4" />
      case 'failing': return <XCircle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Error Recovery Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Monitor system health and manage error recovery
          </p>
        </div>
        
        <QuickRecoveryActions
          onRefresh={() => window.location.reload()}
          onRetry={retryFailedOperations}
          onReset={clearAllErrors}
          onOfflineMode={() => {
            // Implement offline mode logic
            toast({
              title: "Offline Mode",
              description: "Switching to offline mode with cached data",
              variant: "default"
            })
          }}
        />
      </div>

      {/* Global Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold">{errorSummary.total}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unrecovered</p>
                <p className="text-2xl font-bold">{errorSummary.unrecovered}</p>
              </div>
              <RefreshCw className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <p className="text-2xl font-bold">
                  {Math.round((systemHealth.filter(s => s.status === 'healthy').length / systemHealth.length) * 100)}%
                </p>
              </div>
              <Activity className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connectivity</p>
                <p className="text-2xl font-bold">
                  {globalState.isOnline && globalState.hasConnectivity ? 'Online' : 'Offline'}
                </p>
              </div>
              {globalState.isOnline && globalState.hasConnectivity ? (
                <Wifi className="h-6 w-6 text-green-500" />
              ) : (
                <Server className="h-6 w-6 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Health Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemHealth.map((health) => {
              const IconComponent = health.icon
              return (
                <Card key={health.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="font-medium">{health.name}</span>
                      </div>
                      <Badge className={cn("text-xs", getHealthStatusColor(health.status))}>
                        {getHealthIcon(health.status)}
                        <span className="ml-1">{health.status}</span>
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Response Time:</span>
                        <span>{health.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Error Rate:</span>
                        <span>{(health.errorRate * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uptime:</span>
                        <span>{health.uptime}%</span>
                      </div>
                    </div>
                    
                    <Progress 
                      value={health.uptime} 
                      className="mt-3 h-2"
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Connection Status */}
          <ConnectionStatus
            isConnected={globalState.isOnline && globalState.hasConnectivity}
            isRetrying={globalState.globalRetryMode}
            lastSuccessTime={globalState.lastConnectivityCheck}
          />

          {/* Circuit Breaker Status */}
          <CircuitBreakerStatus
            state={criticalOpsCircuit.state}
            failureCount={criticalOpsCircuit.failureCount}
            timeUntilReset={criticalOpsCircuit.timeUntilReset}
            onReset={criticalOpsCircuit.reset}
          />
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery" className="space-y-6">
          {/* RTX Monitoring Recovery */}
          <ErrorRecoveryPanel
            title="RTX Monitoring Recovery"
            error={rtxMonitoringRetry.error}
            recoveryState={{
              isRetrying: rtxMonitoringRetry.isRetrying,
              attemptCount: rtxMonitoringRetry.attemptCount,
              maxAttempts: 3,
              timeUntilNextRetry: rtxMonitoringRetry.timeUntilNextRetry,
              canRetry: rtxMonitoringRetry.canRetry
            }}
            connectionState={{
              isConnected: globalState.hasConnectivity,
              lastSuccessTime: globalState.lastConnectivityCheck
            }}
            actions={{
              onRetry: rtxMonitoringRetry.manualRetry,
              onReset: rtxMonitoringRetry.reset
            }}
          />

          {/* Training Jobs with Fallback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Training Jobs Service
              </CardTitle>
              <CardDescription>
                Status: {trainingJobsWithFallback.isFallbackMode ? 'Fallback Mode' : 'Normal Operation'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  onClick={() => trainingJobsWithFallback.execute()}
                  disabled={trainingJobsWithFallback.isFallbackMode}
                >
                  Test Service
                </Button>
                <Button 
                  variant="outline" 
                  onClick={trainingJobsWithFallback.reset}
                >
                  Reset
                </Button>
              </div>
              
              {trainingJobsWithFallback.lastError && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {trainingJobsWithFallback.lastError.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Timeline</CardTitle>
              <CardDescription>Recent system errors and recovery attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {globalState.errors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No recent errors</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {globalState.errors.slice().reverse().map((error) => (
                    <div key={error.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                        error.recovered 
                          ? "bg-green-500" 
                          : error.severity === 'critical' 
                            ? "bg-red-500" 
                            : "bg-yellow-500"
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{error.context}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {error.severity}
                            </Badge>
                            <Badge 
                              variant={error.recovered ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {error.recovered ? "Recovered" : "Active"}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {error.error.message}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(error.timestamp).toLocaleString()}</span>
                          <span>Retries: {error.retryCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          {Object.entries(availableActions).map(([context, actions]) => (
            <Card key={context}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {context.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Recovery
                </CardTitle>
                <CardDescription>
                  Available recovery actions for {context}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {actions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{action.description}</span>
                          <Badge 
                            variant={action.priority === 'critical' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {action.priority}
                          </Badge>
                          {action.automated && (
                            <Badge variant="secondary" className="text-xs">
                              Auto
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          Type: {action.type} • 
                          {action.estimatedTime && ` Est. time: ${action.estimatedTime / 1000}s`}
                        </p>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => executeRecoveryAction(action.id, context)}
                        disabled={executingActions.has(action.id)}
                        className="ml-4"
                      >
                        {executingActions.has(action.id) ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          'Execute'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}