import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { TrainingExample } from '@/lib/ai-training-config'

/**
 * Advanced Data Collection API for LLM Training
 * Processes user responses, life stories, and milestones for training
 * Implements comprehensive data formatting and quality validation
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, includeLifeStories = true, includeMilestones = true, minWordCount = 20 } = body
    
    // Use session user if no userId provided
    const targetUserId = userId || await getUserIdByEmail(session.user.email)
    
    console.log(`Collecting training data for user: ${targetUserId}`)

    // Get comprehensive user profile for context
    const userProfile = await getUserProfile(targetUserId)
    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Collect training data from multiple sources
    const trainingData = await collectComprehensiveTrainingData(
      targetUserId, 
      includeLifeStories, 
      includeMilestones, 
      minWordCount
    )

    // Validate and enhance training data
    const enhancedData = await enhanceTrainingData(trainingData, userProfile)
    
    // Calculate data quality metrics
    const qualityMetrics = calculateDataQuality(enhancedData)
    
    // Store processed training data for training job
    await storeTrainingDataset(targetUserId, enhancedData, qualityMetrics)
    
    // Calculate training readiness
    const readinessAssessment = assessTrainingReadiness(enhancedData, qualityMetrics)
    
    return NextResponse.json({
      success: true,
      dataCollected: {
        totalExamples: enhancedData.length,
        totalWords: enhancedData.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0),
        sources: {
          responses: enhancedData.filter(ex => ex.metadata.dataSource === 'response').length,
          lifeStories: enhancedData.filter(ex => ex.metadata.dataSource === 'life_entry').length,
          milestones: enhancedData.filter(ex => ex.metadata.dataSource === 'milestone').length
        },
        categories: [...new Set(enhancedData.map(ex => ex.metadata.questionCategory))].length,
        emotionalRange: calculateEmotionalRange(enhancedData)
      },
      qualityMetrics,
      readinessAssessment,
      trainingRecommendations: getTrainingRecommendations(enhancedData, qualityMetrics)
    })

  } catch (error: any) {
    console.error('Data collection error:', error)
    return NextResponse.json(
      { 
        error: 'Data collection failed',
        message: error?.message || 'Unknown error occurred during data collection'
      },
      { status: 500 }
    )
  }
}

/**
 * Get training data collection status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = await getUserIdByEmail(session.user.email)
    const searchParams = request.nextUrl.searchParams
    const detailed = searchParams.get('detailed') === 'true'

    // Get current data availability
    const dataAvailability = await getDataAvailability(userId)
    
    // Get last training dataset if exists
    const lastDataset = await getLastTrainingDataset(userId)
    
    const response: any = {
      success: true,
      userId,
      dataAvailability,
      trainingReady: dataAvailability.totalResponses >= 50 && dataAvailability.uniqueCategories >= 5,
      lastCollection: lastDataset?.created_at || null,
      recommendations: []
    }

    if (dataAvailability.totalResponses < 50) {
      response.recommendations.push(`Need ${50 - dataAvailability.totalResponses} more responses`)
    }
    if (dataAvailability.uniqueCategories < 5) {
      response.recommendations.push(`Answer questions from ${5 - dataAvailability.uniqueCategories} more categories`)
    }
    if (dataAvailability.totalWords < 5000) {
      response.recommendations.push(`Need ${5000 - dataAvailability.totalWords} more words of content`)
    }

    if (detailed && lastDataset) {
      response.lastDataset = {
        examples: lastDataset.training_examples_count,
        qualityScore: lastDataset.quality_metrics?.overall_score || 0,
        emotionalRange: lastDataset.quality_metrics?.emotional_diversity || 0,
        categories: lastDataset.quality_metrics?.category_coverage || 0
      }
    }

    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('Data status check error:', error)
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    )
  }
}

// Helper Functions

async function getUserIdByEmail(email: string): Promise<number> {
  const result = await query('SELECT id FROM users WHERE email = $1', [email])
  if (result.rows.length === 0) {
    throw new Error('User not found')
  }
  return result.rows[0].id
}

async function getUserProfile(userId: number) {
  const result = await query(`
    SELECT 
      u.id, u.name, u.email, u.primary_role, u.important_people, 
      u.cultural_background, u.significant_events,
      ur.family_members, ur.interests, ur.life_stage
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE u.id = $1
  `, [userId])
  
  return result.rows[0] || null
}

async function collectComprehensiveTrainingData(
  userId: number, 
  includeLifeStories: boolean, 
  includeMilestones: boolean, 
  minWordCount: number
): Promise<TrainingExample[]> {
  const trainingExamples: TrainingExample[] = []
  
  // Collect user responses
  const responses = await query(`
    SELECT 
      r.id, r.response_text, r.word_count, r.created_at,
      q.question_text, q.category, q.subcategory, q.role_preference,
      u.name as user_name, u.primary_role, u.important_people
    FROM responses r
    JOIN questions q ON r.question_id = q.id
    JOIN users u ON r.user_id = u.id
    WHERE 
      r.user_id = $1
      AND r.word_count >= $2
      AND r.response_text IS NOT NULL
      AND LENGTH(r.response_text) > 50
      AND r.is_draft = false
    ORDER BY r.created_at ASC
  `, [userId, minWordCount])

  // Format responses as training examples
  for (const row of responses.rows) {
    const context = buildRichContext(row, 'response')
    trainingExamples.push({
      instruction: row.question_text,
      input: context,
      output: row.response_text,
      metadata: {
        userId: row.user_id,
        timestamp: new Date(row.created_at),
        questionCategory: row.category,
        subcategory: row.subcategory,
        rolePreference: row.role_preference,
        responseWordCount: row.word_count,
        emotionalTone: detectEmotionalTone(row.response_text),
        importantPeople: parseImportantPeople(row.important_people),
        dataSource: 'response',
        qualityScore: calculateResponseQuality(row.response_text)
      }
    })
  }

  // Collect life detail entries if requested
  if (includeLifeStories) {
    const lifeEntries = await query(`
      SELECT 
        lde.id, lde.title, lde.content, lde.category, lde.tags,
        lde.related_people, lde.emotional_depth, lde.created_at,
        u.name as user_name, u.primary_role
      FROM life_detail_entries lde
      JOIN users u ON lde.user_id = u.id
      WHERE 
        lde.user_id = $1
        AND LENGTH(lde.content) > 100
        AND lde.is_private = false
      ORDER BY lde.created_at ASC
    `, [userId])

    for (const row of lifeEntries.rows) {
      const instruction = generateLifeStoryInstruction(row)
      const context = buildRichContext(row, 'life_entry')
      trainingExamples.push({
        instruction,
        input: context,
        output: row.content,
        metadata: {
          userId,
          timestamp: new Date(row.created_at),
          questionCategory: row.category || 'life_story',
          subcategory: 'personal_memory',
          responseWordCount: row.content.split(' ').length,
          emotionalTone: detectEmotionalTone(row.content),
          emotionalDepth: row.emotional_depth || 5,
          importantPeople: row.related_people || [],
          dataSource: 'life_entry',
          qualityScore: calculateResponseQuality(row.content)
        }
      })
    }
  }

  // Collect milestone messages if requested
  if (includeMilestones) {
    const milestones = await query(`
      SELECT 
        mm.id, mm.milestone_type, mm.recipient_name, mm.message_title,
        mm.message_content, mm.trigger_date, mm.trigger_age, mm.emotional_tone,
        mm.created_at, u.name as user_name, u.primary_role
      FROM milestone_messages mm
      JOIN users u ON mm.user_id = u.id
      WHERE 
        mm.user_id = $1
        AND LENGTH(mm.message_content) > 50
        AND mm.is_private = false
      ORDER BY mm.created_at ASC
    `, [userId])

    for (const row of milestones.rows) {
      const instruction = generateMilestoneInstruction(row)
      const context = buildRichContext(row, 'milestone')
      trainingExamples.push({
        instruction,
        input: context,
        output: row.message_content,
        metadata: {
          userId,
          timestamp: new Date(row.created_at),
          questionCategory: 'milestone_message',
          subcategory: row.milestone_type,
          responseWordCount: row.message_content.split(' ').length,
          emotionalTone: row.emotional_tone || detectEmotionalTone(row.message_content),
          importantPeople: row.recipient_name ? [row.recipient_name] : [],
          dataSource: 'milestone',
          qualityScore: calculateResponseQuality(row.message_content)
        }
      })
    }
  }

  return trainingExamples
}

function buildRichContext(row: any, dataSource: string): string {
  const contexts = []
  
  if (row.primary_role) {
    contexts.push(`You are a ${row.primary_role}`)
  }
  
  // Add cultural context if available
  if (row.cultural_background && Array.isArray(row.cultural_background)) {
    contexts.push(`with ${row.cultural_background.join(' and ')} heritage`)
  }
  
  // Add relationship context
  const importantPeople = parseImportantPeople(row.important_people)
  if (importantPeople.length > 0) {
    contexts.push(`speaking about your relationships with ${importantPeople.slice(0, 3).join(', ')}`)
  }
  
  // Add data source specific context
  switch (dataSource) {
    case 'response':
      contexts.push('answering a personal question to preserve your wisdom and experiences')
      break
    case 'life_entry':
      contexts.push('sharing a detailed personal memory or life experience')
      break
    case 'milestone':
      if (row.recipient_name) {
        contexts.push(`writing a heartfelt message to ${row.recipient_name}`)
      }
      contexts.push('expressing your love, hopes, and wisdom for future generations')
      break
  }
  
  return contexts.join(', ') + '.'
}

function generateLifeStoryInstruction(row: any): string {
  const variations = [
    `Tell me about ${row.title}`,
    `Share your experience with ${row.title}`,
    `What can you tell me about ${row.title}?`,
    `Describe your memories of ${row.title}`,
    `What was significant about ${row.title}?`,
    `Help me understand ${row.title} from your perspective`
  ]
  
  return variations[Math.floor(Math.random() * variations.length)]
}

function generateMilestoneInstruction(row: any): string {
  const milestoneType = row.milestone_type?.replace('_', ' ') || 'milestone'
  const recipient = row.recipient_name || 'your loved one'
  
  const variations = [
    `Write a ${milestoneType} message for ${recipient}`,
    `Share your thoughts for ${recipient}'s ${milestoneType}`,
    `What would you want to say to ${recipient} on their ${milestoneType}?`,
    `Create a meaningful message for ${recipient}'s ${milestoneType}`,
    `Express your feelings about ${recipient}'s ${milestoneType}`
  ]
  
  return variations[Math.floor(Math.random() * variations.length)]
}

function detectEmotionalTone(text: string): string {
  const lowerText = text.toLowerCase()
  
  // Enhanced emotional detection
  const emotions = {
    joyful: ['love', 'joy', 'happy', 'excited', 'wonderful', 'amazing', 'beautiful', 'blessed'],
    proud: ['proud', 'accomplish', 'achieve', 'success', 'triumph', 'victory', 'honor'],
    nostalgic: ['miss', 'remember', 'used to', 'back then', 'those days', 'memories'],
    wise: ['advice', 'learn', 'important', 'understand', 'wisdom', 'experience', 'lesson'],
    reflective: ['think', 'realize', 'understand', 'consider', 'ponder', 'reflect'],
    loving: ['care', 'cherish', 'adore', 'treasure', 'devotion', 'affection'],
    hopeful: ['hope', 'dream', 'future', 'aspire', 'wish', 'believe'],
    grateful: ['thank', 'grateful', 'appreciate', 'blessed', 'fortunate']
  }
  
  let maxScore = 0
  let dominantEmotion = 'neutral'
  
  for (const [emotion, keywords] of Object.entries(emotions)) {
    const score = keywords.reduce((sum, keyword) => {
      return sum + (lowerText.split(keyword).length - 1)
    }, 0)
    
    if (score > maxScore) {
      maxScore = score
      dominantEmotion = emotion
    }
  }
  
  return dominantEmotion
}

function parseImportantPeople(importantPeopleJson: string | any[]): string[] {
  try {
    if (Array.isArray(importantPeopleJson)) {
      return importantPeopleJson
    }
    if (typeof importantPeopleJson === 'string') {
      const parsed = JSON.parse(importantPeopleJson)
      return Array.isArray(parsed) ? parsed.map((p: any) => p.name || p).filter(Boolean) : []
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return []
}

function calculateResponseQuality(text: string): number {
  let score = 0
  
  // Length factor (0-30 points)
  const wordCount = text.split(' ').length
  score += Math.min(30, wordCount / 2)
  
  // Sentence structure (0-20 points)
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0)
  score += Math.min(20, sentences.length * 2)
  
  // Emotional depth (0-25 points)
  const emotionalWords = ['feel', 'love', 'remember', 'important', 'special', 'meaningful']
  const emotionalScore = emotionalWords.reduce((sum, word) => {
    return sum + (text.toLowerCase().includes(word) ? 1 : 0)
  }, 0)
  score += Math.min(25, emotionalScore * 4)
  
  // Personal details (0-25 points)
  const personalIndicators = ['i ', 'my ', 'me ', 'when i', 'i was', 'i remember']
  const personalScore = personalIndicators.reduce((sum, indicator) => {
    return sum + (text.toLowerCase().includes(indicator) ? 1 : 0)
  }, 0)
  score += Math.min(25, personalScore * 4)
  
  return Math.min(100, score)
}

async function enhanceTrainingData(trainingData: TrainingExample[], userProfile: any): Promise<TrainingExample[]> {
  // Add user profile context to all examples
  return trainingData.map(example => ({
    ...example,
    input: enhanceContextWithProfile(example.input, userProfile),
    metadata: {
      ...example.metadata,
      userProfile: {
        name: userProfile.name,
        role: userProfile.primary_role,
        lifeStage: userProfile.life_stage
      }
    }
  }))
}

function enhanceContextWithProfile(context: string, userProfile: any): string {
  let enhancedContext = context
  
  // Add life stage context
  if (userProfile.life_stage) {
    enhancedContext = enhancedContext.replace(
      'You are a',
      `You are a ${userProfile.life_stage}`
    )
  }
  
  // Add family context
  if (userProfile.family_members && Array.isArray(userProfile.family_members)) {
    const familyContext = userProfile.family_members.slice(0, 2).join(' and ')
    if (familyContext) {
      enhancedContext += ` Your family includes ${familyContext}.`
    }
  }
  
  return enhancedContext
}

function calculateDataQuality(trainingData: TrainingExample[]) {
  const totalExamples = trainingData.length
  const totalWords = trainingData.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0)
  const averageQuality = trainingData.reduce((sum, ex) => sum + (ex.metadata.qualityScore || 0), 0) / totalExamples
  
  const categories = new Set(trainingData.map(ex => ex.metadata.questionCategory)).size
  const emotions = new Set(trainingData.map(ex => ex.metadata.emotionalTone)).size
  
  return {
    overall_score: Math.round(averageQuality),
    category_coverage: categories,
    emotional_diversity: emotions,
    average_length: Math.round(totalWords / totalExamples),
    data_sources: {
      responses: trainingData.filter(ex => ex.metadata.dataSource === 'response').length,
      life_stories: trainingData.filter(ex => ex.metadata.dataSource === 'life_entry').length,
      milestones: trainingData.filter(ex => ex.metadata.dataSource === 'milestone').length
    }
  }
}

function calculateEmotionalRange(trainingData: TrainingExample[]) {
  const emotions = trainingData.reduce((acc, ex) => {
    const tone = ex.metadata.emotionalTone || 'neutral'
    acc[tone] = (acc[tone] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return emotions
}

function assessTrainingReadiness(trainingData: TrainingExample[], qualityMetrics: any) {
  const readiness = {
    ready: false,
    score: 0,
    requirements: {
      minimumExamples: { required: 50, current: trainingData.length, met: trainingData.length >= 50 },
      minimumWords: { required: 5000, current: trainingData.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0), met: false },
      minimumCategories: { required: 5, current: qualityMetrics.category_coverage, met: qualityMetrics.category_coverage >= 5 },
      minimumQuality: { required: 60, current: qualityMetrics.overall_score, met: qualityMetrics.overall_score >= 60 },
      emotionalDiversity: { required: 4, current: qualityMetrics.emotional_diversity, met: qualityMetrics.emotional_diversity >= 4 }
    }
  }
  
  readiness.requirements.minimumWords.met = readiness.requirements.minimumWords.current >= 5000
  
  // Calculate readiness score
  const metRequirements = Object.values(readiness.requirements).filter(req => req.met).length
  readiness.score = Math.round((metRequirements / Object.keys(readiness.requirements).length) * 100)
  readiness.ready = readiness.score >= 80 // 4 out of 5 requirements
  
  return readiness
}

function getTrainingRecommendations(trainingData: TrainingExample[], qualityMetrics: any): string[] {
  const recommendations = []
  
  if (trainingData.length < 50) {
    recommendations.push(`Answer ${50 - trainingData.length} more questions to reach minimum training data`)
  }
  
  if (qualityMetrics.category_coverage < 5) {
    recommendations.push(`Explore ${5 - qualityMetrics.category_coverage} more question categories for better model diversity`)
  }
  
  if (qualityMetrics.overall_score < 60) {
    recommendations.push('Provide more detailed, personal responses to improve training quality')
  }
  
  if (qualityMetrics.emotional_diversity < 4) {
    recommendations.push('Share experiences with more varied emotional tones')
  }
  
  const totalWords = trainingData.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0)
  if (totalWords < 5000) {
    recommendations.push(`Add ${5000 - totalWords} more words of content for comprehensive training`)
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Excellent! Your data is ready for high-quality AI training.')
  }
  
  return recommendations
}

async function storeTrainingDataset(userId: number, trainingData: TrainingExample[], qualityMetrics: any) {
  // Store the processed dataset for training jobs
  await query(`
    INSERT INTO training_datasets (user_id, training_examples, training_examples_count, quality_metrics, created_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      training_examples = $2,
      training_examples_count = $3,
      quality_metrics = $4,
      updated_at = CURRENT_TIMESTAMP
  `, [
    userId,
    JSON.stringify(trainingData),
    trainingData.length,
    JSON.stringify(qualityMetrics)
  ])
}

async function getDataAvailability(userId: number) {
  const result = await query(`
    SELECT 
      COUNT(r.id) as total_responses,
      COUNT(DISTINCT q.category) as unique_categories,
      COALESCE(SUM(r.word_count), 0) as total_words,
      COUNT(lde.id) as life_stories,
      COUNT(mm.id) as milestones
    FROM users u
    LEFT JOIN responses r ON u.id = r.user_id AND r.word_count >= 20 AND r.is_draft = false
    LEFT JOIN questions q ON r.question_id = q.id
    LEFT JOIN life_detail_entries lde ON u.id = lde.user_id AND LENGTH(lde.content) > 100
    LEFT JOIN milestone_messages mm ON u.id = mm.user_id AND LENGTH(mm.message_content) > 50
    WHERE u.id = $1
    GROUP BY u.id
  `, [userId])
  
  return result.rows[0] || {
    total_responses: 0,
    unique_categories: 0,
    total_words: 0,
    life_stories: 0,
    milestones: 0
  }
}

async function getLastTrainingDataset(userId: number) {
  const result = await query(`
    SELECT training_examples_count, quality_metrics, created_at
    FROM training_datasets
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId])
  
  return result.rows[0] || null
}