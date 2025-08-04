import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get all users with detailed information
    const users = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.is_active,
        u.is_admin,
        u.primary_role,
        u.secondary_roles,
        u.failed_login_attempts,
        COUNT(r.id) as total_responses,
        MAX(r.created_at) as last_response_at,
        fm.family_id,
        f.family_name,
        fm.family_role
      FROM users u
      LEFT JOIN responses r ON u.id = r.user_id
      LEFT JOIN family_members fm ON u.id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.id
      GROUP BY u.id, u.name, u.email, u.created_at, u.updated_at, u.last_login_at, 
               u.is_active, u.is_admin, u.primary_role, u.secondary_roles, 
               u.failed_login_attempts, fm.family_id, f.family_name, fm.family_role
      ORDER BY u.created_at DESC
    `)

    // Create CSV content
    const headers = [
      'ID',
      'Name',
      'Email',
      'Primary Role',
      'Is Admin',
      'Is Active',
      'Created At',
      'Last Login',
      'Total Responses',
      'Last Response',
      'Family Name',
      'Family Role',
      'Failed Login Attempts'
    ]

    const csvRows = users.rows.map(user => [
      user.id,
      user.name || '',
      user.email || '',
      user.primary_role || '',
      user.is_admin ? 'Yes' : 'No',
      user.is_active ? 'Yes' : 'No',
      user.created_at ? new Date(user.created_at).toISOString() : '',
      user.last_login_at ? new Date(user.last_login_at).toISOString() : '',
      user.total_responses || '0',
      user.last_response_at ? new Date(user.last_response_at).toISOString() : '',
      user.family_name || '',
      user.family_role || '',
      user.failed_login_attempts || '0'
    ])

    // Escape CSV values and handle commas/quotes
    const escapeCsvValue = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        row.map(field => escapeCsvValue(String(field))).join(',')
      )
    ].join('\n')

    // Set headers for file download
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache'
      }
    })

    return response

  } catch (error) {
    console.error('User export error:', error)
    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    )
  }
})