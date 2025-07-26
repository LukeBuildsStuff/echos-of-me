// AI Question Enhancement System for Deeper Emotional Resonance
// Analyzes user responses to generate increasingly meaningful and personalized questions

import { FamilyRole } from './family-role-questions'
import { LegacyCategory } from './legacy-questions'

export interface UserContext {
  userId: string
  role: FamilyRole
  responseHistory: ResponseAnalysis[]
  emotionalProfile: EmotionalProfile
  relationshipDynamics: RelationshipDynamics
  culturalContext: CulturalContext
  lifeStage: LifeStage
}

export interface ResponseAnalysis {
  questionId: string
  questionText: string
  responseText: string
  wordCount: number
  emotionalTone: EmotionalTone
  keyThemes: string[]
  mentionedPeople: string[]
  temporalContext: 'past' | 'present' | 'future'
  responseDepth: 1 | 2 | 3 | 4 | 5
}

export interface EmotionalProfile {
  dominantEmotions: string[]
  emotionalRange: 'narrow' | 'moderate' | 'wide'
  vulnerabilityLevel: 'guarded' | 'selective' | 'open'
  expressionStyle: 'direct' | 'metaphorical' | 'storytelling'
  processingStyle: 'analytical' | 'emotional' | 'balanced'
}

export interface RelationshipDynamics {
  primaryRelationships: Array<{
    person: string
    relationshipType: string
    emotionalCloseness: 'distant' | 'cordial' | 'close' | 'intimate'
    mentionFrequency: number
  }>
  familyStructure: 'nuclear' | 'extended' | 'blended' | 'chosen'
  conflictPatterns: string[]
  supportSystems: string[]
}

export interface CulturalContext {
  culturalBackground: string[]
  valueSystem: string[]
  generationalPerspective: 'traditional' | 'transitional' | 'modern'
  languagePatterns: string[]
}

export interface LifeStage {
  currentPhase: 'young_adult' | 'establishing' | 'midlife' | 'mature' | 'elder'
  majorTransitions: string[]
  currentChallenges: string[]
  futureAnticipations: string[]
}

export type EmotionalTone = 
  | 'joyful' | 'peaceful' | 'nostalgic' | 'melancholic' 
  | 'anxious' | 'hopeful' | 'grateful' | 'regretful'
  | 'loving' | 'proud' | 'fearful' | 'angry'

// Enhanced question generation prompts based on emotional patterns
export const emotionalResonancePrompts = {
  // For users who express deep love and connection
  highConnection: [
    "You've spoken so lovingly about {person}. What specific moment captures the essence of your bond?",
    "When you think about {person}'s future, what prayer or wish fills your heart?",
    "What unspoken understanding exists between you and {person} that others might not see?",
    "If {person} could feel your love across time and space, what would that love tell them?",
    "What sacred moments with {person} do you return to when you need comfort?"
  ],

  // For users processing grief or loss
  griefProcessing: [
    "You've experienced significant loss. How has grief shaped your understanding of love?",
    "What would you want your family to know about finding joy again after loss?",
    "How do you carry {person}'s memory in a way that brings light rather than only sadness?",
    "What has loss taught you about the preciousness of time with loved ones?",
    "If you could speak to others experiencing similar loss, what comfort would you offer?"
  ],

  // For users showing vulnerability about mistakes
  redemptionSeeking: [
    "You've been honest about your regrets. What wisdom came from those experiences?",
    "If you could have a healing conversation with {person}, what would you say?",
    "How do you want your children to understand that imperfection is part of being human?",
    "What would forgiveness - both given and received - mean in your family's story?",
    "How has acknowledging your mistakes made you a more compassionate person?"
  ],

  // For users expressing deep wisdom
  wisdomSharing: [
    "Your insights about {theme} are profound. How did you come to understand this?",
    "What life experience crystallized this wisdom for you?",
    "If you could plant one seed of understanding about {theme} in your family's hearts, what would grow?",
    "How do you hope your family will apply this wisdom in their own unique ways?",
    "What questions about {theme} do you still ponder, even with all your experience?"
  ],

  // For users focused on legacy and meaning
  legacyBuilding: [
    "When you imagine your great-grandchildren, what family qualities do you hope persist?",
    "What intangible inheritance matters more to you than any material legacy?",
    "How do you want to be remembered in family stories 100 years from now?",
    "What family tradition carries the deepest meaning, and why must it survive?",
    "If your life philosophy could be distilled into one truth, what would endure?"
  ]
}

// Dynamic question enhancement based on response patterns
export class AIQuestionEnhancer {
  private userContext: UserContext
  private openAIKey?: string

  constructor(userContext: UserContext, openAIKey?: string) {
    this.userContext = userContext
    this.openAIKey = openAIKey
  }

