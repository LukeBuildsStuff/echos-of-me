import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { getRandomQuestions } from '@/lib/question-templates'

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
    const count = parseInt(searchParams.get('count') || '3')
    const category = searchParams.get('category') as any
    const complexity = searchParams.get('complexity') as any

    // Check if user has already answered questions today
    const today = new Date().toISOString().split('T')[0]
    const todayResponses = await query(`
      SELECT COUNT(*) as count
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1 
        AND DATE(r.created_at) = $2
        AND r.is_draft = false
    `, [session.user.id, today])

    const hasAnsweredToday = parseInt(todayResponses.rows[0].count) > 0

    // Get questions the user hasn't answered yet
    const availableQuestions = await query(`
      SELECT q.id, q.category, q.subcategory, q.question_text, q.complexity_level, q.metadata
      FROM questions q
      WHERE q.is_active = true
        AND q.id NOT IN (
          SELECT DISTINCT question_id 
          FROM responses 
          WHERE user_id = $1 AND is_draft = false
        )
        ${category ? 'AND q.category = $2' : ''}
        ${complexity ? `AND q.complexity_level = ${complexity}` : ''}
      ORDER BY RANDOM()
      LIMIT $${category ? '3' : '2'}
    `, category ? [session.user.id, category] : [session.user.id])

    let questions = availableQuestions.rows

    // If we don't have enough questions from database, supplement with template questions
    if (questions.length < count) {
      const templateQuestions = getRandomQuestions(category, count - questions.length, complexity)
      
      // Convert template questions to question objects
      const supplementQuestions = templateQuestions.map((text, index) => ({
        id: `template_${Date.now()}_${index}`,
        category: category || 'daily_life',
        subcategory: 'mixed',
        question_text: text,
        complexity_level: complexity || 3,
        metadata: { source: 'template', generated_at: new Date().toISOString() },
        is_template: true
      }))

      questions = [...questions, ...supplementQuestions]
    }

    // Ensure we have the right number of questions
    questions = questions.slice(0, count)

    // Get user's stats
    const userStats = await query(`
      SELECT 
        COUNT(DISTINCT r.id) as total_responses,
        COUNT(DISTINCT DATE(r.created_at)) as active_days,
        AVG(r.response_time_seconds) as avg_response_time,
        COUNT(DISTINCT q.category) as categories_explored
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1 AND r.is_draft = false
    `, [session.user.id])

    const stats = userStats.rows[0]

    return NextResponse.json({
      success: true,
      questions,
      meta: {
        hasAnsweredToday,
        userStats: {
          totalResponses: parseInt(stats.total_responses || 0),
          activeDays: parseInt(stats.active_days || 0),
          avgResponseTime: parseFloat(stats.avg_response_time || 0),
          categoriesExplored: parseInt(stats.categories_explored || 0)
        },
        date: today
      }
    })

  } catch (error) {
    console.error('Error fetching daily questions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch questions'
    }, { status: 500 })
  }
}