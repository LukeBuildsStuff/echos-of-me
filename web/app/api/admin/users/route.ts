import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'DESC'
    const offset = (page - 1) * limit

    let whereClause = ''
    let params: any[] = [limit, offset]
    let paramCount = 2

    if (search) {
      paramCount++
      whereClause = `WHERE (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    const validSortColumns = ['created_at', 'last_login_at', 'name', 'email']
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Get users with response count
    const users = await query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        u.last_login_at,
        u.is_active,
        u.is_admin,
        u.primary_role,
        u.secondary_roles,
        COUNT(r.id) as response_count,
        MAX(r.created_at) as last_response_at
      FROM users u
      LEFT JOIN responses r ON u.id = r.user_id
      ${whereClause}
      GROUP BY u.id, u.email, u.name, u.created_at, u.last_login_at, u.is_active, u.is_admin, u.primary_role, u.secondary_roles
      ORDER BY ${finalSortBy} ${finalSortOrder}
      LIMIT $1 OFFSET $2
    `, params)

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, search ? [`%${search}%`] : [])

    const totalUsers = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalUsers / limit)

    return NextResponse.json({
      users: users.rows,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
})

export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { userId, updates } = body

    const allowedFields = ['name', 'is_active', 'is_admin', 'primary_role']
    const updateFields = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ')

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updateValues = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => updates[key])

    const result = await query(`
      UPDATE users
      SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name, is_active, is_admin, primary_role
    `, [userId, ...updateValues])

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

export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const result = await query(`
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, name
    `, [userId])

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    })

  } catch (error) {
    console.error('Admin user delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
})