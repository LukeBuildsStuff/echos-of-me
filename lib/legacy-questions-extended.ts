// Additional legacy questions to expand our database to 3,000+
import { LegacyQuestionTemplate } from './legacy-questions'

export const extendedLegacyQuestions: LegacyQuestionTemplate[] = [
  // DAILY ESSENCE - Personality & Humor
  {
    category: 'daily_essence',
    subcategory: 'personality_humor',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 6,
    tags: ['personality', 'humor', 'quirks', 'daily_life'],
    questions: [
      "What makes you laugh until your sides hurt, and why do you find it so funny?",
      "Describe your sense of humor - are you sarcastic, punny, silly, or something else?",
      "What's a quirky habit you have that your family teases you about lovingly?",
      "What's your go-to joke or funny story that you tell at gatherings?",
      "How do you use humor to deal with stress or difficult situations?",
      "What's the funniest thing that ever happened to you that still makes you laugh?",
      "Describe your laugh - is it quiet, loud, snorty, contagious?",
      "What comedy shows, movies, or comedians never fail to make you smile?",
      "How do you know when someone shares your sense of humor?",
      "What's the difference between your public humor and your private family humor?",
      "What's the most embarrassing thing that happened to you that you can laugh about now?",
      "How do you handle people who don't appreciate your sense of humor?",
      "What's your favorite way to make children laugh and feel loved?",
      "Describe a time when laughter helped you through a really tough situation.",
      "What's the most ridiculous thing you've ever done that seemed logical at the time?",
      "How has your sense of humor changed as you've gotten older?",
      "What's your favorite family inside joke and how did it start?",
      "What's the silliest thing you do when no one is watching?",
      "How do you use humor in your marriage or close relationships?",
      "What's the funniest misunderstanding or miscommunication you've ever had?",
      "Describe your favorite funny memory with each of your children.",
      "What's your approach to teasing - how do you keep it loving instead of hurtful?",
      "What makes you giggle like a child even as an adult?",
      "How do you know when it's appropriate to use humor and when to be serious?",
      "What's the best advice you have about not taking yourself too seriously?"
    ]
  },

  // DAILY ESSENCE - Food & Traditions
  {
    category: 'daily_essence',
    subcategory: 'food_traditions',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 7,
    tags: ['food', 'cooking', 'traditions', 'comfort', 'family'],
    questions: [
      "What's your ultimate comfort food and what memories are attached to it?",
      "Describe how you make your signature dish - include all the little secrets and techniques.",
      "What's the story behind your favorite family recipe and who taught it to you?",
      "What food immediately transports you back to your childhood?",
      "What's your go-to meal when you're cooking for someone you love?",
      "Describe your ideal family dinner - the food, the setting, the conversation.",
      "What kitchen smells make you feel most at home and loved?",
      "What's the most disastrous cooking experience you've ever had?",
      "What food traditions do you hope your family continues after you're gone?",
      "What's your favorite restaurant or type of cuisine and why?",
      "Describe your philosophy about food - is it fuel, art, love, or something else?",
      "What's the most exotic or unusual food you've ever tried and enjoyed?",
      "What do you always cook when someone is sick or needs comfort?",
      "What's your favorite cooking memory with your children or spouse?",
      "Describe your ideal birthday cake or special occasion dessert.",
      "What food do you associate with holidays and celebrations?",
      "What's the secret ingredient you add to everything (literal or metaphorical)?",
      "What cooking disaster taught you an important life lesson?",
      "Describe your favorite kitchen and what made it special for cooking.",
      "What's your approach to feeding people - how do you show love through food?",
      "What food reminds you of your parents or grandparents?",
      "What's the weirdest food combination you love that others think is strange?",
      "Describe your favorite meal you've ever shared with your family.",
      "What's your advice for creating meaningful food traditions?",
      "What do you want your children to remember about family meals and cooking together?"
    ]
  },

  // FINAL MESSAGES - End of Life Wisdom
  {
    category: 'final_messages',
    subcategory: 'end_of_life_wisdom',
    familyRoles: ['parent', 'grandparent', 'spouse'],
    emotionalDepth: 10,
    tags: ['death', 'legacy', 'final_words', 'love', 'meaning'],
    questions: [
      "If these are among the last words you'll ever share with your family, what's most important to say?",
      "What do you want your children to know about death and how to process losing you?",
      "How do you want to be remembered - not just the good things, but as a complete person?",
      "What's the most important thing you've learned about what makes life meaningful?",
      "What do you want your family to do to honor your memory in a way that brings them joy?",
      "If you could only leave one piece of advice for each of your children, what would it be?",
      "What do you want your family to know about how much you love them?",
      "What are you most proud of in your life, and what do you wish you had done differently?",
      "What do you want your children to tell their children about who you were?",
      "How do you want your family to support each other after you're gone?",
      "What possessions or mementos do you want specific people to have and why?",
      "What do you believe happens after death, and how should that comfort your family?",
      "What traditions or rituals do you want your family to continue in your honor?",
      "What do you want your spouse to know about moving on and finding happiness again?",
      "What's the most important thing about grief that you want your family to understand?",
      "What moments from your life brought you the greatest joy and fulfillment?",
      "What do you want your family to know about the love you have for each of them?",
      "How do you want your grandchildren who never got to know you well to understand who you were?",
      "What mistakes do you want your children to forgive you for?",
      "What dreams do you have for your family's future that you won't be here to see?",
      "What do you want people to say at your funeral that captures who you really were?",
      "What lessons from your life do you most want to pass on to future generations?",
      "How do you want your family to find peace and comfort during their grief?",
      "What do you want your children to remember when they're raising their own families?",
      "What final blessing or prayer do you want to leave with your loved ones?"
    ]
  },

  // FAMILY STORIES - Funny & Memorable Moments
  {
    category: 'family_stories',
    subcategory: 'funny_memorable_moments',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 6,
    tags: ['family', 'funny', 'memories', 'stories', 'moments'],
    questions: [
      "What's the funniest thing each of your children ever said or did?",
      "Tell me about a family vacation that didn't go as planned but became a great story.",
      "What's the most embarrassing thing you did as a parent that your kids still tease you about?",
      "Describe a time when your family laughed so hard together that you couldn't stop.",
      "What's a family disaster that turned into one of your favorite memories?",
      "Tell me about a time when one of your children surprised you with their wisdom or maturity.",
      "What's the most mischievous thing you did as a child that your parents found out about later?",
      "Describe a holiday or celebration that went completely wrong but was perfect anyway.",
      "What's the most ridiculous argument your family ever had that you can laugh about now?",
      "Tell me about a time when your child did something that made you incredibly proud in an unexpected way.",
      "What's the weirdest phase any of your children went through?",
      "Describe a moment when you realized your child had inherited a specific trait from you.",
      "What's the most creative excuse your child ever gave for getting in trouble?",
      "Tell me about a time when your family had to work together to solve a problem or challenge.",
      "What's the most embarrassing thing your child ever did in public?",
      "Describe a moment when you couldn't stop laughing at something inappropriate or poorly timed.",
      "What's the most unexpected place or situation where your child showed their personality?",
      "Tell me about a family tradition that started by accident but became beloved.",
      "What's the most bizarre conversation you ever overheard between your children?",
      "Describe a time when your child's logic was completely wrong but somehow made perfect sense.",
      "What's the most trouble you and your siblings got into together as children?",
      "Tell me about a time when your child taught you something important without realizing it.",
      "What's the most unusual pet or animal your family ever had?",
      "Describe a moment when your family's differences in personality created a funny situation.",
      "What's the most memorable road trip or car ride your family ever took together?"
    ]
  },

  // PARENTAL WISDOM - Financial & Practical Life
  {
    category: 'parental_wisdom',
    subcategory: 'financial_practical',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 7,
    tags: ['money', 'practical', 'financial', 'life_skills', 'wisdom'],
    questions: [
      "What's the most important thing to understand about money and how it works?",
      "How do you distinguish between wants and needs when making financial decisions?",
      "What's your philosophy about debt - when is it acceptable and when should it be avoided?",
      "What financial mistake did you make that taught you the most valuable lesson?",
      "How do you approach saving money without depriving yourself of life's joys?",
      "What's the secret to living within your means while still being generous?",
      "How do you handle financial stress without letting it destroy your relationships?",
      "What's the most important thing about building credit and maintaining a good financial reputation?",
      "How do you make big financial decisions like buying a house or car?",
      "What's your advice about insurance and protecting yourself from financial disaster?",
      "How do you balance saving for the future with enjoying money in the present?",
      "What's the most important thing to understand about investing and building wealth?",
      "How do you handle money in a marriage or partnership fairly and openly?",
      "What's your philosophy about giving to charity and helping others financially?",
      "How do you teach children about money without making them anxious or greedy?",
      "What's the difference between being frugal and being cheap?",
      "How do you handle unexpected financial emergencies or setbacks?",
      "What's the most important thing about estate planning and preparing for the future?",
      "How do you make financial decisions when you have competing priorities?",
      "What's your advice about college funding and educational expenses?",
      "How do you handle financial disagreements with family members?",
      "What's the most important thing about maintaining financial independence?",
      "How do you evaluate whether a major purchase is worth the money?",
      "What's your philosophy about borrowing money from or lending money to family?",
      "What practical life skills should everyone learn to be financially responsible?"
    ]
  },

  // LOVE & RELATIONSHIPS - Friendship Wisdom
  {
    category: 'love_relationships',
    subcategory: 'friendship_wisdom',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 7,
    tags: ['friendship', 'relationships', 'loyalty', 'connection'],
    questions: [
      "What makes someone a true friend versus just an acquaintance?",
      "How do you maintain close friendships through different life stages and changes?",
      "What's the most important thing about being a good friend to others?",
      "How do you handle it when a close friend makes choices you disagree with?",
      "What's the difference between being supportive and enabling bad behavior in friends?",
      "How do you know when it's time to end a friendship that's become toxic?",
      "What's your approach to making new friends as an adult?",
      "How do you handle jealousy or competition in friendships?",
      "What's the most important thing about maintaining friendships when you're married or in a relationship?",
      "How do you balance being honest with friends while still being kind?",
      "What's the secret to forgiving friends when they hurt or disappoint you?",
      "How do you handle it when friends grow apart or drift away naturally?",
      "What's the most important quality to look for in people you want as close friends?",
      "How do you show up for friends during their difficult times?",
      "What's your philosophy about lending money to friends or mixing friendship with business?",
      "How do you handle gossip or drama within your friend group?",
      "What's the difference between being loyal to friends and being blindly supportive?",
      "How do you maintain individual friendships while also having couple friends?",
      "What's the most important thing about being there for friends during major life events?",
      "How do you handle it when friends don't like your spouse or partner?",
      "What's your approach to maintaining long-distance friendships?",
      "How do you know when to give friends advice versus when to just listen?",
      "What's the most important thing about celebrating friends' successes without jealousy?",
      "How do you handle friends who consistently take more than they give?",
      "What's the best advice you have about choosing friends who bring out the best in you?"
    ]
  },

  // VALUES & BELIEFS - Spiritual & Religious
  {
    category: 'values_beliefs',
    subcategory: 'spiritual_religious',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 9,
    tags: ['spirituality', 'religion', 'faith', 'meaning', 'purpose'],
    questions: [
      "What role does faith or spirituality play in your daily life?",
      "How do you find meaning and purpose in life's challenges and suffering?",
      "What do you believe happens after we die, and how does that belief comfort you?",
      "How has your relationship with God or spirituality evolved throughout your life?",
      "What spiritual practices bring you the most peace and connection?",
      "How do you handle doubt or questions about your faith?",
      "What's the difference between religion and spirituality in your experience?",
      "How do you pray or meditate, and what does it mean to you?",
      "What spiritual or religious traditions do you want your family to continue?",
      "How do you find God or spiritual meaning in everyday moments?",
      "What's your approach to discussing faith with people who believe differently?",
      "How has your faith helped you through the most difficult times in your life?",
      "What does forgiveness mean from a spiritual perspective?",
      "How do you balance free will with believing in a higher power or divine plan?",
      "What spiritual lessons have you learned from suffering or loss?",
      "How do you teach children about faith without forcing beliefs on them?",
      "What does it mean to live according to your spiritual values?",
      "How do you handle the gap between religious ideals and human imperfection?",
      "What spiritual questions do you still wrestle with?",
      "How do you find meaningful or profound moments in ordinary life?",
      "What's your understanding of grace, mercy, or divine love?",
      "How do you maintain faith when prayers seem to go unanswered?",
      "What spiritual practices help you feel most connected to something greater?",
      "How do you balance religious community with personal spiritual journey?",
      "What do you want your children to understand about the role of faith in finding peace and purpose?"
    ]
  },

  // MILESTONE MESSAGES - Becoming Parents
  {
    category: 'milestone_messages',
    subcategory: 'becoming_parents',
    familyRoles: ['parent', 'grandparent'],
    emotionalDepth: 10,
    tags: ['parenting', 'grandchildren', 'new_life', 'legacy'],
    questions: [
      "What do you want me to know about the moment I become a parent for the first time?",
      "If you can't be there when your grandchild is born, what do you want me to feel from you?",
      "What's the most important advice you have for me about loving and raising children?",
      "When I'm holding my newborn baby, what do you want me to remember about unconditional love?",
      "What do you want me to know about how becoming a parent will change me?",
      "If I'm scared about being a good parent, what would you tell me about my capabilities?",
      "What family traditions do you hope I'll start with my own children?",
      "What do you want me to know about balancing my marriage while raising children?",
      "When I'm exhausted and overwhelmed as a new parent, what wisdom would comfort me?",
      "What do you want your grandchildren to know about who you were?",
      "What hopes and dreams do you have for the children I'll raise?",
      "If I'm struggling with parenting decisions, what principles should guide me?",
      "What do you want me to remember about enjoying the precious early moments?",
      "What mistakes do you want me to avoid that you made as a parent?",
      "When my children are difficult or challenging, what perspective would help me?",
      "What do you want me to teach my children about our family history and values?",
      "If I'm feeling guilty about parenting choices, what would you remind me?",
      "What do you want me to know about the profound responsibility of shaping young lives?",
      "When I discipline my children, what approach would you want me to remember?",
      "What do you want me to understand about how much I'll love my children?",
      "If my children are very different from me, how should I celebrate their uniqueness?",
      "What do you want me to remember about being patient with myself as I learn to parent?",
      "What legacy from our family do you most want me to pass on to my children?",
      "When I feel like I'm failing as a parent, what truth should I remember?",
      "What blessing do you want to give to the grandchildren you may never meet?"
    ]
  },

  // EMOTIONAL WISDOM - Building Resilience
  {
    category: 'emotional_wisdom',
    subcategory: 'building_resilience',
    familyRoles: ['parent', 'grandparent', 'mentor'],
    emotionalDepth: 8,
    tags: ['resilience', 'strength', 'recovery', 'growth', 'perseverance'],
    questions: [
      "What's the secret to bouncing back from major setbacks or failures?",
      "How do you build mental toughness without becoming hard or callous?",
      "What's the difference between giving up and knowing when to quit?",
      "How do you maintain hope when you can't see any light at the end of the tunnel?",
      "What's your process for getting back up after being knocked down by life?",
      "How do you distinguish between problems you can solve and situations you must accept?",
      "What does it mean to be emotionally strong while still being vulnerable?",
      "How do you handle criticism or rejection without letting it crush your spirit?",
      "What's the most important thing about learning from painful experiences?",
      "How do you maintain your sense of self when everything around you is changing?",
      "What's your approach to dealing with people who try to tear you down?",
      "How do you find strength you didn't know you had during crisis moments?",
      "What's the difference between being resilient and just pretending everything is fine?",
      "How do you process trauma or deeply painful experiences in a healthy way?",
      "What's the secret to not becoming bitter after being hurt repeatedly?",
      "How do you maintain faith in good outcomes when you've experienced many disappointments?",
      "What's your strategy for handling multiple major stresses at the same time?",
      "How do you build confidence after experiences that shattered your self-belief?",
      "What does it mean to be strong for others while also taking care of yourself?",
      "How do you handle the fear that comes after surviving something terrible?",
      "What's the most important thing about asking for help when you're struggling?",
      "How do you maintain your values and character during your darkest moments?",
      "What's your approach to preventing past hurts from destroying future possibilities?",
      "How do you find meaning and purpose in experiences that seem senseless or cruel?",
      "What's the most important lesson about human resilience that you've learned from your own life?"
    ]
  }
]

// Utility functions
export function getAllLegacyQuestionCount(): number {
  const baseCount = 250 // Approximate count from original legacy-questions.ts
  const extendedCount = extendedLegacyQuestions.reduce((total, template) => total + template.questions.length, 0)
  return baseCount + extendedCount
}

export function getQuestionsByEmotionalDepth(depth: number): string[] {
  return extendedLegacyQuestions
    .filter(template => template.emotionalDepth === depth)
    .flatMap(template => template.questions)
}

export function getQuestionsByTag(tag: string): string[] {
  return extendedLegacyQuestions
    .filter(template => template.tags.includes(tag))
    .flatMap(template => template.questions)
}