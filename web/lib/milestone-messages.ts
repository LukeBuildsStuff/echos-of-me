// Milestone Message System - Text-based messages for future life events
// Users can write diary-like entries to be preserved for specific moments

export type MilestoneType = 
  | 'wedding'
  | 'graduation'
  | 'new_baby'
  | 'first_job'
  | 'retirement'
  | 'loss'
  | 'birthday'
  | 'anniversary'
  | 'difficult_time'
  | 'achievement'
  | 'custom'

export interface MilestoneMessage {
  id: string
  userId: string
  milestoneType: MilestoneType
  customMilestoneName?: string // For custom milestones
  recipientName?: string // Who this message is for
  messageTitle: string
  messageContent: string
  triggerDate?: Date // Specific date if known
  triggerAge?: number // e.g., "when you turn 18"
  triggerEvent?: string // e.g., "when you have your first child"
  emotionalTone: 'celebratory' | 'supportive' | 'guiding' | 'loving' | 'reflective'
  tags: string[]
  createdAt: Date
  updatedAt: Date
  isPrivate: boolean // Whether only specific recipients can access
}

export interface LifeDetailEntry {
  id: string
  userId: string
  entryDate: Date
  title: string
  content: string
  category: 'memory' | 'reflection' | 'advice' | 'story' | 'feeling' | 'observation'
  tags: string[]
  relatedPeople: string[] // Names of people mentioned
  emotionalDepth: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  attachedQuestionId?: string // If this was prompted by a specific question
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}

// Milestone message templates to help users get started
export const milestoneTemplates: Record<MilestoneType, {
  title: string
  description: string
  prompts: string[]
  suggestedTone: MilestoneMessage['emotionalTone']
}> = {
  wedding: {
    title: 'Wedding Day Message',
    description: 'Share your joy, wisdom, and blessings for their marriage',
    suggestedTone: 'celebratory',
    prompts: [
      "What marriage wisdom do you want to share from your own experience?",
      "What do you see in their relationship that gives you joy?",
      "What blessings and hopes do you have for their future together?",
      "What family traditions do you hope they'll continue?",
      "What would you whisper to them on their wedding day?"
    ]
  },
  graduation: {
    title: 'Graduation Message',
    description: 'Celebrate their achievement and guide their next steps',
    suggestedTone: 'celebratory',
    prompts: [
      "How proud are you of their educational journey?",
      "What advice do you have as they enter this new phase?",
      "What qualities have you seen develop in them?",
      "What dreams do you have for their future?",
      "What would you tell them about finding their path?"
    ]
  },
  new_baby: {
    title: 'New Baby Message',
    description: 'Welcome a new family member with love and wisdom',
    suggestedTone: 'loving',
    prompts: [
      "What do you want them to know about becoming a parent?",
      "What family love will surround this new child?",
      "What hopes do you have for this new generation?",
      "What parenting wisdom has been passed down in our family?",
      "What blessing would you give to this new life?"
    ]
  },
  first_job: {
    title: 'First Job Message',
    description: 'Guide them as they start their career journey',
    suggestedTone: 'guiding',
    prompts: [
      "What do you want them to know about finding purpose in work?",
      "What professional wisdom would help them succeed?",
      "How should they handle workplace challenges?",
      "What's important about maintaining integrity in career?",
      "What would you tell them about work-life balance?"
    ]
  },
  retirement: {
    title: 'Retirement Message',
    description: 'Celebrate their career and encourage their next chapter',
    suggestedTone: 'reflective',
    prompts: [
      "What do you admire about their life's work?",
      "What new adventures do you hope they'll pursue?",
      "How can they find purpose after their career?",
      "What wisdom about aging gracefully can you share?",
      "What would you tell them about this transition?"
    ]
  },
  loss: {
    title: 'Message for Times of Loss',
    description: 'Provide comfort and strength during grief',
    suggestedTone: 'supportive',
    prompts: [
      "What comfort would you offer in their grief?",
      "How have you found strength in difficult times?",
      "What would you want them to remember about love and loss?",
      "What hope can you offer for healing?",
      "How would you help them honor what they've lost?"
    ]
  },
  birthday: {
    title: 'Birthday Message',
    description: 'Celebrate their life and growth each year',
    suggestedTone: 'celebratory',
    prompts: [
      "What do you love most about who they've become?",
      "What wishes do you have for their new year?",
      "What qualities make them special?",
      "What memories do you cherish from their past birthdays?",
      "What would you tell them about the gift of another year?"
    ]
  },
  anniversary: {
    title: 'Anniversary Message',
    description: 'Celebrate milestones in relationships',
    suggestedTone: 'loving',
    prompts: [
      "What have you observed about their love over time?",
      "What do you admire about their partnership?",
      "What wishes do you have for their continued journey?",
      "What would you tell them about lasting love?",
      "How has their relationship inspired you?"
    ]
  },
  difficult_time: {
    title: 'Message for Difficult Times',
    description: 'Offer strength and perspective during challenges',
    suggestedTone: 'supportive',
    prompts: [
      "What strength do you know they possess?",
      "How have you overcome similar challenges?",
      "What perspective might help them through this?",
      "What would you want them to remember about their resilience?",
      "How can they find light in darkness?"
    ]
  },
  achievement: {
    title: 'Achievement Message',
    description: 'Celebrate their successes and accomplishments',
    suggestedTone: 'celebratory',
    prompts: [
      "How does this achievement reflect who they are?",
      "What hard work have you witnessed them put in?",
      "What does this success mean for their future?",
      "How should they celebrate while staying grounded?",
      "What would you tell them about using success to help others?"
    ]
  },
  custom: {
    title: 'Custom Milestone',
    description: 'Create a message for any special moment',
    suggestedTone: 'loving',
    prompts: [
      "What makes this moment special?",
      "What do you want them to know at this time?",
      "What wisdom applies to this situation?",
      "How do you want to support them?",
      "What love do you want to express?"
    ]
  }
}

