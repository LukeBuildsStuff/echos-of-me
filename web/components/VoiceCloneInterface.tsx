'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface VoiceCloneInterfaceProps {
  onBack: () => void
}

const STORY_PASSAGE = `It was the best of times, it was the worst of times. In our family, we learned that love isn't just about the happy moments—it's about standing together through everything life brings. When I think about the wisdom I want to pass down, I remember that every challenge we faced only made our bond stronger.

These are the stories that matter, the ones that show who we really are. The laughter around our dinner table, the quiet conversations late at night, and the way we celebrated each other's victories. Love means being present, really present, for the people who matter most.

I want you to remember that kindness is never wasted, that courage comes in many forms, and that family—whether by blood or by choice—is the greatest treasure we have. When life gets difficult, and it will, remember these words and know that you are loved beyond measure.`

type RecordingState = 'idle' | 'recording' | 'stopped' | 'processing' | 'completed'

export default function VoiceCloneInterface({ onBack }: VoiceCloneInterfaceProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [voiceProfile, setVoiceProfile] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        
        // Stop all tracks to free up the microphone
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecordingState('recording')
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Unable to access microphone. Please check your permissions.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      setRecordingState('stopped')
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [recordingState])

  const playRecording = useCallback(() => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob)
      audioRef.current = new Audio(audioUrl)
      
      audioRef.current.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [audioBlob, isPlaying])

  const stopPlayback = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [isPlaying])

  const processVoice = useCallback(async () => {
    if (!audioBlob) return
    
    setRecordingState('processing')
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice_recording.webm')
      
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to process voice')
      }
      
      const result = await response.json()
      setVoiceProfile(result.voiceId)
      setRecordingState('completed')
      
    } catch (error) {
      console.error('Error processing voice:', error)
      alert('Failed to process voice recording. Please try again.')
      setRecordingState('stopped')
    }
  }, [audioBlob])

  const retryRecording = useCallback(() => {
    setRecordingState('idle')
    setAudioBlob(null)
    setRecordingTime(0)
    setVoiceProfile(null)
    
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-heaven-gradient py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 animate-float">
              <span className="text-3xl">🎤</span>
            </div>
            <CardTitle className="text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
              Clone Your Voice
            </CardTitle>
            <p className="text-peace-600 font-supportive mt-2">
              Read the passage below to create your personal voice clone. This will allow your AI echo to speak in your actual voice.
            </p>
          </CardHeader>
        </Card>

        {/* Story Passage */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-gentle text-peace-800">
              Story Passage to Read
            </CardTitle>
            <p className="text-sm text-peace-600 font-supportive">
              Please read this passage clearly and naturally. Take your time and speak as you would when sharing wisdom with loved ones.
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-peace-50 p-6 rounded-embrace border-2 border-hope-200">
              <p className="text-peace-800 font-compassionate leading-relaxed text-lg whitespace-pre-line">
                {STORY_PASSAGE}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recording Interface */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-gentle text-peace-800">
              Voice Recording
            </CardTitle>
            {recordingState === 'recording' && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-600 font-supportive">Recording: {formatTime(recordingTime)}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recording Controls */}
            <div className="flex gap-4 justify-center">
              {recordingState === 'idle' && (
                <Button
                  onClick={startRecording}
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-8"
                >
                  Start Recording
                </Button>
              )}
              
              {recordingState === 'recording' && (
                <Button
                  onClick={stopRecording}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-embrace px-8"
                >
                  Stop Recording
                </Button>
              )}
              
              {recordingState === 'stopped' && (
                <div className="flex gap-4">
                  <Button
                    onClick={playRecording}
                    disabled={isPlaying}
                    variant="outline"
                    className="border-2 border-hope-400 text-hope-700 hover:bg-hope-50 rounded-embrace"
                  >
                    {isPlaying ? 'Playing...' : 'Play Recording'}
                  </Button>
                  <Button
                    onClick={processVoice}
                    className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace"
                  >
                    Process Voice
                  </Button>
                  <Button
                    onClick={retryRecording}
                    variant="outline"
                    className="border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace"
                  >
                    Try Again
                  </Button>
                </div>
              )}
              
              {isPlaying && (
                <Button
                  onClick={stopPlayback}
                  variant="outline"
                  className="border-2 border-red-400 text-red-700 hover:bg-red-50 rounded-embrace"
                >
                  Stop Playback
                </Button>
              )}
            </div>

            {/* Status Messages */}
            {recordingState === 'processing' && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-hope-100 px-4 py-2 rounded-embrace">
                  <div className="w-4 h-4 border-2 border-hope-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-hope-700 font-supportive">Processing your voice...</span>
                </div>
              </div>
            )}

            {recordingState === 'completed' && voiceProfile && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-embrace">
                  <span className="text-green-700 font-supportive">✅ Voice cloned successfully!</span>
                </div>
                <Badge variant="outline" className="bg-hope-50 border-hope-200 text-hope-700">
                  Voice ID: {voiceProfile}
                </Badge>
                <p className="text-peace-600 font-supportive">
                  Your voice has been cloned! You can now use it in the AI Echo chat.
                </p>
              </div>
            )}

            {/* Recording Tips */}
            {recordingState === 'idle' && (
              <div className="bg-hope-50 p-4 rounded-embrace border border-hope-200">
                <h4 className="font-gentle text-hope-800 mb-2">Recording Tips:</h4>
                <ul className="text-sm text-hope-700 font-supportive space-y-1">
                  <li>• Find a quiet environment with minimal background noise</li>
                  <li>• Speak clearly and naturally, as if talking to family</li>
                  <li>• Read at a comfortable pace, don't rush</li>
                  <li>• The recording should be at least 2-3 minutes long</li>
                  <li>• Express emotion and warmth in your voice</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button
            onClick={onBack}
            variant="outline"
            className="border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}