export type QuestionCategory = 
  | 'personal_history'
  | 'philosophy_values'
  | 'daily_life'
  | 'professional'
  | 'relationships'
  | 'creative_expression'
  | 'hypotheticals'

export interface QuestionTemplate {
  category: QuestionCategory
  subcategory: string
  questions: string[]
  complexity: 1 | 2 | 3 | 4 | 5
}

export const questionTemplates: QuestionTemplate[] = [
  // PERSONAL HISTORY - Childhood & Growing Up
  {
    category: 'personal_history',
    subcategory: 'childhood',
    complexity: 2,
    questions: [
      "What's your earliest vivid memory, and why do you think it stuck with you?",
      "Describe a childhood tradition that was special to your family.",
      "What did you want to be when you grew up, and how has that changed?",
      "Tell me about a teacher who had a significant impact on you.",
      "What was your favorite hiding spot as a child?",
      "Describe the house or place where you felt most at home growing up.",
      "What childhood fear did you have that seems silly now?",
      "What's a lesson you learned the hard way as a kid?",
      "Describe your relationship with your siblings or lack thereof.",
      "What was your favorite family vacation or trip?"
    ]
  },

  // PERSONAL HISTORY - Formative Experiences
  {
    category: 'personal_history',
    subcategory: 'formative_experiences',
    complexity: 4,
    questions: [
      "Describe a moment when you realized you had grown up.",
      "What's the biggest risk you've ever taken, and how did it turn out?",
      "Tell me about a time when you were completely wrong about someone.",
      "What's a mistake you made that you're actually grateful for?",
      "Describe a moment when you felt truly proud of yourself.",
      "What's the hardest decision you've ever had to make?",
      "Tell me about a time when you stood up for something you believed in.",
      "What's an experience that completely changed your perspective?",
      "Describe a moment when you felt like giving up but didn't.",
      "What's the most important thing someone has ever said to you?"
    ]
  },

  // PHILOSOPHY & VALUES - Core Beliefs
  {
    category: 'philosophy_values',
    subcategory: 'core_beliefs',
    complexity: 5,
    questions: [
      "What do you believe is the purpose of human existence?",
      "How do you define success, and has that definition changed over time?",
      "What role does spirituality or religion play in your life?",
      "What do you think happens after we die?",
      "Is it more important to be liked or respected? Why?",
      "Do you believe people are fundamentally good or bad?",
      "What's your philosophy on forgiveness?",
      "How do you determine what's right and wrong?",
      "What do you think is humanity's greatest strength and weakness?",
      "If you could only pass down one piece of wisdom, what would it be?"
    ]
  },

  // PHILOSOPHY & VALUES - Ethics & Morality
  {
    category: 'philosophy_values',
    subcategory: 'ethics_morality',
    complexity: 4,
    questions: [
      "Is it ever okay to lie? Under what circumstances?",
      "How do you handle moral dilemmas where there's no clear right answer?",
      "What's more important: individual freedom or collective good?",
      "Do you believe in karma or that the universe is inherently fair?",
      "How do you deal with people whose values fundamentally oppose yours?",
      "What's a moral stance you've changed your mind about?",
      "Is it possible to separate the art from the artist?",
      "How do you balance being true to yourself with fitting into society?",
      "What responsibility do wealthy people have to help others?",
      "Should we judge historical figures by today's moral standards?"
    ]
  },

  // DAILY LIFE - Habits & Routines
  {
    category: 'daily_life',
    subcategory: 'habits_routines',
    complexity: 2,
    questions: [
      "Describe your ideal morning routine.",
      "What's a daily habit you have that others might find odd?",
      "How do you typically spend your Sunday afternoons?",
      "What's your go-to comfort food and when do you eat it?",
      "Describe your workspace and why you've set it up that way.",
      "What's your bedtime routine like?",
      "How do you prefer to exercise or stay active?",
      "What's your typical approach to grocery shopping?",
      "How do you organize your living space?",
      "What's a small daily ritual that brings you joy?"
    ]
  },

  // DAILY LIFE - Decision Making
  {
    category: 'daily_life',
    subcategory: 'decision_making',
    complexity: 3,
    questions: [
      "How do you make decisions when you're feeling overwhelmed?",
      "What's your process for choosing what to wear each day?",
      "How do you decide what to watch on TV or streaming services?",
      "What factors do you consider when choosing where to eat?",
      "How do you prioritize your tasks when everything feels urgent?",
      "What's your approach to spending money on non-essentials?",
      "How do you choose which social events or invitations to accept?",
      "What's your strategy for dealing with interruptions?",
      "How do you decide when to help others versus focusing on yourself?",
      "What's your approach to trying new things?"
    ]
  },

  // PROFESSIONAL - Career & Work
  {
    category: 'professional',
    subcategory: 'career_work',
    complexity: 3,
    questions: [
      "What motivates you most in your work?",
      "Describe your ideal work environment.",
      "How do you handle workplace conflict?",
      "What's the best career advice you've ever received?",
      "How do you balance ambition with contentment?",
      "What's your approach to networking and building professional relationships?",
      "How do you handle feedback and criticism at work?",
      "What skills do you think will be most important in the future?",
      "How do you stay motivated during challenging projects?",
      "What's your philosophy on work-life balance?"
    ]
  },

  // PROFESSIONAL - Leadership & Management
  {
    category: 'professional',
    subcategory: 'leadership_management',
    complexity: 4,
    questions: [
      "What's your leadership style, and how has it evolved?",
      "How do you motivate team members who are struggling?",
      "What's the hardest part about managing people?",
      "How do you make difficult decisions that affect others?",
      "What's your approach to giving constructive feedback?",
      "How do you handle disagreements with your boss or authority figures?",
      "What qualities do you look for when hiring someone?",
      "How do you delegate tasks effectively?",
      "What's your strategy for managing up?",
      "How do you build trust within a team?"
    ]
  },

  // RELATIONSHIPS - Family & Friends
  {
    category: 'relationships',
    subcategory: 'family_friends',
    complexity: 3,
    questions: [
      "How do you maintain long-distance friendships?",
      "What's your approach to setting boundaries with family?",
      "How do you handle friends who consistently make poor choices?",
      "What makes someone a true friend in your opinion?",
      "How do you deal with family gatherings when there's tension?",
      "What's your philosophy on lending money to friends or family?",
      "How do you show love and care to the people closest to you?",
      "What's the most important thing you've learned about friendship?",
      "How do you handle jealousy in relationships?",
      "What role do you typically play in your friend group?"
    ]
  },

  // RELATIONSHIPS - Romance & Partnership
  {
    category: 'relationships',
    subcategory: 'romance_partnership',
    complexity: 4,
    questions: [
      "What does love mean to you?",
      "How do you handle disagreements in romantic relationships?",
      "What's your approach to compromise in partnerships?",
      "How do you maintain your individuality while in a relationship?",
      "What are your non-negotiables in a romantic partner?",
      "How do you show affection, and how do you like to receive it?",
      "What's your philosophy on marriage and long-term commitment?",
      "How do you handle attraction to others while in a relationship?",
      "What's the best relationship advice you'd give to someone?",
      "How do you know when a relationship isn't working?"
    ]
  },

  // CREATIVE EXPRESSION - Arts & Creativity
  {
    category: 'creative_expression',
    subcategory: 'arts_creativity',
    complexity: 3,
    questions: [
      "What form of creative expression speaks to you most?",
      "Describe a piece of art that moved you deeply.",
      "How do you deal with creative blocks or lack of inspiration?",
      "What's your relationship with music, and how does it affect your mood?",
      "If you could master any artistic skill, what would it be?",
      "How do you express yourself when words aren't enough?",
      "What's a creative project you've always wanted to try?",
      "How do you consume art - actively or passively?",
      "What's your opinion on separating art from the artist?",
      "How has your taste in art/music/literature evolved over time?"
    ]
  },

  // CREATIVE EXPRESSION - Storytelling & Communication
  {
    category: 'creative_expression',
    subcategory: 'storytelling_communication',
    complexity: 3,
    questions: [
      "How do you prefer to tell stories - verbally, in writing, or through other means?",
      "What's a story from your life that you find yourself telling often?",
      "How do you adapt your communication style for different audiences?",
      "What's your approach to difficult conversations?",
      "How do you use humor in your daily interactions?",
      "What's the most memorable speech or presentation you've heard?",
      "How do you handle misunderstandings in communication?",
      "What's your preferred method of keeping in touch with people?",
      "How do you express disagreement respectfully?",
      "What's your philosophy on social media and digital communication?"
    ]
  },

  // HYPOTHETICALS - Ethical Dilemmas
  {
    category: 'hypotheticals',
    subcategory: 'ethical_dilemmas',
    complexity: 5,
    questions: [
      "If you could save five lives by sacrificing one, would you do it?",
      "Would you rather be feared or loved, and why?",
      "If you found a wallet with $500 and no ID, what would you do?",
      "Would you take a job you hate for twice your current salary?",
      "If you could know the date of your death, would you want to?",
      "Would you report a friend for doing something illegal but harmless?",
      "If you could eliminate one human emotion, which would it be?",
      "Would you rather live in a world without music or without books?",
      "If everyone's thoughts were public, how would the world change?",
      "Would you sacrifice your happiness for your family's wellbeing?"
    ]
  },

  // HYPOTHETICALS - Future & Imagination
  {
    category: 'hypotheticals',
    subcategory: 'future_imagination',
    complexity: 4,
    questions: [
      "If you could live in any time period, when would you choose?",
      "What superpower would you choose and how would you use it?",
      "If you could have dinner with any three people, living or dead, who would they be?",
      "What would you do if money was no object?",
      "If you could change one thing about the world, what would it be?",
      "How do you think technology will change human relationships in 50 years?",
      "If you could master any skill instantly, what would it be?",
      "What do you think your life would be like if you'd made one different major decision?",
      "If you had to choose one sense to lose, which would it be?",
      "What legacy do you want to leave behind?"
    ]
  },

  // PERSONAL HISTORY - Cultural & Identity
  {
    category: 'personal_history',
    subcategory: 'cultural_identity',
    complexity: 4,
    questions: [
      "How has your cultural background shaped who you are?",
      "What traditions from your family do you want to continue or change?",
      "How do you navigate between different cultural expectations?",
      "What aspects of your identity are most important to you?",
      "How do you handle situations where you feel like an outsider?",
      "What cultural foods or customs make you feel most at home?",
      "How has your sense of identity evolved over time?",
      "What stereotypes about your background frustrate you most?",
      "How do you celebrate your heritage?",
      "What's something about your culture you wish others understood better?"
    ]
  },

  // DAILY LIFE - Technology & Modern Life
  {
    category: 'daily_life',
    subcategory: 'technology_modern_life',
    complexity: 3,
    questions: [
      "How has technology changed the way you live your daily life?",
      "What's your relationship with social media?",
      "How do you manage information overload in the digital age?",
      "What's your approach to digital privacy?",
      "How do you disconnect from technology when you need to?",
      "What technology do you wish had never been invented?",
      "How do you stay informed about current events?",
      "What's your philosophy on screen time and digital wellness?",
      "How has remote work or digital communication affected you?",
      "What aspects of pre-internet life do you miss?"
    ]
  },

  // PHILOSOPHY & VALUES - Growth & Change
  {
    category: 'philosophy_values',
    subcategory: 'growth_change',
    complexity: 4,
    questions: [
      "How do you handle change and uncertainty?",
      "What's something you believed strongly when you were younger that you don't believe now?",
      "How do you push yourself out of your comfort zone?",
      "What's your approach to personal growth and self-improvement?",
      "How do you handle failure and setbacks?",
      "What patterns in your life would you like to break?",
      "How do you measure personal progress?",
      "What's the difference between who you are and who you want to be?",
      "How do you stay curious and keep learning?",
      "What advice would you give your younger self?"
    ]
  }
]

// Function to get random questions from a category
export function getRandomQuestions(
  category?: QuestionCategory,
  count: number = 3,
  complexity?: 1 | 2 | 3 | 4 | 5
): string[] {
  let filteredTemplates = questionTemplates

  if (category) {
    filteredTemplates = filteredTemplates.filter(t => t.category === category)
  }

  if (complexity) {
    filteredTemplates = filteredTemplates.filter(t => t.complexity === complexity)
  }

  const allQuestions = filteredTemplates.flatMap(template => template.questions)
  
  // Shuffle and return random questions
  const shuffled = allQuestions.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// Function to get category distribution
export function getCategoryDistribution(): Record<QuestionCategory, number> {
  return questionTemplates.reduce((acc, template) => {
    acc[template.category] = (acc[template.category] || 0) + template.questions.length
    return acc
  }, {} as Record<QuestionCategory, number>)
}