// Enhanced Family Integration for Error Logging System
// Provides deep integration with family management for grief-sensitive error handling

import { db } from '@/lib/db'
import { errorLogger } from '@/lib/error-logging'

interface FamilyErrorContext {
  familyId: number
  familyName: string
  primaryContactId: number
  primaryContactEmail: string
  supportStatus: string
  privacyLevel: string
  isMemorial: boolean
  members: FamilyMember[]
  activeCrises: number
  recentErrors: number
  emotionalState?: 'stable' | 'vulnerable' | 'crisis'
}

interface FamilyMember {
  userId: number
  name: string
  email: string
  familyRole: string
  needsSupport: boolean
  isGuardian: boolean
  lastActive?: Date
  isMemorialAccount: boolean
}

interface FamilyImpactAssessment {
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'severe'
  affectedMembers: number
  emotionalRisk: boolean
  memoryPreservationThreat: boolean
  communicationRequired: boolean
  supportRecommendations: string[]
  urgentIntervention: boolean
}

// Enhanced family context retrieval for error logging
class FamilyErrorIntegration {
  private static instance: FamilyErrorIntegration

  static getInstance(): FamilyErrorIntegration {
    if (!FamilyErrorIntegration.instance) {
      FamilyErrorIntegration.instance = new FamilyErrorIntegration()
    }
    return FamilyErrorIntegration.instance
  }

  // Get comprehensive family context for error assessment
  async getFamilyContext(familyId: number): Promise<FamilyErrorContext | null> {
    try {
      const familyResult = await db.query(`
        SELECT 
          f.id,
          f.family_name,
          f.primary_contact_id,
          f.support_status,
          f.privacy_level,
          f.memorial_status,
          pc.email as primary_contact_email,
          (
            SELECT COUNT(*) 
            FROM error_logs el 
            WHERE el.family_id = f.id 
            AND el.crisis_indicator = TRUE 
            AND el.resolved_at IS NULL
          ) as active_crises,
          (
            SELECT COUNT(*) 
            FROM error_logs el 
            WHERE el.family_id = f.id 
            AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
          ) as recent_errors_24h
        FROM families f
        LEFT JOIN users pc ON f.primary_contact_id = pc.id
        WHERE f.id = $1
      `, [familyId])

      if (familyResult.rows.length === 0) {
        return null
      }

      const family = familyResult.rows[0]

      // Get family members
      const membersResult = await db.query(`
        SELECT 
          fm.user_id,
          fm.family_role,
          fm.emotional_support_needed,
          fm.is_guardian,
          u.name,
          u.email,
          u.last_login_at,
          u.memorial_account,
          (
            SELECT COUNT(*) 
            FROM error_logs el 
            WHERE el.user_id = u.id 
            AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
          ) as user_recent_errors
        FROM family_members fm
        JOIN users u ON fm.user_id = u.id
        WHERE fm.family_id = $1
        ORDER BY fm.family_role = 'primary' DESC, fm.joined_family_at ASC
      `, [familyId])

      const members: FamilyMember[] = membersResult.rows.map(m => ({
        userId: m.user_id,
        name: m.name,
        email: m.email,
        familyRole: m.family_role,
        needsSupport: m.emotional_support_needed,
        isGuardian: m.is_guardian,
        lastActive: m.last_login_at,
        isMemorialAccount: m.memorial_account
      }))

      // Assess emotional state based on recent activity
      const emotionalState = this.assessFamilyEmotionalState(
        parseInt(family.active_crises),
        parseInt(family.recent_errors_24h),
        members
      )

      return {
        familyId: family.id,
        familyName: family.family_name,
        primaryContactId: family.primary_contact_id,
        primaryContactEmail: family.primary_contact_email,
        supportStatus: family.support_status,
        privacyLevel: family.privacy_level,
        isMemorial: family.memorial_status,
        members,
        activeCrises: parseInt(family.active_crises) || 0,
        recentErrors: parseInt(family.recent_errors_24h) || 0,
        emotionalState
      }
    } catch (error) {
      console.error('Failed to get family context:', error)
      return null
    }
  }

