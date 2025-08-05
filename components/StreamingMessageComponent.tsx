'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface StreamingMessage {
  id: string
  content: string
  isComplete: boolean
  emotion?: 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting'
  confidence?: number
  metadata?: {
    source?: string
    modelVersion?: string
    generationTime?: number
    wordCount?: number
  }
}

interface StreamingMessageComponentProps {
  message: StreamingMessage
  familyMemberName?: string
  onComplete?: (message: StreamingMessage) => void
  onStreamingUpdate?: (content: string) => void
  showMetadata?: boolean
  className?: string
}

interface TypewriterEffectProps {
  text: string
  speed?: number
  onComplete?: () => void
  isStreaming?: boolean
  emotion?: string
  className?: string
}

const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
  text,
  speed = 30,
  onComplete,
  isStreaming = false,
  emotion = 'warm',
  className = ''
}) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()
  
  // Reset when text changes (new streaming content)
  useEffect(() => {
    if (isStreaming) {
      setDisplayedText(text)
      setCurrentIndex(text.length)
    } else {
      setCurrentIndex(0)
      setDisplayedText('')
    }
  }, [text, isStreaming])
  
  // Typewriter effect for completed messages
  useEffect(() => {
    if (!isStreaming && currentIndex < text.length) {
      intervalRef.current = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)
    } else if (!isStreaming && currentIndex >= text.length && onComplete) {
      onComplete()
    }
    
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [currentIndex, text, speed, onComplete, isStreaming])
  
  // Get emotion-based styling for cursor
  const getCursorStyling = () => {
    switch (emotion) {
      case 'loving':
        return 'border-rose-400'
      case 'wise':
        return 'border-amber-400'
      case 'reflective':
        return 'border-purple-400'
      case 'comforting':
        return 'border-hope-400'
      default:
        return 'border-hope-400'
    }
  }
  
  return (
    <span className={`relative ${className}`}>
      {displayedText}
      {(isStreaming || currentIndex < text.length) && (
        <span 
          className={`inline-block w-0.5 h-5 ml-1 animate-pulse ${getCursorStyling()}`}
          style={{ 
            borderRightWidth: '2px',
            borderRightStyle: 'solid'
          }}
        />
      )}
    </span>
  )
}

