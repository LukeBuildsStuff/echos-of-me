import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get training statistics
    const [
      usersResult,
      eligibleUsersResult,
      activeTrainingResult,
      completedModelsResult,
      queueResult,
      avgTimeResult
    ] = await Promise.all([
      // Total users
      query('SELECT COUNT(*) as total FROM users WHERE is_active = true'),
      
      // Eligible users (with sufficient data)
      query(`
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN responses r ON u.id = r.user_id
        LEFT JOIN life_detail_entries le ON u.id = le.user_id
        LEFT JOIN milestone_messages mm ON u.id = mm.user_id
        WHERE u.is_active = true
        GROUP BY u.id
        HAVING 
          COUNT(DISTINCT r.id) + COUNT(DISTINCT le.id) + COUNT(DISTINCT mm.id) >= 10
          AND (
            COALESCE(SUM(LENGTH(r.response_text)), 0) + 
            COALESCE(SUM(LENGTH(le.content)), 0) + 
            COALESCE(SUM(LENGTH(mm.message_content)), 0)
          ) >= 1000
      `),
      
      // Active training
      query(`
        SELECT COUNT(*) as total 
        FROM training_runs 
        WHERE status IN ('queued', 'running')
      `),
      
      // Completed models  
      query(`
        SELECT COUNT(*) as total 
        FROM training_runs 
        WHERE status = 'completed'
      `),
      
      // Queue length
      query(`
        SELECT COUNT(*) as total 
        FROM training_runs 
        WHERE status = 'queued'
      `),
      
      // Average training time
      query(`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_minutes
        FROM training_runs 
        WHERE status = 'completed' 
        AND started_at IS NOT NULL 
        AND completed_at IS NOT NULL
      `)
    ])

    const stats = {
      totalUsers: parseInt(usersResult.rows[0]?.total || 0),
      eligibleUsers: eligibleUsersResult.rows?.length || 0,
      activeTraining: parseInt(activeTrainingResult.rows[0]?.total || 0),
      completedModels: parseInt(completedModelsResult.rows[0]?.total || 0),
      queueLength: parseInt(queueResult.rows[0]?.total || 0),
      averageTrainingTime: Math.round(parseFloat(avgTimeResult.rows[0]?.avg_minutes || 0))
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Training stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training statistics' },
      { status: 500 }
    )
  }
})