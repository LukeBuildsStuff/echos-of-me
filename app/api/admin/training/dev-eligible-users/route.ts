import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

/**
 * Development version - Get users eligible for training with lower requirements
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get users with minimal training data requirements for development
    const eligibleUsers = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        
        -- Response counts
        COUNT(DISTINCT r.id) as response_count,
        COUNT(DISTINCT CASE WHEN r.word_count >= 10 THEN r.id END) as quality_response_count,
        COALESCE(SUM(r.word_count), 0) as response_word_count,
        
        -- Life entry counts
        COUNT(DISTINCT le.id) as life_entry_count,
        COALESCE(SUM(LENGTH(le.content)), 0) as life_entry_word_count,
        
        -- Milestone counts
        COUNT(DISTINCT mm.id) as milestone_count,
        COALESCE(SUM(LENGTH(mm.message_content)), 0) as milestone_word_count,
        
        -- Categories covered
        COUNT(DISTINCT q.category) as categories_covered,
        
        -- Training status
        tr_active.id as has_active_training,
        tr_completed.completed_count,
        tr_completed.last_training_at
        
      FROM users u
      LEFT JOIN responses r ON u.id = r.user_id 
      LEFT JOIN questions q ON r.question_id = q.id
      LEFT JOIN life_detail_entries le ON u.id = le.user_id
      LEFT JOIN milestone_messages mm ON u.id = mm.user_id
      
      -- Check for active training
      LEFT JOIN training_runs tr_active ON u.id = tr_active.user_id 
        AND tr_active.status IN ('queued', 'running')
      
      -- Check for completed training
      LEFT JOIN (
        SELECT 
          user_id, 
          COUNT(*) as completed_count,
          MAX(completed_at) as last_training_at
        FROM training_runs 
        WHERE status = 'completed'
        GROUP BY user_id
      ) tr_completed ON u.id = tr_completed.user_id
      
      WHERE u.is_active = true
      GROUP BY 
        u.id, u.name, u.email, u.created_at, 
        tr_active.id, tr_completed.completed_count, tr_completed.last_training_at
      
      HAVING 
        -- DEVELOPMENT: Lower requirements for testing
        COUNT(DISTINCT r.id) >= 2 AND
        (COALESCE(SUM(r.word_count), 0) + 
         COALESCE(SUM(LENGTH(le.content)), 0) + 
         COALESCE(SUM(LENGTH(mm.message_content)), 0)) >= 50 AND
        COUNT(DISTINCT CASE WHEN q.category IS NOT NULL THEN q.category END) >= 1
      
      ORDER BY 
        -- Prioritize users without training, then by data quality
        CASE WHEN tr_completed.completed_count IS NULL THEN 0 ELSE 1 END,
        (COALESCE(SUM(r.word_count), 0) + 
         COALESCE(SUM(LENGTH(le.content)), 0) + 
         COALESCE(SUM(LENGTH(mm.message_content)), 0)) DESC
    `)

    const users = eligibleUsers.rows.map(row => {
      const totalWords = parseInt(row.response_word_count) + 
                        parseInt(row.life_entry_word_count) + 
                        parseInt(row.milestone_word_count)
      
      // Calculate data quality score (adjusted for dev)
      const qualityScore = Math.min(100, Math.round(
        (parseInt(row.quality_response_count) * 30) + 
        (parseInt(row.categories_covered) * 25) + 
        (Math.min(1000, totalWords) / 10)
      ))
      
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        joinedAt: row.created_at,
        
        training: {
          isEligible: true,
          hasActiveTraining: !!row.has_active_training,
          completedModels: parseInt(row.completed_count) || 0,
          lastTrainingAt: row.last_training_at,
          canStartNew: !row.has_active_training
        },
        
        data: {
          responses: {
            total: parseInt(row.response_count),
            quality: parseInt(row.quality_response_count),
            wordCount: parseInt(row.response_word_count)
          },
          lifeEntries: {
            count: parseInt(row.life_entry_count),
            wordCount: parseInt(row.life_entry_word_count)
          },
          milestones: {
            count: parseInt(row.milestone_count),
            wordCount: parseInt(row.milestone_word_count)
          },
          totalWords: totalWords,
          categoriesCovered: parseInt(row.categories_covered),
          qualityScore
        },
        
        estimatedTrainingTime: Math.max(15, Math.min(90, Math.round(totalWords / 20)))
      }
    })

    return NextResponse.json({
      success: true,
      users,
      developmentMode: true,
      requirements: {
        responses: 2,
        totalWords: 50,
        categories: 1
      },
      summary: {
        eligibleCount: users.length,
        readyToTrain: users.filter(u => u.training.canStartNew).length,
        alreadyTrained: users.filter(u => u.training.completedModels > 0).length,
        currentlyTraining: users.filter(u => u.training.hasActiveTraining).length
      }
    })

  } catch (error) {
    console.error('Error fetching eligible users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible users' },
      { status: 500 }
    )
  }
})