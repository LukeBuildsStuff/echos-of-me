import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { TrainingExample } from '@/lib/ai-training-config'

/**
 * Prepares training data from user responses
 * Formats responses into instruction-following format for Mistral 7B
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const minWordCount = parseInt(searchParams.get('minWordCount') || '20')
    
    // Get user's responses with question details
    const responses = await query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.created_at,
        q.question_text,
        q.category,
        u.name as user_name,
        u.primary_role,
        u.important_people
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      JOIN users u ON r.user_id = u.id
      WHERE 
        ($1::uuid IS NULL OR r.user_id = $1)
        AND r.word_count >= $2
        AND r.response_text IS NOT NULL
        AND LENGTH(r.response_text) > 50
      ORDER BY r.created_at ASC
    `, [userId, minWordCount])

    // Format responses into training examples
    const trainingExamples: TrainingExample[] = responses.rows.map(row => {
      // Parse important people if stored as JSON
      let importantPeople: string[] = []
      try {
        if (row.important_people) {
          const parsed = JSON.parse(row.important_people)
          importantPeople = parsed.map((p: any) => p.name).filter(Boolean)
        }
      } catch (e) {
        console.error('Failed to parse important_people:', e)
      }

      // Create context for the instruction
      const context = buildContext(row)
      
      return {
        instruction: row.question_text,
        input: context,
        output: row.response_text,
        metadata: {
          userId: row.user_id,
          timestamp: row.created_at,
          questionCategory: row.category,
          responseWordCount: row.word_count,
          emotionalTone: detectEmotionalTone(row.response_text),
          importantPeople
        }
      }
    })

    // Calculate statistics
    const stats = {
      totalResponses: trainingExamples.length,
      totalWordCount: trainingExamples.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0),
      uniqueCategories: new Set(trainingExamples.map(ex => ex.metadata.questionCategory)).size,
      averageResponseLength: Math.round(
        trainingExamples.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0) / trainingExamples.length
      ),
      dateRange: {
        earliest: trainingExamples[0]?.metadata.timestamp,
        latest: trainingExamples[trainingExamples.length - 1]?.metadata.timestamp
      },
      emotionalTones: trainingExamples.reduce((acc, ex) => {
        const tone = ex.metadata.emotionalTone || 'neutral'
        acc[tone] = (acc[tone] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    // Format for different training approaches
    const formattedData = {
      // For direct fine-tuning
      conversational: trainingExamples.map(ex => ({
        messages: [
          {
            role: 'system',
            content: `You are ${responses.rows[0]?.user_name || 'a loving family member'}, answering questions to preserve your legacy for future generations. ${ex.input}`
          },
          {
            role: 'user',
            content: ex.instruction
          },
          {
            role: 'assistant',
            content: ex.output
          }
        ]
      })),
      
      // For instruction tuning
      instructional: trainingExamples.map(ex => ({
        text: `### Instruction:\n${ex.instruction}\n\n### Context:\n${ex.input}\n\n### Response:\n${ex.output}`
      })),
      
      // Raw examples
      raw: trainingExamples
    }

    return NextResponse.json({
      stats,
      examples: formattedData,
      readyForTraining: stats.totalResponses >= 50 && stats.uniqueCategories >= 5,
      recommendations: getTrainingRecommendations(stats)
    })

  } catch (error) {
    console.error('Error preparing training data:', error)
    return NextResponse.json(
      { error: 'Failed to prepare training data' },
      { status: 500 }
    )
  }
})

function buildContext(row: any): string {
  const contexts = []
  
  if (row.primary_role) {
    contexts.push(`You are a ${row.primary_role}`)
  }
  
  if (row.important_people) {
    try {
      const people = JSON.parse(row.important_people)
      if (people.length > 0) {
        const names = people.map((p: any) => p.name).filter(Boolean).join(', ')
        if (names) {
          contexts.push(`speaking to ${names}`)
        }
      }
    } catch (e) {}
  }
  
  contexts.push('sharing your wisdom and memories')
  
  return contexts.join(', ') + '.'
}

function detectEmotionalTone(text: string): string {
  const lowerText = text.toLowerCase()
  
  // Simple keyword-based detection
  if (lowerText.includes('love') || lowerText.includes('joy') || lowerText.includes('happy')) {
    return 'joyful'
  }
  if (lowerText.includes('proud') || lowerText.includes('accomplish')) {
    return 'proud'
  }
  if (lowerText.includes('miss') || lowerText.includes('wish') || lowerText.includes('regret')) {
    return 'nostalgic'
  }
  if (lowerText.includes('advice') || lowerText.includes('learn') || lowerText.includes('important')) {
    return 'wise'
  }
  if (lowerText.includes('difficult') || lowerText.includes('hard') || lowerText.includes('struggle')) {
    return 'reflective'
  }
  
  return 'neutral'
}

function getTrainingRecommendations(stats: any): string[] {
  const recommendations = []
  
  if (stats.totalResponses < 50) {
    recommendations.push(`Need ${50 - stats.totalResponses} more responses before training (currently ${stats.totalResponses})`)
  }
  
  if (stats.uniqueCategories < 5) {
    recommendations.push(`Answer questions from ${5 - stats.uniqueCategories} more categories for diversity`)
  }
  
  if (stats.averageResponseLength < 50) {
    recommendations.push('Try to provide more detailed responses (aim for 50+ words)')
  }
  
  if (stats.totalWordCount < 5000) {
    recommendations.push(`Need ${5000 - stats.totalWordCount} more words of content`)
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Ready for training! You have sufficient high-quality data.')
  }
  
  return recommendations
}