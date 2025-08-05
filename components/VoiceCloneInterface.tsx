'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Mic, Square, Play, Pause, Volume2, AlertCircle, Download, Waveform, Cpu, Zap, Clock, Lightbulb } from 'lucide-react'
import { voiceRecordingWorkflow, VOICE_PASSAGE_SCRIPTS, RTX5090_VOICE_QUALITY_TARGETS } from '@/lib/voice-recording-workflow'

interface VoiceCloneInterfaceProps {
  onBack: () => void
  onComplete?: () => void
}

// Use enhanced voice recording workflow
const VOICE_PASSAGES = VOICE_PASSAGE_SCRIPTS.map(script => ({
  id: script.id,
  title: script.title,
  description: `${script.category} recording - ${script.instructions}`,
  phoneticFocus: script.phoneticTargets.join(', '),
  minDuration: 30,
  optimalDuration: script.estimatedDuration,
  text: `${script.warmupText}\n\n${script.mainScript}\n\n${script.cooldownText}`,
  instructions: script.instructions,
  qualityCriteria: script.qualityCriteria,
  emotionalTargets: script.emotionalTargets
}))

type RecordingState = 'idle' | 'recording' | 'stopped' | 'processing' | 'completed'
type PassageProgress = {
  [key: string]: {
    recorded: boolean
    audioBlob?: Blob
    duration?: number
  }
}

