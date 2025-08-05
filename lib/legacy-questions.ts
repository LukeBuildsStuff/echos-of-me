export type LegacyCategory = 
  | 'parental_wisdom'
  | 'love_relationships'
  | 'family_stories'
  | 'values_beliefs'
  | 'milestone_messages'
  | 'emotional_wisdom'
  | 'daily_essence'
  | 'final_messages'

export type FamilyRole = 
  | 'parent'
  | 'grandparent'
  | 'spouse'
  | 'sibling'
  | 'mentor'

export interface LegacyQuestionTemplate {
  category: LegacyCategory
  subcategory: string
  familyRoles: FamilyRole[]
  questions: string[]
  emotionalDepth: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  tags: string[]
}

export const legacyQuestionTemplates: LegacyQuestionTemplate[] = [
  // PARENTAL WISDOM - Life Guidance
  {
    category: 'parental_wisdom',
    subcategory: 'life_guidance',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 9,
    tags: ['guidance', 'life_lessons', 'wisdom'],
    questions: [
      "When you feel lost and don't know which path to take, what do you need to remember about your own strength and worth?",
      "If you're facing a decision that could change your life, what questions should you ask yourself first?",
      "When someone tries to make you compromise your values, how do you find the courage to stand firm?",
      "What's the difference between taking a risk and being reckless, and how do you know which is which?",
      "When you fail at something important, what would I want you to remember about failure and growth?",
      "If you're ever feeling like giving up on a dream, what would I tell you about perseverance and believing in yourself?",
      "When people disappoint you, how do you decide whether to forgive or protect yourself?",
      "What's the most important thing to remember about your own worthiness of love and respect?",
      "If you're struggling with self-doubt, what evidence of your capabilities would I remind you of?",
      "When life feels overwhelming, what's the first thing you should do to find your center again?",
      "How do you tell the difference between a mistake you can learn from and a mistake you need to avoid repeating?",
      "What does it mean to truly take responsibility for your life and your choices?",
      "When you're angry, what's the most important thing to remember before you react?",
      "How do you know when it's time to fight for something and when it's time to let it go?",
      "What's the secret to building real confidence that doesn't depend on other people's opinions?",
      "If you're ever tempted by shortcuts that compromise your integrity, what should you remember?",
      "When you're dealing with jealousy or envy, how do you transform those feelings into motivation?",
      "What's the most important thing about learning to trust your own judgment?",
      "How do you bounce back from public embarrassment or humiliation?",
      "When you're facing your biggest fears, what gives you the strength to move forward anyway?",
      "What's the difference between being humble and selling yourself short?",
      "How do you maintain hope during the darkest periods of your life?",
      "What does it really mean to love yourself, not just say you do?",
      "When you're comparing yourself to others, what perspective helps you refocus on your own journey?",
      "How do you know when you're ready for more responsibility or challenges in life?"
    ]
  },

  // PARENTAL WISDOM - Relationships & Love
  {
    category: 'parental_wisdom',
    subcategory: 'relationship_guidance',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 10,
    tags: ['love', 'relationships', 'heart', 'partnership'],
    questions: [
      "How will you know when someone loves you for who you truly are, not who they want you to become?",
      "What are the non-negotiable qualities you should look for in a life partner?",
      "When you're in love, how do you maintain your individual identity and dreams?",
      "What's the difference between healthy compromise and losing yourself in a relationship?",
      "How do you handle it when the person you love is going through a difficult time?",
      "What does it mean to be vulnerable in love without being naive?",
      "When you have your first serious heartbreak, what do you need to know about healing and moving forward?",
      "How do you know if someone is worthy of your deepest trust and secrets?",
      "What's the most important thing about learning to communicate during conflict?",
      "How do you show love to someone whose love language is different from yours?",
      "What should you never sacrifice for a relationship, no matter how much you love someone?",
      "How do you know when it's time to work harder on a relationship versus when it's time to walk away?",
      "What's the secret to keeping romance alive through life's mundane responsibilities?",
      "How do you handle it when your partner and your family don't get along?",
      "What's the most important thing about learning to apologize sincerely and effectively?",
      "How do you build a relationship where both people can be completely honest?",
      "What does it mean to choose love actively, not just feel it passively?",
      "How do you handle attraction to other people when you're in a committed relationship?",
      "What's the difference between supporting someone and enabling their bad habits?",
      "How do you maintain friendships when you're deeply in love with someone?",
      "What should you do if the person you love doesn't want the same future you do?",
      "How do you rebuild trust after it's been broken in a relationship?",
      "What's the most important thing about timing in relationships?",
      "How do you know if your standards are too high or if you're just not settling for less than you deserve?",
      "What does it mean to truly forgive someone who has hurt you in love?"
    ]
  },

  // PARENTAL WISDOM - Career & Purpose
  {
    category: 'parental_wisdom',
    subcategory: 'career_purpose',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 8,
    tags: ['career', 'purpose', 'work', 'success', 'fulfillment'],
    questions: [
      "How do you know the difference between a job and a calling?",
      "What's more important: doing work you love or being practical about financial security?",
      "When you're starting your career, what's the most important thing to focus on learning?",
      "How do you handle workplace politics without compromising your integrity?",
      "What's the secret to building professional relationships that are authentic, not just strategic?",
      "When you're facing a career setback, how do you decide whether to pivot or persevere?",
      "How do you know when it's time to leave a job, even if it's financially risky?",
      "What's the most important thing about managing money and building financial security?",
      "How do you balance ambition with contentment and gratitude for what you have?",
      "What does success really mean, and how has my definition changed over time?",
      "When you're feeling stuck in your career, what questions should you ask yourself?",
      "How do you handle having a boss or coworkers you don't respect?",
      "What's the difference between confidence and arrogance in professional settings?",
      "How do you make yourself indispensable without becoming overwhelmed?",
      "What's the most important thing about negotiating for what you're worth?",
      "How do you maintain work-life balance when you're passionate about your career?",
      "What should you do if your dream job turns out to be different than you expected?",
      "How do you handle professional jealousy when others succeed before you do?",
      "What's the secret to networking genuinely rather than transactionally?",
      "How do you know when to be a team player versus when to stand out as an individual?",
      "What's the most important lesson I learned about leadership and responsibility?",
      "How do you handle making mistakes that affect other people at work?",
      "What does it mean to find purpose in your work, even if it's not your dream job?",
      "How do you prepare for opportunities that haven't presented themselves yet?",
      "What's the most important thing about building a reputation that you can be proud of?"
    ]
  },

  // LOVE & RELATIONSHIPS - Marriage & Partnership
  {
    category: 'love_relationships',
    subcategory: 'marriage_partnership',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 10,
    tags: ['marriage', 'partnership', 'commitment', 'love'],
    questions: [
      "What does it really mean to choose someone 'for better or worse'?",
      "How do you keep choosing to love someone even when you don't like them very much?",
      "What's the secret to maintaining intimacy while raising children and managing life's responsibilities?",
      "How do you handle it when you and your partner want different things for your future?",
      "What's the most important thing about learning to fight fair in a marriage?",
      "How do you support your partner's dreams even when they require sacrifice from you?",
      "What does it mean to truly be a team in marriage, not just two people living together?",
      "How do you maintain your individual friendships and interests while being fully committed to your marriage?",
      "What's the difference between compromise and resentment in a long-term relationship?",
      "How do you handle it when your partner goes through a major life change or crisis?",
      "What's the most important thing about physical intimacy in a lasting relationship?",
      "How do you keep growing together instead of growing apart over the years?",
      "What should you do when extended family creates tension in your marriage?",
      "How do you handle financial stress without letting it destroy your relationship?",
      "What's the secret to maintaining romance after decades together?",
      "How do you know when marriage counseling is needed, and what makes it effective?",
      "What does it mean to truly forgive your partner for a serious betrayal or hurt?",
      "How do you balance being honest about problems with being loyal to your marriage?",
      "What's the most important thing about supporting each other through health challenges or aging?",
      "How do you handle it when one person changes significantly during the marriage?",
      "What's the difference between working on your marriage and trying to change your partner?",
      "How do you create new traditions and meaning together while honoring your individual backgrounds?",
      "What's the most important lesson about love that only comes from being married for many years?",
      "How do you know when to seek help and when to work through problems privately?",
      "What does it mean to age gracefully together while maintaining attraction and connection?"
    ]
  },

  // LOVE & RELATIONSHIPS - Parenting Wisdom
  {
    category: 'love_relationships',
    subcategory: 'parenting_wisdom',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 10,
    tags: ['parenting', 'children', 'guidance', 'love', 'family'],
    questions: [
      "What's the most important thing to remember about loving your children unconditionally while still setting boundaries?",
      "How do you discipline children in a way that teaches rather than just punishes?",
      "What's the secret to raising confident children who aren't entitled or arrogant?",
      "How do you know when to rescue your child from difficulties and when to let them learn?",
      "What's the most important thing about teaching children to handle failure and disappointment?",
      "How do you help your children develop their own values while sharing your beliefs?",
      "What does it mean to prepare your children for the world without making them cynical?",
      "How do you handle it when your child makes choices you strongly disagree with?",
      "What's the most important thing about staying connected with your children as they become teenagers?",
      "How do you teach children about money, work, and the value of earning what they have?",
      "What's the secret to maintaining authority as a parent while still being approachable?",
      "How do you help your children develop emotional intelligence and empathy?",
      "What's the most important thing about teaching children to stand up for themselves and others?",
      "How do you balance protecting your children with letting them experience natural consequences?",
      "What does it mean to model the behavior you want to see in your children?",
      "How do you handle your own mistakes as a parent and make them into teaching moments?",
      "What's the most important thing about teaching children about relationships and love?",
      "How do you help your children find their own identity separate from your expectations?",
      "What's the secret to family traditions that create lasting bonds and memories?",
      "How do you teach children about justice, fairness, and standing up for what's right?",
      "What's the most important thing about helping children through their first experiences with loss or grief?",
      "How do you maintain your marriage relationship while being devoted parents?",
      "What does it mean to trust your children while still being vigilant about their safety?",
      "How do you teach children about diversity, acceptance, and treating everyone with respect?",
      "What's the most important legacy you want to leave your children beyond material things?"
    ]
  },

  // FAMILY STORIES - Origin Stories
  {
    category: 'family_stories',
    subcategory: 'origin_stories',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 8,
    tags: ['family_history', 'love_story', 'origins', 'heritage'],
    questions: [
      "Tell me the complete story of how you and your spouse/partner first met - every detail you remember.",
      "What were you thinking and feeling during your first conversation with the person who became your life partner?",
      "Describe the moment you knew you were falling in love - what made you realize it?",
      "What obstacles did you and your partner have to overcome to be together?",
      "Tell me about your wedding day - not just the ceremony, but how you felt and what it meant to you.",
      "What was your first year of marriage really like, including the challenges nobody talks about?",
      "How did your relationship with your spouse change when you became parents?",
      "What's the story behind your children's names and why you chose them?",
      "Describe the day each of your children was born and how it felt to become a parent.",
      "What family traditions did you create and why were they important to you?",
      "Tell me about the home where you raised your family and what made it special.",
      "What's the story of your parents' relationship and how it influenced your own marriage?",
      "Describe your childhood home and the memories that shaped who you became.",
      "What's the story of how your family came to live where you did?",
      "Tell me about your grandparents and the legacy they left for your family.",
      "What challenges did your family face together and how did they make you stronger?",
      "Describe the happiest family vacation or trip you ever took and why it was special.",
      "What's the story behind any family heirlooms or treasures that should be passed down?",
      "Tell me about family members who are no longer with us and what they meant to you.",
      "What's the history of your cultural or ethnic background that your children should know?",
      "Describe any family businesses, farms, or enterprises that were part of your heritage.",
      "What immigration or migration stories are part of your family's journey?",
      "Tell me about family members who served in the military or made significant sacrifices.",
      "What's the story of how your family survived difficult times like wars, economic hardship, or disasters?",
      "Describe the love story of your parents or other relatives that should be remembered."
    ]
  },

  // FAMILY STORIES - Childhood & Growing Up
  {
    category: 'family_stories',
    subcategory: 'childhood_memories',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 7,
    tags: ['childhood', 'memories', 'growing_up', 'lessons'],
    questions: [
      "What's your earliest vivid memory, and why do you think it stayed with you?",
      "Describe your childhood bedroom and what made it feel safe or special to you.",
      "Tell me about your best friend growing up and what adventures you had together.",
      "What was your favorite family tradition or holiday celebration as a child?",
      "Describe a time when you got in trouble as a child and what you learned from it.",
      "What was your relationship like with each of your parents during your childhood?",
      "Tell me about your siblings and how your relationships with them shaped you.",
      "What was your favorite hiding spot or secret place when you were young?",
      "Describe the neighborhood where you grew up and what childhood adventures you had there.",
      "What was your biggest childhood fear and how did you overcome it?",
      "Tell me about a teacher who had a significant impact on your life and why.",
      "What was your favorite childhood toy or possession and why was it special?",
      "Describe your family's dinner table conversations and what you learned from them.",
      "What chores or responsibilities did you have as a child and what did they teach you?",
      "Tell me about a childhood injury or illness and how it affected you.",
      "What was your favorite book or story as a child and why did it matter to you?",
      "Describe any pets you had growing up and what they meant to you.",
      "What was your favorite childhood game or activity with family?",
      "Tell me about a time when your parents surprised you or made you feel especially loved.",
      "What was your biggest childhood disappointment and how did you handle it?",
      "Describe your grandparents' house and what it was like to visit them.",
      "What was your favorite childhood meal and who made it for you?",
      "Tell me about your first day of school and how you felt about it.",
      "What childhood dream or ambition did you have and how did it influence your life?",
      "Describe a family crisis or difficult time during your childhood and how your family handled it."
    ]
  },

  // VALUES & BELIEFS - Core Principles
  {
    category: 'values_beliefs',
    subcategory: 'core_principles',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 9,
    tags: ['values', 'principles', 'integrity', 'character'],
    questions: [
      "What principle do you hold so deeply that you would never compromise it, no matter the cost?",
      "How do you define integrity, and can you give me an example of when you had to choose it over convenience?",
      "What does it mean to live with honor, and how has that guided your decisions?",
      "When faced with a moral dilemma, what framework do you use to determine the right choice?",
      "What values did you inherit from your parents that you want to pass on?",
      "What belief or value did you develop independently from how you were raised?",
      "How do you handle situations where your values conflict with what's popular or profitable?",
      "What does loyalty mean to you, and when might loyalty become misguided?",
      "How do you balance being true to yourself with being considerate of others?",
      "What's the most important thing about treating people with respect, even when they're different from you?",
      "How do you define success in a way that aligns with your deepest values?",
      "What does it mean to take responsibility not just for your actions, but for their consequences?",
      "How do you handle it when someone you respect acts in a way that contradicts your values?",
      "What's the difference between standing up for your beliefs and being judgmental of others?",
      "How do you teach others about your values without being preachy or superior?",
      "What does forgiveness mean to you, and when is it difficult to practice?",
      "How do you balance self-interest with service to others and the greater good?",
      "What's the most important thing about being honest, even when the truth is uncomfortable?",
      "How do you handle peer pressure or social pressure to act against your values?",
      "What does it mean to have courage in your daily life, not just in dramatic moments?",
      "How do you maintain your values when the world around you seems to be changing rapidly?",
      "What's the difference between being principled and being inflexible?",
      "How do you handle guilt when you've acted in a way that contradicts your own values?",
      "What does humility mean to you, and how do you practice it?",
      "What's the most important thing about building a reputation based on character rather than achievements?"
    ]
  },

  // EMOTIONAL WISDOM - Handling Difficult Emotions
  {
    category: 'emotional_wisdom',
    subcategory: 'difficult_emotions',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 9,
    tags: ['emotions', 'mental_health', 'resilience', 'healing'],
    questions: [
      "When you're overwhelmed by sadness, what helps you process it without being consumed by it?",
      "How do you handle anger in a way that doesn't hurt others but still honors your feelings?",
      "What's the difference between healthy worry and anxiety that steals your peace?",
      "When you're feeling hopeless, what reminds you that this feeling will pass?",
      "How do you deal with disappointment when something you really wanted doesn't happen?",
      "What's the secret to handling rejection without letting it define your self-worth?",
      "When you're feeling lonely, what helps you reconnect with yourself and others?",
      "How do you process guilt in a way that leads to growth rather than self-punishment?",
      "What do you do when you're feeling jealous or envious of someone else's life?",
      "How do you handle fear when it's trying to stop you from doing something important?",
      "What's the difference between processing grief and getting stuck in it?",
      "When you're feeling overwhelmed, what's your process for breaking things down into manageable pieces?",
      "How do you maintain hope during prolonged difficult periods in your life?",
      "What's the most important thing about asking for help when you're struggling emotionally?",
      "How do you handle shame about past mistakes or failures?",
      "What does emotional resilience mean, and how do you build it?",
      "When you're feeling lost or confused about your direction in life, what helps you find clarity?",
      "How do you deal with regret in a way that's constructive rather than destructive?",
      "What's the secret to self-compassion when you're being hard on yourself?",
      "How do you handle the gap between your expectations and reality?",
      "What do you do when you're feeling stuck and unable to move forward?",
      "How do you process betrayal or deep hurt from someone you trusted?",
      "What's the most important thing about maintaining your mental health during stressful times?",
      "How do you handle the emotions that come with major life transitions?",
      "What does it mean to sit with uncomfortable emotions instead of trying to escape them?"
    ]
  },

  // MILESTONE MESSAGES - Graduations & Achievements
  {
    category: 'milestone_messages',
    subcategory: 'achievements_graduations',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 8,
    tags: ['milestones', 'achievements', 'pride', 'future'],
    questions: [
      "What do you want me to know about how proud you are of my educational achievements?",
      "If you can't be at my high school graduation, what would you want to say to me?",
      "What advice do you have for me as I start college or my first job?",
      "When I achieve something I've worked hard for, how do you want me to feel your pride and support?",
      "What do you want me to remember about the importance of celebrating accomplishments?",
      "If I receive a major award or recognition, what would you want to whisper in my ear?",
      "What's your advice for handling success with grace and humility?",
      "When I reach a goal I've set for myself, what should I remember about the journey that got me there?",
      "What do you want me to know about how education and learning should continue throughout life?",
      "If I'm feeling imposter syndrome after an achievement, what would you remind me about my worthiness?",
      "What's the most important thing to remember about using success as a platform to help others?",
      "When I'm tempted to rest on my laurels, what would you say to keep me motivated?",
      "What do you want me to know about the difference between accomplishment and fulfillment?",
      "If I achieve something you always dreamed of but never got to do, how should I honor that?",
      "What's your advice for staying grounded when others treat me differently because of my success?",
      "When I have to make a speech or accept recognition, what would you want me to remember to say?",
      "What do you want me to know about how achievements should strengthen, not divide, relationships?",
      "If I'm struggling with the pressure that comes with success, what would you tell me?",
      "What's the most important thing about sharing credit and acknowledging those who helped me?",
      "When I achieve something major, what traditions or celebrations would you want me to continue?",
      "What do you want me to remember about how achievements are stepping stones, not destinations?",
      "If others are jealous of my success, how should I handle that with maturity?",
      "What's your advice for using achievements to build confidence for even bigger dreams?",
      "When I'm honored or recognized, what do you want me to remember about our family's values?",
      "What do you want me to know about how proud you are of who I've become, not just what I've accomplished?"
    ]
  },

  // MILESTONE MESSAGES - Marriage & Love
  {
    category: 'milestone_messages',
    subcategory: 'marriage_love',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 10,
    tags: ['marriage', 'wedding', 'love', 'partnership', 'blessing'],
    questions: [
      "If I can't be at your wedding, what do I want you to know about how happy I am for you?",
      "What blessing do I want to give you and your spouse as you start your marriage?",
      "What do I want you to remember about love during your wedding ceremony?",
      "If you're reading this on your wedding day, what do I want to tell you about the person you're marrying?",
      "What advice do I have for you about building a strong marriage from the very beginning?",
      "What do I want you to know about how I see your love and why I believe in your relationship?",
      "If you're nervous about getting married, what would I tell you about taking this step?",
      "What marriage wisdom do I want to share with you that I learned from my own experience?",
      "What do I want you to promise me about how you'll treat your spouse?",
      "If you're having doubts before your wedding, what would I tell you about commitment and choice?",
      "What do I want you to know about maintaining your individual identity within marriage?",
      "What traditions from our family do I hope you'll continue in your new marriage?",
      "If you're writing your wedding vows, what do I think are the most important promises to make?",
      "What do I want your spouse to know about how much I love you and support your marriage?",
      "What do I want you to remember about our family's definition of love and commitment?",
      "If you're struggling in your marriage someday, what foundational truths should you remember?",
      "What do I want you to know about the difference between the wedding day and the marriage that follows?",
      "What hopes and dreams do I have for your life together as a married couple?",
      "If you're choosing a wedding ring or planning the ceremony, what should you remember about symbolism and meaning?",
      "What do I want you to know about how marriage will change you and why that growth is beautiful?",
      "What prayers or wishes do I have for your marriage during difficult times?",
      "If you're blending families or dealing with complex family dynamics, what's my advice?",
      "What do I want you to remember about the wedding being just the beginning of your love story?",
      "What legacy of love from our family do I want you to carry into your marriage?",
      "If you can't see me at your wedding, what do you need to know about how present I am in spirit?"
    ]
  }
]

