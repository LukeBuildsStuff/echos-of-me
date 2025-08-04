import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { TrainingExample } from '@/lib/ai-training-config'

/**
 * Advanced Training Data Formatting API
 * Formats user data for different LLM training approaches
 * Supports conversational, instruction-tuning, and chat formats
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      userId, 
      format = 'conversational', // conversational, instruction, chat, alpaca
      includeSystemPrompts = true,
      maxLength = 2048,
      templateStyle = 'legacy_preservation'
    } = body

    const targetUserId = userId || await getUserIdByEmail(session.user.email)
    
    console.log(`Formatting training data for user: ${targetUserId}, format: ${format}`)

    // Get the user's processed training dataset
    const dataset = await getTrainingDataset(targetUserId)
    if (!dataset) {
      return NextResponse.json({ 
        error: 'No training data found. Please collect data first.' 
      }, { status: 404 })
    }

    const trainingExamples: TrainingExample[] = JSON.parse(dataset.training_examples)
    const userProfile = await getUserProfile(targetUserId)

    // Format data according to requested format
    let formattedData
    switch (format) {
      case 'conversational':
        formattedData = formatForConversational(trainingExamples, userProfile, includeSystemPrompts)
        break
      case 'instruction':
        formattedData = formatForInstructionTuning(trainingExamples, userProfile, maxLength)
        break
      case 'chat':
        formattedData = formatForChatML(trainingExamples, userProfile, templateStyle)
        break
      case 'alpaca':
        formattedData = formatForAlpaca(trainingExamples, userProfile)
        break
      case 'llama':
        formattedData = formatForLlama(trainingExamples, userProfile)
        break
      case 'openai':
        formattedData = formatForOpenAI(trainingExamples, userProfile)
        break
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
    }

    // Generate training statistics
    const stats = generateTrainingStats(formattedData, trainingExamples)

    // Save formatted data for training job
    await saveFormattedDataset(targetUserId, formattedData, format, stats)

    return NextResponse.json({
      success: true,
      format,
      stats,
      data: formattedData,
      recommendations: getFormatRecommendations(format, stats),
      trainingReady: stats.averageLength >= 50 && stats.totalExamples >= 50
    })

  } catch (error: any) {
    console.error('Data formatting error:', error)
    return NextResponse.json(
      { 
        error: 'Data formatting failed',
        message: error?.message || 'Unknown error occurred during formatting'
      },
      { status: 500 }
    )
  }
}

/**
 * Get available formatting options
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formatOptions = {
      conversational: {
        name: 'Conversational Format',
        description: 'Standard chat format with system, user, and assistant roles',
        bestFor: 'General conversational AI, ChatGPT-style interactions',
        structure: 'messages array with role-based format'
      },
      instruction: {
        name: 'Instruction Tuning',
        description: 'Structured instruction-response format',
        bestFor: 'Task-specific fine-tuning, following instructions',
        structure: 'Instruction -> Input -> Response format'
      },
      chat: {
        name: 'ChatML Format',
        description: 'Modern chat markup language format',
        bestFor: 'Latest models supporting ChatML',
        structure: '<|im_start|> and <|im_end|> tokens'
      },
      alpaca: {
        name: 'Alpaca Format',
        description: 'Stanford Alpaca instruction format',
        bestFor: 'LLaMA-based models, instruction following',
        structure: 'Below is an instruction... format'
      },
      llama: {
        name: 'LLaMA Format',
        description: 'Meta LLaMA specific formatting',
        bestFor: 'LLaMA 2/3 models, code and reasoning tasks',
        structure: '[INST] instruction [/INST] response'
      },
      openai: {
        name: 'OpenAI Fine-tuning',
        description: 'OpenAI GPT fine-tuning JSONL format',
        bestFor: 'OpenAI API fine-tuning services',
        structure: 'JSONL with messages array'
      }
    }

    const userId = await getUserIdByEmail(session.user.email)
    const availableData = await getDataAvailability(userId)

    return NextResponse.json({
      success: true,
      formatOptions,
      dataAvailability: availableData,
      recommendations: {
        suggested: availableData.total_responses >= 100 ? 'conversational' : 'instruction',
        reason: availableData.total_responses >= 100 
          ? 'Enough data for full conversational training'
          : 'Instruction format better for smaller datasets'
      }
    })

  } catch (error: any) {
    console.error('Format options error:', error)
    return NextResponse.json(
      { error: 'Failed to get format options' },
      { status: 500 }
    )
  }
}

// Formatting Functions

function formatForConversational(examples: TrainingExample[], userProfile: any, includeSystemPrompts: boolean) {
  return examples.map(example => {
    const messages = []
    
    if (includeSystemPrompts) {
      messages.push({
        role: 'system',
        content: buildSystemPrompt(userProfile, example.metadata)
      })
    }
    
    messages.push({
      role: 'user',
      content: example.instruction
    })
    
    messages.push({
      role: 'assistant',
      content: example.output
    })
    
    return { messages }
  })
}

function formatForInstructionTuning(examples: TrainingExample[], userProfile: any, maxLength: number) {
  return examples.map(example => {
    const context = example.input || buildContextFromProfile(userProfile)
    const instruction = example.instruction
    const response = example.output
    
    // Truncate if too long
    const fullText = `### Instruction:\n${instruction}\n\n### Context:\n${context}\n\n### Response:\n${response}`
    
    return {
      text: fullText.length > maxLength 
        ? fullText.substring(0, maxLength - 100) + '...' 
        : fullText
    }
  })
}

function formatForChatML(examples: TrainingExample[], userProfile: any, templateStyle: string) {
  return examples.map(example => {
    const systemPrompt = buildAdvancedSystemPrompt(userProfile, example.metadata, templateStyle)
    
    return {
      text: `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${example.instruction}<|im_end|>\n<|im_start|>assistant\n${example.output}<|im_end|>`
    }
  })
}

function formatForAlpaca(examples: TrainingExample[], userProfile: any) {
  return examples.map(example => {
    const context = example.input || buildContextFromProfile(userProfile)
    
    return {
      instruction: example.instruction,
      input: context,
      output: example.output
    }
  })
}

function formatForLlama(examples: TrainingExample[], userProfile: any) {
  return examples.map(example => {
    const systemPrompt = buildSystemPrompt(userProfile, example.metadata)
    const fullInstruction = `${systemPrompt}\n\n${example.instruction}`
    
    return {
      text: `<s>[INST] ${fullInstruction} [/INST] ${example.output} </s>`
    }
  })
}

function formatForOpenAI(examples: TrainingExample[], userProfile: any) {
  return examples.map(example => ({
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(userProfile, example.metadata)
      },
      {
        role: 'user', 
        content: example.instruction
      },
      {
        role: 'assistant',
        content: example.output
      }
    ]
  }))
}

// Helper Functions

function buildSystemPrompt(userProfile: any, metadata: any): string {
  const name = userProfile?.name || 'a loving family member'
  const role = userProfile?.primary_role || 'family member'
  
  let prompt = `You are ${name}, a ${role} sharing your life experiences, wisdom, and memories with future generations.`
  
  // Add emotional context
  if (metadata?.emotionalTone && metadata.emotionalTone !== 'neutral') {
    prompt += ` You speak with a ${metadata.emotionalTone} tone.`
  }
  
  // Add relationship context
  if (metadata?.importantPeople && metadata.importantPeople.length > 0) {
    prompt += ` You often speak about your relationships with ${metadata.importantPeople.slice(0, 2).join(' and ')}.`
  }
  
  prompt += ' Your responses are personal, authentic, and filled with the wisdom of your life experiences. You aim to preserve your legacy and provide guidance for those who come after you.'
  
  return prompt
}

function buildAdvancedSystemPrompt(userProfile: any, metadata: any, templateStyle: string): string {
  const basePrompt = buildSystemPrompt(userProfile, metadata)
  
  switch (templateStyle) {
    case 'legacy_preservation':
      return basePrompt + ' Focus on preserving important life lessons, family history, and values that should be passed down through generations.'
    
    case 'conversational_companion':
      return basePrompt + ' Engage in natural, warm conversations as if speaking directly to a beloved family member or friend.'
    
    case 'wisdom_sharing':
      return basePrompt + ' Share practical wisdom, life advice, and insights gained through your experiences and challenges.'
    
    case 'storytelling':
      return basePrompt + ' Tell rich, detailed stories about your life, making them engaging and memorable for future listeners.'
    
    default:
      return basePrompt
  }
}

function buildContextFromProfile(userProfile: any): string {
  const contexts = []
  
  if (userProfile?.primary_role) {
    contexts.push(`You are a ${userProfile.primary_role}`)
  }
  
  if (userProfile?.life_stage) {
    contexts.push(`in your ${userProfile.life_stage}`)
  }
  
  contexts.push('sharing your personal experiences and wisdom')
  
  return contexts.join(' ') + '.'
}

function generateTrainingStats(formattedData: any[], originalExamples: TrainingExample[]) {
  const totalExamples = formattedData.length
  const totalTokens = formattedData.reduce((sum, item) => {
    const text = item.text || JSON.stringify(item)
    return sum + Math.ceil(text.length / 4) // Rough token estimate
  }, 0)
  
  const averageLength = originalExamples.reduce((sum, ex) => sum + ex.metadata.responseWordCount, 0) / totalExamples
  
  const categories = new Set(originalExamples.map(ex => ex.metadata.questionCategory)).size
  const emotions = new Set(originalExamples.map(ex => ex.metadata.emotionalTone)).size
  
  return {
    totalExamples,
    estimatedTokens: totalTokens,
    averageLength: Math.round(averageLength),
    categoryDiversity: categories,
    emotionalDiversity: emotions,
    dataSources: {
      responses: originalExamples.filter(ex => ex.metadata.dataSource === 'response').length,
      lifeStories: originalExamples.filter(ex => ex.metadata.dataSource === 'life_entry').length,
      milestones: originalExamples.filter(ex => ex.metadata.dataSource === 'milestone').length
    }
  }
}

function getFormatRecommendations(format: string, stats: any): string[] {
  const recommendations = []
  
  if (stats.totalExamples < 100) {
    recommendations.push(`Consider collecting more data. ${stats.totalExamples} examples may not be sufficient for robust training.`)
  }
  
  if (stats.averageLength < 50) {
    recommendations.push('Responses are quite short. Longer, more detailed responses generally produce better training results.')
  }
  
  if (stats.categoryDiversity < 5) {
    recommendations.push('Consider answering questions from more diverse categories to improve model versatility.')
  }
  
  switch (format) {
    case 'conversational':
      if (stats.estimatedTokens > 100000) {
        recommendations.push('Large dataset detected. Consider using gradient checkpointing and smaller batch sizes for training.')
      }
      break
    
    case 'instruction':
      if (stats.emotionalDiversity < 4) {
        recommendations.push('Instruction format works best with diverse emotional tones in responses.')
      }
      break
    
    case 'alpaca':
      recommendations.push('Alpaca format works exceptionally well with LLaMA-based models. Consider using Llama 2/3 as your base model.')
      break
  }
  
  if (recommendations.length === 0) {
    recommendations.push(`Your data is well-formatted for ${format} training. Ready to proceed!`)
  }
  
  return recommendations
}

// Database Functions

async function getUserIdByEmail(email: string): Promise<number> {
  const result = await query('SELECT id FROM users WHERE email = $1', [email])
  if (result.rows.length === 0) {
    throw new Error('User not found')
  }
  return result.rows[0].id
}

async function getUserProfile(userId: number) {
  const result = await query(`
    SELECT 
      u.id, u.name, u.email, u.primary_role, u.important_people,
      ur.family_members, ur.interests, ur.life_stage
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE u.id = $1
  `, [userId])
  
  return result.rows[0] || null
}

async function getTrainingDataset(userId: number) {
  const result = await query(`
    SELECT training_examples, training_examples_count, quality_metrics, created_at
    FROM training_datasets
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [userId])
  
  return result.rows[0] || null
}

async function getDataAvailability(userId: number) {
  const result = await query(`
    SELECT 
      COUNT(r.id) as total_responses,
      COUNT(DISTINCT q.category) as unique_categories,
      COALESCE(SUM(r.word_count), 0) as total_words
    FROM users u
    LEFT JOIN responses r ON u.id = r.user_id AND r.word_count >= 20
    LEFT JOIN questions q ON r.question_id = q.id
    WHERE u.id = $1
    GROUP BY u.id
  `, [userId])
  
  return result.rows[0] || { total_responses: 0, unique_categories: 0, total_words: 0 }
}

async function saveFormattedDataset(userId: number, formattedData: any[], format: string, stats: any) {
  await query(`
    INSERT INTO formatted_training_data (user_id, format_type, formatted_data, format_stats, created_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, format_type) DO UPDATE SET
      formatted_data = $3,
      format_stats = $4,
      updated_at = CURRENT_TIMESTAMP
  `, [
    userId,
    format,
    JSON.stringify(formattedData),
    JSON.stringify(stats)
  ])
}