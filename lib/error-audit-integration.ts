// Error Logging - Audit System Integration
// Provides comprehensive audit trail integration for grief-sensitive error monitoring

import { db } from '@/lib/db'

interface AuditableErrorAction {
  errorLogId: number
  errorId: string
  actionType: 'error_logged' | 'error_resolved' | 'crisis_escalated' | 'family_notified' | 'pattern_detected'
  adminUserId?: number
  adminEmail?: string
  resourceType: 'error_log' | 'crisis_escalation' | 'family_notification' | 'error_pattern'
  resourceId?: string
  targetUserId?: number
  targetFamilyId?: number
  beforeState?: any
  afterState?: any
  actionDetails: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  complianceRelevant: boolean
  griefSensitive: boolean
  memoryPreservationImpact: boolean
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

interface ErrorAuditSummary {
  totalErrorsLogged: number
  crisisEscalations: number
  familyNotifications: number
  resolvedErrors: number
  patternDetections: number
  complianceEvents: number
  highRiskEvents: number
  griefSensitiveEvents: number
  memoryPreservationEvents: number
  adminActions: {
    email: string
    name: string
    actionCount: number
    errorResolutions: number
    crisisHandled: number
  }[]
}

class ErrorAuditIntegration {
  private static instance: ErrorAuditIntegration

  static getInstance(): ErrorAuditIntegration {
    if (!ErrorAuditIntegration.instance) {
      ErrorAuditIntegration.instance = new ErrorAuditIntegration()
    }
    return ErrorAuditIntegration.instance
  }

  // Log error-related actions to the comprehensive audit system
  async logErrorAction(action: AuditableErrorAction): Promise<void> {
    try {
      // Determine retention period based on sensitivity and compliance requirements
      let retentionPeriodDays = 730 // Default 2 years

      if (action.complianceRelevant || action.griefSensitive) {
        retentionPeriodDays = 2555 // 7 years for compliance/grief-sensitive data
      }

      if (action.memoryPreservationImpact) {
        retentionPeriodDays = 3650 // 10 years for memory preservation issues
      }

      // Enhanced action details with error-specific context
      const enhancedActionDetails = {
        ...action.actionDetails,
        errorContext: {
          errorId: action.errorId,
          griefSensitive: action.griefSensitive,
          memoryPreservationImpact: action.memoryPreservationImpact,
          familyContext: action.targetFamilyId ? true : false
        },
        auditMetadata: {
          errorLoggingSystem: true,
          automaticLogging: !action.adminUserId,
          dataClassification: action.griefSensitive ? 'Sensitive-Grief' : 'Internal',
          retentionReason: this.getRetentionReason(action)
        }
      }

      // Insert into comprehensive audit log
      await db.query(`
        INSERT INTO comprehensive_audit_log (
          admin_user_id, admin_email, action_type, resource_type, resource_id,
          target_user_id, target_family_id, action_details, before_state, after_state,
          ip_address, user_agent, session_id, risk_level, compliance_relevant,
          retention_period_days, grief_sensitive_data, memory_preservation_related,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
      `, [
        action.adminUserId || null,
        action.adminEmail || 'system@echosofme.platform',
        action.actionType,
        action.resourceType,
        action.resourceId || action.errorId,
        action.targetUserId || null,
        action.targetFamilyId || null,
        JSON.stringify(enhancedActionDetails),
        action.beforeState ? JSON.stringify(action.beforeState) : null,
        action.afterState ? JSON.stringify(action.afterState) : null,
        action.ipAddress || null,
        action.userAgent || null,
        action.sessionId || null,
        action.riskLevel,
        action.complianceRelevant,
        retentionPeriodDays,
        action.griefSensitive,
        action.memoryPreservationImpact
      ])

      // Log additional compliance-specific entries for critical events
      if (action.riskLevel === 'critical' || action.memoryPreservationImpact) {
        await this.logComplianceEvent(action)
      }

    } catch (error) {
      console.error('Failed to log error audit action:', error)
      // Don't throw - audit logging failures shouldn't break error logging
    }
  }

