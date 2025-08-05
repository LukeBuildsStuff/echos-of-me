import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminSession, logAdminAction, getGriefSensitiveErrorMessage } from '@/lib/admin-security'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('support.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const userId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const includeResolved = searchParams.get('includeResolved') === 'true'

    // Get user and family information
    const userResult = await query(`
      SELECT 
        u.id, u.name, u.email, u.memorial_account,
        fm.family_id, f.family_name, f.support_status
      FROM users u
      LEFT JOIN family_members fm ON u.id = fm.user_id
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
    const offset = (page - 1) * limit

    // Get support interactions
    const supportResult = await query(`
      SELECT 
        si.*,
        cde.event_type as crisis_event_type,
        cde.severity_level as crisis_severity,
        cde.created_at as crisis_detected_at
      FROM support_interactions si
      LEFT JOIN crisis_detection_events cde ON si.crisis_event_id = cde.id
      WHERE si.user_id = $1
        ${includeResolved ? '' : 'AND (si.follow_up_required = true OR si.created_at > CURRENT_TIMESTAMP - INTERVAL \'30 days\')'}
      ORDER BY si.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset])

    // Get crisis detection events
    const crisisResult = await query(`
      SELECT 
        cde.*,
        CASE 
          WHEN si.id IS NOT NULL THEN true 
          ELSE false 
        END as has_support_interaction
      FROM crisis_detection_events cde
      LEFT JOIN support_interactions si ON cde.id = si.crisis_event_id
      WHERE cde.user_id = $1
      ORDER BY cde.created_at DESC
      LIMIT 10
    `, [userId])

    // Get shadowing sessions history
    const shadowResult = await query(`
      SELECT 
        uss.id,
        uss.shadow_reason,
        uss.privacy_level,
        uss.session_started_at,
        uss.session_ended_at,
        uss.sensitive_data_accessed,
        uss.session_notes,
        admin_user.name as admin_name,
        admin_user.email as admin_email
      FROM user_shadowing_sessions uss
      JOIN users admin_user ON uss.admin_user_id = admin_user.id
      WHERE uss.target_user_id = $1
      ORDER BY uss.session_started_at DESC
      LIMIT 20
    `, [userId])

    // Get engagement metrics and trends
    const engagementResult = await query(`
      SELECT 
        DATE(aca.created_at) as date,
        COUNT(*) as interactions_count,
        AVG(aca.conversation_quality_score) as avg_quality_score,
        AVG(aca.emotional_resonance_score) as avg_emotional_score,
        COUNT(CASE WHEN aca.harmful_content_detected THEN 1 END) as harmful_content_flags
      FROM ai_conversation_analytics aca
      WHERE aca.user_id = $1 
        AND aca.created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
      GROUP BY DATE(aca.created_at)
      ORDER BY date DESC
    `, [userId])

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM support_interactions si
      WHERE si.user_id = $1
        ${includeResolved ? '' : 'AND (si.follow_up_required = true OR si.created_at > CURRENT_TIMESTAMP - INTERVAL \'30 days\')'}
    `, [userId])

    const totalInteractions = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalInteractions / limit)

    // Organize the data with grief-sensitive formatting
    const supportHistory = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isMemorialAccount: user.memorial_account,
        family: {
          id: user.family_id,
          name: user.family_name,
          supportStatus: user.support_status
        }
      },
      supportInteractions: supportResult.rows.map(interaction => ({
        id: interaction.id,
        type: interaction.interaction_type,
        medium: interaction.interaction_medium,
        summary: interaction.interaction_summary,
        followUpRequired: interaction.follow_up_required,
        followUpDate: interaction.follow_up_date,
        outcome: interaction.outcome,
        supportAdmin: interaction.support_admin_email,
        emotionalAssessment: interaction.emotional_assessment,
        resourcesProvided: interaction.resources_provided || [],
        createdAt: interaction.created_at,
        relatedCrisis: interaction.crisis_event_id ? {
          type: interaction.crisis_event_type,
          severity: interaction.crisis_severity,
          detectedAt: interaction.crisis_detected_at
        } : null
      })),
      crisisEvents: crisisResult.rows.map(crisis => ({
        id: crisis.id,
        type: crisis.event_type,
        severity: crisis.severity_level,
        aiConfidence: parseFloat(crisis.ai_confidence_score) || 0,
        status: crisis.status,
        triggerContent: crisis.trigger_content ? '[Content detected - details available to crisis team]' : null,
        keywordsDetected: crisis.keywords_detected || [],
        responseSuggestion: crisis.response_suggestion,
        humanReviewed: crisis.human_reviewed,
        reviewNotes: crisis.review_notes,
        hasSupportInteraction: crisis.has_support_interaction,
        createdAt: crisis.created_at,
        resolvedAt: crisis.resolved_at
      })),
      shadowingSessions: shadowResult.rows.map(session => ({
        id: session.id,
        reason: session.shadow_reason,
        privacyLevel: session.privacy_level,
        adminName: session.admin_name,
        adminEmail: session.admin_email,
        sessionStarted: session.session_started_at,
        sessionEnded: session.session_ended_at,
        sensitiveDataAccessed: session.sensitive_data_accessed,
        duration: session.session_ended_at ? 
          Math.floor((new Date(session.session_ended_at).getTime() - new Date(session.session_started_at).getTime()) / (1000 * 60)) + ' minutes' :
          'Ongoing',
        notes: session.session_notes
      })),
      engagementTrends: engagementResult.rows.map(trend => ({
        date: trend.date,
        interactionsCount: parseInt(trend.interactions_count),
        avgQualityScore: parseFloat(trend.avg_quality_score) || 0,
        avgEmotionalScore: parseFloat(trend.avg_emotional_score) || 0,
        harmfulContentFlags: parseInt(trend.harmful_content_flags) || 0
      })),
      summary: {
        totalSupportInteractions: totalInteractions,
        activeCrisisEvents: crisisResult.rows.filter(c => c.status === 'active').length,
        openFollowUps: supportResult.rows.filter(s => s.follow_up_required).length,
        recentShadowingSessions: shadowResult.rows.length,
        lastInteractionDate: supportResult.rows[0]?.created_at || null,
        needsImmediateAttention: crisisResult.rows.some(c => c.status === 'active' && c.severity_level >= 7)
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalInteractions,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    }

    // Log the access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'support_history_accessed',
      resource_type: 'user_support',
      resource_id: userId,
      target_user_id: userId,
      target_family_id: user.family_id,
      action_details: {
        page,
        limit,
        includeResolved,
        interactionsReturned: supportResult.rows.length
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      data: supportHistory
    })

  } catch (error) {
    console.error('Error fetching support history:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions to create support interactions
    const authResult = await verifyAdminSession('support.create', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await request.json()
    const {
      interactionType,
      interactionMedium,
      summary,
      followUpRequired = false,
      followUpDate,
      emotionalAssessment,
      resourcesProvided = [],
      outcome,
      crisisEventId
    } = body

    // Validate required fields
    if (!interactionType || !interactionMedium || !summary) {
      return NextResponse.json(
        { error: 'Interaction type, medium, and summary are required for support documentation.' },
        { status: 400 }
      )
    }

    // Get user and family information
    const userResult = await query(`
      SELECT 
        u.id, u.name, u.email,
        fm.family_id, f.family_name
      FROM users u
      LEFT JOIN family_members fm ON u.id = fm.user_id
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

    // Create the support interaction
    const interactionResult = await query(`
      INSERT INTO support_interactions (
        user_id, family_id, crisis_event_id, support_admin_email,
        interaction_type, interaction_medium, interaction_summary,
        follow_up_required, follow_up_date, emotional_assessment,
        resources_provided, outcome, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      userId,
      user.family_id,
      crisisEventId || null,
      authResult.user!.email,
      interactionType,
      interactionMedium,
      summary,
      followUpRequired,
      followUpDate || null,
      emotionalAssessment ? JSON.stringify(emotionalAssessment) : null,
      resourcesProvided,
      outcome
    ])

    const newInteraction = interactionResult.rows[0]

    // If this resolves a crisis event, update it
    if (crisisEventId && outcome === 'resolved') {
      await query(`
        UPDATE crisis_detection_events 
        SET 
          status = 'resolved',
          resolved_at = CURRENT_TIMESTAMP,
          human_reviewed = true,
          reviewer_id = $1
        WHERE id = $2
      `, [authResult.user!.id, crisisEventId])
    }

    // Log the support interaction creation
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'support_interaction_created',
      resource_type: 'support_interaction',
      resource_id: newInteraction.id,
      target_user_id: userId,
      target_family_id: user.family_id,
      action_details: {
        interactionType,
        interactionMedium,
        followUpRequired,
        resourcesProvided,
        outcome,
        relatedCrisisEvent: crisisEventId
      },
      after_state: newInteraction,
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      message: 'Support interaction documented with compassion and care. This record will help ensure continued quality support for the family.',
      data: {
        interaction: {
          id: newInteraction.id,
          type: newInteraction.interaction_type,
          medium: newInteraction.interaction_medium,
          summary: newInteraction.interaction_summary,
          followUpRequired: newInteraction.follow_up_required,
          followUpDate: newInteraction.follow_up_date,
          outcome: newInteraction.outcome,
          createdAt: newInteraction.created_at
        },
        user: {
          id: user.id,
          name: user.name,
          familyName: user.family_name
        }
      }
    })

  } catch (error) {
    console.error('Error creating support interaction:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}