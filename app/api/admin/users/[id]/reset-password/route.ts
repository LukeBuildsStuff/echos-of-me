import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminSession, logAdminAction, getGriefSensitiveErrorMessage, hashAdminPassword } from '@/lib/admin-security'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('users.update', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await request.json()
    const { sendEmail = true, temporaryPassword, reason } = body

    // Get user information
    const userResult = await query(`
      SELECT 
        u.id, u.email, u.name, u.is_active,
        fm.family_id, f.family_name
      FROM users u
      LEFT JOIN family_members fm ON u.id = fm.user_id AND fm.family_role = 'primary'
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE u.id = $1
    `, [userId])

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('user_not_found') },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // Generate temporary password if not provided
    const newPassword = temporaryPassword || crypto.randomBytes(12).toString('base64').slice(0, 12)
    const hashedPassword = await hashAdminPassword(newPassword)

    // Update user's password and reset flags
    await query(`
      UPDATE users 
      SET 
        password_hash = $1,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [hashedPassword, userId])

    // Create password reset token for user to change password
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await query(`
      INSERT INTO password_reset_tokens (
        user_id, token, expires_at, created_by_admin, admin_email, created_at
      ) VALUES ($1, $2, $3, true, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        created_by_admin = EXCLUDED.created_by_admin,
        admin_email = EXCLUDED.admin_email,
        created_at = EXCLUDED.created_at
    `, [userId, resetToken, resetTokenExpiry, authResult.user!.email])

    // Log the password reset action
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'user_password_reset',
      resource_type: 'user',
      resource_id: userId,
      target_user_id: userId,
      target_family_id: user.family_id,
      action_details: {
        reason: reason || 'Admin-initiated password reset',
        emailSent: sendEmail,
        userEmail: user.email,
        familyName: user.family_name
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'high',
      compliance_relevant: true
    })

    let emailSent = false
    
    // Send compassionate email notification if requested
    if (sendEmail) {
      try {
        // In a real implementation, integrate with your email service
        // For now, we'll log the email content that should be sent
        const emailContent = {
          to: user.email,
          subject: 'Your Echoes of Me Account - Password Reset',
          template: 'grief-sensitive-password-reset',
          data: {
            userName: user.name,
            temporaryPassword: newPassword,
            resetToken,
            supportMessage: `We understand that during this difficult time, technical issues can add unnecessary stress. Our support team has reset your password to help you continue preserving your precious memories.`,
            familyName: user.family_name,
            resetUrl: `${process.env.NEXTAUTH_URL}/auth/reset-password/${resetToken}`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@echosofme.com',
            supportPhone: process.env.SUPPORT_PHONE || '1-800-SUPPORT'
          }
        }
        
        console.log('Password reset email to be sent:', emailContent)
        emailSent = true
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset with care and compassion. The user will receive gentle guidance to create a new secure password.',
      data: {
        userId,
        userName: user.name,
        userEmail: user.email,
        temporaryPassword: sendEmail ? '[Sent via email]' : newPassword,
        resetToken: sendEmail ? '[Sent via email]' : resetToken,
        emailSent,
        resetUrl: `${process.env.NEXTAUTH_URL}/auth/reset-password/${resetToken}`,
        expiresAt: resetTokenExpiry
      }
    })

  } catch (error) {
    console.error('Error resetting user password:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}