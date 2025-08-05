import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface CrisisFilters {
  severity?: string[]
  status?: string[]
  familyId?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  crisisType?: string[]
  escalationUrgency?: string[]
  memoryPreservationRisk?: boolean
  page?: number
  limit?: number
}

// Enhanced crisis analysis for error logs
function generateCrisisResponse(crisis: any): {
  immediateActions: string[]
  supportResources: string[]
  followUpRequired: boolean
  escalationLevel: 'low' | 'medium' | 'high' | 'critical'
} {
  const immediateActions: string[] = []
  const supportResources: string[] = []
  let followUpRequired = true
  let escalationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

  // Determine escalation level based on crisis details
  if (crisis.crisis_severity === 'critical' || crisis.memory_preservation_risk) {
    escalationLevel = 'critical'
    immediateActions.push('Alert crisis response team immediately')
    immediateActions.push('Prepare emergency technical intervention')
    immediateActions.push('Notify family within 30 minutes with compassionate messaging')
    supportResources.push('24/7 grief counseling hotline')
    supportResources.push('Technical support specialist assignment')
    supportResources.push('Memory preservation emergency protocol')
  } else if (crisis.crisis_severity === 'high') {
    escalationLevel = 'high'
    immediateActions.push('Assign senior technical specialist')
    immediateActions.push('Contact family within 2 hours')
    immediateActions.push('Prepare backup systems for affected memories')
    supportResources.push('Grief-sensitive technical support')
    supportResources.push('Family liaison coordinator')
  } else if (crisis.crisis_severity === 'medium') {
    escalationLevel = 'medium'
    immediateActions.push('Assign technical support representative')
    immediateActions.push('Schedule family communication within 24 hours')
    supportResources.push('Standard technical support')
    supportResources.push('Family support resources')
  } else {
    escalationLevel = 'low'
    immediateActions.push('Monitor for escalation patterns')
    immediateActions.push('Prepare gentle follow-up communication')
    supportResources.push('Self-service support resources')
    followUpRequired = false
  }

  // Add specific actions based on error type
  if (crisis.affected_feature?.includes('conversation') || crisis.affected_feature?.includes('ai-echo')) {
    immediateActions.push('Verify AI conversation system integrity')
    supportResources.push('Conversation restoration specialists')
  }

  if (crisis.affected_feature?.includes('voice')) {
    immediateActions.push('Check voice processing and storage systems')
    supportResources.push('Voice synthesis technical support')
  }

  if (crisis.family_impact === 'severe') {
    immediateActions.push('Activate family crisis support protocol')
    supportResources.push('Specialized grief counseling')
    supportResources.push('Family crisis intervention team')
  }

  return {
    immediateActions,
    supportResources,
    followUpRequired,
    escalationLevel
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to crisis management system' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse crisis-specific filters
    const filters: CrisisFilters = {
      severity: searchParams.get('severity')?.split(',').filter(Boolean),
      status: searchParams.get('status')?.split(',').filter(Boolean) || ['open', 'in_progress'],
      familyId: searchParams.get('familyId') || undefined,
      userId: searchParams.get('userId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      crisisType: searchParams.get('crisisType')?.split(',').filter(Boolean),
      escalationUrgency: searchParams.get('escalationUrgency')?.split(',').filter(Boolean),
      memoryPreservationRisk: searchParams.get('memoryPreservationRisk') === 'true',
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '25'), 50)
    }

    // Build dynamic WHERE clause
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (filters.status?.length) {
      conditions.push(`fce.status = ANY($${paramIndex})`)
      params.push(filters.status)
      paramIndex++
    }

    if (filters.severity?.length) {
      conditions.push(`el.severity = ANY($${paramIndex})`)
      params.push(filters.severity)
      paramIndex++
    }

    if (filters.familyId) {
      conditions.push(`fce.family_id = $${paramIndex}`)
      params.push(parseInt(filters.familyId))
      paramIndex++
    }

    if (filters.userId) {
      conditions.push(`fce.user_id = $${paramIndex}`)
      params.push(parseInt(filters.userId))
      paramIndex++
    }

    if (filters.dateFrom) {
      conditions.push(`fce.detected_at >= $${paramIndex}`)
      params.push(filters.dateFrom)
      paramIndex++
    }

    if (filters.dateTo) {
      conditions.push(`fce.detected_at <= $${paramIndex}`)
      params.push(filters.dateTo)
      paramIndex++
    }

    if (filters.crisisType?.length) {
      conditions.push(`fce.crisis_type = ANY($${paramIndex})`)
      params.push(filters.crisisType)
      paramIndex++
    }

    if (filters.escalationUrgency?.length) {
      conditions.push(`el.escalation_urgency = ANY($${paramIndex})`)
      params.push(filters.escalationUrgency)
      paramIndex++
    }

    if (filters.memoryPreservationRisk) {
      conditions.push('el.memory_preservation_risk = TRUE')
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get crisis escalations with comprehensive context
    const offset = (filters.page! - 1) * filters.limit!
    const crisisQuery = `
      SELECT 
        fce.*,
        el.error_id,
        el.title as error_title,
        el.message as error_message,
        el.severity,
        el.family_impact,
        el.affected_feature,
        el.grief_context_detected,
        el.memory_preservation_risk,
        el.escalation_urgency,
        el.timestamp as error_timestamp,
        u.email as user_email,
        u.name as user_name,
        family_user.email as family_contact_email,
        family_user.name as family_contact_name,
        resolver.email as resolver_email,
        resolver.name as resolver_name,
        (
          SELECT COUNT(*) 
          FROM family_impact_notifications fin 
          WHERE fin.error_log_id = el.id
        ) as family_notifications_sent,
        (
          SELECT json_agg(
            json_build_object(
              'id', fin.id,
              'type', fin.notification_type,
              'sent_at', fin.sent_at,
              'acknowledged_at', fin.acknowledged_at,
              'satisfaction_rating', fin.satisfaction_rating,
              'support_offered', fin.support_offered
            )
          )
          FROM family_impact_notifications fin 
          WHERE fin.error_log_id = el.id
          ORDER BY fin.sent_at DESC
        ) as family_communications,
        (
          SELECT er.resolution_type
          FROM error_resolutions er 
          WHERE er.error_log_id = el.id
          ORDER BY er.created_at DESC
          LIMIT 1
        ) as latest_resolution_type
      FROM family_crisis_escalations fce
      JOIN error_logs el ON fce.error_log_id = el.id
      LEFT JOIN users u ON fce.user_id = u.id
      LEFT JOIN users family_user ON fce.family_id = family_user.id
      LEFT JOIN users resolver ON el.resolved_by = resolver.id
      ${whereClause}
      ORDER BY 
        CASE fce.crisis_severity::text 
          WHEN 'critical' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        fce.detected_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    const crisisResult = await db.query(crisisQuery, [...params, filters.limit, offset])
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM family_crisis_escalations fce
      JOIN error_logs el ON fce.error_log_id = el.id
      ${whereClause}
    `
    
    const countResult = await db.query(countQuery, params)
    const totalCount = parseInt(countResult.rows[0].total)
    
    // Get crisis statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_crises,
        COUNT(CASE WHEN fce.status = 'open' THEN 1 END) as open_crises,
        COUNT(CASE WHEN fce.status = 'in_progress' THEN 1 END) as in_progress_crises,
        COUNT(CASE WHEN fce.crisis_severity = 'critical' THEN 1 END) as critical_crises,
        COUNT(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 END) as memory_risk_crises,
        COUNT(CASE WHEN fce.family_contacted = TRUE THEN 1 END) as families_contacted,
        COUNT(CASE WHEN fce.emergency_support_provided = TRUE THEN 1 END) as emergency_support_provided,
        COUNT(CASE WHEN fce.detected_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24h_count,
        COUNT(CASE WHEN fce.detected_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as last_hour_count,
        AVG(fce.response_time_minutes) as avg_response_time,
        AVG(fce.resolution_time_minutes) as avg_resolution_time
      FROM family_crisis_escalations fce
      JOIN error_logs el ON fce.error_log_id = el.id
      ${whereClause}
    `
    
    const statsResult = await db.query(statsQuery, params)
    const stats = statsResult.rows[0]
    
    // Get crisis type breakdown
    const typeQuery = `
      SELECT 
        fce.crisis_type,
        COUNT(*) as count,
        COUNT(CASE WHEN fce.status IN ('open', 'in_progress') THEN 1 END) as active_count,
        AVG(fce.response_time_minutes) as avg_response_time
      FROM family_crisis_escalations fce
      JOIN error_logs el ON fce.error_log_id = el.id
      ${whereClause}
      GROUP BY fce.crisis_type
      ORDER BY count DESC
    `
    
    const typeResult = await db.query(typeQuery, params)
    
    // Format crisis data with actionable insights
    const crises = crisisResult.rows.map(crisis => {
      const responseAnalysis = generateCrisisResponse(crisis)
      
      return {
        id: crisis.id,
        errorLog: {
          id: crisis.error_log_id,
          errorId: crisis.error_id,
          title: crisis.error_title,
          message: crisis.error_message,
          severity: crisis.severity,
          familyImpact: crisis.family_impact,
          affectedFeature: crisis.affected_feature,
          griefContextDetected: crisis.grief_context_detected,
          memoryPreservationRisk: crisis.memory_preservation_risk,
          escalationUrgency: crisis.escalation_urgency,
          timestamp: crisis.error_timestamp
        },
        crisis: {
          type: crisis.crisis_type,
          severity: crisis.crisis_severity,
          detectedAt: crisis.detected_at,
          escalatedTo: crisis.escalated_to,
          status: crisis.status,
          responseTime: crisis.response_time_minutes,
          resolutionTime: crisis.resolution_time_minutes,
          familyContacted: crisis.family_contacted,
          emergencySupport: crisis.emergency_support_provided,
          emotionalCounseling: crisis.emotional_counseling_offered,
          followUpRequired: crisis.follow_up_required,
          followUpCompleted: crisis.follow_up_completed
        },
        user: crisis.user_id ? {
          id: crisis.user_id,
          name: crisis.user_name,
          email: crisis.user_email
        } : null,
        family: crisis.family_id ? {
          id: crisis.family_id,
          contactName: crisis.family_contact_name,
          contactEmail: crisis.family_contact_email
        } : null,
        resolution: {
          summary: crisis.resolution_summary,
          feedback: crisis.family_feedback,
          latestType: crisis.latest_resolution_type,
          resolver: crisis.resolver_email ? {
            name: crisis.resolver_name,
            email: crisis.resolver_email
          } : null
        },
        communications: {
          sentCount: parseInt(crisis.family_notifications_sent) || 0,
          details: crisis.family_communications || []
        },
        actionPlan: {
          immediateActions: responseAnalysis.immediateActions,
          supportResources: responseAnalysis.supportResources,
          followUpRequired: responseAnalysis.followUpRequired,
          escalationLevel: responseAnalysis.escalationLevel,
          nextSteps: responseAnalysis.escalationLevel === 'critical' ? [
            'Contact family immediately',
            'Activate emergency technical team',
            'Prepare crisis communication',
            'Monitor for additional impacts'
          ] : [
            'Schedule appropriate follow-up',
            'Provide support resources',
            'Monitor resolution progress'
          ]
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        crises,
        pagination: {
          total: totalCount,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(totalCount / filters.limit!)
        },
        statistics: {
          total: parseInt(stats.total_crises) || 0,
          open: parseInt(stats.open_crises) || 0,
          inProgress: parseInt(stats.in_progress_crises) || 0,
          critical: parseInt(stats.critical_crises) || 0,
          memoryRisk: parseInt(stats.memory_risk_crises) || 0,
          familiesContacted: parseInt(stats.families_contacted) || 0,
          emergencySupport: parseInt(stats.emergency_support_provided) || 0,
          last24Hours: parseInt(stats.last_24h_count) || 0,
          lastHour: parseInt(stats.last_hour_count) || 0,
          avgResponseTime: parseFloat(stats.avg_response_time) || 0,
          avgResolutionTime: parseFloat(stats.avg_resolution_time) || 0
        },
        crisisTypes: typeResult.rows.map(type => ({
          type: type.crisis_type,
          count: parseInt(type.count),
          activeCount: parseInt(type.active_count),
          avgResponseTime: parseFloat(type.avg_response_time) || 0
        })),
        appliedFilters: filters
      }
    })
    
  } catch (error) {
    console.error('Error fetching crisis data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crisis data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to crisis management system' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      action, 
      crisisId, 
      errorLogId,
      responseNotes, 
      familyCommunication,
      emergencySupport = false,
      emotionalCounseling = false,
      followUpDate,
      escalateTo,
      status
    } = body
    
    if (action === 'respond_to_crisis') {
      if (!crisisId) {
        return NextResponse.json(
          { error: 'Crisis ID is required for response action' },
          { status: 400 }
        )
      }
      
      // Update crisis with response
      const updateQuery = `
        UPDATE family_crisis_escalations 
        SET 
          status = COALESCE($2, status),
          response_time_minutes = CASE 
            WHEN response_time_minutes IS NULL 
            THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - detected_at)) / 60 
            ELSE response_time_minutes 
          END,
          emergency_support_provided = COALESCE($3, emergency_support_provided),
          emotional_counseling_offered = COALESCE($4, emotional_counseling_offered),
          follow_up_date = COALESCE($5::timestamp, follow_up_date),
          escalated_to = COALESCE($6, escalated_to),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `
      
      const updateResult = await db.query(updateQuery, [
        crisisId, 
        status || 'in_progress', 
        emergencySupport, 
        emotionalCounseling,
        followUpDate,
        escalateTo
      ])
      
      if (updateResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Crisis not found' },
          { status: 404 }
        )
      }
      
      const updatedCrisis = updateResult.rows[0]
      
      // Add response notes if provided
      if (responseNotes) {
        await db.query(`
          UPDATE family_crisis_escalations 
          SET resolution_summary = COALESCE(resolution_summary || E'\\n\\n', '') || $2
          WHERE id = $1
        `, [crisisId, `[${new Date().toISOString()}] ${session.user.email}: ${responseNotes}`])
      }
      
      // Send family communication if requested
      if (familyCommunication && updatedCrisis.family_id) {
        const commResult = await db.query(`
          INSERT INTO family_impact_notifications (
            error_log_id, family_id, user_id, notification_type, 
            personalized_message, compassionate_tone, grief_sensitive_language,
            includes_emotional_support, support_offered
          ) VALUES ($1, $2, $3, 'in_app', $4, true, true, $5, true)
          RETURNING id
        `, [
          updatedCrisis.error_log_id,
          updatedCrisis.family_id,
          updatedCrisis.user_id,
          familyCommunication,
          emotionalCounseling
        ])
        
        // Mark family as contacted
        await db.query(`
          UPDATE family_crisis_escalations 
          SET family_contacted = true 
          WHERE id = $1
        `, [crisisId])
      }
      
      return NextResponse.json({
        success: true,
        message: 'Crisis response recorded successfully',
        data: {
          crisisId: updatedCrisis.id,
          status: updatedCrisis.status,
          responseTime: updatedCrisis.response_time_minutes,
          familyContacted: familyCommunication ? true : updatedCrisis.family_contacted,
          supportProvided: {
            emergency: emergencySupport,
            counseling: emotionalCounseling
          }
        }
      })
    }
    
    if (action === 'create_crisis_from_error') {
      if (!errorLogId) {
        return NextResponse.json(
          { error: 'Error log ID is required to create crisis escalation' },
          { status: 400 }
        )
      }
      
      // Get error log details
      const errorResult = await db.query(`
        SELECT 
          el.*,
          u.email as user_email,
          u.name as user_name
        FROM error_logs el
        LEFT JOIN users u ON el.user_id = u.id
        WHERE el.id = $1
      `, [errorLogId])
      
      if (errorResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Error log not found' },
          { status: 404 }
        )
      }
      
      const errorLog = errorResult.rows[0]
      
      // Check if crisis already exists for this error
      const existingCrisis = await db.query(`
        SELECT id FROM family_crisis_escalations WHERE error_log_id = $1
      `, [errorLogId])
      
      if (existingCrisis.rows.length > 0) {
        return NextResponse.json(
          { error: 'Crisis escalation already exists for this error log' },
          { status: 409 }
        )
      }
      
      // Determine crisis type and severity based on error details
      let crisisType = 'technical_crisis'
      let crisisSeverity = 'medium'
      
      if (errorLog.memory_preservation_risk) {
        crisisType = 'memory_preservation_failure'
        crisisSeverity = 'critical'
      } else if (errorLog.affected_feature?.includes('conversation')) {
        crisisType = 'conversation_failure'
        crisisSeverity = 'high'
      } else if (errorLog.family_impact === 'severe') {
        crisisType = 'family_impact_crisis'
        crisisSeverity = 'high'
      }
      
      // Create crisis escalation
      const crisisResult = await db.query(`
        INSERT INTO family_crisis_escalations (
          error_log_id, family_id, user_id, crisis_severity, crisis_type,
          escalated_to, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'open')
        RETURNING *
      `, [
        errorLogId,
        errorLog.family_id,
        errorLog.user_id,
        crisisSeverity,
        crisisType,
        'admin_team'
      ])
      
      const newCrisis = crisisResult.rows[0]
      
      return NextResponse.json({
        success: true,
        message: 'Crisis escalation created successfully',
        data: {
          crisisId: newCrisis.id,
          crisisType: newCrisis.crisis_type,
          severity: newCrisis.crisis_severity,
          errorLogId: errorLogId,
          userAffected: {
            name: errorLog.user_name,
            email: errorLog.user_email
          }
        }
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error handling crisis action:', error)
    return NextResponse.json(
      { error: 'Failed to process crisis action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}