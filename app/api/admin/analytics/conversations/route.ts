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
    const timeRange = searchParams.get('timeRange') || '30' // days
    const userId = searchParams.get('userId')
    const familyId = searchParams.get('familyId')
    const qualityThreshold = parseFloat(searchParams.get('qualityThreshold') || '0')

    // Build dynamic filters
    let userFilter = ''
    let familyFilter = ''
    const queryParams: any[] = []
    let paramIndex = 1

    if (userId) {
      userFilter = `AND aca.user_id = $${paramIndex}`
      queryParams.push(userId)
      paramIndex++
    }

    if (familyId) {
      familyFilter = `AND aca.family_id = $${paramIndex}`
      queryParams.push(familyId)
      paramIndex++
    }

    // Add time range and quality threshold
    queryParams.push(timeRange, qualityThreshold)
    const timeRangeParam = `$${paramIndex}`
    const qualityParam = `$${paramIndex + 1}`

    // Get AI conversation quality analytics
    const conversationMetrics = await query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        f.id as family_id,
        f.family_name,
        f.support_status,
        COUNT(aca.id) as total_conversations,
        AVG(aca.conversation_quality_score) as avg_quality_score,
        AVG(aca.emotional_resonance_score) as avg_emotional_resonance,
        AVG(aca.memory_accuracy_score) as avg_memory_accuracy,
        AVG(aca.conversation_length) as avg_conversation_length,
        AVG(aca.response_time_avg_ms) as avg_response_time,
        COUNT(CASE WHEN aca.user_satisfaction_indicated = true THEN 1 END) as positive_satisfaction_count,
        COUNT(CASE WHEN aca.harmful_content_detected = true THEN 1 END) as harmful_content_incidents,
        COUNT(CASE WHEN aca.conversation_quality_score >= 8 THEN 1 END) as high_quality_conversations,
        COUNT(CASE WHEN aca.conversation_quality_score <= 4 THEN 1 END) as low_quality_conversations,
        array_agg(DISTINCT unnest(aca.topics_covered)) FILTER (WHERE aca.topics_covered IS NOT NULL) as all_topics_covered,
        array_agg(DISTINCT unnest(aca.emotional_themes)) FILTER (WHERE aca.emotional_themes IS NOT NULL) as all_emotional_themes,
        array_agg(DISTINCT unnest(aca.content_moderation_flags)) FILTER (WHERE aca.content_moderation_flags IS NOT NULL) as moderation_flags,
        MAX(aca.created_at) as last_conversation,
        MIN(aca.created_at) as first_conversation,
        -- Quality trend analysis
        (
          SELECT AVG(subaca.conversation_quality_score)
          FROM ai_conversation_analytics subaca
          WHERE subaca.user_id = u.id 
            AND subaca.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ) as recent_quality_avg,
        (
          SELECT AVG(subaca.conversation_quality_score)
          FROM ai_conversation_analytics subaca
          WHERE subaca.user_id = u.id 
            AND subaca.created_at BETWEEN CURRENT_TIMESTAMP - INTERVAL '14 days' 
            AND CURRENT_TIMESTAMP - INTERVAL '7 days'
        ) as previous_quality_avg
      FROM users u
      LEFT JOIN family_members fm ON u.id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.id
      LEFT JOIN ai_conversation_analytics aca ON u.id = aca.user_id
      WHERE aca.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRangeParam} days'
        AND aca.conversation_quality_score >= ${qualityParam}
        ${userFilter} ${familyFilter}
      GROUP BY u.id, u.name, u.email, f.id, f.family_name, f.support_status
      HAVING COUNT(aca.id) > 0
      ORDER BY avg_quality_score DESC, total_conversations DESC
    `, queryParams)

    // Get conversation quality trends over time
    const qualityTrends = await query(`
      SELECT 
        DATE(aca.created_at) as conversation_date,
        COUNT(aca.id) as conversation_count,
        AVG(aca.conversation_quality_score) as avg_quality,
        AVG(aca.emotional_resonance_score) as avg_emotional_resonance,
        AVG(aca.memory_accuracy_score) as avg_memory_accuracy,
        COUNT(CASE WHEN aca.user_satisfaction_indicated = true THEN 1 END) as satisfaction_count,
        COUNT(CASE WHEN aca.harmful_content_detected = true THEN 1 END) as harmful_content_count,
        AVG(aca.conversation_length) as avg_length,
        AVG(aca.response_time_avg_ms) as avg_response_time,
        -- Model performance breakdown
        COUNT(CASE WHEN aca.model_version LIKE '%gpt%' THEN 1 END) as gpt_conversations,
        COUNT(CASE WHEN aca.model_version LIKE '%claude%' THEN 1 END) as claude_conversations,
        COUNT(CASE WHEN aca.model_version LIKE '%mistral%' THEN 1 END) as mistral_conversations
      FROM ai_conversation_analytics aca
      LEFT JOIN users u ON aca.user_id = u.id
      LEFT JOIN families f ON aca.family_id = f.id
      WHERE aca.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRangeParam} days'
        ${userFilter} ${familyFilter}
      GROUP BY DATE(aca.created_at)
      ORDER BY conversation_date DESC
    `, queryParams.slice(0, paramIndex - 1)) // Remove quality threshold for trends

    // Get model performance comparison
    const modelPerformance = await query(`
      SELECT 
        aca.model_version,
        COUNT(aca.id) as conversation_count,
        AVG(aca.conversation_quality_score) as avg_quality_score,
        AVG(aca.emotional_resonance_score) as avg_emotional_resonance,
        AVG(aca.memory_accuracy_score) as avg_memory_accuracy,
        AVG(aca.conversation_length) as avg_conversation_length,
        AVG(aca.response_time_avg_ms) as avg_response_time,
        COUNT(CASE WHEN aca.user_satisfaction_indicated = true THEN 1 END) as satisfaction_count,
        COUNT(CASE WHEN aca.harmful_content_detected = true THEN 1 END) as harmful_content_count,
        STDDEV(aca.conversation_quality_score) as quality_consistency,
        -- Performance percentiles
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aca.conversation_quality_score) as median_quality,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY aca.conversation_quality_score) as p90_quality,
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY aca.conversation_quality_score) as p10_quality
      FROM ai_conversation_analytics aca
      WHERE aca.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRangeParam} days'
        ${userFilter} ${familyFilter}
      GROUP BY aca.model_version
      HAVING COUNT(aca.id) >= 5  -- Only include models with sufficient data
      ORDER BY avg_quality_score DESC
    `, queryParams.slice(0, paramIndex - 1))

    // Get content analysis insights
    const contentAnalysis = await query(`
      SELECT 
        -- Topic analysis
        unnest(aca.topics_covered) as topic,
        COUNT(*) as topic_frequency,
        AVG(aca.conversation_quality_score) as avg_quality_for_topic,
        AVG(aca.emotional_resonance_score) as avg_emotional_resonance_for_topic
      FROM ai_conversation_analytics aca
      WHERE aca.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRangeParam} days'
        AND aca.topics_covered IS NOT NULL
        ${userFilter} ${familyFilter}
      GROUP BY topic
      HAVING COUNT(*) >= 3  -- Only include topics with sufficient data
      ORDER BY topic_frequency DESC, avg_quality_for_topic DESC
      LIMIT 20
    `, queryParams.slice(0, paramIndex - 1))

    // Get emotional theme analysis
    const emotionalAnalysis = await query(`
      SELECT 
        unnest(aca.emotional_themes) as emotional_theme,
        COUNT(*) as theme_frequency,
        AVG(aca.conversation_quality_score) as avg_quality_for_theme,
        AVG(aca.emotional_resonance_score) as avg_emotional_resonance_for_theme,
        COUNT(CASE WHEN aca.user_satisfaction_indicated = true THEN 1 END) as satisfaction_count_for_theme
      FROM ai_conversation_analytics aca
      WHERE aca.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRangeParam} days'
        AND aca.emotional_themes IS NOT NULL
        ${userFilter} ${familyFilter}
      GROUP BY emotional_theme
      HAVING COUNT(*) >= 2
      ORDER BY theme_frequency DESC, avg_emotional_resonance_for_theme DESC
      LIMIT 15
    `, queryParams.slice(0, paramIndex - 1))

    // Get quality improvement suggestions
    const improvementInsights = await query(`
      SELECT 
        CASE 
          WHEN aca.conversation_quality_score < 4 THEN 'low_quality'
          WHEN aca.emotional_resonance_score < 4 THEN 'low_emotional_connection'
          WHEN aca.memory_accuracy_score < 6 THEN 'memory_accuracy_issues'
          WHEN aca.response_time_avg_ms > 5000 THEN 'slow_response_time'
          WHEN aca.harmful_content_detected = true THEN 'content_safety_concern'
          ELSE 'other'
        END as issue_category,
        COUNT(*) as issue_frequency,
        AVG(aca.conversation_quality_score) as avg_quality_score,
        array_agg(DISTINCT aca.improvement_suggestions) FILTER (WHERE aca.improvement_suggestions IS NOT NULL) as improvement_suggestions
      FROM ai_conversation_analytics aca
      WHERE aca.created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRangeParam} days'
        AND (
          aca.conversation_quality_score < 6 OR
          aca.emotional_resonance_score < 6 OR
          aca.memory_accuracy_score < 6 OR
          aca.response_time_avg_ms > 3000 OR
          aca.harmful_content_detected = true
        )
        ${userFilter} ${familyFilter}
      GROUP BY issue_category
      ORDER BY issue_frequency DESC
    `, queryParams.slice(0, paramIndex - 1))

    // Format the analytics data
    const analyticsData = {
      userConversationMetrics: conversationMetrics.rows.map(user => ({
        userId: user.user_id,
        userName: user.user_name,
        userEmail: user.user_email,
        family: user.family_id ? {
          id: user.family_id,
          name: user.family_name,
          supportStatus: user.support_status
        } : null,
        conversationStats: {
          totalConversations: parseInt(user.total_conversations),
          avgQualityScore: parseFloat(user.avg_quality_score) || 0,
          avgEmotionalResonance: parseFloat(user.avg_emotional_resonance) || 0,
          avgMemoryAccuracy: parseFloat(user.avg_memory_accuracy) || 0,
          avgConversationLength: parseInt(user.avg_conversation_length) || 0,
          avgResponseTime: parseInt(user.avg_response_time) || 0,
          positiveReactions: parseInt(user.positive_satisfaction_count),
          harmfulContentIncidents: parseInt(user.harmful_content_incidents),
          highQualityConversations: parseInt(user.high_quality_conversations),
          lowQualityConversations: parseInt(user.low_quality_conversations)
        },
        contentInsights: {
          topicsCovered: user.all_topics_covered || [],
          emotionalThemes: user.all_emotional_themes || [],
          moderationFlags: user.moderation_flags || []
        },
        timeRange: {
          firstConversation: user.first_conversation,
          lastConversation: user.last_conversation
        },
        qualityTrend: {
          recentAverage: parseFloat(user.recent_quality_avg) || 0,
          previousAverage: parseFloat(user.previous_quality_avg) || 0,
          trend: (parseFloat(user.recent_quality_avg) || 0) > (parseFloat(user.previous_quality_avg) || 0) ? 
                 'improving' : 'declining'
        }
      })),
      qualityTrends: qualityTrends.rows.map(trend => ({
        date: trend.conversation_date,
        conversationCount: parseInt(trend.conversation_count),
        avgQuality: parseFloat(trend.avg_quality) || 0,
        avgEmotionalResonance: parseFloat(trend.avg_emotional_resonance) || 0,
        avgMemoryAccuracy: parseFloat(trend.avg_memory_accuracy) || 0,
        satisfactionCount: parseInt(trend.satisfaction_count),
        harmfulContentCount: parseInt(trend.harmful_content_count),
        avgLength: parseInt(trend.avg_length) || 0,
        avgResponseTime: parseInt(trend.avg_response_time) || 0,
        modelBreakdown: {
          gptConversations: parseInt(trend.gpt_conversations),
          claudeConversations: parseInt(trend.claude_conversations),
          mistralConversations: parseInt(trend.mistral_conversations)
        }
      })),
      modelPerformance: modelPerformance.rows.map(model => ({
        modelVersion: model.model_version,
        conversationCount: parseInt(model.conversation_count),
        avgQualityScore: parseFloat(model.avg_quality_score) || 0,
        avgEmotionalResonance: parseFloat(model.avg_emotional_resonance) || 0,
        avgMemoryAccuracy: parseFloat(model.avg_memory_accuracy) || 0,
        avgConversationLength: parseInt(model.avg_conversation_length) || 0,
        avgResponseTime: parseInt(model.avg_response_time) || 0,
        satisfactionRate: (parseInt(model.satisfaction_count) / parseInt(model.conversation_count)) * 100,
        harmfulContentRate: (parseInt(model.harmful_content_count) / parseInt(model.conversation_count)) * 100,
        qualityConsistency: parseFloat(model.quality_consistency) || 0,
        qualityPercentiles: {
          median: parseFloat(model.median_quality) || 0,
          p90: parseFloat(model.p90_quality) || 0,
          p10: parseFloat(model.p10_quality) || 0
        }
      })),
      contentInsights: {
        topTopics: contentAnalysis.rows.map(topic => ({
          topic: topic.topic,
          frequency: parseInt(topic.topic_frequency),
          avgQuality: parseFloat(topic.avg_quality_for_topic) || 0,
          avgEmotionalResonance: parseFloat(topic.avg_emotional_resonance_for_topic) || 0
        })),
        emotionalThemes: emotionalAnalysis.rows.map(theme => ({
          theme: theme.emotional_theme,
          frequency: parseInt(theme.theme_frequency),
          avgQuality: parseFloat(theme.avg_quality_for_theme) || 0,
          avgEmotionalResonance: parseFloat(theme.avg_emotional_resonance_for_theme) || 0,
          satisfactionCount: parseInt(theme.satisfaction_count_for_theme)
        }))
      },
      improvementOpportunities: improvementInsights.rows.map(insight => ({
        issueCategory: insight.issue_category,
        frequency: parseInt(insight.issue_frequency),
        avgQualityScore: parseFloat(insight.avg_quality_score) || 0,
        suggestions: insight.improvement_suggestions || []
      }))
    }

    // Log the analytics access
    await logAdminAction({
      admin_email: authResult.user!.email,
      action_type: 'conversation_analytics_accessed',
      resource_type: 'analytics',
      target_user_id: userId || undefined,
      target_family_id: familyId || undefined,
      action_details: {
        timeRange: `${timeRange} days`,
        qualityThreshold,
        usersAnalyzed: analyticsData.userConversationMetrics.length,
        specificUser: userId ? true : false,
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
        qualityThreshold,
        generatedAt: new Date().toISOString(),
        userSpecific: !!userId,
        familySpecific: !!familyId
      }
    })

  } catch (error) {
    console.error('Error fetching conversation analytics:', error)
    
    return NextResponse.json(
      { error: getGriefSensitiveErrorMessage('data_processing_error') },
      { status: 500 }
    )
  }
}