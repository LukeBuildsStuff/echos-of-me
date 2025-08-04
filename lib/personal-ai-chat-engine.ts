/**
 * Personal AI Chat Engine for Real-Time Inference
 * 
 * Optimized chat system for personal AI models with:
 * - Real-time streaming responses
 * - Context-aware conversations
 * - Personality consistency
 * - Memory management
 * - RTX 5090 optimization
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import { query } from './db'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    responseTime?: number
    confidence?: number
    emotionalTone?: string
    wordCount?: number
  }
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  context: string
  createdAt: Date
  lastActiveAt: Date
  settings: ChatSettings
}

export interface ChatSettings {
  temperature: number
  maxTokens: number
  memoryLength: number // Number of messages to keep in context
  personalityMode: 'standard' | 'nostalgic' | 'wise' | 'conversational'
  responseStyle: 'detailed' | 'concise' | 'adaptive'
  enableEmotionalTone: boolean
  enableVoiceResponse: boolean
}

export interface StreamingResponse {
  sessionId: string
  messageId: string
  content: string
  isComplete: boolean
  metadata: {
    tokensGenerated: number
    responseTime: number
    confidence: number
    emotionalTone: string
  }
}

export interface ModelStatus {
  isLoaded: boolean
  modelPath: string
  memoryUsage: number
  lastUsed: Date
  loadTime: number
  inferenceCount: number
  averageResponseTime: number
}

export class PersonalAIChatEngine extends EventEmitter {
  private loadedModels: Map<string, {
    process: ChildProcess
    status: ModelStatus
    lastActivity: Date
  }> = new Map()
  
  private activeSessions: Map<string, ChatSession> = new Map()
  private streamingResponses: Map<string, NodeJS.Timeout> = new Map()
  private maxLoadedModels = 3
  private sessionTimeout = 30 * 60 * 1000 // 30 minutes

  constructor() {
    super()
    this.setupChatEnvironment()
    this.startSessionCleanup()
  }

  /**
   * Setup chat inference environment
   */
  private async setupChatEnvironment(): Promise<void> {
    try {
      await fs.mkdir('/tmp/ai-chat', { recursive: true })
      await fs.mkdir('/tmp/ai-chat/sessions', { recursive: true })
      await fs.mkdir('/tmp/ai-chat/models', { recursive: true })

      // Create optimized inference script for chat
      const chatInferenceScript = `#!/usr/bin/env python3
"""
Real-Time Personal AI Chat Inference Engine
Optimized for RTX 5090 with streaming support
"""

import torch
import json
import sys
import os
import time
import asyncio
import threading
from datetime import datetime
from queue import Queue, Empty
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    TextIteratorStreamer
)
from peft import PeftModel
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PersonalAIChatInference:
    def __init__(self, model_path: str, user_id: str):
        self.model_path = model_path
        self.user_id = user_id
        self.model = None
        self.tokenizer = None
        self.conversation_history = []
        self.personality_prompt = self.load_personality_prompt()
        self.response_queue = Queue()
        self.setup_rtx5090_inference()
        self.load_model()
        
    def setup_rtx5090_inference(self):
        """Setup RTX 5090 optimized inference environment"""
        os.environ.update({
            'CUDA_VISIBLE_DEVICES': '0',
            'PYTORCH_CUDA_ALLOC_CONF': 'max_split_size_mb:512,expandable_segments:True',
        })
        
        if torch.cuda.is_available():
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            torch.backends.cudnn.benchmark = True
            
            # Enable memory optimization for inference
            torch.cuda.set_memory_fraction(0.8)  # Use 80% for inference, leave room for multiple models
            
        logger.info("RTX 5090 chat inference environment configured")
    
    def load_personality_prompt(self):
        """Load user-specific personality prompt"""
        default_prompt = """You are Luke, sharing your authentic thoughts and experiences with warmth and wisdom. You speak from personal experience, offering insights gained through life's journey. Your responses are genuine, thoughtful, and reflect the values and perspectives that define who you are."""
        
        try:
            # Try to load custom personality prompt
            prompt_path = os.path.join(self.model_path, 'personality_prompt.txt')
            if os.path.exists(prompt_path):
                with open(prompt_path, 'r') as f:
                    return f.read().strip()
        except Exception as e:
            logger.warning(f"Could not load personality prompt: {e}")
            
        return default_prompt
    
    def load_model(self):
        """Load personal AI model for chat inference"""
        try:
            logger.info(f"Loading personal AI model from: {self.model_path}")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Optimized quantization for inference
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )
            
            # Load base model with inference optimizations
            base_model_path = "mistralai/Mistral-7B-Instruct-v0.3"
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_path,
                quantization_config=bnb_config,
                torch_dtype=torch.bfloat16,
                device_map="auto",
                trust_remote_code=True,
                attn_implementation="flash_attention_2" if self.has_flash_attention() else "sdpa",
                use_cache=True  # Enable KV cache for faster inference
            )
            
            # Load LoRA adapter (personal AI fine-tuning)
            self.model = PeftModel.from_pretrained(base_model, self.model_path)
            self.model.eval()
            
            # Optimize for inference
            self.model = torch.compile(self.model, mode="reduce-overhead") if hasattr(torch, 'compile') else self.model
            
            logger.info(f"Personal AI model loaded successfully for user: {self.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def has_flash_attention(self):
        """Check if Flash Attention 2 is available"""
        try:
            import flash_attn
            return True
        except ImportError:
            return False
    
    def generate_streaming_response(self, request: dict):
        """Generate streaming response for real-time chat"""
        try:
            message = request.get('message', '')
            session_context = request.get('context', [])
            settings = request.get('settings', {})
            
            # Build conversation context
            messages = self.build_chat_context(message, session_context, settings)
            
            # Apply chat template
            prompt = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            
            # Tokenize input
            inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=3072)
            inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
            
            # Setup streaming
            streamer = TextIteratorStreamer(
                self.tokenizer,
                skip_prompt=True,
                skip_special_tokens=True,
                timeout=60
            )
            
            # Generation parameters
            generation_kwargs = {
                **inputs,
                'max_new_tokens': settings.get('max_tokens', 256),
                'temperature': settings.get('temperature', 0.7),
                'do_sample': True,
                'top_p': 0.9,
                'top_k': 50,
                'repetition_penalty': 1.05,
                'pad_token_id': self.tokenizer.eos_token_id,
                'eos_token_id': self.tokenizer.eos_token_id,
                'streamer': streamer,
                'use_cache': True
            }
            
            # Start generation in separate thread
            start_time = time.time()
            generation_thread = threading.Thread(
                target=lambda: self.model.generate(**generation_kwargs)
            )
            generation_thread.start()
            
            # Stream response
            response_text = ""
            token_count = 0
            
            for new_text in streamer:
                if new_text:
                    response_text += new_text
                    token_count += 1
                    
                    # Send streaming update
                    stream_data = {
                        'type': 'stream',
                        'content': new_text,
                        'accumulated': response_text,
                        'token_count': token_count,
                        'is_complete': False,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    print(json.dumps(stream_data))
                    sys.stdout.flush()
            
            generation_thread.join()
            response_time = time.time() - start_time
            
            # Analyze response
            emotional_tone = self.analyze_emotional_tone(response_text)
            confidence = self.calculate_confidence_score(response_text, prompt)
            
            # Send completion
            completion_data = {
                'type': 'complete',
                'content': response_text.strip(),
                'token_count': token_count,
                'response_time': response_time,
                'emotional_tone': emotional_tone,
                'confidence': confidence,
                'is_complete': True,
                'timestamp': datetime.now().isoformat()
            }
            
            print(json.dumps(completion_data))
            sys.stdout.flush()
            
        except Exception as e:
            error_data = {
                'type': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            print(json.dumps(error_data))
            sys.stdout.flush()
    
    def build_chat_context(self, current_message: str, session_context: list, settings: dict):
        """Build conversation context with personality"""
        messages = []
        
        # System prompt with personality
        personality_mode = settings.get('personality_mode', 'standard')
        system_prompt = self.get_personality_prompt(personality_mode)
        
        messages.append({
            "role": "system",
            "content": system_prompt
        })
        
        # Add recent conversation history
        memory_length = settings.get('memory_length', 10)
        recent_context = session_context[-memory_length:] if session_context else []
        
        for msg in recent_context:
            messages.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": current_message
        })
        
        return messages
    
    def get_personality_prompt(self, mode: str):
        """Get personality prompt based on mode"""
        base_prompt = self.personality_prompt
        
        mode_additions = {
            'nostalgic': " Share memories and experiences with the warmth of reflection and the wisdom that comes with time.",
            'wise': " Offer thoughtful insights and advice drawn from life experience and deep understanding.",
            'conversational': " Engage in natural, flowing conversation with the comfort of talking to a close friend.",
            'standard': ""
        }
        
        return base_prompt + mode_additions.get(mode, "")
    
    def analyze_emotional_tone(self, text: str):
        """Analyze emotional tone of response"""
        text_lower = text.lower()
        
        tone_indicators = {
            'warm': ['feel', 'heart', 'appreciate', 'grateful', 'care'],
            'nostalgic': ['remember', 'back then', 'used to', 'those days'],
            'wise': ['learn', 'understand', 'experience', 'wisdom', 'important'],
            'joyful': ['happy', 'joy', 'wonderful', 'amazing', 'love'],
            'reflective': ['think', 'consider', 'realize', 'understand'],
            'compassionate': ['sorry', 'understand', 'support', 'help', 'care']
        }
        
        max_score = 0
        dominant_tone = 'warm'
        
        for tone, indicators in tone_indicators.items():
            score = sum(1 for indicator in indicators if indicator in text_lower)
            if score > max_score:
                max_score = score
                dominant_tone = tone
        
        return dominant_tone
    
    def calculate_confidence_score(self, response: str, prompt: str):
        """Calculate confidence score for response"""
        # Simple heuristic-based confidence scoring
        score = 0.7  # Base confidence
        
        # Length factor
        word_count = len(response.split())
        if 20 <= word_count <= 200:
            score += 0.1
        elif word_count > 10:
            score += 0.05
        
        # Personal indicators
        if any(word in response.lower() for word in ['i', 'my', 'me', 'personally']):
            score += 0.1
        
        # Coherence indicators (simple)
        sentences = response.split('.')
        if len(sentences) > 1 and all(len(s.strip()) > 5 for s in sentences[:-1]):
            score += 0.1
        
        return min(1.0, score)

def main():
    if len(sys.argv) < 3:
        print("Usage: python chat_inference.py <model_path> <user_id>")
        sys.exit(1)
    
    model_path = sys.argv[1]
    user_id = sys.argv[2]
    
    try:
        chat_engine = PersonalAIChatInference(model_path, user_id)
        
        # Listen for chat requests
        for line in sys.stdin:
            try:
                request = json.loads(line.strip())
                chat_engine.generate_streaming_response(request)
            except json.JSONDecodeError:
                continue
            except Exception as e:
                error_data = {
                    'type': 'error',
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                print(json.dumps(error_data))
                sys.stdout.flush()
                
    except Exception as e:
        logger.error(f"Chat inference engine failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
`

      await fs.writeFile('/tmp/ai-chat/chat_inference.py', chatInferenceScript)
      await fs.chmod('/tmp/ai-chat/chat_inference.py', 0o755)

      console.log('Personal AI chat environment setup complete')

    } catch (error) {
      console.error('Failed to setup chat environment:', error)
    }
  }

  /**
   * Start or get existing chat session
   */
  async startChatSession(
    userId: string, 
    title?: string, 
    settings?: Partial<ChatSettings>
  ): Promise<ChatSession> {
    const sessionId = crypto.randomUUID()
    
    const defaultSettings: ChatSettings = {
      temperature: 0.7,
      maxTokens: 256,
      memoryLength: 10,
      personalityMode: 'standard',
      responseStyle: 'adaptive',
      enableEmotionalTone: true,
      enableVoiceResponse: false,
      ...settings
    }

    const session: ChatSession = {
      id: sessionId,
      userId,
      title: title || `Chat ${new Date().toLocaleString()}`,
      messages: [],
      context: await this.buildUserContext(userId),
      createdAt: new Date(),
      lastActiveAt: new Date(),
      settings: defaultSettings
    }

    this.activeSessions.set(sessionId, session)

    // Ensure user's model is loaded
    await this.ensureModelLoaded(userId)

    // Save session to database
    await this.saveChatSession(session)

    console.log(`Chat session started for user ${userId}: ${sessionId}`)
    return session
  }

  /**
   * Send message and get streaming response
   */
  async sendMessage(
    sessionId: string, 
    content: string,
    streamCallback?: (chunk: StreamingResponse) => void
  ): Promise<ChatMessage> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`)
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    session.messages.push(userMessage)
    session.lastActiveAt = new Date()

    // Ensure model is loaded
    const modelInfo = this.loadedModels.get(session.userId)
    if (!modelInfo || !modelInfo.process) {
      await this.ensureModelLoaded(session.userId)
    }

    // Generate response
    const assistantMessage = await this.generateStreamingResponse(
      session,
      content,
      streamCallback
    )

    session.messages.push(assistantMessage)

    // Update session in database
    await this.saveChatSession(session)

    this.emit('messageReceived', { session, userMessage, assistantMessage })

    return assistantMessage
  }

  /**
   * Generate streaming response
   */
  private async generateStreamingResponse(
    session: ChatSession,
    message: string,
    streamCallback?: (chunk: StreamingResponse) => void
  ): Promise<ChatMessage> {
    const modelInfo = this.loadedModels.get(session.userId)
    if (!modelInfo || !modelInfo.process) {
      throw new Error(`Model not loaded for user ${session.userId}`)
    }

    const messageId = crypto.randomUUID()
    const startTime = Date.now()

    // Prepare chat request
    const chatRequest = {
      message,
      context: session.messages.slice(-session.settings.memoryLength * 2), // Recent context
      settings: session.settings,
      session_id: session.id,
      message_id: messageId
    }

    // Send request to inference process
    const requestLine = JSON.stringify(chatRequest) + '\n'
    modelInfo.process.stdin?.write(requestLine)

    // Collect streaming response
    let accumulatedContent = ''
    let tokenCount = 0
    let emotionalTone = 'warm'
    let confidence = 0.8

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout'))
      }, 60000) // 60 second timeout

      const dataHandler = (data: Buffer) => {
        const lines = data.toString().split('\n')
        
        for (const line of lines) {
          if (!line.trim()) continue
          
          try {
            const response = JSON.parse(line.trim())
            
            if (response.type === 'stream') {
              accumulatedContent = response.accumulated || accumulatedContent
              tokenCount = response.token_count || tokenCount
              
              // Send streaming update
              if (streamCallback) {
                const streamChunk: StreamingResponse = {
                  sessionId: session.id,
                  messageId,
                  content: response.content || '',
                  isComplete: false,
                  metadata: {
                    tokensGenerated: tokenCount,
                    responseTime: Date.now() - startTime,
                    confidence: 0.8,
                    emotionalTone: 'warm'
                  }
                }
                streamCallback(streamChunk)
              }
              
            } else if (response.type === 'complete') {
              clearTimeout(timeout)
              modelInfo.process.stdout?.off('data', dataHandler)
              
              accumulatedContent = response.content || accumulatedContent
              tokenCount = response.token_count || tokenCount
              emotionalTone = response.emotional_tone || emotionalTone
              confidence = response.confidence || confidence
              
              const responseTime = Date.now() - startTime
              
              // Create assistant message
              const assistantMessage: ChatMessage = {
                id: messageId,
                role: 'assistant',
                content: accumulatedContent.trim(),
                timestamp: new Date(),
                metadata: {
                  responseTime,
                  confidence,
                  emotionalTone,
                  wordCount: accumulatedContent.split(' ').length
                }
              }
              
              // Update model stats
              modelInfo.status.inferenceCount++
              modelInfo.status.lastUsed = new Date()
              modelInfo.lastActivity = new Date()
              
              // Calculate running average response time
              modelInfo.status.averageResponseTime = 
                (modelInfo.status.averageResponseTime * (modelInfo.status.inferenceCount - 1) + responseTime) / 
                modelInfo.status.inferenceCount
              
              // Send final streaming update
              if (streamCallback) {
                const finalChunk: StreamingResponse = {
                  sessionId: session.id,
                  messageId,
                  content: assistantMessage.content,
                  isComplete: true,
                  metadata: {
                    tokensGenerated: tokenCount,
                    responseTime,
                    confidence,
                    emotionalTone
                  }
                }
                streamCallback(finalChunk)
              }
              
              resolve(assistantMessage)
              
            } else if (response.type === 'error') {
              clearTimeout(timeout)
              modelInfo.process.stdout?.off('data', dataHandler)
              reject(new Error(response.error || 'Generation failed'))
            }
            
          } catch (parseError) {
            // Ignore parsing errors for partial data
          }
        }
      }

      modelInfo.process.stdout?.on('data', dataHandler)
    })
  }

  /**
   * Ensure user's model is loaded for inference
   */
  private async ensureModelLoaded(userId: string): Promise<void> {
    if (this.loadedModels.has(userId)) {
      const modelInfo = this.loadedModels.get(userId)!
      modelInfo.lastActivity = new Date()
      return
    }

    // Check if we need to unload a model
    if (this.loadedModels.size >= this.maxLoadedModels) {
      await this.unloadOldestModel()
    }

    // Find user's model
    const modelPath = await this.findUserModel(userId)
    if (!modelPath) {
      throw new Error(`No trained model found for user ${userId}`)
    }

    // Load model
    await this.loadUserModel(userId, modelPath)
  }

  /**
   * Load user's model for inference
   */
  private async loadUserModel(userId: string, modelPath: string): Promise<void> {
    const startTime = Date.now()
    
    console.log(`Loading model for user ${userId}: ${modelPath}`)

    // Start inference process
    const inferenceProcess = spawn('python3', [
      '/tmp/ai-chat/chat_inference.py',
      modelPath,
      userId
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Handle errors
    inferenceProcess.on('error', (error) => {
      console.error(`Model loading failed for ${userId}:`, error)
      this.loadedModels.delete(userId)
    })

    inferenceProcess.stderr?.on('data', (data) => {
      console.error(`Model ${userId} stderr:`, data.toString())
    })

    // Wait for model to load
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Model loading timeout'))
      }, 300000) // 5 minute timeout

      inferenceProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        if (output.includes('Personal AI model loaded successfully')) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    const loadTime = Date.now() - startTime

    // Create model info
    const modelInfo = {
      process: inferenceProcess,
      status: {
        isLoaded: true,
        modelPath,
        memoryUsage: 6, // Estimated 6GB for 4-bit Mistral-7B + LoRA
        lastUsed: new Date(),
        loadTime,
        inferenceCount: 0,
        averageResponseTime: 0
      },
      lastActivity: new Date()
    }

    this.loadedModels.set(userId, modelInfo)
    console.log(`Model loaded for user ${userId} in ${loadTime}ms`)
  }

  /**
   * Find user's model path
   */
  private async findUserModel(userId: string): Promise<string | null> {
    try {
      const result = await query(`
        SELECT model_path 
        FROM users 
        WHERE id = $1 AND model_path IS NOT NULL
      `, [userId])

      if (result.rows.length === 0) {
        // Try finding in training runs
        const trainingResult = await query(`
          SELECT model_path 
          FROM training_runs 
          WHERE user_id = $1 AND status = 'completed' AND model_path IS NOT NULL
          ORDER BY completed_at DESC 
          LIMIT 1
        `, [userId])

        return trainingResult.rows[0]?.model_path || null
      }

      return result.rows[0].model_path
    } catch (error) {
      console.error(`Failed to find model for user ${userId}:`, error)
      return null
    }
  }

  /**
   * Build user context for personality
   */
  private async buildUserContext(userId: string): Promise<string> {
    try {
      // Get user's recent responses for context
      const result = await query(`
        SELECT response_text, q.category 
        FROM user_responses ur
        JOIN questions q ON ur.question_id = q.id
        WHERE ur.user_id = $1 
        ORDER BY ur.created_at DESC 
        LIMIT 5
      `, [userId])

      if (result.rows.length === 0) {
        return "You are sharing your authentic thoughts and experiences with warmth and wisdom."
      }

      const categories = [...new Set(result.rows.map(r => r.category))].slice(0, 3)
      return `You are sharing your authentic experiences about ${categories.join(', ')}, speaking with personal insight and genuine care.`

    } catch (error) {
      console.error('Failed to build user context:', error)
      return "You are sharing your authentic thoughts and experiences with warmth and wisdom."
    }
  }

  /**
   * Unload oldest model to free memory
   */
  private async unloadOldestModel(): Promise<void> {
    let oldestUserId: string | null = null
    let oldestTime = new Date()

    for (const [userId, modelInfo] of this.loadedModels.entries()) {
      if (modelInfo.lastActivity < oldestTime) {
        oldestTime = modelInfo.lastActivity
        oldestUserId = userId
      }
    }

    if (oldestUserId) {
      await this.unloadUserModel(oldestUserId)
    }
  }

  /**
   * Unload user's model
   */
  async unloadUserModel(userId: string): Promise<void> {
    const modelInfo = this.loadedModels.get(userId)
    if (!modelInfo) return

    try {
      modelInfo.process.kill('SIGTERM')
      this.loadedModels.delete(userId)
      console.log(`Model unloaded for user: ${userId}`)
    } catch (error) {
      console.error(`Failed to unload model for ${userId}:`, error)
    }
  }

  /**
   * Get chat session
   */
  getChatSession(sessionId: string): ChatSession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * Get user's chat sessions
   */
  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    const result = await query(`
      SELECT * FROM chat_sessions 
      WHERE user_id = $1 
      ORDER BY last_active_at DESC 
      LIMIT 20
    `, [userId])

    return result.rows.map(row => ({
      ...row,
      messages: JSON.parse(row.messages || '[]'),
      settings: JSON.parse(row.settings || '{}')
    }))
  }

  /**
   * Update chat session settings
   */
  async updateChatSettings(sessionId: string, settings: Partial<ChatSettings>): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`)
    }

    session.settings = { ...session.settings, ...settings }
    await this.saveChatSession(session)
  }

  /**
   * Delete chat session
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    this.activeSessions.delete(sessionId)
    
    await query(`
      DELETE FROM chat_sessions 
      WHERE id = $1
    `, [sessionId])
  }

  /**
   * Save chat session to database
   */
  private async saveChatSession(session: ChatSession): Promise<void> {
    try {
      await query(`
        INSERT INTO chat_sessions (
          id, user_id, title, messages, context, created_at, last_active_at, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          messages = EXCLUDED.messages,
          last_active_at = EXCLUDED.last_active_at,
          settings = EXCLUDED.settings
      `, [
        session.id,
        session.userId,
        session.title,
        JSON.stringify(session.messages),
        session.context,
        session.createdAt,
        session.lastActiveAt,
        JSON.stringify(session.settings)
      ])
    } catch (error) {
      console.error('Failed to save chat session:', error)
    }
  }

  /**
   * Start periodic session cleanup
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now - session.lastActiveAt.getTime() > this.sessionTimeout) {
          this.activeSessions.delete(sessionId)
          console.log(`Cleaned up inactive session: ${sessionId}`)
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes
  }

  /**
   * Get engine statistics
   */
  getEngineStats() {
    return {
      loadedModels: this.loadedModels.size,
      activeSessions: this.activeSessions.size,
      totalInferences: Array.from(this.loadedModels.values())
        .reduce((sum, model) => sum + model.status.inferenceCount, 0),
      averageResponseTime: Array.from(this.loadedModels.values())
        .reduce((sum, model) => sum + model.status.averageResponseTime, 0) / this.loadedModels.size || 0,
      totalMemoryUsage: Array.from(this.loadedModels.values())
        .reduce((sum, model) => sum + model.status.memoryUsage, 0)
    }
  }

  /**
   * Get model status for user
   */
  getUserModelStatus(userId: string): ModelStatus | null {
    const modelInfo = this.loadedModels.get(userId)
    return modelInfo ? modelInfo.status : null
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    // Unload all models
    const userIds = Array.from(this.loadedModels.keys())
    for (const userId of userIds) {
      await this.unloadUserModel(userId)
    }

    // Clear active sessions
    this.activeSessions.clear()

    console.log('Personal AI Chat Engine cleaned up')
  }
}

// Export singleton instance
export const personalAIChatEngine = new PersonalAIChatEngine()