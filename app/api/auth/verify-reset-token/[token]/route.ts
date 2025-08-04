import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface RouteParams {
  params: {
    token: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    // Check if token exists and is not expired
    const result = await query(
      `SELECT id, email 
       FROM users 
       WHERE reset_token = $1 
         AND reset_token_expires > NOW() 
         AND is_active = true`,
      [token]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'This reset link has expired or is invalid. Please request a new password reset.'
      })
    }

    return NextResponse.json({
      valid: true,
      message: 'Token is valid'
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}