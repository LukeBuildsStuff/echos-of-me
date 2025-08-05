/**
 * Voice-LLM Integration Pipeline
 * 
 * Connects voice cloning output with LLM training and inference
 * Provides seamless integration between user voice and AI personality
 */

import { query } from './db'
import { trainingEngine } from './training-engine'
import { TrainingJob, TrainingExample, defaultTrainingConfig } from './ai-training-config'
import { promises as fs } from 'fs'
import { join } from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'

export interface VoiceProfile {
  userId: string
  voiceId: string
  passages: VoicePassage[]
  isComplete: boolean
  qualityScore: number
  createdAt: Date
  lastTrainingAt?: Date
  modelPath?: string
}

export interface VoicePassage {
  id: string
  title: string
  audioPath: string
  transcript: string
  duration: number
  quality: VoiceQuality
  phoneticFocus: string
  emotionalContent: string[]
  processingStatus: 'pending' | 'processed' | 'integrated'
}

export interface VoiceQuality {
  overall: number
  clarity: number
  consistency: number
  emotionalRange: number
  phoneticDiversity: number
}

export interface VoiceLLMTrainingConfig {
  userId: string
  voiceProfile: VoiceProfile
  llmConfig: typeof defaultTrainingConfig
  integrationSettings: {
    voiceWeight: number
    textWeight: number
    emotionalAlignment: boolean
    personalityConsistency: boolean
  }
}

export class VoiceLLMIntegrator {
  private static instance: VoiceLLMIntegrator
  private activeIntegrations: Map<string, VoiceLLMTrainingConfig> = new Map()

  static getInstance(): VoiceLLMIntegrator {
    if (!VoiceLLMIntegrator.instance) {
      VoiceLLMIntegrator.instance = new VoiceLLMIntegrator()
    }
    return VoiceLLMIntegrator.instance
  }

  /**
   * Main integration function: Process completed voice clone and trigger LLM training
   */
  async integrateVoiceWithLLM(userId: string, voiceId: string): Promise<{
    success: boolean
    trainingJobId?: string
    message: string
    estimatedCompletion?: Date
  }> {
    try {
      console.log(`Starting Voice-LLM integration for user: ${userId}, voice: ${voiceId}`)

      // 1. Validate and load voice profile
      const voiceProfile = await this.loadVoiceProfile(userId, voiceId)
      if (!voiceProfile || !voiceProfile.isComplete) {
        return {
          success: false,
          message: 'Voice profile is incomplete. Please complete all voice passages first.'
        }
      }

      // 2. Check if user has sufficient text data for LLM training
      const textDataSufficient = await this.validateUserTextData(userId)
      if (!textDataSufficient.sufficient) {
        return {
          success: false,
          message: `Insufficient text data for AI training. ${textDataSufficient.message}`
        }
      }

      // 3. Create integrated training configuration
      const integrationConfig = await this.createIntegrationConfig(userId, voiceProfile)

      // 4. Prepare combined training data (text + voice metadata)
      const trainingData = await this.prepareIntegratedTrainingData(userId, voiceProfile)

      // 5. Create training job with voice integration
      const trainingJob = await this.createVoiceIntegratedTrainingJob(userId, integrationConfig, trainingData)

      // 6. Start training with RTX 5090 optimization
      const trainingStarted = await this.startIntegratedTraining(trainingJob, trainingData)

      if (trainingStarted.success) {
        // 7. Mark voice profile as integrated
        await this.markVoiceProfileIntegrated(userId, voiceId, trainingJob.id)

        return {
          success: true,
          trainingJobId: trainingJob.id,
          message: 'Voice-LLM integration training started successfully! Your AI will speak with your voice.',
          estimatedCompletion: new Date(Date.now() + 120 * 60 * 1000) // 2 hours
        }
      } else {
        return {
          success: false,
          message: trainingStarted.error || 'Failed to start integrated training'
        }
      }

    } catch (error: any) {
      console.error('Voice-LLM integration failed:', error)
      return {
        success: false,
        message: `Integration failed: ${error.message}`
      }
    }
  }

