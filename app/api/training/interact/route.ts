import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'
import { ModelInteraction } from '@/lib/ai-training-config'
import crypto from 'crypto'

/**
 * Model Interaction API
 * Allows users to interact with their trained personalized models
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { modelId, query: userQuery, userId } = body

    if (!modelId || !userQuery) {
      return NextResponse.json(
        { error: 'Model ID and query are required' },
        { status: 400 }
      )
    }

    // Get model information
    const modelQuery = await query(`
      SELECT 
        tr.id,
        tr.user_id,
        tr.model_name,
        tr.model_version,
        tr.base_model,
        tr.status,
        u.name as user_name,
        u.primary_role,
        u.important_people
      FROM training_runs tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.id = $1 AND tr.status = 'completed'
    `, [modelId])

    if (modelQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Model not found or not available' },
        { status: 404 }
      )
    }

    const modelInfo = modelQuery.rows[0]

    // In a production system, this would load and query the actual trained model
    // For demonstration, we'll simulate a personalized response based on user data
    const personalizedResponse = await generatePersonalizedResponse(
      userQuery,
      modelInfo,
      userId
    )

    // Log the interaction
    const interaction: Partial<ModelInteraction> = {
      modelId,
      userId: userId || modelInfo.user_id,
      sessionId: crypto.randomUUID(),
      timestamp: new Date(),
      query: userQuery,
      response: personalizedResponse.text,
      responseTime: personalizedResponse.responseTime,
      tokenCount: personalizedResponse.tokenCount
    }

    await logInteraction(interaction)

    return NextResponse.json({
      response: personalizedResponse.text,
      metadata: {
        modelVersion: modelInfo.model_version,
        responseTime: personalizedResponse.responseTime,
        tokenCount: personalizedResponse.tokenCount,
        confidence: personalizedResponse.confidence
      }
    })

  } catch (error) {
    console.error('Error during model interaction:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
})

/**
 * Generate personalized response (simulation for demonstration)
 * In production, this would use the actual trained model
 */
async function generatePersonalizedResponse(
  userQuery: string,
  modelInfo: any,
  userId?: string
): Promise<{
  text: string
  responseTime: number
  tokenCount: number
  confidence: number
}> {
  const startTime = Date.now()

  // Get user's previous responses for context
  const userResponses = await query(`
    SELECT 
      r.response_text,
      q.question_text,
      q.category
    FROM responses r
    JOIN questions q ON r.question_id = q.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
    LIMIT 10
  `, [modelInfo.user_id])

  // Get life detail entries for additional context
  const lifeEntries = await query(`
    SELECT title, content, category
    FROM life_detail_entries
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 5
  `, [modelInfo.user_id])

  // Simulate personalized response generation
  const personalizedResponse = await simulateModelResponse(
    userQuery,
    modelInfo,
    userResponses.rows,
    lifeEntries.rows
  )

  const responseTime = Date.now() - startTime
  const tokenCount = personalizedResponse.split(' ').length * 1.3 // Rough token estimate

  return {
    text: personalizedResponse,
    responseTime,
    tokenCount: Math.round(tokenCount),
    confidence: 0.85 + Math.random() * 0.1 // Simulate 85-95% confidence
  }
}

/**
 * Simulate model response based on user's training data
 * In production, this would be replaced with actual model inference
 */
