import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { db } from '@/lib/db'
import { AIQuestionEnhancer, UserContext, ResponseAnalysis } from '@/lib/ai-question-enhancer'

// GET /api/questions/enhanced - Get AI-enhanced questions based on user's response history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const count = parseInt(searchParams.get('count') || '5')
    const enhancementType = searchParams.get('type') || 'contextual' // 'contextual' or 'followup'
    const lastQuestionId = searchParams.get('lastQuestionId')

    // Get user and their profile
    const userResult = await db.query(`
      SELECT 
        id,
        name,
        birthday,
        primary_role,
        secondary_roles,
        children_ages,
        important_people,
        cultural_background
      FROM users 
      WHERE email = $1
    `, [session.user.email])

    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult.rows[0]

    // Get user's response history for analysis
    const responseHistory = await db.query(`
      SELECT 
        r.id,
        r.question_id,
        q.question_text,
        r.response_text,
        char_length(r.response_text) as word_count,
        r.created_at,
        r.answerer_role,
        r.emotional_state
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [user.id])

    // Analyze responses to build user context
    const responseAnalyses: ResponseAnalysis[] = responseHistory.rows.map(row => ({
      questionId: row.question_id,
      questionText: row.question_text,
      responseText: row.response_text,
      wordCount: row.word_count,
      emotionalTone: analyzeEmotionalTone(row.response_text),
      keyThemes: extractKeyThemes(row.response_text),
      mentionedPeople: extractMentionedPeople(row.response_text),
      temporalContext: analyzeTemporalContext(row.response_text),
      responseDepth: analyzeResponseDepth(row.response_text, row.word_count)
    }))

    // Build user context
    const userContext: UserContext = {
      userId: user.id,
      role: user.primary_role || 'parent',
      responseHistory: responseAnalyses,
      emotionalProfile: {
        dominantEmotions: [],
        emotionalRange: 'moderate',
        vulnerabilityLevel: 'selective',
        expressionStyle: 'direct',
        processingStyle: 'balanced'
      },
      relationshipDynamics: {
        primaryRelationships: [],
        familyStructure: 'nuclear',
        conflictPatterns: [],
        supportSystems: []
      },
      culturalContext: {
        culturalBackground: user.cultural_background || [],
        valueSystem: [],
        generationalPerspective: 'modern',
        languagePatterns: []
      },
      lifeStage: {
        currentPhase: determineLifeStage(user.children_ages, user.birthday),
        majorTransitions: [],
        currentChallenges: [],
        futureAnticipations: []
      }
    }

    // Create enhancer and generate questions
    const enhancer = new AIQuestionEnhancer(userContext, process.env.OPENAI_API_KEY)
    
    // Update emotional profile based on response analysis
    userContext.emotionalProfile = enhancer.analyzeResponsePatterns()

    let questions: string[] = []

    if (enhancementType === 'followup' && lastQuestionId) {
      // Generate follow-up questions based on last response
      const lastResponse = responseAnalyses.find(r => r.questionId === lastQuestionId)
      if (lastResponse) {
        questions = await enhancer.generateFollowUpQuestion(lastResponse, 'parental_wisdom')
      }
    } else {
      // Generate contextual questions based on overall pattern
      questions = enhancer.generateContextualQuestions(count)
    }

    // If no enhanced questions generated, fall back to templates
    if (questions.length === 0) {
      questions = getFallbackQuestions(userContext, count)
    }

    // Get emotional themes analysis
    const themeAnalysis = responseAnalyses.length > 3 ? 
      analyzeEmotionalThemes(responseAnalyses) : null

    return NextResponse.json({
      questions: questions.map((q, index) => ({
        id: `enhanced_${Date.now()}_${index}`,
        question_text: q,
        category: 'enhanced',
        emotional_depth: 7,
        source: 'ai_enhanced'
      })),
      userInsights: {
        emotionalProfile: userContext.emotionalProfile,
        responseCount: responseAnalyses.length,
        themeAnalysis,
        enhancementType
      }
    })

  } catch (error) {
    console.error('Error generating enhanced questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate enhanced questions' },
      { status: 500 }
    )
  }
}

// POST /api/questions/enhanced/analyze - Analyze a specific response for insights
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { responseText, questionText } = body

    // Analyze the response
    const analysis: ResponseAnalysis = {
      questionId: 'temp',
      questionText,
      responseText,
      wordCount: responseText.length,
      emotionalTone: analyzeEmotionalTone(responseText),
      keyThemes: extractKeyThemes(responseText),
      mentionedPeople: extractMentionedPeople(responseText),
      temporalContext: analyzeTemporalContext(responseText),
      responseDepth: analyzeResponseDepth(responseText, responseText.length)
    }

    // Generate follow-up question suggestions
    const followUpSuggestions = generateImmediateFollowUps(analysis)

    return NextResponse.json({
      analysis,
      followUpSuggestions,
      insights: {
        emotionalResonance: analysis.responseDepth > 3 ? 'high' : 'moderate',
        thematicRichness: analysis.keyThemes.length > 2 ? 'rich' : 'focused',
        personalConnection: analysis.mentionedPeople.length > 0 ? 'personal' : 'general'
      }
    })

  } catch (error) {
    console.error('Error analyzing response:', error)
    return NextResponse.json(
      { error: 'Failed to analyze response' },
      { status: 500 }
    )
  }
}

// Helper functions for response analysis
function analyzeEmotionalTone(text: string): ResponseAnalysis['emotionalTone'] {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('love') || lowerText.includes('adore') || lowerText.includes('cherish')) {
    return 'loving'
  }
  if (lowerText.includes('proud') || lowerText.includes('accomplished')) {
    return 'proud'
  }
  if (lowerText.includes('worry') || lowerText.includes('afraid') || lowerText.includes('scared')) {
    return 'fearful'
  }
  if (lowerText.includes('grateful') || lowerText.includes('thankful') || lowerText.includes('blessed')) {
    return 'grateful'
  }
  if (lowerText.includes('sad') || lowerText.includes('miss') || lowerText.includes('lost')) {
    return 'melancholic'
  }
  if (lowerText.includes('peace') || lowerText.includes('calm') || lowerText.includes('content')) {
    return 'peaceful'
  }
  if (lowerText.includes('hope') || lowerText.includes('future') || lowerText.includes('dream')) {
    return 'hopeful'
  }
  if (lowerText.includes('joy') || lowerText.includes('happy') || lowerText.includes('delight')) {
    return 'joyful'
  }
  
  return 'peaceful' // default
}

function extractKeyThemes(text: string): string[] {
  const themes: string[] = []
  const lowerText = text.toLowerCase()
  
  const themePatterns = {
    'family': ['family', 'children', 'parents', 'siblings'],
    'love': ['love', 'affection', 'care', 'devotion'],
    'growth': ['learn', 'grow', 'develop', 'change'],
    'wisdom': ['wisdom', 'lesson', 'understanding', 'insight'],
    'challenge': ['difficult', 'hard', 'struggle', 'challenge'],
    'memory': ['remember', 'memory', 'recall', 'nostalgia'],
    'faith': ['faith', 'believe', 'God', 'spiritual'],
    'regret': ['regret', 'wish', 'sorry', 'mistake'],
    'hope': ['hope', 'future', 'dream', 'aspire'],
    'tradition': ['tradition', 'custom', 'ritual', 'heritage']
  }
  
  Object.entries(themePatterns).forEach(([theme, keywords]) => {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      themes.push(theme)
    }
  })
  
  return themes
}

function extractMentionedPeople(text: string): string[] {
  const people: string[] = []
  
  // Common relationship terms
  const relationships = [
    'my wife', 'my husband', 'my mother', 'my father', 'my son', 'my daughter',
    'my children', 'my kids', 'my family', 'my parents', 'my siblings',
    'my brother', 'my sister', 'my grandmother', 'my grandfather'
  ]
  
  relationships.forEach(rel => {
    if (text.toLowerCase().includes(rel)) {
      people.push(rel.replace('my ', ''))
    }
  })
  
  // Look for proper names (capitalized words that aren't at sentence start)
  const words = text.split(' ')
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:]/, '')
    if (word.length > 2 && word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) {
      people.push(word)
    }
  }
  
  return [...new Set(people)] // Remove duplicates
}

function analyzeTemporalContext(text: string): 'past' | 'present' | 'future' {
  const lowerText = text.toLowerCase()
  
  const pastIndicators = ['was', 'were', 'used to', 'remember', 'back then', 'years ago']
  const futureIndicators = ['will', 'hope', 'dream', 'want', 'plan', 'someday']
  const presentIndicators = ['am', 'is', 'are', 'now', 'currently', 'today']
  
  const pastCount = pastIndicators.filter(ind => lowerText.includes(ind)).length
  const futureCount = futureIndicators.filter(ind => lowerText.includes(ind)).length
  const presentCount = presentIndicators.filter(ind => lowerText.includes(ind)).length
  
  if (pastCount > futureCount && pastCount > presentCount) return 'past'
  if (futureCount > pastCount && futureCount > presentCount) return 'future'
  return 'present'
}

function analyzeResponseDepth(text: string, wordCount: number): 1 | 2 | 3 | 4 | 5 {
  let depth = 1
  
  // Length factor
  if (wordCount > 50) depth++
  if (wordCount > 150) depth++
  
  // Emotional indicators
  const emotionalWords = ['feel', 'heart', 'soul', 'deeply', 'profoundly']
  if (emotionalWords.some(word => text.toLowerCase().includes(word))) depth++
  
  // Vulnerability indicators
  const vulnerabilityWords = ['scared', 'afraid', 'worried', 'struggle', 'difficult']
  if (vulnerabilityWords.some(word => text.toLowerCase().includes(word))) depth++
  
  return Math.min(depth, 5) as 1 | 2 | 3 | 4 | 5
}

function determineLifeStage(childrenAges?: number[], birthday?: string): UserContext['lifeStage']['currentPhase'] {
  let userAge = 30 // default age if no birthday provided
  
  if (birthday) {
    const birthDate = new Date(birthday)
    const today = new Date()
    userAge = today.getFullYear() - birthDate.getFullYear()
  }
  
  if (!childrenAges || childrenAges.length === 0) {
    if (userAge < 25) return 'young_adult'
    if (userAge < 40) return 'establishing'
    if (userAge < 55) return 'midlife'
    if (userAge < 70) return 'mature'
    return 'elder'
  }
  
  const maxAge = Math.max(...childrenAges)
  const minAge = Math.min(...childrenAges)
  
  if (maxAge < 18) return 'establishing'
  if (minAge < 18) return 'midlife'
  if (maxAge < 30) return 'mature'
  return 'elder'
}

function getFallbackQuestions(userContext: UserContext, count: number): string[] {
  const fallbacks = [
    "What moment from this week captured something meaningful about your family?",
    "What hope do you carry for your children that you haven't expressed yet?",
    "What tradition or memory would you want preserved if everything else was forgotten?",
    "How has your understanding of love evolved through your relationships?",
    "What would you want your family to know about finding joy during difficult times?"
  ]
  
  return fallbacks.slice(0, count)
}

function generateImmediateFollowUps(analysis: ResponseAnalysis): string[] {
  const suggestions: string[] = []
  
  if (analysis.mentionedPeople.length > 0) {
    suggestions.push(`Tell me more about your relationship with ${analysis.mentionedPeople[0]}.`)
  }
  
  if (analysis.keyThemes.includes('challenge')) {
    suggestions.push("How did that experience shape who you became?")
  }
  
  if (analysis.keyThemes.includes('love')) {
    suggestions.push("What does that love feel like from your perspective?")
  }
  
  if (analysis.responseDepth >= 4) {
    suggestions.push("What would you want your family to learn from this experience?")
  }
  
  return suggestions.slice(0, 3)
}

// Import the analysis function
import { analyzeEmotionalThemes } from '@/lib/ai-question-enhancer'