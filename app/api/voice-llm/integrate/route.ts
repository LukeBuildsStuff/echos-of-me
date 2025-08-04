import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { voiceLLMIntegrator } from '@/lib/voice-llm-integration'

/**
 * Voice-LLM Integration API
 * Triggers the integration of user's voice clone with LLM training
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { voiceId } = body

    // Use latest voice if not specified
    const finalVoiceId = voiceId || 'latest'
    const userId = session.user.email

    console.log(`Starting voice-LLM integration for user: ${userId}, voiceId: ${finalVoiceId}`)

    // Start integration process
    const result = await voiceLLMIntegrator.integrateVoiceWithLLM(userId, finalVoiceId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        trainingJobId: result.trainingJobId,
        estimatedCompletion: result.estimatedCompletion,
        status: 'training_started',
        integration: {
          voiceId: finalVoiceId,
          userId: userId,
          trainingMethod: 'rtx5090_optimized',
          features: [
            'voice_clone_integration',
            'emotional_alignment',
            'personality_consistency',
            'conversational_speech_patterns'
          ]
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
        suggestion: 'Please ensure you have completed voice cloning and answered sufficient questions.'
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Voice-LLM integration API error:', error)
    return NextResponse.json(
      { 
        error: 'Integration failed',
        message: 'Unable to start voice-LLM integration. Please try again.',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get integration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.email
    const status = await voiceLLMIntegrator.getIntegrationStatus(userId)

    return NextResponse.json({
      success: true,
      status: status.integrationStatus,
      message: status.message,
      details: {
        hasVoiceProfile: status.hasVoiceProfile,
        voiceComplete: status.voiceComplete,
        hasTextData: status.hasTextData,
        textDataSufficient: status.textDataSufficient,
        trainingJobId: status.trainingJobId,
        canStartIntegration: status.integrationStatus === 'ready'
      },
      recommendations: {
        voiceCloning: !status.voiceComplete ? 'Complete voice cloning by recording all passages' : null,
        textData: !status.textDataSufficient ? 'Answer more questions to provide training data' : null,
        integration: status.integrationStatus === 'ready' ? 'Ready to start voice-integrated AI training' : null
      }
    })

  } catch (error: any) {
    console.error('Integration status check error:', error)
    return NextResponse.json(
      { 
        error: 'Status check failed',
        message: 'Unable to check integration status. Please try again.'
      },
      { status: 500 }
    )
  }
}