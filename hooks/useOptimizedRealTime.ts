'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'

// Custom hook for optimized real-time data management
export function useOptimizedRealTime<T>(
  endpoint: string,
  options: {
    enabled?: boolean
    refreshInterval?: number
    maxHistorySize?: number
    throttleMs?: number
    onError?: (error: Error) => void
    onReconnect?: () => void
    retryAttempts?: number
    retryDelay?: number
  } = {}
) {
  const {
    enabled = true,
    refreshInterval = 2000,
    maxHistorySize = 100,
    throttleMs = 100,
    onError,
    onReconnect,
    retryAttempts = 3,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(null)
  const [history, setHistory] = useState<Array<{ timestamp: number; data: T }>>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const lastDataRef = useRef<T | null>(null)
  const throttleTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Throttled data update function
  const updateData = useCallback((newData: T) => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current)
    }

    throttleTimeoutRef.current = setTimeout(() => {
      const now = Date.now()
      
      // Only update if data has actually changed
      if (JSON.stringify(newData) !== JSON.stringify(lastDataRef.current)) {
        setData(newData)
        setLastUpdate(now)
        lastDataRef.current = newData

        // Add to history with size limit
        setHistory(prev => {
          const newHistory = [...prev, { timestamp: now, data: newData }]
          return newHistory.slice(-maxHistorySize)
        })
      }
    }, throttleMs)
  }, [throttleMs, maxHistorySize])

  // Connection management
  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return

    try {
      setError(null)
      setIsReconnecting(true)

      const eventSource = new EventSource(endpoint)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setIsReconnecting(false)
        retryCountRef.current = 0
        onReconnect?.()
      }

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data)
          updateData(parsedData)
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        eventSource.close()
        eventSourceRef.current = null

        // Retry logic
        if (retryCountRef.current < retryAttempts) {
          retryCountRef.current++
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1) // Exponential backoff
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          const connectionError = new Error(`Failed to connect to ${endpoint} after ${retryAttempts} attempts`)
          setError(connectionError)
          onError?.(connectionError)
        }
      }

    } catch (connectionError) {
      const error = connectionError instanceof Error ? connectionError : new Error('Connection failed')
      setError(error)
      onError?.(error)
    }
  }, [enabled, endpoint, updateData, onError, onReconnect, retryAttempts, retryDelay])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current)
    }

    setIsConnected(false)
    setIsReconnecting(false)
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    retryCountRef.current = 0
    setTimeout(connect, 100)
  }, [disconnect, connect])

  // Auto-connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return disconnect
  }, [enabled, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Memoized derived state
  const connectionStats = useMemo(() => ({
    isConnected,
    isReconnecting,
    hasData: data !== null,
    historySize: history.length,
    lastUpdate: lastUpdate > 0 ? new Date(lastUpdate) : null,
    retryCount: retryCountRef.current
  }), [isConnected, isReconnecting, data, history.length, lastUpdate])

  return {
    data,
    history,
    error,
    connectionStats,
    reconnect,
    disconnect
  }
}

// Hook for batched real-time updates
export function useBatchedRealTime<T>(
  endpoints: Array<{ key: string; endpoint: string }>,
  options: {
    enabled?: boolean
    batchSize?: number
    batchInterval?: number
    onBatchUpdate?: (updates: Record<string, T>) => void
  } = {}
) {
  const {
    enabled = true,
    batchSize = 5,
    batchInterval = 500,
    onBatchUpdate
  } = options

  const [batchedData, setBatchedData] = useState<Record<string, T>>({})
  const pendingUpdatesRef = useRef<Record<string, T>>({})
  const batchTimeoutRef = useRef<NodeJS.Timeout>()

  const processBatch = useCallback(() => {
    if (Object.keys(pendingUpdatesRef.current).length === 0) return

    const updates = { ...pendingUpdatesRef.current }
    pendingUpdatesRef.current = {}

    setBatchedData(prev => ({ ...prev, ...updates }))
    onBatchUpdate?.(updates)
  }, [onBatchUpdate])

  const addToBatch = useCallback((key: string, data: T) => {
    pendingUpdatesRef.current[key] = data

    // Process batch if it reaches the size limit
    if (Object.keys(pendingUpdatesRef.current).length >= batchSize) {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
      processBatch()
      return
    }

    // Schedule batch processing
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }

    batchTimeoutRef.current = setTimeout(processBatch, batchInterval)
  }, [batchSize, batchInterval, processBatch])

  // Set up individual connections
  const connections = endpoints.map(({ key, endpoint }) => 
    useOptimizedRealTime<T>(endpoint, {
      enabled,
      onError: (error) => console.error(`Error in ${key}:`, error)
    })
  )

  // Update batch when individual connections receive data
  useEffect(() => {
    connections.forEach(({ data }, index) => {
      if (data) {
        addToBatch(endpoints[index].key, data)
      }
    })
  }, [connections.map(c => c.data), addToBatch, endpoints])

  // Cleanup
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
    }
  }, [])

  const overallStats = useMemo(() => {
    const connectedCount = connections.filter(c => c.connectionStats.isConnected).length
    const hasErrors = connections.some(c => c.error)
    const isReconnecting = connections.some(c => c.connectionStats.isReconnecting)

    return {
      connectedCount,
      totalCount: connections.length,
      hasErrors,
      isReconnecting,
      allConnected: connectedCount === connections.length
    }
  }, [connections])

  return {
    data: batchedData,
    connections,
    stats: overallStats,
    reconnectAll: () => connections.forEach(c => c.reconnect())
  }
}

