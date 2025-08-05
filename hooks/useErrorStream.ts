'use client'

// Client-side React hooks for real-time error streaming
import { useEffect, useState, useCallback } from 'react'
import { 
  ErrorStreamFilter, 
  StreamedError, 
  CrisisAlert, 
  ClientErrorStreamManager 
} from '@/lib/realtime-error-streaming'

export function useErrorStream(filters?: ErrorStreamFilter) {
  const [errors, setErrors] = useState<StreamedError[]>([])
  const [crises, setCrises] = useState<CrisisAlert[]>([])
  const [connected, setConnected] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [streamManager] = useState(() => new ClientErrorStreamManager())

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribeConnection = streamManager.onConnectionChange(setConnected)

    // Subscribe to new errors
    const unsubscribeErrors = streamManager.onError((error) => {
      setErrors(prev => [error, ...prev.slice(0, 99)]) // Keep last 100 errors
    })

    // Subscribe to crises
    const unsubscribeCrises = streamManager.onCrisis((crisis) => {
      setCrises(prev => [crisis, ...prev.slice(0, 49)]) // Keep last 50 crises
    })

    // Subscribe to stats updates
    const unsubscribeStats = streamManager.onStatsUpdate(setStats)

    // Request initial stats
    streamManager.requestStats()

    return () => {
      unsubscribeConnection()
      unsubscribeErrors()
      unsubscribeCrises()
      unsubscribeStats()
    }
  }, [streamManager])

  // Update filters when they change
  useEffect(() => {
    if (filters) {
      streamManager.updateFilters(filters)
    }
  }, [filters, streamManager])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const clearCrises = useCallback(() => {
    setCrises([])
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }, [])

  return {
    errors,
    crises,
    stats,
    connected,
    clearErrors,
    clearCrises,
    requestNotificationPermission,
    updateFilters: streamManager.updateFilters.bind(streamManager),
    requestStats: streamManager.requestStats.bind(streamManager)
  }
}

// Hook for specifically monitoring family crises
export function useFamilyCrisisMonitor(familyId?: number) {
  const filters = familyId ? { familyId, crisisOnly: true } : { crisisOnly: true }
  const { crises, connected } = useErrorStream(filters)
  
  const [activeCrises, setActiveCrises] = useState<CrisisAlert[]>([])
  
  useEffect(() => {
    // Filter for unresolved crises
    const active = crises.filter(crisis => {
      // In a real implementation, you'd check if the crisis is still active
      const hoursAgo = (Date.now() - new Date(crisis.timestamp).getTime()) / (1000 * 60 * 60)
      return hoursAgo < 24 // Consider crises active for 24 hours
    })
    setActiveCrises(active)
  }, [crises])

  return {
    activeCrises,
    allCrises: crises,
    connected,
    hasCriticalCrises: activeCrises.some(c => c.crisisLevel === 'critical'),
    crisisCount: activeCrises.length
  }
}