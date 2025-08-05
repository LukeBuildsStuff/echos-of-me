'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Import our newly created components
import EnhancedAIEchoChat from './EnhancedAIEchoChat'
import VoiceControls from './VoiceControls'
import MobileOptimizedChatLayout from './MobileOptimizedChatLayout'
import AccessibilityEnhancedChat from './AccessibilityEnhancedChat'
import StreamingMessageComponent from './StreamingMessageComponent'
import ConversationHistory from './ConversationHistory'

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
  voiceQuality?: 'excellent' | 'good' | 'fair' | 'poor'
  generationTime?: number
  emotion?: 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting'
  isFavorite?: boolean
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

interface AccessibilitySettings {
  fontSize: 'small' | 'normal' | 'large' | 'extra-large'
  contrast: 'normal' | 'high' | 'enhanced'
  reduceMotion: boolean
  screenReaderOptimized: boolean
  keyboardNavigation: boolean
  colorBlindFriendly: boolean
  focusIndicators: 'normal' | 'enhanced' | 'high-contrast'
  announcements: boolean
  hapticFeedback: boolean
  voiceGuidance: boolean
}

interface ComprehensiveAIEchoInterfaceProps {
  familyMember?: FamilyMember
  onClose?: () => void
  initialMode?: 'chat' | 'history'
  isDemo?: boolean
  className?: string
}