  /**
   * Load voice profile from stored data
   */
  private async loadVoiceProfile(userId: string, voiceId: string): Promise<VoiceProfile | null> {
    try {
      const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '_')
      const voiceDir = join(process.cwd(), 'public', 'voices', cleanUserId)

      if (!existsSync(voiceDir)) {
        return null
      }

      // Load all passage metadata
      const expectedPassages = ['conversational-warmth', 'emotional-expression', 'wisdom-legacy', 'technical-clarity']
      const passages: VoicePassage[] = []
      let totalQuality = 0

      for (const passageId of expectedPassages) {
        const metadataPath = join(voiceDir, `${passageId}_metadata.json`)
        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
          
          passages.push({
            id: passageId,
            title: this.getPassageTitle(passageId),
            audioPath: join(voiceDir, metadata.audioFile),
            transcript: metadata.passageText || '',
            duration: metadata.duration || 0,
            quality: metadata.quality || { overall: 70, clarity: 70, consistency: 70, emotionalRange: 70, phoneticDiversity: 70 },
            phoneticFocus: metadata.phoneticFocus || '',
            emotionalContent: this.extractEmotionalContent(metadata.passageText || ''),
            processingStatus: metadata.processed ? 'processed' : 'pending'
          })

          totalQuality += metadata.quality?.overall || 70
        }
      }

      const isComplete = passages.length === expectedPassages.length
      const averageQuality = passages.length > 0 ? totalQuality / passages.length : 0

