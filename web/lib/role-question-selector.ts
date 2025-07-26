// Intelligent Role-Based Question Selection System
// Personalizes the legacy preservation experience based on family relationships

import { FamilyRole, RoleSpecificQuestion, getQuestionsByRole } from './family-role-questions'
import { LegacyCategory, legacyQuestionTemplates } from './legacy-questions'

// Helper function to calculate current ages from birthdays
export function calculateAgesFromBirthdays(birthdays: string[]): number[] {
  const today = new Date()
  return birthdays.map(birthday => {
    const birthDate = new Date(birthday)
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age
  })
}

export interface UserProfile {
  userId: string
  primaryRole: FamilyRole
  secondaryRoles?: FamilyRole[]
  name?: string
  birthday?: string
  childrenBirthdays?: string[] // Birthdays of children/grandchildren
  importantPeople?: Array<{
    name: string
    relationship: string
  }>
  significantEvents?: string[] // marriage, divorce, loss, illness
  culturalBackground?: string[]
}

export interface QuestionSession {
  sessionId: string
  userId: string
  role: FamilyRole
  questionsDelivered: string[]
  questionsAnswered: string[]
  emotionalDepthProgression: number[]
  sessionMood: 'reflective' | 'celebratory' | 'sorrowful' | 'practical' | 'mixed'
}

export class RoleQuestionSelector {
  private userProfile: UserProfile
  private sessionHistory: QuestionSession[]
  private answeredQuestions: Set<string>

  constructor(userProfile: UserProfile, sessionHistory: QuestionSession[] = []) {
    this.userProfile = userProfile
    this.sessionHistory = sessionHistory
    this.answeredQuestions = new Set(
      sessionHistory.flatMap(session => session.questionsAnswered)
    )
  }

  // Get personalized questions based on role and context
  getPersonalizedQuestions(count: number = 5, targetDepth?: number): string[] {
    const questions: string[] = []
    const roleQuestions = this.getRoleSpecificQuestions()
    const contextualQuestions = this.getContextualQuestions()
    
    // Mix role-specific and contextual questions
    const allCandidates = [...roleQuestions, ...contextualQuestions]
      .filter(q => !this.answeredQuestions.has(q))
    
    // Sort by emotional depth if specified
    if (targetDepth) {
      // Prioritize questions near target depth
      allCandidates.sort((a, b) => {
        const depthA = this.getQuestionDepth(a)
        const depthB = this.getQuestionDepth(b)
        return Math.abs(depthA - targetDepth) - Math.abs(depthB - targetDepth)
      })
    }
    
    return allCandidates.slice(0, count)
  }

  // Get milestone-specific questions based on life events
  getMilestoneQuestions(milestone: string): string[] {
    const milestoneMap: Record<string, string[]> = {
      'new_parent': [
        "What do you want me to know about becoming a parent for the first time?",
        "What wisdom about raising children do you most want to pass on?",
        "How did becoming a parent change your understanding of your own parents?"
      ],
      'empty_nest': [
        "How do you want me to handle it when my own children leave home?",
        "What new purpose did you find after children became independent?",
        "How did your marriage evolve after the children left?"
      ],
      'loss_of_spouse': [
        "How do you want me to honor our love after you're gone?",
        "What would you want me to know about finding joy again?",
        "How should I keep your memory alive for our children?"
      ],
      'retirement': [
        "What does meaningful retirement look like to you?",
        "How do you find purpose when your career identity changes?",
        "What dreams do you have for this next chapter?"
      ],
      'serious_illness': [
        "What gives you strength during health challenges?",
        "How do you want to be remembered beyond your illness?",
        "What would you want me to know about finding meaning in suffering?"
      ]
    }

    return milestoneMap[milestone] || []
  }

  // Get questions based on relationship dynamics
  private getRoleSpecificQuestions(): string[] {
    const primaryQuestions = getQuestionsByRole(this.userProfile.primaryRole)
      .flatMap(category => category.questions)
    
    const secondaryQuestions = (this.userProfile.secondaryRoles || [])
      .flatMap(role => getQuestionsByRole(role))
      .flatMap(category => category.questions)
    
    return [...primaryQuestions, ...secondaryQuestions]
  }

  // Get contextual questions based on life circumstances
  private getContextualQuestions(): string[] {
    const questions: string[] = []
    
    // Add questions based on relationship duration
    if (this.userProfile.relationshipYears) {
      if (this.userProfile.relationshipYears > 25) {
        questions.push(
          "What has sustained your love through decades of change?",
          "How has your understanding of commitment evolved over the years?"
        )
      }
    }
    
    // Add questions based on children's ages
    if (this.userProfile.childrenAges) {
      const hasYoungChildren = this.userProfile.childrenAges.some(age => age < 10)
      const hasTeenagers = this.userProfile.childrenAges.some(age => age >= 13 && age <= 19)
      const hasAdultChildren = this.userProfile.childrenAges.some(age => age >= 20)
      
      if (hasYoungChildren) {
        questions.push(
          "What do you want your young children to remember about their childhood?",
          "What values are you trying to instill while they're still young?"
        )
      }
      
      if (hasTeenagers) {
        questions.push(
          "What do you want your teenagers to know about navigating adolescence?",
          "How do you stay connected when they're pulling away?"
        )
      }
      
      if (hasAdultChildren) {
        questions.push(
          "How has your relationship with your adult children evolved?",
          "What wisdom do you have about transitioning from parent to friend?"
        )
      }
    }
    
    return questions
  }