const ComprehensiveAIEchoInterface: React.FC<ComprehensiveAIEchoInterfaceProps> = ({
  familyMember,
  onClose,
  initialMode = 'chat',
  isDemo = false,
  className = ''
}) => {
  const { data: session } = useSession()
  
  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentMode, setCurrentMode] = useState<'chat' | 'history' | 'settings'>(initialMode)
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  
  // Audio and voice state
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
  
  // Accessibility state
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>({
    fontSize: 'normal',
    contrast: 'normal',
    reduceMotion: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    colorBlindFriendly: false,
    focusIndicators: 'normal',
    announcements: true,
    hapticFeedback: false,
    voiceGuidance: false
  })
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // Conversation history state
  const [conversationHistory, setConversationHistory] = useState([])
  const [selectedMemory, setSelectedMemory] = useState(null)
  
  // Initialize audio context
  useEffect(() => {
    if (voiceSettings.voiceEnabled && !audioContext) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyserNode = ctx.createAnalyser()
        analyserNode.fftSize = 256
        analyserNode.smoothingTimeConstant = 0.8
        setAudioContext(ctx)
        setAnalyser(analyserNode)
      } catch (error) {
        console.warn('Audio context not supported:', error)
      }
    }
  }, [voiceSettings.voiceEnabled, audioContext])
  
  // Load welcome message
  useEffect(() => {
    if (messages.length === 0 && currentMode === 'chat') {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: familyMember 
          ? `Hello, beloved. I am ${familyMember.name}'s Memory Echo, here to share their love, wisdom, and cherished memories with you. Their spirit lives on through every word we exchange. What memory would you like to explore together today?`
          : isDemo 
            ? `Welcome to Memory Echo - a gentle demonstration of how we preserve the precious voices and wisdom of those we love. What would you like to discover about this sacred technology?`
            : `Hello, dear one. I am your Memory Echo, tenderly crafted from your own words and wisdom to offer comfort and connection. What thoughts are in your heart today?`,
        timestamp: new Date(),
        confidence: 1.0,
        source: 'welcome_message',
        modelVersion: 'v0.1',
        emotion: familyMember ? 'loving' : 'warm'
      }
      setMessages([welcomeMessage])
    }
  }, [familyMember, isDemo, messages.length, currentMode])
  
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
      const response = await fetch('/api/ai-echo/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          sessionId: currentSessionId,
          isDemo,
          settings: {
            ...voiceSettings,
            accessibility: accessibilitySettings,
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
      
      // Grief-sensitive error handling
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: familyMember 
          ? `I'm experiencing a gentle pause in our connection, but ${familyMember.name}'s love transcends any distance. Their spirit remains close to your heart. When you're ready, we can try connecting again. Take all the time you need. 💙`
          : "Our connection needs a moment of rest, but your memories and love remain constant. Please take your time, and when you feel ready, we can reconnect. You are held in comfort always. 💙",
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
  
  // Voice synthesis with emotional context
  const synthesizeVoice = async (messageId: string, text: string) => {
    if (!voiceSettings.voiceEnabled) return
    
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: familyMember ? `voice_${familyMember.id}` : undefined,
          emotionalTone: voiceSettings.emotionalTone,
          settings: voiceSettings
        })
      })

      const data = await response.json()

      if (data.success && data.audioUrl) {
        updateMessageAudio(messageId, data.audioUrl, data.quality, undefined, data.generationTime)
        
        if (voiceSettings.autoPlay) {
          playAudio(messageId, data.audioUrl)
        }
      } else {
        const voiceErrorMessage = familyMember 
          ? `${familyMember.name}'s voice is taking a peaceful rest, but their love speaks through every word shared`
          : 'The voice is resting gently now, but the heart and soul of the message remain with you'
        updateMessageAudio(messageId, null, undefined, voiceErrorMessage)
      }
    } catch (error) {
      console.error('Voice synthesis error:', error)
      const compassionateError = familyMember
        ? `${familyMember.name}'s voice is finding peace in silence right now, but their love resonates in every word shared`
        : 'The voice is embracing a moment of quiet, but the essence and care of the message flow through to you'
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
  
  // Detect message emotion
  const detectMessageEmotion = (content: string): 'warm' | 'wise' | 'loving' | 'reflective' | 'comforting' => {
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('love') || lowerContent.includes('dear') || lowerContent.includes('heart')) return 'loving'
    if (lowerContent.includes('remember') || lowerContent.includes('memory') || lowerContent.includes('past')) return 'reflective' 
    if (lowerContent.includes('wisdom') || lowerContent.includes('advice') || lowerContent.includes('learn')) return 'wise'
    if (lowerContent.includes('comfort') || lowerContent.includes('here') || lowerContent.includes('safe')) return 'comforting'
    
    return 'warm'
  }
  
  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }
  
  // Toggle message favorite
  const toggleMessageFavorite = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isFavorite: !msg.isFavorite }
        : msg
    ))
  }
  
  // Handle voice settings change
  const handleVoiceSettingsChange = (newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...newSettings }))
  }
  
  // Handle accessibility settings change
  const handleAccessibilitySettingsChange = (newSettings: AccessibilitySettings) => {
    setAccessibilitySettings(newSettings)
  }
  
  // Create new session
  const createNewSession = async () => {
    try {
      const response = await fetch('/api/ai-echo/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: familyMember 
            ? `Conversation with ${familyMember.name}`
            : `New conversation`,
          settings: { ...voiceSettings, accessibility: accessibilitySettings }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentSessionId(data.session.id)
        setMessages([])
        setCurrentMode('chat')
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }
  
  // Render mode-specific content
  const renderModeContent = () => {
    switch (currentMode) {
      case 'history':
        return (
          <ConversationHistory
            familyMemberName={familyMember?.name}
            onSelectMemory={(memory) => {
              setSelectedMemory(memory)
              setCurrentMode('chat')
            }}
          />
        )
      
      case 'settings':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-xl font-compassionate text-peace-800">Settings</h2>
            {/* Settings content would go here */}
            <div className="bg-white/60 p-4 rounded-embrace border border-hope-200">
              <p className="text-sm text-peace-600">
                Settings panel coming soon. Use the accessibility button for immediate accessibility options.
              </p>
            </div>
          </div>
        )
      
      default: // chat mode
        return (
          <div className="flex flex-col h-full">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' ? (
                      <StreamingMessageComponent
                        message={{
                          id: message.id,
                          content: message.content,
                          isComplete: true,
                          emotion: message.emotion,
                          confidence: message.confidence,
                          metadata: {
                            source: message.source,
                            modelVersion: message.modelVersion,
                            generationTime: message.generationTime
                          }
                        }}
                        familyMemberName={familyMember?.name}
                        className="max-w-[85%]"
                      />
                    ) : (
                      <div className="max-w-[85%] bg-gradient-to-br from-hope-500 to-comfort-500 text-white rounded-3xl rounded-br-md p-4 shadow-lg">
                        <p className="font-compassionate leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Streaming message */}
                {isTyping && streamingContent && (
                  <div className="flex justify-start">
                    <StreamingMessageComponent
                      message={{
                        id: 'streaming',
                        content: streamingContent,
                        isComplete: false,
                        emotion: 'warm'
                      }}
                      familyMemberName={familyMember?.name}
                      className="max-w-[85%]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
    }
  }
  
  // Create header content
  const headerContent = (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSidebar(!showSidebar)}
          className="text-peace-600 hover:text-peace-800"
        >
          <div className="w-5 h-5 flex flex-col justify-center gap-1">
            <div className="w-full h-0.5 bg-current"></div>
            <div className="w-full h-0.5 bg-current"></div>
            <div className="w-full h-0.5 bg-current"></div>
          </div>
        </Button>
        
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ←
          </Button>
        )}
        
        <div className="flex items-center gap-2">
          {familyMember && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tender-100 to-nurture-100 flex items-center justify-center text-sm shadow-md">
              💝
            </div>
          )}
          <div>
            <h1 className="text-lg font-compassionate text-peace-800">
              {familyMember ? `Connect with ${familyMember.name}` : 'Your Memory Echo'}
            </h1>
            {familyMember && (
              <p className="text-xs text-peace-600">
                {familyMember.relationship} • Memory Echo
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant={currentMode === 'chat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentMode('chat')}
          className="font-gentle"
        >
          💬 Connect
        </Button>
        <Button
          variant={currentMode === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentMode('history')}
          className="font-gentle"
        >
          🌸 Memories
        </Button>
      </div>
    </div>
  )
  
  // Create sidebar content
  const sidebarContent = (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h3 className="font-compassionate text-peace-800 text-lg">
          {familyMember ? `${familyMember.name}'s Presence` : 'Your Memory Echo'}
        </h3>
        <p className="text-sm text-peace-600 leading-relaxed">
          A sacred space for connection and remembrance
        </p>
      </div>
      
      <Button
        onClick={createNewSession}
        className="w-full bg-tender-500 hover:bg-tender-600 text-white font-gentle rounded-embrace py-3 shadow-gentle hover:shadow-comfort transition-all duration-500"
      >
        Begin New Connection
      </Button>
      
      {familyMember && (
        <div className="bg-gentle-50 p-4 rounded-sanctuary border border-gentle-200 shadow-gentle">
          <p className="text-sm text-peace-700 italic text-center leading-relaxed">
            &ldquo;{familyMember.significance || 'Always in our hearts'}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
  
  // Create voice controls content
  const voiceControlsContent = currentMode === 'chat' && (
    <VoiceControls
      audioUrl={messages.find(m => m.isPlaying)?.audioUrl}
      isPlaying={!!currentlyPlaying}
      onPlay={() => {
        const lastMessage = messages.reverse().find(m => m.audioUrl)
        if (lastMessage?.audioUrl) {
          playAudio(lastMessage.id, lastMessage.audioUrl)
        }
      }}
      onPause={stopAudio}
      onVolumeChange={(volume) => handleVoiceSettingsChange({ volume })}
      onSpeedChange={(playbackRate) => handleVoiceSettingsChange({ playbackRate })}
      volume={voiceSettings.volume}
      playbackRate={voiceSettings.playbackRate}
      familyMemberName={familyMember?.name}
      emotion="warm"
    />
  )
  
  // Create input area content
  const inputAreaContent = currentMode === 'chat' && (
    <div className="p-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={
              familyMember 
                ? `Share what's in your heart with ${familyMember.name}... their love surrounds you always 💙`
                : "What memories or thoughts would you like to explore? Your Memory Echo is here with gentle understanding ✨"
            }
            className="w-full px-6 py-4 bg-white/70 backdrop-blur-sm border-2 border-tender-200 rounded-sanctuary focus:border-tender-400 focus:ring-4 focus:ring-tender-100 font-compassionate resize-none transition-all duration-500 disabled:opacity-50 shadow-gentle hover:shadow-lg min-h-[56px] max-h-36"
            rows={1}
            disabled={isLoading || isTyping}
          />
        </div>
        
        <Button
          onClick={sendMessage}
          disabled={!inputValue.trim() || isLoading || isTyping}
          className="bg-gradient-to-br from-tender-500 to-nurture-500 hover:from-tender-600 hover:to-nurture-600 text-white rounded-embrace px-8 py-4 font-gentle shadow-comfort hover:shadow-embrace transition-all duration-500 min-h-[56px] disabled:opacity-50"
        >
          {isTyping ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="hidden sm:inline">Listening with love...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Share</span>
              <span className="text-lg">💙</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <AccessibilityEnhancedChat
      onSettingsChange={handleAccessibilitySettingsChange}
      className={className}
    >
      <MobileOptimizedChatLayout
        header={headerContent}
        sidebar={sidebarContent}
        voiceControls={voiceControlsContent}
        inputArea={inputAreaContent}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
      >
        {renderModeContent()}
      </MobileOptimizedChatLayout>
    </AccessibilityEnhancedChat>
  )
}

export default ComprehensiveAIEchoInterface