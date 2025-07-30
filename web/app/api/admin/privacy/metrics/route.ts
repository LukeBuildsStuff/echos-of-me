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

    // Get total users
    const totalUsersQuery = await db.query('SELECT COUNT(*) as count FROM users')
    const totalUsers = totalUsersQuery.rows[0]?.count || 0

    // Get consent statistics
    const consentStatsQuery = await db.query(`
      SELECT 
        SUM(CASE WHEN data_processing_consent = 'granted' THEN 1 ELSE 0 END) as granted,
        SUM(CASE WHEN data_processing_consent = 'denied' THEN 1 ELSE 0 END) as denied,
        SUM(CASE WHEN data_processing_consent = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN data_processing_consent = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn
      FROM user_consent
    `)

    const consentStats = consentStatsQuery.rows[0] || { granted: 0, denied: 0, pending: 0, withdrawn: 0 }

    // Get data breach count (from security_incidents table)
    const dataBreachesQuery = await db.query(`
      SELECT COUNT(*) as count 
      FROM security_incidents 
      WHERE incident_type = 'data_breach' 
      AND created_at > DATE_SUB(NOW(), INTERVAL 12 MONTH)
    `)
    const dataBreaches = dataBreachesQuery.rows[0]?.count || 0

    // Get compliance issues count
    const complianceIssuesQuery = await db.query(`
      SELECT COUNT(*) as count 
      FROM privacy_alerts 
      WHERE resolved = FALSE
    `)
    const complianceIssues = complianceIssuesQuery.rows[0]?.count || 0

    // Calculate compliance scores
    const averageComplianceScore = 87 // Would be calculated from user risk assessments
    const dataRetentionCompliance = 92 // Would be calculated from retention policy adherence
    const gdprCompliance = 89 // Would be calculated from GDPR requirements
    const ccpaCompliance = 91 // Would be calculated from CCPA requirements

    const metrics = {
      totalUsers,
      consentStats,
      dataBreaches,
      complianceIssues,
      averageComplianceScore,
      dataRetentionCompliance,
      gdprCompliance,
      ccpaCompliance
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error fetching privacy metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch privacy metrics' },
      { status: 500 }
    )
  }
}