import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

// GET /api/questions - Get basic questions for any user
export async function GET(request: NextRequest) {
  let session = null
  try {
    session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const count = parseInt(searchParams.get('count') || '10')
    const category = searchParams.get('category')

    // Get user ID for checking answered questions
    const userResult = await query(`
      SELECT id FROM users WHERE email = $1
    `, [session.user.email])

    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = userResult.rows[0].id

    // Build query - updated to match actual table structure
    let whereClause = 'WHERE 1=1'  // No is_active column in current schema
    let params = [userId, count]
    
    if (category) {
      whereClause += ' AND q.category = $3'
      params.push(category)
    }

    // Get questions, prioritizing unanswered ones
    const result = await query(`
      SELECT 
        q.id,
        q.question_text,
        q.category,
        q.difficulty_level as complexity_level,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as answered
      FROM questions q
      LEFT JOIN responses r ON r.question_id = q.id AND r.user_id = $1
      ${whereClause}
      ORDER BY 
        CASE WHEN r.id IS NULL THEN 0 ELSE 1 END,  -- Unanswered first
        RANDOM()
      LIMIT $2
    `, params)

    return NextResponse.json({
      questions: result.rows,
      total: result.rows.length,
      unanswered: result.rows.filter(q => !q.answered).length
    })

  } catch (error) {
    console.error('Error fetching questions:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user: session?.user?.email
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch questions',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}