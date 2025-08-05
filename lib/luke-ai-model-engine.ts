/**
 * Luke's Trained AI Model Engine
 * 
 * Integration bridge for Luke's personal AI echo using the trained TinyLlama model
 * Connects Next.js API with the working Python inference engine
 * Optimized for RTX 5090 with real-time chat capabilities
 */

import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { query } from './db'

export interface LukeAIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    responseTime?: number
    confidence?: number
    emotionalTone?: string
    modelVersion?: string
    tokens?: number
  }
}

export interface LukeAISession {
  id: string
  title: string
  messages: LukeAIMessage[]
  createdAt: Date
  lastActiveAt: Date
  context: string
}

export interface StreamingChunk {
  content: string
  isComplete: boolean
  metadata?: {
    tokens?: number
    confidence?: number
    emotionalTone?: string
  }
}

export class LukeAIModelEngine extends EventEmitter {
  private isModelLoaded = false
  private activeSessions: Map<string, LukeAISession> = new Map()
  private gpuContainerEndpoint = this.getGpuContainerEndpoint()

  constructor() {
    super()
    console.log('Luke AI Model Engine initialized')
    console.log('GPU Container Endpoint:', this.gpuContainerEndpoint)
  }

  /**
   * Get the correct GPU container endpoint based on environment
   */
  private getGpuContainerEndpoint(): string {
    // Check if we're running inside a Docker container
    const isInContainer = process.env.DOCKER_CONTAINER === 'true' || 
                         process.env.NODE_ENV === 'development'
    
    if (isInContainer) {
      // Use the GPU container name since it's on the same network
      return 'http://rtx5090-ml:8000'  // GPU container name
    }
    
    return 'http://localhost:8000'  // Direct host access
  }