// Hook for memory-efficient data streaming
export function useMemoryEfficientStream<T>(
  endpoint: string,
  options: {
    enabled?: boolean
    maxMemoryMB?: number
    sampleRate?: number
    compressionEnabled?: boolean
  } = {}
) {
  const {
    enabled = true,
    maxMemoryMB = 50,
    sampleRate = 1, // Keep every nth item
    compressionEnabled = true
  } = options

  const [currentData, setCurrentData] = useState<T | null>(null)
  const [memoryUsage, setMemoryUsage] = useState(0)
  const [itemCount, setItemCount] = useState(0)
  const sampleCounterRef = useRef(0)
  const compressedDataRef = useRef<string[]>([])

  const estimateMemoryUsage = useCallback((data: any): number => {
    const jsonString = JSON.stringify(data)
    return new Blob([jsonString]).size / (1024 * 1024) // Convert to MB
  }, [])

  const compressData = useCallback((data: T): string => {
    if (!compressionEnabled) return JSON.stringify(data)
    
    // Simple compression - in production, use a proper compression library
    const jsonString = JSON.stringify(data)
    return btoa(jsonString) // Base64 encoding as simple compression
  }, [compressionEnabled])

  const { data, history, error, connectionStats, reconnect } = useOptimizedRealTime<T>(
    endpoint,
    {
      enabled,
      maxHistorySize: 0, // Disable built-in history for memory efficiency
      onError: (error) => console.error('Memory-efficient stream error:', error)
    }
  )

  // Process incoming data with memory management
  useEffect(() => {
    if (!data) return

    setCurrentData(data)
    sampleCounterRef.current++

    // Sample data based on rate
    if (sampleCounterRef.current % sampleRate === 0) {
      const dataSize = estimateMemoryUsage(data)
      
      // Check memory limit
      if (memoryUsage + dataSize > maxMemoryMB) {
        // Remove oldest compressed data to make room
        compressedDataRef.current = compressedDataRef.current.slice(10)
        setMemoryUsage(prev => prev * 0.8) // Estimate reduction
      }

      // Add compressed data
      const compressed = compressData(data)
      compressedDataRef.current.push(compressed)
      
      setMemoryUsage(prev => prev + dataSize)
      setItemCount(prev => prev + 1)
    }
  }, [data, sampleRate, estimateMemoryUsage, compressData, memoryUsage, maxMemoryMB])

  const getHistoricalData = useCallback((count: number = 10): T[] => {
    if (!compressionEnabled) return []
    
    const recentCompressed = compressedDataRef.current.slice(-count)
    return recentCompressed.map(compressed => {
      try {
        const jsonString = atob(compressed)
        return JSON.parse(jsonString)
      } catch (error) {
        console.error('Failed to decompress data:', error)
        return null
      }
    }).filter(Boolean)
  }, [compressionEnabled])

  const clearMemory = useCallback(() => {
    compressedDataRef.current = []
    setMemoryUsage(0)
    setItemCount(0)
    sampleCounterRef.current = 0
  }, [])

  return {
    currentData,
    error,
    connectionStats,
    memoryStats: {
      usageMB: Math.round(memoryUsage * 100) / 100,
      maxMB: maxMemoryMB,
      itemCount,
      compressionRatio: compressionEnabled ? itemCount / compressedDataRef.current.length : 1
    },
    getHistoricalData,
    clearMemory,
    reconnect
  }
}

// Hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    lastUpdate: Date.now()
  })

  const performanceRef = useRef<{
    renderStart: number
    renderCount: number
  }>({
    renderStart: 0,
    renderCount: 0
  })

  const startRender = useCallback(() => {
    performanceRef.current.renderStart = performance.now()
  }, [])

  const endRender = useCallback(() => {
    const renderTime = performance.now() - performanceRef.current.renderStart
    performanceRef.current.renderCount++

    setMetrics(prev => ({
      ...prev,
      renderTime: Math.round(renderTime * 100) / 100,
      lastUpdate: Date.now()
    }))
  }, [])

  // Monitor memory usage (if available)
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100
        }))
      }
    }

    const interval = setInterval(updateMemoryUsage, 5000)
    updateMemoryUsage()

    return () => clearInterval(interval)
  }, [])

  return {
    metrics,
    startRender,
    endRender,
    resetMetrics: () => {
      performanceRef.current = { renderStart: 0, renderCount: 0 }
      setMetrics({
        renderTime: 0,
        memoryUsage: 0,
        componentCount: 0,
        lastUpdate: Date.now()
      })
    }
  }
}