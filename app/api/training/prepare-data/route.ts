import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { TrainingExample } from '@/lib/ai-training-config'

/**
 * Enhanced Training Data Preparation API
 * Prepares comprehensive training data from user responses, life entries, and milestone messages
 * Optimized for personalized model fine-tuning with improved context and formatting
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const minWordCount = parseInt(searchParams.get('minWordCount') || '20')
    
    // Get comprehensive training data from multiple sources
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
        u.important_people,
        u.cultural_background,
        u.significant_events
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

    // Get life detail entries for additional training context
    const lifeEntries = await query(`
      SELECT 
        id,
        title,
        content,
        category,
        tags,
        related_people,
        emotional_depth,
        created_at,
        u.name as user_name,
        u.primary_role,
        u.important_people
      FROM life_detail_entries lde
      JOIN users u ON lde.user_id = u.id
      WHERE 
        ($1::uuid IS NULL OR lde.user_id = $1)
        AND LENGTH(content) > 100
        AND is_private = false
      ORDER BY created_at ASC
    `, [userId])

    // Get milestone messages for future-focused training
    const milestones = await query(`
      SELECT 
        id,
        milestone_type,
        recipient_name,
        message_title,
        message_content,
        trigger_date,
        trigger_age,
        emotional_tone,
        created_at,
        u.name as user_name,
        u.primary_role
      FROM milestone_messages mm
      JOIN users u ON mm.user_id = u.id
      WHERE 
        ($1::uuid IS NULL OR mm.user_id = $1)
        AND LENGTH(message_content) > 50
        AND is_private = false
      ORDER BY created_at ASC
    `, [userId])

    // Format all data sources into comprehensive training examples
    const responseExamples: TrainingExample[] = responses.rows.map(row => {
      const context = buildEnhancedContext(row)
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
          importantPeople: parseImportantPeople(row.important_people),
          dataSource: 'response'
        }
      }
    })

    // Format life entries as conversational training examples
    const lifeEntryExamples: TrainingExample[] = lifeEntries.rows.map(row => {
      const instruction = generateLifeEntryInstruction(row)
      const context = buildEnhancedContext(row)
      return {
        instruction,
        input: context,
        output: row.content,
        metadata: {
          userId: row.user_id || userId,
          timestamp: row.created_at,
          questionCategory: row.category || 'life_story',
          responseWordCount: row.content.split(' ').length,
          emotionalTone: detectEmotionalTone(row.content),
          importantPeople: row.related_people || [],
          dataSource: 'life_entry'
        }
      }
    })

    // Format milestone messages as legacy-focused training examples
    const milestoneExamples: TrainingExample[] = milestones.rows.map(row => {
      const instruction = generateMilestoneInstruction(row)
      const context = buildMilestoneContext(row)
      return {
        instruction,
        input: context,
        output: row.message_content,
        metadata: {
          userId: row.user_id || userId,
          timestamp: row.created_at,
          questionCategory: 'milestone_message',
          responseWordCount: row.message_content.split(' ').length,
          emotionalTone: row.emotional_tone || detectEmotionalTone(row.message_content),
          importantPeople: row.recipient_name ? [row.recipient_name] : [],
          dataSource: 'milestone'
        }
      }
    })

    // Combine all training examples
    const trainingExamples = [...responseExamples, ...lifeEntryExamples, ...milestoneExamples]

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

function buildEnhancedContext(row: any): string {
  const contexts = []
  
  if (row.primary_role) {
    contexts.push(`You are a ${row.primary_role}`)
  }
  
  // Add cultural background if available
  if (row.cultural_background && Array.isArray(row.cultural_background)) {
    contexts.push(`with ${row.cultural_background.join(' and ')} heritage`)
  }
  
  // Add important relationships
  const importantPeople = parseImportantPeople(row.important_people)
  if (importantPeople.length > 0) {
    contexts.push(`speaking about your relationships with ${importantPeople.slice(0, 3).join(', ')}`)
  }
  
  // Add context about sharing legacy
  contexts.push('sharing your wisdom, memories, and life experiences for future generations')
  
  return contexts.join(', ') + '.'
}

function buildMilestoneContext(row: any): string {
  const contexts = []
  
  if (row.primary_role) {
    contexts.push(`You are a ${row.primary_role}`)
  }
  
  if (row.recipient_name) {
    contexts.push(`writing a heartfelt message to ${row.recipient_name}`)
  }
  
  if (row.milestone_type) {
    contexts.push(`for their ${row.milestone_type.replace('_', ' ')}`)
  }
  
  if (row.emotional_tone) {
    contexts.push(`with a ${row.emotional_tone} tone`)
  }
  
  contexts.push('sharing your love, wisdom, and hopes for their future')
  
  return contexts.join(', ') + '.'
}

function generateLifeEntryInstruction(row: any): string {
  const instructions = [
    `Tell me about ${row.title.toLowerCase()}`,
    `Share your memories about ${row.title.toLowerCase()}`,
    `What can you tell me about ${row.title.toLowerCase()}?`,
    `Describe your experience with ${row.title.toLowerCase()}`,
    `What was significant about ${row.title.toLowerCase()}?`
  ]
  
  return instructions[Math.floor(Math.random() * instructions.length)]
}

function generateMilestoneInstruction(row: any): string {
  const milestoneType = row.milestone_type || 'milestone'
  const recipient = row.recipient_name || 'your loved one'
  
  const instructions = [
    `Write a ${milestoneType.replace('_', ' ')} message for ${recipient}`,
    `Share your thoughts for ${recipient}'s ${milestoneType.replace('_', ' ')}`,
    `What would you want to say to ${recipient} on their ${milestoneType.replace('_', ' ')}?`,
    `Create a meaningful message for ${recipient}'s ${milestoneType.replace('_', ' ')}`,
    `Express your feelings about ${recipient}'s ${milestoneType.replace('_', ' ')}`
  ]
  
  return instructions[Math.floor(Math.random() * instructions.length)]
}

function parseImportantPeople(importantPeopleJson: string): string[] {
  try {
    if (importantPeopleJson) {
      const parsed = JSON.parse(importantPeopleJson)
      return parsed.map((p: any) => p.name).filter(Boolean)
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return []
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