      return {
        userId: cleanUserId,
        voiceId,
        passages,
        isComplete,
        qualityScore: averageQuality,
        createdAt: new Date(),
        processingStatus: isComplete ? 'processed' : 'pending'
      } as VoiceProfile

    } catch (error) {
      console.error('Error loading voice profile:', error)
      return null
    }
  }

  /**
   * Validate user has sufficient text data for LLM training
   */
  private async validateUserTextData(userId: string): Promise<{
    sufficient: boolean
    message: string
    stats: any
  }> {
    try {
      const dataCheck = await query(`
        SELECT 
          COUNT(*) as response_count,
          COUNT(DISTINCT q.category) as category_count,
          SUM(r.word_count) as total_words,
          AVG(r.word_count) as avg_words_per_response
        FROM responses r
        JOIN questions q ON r.question_id = q.id
        WHERE 
          r.user_id = $1
          AND r.word_count >= 20
          AND r.response_text IS NOT NULL
          AND LENGTH(r.response_text) > 50
      `, [userId])

      const stats = dataCheck.rows[0]
      const requirements = defaultTrainingConfig.dataRequirements

      const sufficient = stats && 
        parseInt(stats.response_count) >= requirements.minResponses &&
        parseInt(stats.category_count) >= requirements.minQuestionCategories &&
        parseInt(stats.total_words) >= requirements.minWordCount

      let message = ''
      if (!sufficient) {
        const missing = []
        if (parseInt(stats?.response_count || 0) < requirements.minResponses) {
          missing.push(`${requirements.minResponses - parseInt(stats?.response_count || 0)} more responses needed`)
        }
        if (parseInt(stats?.category_count || 0) < requirements.minQuestionCategories) {
          missing.push(`${requirements.minQuestionCategories - parseInt(stats?.category_count || 0)} more question categories needed`)
        }
        if (parseInt(stats?.total_words || 0) < requirements.minWordCount) {
          missing.push(`${requirements.minWordCount - parseInt(stats?.total_words || 0)} more words needed`)
        }
        message = missing.join(', ')
      } else {
        message = 'Sufficient training data available'
      }

      return {
        sufficient,
        message,
        stats: {
          responses: parseInt(stats?.response_count || 0),
          categories: parseInt(stats?.category_count || 0),
          totalWords: parseInt(stats?.total_words || 0),
          avgWordsPerResponse: Math.round(parseFloat(stats?.avg_words_per_response || 0))
        }
      }

    } catch (error) {
      console.error('Error validating user text data:', error)
      return {
        sufficient: false,
        message: 'Error checking training data requirements',
        stats: {}
      }
    }
  }

  /**
   * Create integration configuration combining voice and LLM settings
   */
  private async createIntegrationConfig(userId: string, voiceProfile: VoiceProfile): Promise<VoiceLLMTrainingConfig> {
    const llmConfig = { 
      ...defaultTrainingConfig,
      // Enhanced for voice integration
      model: {
        ...defaultTrainingConfig.model,
        // Add voice-specific model parameters
        contextLength: 4096, // Longer context for voice-aware responses
        precision: 'bf16' as const, // Better for voice-integrated models
        quantization: '4bit' as const // RTX 5090 optimization
      },
      training: {
        ...defaultTrainingConfig.training,
        epochs: 150, // More epochs for voice integration
        batchSize: 6, // Optimized for RTX 5090 with voice data
        learningRate: 3e-5, // Lower LR for voice integration stability
        gradientCheckpointing: true,
        // Voice-specific training parameters
        voiceAlignment: true,
        emotionalConsistency: true,
        personalityWeight: 0.8
      }
    }

    return {
      userId,
      voiceProfile,
      llmConfig,
      integrationSettings: {
        voiceWeight: 0.7, // High weight for voice characteristics
        textWeight: 0.8, // High weight for text content
        emotionalAlignment: true, // Align emotional content
        personalityConsistency: true // Maintain personality consistency
      }
    }
  }

  /**
   * Prepare training data that combines text responses with voice characteristics
   */
  private async prepareIntegratedTrainingData(userId: string, voiceProfile: VoiceProfile): Promise<TrainingExample[]> {
    // Get user's text responses
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
        u.important_people
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      JOIN users u ON r.user_id = u.id
      WHERE 
        r.user_id = $1
        AND r.word_count >= 20
        AND r.response_text IS NOT NULL
        AND LENGTH(r.response_text) > 50
      ORDER BY r.created_at ASC
    `, [userId])

    // Get life detail entries
    const lifeEntries = await query(`
      SELECT 
        title,
        content,
        category,
        tags,
        related_people,
        emotional_depth,
        created_at
      FROM life_detail_entries
      WHERE user_id = $1 AND LENGTH(content) > 100
      ORDER BY created_at ASC
    `, [userId])

    const trainingExamples: TrainingExample[] = []

    // Process responses with voice integration
    for (const row of responses.rows) {
      const voiceCharacteristics = this.getVoiceCharacteristicsForContent(voiceProfile, row.response_text)
      const emotionalTone = this.detectEmotionalTone(row.response_text)
      
      const systemPrompt = this.buildVoiceIntegratedSystemPrompt(row, voiceCharacteristics, emotionalTone)
      
      trainingExamples.push({
        instruction: row.question_text,
        input: systemPrompt,
        output: row.response_text,
        metadata: {
          userId: row.user_id,
          timestamp: new Date(row.created_at),
          questionCategory: row.category,
          responseWordCount: row.word_count,
          emotionalTone
        }
      })
    }

    // Process life entries with voice integration
    for (const row of lifeEntries.rows) {
      const voiceCharacteristics = this.getVoiceCharacteristicsForContent(voiceProfile, row.content)
      const emotionalTone = this.detectEmotionalTone(row.content)
      
      const systemPrompt = this.buildVoiceIntegratedSystemPrompt(
        { ...row, primary_role: null, important_people: row.related_people }, 
        voiceCharacteristics, 
        emotionalTone
      )
      
      trainingExamples.push({
        instruction: `Tell me about ${row.title.toLowerCase()}`,
        input: systemPrompt,
        output: row.content,
        metadata: {
          userId,
          timestamp: new Date(row.created_at),
          questionCategory: row.category || 'life_story',
          responseWordCount: row.content.split(' ').length,
          emotionalTone
        }
      })
    }

    // Add voice-specific training examples
    const voiceTrainingExamples = this.createVoiceSpecificTrainingExamples(voiceProfile)
    trainingExamples.push(...voiceTrainingExamples)

    console.log(`Prepared ${trainingExamples.length} integrated training examples for user ${userId}`)
    return trainingExamples
  }

  /**
   * Create training job with voice integration
   */
  private async createVoiceIntegratedTrainingJob(
    userId: string, 
    config: VoiceLLMTrainingConfig, 
    trainingData: TrainingExample[]
  ): Promise<TrainingJob> {
    const jobId = crypto.randomUUID()
    
    // Enhanced resource requirements for voice integration
    const resourceRequirements = {
      gpuMemoryGB: Math.min(28, Math.max(16, Math.ceil(trainingData.length / 80))), // More VRAM for voice integration
      diskSpaceGB: Math.ceil(trainingData.length * 0.02), // More storage for voice data
      estimatedCost: Math.min(15, trainingData.length * 0.008) // Higher cost for integrated training
    }

    // Create database record
    await query(`
      INSERT INTO training_runs (
        id,
        run_id,
        user_id, 
        status, 
        started_at, 
        training_samples,
        training_params,
        base_model,
        model_name,
        integration_type,
        voice_profile_id
      ) VALUES ($1, $2, $3, 'queued', CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
    `, [
      crypto.randomUUID(),
      jobId,
      userId,
      trainingData.length,
      JSON.stringify({
        ...config.llmConfig,
        integrationSettings: config.integrationSettings,
        voiceIntegration: {
          enabled: true,
          voiceId: config.voiceProfile.voiceId,
          qualityScore: config.voiceProfile.qualityScore,
          passageCount: config.voiceProfile.passages.length
        }
      }),
      config.llmConfig.model.baseModel,
      `voice_integrated_${userId}_v${await this.getNextModelVersion(userId)}`,
      'voice_llm_integrated',
      config.voiceProfile.voiceId
    ])

    return {
      id: jobId,
      userId,
      priority: 'high', // Voice integration jobs get high priority
      status: 'queued',
      queuedAt: new Date(),
      estimatedDuration: 180, // 3 hours for voice integration
      config: config.llmConfig,
      dataHash: this.generateDataHash(trainingData),
      retryCount: 0,
      maxRetries: 3,
      resourceRequirements,
      integrationFeatures: {
        voiceIntegrated: true,
        voiceQuality: config.voiceProfile.qualityScore,
        emotionalAlignment: config.integrationSettings.emotionalAlignment,
        personalityConsistency: config.integrationSettings.personalityConsistency
      }
    } as TrainingJob
  }

  /**
   * Start integrated training with enhanced monitoring
   */
  private async startIntegratedTraining(job: TrainingJob, trainingData: TrainingExample[]): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Add job to training engine with voice integration support
      await trainingEngine.startTraining(job, trainingData)
      
      // Set up enhanced monitoring for voice integration
      trainingEngine.setMetricsCallback((jobId, metrics) => {
        this.handleVoiceIntegrationMetrics(jobId, metrics)
      })

      return { success: true }
    } catch (error: any) {
      console.error('Failed to start integrated training:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }
  }

  /**
   * Handle voice integration specific metrics
   */
  private handleVoiceIntegrationMetrics(jobId: string, metrics: any) {
    // Log voice-specific metrics
    if (metrics.voiceAlignment) {
      console.log(`Voice integration metrics for ${jobId}:`, {
        voiceAlignment: metrics.voiceAlignment,
        emotionalConsistency: metrics.emotionalConsistency,
        personalityWeight: metrics.personalityWeight
      })
    }

    // Store metrics in database for monitoring
    query(`
      UPDATE training_runs 
      SET integration_metrics = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE run_id = $2
    `, [JSON.stringify(metrics), jobId]).catch(console.error)
  }

  /**
   * Mark voice profile as integrated with LLM
   */
  private async markVoiceProfileIntegrated(userId: string, voiceId: string, trainingJobId: string) {
    try {
      // Update voice profile status
      const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '_')
      const voiceDir = join(process.cwd(), 'public', 'voices', cleanUserId)
      
      const integrationStatusPath = join(voiceDir, 'integration_status.json')
      const integrationStatus = {
        integrated: true,
        trainingJobId,
        integratedAt: new Date().toISOString(),
        status: 'training_in_progress'
      }
      
      await fs.writeFile(integrationStatusPath, JSON.stringify(integrationStatus, null, 2))
      
      // Create database record
      await query(`
        INSERT INTO voice_llm_integrations (
          id, user_id, voice_id, training_job_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, voice_id) 
        DO UPDATE SET 
          training_job_id = EXCLUDED.training_job_id,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [
        crypto.randomUUID(),
        userId,
        voiceId,
        trainingJobId,
        'training_started'
      ])

    } catch (error) {
      console.error('Error marking voice profile as integrated:', error)
    }
  }

  /**
   * Helper methods
   */
  private getPassageTitle(passageId: string): string {
    const titles = {
      'conversational-warmth': 'Conversational Warmth & Connection',
      'emotional-expression': 'Emotional Range & Expression',
      'wisdom-legacy': 'Wisdom & Legacy Sharing',
      'technical-clarity': 'Clear Articulation & Technical Speech'
    }
    return titles[passageId as keyof typeof titles] || passageId
  }

  private extractEmotionalContent(text: string): string[] {
    const emotions = []
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('love') || lowerText.includes('care')) emotions.push('love')
    if (lowerText.includes('joy') || lowerText.includes('happy')) emotions.push('joy')
    if (lowerText.includes('proud') || lowerText.includes('accomplish')) emotions.push('pride')
    if (lowerText.includes('sad') || lowerText.includes('miss')) emotions.push('sadness')
    if (lowerText.includes('hope') || lowerText.includes('future')) emotions.push('hope')
    if (lowerText.includes('worry') || lowerText.includes('concern')) emotions.push('concern')
    
    return emotions
  }

  private detectEmotionalTone(text: string): string {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('love') || lowerText.includes('joy') || lowerText.includes('happy')) return 'joyful'
    if (lowerText.includes('proud') || lowerText.includes('accomplish')) return 'proud'
    if (lowerText.includes('miss') || lowerText.includes('wish') || lowerText.includes('regret')) return 'nostalgic'
    if (lowerText.includes('advice') || lowerText.includes('learn') || lowerText.includes('important')) return 'wise'
    if (lowerText.includes('difficult') || lowerText.includes('hard') || lowerText.includes('struggle')) return 'reflective'
    
    return 'neutral'
  }

  private getVoiceCharacteristicsForContent(voiceProfile: VoiceProfile, content: string): any {
    // Match content emotional tone with voice passage characteristics
    const emotionalTone = this.detectEmotionalTone(content)
    
    // Find the most relevant voice passage
    let relevantPassage = voiceProfile.passages[0] // Default to first passage
    
    if (emotionalTone === 'joyful' || emotionalTone === 'proud') {
      relevantPassage = voiceProfile.passages.find(p => p.id === 'conversational-warmth') || relevantPassage
    } else if (emotionalTone === 'wise' || emotionalTone === 'reflective') {
      relevantPassage = voiceProfile.passages.find(p => p.id === 'wisdom-legacy') || relevantPassage
    } else if (emotionalTone === 'nostalgic') {
      relevantPassage = voiceProfile.passages.find(p => p.id === 'emotional-expression') || relevantPassage
    }

    return {
      clarity: relevantPassage.quality.clarity,
      consistency: relevantPassage.quality.consistency,
      emotionalRange: relevantPassage.quality.emotionalRange,
      phoneticDiversity: relevantPassage.quality.phoneticDiversity,
      duration: relevantPassage.duration,
      phoneticFocus: relevantPassage.phoneticFocus
    }
  }

  private buildVoiceIntegratedSystemPrompt(row: any, voiceCharacteristics: any, emotionalTone: string): string {
    const contexts = []
    
    // Add voice-specific context
    contexts.push(`You are speaking with your authentic voice, characterized by ${voiceCharacteristics.phoneticFocus}`)
    
    if (row.primary_role) {
      contexts.push(`You are a ${row.primary_role}`)
    }

    // Add emotional context based on voice characteristics
    if (emotionalTone === 'joyful' && voiceCharacteristics.emotionalRange > 70) {
      contexts.push('speaking with warmth and joy in your voice')
    } else if (emotionalTone === 'wise' && voiceCharacteristics.clarity > 75) {
      contexts.push('sharing wisdom with clear and thoughtful articulation')
    } else if (emotionalTone === 'reflective') {
      contexts.push('speaking with gentle reflection and emotional depth')
    }

    if (row.important_people) {
      try {
        const people = typeof row.important_people === 'string' 
          ? JSON.parse(row.important_people) 
          : row.important_people
        if (people && people.length > 0) {
          const names = people.map((p: any) => p.name).filter(Boolean).join(', ')
          if (names) {
            contexts.push(`discussing your relationships with ${names}`)
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    contexts.push('sharing your wisdom, memories, and personal experiences with your authentic voice for future generations')
    
    return contexts.join(', ') + '. Your response will be spoken in your cloned voice, so maintain natural speech patterns and emotional expression.'
  }

  private createVoiceSpecificTrainingExamples(voiceProfile: VoiceProfile): TrainingExample[] {
    const examples: TrainingExample[] = []

    // Create examples based on voice passages
    for (const passage of voiceProfile.passages) {
      if (passage.transcript) {
        examples.push({
          instruction: `Speak naturally about ${passage.title.toLowerCase()}`,
          input: `You are speaking with your authentic voice, focusing on ${passage.phoneticFocus}. Express yourself naturally with emotional depth.`,
          output: passage.transcript,
          metadata: {
            userId: voiceProfile.userId,
            timestamp: new Date(),
            questionCategory: 'voice_training',
            responseWordCount: passage.transcript.split(' ').length,
            emotionalTone: passage.emotionalContent.join(',')
          }
        })
      }
    }

    return examples
  }

  private generateDataHash(trainingData: TrainingExample[]): string {
    const content = trainingData.map(ex => ex.output).join('|')
    return crypto.createHash('md5').update(content).digest('hex')
  }

  private async getNextModelVersion(userId: string): Promise<number> {
    const result = await query(`
      SELECT COALESCE(MAX(CAST(model_version AS INTEGER)), 0) + 1 as next_version
      FROM training_runs 
      WHERE user_id = $1 AND model_version ~ '^[0-9]+$'
    `, [userId])
    
    return result.rows[0]?.next_version || 1
  }

  /**
   * Check integration status for a user
   */
  async getIntegrationStatus(userId: string): Promise<{
    hasVoiceProfile: boolean
    voiceComplete: boolean
    hasTextData: boolean
    textDataSufficient: boolean
    integrationStatus: 'not_started' | 'voice_incomplete' | 'text_insufficient' | 'ready' | 'training' | 'completed'
    trainingJobId?: string
    message: string
  }> {
    try {
      // Check voice profile
      const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '_')
      const voiceDir = join(process.cwd(), 'public', 'voices', cleanUserId)
      const hasVoiceProfile = existsSync(voiceDir)

      let voiceComplete = false
      if (hasVoiceProfile) {
        const voiceProfile = await this.loadVoiceProfile(userId, 'latest')
        voiceComplete = voiceProfile?.isComplete || false
      }

      // Check text data
      const textValidation = await this.validateUserTextData(userId)
      const hasTextData = textValidation.stats.responses > 0
      const textDataSufficient = textValidation.sufficient

      // Check integration status
      let integrationStatus: 'not_started' | 'voice_incomplete' | 'text_insufficient' | 'ready' | 'training' | 'completed' = 'not_started'
      let trainingJobId: string | undefined
      let message = ''

      if (!hasVoiceProfile && !hasTextData) {
        integrationStatus = 'not_started'
        message = 'Complete voice cloning and answer questions to train your personalized AI.'
      } else if (!voiceComplete) {
        integrationStatus = 'voice_incomplete'
        message = 'Complete your voice clone by recording all passages.'
      } else if (!textDataSufficient) {
        integrationStatus = 'text_insufficient'
        message = textValidation.message
      } else {
        // Check if training is in progress or completed
        const trainingCheck = await query(`
          SELECT run_id, status 
          FROM training_runs 
          WHERE user_id = $1 AND integration_type = 'voice_llm_integrated'
          ORDER BY started_at DESC 
          LIMIT 1
        `, [userId])

        if (trainingCheck.rows.length > 0) {
          const training = trainingCheck.rows[0]
          trainingJobId = training.run_id

          if (training.status === 'completed') {
            integrationStatus = 'completed'
            message = 'Your voice-integrated AI is ready! Chat with your AI echo to hear your voice.'
          } else if (training.status === 'running' || training.status === 'queued') {
            integrationStatus = 'training'
            message = 'Your voice-integrated AI is training. This will take about 2-3 hours.'
          } else {
            integrationStatus = 'ready'
            message = 'Ready to train your voice-integrated AI!'
          }
        } else {
          integrationStatus = 'ready'
          message = 'Ready to train your voice-integrated AI!'
        }
      }

      return {
        hasVoiceProfile,
        voiceComplete,
        hasTextData,
        textDataSufficient,
        integrationStatus,
        trainingJobId,
        message
      }

    } catch (error) {
      console.error('Error checking integration status:', error)
      return {
        hasVoiceProfile: false,
        voiceComplete: false,
        hasTextData: false,
        textDataSufficient: false,
        integrationStatus: 'not_started',
        message: 'Error checking status. Please try again.'
      }
    }
  }
}

// Export singleton instance
export const voiceLLMIntegrator = VoiceLLMIntegrator.getInstance()