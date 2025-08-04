import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get recent user registrations
    const recentRegistrations = await query(`
      SELECT 
        'user_registration' as event_type,
        u.id as user_id,
        u.email,
        u.name,
        u.created_at,
        'New user registered' as description,
        JSON_BUILD_OBJECT(
          'user_email', u.email,
          'user_name', COALESCE(u.name, 'Anonymous'),
          'registration_method', 'email'
        ) as metadata
      FROM users u
      WHERE u.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY u.created_at DESC
      LIMIT 10
    `)

    // Get recent response submissions
    const recentResponses = await query(`
      SELECT 
        'response_submitted' as event_type,
        r.user_id,
        u.email,
        u.name,
        r.created_at,
        'Response submitted to question' as description,
        JSON_BUILD_OBJECT(
          'user_email', u.email,
          'user_name', COALESCE(u.name, 'Anonymous'),
          'response_length', CHAR_LENGTH(r.response_text),
          'question_id', r.question_id
        ) as metadata
      FROM responses r
      JOIN users u ON r.user_id = u.id
      WHERE r.created_at >= NOW() - INTERVAL '3 days'
      ORDER BY r.created_at DESC
      LIMIT 15
    `)

    // Get recent training jobs
    const recentTraining = await query(`
      SELECT 
        'training_job' as event_type,
        tj.user_id,
        u.email,
        u.name,
        tj.created_at,
        CASE 
          WHEN tj.status = 'completed' THEN 'Training completed successfully'
          WHEN tj.status = 'failed' THEN 'Training failed'
          WHEN tj.status = 'running' THEN 'Training started'
          ELSE 'Training job updated'
        END as description,
        JSON_BUILD_OBJECT(
          'user_email', u.email,
          'user_name', COALESCE(u.name, 'Anonymous'),
          'job_status', tj.status,
          'job_id', tj.id,
          'model_type', COALESCE(tj.model_type, 'unknown')
        ) as metadata
      FROM training_jobs tj
      JOIN users u ON tj.user_id = u.id
      WHERE tj.created_at >= NOW() - INTERVAL '7 days'
        OR tj.updated_at >= NOW() - INTERVAL '2 days'
      ORDER BY GREATEST(tj.created_at, tj.updated_at) DESC
      LIMIT 10
    `)

    // Get system events (mock data for now - replace with real system events table)
    const systemEvents = [
      {
        event_type: 'system_backup',
        user_id: null,
        email: null,
        name: 'System',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        description: 'Automated system backup completed',
        metadata: {
          backup_size: '2.3 GB',
          backup_duration: '4 minutes',
          backup_type: 'full'
        }
      },
      {
        event_type: 'system_maintenance',
        user_id: null,
        email: null,
        name: 'System',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        description: 'Scheduled maintenance completed',
        metadata: {
          maintenance_type: 'database_optimization',
          duration: '15 minutes',
          affected_services: ['training', 'analytics']
        }
      }
    ]

    // Combine all activity events
    const allActivity = [
      ...recentRegistrations.rows,
      ...recentResponses.rows,
      ...recentTraining.rows,
      ...systemEvents
    ]

    // Sort by created_at desc and apply pagination
    const sortedActivity = allActivity
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)

    // Get activity counts by type for summary
    const activitySummary = await query(`
      SELECT 
        'registrations' as type,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week
      FROM users
      UNION ALL
      SELECT 
        'responses' as type,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week
      FROM responses
      UNION ALL
      SELECT 
        'training_jobs' as type,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as today,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as week
      FROM training_jobs
    `)

    // Format activity summary
    const summary = {}
    activitySummary.rows.forEach(row => {
      summary[row.type] = {
        today: parseInt(row.today) || 0,
        week: parseInt(row.week) || 0
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        activities: sortedActivity.map(activity => ({
          ...activity,
          created_at: new Date(activity.created_at).toISOString(),
          time_ago: getTimeAgo(new Date(activity.created_at))
        })),
        summary,
        pagination: {
          limit,
          offset,
          total: allActivity.length,
          has_more: offset + limit < allActivity.length
        },
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch activity feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}