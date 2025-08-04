import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const severity = searchParams.get('severity')
    const eventType = searchParams.get('type')
    const resolved = searchParams.get('resolved')
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: any[] = [limit, offset]
    let paramCount = 2

    if (severity) {
      paramCount++
      whereClause += ` AND severity = $${paramCount}`
      params.push(severity)
    }

    if (eventType) {
      paramCount++
      whereClause += ` AND event_type = $${paramCount}`
      params.push(eventType)
    }

    if (resolved !== null) {
      paramCount++
      whereClause += ` AND resolved = $${paramCount}`
      params.push(resolved === 'true')
    }

    // Get security events with user information
    const events = await query(`
      SELECT 
        se.id,
        se.event_type as type,
        se.severity,
        se.details,
        se.ip_address,
        se.user_agent,
        se.resolved,
        se.notes,
        se.created_at as timestamp,
        u.id as user_id,
        u.email as user_email,
        u.name as user_name,
        COALESCE(u.primary_role, 'user') as user_role
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      ${whereClause}
      ORDER BY se.created_at DESC, se.severity DESC
      LIMIT $1 OFFSET $2
    `, params)

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM security_events se
      ${whereClause.replace('LIMIT $1 OFFSET $2', '')}
    `, params.slice(2))

    // Get security statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE severity = 'critical' AND NOT resolved) as critical_alerts,
        COUNT(*) FILTER (WHERE event_type = 'failed_login' AND created_at > NOW() - INTERVAL '24 hours') as failed_logins_24h,
        (SELECT COUNT(*) FROM blocked_ips WHERE expires_at IS NULL OR expires_at > NOW()) as blocked_ips,
        (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW()) as active_sessions,
        COUNT(*) FILTER (WHERE event_type = 'suspicious_activity' AND NOT resolved) as suspicious_activity
      FROM security_events
      WHERE created_at > NOW() - INTERVAL '30 days'
    `)

    const totalEvents = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalEvents / limit)

    // Format events for response
    const formattedEvents = events.rows.map(row => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      user: {
        id: row.user_id,
        email: row.user_email || 'Unknown',
        name: row.user_name || 'Unknown User',
        role: row.user_role
      },
      details: {
        action: row.details?.action || 'Unknown action',
        resource: row.details?.resource,
        oldValue: row.details?.oldValue,
        newValue: row.details?.newValue,
        ip: row.ip_address,
        location: row.details?.location,
        device: row.details?.device,
        userAgent: row.user_agent
      },
      timestamp: row.timestamp,
      resolved: row.resolved,
      notes: row.notes
    }))

    return NextResponse.json({
      events: formattedEvents,
      stats: {
        totalEvents: parseInt(statsResult.rows[0].total_events),
        criticalAlerts: parseInt(statsResult.rows[0].critical_alerts),
        failedLogins24h: parseInt(statsResult.rows[0].failed_logins_24h),
        blockedIPs: parseInt(statsResult.rows[0].blocked_ips),
        activeSessions: parseInt(statsResult.rows[0].active_sessions),
        suspiciousActivity: parseInt(statsResult.rows[0].suspicious_activity)
      },
      pagination: {
        page,
        limit,
        totalEvents,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('Failed to fetch security events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    )
  }
})

export const POST = withAdminAuth(async (request: NextRequest, admin) => {
  try {
    const {
      eventType,
      severity,
      userId,
      details,
      ipAddress,
      userAgent
    } = await request.json()

    // Insert security event
    const result = await query(`
      INSERT INTO security_events (
        event_type, severity, user_id, details, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      eventType,
      severity,
      userId,
      JSON.stringify(details),
      ipAddress,
      userAgent
    ])

    // Log admin action
    await query(`
      INSERT INTO admin_audit_log (admin_email, action, resource, details, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [
      admin.email,
      'CREATE_SECURITY_EVENT',
      `security_event:${result.rows[0].id}`,
      JSON.stringify({ eventType, severity, userId })
    ])

    return NextResponse.json({
      success: true,
      eventId: result.rows[0].id
    })

  } catch (error) {
    console.error('Failed to create security event:', error)
    return NextResponse.json(
      { error: 'Failed to create security event' },
      { status: 500 }
    )
  }
})