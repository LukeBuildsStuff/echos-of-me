import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

interface ErrorLogFilters {
  severity?: string[]
  category?: string[]
  familyImpact?: string[]
  dateFrom?: string
  dateTo?: string
  resolved?: boolean
  crisisOnly?: boolean
  griefContextOnly?: boolean
  memoryPreservationRisk?: boolean
  search?: string
  page?: number
  limit?: number
}

// Enhanced grief and crisis detection with AI-powered analysis
function analyzeGriefContext(title: string, message: string, stackTrace?: string, errorContext?: any): {
  griefContextDetected: boolean;
  griefConfidence: number;
  emotionalTriggers: string[];
} {
  const griefKeywords = [
    'memory', 'memorial', 'legacy', 'conversation', 'ai echo', 'family', 'loved one', 
    'remembrance', 'deceased', 'passed away', 'death', 'funeral', 'grief', 'mourning',
    'memories', 'photos', 'videos', 'voice', 'stories', 'heritage', 'ancestry'
  ];
  
  const emotionalKeywords = [
    'heartbreak', 'devastating', 'precious', 'irreplaceable', 'cherished', 'beloved',
    'miss', 'missing', 'lost forever', 'never again', 'final', 'last'
  ];

  const content = `${title} ${message} ${stackTrace || ''}`.toLowerCase();
  const detectedKeywords = griefKeywords.filter(keyword => content.includes(keyword));
  const emotionalTriggers = emotionalKeywords.filter(keyword => content.includes(keyword));
  
  const griefContextDetected = detectedKeywords.length > 0;
  const griefConfidence = Math.min(detectedKeywords.length / griefKeywords.length + emotionalTriggers.length * 0.1, 1.0);

  return {
    griefContextDetected,
    griefConfidence,
    emotionalTriggers
  };
}

