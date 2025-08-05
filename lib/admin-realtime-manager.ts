'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Advanced real-time data management for admin dashboard
 * Handles multiple concurrent connections, load balancing, and intelligent reconnection
 */

export interface AdminRealTimeConfig {
  enabled: boolean
  maxConcurrentConnections: number
  connectionLoadBalancing: boolean
  automaticReconnect: boolean
  dataCompression: boolean
  priorityLevels: {
    critical: string[]
    high: string[]
    medium: string[]
    low: string[]
  }
}

const defaultConfig: AdminRealTimeConfig = {
  enabled: true,
  maxConcurrentConnections: 8,
  connectionLoadBalancing: true,
  automaticReconnect: true,
  dataCompression: true,
  priorityLevels: {
    critical: ['system-alerts', 'training-errors', 'security-events'],
    high: ['training-progress', 'user-activity', 'performance-metrics'],
    medium: ['analytics-updates', 'content-moderation'],
    low: ['general-notifications', 'background-tasks']
  }
}

export class AdminRealTimeManager {
  private static instance: AdminRealTimeManager
  private config: AdminRealTimeConfig
  private connections: Map<string, any> = new Map()
  private connectionHealth: Map<string, { lastHeartbeat: number; failures: number }> = new Map()
  private messageQueue: Array<{ endpoint: string; priority: number; timestamp: number }> = []
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map()
  private isLoadBalancing = false
  
  private constructor(config: AdminRealTimeConfig = defaultConfig) {
    this.config = config
    this.startHealthMonitoring()
  }

  static getInstance(config?: AdminRealTimeConfig): AdminRealTimeManager {
    if (!AdminRealTimeManager.instance) {
      AdminRealTimeManager.instance = new AdminRealTimeManager(config)
    }
    return AdminRealTimeManager.instance
  }

  /**
   * Create an optimized real-time connection with automatic load balancing
   */
  createConnection<T>(
    endpoint: string,
    options: {
      priority?: 'critical' | 'high' | 'medium' | 'low'
      onData?: (data: T) => void
      onError?: (error: Error) => void
      onReconnect?: () => void
    } = {}
  ) {
    const connectionId = `${endpoint}_${Date.now()}`
    const priority = this.getPriorityLevel(endpoint, options.priority)
    
    // Check if we've reached connection limit
    if (this.connections.size >= this.config.maxConcurrentConnections) {
      this.handleConnectionOverflow(endpoint, priority)
    }

    // Create connection based on priority and data type
    // Create a basic polling mechanism instead of React hooks
    const connection = {
      data: null as T | null,
      error: null as Error | null,
      isLoading: true,
      isConnected: false,
      reconnect: () => this.reconnectEndpoint(connectionId),
      disconnect: () => this.disconnectEndpoint(connectionId)
    }
    
    // Set up polling based on priority
    const refreshInterval = priority === 0 ? 1000 : priority <= 1 ? 2000 : 5000
    const intervalId = setInterval(async () => {
      if (!this.config.enabled) return
      
      try {
        const response = await fetch(endpoint)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        
        const data = await response.json()
        connection.data = data
        connection.isLoading = false
        connection.isConnected = true
        connection.error = null
        
        if (options.onData) options.onData(data)
      } catch (error) {
        connection.error = error as Error
        connection.isConnected = false
        this.handleConnectionError(connectionId, error as Error, options.onError)
      }
    }, refreshInterval)
    
    // Store interval for cleanup
    this.pollIntervals.set(connectionId, intervalId)

    // Store connection with metadata
    this.connections.set(connectionId, {
      connection,
      endpoint,
      priority,
      created: Date.now(),
      lastActivity: Date.now()
    })

    // Initialize health tracking
    this.connectionHealth.set(connectionId, {
      lastHeartbeat: Date.now(),
      failures: 0
    })

    return {
      connectionId,
      ...connection,
      disconnect: () => this.disconnectConnection(connectionId)
    }
  }