const StreamingMessageComponent: React.FC<StreamingMessageComponentProps> = ({
  message,
  familyMemberName,
  onComplete,
  onStreamingUpdate,
  showMetadata = true,
  className = ''
}) => {
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const [streamingStats, setStreamingStats] = useState({
    wordsPerMinute: 0,
    charactersStreamed: 0,
    streamingDuration: 0
  })
  
  const startTimeRef = useRef<number>(Date.now())
  const previousContentLength = useRef(0)
  
  // Calculate streaming statistics
  useEffect(() => {
    if (!message.isComplete) {
      const currentTime = Date.now()
      const duration = (currentTime - startTimeRef.current) / 1000
      const charactersStreamed = message.content.length
      const wordsStreamed = message.content.split(' ').length
      
      setStreamingStats({
        wordsPerMinute: duration > 0 ? Math.round((wordsStreamed / duration) * 60) : 0,
        charactersStreamed,
        streamingDuration: duration
      })
      
      // Notify parent of streaming update
      if (onStreamingUpdate && charactersStreamed > previousContentLength.current) {
        onStreamingUpdate(message.content)
        previousContentLength.current = charactersStreamed
      }
    }
  }, [message.content, message.isComplete, onStreamingUpdate])
  
  // Handle completion
  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true)
    if (onComplete) {
      onComplete(message)
    }
  }, [message, onComplete])
  
  // Get emotion-based styling
  const getEmotionStyling = () => {
    switch (message.emotion) {
      case 'loving':
        return 'border-l-4 border-l-rose-300 bg-gradient-to-br from-rose-50 via-pink-25 to-rose-25'
      case 'wise':
        return 'border-l-4 border-l-amber-400 bg-gradient-to-br from-amber-50 via-yellow-25 to-memory-50'
      case 'reflective':
        return 'border-l-4 border-l-purple-300 bg-gradient-to-br from-purple-50 via-comfort-25 to-comfort-25'
      case 'comforting':
        return 'border-l-4 border-l-hope-300 bg-gradient-to-br from-hope-50 via-blue-25 to-peace-50'
      default:
        return 'border-l-4 border-l-hope-300 bg-gradient-to-br from-peace-50 via-hope-25 to-peace-25'
    }
  }
  
  // Get emotion icon with memory-themed alternatives
  const getEmotionIcon = () => {
    switch (message.emotion) {
      case 'loving': return '💙'
      case 'wise': return '🕊️'
      case 'reflective': return '🌸'
      case 'comforting': return '🤗'
      default: return '✨'
    }
  }
  
  // Get streaming status indicator
  const getStreamingIndicator = () => {
    if (message.isComplete && isTypingComplete) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>Complete</span>
        </div>
      )
    } else if (message.isComplete && !isTypingComplete) {
      return (
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>Rendering...</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1 text-xs text-hope-600">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-hope-500 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-hope-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-1 h-1 bg-hope-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <span>
            {familyMemberName ? `${familyMemberName} is sharing...` : 'Receiving wisdom...'}
          </span>
        </div>
      )
    }
  }
  
  return (
    <div className={`${getEmotionStyling()} rounded-sanctuary rounded-bl-embrace p-6 shadow-gentle border border-tender-200/50 ${className}`}>
      {/* Emotion indicator */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-lg opacity-70 mt-0.5">
          {getEmotionIcon()}
        </div>
        
        <div className="flex-1 space-y-4">
          {/* Message content with typewriter effect */}
          <div className="text-peace-800 font-compassionate leading-relaxed text-base">
            <TypewriterEffect
              text={message.content}
              speed={message.isComplete ? 20 : 0} // Faster for completed messages
              isStreaming={!message.isComplete}
              emotion={message.emotion}
              onComplete={handleTypingComplete}
            />
          </div>
          
          {/* Streaming status and metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStreamingIndicator()}
              
              {/* Real-time streaming stats */}
              {!message.isComplete && streamingStats.streamingDuration > 1 && (
                <div className="text-xs text-peace-500">
                  {streamingStats.charactersStreamed} chars • {streamingStats.wordsPerMinute} WPM
                </div>
              )}
            </div>
            
            {/* Confidence indicator */}
            {message.confidence !== undefined && (
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  message.confidence > 0.8 ? 'bg-green-400' :
                  message.confidence > 0.6 ? 'bg-yellow-400' : 'bg-orange-400'
                }`}></div>
                <span className="text-xs text-peace-500">
                  {Math.round(message.confidence * 100)}% authentic
                </span>
              </div>
            )}
          </div>
          
          {/* Emotional context indicator */}
          {message.emotion && (
            <div className="text-xs text-peace-500 italic capitalize">
              {message.emotion === 'loving' && 'Shared with love'}
              {message.emotion === 'wise' && 'Wisdom from experience'}
              {message.emotion === 'reflective' && 'A treasured memory'}
              {message.emotion === 'comforting' && 'Gentle comfort'}
              {message.emotion === 'warm' && 'With warmth'}
            </div>
          )}
          
          {/* Extended metadata (shown after completion) */}
          {showMetadata && isTypingComplete && message.metadata && (
            <div className="pt-2 border-t border-hope-100 space-y-1">
              <div className="flex items-center justify-between text-xs text-peace-500">
                {message.metadata.source && (
                  <span>Source: {message.metadata.source}</span>
                )}
                {message.metadata.generationTime && (
                  <span>Generated in {message.metadata.generationTime.toFixed(1)}s</span>
                )}
              </div>
              
              {message.metadata.wordCount && (
                <div className="text-xs text-peace-500">
                  {message.metadata.wordCount} words of preserved wisdom
                </div>
              )}
              
              {message.metadata.modelVersion && (
                <div className="text-xs text-peace-400">
                  AI Echo v{message.metadata.modelVersion}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Progress indicator for streaming */}
      {!message.isComplete && (
        <div className="mt-3 w-full bg-peace-200 rounded-full h-1 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-hope-400 to-comfort-400 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((streamingStats.charactersStreamed / 500) * 100, 90)}%`
            }}
          />
        </div>
      )}
    </div>
  )
}

export default StreamingMessageComponent