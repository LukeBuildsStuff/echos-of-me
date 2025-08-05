/**
 * AI Training Data Processor for Personal AI Cloning
 * 
 * Converts reflection responses into high-quality training data for Mistral-7B
 * Includes data augmentation, quality filtering, and format conversion
 */

import { query } from './db'
import { promises as fs } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

export interface ReflectionResponse {
  user_id: string
  question_id: string
  question_text: string
  response_text: string
  word_count: number
  response_time_seconds: number
  category?: string
  emotional_tone?: string
  created_at: Date
}

export interface TrainingExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  metadata: {
    source_response_id?: string
    category: string
    quality_score: number
    augmentation_type: 'original' | 'follow_up' | 'context_expansion' | 'conversation_simulation'
    word_count: number
    emotional_tone: string
  }
}

export interface ProcessingStats {
  total_responses: number
  processed_examples: number
  augmented_examples: number
  filtered_examples: number
  quality_distribution: {
    high: number
    medium: number
    low: number
  }
  categories: Record<string, number>
}

export class AITrainingDataProcessor {
  private qualityThreshold = 0.6
  private minWordCount = 30
  private maxWordCount = 1000
  private augmentationRatio = 3 // Generate 3 additional examples per original

  /**
   * Process all user responses into training data
   */
  async processUserResponses(userId: string): Promise<{
    trainingData: TrainingExample[]
    stats: ProcessingStats
  }> {
    console.log(`Starting data processing for user: ${userId}`)

    // Fetch user responses
    const responses = await this.fetchUserResponses(userId)
    console.log(`Found ${responses.length} responses`)

    if (responses.length === 0) {
      throw new Error(`No responses found for user ${userId}`)
    }

    // Initialize processing stats
    const stats: ProcessingStats = {
      total_responses: responses.length,
      processed_examples: 0,
      augmented_examples: 0,
      filtered_examples: 0,
      quality_distribution: { high: 0, medium: 0, low: 0 },
      categories: {}
    }

    let allTrainingExamples: TrainingExample[] = []

    // Process each response
    for (const response of responses) {
      try {
        // Create original training example
        const originalExample = await this.createOriginalExample(response)
        if (originalExample) {
          allTrainingExamples.push(originalExample)
          stats.processed_examples++
          this.updateStats(stats, originalExample)
        }

        // Generate augmented examples
        const augmentedExamples = await this.generateAugmentedExamples(response)
        allTrainingExamples.push(...augmentedExamples)
        stats.augmented_examples += augmentedExamples.length

        for (const example of augmentedExamples) {
          this.updateStats(stats, example)
        }

      } catch (error) {
        console.error(`Failed to process response ${response.question_id}:`, error)
      }
    }

    // Filter by quality
    const filteredExamples = allTrainingExamples.filter(example => {
      const qualityPass = example.metadata.quality_score >= this.qualityThreshold
      if (!qualityPass) {
        stats.filtered_examples++
      }
      return qualityPass
    })

    console.log(`Processed ${filteredExamples.length} training examples from ${responses.length} responses`)

    return {
      trainingData: filteredExamples,
      stats: {
        ...stats,
        processed_examples: filteredExamples.length
      }
    }
  }

  /**
   * Fetch user responses from database
   */
  private async fetchUserResponses(userId: string): Promise<ReflectionResponse[]> {
    const result = await query(`
      SELECT 
        ur.user_id,
        ur.question_id,
        q.question_text,
        ur.response_text,
        ur.word_count,
        ur.response_time_seconds,
        q.category,
        ur.created_at
      FROM user_responses ur
      JOIN questions q ON ur.question_id = q.id
      WHERE ur.user_id = $1 
        AND ur.response_text IS NOT NULL 
        AND LENGTH(TRIM(ur.response_text)) > $2
      ORDER BY ur.created_at ASC
    `, [userId, this.minWordCount])

    return result.rows.map(row => ({
      ...row,
      emotional_tone: this.analyzeEmotionalTone(row.response_text)
    }))
  }

