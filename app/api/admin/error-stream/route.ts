import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { errorBroadcaster } from '@/lib/realtime-error-streaming'

// WebSocket connections store (in production, use Redis or similar)
const connections = new Map<string, {
  send: (data: string) => void
  filters?: any
  lastActivity: Date
}>()

// Cleanup inactive connections every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  for (const [id, connection] of connections) {
    if (connection.lastActivity < fiveMinutesAgo) {
      connections.delete(id)
    }
  }
}, 5 * 60 * 1000)

// Real-time stats cache
let lastStatsUpdate = new Date(0)
let cachedStats: any = null

async function getCurrentStats() {
  // Update stats every 30 seconds
  if (Date.now() - lastStatsUpdate.getTime() > 30000) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_errors,
          COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as unresolved_count,
          COUNT(CASE WHEN crisis_indicator = TRUE THEN 1 END) as crisis_count,
          COUNT(CASE WHEN grief_context_detected = TRUE THEN 1 END) as grief_context_count,
          COUNT(CASE WHEN memory_preservation_risk = TRUE THEN 1 END) as memory_risk_count,
          COUNT(CASE WHEN family_impact = 'severe' THEN 1 END) as severe_impact_count,
          COUNT(CASE WHEN timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as last_hour_count,
          COUNT(CASE WHEN timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24h_count,
          COUNT(DISTINCT family_id) as affected_families,
          AVG(CASE WHEN resolved_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (resolved_at - timestamp)) / 60 
          END) as avg_resolution_time_minutes
        FROM error_logs 
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `)
      
      cachedStats = {
        ...result.rows[0],
        total_errors: parseInt(result.rows[0].total_errors) || 0,
        unresolved_count: parseInt(result.rows[0].unresolved_count) || 0,
        crisis_count: parseInt(result.rows[0].crisis_count) || 0,
        grief_context_count: parseInt(result.rows[0].grief_context_count) || 0,
        memory_risk_count: parseInt(result.rows[0].memory_risk_count) || 0,
        severe_impact_count: parseInt(result.rows[0].severe_impact_count) || 0,
        last_hour_count: parseInt(result.rows[0].last_hour_count) || 0,
        last_24h_count: parseInt(result.rows[0].last_24h_count) || 0,
        affected_families: parseInt(result.rows[0].affected_families) || 0,
        avg_resolution_time_minutes: parseFloat(result.rows[0].avg_resolution_time_minutes) || 0,
        last_updated: new Date().toISOString()
      }
      
      lastStatsUpdate = new Date()
    } catch (error) {
      console.error('Failed to fetch error stats:', error)
    }
  }
  
  return cachedStats
}

// Broadcast stats to all connected clients
async function broadcastStats() {
  const stats = await getCurrentStats()
  if (stats) {
    const message = JSON.stringify({
      type: 'stats-update',
      payload: stats
    })
    
    for (const connection of connections.values()) {
      try {
        connection.send(message)
      } catch (error) {
        // Connection might be closed, will be cleaned up later
      }
    }
  }
}

// Broadcast stats every minute
setInterval(broadcastStats, 60000)

// Listen for new errors from the error logger
errorBroadcaster.on('new-error', (error) => {
  const message = JSON.stringify({
    type: 'new-error',
    payload: error
  })
  
  for (const [id, connection] of connections) {
    try {
      // Apply filters if set
      if (shouldSendToConnection(error, connection.filters)) {
        connection.send(message)
      }
    } catch (err) {
      // Remove failed connection
      connections.delete(id)
    }
  }
})

// Listen for crisis alerts
errorBroadcaster.on('crisis-detected', (crisis) => {
  const message = JSON.stringify({
    type: 'crisis-alert',
    payload: crisis
  })
  
  for (const [id, connection] of connections) {
    try {
      connection.send(message)
    } catch (err) {
      connections.delete(id)
    }
  }
})

// Listen for memory risks
errorBroadcaster.on('memory-risk', (error) => {
  const message = JSON.stringify({
    type: 'memory-risk',
    payload: error
  })
  
  for (const [id, connection] of connections) {
    try {
      connection.send(message)
    } catch (err) {
      connections.delete(id)
    }
  }
})

function shouldSendToConnection(error: any, filters?: any): boolean {
  if (!filters) return true
  
  if (filters.severity?.length && !filters.severity.includes(error.severity)) {
    return false
  }
  
  if (filters.familyImpact?.length && !filters.familyImpact.includes(error.familyImpact)) {
    return false
  }
  
  if (filters.crisisOnly && !error.crisisIndicator) {
    return false
  }
  
  if (filters.griefContextOnly && !error.griefContextDetected) {
    return false
  }
  
  if (filters.memoryPreservationOnly && !error.memoryPreservationRisk) {
    return false
  }
  
  if (filters.familyId && error.family?.id !== filters.familyId) {
    return false
  }
  
  return true
}

// This is a simplified WebSocket implementation
// In production, you'd use a proper WebSocket library or Server-Sent Events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to error stream' },
        { status: 403 }
      )
    }

    // For now, return Server-Sent Events instead of WebSocket
    // This is more compatible and easier to implement
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    })

    const encoder = new TextEncoder()
    const connectionId = Math.random().toString(36).substr(2, 9)

    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        connections.set(connectionId, {
          send: (data: string) => {
            try {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } catch (error) {
              // Connection closed
            }
          },
          lastActivity: new Date()
        })

        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          connectionId,
          timestamp: new Date().toISOString()
        })}\n\n`))

        // Send current stats
        getCurrentStats().then(stats => {
          if (stats) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'stats-update',
              payload: stats
            })}\n\n`))
          }
        })
      },
      cancel() {
        // Clean up connection
        connections.delete(connectionId)
      }
    })

    return new Response(stream, { headers })
    
  } catch (error) {
    console.error('Error establishing stream:', error)
    return NextResponse.json(
      { error: 'Failed to establish error stream' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to error stream' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, connectionId, filters } = body

    if (action === 'update-filters' && connectionId) {
      const connection = connections.get(connectionId)
      if (connection) {
        connection.filters = filters
        connection.lastActivity = new Date()
      }
    }

    if (action === 'request-stats') {
      const stats = await getCurrentStats()
      return NextResponse.json({
        success: true,
        data: stats
      })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error handling stream request:', error)
    return NextResponse.json(
      { error: 'Failed to handle stream request' },
      { status: 500 }
    )
  }
}

// Function to trigger error broadcasts (called from error logging system)
export async function broadcastNewError(errorData: any) {
  try {
    // Get full error details for broadcasting
    const errorResult = await db.query(`
      SELECT 
        el.*,
        ec.category_name,
        ec.category_code,
        u.name as user_name,
        u.email as user_email,
        family_user.name as family_name
      FROM error_logs el
      LEFT JOIN error_categories ec ON el.category_id = ec.id
      LEFT JOIN users u ON el.user_id = u.id
      LEFT JOIN users family_user ON el.family_id = family_user.id
      WHERE el.id = $1
    `, [errorData.id])

    if (errorResult.rows.length > 0) {
      const error = errorResult.rows[0]
      const streamedError = {
        id: error.id,
        errorId: error.error_id,
        title: error.title,
        message: error.message,
        severity: error.severity,
        familyImpact: error.family_impact,
        timestamp: error.timestamp,
        griefContextDetected: error.grief_context_detected,
        crisisIndicator: error.crisis_indicator,
        memoryPreservationRisk: error.memory_preservation_risk,
        escalationUrgency: error.escalation_urgency,
        affectedFeature: error.affected_feature,
        user: error.user_id ? {
          id: error.user_id,
          name: error.user_name,
          email: error.user_email
        } : null,
        family: error.family_id ? {
          id: error.family_id,
          name: error.family_name
        } : null,
        category: error.category_id ? {
          name: error.category_name,
          code: error.category_code
        } : null
      }

      // Broadcast through the event system
      errorBroadcaster.broadcastError(streamedError)
    }
  } catch (error) {
    console.error('Failed to broadcast error:', error)
  }
}