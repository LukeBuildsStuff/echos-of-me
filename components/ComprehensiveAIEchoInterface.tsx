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
          ? `Hello, dear one. I'm ${familyMember.name}'s AI echo, carrying their voice, wisdom, and endless love for you. I'm here to share memories, offer guidance, and keep their spirit close to your heart. What would you like to talk about today?`
          : isDemo 
            ? `Hello! I'm your AI echo demonstration. I showcase how this technology can preserve the unique voice and wisdom of your loved ones. What would you like to explore?`
            : `Hello! I'm your AI echo, trained on your responses to preserve your unique voice and wisdom. What's on your heart today?`,
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 flex items-center justify-center text-sm">
              👤
            </div>
          )}
          <div>
            <h1 className="text-lg font-compassionate text-peace-800">
              {familyMember ? familyMember.name : 'Your AI Echo'}
            </h1>
            {familyMember && (
              <p className="text-xs text-peace-600">
                {familyMember.relationship} • AI Echo
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
        >
          Chat
        </Button>
        <Button
          variant={currentMode === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentMode('history')}
        >
          Memories
        </Button>
      </div>
    </div>
  )
  
  // Create sidebar content
  const sidebarContent = (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <h3 className="font-compassionate text-peace-800">
          {familyMember ? `${familyMember.name}'s Presence` : 'Your AI Echo'}
        </h3>
        <p className="text-sm text-peace-600 mt-1">
          Sacred space for connection
        </p>
      </div>
      
      <Button
        onClick={createNewSession}
        className="w-full bg-hope-500 hover:bg-hope-600 text-white"
      >
        New Conversation
      </Button>
      
      {familyMember && (
        <div className="bg-comfort-50 p-3 rounded-embrace border border-comfort-200">
          <p className="text-sm text-peace-700 italic text-center">
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
                ? `Share your thoughts with ${familyMember.name}... they're listening with love ❤️`
                : "Share your thoughts... your AI echo is listening with care ✨"
            }
            className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border-2 border-hope-200 rounded-3xl focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate resize-none transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md min-h-[52px] max-h-32"
            rows={1}
            disabled={isLoading || isTyping}
          />
        </div>
        
        <Button
          onClick={sendMessage}
          disabled={!inputValue.trim() || isLoading || isTyping}
          className="bg-gradient-to-br from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-2xl px-6 py-3 font-supportive shadow-lg hover:shadow-xl transition-all duration-300 min-h-[52px] disabled:opacity-50"
        >
          {isTyping ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="hidden sm:inline">Listening...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Send</span>
              <span className="text-lg">💝</span>
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