import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin'
import { query } from '@/lib/db'

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { config, userId, modelInfo } = await request.json()
    
    const warnings = []
    const errors = []
    const recommendations = []

    // Validate model configuration
    if (!config.model?.baseModel) {
      errors.push('Base model selection is required')
    }

    // Validate hardware requirements
    const estimatedMemory = calculateMemoryUsage(config, modelInfo)
    if (estimatedMemory > 24) {
      errors.push(`Estimated memory usage (${estimatedMemory}GB) exceeds RTX 5090 capacity (24GB)`)
    } else if (estimatedMemory > 22) {
      warnings.push(`High memory usage (${estimatedMemory}GB) - consider reducing batch size or enabling quantization`)
    }

    // Validate training parameters
    if (config.training?.epochs > 5) {
      warnings.push('Training with more than 5 epochs may lead to overfitting')
    }

    if (config.training?.learningRate > 0.001) {
      warnings.push('High learning rate may cause training instability')
    }

    if (config.training?.batchSize > 8) {
      warnings.push('Large batch size may cause memory issues')
    }

    // Validate LoRA configuration
    if (config.training?.method === 'lora') {
      if (!config.training.loraRank) {
        errors.push('LoRA rank is required for LoRA training')
      } else if (config.training.loraRank > 32) {
        warnings.push('High LoRA rank increases memory usage and training time')
      }
      
      if (config.training.loraAlpha < config.training.loraRank) {
        warnings.push('LoRA alpha should typically be >= LoRA rank')
      }
    }

    // Check user data availability if userId provided
    if (userId) {
      const userData = await query(`
        SELECT 
          COUNT(DISTINCT r.id) as response_count,
          COUNT(DISTINCT le.id) as life_entry_count,
          COUNT(DISTINCT mm.id) as milestone_count,
          COALESCE(SUM(LENGTH(r.response_text)), 0) + 
          COALESCE(SUM(LENGTH(le.content)), 0) + 
          COALESCE(SUM(LENGTH(mm.message_content)), 0) as total_words
        FROM users u
        LEFT JOIN responses r ON u.id = r.user_id
        LEFT JOIN life_detail_entries le ON u.id = le.user_id
        LEFT JOIN milestone_messages mm ON u.id = mm.user_id
        WHERE u.id = $1
        GROUP BY u.id
      `, [userId])

      if (userData.rows.length > 0) {
        const data = userData.rows[0]
        const totalEntries = parseInt(data.response_count) + parseInt(data.life_entry_count) + parseInt(data.milestone_count)
        const totalWords = parseInt(data.total_words)

        if (totalEntries < 10) {
          errors.push(`Insufficient training data: ${totalEntries} entries (minimum 10 required)`)
        } else if (totalEntries < 25) {
          warnings.push(`Limited training data: ${totalEntries} entries (25+ recommended for better quality)`)
        }

        if (totalWords < 1000) {
          errors.push(`Insufficient content: ${totalWords} words (minimum 1000 required)`)
        } else if (totalWords < 5000) {
          warnings.push(`Limited content: ${totalWords} words (5000+ recommended for better quality)`)
        }
      } else {
        errors.push('No training data found for selected user')
      }
    }

    // Generate recommendations
    if (config.model?.quantization === 'none' && estimatedMemory > 18) {
      recommendations.push('Consider enabling 4-bit quantization to reduce memory usage')
    }

    if (!config.hardware?.enableRTXOptimizations) {
      recommendations.push('Enable RTX 5090 optimizations for better performance')
    }

    if (!config.model?.flashAttention) {
      recommendations.push('Enable Flash Attention 2 for memory efficiency')
    }

    if (config.training?.batchSize < 4 && estimatedMemory < 20) {
      recommendations.push('Consider increasing batch size for better GPU utilization')
    }

    if (!config.quality?.enableValidation) {
      recommendations.push('Enable validation for better training quality assessment')
    }

    // Calculate optimization score
    let optimizationScore = 0
    if (config.hardware?.enableRTXOptimizations) optimizationScore += 20
    if (config.model?.flashAttention) optimizationScore += 15
    if (config.model?.quantization !== 'none') optimizationScore += 15
    if (config.hardware?.enableGradientCheckpointing) optimizationScore += 10
    if (config.quality?.enableValidation) optimizationScore += 10
    if (config.training?.method === 'lora') optimizationScore += 15
    if (config.hardware?.batchSizeStrategy === 'adaptive') optimizationScore += 10
    if (config.hardware?.enableCompilation) optimizationScore += 5

    return NextResponse.json({
      valid: errors.length === 0,
      warnings,
      errors,
      recommendations,
      optimizationScore,
      estimatedSpecs: {
        memoryUsage: estimatedMemory,
        trainingTime: calculateTrainingTime(config, modelInfo),
        costEstimate: calculateCost(config, modelInfo),
        qualityScore: calculateQualityScore(config)
      }
    })

  } catch (error) {
    console.error('Config validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate configuration' },
      { status: 500 }
    )
  }
})

function calculateMemoryUsage(config: any, modelInfo: any): number {
  let baseMemory = modelInfo?.memoryRequirement || 16
  
  // Quantization reduction
  if (config.model?.quantization === '4bit') {
    baseMemory *= 0.6
  } else if (config.model?.quantization === '8bit') {
    baseMemory *= 0.8
  }
  
  // Gradient checkpointing reduction
  if (config.hardware?.enableGradientCheckpointing) {
    baseMemory *= 0.8
  }
  
  // Batch size impact
  const batchSize = config.training?.batchSize || 4
  baseMemory += (batchSize - 4) * 2
  
  return Math.round(baseMemory)
}

function calculateTrainingTime(config: any, modelInfo: any): number {
  const baseTime = modelInfo?.parameters === '7B' ? 60 : 45
  const epochMultiplier = config.training?.epochs || 3
  const batchMultiplier = Math.max(0.5, (config.training?.batchSize || 4) / 4)
  const methodMultiplier = config.training?.method === 'full' ? 3 : 1
  
  return Math.round(baseTime * epochMultiplier * batchMultiplier * methodMultiplier)
}

function calculateCost(config: any, modelInfo: any): number {
  const trainingTime = calculateTrainingTime(config, modelInfo)
  const costPerMinute = 0.04 // Approximate cost per minute
  return Number((trainingTime * costPerMinute).toFixed(2))
}

function calculateQualityScore(config: any): number {
  let score = 70 // Base score
  
  if (config.training?.epochs >= 3) score += 10
  if (config.training?.method === 'lora') score += 5
  if (config.quality?.enableValidation) score += 10
  if (config.training?.learningRate <= 0.0002) score += 5
  
  return Math.min(100, score)
}