  // Assess the impact of an error on a specific family
  async assessFamilyImpact(
    errorData: any,
    familyContext?: FamilyErrorContext
  ): Promise<FamilyImpactAssessment> {
    try {
      let context = familyContext
      if (!context && errorData.familyId) {
        context = await this.getFamilyContext(errorData.familyId)
      }

      if (!context) {
        return {
          impactLevel: 'none',
          affectedMembers: 0,
          emotionalRisk: false,
          memoryPreservationThreat: false,
          communicationRequired: false,
          supportRecommendations: [],
          urgentIntervention: false
        }
      }

      // Determine impact level based on multiple factors
      let impactLevel: 'none' | 'low' | 'medium' | 'high' | 'severe' = 'low'
      let emotionalRisk = false
      let memoryPreservationThreat = false
      let communicationRequired = false
      const supportRecommendations: string[] = []
      let urgentIntervention = false

      // Memorial families have higher emotional sensitivity
      if (context.isMemorial) {
        impactLevel = this.escalateImpact(impactLevel, 'medium')
        emotionalRisk = true
        supportRecommendations.push('Memorial family - extra emotional care required')
      }

      // Memory preservation errors are always severe for families
      if (errorData.memoryPreservationRisk || errorData.affectedFeature?.includes('memory')) {
        impactLevel = 'severe'
        memoryPreservationThreat = true
        urgentIntervention = true
        communicationRequired = true
        supportRecommendations.push('Memory preservation at risk - immediate family notification required')
        supportRecommendations.push('Technical team to verify memory integrity')
        supportRecommendations.push('Provide reassurance about data safety')
      }

      // AI conversation failures are highly emotional
      if (errorData.affectedFeature?.includes('ai-echo') || errorData.affectedFeature?.includes('conversation')) {
        impactLevel = this.escalateImpact(impactLevel, 'high')
        emotionalRisk = true
        communicationRequired = true
        supportRecommendations.push('AI conversation interrupted - provide emotional support')
        supportRecommendations.push('Offer alternative ways to connect with loved one')
      }

      // Voice processing errors affect emotional connection
      if (errorData.affectedFeature?.includes('voice')) {
        impactLevel = this.escalateImpact(impactLevel, 'medium')
        emotionalRisk = true
        supportRecommendations.push('Voice processing affected - check emotional impact')
      }

      // Crisis indicator means high family impact
      if (errorData.crisisIndicator) {
        impactLevel = this.escalateImpact(impactLevel, 'high')
        urgentIntervention = true
        communicationRequired = true
        supportRecommendations.push('Crisis detected - immediate family support required')
      }

      // Check for vulnerable family state
      if (context.emotionalState === 'vulnerable' || context.emotionalState === 'crisis') {
        impactLevel = this.escalateImpact(impactLevel, 'high')
        emotionalRisk = true
        urgentIntervention = context.emotionalState === 'crisis'
        supportRecommendations.push(`Family in ${context.emotionalState} state - enhanced support needed`)
      }

      // Multiple recent errors indicate family stress
      if (context.recentErrors > 3) {
        impactLevel = this.escalateImpact(impactLevel, 'medium')
        emotionalRisk = true
        supportRecommendations.push('Multiple recent errors - family may be experiencing technical difficulties')
      }

      // Members needing support require extra care
      const membersNeedingSupport = context.members.filter(m => m.needsSupport).length
      if (membersNeedingSupport > 0) {
        emotionalRisk = true
        supportRecommendations.push(`${membersNeedingSupport} family members flagged as needing support`)
      }

      // Determine communication requirements
      if (impactLevel === 'severe' || urgentIntervention) {
        communicationRequired = true
      } else if (impactLevel === 'high' && emotionalRisk) {
        communicationRequired = true
      } else if (errorData.griefContextDetected && impactLevel !== 'none') {
        communicationRequired = true
      }

      // Add general recommendations based on impact level
      if (impactLevel === 'severe') {
        supportRecommendations.unshift('URGENT: Severe family impact - immediate response required')
      } else if (impactLevel === 'high') {
        supportRecommendations.unshift('High family impact - priority response needed')
      } else if (emotionalRisk) {
        supportRecommendations.push('Monitor family emotional state')
      }

      return {
        impactLevel,
        affectedMembers: context.members.length,
        emotionalRisk,
        memoryPreservationThreat,
        communicationRequired,
        supportRecommendations,
        urgentIntervention
      }
    } catch (error) {
      console.error('Failed to assess family impact:', error)
      return {
        impactLevel: 'none',
        affectedMembers: 0,
        emotionalRisk: false,
        memoryPreservationThreat: false,
        communicationRequired: false,
        supportRecommendations: ['Error assessing family impact - manual review recommended'],
        urgentIntervention: false
      }
    }
  }

