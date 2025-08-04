import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

interface UserTrainingData {
  id: string
  email: string
  name: string
  responses: {
    count: number
    categories: string[]
    wordCount: number
    lastResponseAt: string | null
    qualityScore: number
  }
  lifeEntries: {
    count: number
    categories: string[]  
    wordCount: number
    lastEntryAt: string | null
  }
  milestones: {
    count: number
    types: string[]
    wordCount: number
    lastMilestoneAt: string | null
  }
  training: {
    isEligible: boolean
    dataQuality: 'poor' | 'fair' | 'good' | 'excellent'
    estimatedTrainingTime: number
    lastTrainingAt: string | null
    modelVersions: number
  }
  privacy: {
    consentStatus: 'unknown' | 'granted' | 'denied' | 'pending'
    lastConsentUpdate: string | null
  }
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const eligibleOnly = searchParams.get('eligibleOnly') === 'true'
    const sortBy = searchParams.get('sortBy') || 'totalWords'
    const offset = (page - 1) * limit

    let whereClause = 'WHERE u.is_active = true'
    let params: any[] = []
    let paramCount = 0

    if (search) {
      paramCount++
      whereClause += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    // Get comprehensive user training data
    const usersQuery = `
      WITH user_stats AS (
        SELECT 
          u.id,
          u.email,
          u.name,
          u.created_at,
          
          -- Response statistics
          COUNT(DISTINCT r.id) as response_count,
          COUNT(DISTINCT r.question_id) as unique_questions,
          COALESCE(SUM(LENGTH(r.response_text)), 0) as response_word_count,
          MAX(r.created_at) as last_response_at,
          
          -- Life entries statistics  
          COUNT(DISTINCT le.id) as life_entry_count,
          COUNT(DISTINCT le.category) as life_categories,
          COALESCE(SUM(LENGTH(le.content)), 0) as life_word_count,
          MAX(le.created_at) as last_life_entry_at,
          
          -- Milestone statistics
          COUNT(DISTINCT mm.id) as milestone_count,
          COUNT(DISTINCT mm.milestone_type) as milestone_types,
          COALESCE(SUM(LENGTH(mm.message_content)), 0) as milestone_word_count,
          MAX(mm.created_at) as last_milestone_at,
          
          -- Training history
          COUNT(DISTINCT tr.run_id) as model_versions,
          MAX(tr.created_at) as last_training_at
          
        FROM users u
        LEFT JOIN responses r ON u.id = r.user_id AND (r.response_text IS NOT NULL AND LENGTH(r.response_text) > 10)
        LEFT JOIN life_detail_entries le ON u.id = le.user_id AND le.is_private = false
        LEFT JOIN milestone_messages mm ON u.id = mm.user_id AND mm.is_private = false
        LEFT JOIN training_runs tr ON u.id = tr.user_id AND tr.status = 'completed'
        ${whereClause}
        GROUP BY u.id, u.email, u.name, u.created_at
      ),
      enriched_stats AS (
        SELECT *,
          (response_word_count + life_word_count + milestone_word_count) as total_word_count,
          (response_count + life_entry_count + milestone_count) as total_entries,
          
          -- Calculate data quality score (0-100)
          CASE 
            WHEN (response_count + life_entry_count + milestone_count) = 0 THEN 0
            WHEN (response_word_count + life_word_count + milestone_word_count) < 1000 THEN 25
            WHEN (response_word_count + life_word_count + milestone_word_count) < 5000 THEN 50
            WHEN (response_word_count + life_word_count + milestone_word_count) < 15000 THEN 75
            ELSE 90 + LEAST(10, (response_count + life_entry_count + milestone_count) / 50)
          END as quality_score,
          
          -- Estimate training time in minutes
          CASE
            WHEN (response_word_count + life_word_count + milestone_word_count) < 1000 THEN 30
            WHEN (response_word_count + life_word_count + milestone_word_count) < 5000 THEN 60
            WHEN (response_word_count + life_word_count + milestone_word_count) < 15000 THEN 90
            ELSE 120 + LEAST(60, (response_word_count + life_word_count + milestone_word_count) / 1000)
          END as estimated_training_minutes
          
        FROM user_stats
      )
      SELECT * FROM enriched_stats
      ${eligibleOnly ? 'WHERE total_word_count >= 1000 AND total_entries >= 10' : ''}
      ORDER BY 
        CASE WHEN $${paramCount + 1} = 'totalWords' THEN total_word_count END DESC,
        CASE WHEN $${paramCount + 1} = 'dataQuality' THEN quality_score END DESC,
        CASE WHEN $${paramCount + 1} = 'lastActivity' THEN GREATEST(last_response_at, last_life_entry_at, last_milestone_at) END DESC,
        CASE WHEN $${paramCount + 1} = 'name' THEN name END ASC
      LIMIT $${paramCount + 2} OFFSET $${paramCount + 3}
    `

    params.push(sortBy, limit, offset)
    const result = await query(usersQuery, params)

    // Get category and type details for each user
    const userIds = result.rows.map(row => row.id)
    
    let categoryData: any = { rows: [] }
    let typeData: any = { rows: [] }
    
    if (userIds.length > 0) {
      // Get response categories
      categoryData = await query(`
        SELECT 
          r.user_id,
          q.category,
          COUNT(*) as count
        FROM responses r
        JOIN questions q ON r.question_id = q.id
        WHERE r.user_id = ANY($1) AND r.response_text IS NOT NULL
        GROUP BY r.user_id, q.category
      `, [userIds])

      // Get milestone types  
      typeData = await query(`
        SELECT 
          user_id,
          milestone_type,
          COUNT(*) as count
        FROM milestone_messages
        WHERE user_id = ANY($1) AND is_private = false
        GROUP BY user_id, milestone_type
      `, [userIds])
    }

    // Process results into structured format
    const userData: UserTrainingData[] = result.rows.map((row: any) => {
      const userCategories = categoryData.rows
        .filter((cat: any) => cat.user_id === row.id)
        .map((cat: any) => `${cat.category} (${cat.count})`)
      
      const userTypes = typeData.rows
        .filter((type: any) => type.user_id === row.id)
        .map((type: any) => `${type.milestone_type} (${type.count})`)

      const isEligible = row.total_word_count >= 1000 && row.total_entries >= 10
      
      let dataQuality: 'poor' | 'fair' | 'good' | 'excellent'
      if (row.quality_score < 25) dataQuality = 'poor'
      else if (row.quality_score < 50) dataQuality = 'fair'  
      else if (row.quality_score < 75) dataQuality = 'good'
      else dataQuality = 'excellent'

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        responses: {
          count: parseInt(row.response_count),
          categories: userCategories,
          wordCount: parseInt(row.response_word_count),
          lastResponseAt: row.last_response_at,
          qualityScore: Math.round(row.quality_score)
        },
        lifeEntries: {
          count: parseInt(row.life_entry_count),
          categories: [`${row.life_categories} unique categories`],
          wordCount: parseInt(row.life_word_count),
          lastEntryAt: row.last_life_entry_at
        },
        milestones: {
          count: parseInt(row.milestone_count),
          types: userTypes,
          wordCount: parseInt(row.milestone_word_count),
          lastMilestoneAt: row.last_milestone_at
        },
        training: {
          isEligible,
          dataQuality,
          estimatedTrainingTime: parseInt(row.estimated_training_minutes),
          lastTrainingAt: row.last_training_at,
          modelVersions: parseInt(row.model_versions)
        },
        privacy: {
          consentStatus: 'unknown', // TODO: Implement consent tracking
          lastConsentUpdate: null
        }
      }
    })

