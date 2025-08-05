import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || 'week'

    // Calculate date ranges based on timeframe
    const now = new Date()
    let startDate: Date
    
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get basic user counts
    const userCounts = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month,
        COUNT(CASE WHEN last_login_at >= CURRENT_DATE THEN 1 END) as users_logged_in_today,
        COUNT(CASE WHEN last_login_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as users_logged_in_this_week
      FROM users
    `)

    const userStats = userCounts.rows[0]

    // Get response statistics
    const responseStats = await query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as responses_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as responses_this_week,
        COALESCE(AVG(response_count), 0) as avg_responses_per_user
      FROM responses r
      CROSS JOIN (
        SELECT COUNT(*) as response_count 
        FROM responses 
        GROUP BY user_id
      ) avg_calc
    `)

    const responseData = responseStats.rows[0]

    // Get most active users (by response count)
    const mostActiveUsers = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(r.id) as response_count,
        u.last_login_at as last_login
      FROM users u
      LEFT JOIN responses r ON u.id = r.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.email, u.last_login_at
      ORDER BY response_count DESC
      LIMIT 10
    `)

    // Get recent signups
    const recentSignups = await query(`
      SELECT 
        id,
        name,
        email,
        created_at,
        primary_role
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 10
    `)

    // Get inactive users (haven't logged in for 30+ days)
    const inactiveUsers = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.last_login_at,
        CASE 
          WHEN u.last_login_at IS NULL THEN 
            EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - u.created_at))
          ELSE 
            EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - u.last_login_at))
        END as days_inactive
      FROM users u
      WHERE u.is_active = true
      AND (
        u.last_login_at IS NULL 
        OR u.last_login_at < CURRENT_DATE - INTERVAL '30 days'
      )
      ORDER BY days_inactive DESC
      LIMIT 10
    `)

    // Calculate average responses per user properly
    const avgResponsesCalc = await query(`
      SELECT 
        COALESCE(AVG(user_response_count), 0) as avg_responses_per_user
      FROM (
        SELECT 
          u.id,
          COUNT(r.id) as user_response_count
        FROM users u
        LEFT JOIN responses r ON u.id = r.user_id
        WHERE u.is_active = true
        GROUP BY u.id
      ) user_stats
    `)

    const avgResponsesPerUser = parseFloat(avgResponsesCalc.rows[0]?.avg_responses_per_user || '0')

    const stats = {
      totalUsers: parseInt(userStats.total_users),
      activeUsers: parseInt(userStats.active_users),
      inactiveUsers: parseInt(userStats.inactive_users),
      adminUsers: parseInt(userStats.admin_users),
      newUsersToday: parseInt(userStats.new_users_today),
      newUsersThisWeek: parseInt(userStats.new_users_this_week),
      newUsersThisMonth: parseInt(userStats.new_users_this_month),
      usersLoggedInToday: parseInt(userStats.users_logged_in_today),
      usersLoggedInThisWeek: parseInt(userStats.users_logged_in_this_week),
      totalResponses: parseInt(responseData.total_responses),
      responsesToday: parseInt(responseData.responses_today),
      responsesThisWeek: parseInt(responseData.responses_this_week),
      avgResponsesPerUser,
      mostActiveUsers: mostActiveUsers.rows.map(user => ({
        ...user,
        response_count: parseInt(user.response_count)
      })),
      recentSignups: recentSignups.rows,
      inactiveUsers: inactiveUsers.rows.map(user => ({
        ...user,
        days_inactive: parseInt(user.days_inactive)
      }))
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Admin user stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
})