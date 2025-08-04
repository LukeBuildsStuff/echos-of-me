import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get comprehensive user statistics
    const userMetrics = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as new_users_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month,
        COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '1 day' THEN 1 END) as daily_active_users,
        COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active_users,
        COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_active_users
      FROM users
    `)

    // Get response and engagement metrics
    const engagementMetrics = await query(`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as responses_today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as responses_week,
        COUNT(DISTINCT user_id) as total_responders,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN user_id END) as responders_today,
        AVG(CHAR_LENGTH(response_text))::int as avg_response_length,
        ROUND(
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END)::decimal / 
          NULLIF(COUNT(CASE WHEN created_at >= NOW() - INTERVAL '2 days' AND created_at < NOW() - INTERVAL '1 day' THEN 1 END), 0) * 100, 
          1
        ) as response_growth_rate
      FROM responses
    `)

    // Get training system metrics
    const trainingMetrics = await query(`
      SELECT 
        COUNT(*) as total_training_jobs,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as jobs_today,
        ROUND(
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::decimal / 
          NULLIF(COUNT(CASE WHEN status IN ('completed', 'failed') THEN 1 END), 0) * 100, 
          1
        ) as success_rate
      FROM training_jobs
    `)

    // Get eligible users for training
    const eligibleUsers = await query(`
      SELECT 
        COUNT(DISTINCT u.id) as eligible_users
      FROM users u
      JOIN responses r ON u.id = r.user_id
      GROUP BY u.id
      HAVING COUNT(r.id) >= 50
    `)

    // Get system performance metrics (mock data for now, replace with real metrics)
    const systemMetrics = {
      uptime_percentage: 99.95,
      response_time_ms: 145,
      error_rate: 0.02,
      active_connections: Math.floor(Math.random() * 100) + 50,
      cpu_usage: Math.floor(Math.random() * 30) + 20,
      memory_usage: Math.floor(Math.random() * 40) + 30,
      disk_usage: Math.floor(Math.random() * 20) + 15
    }

    // Calculate user retention (simplified)
    const retentionMetrics = await query(`
      SELECT 
        ROUND(
          COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END)::decimal / 
          NULLIF(COUNT(CASE WHEN created_at <= NOW() - INTERVAL '7 days' THEN 1 END), 0) * 100, 
          1
        ) as weekly_retention_rate,
        ROUND(
          COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END)::decimal / 
          NULLIF(COUNT(CASE WHEN created_at <= NOW() - INTERVAL '30 days' THEN 1 END), 0) * 100, 
          1
        ) as monthly_retention_rate
      FROM users
    `)

    return NextResponse.json({
      success: true,
      data: {
        user_metrics: {
          total_users: parseInt(userMetrics.rows[0]?.total_users) || 0,
          new_users_today: parseInt(userMetrics.rows[0]?.new_users_today) || 0,
          new_users_week: parseInt(userMetrics.rows[0]?.new_users_week) || 0,
          new_users_month: parseInt(userMetrics.rows[0]?.new_users_month) || 0,
          daily_active_users: parseInt(userMetrics.rows[0]?.daily_active_users) || 0,
          weekly_active_users: parseInt(userMetrics.rows[0]?.weekly_active_users) || 0,
          monthly_active_users: parseInt(userMetrics.rows[0]?.monthly_active_users) || 0,
          user_growth_rate: userMetrics.rows[0]?.new_users_today > 0 ? 
            ((userMetrics.rows[0]?.new_users_today / Math.max(userMetrics.rows[0]?.total_users - userMetrics.rows[0]?.new_users_today, 1)) * 100).toFixed(1) : '0.0'
        },
        engagement_metrics: {
          total_responses: parseInt(engagementMetrics.rows[0]?.total_responses) || 0,
          responses_today: parseInt(engagementMetrics.rows[0]?.responses_today) || 0,
          responses_week: parseInt(engagementMetrics.rows[0]?.responses_week) || 0,
          total_responders: parseInt(engagementMetrics.rows[0]?.total_responders) || 0,
          responders_today: parseInt(engagementMetrics.rows[0]?.responders_today) || 0,
          avg_response_length: parseInt(engagementMetrics.rows[0]?.avg_response_length) || 0,
          response_growth_rate: engagementMetrics.rows[0]?.response_growth_rate || 0,
          completion_rate: Math.min(95 + Math.random() * 4, 99).toFixed(1) // Mock completion rate
        },
        training_metrics: {
          total_training_jobs: parseInt(trainingMetrics.rows[0]?.total_training_jobs) || 0,
          active_jobs: parseInt(trainingMetrics.rows[0]?.active_jobs) || 0,
          completed_jobs: parseInt(trainingMetrics.rows[0]?.completed_jobs) || 0,
          failed_jobs: parseInt(trainingMetrics.rows[0]?.failed_jobs) || 0,
          jobs_today: parseInt(trainingMetrics.rows[0]?.jobs_today) || 0,
          success_rate: parseFloat(trainingMetrics.rows[0]?.success_rate) || 0,
          eligible_users: parseInt(eligibleUsers.rows[0]?.eligible_users) || 0,
          queue_length: Math.floor(Math.random() * 5) // Mock queue length
        },
        system_metrics: systemMetrics,
        retention_metrics: {
          weekly_retention_rate: parseFloat(retentionMetrics.rows[0]?.weekly_retention_rate) || 0,
          monthly_retention_rate: parseFloat(retentionMetrics.rows[0]?.monthly_retention_rate) || 0
        },
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Overview analytics error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch overview analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})