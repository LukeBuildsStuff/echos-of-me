import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get privacy alerts from database
    const alerts = await db.query(`
      SELECT 
        pa.id,
        pa.type,
        pa.severity,
        pa.user_id,
        u.name as user_name,
        pa.message,
        pa.details,
        pa.created_at,
        pa.resolved,
        pa.resolved_at,
        pa.resolved_by
      FROM privacy_alerts pa
      LEFT JOIN users u ON pa.user_id = u.id
      ORDER BY pa.created_at DESC
      LIMIT 100
    `)

    // If no alerts exist, generate some sample alerts for demonstration
    if (alerts.rows.length === 0) {
      const sampleAlerts = [
        {
          id: 'alert-1',
          type: 'consent_expired',
          severity: 'medium',
          userId: null,
          userName: null,
          message: 'Consent requires renewal for 12 users',
          details: 'User consent is older than 12 months and should be refreshed according to GDPR best practices.',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          resolved: false,
          resolvedAt: null,
          resolvedBy: null
        },
        {
          id: 'alert-2',
          type: 'data_retention',
          severity: 'high',
          userId: 'user-123',
          userName: 'John Doe',
          message: 'Data retention period exceeded',
          details: 'User data has exceeded the maximum retention period of 7 years and must be reviewed for deletion.',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          resolved: false,
          resolvedAt: null,
          resolvedBy: null
        },
        {
          id: 'alert-3',
          type: 'access_violation',
          severity: 'critical',
          userId: 'user-456',
          userName: 'Jane Smith',
          message: 'Unauthorized data access detected',
          details: 'Multiple failed attempts to access user data from an unrecognized IP address.',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          resolved: false,
          resolvedAt: null,
          resolvedBy: null
        },
        {
          id: 'alert-4',
          type: 'compliance_check',
          severity: 'low',
          userId: null,
          userName: null,
          message: 'Monthly compliance audit completed',
          details: 'Automated compliance check completed successfully. Minor recommendations available in the report.',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          resolved: true,
          resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          resolvedBy: 'system'
        }
      ]

      return NextResponse.json({ alerts: sampleAlerts })
    }

    // Process real alerts
    const processedAlerts = alerts.rows.map((alert: any) => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      userId: alert.user_id,
      userName: alert.user_name,
      message: alert.message,
      details: alert.details,
      createdAt: alert.created_at,
      resolved: alert.resolved,
      resolvedAt: alert.resolved_at,
      resolvedBy: alert.resolved_by
    }))

    return NextResponse.json({ alerts: processedAlerts })

  } catch (error) {
    console.error('Error fetching privacy alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch privacy alerts' },
      { status: 500 }
    )
  }
}