  // Analyze user's response patterns to build emotional profile
  analyzeResponsePatterns(): EmotionalProfile {
    const responses = this.userContext.responseHistory
    
    // Analyze emotional tones across responses
    const emotionCounts = responses.reduce((acc, r) => {
      acc[r.emotionalTone] = (acc[r.emotionalTone] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const dominantEmotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion)
    
    // Analyze emotional range
    const uniqueEmotions = new Set(responses.map(r => r.emotionalTone))
    const emotionalRange = uniqueEmotions.size > 6 ? 'wide' : 
                          uniqueEmotions.size > 3 ? 'moderate' : 'narrow'
    
    // Analyze vulnerability based on response depth
    const avgDepth = responses.reduce((sum, r) => sum + r.responseDepth, 0) / responses.length
    const vulnerabilityLevel = avgDepth > 3.5 ? 'open' : 
                              avgDepth > 2.5 ? 'selective' : 'guarded'
    
    // Analyze expression style based on response content
    const metaphoricalResponses = responses.filter(r => 
      r.responseText.includes('like') || r.responseText.includes('as if')
    ).length
    const storyResponses = responses.filter(r => 
      r.responseText.includes('remember when') || r.responseText.includes('one time')
    ).length
    
    const expressionStyle = storyResponses > responses.length * 0.4 ? 'storytelling' :
                           metaphoricalResponses > responses.length * 0.3 ? 'metaphorical' : 'direct'
    
    return {
      dominantEmotions,
      emotionalRange,
      vulnerabilityLevel,
      expressionStyle,
      processingStyle: this.determineProcessingStyle(responses)
    }
  }

  // Generate personalized follow-up questions based on response
  async generateFollowUpQuestion(
    lastResponse: ResponseAnalysis,
    category: LegacyCategory
  ): Promise<string[]> {
    const { emotionalTone, keyThemes, mentionedPeople } = lastResponse
    const { emotionalProfile, relationshipDynamics } = this.userContext
    
    // Select appropriate prompt templates based on emotional patterns
    let templates: string[] = []
    
    if (emotionalProfile.dominantEmotions.includes('loving') && mentionedPeople.length > 0) {
      templates.push(...emotionalResonancePrompts.highConnection)
    }
    
    if (emotionalTone === 'melancholic' || emotionalTone === 'regretful') {
      templates.push(...emotionalResonancePrompts.griefProcessing)
    }
    
    if (keyThemes.includes('mistake') || keyThemes.includes('regret')) {
      templates.push(...emotionalResonancePrompts.redemptionSeeking)
    }
    
    // Personalize templates with context
    const personalizedQuestions = templates.map(template => 
      this.personalizeTemplate(template, {
        person: mentionedPeople[0] || 'your loved one',
        theme: keyThemes[0] || 'life',
        ...this.extractContextVariables(lastResponse)
      })
    )
    
    // If OpenAI is available, enhance further
    if (this.openAIKey) {
      const enhanced = await this.enhanceWithOpenAI(
        personalizedQuestions[0],
        lastResponse,
        category
      )
      return [enhanced, ...personalizedQuestions.slice(1, 3)]
    }
    
    return personalizedQuestions.slice(0, 3)
  }

  // Create deeply personal questions based on cumulative context
  generateContextualQuestions(count: number = 5): string[] {
    const { emotionalProfile, relationshipDynamics, lifeStage } = this.userContext
    const questions: string[] = []
    
    // Questions based on vulnerability level
    if (emotionalProfile.vulnerabilityLevel === 'open') {
      questions.push(
        "You've shared so openly. What truth about yourself do you still find difficult to voice?",
        "What fear about the future do you carry that you haven't told anyone?",
        "If you could heal one wound in your family's history, what would it be?"
      )
    } else if (emotionalProfile.vulnerabilityLevel === 'guarded') {
      questions.push(
        "What small moment of joy from today would you like to remember?",
        "Which family tradition brings you the most comfort?",
        "What quality in your children makes you most hopeful for their future?"
      )
    }
    
    // Questions based on relationship dynamics
    const closeRelationships = relationshipDynamics.primaryRelationships
      .filter(r => r.emotionalCloseness === 'intimate' || r.emotionalCloseness === 'close')
    
    closeRelationships.forEach(rel => {
      questions.push(
        `What does ${rel.person} need to hear from you that you haven't said yet?`,
        `How has your relationship with ${rel.person} taught you about love?`,
        `What moment with ${rel.person} captures everything you want them to remember about your bond?`
      )
    })
    
    // Questions based on life stage
    const stageQuestions = this.getLifeStageQuestions(lifeStage.currentPhase)
    questions.push(...stageQuestions)
    
    return questions.slice(0, count)
  }

  // Enhance question with OpenAI for deeper emotional resonance
  private async enhanceWithOpenAI(
    baseQuestion: string,
    lastResponse: ResponseAnalysis,
    category: LegacyCategory
  ): Promise<string> {
    if (!this.openAIKey) return baseQuestion
    
    const prompt = `
You are helping preserve family legacy with deeply meaningful questions. 
Based on this response: "${lastResponse.responseText.substring(0, 200)}..."
Which showed ${lastResponse.emotionalTone} emotion and mentioned ${lastResponse.mentionedPeople.join(', ')},
enhance this follow-up question to be more emotionally resonant and personally meaningful:
"${baseQuestion}"

The enhanced question should:
1. Feel naturally connected to what they just shared
2. Invite deeper emotional exploration
3. Be specific to their family situation
4. Honor the sacred nature of legacy preservation

Enhanced question:`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at crafting deeply meaningful questions for family legacy preservation.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        }),
      })

      const data = await response.json()
      return data.choices[0]?.message?.content || baseQuestion
    } catch (error) {
      console.error('OpenAI enhancement failed:', error)
      return baseQuestion
    }
  }

  // Helper methods
  private determineProcessingStyle(responses: ResponseAnalysis[]): 'analytical' | 'emotional' | 'balanced' {
    const analyticalKeywords = ['because', 'therefore', 'reason', 'think', 'understand']
    const emotionalKeywords = ['feel', 'heart', 'soul', 'love', 'hurt']
    
    let analyticalCount = 0
    let emotionalCount = 0
    
    responses.forEach(r => {
      const text = r.responseText.toLowerCase()
      analyticalCount += analyticalKeywords.filter(kw => text.includes(kw)).length
      emotionalCount += emotionalKeywords.filter(kw => text.includes(kw)).length
    })
    
    const ratio = analyticalCount / (emotionalCount || 1)
    
    if (ratio > 1.5) return 'analytical'
    if (ratio < 0.7) return 'emotional'
    return 'balanced'
  }

  private personalizeTemplate(template: string, variables: Record<string, string>): string {
    let personalized = template
    Object.entries(variables).forEach(([key, value]) => {
      personalized = personalized.replace(new RegExp(`{${key}}`, 'g'), value)
    })
    return personalized
  }

  private extractContextVariables(response: ResponseAnalysis): Record<string, string> {
    return {
      timeframe: response.temporalContext,
      emotion: response.emotionalTone,
      theme: response.keyThemes[0] || 'your experience',
      // Add more extracted variables as needed
    }
  }

  private getLifeStageQuestions(stage: LifeStage['currentPhase']): string[] {
    const stageQuestions = {
      young_adult: [
        "What do you wish you had known at the beginning of your adult journey?",
        "How do you want your children to approach building their own lives?"
      ],
      establishing: [
        "What has building a family and career taught you about priorities?",
        "How do you balance ambition with presence for those you love?"
      ],
      midlife: [
        "What midlife revelations changed your perspective on what matters?",
        "How has your understanding of time and mortality shifted your choices?"
      ],
      mature: [
        "What wisdom can only come from lived experience?",
        "How do you want to spend the years you have remaining?"
      ],
      elder: [
        "What do you see most clearly now that was once obscured by youth?",
        "What final gifts of wisdom do you want to leave your family?"
      ]
    }
    
    return stageQuestions[stage] || []
  }
}

