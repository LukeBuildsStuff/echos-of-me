'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponseQualityIndicator } from '@/components/ResponseQualityIndicator'
import { ResponseCompletionFeedback } from '@/components/ResponseCompletionFeedback'
import { QualityScore } from '@/lib/response-quality'

interface SimpleQuestion {
  id: string
  question_text: string
  category: string
}

interface DailyStatus {
  hasAnsweredToday: boolean
  todayCount: number
  totalResponses: number
  canAnswerMore: boolean
  date: string
}

export default function SimpleQuestionInterface() {
  const [questions, setQuestions] = useState<SimpleQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedResponses, setSavedResponses] = useState(0)
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null)
  const [showOverride, setShowOverride] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [completionQuality, setCompletionQuality] = useState<QualityScore | null>(null)

  useEffect(() => {
    loadQuestions()
    checkDailyStatus()
  }, [])

  const checkDailyStatus = async () => {
    try {
      const response = await fetch('/api/daily-status')
      const data = await response.json()
      setDailyStatus(data)
    } catch (error) {
      console.error('Error checking daily status:', error)
    }
  }

  const loadQuestions = async () => {
    try {
      setIsLoading(true)
      
      // Try role-based questions first, fallback to basic questions
      let response = await fetch('/api/questions/role-based?count=10')
      let data = await response.json()
      
      if (!data.questions || data.questions.length === 0) {
        // Fallback to basic questions API
        response = await fetch('/api/questions?count=10')
        data = await response.json()
      }
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
      } else {
        console.error('No questions received from either API:', data)
        console.log('Full API response:', data)
        console.log('Trying basic fetch to /api/questions...')
        
        // Try one more fallback - direct basic API call
        try {
          const basicResponse = await fetch('/api/questions?count=5')
          const basicData = await basicResponse.json()
          console.log('Basic API response:', basicData)
          
          if (basicData.questions && basicData.questions.length > 0) {
            setQuestions(basicData.questions)
          }
        } catch (basicError) {
          console.error('Basic API also failed:', basicError)
        }
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveResponse = async () => {
    if (!response.trim() || !questions[currentQuestionIndex]) {
      console.error('Cannot save: response empty or no current question')
      return
    }

    try {
      setIsSaving(true)
      const requestBody = {
        questionId: questions[currentQuestionIndex].id,
        responseText: response,
        isDraft: false
      }
      
      console.log('=== SAVE RESPONSE DEBUG ===')
      console.log('Current question:', questions[currentQuestionIndex])
      console.log('Request body:', requestBody)
      console.log('Response length:', response.length)
      console.log('Question ID type:', typeof questions[currentQuestionIndex].id)
      
      const result = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Save result status:', result.status)
      console.log('Save result headers:', result.headers)
      
      let responseData
      try {
        responseData = await result.json()
        console.log('Save result data:', responseData)
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError)
        const text = await result.text()
        console.error('Response text:', text)
        throw new Error('Invalid response from server')
      }
      
      if (result.ok) {
        console.log('Response saved successfully!')
        
        // Show completion feedback if we have quality data
        if (responseData.quality) {
          setCompletionQuality(responseData.quality)
          setShowCompletion(true)
          
          // Update saved responses and clear current response
          setSavedResponses(prev => prev + 1)
          setResponse('')
          
          // Update daily status
          await checkDailyStatus()
          return
        }
        
        // Fallback to old behavior if no quality data
        setSavedResponses(prev => prev + 1)
        setResponse('')
        
        // If this was their first question today and we don't have override, 
        // show completion message instead of moving to next question
        const wasFirstQuestionToday = !showOverride && dailyStatus && !dailyStatus.hasAnsweredToday
        
        // Update daily status after checking if it was first question
        await checkDailyStatus()
        
        if (wasFirstQuestionToday) {
          // They just completed their daily question
          console.log('First question completed, showing completion message')
          return
        }
        
        // Move to next question or loop back (only if override is active)
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1)
        } else {
          setCurrentQuestionIndex(0) // Loop back to first question
        }
      } else {
        console.error('Failed to save response - Status:', result.status)
        console.error('Error details:', responseData)
        
        // Handle specific error cases
        if (result.status === 401) {
          alert('Your session has expired. Please refresh the page and try again.')
          // Optionally redirect to sign-in
          // window.location.href = '/auth/signin'
        } else if (result.status === 404 && responseData.error === 'User not found') {
          alert('There was an issue with your account. Please sign out and sign back in.')
        } else if (responseData.details && responseData.details.includes && responseData.details.includes('Response cannot be empty')) {
          alert('Please write a longer response before submitting.')
        } else {
          alert('Failed to save response: ' + (responseData.error || 'Unknown error'))
        }
      }
    } catch (error) {
      console.error('Error saving response:', error)
      alert('Network error while saving response: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCompletionContinue = () => {
    setShowCompletion(false)
    setCompletionQuality(null)
    
    // Move to next question or handle daily completion
    const wasFirstQuestionToday = !showOverride && dailyStatus && !dailyStatus.hasAnsweredToday
    
    if (wasFirstQuestionToday) {
      // They just completed their daily question - the dailyStatus check will handle the completion screen
      return
    }
    
    // Move to next question or loop back (only if override is active)
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      setCurrentQuestionIndex(0) // Loop back to first question
    }
  }

  const currentQuestion = questions[currentQuestionIndex]

  // Show completion message if user has answered their daily question
  if (dailyStatus?.hasAnsweredToday && !showOverride) {
    return (
      <div className="min-h-screen bg-heaven-gradient animate-fade-in">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="text-center mt-sanctuary">
            <div className="inline-block p-sanctuary rounded-full bg-white/30 backdrop-blur-sm animate-float mb-embrace">
              <span className="text-6xl">✨</span>
            </div>
          </div>
          
          <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl animate-glow">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-gentle bg-gradient-to-r from-hope-600 to-comfort-600 bg-clip-text text-transparent">
                Today&apos;s Reflection Complete
              </CardTitle>
              <CardDescription className="text-lg text-peace-700 font-supportive mt-2">
                You&apos;ve shared your wisdom for today. Quality over quantity helps preserve authentic responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-embrace">
              <div className="bg-gradient-to-r from-hope-50 to-comfort-50 rounded-sanctuary p-embrace space-y-2">
                <p className="text-xl font-compassionate text-hope-800">
                  Total responses preserved
                </p>
                <p className="text-4xl font-bold bg-gradient-to-r from-hope-600 to-comfort-600 bg-clip-text text-transparent">
                  {dailyStatus.totalResponses}
                </p>
              </div>
              
              <p className="text-peace-600 font-supportive leading-relaxed max-w-md mx-auto">
                Your words are becoming part of an eternal legacy. Come back tomorrow to continue this meaningful journey.
              </p>
              
              <div className="pt-embrace border-t border-hope-100">
                <p className="text-peace-600 mb-4 font-supportive">
                  Want to share more today? We recommend one daily reflection for depth.
                </p>
                <Button 
                  onClick={() => setShowOverride(true)}
                  variant="outline"
                  className="border-2 border-hope-300 text-hope-700 hover:bg-hope-50 hover:scale-105 transition-all duration-300 px-8 py-3 rounded-embrace font-supportive"
                >
                  Continue Sharing
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <p className="text-peace-500 font-compassionate animate-pulse">
              Every answer is a gift to future generations 💝
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-heaven-gradient flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="inline-block p-4 rounded-full bg-white/30 backdrop-blur-sm animate-float mb-4">
            <div className="w-16 h-16 border-4 border-hope-300 border-t-hope-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-peace-700 font-supportive">Preparing your thoughtful questions...</p>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Questions Available</CardTitle>
            <CardDescription>
              It looks like you need to complete your profile setup first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Refresh Questions
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-heaven-gradient animate-fade-in">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Daily status indicator */}
        {showOverride && (
          <div className="bg-memory-100/50 backdrop-blur-sm border border-memory-200/50 rounded-sanctuary p-comfort text-center animate-glow">
            <p className="text-memory-800 font-supportive">
              ⚡ <strong>Extended Reflection Mode</strong> - You&apos;re going deeper today.
            </p>
          </div>
        )}

        {/* Progress indicator */}
        <div className="text-center space-y-2">
          <div className="text-peace-600 font-supportive">
            <span className="text-lg">Question {currentQuestionIndex + 1} of {questions.length}</span>
            {dailyStatus && (
              <span className="block text-sm mt-1">
                {dailyStatus.totalResponses} eternal memories preserved
              </span>
            )}
          </div>
          <div className="w-full bg-white/30 backdrop-blur-sm rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-hope-400 to-comfort-400 h-3 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current question */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 mx-2 sm:mx-0">
          <CardHeader className="text-center pb-2">
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 animate-float">
              <span className="text-3xl">💭</span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
              A Special Moment of Sharing
            </CardTitle>
            <CardDescription className="text-lg text-peace-600 font-supportive mt-2">
              Each memory you share becomes a precious gift to those you love
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-embrace">
              <div className="bg-gradient-to-br from-hope-50/50 to-comfort-50/50 rounded-sanctuary p-sanctuary border border-hope-100/50">
                <p className="text-xl leading-relaxed font-compassionate text-peace-800 text-center">
                  {currentQuestion?.question_text}
                </p>
              </div>

              <div>
                <label className="block text-peace-700 font-supportive mb-3 text-center">
                  Open Your Heart and Share
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="This is your special space to share... Let your heart guide your words as you create something beautiful and lasting"
                  className="w-full min-h-32 sm:min-h-40 px-3 sm:px-embrace py-3 sm:py-comfort bg-white/50 backdrop-blur-sm border-2 border-hope-200 rounded-sanctuary focus:border-hope-400 focus:ring-4 focus:ring-hope-100 focus:bg-white/80 font-compassionate text-base sm:text-lg leading-relaxed resize-y transition-all duration-500 placeholder:text-peace-400 hover:bg-white/60"
                  style={{ minHeight: response.length > 200 ? '200px' : '160px' }}
                />
                
                {/* Real-time quality feedback */}
                <div className="mt-4">
                  <ResponseQualityIndicator responseText={response} />
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-peace-500 font-supportive animate-pulse">
                    {response.length > 0 && `${response.split(' ').filter(w => w).length} words of wisdom`}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-0">
                    {currentQuestionIndex > 0 && (
                      <Button 
                        variant="outline"
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        disabled={isSaving}
                        className="border-2 border-peace-300 text-peace-700 hover:bg-peace-50 rounded-embrace px-4 sm:px-6 py-2 font-supportive transition-all duration-300 hover:scale-105 text-sm sm:text-base w-full sm:w-auto"
                      >
                        ← Previous
                      </Button>
                    )}
                    <Button 
                      onClick={saveResponse}
                      disabled={!response.trim() || isSaving}
                      className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 sm:px-8 py-2 sm:py-3 font-supportive transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 text-sm sm:text-base w-full sm:w-auto"
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Preserving...
                        </span>
                      ) : (
                        'Preserve This Memory →'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

        {/* Encouragement */}
        <div className="text-center bg-white/50 backdrop-blur-sm rounded-sanctuary p-4 sm:p-sanctuary animate-glow mx-2 sm:mx-0">
          <p className="text-base sm:text-lg text-peace-700 font-compassionate leading-relaxed">
            Every answer you give becomes part of an irreplaceable digital legacy
          </p>
          <div className="mt-2 text-3xl sm:text-4xl animate-float">
            💝
          </div>
        </div>
      </div>

      {/* Completion feedback overlay */}
      {showCompletion && completionQuality && (
        <ResponseCompletionFeedback
          quality={completionQuality}
          onContinue={handleCompletionContinue}
        />
      )}
    </div>
  )
}