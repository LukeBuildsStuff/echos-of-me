import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { 
  verifyAdminSession, 
  logAdminAction, 
  getGriefSensitiveErrorMessage,
  processPrivacyRequest 
} from '@/lib/admin-security'

export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('privacy.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'all'
    const requestType = searchParams.get('requestType') || 'all'
    const urgent = searchParams.get('urgent') === 'true'

    const offset = (page - 1) * limit

    // Build query conditions
    const whereConditions = ['1=1']
    const queryParams: any[] = []
    let paramIndex = 1

    if (status !== 'all') {
      whereConditions.push(`pr.status = $${paramIndex}`)
      queryParams.push(status)
      paramIndex++
    }

    if (requestType !== 'all') {
      whereConditions.push(`pr.request_type = $${paramIndex}`)
      queryParams.push(requestType)
      paramIndex++
    }

    if (urgent) {
      whereConditions.push(`(pr.request_type = 'deletion' OR pr.requested_at < CURRENT_TIMESTAMP - INTERVAL '30 days')`)
    }

    const whereClause = whereConditions.join(' AND ')

    // Get privacy requests with user and family information
    const requestsResult = await query(`
      SELECT 
        pr.*,
        u.name as user_name,
        u.email as user_email,
        u.memorial_account,
        f.id as family_id,
        f.family_name,
        f.privacy_level,
        (
          SELECT COUNT(*) 
          FROM responses r 
          WHERE r.user_id = pr.user_id AND r.is_draft = false
        ) as user_memories_count,
        (
          SELECT COUNT(*) 
          FROM ai_conversation_analytics aca 
          WHERE aca.user_id = pr.user_id
        ) as user_ai_interactions_count,
        (
          SELECT COUNT(*) 
          FROM milestone_messages mm 
          WHERE mm.user_id = pr.user_id
        ) as user_milestones_count,
        -- Calculate data complexity for processing time estimation
        (
          SELECT SUM(r.word_count) 
          FROM responses r 
          WHERE r.user_id = pr.user_id AND r.is_draft = false
        ) as total_word_count
      FROM privacy_requests pr
      JOIN users u ON pr.user_id = u.id
      LEFT JOIN family_members fm ON u.id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN pr.request_type = 'deletion' THEN 1
          WHEN pr.requested_at < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 2
          ELSE 3
        END,
        pr.requested_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset])

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM privacy_requests pr
      JOIN users u ON pr.user_id = u.id
      WHERE ${whereClause}
    `, queryParams)

    const totalRequests = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalRequests / limit)

    // Get summary statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN request_type = 'deletion' THEN 1 END) as deletion_requests,
        COUNT(CASE WHEN request_type = 'access' THEN 1 END) as access_requests,
        COUNT(CASE WHEN request_type = 'portability' THEN 1 END) as portability_requests,
        COUNT(CASE WHEN requested_at < CURRENT_TIMESTAMP - INTERVAL '30 days' AND status != 'completed' THEN 1 END) as overdue_requests,
        AVG(EXTRACT(days FROM completed_at - requested_at)) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_days
      FROM privacy_requests pr
      WHERE ${whereClause}
    `, queryParams)

    // Get GDPR compliance metrics
    const complianceMetrics = await query(`
      SELECT 
        request_type,
        COUNT(*) as request_count,
        AVG(EXTRACT(days FROM completed_at - requested_at)) FILTER (WHERE completed_at IS NOT NULL) as avg_days_to_complete,
        COUNT(CASE WHEN completed_at IS NOT NULL AND completed_at <= requested_at + INTERVAL '30 days' THEN 1 END) as completed_within_30_days,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
      FROM privacy_requests pr
      WHERE ${whereClause}
      GROUP BY request_type
      ORDER BY request_count DESC
    `, queryParams)

    // Format privacy requests with grief-sensitive handling
    const privacyRequests = requestsResult.rows.map(request => {
      const estimatedComplexity = calculateDataComplexity(
        parseInt(request.user_memories_count) || 0,
        parseInt(request.user_ai_interactions_count) || 0,
        parseInt(request.user_milestones_count) || 0,
        parseInt(request.total_word_count) || 0
      )

      return {
        id: request.id,
        requestType: request.request_type,
        status: request.status,
        statusReason: request.status_reason,
        requestedAt: request.requested_at,
        completedAt: request.completed_at,
        processingAdmin: request.processing_admin_email,
        user: {
          id: request.user_id,
          name: request.user_name,
          email: request.user_email,
          isMemorialAccount: request.memorial_account
        },
        family: request.family_id ? {
          id: request.family_id,
          name: request.family_name,
          privacyLevel: request.privacy_level
        } : null,
        requestDetails: request.request_details,
        legalBasis: request.legal_basis,
        verificationMethod: request.verification_method,
        dataScope: {
          memoriesCount: parseInt(request.user_memories_count) || 0,
          aiInteractionsCount: parseInt(request.user_ai_interactions_count) || 0,
          milestonesCount: parseInt(request.user_milestones_count) || 0,
          totalWordCount: parseInt(request.total_word_count) || 0,
          estimatedComplexity: estimatedComplexity.level,
          estimatedProcessingTime: estimatedComplexity.estimatedDays
        },
        complianceInfo: {
          isOverdue: new Date() > new Date(Date.parse(request.requested_at) + 30 * 24 * 60 * 60 * 1000),
          daysRemaining: Math.max(0, 30 - Math.floor((new Date().getTime() - Date.parse(request.requested_at)) / (24 * 60 * 60 * 1000))),
          requiresSpecialHandling: request.memorial_account || request.privacy_level === 'maximum'
        },
        dataExportPath: request.data_exported_path,
        deletionConfirmation: request.deletion_confirmation,
        complianceNotes: request.compliance_notes
      }
    })

    const stats = statsResult.rows[0]
    const compliance = complianceMetrics.rows.map(metric => ({
      requestType: metric.request_type,
      requestCount: parseInt(metric.request_count),
      avgDaysToComplete: parseFloat(metric.avg_days_to_complete) || 0,
      completedWithin30Days: parseInt(metric.completed_within_30_days),
      completedCount: parseInt(metric.completed_count),
      rejectedCount: parseInt(metric.rejected_count),
      complianceRate: ((parseInt(metric.completed_within_30_days) / parseInt(metric.request_count)) * 100).toFixed(2)
    }))

    // Log the privacy requests access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'privacy_requests_accessed',
      resource_type: 'privacy_request',
      action_details: {
        filters: { status, requestType, urgent },
        requestsReturned: privacyRequests.length,
        page,
        limit
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      data: {
        privacyRequests,
        statistics: {
          totalRequests: parseInt(stats.total_requests),
          pendingRequests: parseInt(stats.pending_requests),
          inProgressRequests: parseInt(stats.in_progress_requests),
          completedRequests: parseInt(stats.completed_requests),
          rejectedRequests: parseInt(stats.rejected_requests),
          requestTypeBreakdown: {
            deletion: parseInt(stats.deletion_requests),
            access: parseInt(stats.access_requests),
            portability: parseInt(stats.portability_requests)
          },
          overdueRequests: parseInt(stats.overdue_requests),
          avgCompletionDays: parseFloat(stats.avg_completion_days) || 0
        },
        complianceMetrics: compliance,
        pagination: {
          currentPage: page,
          totalPages,
          totalRequests,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      },
      metadata: {
        gdprCompliance: {
          standardResponseTime: '30 days',
          fastTrackCriteria: 'Memorial accounts, deletion requests',
          specialHandlingRequired: privacyRequests.filter(r => r.complianceInfo.requiresSpecialHandling).length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching privacy requests:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin permissions to process privacy requests
    const authResult = await verifyAdminSession('privacy.process', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      requestId,
      action, // 'approve', 'reject', 'start_processing', 'complete'
      statusReason,
      verificationMethod,
      dataExportPath,
      deletionConfirmation,
      complianceNotes
    } = body

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      )
    }

    // Get current request details
    const requestResult = await query(`
      SELECT 
        pr.*,
        u.name as user_name,
        u.email as user_email,
        u.memorial_account,
        f.family_name
      FROM privacy_requests pr
      JOIN users u ON pr.user_id = u.id
      LEFT JOIN family_members fm ON u.id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.id
      WHERE pr.id = $1
    `, [requestId])

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Privacy request not found' },
        { status: 404 }
      )
    }

    const privacyRequest = requestResult.rows[0]
    let newStatus = privacyRequest.status
    let completedAt = null
    let actionMessage = ''

    switch (action) {
      case 'start_processing':
        newStatus = 'in_progress'
        actionMessage = 'Privacy request processing has begun with careful attention to family sensitivities'
        break

      case 'approve':
        if (privacyRequest.request_type === 'deletion') {
          // For deletion requests, we need special approval
          if (!authResult.user?.permissions?.privacy?.includes('delete')) {
            return NextResponse.json(
              { error: 'Deletion approval requires enhanced privacy permissions' },
              { status: 403 }
            )
          }
          newStatus = 'in_progress'
          actionMessage = 'Deletion request approved. Processing will begin with utmost care for preserved memories.'
        } else {
          newStatus = 'completed'
          completedAt = new Date().toISOString()
          actionMessage = 'Privacy request has been approved and completed'
        }
        break

      case 'reject':
        newStatus = 'rejected'
        actionMessage = 'Privacy request has been respectfully declined with detailed explanation'
        break

      case 'complete':
        newStatus = 'completed'
        completedAt = new Date().toISOString()
        actionMessage = 'Privacy request has been completed successfully with full compliance'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    // Process the privacy request
    await processPrivacyRequest(
      requestId,
      authResult.user!.email,
      newStatus,
      statusReason,
      dataExportPath
    )

    // Additional updates
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (verificationMethod) {
      updateFields.push(`verification_method = $${paramIndex}`)
      updateValues.push(verificationMethod)
      paramIndex++
    }

    if (deletionConfirmation) {
      updateFields.push(`deletion_confirmation = $${paramIndex}`)
      updateValues.push(JSON.stringify(deletionConfirmation))
      paramIndex++
    }

    if (complianceNotes) {
      updateFields.push(`compliance_notes = $${paramIndex}`)
      updateValues.push(complianceNotes)
      paramIndex++
    }

    if (completedAt) {
      updateFields.push(`completed_at = $${paramIndex}`)
      updateValues.push(completedAt)
      paramIndex++
    }

    if (updateFields.length > 0) {
      updateValues.push(requestId)
      await query(`
        UPDATE privacy_requests 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `, updateValues)
    }

    // If this is a deletion completion, handle the actual data deletion
    if (action === 'complete' && privacyRequest.request_type === 'deletion') {
      await handleDataDeletion(privacyRequest.user_id, authResult.user!.email, deletionConfirmation)
    }

    return NextResponse.json({
      success: true,
      message: actionMessage,
      data: {
        requestId,
        action,
        newStatus,
        user: {
          name: privacyRequest.user_name,
          email: privacyRequest.user_email,
          isMemorialAccount: privacyRequest.memorial_account
        },
        family: privacyRequest.family_name,
        completedAt,
        processingAdmin: authResult.user!.email
      }
    })

  } catch (error) {
    console.error('Error processing privacy request:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

// Helper function to calculate data complexity for processing estimation
function calculateDataComplexity(memories: number, interactions: number, milestones: number, wordCount: number) {
  const complexityScore = (memories * 0.3) + (interactions * 0.2) + (milestones * 0.1) + (wordCount / 10000)
  
  if (complexityScore < 10) {
    return { level: 'low', estimatedDays: 3 }
  } else if (complexityScore < 50) {
    return { level: 'medium', estimatedDays: 7 }
  } else if (complexityScore < 200) {
    return { level: 'high', estimatedDays: 14 }
  } else {
    return { level: 'very_high', estimatedDays: 21 }
  }
}

// Helper function to handle grief-sensitive data deletion
async function handleDataDeletion(userId: string, adminEmail: string, deletionConfirmation: any) {
  try {
    // For grief-sensitive data, we implement "soft deletion" to preserve family connections
    // while respecting the deletion request
    
    // 1. Anonymize responses while preserving family memory structure
    await query(`
      UPDATE responses 
      SET 
        response_text = '[Content removed per user request - family memories preserved]',
        word_count = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId])

    // 2. Anonymize AI conversation data
    await query(`
      UPDATE ai_conversation_analytics 
      SET 
        conversation_id = 'deleted_' || id,
        training_value_score = 0
      WHERE user_id = $1
    `, [userId])

    // 3. Archive milestone messages (don't delete as family may depend on them)
    await query(`
      UPDATE milestone_messages 
      SET 
        message_content = '[Message archived per privacy request]',
        is_private = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId])

    // 4. Update user account to memorial status rather than deletion
    await query(`
      UPDATE users 
      SET 
        password_hash = NULL,
        is_active = false,
        memorial_account = true,
        email = 'deleted_' || id || '@privacy-request.local',
        name = 'Family Member',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId])

    // Log the compassionate deletion
    await logAdminAction({
      admin_email: adminEmail,
      action_type: 'privacy_deletion_completed',
      resource_type: 'user_data',
      target_user_id: userId,
      action_details: {
        deletionType: 'compassionate_archival',
        familyMemoriesPreserved: true,
        deletionConfirmation,
        note: 'Data removed while preserving family memory structure and relationships'
      },
      risk_level: 'high',
      compliance_relevant: true
    })

  } catch (error) {
    console.error('Error in compassionate data deletion:', error)
    throw error
  }
}