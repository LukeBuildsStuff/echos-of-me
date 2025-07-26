import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

// OpenAI integration for dynamic question generation
async function generateQuestionsWithAI(
  category: string,
  userContext: any,
  count: number = 3
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('No OpenAI API key found, using fallback questions')
    return generateFallbackQuestions(category, count)
  }

  try {
    const prompt = `Generate ${count} thoughtful, personal questions for the category "${category}". 
    
The questions should:
- Be open-ended and encourage detailed, personal responses
- Help capture someone's unique personality, thoughts, and experiences
- Vary in depth and complexity
- Be appropriate for training a personal AI to mimic their communication style

User context: ${JSON.stringify(userContext, null, 2)}

Return only the questions as a JSON array of strings, no additional formatting.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating thoughtful, personal questions that help capture someone\'s unique personality and communication style. Return responses as valid JSON arrays only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content returned from OpenAI')
    }

    try {
      const questions = JSON.parse(content)
      if (Array.isArray(questions) && questions.length > 0) {
        return questions.slice(0, count)
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
    }

    // Fallback if parsing fails
    return generateFallbackQuestions(category, count)

  } catch (error) {
    console.error('OpenAI generation failed:', error)
    return generateFallbackQuestions(category, count)
  }
}

function generateFallbackQuestions(category: string, count: number): string[] {
  const fallbackQuestions: Record<string, string[]> = {
    'personal_history': [
      "What's a childhood memory that still influences how you think today?",
      "Describe a moment when you realized you had changed as a person.",
      "What's a family story that gets told at every gathering?"
    ],
    'philosophy_values': [
      "What principle do you never compromise on, and why?",
      "How do you define a life well-lived?",
      "What's something most people believe that you disagree with?"
    ],
    'daily_life': [
      "What's a small daily ritual that's important to you?",
      "How do you make decisions when you're uncertain?",
      "What does your ideal day look like from start to finish?"
    ],
    'professional': [
      "What motivates you most in your work?",
      "How do you handle professional challenges?",
      "What's the most valuable lesson you've learned in your career?"
    ],
    'relationships': [
      "How do you show care for the people you love?",
      "What's your approach to resolving conflicts?",
      "What makes someone trustworthy in your eyes?"
    ],
    'creative_expression': [
      "How do you express yourself creatively?",
      "What art or media moves you most deeply?",
      "How do you deal with creative blocks or lack of inspiration?"
    ],
    'hypotheticals': [
      "If you could change one thing about the world, what would it be?",
      "What would you do with an extra hour every day?",
      "If you could master any skill instantly, what would it be?"
    ]
  }

  const questions = fallbackQuestions[category] || fallbackQuestions['daily_life']
  return questions.slice(0, count)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { category = 'daily_life', count = 3 } = await request.json()

    // Get user context for better question generation
    const userStats = await query(`
      SELECT 
        COUNT(DISTINCT r.id) as total_responses,
        ARRAY_AGG(DISTINCT q.category) as answered_categories,
        AVG(LENGTH(r.response_text)) as avg_response_length
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.user_id = $1 AND r.is_draft = false
    `, [session.user.id])

    const userContext = userStats.rows[0] || {}

    // Generate questions using AI
    const generatedQuestions = await generateQuestionsWithAI(category, userContext, count)

    // Store generated questions in database for consistency
    const storedQuestions = []
    for (const questionText of generatedQuestions) {
      const result = await query(`
        INSERT INTO questions (category, subcategory, question_text, complexity_level, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (question_text) DO UPDATE SET
          category = EXCLUDED.category,
          metadata = EXCLUDED.metadata
        RETURNING id, category, subcategory, question_text, complexity_level, metadata
      `, [
        category,
        'generated',
        questionText,
        3, // Default complexity for AI-generated questions
        JSON.stringify({
          source: 'openai',
          generated_at: new Date().toISOString(),
          user_id: session.user.id
        })
      ])

      storedQuestions.push(result.rows[0])
    }

    return NextResponse.json({
      success: true,
      questions: storedQuestions,
      meta: {
        category,
        count: storedQuestions.length,
        source: 'ai_generated'
      }
    })

  } catch (error) {
    console.error('Error generating questions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate questions'
    }, { status: 500 })
  }
}