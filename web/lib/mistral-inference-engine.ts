/**
 * Mistral Inference Engine for Family Legacy AI Models
 * 
 * Optimized inference system for deployed Mistral-7B family legacy models
 * Supports voice integration, context management, and RTX 5090 optimization
 */

import { query } from './db'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import { rtx5090MemoryManager } from './rtx5090-memory-manager'
import { inferenceErrorHandler } from './inference-error-handler'

export interface InferenceRequest {
  modelId: string
  userId: string
  query: string
  context?: string
  maxTokens?: number
  temperature?: number
  includeVoice?: boolean
  conversationHistory?: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface InferenceResponse {
  id: string
  response: string
  tokenCount: number
  responseTime: number
  confidence: number
  emotionalTone?: string
  voiceSynthesis?: {
    audioUrl: string
    duration: number
    quality: number
  }
  metadata: {
    modelVersion: string
    userId: string
    timestamp: Date
  }
}

export interface ModelDeployment {
  id: string
  userId: string
  modelPath: string
  modelVersion: string
  status: 'loading' | 'ready' | 'error' | 'unloaded'
  loadedAt?: Date
  memoryUsage: number // GB
  inferenceCount: number
  lastUsed: Date
}

export class MistralInferenceEngine {
  private loadedModels: Map<string, ModelDeployment> = new Map()
  private inferenceProcesses: Map<string, ChildProcess> = new Map()
  private maxLoadedModels: number = 3 // RTX 5090 can handle multiple models
  private conversationContexts: Map<string, ConversationMessage[]> = new Map()
  private modelQueue: Map<string, Promise<string>> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.setupInferenceEnvironment()
    this.startHealthMonitoring()
  }

