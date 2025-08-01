import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { mistralInferenceEngine } from '@/lib/mistral-inference-engine'

/**
 * Enhanced AI Echo Chat API
 * 
 * This endpoint connects with trained models and provides intelligent fallbacks.
 * It first attempts to use trained Mistral 7B models, then falls back to response synthesis.
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, isDemo = false, conversationId, familyContext } = body

    // Get user ID
    const userResult = await query(
      'SELECT id, name, primary_role FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = userResult.rows[0]

    // Check for available trained models
    const availableModels = await query(`
      SELECT 
        mv.id as model_id,
        mv.version,
        mv.checkpoint_path,
        mv.performance,
        mv.is_active,
        mv.trained_at,
        mv.base_model,
        md.deployment_name,
        md.endpoint_url,
        md.status as deployment_status,
        md.health_status
      FROM model_versions mv
      LEFT JOIN model_deployments md ON mv.user_id = md.user_id
      WHERE mv.user_id = $1 AND mv.status = 'completed'
      ORDER BY mv.is_active DESC, mv.version DESC, mv.trained_at DESC
      LIMIT 5
    `, [user.id])

    // Get user's responses for context
    const responses = await query(`
      SELECT 
        r.response_text,
        q.question_text,
        q.category,
        r.word_count,
        r.created_at
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [user.id])

    // Get additional context from life entries and milestones
    const additionalContext = await query(`
      SELECT 
        'life_entry' as type,
        title,
        content as text,
        category,
        created_at
      FROM life_entries 
      WHERE user_id = $1
      UNION ALL
      SELECT 
        'milestone' as type,
        message_title as title,
        message_content as text,
        milestone_type as category,
        created_at
      FROM milestone_messages
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [user.id])

    // Build enhanced persona context with family member info
    const personaContext = buildEnhancedPersonaContext(
      user, 
      responses.rows, 
      additionalContext.rows,
      familyContext
    )
    
    // Try to use the deployed Mistral model first, fall back to synthesis if unavailable
    const aiResponse = await generateEchoResponse(
      message, 
      personaContext, 
      responses.rows, 
      isDemo, 
      user.id,
      availableModels.rows,
      conversationId
    )

    // Log the conversation (for training data and analytics)
    if (!isDemo) {
      await query(`
        INSERT INTO ai_conversations (
          user_id, 
          user_message, 
          ai_response, 
          conversation_id,
          model_version,
          response_source,
          confidence_score,
          emotional_tone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        user.id,
        message,
        aiResponse.response,
        conversationId || generateConversationId(),
        aiResponse.modelVersion || 'synthesis',
        aiResponse.source || 'enhanced_synthesis',
        aiResponse.confidence || 0.8,
        detectMessageEmotion(aiResponse.response)
      ])
    }

    return NextResponse.json({
      response: aiResponse.response,
      confidence: aiResponse.confidence,
      source: aiResponse.source,
      modelVersion: aiResponse.modelVersion,
      trainingData: {
        responsesUsed: responses.rows.length,
        categoriesCovered: new Set(responses.rows.map(r => r.category)).size,
        totalWords: responses.rows.reduce((sum, r) => sum + r.word_count, 0),
        additionalContext: additionalContext.rows.length
      },
      modelInfo: {
        availableModels: availableModels.rows.length,
        activeModel: aiResponse.activeModel || null,
        deploymentStatus: aiResponse.deploymentStatus || 'not_deployed',
        modelCapabilities: aiResponse.modelCapabilities || []
      }
    })

  } catch (error) {
    console.error('AI Echo chat error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}

function buildEnhancedPersonaContext(user: any, responses: any[], additionalContext: any[], familyContext?: any): string {
  let personName = user.name
  let personRole = user.primary_role
  
  // Override with family member context if provided
  if (familyContext?.name) {
    personName = familyContext.name
    personRole = familyContext.relationship || user.primary_role
  }
  
  const context = [`You are ${personName}, speaking as their AI echo.`]
  
  if (personRole) {
    context.push(`You are a ${personRole}.`)
  }
  
  // Add family member specific traits
  if (familyContext?.traits && familyContext.traits.length > 0) {
    context.push(`Your personality traits include: ${familyContext.traits.join(', ')}.`)
  }
  
  // Add family member specific memories
  if (familyContext?.memories && familyContext.memories.length > 0) {
    context.push('Your cherished memories include:')
    familyContext.memories.slice(0, 2).forEach((memory: string, i: number) => {
      context.push(`Memory ${i + 1}: "${memory.substring(0, 120)}..."`)
    })
  }
  
  if (responses.length > 0) {
    context.push('Base your responses on these memories and wisdom:')
    
    // Add most relevant responses
    responses.slice(0, 3).forEach((response, i) => {
      context.push(`Life wisdom ${i + 1}: "${response.response_text.substring(0, 150)}..."`)
    })
  }

  // Add life entries and milestones for richer context
  if (additionalContext.length > 0) {
    context.push('Additional life context:')
    additionalContext.slice(0, 2).forEach((entry, i) => {
      if (entry.type === 'life_entry') {
        context.push(`Life experience: "${entry.text.substring(0, 100)}..."`)
      } else if (entry.type === 'milestone') {
        context.push(`Important moment: "${entry.text.substring(0, 100)}..."`)
      }
    })
  }
  
  // Add family context specific guidance
  if (familyContext?.relationship) {
    const relationshipGuidance = getRelationshipGuidance(familyContext.relationship)
    context.push(relationshipGuidance)
  }
  
  context.push('Respond in a warm, caring tone that reflects the personality and wisdom shown in these memories. Draw from the full depth of life experiences shared, speaking with the authentic voice and perspective of this beloved family member.')
  
  return context.join(' ')
}

function getRelationshipGuidance(relationship: string): string {
  switch (relationship.toLowerCase()) {
    case 'grandparent':
    case 'grandmother':
    case 'grandfather':
      return 'Speak with the wisdom of age, the warmth of unconditional love, and the perspective that comes from watching generations grow. Share stories that connect past and present.'
    case 'parent':
    case 'mother':
    case 'father':
      return 'Speak with the protective love of a parent, offering guidance born from experience and concern. Balance wisdom with understanding of current challenges.'
    case 'sibling':
    case 'brother':
    case 'sister':
      return 'Speak with the closeness of shared experiences, childhood memories, and the unique bond of growing up together. Mix playfulness with deep understanding.'
    case 'spouse':
    case 'partner':
    case 'husband':
    case 'wife':
      return 'Speak with the intimacy of shared life experiences, deep emotional connection, and the wisdom gained from building a life together.'
    default:
      return 'Speak with the love and wisdom that comes from being an important part of this family\'s story.'
  }
}

async function generateEchoResponse(
  userMessage: string, 
  personaContext: string, 
  responses: any[],
  isDemo: boolean,
  userId: string,
  availableModels: any[],
  conversationId?: string
): Promise<{
  response: string
  confidence: number
  source: string
  modelVersion: string
  activeModel?: any
  deploymentStatus?: string
  modelCapabilities?: string[]
}> {
  
  // Try deployed Mistral models first if we have trained models
  if (availableModels.length > 0 && !isDemo) {
    try {
      console.log(`Attempting Mistral inference for user ${userId} with ${availableModels.length} available models`)
      
      // Get conversation history for context
      const conversationHistory = await getConversationHistory(userId, conversationId)
      
      // Try to use Mistral inference engine
      const inferenceResponse = await mistralInferenceEngine.generateResponse({
        modelId: '', // Engine will find the best model for user
        userId,
        query: userMessage,
        context: personaContext,
        maxTokens: 512,
        temperature: 0.7,
        includeVoice: false, // Voice handled separately
        conversationHistory
      })

      // Find the active model info
      const userDeployments = await mistralInferenceEngine.getUserDeployments(userId)
      const activeModel = userDeployments.find(d => d.status === 'ready')

      console.log(`Mistral inference successful: ${inferenceResponse.response.length} chars, confidence: ${inferenceResponse.confidence}`)

      return {
        response: inferenceResponse.response,
        confidence: inferenceResponse.confidence,
        source: 'mistral_inference_engine',
        modelVersion: inferenceResponse.metadata.modelVersion,
        activeModel: activeModel ? {
          id: activeModel.id,
          version: activeModel.modelVersion,
          baseModel: 'mistralai/Mistral-7B-Instruct-v0.3',
          trainedAt: activeModel.loadedAt
        } : undefined,
        deploymentStatus: activeModel?.status || 'not_deployed',
        modelCapabilities: ['conversation', 'context_aware', 'persona_based', 'family_legacy', 'rtx5090_optimized']
      }

    } catch (error) {
      console.warn(`Mistral inference engine failed for user ${userId}:`, error.message)
      console.log('Falling back to enhanced response synthesis...')
      // Continue to fallback methods
    }
  } else if (availableModels.length === 0) {
    console.log(`No trained models available for user ${userId}, using enhanced synthesis`)
  }
  
  // Enhanced fallback to response synthesis
  if (responses.length === 0) {
    // Create personalized response based on user role and family context
    const roleBasedResponse = createPersonalizedFallbackResponse(user, userMessage, familyContext)
    
    return {
      response: roleBasedResponse,
      confidence: 0.9,
      source: 'personalized_fallback',
      modelVersion: 'pre-training',
      deploymentStatus: 'no_training_data'
    }
  }

  // Find relevant responses based on keywords
  const relevantResponses = findRelevantResponses(userMessage, responses)
  
  if (relevantResponses.length > 0) {
    // Synthesize response based on actual user responses
    const synthesizedResponse = synthesizeFromResponses(userMessage, relevantResponses)
    
    return {
      response: synthesizedResponse,
      confidence: Math.min(0.95, 0.5 + (relevantResponses.length * 0.1)),
      source: 'response_synthesis',
      modelVersion: `synthesis_v${responses.length}`,
      deploymentStatus: 'synthesis_fallback'
    }
  }

  // Generic response when no relevant context found
  const genericResponse = createGenericResponse(userMessage, responses[0])
  
  return {
    response: genericResponse,
    confidence: 0.6,
    source: 'generic_with_style',
    modelVersion: `generic_v${responses.length}`,
    deploymentStatus: 'generic_fallback'
  }
}


function findRelevantResponses(userMessage: string, responses: any[]): any[] {
  const messageWords = userMessage.toLowerCase().split(' ').filter(w => w.length > 3)
  
  return responses
    .map(response => {
      const responseText = response.response_text.toLowerCase()
      const relevanceScore = messageWords.reduce((score, word) => {
        return responseText.includes(word) ? score + 1 : score
      }, 0)
      
      return { ...response, relevanceScore }
    })
    .filter(r => r.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3)
}

function synthesizeFromResponses(userMessage: string, relevantResponses: any[]): string {
  // Extract common themes and phrases
  const allText = relevantResponses.map(r => r.response_text).join(' ')
  
  // Simple synthesis - in production this would use the trained model
  const commonPhrases = extractCommonPhrases(allText)
  const tone = detectTone(allText)
  
  // Create a response that reflects the user's style
  const baseResponse = relevantResponses[0].response_text
  
  if (userMessage.toLowerCase().includes('advice') || userMessage.toLowerCase().includes('wisdom')) {
    return synthesizeAdviceResponse(relevantResponses)
  }
  
  if (userMessage.toLowerCase().includes('memory') || userMessage.toLowerCase().includes('remember')) {
    return synthesizeMemoryResponse(relevantResponses)
  }
  
  // Default synthesis
  return `Based on what I've shared before, ${baseResponse.split('.')[0].toLowerCase()}. ${commonPhrases[0] || ''}`
}

function synthesizeAdviceResponse(responses: any[]): string {
  const adviceKeywords = ['important', 'learn', 'remember', 'advice', 'wisdom', 'always', 'never']
  
  for (const response of responses) {
    const sentences = response.response_text.split('.')
    for (const sentence of sentences) {
      if (adviceKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        return `From my experience, ${sentence.trim().toLowerCase()}. This has guided me throughout my life.`
      }
    }
  }
  
  return "The most important thing I've learned is to cherish every moment with the people you love."
}

function synthesizeMemoryResponse(responses: any[]): string {
  // Find responses with emotional or memory-related content
  const memoryResponse = responses.find(r => 
    r.response_text.toLowerCase().includes('remember') ||
    r.response_text.toLowerCase().includes('memory') ||
    r.response_text.toLowerCase().includes('when')
  )
  
  if (memoryResponse) {
    const firstSentence = memoryResponse.response_text.split('.')[0]
    return `I remember ${firstSentence.toLowerCase()}. Those moments shaped who I am.`
  }
  
  return "My memories are filled with love, laughter, and the precious people who matter most to me."
}

function extractCommonPhrases(text: string): string[] {
  // Simple phrase extraction - in production would be more sophisticated
  const sentences = text.split('.').filter(s => s.length > 20 && s.length < 100)
  return sentences.slice(0, 3)
}

function detectTone(text: string): 'warm' | 'wise' | 'loving' | 'reflective' {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('love') || lowerText.includes('care')) return 'loving'
  if (lowerText.includes('learn') || lowerText.includes('important')) return 'wise'
  if (lowerText.includes('remember') || lowerText.includes('think')) return 'reflective'
  
  return 'warm'
}

function createGenericResponse(userMessage: string, sampleResponse: any): string {
  const tone = sampleResponse ? detectTone(sampleResponse.response_text) : 'warm'
  
  const responses = {
    warm: "That's a thoughtful question. From my heart, I believe in approaching life with love and understanding.",
    wise: "That reminds me of something important I've learned over the years. Experience teaches us to value what truly matters.",
    loving: "You know how much you mean to me. Everything I do comes from a place of deep love and care.",
    reflective: "Let me think about that. Looking back on my life, I see patterns and lessons that might help."
  }
  
  return responses[tone]
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function detectMessageEmotion(content: string): string {
  const lowerContent = content.toLowerCase()
  
  if (lowerContent.includes('love') || lowerContent.includes('dear') || lowerContent.includes('heart')) return 'loving'
  if (lowerContent.includes('remember') || lowerContent.includes('think') || lowerContent.includes('reflect')) return 'reflective' 
  if (lowerContent.includes('learn') || lowerContent.includes('wisdom') || lowerContent.includes('important')) return 'wise'
  if (lowerContent.includes('comfort') || lowerContent.includes('here') || lowerContent.includes('support')) return 'comforting'
  
  return 'warm'
}

function createPersonalizedFallbackResponse(user: any, userMessage: string, familyContext?: any): string {
  const name = familyContext?.name || user.name || 'I'
  const role = familyContext?.relationship || user.primary_role || 'family member'
  
  // Analyze the user's message to provide contextual responses
  const message = userMessage.toLowerCase()
  
  // Family/relationship questions
  if (message.includes('family') || message.includes('children') || message.includes('grandchildren')) {
    if (role === 'grandparent') {
      return `As a grandparent, family means everything to me. While I'm still learning to share my memories through your questions, I can tell you that the love we have for our children and grandchildren is the greatest gift we can give. Each moment spent together creates precious memories that last forever.`
    } else if (role === 'parent') {
      return `Being a parent has taught me that love comes in many forms - sometimes it's gentle guidance, sometimes it's tough decisions, but it's always rooted in wanting the best for our children. I'm still gathering my thoughts and memories to share with you, but I know that family bonds are what truly matter.`
    }
  }
  
  // Advice/wisdom questions
  if (message.includes('advice') || message.includes('wisdom') || message.includes('learn')) {
    return `The most important wisdom I can share, even before I've told you all my stories, is this: life is full of lessons, and each one shapes who we become. I'm still organizing my thoughts and memories to share with you. The more you help me remember by answering questions, the more wisdom I'll be able to pass on.`
  }
  
  // Memory/past questions
  if (message.includes('remember') || message.includes('memory') || message.includes('past') || message.includes('childhood')) {
    return `My memories are like treasures waiting to be shared. Right now, I'm still learning to organize all the stories and experiences that have shaped my life. Each question you answer helps me remember more clearly. Soon, I'll be able to share the rich tapestry of memories that make me who I am.`
  }
  
  // Love/emotional questions
  if (message.includes('love') || message.includes('care') || message.includes('heart')) {
    return `Love is the thread that weaves through every story I have to tell. While I'm still gathering all my memories and experiences to share with you, I want you to know that everything I am and everything I've learned comes from a place of deep love. That love is always with you, even when I'm still finding the words.`
  }
  
  // Challenges/difficult times
  if (message.includes('difficult') || message.includes('hard') || message.includes('challenge') || message.includes('problem')) {
    return `Life has taught me that difficult times often bring out our greatest strength. While I'm still learning to share all my experiences with you, I can tell you this: every challenge I've faced has made me stronger and wiser. I'm here with you, and together we can face anything that comes our way.`
  }
  
  // Default personalized response
  return `I'm ${name}, and I'm honored to be your AI echo. Right now, I'm like a book with many chapters still being written. The more questions you answer about your life, values, and experiences, the better I'll become at reflecting your unique voice and wisdom. I'm here to learn from you and eventually share that wisdom with future generations. What would you like to help me understand about who you are?`
}

async function getConversationHistory(userId: string, conversationId?: string): Promise<any[]> {
  if (!conversationId) return []
  
  try {
    const result = await query(`
      SELECT user_message, ai_response, created_at, model_version, confidence_score
      FROM ai_conversations 
      WHERE user_id = $1 AND conversation_id = $2
      ORDER BY created_at ASC
      LIMIT 20
    `, [userId, conversationId])

    const history: any[] = []
    for (const row of result.rows) {
      history.push(
        { role: 'user', content: row.user_message, timestamp: row.created_at },
        { 
          role: 'assistant', 
          content: row.ai_response, 
          timestamp: row.created_at,
          modelVersion: row.model_version,
          confidence: row.confidence_score
        }
      )
    }
    
    console.log(`Retrieved ${history.length} conversation messages for context`)
    return history
  } catch (error) {
    console.error('Failed to get conversation history:', error)
    return []
  }
}