// Helper functions for the legacy question system
export function getLegacyQuestionsByCategory(
  category: LegacyCategory,
  count: number = 5
): string[] {
  const categoryTemplates = legacyQuestionTemplates.filter(t => t.category === category)
  const allQuestions = categoryTemplates.flatMap(template => template.questions)
  return allQuestions.sort(() => 0.5 - Math.random()).slice(0, count)
}

export function getLegacyQuestionsByRole(
  role: FamilyRole,
  count: number = 5
): string[] {
  const roleTemplates = legacyQuestionTemplates.filter(t => t.familyRoles.includes(role))
  const allQuestions = roleTemplates.flatMap(template => template.questions)
  return allQuestions.sort(() => 0.5 - Math.random()).slice(0, count)
}

export function getHighEmotionalDepthQuestions(
  minDepth: number = 8,
  count: number = 5
): string[] {
  const deepTemplates = legacyQuestionTemplates.filter(t => t.emotionalDepth >= minDepth)
  const allQuestions = deepTemplates.flatMap(template => template.questions)
  return allQuestions.sort(() => 0.5 - Math.random()).slice(0, count)
}

export function getLegacyQuestionCount(): number {
  return legacyQuestionTemplates.reduce((total, template) => total + template.questions.length, 0)
}

export function getLegacyCategoryDistribution(): Record<LegacyCategory, number> {
  return legacyQuestionTemplates.reduce((acc, template) => {
    acc[template.category] = (acc[template.category] || 0) + template.questions.length
    return acc
  }, {} as Record<LegacyCategory, number>)
}