  // Log when a new error is captured
  async logErrorCapture(errorData: any, context?: { ipAddress?: string, userAgent?: string, sessionId?: string }): Promise<void> {
    await this.logErrorAction({
      errorLogId: errorData.id,
      errorId: errorData.errorId || errorData.error_id,
      actionType: 'error_logged',
      resourceType: 'error_log',
      targetUserId: errorData.userId || errorData.user_id,
      targetFamilyId: errorData.familyId || errorData.family_id,
      afterState: {
        severity: errorData.severity,
        familyImpact: errorData.familyImpact || errorData.family_impact,
        griefContextDetected: errorData.griefContextDetected || errorData.grief_context_detected,
        crisisIndicator: errorData.crisisIndicator || errorData.crisis_indicator,
        memoryPreservationRisk: errorData.memoryPreservationRisk || errorData.memory_preservation_risk
      },
      actionDetails: {
        errorTitle: errorData.title,
        errorMessage: errorData.message,
        affectedFeature: errorData.affectedFeature || errorData.affected_feature,
        categoryCode: errorData.categoryCode,
        autoDetection: {
          griefContext: errorData.griefContextDetected || errorData.grief_context_detected,
          crisisIndicator: errorData.crisisIndicator || errorData.crisis_indicator,
          familyImpact: errorData.familyImpact || errorData.family_impact
        }
      },
      riskLevel: this.mapSeverityToRisk(errorData.severity),
      complianceRelevant: this.isComplianceRelevant(errorData),
      griefSensitive: errorData.griefContextDetected || errorData.grief_context_detected || false,
      memoryPreservationImpact: errorData.memoryPreservationRisk || errorData.memory_preservation_risk || false,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      sessionId: context?.sessionId
    })
  }

  // Log when an error is resolved
  async logErrorResolution(errorData: any, resolution: any, adminData: { userId: number, email: string }): Promise<void> {
    await this.logErrorAction({
      errorLogId: errorData.id,
      errorId: errorData.errorId || errorData.error_id,
      actionType: 'error_resolved',
      adminUserId: adminData.userId,
      adminEmail: adminData.email,
      resourceType: 'error_log',
      resourceId: errorData.errorId || errorData.error_id,
      targetUserId: errorData.userId || errorData.user_id,
      targetFamilyId: errorData.familyId || errorData.family_id,
      beforeState: {
        resolved: false,
        severity: errorData.severity,
        familyImpact: errorData.familyImpact || errorData.family_impact
      },
      afterState: {
        resolved: true,
        resolutionType: resolution.resolutionType,
        resolutionTime: resolution.resolutionTimeMinutes,
        familyCommunication: resolution.familyCommunicationSent,
        emotionalSupport: resolution.emotionalSupportProvided
      },
      actionDetails: {
        resolutionType: resolution.resolutionType,
        stepsTaken: resolution.stepsTaken,
        rootCause: resolution.rootCause,
        preventionMeasures: resolution.preventionMeasures,
        familyCommunication: {
          sent: resolution.familyCommunicationSent,
          message: resolution.familyCommunicationMessage
        },
        customerSatisfaction: resolution.customerSatisfactionScore,
        emotionalSupport: resolution.emotionalSupportProvided,
        counselingReferral: resolution.counselingReferralMade
      },
      riskLevel: resolution.emotionalSupportProvided ? 'high' : 'medium',
      complianceRelevant: true,
      griefSensitive: errorData.griefContextDetected || errorData.grief_context_detected || false,
      memoryPreservationImpact: errorData.memoryPreservationRisk || errorData.memory_preservation_risk || false
    })
  }