  /**
   * Setup inference environment
   */
  private async setupInferenceEnvironment() {
    try {
      await fs.mkdir('/tmp/ai-inference', { recursive: true })
      await fs.mkdir('/tmp/ai-inference/models', { recursive: true })
      await fs.mkdir('/tmp/ai-inference/scripts', { recursive: true })
      await fs.mkdir('/tmp/ai-inference/cache', { recursive: true })

      // Create inference server script
      const inferenceScript = `#!/usr/bin/env python3
"""
RTX 5090 Optimized Mistral Inference Server
"""

import torch
import json
import sys
import os
from datetime import datetime
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    BitsAndBytesConfig,
    TextStreamer
)
from peft import PeftModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MistralFamilyInference:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.tokenizer = None
        self.setup_rtx5090_inference()
        self.load_model()
    
    def setup_rtx5090_inference(self):
        """Setup RTX 5090 optimized inference"""
        
        # RTX 5090 inference optimizations
        os.environ.update({
            'CUDA_VISIBLE_DEVICES': '0',
            'PYTORCH_CUDA_ALLOC_CONF': 'max_split_size_mb:1024,expandable_segments:True',
            'TORCH_CUDNN_V8_API_ENABLED': '1',
        })
        
        if torch.cuda.is_available():
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            torch.backends.cudnn.benchmark = True
            
            capability = torch.cuda.get_device_capability(0)
            logger.info(f"RTX 5090 sm_{capability[0]}{capability[1]} inference ready")
    
    def load_model(self):
        """Load trained Mistral family model"""
        try:
            logger.info(f"Loading family model from: {self.model_path}")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Configure for inference optimization
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )
            
            # Load base model
            base_model = AutoModelForCausalLM.from_pretrained(
                "mistralai/Mistral-7B-Instruct-v0.3",
                quantization_config=bnb_config,
                torch_dtype=torch.bfloat16,
                device_map="auto",
                trust_remote_code=True,
                attn_implementation="flash_attention_2" if self.has_flash_attention() else "sdpa"
            )
            
            # Load LoRA adapter
            self.model = PeftModel.from_pretrained(base_model, self.model_path)
            self.model.eval()
            
            logger.info("Family model loaded successfully")
            
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
    
    def generate_family_response(self, request: dict) -> dict:
        """Generate family legacy response"""
        try:
            query = request.get('query', '')
            context = request.get('context', '')
            max_tokens = request.get('max_tokens', 256)
            temperature = request.get('temperature', 0.7)
            conversation_history = request.get('conversation_history', [])
            
            # Build family conversation context
            messages = self.build_family_conversation(query, context, conversation_history)
            
            # Apply chat template
            prompt = self.tokenizer.apply_chat_template(
                messages, 
                tokenize=False, 
                add_generation_prompt=True
            )
            
            # Tokenize
            inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=4096)
            inputs = {k: v.to(self.model.device) for k, v in inputs.items()}
            
            # Generate response
            start_time = datetime.now()
            
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    do_sample=True,
                    top_p=0.9,
                    top_k=50,
                    repetition_penalty=1.1,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    use_cache=True
                )
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Decode response
            response_tokens = outputs[0][inputs['input_ids'].shape[1]:]
            response_text = self.tokenizer.decode(response_tokens, skip_special_tokens=True)
            
            # Analyze response
            emotional_tone = self.analyze_emotional_tone(response_text)
            confidence = self.calculate_confidence(outputs[0], response_tokens)
            
            return {
                'response': response_text.strip(),
                'token_count': len(response_tokens),
                'response_time': response_time,
                'confidence': confidence,
                'emotional_tone': emotional_tone,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def build_family_conversation(self, query: str, context: str, history: list) -> list:
        """Build family conversation with proper context"""
        
        messages = []
        
        # System message for family context
        system_message = "You are a wise family member sharing precious memories, life lessons, and personal experiences for future generations. You speak with warmth, authenticity, and the depth that comes from a life well-lived."
        
        if context:
            system_message += f" {context}"
        
        messages.append({
            "role": "system",
            "content": system_message
        })
        
        # Add conversation history (keep last 6 messages for context)
        if history:
            for msg in history[-6:]:
                messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })
        
        # Add current query
        messages.append({
            "role": "user",
            "content": query
        })
        
        return messages
    
    def analyze_emotional_tone(self, text: str) -> str:
        """Analyze emotional tone of response"""
        text_lower = text.lower()
        
        # Family-specific emotional tone analysis
        if any(word in text_lower for word in ['love', 'proud', 'joy', 'happy', 'wonderful']):
            return 'loving'
        elif any(word in text_lower for word in ['remember', 'back then', 'those days', 'miss']):
            return 'nostalgic'
        elif any(word in text_lower for word in ['learn', 'important', 'advice', 'wisdom']):
            return 'wise'
        elif any(word in text_lower for word in ['difficult', 'hard', 'challenge', 'struggle']):
            return 'reflective'
        else:
            return 'warm'
    
    def calculate_confidence(self, logits, response_tokens) -> float:
        """Calculate response confidence"""
        # Simple confidence calculation based on token probabilities
        if len(response_tokens) == 0:
            return 0.0
        
        # This is a simplified confidence calculation
        # In a real implementation, you'd analyze the logits more thoroughly
        return min(0.95, 0.7 + (len(response_tokens) / 100) * 0.2)

def main():
    if len(sys.argv) < 2:
        print("Usage: python inference.py <model_path>")
        sys.exit(1)
    
    model_path = sys.argv[1]
    
    try:
        inference_engine = MistralFamilyInference(model_path)
        
        # Listen for inference requests
        for line in sys.stdin:
            try:
                request = json.loads(line.strip())
                result = inference_engine.generate_family_response(request)
                print(json.dumps(result))
                sys.stdout.flush()
            except json.JSONDecodeError:
                continue
            except Exception as e:
                error_result = {
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                print(json.dumps(error_result))
                sys.stdout.flush()
                
    except Exception as e:
        logger.error(f"Inference engine failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
`

      await fs.writeFile('/tmp/ai-inference/scripts/mistral_inference.py', inferenceScript)
      await fs.chmod('/tmp/ai-inference/scripts/mistral_inference.py', 0o755)

      console.log('Mistral inference environment setup complete')

    } catch (error) {
      console.error('Failed to setup inference environment:', error)
    }
  }

