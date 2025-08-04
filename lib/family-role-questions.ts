// Family Role-Specific Question System for Echos Of Me
// Each role has unique perspectives and wisdom to preserve

export type FamilyRole = 
  | 'parent'
  | 'grandparent'
  | 'spouse'
  | 'sibling'
  | 'aunt_uncle'
  | 'mentor'
  | 'close_friend'

export interface RoleSpecificQuestion {
  role: FamilyRole
  category: string
  questions: string[]
  contextNote: string // Explains why this question matters for this role
  emotionalDepth: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
}

// Parent-Specific Questions - The primary caregiver perspective
export const parentQuestions: RoleSpecificQuestion[] = [
  {
    role: 'parent',
    category: 'birth_early_years',
    emotionalDepth: 10,
    contextNote: 'Only parents can share these intimate first moments',
    questions: [
      "Tell me about the moment you first saw me and what went through your heart.",
      "What were your biggest fears and hopes when you brought me home as a baby?",
      "Describe my personality as a baby and toddler - what made me uniquely me?",
      "What was the hardest part about being a new parent that no one warned you about?",
      "Tell me about the first time I smiled at you and how it changed everything.",
      "What sacrifices did you make in those early years that I never knew about?",
      "Describe a middle-of-the-night moment with baby me that captures parenthood perfectly.",
      "What did you whisper to me when I was too young to understand but needed to hear?",
      "Tell me about a time you felt like you were failing as a parent but kept going anyway.",
      "What dreams did you have for me when I was born, and how have they evolved?"
    ]
  },
  {
    role: 'parent',
    category: 'letting_go',
    emotionalDepth: 9,
    contextNote: 'The unique parental struggle of raising children to leave',
    questions: [
      "How did you handle the bittersweet process of watching me become independent?",
      "What was the hardest part about letting me make my own mistakes?",
      "Tell me about a time you wanted to rescue me but knew you had to let me learn.",
      "How did you cope when I pulled away during adolescence?",
      "What fears did you have about my safety that you never fully expressed?",
      "Describe the moment you realized I was becoming my own person, separate from you.",
      "What parts of parenting did you grieve as I grew older?",
      "How did you balance being needed less while still wanting to nurture and protect?",
      "What wisdom about letting go do you wish someone had shared with you?",
      "Tell me about the joy and pain of watching me leave home for the first time."
    ]
  },
  {
    role: 'parent',
    category: 'daily_parenting',
    emotionalDepth: 7,
    contextNote: 'The everyday moments that shaped our relationship',
    questions: [
      "What was our morning routine like when I was young, and what made it special?",
      "Tell me about bedtime rituals and the conversations we had in the dark.",
      "What meals did I love that you made just for me?",
      "Describe a typical day of parenting me at different ages.",
      "What games or activities did we do together that you treasure?",
      "Tell me about the homework battles, practice schedules, and daily negotiations.",
      "What were the small victories in parenting that meant the most to you?",
      "How did you handle discipline while still showing love?",
      "What daily parenting challenges tested your patience the most?",
      "Tell me about the quiet moments between the chaos that you hold dear."
    ]
  }
]

// Grandparent-Specific Questions - The generational wisdom perspective
export const grandparentQuestions: RoleSpecificQuestion[] = [
  {
    role: 'grandparent',
    category: 'generational_wisdom',
    emotionalDepth: 9,
    contextNote: 'Wisdom that spans generations and historical perspective',
    questions: [
      "What changes in the world concern you most for your grandchildren's future?",
      "How is being a grandparent different from what you expected it would be?",
      "What mistakes did you make as a parent that you tried to correct as a grandparent?",
      "Tell me what you see in your grandchildren that reminds you of their parents.",
      "What family traits or patterns do you see repeating across generations?",
      "How has your definition of what matters in life changed from parent to grandparent?",
      "What do you want your grandchildren to know about the world you grew up in?",
      "Tell me about the joy of loving grandchildren without the daily responsibility.",
      "What wisdom about life do you have now that you wish you'd known as a young parent?",
      "How do you want to be remembered by grandchildren who may be too young to remember you clearly?"
    ]
  },
  {
    role: 'grandparent',
    category: 'family_continuity',
    emotionalDepth: 8,
    contextNote: 'Bridging past and future family connections',
    questions: [
      "What stories about your own grandparents do you want to pass down?",
      "Tell me about family traditions you've watched evolve or disappear over generations.",
      "What would your parents think about how the family has grown and changed?",
      "How do you serve as the bridge between family history and future?",
      "What family values have remained constant despite generational changes?",
      "Tell me about relatives your grandchildren will never meet but should know about.",
      "What role do you play in keeping family connections strong?",
      "How do you balance honoring the past with embracing how your children parent differently?",
      "What family stories or legends are you the last keeper of?",
      "What do you hope stays the same about our family for generations to come?"
    ]
  }
]