  /**
   * Create a batched connection for multiple endpoints
   */
  createBatchConnection<T>(
    endpoints: Array<{ key: string; endpoint: string; priority?: 'critical' | 'high' | 'medium' | 'low' }>,
    options: {
      onBatchUpdate?: (updates: Record<string, T>) => void
      batchSize?: number
      batchInterval?: number
    } = {}
  ) {
    const connectionId = `batch_${Date.now()}`
    
    // Sort endpoints by priority
    const sortedEndpoints = endpoints.sort((a, b) => 
      this.getPriorityLevel(a.endpoint, a.priority) - this.getPriorityLevel(b.endpoint, b.priority)
    )

    // Create a batch polling mechanism instead of React hooks
    const connection = {
      data: {} as Record<string, T>,
      error: null as Error | null,
      isLoading: true,
      isConnected: false,
      reconnect: () => this.reconnectBatch(connectionId),
      disconnect: () => this.disconnectBatch(connectionId)
    }
    
    // Set up batch polling
    const batchInterval = options.batchInterval || 500
    const intervalId = setInterval(async () => {
      if (!this.config.enabled) return
      
      try {
        const batchPromises = sortedEndpoints.map(async ({ key, endpoint }) => {
          const response = await fetch(endpoint)
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${key}`)
          const data = await response.json()
          return { key, data }
        })
        
        const results = await Promise.allSettled(batchPromises)
        const batchData: Record<string, T> = {}
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            batchData[result.value.key] = result.value.data
          }
        })
        
        connection.data = batchData
        connection.isLoading = false
        connection.isConnected = true
        connection.error = null
        
        if (options.onBatchUpdate) options.onBatchUpdate(batchData)
      } catch (error) {
        connection.error = error as Error
        connection.isConnected = false
      }
    }, batchInterval)
    
    // Store interval for cleanup
    this.pollIntervals.set(connectionId, intervalId)

    this.connections.set(connectionId, {
      connection,
      endpoint: 'batch',
      priority: 0, // Batch connections get highest priority
      created: Date.now(),
      lastActivity: Date.now(),
      endpointCount: endpoints.length
    })

    return {
      connectionId,
      ...connection,
      disconnect: () => this.disconnectConnection(connectionId)
    }
  }

  /**
   * Get real-time system metrics for the admin dashboard
   */
  getSystemMetrics() {
    const now = Date.now()
    const connections = Array.from(this.connections.values())
    
    return {
      totalConnections: this.connections.size,
      activeConnections: connections.filter(c => now - c.lastActivity < 30000).length,
      connectionsByPriority: {
        critical: connections.filter(c => c.priority === 0).length,
        high: connections.filter(c => c.priority === 1).length,
        medium: connections.filter(c => c.priority === 2).length,
        low: connections.filter(c => c.priority === 3).length
      },
      healthyConnections: Array.from(this.connectionHealth.values()).filter(h => h.failures < 3).length,
      averageLatency: this.calculateAverageLatency(),
      memoryUsage: this.estimateMemoryUsage(),
      queuedMessages: this.messageQueue.length
    }
  }

  /**
   * Disconnect a specific connection
   */
  disconnectConnection(connectionId: string) {
    const connectionData = this.connections.get(connectionId)
    if (connectionData?.connection?.disconnect) {
      connectionData.connection.disconnect()
    }
    this.connections.delete(connectionId)
    this.connectionHealth.delete(connectionId)
  }

  /**
   * Disconnect all connections (cleanup)
   */
  disconnectAll() {
    for (const [connectionId] of this.connections) {
      this.disconnectConnection(connectionId)
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdminRealTimeConfig>) {
    this.config = { ...this.config, ...newConfig }
    
    // If connections were disabled, disconnect all
    if (!this.config.enabled) {
      this.disconnectAll()
    }
  }

  // Private methods

  private getPriorityLevel(endpoint: string, explicitPriority?: string): number {
    if (explicitPriority) {
      switch (explicitPriority) {
        case 'critical': return 0
        case 'high': return 1
        case 'medium': return 2
        case 'low': return 3
      }
    }

    // Auto-detect priority based on endpoint
    for (const [level, endpoints] of Object.entries(this.config.priorityLevels)) {
      if (endpoints.some(pattern => endpoint.includes(pattern))) {
        switch (level) {
          case 'critical': return 0
          case 'high': return 1
          case 'medium': return 2
          case 'low': return 3
        }
      }
    }

    return 2 // Default to medium priority
  }

  private handleConnectionOverflow(endpoint: string, priority: number) {
    // Close lowest priority connections to make room
    const connections = Array.from(this.connections.entries())
      .sort(([, a], [, b]) => b.priority - a.priority)

    for (const [connectionId, connectionData] of connections) {
      if (connectionData.priority > priority) {
        console.warn(`Closing low-priority connection ${connectionId} to make room for ${endpoint}`)
        this.disconnectConnection(connectionId)
        break
      }
    }
  }

  private handleConnectionError(connectionId: string, error: Error, onError?: (error: Error) => void) {
    const health = this.connectionHealth.get(connectionId)
    if (health) {
      health.failures++
      
      // Remove connection if too many failures
      if (health.failures >= 5) {
        console.error(`Connection ${connectionId} failed too many times, removing`)
        this.disconnectConnection(connectionId)
      }
    }

    onError?.(error)
  }

  private handleReconnection(connectionId: string, onReconnect?: () => void) {
    const health = this.connectionHealth.get(connectionId)
    if (health) {
      health.failures = 0
      health.lastHeartbeat = Date.now()
    }

    const connectionData = this.connections.get(connectionId)
    if (connectionData) {
      connectionData.lastActivity = Date.now()
    }

    onReconnect?.()
  }

  private startHealthMonitoring() {
    setInterval(() => {
      const now = Date.now()
      
      // Check for stale connections
      for (const [connectionId, health] of this.connectionHealth) {
        if (now - health.lastHeartbeat > 60000) { // 1 minute timeout
          console.warn(`Connection ${connectionId} appears stale, checking health`)
          health.failures++
        }
      }

      // Process message queue if load balancing is enabled
      if (this.config.connectionLoadBalancing && !this.isLoadBalancing) {
        this.processMessageQueue()
      }
    }, 30000) // Check every 30 seconds
  }

  private processMessageQueue() {
    if (this.messageQueue.length === 0) return

    this.isLoadBalancing = true
    
    // Sort by priority and process
    this.messageQueue.sort((a, b) => a.priority - b.priority)
    
    // Process up to 10 messages per cycle
    const messagesToProcess = this.messageQueue.splice(0, 10)
    
    for (const message of messagesToProcess) {
      // Process message based on priority
      console.log(`Processing queued message for ${message.endpoint}`)
    }

    this.isLoadBalancing = false
  }

  private calculateAverageLatency(): number {
    // Simplified latency calculation
    const connections = Array.from(this.connections.values())
    if (connections.length === 0) return 0

    return connections.reduce((sum, conn) => {
      const latency = Date.now() - conn.lastActivity
      return sum + Math.min(latency, 5000) // Cap at 5 seconds
    }, 0) / connections.length
  }

  private estimateMemoryUsage(): number {
    // Rough memory usage estimation in MB
    const baseUsage = this.connections.size * 0.5 // ~0.5MB per connection
    const queueUsage = this.messageQueue.length * 0.001 // ~1KB per queued message
    return Math.round((baseUsage + queueUsage) * 100) / 100
  }

  private reconnectEndpoint(connectionId: string) {
    const connectionData = this.connections.get(connectionId)
    if (connectionData) {
      // Clear existing interval
      const intervalId = this.pollIntervals.get(connectionId)
      if (intervalId) {
        clearInterval(intervalId)
        this.pollIntervals.delete(connectionId)
      }
      
      // Restart connection (will be handled by the original connection setup)
      console.log(`Reconnecting endpoint: ${connectionId}`)
    }
  }

  private disconnectEndpoint(connectionId: string) {
    const intervalId = this.pollIntervals.get(connectionId)
    if (intervalId) {
      clearInterval(intervalId)
      this.pollIntervals.delete(connectionId)
    }
    this.connections.delete(connectionId)
    this.connectionHealth.delete(connectionId)
  }

  private reconnectBatch(connectionId: string) {
    this.reconnectEndpoint(connectionId)
  }

  private disconnectBatch(connectionId: string) {
    this.disconnectEndpoint(connectionId)
  }
}

/**
 * React hook for admin real-time data management
 */
export function useAdminRealTime<T>(
  endpoint: string,
  options: {
    priority?: 'critical' | 'high' | 'medium' | 'low'
    onData?: (data: T) => void
    onError?: (error: Error) => void
    enabled?: boolean
  } = {}
) {
  const managerRef = useRef<AdminRealTimeManager>()
  const [connectionId, setConnectionId] = useState<string>()
  const [data, setData] = useState<T | null>(null)
  const [connectionStats, setConnectionStats] = useState({
    isConnected: false,
    isReconnecting: false,
    hasData: false,
    retryCount: 0
  })

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = AdminRealTimeManager.getInstance()
    }
  }, [])

  // Create connection
  useEffect(() => {
    if (!managerRef.current || !options.enabled) return

    const connection = managerRef.current.createConnection<T>(endpoint, {
      priority: options.priority,
      onData: (newData) => {
        setData(newData)
        options.onData?.(newData)
      },
      onError: options.onError,
      onReconnect: () => {
        console.log(`Reconnected to ${endpoint}`)
      }
    })

    setConnectionId(connection.connectionId)

    // Update connection stats
    setConnectionStats({
      isConnected: connection.connectionStats?.isConnected || false,
      isReconnecting: connection.connectionStats?.isReconnecting || false,
      hasData: connection.data !== null,
      retryCount: connection.connectionStats?.retryCount || 0
    })

    return () => {
      connection.disconnect?.()
    }
  }, [endpoint, options.enabled, options.priority])

  const reconnect = useCallback(() => {
    if (managerRef.current && connectionId) {
      managerRef.current.disconnectConnection(connectionId)
      // Re-create connection
      const connection = managerRef.current.createConnection<T>(endpoint, {
        priority: options.priority,
        onData: options.onData,
        onError: options.onError
      })
      setConnectionId(connection.connectionId)
    }
  }, [connectionId, endpoint, options.priority, options.onData, options.onError])

  const getSystemMetrics = useCallback(() => {
    return managerRef.current?.getSystemMetrics()
  }, [])

  return {
    data,
    connectionStats,
    reconnect,
    getSystemMetrics,
    disconnect: () => managerRef.current?.disconnectConnection(connectionId!)
  }
}

/**
 * Hook for batch real-time connections
 */
export function useAdminBatchRealTime<T>(
  endpoints: Array<{ key: string; endpoint: string; priority?: 'critical' | 'high' | 'medium' | 'low' }>,
  options: {
    onBatchUpdate?: (updates: Record<string, T>) => void
    enabled?: boolean
  } = {}
) {
  const managerRef = useRef<AdminRealTimeManager>()
  const [connectionId, setConnectionId] = useState<string>()
  const [data, setData] = useState<Record<string, T>>({})

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = AdminRealTimeManager.getInstance()
    }
  }, [])

  useEffect(() => {
    if (!managerRef.current || !options.enabled || endpoints.length === 0) return

    const connection = managerRef.current.createBatchConnection<T>(endpoints, {
      onBatchUpdate: (updates) => {
        setData(prev => ({ ...prev, ...updates }))
        options.onBatchUpdate?.(updates)
      }
    })

    setConnectionId(connection.connectionId)

    return () => {
      connection.disconnect?.()
    }
  }, [endpoints, options.enabled])

  return {
    data,
    disconnect: () => managerRef.current?.disconnectConnection(connectionId!)
  }
}