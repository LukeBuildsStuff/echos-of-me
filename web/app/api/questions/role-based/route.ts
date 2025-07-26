import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { 
  createQuestionSelector, 
  UserProfile,
  getQuestionPackage 
} from '@/lib/role-question-selector'

// GET /api/questions/role-based - Get personalized questions based on family role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const count = parseInt(searchParams.get('count') || '5')
    const targetDepth = searchParams.get('depth') ? parseInt(searchParams.get('depth')!) : undefined
    const mood = searchParams.get('mood') as 'reflective' | 'celebratory' | 'sorrowful' | 'practical' | undefined
    const scenario = searchParams.get('scenario') as 'daily' | 'milestone' | 'legacy' | 'crisis' | undefined

    // Get user profile from database
    const user = await db.query(`
      SELECT 
        id,
        primary_role,
        secondary_roles,
        relationship_years,
        children_ages,
        significant_events,
        cultural_background,
        spiritual_orientation
      FROM users 
      WHERE email = $1
    `, [session.user.email])

    if (!user.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userProfile: UserProfile = {
      userId: user.rows[0].id,
      primaryRole: user.rows[0].primary_role || 'parent',
      secondaryRoles: user.rows[0].secondary_roles,
      relationshipYears: user.rows[0].relationship_years,
      childrenAges: user.rows[0].children_ages,
      significantEvents: user.rows[0].significant_events,
      culturalBackground: user.rows[0].cultural_background,
      spiritualOrientation: user.rows[0].spiritual_orientation
    }

    // Get session history
    const sessionHistory = await db.query(`
      SELECT 
        id as "sessionId",
        user_id as "userId",
        session_mood as "sessionMood",
        questions_delivered as "questionsDelivered",
        questions_answered as "questionsAnswered",
        emotional_depth_progression as "emotionalDepthProgression"
      FROM question_sessions
      WHERE user_id = $1
      ORDER BY session_number DESC
      LIMIT 10
    `, [userProfile.userId])

    // Create question selector
    const selector = createQuestionSelector(userProfile)

    let questions: string[] = []

    // Get questions based on request parameters
    if (scenario) {
      questions = getQuestionPackage(userProfile.primaryRole, scenario)
    } else if (mood) {
      questions = selector.getQuestionsForMood(mood)
    } else {
      questions = selector.getPersonalizedQuestions(count, targetDepth)
    }

    // Get question details from database
    const questionDetails = await db.query(`
      SELECT 
        q.id,
        q.question_text,
        q.category,
        COALESCE(rq.emotional_depth, 5) as emotional_depth,
        rq.context_note,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as answered
      FROM questions q
      LEFT JOIN role_questions rq ON q.question_text = rq.question_text
      LEFT JOIN responses r ON r.question_id = q.id AND r.user_id = $1
      WHERE q.question_text = ANY($2)
      LIMIT $3
    `, [userProfile.userId, questions, count])

    // If we don't have enough questions in DB, get from selector
    if (questionDetails.rows.length < count) {
      const additionalQuestions = selector.getPersonalizedQuestions(
        count - questionDetails.rows.length, 
        targetDepth
      ).map(q => ({
        id: null,
        question_text: q,
        category: 'dynamic',
        emotional_depth: targetDepth || 5,
        context_note: 'Dynamically generated based on your profile',
        answered: false
      }))

      questionDetails.rows.push(...additionalQuestions)
    }

    return NextResponse.json({
      questions: questionDetails.rows,
      userProfile: {
        primaryRole: userProfile.primaryRole,
        hasChildren: (userProfile.childrenAges?.length || 0) > 0,
        relationshipStage: getRelationshipStage(userProfile.relationshipYears)
      },
      totalAnswered: sessionHistory.rows.reduce(
        (sum, session) => sum + (session.questionsAnswered?.length || 0), 
        0
      )
    })

  } catch (error) {
    console.error('Error fetching role-based questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}

// POST /api/questions/role-based - Update user role and preferences
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      primaryRole,
      secondaryRoles,
      relationshipYears,
      childrenAges,
      significantEvents,
      culturalBackground,
      spiritualOrientation
    } = body

    // Update user profile
    const result = await db.query(`
      UPDATE users 
      SET 
        primary_role = COALESCE($2, primary_role),
        secondary_roles = COALESCE($3, secondary_roles),
        relationship_years = COALESCE($4, relationship_years),
        children_ages = COALESCE($5, children_ages),
        significant_events = COALESCE($6, significant_events),
        cultural_background = COALESCE($7, cultural_background),
        spiritual_orientation = COALESCE($8, spiritual_orientation),
        updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING id
    `, [
      session.user.email,
      primaryRole,
      secondaryRoles,
      relationshipYears,
      childrenAges,
      significantEvents,
      culturalBackground,
      spiritualOrientation
    ])

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      userId: result.rows[0].id
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

// Helper function to categorize relationship stages
function getRelationshipStage(years?: number): string {
  if (!years) return 'unknown'
  if (years < 2) return 'new'
  if (years < 7) return 'building'
  if (years < 15) return 'established'
  if (years < 25) return 'mature'
  return 'enduring'
}