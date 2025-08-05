'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayIcon, PauseIcon, Volume2Icon, VolumeXIcon, SkipBackIcon, SkipForwardIcon, RotateCcwIcon, SettingsIcon } from 'lucide-react'

interface VoiceControlsProps {
  audioUrl?: string
  isPlaying?: boolean
  onPlay?: () => void
  onPause?: () => void
  onVolumeChange?: (volume: number) => void
  onSpeedChange?: (speed: number) => void
  volume?: number
  playbackRate?: number
  voiceQuality?: 'excellent' | 'good' | 'fair' | 'poor'
  generationTime?: number
  familyMemberName?: string
  emotion?: 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting'
  onRetry?: () => void
  voiceError?: string
  className?: string
}

interface AudioVisualizationProps {
  analyser?: AnalyserNode
  isPlaying: boolean
  emotion?: string
  className?: string
}

const AudioVisualization: React.FC<AudioVisualizationProps> = ({ 
  analyser, 
  isPlaying, 
  emotion = 'warm',
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  
  // Emotion-based colors for visualization
  const getEmotionColors = (emotion: string) => {
    switch (emotion) {
      case 'loving':
        return {
          primary: '#f43f5e',    // rose-500
          secondary: '#fb7185',   // rose-400
          accent: '#fda4af'       // rose-300
        }
      case 'wise':
        return {
          primary: '#f59e0b',     // amber-500
          secondary: '#fbbf24',   // amber-400
          accent: '#fcd34d'       // amber-300
        }
      case 'reflective':
        return {
          primary: '#a855f7',     // purple-500
          secondary: '#c084fc',   // purple-400
          accent: '#d8b4fe'       // purple-300
        }
      case 'comforting':
        return {
          primary: '#0ea5e9',     // sky-500
          secondary: '#38bdf8',   // sky-400
          accent: '#7dd3fc'       // sky-300
        }
      default:
        return {
          primary: '#0ea5e9',     // hope-500
          secondary: '#38bdf8',   // hope-400
          accent: '#7dd3fc'       // hope-300
        }
    }
  }
  
  const drawVisualization = useCallback(() => {
    if (!canvasRef.current || !analyser) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    analyser.getByteFrequencyData(dataArray)
    
    const width = canvas.width
    const height = canvas.height
    
    ctx.clearRect(0, 0, width, height)
    
    const colors = getEmotionColors(emotion)
    
    if (isPlaying) {
      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, colors.primary + '40') // 25% opacity
      gradient.addColorStop(0.5, colors.secondary + '60') // 37.5% opacity
      gradient.addColorStop(1, colors.accent + '80') // 50% opacity
      
      const barWidth = width / bufferLength * 2
      let x = 0
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight)
        
        x += barWidth
      }
      
      // Add glow effect
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 10
      ctx.globalCompositeOperation = 'screen'
      
      // Redraw with glow
      x = 0
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8
        ctx.fillStyle = colors.accent + '40'
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight)
        x += barWidth
      }
      
      ctx.globalCompositeOperation = 'source-over'
      ctx.shadowBlur = 0
    } else {
      // Static visualization when not playing
      const centerY = height / 2
      const amplitude = 8
      const frequency = 0.02
      
      ctx.strokeStyle = colors.primary + '60'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      for (let x = 0; x < width; x++) {
        const y = centerY + Math.sin(x * frequency) * amplitude
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.stroke()
    }
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(drawVisualization)
    }
  }, [analyser, isPlaying, emotion])
  
  useEffect(() => {
    if (isPlaying) {
      drawVisualization()
    } else {
      drawVisualization() // Draw static visualization
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, drawVisualization])
  
  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={`rounded-comfort ${className}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  audioUrl,
  isPlaying = false,
  onPlay,
  onPause,
  onVolumeChange,
  onSpeedChange,
  volume = 0.8,
  playbackRate = 1.0,
  voiceQuality,
  generationTime,
  familyMemberName,
  emotion = 'warm',
  onRetry,
  voiceError,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Initialize audio context for visualization
  useEffect(() => {
    if (audioUrl && !audioContextRef.current) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyserNode = audioContext.createAnalyser()
        analyserNode.fftSize = 256
        analyserNode.smoothingTimeConstant = 0.8
        
        audioContextRef.current = audioContext
        setAnalyser(analyserNode)
      } catch (error) {
        console.warn('Audio context not supported:', error)
      }
    }
  }, [audioUrl])
  
  // Get emotion-specific styling
  const getEmotionStyling = () => {
    switch (emotion) {
      case 'loving':
        return 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50'
      case 'wise':
        return 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50'
      case 'reflective':
        return 'border-purple-200 bg-gradient-to-br from-purple-50 to-comfort-50'
      case 'comforting':
        return 'border-hope-200 bg-gradient-to-br from-hope-50 to-peace-50'
      default:
        return 'border-hope-200 bg-gradient-to-br from-peace-50 to-hope-50'
    }
  }
  
  // Get quality badge styling
  const getQualityBadgeStyle = () => {
    switch (voiceQuality) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-peace-100 text-peace-800 border-peace-200'
    }
  }
  
  // Format generation time
  const formatGenerationTime = (time?: number) => {
    if (!time) return ''
    if (time < 1) return 'Instant'
    if (time < 2) return 'Fast'
    if (time < 5) return 'Normal'
    return 'Slow'
  }
  
  return (
    <Card className={`${getEmotionStyling()} border shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with family member info */}
          {familyMemberName && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-supportive text-peace-700">
                  {familyMemberName}'s Voice
                </span>
              </div>
              {voiceQuality && (
                <Badge className={`text-xs ${getQualityBadgeStyle()}`}>
                  {voiceQuality}
                  {generationTime && (
                    <span className="ml-1">• {formatGenerationTime(generationTime)}</span>
                  )}
                </Badge>
              )}
            </div>
          )}
          
          {/* Audio visualization */}
          <div className="flex justify-center">
            <AudioVisualization
              analyser={analyser}
              isPlaying={isPlaying}
              emotion={emotion}
              className="border border-hope-200/50 bg-white/60"
            />
          </div>
          
          {/* Main controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Skip back (future feature) */}
            <Button
              variant="ghost"
              size="sm"
              className="text-peace-600 hover:text-peace-800 opacity-50 cursor-not-allowed"
              disabled
            >
              <SkipBackIcon className="w-4 h-4" />
            </Button>
            
            {/* Play/Pause */}
            {audioUrl ? (
              <Button
                onClick={isPlaying ? onPause : onPlay}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5 ml-0.5" />
                )}
              </Button>
            ) : voiceError ? (
              <Button
                onClick={onRetry}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <RotateCcwIcon className="w-5 h-5" />
              </Button>
            ) : (
              <div className="w-12 h-12 rounded-full bg-peace-200 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-peace-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Skip forward (future feature) */}
            <Button
              variant="ghost"
              size="sm"
              className="text-peace-600 hover:text-peace-800 opacity-50 cursor-not-allowed"
              disabled
            >
              <SkipForwardIcon className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Voice error message */}
          {voiceError && (
            <div className="text-center">
              <p className="text-sm text-orange-600 italic">{voiceError}</p>
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {/* Quick controls */}
          <div className="flex items-center justify-between">
            {/* Volume control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVolumeChange?.(volume > 0 ? 0 : 0.8)}
                className="text-peace-600 hover:text-peace-800"
              >
                {volume === 0 ? (
                  <VolumeXIcon className="w-4 h-4" />
                ) : (
                  <Volume2Icon className="w-4 h-4" />
                )}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="w-16 h-1 bg-peace-200 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`
                }}
              />
              <span className="text-xs text-peace-600 w-8 text-center">
                {Math.round(volume * 100)}%
              </span>
            </div>
            
            {/* Advanced settings toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-peace-600 hover:text-peace-800"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Advanced controls */}
          {showAdvanced && (
            <div className="pt-3 border-t border-hope-200 space-y-3">
              {/* Playback speed */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-supportive text-peace-700">
                  Playback Speed
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={playbackRate}
                    onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-peace-200 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((playbackRate - 0.5) / 1.5) * 100}%, #e2e8f0 ${((playbackRate - 0.5) / 1.5) * 100}%, #e2e8f0 100%)`
                    }}
                  />
                  <span className="text-xs text-peace-600 w-8 text-center">
                    {playbackRate}x
                  </span>
                </div>
              </div>
              
              {/* Emotional tone indicator */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-supportive text-peace-700">
                  Emotional Tone
                </label>
                <Badge className={`text-xs capitalize ${getQualityBadgeStyle()}`}>
                  {emotion}
                </Badge>
              </div>
              
              {/* Generation stats */}
              {(voiceQuality || generationTime) && (
                <div className="flex items-center justify-between text-xs text-peace-600">
                  <span>Voice Quality</span>
                  <div className="flex items-center gap-2">
                    {voiceQuality && (
                      <span className="capitalize">{voiceQuality}</span>
                    )}
                    {generationTime && (
                      <span>• Generated in {generationTime.toFixed(1)}s</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Keyboard shortcuts hint */}
          <div className="text-center text-xs text-peace-500 bg-peace-50 px-2 py-1 rounded-comfort">
            Press Alt+V to play/pause
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default VoiceControls