'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ResponseQualityIndicator } from '@/components/ResponseQualityIndicator'
import { ResponseCompletionFeedback } from '@/components/ResponseCompletionFeedback'
import { QualityScore } from '@/lib/response-quality'

interface DailyQuestion {
  id: string
  question_text: string
  category: string
}

interface DailyStatus {
  hasAnsweredToday: boolean
  todayCount: number
  canAnswerMore: boolean
}

export default function DailyQuestionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [question, setQuestion] = useState<DailyQuestion | null>(null)
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [completionQuality, setCompletionQuality] = useState<QualityScore | null>(null)

  const loadDailyQuestion = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/questions/role-based')
      const data = await response.json()
      
      if (data.questions && data.questions.length > 0) {
        // Get a random question for today
        const randomIndex = Math.floor(Math.random() * data.questions.length)
        setQuestion(data.questions[randomIndex])
      }
    } catch (error) {
      console.error('Error loading question:', error)
      router.push('/dashboard') // Fallback to dashboard on error
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const checkDailyStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/daily-status')
      const data = await response.json()
      setDailyStatus(data)
      
      if (data.hasAnsweredToday && !data.canAnswerMore) {
        // User has already answered today, go to dashboard
        router.push('/dashboard')
        return
      }
      
      // Load today's question
      loadDailyQuestion()
    } catch (error) {
      console.error('Error checking daily status:', error)
      router.push('/dashboard') // Fallback to dashboard on error
    }
  }, [router, loadDailyQuestion])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkDailyStatus()
    }
  }, [status, router, checkDailyStatus])

  const handleSaveResponse = async () => {
    if (!question || !response.trim()) return

    setIsSaving(true)
    try {
      const result = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          responseText: response,
          isDraft: false
        })
      })

      if (result.ok) {
        // Success! Show completion feedback
        const data = await result.json()
        if (data.quality) {
          setCompletionQuality(data.quality)
          setShowCompletion(true)
        } else {
          router.push('/dashboard')
        }
      } else {
        const errorData = await result.json()
        console.error('Error saving response:', errorData)
      }
    } catch (error) {
      console.error('Error saving response:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  const handleCompletionContinue = () => {
    setShowCompletion(false)
    router.push('/dashboard')
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hope-50 via-white to-comfort-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-gentle-pulse">💫</div>
          <div className="text-lg text-peace-600 font-compassionate">Preparing your daily reflection...</div>
        </div>
      </div>
    )
  }

  if (!session || !question) {
    return null
  }

  return (
    <div className="mobile-min-vh-fix bg-gradient-to-br from-hope-50 via-white to-comfort-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 safe-area">
      <div className="max-w-2xl w-full mx-auto">
        <Card className="bg-white/90 backdrop-blur border-comfort-200 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader className="text-center space-y-4 px-4 sm:px-6">
            <div className="text-4xl sm:text-5xl">🌅</div>
            <CardTitle className="text-2xl sm:text-3xl font-gentle bg-gradient-to-r from-peace-800 to-comfort-700 bg-clip-text text-transparent">
              Your Daily Reflection
            </CardTitle>
            <CardDescription className="text-base sm:text-lg text-peace-600 font-compassionate">
              In this special space, share a piece of your heart that will live on forever
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <div className="bg-gradient-to-r from-comfort-50/50 to-hope-50/50 rounded-lg p-4 sm:p-6 border border-comfort-200/50">
              <h3 className="text-lg sm:text-xl font-compassionate text-comfort-800 mb-3 sm:mb-4">Your Reflection Invitation:</h3>
              <p className="text-base sm:text-lg text-peace-700 leading-relaxed font-gentle">
                {question.question_text}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm sm:text-base font-compassionate text-peace-700">Share from Your Heart:</label>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Let your memories flow... Each word becomes a treasured part of your eternal story"
                className="min-h-32 sm:min-h-40 md:min-h-48 border-comfort-200 focus:border-comfort-400 bg-white/80 transition-all duration-300 focus:shadow-lg focus:bg-white/95 text-sm sm:text-base md:text-lg p-3 sm:p-4"
                rows={6}
              />
              <div className="text-xs text-peace-500 text-right font-supportive">
                {response.length > 0 ? `${response.split(' ').filter(w => w.trim()).length} words of wisdom shared` : 'Begin sharing your story...'}
              </div>
              
              {/* Real-time quality feedback */}
              <ResponseQualityIndicator responseText={response} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <Button
                onClick={handleSaveResponse}
                disabled={!response.trim() || isSaving}
                className="flex-1 min-h-[48px] py-3 bg-gradient-to-r from-hope-500 to-comfort-500 text-white hover:from-hope-600 hover:to-comfort-600 shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
              >
                {isSaving ? 'Saving...' : '✨ Save & Continue to Dashboard'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSkip}
                className="min-h-[48px] py-3 border-peace-300 hover:border-comfort-400 hover:bg-comfort-50 text-sm sm:text-base"
              >
                Skip for Now
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-peace-200/50">
              <p className="text-sm text-peace-500 font-compassionate">
                💝 Every response becomes an irreplaceable gift to your family
              </p>
            </div>
          </CardContent>
        </Card>
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