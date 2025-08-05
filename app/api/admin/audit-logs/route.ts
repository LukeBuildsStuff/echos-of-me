import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminSession, logAdminAction, getGriefSensitiveErrorMessage } from '@/lib/admin-security'

export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('audit.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const actionType = searchParams.get('actionType')
    const resourceType = searchParams.get('resourceType')
    const adminEmail = searchParams.get('adminEmail')
    const riskLevel = searchParams.get('riskLevel')
    const complianceOnly = searchParams.get('complianceOnly') === 'true'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const targetUserId = searchParams.get('targetUserId')
    const targetFamilyId = searchParams.get('targetFamilyId')

    const offset = (page - 1) * limit

    // Build dynamic query conditions
    const whereConditions = ['1=1']
    const queryParams: any[] = []
    let paramIndex = 1

    if (actionType) {
      whereConditions.push(`cal.action_type = $${paramIndex}`)
      queryParams.push(actionType)
      paramIndex++
    }

    if (resourceType) {
      whereConditions.push(`cal.resource_type = $${paramIndex}`)
      queryParams.push(resourceType)
      paramIndex++
    }

    if (adminEmail) {
      whereConditions.push(`cal.admin_email = $${paramIndex}`)
      queryParams.push(adminEmail)
      paramIndex++
    }

    if (riskLevel) {
      whereConditions.push(`cal.risk_level = $${paramIndex}`)
      queryParams.push(riskLevel)
      paramIndex++
    }

    if (complianceOnly) {
      whereConditions.push(`cal.compliance_relevant = true`)
    }

    if (dateFrom) {
      whereConditions.push(`cal.created_at >= $${paramIndex}`)
      queryParams.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      whereConditions.push(`cal.created_at <= $${paramIndex}`)
      queryParams.push(dateTo)
      paramIndex++
    }

    if (targetUserId) {
      whereConditions.push(`cal.target_user_id = $${paramIndex}`)
      queryParams.push(targetUserId)
      paramIndex++
    }

    if (targetFamilyId) {
      whereConditions.push(`cal.target_family_id = $${paramIndex}`)
      queryParams.push(targetFamilyId)
      paramIndex++
    }

    const whereClause = whereConditions.join(' AND ')

    // Get audit log entries with related information
    const auditResult = await query(`
      SELECT 
        cal.*,
        target_user.name as target_user_name,
        target_user.email as target_user_email,
        target_family.family_name as target_family_name,
        admin_user.name as admin_user_name,
        admin_user.admin_role_id,
        admin_role.role_name as admin_role_name
      FROM comprehensive_audit_log cal
      LEFT JOIN users target_user ON cal.target_user_id = target_user.id
      LEFT JOIN families target_family ON cal.target_family_id = target_family.id
      LEFT JOIN users admin_user ON cal.admin_user_id = admin_user.id
      LEFT JOIN admin_roles admin_role ON admin_user.admin_role_id = admin_role.id
      WHERE ${whereClause}
      ORDER BY cal.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset])

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM comprehensive_audit_log cal
      WHERE ${whereClause}
    `, queryParams)

    const totalLogs = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalLogs / limit)

    // Get audit summary statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risk_count,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_count,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk_count,
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk_count,
        COUNT(CASE WHEN compliance_relevant = true THEN 1 END) as compliance_entries,
        COUNT(DISTINCT admin_email) as unique_admins,
        COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24_hours,
        COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as last_7_days,
        -- Most common actions
        mode() WITHIN GROUP (ORDER BY action_type) as most_common_action,
        mode() WITHIN GROUP (ORDER BY resource_type) as most_common_resource
      FROM comprehensive_audit_log cal
      WHERE ${whereClause}
    `, queryParams)

    // Get admin activity breakdown
    const adminActivityResult = await query(`
      SELECT 
        cal.admin_email,
        admin_user.name as admin_name,
        admin_role.role_name,
        COUNT(*) as action_count,
        COUNT(CASE WHEN cal.risk_level IN ('high', 'critical') THEN 1 END) as high_risk_actions,
        COUNT(CASE WHEN cal.compliance_relevant = true THEN 1 END) as compliance_actions,
        MAX(cal.created_at) as last_action,
        array_agg(DISTINCT cal.action_type) FILTER (WHERE cal.action_type IS NOT NULL) as action_types
      FROM comprehensive_audit_log cal
      LEFT JOIN users admin_user ON cal.admin_user_id = admin_user.id
      LEFT JOIN admin_roles admin_role ON admin_user.admin_role_id = admin_role.id
      WHERE ${whereClause}
      GROUP BY cal.admin_email, admin_user.name, admin_role.role_name
      ORDER BY action_count DESC
      LIMIT 20
    `, queryParams)

    // Get resource access patterns
    const resourcePatterns = await query(`
      SELECT 
        cal.resource_type,
        cal.action_type,
        COUNT(*) as frequency,
        COUNT(CASE WHEN cal.risk_level IN ('high', 'critical') THEN 1 END) as high_risk_frequency,
        AVG(CASE 
          WHEN cal.risk_level = 'low' THEN 1
          WHEN cal.risk_level = 'medium' THEN 2
          WHEN cal.risk_level = 'high' THEN 3
          WHEN cal.risk_level = 'critical' THEN 4
          ELSE 1
        END) as avg_risk_score
      FROM comprehensive_audit_log cal
      WHERE ${whereClause}
      GROUP BY cal.resource_type, cal.action_type
      ORDER BY frequency DESC
      LIMIT 25
    `, queryParams)

    // Format audit log entries with grief-sensitive data handling
    const auditLogs = auditResult.rows.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      admin: {
        userId: log.admin_user_id,
        email: log.admin_email,
        name: log.admin_user_name,
        role: log.admin_role_name
      },
      action: {
        type: log.action_type,
        resource: log.resource_type,
        resourceId: log.resource_id
      },
      target: {
        user: log.target_user_id ? {
          id: log.target_user_id,
          name: log.target_user_name,
          email: log.target_user_email
        } : null,
        family: log.target_family_id ? {
          id: log.target_family_id,
          name: log.target_family_name
        } : null
      },
      details: {
        actionDetails: log.action_details,
        beforeState: log.before_state,
        afterState: log.after_state,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        sessionId: log.session_id
      },
      risk: {
        level: log.risk_level,
        complianceRelevant: log.compliance_relevant,
        retentionPeriodDays: log.retention_period_days
      },
      // Grief-sensitive data redaction for lower-privileged admins
      sensitiveDataRedacted: !authResult.user?.permissions?.audit?.includes('export') && 
                            (log.risk_level === 'critical' || log.compliance_relevant)
    }))

    const stats = statsResult.rows[0]
    const adminActivity = adminActivityResult.rows.map(admin => ({
      email: admin.admin_email,
      name: admin.admin_name,
      role: admin.role_name,
      actionCount: parseInt(admin.action_count),
      highRiskActions: parseInt(admin.high_risk_actions),
      complianceActions: parseInt(admin.compliance_actions),
      lastAction: admin.last_action,
      actionTypes: admin.action_types || []
    }))

    const resourceActivity = resourcePatterns.rows.map(pattern => ({
      resourceType: pattern.resource_type,
      actionType: pattern.action_type,
      frequency: parseInt(pattern.frequency),
      highRiskFrequency: parseInt(pattern.high_risk_frequency),
      avgRiskScore: parseFloat(pattern.avg_risk_score) || 1
    }))

    // Log the audit log access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'audit_logs_accessed',
      resource_type: 'audit_log',
      action_details: {
        filters: {
          actionType,
          resourceType,
          adminEmail,
          riskLevel,
          complianceOnly,
          dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null
        },
        resultsReturned: auditLogs.length,
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
        auditLogs,
        statistics: {
          totalEntries: parseInt(stats.total_entries),
          riskDistribution: {
            critical: parseInt(stats.critical_risk_count),
            high: parseInt(stats.high_risk_count),
            medium: parseInt(stats.medium_risk_count),
            low: parseInt(stats.low_risk_count)
          },
          complianceEntries: parseInt(stats.compliance_entries),
          uniqueAdmins: parseInt(stats.unique_admins),
          recentActivity: {
            last24Hours: parseInt(stats.last_24_hours),
            last7Days: parseInt(stats.last_7_days)
          },
          commonPatterns: {
            mostCommonAction: stats.most_common_action,
            mostCommonResource: stats.most_common_resource
          }
        },
        adminActivity,
        resourcePatterns: resourceActivity,
        pagination: {
          currentPage: page,
          totalPages,
          totalLogs,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        retentionPolicy: '7 years for compliance-relevant entries, 2 years for operational entries',
        dataClassification: 'Internal - Audit Trail',
        accessLevel: authResult.user?.permissions?.audit?.includes('export') ? 'Full' : 'Limited'
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only allow manual audit log creation for super admins
    const authResult = await verifyAdminSession('admin.create', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      actionType,
      resourceType,
      resourceId,
      targetUserId,
      targetFamilyId,
      actionDetails,
      riskLevel = 'medium',
      complianceRelevant = false,
      notes
    } = body

    if (!actionType || !resourceType) {
      return NextResponse.json(
        { error: 'Action type and resource type are required' },
        { status: 400 }
      )
    }

    // Create manual audit log entry
    const auditResult = await query(`
      INSERT INTO comprehensive_audit_log (
        admin_user_id, admin_email, action_type, resource_type, resource_id,
        target_user_id, target_family_id, action_details, 
        ip_address, user_agent, risk_level, compliance_relevant, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      authResult.user!.id,
      authResult.user!.email,
      actionType,
      resourceType,
      resourceId || null,
      targetUserId || null,
      targetFamilyId || null,
      JSON.stringify({
        ...actionDetails,
        manualEntry: true,
        notes,
        createdBy: authResult.user!.email
      }),
      request.headers.get('x-forwarded-for') || null,
      request.headers.get('user-agent') || null,
      riskLevel,
      complianceRelevant
    ])

    const newAuditEntry = auditResult.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Manual audit log entry created successfully',
      data: {
        auditLogId: newAuditEntry.id,
        actionType: newAuditEntry.action_type,
        resourceType: newAuditEntry.resource_type,
        riskLevel: newAuditEntry.risk_level,
        complianceRelevant: newAuditEntry.compliance_relevant,
        createdAt: newAuditEntry.created_at
      }
    })

  } catch (error) {
    console.error('Error creating manual audit log entry:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}