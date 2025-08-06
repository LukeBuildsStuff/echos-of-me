import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { z } from 'zod'
import { calculateResponseQuality } from '@/lib/response-quality'

const responseSchema = z.object({
  questionId: z.union([z.string(), z.number()]).transform((val) => String(val)),
  responseText: z.string().min(1, 'Response cannot be empty').trim(),
  responseTimeSeconds: z.number().optional(),
  isDraft: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/responses DEBUG ===')
    
    const session = await getServerSession(authOptions)
    console.log('Session:', JSON.stringify(session, null, 2))
    
    if (!session?.user?.id) {
      console.error('No user ID in session')
      console.error('Session user:', session?.user)
      
      // Try to get user ID from email if available
      if (session?.user?.email) {
        console.log('Attempting to fetch user ID from email:', session.user.email)
        try {
          const userResult = await query('SELECT id FROM users WHERE email = $1', [session.user.email])
          if (userResult.rows[0]) {
            session.user.id = userResult.rows[0].id.toString()
            console.log('Found user ID from email:', session.user.id)
          } else {
            console.error('No user found with email:', session.user.email)
            return NextResponse.json({
              success: false,
              error: 'User not found'
            }, { status: 404 })
          }
        } catch (dbError) {
          console.error('Error fetching user by email:', dbError)
          return NextResponse.json({
            success: false,
            error: 'Database error while fetching user'
          }, { status: 500 })
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized - no user ID or email in session'
        }, { status: 401 })
      }
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    let parsedData
    try {
      parsedData = responseSchema.parse(body)
      console.log('Parsed data:', parsedData)
    } catch (zodError) {
      console.error('Zod validation error:', zodError)
      throw zodError
    }
    
    const { questionId, responseText, responseTimeSeconds, isDraft } = parsedData

    // Validate question exists and user hasn't already answered it (unless it's a draft)
    console.log('Checking if question exists:', questionId)
    let questionCheck
    try {
      questionCheck = await query(`
        SELECT q.id, q.question_text, q.category
        FROM questions q
        WHERE q.id = $1 AND q.is_active = true
      `, [questionId])
      console.log('Question check result:', questionCheck.rows)
    } catch (dbError) {
      console.error('Database error checking question:', dbError)
      throw dbError
    }

    if (questionCheck.rows.length === 0) {
      console.error('Question not found:', questionId)
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
    const qualityScore = calculateResponseQuality(responseText)

    // Insert or update response
    console.log('Attempting to save response with params:', {
      userId: session.user.id,
      questionId,
      responseTextLength: responseText.length,
      wordCount,
      isDraft
    })
    
    let result
    try {
      result = await query(`
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
      console.log('Response saved successfully:', result.rows[0])
    } catch (dbError: any) {
      console.error('Database error saving response:', dbError)
      console.error('Error code:', dbError.code)
      console.error('Error detail:', dbError.detail)
      throw dbError
    }

    const response = result.rows[0]

    // Generate training data for LLM fine-tuning
    if (!isDraft) {
      await generateTrainingData(session.user.id, response.id, question, responseText)
    }

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
      },
      quality: qualityScore
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error saving response:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to save response',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('GET /api/responses - Session:', JSON.stringify(session, null, 2))
    
    if (!session?.user?.id) {
      console.log('GET /api/responses - No user ID in session, trying to get from email')
      
      // Try to get user ID from email if available
      if (session?.user?.email) {
        const userResult = await query('SELECT id FROM users WHERE email = $1', [session.user.email])
        if (userResult.rows[0]) {
          session.user.id = userResult.rows[0].id.toString()
          console.log('GET /api/responses - Found user ID from email:', session.user.id)
        } else {
          return NextResponse.json({
            success: false,
            error: 'User not found'
          }, { status: 404 })
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized'
        }, { status: 401 })
      }
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
        q.difficulty_level as complexity_level
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

  } catch (error: any) {
    console.error('Error fetching responses:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch responses',
      details: error.message
    }, { status: 500 })
  }
}

// Helper function to generate training data for LLM fine-tuning
async function generateTrainingData(userId: string, responseId: string, question: any, responseText: string) {
  try {
    // Get user profile for persona context
    const userProfile = await query(`
      SELECT name, primary_role
      FROM users 
      WHERE id = $1
    `, [userId])

    if (!userProfile.rows[0]) {
      console.log('No user profile found for training data generation')
      return
    }

    const user = userProfile.rows[0]
    const userRole = user.primary_role || 'parent'
    const userName = user.name || 'this person'

    // Use the training prompt template if available, otherwise create a generic one
    let prompt = question.training_prompt_template || 
                `Someone asks you about this experience. Share your story as you would with someone who cares about you.`

    // Enhance the response to be more conversational and authentic
    let completion = enhanceResponseForTraining(responseText, userName, userRole)

    // Generate a quality score based on response length and content
    const qualityScoreData = calculateResponseQuality(responseText)

    // Save to training_data table (only if table exists)
    try {
      await query(`
        INSERT INTO training_data (
          user_id,
          prompt,
          completion,
          source_response_id,
          quality_score,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        prompt,
        completion,
        responseId,
        qualityScoreData.score,
        JSON.stringify({
          question_category: question.category,
          response_word_count: responseText.split(/\s+/).length,
          user_role: userRole,
          generated_at: new Date().toISOString()
        })
      ])
    } catch (trainingDataError) {
      console.log('Training data table not available, skipping training data generation:', trainingDataError.message)
      // Continue without training data - this is not critical for response saving
    }

    console.log('Training data generated for response:', responseId)

  } catch (error) {
    console.error('Error generating training data:', error)
    // Don't throw error - training data generation shouldn't block response saving
  }
}

// DELETE /api/responses - Delete a specific response
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const responseId = searchParams.get('id')

    if (!responseId) {
      return NextResponse.json({
        success: false,
        error: 'Response ID is required'
      }, { status: 400 })
    }

    // Verify the response belongs to the current user before deleting
    const verifyResult = await query(`
      SELECT id FROM responses 
      WHERE id = $1 AND user_id = $2
    `, [responseId, session.user.id])

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Response not found or access denied'
      }, { status: 404 })
    }

    // Delete the response
    const deleteResult = await query(`
      DELETE FROM responses 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [responseId, session.user.id])

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete response'
      }, { status: 500 })
    }

    // Also delete associated training data if it exists
    await query(`
      DELETE FROM training_data 
      WHERE source_response_id = $1 AND user_id = $2
    `, [responseId, session.user.id])

    return NextResponse.json({
      success: true,
      message: 'Response deleted successfully'
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error deleting response:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete response'
    }, { status: 500 })
  }
}

// Enhance response to be more conversational and persona-rich
function enhanceResponseForTraining(responseText: string, userName: string, userRole: string): string {
  // If response is very short, add some conversational context
  if (responseText.length < 50) {
    return `Well, let me tell you about this. ${responseText}. That's something that really shaped how I think about things.`
  }

  // If response is already conversational, use as-is
  if (responseText.toLowerCase().includes('i remember') || 
      responseText.toLowerCase().includes('you know') ||
      responseText.toLowerCase().includes('let me tell you')) {
    return responseText
  }

  // Add natural conversation starters for longer responses
  const conversationStarters = [
    "You know,",
    "Well,", 
    "I remember",
    "Let me tell you about this.",
    "This brings back memories."
  ]

  const starter = conversationStarters[Math.floor(Math.random() * conversationStarters.length)]
  return `${starter} ${responseText}`
}

