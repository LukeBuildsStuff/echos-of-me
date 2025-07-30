'use client'

// Example: How to improve SimpleQuestionInterface.tsx with new error handling
// This demonstrates proper usage of the new error components and hooks

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError, NetworkError, SuccessMessage } from '@/components/ui/error-message'
import { LoadingButton, InlineLoading } from '@/components/ui/loading'
import { useAsyncOperation, useFormErrors } from '@/hooks/useErrorHandler'
import { safeApiCall, ErrorRecovery } from '@/lib/error-utils'

interface Question {
  id: string
  question_text: string
  category: string
}

interface QuestionFormData {
  response: string
}

export default function ImprovedQuestionInterface() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [response, setResponse] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Use our new error handling hooks
  const saveOperation = useAsyncOperation()
  const { fieldErrors, generalError, setFieldError, clearAllErrors, setGeneralError } = useFormErrors<QuestionFormData>()

  const currentQuestion = questions[currentQuestionIndex]

  // Load questions with improved error handling
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsInitialLoading(true)
        
        // Use error recovery with fallback
        const questionsData = await ErrorRecovery.withFallback(
          // Primary: Try enhanced questions
          async () => {
            const { data, error } = await safeApiCall(
              () => fetch('/api/questions/enhanced'),
              'loading enhanced questions'
            )
            if (error) throw error
            return data
          },
          // Fallback: Use basic questions
          async () => {
            const { data, error } = await safeApiCall(
              () => fetch('/api/questions'),
              'loading basic questions'
            )
            if (error) throw error
            return data
          }
        )

        if ((questionsData as any)?.questions?.length > 0) {
          setQuestions((questionsData as any).questions)
        } else {
          setGeneralError('No questions are available right now. Please try again later.')
        }
      } catch (error) {
        setGeneralError('We\'re having trouble loading your questions. Please refresh the page.')
        console.error('Error loading questions:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadQuestions()
  }, [setGeneralError])

  // Enhanced save handler with proper error handling
  const handleSave = async () => {
    if (!response.trim()) {
      setFieldError('response', 'Please share your thoughts before saving.')
      return
    }

    if (!currentQuestion) {
      setGeneralError('No question selected. Please refresh the page.')
      return
    }

    clearAllErrors()

    const result = await saveOperation.execute(
      async () => {
        // Use retry logic for save operations
        return await ErrorRecovery.withRetry(
          async () => {
            const { data, error } = await safeApiCall(
              () => fetch('/api/responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questionId: currentQuestion.id,
                  responseText: response,
                  isDraft: false
                })
              }),
              'saving response'
            )

            if (error) throw error
            return data
          },
          {
            maxRetries: 2,
            delay: 1000,
            retryCondition: (error) => error.category === 'network' || error.severity === 'high'
          }
        )
      },
      { context: 'saving response' }
    )

    if (result) {
      // Success!
      setSuccessMessage('Your precious memory has been safely preserved.')
      setResponse('')
      
      // Auto-dismiss success message
      setTimeout(() => setSuccessMessage(null), 5000)
      
      // Move to next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      } else {
        setCurrentQuestionIndex(0)
      }
    }
  }

  const handleRetryLoad = () => {
    window.location.reload()
  }

  if (isInitialLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <InlineLoading text="Loading your questions..." />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (generalError && !questions.length) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <ApiError 
          error={generalError}
          context="question loading"
          onRetry={handleRetryLoad}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Success Message */}
      {successMessage && (
        <SuccessMessage
          message={successMessage}
          dismissible
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* General Error Display */}
      {generalError && (
        <ApiError
          error={generalError}
          onRetry={() => {
            clearAllErrors()
            handleSave()
          }}
          dismissible
          onDismiss={() => setGeneralError(null)}
        />
      )}

      {/* Network Error (if save operation failed due to network) */}
      {saveOperation.isError && saveOperation.error?.includes('network') && (
        <NetworkError
          onRetry={handleSave}
          isRetrying={saveOperation.loading}
        />
      )}

      {currentQuestion && (
        <Card className="bg-gradient-to-br from-white to-comfort-50 border border-peace-200">
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-gradient-to-r from-hope-100 to-comfort-100 text-hope-700">
                {currentQuestion.category}
              </span>
              <span className="text-sm text-peace-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <CardTitle className="text-xl font-gentle text-peace-800 leading-relaxed">
              {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <textarea
                value={response}
                onChange={(e) => {
                  setResponse(e.target.value)
                  if (fieldErrors.response) {
                    setFieldError('response', null)
                  }
                }}
                placeholder="Share your thoughts, memories, and wisdom here..."
                className={`w-full min-h-40 px-4 py-3 border-2 rounded-embrace font-compassionate leading-relaxed resize-y transition-all duration-200 ${
                  fieldErrors.response
                    ? 'border-warning-300 focus:border-warning-400 focus:ring-4 focus:ring-warning-100'
                    : 'border-peace-200 focus:border-hope-400 focus:ring-4 focus:ring-hope-100'
                }`}
                disabled={saveOperation.loading}
              />
              
              {/* Field Error Display */}
              {fieldErrors.response && (
                <div className="mt-2 text-sm text-warning-700 flex items-center gap-2">
                  <span className="text-warning-500">⚠️</span>
                  {fieldErrors.response}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-peace-500">
                {response.length} characters • {response.split(/\s+/).filter(w => w).length} words
              </span>
              
              <Button
                onClick={handleSave}
                disabled={!response.trim() || saveOperation.loading}
                className="bg-hope-500 hover:bg-hope-600 text-white"
              >
                <LoadingButton 
                  loading={saveOperation.loading}
                  loadingText="Preserving..."
                >
                  Preserve Memory
                </LoadingButton>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encouragement */}
      <div className="text-center p-4 bg-gradient-to-r from-comfort-50 to-hope-50 rounded-embrace border border-comfort-200">
        <p className="text-comfort text-comfort-600 font-compassionate">
          💜 Every response you share becomes part of your irreplaceable legacy
        </p>
      </div>
    </div>
  )
}