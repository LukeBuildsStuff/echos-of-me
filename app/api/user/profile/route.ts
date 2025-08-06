import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
})

// GET /api/user/profile - Get user profile information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const result = await query(`
      SELECT 
        id,
        email,
        name,
        created_at,
        birthday,
        primary_role,
        secondary_roles,
        children_birthdays,
        important_people,
        cultural_background
      FROM users 
      WHERE email = $1
    `, [session.user.email])

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profile = result.rows[0]

    // Parse important_people JSON if it exists
    let parsedImportantPeople = []
    try {
      if (profile.important_people) {
        parsedImportantPeople = typeof profile.important_people === 'string' 
          ? JSON.parse(profile.important_people)
          : profile.important_people
      }
    } catch (error) {
      console.error('Error parsing important_people JSON:', error)
      parsedImportantPeople = []
    }

    // Parse secondary_roles if it exists
    let parsedSecondaryRoles = []
    try {
      if (profile.secondary_roles) {
        parsedSecondaryRoles = Array.isArray(profile.secondary_roles)
          ? profile.secondary_roles
          : JSON.parse(profile.secondary_roles)
      }
    } catch (error) {
      console.error('Error parsing secondary_roles:', error)
      parsedSecondaryRoles = []
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        created_at: profile.created_at,
        birthday: profile.birthday,
        primary_role: profile.primary_role,
        secondary_roles: parsedSecondaryRoles,
        children_birthdays: profile.children_birthdays,
        important_people: parsedImportantPeople,
        cultural_background: profile.cultural_background
      }
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PUT /api/user/profile - Update user profile information
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = updateProfileSchema.parse(body)

    // Update user profile
    const result = await query(`
      UPDATE users 
      SET name = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = $2
      RETURNING id, name, updated_at
    `, [name, session.user.email])

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile: result.rows[0]
    })

  } catch (error: any) {
    console.error('Error updating user profile:', error)

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