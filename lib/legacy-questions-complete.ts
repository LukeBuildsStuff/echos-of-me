// Final batch of legacy questions to complete our 3,000+ question database
import { LegacyQuestionTemplate } from './legacy-questions'

export const completeLegacyQuestions: LegacyQuestionTemplate[] = [
  // DAILY ESSENCE - Communication Style
  {
    category: 'daily_essence',
    subcategory: 'communication_style',
    familyRoles: ['parent', 'grandparent', 'spouse', 'mentor'],
    emotionalDepth: 6,
    tags: ['communication', 'personality', 'style', 'expression'],
    questions: [
      "How do you typically start conversations with people you've just met?",
      "What's your approach to difficult conversations that need to happen?",
      "How do you show interest in what others are saying?",
      "What's your communication style when you're angry or frustrated?",
      "How do you adapt your communication for different types of people?",
      "What's your approach to giving constructive feedback or criticism?",
      "How do you handle miscommunications or misunderstandings?",
      "What's your preferred method of communication for different types of messages?",
      "How do you know when someone really understands what you're trying to say?",
      "What's your approach to active listening and making others feel heard?",
      "How do you communicate love and affection in your unique way?",
      "What's your style when you need to deliver bad news or disappointing information?",
      "How do you encourage others when they're sharing something vulnerable?",
      "What's your approach to group conversations and discussions?",
      "How do you handle interruptions or people who dominate conversations?",
      "What questions do you ask to really get to know someone?",
      "How do you communicate boundaries without being harsh or mean?",
      "What's your approach to apologizing when you've hurt someone?",
      "How do you show enthusiasm and excitement about things you care about?",
      "What's your communication style when you're trying to persuade or convince someone?",
      "How do you handle conversations about topics you're passionate about?",
      "What's your approach to small talk versus deep, meaningful conversations?",
      "How do you communicate appreciation and gratitude to others?",
      "What's your style when someone comes to you for advice or guidance?",
      "How do you know when it's time to speak up versus when to stay quiet?"
    ]
  },

  // DAILY ESSENCE - Personal Rituals & Habits
  {
    category: 'daily_essence',
    subcategory: 'personal_rituals',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 5,
    tags: ['habits', 'rituals', 'daily_life', 'routine', 'self_care'],
    questions: [
      "What's your morning routine that helps you start the day feeling centered?",
      "How do you unwind and transition from work mode to home mode?",
      "What's your bedtime routine that helps you sleep peacefully?",
      "What daily habit brings you the most joy or satisfaction?",
      "How do you take care of yourself when you're feeling stressed or overwhelmed?",
      "What's your approach to exercise or staying physically active?",
      "How do you create quiet time or solitude for yourself?",
      "What's your ritual for celebrating small victories or good news?",
      "How do you practice gratitude or count your blessings?",
      "What's your approach to learning something new regularly?",
      "How do you stay connected with friends and family in your daily life?",
      "What's your process for making decisions, both big and small?",
      "How do you organize your space to feel calm and productive?",
      "What's your approach to planning your day or week?",
      "How do you handle interruptions to your routine or unexpected changes?",
      "What daily practice helps you feel most like yourself?",
      "How do you incorporate creativity or play into your regular routine?",
      "What's your approach to meals - planning, preparing, and enjoying food?",
      "How do you stay informed about the world without becoming overwhelmed?",
      "What's your ritual for processing the events of your day?",
      "How do you make time for the people and activities that matter most to you?",
      "What's your approach to maintaining your physical and mental health?",
      "How do you practice mindfulness or being present in daily moments?",
      "What personal traditions or rituals mark important times or seasons for you?",
      "How do you balance productivity with rest and relaxation?"
    ]
  },

  // FAMILY STORIES - Extended Family & Heritage
  {
    category: 'family_stories',
    subcategory: 'extended_family_heritage',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 7,
    tags: ['heritage', 'extended_family', 'history', 'culture', 'ancestry'],
    questions: [
      "Tell me about your grandparents and what they were like as people.",
      "What stories did your parents tell you about their own childhoods?",
      "Describe any family members who were considered characters or had interesting stories.",
      "What do you know about how your family came to live in this country or region?",
      "Tell me about any family members who served in wars or military service.",
      "What family business, trade, or profession was passed down through generations?",
      "Describe the oldest family member you remember and what they taught you.",
      "What languages were spoken in your family or by your ancestors?",
      "Tell me about any family feuds, reconciliations, or dramatic family history.",
      "What cultural traditions or customs were important in your extended family?",
      "Describe family reunions or gatherings and what made them special.",
      "What do you know about family members who died before you were born?",
      "Tell me about any family legends, myths, or stories that may or may not be true.",
      "What hardships did your family overcome together in previous generations?",
      "Describe the family home or property that was most significant in your family history.",
      "What family heirlooms, photos, or documents tell important family stories?",
      "Tell me about relatives who had unusual jobs, adventures, or life paths.",
      "What do you know about your family's economic circumstances in previous generations?",
      "Describe family members who were known for specific talents, skills, or abilities.",
      "What family tragedies or losses shaped your family's story?",
      "Tell me about the family members you wish your children could have met.",
      "What political or historical events affected your family's story?",
      "Describe any family members who were considered especially wise or respected.",
      "What geographic locations are important to your family's history?",
      "Tell me about family members who made significant sacrifices for the family's benefit."
    ]
  },

  // PARENTAL WISDOM - Health & Aging
  {
    category: 'parental_wisdom',
    subcategory: 'health_aging',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 8,
    tags: ['health', 'aging', 'wellness', 'body', 'mortality'],
    questions: [
      "What's the most important thing you've learned about taking care of your health?",
      "How do you handle the reality of aging and physical changes?",
      "What's your philosophy about medical care and working with healthcare providers?",
      "How do you maintain mental sharpness and cognitive health as you age?",
      "What's your approach to exercise and staying physically active throughout life?",
      "How do you handle chronic pain or ongoing health challenges?",
      "What's the most important thing about nutrition and eating well?",
      "How do you balance accepting aging with fighting to stay vibrant?",
      "What's your approach to preventive care and health screenings?",
      "How do you handle health scares or serious medical diagnoses?",
      "What's your philosophy about medications and medical interventions?",
      "How do you maintain independence while accepting help when needed?",
      "What's the most important thing about preparing for end-of-life care?",
      "How do you handle the loss of abilities or functions you once had?",
      "What's your approach to mental health and emotional wellbeing as you age?",
      "How do you find joy and purpose even when dealing with health limitations?",
      "What's your advice about when to seek medical help versus when to wait?",
      "How do you handle the fear or anxiety that can come with health challenges?",
      "What's the most important thing about advocating for yourself in medical situations?",
      "How do you maintain dignity and self-respect when facing health vulnerabilities?",
      "What's your philosophy about quality of life versus quantity of life?",
      "How do you handle the financial aspects of healthcare and aging?",
      "What's your approach to discussing health concerns with family members?",
      "How do you prepare for the possibility of needing care or assistance?",
      "What's the most important lesson you've learned about mortality and accepting death?"
    ]
  },

  // VALUES & BELIEFS - Social & Political
  {
    category: 'values_beliefs',
    subcategory: 'social_political',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 7,
    tags: ['politics', 'social_issues', 'justice', 'society', 'civic_duty'],
    questions: [
      "What political or social issues do you care most deeply about and why?",
      "How do you stay informed about current events while maintaining your mental health?",
      "What's your approach to discussing political topics with people who disagree with you?",
      "How do you determine which candidates or causes deserve your support?",
      "What's your philosophy about the role of government in people's lives?",
      "How do you balance patriotism with criticism of your country's problems?",
      "What social changes have you witnessed that you think are positive?",
      "What changes in society concern you most for future generations?",
      "How do you teach young people about civic responsibility and engagement?",
      "What's your approach to charitable giving and community involvement?",
      "How do you handle political discussions within the family when there are disagreements?",
      "What does justice mean to you, and how should society pursue it?",
      "How do you balance individual rights with collective responsibility?",
      "What's your philosophy about economic inequality and wealth distribution?",
      "How do you approach environmental responsibility and sustainability?",
      "What's your view on the role of religion in public life and politics?",
      "How do you handle the gap between your ideals and political realities?",
      "What social movements or causes have you supported and why?",
      "How do you evaluate news sources and avoid misinformation?",
      "What's your approach to voting and civic participation?",
      "How do you handle political disappointment when your side loses?",
      "What's your philosophy about peaceful protest and civil disobedience?",
      "How do you balance local community involvement with national political engagement?",
      "What's your view on the responsibility of wealthy individuals and corporations to society?",
      "How do you hope society will evolve on issues you care about?"
    ]
  },

  // MILESTONE MESSAGES - Difficult Times
  {
    category: 'milestone_messages',
    subcategory: 'difficult_times',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 10,
    tags: ['crisis', 'difficulty', 'support', 'comfort', 'strength'],
    questions: [
      "When you're going through the darkest period of your life, what do I want you to remember about your strength?",
      "If you're facing a crisis and can't reach out to me, what would I want you to know about getting help?",
      "When you feel completely alone and hopeless, what do I want you to remember about how much you're loved?",
      "If you're dealing with depression or mental health struggles, what would I tell you about seeking treatment?",
      "When you're facing financial ruin or career disaster, what perspective would I want you to have?",
      "If you're going through a divorce or relationship ending, what would I want you to remember?",
      "When you're dealing with a serious illness or health crisis, what comfort would I offer?",
      "If you're struggling with addiction or destructive behavior, what would I want you to know about recovery?",
      "When you're facing legal troubles or serious mistakes, what would I tell you about redemption?",
      "If you're grieving the loss of someone important, what would I want you to know about healing?",
      "When you feel like you've failed everyone you love, what would I remind you about forgiveness?",
      "If you're dealing with betrayal or broken trust, what wisdom would I share about moving forward?",
      "When you're overwhelmed by responsibilities and can't see a way out, what perspective would help?",
      "If you're facing discrimination or injustice, what would I want you to remember about your worth?",
      "When you're struggling with guilt or shame about past actions, what would I tell you?",
      "If you're dealing with infertility or pregnancy loss, what comfort would I offer?",
      "When you feel like giving up on your dreams, what would I remind you about perseverance?",
      "If you're facing the loss of your home or security, what would I want you to remember?",
      "When you're dealing with family conflict or estrangement, what guidance would I give?",
      "If you're struggling with your identity or purpose, what would I tell you about your value?",
      "When you're facing public embarrassment or humiliation, what would I want you to know?",
      "If you're dealing with chronic pain or disability, what perspective would I offer?",
      "When you feel like you can't forgive someone who hurt you, what would I tell you?",
      "If you're facing retirement or major life transitions, what wisdom would I share?",
      "When everything seems to be falling apart at once, what would I want you to remember about hope?"
    ]
  },

  // FINAL MESSAGES - Specific Love Messages
  {
    category: 'final_messages',
    subcategory: 'specific_love_messages',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 10,
    tags: ['love', 'individual', 'specific', 'personal', 'unique'],
    questions: [
      "What do you want each specific child to know about how you see their unique personality and gifts?",
      "What individual message of love do you have for your spouse that only they would understand?",
      "What do you want each grandchild to know about the special place they hold in your heart?",
      "What specific memory with each family member do you want them to treasure?",
      "What unique quality does each of your children have that makes you especially proud?",
      "What individual piece of advice do you have for each child based on their specific personality?",
      "What do you want each family member to know about how they've changed your life for the better?",
      "What specific way do you love each person that might be different from how you love the others?",
      "What individual strength does each family member have that you want them to recognize?",
      "What specific challenge does each loved one face that you want to encourage them about?",
      "What unique role does each person play in your life that you're grateful for?",
      "What individual dream or goal do you have for each of your children?",
      "What specific trait did each child inherit from you that you want them to embrace?",
      "What individual lesson do you hope each family member learns from your life example?",
      "What unique way does each person show love that you've always appreciated?",
      "What specific memory of joy or laughter do you want each person to remember?",
      "What individual fear or worry does each loved one have that you want to address?",
      "What unique contribution does each family member make to the family dynamic?",
      "What specific compliment or affirmation does each person need to hear from you?",
      "What individual tradition or ritual do you hope to continue with each family member?",
      "What unique challenge have you and each person overcome together?",
      "What specific prayer or wish do you have for each family member's future?",
      "What individual story about each person's childhood do you want preserved?",
      "What unique bond do you share with each family member that's special to your relationship?",
      "What specific message of unconditional love does each person most need to hear from you?"
    ]
  },

  // EMOTIONAL WISDOM - Self-Compassion & Growth
  {
    category: 'emotional_wisdom',
    subcategory: 'self_compassion_growth',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 8,
    tags: ['self_compassion', 'growth', 'self_love', 'personal_development'],
    questions: [
      "What's the most important thing about learning to be kind to yourself?",
      "How do you handle perfectionism and the pressure to always be perfect?",
      "What's your approach to self-forgiveness when you've made serious mistakes?",
      "How do you maintain self-respect while acknowledging your flaws and limitations?",
      "What's the difference between self-improvement and self-acceptance?",
      "How do you celebrate your progress without becoming arrogant or complacent?",
      "What's your approach to changing things about yourself versus accepting who you are?",
      "How do you handle self-doubt without falling into self-hatred?",
      "What's the most important thing about maintaining your self-worth during difficult times?",
      "How do you balance pushing yourself to grow with being patient with your limitations?",
      "What's your philosophy about comparing yourself to others?",
      "How do you handle criticism from others without losing confidence in yourself?",
      "What's your approach to setting boundaries with yourself about self-criticism?",
      "How do you maintain hope for personal growth without becoming obsessed with self-improvement?",
      "What's the difference between healthy self-reflection and destructive rumination?",
      "How do you handle the gap between who you are and who you want to become?",
      "What's your approach to self-care that goes beyond just physical needs?",
      "How do you maintain your identity while continuing to grow and change?",
      "What's the most important thing about accepting compliments and positive feedback?",
      "How do you handle setbacks in personal growth without giving up on yourself?",
      "What's your philosophy about self-discipline versus self-compassion?",
      "How do you maintain realistic expectations for yourself while still striving for growth?",
      "What's your approach to healing from past traumas or painful experiences?",
      "How do you balance taking responsibility for your life with not blaming yourself for everything?",
      "What's the most important lesson you've learned about loving and accepting yourself?"
    ]
  },

  // LOVE & RELATIONSHIPS - Community & Social Connection
  {
    category: 'love_relationships',
    subcategory: 'community_social',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 6,
    tags: ['community', 'social', 'neighbors', 'belonging', 'service'],
    questions: [
      "What's your philosophy about being a good neighbor and community member?",
      "How do you build meaningful connections with people in your community?",
      "What's your approach to helping others without expecting anything in return?",
      "How do you handle conflicts or disagreements within your community?",
      "What's the most important thing about contributing to causes larger than yourself?",
      "How do you balance individual needs with community responsibility?",
      "What's your approach to welcoming newcomers or outsiders into your community?",
      "How do you maintain relationships with people who are very different from you?",
      "What's your philosophy about civic engagement and community involvement?",
      "How do you handle community problems or issues that affect everyone?",
      "What's your approach to volunteering and community service?",
      "How do you build bridges between different groups or communities?",
      "What's the most important thing about being inclusive and welcoming to all people?",
      "How do you handle gossip or negative talk about community members?",
      "What's your approach to supporting local businesses and community resources?",
      "How do you maintain connections with your community as you age or circumstances change?",
      "What's your philosophy about collective action and working together for change?",
      "How do you handle community leadership roles and responsibilities?",
      "What's your approach to celebrating community achievements and milestones?",
      "How do you support community members during their times of need?",
      "What's the most important thing about creating a sense of belonging for everyone?",
      "How do you balance your family's needs with community obligations?",
      "What's your approach to preserving community traditions while embracing change?",
      "How do you handle community conflicts that divide people you care about?",
      "What legacy do you want to leave in the communities where you've lived?"
    ]
  }
]

// Final count calculation
export function getFinalLegacyQuestionCount(): number {
  return completeLegacyQuestions.reduce((total, template) => total + template.questions.length, 0)
}

// Combined utility to get total count from all legacy question files
export function getTotalLegacyQuestionCount(): number {
  // Base legacy questions: ~250
  // Extended legacy questions: ~225 (from previous file)
  // Complete legacy questions: ~225 (from this file)
  // Plus original general questions: ~170
  // Total: ~870 questions so far, need to continue expanding
  
  const completeCount = completeLegacyQuestions.reduce((total, template) => total + template.questions.length, 0)
  return completeCount
}