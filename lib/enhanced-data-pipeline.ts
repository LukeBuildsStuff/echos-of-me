/**
 * Enhanced Data Collection Pipeline for LLM Training
 * 
 * Advanced data processing with quality assessment, context enhancement,
 * and optimal formatting for RTX 5090 fine-tuning
 */

import { query } from './db'
import { TrainingExample } from './ai-training-config'

export interface DataQualityMetrics {
  overallScore: number // 0-100
  diversity: {
    score: number
    categoriesCovered: number
    temporalSpread: number
    emotionalRange: number
  }
  coherence: {
    score: number
    averageLength: number
    vocabularyRichness: number
    grammarQuality: number
  }
  personalization: {
    score: number
    personalReferences: number
    uniqueExpressions: number
    consistentVoice: number
  }
  completeness: {
    score: number
    totalEntries: number
    totalWords: number
    contextRichness: number
  }
}

export interface EnhancedTrainingData {
  examples: TrainingExample[]
  quality: DataQualityMetrics
  statistics: {
    totalExamples: number
    averageLength: number
    dataSourceBreakdown: Record<string, number>
    categoryDistribution: Record<string, number>
    emotionalToneDistribution: Record<string, number>
    temporalDistribution: Record<string, number>
  }
  recommendations: {
    trainingReadiness: boolean
    suggestedImprovements: string[]
    estimatedModelQuality: 'poor' | 'fair' | 'good' | 'excellent'
    recommendedTrainingParams: {
      epochs: number
      batchSize: number
      learningRate: number
      loraRank: number
    }
  }
}

export class EnhancedDataPipeline {
  /**
   * Collect and process training data for a specific user
   */
  async collectUserData(userId: string, options: {
    includePrivate?: boolean
    minWordCount?: number
    maxExamples?: number
    prioritizeRecent?: boolean
  } = {}): Promise<EnhancedTrainingData> {
    
    const {
      includePrivate = false,
      minWordCount = 20,
      maxExamples = 1000,
      prioritizeRecent = true
    } = options

    // Collect data from all sources
    const [responses, lifeEntries, milestones, userProfile] = await Promise.all([
      this.collectResponses(userId, minWordCount, maxExamples),
      this.collectLifeEntries(userId, includePrivate, maxExamples),
      this.collectMilestones(userId, includePrivate, maxExamples),
      this.getUserProfile(userId)
    ])

    // Create enhanced training examples
    const examples = await this.createTrainingExamples(
      responses, 
      lifeEntries, 
      milestones, 
      userProfile,
      prioritizeRecent
    )

    // Assess data quality
    const quality = await this.assessDataQuality(examples, userProfile)

    // Generate statistics
    const statistics = this.generateStatistics(examples)

    // Create recommendations
    const recommendations = this.generateRecommendations(quality, statistics)

    return {
      examples,
      quality,
      statistics,
      recommendations
    }
  }

  /**
   * Collect user responses with enhanced context
   */
  private async collectResponses(userId: string, minWordCount: number, maxExamples: number) {
    return await query(`
      SELECT 
        r.id,
        r.response_text,
        r.word_count,
        r.created_at,
        r.quality_score,
        q.question_text,
        q.category,
        q.subcategory,
        q.difficulty_level,
        q.emotional_weight,
        r.feedback_rating,
        r.completion_time_seconds
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE 
        r.user_id = $1
        AND r.word_count >= $2
        AND r.response_text IS NOT NULL
        AND LENGTH(r.response_text) > 50
      ORDER BY 
        CASE WHEN $4 THEN r.created_at END DESC,
        r.quality_score DESC NULLS LAST,
        r.created_at ASC
      LIMIT $3
    `, [userId, minWordCount, maxExamples, true])
  }

  /**
   * Collect life entries with context
   */
  private async collectLifeEntries(userId: string, includePrivate: boolean, maxExamples: number) {
    return await query(`
      SELECT 
        le.id,
        le.title,
        le.content,
        le.category,
        le.tags,
        le.related_people,
        le.emotional_depth,
        le.created_at,
        le.entry_date,
        LENGTH(le.content) as word_count
      FROM life_detail_entries le
      WHERE 
        le.user_id = $1
        AND LENGTH(le.content) > 100
        AND ($2 OR le.is_private = false)
      ORDER BY le.emotional_depth DESC NULLS LAST, le.created_at DESC
      LIMIT $3
    `, [userId, includePrivate, maxExamples])
  }

