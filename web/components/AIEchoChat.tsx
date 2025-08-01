'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSession } from 'next-auth/react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  confidence?: number
  source?: string
  modelVersion?: string
  audioUrl?: string
  isPlaying?: boolean
  audioLoading?: boolean
  voiceError?: string
  voiceErrorDetails?: {
    canRetry: boolean
    needsUpdate: boolean
    originalError: string
  }
  voiceQuality?: 'excellent' | 'good' | 'fair' | 'poor'
  generationTime?: number
  isTyping?: boolean
  animationDelay?: number
  emotion?: 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting'
  familyContext?: {
    relationship?: string
    memories?: string[]
    significance?: string
  }
}

interface FamilyMember {
  id: string
  name: string
  relationship: string
  avatar?: string
  traits?: string[]
  significance?: string
  memories?: string[]
  voiceCloned?: boolean
  lastInteraction?: Date
  // Enhanced for better family context
  lifeSpan?: {
    birth?: string
    passing?: string
  }
  favoriteMemories?: string[]
  wisdomThemes?: string[]
  personalityTraits?: {
    warmth: number
    humor: number
    wisdom: number
    strength: number
  }
}

interface TrainingData {
  responsesUsed: number
  categoriesCovered: number
  totalWords: number
  confidence: number
  modelVersion: string
}

interface AIEchoChatProps {
  isDemo?: boolean
  userName?: string
  familyMember?: FamilyMember
}

