import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, trainingConfig, voiceDataPath } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Validate that voice data exists
    const actualUserId = userId || session.user.email.replace(/[^a-zA-Z0-9]/g, '_')
    const voiceDir = join(process.cwd(), 'public', 'voices', actualUserId)
    
    if (!existsSync(voiceDir)) {
      return NextResponse.json({ 
        error: 'No voice data found',
        message: 'Please record voice passages first'
      }, { status: 400 })
    }

    // Prepare training configuration
    const config = {
      epochs: trainingConfig?.epochs || 100,
      batchSize: trainingConfig?.batchSize || 8,
      learningRate: trainingConfig?.learningRate || 5e-5,
      mixedPrecision: trainingConfig?.mixedPrecision !== false,
      gpuOptimization: trainingConfig?.gpuOptimization || 'rtx5090',
      modelType: trainingConfig?.modelType || 'xtts_v2',
      ...trainingConfig
    }

    // Check if RTX 5090 training pipeline is available
    const pipelinePath = join(process.cwd(), 'ml', 'voice_training_pipeline.py')
    if (!existsSync(pipelinePath)) {
      return NextResponse.json({
        error: 'Training pipeline not available',
        message: 'RTX 5090 training system is not configured'
      }, { status: 503 })
    }

    // Execute training in background
    const trainingProcess = spawn('python3', [
      pipelinePath,
      '--action', 'train',
      '--user_id', actualUserId,
      '--epochs', config.epochs.toString(),
      '--batch_size', config.batchSize.toString(),
      '--learning_rate', config.learningRate.toString()
    ], {
      detached: true,
      stdio: 'pipe'
    })

    let trainingOutput = ''
    let trainingError = ''

    // Collect training output
    trainingProcess.stdout?.on('data', (data) => {
      trainingOutput += data.toString()
    })

    trainingProcess.stderr?.on('data', (data) => {
      trainingError += data.toString()
    })

    // Return immediately with training started status
    const trainingId = `training_${actualUserId}_${Date.now()}`
    
    // Set a timeout to check training completion
    setTimeout(async () => {
      try {
        // Check if model was created successfully
        const modelDir = join(process.cwd(), 'models', 'voices', actualUserId)
        const latestLink = join(modelDir, 'latest')
        
        if (existsSync(latestLink)) {
          console.log(`✅ Training completed successfully for user ${actualUserId}`)
          
          // Notify inference service to reload models
          try {
            await fetch('http://localhost:8000/voice/models/refresh', {
              method: 'POST'
            })
          } catch (e) {
            console.warn('Could not notify inference service:', e)
          }
        } else {
          console.log(`⚠️ Training may have failed for user ${actualUserId}`)
        }
      } catch (e) {
        console.error('Error checking training completion:', e)
      }
    }, 180000) // Check after 3 minutes

    return NextResponse.json({
      success: true,
      message: 'RTX 5090 voice training initiated',
      trainingId,
      estimatedTime: '2-3 minutes',
      config: {
        userId: actualUserId,
        epochs: config.epochs,
        batchSize: config.batchSize,
        gpuAcceleration: 'RTX 5090',
        modelType: config.modelType
      },
      status: 'training_started'
    })

  } catch (error: any) {
    console.error('Voice training error:', error)
    return NextResponse.json(
      { 
        error: 'Training failed to start',
        message: 'Unable to initiate RTX 5090 voice training. Please try again.',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.email.replace(/[^a-zA-Z0-9]/g, '_')

    // Check training status by looking for model files
    const modelDir = join(process.cwd(), 'models', 'voices', userId)
    const latestLink = join(modelDir, 'latest')
    
    let status = 'not_started'
    let modelInfo = null

    if (existsSync(latestLink)) {
      try {
        const metadataPath = join(latestLink, 'metadata.json')
        if (existsSync(metadataPath)) {
          const fs = await import('fs/promises')
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
          
          status = 'completed'
          modelInfo = {
            version: metadata.model_version,
            createdAt: metadata.created_at,
            finalLoss: metadata.final_loss,
            epochs: metadata.epochs,
            gpuUsed: metadata.gpu_used
          }
        }
      } catch (e) {
        console.warn('Error reading model metadata:', e)
        status = 'completed' // Model exists but metadata unreadable
      }
    } else {
      // Check if training is in progress (this is a simplified check)
      const voiceDir = join(process.cwd(), 'public', 'voices', userId)
      if (existsSync(voiceDir)) {
        status = 'ready_for_training'
      }
    }

    return NextResponse.json({
      userId,
      status,
      modelInfo,
      hasVoiceData: existsSync(join(process.cwd(), 'public', 'voices', userId)),
      hasTrainedModel: existsSync(latestLink)
    })

  } catch (error) {
    console.error('Training status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check training status' },
      { status: 500 }
    )
  }
}