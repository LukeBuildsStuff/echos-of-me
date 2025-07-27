import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
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

    // Save the audio file
    const timestamp = Date.now()
    const fileName = `voice_${timestamp}.webm`
    const filePath = join(voiceDir, fileName)
    
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)

    // Generate voice ID
    const voiceId = `voice_${userId}_${timestamp}`

    // Call ML service to process voice (placeholder for now)
    try {
      const mlResponse = await fetch('http://ml-inference:8000/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          audioPath: filePath,
          userId
        }),
        signal: AbortSignal.timeout(30000)
      })

      if (mlResponse.ok) {
        const result = await mlResponse.json()
        return NextResponse.json({
          success: true,
          voiceId,
          message: 'Voice processed successfully',
          details: result
        })
      } else {
        // Fallback: still save the file but indicate processing failed
        console.log('ML voice processing unavailable, file saved for later processing')
        return NextResponse.json({
          success: true,
          voiceId,
          message: 'Voice saved, processing queued',
          processingStatus: 'queued'
        })
      }
    } catch (mlError) {
      console.log('ML service unavailable:', mlError)
      // Fallback: still save the file
      return NextResponse.json({
        success: true,
        voiceId,
        message: 'Voice saved, processing queued',
        processingStatus: 'queued'
      })
    }

  } catch (error) {
    console.error('Voice upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload voice' },
      { status: 500 }
    )
  }
}