// Spouse-Specific Questions - The intimate partnership perspective
export const spouseQuestions: RoleSpecificQuestion[] = [
  {
    role: 'spouse',
    category: 'intimate_knowledge',
    emotionalDepth: 10,
    contextNote: 'Things only a life partner truly knows',
    questions: [
      "What do you want our children to know about how much I loved you?",
      "Tell me about the private jokes and secret languages we created together.",
      "What did you see in me that no one else ever recognized or appreciated?",
      "How did our love change and deepen through different seasons of life?",
      "What were the quiet ways I showed you love that others might not have noticed?",
      "Tell me about the dreams we shared and the ones we had to let go.",
      "What did you learn about love from being married to me?",
      "How did we complement each other in ways that made us stronger together?",
      "What moments of our marriage do you replay in your mind when you miss me?",
      "What would you want a future partner of mine to know about how to love me well?"
    ]
  },
  {
    role: 'spouse',
    category: 'partnership_wisdom',
    emotionalDepth: 9,
    contextNote: 'Lessons from building a life together',
    questions: [
      "What was the secret to making our marriage work through difficult times?",
      "How did we learn to fight fairly and resolve conflicts with love?",
      "Tell me about a time our partnership was tested and how we emerged stronger.",
      "What compromises did we make for each other that were worth it?",
      "How did we maintain individual identities while building a life together?",
      "What would you tell our children about choosing a life partner?",
      "How did we keep romance alive through busy seasons and life stress?",
      "What did building a family together teach you about love and sacrifice?",
      "Tell me about the evolution from young love to mature partnership.",
      "What do you want our children to know about the marriage they grew up witnessing?"
    ]
  }
]

// Sibling-Specific Questions - The shared childhood perspective
export const siblingQuestions: RoleSpecificQuestion[] = [
  {
    role: 'sibling',
    category: 'shared_childhood',
    emotionalDepth: 8,
    contextNote: 'The unique bond of growing up together',
    questions: [
      "What childhood memories do we share that no one else would understand?",
      "Tell me about the secret alliances and conflicts that shaped our relationship.",
      "What did you understand about our family dynamics that I might have missed?",
      "How did our birth order affect who we became?",
      "What did you want to protect me from when we were growing up?",
      "Tell me about a time you were proud of me that I never knew about.",
      "What family burdens did we carry together without realizing it?",
      "How did our relationship change as we became adults?",
      "What do you see in my children that reminds you of us as kids?",
      "What promises did we make as children that still matter today?"
    ]
  }
]

// Aunt/Uncle-Specific Questions - The supportive extended family perspective
export const auntUncleQuestions: RoleSpecificQuestion[] = [
  {
    role: 'aunt_uncle',
    category: 'supportive_love',
    emotionalDepth: 7,
    contextNote: 'The special role of loving without parental responsibility',
    questions: [
      "What did you see in me that made you proud to be my aunt/uncle?",
      "How did you try to support and influence me differently than my parents?",
      "Tell me about moments when you wanted to intervene but had to respect boundaries.",
      "What family dynamics did you observe from your unique position?",
      "How did being an aunt/uncle prepare or change you for your own life?",
      "What did you want to give me that you felt my parents couldn't or didn't?",
      "Tell me about the joy of loving me without having to discipline me.",
      "What worries did you have about me that you kept to yourself?",
      "How did you balance being fun and being a responsible adult figure?",
      "What legacy do you want to leave as the aunt/uncle in my life story?"
    ]
  }
]

