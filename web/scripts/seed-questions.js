const { Pool } = require('pg')

// Question templates data - copied from TypeScript file
const questionTemplates = [
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://personalai:personalai123@localhost:5432/personalai',
})

async function seedQuestions() {
  const client = await pool.connect()
  
  try {
    console.log('Starting question seeding...')
    
    let totalInserted = 0
    
    for (const template of questionTemplates) {
      console.log(`Seeding ${template.category} - ${template.subcategory}...`)
      
      for (const questionText of template.questions) {
        const metadata = {
          subcategory: template.subcategory,
          template_source: true,
          seeded_at: new Date().toISOString()
        }
        
        const result = await client.query(`
          INSERT INTO questions (category, subcategory, question_text, complexity_level, metadata)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (question_text) DO NOTHING
          RETURNING id
        `, [
          template.category,
          template.subcategory,
          questionText,
          template.complexity,
          JSON.stringify(metadata)
        ])
        
        if (result.rows.length > 0) {
          totalInserted++
        }
      }
    }
    
    // Get final counts
    const categoryCount = await client.query(`
      SELECT category, COUNT(*) as count 
      FROM questions 
      WHERE is_active = true 
      GROUP BY category 
      ORDER BY category
    `)
    
    console.log('\n📊 Question seeding complete!')
    console.log(`✅ Total questions inserted: ${totalInserted}`)
    console.log('\n📈 Questions by category:')
    categoryCount.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} questions`)
    })
    
    const totalCount = await client.query('SELECT COUNT(*) FROM questions WHERE is_active = true')
    console.log(`\n🎯 Total active questions in database: ${totalCount.rows[0].count}`)
    
  } catch (error) {
    console.error('Error seeding questions:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the seeding
if (require.main === module) {
  seedQuestions()
    .then(() => {
      console.log('✨ Question seeding completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Question seeding failed:', error)
      process.exit(1)
    })
}

module.exports = { seedQuestions }