  /**
   * Deploy model for inference
   */
  async deployModel(userId: string, modelPath: string, modelVersion: string): Promise<string> {
    const deploymentId = crypto.randomUUID()
    
    try {
      // Estimate model size (Mistral-7B with LoRA typically uses ~4GB)
      const estimatedModelSize = 4 // GB
      
      // Check memory availability
      const memoryAllocated = await rtx5090MemoryManager.allocateMemory(
        deploymentId,
        userId,
        estimatedModelSize,
        'medium'
      )
      
      if (!memoryAllocated) {
        throw new Error(`Insufficient VRAM for model deployment (${estimatedModelSize}GB required)`)
      }

      // Check if we need to unload a model due to deployment constraints
      if (this.loadedModels.size >= this.maxLoadedModels) {
        await this.unloadLeastUsedModel()
      }

      const deployment: ModelDeployment = {
        id: deploymentId,
        userId,
        modelPath,
        modelVersion,
        status: 'loading',
        memoryUsage: estimatedModelSize,
        inferenceCount: 0,
        lastUsed: new Date()
      }

      this.loadedModels.set(deploymentId, deployment)

      // Start inference process
      const inferenceProcess = spawn('python3', [
        '/tmp/ai-inference/scripts/mistral_inference.py',
        modelPath
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // Handle process events
      inferenceProcess.on('error', (error) => {
        console.error(`Inference process failed for ${deploymentId}:`, error)
        deployment.status = 'error'
      })

      inferenceProcess.stderr?.on('data', (data) => {
        console.error(`Inference process [${deploymentId}]:`, data.toString())
      })

      // Wait for model to load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Model loading timeout'))
        }, 300000) // 5 minute timeout

        inferenceProcess.stdout?.on('data', (data) => {
          const output = data.toString()
          if (output.includes('Family model loaded successfully')) {
            clearTimeout(timeout)
            deployment.status = 'ready'
            deployment.loadedAt = new Date()
            resolve(true)
          }
        })
      })

      this.inferenceProcesses.set(deploymentId, inferenceProcess)

