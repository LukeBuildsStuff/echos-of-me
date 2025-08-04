'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Pause, 
  Play,
  Square,
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  Database,
  Zap,
  Activity,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react'

export type StatusType = 
  | 'online' 
  | 'offline' 
  | 'loading' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'idle' 
  | 'running' 
  | 'paused' 
  | 'stopped'
  | 'connecting'
  | 'disconnected'
  | 'maintenance'
  | 'degraded'

export type StatusSize = 'xs' | 'sm' | 'md' | 'lg'

// Basic Status Indicator
interface StatusIndicatorProps {
  status: StatusType
  size?: StatusSize
  className?: string
  showIcon?: boolean
  showText?: boolean
  text?: string
  animated?: boolean
  onClick?: () => void
  ariaLabel?: string
}

export function StatusIndicator({
  status,
  size = 'md',
  className,
  showIcon = true,
  showText = false,
  text,
  animated = true,
  onClick,
  ariaLabel
}: StatusIndicatorProps) {
  const sizeClasses = {
    xs: 'h-2 w-2',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  }

  const iconSizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base'
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          icon: CheckCircle,
          defaultText: 'Online',
          animation: animated ? 'animate-pulse' : ''
        }
      case 'offline':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          icon: XCircle,
          defaultText: 'Offline',
          animation: ''
        }
      case 'loading':
      case 'connecting':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          icon: Loader2,
          defaultText: status === 'connecting' ? 'Connecting...' : 'Loading...',
          animation: animated ? 'animate-spin' : ''
        }
      case 'success':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          icon: CheckCircle,
          defaultText: 'Success',
          animation: ''
        }
      case 'error':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          icon: XCircle,
          defaultText: 'Error',
          animation: animated ? 'animate-pulse' : ''
        }
      case 'warning':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          icon: AlertCircle,
          defaultText: 'Warning',
          animation: animated ? 'animate-pulse' : ''
        }
      case 'idle':
        return {
          color: 'bg-gray-400',
          textColor: 'text-gray-600',
          icon: Clock,
          defaultText: 'Idle',
          animation: ''
        }
      case 'running':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          icon: Play,
          defaultText: 'Running',
          animation: animated ? 'animate-pulse' : ''
        }
      case 'paused':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          icon: Pause,
          defaultText: 'Paused',
          animation: ''
        }
      case 'stopped':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          icon: Square,
          defaultText: 'Stopped',
          animation: ''
        }
      case 'disconnected':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          icon: WifiOff,
          defaultText: 'Disconnected',
          animation: ''
        }
      case 'maintenance':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          icon: RefreshCw,
          defaultText: 'Maintenance',
          animation: animated ? 'animate-spin' : ''
        }
      case 'degraded':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          icon: AlertCircle,
          defaultText: 'Degraded',
          animation: animated ? 'animate-pulse' : ''
        }
      default:
        return {
          color: 'bg-gray-400',
          textColor: 'text-gray-600',
          icon: Clock,
          defaultText: 'Unknown',
          animation: ''
        }
    }
  }

  const config = getStatusConfig()
  const IconComponent = config.icon
  const displayText = text || config.defaultText

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      className={cn(
        'flex items-center gap-2',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      aria-label={ariaLabel || displayText}
      role={onClick ? 'button' : 'status'}
    >
      {showIcon && (
        <div className="flex items-center">
          {status === 'loading' || status === 'connecting' ? (
            <IconComponent className={cn(iconSizeClasses[size], config.textColor, config.animation)} />
          ) : (
            <div className={cn('rounded-full', sizeClasses[size], config.color, config.animation)} />
          )}
        </div>
      )}
      
      {showText && (
        <span className={cn(textSizeClasses[size], config.textColor, 'font-medium')}>
          {displayText}
        </span>
      )}
    </Component>
  )
}

// Connection Status Component
interface ConnectionStatusProps {
  connected: boolean
  connecting?: boolean
  lastConnected?: string
  className?: string
  showText?: boolean
  onReconnect?: () => void
}

