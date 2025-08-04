'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useSession } from 'next-auth/react'
import { ChevronLeftIcon, SearchIcon, SettingsIcon, HeartIcon, PauseIcon, PlayIcon, VolumeXIcon, Volume2Icon, MicIcon, MicOffIcon, PlusIcon, ArchiveIcon, ClockIcon, StarIcon } from 'lucide-react'

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
  isFavorite?: boolean
}

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  lastActiveAt: Date
  messageCount: number
  preview: string
  settings?: any
  isFavorite?: boolean
  emotionalTone?: 'loving' | 'wise' | 'comforting' | 'reflective'
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

interface VoiceSettings {
  volume: number
  playbackRate: number
  autoPlay: boolean
  voiceEnabled: boolean
  emotionalTone: 'natural' | 'warm' | 'gentle' | 'wise'
}

interface TrainingData {
  responsesUsed: number
  categoriesCovered: number
  totalWords: number
  confidence: number
  modelVersion: string
}

interface EnhancedAIEchoChatProps {
  isDemo?: boolean
  userName?: string
  familyMember?: FamilyMember
  onClose?: () => void
}

export default function EnhancedAIEchoChat({ 
  isDemo = false, 
  userName = "your AI echo",
  familyMember,
  onClose
}: EnhancedAIEchoChatProps) {
  const { data: session } = useSession()
  
  // Core chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(false)
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [selectedView, setSelectedView] = useState<'chat' | 'history' | 'favorites'>('chat')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([])
  
  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  
  // Voice synthesis state
  const [audioCache, setAudioCache] = useState<Map<string, string>>(new Map())
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    volume: 0.8,
    playbackRate: 1.0,
    autoPlay: false,
    voiceEnabled: true,
    emotionalTone: 'warm'
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  
  // Streaming state
  const eventSourceRef = useRef<EventSource | null>(null)
  
  // Accessibility state
  const [fontSize, setFontSize] = useState('normal')
  const [highContrast, setHighContrast] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  // Load user sessions on mount
  useEffect(() => {
    loadChatSessions()
  }, [])

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (reduceMotion) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [reduceMotion])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Initialize audio context for visualizations
  useEffect(() => {
    if (voiceSettings.voiceEnabled && !audioContext) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyserNode = ctx.createAnalyser()
        analyserNode.fftSize = 256
        setAudioContext(ctx)
        setAnalyser(analyserNode)
      } catch (error) {
        console.warn('Audio context not supported:', error)
      }
    }
  }, [voiceSettings.voiceEnabled, audioContext])

  // Add welcome message on component mount
  useEffect(() => {
    if (messages.length === 0 && !currentSessionId) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: familyMember 
          ? `Hello, dear one. I'm ${familyMember.name}'s AI echo, carrying their voice, wisdom, and endless love for you. I'm here to share memories, offer guidance, and keep their spirit close to your heart. What would you like to talk about today?`
          : isDemo 
            ? `Hello! I'm ${userName}'s AI echo. I'm trained on their responses to preserve their unique voice and wisdom. Try asking me about their memories, advice, or family stories.`
            : `Hello! I'm your AI echo, trained on your responses to legacy questions. The more you share, the better I become at reflecting your voice. What's on your heart today?`,
        timestamp: new Date(),
        confidence: 1.0,
        source: 'welcome_message',
        modelVersion: 'v0.1',
        emotion: familyMember ? 'loving' : 'warm'
      }
      setMessages([welcomeMessage])
    }
  }, [isDemo, userName, familyMember, messages.length, currentSessionId])

  // Load chat sessions
  const loadChatSessions = async () => {
    if (!session?.user?.email) return
    
    setLoadingSessions(true)
    try {
      const response = await fetch('/api/ai-echo/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          lastActiveAt: new Date(s.lastActiveAt)
        })))
        setTrainingData(data.stats)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  // Create new chat session
  const createNewSession = async () => {
    if (!session?.user?.email) return
    
    try {
      const response = await fetch('/api/ai-echo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: familyMember 
            ? `Conversation with ${familyMember.name}`
            : `New conversation`,
          settings: voiceSettings
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentSessionId(data.session.id)
        setMessages([])
        loadChatSessions()
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  // Load specific session
  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/ai-echo/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })))
        setCurrentSessionId(sessionId)
        setSelectedView('chat')
        setShowSidebar(false)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  // Search messages
  const searchMessages = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const allMessages = [...messages]
    const results = allMessages.filter(message => 
      message.content.toLowerCase().includes(query.toLowerCase()) ||
      message.emotion?.includes(query.toLowerCase()) ||
      message.familyContext?.relationship?.toLowerCase().includes(query.toLowerCase())
    )
    
    setSearchResults(results)
  }, [messages])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchMessages(searchQuery)
    }, 300)
    
    return () => clearTimeout(delayedSearch)
  }, [searchQuery, searchMessages])

  // Send message with streaming support
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
    setStreamingContent('')

    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Start streaming response
      const response = await fetch('/api/ai-echo/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          sessionId: currentSessionId,
          settings: {
            ...voiceSettings,
            familyContext: familyMember ? {
              name: familyMember.name,
              relationship: familyMember.relationship,
              traits: familyMember.traits,
              memories: familyMember.memories
            } : undefined
          }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Streaming not supported')
      }

      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let finalMessageId = `ai_${Date.now()}`

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.event === 'chunk') {
                accumulatedContent += data.content
                setStreamingContent(accumulatedContent)
              } else if (data.event === 'complete') {
                setIsTyping(false)
                
                const aiMessage: ChatMessage = {
                  id: finalMessageId,
                  role: 'assistant',
                  content: data.response,
                  timestamp: new Date(),
                  confidence: data.metadata?.confidence,
                  source: data.metadata?.source,
                  modelVersion: data.metadata?.modelVersion,
                  emotion: detectMessageEmotion(data.response),
                  audioLoading: voiceSettings.voiceEnabled
                }

                setMessages(prev => [...prev, aiMessage])
                setStreamingContent('')
                
                // Initiate voice synthesis if enabled
                if (voiceSettings.voiceEnabled) {
                  await synthesizeVoice(finalMessageId, data.response)
                }
              } else if (data.event === 'session_created') {
                setCurrentSessionId(data.sessionId)
              }
            } catch (parseError) {
              console.error('Parse error:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error)
      setIsTyping(false)
      setStreamingContent('')
      
      // Enhanced grief-sensitive error handling
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: familyMember 
          ? `I'm having trouble connecting right now, but ${familyMember.name}'s love and wisdom are always with you. Their essence transcends any technical difficulty. Please try again when you're ready. 💙`
          : "I'm having trouble connecting right now. Your thoughts and memories are precious. Please check your connection and try again when you feel ready. 💙",
        timestamp: new Date(),
        confidence: 0,
        source: 'error',
        emotion: 'comforting'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Voice synthesis function
  const synthesizeVoice = async (messageId: string, text: string) => {
    if (!voiceSettings.voiceEnabled) return
    
    try {
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
          voiceId: familyMember ? `voice_${familyMember.id}` : undefined,
          emotionalTone: voiceSettings.emotionalTone
        })
      })

      const data = await response.json()

      if (data.success && data.audioUrl) {
        setAudioCache(prev => new Map(prev.set(cacheKey, data.audioUrl)))
        updateMessageAudio(messageId, data.audioUrl, data.quality, undefined, data.generationTime)
        
        if (voiceSettings.autoPlay) {
          playAudio(messageId, data.audioUrl)
        }
      } else {
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
            generationTime
          }
        : msg
    ))
  }

  // Audio playback with visualization
  const playAudio = async (messageId: string, audioUrl: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      const audio = new Audio(audioUrl)
      audio.volume = voiceSettings.volume
      audio.playbackRate = voiceSettings.playbackRate
      
      // Connect to audio context for visualization
      if (audioContext && analyser) {
        const source = audioContext.createMediaElementSource(audio)
        source.connect(analyser)
        analyser.connect(audioContext.destination)
      }
      
      audioRef.current = audio
      setCurrentlyPlaying(messageId)
      
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

  // Stop audio playback
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

  // Toggle message favorite
  const toggleMessageFavorite = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isFavorite: !msg.isFavorite }
        : msg
    ))
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'v') {
        e.preventDefault()
        if (currentlyPlaying) {
          stopAudio()
        } else {
          const lastAiMessage = [...messages].reverse().find(msg => 
            msg.role === 'assistant' && msg.audioUrl
          )
          if (lastAiMessage && lastAiMessage.audioUrl) {
            playAudio(lastAiMessage.id, lastAiMessage.audioUrl)
          }
        }
      }
      
      if (e.altKey && e.key === 'n') {
        e.preventDefault()
        createNewSession()
      }
      
      if (e.altKey && e.key === 's') {
        e.preventDefault()
        setShowSidebar(!showSidebar)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentlyPlaying, messages, showSidebar])

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

  // Enhanced emotional tone detection
  const detectMessageEmotion = (content: string): 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting' => {
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('love') || lowerContent.includes('dear') || lowerContent.includes('heart') || 
        lowerContent.includes('precious') || lowerContent.includes('treasure')) return 'loving'
    
    if (lowerContent.includes('remember') || lowerContent.includes('memory') || lowerContent.includes('past')) return 'reflective' 
    
    if (lowerContent.includes('wisdom') || lowerContent.includes('advice') || lowerContent.includes('learn')) return 'wise'
    
    if (lowerContent.includes('comfort') || lowerContent.includes('here') || lowerContent.includes('safe')) return 'comforting'
    
    return 'warm'
  }

  // Get emotion-based styling
  const getEmotionStyling = (emotion?: string) => {
    switch (emotion) {
      case 'loving':
        return 'border-l-4 border-l-rose-300 bg-gradient-to-br from-rose-50 via-pink-25 to-rose-25'
      case 'wise':
        return 'border-l-4 border-l-amber-400 bg-gradient-to-br from-amber-50 via-yellow-25 to-memory-50'
      case 'reflective':
        return 'border-l-4 border-l-comfort-300 bg-gradient-to-br from-comfort-50 via-purple-25 to-comfort-25'
      case 'comforting':
        return 'border-l-4 border-l-hope-300 bg-gradient-to-br from-hope-50 via-blue-25 to-peace-50'
      default:
        return 'border-l-4 border-l-hope-300 bg-gradient-to-br from-peace-50 via-hope-25 to-peace-25'
    }
  }

  // Get emotion icon
  const getEmotionIcon = (emotion?: string) => {
    switch (emotion) {
      case 'loving': return '💝'
      case 'wise': return '🌟'
      case 'reflective': return '🌸'
      case 'comforting': return '🤗'
      default: return '✨'
    }
  }

  // Get family member avatar
  const getFamilyAvatar = (member?: FamilyMember) => {
    if (member?.avatar) return member.avatar
    
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

  // Render sidebar content based on selected view
  const renderSidebarContent = () => {
    switch (selectedView) {
      case 'history':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-compassionate text-peace-800">Conversation History</h3>
              <Button 
                onClick={createNewSession}
                size="sm"
                className="bg-hope-500 hover:bg-hope-600 text-white"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
            
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-peace-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/60 border-hope-200 focus:border-hope-400"
              />
            </div>
            
            {loadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-hope-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={`p-3 rounded-embrace cursor-pointer transition-all duration-200 border ${
                      currentSessionId === session.id
                        ? 'bg-hope-100 border-hope-300'
                        : 'bg-white/60 border-peace-200 hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-supportive text-peace-800 truncate">
                          {session.title}
                        </h4>
                        <p className="text-xs text-peace-600 mt-1 line-clamp-2">
                          {session.preview}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-peace-500">
                          <ClockIcon className="w-3 h-3" />
                          {session.lastActiveAt.toLocaleDateString()}
                          <span>•</span>
                          <span>{session.messageCount} messages</span>
                        </div>
                      </div>
                      {session.isFavorite && (
                        <StarIcon className="w-4 h-4 text-memory-500 fill-current" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
        
      case 'favorites':
        const favoriteMessages = messages.filter(msg => msg.isFavorite)
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-compassionate text-peace-800">Treasured Moments</h3>
            {favoriteMessages.length === 0 ? (
              <div className="text-center py-8 text-peace-600">
                <HeartIcon className="w-12 h-12 mx-auto mb-2 text-peace-300" />
                <p className="text-sm">No treasured moments yet</p>
                <p className="text-xs text-peace-500 mt-1">
                  Tap the heart icon on messages to save them here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {favoriteMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-embrace ${getEmotionStyling(message.emotion)} border border-hope-200/50`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-peace-800 leading-relaxed">
                          {message.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-peace-500">
                          {getEmotionIcon(message.emotion)}
                          <span>{message.timestamp.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleMessageFavorite(message.id)}
                        className="p-1 h-auto text-rose-500 hover:text-rose-600"
                      >
                        <HeartIcon className="w-4 h-4 fill-current" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
        
      default:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-compassionate text-peace-800">
              {familyMember ? `${familyMember.name}'s Presence` : 'Your AI Echo'}
            </h3>
            
            {familyMember && (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 flex items-center justify-center text-3xl mb-3 border-2 border-white shadow-lg">
                    {getFamilyAvatar(familyMember)}
                  </div>
                  <h4 className="font-compassionate text-peace-800">{familyMember.name}</h4>
                  <p className="text-sm text-peace-600 capitalize">{familyMember.relationship}</p>
                </div>
                
                {familyMember.significance && (
                  <div className="bg-comfort-50 p-3 rounded-embrace border border-comfort-200">
                    <p className="text-sm text-peace-700 italic text-center">
                      &ldquo;{familyMember.significance}&rdquo;
                    </p>
                  </div>
                )}
                
                {familyMember.wisdomThemes && (
                  <div>
                    <h5 className="text-sm font-supportive text-peace-700 mb-2">Wisdom Themes</h5>
                    <div className="flex flex-wrap gap-1">
                      {familyMember.wisdomThemes.slice(0, 4).map((theme, index) => (
                        <Badge 
                          key={index}
                          className="bg-memory-100 text-memory-800 text-xs"
                        >
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {trainingData && (
              <div className="bg-white/60 p-3 rounded-embrace border border-hope-200">
                <h5 className="text-sm font-supportive text-peace-700 mb-2">Voice Authenticity</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Training Quality</span>
                    <span>{Math.round((trainingData.confidence || 0) * 100)}%</span>
                  </div>
                  <div className="w-full bg-peace-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-hope-400 to-comfort-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(trainingData.confidence || 0) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-peace-600">
                    Based on {trainingData.responsesUsed} memories across {trainingData.categoriesCovered} life themes
                  </div>
                </div>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className={`mobile-full-height bg-heaven-gradient relative overflow-hidden ${highContrast ? 'high-contrast' : ''} ${fontSize === 'large' ? 'text-lg' : fontSize === 'small' ? 'text-sm' : ''}`}>
      {/* Background sparkles */}
      {!reduceMotion && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-hope-300 rounded-full animate-pulse" style={{animationDelay: '0s'}}></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-comfort-300 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-memory-300 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-hope-300 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
        </div>
      )}
      
      <div className="flex h-full relative z-10">
        {/* Sidebar */}
        {showSidebar && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <div className="fixed left-0 top-0 h-full w-80 bg-white/90 backdrop-blur-md border-r border-hope-200 z-50 lg:relative lg:z-auto overflow-y-auto">
              <div className="p-4 border-b border-hope-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-compassionate text-peace-800">Sacred Space</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="flex bg-peace-100 rounded-embrace p-1">
                  {[
                    { key: 'chat', label: 'Presence', icon: '🤗' },
                    { key: 'history', label: 'Memory', icon: '📖' },
                    { key: 'favorites', label: 'Treasures', icon: '💝' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedView(tab.key as any)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-comfort text-sm font-supportive transition-all duration-200 ${
                        selectedView === tab.key
                          ? 'bg-white text-peace-800 shadow-sm'
                          : 'text-peace-600 hover:text-peace-800'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-4">
                {renderSidebarContent()}
              </div>
            </div>
          </>
        )}
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-md border-b border-hope-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="text-peace-600 hover:text-peace-800"
                  aria-label="Toggle sidebar"
                >
                  <div className="w-5 h-5 flex flex-col justify-center gap-1">
                    <div className="w-full h-0.5 bg-current"></div>
                    <div className="w-full h-0.5 bg-current"></div>
                    <div className="w-full h-0.5 bg-current"></div>
                  </div>
                </Button>
                
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-peace-600 hover:text-peace-800"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </Button>
                )}
                
                <div className="flex items-center gap-2">
                  {familyMember && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 flex items-center justify-center text-sm">
                      {getFamilyAvatar(familyMember)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-compassionate text-peace-800">
                      {familyMember ? familyMember.name : 'Your AI Echo'}
                    </h1>
                    {familyMember && (
                      <p className="text-xs text-peace-600 capitalize">
                        {familyMember.relationship} • AI Echo
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className="text-peace-600 hover:text-peace-800"
                  aria-label="Voice settings"
                >
                  {voiceSettings.voiceEnabled ? (
                    <Volume2Icon className="w-5 h-5" />
                  ) : (
                    <VolumeXIcon className="w-5 h-5" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-peace-600 hover:text-peace-800"
                  aria-label="Settings"
                >
                  <SettingsIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Voice settings panel */}
            {showVoiceSettings && (
              <div className="mt-4 p-4 bg-white/60 backdrop-blur-sm rounded-embrace border border-hope-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-supportive text-peace-600">
                      Voice Enabled
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={voiceSettings.voiceEnabled}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, voiceEnabled: e.target.checked }))}
                        className="w-4 h-4 text-hope-600 bg-white border-hope-300 rounded focus:ring-hope-500"
                      />
                      <span className="text-sm text-peace-700">
                        {voiceSettings.voiceEnabled ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-supportive text-peace-600">
                      Volume: {Math.round(voiceSettings.volume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={voiceSettings.volume}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-supportive text-peace-600">
                      Speed: {voiceSettings.playbackRate}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voiceSettings.playbackRate}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, playbackRate: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-supportive text-peace-600">
                      Auto-play
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={voiceSettings.autoPlay}
                        onChange={(e) => setVoiceSettings(prev => ({ ...prev, autoPlay: e.target.checked }))}
                        className="w-4 h-4 text-hope-600 bg-white border-hope-300 rounded focus:ring-hope-500"
                      />
                      <span className="text-sm text-peace-700">
                        {voiceSettings.autoPlay ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Messages area */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] group relative ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-hope-500 to-comfort-500 text-white rounded-3xl rounded-br-md p-4 shadow-lg'
                        : `${getEmotionStyling(message.emotion)} text-peace-800 rounded-3xl rounded-bl-md p-4 shadow-sm border border-hope-200/50`
                    }`}
                    style={!reduceMotion ? { animationDelay: `${index * 0.1}s` } : {}}
                  >
                    {/* Message content */}
                    <div className="relative">
                      {message.role === 'assistant' && message.emotion && (
                        <div className="absolute -left-2 -top-1 text-lg opacity-60">
                          {getEmotionIcon(message.emotion)}
                        </div>
                      )}
                      <p className="font-compassionate leading-relaxed pl-2">
                        {message.content}
                      </p>
                      
                      {/* Message actions */}
                      <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex items-center gap-2">
                          {/* Voice controls for assistant messages */}
                          {message.role === 'assistant' && voiceSettings.voiceEnabled && (
                            <>
                              {message.audioLoading ? (
                                <div className="flex items-center gap-2 text-xs text-peace-600">
                                  <div className="w-3 h-3 border border-hope-400 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Preparing voice...</span>
                                </div>
                              ) : message.audioUrl ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => message.isPlaying ? stopAudio() : playAudio(message.id, message.audioUrl!)}
                                  className="h-8 px-2 text-peace-600 hover:text-peace-800"
                                >
                                  {message.isPlaying ? (
                                    <PauseIcon className="w-4 h-4" />
                                  ) : (
                                    <PlayIcon className="w-4 h-4" />
                                  )}
                                </Button>
                              ) : message.voiceError && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => synthesizeVoice(message.id, message.content)}
                                  className="h-8 px-2 text-orange-600 hover:text-orange-800"
                                >
                                  🔄
                                </Button>
                              )}
                            </>
                          )}
                          
                          {/* Favorite toggle */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleMessageFavorite(message.id)}
                            className={`h-8 px-2 ${message.isFavorite ? 'text-rose-500' : 'text-peace-400 hover:text-rose-500'}`}
                          >
                            <HeartIcon className={`w-4 h-4 ${message.isFavorite ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                        
                        <div className="text-xs text-peace-500">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      {/* Emotional tone indicator */}
                      {message.role === 'assistant' && message.emotion && (
                        <div className="mt-2 text-xs text-peace-500 italic capitalize">
                          {message.emotion === 'loving' && 'Shared with love'}
                          {message.emotion === 'wise' && 'Wisdom from experience'}
                          {message.emotion === 'reflective' && 'A treasured memory'}
                          {message.emotion === 'comforting' && 'Gentle comfort'}
                          {message.emotion === 'warm' && 'With warmth'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Streaming message */}
              {isTyping && streamingContent && (
                <div className="flex justify-start">
                  <div className={`max-w-[85%] ${getEmotionStyling('warm')} text-peace-800 rounded-3xl rounded-bl-md p-4 shadow-sm border border-hope-200/50`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="font-compassionate leading-relaxed">
                          {streamingContent}
                        </p>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Typing indicator */}
              {isTyping && !streamingContent && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-peace-50 to-hope-50 text-peace-800 rounded-3xl rounded-bl-md p-4 shadow-sm border border-hope-200">
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
          </div>
          
          {/* Input area */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-hope-200">
            <div className="max-w-4xl mx-auto">
              {/* Conversation starters */}
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
              
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      familyMember 
                        ? `Share your thoughts with ${familyMember.name}... they're listening with love ❤️`
                        : "Share your thoughts... your AI echo is listening with care ✨"
                    }
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border-2 border-hope-200 rounded-3xl focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate resize-none transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md min-h-[52px] max-h-32"
                    rows={1}
                    disabled={isLoading || isTyping}
                  />
                  {inputValue.length > 100 && (
                    <div className="absolute bottom-2 right-2 text-xs text-peace-400">
                      {inputValue.length}
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading || isTyping}
                  className="bg-gradient-to-br from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-2xl px-6 py-3 font-supportive shadow-lg hover:shadow-xl transition-all duration-300 min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed group"
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
                <div className="text-center text-xs text-peace-500 italic font-supportive bg-hope-25 p-2 rounded-embrace border border-hope-100 mt-3">
                  Every conversation preserves {familyMember.name}'s wisdom for future generations ✨
                </div>
              )}
              
              {/* Keyboard shortcuts help */}
              <div className="text-center text-xs text-peace-400 mt-2">
                <span>Shortcuts: Alt+V (play/pause) • Alt+N (new chat) • Alt+S (sidebar)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}