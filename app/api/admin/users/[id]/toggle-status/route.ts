import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const POST = withAdminAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const userId = params.id

    // Get current user status
    const userResult = await query(`
      SELECT id, email, name, is_active, is_admin
      FROM users
      WHERE id = $1
    `, [userId])

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]

    // Prevent deactivating admin users
    if (user.is_admin && user.is_active) {
      return NextResponse.json({ 
        error: 'Cannot deactivate admin users' 
      }, { status: 400 })
    }

    // Toggle status
    const newStatus = !user.is_active
    const result = await query(`
      UPDATE users
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, name, is_active
    `, [newStatus, userId])

    return NextResponse.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Admin user status toggle error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle user status' },
      { status: 500 }
    )
  }
})