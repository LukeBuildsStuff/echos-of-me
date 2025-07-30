import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

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
    const { message, isDemo = false, conversationId } = body

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
      LEFT JOIN model_deployments md ON mv.id = md.model_version_id
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

    // Build enhanced persona context
    const personaContext = buildEnhancedPersonaContext(
      user, 
      responses.rows, 
      additionalContext.rows
    )
    
    // Try to use the trained model first, fall back to synthesis if unavailable
    const aiResponse = await generateEchoResponse(
      message, 
      personaContext, 
      responses.rows, 
      isDemo, 
      user.id,
      availableModels.rows
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
          response_source
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        user.id,
        message,
        aiResponse.response,
        conversationId || generateConversationId(),
        aiResponse.modelVersion,
        aiResponse.source
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

function buildEnhancedPersonaContext(user: any, responses: any[], additionalContext: any[]): string {
  const context = [`You are ${user.name}, speaking as their AI echo.`]
  
  if (user.primary_role) {
    context.push(`You are a ${user.primary_role}.`)
  }
  
  if (responses.length > 0) {
    context.push('Base your responses on these memories and wisdom:')
    
    // Add most relevant responses
    responses.slice(0, 3).forEach((response, i) => {
      context.push(`Memory ${i + 1}: "${response.response_text.substring(0, 150)}..."`)
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
  
  context.push('Respond in a warm, caring tone that reflects the personality and wisdom shown in these memories. Draw from the full depth of life experiences shared.')
  
  return context.join(' ')
}

async function generateEchoResponse(
  userMessage: string, 
  personaContext: string, 
  responses: any[],
  isDemo: boolean,
  userId: string,
  availableModels: any[]
): Promise<{
  response: string
  confidence: number
  source: string
  modelVersion: string
  activeModel?: any
  deploymentStatus?: string
  modelCapabilities?: string[]
}> {
  
  // Try trained models first (in order of preference)
  if (availableModels.length > 0) {
    // Sort models by preference: active first, then by version
    const sortedModels = availableModels.sort((a, b) => {
      if (a.is_active && !b.is_active) return -1
      if (!a.is_active && b.is_active) return 1
      return b.version - a.version
    })

    for (const model of sortedModels) {
      try {
        const trainedResponse = await callTrainedModel(
          userMessage, 
          personaContext, 
          userId, 
          model
        )
        if (trainedResponse) {
          return {
            ...trainedResponse,
            activeModel: {
              id: model.model_id,
              version: model.version,
              baseModel: model.base_model,
              trainedAt: model.trained_at
            },
            deploymentStatus: model.deployment_status || 'loaded',
            modelCapabilities: ['conversation', 'context_aware', 'persona_based']
          }
        }
      } catch (error) {
        console.log(`Model v${model.version} unavailable (${error instanceof Error ? error.message : 'Unknown error'}), trying next model...`)
        continue
      }
    }
    console.log('All trained models unavailable, falling back to synthesis')
  }
  
  // Fallback to response synthesis
  if (responses.length === 0) {
    return {
      response: "I'm still learning about who I am through the questions you answer. The more you share, the better I'll be able to reflect your voice and wisdom.",
      confidence: 1.0,
      source: 'default_response',
      modelVersion: 'pre-training',
      deploymentStatus: 'fallback'
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

async function callTrainedModel(
  userMessage: string,
  personaContext: string,
  userId: string,
  modelInfo: any
): Promise<{
  response: string
  confidence: number
  source: string
  modelVersion: string
} | null> {
  try {
    const mlInferenceUrl = process.env.ML_INFERENCE_URL || 'http://ml-inference:8000'
    
    // Check if inference server is available
    const healthCheck = await fetch(`${mlInferenceUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // Quick health check
    }).catch(() => null)

    if (!healthCheck || !healthCheck.ok) {
      throw new Error('ML inference server unavailable')
    }
    
    // First, ensure the model is loaded if we have a checkpoint path
    if (modelInfo.checkpoint_path && !modelInfo.endpoint_url) {
      console.log(`Loading model v${modelInfo.version} for user ${userId}`)
      const loadResponse = await fetch(`${mlInferenceUrl}/models/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          model_path: modelInfo.checkpoint_path,
          model_version: modelInfo.version,
          base_model: modelInfo.base_model || 'mistralai/Mistral-7B-Instruct-v0.2'
        }),
        signal: AbortSignal.timeout(30000)
      })
      
      if (!loadResponse.ok) {
        console.log(`Failed to load model v${modelInfo.version}:`, await loadResponse.text())
      }
    }
    
    // Make inference request
    const response = await fetch(`${mlInferenceUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        user_context: personaContext,
        user_id: userId,
        model_version: modelInfo.version,
        max_length: 512,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        pad_token_id: 2 // EOS token for Mistral
      }),
      signal: AbortSignal.timeout(45000) // Longer timeout for inference
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Model inference failed (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    
    // Validate response data
    if (!data.response || typeof data.response !== 'string') {
      throw new Error('Invalid response format from model')
    }
    
    return {
      response: data.response,
      confidence: data.confidence || 0.8,
      source: data.source || `trained_model_v${modelInfo.version}`,
      modelVersion: data.model_version || `v${modelInfo.version}`
    }
    
  } catch (error) {
    console.error(`Trained model v${modelInfo.version} call failed:`, error)
    return null
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