// Mentor-Specific Questions - The guidance perspective
export const mentorQuestions: RoleSpecificQuestion[] = [
  {
    role: 'mentor',
    category: 'life_guidance',
    emotionalDepth: 8,
    contextNote: 'Wisdom from someone who chose to guide your path',
    questions: [
      "What potential did you see in me that made you invest your time and wisdom?",
      "How did mentoring me change or enrich your own life?",
      "Tell me about moments when you were proud of my growth.",
      "What lessons were hardest for me to learn, and how did you stay patient?",
      "What do you hope I'll pass on to people I mentor in the future?",
      "Tell me about times you wanted to give up on me but didn't.",
      "What did you learn about yourself through our mentoring relationship?",
      "How did you balance pushing me with accepting me as I was?",
      "What transformation did you witness in me that I might not see myself?",
      "What final piece of wisdom do you want to ensure I carry forward?"
    ]
  }
]

// Close Friend-Specific Questions - The chosen family perspective
export const closeFriendQuestions: RoleSpecificQuestion[] = [
  {
    role: 'close_friend',
    category: 'friendship_bond',
    emotionalDepth: 8,
    contextNote: 'The unique perspective of chosen family',
    questions: [
      "What did our friendship mean to you across different stages of life?",
      "Tell me about the moments that cemented our bond forever.",
      "What did you see in me during my darkest times that I couldn't see?",
      "How did our friendship shape who you became?",
      "What secrets did we keep for each other that bonded us?",
      "Tell me about the laughter and adventures that defined our connection.",
      "What did you want to say during my hard times but held back?",
      "How did you know when to push me and when to just be present?",
      "What aspects of our friendship do you hope I find again?",
      "What would you want my family to know about who I am as a friend?"
    ]
  }
]

// Helper functions for the role-specific question system
export function getQuestionsByRole(role: FamilyRole): RoleSpecificQuestion[] {
  switch (role) {
    case 'parent':
      return parentQuestions
    case 'grandparent':
      return grandparentQuestions
    case 'spouse':
      return spouseQuestions
    case 'sibling':
      return siblingQuestions
    case 'aunt_uncle':
      return auntUncleQuestions
    case 'mentor':
      return mentorQuestions
    case 'close_friend':
      return closeFriendQuestions
    default:
      return []
  }
}

export function getAllRoleQuestions(): RoleSpecificQuestion[] {
  return [
    ...parentQuestions,
    ...grandparentQuestions,
    ...spouseQuestions,
    ...siblingQuestions,
    ...auntUncleQuestions,
    ...mentorQuestions,
    ...closeFriendQuestions
  ]
}

export function getHighestEmotionalDepthByRole(role: FamilyRole): RoleSpecificQuestion[] {
  return getQuestionsByRole(role).filter(q => q.emotionalDepth >= 8)
}

// Role combination questions for complex family dynamics
export const multiRoleQuestions: RoleSpecificQuestion[] = [
  {
    role: 'parent', // who is also a spouse
    category: 'parent_and_partner',
    emotionalDepth: 9,
    contextNote: 'Balancing being a parent and a partner',
    questions: [
      "How did becoming parents change our marriage, both challenging and beautiful?",
      "What did you sacrifice as a spouse to be the parent our children needed?",
      "Tell me about maintaining intimacy and partnership while raising children.",
      "How did we navigate disagreeing about parenting while staying united?",
      "What do you want our children to understand about the marriage they witnessed?"
    ]
  },
  {
    role: 'grandparent', // who was also a parent
    category: 'evolution_of_love',
    emotionalDepth: 9,
    contextNote: 'The evolution from parent to grandparent',
    questions: [
      "How is loving grandchildren different from loving your own children?",
      "What parenting regrets were healed through being a grandparent?",
      "Tell me about watching your children become parents themselves.",
      "How did becoming a grandparent change your relationship with your adult children?",
      "What family patterns do you hope end with your generation?"
    ]
  }
]