async function simulateModelResponse(
  query: string,
  modelInfo: any,
  responses: any[],
  lifeEntries: any[]
): Promise<string> {
  const userName = modelInfo.user_name || 'I'
  const primaryRole = modelInfo.primary_role || 'person'
  
  // Parse important people
  let importantPeople: string[] = []
  try {
    if (modelInfo.important_people) {
      const parsed = JSON.parse(modelInfo.important_people)
      importantPeople = parsed.map((p: any) => p.name).filter(Boolean)
    }
  } catch (e) {
    // Ignore parsing errors
  }

  // Analyze query intent
  const queryLower = query.toLowerCase()
  
  // Family/relationship questions
  if (queryLower.includes('family') || queryLower.includes('children') || 
      queryLower.includes('spouse') || queryLower.includes('parents')) {
    
    const familyResponses = responses.filter(r => 
      r.response_text.toLowerCase().includes('family') ||
      r.response_text.toLowerCase().includes('children') ||
      importantPeople.some(person => r.response_text.toLowerCase().includes(person.toLowerCase()))
    )
    
    if (familyResponses.length > 0) {
      const relevantResponse = familyResponses[0].response_text
      return `As ${primaryRole}, I'd say that ${relevantResponse.substring(0, 200)}... Family has always been incredibly important to me, and I hope these memories help you understand the love and values I want to pass on.`
    }
    
    return `As ${primaryRole}, family means everything to me. ${importantPeople.length > 0 ? `My relationships with ${importantPeople.slice(0, 2).join(' and ')} have shaped who I am.` : ''} I believe in the importance of staying connected, supporting each other, and creating lasting memories together.`
  }
  
  // Advice questions
  if (queryLower.includes('advice') || queryLower.includes('wisdom') || 
      queryLower.includes('learn') || queryLower.includes('guidance')) {
    
    const adviceResponses = responses.filter(r => 
      r.response_text.toLowerCase().includes('advice') ||
      r.response_text.toLowerCase().includes('learn') ||
      r.response_text.toLowerCase().includes('important')
    )
    
    if (adviceResponses.length > 0) {
      const relevantResponse = adviceResponses[0].response_text
      return `From my experience as ${primaryRole}, I'd advise you to ${relevantResponse.substring(0, 200)}... Remember, wisdom comes from both success and failure, and each challenge is an opportunity to grow.`
    }
    
    return `The most important advice I can give you is to stay true to yourself, treat others with kindness and respect, and never stop learning. Life will present challenges, but approaching them with courage and integrity will serve you well.`
  }
  
  // Memory/story questions
  if (queryLower.includes('memory') || queryLower.includes('story') || 
      queryLower.includes('remember') || queryLower.includes('time when')) {
    
    const memoryResponses = responses.filter(r => 
      r.response_text.toLowerCase().includes('remember') ||
      r.response_text.toLowerCase().includes('time') ||
      r.category === 'memories'
    )
    
    const relevantLifeEntries = lifeEntries.filter(entry => 
      entry.content.toLowerCase().includes('remember') ||
      entry.category === 'memories'
    )
    
    if (memoryResponses.length > 0) {
      const relevantResponse = memoryResponses[0].response_text
      return `I remember ${relevantResponse.substring(0, 250)}... These memories are precious to me, and I hope sharing them helps you understand the experiences that shaped my perspective on life.`
    }
    
    if (relevantLifeEntries.length > 0) {
      const entry = relevantLifeEntries[0]
      return `One memory that stands out is about ${entry.title.toLowerCase()}. ${entry.content.substring(0, 200)}... These experiences have been formative in my journey as ${primaryRole}.`
    }
    
    return `I have so many cherished memories from my time as ${primaryRole}. Each experience, whether joyful or challenging, has contributed to who I am today. I hope that by sharing these stories, you can learn from my journey and create your own meaningful memories.`
  }
  
  // Values/beliefs questions
  if (queryLower.includes('value') || queryLower.includes('believe') || 
      queryLower.includes('important') || queryLower.includes('principle')) {
    
    const valueResponses = responses.filter(r => 
      r.response_text.toLowerCase().includes('value') ||
      r.response_text.toLowerCase().includes('believe') ||
      r.response_text.toLowerCase().includes('important')
    )
    
    if (valueResponses.length > 0) {
      const relevantResponse = valueResponses[0].response_text
      return `My core values as ${primaryRole} center around ${relevantResponse.substring(0, 200)}... These principles have guided my decisions and I hope they can provide guidance for you as well.`
    }
    
    return `I believe in the importance of integrity, compassion, and perseverance. As ${primaryRole}, I've learned that treating others with respect, staying true to your word, and never giving up on what matters most are fundamental to a meaningful life.`
  }
  
  // General/catch-all response
  const generalResponses = responses.slice(0, 3)
  if (generalResponses.length > 0) {
    const contextualResponse = generalResponses.find(r => 
      r.response_text.length > 100
    )?.response_text || generalResponses[0].response_text
    
    return `As ${primaryRole}, I think about your question and reflect on my experiences. ${contextualResponse.substring(0, 200)}... I hope my perspective helps you in your own journey.`
  }
  
  return `Thank you for your question. As ${primaryRole}, I want to share my thoughts with you based on my life experiences. While I may not have a specific memory to draw from right now, I believe in the importance of staying curious, being kind to others, and always striving to learn and grow. Your questions help me reflect on what truly matters in life.`
}

/**
 * Log interaction for analytics and improvement
 */
async function logInteraction(interaction: Partial<ModelInteraction>) {
  try {
    await query(`
      INSERT INTO model_interactions (
        id, model_id, user_id, session_id, timestamp, 
        query, response, response_time, token_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      crypto.randomUUID(),
      interaction.modelId,
      interaction.userId,
      interaction.sessionId,
      interaction.timestamp,
      interaction.query,
      interaction.response,
      interaction.responseTime,
      interaction.tokenCount
    ])
  } catch (error) {
    // Create table if it doesn't exist
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS model_interactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          model_id UUID NOT NULL,
          user_id UUID,
          session_id UUID NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          query TEXT NOT NULL,
          response TEXT NOT NULL,
          response_time INTEGER NOT NULL,
          token_count INTEGER NOT NULL,
          satisfaction VARCHAR(20),
          feedback TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Retry the insert
      await query(`
        INSERT INTO model_interactions (
          id, model_id, user_id, session_id, timestamp, 
          query, response, response_time, token_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        crypto.randomUUID(),
        interaction.modelId,
        interaction.userId,
        interaction.sessionId,
        interaction.timestamp,
        interaction.query,
        interaction.response,
        interaction.responseTime,
        interaction.tokenCount
      ])
    } catch (createError) {
      console.error('Failed to log interaction:', createError)
    }
  }
}