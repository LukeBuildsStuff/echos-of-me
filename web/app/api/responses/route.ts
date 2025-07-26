import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { z } from 'zod'

const responseSchema = z.object({
  questionId: z.string(),
  responseText: z.string().min(10, 'Response must be at least 10 characters'),
  responseTimeSeconds: z.number().optional(),
  isDraft: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()
    const { questionId, responseText, responseTimeSeconds, isDraft } = responseSchema.parse(body)

    // Validate question exists and user hasn't already answered it (unless it's a draft)
    const questionCheck = await query(`
      SELECT q.id, q.question_text, q.category
      FROM questions q
      WHERE q.id = $1 AND q.is_active = true
    `, [questionId])

    if (questionCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Question not found'
      }, { status: 404 })
    }

    const question = questionCheck.rows[0]

    // Check if user already has a non-draft response for this question
    if (!isDraft) {
      const existingResponse = await query(`
        SELECT id FROM responses
        WHERE user_id = $1 AND question_id = $2 AND is_draft = false
      `, [session.user.id, questionId])

      if (existingResponse.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'You have already answered this question'
        }, { status: 400 })
      }
    }

    // Calculate response metrics
    const wordCount = responseText.split(/\s+/).filter(word => word.length > 0).length

    // Insert or update response
    const result = await query(`
      INSERT INTO responses (
        user_id, 
        question_id, 
        response_text, 
        response_time_seconds, 
        word_count, 
        is_draft
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, question_id) 
      DO UPDATE SET
        response_text = EXCLUDED.response_text,
        response_time_seconds = EXCLUDED.response_time_seconds,
        word_count = EXCLUDED.word_count,
        is_draft = EXCLUDED.is_draft,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, created_at, updated_at
    `, [
      session.user.id,
      questionId,
      responseText,
      responseTimeSeconds || null,
      wordCount,
      isDraft
    ])

    const response = result.rows[0]

    // Update daily session stats
    if (!isDraft) {
      const today = new Date().toISOString().split('T')[0]
      await query(`
        INSERT INTO user_sessions (user_id, session_date, questions_answered, total_words)
        VALUES ($1, $2, 1, $3)
        ON CONFLICT (user_id, session_date)
        DO UPDATE SET
          questions_answered = user_sessions.questions_answered + 1,
          total_words = user_sessions.total_words + $3,
          avg_response_time = (
            COALESCE(user_sessions.avg_response_time * (user_sessions.questions_answered - 1), 0) + COALESCE($4, 0)
          ) / user_sessions.questions_answered
      `, [session.user.id, today, wordCount, responseTimeSeconds || 0])
    }

    return NextResponse.json({
      success: true,
      response: {
        id: response.id,
        questionId,
        responseText,
        wordCount,
        isDraft,
        createdAt: response.created_at,
        updatedAt: response.updated_at
      },
      question: {
        id: question.id,
        text: question.question_text,
        category: question.category
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error saving response:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to save response'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')
    const draftsOnly = searchParams.get('drafts') === 'true'

    // Get user's responses
    const responses = await query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.response_time_seconds,
        r.is_draft,
        r.created_at,
        r.updated_at,
        q.id as question_id,
        q.question_text,
        q.category,
        q.subcategory,
        q.complexity_level
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1
        ${category ? 'AND q.category = $4' : ''}
        ${draftsOnly ? 'AND r.is_draft = true' : ''}
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, category ? 
      [session.user.id, limit, offset, category] : 
      [session.user.id, limit, offset]
    )

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1
        ${category ? 'AND q.category = $2' : ''}
        ${draftsOnly ? 'AND r.is_draft = true' : ''}
    `, category ? [session.user.id, category] : [session.user.id])

    const total = parseInt(countResult.rows[0].total)

    return NextResponse.json({
      success: true,
      responses: responses.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching responses:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch responses'
    }, { status: 500 })
  }
}