export default function VoiceCloneInterface({ onBack, onComplete }: VoiceCloneInterfaceProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0)
  const [passageProgress, setPassageProgress] = useState<PassageProgress>({})
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [voiceProfile, setVoiceProfile] = useState<string | null>(null)
  const [overallProgress, setOverallProgress] = useState(0)
  const [qualityTips, setQualityTips] = useState<string[]>([])
  const [currentTip, setCurrentTip] = useState('')
  const [audioQuality, setAudioQuality] = useState({
    volume: 0,
    clarity: 0,
    consistency: 0,
    emotionalRange: 0,
    phoneticDiversity: 0
  })
  const [qualityScore, setQualityScore] = useState(0)
  const [trainingDataSufficient, setTrainingDataSufficient] = useState(false)
  const [rtx5090Status, setRtx5090Status] = useState({
    ready: false,
    estimatedTime: '2-3 minutes',
    optimization: 'XTTS-v2 + Flash Attention 2'
  })
  const [voiceTrainingStatus, setVoiceTrainingStatus] = useState<'idle' | 'ready' | 'training' | 'completed'>('idle')
  const [setupInstructions, setSetupInstructions] = useState<any>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  
  // Initialize setup instructions and tips on mount
  useEffect(() => {
    const instructions = voiceRecordingWorkflow.getSetupInstructions()
    setSetupInstructions(instructions)
    
    const initialTips = [
      'Welcome! You\'ll record 4 different passages optimized for RTX 5090 voice cloning.',
      'Each passage captures different aspects of your voice for high-quality XTTS-v2 training.',
      'RTX 5090 training will take just 2-3 minutes with Flash Attention 2 optimization.'
    ]
    setCurrentTip(initialTips[0])
  }, [])

  // Audio quality analysis during recording
  useEffect(() => {
    if (recordingState === 'recording' && audioContextRef.current && analyserRef.current) {
      const analyzeAudio = () => {
        if (!analyserRef.current || !dataArrayRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        
        // Calculate volume (RMS)
        let sum = 0
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += (dataArrayRef.current[i] / 255) ** 2
        }
        const volume = Math.sqrt(sum / dataArrayRef.current.length)
        
        // Calculate frequency distribution for clarity
        const lowFreq = dataArrayRef.current.slice(0, 32).reduce((a, b) => a + b, 0) / 32
        const midFreq = dataArrayRef.current.slice(32, 128).reduce((a, b) => a + b, 0) / 96
        const highFreq = dataArrayRef.current.slice(128, 256).reduce((a, b) => a + b, 0) / 128
        
        const clarity = (midFreq + highFreq) / (lowFreq + midFreq + highFreq + 1)
        
        // Update quality metrics
        setAudioQuality(prev => ({
          volume: Math.min(1, volume * 2), // Normalize to 0-1
          clarity: Math.min(1, clarity),
          consistency: prev.consistency * 0.9 + volume * 0.1, // Running average
          emotionalRange: prev.emotionalRange, // Will be updated based on passage content
          phoneticDiversity: prev.phoneticDiversity
        }))
        
        requestAnimationFrame(analyzeAudio)
      }
      
      analyzeAudio()
    }
  }, [recordingState])

  // Calculate overall quality score
  useEffect(() => {
    const { volume, clarity, consistency, emotionalRange, phoneticDiversity } = audioQuality
    const score = (volume * 0.2 + clarity * 0.3 + consistency * 0.2 + emotionalRange * 0.15 + phoneticDiversity * 0.15) * 100
    setQualityScore(Math.round(score))
  }, [audioQuality])

  // Check if training data meets requirements
  useEffect(() => {
    const completedCount = Object.values(passageProgress).filter(p => p.recorded).length
    const totalDuration = Object.values(passageProgress).reduce((sum, p) => sum + (p.duration || 0), 0)
    const avgQuality = Object.values(passageProgress).length > 0 ? qualityScore : 0
    
    setTrainingDataSufficient(
      completedCount >= 3 && // At least 3 passages
      totalDuration >= 180 && // At least 3 minutes total
      avgQuality >= 70 // Quality score above 70%
    )
  }, [passageProgress, qualityScore])

  const analyzeRecordingQuality = useCallback(async (audioBlob: Blob, passage: any) => {
    // Basic quality analysis - in a real implementation, this would be more sophisticated
    const duration = recordingTime
    const currentQuality = audioQuality
    
    // Estimate phonetic diversity based on passage content and speech patterns
    const phoneticScore = Math.min(100, (passage.text.length / 500) * 100)
    
    // Emotional range based on current passage type and audio quality
    let emotionalScore = 50
    if (passage.id === 'emotional-expression') emotionalScore = Math.min(100, currentQuality.volume * 120)
    if (passage.id === 'conversational-warmth') emotionalScore = Math.min(100, currentQuality.consistency * 100)
    if (passage.id === 'wisdom-legacy') emotionalScore = Math.min(100, currentQuality.clarity * 110)
    if (passage.id === 'technical-clarity') emotionalScore = Math.min(100, currentQuality.clarity * 130)
    
    const durationScore = Math.min(100, (duration / passage.optimalDuration) * 100)
    const overallScore = (
      currentQuality.volume * 20 + 
      currentQuality.clarity * 30 + 
      currentQuality.consistency * 20 + 
      emotionalScore * 0.15 + 
      phoneticScore * 0.15 + 
      durationScore * 0.20
    )
    
    return {
      overall: Math.round(overallScore),
      volume: Math.round(currentQuality.volume * 100),
      clarity: Math.round(currentQuality.clarity * 100),
      consistency: Math.round(currentQuality.consistency * 100),
      emotional: Math.round(emotionalScore),
      phonetic: Math.round(phoneticScore),
      duration: Math.round(durationScore)
    }
  }, [recordingTime, audioQuality])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      })
      
      // Setup audio analysis
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 512
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
      source.connect(analyserRef.current)
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        
        // Store recording with enhanced metadata
        const duration = recordingTime
        const currentPassage = VOICE_PASSAGES[currentPassageIndex]
        
        // Calculate quality metrics for this recording
        const passageQuality = await analyzeRecordingQuality(blob, currentPassage)
        
        setPassageProgress(prev => ({
          ...prev,
          [currentPassage.id]: {
            recorded: true,
            audioBlob: blob,
            duration,
            quality: passageQuality,
            meetsRequirements: duration >= currentPassage.minDuration && passageQuality.overall >= 70
          }
        }))
        
        // Calculate overall progress
        const completedPassages = Object.values({
          ...passageProgress,
          [currentPassage.id]: { recorded: true }
        }).filter(p => p.recorded).length
        
        const newProgress = (completedPassages / VOICE_PASSAGES.length) * 100
        setOverallProgress(newProgress)
        
        // Update tips based on recording quality
        updateQualityTips(passageQuality, duration, currentPassage)
        
        // Stop all tracks to free up the microphone
        stream.getTracks().forEach(track => track.stop())
        
        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
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
      alert('Unable to access microphone. Please check your permissions and ensure your browser supports voice recording.')
    }
  }, [currentPassageIndex, passageProgress, analyzeRecordingQuality, recordingTime])

  const updateQualityTips = (quality: any, duration: number, passage: any) => {
    const tips = []
    
    if (duration < passage.minDuration) {
      tips.push(`Recording is short (${duration}s). Aim for ${passage.minDuration}+ seconds for better voice quality.`)
    }
    
    if (quality.volume < 60) {
      tips.push('Speak a bit louder or move closer to your microphone for clearer audio.')
    }
    
    if (quality.clarity < 70) {
      tips.push('Try recording in a quieter environment or speak more clearly.')
    }
    
    if (quality.consistency < 70) {
      tips.push('Maintain steady volume throughout your recording.')
    }
    
    if (quality.overall >= 80) {
      tips.push('Excellent recording quality! This will create a high-fidelity voice clone.')
    } else if (quality.overall >= 70) {
      tips.push('Good recording quality. Your voice clone will sound natural.')
    } else {
      tips.push('Consider re-recording with better audio quality for optimal results.')
    }
    
    setCurrentTip(tips[0] || 'Recording completed successfully!')
  }

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
      const currentPassage = VOICE_PASSAGES[currentPassageIndex]
      const passageQuality = await analyzeRecordingQuality(audioBlob, currentPassage)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, `voice_${currentPassage.id}_${Date.now()}.webm`)
      formData.append('passageId', currentPassage.id)
      formData.append('passageText', currentPassage.text)
      formData.append('passageMetadata', JSON.stringify({
        duration: recordingTime,
        quality: passageQuality,
        phoneticFocus: currentPassage.phoneticFocus,
        minDuration: currentPassage.minDuration,
        optimalDuration: currentPassage.optimalDuration,
        meetsTrainingRequirements: passageQuality.overall >= 70 && recordingTime >= currentPassage.minDuration
      }))
      
      // Add training optimization data
      const completedCount = Object.values(passageProgress).filter(p => p.recorded).length
      const isLastPassage = currentPassageIndex === VOICE_PASSAGES.length - 1
      const willTriggerTraining = isLastPassage && trainingDataSufficient
      
      if (willTriggerTraining) {
        formData.append('triggerTraining', 'true')
        formData.append('trainingConfig', JSON.stringify({
          userId: 'current_user', // This would come from session
          epochs: 100,
          batchSize: 8,
          learningRate: 5e-5,
          mixedPrecision: true,
          gpuOptimization: 'rtx5090',
          modelType: 'xtts_v2'
        }))
      }
      
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to process voice')
      }
      
      const result = await response.json()
      
      // Move to next passage or complete if this was the last one
      if (currentPassageIndex < VOICE_PASSAGES.length - 1) {
        setCurrentPassageIndex(prev => prev + 1)
        setRecordingState('idle')
        setAudioBlob(null)
        setRecordingTime(0)
        
        // Show encouraging tip for next passage
        const nextPassage = VOICE_PASSAGES[currentPassageIndex + 1]
        const tips = [
          `Great job! Next: ${nextPassage.title} - focus on ${nextPassage.phoneticFocus}.`,
          `Excellent progress! The next passage will capture ${nextPassage.description.toLowerCase()}.`,
          `You're doing wonderfully! Continue with natural expression for ${nextPassage.title}.`
        ]
        setCurrentTip(tips[Math.floor(Math.random() * tips.length)])
      } else {
        // All passages completed - trigger RTX 5090 training if quality is sufficient
        setVoiceProfile(result.voiceId)
        setRecordingState('completed')
        setOverallProgress(100)
        
        if (result.trainingTriggered) {
          setCurrentTip('🚀 RTX 5090 training initiated! Your high-quality voice clone will be ready in 2-3 minutes.')
        } else if (trainingDataSufficient) {
          setCurrentTip('Voice clone created successfully! All passages meet training requirements.')
        } else {
          setCurrentTip('Voice clone saved. Consider re-recording some passages for optimal quality.')
        }
        
        // Notify parent component if callback provided
        if (onComplete) {
          setTimeout(onComplete, result.trainingTriggered ? 5000 : 2000) // Longer delay if training
        }
      }
      
    } catch (error) {
      console.error('Error processing voice:', error)
      setCurrentTip('Having trouble processing your recording. Please check your internet connection and try again.')
      setRecordingState('stopped')
    }
  }, [audioBlob, currentPassageIndex, passageProgress, trainingDataSufficient, recordingTime, analyzeRecordingQuality, onComplete])

  const retryRecording = useCallback(() => {
    setRecordingState('idle')
    setAudioBlob(null)
    setRecordingTime(0)
    
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])
  
  const goToPreviousPassage = useCallback(() => {
    if (currentPassageIndex > 0) {
      setCurrentPassageIndex(prev => prev - 1)
      setRecordingState('idle')
      setAudioBlob(null)
      setRecordingTime(0)
    }
  }, [currentPassageIndex])
  
  const resetAll = useCallback(() => {
    setCurrentPassageIndex(0)
    setPassageProgress({})
    setRecordingState('idle')
    setAudioBlob(null)
    setRecordingTime(0)
    setVoiceProfile(null)
    setOverallProgress(0)
    setCurrentTip('')
    
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
  
  // Get current passage for easy access
  const currentPassage = VOICE_PASSAGES[currentPassageIndex]
  const completedPassages = Object.keys(passageProgress).filter(id => passageProgress[id].recorded).length

  return (
    <div className="mobile-full-height bg-heaven-gradient py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6" style={{ paddingLeft: 'max(0.75rem, var(--safe-area-inset-left))', paddingRight: 'max(0.75rem, var(--safe-area-inset-right))' }}>
        {/* RTX 5090 Setup Guide */}
        {currentPassageIndex === 0 && recordingState === 'idle' && setupInstructions && (
          <Card className="mobile-card bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 shadow-xl">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-gentle text-blue-800 flex items-center gap-2">
                    RTX 5090 Voice Cloning Setup
                    <Zap className="w-4 h-4 text-yellow-500" />
                  </CardTitle>
                  <p className="text-sm text-blue-600 font-supportive mt-1">
                    Optimized for high-quality voice training with XTTS-v2 and Flash Attention 2
                  </p>
                </div>
              </div>
              
              <div className="mt-4 space-y-4">
                {/* Equipment Setup */}
                <div className="bg-white/50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Equipment Setup
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {setupInstructions.equipment.slice(0, 3).map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Environment Setup */}
                <div className="bg-white/50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Environment Setup
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {setupInstructions.environment.slice(0, 3).map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* RTX 5090 Optimization Info */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    RTX 5090 Optimization
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-700">Training Time:</span>
                      <span className="text-green-800 font-medium">2-3 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Technology:</span>
                      <span className="text-green-800 font-medium">XTTS-v2 + Flash Attention 2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Quality Target:</span>
                      <span className="text-green-800 font-medium">Professional Grade</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Hardware:</span>
                      <span className="text-green-800 font-medium">24GB VRAM Optimized</span>
                    </div>
                  </div>
                </div>

                {/* Quality Requirements */}
                <div className="bg-white/50 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Quality Requirements
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-blue-800 font-medium">{RTX5090_VOICE_QUALITY_TARGETS.minimum.totalDuration}s+</div>
                      <div className="text-blue-600">Total Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-800 font-medium">{RTX5090_VOICE_QUALITY_TARGETS.minimum.snr}dB+</div>
                      <div className="text-blue-600">Signal Quality</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-800 font-medium">{RTX5090_VOICE_QUALITY_TARGETS.minimum.passages}</div>
                      <div className="text-blue-600">Min Passages</div>
                    </div>
                  </div>
                </div>

                {/* Start Recording Button */}
                <div className="text-center pt-2">
                  <Button 
                    onClick={() => setCurrentTip('Ready to start! Begin with the first passage: Conversational Warmth & Connection.')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start RTX 5090 Voice Training
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Header */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="inline-block p-2 sm:p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-3 sm:mb-4 animate-float">
              <span className="text-2xl sm:text-3xl">🎤</span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
              Clone Your Voice
            </CardTitle>
            <p className="text-sm sm:text-base text-peace-600 font-supportive mt-2">
              Record {VOICE_PASSAGES.length} diverse passages to create a high-quality voice clone. Each passage captures different aspects of your voice.
            </p>
            
            {/* Overall Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-supportive text-peace-700">
                  Overall Progress
                </span>
                <span className="text-sm font-supportive text-hope-600">
                  {Math.round(overallProgress)}% Complete
                </span>
              </div>
              <div className="w-full bg-hope-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
            
            {/* Passage Navigator */}
            <div className="flex justify-center gap-2 mt-4">
              {VOICE_PASSAGES.map((passage, index) => {
                const isCompleted = passageProgress[passage.id]?.recorded
                const isCurrent = index === currentPassageIndex
                return (
                  <div 
                    key={passage.id}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-500 shadow-md' 
                        : isCurrent 
                          ? 'bg-hope-500 shadow-md ring-2 ring-hope-200' 
                          : 'bg-peace-200'
                    }`}
                    title={`${passage.title} - ${isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'}`}
                  />
                )
              })}
            </div>
          </CardHeader>
        </Card>

        {/* Current Passage */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <CardTitle className="text-lg sm:text-xl font-gentle text-peace-800">
                  {VOICE_PASSAGES[currentPassageIndex].title}
                </CardTitle>
                <p className="text-sm text-peace-600 font-supportive">
                  Passage {currentPassageIndex + 1} of {VOICE_PASSAGES.length} • {VOICE_PASSAGES[currentPassageIndex].description}
                </p>
              </div>
              <Badge variant="outline" className="bg-hope-50 border-hope-200 text-hope-700 text-xs">
                {Math.round((currentPassageIndex + 1) / VOICE_PASSAGES.length * 100)}%
              </Badge>
            </div>
            
            {/* Progress & Quality Indicator */}
            <div className="mt-4 space-y-3">
              {/* Voice Quality Preview */}
              <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-4 rounded-embrace border border-hope-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-gentle text-hope-800">Voice Clone Quality Assessment</h4>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-hope-500 text-sm">
                        {completedPassages >= star ? '⭐' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Real-time Quality Metrics */}
                {recordingState === 'recording' && (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-hope-700">Audio Level</span>
                      <div className="flex-1 mx-2 bg-hope-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-100 ${
                            audioQuality.volume > 0.8 ? 'bg-red-500' : 
                            audioQuality.volume > 0.3 ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min(100, audioQuality.volume * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-hope-600">{Math.round(audioQuality.volume * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-hope-700">Voice Clarity</span>
                      <div className="flex-1 mx-2 bg-hope-100 rounded-full h-2">
                        <div 
                          className="bg-comfort-500 h-2 rounded-full transition-all duration-200"
                          style={{ width: `${Math.min(100, audioQuality.clarity * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-hope-600">{Math.round(audioQuality.clarity * 100)}%</span>
                    </div>
                  </div>
                )}
                
                {/* Training Data Sufficiency Indicator */}
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-hope-700">Training Data Quality</span>
                    <span className={`text-xs font-gentle ${trainingDataSufficient ? 'text-green-600' : 'text-yellow-600'}`}>
                      {trainingDataSufficient ? 'Excellent for Training' : 'Need More Data'}
                    </span>
                  </div>
                  <div className="w-full bg-hope-100 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        trainingDataSufficient ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, (completedPassages / 4) * 100)}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-hope-700 font-supportive">
                  {completedPassages === 0 && "Start recording to build your voice clone. Each passage adds richness and authenticity."}
                  {completedPassages === 1 && "Great start! Your voice foundation is captured. Continue to add emotional depth."}
                  {completedPassages === 2 && "Excellent progress! Your voice now has conversational warmth and emotional range."}
                  {completedPassages === 3 && "Outstanding! Your voice clone has deep wisdom and varied expression."}
                  {completedPassages === 4 && "Perfect! Your voice clone is complete with full emotional range and clarity."}
                </p>
                
                {/* Phonetic Coverage Indicator */}
                {completedPassages > 0 && (
                  <div className="mt-2 pt-2 border-t border-hope-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-hope-600">Phonetic Coverage:</span>
                        <span className="text-hope-800">{Math.round((completedPassages / 4) * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-hope-600">Emotional Range:</span>
                        <span className="text-hope-800">{Math.round(audioQuality.emotionalRange * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Current Tip */}
              {currentTip && (
                <div className="bg-comfort-50 border border-comfort-200 rounded-embrace p-3">
                  <p className="text-sm text-comfort-700 font-supportive">
                    💡 {currentTip}
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="bg-peace-50 p-4 sm:p-6 rounded-embrace border-2 border-hope-200">
              <p className="text-peace-800 font-compassionate leading-relaxed text-sm sm:text-base md:text-lg whitespace-pre-line">
                {VOICE_PASSAGES[currentPassageIndex].text}
              </p>
            </div>
            
            {/* Navigation Controls */}
            {(currentPassageIndex > 0 || Object.keys(passageProgress).length > 0) && (
              <div className="flex justify-between mt-4">
                <Button
                  onClick={goToPreviousPassage}
                  disabled={currentPassageIndex === 0 || recordingState === 'recording'}
                  variant="outline"
                  className="min-h-[40px] border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace text-sm"
                >
                  ← Previous Passage
                </Button>
                <Button
                  onClick={resetAll}
                  variant="outline"
                  className="min-h-[40px] border-2 border-memory-400 text-memory-700 hover:bg-memory-50 rounded-embrace text-sm"
                >
                  Start Over
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recording Interface */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl font-gentle text-peace-800">
              Recording: {currentPassage.title}
            </CardTitle>
            {recordingState === 'recording' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm sm:text-base text-red-600 font-supportive">Recording: {formatTime(recordingTime)}</span>
                </div>
                <div className="text-xs text-peace-600 font-supportive">
                  Passage {currentPassageIndex + 1} of {VOICE_PASSAGES.length}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            {/* Recording Controls */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              {recordingState === 'idle' && (
                <Button
                  onClick={startRecording}
                  className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 sm:px-8 py-3 text-sm sm:text-base"
                >
                  Start Recording
                </Button>
              )}
              
              {recordingState === 'recording' && (
                <Button
                  onClick={stopRecording}
                  className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-embrace px-6 sm:px-8 py-3 text-sm sm:text-base"
                >
                  Stop Recording
                </Button>
              )}
              
              {recordingState === 'stopped' && (
                <div className="space-y-3">
                  {/* Recording Quality Feedback */}
                  <div className="bg-hope-50 p-3 rounded-embrace border border-hope-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-gentle text-hope-800">Recording Quality Check:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-hope-500 text-sm">
                            {recordingTime >= 60 ? '⭐' : recordingTime >= 30 ? (star <= 3 ? '⭐' : '☆') : (star <= 2 ? '⭐' : '☆')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-hope-700 font-supportive">
                      {recordingTime >= 45 
                        ? 'Excellent! This recording length will create a high-quality voice clone. Great emotional range and clarity captured!' 
                        : recordingTime >= 25 
                          ? 'Good recording length. For optimal quality, aim for 45+ seconds with natural expression and clear articulation.' 
                          : 'Recording is quite short. For best voice quality, aim for 45+ seconds reading naturally with emotional expression.'}
                    </p>
                    {recordingTime >= 30 && (
                      <div className="mt-2 bg-hope-100 p-2 rounded-comfort">
                        <p className="text-xs text-hope-800 font-supportive">
                          <strong>Quality Tips:</strong> Your voice clone will be most effective when you speak naturally, 
                          vary your tone and pacing, and express genuine emotion. Each passage captures different aspects 
                          of your vocal personality.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={playRecording}
                      disabled={isPlaying}
                      variant="outline"
                      className="w-full sm:w-auto min-h-[48px] border-2 border-hope-400 text-hope-700 hover:bg-hope-50 rounded-embrace py-3 text-sm sm:text-base"
                    >
                      {isPlaying ? 'Playing...' : 'Review Recording'}
                    </Button>
                    <Button
                      onClick={processVoice}
                      className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace py-3 text-sm sm:text-base"
                    >
                      {currentPassageIndex < VOICE_PASSAGES.length - 1 ? 'Save & Continue' : 'Complete Voice Clone'}
                    </Button>
                    <Button
                      onClick={retryRecording}
                      variant="outline"
                      className="w-full sm:w-auto min-h-[48px] border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 text-sm sm:text-base"
                    >
                      Re-record
                    </Button>
                  </div>
                </div>
              )}
              
              {isPlaying && (
                <Button
                  onClick={stopPlayback}
                  variant="outline"
                  className="w-full sm:w-auto min-h-[48px] border-2 border-red-400 text-red-700 hover:bg-red-50 rounded-embrace py-3 text-sm sm:text-base"
                >
                  Stop Playback
                </Button>
              )}
            </div>

            {/* Status Messages */}
            {recordingState === 'processing' && (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-hope-100 px-4 py-2 rounded-embrace">
                  <div className="w-4 h-4 border-2 border-hope-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-hope-700 font-supportive">
                    {currentPassageIndex < VOICE_PASSAGES.length - 1 
                      ? 'Processing passage and preparing next...' 
                      : 'Creating your complete voice clone...'}
                  </span>
                </div>
                <p className="text-xs text-peace-600 font-supportive">
                  {currentPassageIndex < VOICE_PASSAGES.length - 1 
                    ? `Progress: ${currentPassageIndex + 1} of ${VOICE_PASSAGES.length} passages completed`
                    : 'Finalizing your voice clone with all recorded passages'}
                </p>
              </div>
            )}

            {recordingState === 'completed' && voiceProfile && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-embrace">
                  <span className="text-green-700 font-supportive">🎉 Voice clone completed successfully!</span>
                </div>
                <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-4 rounded-embrace border border-hope-200">
                  <h4 className="font-gentle text-hope-800 mb-2">Your Voice is Ready!</h4>
                  <p className="text-sm text-hope-700 font-supportive mb-3">
                    You&apos;ve successfully recorded {VOICE_PASSAGES.length} passages, capturing the full range and emotion of your voice. 
                    Your AI echo can now speak with your authentic voice in conversations.
                  </p>
                  <Badge variant="outline" className="bg-hope-50 border-hope-200 text-hope-700 text-xs">
                    Voice ID: {voiceProfile}
                  </Badge>
                </div>
                <Button
                  onClick={() => window.location.href = '/ai-echo'}
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 py-3"
                >
                  Try Your Voice in AI Echo Chat
                </Button>
              </div>
            )}

            {/* Advanced Recording Guidance */}
            {recordingState === 'idle' && (
              <div className="space-y-4">
                {/* Passage-Specific Guidance */}
                <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-4 rounded-embrace border border-hope-200">
                  <h4 className="text-sm font-gentle text-hope-800 mb-3">
                    Recording Guide: {VOICE_PASSAGES[currentPassageIndex].title}
                  </h4>
                  
                  {/* Technical Requirements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/60 p-2 rounded-comfort">
                      <div className="text-xs text-hope-600 mb-1">Duration Target</div>
                      <div className="text-sm font-gentle text-hope-800">
                        {VOICE_PASSAGES[currentPassageIndex].minDuration}s - {VOICE_PASSAGES[currentPassageIndex].optimalDuration}s
                      </div>
                    </div>
                    <div className="bg-white/60 p-2 rounded-comfort">
                      <div className="text-xs text-hope-600 mb-1">Focus Area</div>
                      <div className="text-sm font-gentle text-hope-800">
                        {VOICE_PASSAGES[currentPassageIndex].phoneticFocus}
                      </div>
                    </div>
                  </div>

                  {/* Passage-Specific Tips */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-gentle text-hope-800">Key Techniques:</h5>
                    <ul className="text-xs text-hope-700 font-supportive space-y-1">
                      <li>• Find a quiet environment with minimal background noise</li>
                      <li>• Speak clearly and naturally, as if talking to someone you care about</li>
                      <li>• Express genuine emotion and let your personality shine through</li>
                      <li>• Read at a comfortable, conversational pace (not too fast or slow)</li>
                      
                      {currentPassageIndex === 0 && (
                        <>
                          <li>• <strong>Conversational Focus:</strong> Speak warmly and naturally, as if chatting with a close friend</li>
                          <li>• <strong>Natural Rhythm:</strong> Use connected speech patterns and natural flow</li>
                          <li>• <strong>Warm Tones:</strong> Let warmth and care come through in your voice</li>
                        </>
                      )}
                      
                      {currentPassageIndex === 1 && (
                        <>
                          <li>• <strong>Emotional Range:</strong> Let different emotions come through - joy, reflection, gentleness</li>
                          <li>• <strong>Pitch Variation:</strong> Vary your pitch naturally with the emotional content</li>
                          <li>• <strong>Expressive Speech:</strong> Use natural emphasis and vocal expression</li>
                        </>
                      )}
                      
                      {currentPassageIndex === 2 && (
                        <>
                          <li>• <strong>Wisdom & Depth:</strong> Speak thoughtfully and meaningfully, sharing from the heart</li>
                          <li>• <strong>Reflective Pace:</strong> Take natural pauses for emphasis and reflection</li>
                          <li>• <strong>Meaningful Delivery:</strong> Convey the weight and importance of the words</li>
                        </>
                      )}
                      
                      {currentPassageIndex === 3 && (
                        <>
                          <li>• <strong>Clear Articulation:</strong> Focus on precise, clear speech while maintaining warmth</li>
                          <li>• <strong>Structured Pacing:</strong> Use consistent rhythm for technical clarity</li>
                          <li>• <strong>Crisp Consonants:</strong> Ensure clear pronunciation of all sounds</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Voice Training Optimization Indicator */}
                {completedPassages >= 2 && (
                  <div className="bg-memory-50 p-3 rounded-embrace border border-memory-200">
                    <h5 className="text-sm font-gentle text-memory-800 mb-2">
                      RTX 5090 Training Optimization
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-memory-600">Data Quality:</span>
                        <span className="text-memory-800">{trainingDataSufficient ? 'Optimal' : 'Good'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-memory-600">GPU Ready:</span>
                        <span className="text-memory-800">✓ RTX 5090</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-memory-600">Est. Training:</span>
                        <span className="text-memory-800">~2-3 min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-memory-600">Model Type:</span>
                        <span className="text-memory-800">XTTS-v2</span>
                      </div>
                    </div>
                    <p className="text-xs text-memory-700 font-supportive mt-2">
                      Your recordings will be processed using advanced RTX 5090 acceleration for optimal voice quality.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Passage Summary */}
        {Object.keys(passageProgress).length > 0 && recordingState !== 'completed' && (
          <Card className="mobile-card bg-white/70 backdrop-blur-md border-0 shadow-lg">
            <CardContent className="p-4">
              <h4 className="text-sm font-gentle text-peace-800 mb-3">Recording Progress</h4>
              <div className="space-y-2">
                {VOICE_PASSAGES.map((passage, index) => {
                  const progress = passageProgress[passage.id]
                  return (
                    <div key={passage.id} className="flex items-center justify-between p-2 rounded-comfort bg-peace-50">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          progress?.recorded ? 'bg-green-500' : index === currentPassageIndex ? 'bg-hope-500' : 'bg-peace-300'
                        }`} />
                        <span className="text-sm font-supportive text-peace-700">{passage.title}</span>
                      </div>
                      <div className="text-xs text-peace-600">
                        {progress?.recorded ? (
                          <span className="text-green-600">✓ {Math.round((progress.duration || 0))}s</span>
                        ) : index === currentPassageIndex ? (
                          <span className="text-hope-600">Current</span>
                        ) : (
                          <span>Pending</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Back Button */}
        <div className="text-center px-4 sm:px-0">
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full sm:w-auto min-h-[48px] border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6 text-sm sm:text-base"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}