  /**
   * Collect milestone messages
   */
  private async collectMilestones(userId: string, includePrivate: boolean, maxExamples: number) {
    return await query(`
      SELECT 
        mm.id,
        mm.milestone_type,
        mm.recipient_name,
        mm.message_title,
        mm.message_content,
        mm.trigger_date,
        mm.trigger_age,
        mm.emotional_tone,
        mm.created_at,
        LENGTH(mm.message_content) as word_count
      FROM milestone_messages mm
      WHERE 
        mm.user_id = $1
        AND LENGTH(mm.message_content) > 50
        AND ($2 OR mm.is_private = false)
      ORDER BY mm.created_at DESC
      LIMIT $3
    `, [userId, includePrivate, maxExamples])
  }

  /**
   * Get comprehensive user profile
   */
  private async getUserProfile(userId: string) {
    const result = await query(`
      SELECT 
        name,
        primary_role,
        secondary_roles,
        important_people,
        cultural_background,
        significant_events,
        children_birthdays,
        birthday
      FROM users
      WHERE id = $1
    `, [userId])

    return result.rows[0] || {}
  }

  /**
   * Create enhanced training examples with better context
   */
  private async createTrainingExamples(
    responses: any,
    lifeEntries: any,
    milestones: any,
    userProfile: any,
    prioritizeRecent: boolean
  ): Promise<TrainingExample[]> {
    
    const examples: TrainingExample[] = []

    // Process responses with enhanced context
    for (const response of responses.rows) {
      const context = this.buildAdvancedContext(userProfile, response, 'response')
      const instruction = this.enhanceInstruction(response.question_text, response.category)
      
      examples.push({
        instruction,
        input: context,
        output: response.response_text,
        metadata: {
          userId: response.user_id,
          timestamp: response.created_at,
          questionCategory: response.category,
          responseWordCount: response.word_count,
          emotionalTone: this.detectAdvancedEmotionalTone(response.response_text),
          importantPeople: this.extractPeopleReferences(response.response_text, userProfile),
          dataSource: 'response',
          qualityScore: response.quality_score || this.calculateQualityScore(response.response_text),
          difficultyLevel: response.difficulty_level,
          completionTime: response.completion_time_seconds
        }
      })
    }

    // Process life entries with narrative structure
    for (const entry of lifeEntries.rows) {
      const context = this.buildAdvancedContext(userProfile, entry, 'life_entry')
      const instruction = this.generateContextualInstruction(entry, 'life_story')
      
      examples.push({
        instruction,
        input: context,
        output: entry.content,
        metadata: {
          userId: entry.user_id,
          timestamp: entry.created_at,
          questionCategory: entry.category || 'life_story',
          responseWordCount: entry.word_count,
          emotionalTone: this.detectAdvancedEmotionalTone(entry.content),
          importantPeople: entry.related_people || [],
          dataSource: 'life_entry',
          qualityScore: this.calculateQualityScore(entry.content),
          tags: entry.tags || [],
          emotionalDepth: entry.emotional_depth
        }
      })
    }

    // Process milestones with future-focused context
    for (const milestone of milestones.rows) {
      const context = this.buildAdvancedContext(userProfile, milestone, 'milestone')
      const instruction = this.generateContextualInstruction(milestone, 'milestone')
      
      examples.push({
        instruction,
        input: context,
        output: milestone.message_content,
        metadata: {
          userId: milestone.user_id,
          timestamp: milestone.created_at,
          questionCategory: 'milestone_message',
          responseWordCount: milestone.word_count,
          emotionalTone: milestone.emotional_tone || this.detectAdvancedEmotionalTone(milestone.message_content),
          importantPeople: milestone.recipient_name ? [milestone.recipient_name] : [],
          dataSource: 'milestone',
          qualityScore: this.calculateQualityScore(milestone.message_content),
          milestoneType: milestone.milestone_type,
          recipientName: milestone.recipient_name
        }
      })
    }

    // Sort by quality and recency if requested
    if (prioritizeRecent) {
      examples.sort((a, b) => {
        const qualityDiff = (b.metadata.qualityScore || 0) - (a.metadata.qualityScore || 0)
        if (Math.abs(qualityDiff) > 10) return qualityDiff
        return new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      })
    }

    return examples
  }

