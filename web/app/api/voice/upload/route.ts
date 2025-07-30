import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { voiceLLMIntegrator } from '@/lib/voice-llm-integration'

export async function GET(request: NextRequest) {
  try {
    // Use the request context for session retrieval
    const session = await getServerSession(authOptions)
    console.log('Session status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email,
      email: session?.user?.email || 'no email'
    })
    
    if (!session?.user?.email) {
      console.log('Authorization failed - no valid session or email')
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasEmail: !!session?.user?.email
        }
      }, { status: 401 })
    }

    // Check if user has any voice files
    const userId = session.user.email.replace(/[^a-zA-Z0-9]/g, '_')
    const voiceDir = join(process.cwd(), 'public', 'voices', userId)
    
    console.log('Voice availability check for user:', session.user.email)
    console.log('Generated userId:', userId)
    console.log('Looking in directory:', voiceDir)
    console.log('Directory exists:', existsSync(voiceDir))
    
    let hasVoiceProfile = false
    
    if (existsSync(voiceDir)) {
      try {
        const files = await readdir(voiceDir)
        console.log('Files found:', files)
        hasVoiceProfile = files.some(file => file.startsWith('voice_') && 
          (file.endsWith('.webm') || file.endsWith('.wav') || file.endsWith('.mp3')))
        console.log('Has voice profile:', hasVoiceProfile)
      } catch (error) {
        console.log('Error reading voice directory:', error)
      }
    } else {
      console.log('Voice directory does not exist')
    }

    return NextResponse.json({
      hasVoiceProfile,
      userId,
      voiceDir: hasVoiceProfile ? `/voices/${userId}` : null
    })

  } catch (error) {
    console.error('Voice status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check voice status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const passageId = formData.get('passageId') as string
    const passageText = formData.get('passageText') as string
    const passageMetadata = formData.get('passageMetadata') as string
    const triggerTraining = formData.get('triggerTraining') as string
    const trainingConfig = formData.get('trainingConfig') as string
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Parse enhanced metadata
    let metadata = null
    try {
      if (passageMetadata) {
        metadata = JSON.parse(passageMetadata)
      }
    } catch (e) {
      console.warn('Failed to parse passage metadata:', e)
    }

    // Validate file type
    const validTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg']
    if (!validTypes.some(type => audioFile.type.includes(type.split('/')[1]))) {
      return NextResponse.json({ error: 'Invalid audio file type' }, { status: 400 })
    }

    // Create user-specific voice directory
    const userId = session.user.email.replace(/[^a-zA-Z0-9]/g, '_')
    const voiceDir = join(process.cwd(), 'public', 'voices', userId)
    
    if (!existsSync(voiceDir)) {
      await mkdir(voiceDir, { recursive: true })
    }

    // Save the audio file with passage information
    const timestamp = Date.now()
    const fileName = passageId ? `voice_${passageId}_${timestamp}.webm` : `voice_${timestamp}.webm`
    const filePath = join(voiceDir, fileName)
    
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)

    // Save enhanced passage metadata
    if (passageId && passageText) {
      const metadataPath = join(voiceDir, `${passageId}_metadata.json`)
      const enhancedMetadata = {
        passageId,
        passageText,
        audioFile: fileName,
        timestamp,
        duration: metadata?.duration || audioFile.size,
        quality: metadata?.quality || null,
        phoneticFocus: metadata?.phoneticFocus || null,
        requirements: {
          minDuration: metadata?.minDuration || 30,
          optimalDuration: metadata?.optimalDuration || 45,
          meetsTrainingRequirements: metadata?.meetsTrainingRequirements || false
        },
        processingStatus: 'pending',
        processed: false
      }
      await writeFile(metadataPath, JSON.stringify(enhancedMetadata, null, 2))
    }

    // Generate voice ID
    const voiceId = passageId ? `voice_${userId}_${passageId}` : `voice_${userId}_${timestamp}`

    // Check if this completes a full voice clone (all passages recorded)
    const expectedPassages = ['conversational-warmth', 'emotional-expression', 'wisdom-legacy', 'technical-clarity']
    const completedPassages = []
    
    for (const passage of expectedPassages) {
      const metadataPath = join(voiceDir, `${passage}_metadata.json`)
      if (existsSync(metadataPath)) {
        completedPassages.push(passage)
      }
    }

    const isComplete = completedPassages.length === expectedPassages.length
    const voiceCloneId = isComplete ? `voice_${userId}_complete_${timestamp}` : voiceId
    const shouldTriggerTraining = triggerTraining === 'true' && isComplete

    // Prepare enhanced ML processing payload
    const mlPayload = {
      voiceId: voiceCloneId,
      audioPath: filePath,
      userId,
      passageId,
      passageText,
      isComplete,
      completedPassages,
      totalPassages: expectedPassages.length,
      metadata: metadata || {},
      triggerTraining: shouldTriggerTraining,
      trainingConfig: trainingConfig ? JSON.parse(trainingConfig) : null
    }

    // Call ML service to process voice
    try {
      const mlResponse = await fetch('http://ml-inference:8000/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload),
        signal: AbortSignal.timeout(shouldTriggerTraining ? 180000 : 45000) // 3 min for training, 45s for processing
      })

      if (mlResponse.ok) {
        const result = await mlResponse.json()
        
        // Create symlink for 'latest' voice if this is a complete clone
        if (isComplete) {
          const latestPath = join(voiceDir, 'latest')
          try {
            if (existsSync(latestPath)) {
              // Remove existing symlink
              await import('fs').then(fs => fs.promises.unlink(latestPath))
            }
            // Create new symlink (or copy if symlink fails)
            await import('fs').then(fs => fs.promises.symlink(fileName, latestPath))
          } catch (symlinkError) {
            console.log('Symlink creation failed, copying file instead:', symlinkError)
            // Fallback to copying
            await import('fs').then(fs => fs.promises.copyFile(filePath, latestPath))
          }

          // Check if user is ready for voice-LLM integration
          try {
            const integrationStatus = await voiceLLMIntegrator.getIntegrationStatus(userId)
            if (integrationStatus.integrationStatus === 'ready') {
              console.log(`Voice clone completed for ${userId}, integration is ready but not auto-triggered`)
              // Note: We don't auto-trigger integration here to let user control when training starts
            }
          } catch (integrationError) {
            console.log('Error checking integration status:', integrationError)
            // Don't fail the voice upload if integration check fails
          }
        }
        
        return NextResponse.json({
          success: true,
          voiceId: voiceCloneId,
          message: isComplete ? 'Complete voice clone created successfully' : 'Passage processed successfully',
          details: result,
          progress: {
            completed: completedPassages.length,
            total: expectedPassages.length,
            isComplete
          }
        })
      } else {
        // Fallback: still save the file but indicate processing failed
        console.log('ML voice processing unavailable, file saved for later processing')
        return NextResponse.json({
          success: true,
          voiceId: voiceCloneId,
          message: isComplete ? 'Voice clone saved, processing queued' : 'Passage saved, processing queued',
          processingStatus: 'queued',
          progress: {
            completed: completedPassages.length,
            total: expectedPassages.length,
            isComplete
          }
        })
      }
    } catch (mlError) {
      console.log('ML service unavailable:', mlError)
      // Graceful fallback with encouraging message
      return NextResponse.json({
        success: true,
        voiceId: voiceCloneId,
        message: isComplete 
          ? 'Voice clone saved successfully. Processing will complete in the background.' 
          : 'Passage saved successfully. Continue with the next passage.',
        processingStatus: 'queued',
        progress: {
          completed: completedPassages.length,
          total: expectedPassages.length,
          isComplete
        },
        fallback: true
      })
    }

  } catch (error: any) {
    console.error('Voice upload error:', error)
    
    // Provide compassionate error messages
    let errorMessage = 'We encountered an issue saving your voice recording.'
    if (error?.code === 'ENOSPC') {
      errorMessage = 'Not enough storage space available. Please try again later.'
    } else if (error?.code === 'EACCES') {
      errorMessage = 'Permission issue encountered. Please try again.'
    } else if (error?.message?.includes('timeout')) {
      errorMessage = 'The upload took longer than expected. Your recording may have been saved - please check and try again if needed.'
    }
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        message: errorMessage,
        suggestion: 'Please ensure you have a stable internet connection and try recording again.'
      },
      { status: 500 }
    )
  }
}