  // Enhanced error logging with family context
  async logErrorWithFamilyContext(errorData: any) {
    try {
      let familyContext = null
      let familyImpact = null

      // Get family context if family ID is available
      if (errorData.familyId) {
        familyContext = await this.getFamilyContext(errorData.familyId)
        familyImpact = await this.assessFamilyImpact(errorData, familyContext)
      } else if (errorData.userId) {
        // Try to get family from user ID
        const userFamilyResult = await db.query(`
          SELECT fm.family_id 
          FROM family_members fm 
          WHERE fm.user_id = $1 
          LIMIT 1
        `, [errorData.userId])

        if (userFamilyResult.rows.length > 0) {
          const familyId = userFamilyResult.rows[0].family_id
          familyContext = await this.getFamilyContext(familyId)
          familyImpact = await this.assessFamilyImpact(errorData, familyContext)
        }
      }

      // Enhanced error data with family context
      const enhancedErrorData = {
        ...errorData,
        familyImpact: familyImpact?.impactLevel || errorData.familyImpact || 'none',
        memoryPreservationRisk: familyImpact?.memoryPreservationThreat || errorData.memoryPreservationRisk || false,
        griefContextDetected: errorData.griefContextDetected || familyContext?.isMemorial || false,
        crisisIndicator: errorData.crisisIndicator || familyImpact?.urgentIntervention || false,
        escalationUrgency: this.determineEscalationUrgency(familyImpact, errorData),
        errorContext: {
          ...errorData.errorContext,
          familyContext: familyContext ? {
            familyName: familyContext.familyName,
            supportStatus: familyContext.supportStatus,
            emotionalState: familyContext.emotionalState,
            isMemorial: familyContext.isMemorial,
            membersCount: familyContext.members.length,
            recentErrorsCount: familyContext.recentErrors
          } : null,
          familyImpactAssessment: familyImpact
        }
      }

      // Log the enhanced error
      await errorLogger.logError(enhancedErrorData)

      // Handle family-specific actions
      if (familyImpact?.communicationRequired) {
        await this.triggerFamilyCommunication(familyContext!, enhancedErrorData, familyImpact)
      }

      if (familyImpact?.urgentIntervention) {
        await this.triggerUrgentIntervention(familyContext!, enhancedErrorData, familyImpact)
      }

      return {
        success: true,
        familyImpact,
        enhancedErrorData
      }
    } catch (error) {
      console.error('Failed to log error with family context:', error)
      // Fallback to regular error logging
      await errorLogger.logError(errorData)
      throw error
    }
  }

  // Helper methods
  private escalateImpact(
    current: 'none' | 'low' | 'medium' | 'high' | 'severe',
    minimum: 'none' | 'low' | 'medium' | 'high' | 'severe'
  ): 'none' | 'low' | 'medium' | 'high' | 'severe' {
    const levels = ['none', 'low', 'medium', 'high', 'severe']
    const currentIndex = levels.indexOf(current)
    const minimumIndex = levels.indexOf(minimum)
    return levels[Math.max(currentIndex, minimumIndex)] as any
  }

  private assessFamilyEmotionalState(
    activeCrises: number,
    recentErrors: number,
    members: FamilyMember[]
  ): 'stable' | 'vulnerable' | 'crisis' {
    if (activeCrises > 0) {
      return 'crisis'
    }

    const membersNeedingSupport = members.filter(m => m.needsSupport).length
    const supportRatio = membersNeedingSupport / members.length

    if (recentErrors > 5 || supportRatio > 0.5) {
      return 'vulnerable'
    }

    if (recentErrors > 2 || supportRatio > 0.25) {
      return 'vulnerable'
    }

    return 'stable'
  }

  private determineEscalationUrgency(
    familyImpact: FamilyImpactAssessment | null,
    errorData: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (familyImpact?.urgentIntervention || errorData.severity === 'emergency') {
      return 'critical'
    }

    if (familyImpact?.impactLevel === 'severe' || familyImpact?.memoryPreservationThreat) {
      return 'high'
    }

    if (familyImpact?.impactLevel === 'high' || familyImpact?.emotionalRisk) {
      return 'medium'
    }

    return 'low'
  }

