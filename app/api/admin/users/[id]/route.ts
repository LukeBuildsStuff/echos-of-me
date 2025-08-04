import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id

    // Get detailed user information with activity data
    const userResult = await query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.is_active,
        u.is_admin,
        u.primary_role,
        u.secondary_roles,
        u.failed_login_attempts,
        u.locked_until,
        COUNT(r.id) as total_responses,
        MAX(r.created_at) as last_response_at,
        COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as responses_last_7_days,
        COUNT(CASE WHEN r.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as responses_last_30_days,
        fm.family_id,
        f.family_name,
        fm.family_role
      FROM users u
      LEFT JOIN responses r ON u.id = r.user_id
      LEFT JOIN family_members fm ON u.id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.name, u.created_at, u.updated_at, u.last_login_at, 
               u.is_active, u.is_admin, u.primary_role, u.secondary_roles, 
               u.failed_login_attempts, u.locked_until, fm.family_id, f.family_name, fm.family_role
    `, [userId])

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]

    // Get recent responses for activity timeline
    const recentResponses = await query(`
      SELECT 
        r.id,
        r.question,
        r.response,
        r.created_at,
        r.response_length,
        r.training_status
      FROM responses r
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [userId])

    // Get login history
    const loginHistory = await query(`
      SELECT 
        logged_in_at,
        ip_address,
        user_agent,
        success
      FROM user_login_history
      WHERE user_id = $1
      ORDER BY logged_in_at DESC
      LIMIT 20
    `, [userId])

    return NextResponse.json({
      user: {
        ...user,
        recent_responses: recentResponses.rows,
        login_history: loginHistory.rows
      }
    })

  } catch (error) {
    console.error('Admin user detail fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    )
  }
})

export const PUT = withAdminAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id
    const body = await request.json()
    const { name, is_active, is_admin, primary_role } = body

    // Validate inputs
    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name format' }, { status: 400 })
    }
    
    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_active format' }, { status: 400 })
    }
    
    if (is_admin !== undefined && typeof is_admin !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_admin format' }, { status: 400 })
    }

    const validRoles = ['parent', 'child', 'family_member', 'caregiver', 'other']
    if (primary_role && !validRoles.includes(primary_role)) {
      return NextResponse.json({ error: 'Invalid primary_role' }, { status: 400 })
    }

    // Build update query dynamically
    const updates = []
    const values = [userId]
    let paramCount = 1

    if (name !== undefined) {
      paramCount++
      updates.push(`name = $${paramCount}`)
      values.push(name)
    }

    if (is_active !== undefined) {
      paramCount++
      updates.push(`is_active = $${paramCount}`)
      values.push(is_active)
    }

    if (is_admin !== undefined) {
      paramCount++
      updates.push(`is_admin = $${paramCount}`)
      values.push(is_admin)
    }

    if (primary_role !== undefined) {
      paramCount++
      updates.push(`primary_role = $${paramCount}`)
      values.push(primary_role)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')

    const result = await query(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, email, name, is_active, is_admin, primary_role, updated_at
    `, values)

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
})

export const DELETE = withAdminAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id

    // Soft delete by setting is_active to false
    const result = await query(`
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_admin = false
      RETURNING id, email, name
    `, [userId])

    if (!result.rows[0]) {
      return NextResponse.json({ 
        error: 'User not found or cannot deactivate admin users' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Admin user delete error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    )
  }
})