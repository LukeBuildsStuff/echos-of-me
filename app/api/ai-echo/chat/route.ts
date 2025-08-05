import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { voiceCloneArchitecture } from '@/lib/voice-cloning-architecture'
import { query } from '@/lib/db'
import { lukeAIModelEngine } from '@/lib/luke-ai-model-engine'

/**
 * Enhanced AI Echo Chat API
 * 
 * This endpoint connects with the RTX 5090 GPU container for high-performance inference.
 * It uses Jose's trained Brooklyn construction worker model running on the GPU container, with intelligent fallbacks.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, isDemo = false, sessionId, familyContext, settings, includeVoice = false } = body

    // Authentication handling - allow testing in development
    const session = await getServerSession(authOptions)
    const isDevelopment = process.env.NODE_ENV === 'development'
    const allowBypass = isDevelopment || isDemo
    
    if (!allowBypass && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID (use Luke's account for demo mode or testing)
    const userEmail = (isDemo || !session?.user?.email) ? 'lukemoeller@yahoo.com' : session.user.email
    const userResult = await query(
      'SELECT id, name, primary_role FROM users WHERE email = $1',
      [userEmail]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = userResult.rows[0]

    // Check for available trained models (with fallback if tables don't exist)
    let availableModels
    try {
      availableModels = await query(`
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
    } catch (error) {
      console.log('Model versions table not found, using direct model path:', error.message)
      availableModels = { rows: [] }
    }

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

    // Get additional context from life entries and milestones (with fallback if tables don't exist)
    let additionalContext
    try {
      additionalContext = await query(`
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
    } catch (error) {
      console.log('Life entries/milestone tables not found, using responses only:', error.message)
      additionalContext = { rows: [] }
    }

    // Build enhanced persona context with family member info
    const personaContext = buildEnhancedPersonaContext(
      user, 
      responses.rows, 
      additionalContext.rows,
      familyContext
    )
    
    // Handle Luke's AI chat (using trained model)
    let chatSession = null
    let aiResponse = null
    let modelEngineStatus = null

    if (!isDemo) {
      console.log(`🤖 [JOSE AI] Starting chat for user ${user.id}`)
      console.log(`   📝 Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`)
      console.log(`   👤 Available training responses: ${responses.rows.length}`)
      console.log(`   🗂️ Available models in DB: ${availableModels.rows.length}`)
      
      // Check Luke AI model status first
      try {
        modelEngineStatus = await lukeAIModelEngine.getStatus()
        console.log(`📊 [JOSE AI] Engine Status:`, {
          isModelLoaded: modelEngineStatus.model_loaded,
          device: modelEngineStatus.device,
          inferenceCount: modelEngineStatus.inference_count,
          totalTokens: modelEngineStatus.total_tokens_generated,
          gpuMemory: modelEngineStatus.gpu_memory ? 
            `${(modelEngineStatus.gpu_memory.usage_percent * 100).toFixed(1)}%` : 'N/A'
        })
      } catch (statusError) {
        console.error(`❌ [JOSE AI] Failed to get status:`, statusError.message)
      }
      
      // Start Luke's AI model if not ready
      if (!lukeAIModelEngine.isReady() || !modelEngineStatus?.model_loaded) {
        console.log(`⚡ [JOSE AI] Model not ready - initializing...`)
        console.log(`   🔧 Engine ready: ${lukeAIModelEngine.isReady()}`)
        console.log(`   🔧 Model loaded: ${modelEngineStatus?.model_loaded || false}`)
        
        try {
          const initStartTime = Date.now()
          await lukeAIModelEngine.startLukeAI()
          const initTime = Date.now() - initStartTime
          console.log(`✅ [LUKE AI] Model initialized successfully in ${initTime}ms`)
          
          // Get updated status after initialization
          modelEngineStatus = await lukeAIModelEngine.getStatus()
          console.log(`📊 [LUKE AI] Post-init Status:`, {
            isModelLoaded: modelEngineStatus.model_loaded,
            device: modelEngineStatus.device
          })
        } catch (startError) {
          console.error(`❌ [LUKE AI] CRITICAL: Failed to initialize model:`, {
            error: startError.message,
            stack: startError.stack?.split('\n')[0] || 'No stack trace'
          })
          throw startError
        }
      } else {
        console.log(`✅ [LUKE AI] Model already ready and loaded`)
      }

      // Get or create chat session
      if (sessionId) {
        chatSession = lukeAIModelEngine.getChatSession(sessionId)
        console.log(`📝 [LUKE AI] ${chatSession ? 'Using existing' : 'Session not found for'} chat session: ${sessionId}`)
      }
      
      if (!chatSession) {
        try {
          chatSession = await lukeAIModelEngine.createChatSession(
            `Chat ${new Date().toLocaleString()}`
          )
          console.log(`📝 [LUKE AI] Created new chat session: ${chatSession.id}`)
        } catch (sessionError) {
          console.error(`❌ [LUKE AI] Failed to create chat session:`, sessionError.message)
          throw sessionError
        }
      }

      // Generate response using Luke's trained model on RTX 5090 GPU container
      try {
        console.log(`🧠 [LUKE AI] Generating response using RTX 5090 GPU container...`)
        console.log(`   🎯 Session: ${chatSession.id}`)
        console.log(`   📏 Input length: ${message.length} chars`)
        console.log(`   🚀 Container: http://localhost:8000/chat`)
        
        const generationStartTime = Date.now()
        
        const lukeResponse = await lukeAIModelEngine.sendMessage(chatSession.id, message)
        
        const processingTime = Date.now() - generationStartTime
        
        aiResponse = {
          response: lukeResponse.content,
          confidence: lukeResponse.metadata?.confidence || 0.9,
          source: 'jose_trained_model',
          modelVersion: lukeResponse.metadata?.modelVersion || 'tinyllama-jose-v1.0',
          emotionalTone: lukeResponse.metadata?.emotionalTone || 'authentic',
          responseTime: lukeResponse.metadata?.responseTime || processingTime
        }
        
        console.log(`✅ [JOSE AI] RTX 5090 GPU RESPONSE GENERATED SUCCESSFULLY!`)
        console.log(`   📏 Response length: ${lukeResponse.content.length} chars`)
        console.log(`   ⏱️ Generation time: ${processingTime}ms`)
        console.log(`   📊 Confidence: ${aiResponse.confidence}`)
        console.log(`   🎭 Emotional tone: ${aiResponse.emotionalTone}`)
        console.log(`   🔧 Model version: ${aiResponse.modelVersion}`)
        console.log(`   🎬 Tokens generated: ${lukeResponse.metadata?.tokens || 'N/A'}`)
        console.log(`   🚀 Processing speed: ${lukeResponse.metadata?.responseTime ? 
          `${((lukeResponse.metadata.tokens || 0) / lukeResponse.metadata.responseTime).toFixed(1)}` : 'N/A'} tokens/sec`)
        console.log(`   🖥️ GPU Memory Used: ${lukeResponse.metadata?.gpuMemoryUsed || 'N/A'}GB`)
        console.log(`   💬 Response preview: "${lukeResponse.content.substring(0, 150)}${lukeResponse.content.length > 150 ? '...' : ''}"`)
        
        // Check if response looks authentic (Luke's voice indicators)
        const responseText = lukeResponse.content.toLowerCase()
        const authenticityIndicators = [
          responseText.includes('from my experience'),
          responseText.includes('i\'ve learned'),
          responseText.includes('i remember'),
          responseText.includes('in my view'),
          responseText.includes('looking back'),
          responseText.includes('what i\'ve found'),
          responseText.includes('personally'),
          responseText.includes('my perspective')
        ]
        const authenticityScore = authenticityIndicators.filter(Boolean).length
        
        console.log(`🎯 [LUKE AI] Authenticity Analysis:`)
        console.log(`   🔍 Personal voice indicators found: ${authenticityScore}/8`)
        console.log(`   ✅ Response appears ${authenticityScore >= 1 ? 'AUTHENTIC (Luke\'s voice)' : 'GENERIC (may need training adjustment)'}`)
        console.log(`   🚀 Source: RTX 5090 GPU Container`)
        
      } catch (error) {
        console.error(`❌ [LUKE AI] RTX 5090 GPU CONTAINER FAILED - Details:`, {
          error: error.message,
          stack: error.stack?.split('\n')[0] || 'No stack trace',
          sessionId: chatSession?.id,
          messageLength: message.length,
          containerEndpoint: 'http://localhost:8000/chat'
        })
        console.log(`🔄 [FALLBACK] Attempting response synthesis...`)
        
        // Fallback to response synthesis
        const fallbackStartTime = Date.now()
        aiResponse = await generateFallbackResponse(message, personaContext, responses.rows, user.id)
        const fallbackTime = Date.now() - fallbackStartTime
        
        console.log(`⚠️ [FALLBACK] SYNTHESIS USED - Details:`)
        console.log(`   🔧 Source: ${aiResponse.source}`)
        console.log(`   📊 Confidence: ${aiResponse.confidence}`)
        console.log(`   ⏱️ Fallback time: ${fallbackTime}ms`)
        console.log(`   📏 Response length: ${aiResponse.response.length} chars`)
        console.log(`   💬 Fallback preview: "${aiResponse.response.substring(0, 100)}..."`)
      }
    } else {
      console.log(`🎭 [DEMO MODE] Using response synthesis instead of trained model`)
      // Demo mode - use response synthesis
      const demoStartTime = Date.now()
      aiResponse = await generateFallbackResponse(message, personaContext, responses.rows, user.id)
      const demoTime = Date.now() - demoStartTime
      
      console.log(`🎭 [DEMO MODE] Synthesis completed in ${demoTime}ms:`)
      console.log(`   🔧 Source: ${aiResponse.source}`)
      console.log(`   📊 Confidence: ${aiResponse.confidence}`)
      console.log(`   💬 Demo preview: "${aiResponse.response.substring(0, 100)}..."`)
    }

    // Generate voice response if requested and available
    let voiceResponse = null
    if (includeVoice && !isDemo && aiResponse.response) {
      try {
        console.log(`Generating voice response for user ${user.id}`)
        const voiceResult = await voiceCloneArchitecture.generateVoiceResponse(
          user.id,
          message,
          aiResponse.response
        )
        
        if (voiceResult.audioResponse) {
          voiceResponse = {
            audioUrl: voiceResult.audioResponse.audioUrl,
            duration: voiceResult.audioResponse.duration,
            generationTime: voiceResult.audioResponse.generationTime,
            quality: voiceResult.audioResponse.quality,
            modelUsed: voiceResult.audioResponse.modelUsed,
            confidence: voiceResult.audioResponse.confidence
          }
          console.log(`Voice response generated: ${voiceResponse.duration}s audio in ${voiceResponse.generationTime}ms`)
        } else if (voiceResult.error) {
          console.log(`Voice response failed: ${voiceResult.error}`)
        }
      } catch (voiceError) {
        console.log('Voice response generation failed:', voiceError)
        // Don't fail the entire request if voice fails
      }
    }

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
        chatSession?.id || generateConversationId(),
        aiResponse.modelVersion || 'synthesis',
        aiResponse.source || 'enhanced_synthesis',
        aiResponse.confidence || 0.8,
        detectMessageEmotion(aiResponse.response)
      ])
    }

    // Final response logging
    const responseSummary = {
      source: aiResponse.source,
      isAuthentic: aiResponse.source === 'jose_trained_model',
      confidence: aiResponse.confidence,
      responseLength: aiResponse.response.length,
      sessionId: chatSession?.id,
      hasVoice: !!voiceResponse,
      userId: user.id,
      timestamp: new Date().toISOString()
    }
    
    console.log(`📋 [RESPONSE SUMMARY] Final response details:`)
    console.log(`   🎯 Source: ${responseSummary.source} ${responseSummary.isAuthentic ? '(AUTHENTIC JOSE)' : '(FALLBACK)'}`)
    console.log(`   📊 Confidence: ${responseSummary.confidence}`)
    console.log(`   📏 Length: ${responseSummary.responseLength} chars`)
    console.log(`   🎙️ Voice: ${responseSummary.hasVoice ? 'Generated' : 'Not requested'}`)
    console.log(`   👤 User: ${responseSummary.userId}`)
    console.log(`   🔗 Session: ${responseSummary.sessionId || 'N/A'}`)

    return NextResponse.json({
      response: aiResponse.response,
      confidence: aiResponse.confidence,
      source: aiResponse.source,
      modelVersion: aiResponse.modelVersion,
      emotionalTone: aiResponse.emotionalTone,
      sessionId: chatSession?.id,
      voice: voiceResponse,
      trainingData: {
        responsesUsed: responses.rows.length,
        categoriesCovered: new Set(responses.rows.map(r => r.category)).size,
        totalWords: responses.rows.reduce((sum, r) => sum + r.word_count, 0),
        additionalContext: additionalContext.rows.length
      },
      modelInfo: {
        modelType: 'TinyLlama-1.1B-Chat-v1.0',
        trainedModel: aiResponse.source === 'jose_trained_model',
        deploymentStatus: aiResponse.source === 'jose_trained_model' ? 'deployed' : 'fallback',
        modelCapabilities: aiResponse.source === 'jose_trained_model' 
          ? ['conversation', 'context_aware', 'persona_based', 'rtx5090_optimized', 'streaming', 'real_time', 'jose_brooklyn_construction_worker']
          : ['response_synthesis', 'fallback'],
        voiceCapabilities: voiceResponse ? ['voice_synthesis', 'rtx5090_optimized', 'real_time'] : [],
        engineStatus: modelEngineStatus
      },
      debug: {
        responseGenerated: responseSummary,
        modelEngineReady: lukeAIModelEngine.isReady(),
        trainingResponsesAvailable: responses.rows.length,
        availableModelsInDB: availableModels.rows.length
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
  
  // Add temporal context for the user themselves
  if (user.birthday) {
    const age = calculateAge(user.birthday)
    if (age !== null) {
      context.push(`You are ${age} years old.`)
    }
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
  
  // Add important people with temporal awareness
  if (user.important_people) {
    const importantPeople = parseImportantPeople(user.important_people)
    if (importantPeople.length > 0) {
      context.push('Important people in your life:')
      importantPeople.slice(0, 3).forEach(person => {
        const temporalInfo = formatPersonTemporalContext(person)
        context.push(`${person.name} (${person.relationship}${temporalInfo ? ', ' + temporalInfo : ''})`)
      })
    }
  }
  
  context.push('Respond in a warm, caring tone that reflects the personality and wisdom shown in these memories. Use age-appropriate language and temporal awareness when referencing people. For those who have passed away, speak of them with love and in appropriate past tense. For living people, reference their current age and circumstances when relevant. Draw from the full depth of life experiences shared, speaking with the authentic voice and perspective of this beloved family member.')
  
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

async function generateFallbackResponse(
  userMessage: string, 
  personaContext: string, 
  responses: any[],
  userId: string
): Promise<{
  response: string
  confidence: number
  source: string
  modelVersion: string
  emotionalTone: string
}> {
  
  console.log(`Generating fallback response for user ${userId} with ${responses.length} training responses`)
  
  // Enhanced fallback to response synthesis
  if (responses.length === 0) {
    // Create personalized response when no training data available
    const fallbackResponse = createPersonalizedFallbackResponse(userMessage)
    
    return {
      response: fallbackResponse,
      confidence: 0.7,
      source: 'personalized_fallback',
      modelVersion: 'pre-training',
      emotionalTone: 'warm'
    }
  }

  // Find relevant responses based on keywords
  const relevantResponses = findRelevantResponses(userMessage, responses)
  
  if (relevantResponses.length > 0) {
    // Synthesize response based on actual user responses
    const synthesizedResponse = synthesizeFromResponses(userMessage, relevantResponses)
    
    return {
      response: synthesizedResponse,
      confidence: Math.min(0.85, 0.5 + (relevantResponses.length * 0.1)),
      source: 'response_synthesis',
      modelVersion: `synthesis_v${responses.length}`,
      emotionalTone: detectMessageEmotion(synthesizedResponse)
    }
  }

  // Generic response when no relevant context found
  const genericResponse = createGenericResponse(userMessage, responses[0])
  
  return {
    response: genericResponse,
    confidence: 0.6,
    source: 'generic_with_style',
    modelVersion: `generic_v${responses.length}`,
    emotionalTone: 'warm'
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
  
  return "From my experience, I've learned that building meaningful connections and working on projects that genuinely matter to people is what makes life fulfilling. It's not about being perfect, but about being authentic and helping others in whatever way I can."
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

/**
 * Calculate age from birthday
 */