  /**
   * Create original training example from response
   */
  private async createOriginalExample(response: ReflectionResponse): Promise<TrainingExample | null> {
    try {
      const qualityScore = this.calculateQualityScore(response)
      
      if (qualityScore < this.qualityThreshold) {
        return null
      }

      const systemPrompt = this.generateSystemPrompt(response)
      const userPrompt = this.formatUserPrompt(response.question_text)
      const assistantResponse = this.cleanResponse(response.response_text)

      return {
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          },
          {
            role: 'assistant',
            content: assistantResponse
          }
        ],
        metadata: {
          source_response_id: response.question_id,
          category: response.category || 'general',
          quality_score: qualityScore,
          augmentation_type: 'original',
          word_count: response.word_count,
          emotional_tone: response.emotional_tone || 'neutral'
        }
      }
    } catch (error) {
      console.error(`Error creating original example:`, error)
      return null
    }
  }

  /**
   * Generate augmented examples from original response
   */
  private async generateAugmentedExamples(response: ReflectionResponse): Promise<TrainingExample[]> {
    const augmentedExamples: TrainingExample[] = []

    try {
      // Follow-up question variation
      const followUpExample = this.createFollowUpExample(response)
      if (followUpExample) {
        augmentedExamples.push(followUpExample)
      }

      // Context expansion example
      const contextExample = this.createContextExpansionExample(response)
      if (contextExample) {
        augmentedExamples.push(contextExample)
      }

      // Conversation simulation example
      const conversationExample = this.createConversationExample(response)
      if (conversationExample) {
        augmentedExamples.push(conversationExample)
      }

    } catch (error) {
      console.error(`Error generating augmented examples:`, error)
    }

    return augmentedExamples
  }

  /**
   * Create follow-up question example
   */
  private createFollowUpExample(response: ReflectionResponse): TrainingExample | null {
    const followUpQuestions = this.generateFollowUpQuestions(response)
    if (followUpQuestions.length === 0) return null

    const randomFollowUp = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)]
    const expandedResponse = this.expandResponse(response.response_text, randomFollowUp)

    return {
      messages: [
        {
          role: 'system',
          content: this.generateSystemPrompt(response)
        },
        {
          role: 'user',
          content: randomFollowUp
        },
        {
          role: 'assistant',
          content: expandedResponse
        }
      ],
      metadata: {
        source_response_id: response.question_id,
        category: response.category || 'general',
        quality_score: this.calculateQualityScore(response) * 0.9, // Slightly lower for generated
        augmentation_type: 'follow_up',
        word_count: expandedResponse.split(' ').length,
        emotional_tone: response.emotional_tone || 'neutral'
      }
    }
  }

  /**
   * Create context expansion example
   */
  private createContextExpansionExample(response: ReflectionResponse): TrainingExample | null {
    const contextualPrompt = this.createContextualPrompt(response)
    const expandedResponse = this.addContextualDetails(response.response_text)

    return {
      messages: [
        {
          role: 'system',
          content: this.generateSystemPrompt(response)
        },
        {
          role: 'user',
          content: contextualPrompt
        },
        {
          role: 'assistant',
          content: expandedResponse
        }
      ],
      metadata: {
        source_response_id: response.question_id,
        category: response.category || 'general',
        quality_score: this.calculateQualityScore(response) * 0.85,
        augmentation_type: 'context_expansion',
        word_count: expandedResponse.split(' ').length,
        emotional_tone: response.emotional_tone || 'neutral'
      }
    }
  }

  /**
   * Create conversation simulation example
   */
  private createConversationExample(response: ReflectionResponse): TrainingExample | null {
    const conversationalPrompt = this.createConversationalPrompt(response)
    const conversationalResponse = this.makeConversational(response.response_text)

    return {
      messages: [
        {
          role: 'system',
          content: this.generateSystemPrompt(response)
        },
        {
          role: 'user',
          content: conversationalPrompt
        },
        {
          role: 'assistant',
          content: conversationalResponse
        }
      ],
      metadata: {
        source_response_id: response.question_id,
        category: response.category || 'general',
        quality_score: this.calculateQualityScore(response) * 0.8,
        augmentation_type: 'conversation_simulation',
        word_count: conversationalResponse.split(' ').length,
        emotional_tone: response.emotional_tone || 'neutral'
      }
    }
  }

  /**
   * Generate system prompt based on response characteristics
   */
  private generateSystemPrompt(response: ReflectionResponse): string {
    const basePrompt = "You are Luke, a thoughtful and experienced person sharing your authentic life experiences, wisdom, and perspectives with warmth and genuine care."

    const categoryPrompts = {
      'career': " You speak about professional experiences with insight gained through years of growth and learning.",
      'family': " You share family memories and relationships with deep love and appreciation for the bonds that matter most.",
      'personal_growth': " You reflect on personal development with honesty about challenges and pride in growth achieved.",
      'philosophy': " You explore life's deeper questions with thoughtful consideration and hard-earned wisdom.",
      'memories': " You recall past experiences with vivid detail and the perspective that comes with time.",
      'challenges': " You discuss difficulties with resilience and the understanding that challenges shape character.",
      'dreams': " You speak about aspirations with both realistic perspective and maintained hope.",
      'technology': " You share thoughts on technology with both appreciation for progress and awareness of its impacts."
    }

    const categoryPrompt = categoryPrompts[response.category as keyof typeof categoryPrompts] || ""
    
    const emotionalPrompts = {
      'nostalgic': " Your tone carries the warmth of cherished memories.",
      'wise': " You speak with the authority of experience and learned wisdom.",
      'reflective': " Your responses show deep contemplation and thoughtful analysis.",
      'loving': " Your words convey genuine care and affection.",
      'hopeful': " You maintain optimism while acknowledging life's realities."
    }

    const emotionalPrompt = emotionalPrompts[response.emotional_tone as keyof typeof emotionalPrompts] || ""

    return basePrompt + categoryPrompt + emotionalPrompt + " Your responses are authentic, personal, and meaningful."
  }

  /**
   * Format user prompt for training
   */
  private formatUserPrompt(questionText: string): string {
    // Ensure questions are conversational and natural
    const cleanQuestion = questionText.trim()
    
    // Add conversational starters occasionally
    const conversationalStarters = [
      "I'd love to hear about",
      "Can you tell me about",
      "I'm curious about",
      "Would you share",
      "What are your thoughts on"
    ]

    // 30% chance to make more conversational
    if (Math.random() < 0.3) {
      const starter = conversationalStarters[Math.floor(Math.random() * conversationalStarters.length)]
      return `${starter} ${cleanQuestion.toLowerCase()}`
    }

    return cleanQuestion
  }

  /**
   * Clean and enhance response text
   */
  private cleanResponse(responseText: string): string {
    let cleaned = responseText.trim()
    
    // Remove any system artifacts
    cleaned = cleaned.replace(/^\[.*?\]\s*/, '') // Remove [tags]
    cleaned = cleaned.replace(/^Response:\s*/i, '') // Remove "Response:" prefix
    
    // Ensure proper capitalization
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    
    // Ensure proper ending punctuation
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.'
    }

    return cleaned
  }

  /**
   * Calculate quality score for response
   */
  private calculateQualityScore(response: ReflectionResponse): number {
    let score = 0.5 // Base score

    // Word count factor (optimal range: 50-300 words)
    const wordCount = response.word_count
    if (wordCount >= 50 && wordCount <= 300) {
      score += 0.3
    } else if (wordCount > 300) {
      score += 0.2 // Good but might be too long
    } else if (wordCount >= 30) {
      score += 0.1 // Acceptable minimum
    }

    // Response time factor (thoughtful but not rushed)
    const responseTime = response.response_time_seconds
    if (responseTime >= 30 && responseTime <= 300) { // 30 seconds to 5 minutes
      score += 0.2
    } else if (responseTime > 300) {
      score += 0.1 // Very thoughtful
    }

    // Content quality indicators
    const text = response.response_text.toLowerCase()
    
    // Personal indicators
    if (text.includes('i ') || text.includes('my ') || text.includes('me ')) {
      score += 0.1
    }

    // Emotional depth indicators
    const emotionalWords = ['feel', 'love', 'proud', 'learned', 'remember', 'important', 'meaningful']
    const emotionalCount = emotionalWords.filter(word => text.includes(word)).length
    score += Math.min(0.15, emotionalCount * 0.03)

    // Specific detail indicators
    if (text.length > text.replace(/[0-9]/g, '').length) { // Contains numbers/dates
      score += 0.05
    }

    // Ensure score is between 0 and 1
    return Math.min(1.0, Math.max(0.0, score))
  }

  /**
   * Analyze emotional tone of text
   */
  private analyzeEmotionalTone(text: string): string {
    const lowerText = text.toLowerCase()

    const toneIndicators = {
      nostalgic: ['remember', 'back then', 'those days', 'used to', 'years ago', 'when i was'],
      wise: ['learned', 'important', 'advice', 'experience', 'wisdom', 'understand now'],
      loving: ['love', 'family', 'dear', 'cherish', 'care', 'appreciate', 'grateful'],
      reflective: ['think', 'realize', 'consider', 'reflect', 'ponder', 'contemplate'],
      hopeful: ['hope', 'future', 'dream', 'aspire', 'look forward', 'optimistic'],
      proud: ['proud', 'accomplished', 'achieved', 'success', 'milestone', 'celebration']
    }

    let maxScore = 0
    let dominantTone = 'warm' // Default

    for (const [tone, indicators] of Object.entries(toneIndicators)) {
      const score = indicators.filter(indicator => lowerText.includes(indicator)).length
      if (score > maxScore) {
        maxScore = score
        dominantTone = tone
      }
    }

    return dominantTone
  }

  /**
   * Generate follow-up questions based on response content
   */
  private generateFollowUpQuestions(response: ReflectionResponse): string[] {
    const questions: string[] = []
    const text = response.response_text.toLowerCase()

    // Category-specific follow-ups
    const categoryFollowUps = {
      'career': [
        "What advice would you give to someone starting in your field?",
        "How did that experience shape your professional approach?",
        "What would you do differently if you could start over?"
      ],
      'family': [
        "What family tradition means the most to you?",
        "How has your family influenced who you are today?",
        "What do you hope to pass on to future generations?"
      ],
      'personal_growth': [
        "What was the biggest lesson you learned from that experience?",
        "How did you overcome that challenge?",
        "What advice would you give to your younger self?"
      ]
    }

    const categoryQuestions = categoryFollowUps[response.category as keyof typeof categoryFollowUps] || []
    questions.push(...categoryQuestions)

    // Content-based follow-ups
    if (text.includes('difficult') || text.includes('challenge')) {
      questions.push("How did you find the strength to get through that?")
    }

    if (text.includes('learned') || text.includes('lesson')) {
      questions.push("How do you apply that lesson in your life today?")
    }

    if (text.includes('proud') || text.includes('achievement')) {
      questions.push("What made that accomplishment so meaningful to you?")
    }

    return questions.slice(0, 3) // Limit to 3 questions
  }

  /**
   * Expand response with additional context
   */
  private expandResponse(originalResponse: string, followUpQuestion: string): string {
    // This is a simplified expansion - in production, you might use an LLM for better expansion
    const expansions = [
      "Looking back on it now, I can see how that experience really shaped me.",
      "It's interesting how time gives you perspective on these things.",
      "I think the most important thing I learned was",
      "What I would tell someone in a similar situation is",
      "The deeper meaning I found in that experience was"
    ]

    const randomExpansion = expansions[Math.floor(Math.random() * expansions.length)]
    return `${originalResponse} ${randomExpansion} ${this.extractKeyTheme(originalResponse)}.`
  }

  /**
   * Create contextual prompt
   */
  private createContextualPrompt(response: ReflectionResponse): string {
    const contextPrompts = [
      `Can you elaborate more on ${this.extractKeyPhrase(response.response_text)}?`,
      `What led up to ${this.extractKeyEvent(response.response_text)}?`,
      `How did that experience change your perspective?`,
      `What would you want others to know about ${this.extractKeyTopic(response.question_text)}?`
    ]

    return contextPrompts[Math.floor(Math.random() * contextPrompts.length)]
  }

  /**
   * Add contextual details to response
   */
  private addContextualDetails(response: string): string {
    const contextualPhrases = [
      "To give you more context,",
      "What's important to understand is that",
      "The background to this is",
      "To paint a fuller picture,",
      "What I haven't mentioned is"
    ]

    const phrase = contextualPhrases[Math.floor(Math.random() * contextualPhrases.length)]
    return `${response} ${phrase} this experience taught me the value of perspective and patience.`
  }

  /**
   * Create conversational prompt
   */
  private createConversationalPrompt(response: ReflectionResponse): string {
    const conversationalPrompts = [
      "I've been thinking about what you said earlier about this topic. Can you share more?",
      "You mentioned this before - what's your take on it now?",
      "I'm curious about your thoughts on this.",
      "Can we talk about this a bit more?"
    ]

    return conversationalPrompts[Math.floor(Math.random() * conversationalPrompts.length)]
  }

  /**
   * Make response more conversational
   */
  private makeConversational(response: string): string {
    // Add conversational elements
    const conversationalStarters = [
      "You know,",
      "I think",
      "In my experience,",
      "What I've found is that",
      "To be honest,"
    ]

    const starter = conversationalStarters[Math.floor(Math.random() * conversationalStarters.length)]
    return `${starter} ${response.charAt(0).toLowerCase()}${response.slice(1)}`
  }

  /**
   * Helper methods for content extraction
   */
  private extractKeyPhrase(text: string): string {
    const words = text.split(' ')
    const midPoint = Math.floor(words.length / 2)
    return words.slice(midPoint - 2, midPoint + 2).join(' ')
  }

  private extractKeyEvent(text: string): string {
    // Look for verb phrases that might indicate events
    const eventPatterns = ['when I', 'I decided', 'I learned', 'I realized', 'I found']
    for (const pattern of eventPatterns) {
      if (text.toLowerCase().includes(pattern)) {
        return pattern
      }
    }
    return 'that experience'
  }

  private extractKeyTopic(text: string): string {
    // Extract main noun phrases
    const words = text.toLowerCase().split(' ')
    const nouns = words.filter(word => word.length > 4)
    return nouns[0] || 'this topic'
  }

  private extractKeyTheme(text: string): string {
    const themes = ['perseverance', 'growth', 'understanding', 'wisdom', 'compassion', 'resilience']
    return themes[Math.floor(Math.random() * themes.length)]
  }

  /**
   * Update processing statistics
   */
  private updateStats(stats: ProcessingStats, example: TrainingExample): void {
    // Quality distribution
    if (example.metadata.quality_score >= 0.8) {
      stats.quality_distribution.high++
    } else if (example.metadata.quality_score >= 0.6) {
      stats.quality_distribution.medium++
    } else {
      stats.quality_distribution.low++
    }

    // Category distribution
    const category = example.metadata.category
    stats.categories[category] = (stats.categories[category] || 0) + 1
  }

  /**
   * Save training data to file
   */
  async saveTrainingData(
    trainingData: TrainingExample[], 
    userId: string, 
    outputPath?: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${userId}_training_data_${timestamp}.jsonl`
    const filePath = outputPath || join('/tmp/ai-training', fileName)

    // Convert to JSONL format
    const jsonlContent = trainingData.map(example => JSON.stringify(example)).join('\n')

    await fs.writeFile(filePath, jsonlContent, 'utf8')
    console.log(`Training data saved to: ${filePath}`)

    return filePath
  }

  /**
   * Validate training data quality
   */
  validateTrainingData(trainingData: TrainingExample[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (trainingData.length < 50) {
      errors.push(`Insufficient training examples: ${trainingData.length} (minimum: 50)`)
    }

    if (trainingData.length < 100) {
      warnings.push(`Low number of training examples: ${trainingData.length} (recommended: 200+)`)
    }

    // Check for quality distribution
    const highQuality = trainingData.filter(ex => ex.metadata.quality_score >= 0.8).length
    const qualityRatio = highQuality / trainingData.length

    if (qualityRatio < 0.3) {
      warnings.push(`Low high-quality examples ratio: ${(qualityRatio * 100).toFixed(1)}%`)
    }

    // Check for category diversity
    const categories = new Set(trainingData.map(ex => ex.metadata.category))
    if (categories.size < 3) {
      warnings.push(`Limited category diversity: ${categories.size} categories`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// Export singleton instance
export const aiTrainingDataProcessor = new AITrainingDataProcessor()