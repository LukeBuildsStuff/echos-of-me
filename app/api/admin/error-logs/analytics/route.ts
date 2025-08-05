import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface AnalyticsFilters {
  timeRange?: string
  includeResolved?: boolean
  familyId?: string
  categoryId?: string
  severityFilter?: string[]
  griefContextOnly?: boolean
  crisisOnly?: boolean
  memoryPreservationOnly?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to error analytics' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse analytics filters with enhanced family-focused options
    const filters: AnalyticsFilters = {
      timeRange: searchParams.get('timeRange') || '24h', // 1h, 24h, 7d, 30d, 90d
      includeResolved: searchParams.get('includeResolved') === 'true',
      familyId: searchParams.get('familyId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      severityFilter: searchParams.get('severityFilter')?.split(',').filter(Boolean),
      griefContextOnly: searchParams.get('griefContextOnly') === 'true',
      crisisOnly: searchParams.get('crisisOnly') === 'true',
      memoryPreservationOnly: searchParams.get('memoryPreservationOnly') === 'true'
    }
    
    // Build PostgreSQL time filters and grouping
    let timeFilter = ''
    let timeGrouping = "DATE_TRUNC('hour', el.timestamp)"
    
    switch (filters.timeRange) {
      case '1h':
        timeFilter = "AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'"
        timeGrouping = "DATE_TRUNC('minute', el.timestamp)"
        break
      case '24h':
        timeFilter = "AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'"
        timeGrouping = "DATE_TRUNC('hour', el.timestamp)"
        break
      case '7d':
        timeFilter = "AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'"
        timeGrouping = "DATE_TRUNC('day', el.timestamp)"
        break
      case '30d':
        timeFilter = "AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'"
        timeGrouping = "DATE_TRUNC('day', el.timestamp)"
        break
      case '90d':
        timeFilter = "AND el.timestamp >= CURRENT_TIMESTAMP - INTERVAL '90 days'"
        timeGrouping = "DATE_TRUNC('week', el.timestamp)"
        break
    }
    
    // Build additional filters
    const additionalFilters: string[] = []
    if (!filters.includeResolved) {
      additionalFilters.push('el.resolved_at IS NULL')
    }
    if (filters.familyId) {
      additionalFilters.push(`el.family_id = ${parseInt(filters.familyId)}`)
    }
    if (filters.categoryId) {
      additionalFilters.push(`el.category_id = ${parseInt(filters.categoryId)}`)
    }
    if (filters.severityFilter?.length) {
      additionalFilters.push(`el.severity = ANY(ARRAY[${filters.severityFilter.map(s => `'${s}'`).join(', ')}]::severity_level[])`)
    }
    if (filters.griefContextOnly) {
      additionalFilters.push('el.grief_context_detected = TRUE')
    }
    if (filters.crisisOnly) {
      additionalFilters.push('el.crisis_indicator = TRUE')
    }
    if (filters.memoryPreservationOnly) {
      additionalFilters.push('el.memory_preservation_risk = TRUE')
    }
    
    const additionalWhereClause = additionalFilters.length > 0 ? 
      ` AND ${additionalFilters.join(' AND ')}` : ''
    
    // 1. Enhanced Error Trends with Family Context
    const trendResult = await db.query(`
      SELECT 
        ${timeGrouping} as time_period,
        COUNT(*) as total_errors,
        COUNT(CASE WHEN el.severity = 'emergency' THEN 1 END) as emergency_count,
        COUNT(CASE WHEN el.severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN el.severity = 'warning' THEN 1 END) as warning_count,
        COUNT(CASE WHEN el.severity = 'info' THEN 1 END) as info_count,
        COUNT(CASE WHEN el.crisis_indicator = TRUE THEN 1 END) as crisis_count,
        COUNT(CASE WHEN el.grief_context_detected = TRUE THEN 1 END) as grief_context_count,
        COUNT(CASE WHEN el.family_impact IN ('high', 'severe') THEN 1 END) as high_family_impact_count,
        COUNT(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 END) as memory_risk_count,
        COUNT(CASE WHEN el.affected_feature LIKE '%conversation%' OR el.affected_feature LIKE '%ai-echo%' THEN 1 END) as conversation_failures,
        COUNT(CASE WHEN el.affected_feature LIKE '%voice%' THEN 1 END) as voice_failures,
        COUNT(DISTINCT el.family_id) as affected_families,
        COUNT(DISTINCT el.user_id) as affected_users
      FROM error_logs el
      WHERE 1=1 ${timeFilter} ${additionalWhereClause}
      GROUP BY time_period
      ORDER BY time_period ASC
    `)
    
    // 2. Family Impact Deep Analysis
    const familyImpactResult = await db.query(`
      SELECT 
        el.family_impact,
        COUNT(*) as count,
        AVG(CASE WHEN el.resolved_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (el.resolved_at - el.timestamp)) / 60 
        END) as avg_resolution_time_minutes,
        COUNT(CASE WHEN el.resolved_at IS NULL THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN el.crisis_indicator = TRUE THEN 1 END) as crisis_count,
        COUNT(CASE WHEN el.grief_context_detected = TRUE THEN 1 END) as grief_context_count,
        COUNT(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 END) as memory_risk_count,
        COUNT(CASE WHEN fce.id IS NOT NULL THEN 1 END) as escalated_to_crisis_count,
        AVG(fce.response_time_minutes) as avg_crisis_response_time,
        COUNT(CASE WHEN fin.id IS NOT NULL THEN 1 END) as family_communications_sent
      FROM error_logs el
      LEFT JOIN family_crisis_escalations fce ON el.id = fce.error_log_id
      LEFT JOIN family_impact_notifications fin ON el.id = fin.error_log_id
      WHERE 1=1 ${timeFilter} ${additionalWhereClause}
      GROUP BY el.family_impact
      ORDER BY 
        CASE el.family_impact::text 
          WHEN 'severe' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          WHEN 'none' THEN 4 
        END
    `)
    
    // 3. Category Analysis with Enhanced Family Metrics
    const categoryResult = await db.query(`
      SELECT 
        ec.category_name,
        ec.category_code,
        ec.family_impact_level as category_family_impact,
        ec.compassionate_messaging,
        COUNT(el.id) as error_count,
        COUNT(CASE WHEN el.resolved_at IS NULL THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN el.grief_context_detected = TRUE THEN 1 END) as grief_context_count,
        COUNT(CASE WHEN el.crisis_indicator = TRUE THEN 1 END) as crisis_count,
        COUNT(CASE WHEN el.family_impact IN ('high', 'severe') THEN 1 END) as high_impact_count,
        COUNT(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 END) as memory_risk_count,
        AVG(CASE WHEN er.resolution_time_minutes IS NOT NULL THEN er.resolution_time_minutes END) as avg_resolution_time,
        COUNT(CASE WHEN fin.id IS NOT NULL THEN 1 END) as family_communications_count,
        AVG(fin.satisfaction_rating) as avg_family_satisfaction
      FROM error_categories ec
      LEFT JOIN error_logs el ON ec.id = el.category_id AND 1=1 ${timeFilter} ${additionalWhereClause}
      LEFT JOIN error_resolutions er ON el.id = er.error_log_id
      LEFT JOIN family_impact_notifications fin ON el.id = fin.error_log_id
      GROUP BY ec.id, ec.category_name, ec.category_code, ec.family_impact_level, ec.compassionate_messaging
      HAVING COUNT(el.id) > 0
      ORDER BY error_count DESC
    `)
    
    // 4. Anonymized Family Analysis (Privacy-Protected)
    const affectedFamiliesResult = await db.query(`
      SELECT 
        'Family_' || LPAD(el.family_id::text, 6, '0') as family_identifier,
        COUNT(*) as error_count,
        COUNT(CASE WHEN el.resolved_at IS NULL THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN el.crisis_indicator = TRUE THEN 1 END) as crisis_count,
        COUNT(CASE WHEN el.grief_context_detected = TRUE THEN 1 END) as grief_context_count,
        MAX(el.family_impact::text) as highest_impact,
        MAX(el.timestamp) as last_error_time,
        COUNT(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 END) as memory_risk_count,
        COUNT(DISTINCT el.affected_feature) as affected_features_count,
        COUNT(fin.id) as family_communications_received,
        AVG(fin.satisfaction_rating) as avg_satisfaction_rating,
        BOOL_OR(fce.emergency_support_provided) as received_emergency_support
      FROM error_logs el
      LEFT JOIN family_impact_notifications fin ON el.id = fin.error_log_id
      LEFT JOIN family_crisis_escalations fce ON el.id = fce.error_log_id
      WHERE el.family_id IS NOT NULL ${timeFilter} ${additionalWhereClause}
      GROUP BY el.family_id
      HAVING COUNT(*) > 1
      ORDER BY crisis_count DESC, memory_risk_count DESC, error_count DESC
      LIMIT 20
    `)
    
    // 5. Resolution Performance with Family Communication Tracking
    const resolutionResult = await db.query(`
      SELECT 
        er.resolution_type,
        COUNT(*) as count,
        AVG(er.resolution_time_minutes) as avg_resolution_time,
        MIN(er.resolution_time_minutes) as min_resolution_time,
        MAX(er.resolution_time_minutes) as max_resolution_time,
        COUNT(CASE WHEN er.family_communication_sent = TRUE THEN 1 END) as family_communications_sent,
        COUNT(CASE WHEN er.emotional_support_provided = TRUE THEN 1 END) as emotional_support_provided,
        COUNT(CASE WHEN er.counseling_referral_made = TRUE THEN 1 END) as counseling_referrals,
        AVG(er.customer_satisfaction_score) as avg_satisfaction_score
      FROM error_resolutions er
      JOIN error_logs el ON er.error_log_id = el.id
      WHERE er.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        ${additionalWhereClause.replace('el.', 'el.')}
      GROUP BY er.resolution_type
      ORDER BY count DESC
    `)
    
    // 6. Crisis Intervention Comprehensive Metrics
    const crisisResult = await db.query(`
      SELECT 
        COUNT(DISTINCT el.id) as total_crisis_errors,
        COUNT(CASE WHEN el.resolved_at IS NOT NULL THEN 1 END) as resolved_crisis_count,
        AVG(CASE WHEN el.resolved_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (el.resolved_at - el.timestamp)) / 60 
        END) as avg_crisis_resolution_time,
        COUNT(CASE WHEN el.escalated_to_support = TRUE THEN 1 END) as escalated_count,
        COUNT(CASE WHEN el.family_notification_sent = TRUE THEN 1 END) as family_notifications_sent,
        COUNT(DISTINCT fce.id) as formal_crisis_escalations,
        AVG(fce.response_time_minutes) as avg_crisis_response_time,
        COUNT(CASE WHEN fce.emergency_support_provided = TRUE THEN 1 END) as emergency_support_cases,
        COUNT(CASE WHEN fce.emotional_counseling_offered = TRUE THEN 1 END) as counseling_offered_cases,
        COUNT(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 END) as memory_preservation_crises
      FROM error_logs el
      LEFT JOIN family_crisis_escalations fce ON el.id = fce.error_log_id
      WHERE el.crisis_indicator = TRUE ${timeFilter} ${additionalWhereClause}
    `)
    
    // 7. Error Pattern Recognition with AI Insights
    const errorPatternsResult = await db.query(`
      SELECT 
        ecp.pattern_name,
        ecp.occurrence_count,
        ecp.pattern_confidence,
        ecp.family_impact_prediction,
        ecp.grief_context_likelihood,
        ecp.memory_preservation_risk_score,
        ecp.suggested_action,
        ec.category_name,
        ecp.emotional_trigger_detected,
        COUNT(epm.id) as recent_matches
      FROM error_context_patterns ecp
      LEFT JOIN error_categories ec ON ecp.category_id = ec.id
      LEFT JOIN error_pattern_matches epm ON ecp.id = epm.pattern_id 
        AND epm.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      WHERE ecp.is_active = TRUE
        AND ecp.occurrence_count >= 3
        AND ecp.last_seen >= CURRENT_TIMESTAMP - INTERVAL '14 days'
      GROUP BY ecp.id, ec.category_name
      ORDER BY ecp.occurrence_count DESC, ecp.pattern_confidence DESC
      LIMIT 15
    `)
    
    // 8. Family Communication Effectiveness Analysis
    const communicationResult = await db.query(`
      SELECT 
        nt.template_name,
        nt.template_code,
        COUNT(fin.id) as usage_count,
        COUNT(fin.acknowledged_at) as acknowledged_count,
        AVG(fin.satisfaction_rating) as avg_satisfaction,
        COUNT(CASE WHEN fin.support_offered = TRUE THEN 1 END) as support_offered_count,
        COUNT(CASE WHEN fin.counseling_referral = TRUE THEN 1 END) as counseling_referrals,
        AVG(CASE WHEN fin.acknowledged_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (fin.acknowledged_at - fin.sent_at)) / 3600 
        END) as avg_response_time_hours
      FROM notification_templates nt
      LEFT JOIN family_impact_notifications fin ON nt.id = fin.template_id
        AND fin.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      WHERE nt.grief_sensitive = TRUE
      GROUP BY nt.id, nt.template_name, nt.template_code
      ORDER BY usage_count DESC NULLS LAST
      LIMIT 10
    `)
    
    // 9. Comprehensive Summary Statistics
    const summaryResult = await db.query(`
      SELECT 
        COUNT(*) as total_errors,
        COUNT(CASE WHEN el.resolved_at IS NULL THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN el.crisis_indicator = TRUE THEN 1 END) as crisis_count,
        COUNT(CASE WHEN el.grief_context_detected = TRUE THEN 1 END) as grief_context_count,
        COUNT(CASE WHEN el.family_impact IN ('high', 'severe') THEN 1 END) as high_family_impact_count,
        COUNT(CASE WHEN el.memory_preservation_risk = TRUE THEN 1 END) as memory_preservation_failures,
        COUNT(CASE WHEN el.escalated_to_support = TRUE THEN 1 END) as escalated_count,
        COUNT(DISTINCT el.family_id) as affected_families_count,
        COUNT(DISTINCT el.user_id) as affected_users_count,
        AVG(CASE WHEN el.resolved_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (el.resolved_at - el.timestamp)) / 60 
        END) as avg_resolution_time_minutes,
        COUNT(DISTINCT fce.id) as total_crisis_escalations,
        COUNT(CASE WHEN fin.id IS NOT NULL THEN 1 END) as family_communications_sent,
        AVG(fin.satisfaction_rating) as avg_family_satisfaction
      FROM error_logs el
      LEFT JOIN family_crisis_escalations fce ON el.id = fce.error_log_id
      LEFT JOIN family_impact_notifications fin ON el.id = fin.error_log_id
      WHERE 1=1 ${timeFilter} ${additionalWhereClause}
    `)
    
    const summary = summaryResult.rows[0]
    
    // 10. Memory Preservation Risk Analysis
    const memoryRiskResult = await db.query(`
      SELECT 
        el.affected_feature,
        COUNT(*) as risk_events,
        COUNT(CASE WHEN el.resolved_at IS NOT NULL THEN 1 END) as resolved_count,
        AVG(CASE WHEN el.resolved_at IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (el.resolved_at - el.timestamp)) / 60 
        END) as avg_resolution_time,
        COUNT(CASE WHEN fce.emergency_support_provided = TRUE THEN 1 END) as emergency_interventions
      FROM error_logs el
      LEFT JOIN family_crisis_escalations fce ON el.id = fce.error_log_id
      WHERE el.memory_preservation_risk = TRUE ${timeFilter} ${additionalWhereClause}
      GROUP BY el.affected_feature
      ORDER BY risk_events DESC
    `)
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...summary,
          total_errors: parseInt(summary.total_errors) || 0,
          unresolved_count: parseInt(summary.unresolved_count) || 0,
          crisis_count: parseInt(summary.crisis_count) || 0,
          grief_context_count: parseInt(summary.grief_context_count) || 0,
          high_family_impact_count: parseInt(summary.high_family_impact_count) || 0,
          memory_preservation_failures: parseInt(summary.memory_preservation_failures) || 0,
          affected_families_count: parseInt(summary.affected_families_count) || 0,
          affected_users_count: parseInt(summary.affected_users_count) || 0,
          avg_resolution_time_minutes: parseFloat(summary.avg_resolution_time_minutes) || 0,
          total_crisis_escalations: parseInt(summary.total_crisis_escalations) || 0,
          family_communications_sent: parseInt(summary.family_communications_sent) || 0,
          avg_family_satisfaction: parseFloat(summary.avg_family_satisfaction) || 0
        },
        trends: trendResult.rows,
        familyImpact: familyImpactResult.rows,
        categories: categoryResult.rows,
        affectedFamilies: affectedFamiliesResult.rows,
        resolutionMetrics: resolutionResult.rows,
        crisisMetrics: crisisResult.rows[0] || {},
        errorPatterns: errorPatternsResult.rows,
        communicationEffectiveness: communicationResult.rows,
        memoryPreservationRisks: memoryRiskResult.rows,
        familyFocusedInsights: {
          familiesMostAffected: affectedFamiliesResult.rows.length,
          griefSensitiveErrorsPercent: parseInt(summary.total_errors) > 0 ? 
            Math.round((parseInt(summary.grief_context_count) / parseInt(summary.total_errors)) * 100) : 0,
          memoryPreservationCrisisRate: parseInt(summary.total_errors) > 0 ? 
            Math.round((parseInt(summary.memory_preservation_failures) / parseInt(summary.total_errors)) * 100) : 0,
          crisisResponseEffectiveness: parseInt(summary.total_crisis_escalations) > 0 ? 
            Math.round(((crisisResult.rows[0]?.emergency_support_cases || 0) / parseInt(summary.total_crisis_escalations)) * 100) : 0,
          familyCommunicationRate: parseInt(summary.total_errors) > 0 ? 
            Math.round((parseInt(summary.family_communications_sent) / parseInt(summary.total_errors)) * 100) : 0,
          avgFamilySatisfaction: parseFloat(summary.avg_family_satisfaction) || 0,
          criticalMemoryFailures: memoryRiskResult.rows.filter(r => parseInt(r.risk_events) > 1).length
        },
        appliedFilters: filters,
        timeRange: filters.timeRange,
        generatedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Error fetching enhanced error analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}