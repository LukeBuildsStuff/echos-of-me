import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAdminSession, logAdminAction, getGriefSensitiveErrorMessage } from '@/lib/admin-security'

export async function GET(request: NextRequest) {
  try {
    // Verify admin permissions
    const authResult = await verifyAdminSession('analytics.read', request)
    if (!authResult.isAuthorized) {
      return NextResponse.json(
        { error: getGriefSensitiveErrorMessage('insufficient_permissions') },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')
    const timeRange = searchParams.get('timeRange') || '30' // days
    const metricType = searchParams.get('metricType') || 'engagement'

    let familyFilter = ''
    let familyParams: any[] = []
    
    if (familyId) {
      familyFilter = 'AND f.id = $1'
      familyParams = [familyId]
    }

    // Get family engagement metrics
    const engagementMetrics = await query(`
      SELECT 
        f.id as family_id,
        f.family_name,
        f.support_status,
        f.created_at as family_created,
        COUNT(DISTINCT fm.user_id) as total_members,
        COUNT(DISTINCT CASE WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN fm.user_id END) as active_members,
        COALESCE(SUM(
          SELECT COUNT(*) 
          FROM responses r 
          WHERE r.user_id = fm.user_id AND r.is_draft = false
        ), 0) as total_memories,
        COALESCE(SUM(
          SELECT COUNT(*) 
          FROM responses r 
          WHERE r.user_id = fm.user_id 
            AND r.is_draft = false 
            AND r.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} days'
        ), 0) as recent_memories,
        COALESCE(SUM(
          SELECT SUM(r.word_count) 
          FROM responses r 
          WHERE r.user_id = fm.user_id AND r.is_draft = false
        ), 0) as total_word_count,
        COALESCE(AVG(
          SELECT COUNT(*) 
          FROM ai_conversation_analytics aca 
          WHERE aca.user_id = fm.user_id
        ), 0) as avg_ai_interactions_per_member,
        COALESCE(AVG(
          SELECT AVG(aca.conversation_quality_score) 
          FROM ai_conversation_analytics aca 
          WHERE aca.user_id = fm.user_id
        ), 0) as avg_conversation_quality,
        COALESCE(AVG(
          SELECT AVG(aca.emotional_resonance_score) 
          FROM ai_conversation_analytics aca 
          WHERE aca.user_id = fm.user_id
        ), 0) as avg_emotional_resonance,
        COUNT(DISTINCT CASE WHEN cde.status = 'active' THEN cde.id END) as active_crisis_events,
        COUNT(DISTINCT CASE WHEN si.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} days' THEN si.id END) as recent_support_interactions,
        MAX(u.last_login_at) as last_family_activity,
        (
          SELECT json_agg(
            json_build_object(
              'date', DATE(fem.metric_date),
              'activeMembersCount', fem.active_members_count,
              'totalMemoriesShared', fem.total_memories_shared,
              'aiInteractionsCount', fem.ai_interactions_count,
              'familyCohesionScore', fem.family_cohesion_score,
              'healingProgressIndicators', fem.healing_progress_indicators
            )
          )
          FROM family_engagement_metrics fem 
          WHERE fem.family_id = f.id 
            AND fem.metric_date > CURRENT_DATE - INTERVAL '${timeRange} days'
          ORDER BY fem.metric_date DESC
        ) as engagement_timeline
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      JOIN users u ON fm.user_id = u.id
      LEFT JOIN crisis_detection_events cde ON f.id = cde.family_id
      LEFT JOIN support_interactions si ON f.id = si.family_id
      WHERE 1=1 ${familyFilter}
      GROUP BY f.id, f.family_name, f.support_status, f.created_at
      ORDER BY total_memories DESC, last_family_activity DESC
    `, familyParams)

    // Get healing progress indicators
    const healingMetrics = await query(`
      SELECT 
        f.id as family_id,
        f.family_name,
        f.memorial_status,
        f.memorial_date,
        EXTRACT(days FROM CURRENT_DATE - f.created_at) as days_since_joining,
        EXTRACT(days FROM CURRENT_DATE - COALESCE(f.memorial_date, f.created_at)) as days_since_loss,
        -- Grief stage assessment based on interaction patterns
        CASE 
          WHEN AVG(aca.emotional_resonance_score) < 3 AND COUNT(aca.id) > 10 THEN 'acute_grief'
          WHEN AVG(aca.emotional_resonance_score) BETWEEN 3 AND 6 THEN 'processing'
          WHEN AVG(aca.emotional_resonance_score) > 6 THEN 'healing'
          ELSE 'assessment_needed'
        END as estimated_grief_stage,
        -- Engagement trajectory
        CASE 
          WHEN COUNT(DISTINCT DATE(r.created_at)) OVER (
            PARTITION BY f.id 
            ORDER BY r.created_at 
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
          ) > COUNT(DISTINCT DATE(r.created_at)) OVER (
            PARTITION BY f.id 
            ORDER BY r.created_at 
            ROWS BETWEEN 14 PRECEDING AND 8 PRECEDING
          ) THEN 'increasing'
          WHEN COUNT(DISTINCT DATE(r.created_at)) OVER (
            PARTITION BY f.id 
            ORDER BY r.created_at 
            ROWS BETWEEN 7 PRECEDING AND CURRENT ROW
          ) < COUNT(DISTINCT DATE(r.created_at)) OVER (
            PARTITION BY f.id 
            ORDER BY r.created_at 
            ROWS BETWEEN 14 PRECEDING AND 8 PRECEDING
          ) THEN 'decreasing'
          ELSE 'stable'
        END as engagement_trend,
        COUNT(DISTINCT r.id) as total_memories_shared,
        COUNT(DISTINCT aca.id) as total_ai_interactions,
        AVG(aca.conversation_quality_score) as avg_conversation_quality,
        AVG(aca.emotional_resonance_score) as avg_emotional_resonance,
        COUNT(DISTINCT ml.id) as milestone_messages_created,
        -- Support needs assessment
        COUNT(DISTINCT cde.id) FILTER (WHERE cde.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as recent_crisis_events,
        COUNT(DISTINCT si.id) FILTER (WHERE si.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as recent_support_interactions
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      LEFT JOIN responses r ON fm.user_id = r.user_id AND r.is_draft = false
      LEFT JOIN ai_conversation_analytics aca ON fm.user_id = aca.user_id
      LEFT JOIN milestone_messages ml ON fm.user_id = ml.user_id
      LEFT JOIN crisis_detection_events cde ON f.id = cde.family_id
      LEFT JOIN support_interactions si ON f.id = si.family_id
      WHERE 1=1 ${familyFilter}
        AND r.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} days'
      GROUP BY f.id, f.family_name, f.memorial_status, f.memorial_date, f.created_at
    `, familyParams)

    // Get memory content analysis
    const memoryAnalysis = await query(`
      SELECT 
        f.id as family_id,
        f.family_name,
        -- Content themes analysis
        COALESCE(array_agg(DISTINCT ld.category) FILTER (WHERE ld.category IS NOT NULL), ARRAY[]::varchar[]) as memory_categories,
        COALESCE(array_agg(DISTINCT ld.tags) FILTER (WHERE ld.tags IS NOT NULL), ARRAY[]::text[]) as memory_tags,
        -- Emotional depth indicators
        AVG(ld.emotional_depth) as avg_emotional_depth,
        COUNT(CASE WHEN ld.emotional_depth >= 8 THEN 1 END) as high_emotional_depth_count,
        COUNT(CASE WHEN ld.emotional_depth <= 3 THEN 1 END) as low_emotional_depth_count,
        -- Memory preservation metrics
        COUNT(DISTINCT ld.id) as life_detail_entries,
        COUNT(DISTINCT r.id) as response_entries,
        SUM(r.word_count) as total_words_preserved,
        COUNT(DISTINCT ml.id) as milestone_messages,
        -- Family connection indicators
        AVG(array_length(ld.related_people, 1)) as avg_people_mentioned_per_memory,
        COUNT(DISTINCT unnest(ld.related_people)) as unique_people_mentioned,
        -- Recent activity patterns
        COUNT(CASE WHEN r.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as memories_last_week,
        COUNT(CASE WHEN r.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as memories_last_month
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      LEFT JOIN life_detail_entries ld ON fm.user_id = ld.user_id
      LEFT JOIN responses r ON fm.user_id = r.user_id AND r.is_draft = false
      LEFT JOIN milestone_messages ml ON fm.user_id = ml.user_id
      WHERE 1=1 ${familyFilter}
      GROUP BY f.id, f.family_name
    `, familyParams)

    // Get platform health indicators
    const platformMetrics = await query(`
      SELECT 
        COUNT(DISTINCT f.id) as total_families,
        COUNT(DISTINCT fm.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN fm.user_id END) as active_users,
        COUNT(DISTINCT CASE WHEN f.support_status = 'stable' THEN f.id END) as stable_families,
        COUNT(DISTINCT CASE WHEN f.support_status = 'monitoring' THEN f.id END) as monitoring_families,
        COUNT(DISTINCT CASE WHEN f.support_status = 'intervention' THEN f.id END) as intervention_families,
        SUM(
          SELECT COUNT(*) 
          FROM responses r 
          WHERE r.user_id = fm.user_id 
            AND r.is_draft = false 
            AND r.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRange} days'
        ) as total_recent_memories,
        AVG(
          SELECT AVG(aca.conversation_quality_score) 
          FROM ai_conversation_analytics aca 
          WHERE aca.user_id = fm.user_id
        ) as platform_avg_quality,
        COUNT(DISTINCT cde.id) FILTER (WHERE cde.status = 'active') as active_crisis_count,
        COUNT(DISTINCT cde.id) FILTER (WHERE cde.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as recent_crisis_count
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      JOIN users u ON fm.user_id = u.id
      LEFT JOIN crisis_detection_events cde ON f.id = cde.family_id
      ${familyId ? 'WHERE f.id = $1' : ''}
    `, familyParams)

    // Format the analytics data with grief-sensitive insights
    const analyticsData = {
      familyEngagement: engagementMetrics.rows.map(family => ({
        familyId: family.family_id,
        familyName: family.family_name,
        supportStatus: family.support_status,
        joinedDate: family.family_created,
        metrics: {
          totalMembers: parseInt(family.total_members),
          activeMembers: parseInt(family.active_members),
          totalMemories: parseInt(family.total_memories),
          recentMemories: parseInt(family.recent_memories),
          totalWordCount: parseInt(family.total_word_count),
          avgAiInteractionsPerMember: parseFloat(family.avg_ai_interactions_per_member) || 0,
          avgConversationQuality: parseFloat(family.avg_conversation_quality) || 0,
          avgEmotionalResonance: parseFloat(family.avg_emotional_resonance) || 0,
          activeCrisisEvents: parseInt(family.active_crisis_events),
          recentSupportInteractions: parseInt(family.recent_support_interactions),
          lastActivity: family.last_family_activity
        },
        engagementTimeline: family.engagement_timeline || [],
        healthIndicators: {
          isActivelyEngaged: parseInt(family.recent_memories) > 0,
          needsAttention: parseInt(family.active_crisis_events) > 0,
          engagementLevel: parseFloat(family.avg_conversation_quality) >= 7 ? 'high' :
                          parseFloat(family.avg_conversation_quality) >= 4 ? 'moderate' : 'low'
        }
      })),
      healingProgress: healingMetrics.rows.map(family => ({
        familyId: family.family_id,
        familyName: family.family_name,
        isMemorial: family.memorial_status,
        memorialDate: family.memorial_date,
        journeyMetrics: {
          daysSinceJoining: parseInt(family.days_since_joining),
          daysSinceLoss: parseInt(family.days_since_loss),
          estimatedGriefStage: family.estimated_grief_stage,
          engagementTrend: family.engagement_trend
        },
        legacyMetrics: {
          totalMemoriesShared: parseInt(family.total_memories_shared),
          totalAiInteractions: parseInt(family.total_ai_interactions),
          avgConversationQuality: parseFloat(family.avg_conversation_quality) || 0,
          avgEmotionalResonance: parseFloat(family.avg_emotional_resonance) || 0,
          milestoneMessagesCreated: parseInt(family.milestone_messages_created)
        },
        supportMetrics: {
          recentCrisisEvents: parseInt(family.recent_crisis_events),
          recentSupportInteractions: parseInt(family.recent_support_interactions),
          supportNeeded: parseInt(family.recent_crisis_events) > 0 || 
                        parseFloat(family.avg_emotional_resonance) < 3
        }
      })),
      memoryContent: memoryAnalysis.rows.map(family => ({
        familyId: family.family_id,
        familyName: family.family_name,
        contentAnalysis: {
          memoryCategories: family.memory_categories || [],
          memoryTags: family.memory_tags ? family.memory_tags.flat() : [],
          avgEmotionalDepth: parseFloat(family.avg_emotional_depth) || 0,
          highEmotionalDepthCount: parseInt(family.high_emotional_depth_count),
          lowEmotionalDepthCount: parseInt(family.low_emotional_depth_count)
        },
        preservationMetrics: {
          lifeDetailEntries: parseInt(family.life_detail_entries),
          responseEntries: parseInt(family.response_entries),
          totalWordsPreserved: parseInt(family.total_words_preserved),
          milestoneMessages: parseInt(family.milestone_messages)
        },
        connectionMetrics: {
          avgPeopleMentionedPerMemory: parseFloat(family.avg_people_mentioned_per_memory) || 0,
          uniquePeopleMentioned: parseInt(family.unique_people_mentioned),
          memoriesLastWeek: parseInt(family.memories_last_week),
          memoriesLastMonth: parseInt(family.memories_last_month)
        }
      })),
      platformOverview: platformMetrics.rows[0] ? {
        totalFamilies: parseInt(platformMetrics.rows[0].total_families),
        totalUsers: parseInt(platformMetrics.rows[0].total_users),
        activeUsers: parseInt(platformMetrics.rows[0].active_users),
        familyDistribution: {
          stable: parseInt(platformMetrics.rows[0].stable_families),
          monitoring: parseInt(platformMetrics.rows[0].monitoring_families),
          intervention: parseInt(platformMetrics.rows[0].intervention_families)
        },
        recentActivity: {
          totalRecentMemories: parseInt(platformMetrics.rows[0].total_recent_memories),
          platformAvgQuality: parseFloat(platformMetrics.rows[0].platform_avg_quality) || 0
        },
        crisisMetrics: {
          activeCrisisCount: parseInt(platformMetrics.rows[0].active_crisis_count),
          recentCrisisCount: parseInt(platformMetrics.rows[0].recent_crisis_count)
        }
      } : null
    }

    // Log the analytics access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'family_analytics_accessed',
      resource_type: 'analytics',
      target_family_id: familyId || undefined,
      action_details: {
        timeRange: `${timeRange} days`,
        metricType,
        familiesAnalyzed: analyticsData.familyEngagement.length,
        specificFamily: familyId ? true : false
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      risk_level: 'low'
    })

    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        timeRange: `${timeRange} days`,
        metricType,
        generatedAt: new Date().toISOString(),
        familySpecific: !!familyId
      }
    })

  } catch (error) {
    console.error('Error fetching family analytics:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}