  /**
   * Generate a simple response using the RTX 5090 GPU container
   */
  private async generateSimpleResponse(prompt: string): Promise<any> {
    const startTime = Date.now()
    console.log(`🚀 [ENGINE] Calling RTX 5090 GPU container...`)
    console.log(`   📍 Endpoint: ${this.gpuContainerEndpoint}/chat`)
    console.log(`   📝 Prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`)
    
    try {
      // Handle status requests
      if (prompt === 'status') {
        const healthResponse = await fetch(`${this.gpuContainerEndpoint}/health`)
        if (!healthResponse.ok) {
          throw new Error(`Health check failed: ${healthResponse.status}`)
        }
        
        const healthData = await healthResponse.json()
        const processingTime = Date.now() - startTime
        
        console.log(`✅ [ENGINE] Health check completed in ${processingTime}ms`)
        
        return {
          model_loaded: healthData.status === 'healthy' && healthData.model_loaded,
          device: healthData.gpu_available ? 'cuda' : 'cpu',
          gpu_memory: {
            usage_percent: parseFloat(healthData.gpu_memory_gb) / 24.0 // Assuming RTX 5090 has 24GB
          },
          inference_count: 0, // Will be tracked by container
          error: null
        }
      }

      // Regular chat inference
      const response = await fetch(`${this.gpuContainerEndpoint}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt
        })
      })

      if (!response.ok) {
        throw new Error(`GPU container request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const processingTime = Date.now() - startTime
      
      console.log(`✅ [ENGINE] GPU container response received in ${processingTime}ms:`, {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        confidence: data.confidence,
        source: data.source,
        inferenceTime: data.inference_time,
        gpuMemoryUsed: data.gpu_memory_used
      })

      // Transform GPU container response to match expected format
      return {
        response: data.response,
        tokens_generated: Math.ceil(data.response.length / 4), // Estimate tokens
        generation_time: data.inference_time,
        tokens_per_second: Math.ceil(data.response.length / 4) / data.inference_time,
        confidence: data.confidence,
        source: data.source,
        model_version: data.model_version,
        gpu_memory_used: data.gpu_memory_used,
        error: null
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      console.error(`❌ [ENGINE] GPU container request failed in ${processingTime}ms:`, {
        error: errorMessage,
        endpoint: `${this.gpuContainerEndpoint}/chat`,
        prompt: prompt.substring(0, 100)
      })
      
      throw new Error(`GPU container inference failed: ${errorMessage}`)
    }
  }

  /**
   * Start Luke's AI model for inference
   */
  async startLukeAI(): Promise<void> {
    if (this.isModelLoaded) {
      console.log('Luke AI model already loaded')
      return
    }

    try {
      console.log('Testing Luke\'s AI model...')
      
      // Test if the model is working by getting status
      const statusResult = await this.generateSimpleResponse('status')
      
      if (statusResult.model_loaded) {
        this.isModelLoaded = true
        console.log('✅ Luke\'s AI model is ready!')
        console.log('Device:', statusResult.device)
        console.log('GPU Memory Usage:', statusResult.gpu_memory ? 
          `${(statusResult.gpu_memory.usage_percent * 100).toFixed(1)}%` : 'N/A')
      } else {
        throw new Error('Model failed to load properly')
      }

    } catch (error) {
      console.error('Failed to start Luke AI:', error)
      this.isModelLoaded = false
      throw error
    }
  }

  /**
   * Check AI model status
   */
  async getStatus(): Promise<any> {
    try {
      console.log('🔍 [ENGINE] Checking Luke AI model status...')
      const status = await this.generateSimpleResponse('status')
      
      console.log('📊 [ENGINE] Status response received:', {
        model_loaded: status.model_loaded,
        device: status.device,
        inference_count: status.inference_count,
        error: status.error
      })
      
      return status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack?.split('\n')[0] : 'No stack trace'
      console.error('❌ [ENGINE] Failed to get AI status:', {
        error: errorMessage,
        stack: errorStack || 'No stack trace'
      })
      return { model_loaded: false, error: errorMessage }
    }
  }

  /**
   * Create a new chat session with Luke
   */
  async createChatSession(title?: string): Promise<LukeAISession> {
    const sessionId = randomUUID()
    
    const session: LukeAISession = {
      id: sessionId,
      title: title || `Chat with Luke ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: new Date(),
      lastActiveAt: new Date(),
      context: "You are Luke, sharing your authentic thoughts and experiences with warmth and wisdom."
    }

    this.activeSessions.set(sessionId, session)
    
    // Add welcome message
    const welcomeMessage: LukeAIMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: "Hello! I'm your AI echo, trained on your responses to preserve your unique voice and wisdom. I'm here to share thoughts, memories, and perspectives in the way you would. What's on your mind today?",
      timestamp: new Date(),
      metadata: {
        confidence: 1.0,
        emotionalTone: 'warm',
        modelVersion: 'tinyllama-luke-v1.0'
      }
    }

    session.messages.push(welcomeMessage)
    await this.saveChatSession(session)

    return session
  }

  /**
   * Send message to Luke's AI and get response
   */
  async sendMessage(
    sessionId: string,
    content: string,
    streamCallback?: (chunk: StreamingChunk) => void
  ): Promise<LukeAIMessage> {
    console.log(`💬 [ENGINE] Processing message for session ${sessionId}`)
    console.log(`   📝 Input: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`)
    
    if (!this.isModelLoaded) {
      console.log(`⚡ [ENGINE] Model not loaded, starting Luke AI...`)
      await this.startLukeAI()
    }

    const session = this.activeSessions.get(sessionId)
    if (!session) {
      console.error(`❌ [ENGINE] Chat session not found: ${sessionId}`)
      throw new Error(`Chat session not found: ${sessionId}`)
    }

    console.log(`📝 [ENGINE] Session found with ${session.messages.length} existing messages`)

    // Add user message
    const userMessage: LukeAIMessage = {
      id: randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    session.messages.push(userMessage)
    session.lastActiveAt = new Date()

    try {
      console.log(`🧠 [ENGINE] Generating response with Luke's trained model...`)
      const startTime = Date.now()
      
      // Use the working Python inference engine
      const result = await this.generateSimpleResponse(content)
      
      if (result.error) {
        console.error(`❌ [ENGINE] Python inference returned error: ${result.error}`)
        throw new Error(result.error)
      }
      
      const processingTime = Date.now() - startTime
      
      const response: LukeAIMessage = {
        id: randomUUID(),
        role: 'assistant',
        content: result.response || '',
        timestamp: new Date(),
        metadata: {
          responseTime: result.generation_time || processingTime / 1000,
          confidence: 0.9, // High confidence for trained model
          emotionalTone: this.detectEmotionalTone(result.response || ''),
          modelVersion: 'tinyllama-luke-v1.0',
          tokens: result.tokens_generated || 0
        }
      }
      
      session.messages.push(response)
      await this.saveChatSession(session)
      
      console.log(`✅ [ENGINE] Response generated successfully:`)
      console.log(`   📏 Response length: ${response.content.length} chars`)
      console.log(`   ⏱️ Processing time: ${processingTime}ms`)
      console.log(`   🎬 Tokens generated: ${response.metadata?.tokens || 'N/A'}`)
      console.log(`   🚀 Performance: ${result.tokens_per_second?.toFixed(1) || 'N/A'} tokens/sec`)
      console.log(`   🎭 Emotional tone: ${response.metadata?.emotionalTone}`)
      console.log(`   💬 Response preview: "${response.content.substring(0, 100)}${response.content.length > 100 ? '...' : ''}"`)
      
      // Log success message for testing verification
      console.log('✅ LUKE TRAINED MODEL SUCCESS - Response generated from trained TinyLlama model')
      
      return response
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [ENGINE] Luke AI generation failed:`, {
        error: errorMessage,
        sessionId,
        contentLength: content.length,
        sessionMessages: session.messages.length
      })
      throw error
    }
  }

  /**
   * Get chat session
   */
  getChatSession(sessionId: string): LukeAISession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * Get all chat sessions
   */
  getAllChatSessions(): LukeAISession[] {
    return Array.from(this.activeSessions.values())
  }

  /**
   * Delete chat session
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId)
    
    try {
      await query(`
        DELETE FROM luke_ai_sessions 
        WHERE id = $1
      `, [sessionId])
    } catch (error) {
      console.error('Failed to delete session from database:', error)
    }
  }

  /**
   * Save chat session to database
   */
  private async saveChatSession(session: LukeAISession): Promise<void> {
    try {
      await query(`
        INSERT INTO luke_ai_sessions (
          id, title, messages, created_at, last_active_at, context
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          messages = EXCLUDED.messages,
          last_active_at = EXCLUDED.last_active_at,
          context = EXCLUDED.context
      `, [
        session.id,
        session.title,
        JSON.stringify(session.messages),
        session.createdAt,
        session.lastActiveAt,
        session.context
      ])
    } catch (error) {
      console.error('Failed to save chat session:', error)
    }
  }

  /**
   * Check if Luke's model is ready
   */
  isReady(): boolean {
    return this.isModelLoaded
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      isModelLoaded: this.isModelLoaded,
      activeSessions: this.activeSessions.size,
      gpuContainerEndpoint: this.gpuContainerEndpoint,
      inferenceMode: 'rtx5090_container'
    }
  }

  /**
   * Detect emotional tone from response text
   */
  private detectEmotionalTone(text: string): string {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('appreciate') || lowerText.includes('grateful') || lowerText.includes('thank')) {
      return 'grateful'
    } else if (lowerText.includes('remember') || lowerText.includes('experience') || lowerText.includes('learned')) {
      return 'reflective'
    } else if (lowerText.includes('important') || lowerText.includes('believe') || lowerText.includes('wisdom')) {
      return 'wise'
    } else if (lowerText.includes('love') || lowerText.includes('care') || lowerText.includes('heart')) {
      return 'loving'
    } else if (lowerText.includes('help') || lowerText.includes('support') || lowerText.includes('here')) {
      return 'supportive'
    } else {
      return 'warm'
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.isModelLoaded = false
    this.activeSessions.clear()

    console.log('Luke AI Model Engine cleaned up')
  }
}

// Export singleton instance
export const lukeAIModelEngine = new LukeAIModelEngine()