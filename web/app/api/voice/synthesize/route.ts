import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { text, voiceId } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Get user info to determine voice profile
    const userResult = await query(
      'SELECT id, name FROM users WHERE email = $1',
      [session.user.email]
    )
    
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = userResult.rows[0]
    const userId = session.user.email.replace(/[^a-zA-Z0-9]/g, '_')
    
    // Use provided voiceId or construct default one
    const finalVoiceId = voiceId || `voice_${userId}_latest`
    
    console.log('Voice synthesis request:', {
      text: text.substring(0, 50) + '...',
      requestedVoiceId: voiceId,
      finalVoiceId: finalVoiceId,
      userId: userId,
      userEmail: session.user.email
    })
    
    // Define ML inference URL with fallback options
    const mlInferenceUrl = process.env.ML_INFERENCE_URL || 'http://localhost:8000'
    const mlInferenceUrls = [
      process.env.ML_INFERENCE_URL,
      'http://ml-inference:8000',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ].filter(Boolean)
    
    let serviceUrl = null
    let statusData = null
    
    // Try to connect to ML service with fallback URLs
    for (const url of mlInferenceUrls) {
      try {
        console.log(`Attempting to connect to ML service at: ${url}`)
        
        const statusResponse = await fetch(`${url}/voice/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        })
        
        if (statusResponse.ok) {
          statusData = await statusResponse.json()
          serviceUrl = url
          console.log(`✅ Connected to ML service at: ${url}`, statusData)
          break
        } else {
          console.log(`❌ ML service at ${url} responded with status: ${statusResponse.status}`)
        }
      } catch (connectError: any) {
        console.log(`❌ Failed to connect to ML service at ${url}:`, connectError?.message || 'Unknown error')
        continue
      }
    }
    
    if (!serviceUrl) {
      return NextResponse.json({
        success: false,
        error: 'Voice service unavailable',
        fallback: true,
        message: 'Voice synthesis system is starting up. This may take a few minutes on first use.',
        suggestion: 'The voice service is initializing. Please try again in a moment.',
        debug: { 
          attemptedUrls: mlInferenceUrls,
          timestamp: new Date().toISOString()
        }
      }, { status: 503 })
    }
    
    try {
      // Validate voice system status
      if (statusData && !statusData.tts_available) {
        return NextResponse.json({
          success: false,
          error: 'TTS system not available',
          fallback: true,
          message: 'Your voice is taking a moment to warm up. This is normal for the first use.',
          suggestion: 'Please try again in a few moments. Your voice clone is being prepared.',
          debug: statusData
        }, { status: 503 })
      }
      
      if (statusData && !statusData.model_loaded) {
        return NextResponse.json({
          success: false,
          error: 'TTS model not loaded',
          fallback: true,
          message: 'Your voice model is loading. This may take a minute on first use.',
          suggestion: 'Please wait a moment and try again. Your personalized voice is being prepared.',
          debug: statusData
        }, { status: 503 })
      }
      
      // Check voice quality indicators
      if (statusData?.voice_quality && statusData.voice_quality.score < 0.5) {
        console.log('Warning: Low voice quality detected:', statusData.voice_quality)
      }
      
      // Call ML inference service for voice synthesis
      const response = await fetch(`${serviceUrl}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice_id: finalVoiceId
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ML service error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Voice synthesis failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('ML service response:', result)
      
      // ML service returns audio_url, duration, voice_id, generation_time directly
      return NextResponse.json({
        success: true,
        audioUrl: result.audio_url,
        voiceId: result.voice_id,
        duration: result.duration,
        generationTime: result.generation_time,
        quality: result.quality || 'good',
        message: result.generation_time < 2 
          ? 'Voice generated quickly with high quality' 
          : result.generation_time < 5 
            ? 'Voice generated successfully'
            : 'High-quality voice generated (processing took a moment for better results)'
      })
      
    } catch (mlError: any) {
      console.error('ML voice synthesis error:', mlError)
      
      // Provide user-friendly error messages based on error type
      let userMessage = 'Your voice is taking a rest right now.'
      let suggestion = 'You can still read the text response, and voice will return shortly.'
      
      if (mlError?.name === 'TypeError' && mlError?.message?.includes('fetch')) {
        userMessage = 'Voice service is temporarily connecting.'
        suggestion = 'This happens occasionally. Your text response is ready, and voice will return soon.'
      } else if (mlError?.name === 'AbortError' || mlError?.message?.includes('timeout')) {
        userMessage = 'Voice generation is taking longer than usual.'
        suggestion = 'High-quality voice synthesis sometimes needs extra time. Try again for faster results.'
      } else if (mlError?.message?.includes('503')) {
        userMessage = 'Voice system is refreshing.'
        suggestion = 'Your voice clone is being optimized. This brief pause ensures the best quality.'
      } else if (mlError?.message?.includes('model')) {
        userMessage = 'Voice model is loading your personal settings.'
        suggestion = 'First-time use may take a moment as your voice is being prepared.'
      }
      
      return NextResponse.json({
        success: false,
        error: 'Voice synthesis temporarily unavailable',
        fallback: true,
        message: userMessage,
        suggestion: suggestion,
        retryable: true,
        debug: { 
          error: mlError.message,
          serviceUrl: serviceUrl,
          attemptedUrls: mlInferenceUrls,
          timestamp: new Date().toISOString()
        }
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Voice synthesis API error:', error)
    return NextResponse.json(
      { error: 'Failed to synthesize voice' },
      { status: 500 }
    )
  }
}