export default function AIEchoChat({ 
  isDemo = false, 
  userName = "your AI echo",
  familyMember
}: AIEchoChatProps) {
  const { data: session } = useSession()
  
  // Core state for chat functionality
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null)
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Voice synthesis state
  const [audioCache, setAudioCache] = useState<Map<string, string>>(new Map())
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [voiceSettings, setVoiceSettings] = useState({
    volume: 0.8,
    playbackRate: 1.0,
    autoPlay: false
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add welcome message on component mount
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: familyMember 
          ? `Hello! I'm ${familyMember.name}'s AI echo, carrying their voice, wisdom, and love. I'm here to share memories, offer guidance, and keep their spirit close to your heart. What would you like to talk about?`
          : isDemo 
            ? `Hello! I'm ${userName}'s AI echo. I'm trained on their responses to preserve their unique voice and wisdom. Try asking me about their memories, advice, or family.`
            : `Hello! I'm your AI echo, trained on your responses to legacy questions. The more you answer, the better I become at reflecting your voice. Ask me anything!`,
        timestamp: new Date(),
        confidence: 1.0,
        source: 'welcome_message',
        modelVersion: 'v0.1',
        emotion: familyMember ? 'loving' : 'warm'
      }
      setMessages([welcomeMessage])
    }
  }, [isDemo, userName, familyMember, messages.length])

  // Send message function
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const messageContent = inputValue.trim()
    
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      const response = await fetch('/api/ai-echo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          isDemo,
          conversationId,
          familyContext: familyMember ? {
            name: familyMember.name,
            relationship: familyMember.relationship,
            traits: familyMember.traits,
            memories: familyMember.memories
          } : undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Add natural delay before showing response
        setTimeout(async () => {
          setIsTyping(false)
          
          const messageId = `ai_${Date.now()}`
          const aiMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            confidence: data.confidence,
            source: data.source,
            modelVersion: data.modelVersion,
            emotion: detectMessageEmotion(data.response),
            audioLoading: true
          }

          setMessages(prev => [...prev, aiMessage])
          setTrainingData(data.trainingData)
          
          // Initiate voice synthesis for the response
          await synthesizeVoice(messageId, data.response)
        }, 1000) // 1 second delay for natural feel
      } else {
        setIsTyping(false)
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setIsTyping(false)
      
      // Enhanced grief-sensitive error handling with compassionate responses
      let errorContent = "I'm sorry, I'm having trouble responding right now. Please try again."
      let errorEmotion: 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting' = 'comforting'
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorContent = familyMember 
            ? `I'm having trouble connecting right now, but ${familyMember.name}'s love and wisdom are always with you. Their essence transcends any technical difficulty. Please check your connection and try again when you're ready. 💙`
            : "I'm having trouble connecting right now, but please know this is just a temporary challenge. Your thoughts and memories are precious. Please check your internet connection and try again when you feel ready. 💙"
          errorEmotion = 'comforting'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorContent = familyMember
            ? `It seems our connection has been interrupted, but ${familyMember.name}'s presence in your heart remains constant. Please refresh the page gently and sign in again to continue our conversation. 🌟`
            : "It seems our connection has been interrupted. This happens sometimes, and it's okay. Please refresh the page gently and sign in again when you're ready to continue. 🌟"
          errorEmotion = 'comforting'
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorContent = familyMember
            ? `The AI service is taking a gentle pause, much like how ${familyMember.name} would have encouraged you to rest when things felt overwhelming. Their wisdom and love remain constant in your heart. Please try again in a few moments when you feel ready. ✨`
            : "The AI service is taking a gentle pause, like a moment of reflection. Sometimes we all need these quiet moments. Your memories and thoughts are safe, and I'll be here when you're ready to try again. ✨"
          errorEmotion = 'wise'
        } else {
          errorContent = familyMember
            ? `Something unexpected happened, but please know that ${familyMember.name}'s love for you is unwavering, beyond any technical challenge. Take a moment if you need it, and try again when your heart feels ready. Their wisdom will still be here. 💝`
            : "Something unexpected happened, and that's okay. Sometimes life throws us curves we don't expect. Take a moment if you need it, breathe gently, and try again when your heart feels ready. Your story matters. 💝"
          errorEmotion = 'loving'
        }
      }
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        confidence: 0,
        source: 'error',
        emotion: errorEmotion,
        familyContext: familyMember ? {
          relationship: familyMember.relationship,
          significance: 'Gentle support during a difficult moment'
        } : undefined
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  // Voice synthesis function
  const synthesizeVoice = async (messageId: string, text: string) => {
    try {
      // Check cache first
      const cacheKey = `${session?.user?.email}_${text.substring(0, 100)}`
      if (audioCache.has(cacheKey)) {
        updateMessageAudio(messageId, audioCache.get(cacheKey)!)
        return
      }

      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: familyMember ? `voice_${familyMember.id}` : undefined
        })
      })

      const data = await response.json()

      if (data.success && data.audioUrl) {
        // Cache the audio URL
        setAudioCache(prev => new Map(prev.set(cacheKey, data.audioUrl)))
        updateMessageAudio(messageId, data.audioUrl, data.quality, undefined, data.generationTime)
        
        // Auto-play if enabled
        if (voiceSettings.autoPlay) {
          playAudio(messageId, data.audioUrl)
        }
      } else {
        // Handle voice synthesis errors with grief-sensitive messaging
        const voiceErrorMessage = familyMember 
          ? `${familyMember.name}'s voice is resting right now, but their words carry the same love and wisdom`
          : 'Voice synthesis is taking a gentle pause, but the message carries the same care'
        updateMessageAudio(messageId, null, undefined, voiceErrorMessage)
      }
    } catch (error) {
      console.error('Voice synthesis error:', error)
      const compassionateError = familyMember
        ? `${familyMember.name}'s voice is taking a rest, but their love speaks through every word`
        : 'The voice is taking a gentle pause, but the heart of the message remains'
      updateMessageAudio(messageId, null, undefined, compassionateError)
    }
  }

  // Update message with audio information
  const updateMessageAudio = (messageId: string, audioUrl: string | null, quality?: string, error?: string, generationTime?: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            audioUrl, 
            audioLoading: false,
            voiceError: error,
            voiceQuality: quality as 'excellent' | 'good' | 'fair' | 'poor' | undefined,
            generationTime,
            voiceErrorDetails: error ? {
              canRetry: true,
              needsUpdate: error.includes('model') || error.includes('training'),
              originalError: error
            } : undefined
          }
        : msg
    ))
  }

  // Audio playback controls
  const playAudio = async (messageId: string, audioUrl: string) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      // Create new audio element
      const audio = new Audio(audioUrl)
      audio.volume = voiceSettings.volume
      audio.playbackRate = voiceSettings.playbackRate
      
      audioRef.current = audio
      setCurrentlyPlaying(messageId)
      
      // Update message playing state
      setMessages(prev => prev.map(msg => ({
        ...msg,
        isPlaying: msg.id === messageId ? true : false
      })))

      audio.onended = () => {
        setCurrentlyPlaying(null)
        setMessages(prev => prev.map(msg => ({
          ...msg,
          isPlaying: false
        })))
      }

      audio.onerror = () => {
        setCurrentlyPlaying(null)
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isPlaying: false, voiceError: 'Audio playback failed' }
            : { ...msg, isPlaying: false }
        ))
      }

      await audio.play()
    } catch (error) {
      console.error('Audio playback error:', error)
      setCurrentlyPlaying(null)
      setMessages(prev => prev.map(msg => ({
        ...msg,
        isPlaying: false
      })))
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setCurrentlyPlaying(null)
      setMessages(prev => prev.map(msg => ({
        ...msg,
        isPlaying: false
      })))
    }
  }

  // Retry voice synthesis
  const retryVoiceSynthesis = async (messageId: string, text: string) => {
    updateMessageAudio(messageId, null, undefined, undefined)
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, audioLoading: true } : msg
    ))
    await synthesizeVoice(messageId, text)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'v') {
        e.preventDefault()
        if (currentlyPlaying) {
          stopAudio()
        } else {
          // Play the last AI message if available
          const lastAiMessage = [...messages].reverse().find(msg => 
            msg.role === 'assistant' && msg.audioUrl
          )
          if (lastAiMessage && lastAiMessage.audioUrl) {
            playAudio(lastAiMessage.id, lastAiMessage.audioUrl)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentlyPlaying, messages])

  // Enhanced emotional tone detection with more nuanced analysis
  const detectMessageEmotion = (content: string): 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting' => {
    const lowerContent = content.toLowerCase()
    
    // Loving: expressions of affection, endearment, family bonds
    if (lowerContent.includes('love') || lowerContent.includes('dear') || lowerContent.includes('heart') || 
        lowerContent.includes('precious') || lowerContent.includes('treasure') || lowerContent.includes('adore')) return 'loving'
    
    // Reflective: memories, contemplation, looking back
    if (lowerContent.includes('remember') || lowerContent.includes('think') || lowerContent.includes('reflect') ||
        lowerContent.includes('memory') || lowerContent.includes('past') || lowerContent.includes('moment')) return 'reflective' 
    
    // Wise: guidance, teaching, life lessons
    if (lowerContent.includes('learn') || lowerContent.includes('wisdom') || lowerContent.includes('important') ||
        lowerContent.includes('advice') || lowerContent.includes('experience') || lowerContent.includes('teach')) return 'wise'
    
    // Comforting: support, presence, reassurance
    if (lowerContent.includes('comfort') || lowerContent.includes('here') || lowerContent.includes('support') ||
        lowerContent.includes('safe') || lowerContent.includes('okay') || lowerContent.includes('worry')) return 'comforting'
    
    return 'warm'
  }

  // Enhanced emotion-based styling with more nuanced visual cues
  const getEmotionStyling = (emotion?: string) => {
    switch (emotion) {
      case 'loving':
        return 'border-l-4 border-l-rose-300 bg-gradient-to-br from-rose-50 via-pink-25 to-rose-25 shadow-sm'
      case 'wise':
        return 'border-l-4 border-l-amber-400 bg-gradient-to-br from-amber-50 via-yellow-25 to-memory-50 shadow-sm'
      case 'reflective':
        return 'border-l-4 border-l-comfort-300 bg-gradient-to-br from-comfort-50 via-purple-25 to-comfort-25 shadow-sm'
      case 'comforting':
        return 'border-l-4 border-l-hope-300 bg-gradient-to-br from-hope-50 via-blue-25 to-peace-50 shadow-sm'
      default:
        return 'border-l-4 border-l-hope-300 bg-gradient-to-br from-peace-50 via-hope-25 to-peace-25 shadow-sm'
    }
  }

  // Get emotion icon for visual cues
  const getEmotionIcon = (emotion?: string) => {
    switch (emotion) {
      case 'loving':
        return '💝' // Gift heart for loving messages
      case 'wise':
        return '🌟' // Star for wisdom
      case 'reflective':
        return '🌸' // Cherry blossom for memories
      case 'comforting':
        return '🤗' // Hugging face for comfort
      default:
        return '✨' // Sparkles for warm messages
    }
  }

  // Generate family member avatar fallback
  const getFamilyAvatar = (member?: FamilyMember) => {
    if (member?.avatar) return member.avatar
    
    // Generate a warm, family-appropriate avatar based on relationship
    const relationshipEmojis: { [key: string]: string } = {
      'parent': '👤',
      'grandparent': '👴',
      'spouse': '💑',
      'sibling': '👥',
      'child': '👶',
      'friend': '🫂',
      'mentor': '🌟'
    }
    
    const relationship = member?.relationship?.toLowerCase() || 'family'
    return relationshipEmojis[relationship] || '👤'
  }

  return (
    <div className="mobile-full-height bg-heaven-gradient py-4 sm:py-8 relative overflow-hidden">
      {/* Background sparkles for magical feeling */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-hope-300 rounded-full animate-pulse" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-comfort-300 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-memory-300 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-hope-300 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6 relative z-10">
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
          {/* Subtle background pattern for legacy feeling */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-hope-100 via-transparent to-comfort-100"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,_rgba(120,119,198,0.3),_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(255,119,198,0.3),_transparent_50%),radial-gradient(circle_at_40%_40%,_rgba(120,219,255,0.3),_transparent_50%)] animate-gentle-pulse"></div>
          </div>
          
          <CardHeader className="text-center px-4 sm:px-6 relative z-10">
            {/* Enhanced Family Member Context Display */}
            {familyMember ? (
              <div className="space-y-4">
                {/* Family Member Profile */}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 flex items-center justify-center text-2xl shadow-lg border-2 border-white">
                      {getFamilyAvatar(familyMember)}
                    </div>
                    {familyMember.voiceCloned && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                        <span className="text-xs text-white">🎵</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <CardTitle className="text-lg sm:text-xl font-compassionate text-hope-800 mb-1">
                      {familyMember.name}
                    </CardTitle>
                    <div className="flex items-center justify-center gap-2 text-sm text-peace-600">
                      <span className="font-supportive capitalize">{familyMember.relationship}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="font-supportive">AI Echo</span>
                    </div>
                  </div>
                </div>
                
                {/* Family Member Essence Indicators */}
                {(familyMember.traits || familyMember.wisdomThemes) && (
                  <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                    {familyMember.wisdomThemes?.slice(0, 3).map((theme, index) => (
                      <Badge 
                        key={index}
                        className="bg-hope-100 text-hope-700 hover:bg-hope-200 transition-colors duration-300 text-xs px-2 py-1"
                      >
                        {theme}
                      </Badge>
                    )) || familyMember.traits?.slice(0, 3).map((trait, index) => (
                      <Badge 
                        key={index}
                        className="bg-comfort-100 text-comfort-700 hover:bg-comfort-200 transition-colors duration-300 text-xs px-2 py-1"
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Significance Message */}
                {familyMember.significance && (
                  <p className="text-sm text-peace-600 font-supportive italic max-w-md mx-auto leading-relaxed">
                    &ldquo;{familyMember.significance}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <CardTitle className="text-lg sm:text-xl font-compassionate text-hope-800 mb-1">
                Your Personal AI Echo
              </CardTitle>
            )}
          </CardHeader>
          
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6 relative z-10">
            {/* Enhanced Chat Messages Display */}
            <div className="h-80 sm:h-96 overflow-y-auto space-y-4 mb-4 border border-hope-200/50 rounded-embrace bg-white/40 backdrop-blur-sm p-4 mobile-scroll shadow-inner">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-embrace text-sm sm:text-base transition-all duration-300 hover:shadow-md ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-hope-500 to-comfort-500 text-white shadow-md hover:shadow-lg'
                        : `${getEmotionStyling(message.emotion)} text-peace-800 border border-hope-200/50`
                    }`}
                    style={{
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    {/* Message content with emotional tone indicator */}
                    <div className="relative">
                      {message.role === 'assistant' && message.emotion && (
                        <div className="absolute -left-2 -top-1 text-lg opacity-60">
                          {getEmotionIcon(message.emotion)}
                        </div>
                      )}
                      <p className="font-compassionate leading-relaxed pl-2">{message.content}</p>
                      
                      {/* Subtle emotional tone label for assistant messages */}
                      {message.role === 'assistant' && message.emotion && (
                        <div className="mt-2 text-xs text-peace-500 italic capitalize pl-2">
                          {message.emotion === 'loving' && 'Shared with love'}
                          {message.emotion === 'wise' && 'Wisdom from experience'}
                          {message.emotion === 'reflective' && 'A treasured memory'}
                          {message.emotion === 'comforting' && 'Gentle comfort'}
                          {message.emotion === 'warm' && 'With warmth'}
                        </div>
                      )}
                    </div>
                    
                    {/* Voice Controls for Assistant Messages */}
                    {message.role === 'assistant' && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {message.audioLoading ? (
                          <div className="flex items-center gap-2 text-xs text-peace-600">
                            <div className="w-3 h-3 border border-hope-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Preparing voice...</span>
                          </div>
                        ) : message.audioUrl ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => message.isPlaying ? stopAudio() : playAudio(message.id, message.audioUrl!)}
                              className="h-8 px-3 bg-white/60 hover:bg-white/80 border-hope-300 text-peace-700 hover:text-peace-800"
                            >
                              {message.isPlaying ? (
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-hope-500 rounded-sm"></div>
                                  <span className="text-xs">Stop</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <div className="w-0 h-0 border-l-[6px] border-l-hope-500 border-y-[4px] border-y-transparent"></div>
                                  <span className="text-xs">Play</span>
                                </div>
                              )}
                            </Button>
                            {message.isPlaying && (
                              <div className="flex items-center gap-1 text-xs text-hope-600">
                                <div className="w-2 h-2 bg-hope-500 rounded-full animate-pulse"></div>
                                <span>Playing {familyMember ? `${familyMember.name}'s voice` : 'your voice'}</span>
                              </div>
                            )}
                            {message.voiceQuality && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-peace-600">Quality:</span>
                                <span className={`font-medium ${
                                  message.voiceQuality === 'excellent' ? 'text-green-600' :
                                  message.voiceQuality === 'good' ? 'text-blue-600' :
                                  message.voiceQuality === 'fair' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {message.voiceQuality}
                                </span>
                                {message.generationTime && (
                                  <span className="text-peace-500 ml-1">
                                    ({message.generationTime < 2 ? 'Fast' : message.generationTime < 5 ? 'Normal' : 'Slow'})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : message.voiceError ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryVoiceSynthesis(message.id, message.content)}
                              className="h-8 px-3 bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-700 hover:text-orange-800"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs">🔄</span>
                                <span className="text-xs">Retry Voice</span>
                              </div>
                            </Button>
                            <div className="text-xs text-orange-600">
                              {message.voiceErrorDetails?.needsUpdate 
                                ? 'Voice model needs training'
                                : message.voiceError
                              }
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                    
                    {/* Enhanced metadata for assistant messages */}
                    {message.role === 'assistant' && (
                      <div className="mt-3 pt-2 border-t border-hope-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-peace-500">
                          {message.confidence !== undefined && (
                            <span className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                message.confidence > 0.8 ? 'bg-green-400' :
                                message.confidence > 0.6 ? 'bg-yellow-400' : 'bg-orange-400'
                              }`}></div>
                              {Math.round(message.confidence * 100)}% authentic
                            </span>
                          )}
                          {familyMember && message.familyContext?.significance && (
                            <span className="italic text-peace-400">
                              • {message.familyContext.significance}
                            </span>
                          )}
                        </div>
                        {message.timestamp && (
                          <span className="text-peace-400">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-peace-50 to-hope-50 text-peace-800 border border-hope-200 p-3 rounded-embrace shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm font-compassionate">
                        {familyMember 
                          ? `${familyMember.name} is thinking...`
                          : 'Reflecting on your message...'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Enhanced Voice Settings Panel */}
            <div className="mb-4 p-4 bg-white/50 backdrop-blur-sm rounded-embrace border border-hope-200/50 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎵</span>
                  <h4 className="text-sm font-supportive text-peace-700">
                    {familyMember ? `${familyMember.name}'s Voice` : 'Voice Settings'}
                  </h4>
                </div>
                <div className="text-xs text-peace-500 bg-peace-50 px-2 py-1 rounded-comfort">
                  Alt+V to play/pause
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-supportive text-peace-600 flex items-center gap-1">
                    <span>🔊</span> Volume
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={voiceSettings.volume}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      className="flex-1 voice-slider"
                    />
                    <span className="text-xs text-peace-600 w-10 text-center bg-peace-50 px-1 py-0.5 rounded">
                      {Math.round(voiceSettings.volume * 100)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-supportive text-peace-600 flex items-center gap-1">
                    <span>⚡</span> Speed
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voiceSettings.playbackRate}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, playbackRate: parseFloat(e.target.value) }))}
                      className="flex-1 voice-slider"
                    />
                    <span className="text-xs text-peace-600 w-10 text-center bg-peace-50 px-1 py-0.5 rounded">
                      {voiceSettings.playbackRate}x
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-supportive text-peace-600 flex items-center gap-1">
                    <span>🎼</span> Auto-play
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoPlay"
                      checked={voiceSettings.autoPlay}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, autoPlay: e.target.checked }))}
                      className="w-4 h-4 text-hope-600 bg-white border-hope-300 rounded focus:ring-hope-500 focus:ring-2"
                    />
                    <label htmlFor="autoPlay" className="text-xs text-peace-600 cursor-pointer">
                      Play responses automatically
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Voice quality status */}
              {familyMember?.voiceCloned && (
                <div className="mt-3 pt-2 border-t border-hope-100 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-peace-500">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Voice clone active • Sounds like {familyMember.name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Input Area with Family Context */}
            <div className="space-y-3 sm:space-y-4">
              {/* Conversation Starter Suggestions */}
              {familyMember && messages.length <= 1 && (
                <div className="mb-4">
                  <p className="text-xs text-peace-600 mb-2 font-supportive">Try asking about:</p>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setInputValue(`Tell me about a favorite memory with ${familyMember.name}`)}
                      className="text-xs px-3 py-1 bg-hope-100 hover:bg-hope-200 text-hope-700 rounded-comfort transition-colors duration-200"
                    >
                      Favorite memories
                    </button>
                    <button 
                      onClick={() => setInputValue(`What advice would ${familyMember.name} give me?`)}
                      className="text-xs px-3 py-1 bg-comfort-100 hover:bg-comfort-200 text-comfort-700 rounded-comfort transition-colors duration-200"
                    >
                      Life advice
                    </button>
                    <button 
                      onClick={() => setInputValue(`What was ${familyMember.name} most proud of?`)}
                      className="text-xs px-3 py-1 bg-memory-100 hover:bg-memory-200 text-memory-700 rounded-comfort transition-colors duration-200"
                    >
                      Proud moments
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      familyMember 
                        ? `Share your thoughts with ${familyMember.name}... they&apos;re listening with love ❤️`
                        : "Share your thoughts... your AI echo is listening with care ✨"
                    }
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate resize-none transition-all duration-300 text-sm sm:text-base disabled:opacity-50 shadow-sm hover:shadow-md"
                    rows={2}
                    disabled={isLoading || isTyping}
                  />
                  {/* Character count for longer messages */}
                  {inputValue.length > 100 && (
                    <div className="absolute bottom-2 right-2 text-xs text-peace-400">
                      {inputValue.length} characters
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading || isTyping}
                  className="bg-gradient-to-br from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-comfort px-6 py-3 font-supportive text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed touch-target group"
                >
                  {isTyping ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">Listening...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Send</span>
                      <span className="text-lg group-hover:scale-110 transition-transform duration-200">💝</span>
                    </div>
                  )}
                </Button>
              </div>
              
              {/* Legacy preservation reminder */}
              {familyMember && messages.length > 3 && (
                <div className="text-center text-xs text-peace-500 italic font-supportive bg-hope-25 p-2 rounded-embrace border border-hope-100">
                  Every conversation preserves {familyMember.name}'s wisdom for future generations ✨
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Training Status with Family Context */}
        {trainingData && (
          <Card className="mobile-card bg-white/70 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                {familyMember ? (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-lg">{getFamilyAvatar(familyMember)}</span>
                      <h4 className="text-sm font-supportive text-peace-700">
                        {familyMember.name}'s AI Echo
                      </h4>
                    </div>
                    <p className="text-sm text-peace-600 font-supportive leading-relaxed">
                      Preserving {familyMember.name}&apos;s voice through {trainingData.responsesUsed} memories 
                      across {trainingData.categoriesCovered} life themes.
                    </p>
                    <p className="text-xs text-peace-500 mt-2 italic">
                      Their wisdom, love, and guidance live on through every conversation.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-peace-600 font-supportive">
                      This AI echo captures your unique voice through {trainingData.responsesUsed} responses 
                      covering {trainingData.categoriesCovered} different life topics.
                    </p>
                    <p className="text-xs text-peace-500 mt-1 italic">
                      The more you share, the better it becomes at reflecting your wisdom.
                    </p>
                  </div>
                )}
                
                {/* Training quality indicator */}
                <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-hope-100">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < Math.round((trainingData.confidence || 0) * 5) 
                            ? 'bg-hope-400' 
                            : 'bg-peace-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-peace-500">
                    {Math.round((trainingData.confidence || 0) * 100)}% voice authenticity
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}