import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const userResult = await query(
      'SELECT id, email, name FROM users WHERE email = $1 AND is_active = true',
      [email]
    )

    // Always return success to prevent email enumeration attacks
    if (userResult.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with that email exists, we have sent password reset instructions.' 
      })
    }

    const user = userResult.rows[0]

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store reset token in database
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    )

    // Send reset email
    try {
      await sendResetEmail(email, user.name, resetToken)
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      // Don't expose email sending failures to prevent information disclosure
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with that email exists, we have sent password reset instructions.' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset instructions have been sent to your email.' 
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendResetEmail(email: string, name: string, resetToken: string) {
  // Configure nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password/${resetToken}`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset - Echos Of Me</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .content { background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
        .button { display: inline-block; background: linear-gradient(to right, #3b82f6, #06b6d4); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
        .footer { font-size: 14px; color: #6b7280; text-align: center; }
        .security-note { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">💙 Echos Of Me</div>
          <p>Preserving Your Legacy for Future Generations</p>
        </div>
        
        <div class="content">
          <h2>Password Reset Request</h2>
          
          <p>Hello ${name},</p>
          
          <p>We received a request to reset the password for your Echos Of Me account. Your precious memories and legacy preservation are important to us, so we want to make sure you can always access your account securely.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </p>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace;">
            ${resetUrl}
          </p>
          
          <div class="security-note">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0;">
              <li>This link will expire in 24 hours for your security</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your account remains secure and no changes have been made</li>
            </ul>
          </div>
          
          <p>Keep building your beautiful legacy,<br>
          The Echos Of Me Team</p>
        </div>
        
        <div class="footer">
          <p>This email was sent from Echos Of Me password reset system.</p>
          <p>If you have questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const mailOptions = {
    from: `"Echos Of Me" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - Echos Of Me',
    html: htmlContent,
    text: `
Hello ${name},

We received a request to reset the password for your Echos Of Me account.

Reset your password by clicking this link: ${resetUrl}

This link will expire in 24 hours for your security.

If you didn't request this reset, please ignore this email.

Keep building your beautiful legacy,
The Echos Of Me Team
    `.trim()
  }

  await transporter.sendMail(mailOptions)
}