'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModelVersion } from '@/lib/ai-training-config'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  modelVersion?: string
  responseTime?: number
  tokenCount?: number
}

interface PersonalizedAIChatProps {
  userId: string
  availableModels: ModelVersion[]
  onFeedback?: (messageId: string, satisfaction: 'positive' | 'negative' | 'neutral', feedback?: string) => void
}

export default function PersonalizedAIChat({ 
  userId, 
  availableModels, 
  onFeedback 
}: PersonalizedAIChatProps) {
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationStarted, setConversationStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-select the latest deployed model
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      const latestModel = availableModels.find(m => m.status === 'deployed') || availableModels[0]
      setSelectedModel(latestModel.id)
    }
  }, [availableModels, selectedModel])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize conversation with welcome message
  useEffect(() => {
    if (selectedModel && !conversationStarted && availableModels.length > 0) {
      const model = availableModels.find(m => m.id === selectedModel)
      if (model) {
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: `Hello! I'm your personalized AI, trained on your responses and life experiences. I've learned from ${model.trainingExamples} of your stories and memories. Feel free to ask me anything - about your values, memories, advice, or just to have a conversation that reflects your unique perspective and wisdom.`,
          timestamp: new Date(),
          modelVersion: `v${model.version}`
        }
        setMessages([welcomeMessage])
        setConversationStarted(true)
      }
    }
  }, [selectedModel, conversationStarted, availableModels])

  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedModel || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/training/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel,
          query: userMessage.content,
          userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          modelVersion: data.metadata?.modelVersion,
          responseTime: data.metadata?.responseTime,
          tokenCount: data.metadata?.tokenCount
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date()
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

  const clearConversation = () => {
    setMessages([])
    setConversationStarted(false)
  }

  const exportConversation = () => {
    const conversationText = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n')
    
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-conversation-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const selectedModelInfo = availableModels.find(m => m.id === selectedModel)

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      {/* Header */}
      <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                💬 Chat with Your Personal AI
              </CardTitle>
              <CardDescription>
                Have a conversation with your personalized AI model
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-1 text-sm border border-peace-300 rounded-embrace focus:ring-2 focus:ring-hope-500"
              >
                <option value="">Select Model...</option>
                {availableModels
                  .filter(model => model.status === 'deployed')
                  .map(model => (
                    <option key={model.id} value={model.id}>
                      Version {model.version} - {new Date(model.trainedAt).toLocaleDateString()}
                    </option>
                  ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                className="text-xs"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportConversation}
                className="text-xs"
                disabled={messages.length === 0}
              >
                Export
              </Button>
            </div>
          </div>
          
          {selectedModelInfo && (
            <div className="flex items-center gap-4 pt-2 text-xs text-peace-600">
              <span>Trained on {selectedModelInfo.trainingExamples} examples</span>
              <span>Coherence: {(selectedModelInfo.performance.coherenceScore * 100).toFixed(1)}%</span>
              <span>Persona Match: {(selectedModelInfo.performance.personaMatchScore * 100).toFixed(1)}%</span>
              <Badge variant="outline" className="text-xs">
                {selectedModelInfo.metadata.trainingHost}
              </Badge>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 bg-white/80 backdrop-blur-md border-0 shadow-xl mb-4">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-hope-500 to-comfort-500 text-white' 
                    : 'bg-peace-100 text-peace-800'
                } rounded-embrace p-3`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Message metadata */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-opacity-20 text-xs opacity-70">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      {message.modelVersion && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {message.modelVersion}
                        </Badge>
                      )}
                      {message.responseTime && (
                        <span>{message.responseTime}ms</span>
                      )}
                      {message.tokenCount && (
                        <span>{message.tokenCount} tokens</span>
                      )}
                    </div>
                  </div>

                  {/* Feedback buttons for AI messages */}
                  {message.role === 'assistant' && message.id !== 'welcome' && onFeedback && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-opacity-20">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs px-2 py-1 h-6 text-green-600 hover:bg-green-50"
                        onClick={() => onFeedback(message.id, 'positive')}
                      >
                        👍
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs px-2 py-1 h-6 text-red-600 hover:bg-red-50"
                        onClick={() => onFeedback(message.id, 'negative')}
                      >
                        👎
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-peace-100 text-peace-800 rounded-embrace p-3 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-hope-500"></div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask your AI anything..."
              disabled={!selectedModel || isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || !selectedModel || isLoading}
              className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white px-6"
            >
              Send
            </Button>
          </div>
          
          {!selectedModel && availableModels.length === 0 && (
            <p className="text-sm text-peace-600 mt-2">
              No trained models available. Complete your training first to start chatting.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}