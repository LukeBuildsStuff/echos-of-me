import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.email.replace(/[^a-zA-Z0-9]/g, '_')
    
    // Define ML inference URL with fallback options
    const mlInferenceUrls = [
      process.env.ML_INFERENCE_URL,
      'http://ml-inference:8000',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ].filter(Boolean)
    
    const healthResults = []
    
    // Test all possible ML service URLs
    for (const url of mlInferenceUrls) {
      try {
        const startTime = Date.now()
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000)
        })
        
        const responseTime = Date.now() - startTime
        
        if (response.ok) {
          const data = await response.json()
          healthResults.push({
            url,
            status: 'healthy',
            responseTime,
            data
          })
        } else {
          healthResults.push({
            url,
            status: 'unhealthy',
            responseTime,
            httpStatus: response.status
          })
        }
      } catch (error: any) {
        healthResults.push({
          url,
          status: 'unreachable',
          error: error?.message || 'Unknown error'
        })
      }
    }
    
    // Also check voice-specific endpoints
    const workingService = healthResults.find(r => r.status === 'healthy')
    let voiceStatus = null
    
    if (workingService) {
      try {
        const voiceResponse = await fetch(`${workingService.url}/voice/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000)
        })
        
        if (voiceResponse.ok) {
          voiceStatus = await voiceResponse.json()
        }
      } catch (error: any) {
        voiceStatus = { error: error?.message || 'Unknown error' }
      }
    }
    
    return NextResponse.json({
      userId,
      mlServices: healthResults,
      voiceSystem: voiceStatus,
      recommendation: workingService 
        ? `Use ${workingService.url} for ML services` 
        : 'No ML services are currently available',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Voice health check error:', error)
    return NextResponse.json(
      { error: 'Health check failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}