    // Get total count for pagination
    const countQuery = `
      WITH user_stats AS (
        SELECT 
          u.id,
          COUNT(DISTINCT r.id) as response_count,
          COUNT(DISTINCT le.id) as life_entry_count,
          COUNT(DISTINCT mm.id) as milestone_count,
          COALESCE(SUM(LENGTH(r.response_text)), 0) + 
          COALESCE(SUM(LENGTH(le.content)), 0) + 
          COALESCE(SUM(LENGTH(mm.message_content)), 0) as total_word_count
        FROM users u
        LEFT JOIN responses r ON u.id = r.user_id AND (r.response_text IS NOT NULL AND LENGTH(r.response_text) > 10)
        LEFT JOIN life_detail_entries le ON u.id = le.user_id AND le.is_private = false
        LEFT JOIN milestone_messages mm ON u.id = mm.user_id AND mm.is_private = false
        ${whereClause}
        GROUP BY u.id
      )
      SELECT COUNT(*) as total
      FROM user_stats
      ${eligibleOnly ? 'WHERE total_word_count >= 1000 AND (response_count + life_entry_count + milestone_count) >= 10' : ''}
    `

    const countResult = await query(countQuery, params.slice(0, paramCount))
    const totalUsers = parseInt(countResult.rows[0].total)
    const totalPages = Math.ceil(totalUsers / limit)

