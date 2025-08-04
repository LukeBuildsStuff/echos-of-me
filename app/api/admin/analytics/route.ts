import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('range') || '7d' // 1d, 7d, 30d, 90d
    const eventType = searchParams.get('type')

    let timeFilter = ''
    switch (timeRange) {
      case '1d':
        timeFilter = "created_at >= NOW() - INTERVAL '1 day'"
        break
      case '7d':
        timeFilter = "created_at >= NOW() - INTERVAL '7 days'"
        break
      case '30d':
        timeFilter = "created_at >= NOW() - INTERVAL '30 days'"
        break
      case '90d':
        timeFilter = "created_at >= NOW() - INTERVAL '90 days'"
        break
      default:
        timeFilter = "created_at >= NOW() - INTERVAL '7 days'"
    }

    // Get user registration stats
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as new_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
        COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '1 day' THEN 1 END) as active_today,
        COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_this_week
      FROM users
    `)

    // Get response stats
    const responseStats = await query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as responses_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as responses_this_week,
        AVG(CHAR_LENGTH(response_text)) as avg_response_length
      FROM responses
    `)

    // Get analytics events by type
    const eventStats = await query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        DATE_TRUNC('day', created_at) as date
      FROM analytics_events
      WHERE ${timeFilter}
      ${eventType ? 'AND event_type = $1' : ''}
      GROUP BY event_type, DATE_TRUNC('day', created_at)
      ORDER BY date DESC, count DESC
    `, eventType ? [eventType] : [])

    // Get daily user registrations
    const dailyRegistrations = await query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as registrations
      FROM users
      WHERE ${timeFilter}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `)

    // Get response activity
    const responseActivity = await query(`
      SELECT 
        DATE_TRUNC('day', r.created_at) as date,
        COUNT(*) as responses,
        COUNT(DISTINCT r.user_id) as active_users
      FROM responses r
      WHERE ${timeFilter.replace('created_at', 'r.created_at')}
      GROUP BY DATE_TRUNC('day', r.created_at)
      ORDER BY date DESC
    `)

    return NextResponse.json({
      userStats: userStats.rows[0],
      responseStats: responseStats.rows[0],
      eventStats: eventStats.rows,
      dailyRegistrations: dailyRegistrations.rows,
      responseActivity: responseActivity.rows
    })

  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
})