import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { z } from 'zod'
import { 
  createQuestionSelector, 
  UserProfile,
  getQuestionPackage,
  calculateAgesFromBirthdays 
} from '@/lib/role-question-selector'

// Input validation schema
const ImportantPersonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  birthday: z.string().optional(),
  memorial_date: z.string().optional()
})

const ProfileUpdateSchema = z.object({
  primaryRole: z.string().min(1, 'Primary role is required'),
  secondaryRoles: z.array(z.string()).optional(),
  name: z.string().min(1, 'Name is required'),
  birthday: z.string().optional(),
  importantPeople: z.array(ImportantPersonSchema).optional()
})

// GET /api/questions/role-based - Get role-based questions or user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const count = parseInt(searchParams.get('count') || '0')
    
    // If count is requested, return questions
    if (count > 0) {
      // Get user ID for checking answered questions
      const userResult = await query(`
        SELECT id FROM users WHERE email = $1
      `, [session.user.email])

      if (!userResult.rows[0]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const userId = userResult.rows[0].id

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
        ORDER BY 
          CASE WHEN r.id IS NULL THEN 0 ELSE 1 END,  -- Unanswered first
          RANDOM()
        LIMIT $2
      `, [userId, count])

      return NextResponse.json({
        questions: result.rows,
        total: result.rows.length,
        unanswered: result.rows.filter(q => !q.answered).length
      })
    }

    // Otherwise return user profile for dashboard
    const user = await query(`
      SELECT 
        id,
        name,
        primary_role,
        secondary_roles,
        important_people
      FROM users 
      WHERE email = $1
    `, [session.user.email])

    if (!user.rows[0]) {
      return NextResponse.json({ userProfile: null }, { status: 200 })
    }
    
    // Parse JSON fields safely
    let parsedSecondaryRoles = []
    let parsedImportantPeople = []
    
    try {
      if (user.rows[0].secondary_roles) {
        parsedSecondaryRoles = typeof user.rows[0].secondary_roles === 'string'
          ? JSON.parse(user.rows[0].secondary_roles)
          : user.rows[0].secondary_roles
      }
    } catch (error) {
      console.error('Error parsing secondary_roles in GET:', error)
    }
    
    try {
      if (user.rows[0].important_people) {
        parsedImportantPeople = typeof user.rows[0].important_people === 'string'
          ? JSON.parse(user.rows[0].important_people)
          : user.rows[0].important_people
      }
    } catch (error) {
      console.error('Error parsing important_people in GET:', error)
    }
    
    const userProfile = {
      primaryRole: user.rows[0].primary_role,
      name: user.rows[0].name,
      secondaryRoles: parsedSecondaryRoles,
      importantPeople: parsedImportantPeople
    }
    
    return NextResponse.json({ userProfile })

  } catch (error) {
    console.error('Error in role-based API:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// POST /api/questions/role-based - Update user role and preferences
export async function POST(request: NextRequest) {
  console.log('🚨 POST /api/questions/role-based HANDLER CALLED!')
  try {
    const session = await getServerSession(authOptions)
    console.log('🔑 Session check:', { hasSession: !!session, email: session?.user?.email })
    if (!session?.user?.email) {
      console.log('❌ No session or email, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('API received body:', JSON.stringify(body, null, 2))
    
    // Validate input data
    const validatedData = ProfileUpdateSchema.parse(body)
    
    const {
      primaryRole,
      secondaryRoles,
      name,
      birthday,
      importantPeople
    } = validatedData

    console.log('Updating user with email:', session.user.email)
    console.log('Data to save:', {
      name,
      birthday,
      primaryRole,
      secondaryRoles,
      importantPeople
    })

    // Safely serialize arrays and objects for database storage
    const safeSecondaryRoles = Array.isArray(secondaryRoles) ? secondaryRoles : []
    const safeImportantPeople = Array.isArray(importantPeople) ? importantPeople : []
    
    // Update user profile with transaction-like behavior
    const result = await query(`
      UPDATE users 
      SET 
        name = $2,
        birthday = $3,
        primary_role = $4,
        secondary_roles = $5,
        important_people = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING id, name, primary_role, secondary_roles, important_people
    `, [
      session.user.email,
      name,
      birthday, 
      primaryRole,
      JSON.stringify(safeSecondaryRoles), // Consistent JSON serialization
      JSON.stringify(safeImportantPeople) // Consistent JSON serialization
    ])
    
    console.log('Update result:', result.rows)

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      userId: result.rows[0].id,
      updatedProfile: {
        name: result.rows[0].name,
        primaryRole: result.rows[0].primary_role,
        secondaryRoles: JSON.parse(result.rows[0].secondary_roles || '[]'),
        importantPeople: JSON.parse(result.rows[0].important_people || '[]')
      }
    })

  } catch (error: any) {
    console.error('=== DATABASE ERROR ===')
    console.error('Error updating user profile:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error code:', error?.code)
    console.error('Error detail:', error?.detail)
    console.error('======================')
    
    // Handle validation errors separately
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

