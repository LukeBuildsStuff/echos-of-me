import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminSession, logAdminAction, getGriefSensitiveErrorMessage } from '@/lib/admin-security'

export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('system.configure', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24' // hours
    const includeResolved = searchParams.get('includeResolved') === 'true'

    // Get security events and threats
    const securityEvents = await query(`
      SELECT 
        se.*,
        u.name as user_name,
        u.email as user_email,
        CASE 
          WHEN se.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 'immediate'
          WHEN se.created_at > CURRENT_TIMESTAMP - INTERVAL '6 hours' THEN 'recent'
          ELSE 'historical'
        END as urgency_level
      FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      WHERE se.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours'
        ${includeResolved ? '' : 'AND se.resolved = false'}
      ORDER BY se.severity DESC, se.created_at DESC
      LIMIT 200
    `)

    // Get blocked IPs and their activity
    const blockedIPs = await query(`
      SELECT 
        bi.*,
        COUNT(se.id) as related_security_events,
        MAX(se.created_at) as last_security_event
      FROM blocked_ips bi
      LEFT JOIN security_events se ON se.ip_address = bi.ip_address
      WHERE bi.expires_at IS NULL OR bi.expires_at > CURRENT_TIMESTAMP
      GROUP BY bi.id, bi.ip_address, bi.reason, bi.blocked_by, bi.attempts, 
               bi.last_attempt, bi.expires_at, bi.created_at
      ORDER BY bi.last_attempt DESC, bi.attempts DESC
      LIMIT 100
    `)

    // Get failed login patterns and suspicious activity
    const loginPatterns = await query(`
      SELECT 
        ip_address,
        COUNT(*) as failed_attempts,
        COUNT(DISTINCT admin_email) as unique_emails_attempted,
        MIN(created_at) as first_attempt,
        MAX(created_at) as last_attempt,
        array_agg(DISTINCT admin_email) FILTER (WHERE admin_email IS NOT NULL) as attempted_emails
      FROM comprehensive_audit_log
      WHERE action_type = 'login_failed'
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours'
        AND ip_address IS NOT NULL
      GROUP BY ip_address
      HAVING COUNT(*) >= 3
      ORDER BY failed_attempts DESC, last_attempt DESC
      LIMIT 50
    `)

    // Get admin session analytics
    const adminSessions = await query(`
      SELECT 
        admin_email,
        COUNT(*) as session_count,
        COUNT(DISTINCT ip_address) as unique_ips,
        MIN(created_at) as first_session,
        MAX(created_at) as last_session,
        array_agg(DISTINCT ip_address) FILTER (WHERE ip_address IS NOT NULL) as session_ips,
        COUNT(CASE WHEN action_type LIKE '%crisis%' THEN 1 END) as crisis_related_actions,
        COUNT(CASE WHEN action_type LIKE '%privacy%' THEN 1 END) as privacy_related_actions,
        COUNT(CASE WHEN risk_level IN ('high', 'critical') THEN 1 END) as high_risk_actions
      FROM comprehensive_audit_log
      WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours'
        AND action_type != 'login_failed'
      GROUP BY admin_email
      ORDER BY session_count DESC, last_session DESC
    `)

    // Get system anomalies and unusual patterns
    const systemAnomalies = await query(`
      WITH hourly_activity AS (
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as activity_count,
          COUNT(CASE WHEN risk_level IN ('high', 'critical') THEN 1 END) as high_risk_count,
          COUNT(DISTINCT admin_email) as unique_admins
        FROM comprehensive_audit_log
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours'
        GROUP BY DATE_TRUNC('hour', created_at)
      ),
      activity_stats AS (
        SELECT 
          AVG(activity_count) as avg_activity,
          STDDEV(activity_count) as stddev_activity
        FROM hourly_activity
      )
      SELECT 
        ha.hour,
        ha.activity_count,
        ha.high_risk_count,
        ha.unique_admins,
        CASE 
          WHEN ha.activity_count > (ast.avg_activity + 2 * ast.stddev_activity) THEN 'high_activity_anomaly'
          WHEN ha.activity_count < (ast.avg_activity - 2 * ast.stddev_activity) AND ha.activity_count > 0 THEN 'low_activity_anomaly'
          WHEN ha.high_risk_count > 5 THEN 'high_risk_anomaly'
          ELSE 'normal'
        END as anomaly_type
      FROM hourly_activity ha
      CROSS JOIN activity_stats ast
      WHERE ha.hour >= CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours'
      ORDER BY ha.hour DESC
    `)

    // Get crisis and emergency response metrics
    const emergencyMetrics = await query(`
      SELECT 
        COUNT(CASE WHEN cde.status = 'active' THEN 1 END) as active_crisis_events,
        COUNT(CASE WHEN cde.severity_level >= 8 THEN 1 END) as critical_crisis_events,
        COUNT(CASE WHEN cde.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours' THEN 1 END) as recent_crisis_events,
        COUNT(CASE WHEN uss.is_active = true THEN 1 END) as active_shadow_sessions,
        COUNT(CASE WHEN uss.session_started_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours' THEN 1 END) as recent_shadow_sessions,
        COUNT(CASE WHEN si.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} hours' THEN 1 END) as recent_support_interactions,
        AVG(EXTRACT(minutes FROM uss.session_ended_at - uss.session_started_at)) FILTER (WHERE uss.session_ended_at IS NOT NULL) as avg_shadow_session_duration
      FROM crisis_detection_events cde
      FULL OUTER JOIN user_shadowing_sessions uss ON 1=1
      FULL OUTER JOIN support_interactions si ON 1=1
    `)

    // Get privacy and compliance status
    const privacyMetrics = await query(`
      SELECT 
        COUNT(*) as total_privacy_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_requests,
        COUNT(CASE WHEN requested_at < CURRENT_TIMESTAMP - INTERVAL '30 days' AND status != 'completed' THEN 1 END) as overdue_requests,
        COUNT(CASE WHEN request_type = 'deletion' AND status != 'completed' THEN 1 END) as pending_deletions,
        AVG(EXTRACT(days FROM completed_at - requested_at)) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_days
      FROM privacy_requests
      WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
    `)

    // Format security monitoring data
    const monitoringData = {
      securityEvents: securityEvents.rows.map(event => ({
        id: event.id,
        eventType: event.event_type,
        severity: event.severity,
        urgencyLevel: event.urgency_level,
        user: event.user_id ? {
          id: event.user_id,
          name: event.user_name,
          email: event.user_email
        } : null,
        details: event.details,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        resolved: event.resolved,
        notes: event.notes,
        createdAt: event.created_at
      })),
      
      blockedIPs: blockedIPs.rows.map(ip => ({
        id: ip.id,
        ipAddress: ip.ip_address,
        reason: ip.reason,
        blockedBy: ip.blocked_by,
        attempts: ip.attempts,
        lastAttempt: ip.last_attempt,
        expiresAt: ip.expires_at,
        relatedSecurityEvents: parseInt(ip.related_security_events),
        lastSecurityEvent: ip.last_security_event,
        createdAt: ip.created_at
      })),
      
      suspiciousActivity: {
        failedLoginPatterns: loginPatterns.rows.map(pattern => ({
          ipAddress: pattern.ip_address,
          failedAttempts: parseInt(pattern.failed_attempts),
          uniqueEmailsAttempted: parseInt(pattern.unique_emails_attempted),
          firstAttempt: pattern.first_attempt,
          lastAttempt: pattern.last_attempt,
          attemptedEmails: pattern.attempted_emails || [],
          threatLevel: parseInt(pattern.failed_attempts) > 10 ? 'high' : 
                     parseInt(pattern.failed_attempts) > 5 ? 'medium' : 'low'
        })),
        
        adminSessionAnalytics: adminSessions.rows.map(session => ({
          adminEmail: session.admin_email,
          sessionCount: parseInt(session.session_count),
          uniqueIPs: parseInt(session.unique_ips),
          firstSession: session.first_session,
          lastSession: session.last_session,
          sessionIPs: session.session_ips || [],
          crisisRelatedActions: parseInt(session.crisis_related_actions),
          privacyRelatedActions: parseInt(session.privacy_related_actions),
          highRiskActions: parseInt(session.high_risk_actions),
          riskProfile: parseInt(session.high_risk_actions) > 5 ? 'high' :
                      parseInt(session.unique_ips) > 3 ? 'medium' : 'normal'
        }))
      },
      
      systemAnomalies: systemAnomalies.rows.map(anomaly => ({
        hour: anomaly.hour,
        activityCount: parseInt(anomaly.activity_count),
        highRiskCount: parseInt(anomaly.high_risk_count),
        uniqueAdmins: parseInt(anomaly.unique_admins),
        anomalyType: anomaly.anomaly_type,
        severity: anomaly.anomaly_type.includes('high') ? 'high' : 
                 anomaly.anomaly_type === 'normal' ? 'normal' : 'medium'
      })),
      
      emergencyStatus: {
        activeCrisisEvents: parseInt(emergencyMetrics.rows[0]?.active_crisis_events) || 0,
        criticalCrisisEvents: parseInt(emergencyMetrics.rows[0]?.critical_crisis_events) || 0,
        recentCrisisEvents: parseInt(emergencyMetrics.rows[0]?.recent_crisis_events) || 0,
        activeShadowSessions: parseInt(emergencyMetrics.rows[0]?.active_shadow_sessions) || 0,
        recentShadowSessions: parseInt(emergencyMetrics.rows[0]?.recent_shadow_sessions) || 0,
        recentSupportInteractions: parseInt(emergencyMetrics.rows[0]?.recent_support_interactions) || 0,
        avgShadowSessionDuration: parseFloat(emergencyMetrics.rows[0]?.avg_shadow_session_duration) || 0
      },
      
      privacyCompliance: {
        totalPrivacyRequests: parseInt(privacyMetrics.rows[0]?.total_privacy_requests) || 0,
        pendingRequests: parseInt(privacyMetrics.rows[0]?.pending_requests) || 0,
        inProgressRequests: parseInt(privacyMetrics.rows[0]?.in_progress_requests) || 0,
        overdueRequests: parseInt(privacyMetrics.rows[0]?.overdue_requests) || 0,
        pendingDeletions: parseInt(privacyMetrics.rows[0]?.pending_deletions) || 0,
        avgCompletionDays: parseFloat(privacyMetrics.rows[0]?.avg_completion_days) || 0,
        complianceStatus: parseInt(privacyMetrics.rows[0]?.overdue_requests) > 0 ? 'non_compliant' : 'compliant'
      }
    }

    // Calculate overall security status
    const overallStatus = calculateSecurityStatus(monitoringData)

    // Log the security monitoring access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'security_monitoring_accessed',
      resource_type: 'security_monitoring',
      action_details: {
        timeRange: `${timeRange} hours`,
        includeResolved,
        securityEventsCount: monitoringData.securityEvents.length,
        blockedIPsCount: monitoringData.blockedIPs.length,
        overallSecurityStatus: overallStatus.level
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'medium'
    })

    return NextResponse.json({
      success: true,
      data: monitoringData,
      overallStatus,
      metadata: {
        timeRange: `${timeRange} hours`,
        includeResolved,
        generatedAt: new Date().toISOString(),
        autoRefreshRecommended: '5 minutes for active monitoring'
      }
    })

  } catch (error) {
    console.error('Error fetching security monitoring data:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin permissions for security actions
    const authResult = await verifyAdminSession('system.configure', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, target, reason, duration } = body

    if (!action || !target) {
      return NextResponse.json(
        { error: 'Action and target are required' },
        { status: 400 }
      )
    }

    let actionResult = {}

    switch (action) {
      case 'block_ip':
        const expiresAt = duration ? 
          new Date(Date.now() + duration * 60 * 60 * 1000) : // duration in hours
          null

        await query(`
          INSERT INTO blocked_ips (ip_address, reason, blocked_by, expires_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (ip_address) DO UPDATE SET
            reason = EXCLUDED.reason,
            blocked_by = EXCLUDED.blocked_by,
            expires_at = EXCLUDED.expires_at,
            attempts = blocked_ips.attempts + 1
        `, [target, reason, authResult.user!.email, expiresAt])

        actionResult = {
          action: 'ip_blocked',
          ipAddress: target,
          reason,
          expiresAt,
          message: `IP address ${target} has been blocked for security purposes`
        }
        break

      case 'unblock_ip':
        await query(`
          DELETE FROM blocked_ips WHERE ip_address = $1
        `, [target])

        actionResult = {
          action: 'ip_unblocked',
          ipAddress: target,
          message: `IP address ${target} has been unblocked`
        }
        break

      case 'resolve_security_event':
        await query(`
          UPDATE security_events 
          SET resolved = true, notes = $2
          WHERE id = $1
        `, [target, reason])

        actionResult = {
          action: 'security_event_resolved',
          eventId: target,
          notes: reason,
          message: 'Security event has been marked as resolved'
        }
        break

      case 'escalate_security_event':
        await query(`
          UPDATE security_events 
          SET severity = 'high', notes = COALESCE(notes, '') || $2
          WHERE id = $1
        `, [target, `\n[${new Date().toISOString()}] Escalated by ${authResult.user!.email}: ${reason}`])

        actionResult = {
          action: 'security_event_escalated',
          eventId: target,
          notes: reason,
          message: 'Security event has been escalated for immediate attention'
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid security action' },
          { status: 400 }
        )
    }

    // Log the security action
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: `security_action_${action}`,
      resource_type: 'security_management',
      resource_id: target,
      action_details: {
        action,
        target,
        reason,
        duration
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'high',
      compliance_relevant: true
    })

    return NextResponse.json({
      success: true,
      message: 'Security action completed successfully',
      data: actionResult
    })

  } catch (error) {
    console.error('Error executing security action:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}

// Helper function to calculate overall security status
function calculateSecurityStatus(monitoringData: any) {
  let score = 100
  const issues = []

  // Critical security events
  const criticalEvents = monitoringData.securityEvents.filter(e => e.severity === 'critical' && !e.resolved)
  if (criticalEvents.length > 0) {
    score -= criticalEvents.length * 20
    issues.push(`${criticalEvents.length} unresolved critical security events`)
  }

  // High risk login patterns
  const highRiskPatterns = monitoringData.suspiciousActivity.failedLoginPatterns.filter(p => p.threatLevel === 'high')
  if (highRiskPatterns.length > 0) {
    score -= highRiskPatterns.length * 10
    issues.push(`${highRiskPatterns.length} high-risk login attack patterns`)
  }

  // Privacy compliance issues
  if (monitoringData.privacyCompliance.complianceStatus === 'non_compliant') {
    score -= 15
    issues.push('GDPR compliance violations detected')
  }

  // Active crisis events
  if (monitoringData.emergencyStatus.criticalCrisisEvents > 0) {
    score -= monitoringData.emergencyStatus.criticalCrisisEvents * 5
    issues.push(`${monitoringData.emergencyStatus.criticalCrisisEvents} critical crisis events require attention`)
  }

  // System anomalies
  const highAnomalies = monitoringData.systemAnomalies.filter(a => a.severity === 'high')
  if (highAnomalies.length > 0) {
    score -= highAnomalies.length * 5
    issues.push(`${highAnomalies.length} system anomalies detected`)
  }

  let level = 'excellent'
  let message = 'All systems secure and operating normally'

  if (score < 50) {
    level = 'critical'
    message = 'Multiple critical security issues require immediate attention'
  } else if (score < 70) {
    level = 'warning'
    message = 'Security concerns detected, review and action recommended'
  } else if (score < 90) {
    level = 'good'
    message = 'Minor security issues, routine monitoring sufficient'
  }

  return {
    score,
    level,
    message,
    issues,
    recommendations: generateSecurityRecommendations(monitoringData, issues)
  }
}

// Helper function to generate security recommendations
function generateSecurityRecommendations(monitoringData: any, issues: string[]) {
  const recommendations = []

  if (issues.some(i => i.includes('critical security events'))) {
    recommendations.push('Immediately investigate and resolve all critical security events')
    recommendations.push('Consider activating incident response procedures')
  }

  if (issues.some(i => i.includes('login attack patterns'))) {
    recommendations.push('Review and strengthen authentication security measures')
    recommendations.push('Consider implementing additional rate limiting')
  }

  if (issues.some(i => i.includes('compliance violations'))) {
    recommendations.push('Prioritize processing overdue privacy requests')
    recommendations.push('Review GDPR compliance procedures')
  }

  if (issues.some(i => i.includes('crisis events'))) {
    recommendations.push('Ensure crisis response team is adequately staffed')
    recommendations.push('Review emergency escalation procedures')
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue routine security monitoring')
    recommendations.push('Maintain current security posture')
  }

  return recommendations
}