  // Log when a crisis is escalated
  async logCrisisEscalation(errorData: any, escalation: any, adminData?: { userId: number, email: string }): Promise<void> {
    await this.logErrorAction({
      errorLogId: errorData.id,
      errorId: errorData.errorId || errorData.error_id,
      actionType: 'crisis_escalated',
      adminUserId: adminData?.userId,
      adminEmail: adminData?.email || 'system@echosofme.platform',
      resourceType: 'crisis_escalation',
      resourceId: escalation.id?.toString(),
      targetUserId: escalation.userId || escalation.user_id,
      targetFamilyId: escalation.familyId || escalation.family_id,
      beforeState: {
        crisisLevel: 'none'
      },
      afterState: {
        crisisLevel: escalation.crisisSeverity || escalation.crisis_severity,
        crisisType: escalation.crisisType || escalation.crisis_type,
        escalatedTo: escalation.escalatedTo || escalation.escalated_to,
        status: escalation.status
      },
      actionDetails: {
        crisisType: escalation.crisisType || escalation.crisis_type,
        crisisSeverity: escalation.crisisSeverity || escalation.crisis_severity,
        autoEscalated: !adminData,
        escalatedTo: escalation.escalatedTo || escalation.escalated_to,
        emergencySupport: escalation.emergencySupport,
        emotionalCounseling: escalation.emotionalCounseling,
        memoryPreservationThreat: errorData.memoryPreservationRisk || errorData.memory_preservation_risk
      },
      riskLevel: 'critical',
      complianceRelevant: true,
      griefSensitive: true,
      memoryPreservationImpact: errorData.memoryPreservationRisk || errorData.memory_preservation_risk || false
    })
  }

  // Log when family is notified
  async logFamilyNotification(errorData: any, notification: any): Promise<void> {
    await this.logErrorAction({
      errorLogId: errorData.id,
      errorId: errorData.errorId || errorData.error_id,
      actionType: 'family_notified',
      resourceType: 'family_notification',
      resourceId: notification.id?.toString(),
      targetUserId: notification.userId || notification.user_id,
      targetFamilyId: notification.familyId || notification.family_id,
      afterState: {
        notificationType: notification.notificationType || notification.notification_type,
        sentAt: notification.sentAt || notification.sent_at,
        compassionateTone: notification.compassionateTone || notification.compassionate_tone,
        supportOffered: notification.supportOffered || notification.support_offered
      },
      actionDetails: {
        notificationType: notification.notificationType || notification.notification_type,
        templateUsed: notification.templateId ? true : false,
        personalizedMessage: notification.personalizedMessage ? true : false,
        compassionateApproach: notification.compassionateTone || notification.compassionate_tone,
        griefSensitiveLanguage: notification.griefSensitiveLanguage || notification.grief_sensitive_language,
        emotionalSupport: notification.includesEmotionalSupport || notification.includes_emotional_support,
        supportOffered: notification.supportOffered || notification.support_offered,
        counselingReferral: notification.counselingReferral || notification.counseling_referral
      },
      riskLevel: notification.supportOffered ? 'high' : 'medium',
      complianceRelevant: true,
      griefSensitive: true,
      memoryPreservationImpact: errorData.memoryPreservationRisk || errorData.memory_preservation_risk || false
    })
  }

  // Log when error patterns are detected
  async logPatternDetection(pattern: any, errorData: any): Promise<void> {
    await this.logErrorAction({
      errorLogId: errorData.id,
      errorId: errorData.errorId || errorData.error_id,
      actionType: 'pattern_detected',
      resourceType: 'error_pattern',
      resourceId: pattern.id?.toString(),
      targetUserId: errorData.userId || errorData.user_id,
      targetFamilyId: errorData.familyId || errorData.family_id,
      afterState: {
        patternName: pattern.patternName || pattern.pattern_name,
        confidence: pattern.matchConfidence || pattern.match_confidence,
        autoResolutionAttempted: pattern.autoResolutionAttempted || pattern.auto_resolution_attempted
      },
      actionDetails: {
        patternName: pattern.patternName || pattern.pattern_name,
        patternSignature: pattern.patternSignature || pattern.pattern_signature,
        confidence: pattern.matchConfidence || pattern.match_confidence,
        occurrenceCount: pattern.occurrenceCount || pattern.occurrence_count,
        familyImpactPrediction: pattern.familyImpactPrediction || pattern.family_impact_prediction,
        griefContextLikelihood: pattern.griefContextLikelihood || pattern.grief_context_likelihood,
        memoryPreservationRisk: pattern.memoryPreservationRiskScore || pattern.memory_preservation_risk_score,
        suggestedAction: pattern.suggestedAction || pattern.suggested_action,
        autoResolution: {
          attempted: pattern.autoResolutionAttempted || pattern.auto_resolution_attempted,
          successful: pattern.autoResolutionSuccessful || pattern.auto_resolution_successful,
          script: pattern.autoResolutionScript || pattern.auto_resolution_script
        }
      },
      riskLevel: pattern.griefContextLikelihood > 0.7 ? 'high' : 'medium',
      complianceRelevant: false,
      griefSensitive: (pattern.griefContextLikelihood || pattern.grief_context_likelihood || 0) > 0.5,
      memoryPreservationImpact: (pattern.memoryPreservationRiskScore || pattern.memory_preservation_risk_score || 0) > 0.5
    })
  }

