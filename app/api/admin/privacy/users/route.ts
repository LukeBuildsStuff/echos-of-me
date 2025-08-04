import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get comprehensive user privacy profiles
    const users = await db.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        
        -- Consent information
        uc.data_processing_consent,
        uc.ai_training_consent,
        uc.data_sharing_consent,
        uc.marketing_consent,
        uc.consent_updated_at,
        uc.consent_ip_address,
        uc.consent_user_agent,
        
        -- Data counts
        (SELECT COUNT(*) FROM responses WHERE user_id = u.id) as response_count,
        (SELECT COUNT(*) FROM life_stories WHERE user_id = u.id) as life_story_count,
        (SELECT COUNT(*) FROM milestones WHERE user_id = u.id) as milestone_count,
        (SELECT COUNT(*) FROM voice_samples WHERE user_id = u.id) as voice_sample_count,
        
        -- Word counts
        (SELECT COALESCE(SUM(CHAR_LENGTH(response_text)), 0) FROM responses WHERE user_id = u.id) as response_words,
        (SELECT COALESCE(SUM(CHAR_LENGTH(content)), 0) FROM life_stories WHERE user_id = u.id) as life_story_words,
        (SELECT COALESCE(SUM(CHAR_LENGTH(message_content)), 0) FROM milestones WHERE user_id = u.id) as milestone_words,
        
        -- Last access times
        (SELECT MAX(created_at) FROM responses WHERE user_id = u.id) as last_response_at,
        (SELECT MAX(created_at) FROM life_stories WHERE user_id = u.id) as last_life_story_at,
        (SELECT MAX(created_at) FROM milestones WHERE user_id = u.id) as last_milestone_at,
        (SELECT MAX(created_at) FROM voice_samples WHERE user_id = u.id) as last_voice_at,
        
        -- Privacy rights requests
        (SELECT COUNT(*) FROM privacy_requests WHERE user_id = u.id AND request_type = 'data_access') as data_access_requests,
        (SELECT COUNT(*) FROM privacy_requests WHERE user_id = u.id AND request_type = 'data_deletion') as data_deletion_requests,
        (SELECT COUNT(*) FROM privacy_requests WHERE user_id = u.id AND request_type = 'data_portability') as data_portability_requests,
        (SELECT COUNT(*) FROM privacy_requests WHERE user_id = u.id AND request_type = 'data_rectification') as data_rectification_requests,
        
        -- Admin access tracking
        (SELECT COUNT(*) FROM admin_audit_log WHERE target_id = u.id AND target_type = 'user') as admin_access_count,
        (SELECT MAX(created_at) FROM admin_audit_log WHERE target_id = u.id AND target_type = 'user') as last_admin_access
        
      FROM users u
      LEFT JOIN user_consent uc ON u.id = uc.user_id
      ORDER BY u.created_at DESC
    `)

    // Process users to calculate risk scores and format data
    const processedUsers = users.rows.map((user: any) => {
      // Calculate compliance score based on various factors
      let complianceScore = 100
      
      // Deduct points for missing or old consent
      if (!user.data_processing_consent || user.data_processing_consent === 'denied') {
        complianceScore -= 30
      }
      
      if (!user.consent_updated_at || 
          (Date.now() - new Date(user.consent_updated_at).getTime()) > 365 * 24 * 60 * 60 * 1000) {
        complianceScore -= 15 // Consent older than 1 year
      }
      
      // Deduct points for excessive admin access
      if (user.admin_access_count > 10) {
        complianceScore -= 10
      }
      
      // Deduct points for having sensitive data without proper consent
      const hasSensitiveData = user.life_story_count > 0 || user.voice_sample_count > 0
      if (hasSensitiveData && user.ai_training_consent !== 'granted') {
        complianceScore -= 20
      }

      // Calculate risk level based on compliance score and other factors
      let riskLevel = 'low'
      const riskFactors = []
      
      if (complianceScore < 70) {
        riskLevel = 'high'
      } else if (complianceScore < 85) {
        riskLevel = 'medium'
      }
      
      if (user.data_processing_consent === 'denied') {
        riskFactors.push('Data processing consent denied')
        riskLevel = 'critical'
      }
      
      if (user.admin_access_count > 5) {
        riskFactors.push('High admin access frequency')
      }
      
      if (hasSensitiveData && user.ai_training_consent !== 'granted') {
        riskFactors.push('Sensitive data without training consent')
      }
      
      if (!user.consent_updated_at) {
        riskFactors.push('No consent record found')
        riskLevel = 'critical'
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name || 'Unknown User',
        
        consent: {
          dataProcessing: user.data_processing_consent || 'unknown',
          aiTraining: user.ai_training_consent || 'unknown',
          dataSharing: user.data_sharing_consent || 'unknown',
          marketing: user.marketing_consent || 'unknown',
          lastUpdated: user.consent_updated_at || user.created_at,
          ipAddress: user.consent_ip_address || 'unknown',
          userAgent: user.consent_user_agent || 'unknown'
        },
        
        dataCategories: {
          personalInfo: {
            collected: true,
            count: 1,
            lastAccess: user.last_admin_access || user.created_at,
            retention: '7 years',
            sensitive: false
          },
          responses: {
            collected: user.response_count > 0,
            count: user.response_count || 0,
            lastAccess: user.last_response_at || null,
            retention: '3 years',
            sensitive: true
          },
          lifeStories: {
            collected: user.life_story_count > 0,
            count: user.life_story_count || 0,
            lastAccess: user.last_life_story_at || null,
            retention: '5 years',
            sensitive: true
          },
          voiceData: {
            collected: user.voice_sample_count > 0,
            count: user.voice_sample_count || 0,
            lastAccess: user.last_voice_at || null,
            retention: '2 years',
            sensitive: true
          },
          biometricData: {
            collected: false,
            count: 0,
            lastAccess: null,
            retention: '1 year',
            sensitive: true
          }
        },
        
        access: {
          adminViews: user.admin_access_count || 0,
          lastAdminAccess: user.last_admin_access || null,
          trainingUsage: 0, // Would be calculated from training jobs
          lastTrainingAccess: null,
          apiAccesses: 0, // Would be tracked separately
          lastApiAccess: null
        },
        
        rights: {
          hasRequestedData: user.data_access_requests > 0,
          hasRequestedDeletion: user.data_deletion_requests > 0,
          hasRequestedPortability: user.data_portability_requests > 0,
          hasRequestedRectification: user.data_rectification_requests > 0,
          dataRetentionExpiry: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString() // 7 years from now
        },
        
        risk: {
          level: riskLevel,
          factors: riskFactors,
          complianceScore: Math.max(0, complianceScore),
          lastAssessment: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({ users: processedUsers })

  } catch (error) {
    console.error('Error fetching privacy user data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch privacy user data' },
      { status: 500 }
    )
  }
}