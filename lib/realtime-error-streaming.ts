// Real-time Error Streaming System for Grief-Sensitive Family Legacy Platform
// Provides live error monitoring with crisis detection and family impact assessment

import { EventEmitter } from 'events'

interface ErrorStreamFilter {
  severity?: string[]
  familyImpact?: string[]
  crisisOnly?: boolean
  griefContextOnly?: boolean
  memoryPreservationOnly?: boolean
  familyId?: number
  categoryCode?: string[]
}

interface StreamedError {
  id: number
  errorId: string
  title: string
  message: string
  severity: string
  familyImpact: string
  timestamp: string
  griefContextDetected: boolean
  crisisIndicator: boolean
  memoryPreservationRisk: boolean
  escalationUrgency: string
  affectedFeature?: string
  user?: {
    id: number
    name: string
    email: string
  }
  family?: {
    id: number
    name: string
  }
  category?: {
    name: string
    code: string
  }
}

interface CrisisAlert {
  errorId: string
  crisisLevel: string
  familyId?: number
  userId?: number
  message: string
  immediateActions: string[]
  supportResources: string[]
  timestamp: string
}

// Server-side EventEmitter for broadcasting error events
class ErrorEventBroadcaster extends EventEmitter {
  private static instance: ErrorEventBroadcaster

  static getInstance(): ErrorEventBroadcaster {
    if (!ErrorEventBroadcaster.instance) {
      ErrorEventBroadcaster.instance = new ErrorEventBroadcaster()
    }
    return ErrorEventBroadcaster.instance
  }

  // Broadcast new error to all listening admin clients
  broadcastError(error: StreamedError) {
    this.emit('new-error', error)
    
    // Emit specific events for different types
    if (error.crisisIndicator) {
      this.emit('crisis-detected', {
        errorId: error.errorId,
        crisisLevel: error.escalationUrgency,
        familyId: error.family?.id,
        userId: error.user?.id,
        message: error.message,
        timestamp: error.timestamp
      } as CrisisAlert)
    }
    
    if (error.memoryPreservationRisk) {
      this.emit('memory-risk', error)
    }
    
    if (error.griefContextDetected) {
      this.emit('grief-context', error)
    }
    
    if (error.familyImpact === 'severe') {
      this.emit('severe-family-impact', error)
    }
  }

  // Subscribe to specific error types
  subscribeToErrors(callback: (error: StreamedError) => void, filter?: ErrorStreamFilter) {
    const wrappedCallback = (error: StreamedError) => {
      if (this.matchesFilter(error, filter)) {
        callback(error)
      }
    }
    
    this.on('new-error', wrappedCallback)
    return () => this.off('new-error', wrappedCallback)
  }

  subscribeToCrises(callback: (alert: CrisisAlert) => void) {
    this.on('crisis-detected', callback)
    return () => this.off('crisis-detected', callback)
  }

  subscribeToMemoryRisks(callback: (error: StreamedError) => void) {
    this.on('memory-risk', callback)
    return () => this.off('memory-risk', callback)
  }

  private matchesFilter(error: StreamedError, filter?: ErrorStreamFilter): boolean {
    if (!filter) return true

    if (filter.severity?.length && !filter.severity.includes(error.severity)) {
      return false
    }

    if (filter.familyImpact?.length && !filter.familyImpact.includes(error.familyImpact)) {
      return false
    }

    if (filter.crisisOnly && !error.crisisIndicator) {
      return false
    }

    if (filter.griefContextOnly && !error.griefContextDetected) {
      return false
    }

    if (filter.memoryPreservationOnly && !error.memoryPreservationRisk) {
      return false
    }

    if (filter.familyId && error.family?.id !== filter.familyId) {
      return false
    }

    if (filter.categoryCode?.length && !filter.categoryCode.includes(error.category?.code || '')) {
      return false
    }

    return true
  }
}

// Client-side real-time error stream manager
class ClientErrorStreamManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnected = false
  private eventEmitter = new EventEmitter()
  private activeFilters: ErrorStreamFilter = {}

  constructor() {
    this.connect()
  }

  private connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/admin/error-stream`
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('🔴 Error stream connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.eventEmitter.emit('connected')
        
        // Send current filters to server
        if (Object.keys(this.activeFilters).length > 0) {
          this.updateFilters(this.activeFilters)
        }
      }
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      this.ws.onclose = () => {
        console.log('🔴 Error stream disconnected')
        this.isConnected = false
        this.eventEmitter.emit('disconnected')
        this.attemptReconnect()
      }
      
      this.ws.onerror = (error) => {
        console.error('Error stream error:', error)
        this.eventEmitter.emit('error', error)
      }
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error)
      this.attemptReconnect()
    }
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'new-error':
        this.eventEmitter.emit('error', data.payload)
        break
      case 'crisis-alert':
        this.eventEmitter.emit('crisis', data.payload)
        // Show immediate crisis notification
        this.showCrisisNotification(data.payload)
        break
      case 'memory-risk':
        this.eventEmitter.emit('memory-risk', data.payload)
        break
      case 'grief-context':
        this.eventEmitter.emit('grief-context', data.payload)
        break
      case 'stats-update':
        this.eventEmitter.emit('stats', data.payload)
        break
      default:
        console.warn('Unknown message type:', data.type)
    }
  }

  private showCrisisNotification(crisis: CrisisAlert) {
    // Show browser notification for critical crises
    if (crisis.crisisLevel === 'critical' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🚨 Family Crisis Detected', {
          body: `Immediate attention required: ${crisis.message}`,
          icon: '/favicon.ico',
          tag: `crisis-${crisis.errorId}`,
          requireInteraction: true
        })
      }
    }

    // Dispatch custom event for UI components to handle
    window.dispatchEvent(new CustomEvent('crisis-alert', {
      detail: crisis
    }))
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.eventEmitter.emit('max-reconnects-reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect()
    }, delay)
  }

  // Public methods for subscribing to events
  onError(callback: (error: StreamedError) => void) {
    this.eventEmitter.on('error', callback)
    return () => this.eventEmitter.off('error', callback)
  }

  onCrisis(callback: (crisis: CrisisAlert) => void) {
    this.eventEmitter.on('crisis', callback)
    return () => this.eventEmitter.off('crisis', callback)
  }

  onMemoryRisk(callback: (error: StreamedError) => void) {
    this.eventEmitter.on('memory-risk', callback)
    return () => this.eventEmitter.off('memory-risk', callback)
  }

  onGriefContext(callback: (error: StreamedError) => void) {
    this.eventEmitter.on('grief-context', callback)
    return () => this.eventEmitter.off('grief-context', callback)
  }

  onStatsUpdate(callback: (stats: any) => void) {
    this.eventEmitter.on('stats', callback)
    return () => this.eventEmitter.off('stats', callback)
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.eventEmitter.on('connected', () => callback(true))
    this.eventEmitter.on('disconnected', () => callback(false))
    return () => {
      this.eventEmitter.off('connected', () => callback(true))
      this.eventEmitter.off('disconnected', () => callback(false))
    }
  }

  // Update stream filters
  updateFilters(filters: ErrorStreamFilter) {
    this.activeFilters = filters
    
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'update-filters',
        filters
      }))
    }
  }

  // Request current stats
  requestStats() {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({
        type: 'request-stats'
      }))
    }
  }

  // Close connection
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  get connected() {
    return this.isConnected
  }
}

// Export the broadcaster for server-side use
export const errorBroadcaster = ErrorEventBroadcaster.getInstance()

// Export types and classes for client-side use
export type { ErrorStreamFilter, StreamedError, CrisisAlert }
export { ClientErrorStreamManager }