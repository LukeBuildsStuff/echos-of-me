'use client'

import { useState, useEffect } from 'react'
import { ResponseAnalysis } from '@/lib/ai-question-enhancer'

interface EnhancedQuestion {
  id: string
  question_text: string
  category: string
  emotional_depth: number
  source: string
}

interface UserInsights {
  emotionalProfile: {
    dominantEmotions: string[]
    vulnerabilityLevel: string
    expressionStyle: string
  }
  responseCount: number
  themeAnalysis?: {
    primaryThemes: string[]
    emotionalJourney: string
    growthAreas: string[]
  }
}

export default function EnhancedQuestionInterface() {
  const [questions, setQuestions] = useState<EnhancedQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<EnhancedQuestion | null>(null)
  const [response, setResponse] = useState('')
  const [insights, setInsights] = useState<UserInsights | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([])

  useEffect(() => {
    loadEnhancedQuestions()
  }, [])

  const loadEnhancedQuestions = async () => {
    try {
      const response = await fetch('/api/questions/enhanced?count=5&type=contextual')
      const data = await response.json()
      
      if (data.questions) {
        setQuestions(data.questions)
        setCurrentQuestion(data.questions[0])
        setInsights(data.userInsights)
      }
    } catch (error) {
      console.error('Failed to load enhanced questions:', error)
    }
  }

  const analyzeResponse = async () => {
    if (!response.trim() || !currentQuestion) return

    setIsAnalyzing(true)
    try {
      const analysisResponse = await fetch('/api/questions/enhanced/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseText: response,
          questionText: currentQuestion.question_text
        })
      })

      const data = await analysisResponse.json()
      if (data.followUpSuggestions) {
        setFollowUpSuggestions(data.followUpSuggestions)
      }
    } catch (error) {
      console.error('Failed to analyze response:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveResponse = async () => {
    if (!response.trim() || !currentQuestion) return

    try {
      await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          responseText: response,
          emotionalState: 'reflective'
        })
      })

      // Move to next question
      const currentIndex = questions.findIndex(q => q.id === currentQuestion.id)
      if (currentIndex < questions.length - 1) {
        setCurrentQuestion(questions[currentIndex + 1])
        setResponse('')
        setFollowUpSuggestions([])
      } else {
        // Load more enhanced questions based on recent responses
        loadFollowUpQuestions()
      }
    } catch (error) {
      console.error('Failed to save response:', error)
    }
  }

  const loadFollowUpQuestions = async () => {
    try {
      const response = await fetch(`/api/questions/enhanced?count=3&type=followup&lastQuestionId=${currentQuestion?.id}`)
      const data = await response.json()
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        setCurrentQuestion(data.questions[0])
        setResponse('')
        setFollowUpSuggestions([])
      }
    } catch (error) {
      console.error('Failed to load follow-up questions:', error)
    }
  }

  const handleFollowUpSuggestion = (suggestion: string) => {
    setCurrentQuestion({
      id: `followup_${Date.now()}`,
      question_text: suggestion,
      category: 'followup',
      emotional_depth: 8,
      source: 'ai_followup'
    })
    setFollowUpSuggestions([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* User Insights Panel */}
      {insights && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Your Legacy Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Expression Style:</span>
              <p className="text-gray-600 capitalize">{insights.emotionalProfile.expressionStyle}</p>
            </div>
            <div>
              <span className="font-medium">Openness Level:</span>
              <p className="text-gray-600 capitalize">{insights.emotionalProfile.vulnerabilityLevel}</p>
            </div>
            <div>
              <span className="font-medium">Responses Shared:</span>
              <p className="text-gray-600">{insights.responseCount} memories preserved</p>
            </div>
          </div>
          
          {insights.themeAnalysis && (
            <div className="mt-4">
              <span className="font-medium">Recurring Themes:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {insights.themeAnalysis.primaryThemes.map(theme => (
                  <span key={theme} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Question */}
      {currentQuestion && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600 capitalize">
                {currentQuestion.source.replace('_', ' ')} Question
              </span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                Depth: {currentQuestion.emotional_depth}/10
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-6 leading-relaxed">
            {currentQuestion.question_text}
          </h2>

          <div className="space-y-4">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              onBlur={analyzeResponse}
              placeholder="Share your thoughts, memories, or feelings about this question..."
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {response.length} characters
              </div>
              <button
                onClick={saveResponse}
                disabled={!response.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save & Continue
              </button>
            </div>
          </div>

          {/* Real-time Analysis Feedback */}
          {isAnalyzing && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-yellow-800">Analyzing your response for deeper insights...</span>
              </div>
            </div>
          )}

          {/* Follow-up Suggestions */}
          {followUpSuggestions.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-3">Continue exploring this topic:</h4>
              <div className="space-y-2">
                {followUpSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleFollowUpSuggestion(suggestion)}
                    className="block w-full text-left p-3 bg-white border border-green-200 rounded hover:bg-green-50 transition-colors"
                  >
                    <span className="text-sm text-green-700">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Progress */}
      <div className="flex justify-center space-x-2">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className={`w-3 h-3 rounded-full ${
              q.id === currentQuestion?.id ? 'bg-purple-600' : 
              index < questions.findIndex(qu => qu.id === currentQuestion?.id) ? 'bg-purple-300' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Enhanced Features Info */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-3">🎯 AI-Enhanced Questions</h3>
        <p className="text-sm text-gray-600 mb-3">
          These questions are personalized based on your previous responses, emotional patterns, and family context to capture your most meaningful memories and wisdom.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
          <div>
            ✨ <strong>Adaptive Depth:</strong> Questions become more personal as you share more
          </div>
          <div>
            🔍 <strong>Pattern Recognition:</strong> Identifies themes in your responses
          </div>
          <div>
            💝 <strong>Emotional Resonance:</strong> Crafted to capture your unique voice
          </div>
          <div>
            🔄 <strong>Follow-up Generation:</strong> Creates deeper questions based on your answers
          </div>
        </div>
      </div>
    </div>
  )
}