function calculateAge(birthday: string, referenceDate?: string): number | null {
  if (!birthday) return null
  
  const birth = new Date(birthday)
  const reference = new Date(referenceDate || new Date())
  let age = reference.getFullYear() - birth.getFullYear()
  const monthDiff = reference.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

/**
 * Calculate years since a memorial date
 */
function calculateYearsSince(memorialDate: string, referenceDate?: string): number | null {
  if (!memorialDate) return null
  
  const memorial = new Date(memorialDate)
  const reference = new Date(referenceDate || new Date())
  let years = reference.getFullYear() - memorial.getFullYear()
  const monthDiff = reference.getMonth() - memorial.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < memorial.getDate())) {
    years--
  }
  
  return years
}

/**
 * Parse important people with temporal data
 */
function parseImportantPeople(importantPeopleJson: any): Array<{name: string, relationship?: string, birthday?: string, memorial_date?: string}> {
  try {
    if (importantPeopleJson && typeof importantPeopleJson === 'object') {
      if (Array.isArray(importantPeopleJson)) {
        return importantPeopleJson.map((p: any) => ({
          name: p.name,
          relationship: p.relationship,
          birthday: p.birthday,
          memorial_date: p.memorial_date
        })).filter(p => p.name)
      } else {
        return Object.values(importantPeopleJson).map((p: any) => ({
          name: p.name,
          relationship: p.relationship,
          birthday: p.birthday,
          memorial_date: p.memorial_date
        })).filter(p => p.name)
      }
    }
    if (typeof importantPeopleJson === 'string') {
      const parsed = JSON.parse(importantPeopleJson)
      return parsed.map((p: any) => ({
        name: p.name,
        relationship: p.relationship,
        birthday: p.birthday,
        memorial_date: p.memorial_date
      })).filter(p => p.name)
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return []
}

/**
 * Format temporal context for a person
 */
function formatPersonTemporalContext(person: {name: string, relationship?: string, birthday?: string, memorial_date?: string}, referenceDate?: string): string {
  if (person.memorial_date) {
    const yearsSince = calculateYearsSince(person.memorial_date, referenceDate)
    if (yearsSince !== null) {
      if (yearsSince === 0) {
        return 'who passed away recently'
      } else if (yearsSince === 1) {
        return 'who passed away a year ago'
      } else {
        return `who passed away ${yearsSince} years ago`
      }
    } else {
      return 'who has passed away'
    }
  } else if (person.birthday) {
    const age = calculateAge(person.birthday, referenceDate)
    if (age !== null) {
      return `who is ${age} years old`
    }
  }
  
  return ''
}

function createPersonalizedFallbackResponse(userMessage: string): string {
  const name = 'I'
  const role = 'your AI echo'
  
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

async function getConversationHistory(userId: string, sessionId?: string): Promise<any[]> {
  if (!sessionId) return []
  
  try {
    const result = await query(`
      SELECT user_message, ai_response, created_at, model_version, confidence_score
      FROM ai_conversations 
      WHERE user_id = $1 AND conversation_id = $2
      ORDER BY created_at ASC
      LIMIT 20
    `, [userId, sessionId])

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