      // Store deployment in database
      await query(`
        INSERT INTO model_deployments (
          id, user_id, model_path, model_version, status, 
          deployed_at, memory_usage_gb
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        deploymentId,
        userId,
        modelPath,
        modelVersion,
        'ready',
        new Date(),
        4 // Estimated 4GB for LoRA model
      ])

      console.log(`Model deployed successfully: ${deploymentId}`)
      return deploymentId

    } catch (error) {
      console.error(`Failed to deploy model for user ${userId}:`, error)
      
      // Clean up partial deployment
      this.loadedModels.delete(deploymentId)
      rtx5090MemoryManager.deallocateMemory(deploymentId)
      
      // Create and handle deployment error
      const deploymentError = inferenceErrorHandler.createError(
        deploymentId,
        userId,
        error,
        0,
        { modelPath, modelVersion }
      )
      
      // Don't attempt automatic recovery for deployment errors
      // They typically require manual intervention
      inferenceErrorHandler.getErrorHistory(deploymentId).push(deploymentError)
      
      throw error
    }
  }

  /**
   * Start health monitoring for deployed models
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Perform health check on all deployed models
   */
  private async performHealthCheck() {
    for (const [deploymentId, deployment] of this.loadedModels.entries()) {
      if (deployment.status === 'ready') {
        const process = this.inferenceProcesses.get(deploymentId)
        if (!process || process.killed) {
          console.warn(`Model ${deploymentId} process died, marking as error`)
          deployment.status = 'error'
          this.inferenceProcesses.delete(deploymentId)
          
          // Create process error
          const processError = inferenceErrorHandler.createError(
            deploymentId,
            deployment.userId,
            new Error('Inference process died unexpectedly'),
            0,
            { healthCheck: true }
          )
          
          // Attempt automatic recovery
          inferenceErrorHandler.handleError(processError)
        }
        
        // Check error history to determine if deployment is healthy
        const isHealthy = inferenceErrorHandler.isDeploymentHealthy(deploymentId)
        if (!isHealthy && deployment.status === 'ready') {
          console.warn(`Model ${deploymentId} marked as degraded due to error history`)
          deployment.status = 'error'
        }
      }
    }
    
    // Optimize memory if needed
    const memoryStats = rtx5090MemoryManager.getMemoryStats()
    if (memoryStats.utilizationPercent > 90 || memoryStats.fragmentationRatio > 0.5) {
      await rtx5090MemoryManager.optimizeMemory()
    }
  }

  /**
   * Add conversation context for user
   */
  addConversationContext(userId: string, message: ConversationMessage) {
    if (!this.conversationContexts.has(userId)) {
      this.conversationContexts.set(userId, [])
    }
    
    const context = this.conversationContexts.get(userId)!
    context.push(message)
    
    // Keep only last 10 messages for context efficiency
    if (context.length > 10) {
      context.splice(0, context.length - 10)
    }
  }

  /**
   * Get conversation context for user
   */
  getConversationContext(userId: string): ConversationMessage[] {
    return this.conversationContexts.get(userId) || []
  }

  /**
   * Clear conversation context for user
   */
  clearConversationContext(userId: string) {
    this.conversationContexts.delete(userId)
  }

  /**
   * Generate inference response
   */
  async generateResponse(request: InferenceRequest): Promise<InferenceResponse> {
    const { modelId, userId, query, context, maxTokens = 256, temperature = 0.7, includeVoice = false, conversationHistory = [] } = request
    
    try {
      // Add current user message to conversation context
      this.addConversationContext(userId, {
        role: 'user',
        content: query,
        timestamp: new Date()
      })

      // Get or deploy user's preferred model
      let deploymentId = modelId
      if (!deploymentId || !this.loadedModels.has(deploymentId)) {
        deploymentId = await this.getOrDeployUserModel(userId)
      }

      const deployment = this.loadedModels.get(deploymentId)
      if (!deployment || deployment.status !== 'ready') {
        throw new Error(`Model ${deploymentId} not ready for inference`)
      }

      const inferenceProcess = this.inferenceProcesses.get(deploymentId)
      if (!inferenceProcess) {
        throw new Error(`Inference process not found for model ${deploymentId}`)
      }

      // Update last used time and memory access
      deployment.lastUsed = new Date()
      deployment.inferenceCount++
      rtx5090MemoryManager.updateLastAccessed(deploymentId)

      // Build comprehensive conversation context
      const contextHistory = this.getConversationContext(userId)
      const allHistory = [...conversationHistory, ...contextHistory]

      // Prepare inference request with rich context
      const inferenceRequest = {
        query,
        context: context || this.buildFamilyContext(userId),
        max_tokens: maxTokens,
        temperature,
        conversation_history: allHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        user_id: userId,
        model_metadata: {
          deployment_id: deploymentId,
          model_version: deployment.modelVersion
        }
      }

      // Send request to inference process with retry logic
      const response = await this.performInferenceWithRetry(inferenceProcess, inferenceRequest, deploymentId)

      if (response.error) {
        throw new Error(response.error)
      }

      // Add AI response to conversation context
      this.addConversationContext(userId, {
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      })

      // Generate voice synthesis if requested
      let voiceSynthesis
      if (includeVoice) {
        try {
          voiceSynthesis = await this.generateVoiceSynthesis(userId, response.response)
        } catch (voiceError) {
          console.error('Voice synthesis failed:', voiceError)
          // Continue without voice if synthesis fails
        }
      }

      const inferenceResponse: InferenceResponse = {
        id: crypto.randomUUID(),
        response: response.response,
        tokenCount: response.token_count || response.response.length / 4, // Estimate if not provided
        responseTime: response.response_time || 1.0,
        confidence: response.confidence || 0.8,
        emotionalTone: response.emotional_tone || 'warm',
        voiceSynthesis,
        metadata: {
          modelVersion: deployment.modelVersion,
          userId,
          timestamp: new Date()
        }
      }

      // Log inference
      await this.logInference(inferenceResponse)

      return inferenceResponse

    } catch (error) {
      // Create structured error
      const inferenceError = inferenceErrorHandler.createError(
        deploymentId || 'unknown',
        userId,
        error,
        0,
        { query, maxTokens, temperature }
      )
      
      // Attempt recovery
      const recovered = await inferenceErrorHandler.handleError(inferenceError)
      
      if (recovered) {
        // Retry the inference once after recovery
        try {
          return await this.generateResponse({
            ...request,
            modelId: deploymentId || ''
          })
        } catch (retryError) {
          console.error(`Inference retry failed for user ${userId}:`, retryError)
          throw retryError
        }
      }
      
      console.error(`Inference failed for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Get or deploy user's preferred model
   */
  private async getOrDeployUserModel(userId: string): Promise<string> {
    // Check if there's already a queued deployment for this user
    const queueKey = `user_${userId}`
    if (this.modelQueue.has(queueKey)) {
      return await this.modelQueue.get(queueKey)!
    }

    // Create deployment promise
    const deploymentPromise = this.findAndDeployUserModel(userId)
    this.modelQueue.set(queueKey, deploymentPromise)

    try {
      const deploymentId = await deploymentPromise
      this.modelQueue.delete(queueKey)
      return deploymentId
    } catch (error) {
      this.modelQueue.delete(queueKey)
      throw error
    }
  }

  /**
   * Find and deploy user's best available model
   */
  private async findAndDeployUserModel(userId: string): Promise<string> {
    try {
      // Get user's trained models from database
      const modelResult = await query(`
        SELECT 
          mv.id, mv.version, mv.checkpoint_path, mv.base_model,
          mv.performance, mv.is_active, mv.trained_at
        FROM model_versions mv
        WHERE mv.user_id = $1 AND mv.status = 'completed'
        ORDER BY mv.is_active DESC, mv.version DESC, mv.trained_at DESC
        LIMIT 1
      `, [userId])

      if (modelResult.rows.length === 0) {
        throw new Error(`No trained models found for user ${userId}`)
      }

      const model = modelResult.rows[0]
      
      // Deploy the model
      return await this.deployModel(userId, model.checkpoint_path, model.version.toString())

    } catch (error) {
      console.error(`Failed to find/deploy model for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Build family context for inference
   */
  private buildFamilyContext(userId: string): string {
    return `You are a wise family member sharing precious memories, life lessons, and personal experiences for future generations. You speak with warmth, authenticity, and the depth that comes from a life well-lived. Your responses capture not just facts, but the emotions, wisdom, and love that define your family legacy.`
  }

  /**
   * Perform inference with retry logic
   */
  private async performInferenceWithRetry(
    process: ChildProcess, 
    request: any, 
    deploymentId: string,
    maxRetries: number = 2
  ): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Send request to inference process
        const requestLine = JSON.stringify(request) + '\n'
        process.stdin?.write(requestLine)

        // Wait for response with progressive timeout
        const timeout = 30000 + (attempt * 10000) // 30s, 40s, 50s
        const response = await new Promise<any>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`Inference timeout after ${timeout}ms (attempt ${attempt + 1})`))
          }, timeout)

          const dataHandler = (data: Buffer) => {
            try {
              const lines = data.toString().split('\n')
              for (const line of lines) {
                if (line.trim()) {
                  const result = JSON.parse(line.trim())
                  clearTimeout(timeoutId)
                  process.stdout?.off('data', dataHandler)
                  resolve(result)
                  return
                }
              }
            } catch (e) {
              // Might be partial data, continue listening
            }
          }

          process.stdout?.on('data', dataHandler)
        })

        return response

      } catch (error) {
        console.warn(`Inference attempt ${attempt + 1} failed for ${deploymentId}:`, error)
        
        if (attempt === maxRetries) {
          throw error
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  /**
   * Generate voice synthesis for response
   */
  private async generateVoiceSynthesis(userId: string, text: string): Promise<any> {
    try {
      // Call the voice synthesis API
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.substring(0, 500), // Limit text length for performance
          userId,
          voiceId: 'latest',
          timeout: 20000
        })
      })

      if (!response.ok) {
        throw new Error(`Voice synthesis failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.audioUrl) {
        return {
          audioUrl: data.audioUrl,
          duration: data.duration || text.length * 0.1,
          quality: data.quality || 0.9
        }
      } else {
        throw new Error(data.error || 'Voice synthesis failed')
      }

    } catch (error) {
      console.error('Voice synthesis error:', error)
      
      // Return fallback response
      return {
        audioUrl: null,
        duration: 0,
        quality: 0,
        error: error instanceof Error ? error.message : 'Voice synthesis unavailable'
      }
    }
  }

  /**
   * Log inference for analytics
   */
  private async logInference(response: InferenceResponse) {
    try {
      await query(`
        INSERT INTO inference_logs (
          id, user_id, model_version, query_length, response_length,
          response_time_ms, confidence_score, emotional_tone, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        response.id,
        response.metadata.userId,
        response.metadata.modelVersion,
        0, // Would track query length
        response.response.length,
        response.responseTime * 1000,
        response.confidence,
        response.emotionalTone,
        response.metadata.timestamp
      ])
    } catch (error) {
      console.error('Failed to log inference:', error)
    }
  }

  /**
   * Unload least recently used model
   */
  private async unloadLeastUsedModel() {
    let oldestModel: string | null = null
    let oldestTime = new Date()

    for (const [deploymentId, deployment] of this.loadedModels.entries()) {
      if (deployment.lastUsed < oldestTime) {
        oldestTime = deployment.lastUsed
        oldestModel = deploymentId
      }
    }

    if (oldestModel) {
      await this.unloadModel(oldestModel)
    }
  }

  /**
   * Unload model from memory
   */
  async unloadModel(deploymentId: string): Promise<void> {
    try {
      const deployment = this.loadedModels.get(deploymentId)
      if (!deployment) return

      const process = this.inferenceProcesses.get(deploymentId)
      if (process) {
        process.kill('SIGTERM')
        this.inferenceProcesses.delete(deploymentId)
      }

      // Free memory allocation
      rtx5090MemoryManager.deallocateMemory(deploymentId)

      this.loadedModels.delete(deploymentId)

      // Update database
      await query(`
        UPDATE model_deployments 
        SET status = 'unloaded', unloaded_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [deploymentId])

      console.log(`Model unloaded: ${deploymentId}`)

    } catch (error) {
      console.error(`Failed to unload model ${deploymentId}:`, error)
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<ModelDeployment | null> {
    return this.loadedModels.get(deploymentId) || null
  }

  /**
   * List user deployments
   */
  async getUserDeployments(userId: string): Promise<ModelDeployment[]> {
    const deployments = Array.from(this.loadedModels.values())
    return deployments.filter(d => d.userId === userId)
  }

  /**
   * Get engine statistics
   */
  getEngineStats() {
    const memoryStats = rtx5090MemoryManager.getMemoryStats()
    
    return {
      loadedModels: this.loadedModels.size,
      maxLoadedModels: this.maxLoadedModels,
      activeInferences: Array.from(this.loadedModels.values()).reduce((sum, d) => sum + d.inferenceCount, 0),
      totalMemoryUsage: Array.from(this.loadedModels.values()).reduce((sum, d) => sum + d.memoryUsage, 0),
      conversationContexts: this.conversationContexts.size,
      modelsInQueue: this.modelQueue.size,
      memoryStats: {
        totalVRAM: memoryStats.totalVRAM,
        allocatedVRAM: memoryStats.allocatedVRAM,
        availableVRAM: memoryStats.availableVRAM,
        utilizationPercent: memoryStats.utilizationPercent,
        fragmentationRatio: memoryStats.fragmentationRatio,
        cacheHitRatio: memoryStats.cacheHitRatio,
        activeAllocations: memoryStats.activeAllocations
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    // Unload all models
    const deploymentIds = Array.from(this.loadedModels.keys())
    for (const deploymentId of deploymentIds) {
      await this.unloadModel(deploymentId)
    }

    // Clear conversation contexts
    this.conversationContexts.clear()
    this.modelQueue.clear()

    console.log('Mistral inference engine cleaned up')
  }
}

// Export singleton instance
export const mistralInferenceEngine = new MistralInferenceEngine()