  private async triggerFamilyCommunication(
    familyContext: FamilyErrorContext,
    errorData: any,
    familyImpact: FamilyImpactAssessment
  ) {
    try {
      // This would integrate with the family communication API
      console.log('Triggering family communication for:', {
        familyId: familyContext.familyId,
        familyName: familyContext.familyName,
        impactLevel: familyImpact.impactLevel,
        errorId: errorData.errorId
      })

      // In a full implementation, this would:
      // 1. Create family notification record
      // 2. Send appropriate communication based on impact level
      // 3. Schedule follow-up if needed
      // 4. Alert support team
    } catch (error) {
      console.error('Failed to trigger family communication:', error)
    }
  }

  private async triggerUrgentIntervention(
    familyContext: FamilyErrorContext,
    errorData: any,
    familyImpact: FamilyImpactAssessment
  ) {
    try {
      console.log('Triggering urgent intervention for:', {
        familyId: familyContext.familyId,
        familyName: familyContext.familyName,
        errorId: errorData.errorId,
        memoryThreat: familyImpact.memoryPreservationThreat
      })

      // In a full implementation, this would:
      // 1. Alert crisis response team immediately
      // 2. Create priority support ticket
      // 3. Activate emergency communication protocols
      // 4. Begin family support outreach
      // 5. Escalate to technical team if memory preservation is at risk
    } catch (error) {
      console.error('Failed to trigger urgent intervention:', error)
    }
  }

  // Get families that need attention based on error patterns
  async getFamiliesNeedingAttention(): Promise<Array<{
    familyId: number
    familyName: string
    reason: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    errorCount: number
    lastError: Date
  }>> {
    try {
      const result = await db.query(`
        SELECT 
          f.id as family_id,
          f.family_name,
          COUNT(el.id) as error_count,
          MAX(el.timestamp) as last_error,
          SUM(CASE WHEN el.crisis_indicator = TRUE THEN 1 ELSE 0 END) as crisis_count,
          SUM(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 ELSE 0 END) as memory_risk_count,
          SUM(CASE WHEN el.family_impact = 'severe' THEN 1 ELSE 0 END) as severe_impact_count
        FROM families f
        JOIN error_logs el ON f.id = el.family_id
        WHERE el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
        GROUP BY f.id, f.family_name
        HAVING COUNT(el.id) > 1
        ORDER BY 
          SUM(CASE WHEN el.crisis_indicator = TRUE THEN 1 ELSE 0 END) DESC,
          SUM(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 ELSE 0 END) DESC,
          COUNT(el.id) DESC
      `)

      return result.rows.map(row => {
        let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low'
        let reason = 'Multiple recent errors'

        const crisisCount = parseInt(row.crisis_count) || 0
        const memoryRiskCount = parseInt(row.memory_risk_count) || 0
        const severeImpactCount = parseInt(row.severe_impact_count) || 0
        const errorCount = parseInt(row.error_count) || 0

        if (crisisCount > 0) {
          urgency = 'critical'
          reason = `${crisisCount} crisis event(s) detected`
        } else if (memoryRiskCount > 0) {
          urgency = 'high'
          reason = `${memoryRiskCount} memory preservation risk(s)`
        } else if (severeImpactCount > 0) {
          urgency = 'high'
          reason = `${severeImpactCount} severe impact error(s)`
        } else if (errorCount > 5) {
          urgency = 'medium'
          reason = `${errorCount} errors in 48 hours`
        }

        return {
          familyId: row.family_id,
          familyName: row.family_name,
          reason,
          urgency,
          errorCount,
          lastError: new Date(row.last_error)
        }
      })
    } catch (error) {
      console.error('Failed to get families needing attention:', error)
      return []
    }
  }
}

// Export singleton instance
export const familyErrorIntegration = FamilyErrorIntegration.getInstance()

// Convenience functions
export const logErrorWithFamilyContext = (errorData: any) => {
  return familyErrorIntegration.logErrorWithFamilyContext(errorData)
}

export const getFamilyContext = (familyId: number) => {
  return familyErrorIntegration.getFamilyContext(familyId)
}

export const assessFamilyImpact = (errorData: any, familyContext?: FamilyErrorContext) => {
  return familyErrorIntegration.assessFamilyImpact(errorData, familyContext)
}

export const getFamiliesNeedingAttention = () => {
  return familyErrorIntegration.getFamiliesNeedingAttention()
}

export default familyErrorIntegration