export function ConnectionStatus({
  connected,
  connecting = false,
  lastConnected,
  className,
  showText = true,
  onReconnect
}: ConnectionStatusProps) {
  const getStatus = (): StatusType => {
    if (connecting) return 'connecting'
    if (connected) return 'online'
    return 'disconnected'
  }

  const getText = () => {
    if (connecting) return 'Connecting...'
    if (connected) return 'Connected'
    if (lastConnected) return `Disconnected (${lastConnected})`
    return 'Disconnected'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StatusIndicator 
        status={getStatus()} 
        showIcon 
        showText={showText}
        text={getText()}
        onClick={onReconnect && !connected ? onReconnect : undefined}
        ariaLabel={connected ? 'Connection active' : 'Connection lost'}
      />
      {!connected && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
          aria-label="Reconnect"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// System Health Dashboard
interface SystemHealthProps {
  services: Array<{
    name: string
    status: StatusType
    description?: string
    lastCheck?: string
    responseTime?: number
  }>
  className?: string
  compact?: boolean
}

export function SystemHealth({ services, className, compact = false }: SystemHealthProps) {
  const overallStatus = services.every(s => s.status === 'online') 
    ? 'online' 
    : services.some(s => s.status === 'error' || s.status === 'offline')
    ? 'error'
    : 'warning'

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <StatusIndicator 
          status={overallStatus} 
          size="sm"
          showIcon 
          showText
          text={`${services.filter(s => s.status === 'online').length}/${services.length} services`}
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <h3 className="font-medium text-gray-900">System Health</h3>
        <StatusIndicator 
          status={overallStatus} 
          size="sm"
          showIcon 
        />
      </div>
      
      <div className="space-y-2">
        {services.map((service, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <StatusIndicator 
                status={service.status} 
                size="sm"
                showIcon 
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{service.name}</span>
                {service.description && (
                  <p className="text-xs text-gray-600">{service.description}</p>
                )}
              </div>
            </div>
            
            <div className="text-right">
              {service.responseTime && (
                <span className="text-xs text-gray-500">{service.responseTime}ms</span>
              )}
              {service.lastCheck && (
                <p className="text-xs text-gray-500">{service.lastCheck}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Training Job Status
interface TrainingJobStatusProps {
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  progress?: number
  eta?: string
  className?: string
  detailed?: boolean
}

export function TrainingJobStatus({
  status,
  progress,
  eta,
  className,
  detailed = false
}: TrainingJobStatusProps) {
  const getStatusType = (): StatusType => {
    switch (status) {
      case 'queued': return 'idle'
      case 'running': return 'running'
      case 'completed': return 'success'
      case 'failed': return 'error'
      case 'paused': return 'paused'
      default: return 'idle'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'queued': return 'Queued'
      case 'running': return `Running${progress ? ` (${progress}%)` : ''}`
      case 'completed': return 'Completed'
      case 'failed': return 'Failed'
      case 'paused': return 'Paused'
      default: return 'Unknown'
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <StatusIndicator 
        status={getStatusType()} 
        showIcon 
        showText
        text={getStatusText()}
      />
      
      {detailed && status === 'running' && (
        <div className="flex-1 min-w-0">
          {progress !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 whitespace-nowrap">{progress}%</span>
            </div>
          )}
          {eta && (
            <p className="text-xs text-gray-600">ETA: {eta}</p>
          )}
        </div>
      )}
    </div>
  )
}

// Resource Usage Indicator
interface ResourceUsageProps {
  label: string
  usage: number
  max?: number
  unit?: string
  status?: 'normal' | 'warning' | 'critical'
  className?: string
  showPercentage?: boolean
}

export function ResourceUsage({
  label,
  usage,
  max = 100,
  unit = '%',
  status,
  className,
  showPercentage = true
}: ResourceUsageProps) {
  const percentage = (usage / max) * 100
  
  const getStatus = (): StatusType => {
    if (status === 'critical') return 'error'
    if (status === 'warning') return 'warning'
    if (percentage > 90) return 'error'
    if (percentage > 75) return 'warning'
    return 'online'
  }

  const getBarColor = () => {
    const statusType = getStatus()
    switch (statusType) {
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{label}</span>
          <StatusIndicator status={getStatus()} size="xs" showIcon />
        </div>
        <span className="text-gray-600">
          {usage}{unit}{max !== 100 && ` / ${max}${unit}`}
          {showPercentage && ` (${Math.round(percentage)}%)`}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={cn('h-2 rounded-full transition-all duration-300', getBarColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

// API Status Component
interface APIStatusProps {
  endpoints: Array<{
    name: string
    status: 'up' | 'down' | 'degraded'
    responseTime?: number
    lastCheck?: string
  }>
  className?: string
}

export function APIStatus({ endpoints, className }: APIStatusProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="font-medium text-gray-900 text-sm">API Status</h4>
      {endpoints.map((endpoint, index) => (
        <div key={index} className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <StatusIndicator 
              status={endpoint.status === 'up' ? 'online' : endpoint.status === 'down' ? 'error' : 'warning'} 
              size="xs"
              showIcon 
            />
            <span className="text-sm text-gray-700">{endpoint.name}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {endpoint.responseTime && <span>{endpoint.responseTime}ms</span>}
            {endpoint.lastCheck && <span>{endpoint.lastCheck}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// Live Activity Indicator
interface LiveActivityProps {
  active: boolean
  label?: string
  className?: string
  pulseColor?: string
}

export function LiveActivity({ 
  active, 
  label = "Live", 
  className,
  pulseColor = "bg-red-500"
}: LiveActivityProps) {
  if (!active) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className={cn('w-2 h-2 rounded-full', pulseColor)} />
        <div className={cn('absolute inset-0 w-2 h-2 rounded-full animate-ping', pulseColor, 'opacity-75')} />
      </div>
      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
        {label}
      </span>
    </div>
  )
}

// Batch Status Updates Hook
export function useBatchStatusUpdates(
  statuses: Record<string, StatusType>,
  updateInterval = 5000
) {
  const [currentStatuses, setCurrentStatuses] = React.useState(statuses)
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatuses(statuses)
      setLastUpdate(new Date())
    }, updateInterval)

    return () => clearInterval(interval)
  }, [statuses, updateInterval])

  return { currentStatuses, lastUpdate }
}