  // Get comprehensive error audit summary
  async getErrorAuditSummary(dateFrom?: Date, dateTo?: Date): Promise<ErrorAuditSummary> {
    try {
      const dateFilter = dateFrom && dateTo ? 
        'AND cal.created_at BETWEEN $1 AND $2' : ''
      const params = dateFrom && dateTo ? [dateFrom, dateTo] : []

      // Get error-related audit statistics
      const statsResult = await db.query(`
        SELECT 
          COUNT(CASE WHEN cal.action_type = 'error_logged' THEN 1 END) as total_errors_logged,
          COUNT(CASE WHEN cal.action_type = 'crisis_escalated' THEN 1 END) as crisis_escalations,
          COUNT(CASE WHEN cal.action_type = 'family_notified' THEN 1 END) as family_notifications,
          COUNT(CASE WHEN cal.action_type = 'error_resolved' THEN 1 END) as resolved_errors,
          COUNT(CASE WHEN cal.action_type = 'pattern_detected' THEN 1 END) as pattern_detections,
          COUNT(CASE WHEN cal.compliance_relevant = true THEN 1 END) as compliance_events,
          COUNT(CASE WHEN cal.risk_level IN ('high', 'critical') THEN 1 END) as high_risk_events,
          COUNT(CASE WHEN cal.grief_sensitive_data = true THEN 1 END) as grief_sensitive_events,
          COUNT(CASE WHEN cal.memory_preservation_related = true THEN 1 END) as memory_preservation_events
        FROM comprehensive_audit_log cal
        WHERE cal.resource_type IN ('error_log', 'crisis_escalation', 'family_notification', 'error_pattern')
        ${dateFilter}
      `, params)

      // Get admin activity for error handling
      const adminActivityResult = await db.query(`
        SELECT 
          cal.admin_email,
          u.name as admin_name,
          COUNT(*) as action_count,
          COUNT(CASE WHEN cal.action_type = 'error_resolved' THEN 1 END) as error_resolutions,
          COUNT(CASE WHEN cal.action_type = 'crisis_escalated' THEN 1 END) as crisis_handled
        FROM comprehensive_audit_log cal
        LEFT JOIN users u ON cal.admin_user_id = u.id
        WHERE cal.resource_type IN ('error_log', 'crisis_escalation', 'family_notification', 'error_pattern')
          AND cal.admin_email != 'system@echosofme.platform'
          ${dateFilter}
        GROUP BY cal.admin_email, u.name
        ORDER BY action_count DESC
        LIMIT 10
      `, params)

      const stats = statsResult.rows[0]
      const adminActivity = adminActivityResult.rows.map(admin => ({
        email: admin.admin_email,
        name: admin.admin_name || 'Unknown',
        actionCount: parseInt(admin.action_count) || 0,
        errorResolutions: parseInt(admin.error_resolutions) || 0,
        crisisHandled: parseInt(admin.crisis_handled) || 0
      }))

      return {
        totalErrorsLogged: parseInt(stats.total_errors_logged) || 0,
        crisisEscalations: parseInt(stats.crisis_escalations) || 0,
        familyNotifications: parseInt(stats.family_notifications) || 0,
        resolvedErrors: parseInt(stats.resolved_errors) || 0,
        patternDetections: parseInt(stats.pattern_detections) || 0,
        complianceEvents: parseInt(stats.compliance_events) || 0,
        highRiskEvents: parseInt(stats.high_risk_events) || 0,
        griefSensitiveEvents: parseInt(stats.grief_sensitive_events) || 0,
        memoryPreservationEvents: parseInt(stats.memory_preservation_events) || 0,
        adminActions: adminActivity
      }
    } catch (error) {
      console.error('Failed to get error audit summary:', error)
      return {
        totalErrorsLogged: 0,
        crisisEscalations: 0,
        familyNotifications: 0,
        resolvedErrors: 0,
        patternDetections: 0,
        complianceEvents: 0,
        highRiskEvents: 0,
        griefSensitiveEvents: 0,
        memoryPreservationEvents: 0,
        adminActions: []
      }
    }
  }