  // Estimate emotional depth of a question
  private getQuestionDepth(question: string): number {
    const deepIndicators = [
      'death', 'dying', 'legacy', 'final', 'last',
      'deepest', 'profound', 'soul', 'essence', 'core'
    ]
    
    const moderateIndicators = [
      'values', 'beliefs', 'meaning', 'purpose', 'wisdom',
      'love', 'relationship', 'marriage', 'family'
    ]
    
    const lightIndicators = [
      'favorite', 'enjoy', 'fun', 'hobby', 'daily',
      'routine', 'preference', 'like', 'usually'
    ]
    
    const lowerQuestion = question.toLowerCase()
    
    if (deepIndicators.some(word => lowerQuestion.includes(word))) {
      return 9
    } else if (moderateIndicators.some(word => lowerQuestion.includes(word))) {
      return 6
    } else if (lightIndicators.some(word => lowerQuestion.includes(word))) {
      return 3
    }
    
    return 5 // default middle depth
  }

  // Get questions for specific emotional states
  getQuestionsForMood(mood: 'reflective' | 'celebratory' | 'sorrowful' | 'practical'): string[] {
    const moodQuestions: Record<string, string[]> = {
      reflective: [
        "What life lessons took you the longest to learn?",
        "How has your perspective on what matters evolved?",
        "What would you tell your younger self?"
      ],
      celebratory: [
        "What achievements fill you with the most pride?",
        "What moments of joy do you replay in your mind?",
        "What family celebrations were most meaningful?"
      ],
      sorrowful: [
        "How have you found meaning in loss and grief?",
        "What comforts you during difficult times?",
        "How do you want to be remembered?"
      ],
      practical: [
        "What practical skills should everyone in the family know?",
        "What financial wisdom do you want to pass on?",
        "How do you organize important family information?"
      ]
    }
    
    return moodQuestions[mood] || []
  }

  // Progressive question depth for gradual emotional opening
  getProgressiveQuestions(session: number): string[] {
    const depthProgression = [
      { session: 1, minDepth: 1, maxDepth: 4 }, // Start light
      { session: 2, minDepth: 3, maxDepth: 6 }, // Build comfort
      { session: 3, minDepth: 5, maxDepth: 8 }, // Deepen
      { session: 4, minDepth: 7, maxDepth: 10 } // Most profound
    ]
    
    const targetRange = depthProgression.find(p => p.session === session) || depthProgression[3]
    
    return this.getPersonalizedQuestions(5, targetRange.minDepth)
  }

  // Get questions for specific family situations
  getBlendedFamilyQuestions(): string[] {
    return [
      "How did you build love with children who weren't biologically yours?",
      "What challenges did blending families present and how did you overcome them?",
      "How do you honor all the different relationships in a blended family?",
      "What wisdom do you have about step-parenting?",
      "How did you create unity while respecting everyone's history?"
    ]
  }

  getAdoptionQuestions(): string[] {
    return [
      "How do you want your adopted children to understand their story?",
      "What does it mean that family is about choice, not just biology?",
      "How did adoption shape your understanding of love and family?",
      "What do you want your children to know about why you chose them?",
      "How do you honor both their birth story and their family story?"
    ]
  }

  getSingleParentQuestions(): string[] {
    return [
      "What strength did you find in raising children alone?",
      "How did you fulfill multiple roles for your children?",
      "What support systems became your village?",
      "What do you want your children to understand about your sacrifices?",
      "How did single parenting shape who you became?"
    ]
  }
}

// Export utility function for easy use
export function createQuestionSelector(userProfile: UserProfile): RoleQuestionSelector {
  return new RoleQuestionSelector(userProfile)
}

// Batch question generation for different scenarios
export function getQuestionPackage(
  role: FamilyRole,
  scenario: 'daily' | 'milestone' | 'legacy' | 'crisis'
): string[] {
  const packages: Record<string, string[]> = {
    daily: [
      "What does a perfect ordinary day look like to you?",
      "What small daily rituals bring you joy?",
      "How do you find meaning in routine activities?",
      "What daily habits define who you are?",
      "What would you want me to remember about our everyday life together?"
    ],
    milestone: [
      "What do you want me to know as I face this major life change?",
      "How should I honor this transition in my life?",
      "What wisdom do you have about navigating big moments?",
      "How do you find courage during major transitions?",
      "What would you whisper to me during this important time?"
    ],
    legacy: [
      "What is the most important thing you want me to carry forward?",
      "How do you want to be remembered by future generations?",
      "What family legacy are you most proud of?",
      "What values must never be lost from our family?",
      "What final message encompasses everything you want to say?"
    ],
    crisis: [
      "What strength do you want me to remember I have during crisis?",
      "How have you found hope in the darkest moments?",
      "What would you tell me about surviving difficult times?",
      "How do you maintain faith when everything seems lost?",
      "What love do you want me to feel when I'm struggling?"
    ]
  }
  
  return packages[scenario] || packages.daily
}