'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useAutoRetry, useGracefulDegradation, useCircuitBreaker } from '@/hooks/useErrorRecovery'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  Activity,
  AlertCircle,
  Info,
  Settings,
  Download,
  Upload
} from 'lucide-react'

// Error Recovery Display Component
interface ErrorRecoveryDisplayProps {
  error: Error | null
  isRetrying: boolean
  attemptCount: number
  maxAttempts: number
  timeUntilNextRetry: number
  canRetry: boolean
  onRetry: () => void
  onReset: () => void
  className?: string
}

export function ErrorRecoveryDisplay({
  error,
  isRetrying,
  attemptCount,
  maxAttempts,
  timeUntilNextRetry,
  canRetry,
  onRetry,
  onReset,
  className
}: ErrorRecoveryDisplayProps) {
  const [countdown, setCountdown] = useState(Math.ceil(timeUntilNextRetry / 1000))

  useEffect(() => {
    if (timeUntilNextRetry > 0) {
      const interval = setInterval(() => {
        const remaining = Math.ceil(timeUntilNextRetry / 1000)
        setCountdown(remaining)
        
        if (remaining <= 0) {
          clearInterval(interval)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [timeUntilNextRetry])

  if (!error) return null

  return (
    <Alert className={cn("border-destructive", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <p className="font-medium">Operation Failed</p>
            <p className="text-sm text-gray-600 mt-1">{error.message}</p>
          </div>

          {attemptCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span>Attempt {attemptCount} of {maxAttempts}</span>
              <Progress 
                value={(attemptCount / maxAttempts) * 100} 
                className="flex-1 h-2" 
              />
            </div>
          )}

          {isRetrying && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>
                Retrying in {countdown} second{countdown !== 1 ? 's' : ''}...
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {canRetry && !isRetrying && (
              <Button 
                size="sm" 
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Now
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onReset}
              className="h-8"
            >
              Reset
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Connection Status Indicator
interface ConnectionStatusProps {
  isConnected: boolean
  isRetrying: boolean
  error?: Error | null
  lastSuccessTime?: number
  className?: string
}

export function ConnectionStatus({
  isConnected,
  isRetrying,
  error,
  lastSuccessTime,
  className
}: ConnectionStatusProps) {
  const getStatusIcon = () => {
    if (isRetrying) return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
    if (isConnected) return <Wifi className="h-4 w-4 text-green-500" />
    return <WifiOff className="h-4 w-4 text-red-500" />
  }

  const getStatusText = () => {
    if (isRetrying) return 'Reconnecting...'
    if (isConnected) return 'Connected'
    return 'Disconnected'
  }

  const getStatusColor = () => {
    if (isRetrying) return 'border-yellow-200 bg-yellow-50'
    if (isConnected) return 'border-green-200 bg-green-50'
    return 'border-red-200 bg-red-50'
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
      getStatusColor(),
      className
    )}>
      {getStatusIcon()}
      <span className="font-medium">{getStatusText()}</span>
      
      {error && (
        <Badge variant="destructive" className="text-xs">
          Error
        </Badge>
      )}
      
      {lastSuccessTime && !isConnected && (
        <span className="text-xs text-gray-500 ml-auto">
          Last seen: {new Date(lastSuccessTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

// Fallback Mode Indicator
interface FallbackModeIndicatorProps {
  isActive: boolean
  reason?: string
  onRestore?: () => void
  className?: string
}

export function FallbackModeIndicator({
  isActive,
  reason,
  onRestore,
  className
}: FallbackModeIndicatorProps) {
  if (!isActive) return null

  return (
    <Alert className={cn("border-yellow-200 bg-yellow-50", className)}>
      <Shield className="h-4 w-4 text-yellow-600" />
      <AlertDescription>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-yellow-800">Offline Mode Active</p>
            <p className="text-sm text-yellow-700 mt-1">
              {reason || 'Running with limited functionality due to connectivity issues.'}
            </p>
          </div>
          {onRestore && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onRestore}
              className="ml-4 flex-shrink-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Restore
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Circuit Breaker Status
interface CircuitBreakerStatusProps {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  timeUntilReset: number
  onReset?: () => void
  className?: string
}

export function CircuitBreakerStatus({
  state,
  failureCount,
  timeUntilReset,
  onReset,
  className
}: CircuitBreakerStatusProps) {
  const [countdown, setCountdown] = useState(Math.ceil(timeUntilReset / 1000))

  useEffect(() => {
    if (timeUntilReset > 0) {
      const interval = setInterval(() => {
        const remaining = Math.ceil(timeUntilReset / 1000)
        setCountdown(remaining)
        
        if (remaining <= 0) {
          clearInterval(interval)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [timeUntilReset])

  const getStateIcon = () => {
    switch (state) {
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'open':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'half-open':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStateColor = () => {
    switch (state) {
      case 'closed':
        return 'border-green-200 bg-green-50'
      case 'open':
        return 'border-red-200 bg-red-50'
      case 'half-open':
        return 'border-yellow-200 bg-yellow-50'
    }
  }

  const getStateDescription = () => {
    switch (state) {
      case 'closed':
        return 'Service is operating normally'
      case 'open':
        return `Service circuit is open due to ${failureCount} failures. Requests are being blocked.`
      case 'half-open':
        return 'Service is being tested after failures. Limited requests allowed.'
    }
  }

  if (state === 'closed' && failureCount === 0) return null

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      getStateColor(),
      className
    )}>
      <div className="flex items-start gap-3">
        {getStateIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">
              Circuit Breaker: {state.charAt(0).toUpperCase() + state.slice(1)}
            </h4>
            <Badge variant="outline" className="text-xs">
              {failureCount} failures
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 mt-1">
            {getStateDescription()}
          </p>

          {state === 'open' && timeUntilReset > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Clock className="h-3 w-3" />
              <span>Reset in {countdown} seconds</span>
            </div>
          )}

          {onReset && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onReset}
              className="mt-2 h-7 text-xs"
            >
              Manual Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Error Recovery Panel - Comprehensive error state display
interface ErrorRecoveryPanelProps {
  title: string
  error: Error | null
  recoveryState?: {
    isRetrying: boolean
    attemptCount: number
    maxAttempts: number
    timeUntilNextRetry: number
    canRetry: boolean
  }
  connectionState?: {
    isConnected: boolean
    lastSuccessTime?: number
  }
  fallbackState?: {
    isActive: boolean
    reason?: string
  }
  circuitState?: {
    state: 'closed' | 'open' | 'half-open'
    failureCount: number
    timeUntilReset: number
  }
  actions?: {
    onRetry?: () => void
    onReset?: () => void
    onRestore?: () => void
    onCircuitReset?: () => void
  }
  className?: string
}

export function ErrorRecoveryPanel({
  title,
  error,
  recoveryState,
  connectionState,
  fallbackState,
  circuitState,
  actions = {},
  className
}: ErrorRecoveryPanelProps) {
  const hasAnyError = error || !connectionState?.isConnected || fallbackState?.isActive || circuitState?.state !== 'closed'

  if (!hasAnyError) return null

  return (
    <Card className={cn("border-orange-200", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>
          System recovery and error handling status
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {connectionState && (
          <ConnectionStatus
            isConnected={connectionState.isConnected}
            isRetrying={recoveryState?.isRetrying || false}
            error={error}
            lastSuccessTime={connectionState.lastSuccessTime}
          />
        )}

        {/* Error Recovery Display */}
        {error && recoveryState && (
          <ErrorRecoveryDisplay
            error={error}
            isRetrying={recoveryState.isRetrying}
            attemptCount={recoveryState.attemptCount}
            maxAttempts={recoveryState.maxAttempts}
            timeUntilNextRetry={recoveryState.timeUntilNextRetry}
            canRetry={recoveryState.canRetry}
            onRetry={actions.onRetry || (() => {})}
            onReset={actions.onReset || (() => {})}
          />
        )}

        {/* Fallback Mode */}
        {fallbackState?.isActive && (
          <FallbackModeIndicator
            isActive={fallbackState.isActive}
            reason={fallbackState.reason}
            onRestore={actions.onRestore}
          />
        )}

        {/* Circuit Breaker */}
        {circuitState && (
          <CircuitBreakerStatus
            state={circuitState.state}
            failureCount={circuitState.failureCount}
            timeUntilReset={circuitState.timeUntilReset}
            onReset={actions.onCircuitReset}
          />
        )}

        {/* Recovery Tips */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Recovery Tips</p>
              <ul className="text-blue-800 space-y-1 text-xs">
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Wait for automatic retry</li>
                <li>• Contact support if issues persist</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Recovery Actions
interface QuickRecoveryActionsProps {
  onRefresh: () => void
  onRetry: () => void
  onReset: () => void
  onOfflineMode: () => void
  className?: string
}

export function QuickRecoveryActions({
  onRefresh,
  onRetry,
  onReset,
  onOfflineMode,
  className
}: QuickRecoveryActionsProps) {
  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      <Button 
        size="sm" 
        onClick={onRefresh}
        className="flex items-center gap-2"
      >
        <RefreshCw className="h-3 w-3" />
        Refresh
      </Button>
      
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onRetry}
        className="flex items-center gap-2"
      >
        <Upload className="h-3 w-3" />
        Retry
      </Button>
      
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onReset}
        className="flex items-center gap-2"
      >
        <Settings className="h-3 w-3" />
        Reset
      </Button>
      
      <Button 
        size="sm" 
        variant="secondary" 
        onClick={onOfflineMode}
        className="flex items-center gap-2"
      >
        <Download className="h-3 w-3" />
        Offline Mode
      </Button>
    </div>
  )
}