import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { 
  verifyAdminSession, 
  logAdminAction, 
  getGriefSensitiveErrorMessage,
  detectCrisisInContent 
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'active'
    const severity = searchParams.get('severity') // Optional filter
    const familyId = searchParams.get('familyId') // Optional filter
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build dynamic query conditions
    let whereConditions = ['1=1']
    let queryParams: any[] = []
    let paramIndex = 1

    if (status !== 'all') {
      whereConditions.push(`cde.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    if (severity) {
      whereConditions.push(`cde.severity_level >= $${paramIndex}`)
      queryParams.push(parseInt(severity))
      paramIndex++
    }

    if (familyId) {
      whereConditions.push(`cde.family_id = $${paramIndex}`)
      queryParams.push(familyId)
      paramIndex++
    }

    const whereClause = whereConditions.join(' AND ')

    // Get crisis detection events with comprehensive information
    const crisisResult = await query(`
      SELECT 
        cde.*,
        u.name as user_name,
        u.email as user_email,
        u.memorial_account,
        f.family_name,
        f.support_status as family_support_status,
        reviewer.name as reviewer_name,
        reviewer.email as reviewer_email,
        (
          SELECT COUNT(*) 
          FROM support_interactions si 
          WHERE si.crisis_event_id = cde.id
        ) as support_interactions_count,
        (
          SELECT si.created_at 
          FROM support_interactions si 
          WHERE si.crisis_event_id = cde.id 
          ORDER BY si.created_at DESC 
          LIMIT 1
        ) as last_support_interaction,
        (
          SELECT json_agg(
            json_build_object(
              'id', si.id,
              'type', si.interaction_type,
              'medium', si.interaction_medium,
              'outcome', si.outcome,
              'admin', si.support_admin_email,
              'created_at', si.created_at
            )
          )
          FROM support_interactions si 
          WHERE si.crisis_event_id = cde.id
          ORDER BY si.created_at DESC
        ) as support_interactions
      FROM crisis_detection_events cde
      JOIN users u ON cde.user_id = u.id
      LEFT JOIN families f ON cde.family_id = f.id
      LEFT JOIN users reviewer ON cde.reviewer_id = reviewer.id
      WHERE ${whereClause}
      ORDER BY ${sortBy === 'user_name' ? 'u.name' : `cde.${sortBy}`} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset])

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM crisis_detection_events cde
      JOIN users u ON cde.user_id = u.id
      LEFT JOIN families f ON cde.family_id = f.id
      WHERE ${whereClause}
    `, queryParams)

    const totalEvents = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalEvents / limit)

    // Get summary statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_active,
        COUNT(CASE WHEN severity_level >= 8 THEN 1 END) as critical_events,
        COUNT(CASE WHEN severity_level BETWEEN 5 AND 7 THEN 1 END) as moderate_events,
        COUNT(CASE WHEN severity_level < 5 THEN 1 END) as low_events,
        COUNT(CASE WHEN human_reviewed = false THEN 1 END) as awaiting_review,
        COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24_hours,
        AVG(ai_confidence_score) as avg_ai_confidence
      FROM crisis_detection_events
      WHERE status = 'active'
    `)

    const stats = statsResult.rows[0]

    // Format crisis events with grief-sensitive information
    const crisisEvents = crisisResult.rows.map(event => ({
      id: event.id,
      user: {
        id: event.user_id,
        name: event.user_name,
        email: event.user_email,
        isMemorialAccount: event.memorial_account
      },
      family: event.family_id ? {
        id: event.family_id,
        name: event.family_name,
        supportStatus: event.family_support_status
      } : null,
      eventType: event.event_type,
      severityLevel: event.severity_level,
      aiConfidence: parseFloat(event.ai_confidence_score) || 0,
      status: event.status,
      triggerContent: event.trigger_content ? 
        (event.severity_level >= 8 ? 
          event.trigger_content.substring(0, 200) + '...' : 
          '[Content available to crisis response team]'
        ) : null,
      sentimentAnalysis: event.sentiment_analysis,
      keywordsDetected: event.keywords_detected || [],
      responseSuggestion: event.response_suggestion,
      autoEscalated: event.auto_escalated,
      humanReviewed: event.human_reviewed,
      reviewer: event.reviewer_id ? {
        id: event.reviewer_id,
        name: event.reviewer_name,
        email: event.reviewer_email
      } : null,
      reviewNotes: event.review_notes,
      supportInteractionsCount: parseInt(event.support_interactions_count) || 0,
      supportInteractions: event.support_interactions || [],
      lastSupportInteraction: event.last_support_interaction,
      createdAt: event.created_at,
      resolvedAt: event.resolved_at,
      urgencyIndicators: {
        isHighSeverity: event.severity_level >= 8,
        isMemorialAccount: event.memorial_account,
        needsImmediateResponse: event.severity_level >= 8 && !event.human_reviewed,
        hasRecentSupport: event.last_support_interaction && 
          new Date(event.last_support_interaction) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }))

    // Log the access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'crisis_events_accessed',
      resource_type: 'crisis_detection',
      action_details: {
        status,
        severity,
        familyId,
        page,
        limit,
        eventsReturned: crisisEvents.length
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium'
    })

    return NextResponse.json({
      success: true,
      data: {
        crisisEvents,
        statistics: {
          totalActive: parseInt(stats.total_active) || 0,
          criticalEvents: parseInt(stats.critical_events) || 0,
          moderateEvents: parseInt(stats.moderate_events) || 0,
          lowEvents: parseInt(stats.low_events) || 0,
          awaitingReview: parseInt(stats.awaiting_review) || 0,
          last24Hours: parseInt(stats.last_24_hours) || 0,
          avgAiConfidence: parseFloat(stats.avg_ai_confidence) || 0
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalEvents,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Error fetching crisis events:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin permissions to create manual crisis events
    const authResult = await verifyAdminSession('crisis.respond', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      userId,
      familyId,
      eventType,
      severityLevel,
      triggerContent,
      responseSuggestion,
      reviewNotes,
      action = 'manual_review' // 'manual_review', 'analyze_content'
    } = body

    if (action === 'analyze_content') {
      // Analyze provided content for crisis indicators
      if (!userId || !triggerContent) {
        return NextResponse.json(
          { error: 'User ID and content are required for crisis analysis' },
          { status: 400 }
        )
      }

      const analysisResult = await detectCrisisInContent(userId, triggerContent, familyId)
      
      return NextResponse.json({
        success: true,
        data: {
          analysis: analysisResult,
          recommendations: analysisResult.needsIntervention ? [
            'Create formal crisis event for tracking',
            'Assign to crisis response team',
            'Schedule immediate follow-up within 2 hours',
            'Prepare compassionate outreach resources'
          ] : [
            'Continue monitoring for emotional patterns',
            'Provide gentle support resources',
            'No immediate intervention required'
          ]
        }
      })
    }

    // Manual crisis event creation
    if (!userId || !eventType || !severityLevel) {
      return NextResponse.json(
        { error: 'User ID, event type, and severity level are required' },
        { status: 400 }
      )
    }

    // Validate severity level
    if (severityLevel < 1 || severityLevel > 10) {
      return NextResponse.json(
        { error: 'Severity level must be between 1 and 10' },
        { status: 400 }
      )
    }

    // Get user information
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
    const effectiveFamilyId = familyId || user.family_id

    // Create the crisis event
    const crisisResult = await query(`
      INSERT INTO crisis_detection_events (
        user_id, family_id, event_type, severity_level, trigger_content,
        response_suggestion, human_reviewed, reviewer_id, review_notes,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, 'active', CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      userId,
      effectiveFamilyId,
      eventType,
      severityLevel,
      triggerContent,
      responseSuggestion,
      authResult.user!.id,
      reviewNotes
    ])

    const newCrisisEvent = crisisResult.rows[0]

    // Auto-escalate if severity is high
    if (severityLevel >= 8) {
      await query(`
        UPDATE crisis_detection_events 
        SET auto_escalated = true 
        WHERE id = $1
      `, [newCrisisEvent.id])

      // TODO: Trigger immediate notifications to crisis response team
      console.log(`URGENT: High-severity crisis event created for user ${user.name} (${user.email})`)
    }

    // Log the crisis event creation
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'crisis_event_created',
      resource_type: 'crisis_event',
      resource_id: newCrisisEvent.id,
      target_user_id: userId,
      target_family_id: effectiveFamilyId,
      action_details: {
        eventType,
        severityLevel,
        autoEscalated: severityLevel >= 8,
        manuallyCreated: true
      },
      after_state: newCrisisEvent,
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: severityLevel >= 8 ? 'critical' : 'high',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      message: severityLevel >= 8 ? 
        'Critical crisis event created and escalated immediately. Crisis response team will be notified.' :
        'Crisis event created successfully. Appropriate support resources will be coordinated.',
      data: {
        crisisEvent: {
          id: newCrisisEvent.id,
          eventType: newCrisisEvent.event_type,
          severityLevel: newCrisisEvent.severity_level,
          status: newCrisisEvent.status,
          autoEscalated: severityLevel >= 8,
          createdAt: newCrisisEvent.created_at
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          familyName: user.family_name
        },
        nextSteps: severityLevel >= 8 ? [
          'Crisis response team will contact user within 2 hours',
          'Emergency resources have been prepared',
          'Family will be notified if appropriate',
          'Continuous monitoring activated'
        ] : [
          'Support team will reach out within 24 hours',
          'Gentle support resources will be provided',
          'Situation will be monitored closely'
        ]
      }
    })

  } catch (error) {
    console.error('Error creating crisis event:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}