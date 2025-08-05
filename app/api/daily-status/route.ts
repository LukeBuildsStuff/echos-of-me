import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

// GET /api/daily-status - Check if user has answered today's question
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userResult = await query(`
      SELECT id FROM users WHERE email = $1
    `, [session.user.email])

    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = userResult.rows[0].id
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    // Check if user has answered any questions today
    const todayResponses = await query(`
      SELECT COUNT(*) as count
      FROM responses 
      WHERE user_id = $1 
        AND DATE(created_at) = $2 
        AND is_draft = false
    `, [userId, today])

    const count = parseInt(todayResponses.rows[0].count)
    const hasAnsweredToday = count > 0

    // Get total responses for user
    const totalResponses = await query(`
      SELECT COUNT(*) as total
      FROM responses 
      WHERE user_id = $1 AND is_draft = false
    `, [userId])

    return NextResponse.json({
      hasAnsweredToday,
      todayCount: count,
      totalResponses: parseInt(totalResponses.rows[0].total),
      canAnswerMore: !hasAnsweredToday, // Can answer more if haven't answered today
      date: today
    })

  } catch (error) {
    console.error('Error checking daily status:', error)
    return NextResponse.json(
      { error: 'Failed to check daily status' },
      { status: 500 }
    )
  }
}