// Analyze emotional themes across multiple responses
export function analyzeEmotionalThemes(responses: ResponseAnalysis[]): {
  primaryThemes: string[]
  emotionalJourney: string
  growthAreas: string[]
} {
  // Track theme frequency
  const themeFrequency = responses.reduce((acc, r) => {
    r.keyThemes.forEach(theme => {
      acc[theme] = (acc[theme] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)
  
  const primaryThemes = Object.entries(themeFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme)
  
  // Analyze emotional journey
  const emotionalProgression = responses.map(r => r.emotionalTone)
  const emotionalJourney = describeEmotionalJourney(emotionalProgression)
  
  // Identify growth areas
  const growthAreas = identifyGrowthAreas(responses)
  
  return {
    primaryThemes,
    emotionalJourney,
    growthAreas
  }
}

function describeEmotionalJourney(emotions: EmotionalTone[]): string {
  // Simplified journey description
  const start = emotions.slice(0, 3)
  const end = emotions.slice(-3)
  
  const startMood = mostCommon(start)
  const endMood = mostCommon(end)
  
  if (startMood === endMood) {
    return `Consistent ${startMood} throughout sharing`
  } else {
    return `Journey from ${startMood} to ${endMood}`
  }
}

function identifyGrowthAreas(responses: ResponseAnalysis[]): string[] {
  const areas: string[] = []
  
  // Check for increasing vulnerability
  const depthProgression = responses.map(r => r.responseDepth)
  if (isIncreasing(depthProgression)) {
    areas.push('Increasing emotional openness')
  }
  
  // Check for reconciliation themes
  if (responses.some(r => r.keyThemes.includes('forgiveness'))) {
    areas.push('Working through forgiveness')
  }
  
  // Check for future-focused responses
  const futureCount = responses.filter(r => r.temporalContext === 'future').length
  if (futureCount > responses.length * 0.3) {
    areas.push('Future-oriented hope')
  }
  
  return areas
}

// Utility functions
function mostCommon<T>(arr: T[]): T {
  const counts = arr.reduce((acc, item) => {
    acc[String(item)] = (acc[String(item)] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)[0][0] as T
}

function isIncreasing(arr: number[]): boolean {
  let increases = 0
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > arr[i - 1]) increases++
  }
  return increases > arr.length * 0.6
}