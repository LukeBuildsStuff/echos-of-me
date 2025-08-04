import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminSession, logAdminAction, getGriefSensitiveErrorMessage } from '@/lib/admin-security'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('families.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const familyId = params.id

    // Get detailed family information
    const familyResult = await query(`
      SELECT 
        f.*,
        pc.name as primary_contact_name,
        pc.email as primary_contact_email,
        pc.last_login_at as primary_contact_last_active,
        (
          SELECT COUNT(*) 
          FROM family_members fm 
          WHERE fm.family_id = f.id
        ) as total_members,
        (
          SELECT COUNT(*) 
          FROM family_members fm 
          WHERE fm.family_id = f.id AND fm.emotional_support_needed = true
        ) as members_needing_support,
        (
          SELECT COUNT(*) 
          FROM crisis_detection_events cde 
          WHERE cde.family_id = f.id AND cde.status = 'active'
        ) as active_crisis_events,
        (
          SELECT COUNT(*) 
          FROM support_interactions si 
          WHERE si.family_id = f.id
        ) as total_support_interactions
      FROM families f
      LEFT JOIN users pc ON f.primary_contact_id = pc.id
      WHERE f.id = $1
    `, [familyId])

    if (familyResult.rows.length === 0) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('family_not_found') },
        { status: 404 }
      )
    }

    const family = familyResult.rows[0]

    // Get all family members with detailed information
    const membersResult = await query(`
      SELECT 
        fm.*,
        u.name,
        u.email,
        u.last_login_at,
        u.created_at as user_created_at,
        u.memorial_account,
        u.failed_login_attempts,
        (
          SELECT COUNT(*) 
          FROM responses r 
          WHERE r.user_id = u.id AND r.is_draft = false
        ) as memories_shared,
        (
          SELECT COUNT(*) 
          FROM ai_conversation_analytics aca 
          WHERE aca.user_id = u.id
        ) as ai_interactions,
        (
          SELECT AVG(aca.conversation_quality_score) 
          FROM ai_conversation_analytics aca 
          WHERE aca.user_id = u.id
        ) as avg_conversation_quality,
        (
          SELECT COUNT(*) 
          FROM crisis_detection_events cde 
          WHERE cde.user_id = u.id AND cde.status = 'active'
        ) as active_crisis_count,
        (
          SELECT json_agg(
            json_build_object(
              'id', cde.id,
              'event_type', cde.event_type,
              'severity_level', cde.severity_level,
              'created_at', cde.created_at,
              'status', cde.status
            )
          )
          FROM crisis_detection_events cde 
          WHERE cde.user_id = u.id AND cde.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
          ORDER BY cde.created_at DESC
          LIMIT 5
        ) as recent_crisis_events
      FROM family_members fm
      JOIN users u ON fm.user_id = u.id
      WHERE fm.family_id = $1
      ORDER BY fm.family_role = 'primary' DESC, fm.joined_family_at ASC
    `, [familyId])

    // Get recent family engagement metrics
    const metricsResult = await query(`
      SELECT 
        fem.*,
        DATE(fem.metric_date) as metric_date_formatted
      FROM family_engagement_metrics fem
      WHERE fem.family_id = $1
      ORDER BY fem.metric_date DESC
      LIMIT 30
    `, [familyId])

    // Get recent support interactions
    const supportResult = await query(`
      SELECT 
        si.*,
        u.name as user_name,
        u.email as user_email
      FROM support_interactions si
      JOIN users u ON si.user_id = u.id
      WHERE si.family_id = $1
      ORDER BY si.created_at DESC
      LIMIT 10
    `, [familyId])

    // Get recent AI conversation analytics
    const conversationsResult = await query(`
      SELECT 
        aca.*,
        u.name as user_name
      FROM ai_conversation_analytics aca
      JOIN users u ON aca.user_id = u.id
      WHERE aca.family_id = $1
      ORDER BY aca.created_at DESC
      LIMIT 20
    `, [familyId])

    // Log the access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'family_details_accessed',
      resource_type: 'family',
      resource_id: familyId,
      target_family_id: familyId,
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'low'
    })

    const responseData = {
      id: family.id,
      name: family.family_name,
      familyStory: family.family_story,
      location: family.location,
      phoneNumber: family.phone_number,
      emergencyContact: family.emergency_contact_email,
      supportStatus: family.support_status,
      privacyLevel: family.privacy_level,
      isMemorial: family.memorial_status,
      memorialDate: family.memorial_date,
      primaryContact: {
        id: family.primary_contact_id,
        name: family.primary_contact_name,
        email: family.primary_contact_email,
        lastActive: family.primary_contact_last_active
      },
      statistics: {
        totalMembers: parseInt(family.total_members) || 0,
        membersNeedingSupport: parseInt(family.members_needing_support) || 0,
        activeCrisisEvents: parseInt(family.active_crisis_events) || 0,
        totalSupportInteractions: parseInt(family.total_support_interactions) || 0
      },
      members: membersResult.rows.map(member => ({
        id: member.user_id,
        name: member.name,
        email: member.email,
        familyRole: member.family_role,
        relationshipDescription: member.relationship_description,
        isGuardian: member.is_guardian,
        canManageFamily: member.can_manage_family,
        needsSupport: member.emotional_support_needed,
        supportNotes: member.support_notes,
        lastActive: member.last_login_at,
        joinedFamilyAt: member.joined_family_at,
        userCreatedAt: member.user_created_at,
        isMemorialAccount: member.memorial_account,
        failedLoginAttempts: member.failed_login_attempts,
        memoriesShared: parseInt(member.memories_shared) || 0,
        aiInteractions: parseInt(member.ai_interactions) || 0,
        avgConversationQuality: parseFloat(member.avg_conversation_quality) || 0,
        activeCrisisCount: parseInt(member.active_crisis_count) || 0,
        recentCrisisEvents: member.recent_crisis_events || []
      })),
      engagementMetrics: metricsResult.rows.map(metric => ({
        date: metric.metric_date_formatted,
        activeMembersCount: metric.active_members_count,
        totalMemoriesShared: metric.total_memories_shared,
        aiInteractionsCount: metric.ai_interactions_count,
        qualityInteractionsCount: metric.quality_interactions_count,
        supportRequestsCount: metric.support_requests_count,
        familyCohesionScore: parseFloat(metric.family_cohesion_score) || 0,
        healingProgressIndicators: metric.healing_progress_indicators,
        griefStageAssessment: metric.grief_stage_assessment,
        alertsGenerated: metric.alerts_generated,
        positiveMilestones: metric.positive_milestones || [],
        concernsIdentified: metric.concerns_identified || []
      })),
      recentSupportInteractions: supportResult.rows.map(interaction => ({
        id: interaction.id,
        userName: interaction.user_name,
        userEmail: interaction.user_email,
        interactionType: interaction.interaction_type,
        interactionMedium: interaction.interaction_medium,
        summary: interaction.interaction_summary,
        followUpRequired: interaction.follow_up_required,
        followUpDate: interaction.follow_up_date,
        outcome: interaction.outcome,
        supportAdmin: interaction.support_admin_email,
        createdAt: interaction.created_at
      })),
      recentConversations: conversationsResult.rows.map(conv => ({
        id: conv.id,
        userName: conv.user_name,
        conversationId: conv.conversation_id,
        modelVersion: conv.model_version,
        qualityScore: parseFloat(conv.conversation_quality_score) || 0,
        emotionalResonanceScore: parseFloat(conv.emotional_resonance_score) || 0,
        memoryAccuracyScore: parseFloat(conv.memory_accuracy_score) || 0,
        conversationLength: conv.conversation_length,
        topicsCovered: conv.topics_covered || [],
        emotionalThemes: conv.emotional_themes || [],
        harmfulContentDetected: conv.harmful_content_detected,
        createdAt: conv.created_at
      })),
      createdAt: family.created_at,
      updatedAt: family.updated_at
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Error fetching family details:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('families.update', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const familyId = params.id
    const body = await request.json()

    // Get current family state for audit log
    const currentFamilyResult = await query('SELECT * FROM families WHERE id = $1', [familyId])
    if (currentFamilyResult.rows.length === 0) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('family_not_found') },
        { status: 404 }
      )
    }

    const currentFamily = currentFamilyResult.rows[0]

    // Build update query dynamically
    const allowedFields = [
      'family_name', 'family_story', 'location', 'phone_number',
      'emergency_contact_email', 'support_status', 'privacy_level',
      'memorial_status', 'memorial_date'
    ]

    const updates = []
    const values = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(body)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      if (allowedFields.includes(dbField)) {
        updates.push(`${dbField} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(familyId)

    const updateQuery = `
      UPDATE families 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await query(updateQuery, values)
    const updatedFamily = result.rows[0]

    // Log the update
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'family_updated',
      resource_type: 'family',
      resource_id: familyId,
      target_family_id: familyId,
      action_details: body,
      before_state: currentFamily,
      after_state: updatedFamily,
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      data: updatedFamily
    })

  } catch (error) {
    console.error('Error updating family:', error)
    
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
    const authResult = await verifyAdminSession('families.delete', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const familyId = params.id

    // Get family details before deletion for audit
    const familyResult = await query('SELECT * FROM families WHERE id = $1', [familyId])
    if (familyResult.rows.length === 0) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('family_not_found') },
        { status: 404 }
      )
    }

    const family = familyResult.rows[0]

    // Check if family has active crisis events
    const crisisCheck = await query(
      'SELECT COUNT(*) as count FROM crisis_detection_events WHERE family_id = $1 AND status = $2',
      [familyId, 'active']
    )

    if (parseInt(crisisCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete family with active crisis events. Please resolve all crisis situations first.' },
        { status: 400 }
      )
    }

    // For grief-sensitive deletion, we should archive rather than permanently delete
    // This preserves the precious memories while respecting the deletion request
    await query(`
      UPDATE families 
      SET 
        family_name = CONCAT('[ARCHIVED] ', family_name),
        support_status = 'stable',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [familyId])

    // Mark family members as archived (don't delete the relationship)
    await query(`
      UPDATE family_members 
      SET emotional_support_needed = false
      WHERE family_id = $1
    `, [familyId])

    // Log the archival (not deletion) for grief sensitivity
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'family_archived',
      resource_type: 'family',
      resource_id: familyId,
      target_family_id: familyId,
      action_details: { reason: 'admin_requested_deletion', archived_instead_of_deleted: true },
      before_state: family,
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'high',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      message: 'Family has been compassionately archived while preserving precious memories. All family data remains secure and can be restored if needed.',
      data: { 
        archived: true, 
        familyId,
        preservedMemories: true 
      }
    })

  } catch (error) {
    console.error('Error archiving family:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}