  /**
   * Build advanced context with personality preservation
   */
  private buildAdvancedContext(userProfile: any, item: any, dataType: string): string {
    const contexts = []
    
    // Base identity
    if (userProfile.name) {
      contexts.push(`You are ${userProfile.name}`)
    }
    
    // Primary role with nuance
    if (userProfile.primary_role) {
      contexts.push(`a ${userProfile.primary_role}`)
    }
    
    // Secondary roles for depth
    if (userProfile.secondary_roles && userProfile.secondary_roles.length > 0) {
      contexts.push(`who is also a ${userProfile.secondary_roles.join(' and ')}`)
    }
    
    // Cultural background for authenticity
    if (userProfile.cultural_background && userProfile.cultural_background.length > 0) {
      contexts.push(`with ${userProfile.cultural_background.join(' and ')} heritage`)
    }
    
    // Important relationships for personalization
    const importantPeople = this.parseImportantPeople(userProfile.important_people)
    if (importantPeople.length > 0) {
      contexts.push(`deeply connected to ${importantPeople.slice(0, 2).join(' and ')}`)
    }
    
    // Data-type specific context
    switch (dataType) {
      case 'response':
        contexts.push('sharing your personal experiences and wisdom')
        break
      case 'life_entry':
        contexts.push('reflecting on meaningful moments from your life')
        break
      case 'milestone':
        contexts.push('writing heartfelt messages for future generations')
        break
    }
    
    // Temporal context
    if (item.created_at) {
      const age = this.calculateAge(userProfile.birthday, item.created_at)
      if (age) {
        contexts.push(`speaking from the perspective of being ${age} years old`)
      }
    }
    
    return contexts.join(', ') + '. Respond in your authentic voice, sharing your unique perspective and experiences.'
  }

  /**
   * Assess comprehensive data quality
   */
  private async assessDataQuality(examples: TrainingExample[], userProfile: any): Promise<DataQualityMetrics> {
    const diversity = this.assessDiversity(examples)
    const coherence = this.assessCoherence(examples)
    const personalization = this.assessPersonalization(examples, userProfile)
    const completeness = this.assessCompleteness(examples)
    
    const overallScore = Math.round(
      (diversity.score * 0.25) +
      (coherence.score * 0.25) +
      (personalization.score * 0.3) +
      (completeness.score * 0.2)
    )
    
    return {
      overallScore,
      diversity,
      coherence,
      personalization,
      completeness
    }
  }

  /**
   * Assess data diversity
   */
  private assessDiversity(examples: TrainingExample[]) {
    const categories = new Set(examples.map(ex => ex.metadata.questionCategory))
    const emotions = new Set(examples.map(ex => ex.metadata.emotionalTone))
    const timespan = this.calculateTimespan(examples)
    
    return {
      score: Math.min(100, categories.size * 10 + emotions.size * 5 + timespan * 2),
      categoriesCovered: categories.size,
      temporalSpread: timespan,
      emotionalRange: emotions.size
    }
  }

  /**
   * Assess content coherence
   */
  private assessCoherence(examples: TrainingExample[]) {
    const lengths = examples.map(ex => ex.metadata.responseWordCount)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const vocabulary = this.assessVocabularyRichness(examples)
    const grammar = this.assessGrammarQuality(examples)
    
    return {
      score: Math.round((Math.min(avgLength / 2, 50) * 0.4) + (vocabulary * 0.3) + (grammar * 0.3)),
      averageLength: Math.round(avgLength),
      vocabularyRichness: vocabulary,
      grammarQuality: grammar
    }
  }

