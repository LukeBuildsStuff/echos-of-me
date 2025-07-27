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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
  }, [isDemo, userName])

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
          modelVersion: data.modelVersion
        }

        setMessages(prev => [...prev, aiMessage])
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

  const suggestedQuestions = [
    "What's the most important advice you'd give?",
    "Tell me about a favorite family memory",
    "What values matter most to you?",
    "What would you want me to remember about you?",
    "How did you handle difficult times?"
  ]

  return (
    <div className="min-h-screen bg-heaven-gradient py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 animate-float">
              <span className="text-3xl">🤖</span>
            </div>
            <CardTitle className="text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
              {isDemo ? `Chat with ${userName}'s AI Echo` : 'Chat with Your AI Echo'}
            </CardTitle>
            {trainingData && (
              <div className="flex justify-center gap-2 mt-4 flex-wrap">
                <Badge variant="outline" className="bg-hope-50 border-hope-200 text-hope-700">
                  {trainingData.responsesUsed} memories
                </Badge>
                <Badge variant="outline" className="bg-comfort-50 border-comfort-200 text-comfort-700">
                  {trainingData.categoriesCovered} categories
                </Badge>
                <Badge variant="outline" className="bg-memory-50 border-memory-200 text-memory-700">
                  {trainingData.totalWords.toLocaleString()} words
                </Badge>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Chat Messages */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="h-96 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-embrace ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-hope-500 to-comfort-500 text-white'
                        : 'bg-gradient-to-r from-peace-50 to-hope-50 text-peace-800 border border-hope-200'
                    }`}
                  >
                    <p className="font-compassionate leading-relaxed">{message.content}</p>
                    
                    {message.role === 'assistant' && message.confidence !== undefined && (
                      <div className="mt-2 flex items-center justify-between text-xs text-peace-600">
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
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-r from-peace-50 to-hope-50 text-peace-800 border border-hope-200 p-4 rounded-embrace">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-hope-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-comfort-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-peace-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="ml-2 font-compassionate">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about memories, advice, or family wisdom..."
                  className="flex-1 px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate resize-none transition-all duration-300"
                  rows={2}
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 self-end"
                >
                  Send
                </Button>
              </div>

              {/* Suggested Questions */}
              {messages.length <= 1 && (
                <div className="space-y-2">
                  <p className="text-sm text-peace-600 font-supportive">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setInputValue(question)}
                        className="text-xs px-3 py-1 bg-hope-100 hover:bg-hope-200 text-hope-700 rounded-comfort transition-colors duration-300 font-supportive"
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
          <Card className="bg-white/70 backdrop-blur-md border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="text-center text-sm text-peace-600 font-supportive">
                <p>
                  This AI echo is trained on {trainingData.responsesUsed} of your responses covering {trainingData.categoriesCovered} different life topics.
                </p>
                <p className="mt-1">
                  The more questions you answer, the better it becomes at reflecting your unique voice and wisdom.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}