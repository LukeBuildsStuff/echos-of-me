import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { 
  verifyAdminSession, 
  logAdminAction, 
  getGriefSensitiveErrorMessage,
  createShadowSession,
  validateShadowSession,
  endShadowSession,
  recordShadowAction
} from '@/lib/admin-security'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions for user shadowing
    const authResult = await verifyAdminSession('users.shadow', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const targetUserId = params.id
    const body = await request.json()
    const { 
      reason, 
      privacyLevel = 'read_only',
      supervisorApproval = false,
      supervisorEmail,
      maxDurationHours = 4
    } = body

    // Validate required fields
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'A detailed reason (minimum 10 characters) is required for user shadowing to ensure ethical support.' },
        { status: 400 }
      )
    }

    // Get target user information
    const userResult = await query(`
      SELECT 
        u.id, u.email, u.name, u.is_active, u.memorial_account,
        fm.family_id, f.family_name, f.support_status, f.privacy_level,
        (
          SELECT COUNT(*) 
          FROM crisis_detection_events cde 
          WHERE cde.user_id = u.id AND cde.status = 'active'
        ) as active_crisis_count
      FROM users u
      LEFT JOIN family_members fm ON u.id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE u.id = $1 AND u.is_active = true
    `, [targetUserId])

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('user_not_found') },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Check if there's already an active shadow session for this user
    const existingSessionResult = await query(`
      SELECT id, admin_user_id, session_started_at 
      FROM user_shadowing_sessions 
      WHERE target_user_id = $1 AND is_active = true 
        AND session_started_at > NOW() - INTERVAL '24 hours'
    `, [targetUserId])

    if (existingSessionResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'There is already an active shadowing session for this user. Please coordinate with the current admin or end the existing session first.' },
        { status: 409 }
      )
    }

    // Enhanced privacy checks for memorial accounts
    if (targetUser.memorial_account) {
      if (privacyLevel !== 'read_only') {
        return NextResponse.json(
          { error: 'Memorial accounts can only be shadowed in read-only mode to preserve the dignity of the deceased.' },
          { status: 400 }
        )
      }
      
      if (!supervisorApproval) {
        return NextResponse.json(
          { error: 'Supervisor approval is required for shadowing memorial accounts.' },
          { status: 400 }
        )
      }
    }

    // High-privacy family checks
    if (targetUser.privacy_level === 'maximum') {
      if (!supervisorApproval) {
        return NextResponse.json(
          { error: 'Supervisor approval is required for families with maximum privacy settings.' },
          { status: 400 }
        )
      }
    }

    // Create the shadow session
    const { token, sessionId } = await createShadowSession(
      authResult.user!.id!,
      targetUserId,
      reason,
      privacyLevel
    )

    // Update session with additional details
    await query(`
      UPDATE user_shadowing_sessions 
      SET 
        supervisor_approval = $1,
        supervisor_email = $2,
        session_notes = $3
      WHERE id = $4
    `, [
      supervisorApproval,
      supervisorEmail || null,
      `Initial session created for: ${reason}`,
      sessionId
    ])

    // Log the shadow session creation
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'shadow_session_created',
      resource_type: 'user_shadow',
      resource_id: sessionId,
      target_user_id: targetUserId,
      target_family_id: targetUser.family_id,
      action_details: {
        reason,
        privacyLevel,
        supervisorApproval,
        supervisorEmail,
        targetUserEmail: targetUser.email,
        familyName: targetUser.family_name,
        isMemorialAccount: targetUser.memorial_account,
        activeCrisisCount: parseInt(targetUser.active_crisis_count) || 0
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: targetUser.memorial_account || targetUser.privacy_level === 'maximum' ? 'critical' : 'high',
      compliance_relevant: true
    })

    // Auto-end session after max duration
    setTimeout(async () => {
      try {
        await endShadowSession(sessionId, `Auto-ended after ${maxDurationHours} hours`)
      } catch (error) {
        console.error('Error auto-ending shadow session:', error)
      }
    }, maxDurationHours * 60 * 60 * 1000)

    return NextResponse.json({
      success: true,
      message: `Compassionate support session initiated for ${targetUser.name}. Please use this access thoughtfully and with the utmost care for the family's emotional wellbeing.`,
      data: {
        sessionId,
        shadowToken: token,
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          familyName: targetUser.family_name,
          isMemorialAccount: targetUser.memorial_account
        },
        sessionDetails: {
          privacyLevel,
          reason,
          supervisorApproval,
          maxDurationHours,
          expiresAt: new Date(Date.now() + maxDurationHours * 60 * 60 * 1000)
        },
        guidelines: [
          'Always act with compassion and respect for the family\'s grief journey',
          'Only access information necessary for providing support',
          'Document all actions taken during the session',
          'Maintain absolute confidentiality of family information',
          'End the session as soon as support objectives are met'
        ]
      }
    })

  } catch (error) {
    console.error('Error creating shadow session:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('users.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const targetUserId = params.id

    // Get all shadow sessions for this user
    const sessionsResult = await query(`
      SELECT 
        uss.*,
        admin_user.name as admin_name,
        admin_user.email as admin_email,
        target_user.name as target_name,
        target_user.email as target_email
      FROM user_shadowing_sessions uss
      JOIN users admin_user ON uss.admin_user_id = admin_user.id
      JOIN users target_user ON uss.target_user_id = target_user.id
      WHERE uss.target_user_id = $1
      ORDER BY uss.session_started_at DESC
      LIMIT 50
    `, [targetUserId])

    const sessions = sessionsResult.rows.map(session => ({
      id: session.id,
      adminName: session.admin_name,
      adminEmail: session.admin_email,
      targetName: session.target_name,
      targetEmail: session.target_email,
      reason: session.shadow_reason,
      privacyLevel: session.privacy_level,
      supervisorApproval: session.supervisor_approval,
      supervisorEmail: session.supervisor_email,
      sessionStarted: session.session_started_at,
      sessionEnded: session.session_ended_at,
      isActive: session.is_active,
      actionsPerformed: session.actions_performed || [],
      sensitiveDataAccessed: session.sensitive_data_accessed,
      sessionNotes: session.session_notes
    }))

    return NextResponse.json({
      success: true,
      data: {
        targetUserId,
        sessions,
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.isActive).length
      }
    })

  } catch (error) {
    console.error('Error fetching shadow sessions:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('users.shadow', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const notes = searchParams.get('notes') || 'Session ended by admin'

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required to end shadow session' },
        { status: 400 }
      )
    }

    // Verify session exists and admin has permission to end it
    const sessionResult = await query(`
      SELECT 
        uss.*,
        admin_user.email as admin_email,
        target_user.email as target_email
      FROM user_shadowing_sessions uss
      JOIN users admin_user ON uss.admin_user_id = admin_user.id
      JOIN users target_user ON uss.target_user_id = target_user.id
      WHERE uss.id = $1
    `, [sessionId])

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shadow session not found' },
        { status: 404 }
      )
    }

    const session = sessionResult.rows[0]

    // Only allow ending your own sessions or super admin
    if (session.admin_email !== authResult.user!.email && 
        !authResult.user!.permissions?.admin?.includes('delete')) {
      return NextResponse.json(
        { error: 'You can only end your own shadow sessions' },
        { status: 403 }
      )
    }

    // End the session
    await endShadowSession(sessionId, notes)

    // Log the session termination
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'shadow_session_ended',
      resource_type: 'user_shadow',
      resource_id: sessionId,
      target_user_id: session.target_user_id,
      action_details: {
        sessionDurationMinutes: Math.floor((new Date().getTime() - new Date(session.session_started_at).getTime()) / (1000 * 60)),
        endReason: notes,
        actionsPerformed: session.actions_performed?.length || 0,
        sensitiveDataAccessed: session.sensitive_data_accessed
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      message: 'Shadow session ended successfully. Thank you for providing compassionate support.',
      data: {
        sessionId,
        endedAt: new Date().toISOString(),
        sessionDuration: Math.floor((new Date().getTime() - new Date(session.session_started_at).getTime()) / (1000 * 60)) + ' minutes'
      }
    })

  } catch (error) {
    console.error('Error ending shadow session:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}