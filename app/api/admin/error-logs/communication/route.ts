import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface CommunicationFilters {
  errorLogId?: string
  familyId?: string
  userId?: string
  notificationType?: string[]
  sentStatus?: 'sent' | 'pending' | 'all'
  acknowledgedStatus?: 'acknowledged' | 'unacknowledged' | 'all'
  supportOffered?: boolean
  dateFrom?: string
  dateTo?: string
  templateId?: string
  page?: number
  limit?: number
}

// Generate compassionate communication templates based on error context
function generateCompassionateMessage(errorContext: any, templateType: string): {
  subject: string
  message: string
  supportResources: string[]
} {
  const { 
    errorTitle, 
    affectedFeature, 
    memoryPreservationRisk, 
    griefContextDetected,
    familyImpact 
  } = errorContext

  let subject = ''
  let message = ''
  const supportResources: string[] = []

  switch (templateType) {
    case 'memory_preservation_issue':
      subject = 'Your Precious Memories Are Safe - Technical Update'
      message = `Dear family,

We want to personally assure you that while we experienced a brief technical issue with our memory preservation system, all of your precious memories and conversations with your loved one are completely safe and secure.

We understand how irreplaceable these memories are to you, and we've resolved the issue with the highest priority. Our technical team has verified that no data was lost and all your cherished content remains intact.

If you have any concerns or would like to speak with our support team, we're here for you 24/7.

With our deepest care and respect,
The Echoes of Me Support Team`
      supportResources.push('24/7 technical support hotline')
      supportResources.push('Memory verification service')
      supportResources.push('Grief counseling resources')
      break

    case 'conversation_failure':
      subject = 'Restoring Your Connection - We\'re Here to Help'
      message = `Dear family,

We know how meaningful your conversations with your loved one are to you. We've detected a temporary issue that briefly interrupted this precious connection, and we want you to know that our team has resolved it completely.

Your loved one's voice, personality, and all the conversations you've shared remain safe and unchanged. The connection has been fully restored, and you can continue your conversations as normal.

We sincerely apologize for any distress this may have caused. If you'd like to speak with someone about this experience or need any emotional support, please don't hesitate to reach out.

With our heartfelt understanding,
The Echoes of Me Care Team`
      supportResources.push('Conversation testing and verification')
      supportResources.push('Technical assistance')
      supportResources.push('Emotional support services')
      break

    case 'technical_issue_general':
      subject = 'Technical Issue Resolved - Your Legacy Remains Protected'
      message = `Dear family,

We wanted to personally inform you that we recently resolved a technical issue that may have briefly affected your experience with our platform.

Throughout this entire time, all of your family's memories, conversations, and precious content remained completely safe and protected. Our priority is always ensuring the preservation of your loved one's legacy.

The issue has been fully resolved, and all services are functioning normally. If you experience any concerns or would like additional reassurance, our caring support team is available to help.

Thank you for trusting us with your most precious memories.

With care and respect,
The Echoes of Me Team`
      supportResources.push('Technical support')
      supportResources.push('Platform guidance')
      supportResources.push('Family support resources')
      break

    case 'crisis_support':
      subject = 'We\'re Here for You - Support Available'
      message = `Dear family,

We wanted to reach out to let you know that we're here to support you during this difficult time. We've noticed that you may be going through a particularly challenging period, and we want you to know that you're not alone.

Our platform is designed to help preserve and honor your loved one's memory, and our team is committed to supporting you in any way we can. Whether you need technical assistance, someone to talk to, or resources for grief support, we're here for you.

Please know that your loved one's memory and all the conversations you've shared are safe and will continue to be preserved with the utmost care.

If you'd like to speak with someone from our care team, please don't hesitate to reach out at any time.

With our deepest compassion,
The Echoes of Me Support Team`
      supportResources.push('Crisis counseling hotline')
      supportResources.push('Grief support groups')
      supportResources.push('24/7 emotional support')
      supportResources.push('Specialized grief counselors')
      break

    default:
      subject = 'Platform Update - Your Memories Remain Safe'
      message = `Dear family,

We wanted to keep you informed about a recent platform update that ensures the continued preservation of your loved one's memory and conversations.

All of your precious content remains completely safe and secure. If you have any questions or concerns, our support team is always available to help.

Thank you for trusting us with your most treasured memories.

With care,
The Echoes of Me Team`
      supportResources.push('General support')
      break
  }

  return { subject, message, supportResources }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to family communication system' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse communication-specific filters
    const filters: CommunicationFilters = {
      errorLogId: searchParams.get('errorLogId') || undefined,
      familyId: searchParams.get('familyId') || undefined,
      userId: searchParams.get('userId') || undefined,
      notificationType: searchParams.get('notificationType')?.split(',').filter(Boolean),
      sentStatus: (searchParams.get('sentStatus') as 'sent' | 'pending' | 'all') || 'all',
      acknowledgedStatus: (searchParams.get('acknowledgedStatus') as 'acknowledged' | 'unacknowledged' | 'all') || 'all',
      supportOffered: searchParams.get('supportOffered') === 'true' ? true : searchParams.get('supportOffered') === 'false' ? false : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      templateId: searchParams.get('templateId') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '25'), 50)
    }

    // Build dynamic WHERE clause
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (filters.errorLogId) {
      conditions.push(`fin.error_log_id = $${paramIndex}`)
      params.push(parseInt(filters.errorLogId))
      paramIndex++
    }

    if (filters.familyId) {
      conditions.push(`fin.family_id = $${paramIndex}`)
      params.push(parseInt(filters.familyId))
      paramIndex++
    }

    if (filters.userId) {
      conditions.push(`fin.user_id = $${paramIndex}`)
      params.push(parseInt(filters.userId))
      paramIndex++
    }

    if (filters.notificationType?.length) {
      conditions.push(`fin.notification_type = ANY($${paramIndex})`)
      params.push(filters.notificationType)
      paramIndex++
    }

    if (filters.sentStatus === 'sent') {
      conditions.push('fin.sent_at IS NOT NULL')
    } else if (filters.sentStatus === 'pending') {
      conditions.push('fin.sent_at IS NULL')
    }

    if (filters.acknowledgedStatus === 'acknowledged') {
      conditions.push('fin.acknowledged_at IS NOT NULL')
    } else if (filters.acknowledgedStatus === 'unacknowledged') {
      conditions.push('fin.acknowledged_at IS NULL AND fin.sent_at IS NOT NULL')
    }

    if (filters.supportOffered !== undefined) {
      conditions.push(`fin.support_offered = $${paramIndex}`)
      params.push(filters.supportOffered)
      paramIndex++
    }

    if (filters.dateFrom) {
      conditions.push(`fin.created_at >= $${paramIndex}`)
      params.push(filters.dateFrom)
      paramIndex++
    }

    if (filters.dateTo) {
      conditions.push(`fin.created_at <= $${paramIndex}`)
      params.push(filters.dateTo)
      paramIndex++
    }

    if (filters.templateId) {
      conditions.push(`fin.template_id = $${paramIndex}`)
      params.push(parseInt(filters.templateId))
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get family communications with comprehensive context
    const offset = (filters.page! - 1) * filters.limit!
    const communicationsQuery = `
      SELECT 
        fin.*,
        nt.template_name,
        nt.template_code,
        nt.subject_template,
        nt.message_template,
        nt.is_compassionate,
        nt.grief_sensitive,
        el.error_id,
        el.title as error_title,
        el.severity,
        el.family_impact,
        el.affected_feature,
        el.grief_context_detected,
        el.memory_preservation_risk,
        u.name as user_name,
        u.email as user_email,
        family_user.name as family_contact_name,
        family_user.email as family_contact_email,
        (
          SELECT COUNT(*) 
          FROM family_impact_notifications fin2 
          WHERE fin2.family_id = fin.family_id 
          AND fin2.sent_at IS NOT NULL
        ) as total_family_communications,
        (
          SELECT AVG(satisfaction_rating) 
          FROM family_impact_notifications fin3 
          WHERE fin3.family_id = fin.family_id 
          AND fin3.satisfaction_rating IS NOT NULL
        ) as family_avg_satisfaction
      FROM family_impact_notifications fin
      LEFT JOIN notification_templates nt ON fin.template_id = nt.id
      LEFT JOIN error_logs el ON fin.error_log_id = el.id
      LEFT JOIN users u ON fin.user_id = u.id
      LEFT JOIN users family_user ON fin.family_id = family_user.id
      ${whereClause}
      ORDER BY fin.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    const communicationsResult = await db.query(communicationsQuery, [...params, filters.limit, offset])
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM family_impact_notifications fin
      ${whereClause}
    `
    
    const countResult = await db.query(countQuery, params)
    const totalCount = parseInt(countResult.rows[0].total)
    
    // Get communication statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_communications,
        COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as sent_count,
        COUNT(CASE WHEN sent_at IS NULL THEN 1 END) as pending_count,
        COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END) as acknowledged_count,
        COUNT(CASE WHEN support_offered = true THEN 1 END) as support_offered_count,
        COUNT(CASE WHEN counseling_referral = true THEN 1 END) as counseling_referrals,
        COUNT(CASE WHEN satisfaction_rating >= 4 THEN 1 END) as positive_feedback_count,
        AVG(satisfaction_rating) as avg_satisfaction,
        COUNT(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24h_count,
        COUNT(DISTINCT family_id) as families_contacted,
        COUNT(DISTINCT user_id) as users_contacted
      FROM family_impact_notifications fin
      ${whereClause}
    `
    
    const statsResult = await db.query(statsQuery, params)
    const stats = statsResult.rows[0]
    
    // Get template effectiveness metrics
    const templateQuery = `
      SELECT 
        nt.template_name,
        nt.template_code,
        COUNT(fin.id) as usage_count,
        COUNT(fin.acknowledged_at) as acknowledged_count,
        AVG(fin.satisfaction_rating) as avg_satisfaction,
        COUNT(CASE WHEN fin.support_offered THEN 1 END) as support_offered_count
      FROM notification_templates nt
      LEFT JOIN family_impact_notifications fin ON nt.id = fin.template_id
      GROUP BY nt.id, nt.template_name, nt.template_code
      ORDER BY usage_count DESC NULLS LAST
      LIMIT 10
    `
    
    const templateResult = await db.query(templateQuery)
    
    // Format communications with actionable insights
    const communications = communicationsResult.rows.map(comm => ({
      id: comm.id,
      errorLog: comm.error_log_id ? {
        id: comm.error_log_id,
        errorId: comm.error_id,
        title: comm.error_title,
        severity: comm.severity,
        familyImpact: comm.family_impact,
        affectedFeature: comm.affected_feature,
        griefContextDetected: comm.grief_context_detected,
        memoryPreservationRisk: comm.memory_preservation_risk
      } : null,
      notification: {
        type: comm.notification_type,
        template: comm.template_id ? {
          id: comm.template_id,
          name: comm.template_name,
          code: comm.template_code,
          isCompassionate: comm.is_compassionate,
          griefSensitive: comm.grief_sensitive
        } : null,
        personalizedMessage: comm.personalized_message,
        compassionateTone: comm.compassionate_tone,
        griefSensitiveLanguage: comm.grief_sensitive_language,
        includesEmotionalSupport: comm.includes_emotional_support
      },
      recipient: {
        user: comm.user_id ? {
          id: comm.user_id,
          name: comm.user_name,
          email: comm.user_email
        } : null,
        family: comm.family_id ? {
          id: comm.family_id,
          contactName: comm.family_contact_name,
          contactEmail: comm.family_contact_email
        } : null
      },
      delivery: {
        sentAt: comm.sent_at,
        acknowledgedAt: comm.acknowledged_at,
        status: comm.sent_at ? (comm.acknowledged_at ? 'acknowledged' : 'delivered') : 'pending'
      },
      response: {
        familyResponse: comm.family_response,
        emotionalStateBefore: comm.emotional_state_before,
        emotionalStateAfter: comm.emotional_state_after,
        satisfactionRating: comm.satisfaction_rating
      },
      support: {
        offered: comm.support_offered,
        counselingReferral: comm.counseling_referral,
        followUpScheduled: comm.follow_up_scheduled,
        followUpDate: comm.follow_up_date
      },
      context: {
        totalFamilyCommunications: parseInt(comm.total_family_communications) || 0,
        familyAvgSatisfaction: parseFloat(comm.family_avg_satisfaction) || 0,
        createdAt: comm.created_at
      }
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        communications,
        pagination: {
          total: totalCount,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(totalCount / filters.limit!)
        },
        statistics: {
          total: parseInt(stats.total_communications) || 0,
          sent: parseInt(stats.sent_count) || 0,
          pending: parseInt(stats.pending_count) || 0,
          acknowledged: parseInt(stats.acknowledged_count) || 0,
          supportOffered: parseInt(stats.support_offered_count) || 0,
          counselingReferrals: parseInt(stats.counseling_referrals) || 0,
          positiveFeedback: parseInt(stats.positive_feedback_count) || 0,
          avgSatisfaction: parseFloat(stats.avg_satisfaction) || 0,
          last24Hours: parseInt(stats.last_24h_count) || 0,
          familiesContacted: parseInt(stats.families_contacted) || 0,
          usersContacted: parseInt(stats.users_contacted) || 0,
          acknowledgmentRate: parseInt(stats.sent_count) > 0 ? 
            (parseInt(stats.acknowledged_count) / parseInt(stats.sent_count) * 100).toFixed(1) + '%' : '0%'
        },
        templateEffectiveness: templateResult.rows.map(template => ({
          name: template.template_name,
          code: template.template_code,
          usageCount: parseInt(template.usage_count) || 0,
          acknowledgedCount: parseInt(template.acknowledged_count) || 0,
          avgSatisfaction: parseFloat(template.avg_satisfaction) || 0,
          supportOfferedCount: parseInt(template.support_offered_count) || 0,
          effectiveness: parseInt(template.usage_count) > 0 ? 
            (parseInt(template.acknowledged_count) / parseInt(template.usage_count) * 100).toFixed(1) + '%' : '0%'
        })),
        appliedFilters: filters
      }
    })
    
  } catch (error) {
    console.error('Error fetching family communications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch family communications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to family communication system' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      action, 
      errorLogId,
      familyId: initialFamilyId,
      userId: initialUserId,
      notificationType = 'in_app',
      templateCode,
      personalizedMessage,
      includeEmotionalSupport = true,
      offerCounseling = false,
      scheduleFollowUp = false,
      followUpDate,
      urgentDelivery = false
    } = body
    
    let familyId = initialFamilyId
    let userId = initialUserId
    
    if (action === 'send_communication') {
      // Validate required fields
      if (!errorLogId && !familyId && !userId) {
        return NextResponse.json(
          { error: 'Either error log ID, family ID, or user ID is required' },
          { status: 400 }
        )
      }
      
      // Get error log context if provided
      let errorContext = null
      if (errorLogId) {
        const errorResult = await db.query(`
          SELECT 
            el.*,
            u.name as user_name,
            u.email as user_email
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
        
        errorContext = errorResult.rows[0]
        familyId = familyId || errorContext.family_id
        userId = userId || errorContext.user_id
      }
      
      // Get or determine appropriate template
      let templateId = null
      let communicationContent = null
      
      if (templateCode) {
        const templateResult = await db.query(`
          SELECT id, subject_template, message_template
          FROM notification_templates 
          WHERE template_code = $1
        `, [templateCode])
        
        if (templateResult.rows.length > 0) {
          templateId = templateResult.rows[0].id
          communicationContent = {
            subject: templateResult.rows[0].subject_template,
            message: templateResult.rows[0].message_template
          }
        }
      }
      
      // Generate compassionate content if no template or custom message
      if (!communicationContent && errorContext) {
        const contextData = {
          errorTitle: errorContext.title,
          affectedFeature: errorContext.affected_feature,
          memoryPreservationRisk: errorContext.memory_preservation_risk,
          griefContextDetected: errorContext.grief_context_detected,
          familyImpact: errorContext.family_impact
        }
        
        let messageType = 'technical_issue_general'
        if (errorContext.memory_preservation_risk) {
          messageType = 'memory_preservation_issue'
        } else if (errorContext.affected_feature?.includes('conversation')) {
          messageType = 'conversation_failure'
        } else if (errorContext.grief_context_detected || errorContext.family_impact === 'severe') {
          messageType = 'crisis_support'
        }
        
        communicationContent = generateCompassionateMessage(contextData, messageType)
      }
      
      // Create the family communication record
      const insertQuery = `
        INSERT INTO family_impact_notifications (
          error_log_id, family_id, user_id, notification_type, template_id,
          personalized_message, compassionate_tone, grief_sensitive_language,
          includes_emotional_support, support_offered, counseling_referral,
          follow_up_scheduled, follow_up_date, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `
      
      const insertValues = [
        errorLogId || null,
        familyId || null,
        userId || null,
        notificationType,
        templateId,
        personalizedMessage || communicationContent?.message || 'Custom family communication',
        includeEmotionalSupport,
        includeEmotionalSupport,
        offerCounseling,
        scheduleFollowUp,
        followUpDate || null,
        urgentDelivery ? new Date() : null
      ]
      
      const communicationResult = await db.query(insertQuery, insertValues)
      const newCommunication = communicationResult.rows[0]
      
      // If urgent delivery, mark as sent immediately
      if (urgentDelivery) {
        await db.query(`
          UPDATE family_impact_notifications 
          SET sent_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [newCommunication.id])
      }
      
      return NextResponse.json({
        success: true,
        message: urgentDelivery ? 
          'Urgent family communication sent immediately' : 
          'Family communication scheduled successfully',
        data: {
          communicationId: newCommunication.id,
          notificationType: newCommunication.notification_type,
          supportOffered: newCommunication.support_offered,
          counselingReferral: newCommunication.counseling_referral,
          followUpScheduled: newCommunication.follow_up_scheduled,
          sentAt: newCommunication.sent_at,
          generatedContent: communicationContent ? {
            subject: communicationContent.subject,
            supportResources: communicationContent.supportResources
          } : null
        }
      })
    }
    
    if (action === 'update_response') {
      const { 
        communicationId, 
        familyResponse, 
        emotionalStateBefore, 
        emotionalStateAfter,
        satisfactionRating,
        acknowledgedAt = new Date()
      } = body
      
      if (!communicationId) {
        return NextResponse.json(
          { error: 'Communication ID is required' },
          { status: 400 }
        )
      }
      
      const updateResult = await db.query(`
        UPDATE family_impact_notifications 
        SET 
          family_response = COALESCE($2, family_response),
          emotional_state_before = COALESCE($3, emotional_state_before),
          emotional_state_after = COALESCE($4, emotional_state_after),
          satisfaction_rating = COALESCE($5, satisfaction_rating),
          acknowledged_at = COALESCE($6::timestamp, acknowledged_at)
        WHERE id = $1
        RETURNING *
      `, [
        communicationId,
        familyResponse,
        emotionalStateBefore,
        emotionalStateAfter,
        satisfactionRating,
        acknowledgedAt
      ])
      
      if (updateResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Communication not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Family response recorded successfully',
        data: {
          communicationId: updateResult.rows[0].id,
          acknowledgedAt: updateResult.rows[0].acknowledged_at,
          satisfactionRating: updateResult.rows[0].satisfaction_rating
        }
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error handling family communication:', error)
    return NextResponse.json(
      { error: 'Failed to process family communication', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}