  // Helper methods
  private mapSeverityToRisk(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case 'emergency': return 'critical'
      case 'critical': return 'critical'
      case 'warning': return 'medium'
      case 'info': return 'low'
      default: return 'medium'
    }
  }

  private isComplianceRelevant(errorData: any): boolean {
    // Error logging is compliance-relevant if it involves:
    // - Grief-sensitive data
    // - Memory preservation
    // - Family privacy
    // - Crisis situations
    return !!(
      errorData.griefContextDetected ||
      errorData.grief_context_detected ||
      errorData.memoryPreservationRisk ||
      errorData.memory_preservation_risk ||
      errorData.familyId ||
      errorData.family_id ||
      errorData.crisisIndicator ||
      errorData.crisis_indicator ||
      (errorData.familyImpact && ['high', 'severe'].includes(errorData.familyImpact)) ||
      (errorData.family_impact && ['high', 'severe'].includes(errorData.family_impact))
    )
  }

  private getRetentionReason(action: AuditableErrorAction): string {
    const reasons = []

    if (action.complianceRelevant) {
      reasons.push('Compliance requirement')
    }

    if (action.griefSensitive) {
      reasons.push('Grief-sensitive data handling')
    }

    if (action.memoryPreservationImpact) {
      reasons.push('Memory preservation impact')
    }

    if (action.riskLevel === 'critical') {
      reasons.push('Critical risk level')
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Standard operational logging'
  }

  private async logComplianceEvent(action: AuditableErrorAction): Promise<void> {
    try {
      // Log additional compliance-specific entry for regulatory requirements
      await db.query(`
        INSERT INTO compliance_audit_log (
          event_type, resource_type, resource_id, admin_user_id, 
          affected_user_id, affected_family_id, event_details,
          data_classification, retention_period_days, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `, [
        `error_logging_${action.actionType}`,
        action.resourceType,
        action.resourceId,
        action.adminUserId,
        action.targetUserId,
        action.targetFamilyId,
        JSON.stringify({
          originalAction: action.actionType,
          griefSensitive: action.griefSensitive,
          memoryPreservationImpact: action.memoryPreservationImpact,
          riskLevel: action.riskLevel,
          actionDetails: action.actionDetails
        }),
        action.griefSensitive ? 'Sensitive-Grief' : 'Internal-Compliance',
        action.memoryPreservationImpact ? 3650 : 2555 // 10 years for memory, 7 for grief
      ])
    } catch (error) {
      // Don't fail if compliance table doesn't exist - this is optional
      console.warn('Compliance audit logging failed (table may not exist):', error.message)
    }
  }
}

// Export singleton instance and convenience functions
export const errorAuditIntegration = ErrorAuditIntegration.getInstance()

export const logErrorCapture = (errorData: any, context?: any) => {
  return errorAuditIntegration.logErrorCapture(errorData, context)
}

export const logErrorResolution = (errorData: any, resolution: any, adminData: any) => {
  return errorAuditIntegration.logErrorResolution(errorData, resolution, adminData)
}

export const logCrisisEscalation = (errorData: any, escalation: any, adminData?: any) => {
  return errorAuditIntegration.logCrisisEscalation(errorData, escalation, adminData)
}

export const logFamilyNotification = (errorData: any, notification: any) => {
  return errorAuditIntegration.logFamilyNotification(errorData, notification)
}

export const logPatternDetection = (pattern: any, errorData: any) => {
  return errorAuditIntegration.logPatternDetection(pattern, errorData)
}

export const getErrorAuditSummary = (dateFrom?: Date, dateTo?: Date) => {
  return errorAuditIntegration.getErrorAuditSummary(dateFrom, dateTo)
}

export default errorAuditIntegration