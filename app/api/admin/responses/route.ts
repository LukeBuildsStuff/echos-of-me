import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'DESC'
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    let params: any[] = []
    let paramCount = 0

    if (userId) {
      paramCount++
      whereClause += ` AND r.user_id = $${paramCount}`
      params.push(userId)
    }

    if (search) {
      paramCount++
      whereClause += ` AND (r.response_text ILIKE $${paramCount} OR q.question_text ILIKE $${paramCount} OR u.name ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    params.push(limit, offset)
    const limitOffset = `LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`

    const validSortColumns = ['created_at', 'word_count', 'response_time']
    const finalSortBy = validSortColumns.includes(sortBy) ? `r.${sortBy}` : 'r.created_at'
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Get responses with user and question details
    const responses = await query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.response_time,
        r.created_at,
        r.updated_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        q.id as question_id,
        q.question_text,
        q.category as question_category
      FROM responses r
      JOIN users u ON r.user_id = u.id
      JOIN questions q ON r.question_id = q.id
      ${whereClause}
      ORDER BY ${finalSortBy} ${finalSortOrder}
      ${limitOffset}
    `, params)

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM responses r
      JOIN users u ON r.user_id = u.id
      JOIN questions q ON r.question_id = q.id
      ${whereClause}
    `, params.slice(0, paramCount))

    const totalResponses = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalResponses / limit)

    return NextResponse.json({
      responses: responses.rows,
      pagination: {
        page,
        limit,
        totalResponses,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('Admin responses fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    )
  }
})

export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { responseId, responseText } = body

    if (!responseId || !responseText) {
      return NextResponse.json({ error: 'Response ID and text required' }, { status: 400 })
    }

    const result = await query(`
      UPDATE responses
      SET 
        response_text = $2,
        word_count = array_length(string_to_array(trim($2), ' '), 1),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, response_text, word_count, updated_at
    `, [responseId, responseText])

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      response: result.rows[0]
    })

  } catch (error) {
    console.error('Admin response update error:', error)
    return NextResponse.json(
      { error: 'Failed to update response' },
      { status: 500 }
    )
  }
})

export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const responseId = searchParams.get('responseId')

    if (!responseId) {
      return NextResponse.json({ error: 'Response ID required' }, { status: 400 })
    }

    const result = await query(`
      DELETE FROM responses
      WHERE id = $1
      RETURNING id
    `, [responseId])

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Response deleted successfully'
    })

  } catch (error) {
    console.error('Admin response delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete response' },
      { status: 500 }
    )
  }
})