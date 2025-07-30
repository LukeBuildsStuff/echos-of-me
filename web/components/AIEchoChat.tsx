'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
}

interface VoiceStatus {
  available: boolean
  enabled: boolean
  synthesizing: boolean
  error?: string
}

interface TrainingData {
  responsesUsed: number
  categoriesCovered: number
  totalWords: number
}

interface AIEchoChatProps {
  isDemo?: boolean
  userName?: string
}

export default function AIEchoChat({ isDemo = false, userName = "your AI echo" }: AIEchoChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null)
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceAvailable, setVoiceAvailable] = useState(false)
  const [voiceCheckComplete, setVoiceCheckComplete] = useState(false)
  const [showVoiceSetupCard, setShowVoiceSetupCard] = useState(false)
  const [audioState, setAudioState] = useState({
    volume: 0.8,
    playbackRate: 1.0
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRefs = useRef<{[key: string]: HTMLAudioElement}>({})

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Check if user has a voice profile available
    checkVoiceAvailability()
  }, [])

  const checkVoiceAvailability = async () => {
    try {
      // Check both voice data and training status
      const [voiceResponse, trainingResponse] = await Promise.all([
        fetch('/api/voice/upload', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/voice/train', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ])

      let hasVoiceData = false
      let hasTrainedModel = false
      let voiceStatus = 'not_setup'

      if (voiceResponse.ok) {
        const voiceData = await voiceResponse.json()
        hasVoiceData = voiceData.hasVoiceProfile
        console.log('Voice data check:', voiceData)
      }

      if (trainingResponse.ok) {
        const trainingData = await trainingResponse.json()
        hasTrainedModel = trainingData.hasTrainedModel
        voiceStatus = trainingData.status
        console.log('Training status check:', trainingData)
      }

      // Voice is available only if we have both data and trained model
      const isVoiceAvailable = hasVoiceData && hasTrainedModel && voiceStatus === 'completed'
      
      setVoiceAvailable(isVoiceAvailable)
      
      // Show setup card based on the current state
      if (!hasVoiceData) {
        setShowVoiceSetupCard(true) // Need to record voice passages
      } else if (!hasTrainedModel || voiceStatus !== 'completed') {
        setShowVoiceSetupCard(true) // Need to complete training
      } else {
        setShowVoiceSetupCard(false) // Voice is ready
      }

      console.log('Voice availability result:', {
        hasVoiceData,
        hasTrainedModel,
        voiceStatus,
        isVoiceAvailable
      })

    } catch (error) {
      console.log('Voice availability check failed:', error)
      setVoiceAvailable(false)
      setShowVoiceSetupCard(true)
    } finally {
      setVoiceCheckComplete(true)
    }
  }

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: isDemo 
          ? `Hello! I'm ${userName}'s AI echo. I'm trained on their responses to preserve their unique voice and wisdom. Try asking me about their memories, advice, or family.`
          : `Hello! I'm your AI echo, trained on your responses to legacy questions. The more you answer, the better I become at reflecting your voice. Ask me anything!`,
        timestamp: new Date(),
        confidence: 1.0,
        source: 'welcome_message',
        modelVersion: 'v0.1'
      }
      setMessages([welcomeMessage])
    }
  }, [isDemo, userName, messages.length])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai-echo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          isDemo,
          conversationId
        })
      })

      const data = await response.json()

      if (response.ok) {
        const aiMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          confidence: data.confidence,
          source: data.source,
          modelVersion: data.modelVersion,
          audioLoading: voiceEnabled
        }

        setMessages(prev => [...prev, aiMessage])
        
        // Generate voice synthesis if enabled
        if (voiceEnabled && voiceAvailable) {
          synthesizeVoice(aiMessage.id, data.response)
        }
        setTrainingData(data.trainingData)
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
        confidence: 0,
        source: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const synthesizeVoice = async (messageId: string, text: string, retryCount = 0) => {
    const maxRetries = 2
    
    try {
      // First, check if voice system is ready
      const healthCheck = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text.substring(0, 500), // Limit text length for better performance
          timeout: 20000 // 20 second timeout
        })
      })

      const data = await healthCheck.json()
      
      if (data.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                audioUrl: data.audioUrl, 
                audioLoading: false,
                voiceError: undefined // Clear any previous errors
              }
            : msg
        ))
        
        // Auto-play if this is the latest message
        setTimeout(() => {
          playAudio(messageId, data.audioUrl)
        }, 100)
        
        return // Success, exit function
      } 
      
      // Handle specific error types with appropriate user messaging
      let errorMessage = 'Voice is taking a moment to rest'
      let showRetry = true
      let showUpdate = false
      
      if (data.error === 'TTS system not available' || data.error === 'TTS model not available') {
        errorMessage = 'Voice system is starting up - this may take a minute'
        showRetry = true
      } else if (data.error === 'TTS model not loaded') {
        errorMessage = 'Your voice model is loading, please wait'
        showRetry = true
      } else if (data.error === 'Voice synthesis temporarily unavailable') {
        errorMessage = data.message || 'Voice service is refreshing'
        showRetry = true
      } else if (data.error && data.error.includes('Voice profile') && data.error.includes('not found')) {
        errorMessage = 'Voice model needs updating - please refresh your voice clone'
        showRetry = false
        showUpdate = true
      } else if (data.error === 'Unauthorized') {
        errorMessage = 'Voice authentication expired - please refresh the page'
        showRetry = false
      } else if (data.fallback) {
        errorMessage = data.message || 'Voice service temporarily unavailable'
        showRetry = data.retryable !== false
      }
      
      // Auto-retry for certain conditions
      if (showRetry && retryCount < maxRetries && 
          (data.error === 'TTS model not loaded' || data.error === 'TTS system not available')) {
        console.log(`Auto-retrying voice synthesis (attempt ${retryCount + 1}/${maxRetries})`)
        setTimeout(() => {
          synthesizeVoice(messageId, text, retryCount + 1)
        }, 3000 + (retryCount * 2000)) // Progressive delay
        
        // Update message to show retry status
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                audioLoading: true, 
                voiceError: `Retrying voice generation... (${retryCount + 1}/${maxRetries})`
              }
            : msg
        ))
        return
      }
      
      console.log('Voice synthesis failed:', {
        error: data.error,
        message: data.message,
        debug: data.debug,
        retryCount
      })
      
      // Update message with final error state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              audioLoading: false, 
              voiceError: errorMessage,
              voiceErrorDetails: {
                canRetry: showRetry,
                needsUpdate: showUpdate,
                originalError: data.error
              }
            }
          : msg
      ))
      
    } catch (networkError: any) {
      console.error('Voice synthesis network error:', networkError)
      
      let errorMessage = 'Voice service temporarily unavailable'
      if (networkError?.name === 'TypeError' || networkError?.message?.includes('fetch')) {
        errorMessage = 'Connection to voice service lost - check your internet'
      } else if (networkError?.name === 'AbortError') {
        errorMessage = 'Voice generation timed out - try a shorter message'
      }
      
      // Auto-retry network errors once
      if (retryCount === 0) {
        console.log('Retrying due to network error...')
        setTimeout(() => {
          synthesizeVoice(messageId, text, 1)
        }, 2000)
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, audioLoading: true, voiceError: 'Reconnecting to voice service...' }
            : msg
        ))
        return
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              audioLoading: false, 
              voiceError: errorMessage,
              voiceErrorDetails: {
                canRetry: true,
                needsUpdate: false,
                originalError: 'network_error'
              }
            }
          : msg
      ))
    }
  }

  const playAudio = async (messageId: string, audioUrl: string) => {
    try {
      // Stop any currently playing audio
      Object.values(audioRefs.current).forEach(audio => {
        if (!audio.paused) {
          audio.pause()
          audio.currentTime = 0
        }
      })

      // Update all messages to not playing
      setMessages(prev => prev.map(msg => ({ ...msg, isPlaying: false })))

      // Create or get audio element
      if (!audioRefs.current[messageId]) {
        audioRefs.current[messageId] = new Audio(audioUrl)
        
        // Apply current audio settings
        audioRefs.current[messageId].volume = audioState.volume
        audioRefs.current[messageId].playbackRate = audioState.playbackRate
        
        audioRefs.current[messageId].onended = () => {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, isPlaying: false } : msg
          ))
        }
      }

      // Play audio and update state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isPlaying: true } : msg
      ))
      
      await audioRefs.current[messageId].play()
    } catch (error) {
      console.error('Audio playback failed:', error)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isPlaying: false } : msg
      ))
    }
  }

  const stopAudio = (messageId: string) => {
    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].pause()
      audioRefs.current[messageId].currentTime = 0
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isPlaying: false } : msg
      ))
    }
  }

  const toggleVoiceWithFeedback = async () => {
    if (!voiceAvailable) {
      // Redirect to voice setup
      window.location.href = '/dashboard?view=voice-clone'
      return
    }
    
    if (!voiceEnabled) {
      // Before enabling voice, do a quick health check
      try {
        const healthResponse = await fetch('/api/voice/health', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json()
          const hasWorkingService = healthData.mlServices.some((s: any) => s.status === 'healthy')
          const voiceSystemReady = healthData.voiceSystem && 
            healthData.voiceSystem.tts_available && 
            healthData.voiceSystem.model_loaded
          
          if (!hasWorkingService) {
            // Show gentle message about service unavailability
            setMessages(prev => [...prev, {
              id: `system_${Date.now()}`,
              role: 'assistant',
              content: "Voice service is currently starting up. You can still chat with text responses, and voice will become available shortly.",
              timestamp: new Date(),
              confidence: 1.0,
              source: 'system_notification'
            }])
          } else if (!voiceSystemReady) {
            // Show message about voice system loading
            setMessages(prev => [...prev, {
              id: `system_${Date.now()}`,
              role: 'assistant',
              content: "Your voice is being prepared. You can enable voice mode now, and it will work for upcoming messages.",
              timestamp: new Date(),
              confidence: 1.0,
              source: 'system_notification'
            }])
          }
          
          console.log('Voice health check:', healthData)
        }
      } catch (error) {
        console.log('Voice health check failed:', error)
        // Continue anyway - user may still want to try
      }
    }
    
    setVoiceEnabled(prev => !prev)
  }

  const adjustAudioSettings = (setting: string, value: number) => {
    setAudioState(prev => ({
      ...prev,
      [setting]: value
    }))
    
    // Apply to all current audio elements
    Object.values(audioRefs.current).forEach(audio => {
      if (setting === 'volume') {
        audio.volume = value
      } else if (setting === 'playbackRate') {
        audio.playbackRate = value
      }
    })
  }

  const suggestedQuestions = [
    "What's the most important advice you'd give?",
    "Tell me about a favorite family memory",
    "What values matter most to you?",
    "What would you want me to remember about you?",
    "How did you handle difficult times?"
  ]

  // Add keyboard shortcut for voice toggle
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'v' && voiceAvailable) {
        e.preventDefault()
        setVoiceEnabled(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [voiceAvailable])

  return (
    <div className="mobile-full-height bg-heaven-gradient py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6" style={{ paddingLeft: 'max(0.75rem, var(--safe-area-inset-left))', paddingRight: 'max(0.75rem, var(--safe-area-inset-right))' }}>
        {/* Header */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="inline-block p-2 sm:p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-3 sm:mb-4 animate-float">
              <span className="text-2xl sm:text-3xl">🤖</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <CardTitle className="text-lg sm:text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent text-center">
                {isDemo ? `Chat with ${userName}'s AI Echo` : 'Chat with Your AI Echo'}
              </CardTitle>
              {voiceCheckComplete && (
                <div className="relative group">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={toggleVoiceWithFeedback}
                      variant={voiceEnabled ? "default" : "outline"}
                      size="sm"
                      className={`${
                        voiceEnabled 
                          ? 'bg-gradient-to-r from-hope-500 to-comfort-500 text-white shadow-lg' 
                          : voiceAvailable
                            ? 'border-2 border-hope-400 text-hope-700 hover:bg-hope-50'
                            : 'border-2 border-peace-300 text-peace-600 hover:bg-peace-50'
                      } rounded-comfort transition-all duration-300 min-w-[120px] sm:min-w-[140px] min-h-[44px] text-xs sm:text-sm`}
                      aria-label={voiceEnabled ? 'Turn off voice synthesis' : voiceAvailable ? 'Turn on voice synthesis' : 'Set up voice clone'}
                      aria-pressed={voiceEnabled}
                    >
                      <span className="mr-2" aria-hidden="true">
                        {voiceEnabled ? '🔊' : voiceAvailable ? '🔇' : '🎤'}
                      </span>
                      <span className="flex items-center gap-2">
                        {voiceEnabled ? 'Voice On' : voiceAvailable ? 'Voice Off' : 'Set Up Voice'}
                        {voiceEnabled && (
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" aria-hidden="true"></span>
                        )}
                      </span>
                    </Button>
                    
                    {/* Audio Settings Dropdown */}
                    {voiceEnabled && voiceAvailable && (
                      <div className="relative group">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-10 h-10 p-0 border-2 border-hope-400 text-hope-700 hover:bg-hope-50 rounded-comfort"
                          aria-label="Audio settings"
                        >
                          ⚙️
                        </Button>
                        
                        {/* Settings Panel */}
                        <div className="absolute hidden group-hover:block top-full mt-2 right-0 bg-white border border-hope-200 rounded-embrace p-3 shadow-lg z-20 min-w-[200px]">
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-supportive text-hope-800 block mb-1">
                                Volume: {Math.round(audioState.volume * 100)}%
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={audioState.volume}
                                onChange={(e) => adjustAudioSettings('volume', parseFloat(e.target.value))}
                                className="w-full h-2 bg-hope-200 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-supportive text-hope-800 block mb-1">
                                Speed: {audioState.playbackRate}x
                              </label>
                              <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={audioState.playbackRate}
                                onChange={(e) => adjustAudioSettings('playbackRate', parseFloat(e.target.value))}
                                className="w-full h-2 bg-hope-200 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Tooltip for keyboard shortcut */}
                  <div className="absolute hidden group-hover:block top-full mt-2 left-1/2 transform -translate-x-1/2 bg-peace-800 text-white text-xs px-3 py-2 rounded-embrace whitespace-nowrap z-10">
                    {voiceAvailable ? 'Press Alt+V to toggle voice' : 'Click to set up your voice'}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-peace-800 rotate-45"></div>
                  </div>
                </div>
              )}
            </div>
            {trainingData && (
              <div className="flex justify-center gap-1 sm:gap-2 mt-3 sm:mt-4 flex-wrap">
                <Badge variant="outline" className="bg-hope-50 border-hope-200 text-hope-700 text-xs px-2 py-1">
                  {trainingData.responsesUsed} memories
                </Badge>
                <Badge variant="outline" className="bg-comfort-50 border-comfort-200 text-comfort-700 text-xs px-2 py-1">
                  {trainingData.categoriesCovered} categories
                </Badge>
                <Badge variant="outline" className="bg-memory-50 border-memory-200 text-memory-700 text-xs px-2 py-1">
                  {trainingData.totalWords.toLocaleString()} words
                </Badge>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Voice Setup Card */}
        {showVoiceSetupCard && voiceCheckComplete && (
          <Card className="mobile-card bg-gradient-to-r from-hope-50 to-comfort-50 border-0 shadow-xl animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-white/80 shadow-md flex-shrink-0">
                  <span className="text-2xl" aria-hidden="true">🎤</span>
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-gentle text-peace-800 mb-2">
                    Voice Echo Setup
                  </h3>
                  <p className="text-peace-600 font-supportive mb-4">
                    {!voiceAvailable ? (
                      <>Your voice clone needs to be set up before you can hear AI responses in your own voice. 
                      This creates a deeply personal connection for your loved ones.</>
                    ) : (
                      <>Your voice clone is being prepared. Complete the setup to start hearing responses in your voice.</>
                    )}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={() => window.location.href = '/dashboard?view=voice-clone'}
                      className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive"
                      aria-label="Continue voice setup"
                    >
                      {!voiceAvailable ? 'Start Voice Setup' : 'Continue Setup'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowVoiceSetupCard(false)
                        // Re-check availability in case something changed
                        setTimeout(() => checkVoiceAvailability(), 1000)
                      }}
                      variant="outline"
                      className="border-2 border-peace-300 text-peace-600 hover:bg-peace-50 rounded-embrace font-supportive"
                      aria-label="Dismiss and check status"
                    >
                      Check Again
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Messages */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardContent className="p-3 sm:p-6">
            <div className="h-80 sm:h-96 overflow-y-auto mobile-scroll space-y-3 sm:space-y-4 mb-3 sm:mb-4" data-scroll="true">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-embrace ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-hope-500 to-comfort-500 text-white'
                        : 'bg-gradient-to-r from-peace-50 to-hope-50 text-peace-800 border border-hope-200'
                    }`}
                  >
                    <p className="font-compassionate leading-relaxed text-sm sm:text-base">{message.content}</p>
                    
                    {message.role === 'assistant' && (
                      <div className="mt-3 space-y-2">
                        {/* Audio Controls */}
                        {voiceEnabled && (
                          <div className="flex items-center gap-2">
                            {message.audioLoading ? (
                              <div className="flex items-center gap-2 text-xs text-peace-500" role="status" aria-live="polite">
                                <div className="relative w-5 h-5">
                                  <div className="absolute inset-0 rounded-full bg-hope-200 animate-ping"></div>
                                  <div className="relative w-5 h-5 rounded-full bg-gradient-to-r from-hope-400 to-comfort-400 animate-pulse flex items-center justify-center">
                                    <span className="text-white text-[10px]">♪</span>
                                  </div>
                                </div>
                                <span className="font-supportive">Creating voice response...</span>
                              </div>
                            ) : message.audioUrl ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => message.isPlaying ? stopAudio(message.id) : playAudio(message.id, message.audioUrl!)}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs border-hope-300 text-hope-700 hover:bg-hope-50 rounded-comfort transition-all duration-200"
                                  aria-label={message.isPlaying ? 'Stop voice playback' : 'Play voice response'}
                                  aria-pressed={message.isPlaying}
                                >
                                  {message.isPlaying ? (
                                    <><span className="mr-1">⏸️</span>Stop</>
                                  ) : (
                                    <><span className="mr-1">▶️</span>Play</>
                                  )}
                                </Button>
                                {message.isPlaying && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-1 h-3 bg-hope-500 rounded animate-pulse"></div>
                                    <div className="w-1 h-2 bg-hope-400 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-1 h-4 bg-hope-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                    <div className="w-1 h-2 bg-hope-400 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
                                  </div>
                                )}
                              </div>
                            ) : message.voiceError ? (
                              <div className="flex items-center justify-between text-xs" role="alert">
                                <div className="flex items-center gap-2">
                                  <span className="text-comfort-600" aria-hidden="true">
                                    {message.voiceErrorDetails?.originalError === 'network_error' ? '🌐' : '💭'}
                                  </span>
                                  <span className="text-peace-600 font-supportive">{message.voiceError}</span>
                                </div>
                                <div className="flex gap-2">
                                  {message.voiceErrorDetails?.canRetry && (
                                    <Button
                                      onClick={() => synthesizeVoice(message.id, message.content)}
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-xs border-hope-300 text-hope-700 hover:bg-hope-50"
                                    >
                                      Retry
                                    </Button>
                                  )}
                                  {message.voiceErrorDetails?.needsUpdate && (
                                    <Button
                                      onClick={() => window.location.href = '/dashboard?view=voice-clone'}
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-xs border-comfort-300 text-comfort-700 hover:bg-comfort-50"
                                    >
                                      Update Voice
                                    </Button>
                                  )}
                                  {!message.voiceErrorDetails?.canRetry && !message.voiceErrorDetails?.needsUpdate && (
                                    <Button
                                      onClick={() => checkVoiceAvailability()}
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-xs border-peace-300 text-peace-700 hover:bg-peace-50"
                                    >
                                      Check Status
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                        
                        {/* Message Metadata */}
                        {message.confidence !== undefined && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-peace-600 gap-1 sm:gap-0">
                            <span>
                              Confidence: {Math.round(message.confidence * 100)}%
                            </span>
                            {message.modelVersion && (
                              <span>
                                {message.modelVersion}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start" role="status" aria-live="polite">
                  <div className="bg-gradient-to-r from-peace-50 to-hope-50 text-peace-800 border border-hope-200 p-4 rounded-embrace">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-comfort-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-peace-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="font-compassionate">Reflecting on your message...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about memories, advice, or family wisdom..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white/50 backdrop-blur-sm border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate resize-none transition-all duration-300 text-sm sm:text-base"
                  rows={2}
                  disabled={isLoading}
                  aria-label="Type your message to the AI echo"
                  aria-describedby="voice-status"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-full sm:w-auto min-h-[48px] bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-4 sm:px-6 self-end text-sm sm:text-base"
                >
                  Send
                </Button>
              </div>

              {/* Voice Status Announcer for Screen Readers */}
              <div id="voice-status" className="sr-only" role="status" aria-live="polite">
                {voiceEnabled ? 'Voice responses are enabled' : voiceAvailable ? 'Voice responses are available but disabled' : 'Voice responses are not set up'}
              </div>

              {/* Voice Status Visual Indicator */}
              {voiceAvailable && !voiceEnabled && messages.length <= 1 && (
                <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-4 rounded-embrace border border-hope-200 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/80 shadow-sm animate-float">
                      <span className="text-xl" aria-hidden="true">✨</span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-hope-700 font-supportive">
                        Your voice is ready! Enable voice mode above to hear responses in your own voice.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Voice Active Success Indicator */}
              {voiceEnabled && voiceAvailable && messages.filter(m => m.role === 'assistant' && m.audioUrl).length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-hope-50 p-3 rounded-embrace border border-green-200 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-green-100">
                      <span className="text-sm" aria-hidden="true">🎵</span>
                    </div>
                    <p className="text-xs text-green-700 font-supportive">
                      Voice echo active - your AI responses are now in your voice!
                    </p>
                  </div>
                </div>
              )}
              
              {/* Suggested Questions */}
              {messages.length <= 1 && (
                <div className="space-y-2">
                  <p className="text-sm text-peace-600 font-supportive">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setInputValue(question)}
                        className="text-xs px-2 sm:px-3 py-1 sm:py-2 bg-hope-100 hover:bg-hope-200 text-hope-700 rounded-comfort transition-colors duration-300 font-supportive min-h-[32px] sm:min-h-[36px]"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Training Status */}
        {trainingData && (
          <Card className="mobile-card bg-white/70 backdrop-blur-md border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="text-center text-sm text-peace-600 font-supportive">
                <p>
                  This AI echo is trained on {trainingData.responsesUsed} of your responses covering {trainingData.categoriesCovered} different life topics.
                </p>
                <p className="mt-1">
                  The more questions you answer, the better it becomes at reflecting your unique voice and wisdom.
                </p>
                {voiceAvailable && (
                  <p className="mt-2 text-hope-600">
                    🎤 Voice cloning active - responses can be heard in your voice!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}