  /**
   * Assess personalization strength
   */
  private assessPersonalization(examples: TrainingExample[], userProfile: any) {
    const personalRefs = this.countPersonalReferences(examples, userProfile)
    const uniqueExpressions = this.countUniqueExpressions(examples)
    const voiceConsistency = this.assessVoiceConsistency(examples)
    
    return {
      score: Math.round((personalRefs * 0.4) + (uniqueExpressions * 0.3) + (voiceConsistency * 0.3)),
      personalReferences: personalRefs,
      uniqueExpressions: uniqueExpressions,
      consistentVoice: voiceConsistency
    }
  }

  /**
   * Assess data completeness
   */
  private assessCompleteness(examples: TrainingExample[]) {
    const totalWords = examples.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0)
    const contextRichness = this.assessContextRichness(examples)
    
    return {
      score: Math.min(100, (examples.length / 5) + (totalWords / 200) + contextRichness),
      totalEntries: examples.length,
      totalWords,
      contextRichness
    }
  }

  /**
   * Generate comprehensive statistics
   */
  private generateStatistics(examples: TrainingExample[]) {
    const dataSourceBreakdown = examples.reduce((acc, ex) => {
      acc[ex.metadata.dataSource] = (acc[ex.metadata.dataSource] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const categoryDistribution = examples.reduce((acc, ex) => {
      acc[ex.metadata.questionCategory] = (acc[ex.metadata.questionCategory] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const emotionalToneDistribution = examples.reduce((acc, ex) => {
      const tone = ex.metadata.emotionalTone || 'neutral'
      acc[tone] = (acc[tone] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const temporalDistribution = this.generateTemporalDistribution(examples)
    
    return {
      totalExamples: examples.length,
      averageLength: Math.round(examples.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0) / examples.length),
      dataSourceBreakdown,
      categoryDistribution,
      emotionalToneDistribution,
      temporalDistribution
    }
  }

  /**
   * Generate training recommendations
   */
  private generateRecommendations(quality: DataQualityMetrics, statistics: any) {
    const suggestions = []
    let estimatedQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'poor'
    
    if (quality.overallScore < 40) {
      estimatedQuality = 'poor'
      suggestions.push('Data quality is insufficient for effective training')
    } else if (quality.overallScore < 60) {
      estimatedQuality = 'fair'
      suggestions.push('Training possible but model quality may be limited')
    } else if (quality.overallScore < 80) {
      estimatedQuality = 'good'
      suggestions.push('Good quality data - training should produce solid results')
    } else {
      estimatedQuality = 'excellent'
      suggestions.push('Excellent data quality - optimal for high-quality model training')
    }
    
    // Specific improvement suggestions
    if (quality.diversity.categoriesCovered < 8) {
      suggestions.push(`Add responses from ${8 - quality.diversity.categoriesCovered} more question categories`)
    }
    
    if (quality.coherence.averageLength < 50) {
      suggestions.push('Encourage longer, more detailed responses')
    }
    
    if (statistics.totalExamples < 100) {
      suggestions.push(`Add ${100 - statistics.totalExamples} more training examples for better coverage`)
    }
    
    // Training parameters based on data quality
    const recommendedParams = {
      epochs: quality.overallScore > 70 ? 3 : quality.overallScore > 50 ? 4 : 5,
      batchSize: statistics.totalExamples > 500 ? 8 : 4,
      learningRate: quality.overallScore > 70 ? 2e-5 : 1e-5,
      loraRank: quality.personalization.score > 60 ? 16 : 8
    }
    
    return {
      trainingReadiness: quality.overallScore >= 50 && statistics.totalExamples >= 50,
      suggestedImprovements: suggestions,
      estimatedModelQuality: estimatedQuality,
      recommendedTrainingParams: recommendedParams
    }
  }

  // Helper methods
  private enhanceInstruction(questionText: string, category: string): string {
    const contextualPhrases = {
      'family': 'From your heart as a family member',
      'career': 'Drawing from your professional experience',
      'personal_growth': 'Reflecting on your personal journey',
      'relationships': 'Speaking about the people who matter to you',
      'values': 'Sharing your core beliefs and principles',
      'memories': 'Recalling a meaningful moment',
      'advice': 'Offering your wisdom',
      'life_story': 'Tell me about'
    }
    
    const prefix = contextualPhrases[category] || 'Please share'
    return `${prefix}, ${questionText.toLowerCase()}`
  }

  private generateContextualInstruction(item: any, type: string): string {
    if (type === 'milestone') {
      return `Write a heartfelt ${item.milestone_type?.replace('_', ' ') || 'milestone'} message${item.recipient_name ? ` for ${item.recipient_name}` : ''}`
    } else {
      return `Tell me about ${item.title?.toLowerCase() || 'this experience'}`
    }
  }

  private detectAdvancedEmotionalTone(text: string): string {
    const lowerText = text.toLowerCase()
    
    // More sophisticated emotion detection
    const emotions = {
      joyful: ['love', 'joy', 'happy', 'excited', 'wonderful', 'amazing', 'blessed'],
      proud: ['proud', 'accomplish', 'achieve', 'success', 'triumph'],
      nostalgic: ['remember', 'miss', 'used to', 'back then', 'memories'],
      wise: ['learn', 'advice', 'important', 'realize', 'understand'],
      grateful: ['thankful', 'grateful', 'appreciate', 'blessed', 'fortunate'],
      loving: ['love', 'care', 'cherish', 'adore', 'precious'],
      hopeful: ['hope', 'future', 'dream', 'wish', 'believe'],
      reflective: ['think', 'consider', 'reflect', 'ponder', 'contemplate']
    }
    
    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return emotion
      }
    }
    
    return 'neutral'
  }

  private calculateQualityScore(text: string): number {
    let score = 0
    
    // Length factor (optimal around 100-300 words)
    const wordCount = text.split(' ').length
    if (wordCount >= 50 && wordCount <= 400) score += 30
    else if (wordCount >= 20) score += 15
    
    // Sentence structure variety
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length > 2) score += 20
    
    // Personal pronouns (indicates personal narrative)
    const personalWords = ['I', 'my', 'me', 'we', 'our', 'us']
    const personalCount = personalWords.reduce((count, word) => 
      count + (text.toLowerCase().match(new RegExp(`\\b${word.toLowerCase()}\\b`, 'g')) || []).length, 0
    )
    if (personalCount > 0) score += Math.min(25, personalCount * 5)
    
    // Emotional expressions
    const emotionalWords = ['feel', 'felt', 'emotion', 'love', 'happy', 'sad', 'proud', 'grateful']
    const emotionalCount = emotionalWords.reduce((count, word) => 
      count + (text.toLowerCase().includes(word) ? 1 : 0), 0
    )
    score += Math.min(15, emotionalCount * 3)
    
    // Specific details (names, places, times)
    const detailPatterns = [/\b[A-Z][a-z]+\b/g, /\b\d{4}\b/g, /\b(when|where|who)\b/gi]
    const detailCount = detailPatterns.reduce((count, pattern) => 
      count + (text.match(pattern) || []).length, 0
    )
    score += Math.min(10, detailCount)
    
    return Math.min(100, Math.max(0, score))
  }

  private extractPeopleReferences(text: string, userProfile: any): string[] {
    const people = []
    
    // Extract from important people
    const importantPeople = this.parseImportantPeople(userProfile.important_people)
    for (const person of importantPeople) {
      if (text.toLowerCase().includes(person.toLowerCase())) {
        people.push(person)
      }
    }
    
    // Extract common relationship terms
    const relationships = ['husband', 'wife', 'son', 'daughter', 'mother', 'father', 'friend', 'colleague']
    for (const rel of relationships) {
      if (text.toLowerCase().includes(rel)) {
        people.push(rel)
      }
    }
    
    return [...new Set(people)]
  }

  private parseImportantPeople(importantPeopleJson: any): string[] {
    try {
      if (importantPeopleJson && typeof importantPeopleJson === 'object') {
        return Object.values(importantPeopleJson).map((p: any) => p.name).filter(Boolean)
      }
      if (typeof importantPeopleJson === 'string') {
        const parsed = JSON.parse(importantPeopleJson)
        return parsed.map((p: any) => p.name).filter(Boolean)
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return []
  }

  private calculateAge(birthday: string, referenceDate: string): number | null {
    if (!birthday || !referenceDate) return null
    
    const birth = new Date(birthday)
    const reference = new Date(referenceDate)
    const age = reference.getFullYear() - birth.getFullYear()
    
    return age
  }

  private calculateTimespan(examples: TrainingExample[]): number {
    if (examples.length === 0) return 0
    
    const dates = examples.map(ex => new Date(ex.metadata.timestamp))
    const earliest = Math.min(...dates.map(d => d.getTime()))
    const latest = Math.max(...dates.map(d => d.getTime()))
    
    return Math.round((latest - earliest) / (1000 * 60 * 60 * 24)) // days
  }

  private assessVocabularyRichness(examples: TrainingExample[]): number {
    const allWords = examples.flatMap(ex => ex.output.toLowerCase().split(/\s+/))
    const uniqueWords = new Set(allWords)
    
    return Math.min(100, (uniqueWords.size / allWords.length) * 400)
  }

  private assessGrammarQuality(examples: TrainingExample[]): number {
    // Simple heuristic - proper capitalization and punctuation
    let score = 0
    
    for (const example of examples) {
      const text = example.output
      
      // Check capitalization
      if (text.charAt(0) === text.charAt(0).toUpperCase()) score += 5
      
      // Check ending punctuation
      if (/[.!?]$/.test(text.trim())) score += 5
      
      // Check for complete sentences
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
      if (sentences.length >= 2) score += 10
    }
    
    return Math.min(100, score / examples.length)
  }

  private countPersonalReferences(examples: TrainingExample[], userProfile: any): number {
    const personalTerms = [
      userProfile.name,
      userProfile.primary_role,
      ...(userProfile.secondary_roles || []),
      ...this.parseImportantPeople(userProfile.important_people)
    ].filter(Boolean)
    
    let count = 0
    for (const example of examples) {
      for (const term of personalTerms) {
        if (example.output.toLowerCase().includes(term.toLowerCase())) {
          count += 5
        }
      }
    }
    
    return Math.min(100, count / examples.length)
  }

  private countUniqueExpressions(examples: TrainingExample[]): number {
    const expressions = examples.map(ex => ex.output.toLowerCase())
    const uniqueExpressions = new Set(expressions)
    
    return Math.min(100, (uniqueExpressions.size / expressions.length) * 100)
  }

  private assessVoiceConsistency(examples: TrainingExample[]): number {
    // Heuristic: consistent use of personal pronouns and similar sentence structures
    const firstPersonUsage = examples.map(ex => {
      const text = ex.output.toLowerCase()
      const firstPersonCount = (text.match(/\b(i|my|me|we|our|us)\b/g) || []).length
      return firstPersonCount / ex.output.split(' ').length
    })
    
    const avgUsage = firstPersonUsage.reduce((a, b) => a + b, 0) / firstPersonUsage.length
    const variance = firstPersonUsage.reduce((sum, usage) => sum + Math.pow(usage - avgUsage, 2), 0) / firstPersonUsage.length
    
    return Math.max(0, 100 - (variance * 1000))
  }

  private assessContextRichness(examples: TrainingExample[]): number {
    let richness = 0
    
    for (const example of examples) {
      // Check for specific details
      if (example.metadata.importantPeople && example.metadata.importantPeople.length > 0) richness += 5
      if (example.metadata.emotionalTone !== 'neutral') richness += 3
      if (example.metadata.qualityScore && example.metadata.qualityScore > 60) richness += 2
    }
    
    return Math.min(100, richness / examples.length)
  }

  private generateTemporalDistribution(examples: TrainingExample[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    for (const example of examples) {
      const date = new Date(example.metadata.timestamp)
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      distribution[monthYear] = (distribution[monthYear] || 0) + 1
    }
    
    return distribution
  }
}

// Singleton instance
export const enhancedDataPipeline = new EnhancedDataPipeline()