import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Get user from database
    const result = await query(`
      SELECT id, email, name, password_hash, is_admin 
      FROM users 
      WHERE email = $1 AND is_active = true
    `, [email])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = result.rows[0]

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Update last login
    await query(`
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id])

    // Create simple session data (base64 encoded for basic security)
    const sessionData = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.is_admin,
      loginTime: Date.now()
    })).toString('base64')

    // Set session as HTTP-only cookie
    const response = NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        isAdmin: user.is_admin 
      } 
    })

    response.cookies.set('auth-session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}