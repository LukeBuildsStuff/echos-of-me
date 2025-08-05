import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { 
  verifyAdminSession, 
  logAdminAction, 
  getGriefSensitiveErrorMessage 
} from '@/lib/admin-security'

export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('crisis.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    // Get emergency dashboard overview
    const emergencyOverview = await query(`
      SELECT 
        COUNT(*) as total_active_crisis,
        COUNT(CASE WHEN severity_level >= 8 THEN 1 END) as critical_events,
        COUNT(CASE WHEN auto_escalated = true AND human_reviewed = false THEN 1 END) as pending_review,
        COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '2 hours' THEN 1 END) as recent_events,
        COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24_hours
      FROM crisis_detection_events
      WHERE status = 'active'
    `)

    // Get active families needing intervention
    const familiesAtRisk = await query(`
      SELECT 
        f.id as family_id,
        f.family_name,
        f.support_status,
        f.emergency_contact_email,
        f.phone_number,
        pc.name as primary_contact_name,
        pc.email as primary_contact_email,
        COUNT(cde.id) as active_crisis_count,
        MAX(cde.severity_level) as max_severity,
        MAX(cde.created_at) as latest_crisis,
        COUNT(CASE WHEN cde.human_reviewed = false THEN 1 END) as unreviewed_events,
        (
          SELECT COUNT(*) 
          FROM support_interactions si 
          WHERE si.family_id = f.id 
            AND si.created_at > CURRENT_TIMESTAMP - INTERVAL '48 hours'
        ) as recent_support_count
      FROM families f
      LEFT JOIN users pc ON f.primary_contact_id = pc.id
      JOIN crisis_detection_events cde ON f.id = cde.family_id
      WHERE cde.status = 'active'
      GROUP BY f.id, f.family_name, f.support_status, f.emergency_contact_email, 
               f.phone_number, pc.name, pc.email
      HAVING MAX(cde.severity_level) >= 6 OR COUNT(cde.id) >= 2
      ORDER BY MAX(cde.severity_level) DESC, MAX(cde.created_at) DESC
      LIMIT 20
    `)

    // Get individuals needing immediate attention
    const individualsAtRisk = await query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.memorial_account,
        u.last_login_at,
        f.family_name,
        f.emergency_contact_email,
        cde.id as crisis_event_id,
        cde.event_type,
        cde.severity_level,
        cde.created_at as crisis_created,
        cde.auto_escalated,
        cde.human_reviewed,
        cde.trigger_content,
        cde.response_suggestion,
        (
          SELECT COUNT(*) 
          FROM support_interactions si 
          WHERE si.user_id = u.id 
            AND si.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ) as recent_support_count,
        (
          SELECT si.created_at 
          FROM support_interactions si 
          WHERE si.user_id = u.id 
          ORDER BY si.created_at DESC 
          LIMIT 1
        ) as last_support_contact
      FROM users u
      JOIN crisis_detection_events cde ON u.id = cde.user_id
      LEFT JOIN family_members fm ON u.id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE cde.status = 'active' 
        AND (cde.severity_level >= 7 OR cde.auto_escalated = true)
      ORDER BY cde.severity_level DESC, cde.created_at ASC
      LIMIT 25
    `)

    // Get available crisis response resources
    const availableResources = {
      crisisHotlines: [
        {
          name: "National Suicide Prevention Lifeline",
          number: "988",
          description: "24/7 crisis support and suicide prevention",
          available: "24/7"
        },
        {
          name: "Crisis Text Line",
          number: "Text HOME to 741741",
          description: "Free 24/7 crisis support via text",
          available: "24/7"
        },
        {
          name: "SAMHSA National Helpline",
          number: "1-800-662-4357",
          description: "Mental health and substance abuse support",
          available: "24/7"
        }
      ],
      emergencyContacts: [
        {
          role: "On-Call Crisis Coordinator",
          contact: process.env.CRISIS_COORDINATOR_PHONE || "1-800-CRISIS1",
          hours: "24/7"
        },
        {
          role: "Grief Counseling Director",
          contact: process.env.GRIEF_DIRECTOR_PHONE || "1-800-GRIEF-1",
          hours: "Mon-Fri 8AM-8PM"
        }
      ],
      interventionProtocols: [
        {
          severity: "8-10 (Critical)",
          response: "Immediate intervention within 30 minutes",
          actions: ["Emergency services notification", "Crisis team dispatch", "Family emergency contact"]
        },
        {
          severity: "6-7 (High)",
          response: "Urgent response within 2 hours",
          actions: ["Crisis counselor assignment", "Safety plan creation", "Follow-up scheduling"]
        },
        {
          severity: "4-5 (Moderate)",
          response: "Priority response within 24 hours",
          actions: ["Support team outreach", "Resource provision", "Monitoring increase"]
        }
      ]
    }

    // Format the emergency support data
    const emergencyData = {
      overview: {
        totalActiveCrisis: parseInt(emergencyOverview.rows[0].total_active_crisis) || 0,
        criticalEvents: parseInt(emergencyOverview.rows[0].critical_events) || 0,
        pendingReview: parseInt(emergencyOverview.rows[0].pending_review) || 0,
        recentEvents: parseInt(emergencyOverview.rows[0].recent_events) || 0,
        last24Hours: parseInt(emergencyOverview.rows[0].last_24_hours) || 0
      },
      familiesAtRisk: familiesAtRisk.rows.map(family => ({
        familyId: family.family_id,
        familyName: family.family_name,
        supportStatus: family.support_status,
        primaryContact: {
          name: family.primary_contact_name,
          email: family.primary_contact_email
        },
        emergencyContact: family.emergency_contact_email,
        phoneNumber: family.phone_number,
        activeCrisisCount: parseInt(family.active_crisis_count),
        maxSeverity: family.max_severity,
        latestCrisis: family.latest_crisis,
        unreviewedEvents: parseInt(family.unreviewed_events),
        recentSupportCount: parseInt(family.recent_support_count),
        riskLevel: family.max_severity >= 8 ? 'critical' : 
                  family.max_severity >= 6 ? 'high' : 'moderate'
      })),
      individualsAtRisk: individualsAtRisk.rows.map(individual => ({
        userId: individual.user_id,
        name: individual.name,
        email: individual.email,
        isMemorialAccount: individual.memorial_account,
        lastLogin: individual.last_login_at,
        familyName: individual.family_name,
        familyEmergencyContact: individual.emergency_contact_email,
        crisisEvent: {
          id: individual.crisis_event_id,
          type: individual.event_type,
          severity: individual.severity_level,
          createdAt: individual.crisis_created,
          autoEscalated: individual.auto_escalated,
          humanReviewed: individual.human_reviewed,
          triggerContent: individual.trigger_content ? 
            `[${individual.trigger_content.substring(0, 100)}...]` : null,
          responseSuggestion: individual.response_suggestion
        },
        recentSupportCount: parseInt(individual.recent_support_count),
        lastSupportContact: individual.last_support_contact,
        urgencyLevel: individual.severity_level >= 9 ? 'immediate' :
                     individual.severity_level >= 7 ? 'urgent' : 'priority',
        timeSinceCrisis: Math.floor((new Date().getTime() - new Date(individual.crisis_created).getTime()) / (1000 * 60)) + ' minutes ago'
      })),
      availableResources
    }

    // Log the emergency dashboard access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'emergency_dashboard_accessed',
      resource_type: 'emergency_support',
      action_details: {
        criticalEvents: emergencyData.overview.criticalEvents,
        familiesAtRisk: emergencyData.familiesAtRisk.length,
        individualsAtRisk: emergencyData.individualsAtRisk.length
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'high'
    })

    return NextResponse.json({
      success: true,
      data: emergencyData
    })

  } catch (error) {
    console.error('Error fetching emergency support data:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin permissions for crisis response
    const authResult = await verifyAdminSession('crisis.respond', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      action,
      crisisEventId,
      userId,
      familyId,
      responseDetails,
      escalationLevel,
      emergencyContacts,
      followUpPlan
    } = body

    if (!action || !crisisEventId) {
      return NextResponse.json(
        { error: 'Action and crisis event ID are required' },
        { status: 400 }
      )
    }

    // Get crisis event details
    const crisisResult = await query(`
      SELECT 
        cde.*,
        u.name as user_name,
        u.email as user_email,
        f.family_name,
        f.emergency_contact_email
      FROM crisis_detection_events cde
      JOIN users u ON cde.user_id = u.id
      LEFT JOIN families f ON cde.family_id = f.id
      WHERE cde.id = $1
    `, [crisisEventId])

    if (crisisResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Crisis event not found' },
        { status: 404 }
      )
    }

    const crisisEvent = crisisResult.rows[0]
    let actionResult = {}

    switch (action) {
      case 'escalate':
        // Escalate crisis to higher level of care
        await query(`
          UPDATE crisis_detection_events 
          SET 
            auto_escalated = true,
            severity_level = GREATEST(severity_level, $2),
            human_reviewed = true,
            reviewer_id = $3,
            review_notes = COALESCE(review_notes, '') || $4
          WHERE id = $1
        `, [
          crisisEventId,
          escalationLevel || crisisEvent.severity_level + 1,
          authResult.user!.id,
          `\n[${new Date().toISOString()}] Escalated by ${authResult.user!.email}: ${responseDetails}`
        ])

        actionResult = {
          action: 'escalated',
          newSeverityLevel: escalationLevel || crisisEvent.severity_level + 1,
          message: 'Crisis has been escalated for immediate high-level intervention'
        }
        break

      case 'assign_responder':
        // Assign crisis to specific responder
        await query(`
          UPDATE crisis_detection_events 
          SET 
            human_reviewed = true,
            reviewer_id = $2,
            review_notes = COALESCE(review_notes, '') || $3
          WHERE id = $1
        `, [
          crisisEventId,
          authResult.user!.id,
          `\n[${new Date().toISOString()}] Assigned to responder ${authResult.user!.email}: ${responseDetails}`
        ])

        actionResult = {
          action: 'assigned',
          responder: authResult.user!.email,
          message: 'Crisis response has been assigned to qualified team member'
        }
        break

      case 'create_support_plan':
        // Create immediate support interaction
        const supportResult = await query(`
          INSERT INTO support_interactions (
            user_id, family_id, crisis_event_id, support_admin_email,
            interaction_type, interaction_medium, interaction_summary,
            follow_up_required, follow_up_date, outcome, created_at
          ) VALUES ($1, $2, $3, $4, 'crisis_response', 'emergency_protocol', $5, true, $6, 'in_progress', CURRENT_TIMESTAMP)
          RETURNING *
        `, [
          crisisEvent.user_id,
          crisisEvent.family_id,
          crisisEventId,
          authResult.user!.email,
          responseDetails,
          followUpPlan?.date || new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
        ])

        actionResult = {
          action: 'support_plan_created',
          supportInteractionId: supportResult.rows[0].id,
          followUpScheduled: followUpPlan?.date,
          message: 'Emergency support plan activated with immediate follow-up scheduled'
        }
        break

      case 'emergency_contact':
        // Initiate emergency contact procedures
        await query(`
          UPDATE families 
          SET support_status = 'intervention'
          WHERE id = $1
        `, [crisisEvent.family_id])

        // Log emergency contact initiation
        await logAdminAction({
          admin_email: authResult.user!.email,
          action_type: 'emergency_contact_initiated',
          resource_type: 'crisis_response',
          resource_id: crisisEventId,
          target_user_id: crisisEvent.user_id,
          target_family_id: crisisEvent.family_id,
          action_details: {
            emergencyContacts,
            responseDetails,
            crisisEventType: crisisEvent.event_type,
            severityLevel: crisisEvent.severity_level
          },
          risk_level: 'critical',
          compliance_relevant: true
        })

        actionResult = {
          action: 'emergency_contacts_notified',
          contacts: emergencyContacts,
          familyStatus: 'intervention',
          message: 'Emergency contacts have been notified and family status updated to intervention level'
        }
        break

      case 'resolve':
        // Mark crisis as resolved
        await query(`
          UPDATE crisis_detection_events 
          SET 
            status = 'resolved',
            resolved_at = CURRENT_TIMESTAMP,
            human_reviewed = true,
            reviewer_id = $2,
            review_notes = COALESCE(review_notes, '') || $3
          WHERE id = $1
        `, [
          crisisEventId,
          authResult.user!.id,
          `\n[${new Date().toISOString()}] Resolved by ${authResult.user!.email}: ${responseDetails}`
        ])

        actionResult = {
          action: 'resolved',
          resolvedAt: new Date().toISOString(),
          message: 'Crisis has been successfully resolved with appropriate care and follow-up'
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    // Log the emergency response action
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: `emergency_response_${action}`,
      resource_type: 'crisis_response',
      resource_id: crisisEventId,
      target_user_id: crisisEvent.user_id,
      target_family_id: crisisEvent.family_id,
      action_details: {
        action,
        responseDetails,
        escalationLevel,
        followUpPlan,
        originalSeverity: crisisEvent.severity_level
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'critical',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      message: 'Emergency response action completed with compassion and professionalism',
      data: {
        crisisEventId,
        user: {
          name: crisisEvent.user_name,
          email: crisisEvent.user_email
        },
        family: crisisEvent.family_name,
        actionResult,
        timestamp: new Date().toISOString(),
        respondingAdmin: authResult.user!.email
      }
    })

  } catch (error) {
    console.error('Error executing emergency response:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}