    return NextResponse.json({
      users: userData,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        totalEligible: userData.filter(u => u.training.isEligible).length,
        averageQualityScore: Math.round(userData.reduce((sum, u) => sum + u.responses.qualityScore, 0) / userData.length) || 0,
        totalTrainingTime: userData.reduce((sum, u) => sum + u.training.estimatedTrainingTime, 0)
      }
    })

  } catch (error) {
    console.error('Admin training data fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training data' },
      { status: 500 }
    )
  }
})

// Get detailed data for a specific user OR trigger training
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { userId, action, userIds, config } = await request.json()

    if (action === 'preview') {
      // Get sample data for preview
      const [responses, lifeEntries, milestones] = await Promise.all([
        query(`
          SELECT r.response_text, r.created_at, q.question_text, q.category
          FROM responses r
          JOIN questions q ON r.question_id = q.id
          WHERE r.user_id = $1 AND r.response_text IS NOT NULL
          ORDER BY r.created_at DESC
          LIMIT 10
        `, [userId]),
        
        query(`
          SELECT title, content, category, created_at, tags
          FROM life_detail_entries
          WHERE user_id = $1 AND is_private = false
          ORDER BY created_at DESC
          LIMIT 5
        `, [userId]),
        
        query(`
          SELECT milestone_type, message_title, message_content, created_at
          FROM milestone_messages
          WHERE user_id = $1 AND is_private = false
          ORDER BY created_at DESC  
          LIMIT 5
        `, [userId])
      ])

      return NextResponse.json({
        responses: responses.rows,
        lifeEntries: lifeEntries.rows,
        milestones: milestones.rows
      })
    }

    if (action === 'start_training') {
      // Import the training engine
      const { trainingEngine } = await import('@/lib/training-engine')
      const { defaultTrainingConfig } = await import('@/lib/ai-training-config')
      
      // Validate that userIds is provided
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({
          error: 'At least one user ID is required for training'
        }, { status: 400 })
      }

      // Call the existing start training API logic
      const trainingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/training/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds,
          config: { ...defaultTrainingConfig, ...config },
          batchMode: userIds.length > 1,
          adminInitiated: true,
          priority: 'high'
        })
      })

      const trainingResult = await trainingResponse.json()
      
      if (!trainingResponse.ok) {
        return NextResponse.json(trainingResult, { status: trainingResponse.status })
      }

      return NextResponse.json({
        success: true,
        message: `Training initiated for ${userIds.length} user${userIds.length > 1 ? 's' : ''}`,
        trainingJobs: trainingResult.results,
        errors: trainingResult.errors || []
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Admin training data error:', error)
    return NextResponse.json(
      { error: 'Failed to process training data request' },
      { status: 500 }
    )
  }
})