// Life detail entry prompts to encourage regular diary-like entries
export const lifeDetailPrompts = {
  daily: [
    "What moment from today do you want to preserve forever?",
    "What small joy did you experience today?",
    "What did you learn about yourself or your family today?",
    "What ordinary moment held unexpected meaning?",
    "What made you laugh or smile today?"
  ],
  weekly: [
    "What was the highlight of your week?",
    "What challenge did you face and how did you handle it?",
    "What conversation do you want to remember?",
    "What growth did you notice in yourself or loved ones?",
    "What are you grateful for this week?"
  ],
  monthly: [
    "What significant events happened this month?",
    "How have your relationships evolved?",
    "What new understanding have you gained?",
    "What would you tell your future self about this time?",
    "What patterns or themes emerged this month?"
  ],
  special: [
    "Describe a moment when you felt pure love",
    "Write about a time you were incredibly proud",
    "Share a story that captures your family's spirit",
    "Describe a tradition and why it matters",
    "Write about a person who shaped who you are"
  ]
}

// Helper functions for milestone messages
export function getMilestonesByRecipient(messages: MilestoneMessage[], recipientName: string): MilestoneMessage[] {
  return messages.filter(msg => 
    msg.recipientName?.toLowerCase() === recipientName.toLowerCase() ||
    !msg.recipientName // General messages for anyone
  )
}

export function getTriggeredMilestones(
  messages: MilestoneMessage[], 
  currentDate: Date,
  recipientAge?: number,
  recentEvents?: string[]
): MilestoneMessage[] {
  return messages.filter(msg => {
    // Check date triggers
    if (msg.triggerDate && msg.triggerDate <= currentDate) {
      return true
    }
    
    // Check age triggers
    if (msg.triggerAge && recipientAge && recipientAge >= msg.triggerAge) {
      return true
    }
    
    // Check event triggers
    if (msg.triggerEvent && recentEvents?.includes(msg.triggerEvent)) {
      return true
    }
    
    return false
  })
}

// Helper functions for life detail entries
export function getEntriesByCategory(
  entries: LifeDetailEntry[], 
  category: LifeDetailEntry['category']
): LifeDetailEntry[] {
  return entries.filter(entry => entry.category === category)
}

export function getEntriesByPerson(
  entries: LifeDetailEntry[],
  personName: string
): LifeDetailEntry[] {
  return entries.filter(entry => 
    entry.relatedPeople.some(person => 
      person.toLowerCase().includes(personName.toLowerCase())
    )
  )
}

export function getEntriesByEmotionalDepth(
  entries: LifeDetailEntry[],
  minDepth: number,
  maxDepth: number
): LifeDetailEntry[] {
  return entries.filter(entry => 
    entry.emotionalDepth >= minDepth && entry.emotionalDepth <= maxDepth
  )
}

export function searchEntries(
  entries: LifeDetailEntry[],
  searchTerm: string
): LifeDetailEntry[] {
  const lowerSearch = searchTerm.toLowerCase()
  return entries.filter(entry => 
    entry.title.toLowerCase().includes(lowerSearch) ||
    entry.content.toLowerCase().includes(lowerSearch) ||
    entry.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
  )
}