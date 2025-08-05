import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query, handleDbError } from '@/lib/db'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Insert user
    const result = await query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    )

    const user = result.rows[0]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    try {
      handleDbError(error)
    } catch (dbError: any) {
      return NextResponse.json({
        success: false,
        error: dbError.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Registration failed'
    }, { status: 500 })
  }
}