function analyzeCrisisIndicators(
  title: string, 
  message: string, 
  severity: string, 
  familyImpact: string,
  affectedFeature?: string
): {
  crisisIndicator: boolean;
  crisisLevel: 'low' | 'medium' | 'high' | 'critical';
  memoryPreservationRisk: boolean;
  escalationUrgency: 'low' | 'medium' | 'high' | 'critical';
} {
  const criticalKeywords = [
    'data loss', 'memory lost', 'conversation failed', 'cannot access', 
    'authentication failed', 'privacy breach', 'unauthorized access',
    'memories deleted', 'photos lost', 'voice lost', 'stories deleted'
  ];
  
  const memoryRiskKeywords = [
    'storage failed', 'backup failed', 'database corruption', 'file system error',
    'memory storage', 'conversation storage', 'photo storage', 'voice storage'
  ];

  const content = `${title} ${message}`.toLowerCase();
  const hasCriticalKeywords = criticalKeywords.some(keyword => content.includes(keyword));
  const hasMemoryRisk = memoryRiskKeywords.some(keyword => content.includes(keyword));
  
  // Determine crisis level based on multiple factors
  let crisisLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let escalationUrgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (severity === 'emergency' || hasCriticalKeywords) {
    crisisLevel = 'critical';
    escalationUrgency = 'critical';
  } else if (severity === 'critical' && ['high', 'severe'].includes(familyImpact)) {
    crisisLevel = 'high';
    escalationUrgency = 'high';
  } else if (familyImpact === 'severe') {
    crisisLevel = 'high';
    escalationUrgency = 'medium';
  } else if (['critical', 'warning'].includes(severity) && familyImpact === 'high') {
    crisisLevel = 'medium';
    escalationUrgency = 'medium';
  }

  // Family-facing features are higher priority
  const familyFeatures = ['ai-echo', 'daily-question', 'responses', 'voice', 'conversation'];
  if (affectedFeature && familyFeatures.some(feature => affectedFeature.includes(feature))) {
    crisisLevel = crisisLevel === 'low' ? 'medium' : crisisLevel;
  }

  const crisisIndicator = crisisLevel !== 'low' || hasCriticalKeywords;
  const memoryPreservationRisk = hasMemoryRisk || hasCriticalKeywords;

  return {
    crisisIndicator,
    crisisLevel,
    memoryPreservationRisk,
    escalationUrgency
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse filters from query params
    const filters: ErrorLogFilters = {
      severity: searchParams.get('severity')?.split(',').filter(Boolean),
      category: searchParams.get('category')?.split(',').filter(Boolean),
      familyImpact: searchParams.get('familyImpact')?.split(',').filter(Boolean),
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      resolved: searchParams.get('resolved') === 'true' ? true : searchParams.get('resolved') === 'false' ? false : undefined,
      crisisOnly: searchParams.get('crisisOnly') === 'true',
      griefContextOnly: searchParams.get('griefContextOnly') === 'true',
      memoryPreservationRisk: searchParams.get('memoryPreservationRisk') === 'true',
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    }

    // Build dynamic WHERE clause for PostgreSQL
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (filters.severity?.length) {
      conditions.push(`el.severity = ANY($${paramIndex})`)
      params.push(filters.severity)
      paramIndex++
    }
    
    if (filters.category?.length) {
      conditions.push(`ec.category_code = ANY($${paramIndex})`)
      params.push(filters.category)
      paramIndex++
    }
    
    if (filters.familyImpact?.length) {
      conditions.push(`el.family_impact = ANY($${paramIndex})`)
      params.push(filters.familyImpact)
      paramIndex++
    }
    
    if (filters.dateFrom) {
      conditions.push(`el.timestamp >= $${paramIndex}`)
      params.push(filters.dateFrom)
      paramIndex++
    }
    
    if (filters.dateTo) {
      conditions.push(`el.timestamp <= $${paramIndex}`)
      params.push(filters.dateTo)
      paramIndex++
    }
    
    if (filters.resolved === true) {
      conditions.push('el.resolved_at IS NOT NULL')
    } else if (filters.resolved === false) {
      conditions.push('el.resolved_at IS NULL')
    }
    
    if (filters.crisisOnly) {
      conditions.push('el.crisis_indicator = TRUE')
    }
    
    if (filters.griefContextOnly) {
      conditions.push('el.grief_context_detected = TRUE')
    }

    if (filters.memoryPreservationRisk) {
      conditions.push('el.memory_preservation_risk = TRUE')
    }
    
    if (filters.search) {
      conditions.push(`(el.title ILIKE $${paramIndex} OR el.message ILIKE $${paramIndex} OR el.affected_feature ILIKE $${paramIndex})`)
      params.push(`%${filters.search}%`)
      paramIndex++
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM error_logs el
      LEFT JOIN error_categories ec ON el.category_id = ec.id
      ${whereClause}
    `
    
    const countResult = await db.query(countQuery, params)
    const totalCount = parseInt(countResult.rows[0].total)
    
    // Get paginated results with full details
    const offset = (filters.page! - 1) * filters.limit!
    const errorLogsQuery = `
      SELECT 
        el.*,
        ec.category_name,
        ec.category_code,
        ec.family_impact_level as category_family_impact,
        ec.compassionate_messaging,
        u.email as user_email,
        u.name as user_name,
        resolver.email as resolver_email,
        resolver.name as resolver_name,
        er.resolution_type,
        er.resolution_time_minutes,
        er.family_communication_sent,
        er.emotional_support_provided,
        er.customer_satisfaction_score,
        fce.crisis_severity as escalation_severity,
        fce.status as crisis_status,
        (
          SELECT COUNT(*) 
          FROM family_impact_notifications fin 
          WHERE fin.error_log_id = el.id
        ) as family_notifications_count,
        (
          SELECT COUNT(*) 
          FROM error_pattern_matches epm 
          WHERE epm.error_log_id = el.id
        ) as pattern_matches_count
      FROM error_logs el
      LEFT JOIN error_categories ec ON el.category_id = ec.id
      LEFT JOIN users u ON el.user_id = u.id
      LEFT JOIN users resolver ON el.resolved_by = resolver.id
      LEFT JOIN error_resolutions er ON el.id = er.error_log_id
      LEFT JOIN family_crisis_escalations fce ON el.id = fce.error_log_id
      ${whereClause}
      ORDER BY 
        CASE WHEN el.crisis_indicator = TRUE THEN 0 ELSE 1 END,
        CASE el.escalation_urgency 
          WHEN 'critical' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        CASE el.severity::text 
          WHEN 'emergency' THEN 0 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          WHEN 'info' THEN 3 
        END,
        CASE el.family_impact::text 
          WHEN 'severe' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          WHEN 'none' THEN 4 
        END,
        el.timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    const errorLogsResult = await db.query(errorLogsQuery, [...params, filters.limit, offset])
    
    // Get comprehensive error statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_errors,
        COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN crisis_indicator = TRUE THEN 1 END) as crisis_count,
        COUNT(CASE WHEN grief_context_detected = TRUE THEN 1 END) as grief_context_count,
        COUNT(CASE WHEN family_impact::text IN ('high', 'severe') THEN 1 END) as high_family_impact_count,
        COUNT(CASE WHEN memory_preservation_risk = TRUE THEN 1 END) as memory_risk_count,
        COUNT(CASE WHEN severity::text = 'emergency' THEN 1 END) as emergency_count,
        COUNT(CASE WHEN severity::text = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24h_count,
        COUNT(CASE WHEN timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as last_hour_count,
        AVG(CASE WHEN er.resolution_time_minutes IS NOT NULL THEN er.resolution_time_minutes END) as avg_resolution_time,
        AVG(CASE WHEN er.customer_satisfaction_score IS NOT NULL THEN er.customer_satisfaction_score END) as avg_satisfaction_score
      FROM error_logs el
      LEFT JOIN error_resolutions er ON el.id = er.error_log_id
      ${whereClause}
    `
    
    const statsResult = await db.query(statsQuery, params)
    const stats = statsResult.rows[0]
    
    // Get category breakdown with enhanced metrics
    const categoryQuery = `
      SELECT 
        ec.category_name,
        ec.category_code,
        ec.family_impact_level,
        ec.compassionate_messaging,
        COUNT(el.id) as error_count,
        COUNT(CASE WHEN el.resolved_at IS NULL THEN 1 END) as unresolved_count,
        COUNT(CASE WHEN el.crisis_indicator = TRUE THEN 1 END) as crisis_count,
        COUNT(CASE WHEN el.grief_context_detected = TRUE THEN 1 END) as grief_context_count,
        AVG(CASE WHEN er.resolution_time_minutes IS NOT NULL THEN er.resolution_time_minutes END) as avg_resolution_time,
        AVG(CASE WHEN er.customer_satisfaction_score IS NOT NULL THEN er.customer_satisfaction_score END) as avg_satisfaction
      FROM error_categories ec
      LEFT JOIN error_logs el ON ec.id = el.category_id
      LEFT JOIN error_resolutions er ON el.id = er.error_log_id
      GROUP BY ec.id, ec.category_name, ec.category_code, ec.family_impact_level, ec.compassionate_messaging
      ORDER BY error_count DESC NULLS LAST
    `
    
    const categoryResult = await db.query(categoryQuery)

    // Get recent crisis escalations
    const crisisQuery = `
      SELECT 
        fce.*,
        el.title as error_title,
        el.family_impact,
        u.email as user_email
      FROM family_crisis_escalations fce
      JOIN error_logs el ON fce.error_log_id = el.id
      LEFT JOIN users u ON fce.user_id = u.id
      WHERE fce.status IN ('open', 'in_progress')
      ORDER BY fce.crisis_severity DESC, fce.detected_at ASC
      LIMIT 10
    `
    
    const crisisResult = await db.query(crisisQuery)

    return NextResponse.json({
      success: true,
      data: {
        errors: errorLogsResult.rows,
        pagination: {
          total: totalCount,
          page: filters.page,
          limit: filters.limit,
          totalPages: Math.ceil(totalCount / filters.limit!)
        },
        stats: {
          ...stats,
          avg_resolution_time: parseFloat(stats.avg_resolution_time || 0),
          avg_satisfaction_score: parseFloat(stats.avg_satisfaction_score || 0)
        },
        categoryBreakdown: categoryResult.rows,
        activeCrises: crisisResult.rows,
        appliedFilters: filters
      }
    })
    
  } catch (error) {
    console.error('Error fetching error logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { 
      title, 
      message, 
      severity = 'warning',
      categoryCode,
      familyImpact = 'none',
      stackTrace,
      errorContext,
      userId,
      familyId,
      affectedFeature,
      userAgent,
      ipAddress,
      requestUrl,
      requestMethod,
      requestHeaders,
      responseStatus,
      sessionId,
      environment = 'production',
      serverInstance,
      memoryUsageMb,
      cpuUsagePercent,
      emotionalContext
    } = body
    
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }
    
    // Get category ID from category code
    let categoryId = null
    if (categoryCode) {
      const categoryResult = await db.query(
        'SELECT id FROM error_categories WHERE category_code = $1',
        [categoryCode]
      )
      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id
      }
    }
    
    // Generate unique error ID
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Enhanced grief and crisis analysis
    const griefAnalysis = analyzeGriefContext(title, message, stackTrace, errorContext)
    const crisisAnalysis = analyzeCrisisIndicators(title, message, severity, familyImpact, affectedFeature)
    
    // Insert error log with enhanced context
    const insertQuery = `
      INSERT INTO error_logs (
        error_id, category_id, severity, family_impact, title, message, stack_trace,
        error_context, user_id, family_id, affected_feature, user_agent, ip_address,
        request_url, request_method, request_headers, response_status, session_id,
        environment, server_instance, memory_usage_mb, cpu_usage_percent,
        grief_context_detected, crisis_indicator, memory_preservation_risk,
        escalation_urgency, emotional_context, conversation_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING id
    `
    
    const insertValues = [
      errorId, categoryId, severity, familyImpact, title, message, stackTrace,
      JSON.stringify(errorContext), userId, familyId, affectedFeature, userAgent, ipAddress,
      requestUrl, requestMethod, JSON.stringify(requestHeaders), responseStatus, sessionId,
      environment, serverInstance, memoryUsageMb, cpuUsagePercent,
      griefAnalysis.griefContextDetected, crisisAnalysis.crisisIndicator, crisisAnalysis.memoryPreservationRisk,
      crisisAnalysis.escalationUrgency, JSON.stringify(emotionalContext), 
      JSON.stringify({ griefConfidence: griefAnalysis.griefConfidence, emotionalTriggers: griefAnalysis.emotionalTriggers })
    ]
    
    const result = await db.query(insertQuery, insertValues)
    const insertedId = result.rows[0].id
    
    // Create crisis escalation if needed
    if (crisisAnalysis.crisisIndicator) {
      const crisisType = crisisAnalysis.memoryPreservationRisk ? 'memory_preservation_failure' : 'technical_crisis'
      
      await db.query(`
        INSERT INTO family_crisis_escalations (
          error_log_id, family_id, user_id, crisis_severity, crisis_type,
          escalated_to, family_contacted, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        insertedId, familyId, userId, crisisAnalysis.crisisLevel, crisisType,
        'admin_team', false, 'open'
      ])
    }
    
    // Create family notification for high-impact errors
    if (crisisAnalysis.crisisIndicator || ['high', 'severe'].includes(familyImpact)) {
      if (familyId || userId) {
        // Determine appropriate template based on crisis type
        let templateCode = 'technical_issue_compassionate'
        if (crisisAnalysis.memoryPreservationRisk) {
          templateCode = 'memory_storage_issue'
        } else if (affectedFeature?.includes('conversation') || affectedFeature?.includes('ai-echo')) {
          templateCode = 'conversation_failure_support'
        } else if (crisisAnalysis.crisisLevel === 'critical') {
          templateCode = 'crisis_support_immediate'
        }
        
        const templateResult = await db.query(
          'SELECT id FROM notification_templates WHERE template_code = $1',
          [templateCode]
        )
        
        const templateId = templateResult.rows.length > 0 ? templateResult.rows[0].id : null
        
        await db.query(`
          INSERT INTO family_impact_notifications (
            error_log_id, family_id, user_id, notification_type, template_id,
            compassionate_tone, grief_sensitive_language, includes_emotional_support,
            support_offered
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          insertedId, familyId, userId, 'in_app', templateId,
          true, griefAnalysis.griefContextDetected, crisisAnalysis.crisisLevel !== 'low', true
        ])
      }
    }
    
    // Update error analytics with enhanced metrics
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0, 0)
    
    await db.query(`
      INSERT INTO error_analytics (
        date_hour, category_id, severity, error_count, affected_families_count, 
        grief_context_count, crisis_count, memory_preservation_failures, conversation_failures
      ) VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8)
      ON CONFLICT (date_hour, category_id, severity) 
      DO UPDATE SET
        error_count = error_analytics.error_count + 1,
        affected_families_count = error_analytics.affected_families_count + EXCLUDED.affected_families_count,
        grief_context_count = error_analytics.grief_context_count + EXCLUDED.grief_context_count,
        crisis_count = error_analytics.crisis_count + EXCLUDED.crisis_count,
        memory_preservation_failures = error_analytics.memory_preservation_failures + EXCLUDED.memory_preservation_failures,
        conversation_failures = error_analytics.conversation_failures + EXCLUDED.conversation_failures,
        updated_at = CURRENT_TIMESTAMP
    `, [
      currentHour, categoryId, severity, 
      familyId ? 1 : 0, 
      griefAnalysis.griefContextDetected ? 1 : 0, 
      crisisAnalysis.crisisIndicator ? 1 : 0,
      crisisAnalysis.memoryPreservationRisk ? 1 : 0,
      affectedFeature?.includes('conversation') || affectedFeature?.includes('ai-echo') ? 1 : 0
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        errorId,
        insertedId,
        griefContextDetected: griefAnalysis.griefContextDetected,
        griefConfidence: griefAnalysis.griefConfidence,
        crisisIndicator: crisisAnalysis.crisisIndicator,
        crisisLevel: crisisAnalysis.crisisLevel,
        memoryPreservationRisk: crisisAnalysis.memoryPreservationRisk,
        escalationUrgency: crisisAnalysis.escalationUrgency,
        emotionalTriggers: griefAnalysis.emotionalTriggers,
        message: 'Error logged successfully with comprehensive family-sensitive analysis'
      }
    })
    
  } catch (error) {
    console.error('Error logging error:', error)
    return NextResponse.json(
      { error: 'Failed to log error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}