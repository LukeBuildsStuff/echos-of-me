import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { 
  createQuestionSelector, 
  UserProfile,
  getQuestionPackage,
  calculateAgesFromBirthdays 
} from '@/lib/role-question-selector'

// GET /api/questions/role-based - Get user profile for dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Simple profile check - just get what dashboard needs
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
    
    const userProfile = {
      primaryRole: user.rows[0].primary_role,
      name: user.rows[0].name,
      secondaryRoles: user.rows[0].secondary_roles,
      importantPeople: user.rows[0].important_people
    }
    
    return NextResponse.json({ userProfile })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
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
    
    const {
      primaryRole,
      secondaryRoles,
      name,
      birthday,
      importantPeople
    } = body

    console.log('Updating user with email:', session.user.email)
    console.log('Data to save:', {
      name,
      birthday,
      primaryRole,
      secondaryRoles,
      importantPeople
    })

    // Update user profile
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
      RETURNING id
    `, [
      session.user.email,
      name,
      birthday, 
      primaryRole,
      secondaryRoles || [], // PostgreSQL array format
      JSON.stringify(importantPeople || []) // JSON format
    ])
    
    console.log('Update result:', result.rows)

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      userId: result.rows[0].id
    })

  } catch (error) {
    console.error('=== DATABASE ERROR ===')
    console.error('Error updating user profile:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error code:', (error as any)?.code)
    console.error('Error detail:', (error as any)?.detail)
    console.error('======================')
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

