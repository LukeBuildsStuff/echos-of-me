'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import VoiceOnboardingWorkflow from './VoiceOnboardingWorkflow'

interface TrainYourAIProps {
  onBack: () => void
}

interface IntegrationStatus {
  hasVoiceProfile: boolean
  voiceComplete: boolean
  hasTextData: boolean
  textDataSufficient: boolean
  integrationStatus: 'not_started' | 'voice_incomplete' | 'text_insufficient' | 'ready' | 'training' | 'completed'
  trainingJobId?: string
  message: string
}

interface TrainingProgress {
  currentEpoch: number
  totalEpochs: number
  currentLoss: number
  estimatedTimeRemaining: number
  gpuUtilization: number
  memoryUsage: number
  voiceAlignment: number
  status: string
}

type ViewState = 'overview' | 'voice-setup' | 'data-review' | 'training-progress' | 'completed'

export default function TrainYourAI({ onBack }: TrainYourAIProps) {
  const [currentView, setCurrentView] = useState<ViewState>('overview')
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load integration status on mount
  useEffect(() => {
    loadIntegrationStatus()
  }, [])

  // Poll training progress if training is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (integrationStatus?.integrationStatus === 'training' && integrationStatus.trainingJobId) {
      interval = setInterval(() => {
        fetchTrainingProgress(integrationStatus.trainingJobId!)
      }, 10000) // Poll every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [integrationStatus])

  const loadIntegrationStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/voice-llm/integrate')
      
      if (!response.ok) {
        // If API is not available, provide fallback status
        if (response.status === 404 || response.status === 500) {
          setIntegrationStatus({
            hasVoiceProfile: false,
            voiceComplete: false,
            hasTextData: false,
            textDataSufficient: false,
            integrationStatus: 'not_started',
            message: 'Voice cloning and AI training features are currently being set up. Please check back later.'
          })
          return
        }
        throw new Error(`Server error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Handle API response format variations gracefully
      const statusData = data.details || data || {}
      setIntegrationStatus({
        hasVoiceProfile: statusData.hasVoiceProfile || false,
        voiceComplete: statusData.voiceComplete || false,
        hasTextData: statusData.hasTextData || false,
        textDataSufficient: statusData.textDataSufficient || false,
        integrationStatus: statusData.integrationStatus || 'not_started',
        trainingJobId: statusData.trainingJobId,
        message: statusData.message || 'Ready to begin your AI training journey'
      })
      
      // Auto-navigate based on status
      if (statusData.integrationStatus === 'training') {
        setCurrentView('training-progress')
      } else if (statusData.integrationStatus === 'completed') {
        setCurrentView('completed')
      } else if (!statusData.voiceComplete) {
        setCurrentView('voice-setup')
      }
      
    } catch (error: any) {
      console.error('Error loading integration status:', error)
      
      // Provide helpful error messages based on error type
      let errorMessage = 'Unable to load AI training status'
      if (error.message.includes('fetch')) {
        errorMessage = 'Connection error. Please check your internet connection and try again.'
      } else if (error.message.includes('Server error: 500')) {
        errorMessage = 'Server is temporarily unavailable. Please try again in a few minutes.'
      } else if (error.message.includes('Server error: 404')) {
        errorMessage = 'AI training features are not yet available. Please check back soon.'
      }
      
      setError(errorMessage)
      
      // Set fallback status to prevent complete UI breakdown
      setIntegrationStatus({
        hasVoiceProfile: false,
        voiceComplete: false,
        hasTextData: false,
        textDataSufficient: false,
        integrationStatus: 'not_started',
        message: 'Unable to determine current status. Please try refreshing the page.'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTrainingProgress = async (trainingJobId: string) => {
    try {
      const response = await fetch(`/api/training/status?jobId=${trainingJobId}`)
      if (response.ok) {
        const data = await response.json()
        setTrainingProgress(data.progress)
        
        // Check if training completed
        if (data.status === 'completed') {
          await loadIntegrationStatus() // Refresh status
        }
      }
    } catch (error) {
      console.error('Error fetching training progress:', error)
    }
  }

  const startIntegration = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/voice-llm/integrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: 'latest' })
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('AI training service is not yet available. Please try again later.')
        } else if (response.status === 500) {
          throw new Error('Server error occurred while starting training. Please try again.')
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please sign in again.')
        }
        throw new Error(`Training failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh status to get updated training job
        await loadIntegrationStatus()
        setCurrentView('training-progress')
      } else {
        const errorMsg = data.message || data.error || 'Failed to start training'
        if (errorMsg.includes('voice')) {
          setError('Please complete voice cloning first before starting AI training.')
        } else if (errorMsg.includes('question') || errorMsg.includes('data')) {
          setError('Please answer more questions to provide sufficient training data.')
        } else {
          setError(errorMsg)
        }
      }
    } catch (error: any) {
      console.error('Error starting integration:', error)
      
      let errorMessage = error.message || 'Failed to start AI training'
      if (error.message.includes('fetch')) {
        errorMessage = 'Connection error. Please check your internet connection and try again.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    if (loading && !integrationStatus) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hope-500 mx-auto"></div>
            <p className="text-peace-600 font-supportive">Loading your AI training status...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <Card className="mobile-card bg-orange-50 border-orange-200 shadow-xl">
          <CardContent className="p-6 text-center">
            <div className="inline-block p-3 rounded-full bg-orange-100 mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-gentle text-orange-800 mb-3">
              Temporary Issue
            </h3>
            <p className="text-orange-700 font-supportive mb-6 leading-relaxed">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => { setError(null); loadIntegrationStatus() }} 
                className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 py-3"
              >
                Try Again
              </Button>
              <Button 
                onClick={onBack} 
                variant="outline"
                className="border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    switch (currentView) {
      case 'voice-setup':
        return (
          <VoiceOnboardingWorkflow
            onBack={() => setCurrentView('overview')}
            initialStep="welcome"
          />
        )
      
      case 'training-progress':
        return <TrainingProgressView progress={trainingProgress} onBack={() => setCurrentView('overview')} />
      
      case 'completed':
        return <CompletedView onBack={onBack} onTestAI={() => window.location.href = '/ai-echo'} />
      
      default:
        return <OverviewView 
          status={integrationStatus!} 
          onStartVoiceSetup={() => setCurrentView('voice-setup')}
          onStartTraining={startIntegration}
          loading={loading}
        />
    }
  }

  return (
    <div className="mobile-full-height bg-heaven-gradient py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6" style={{ paddingLeft: 'max(0.75rem, var(--safe-area-inset-left))', paddingRight: 'max(0.75rem, var(--safe-area-inset-right))' }}>
        
        {/* Header */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="inline-block p-2 sm:p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-3 sm:mb-4 animate-float">
              <span className="text-2xl sm:text-3xl">🧠</span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
              Train Your AI
            </CardTitle>
            <p className="text-sm sm:text-base text-peace-600 font-supportive mt-2">
              Create a personalized AI that speaks with your voice and embodies your wisdom
            </p>
          </CardHeader>
        </Card>

        {renderContent()}

        {/* Back Button */}
        {currentView === 'overview' && (
          <div className="text-center px-4 sm:px-0">
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full sm:w-auto min-h-[48px] border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6 text-sm sm:text-base"
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Overview View Component
function OverviewView({ 
  status, 
  onStartVoiceSetup, 
  onStartTraining, 
  loading 
}: { 
  status: IntegrationStatus
  onStartVoiceSetup: () => void
  onStartTraining: () => void
  loading: boolean
}) {
  const getStatusColor = (integrationStatus: string) => {
    switch (integrationStatus) {
      case 'completed': return 'bg-green-500'
      case 'training': return 'bg-blue-500 animate-pulse'
      case 'ready': return 'bg-hope-500'
      default: return 'bg-peace-300'
    }
  }

  const getStatusIcon = (integrationStatus: string) => {
    switch (integrationStatus) {
      case 'completed': return '✅'
      case 'training': return '🔄'
      case 'ready': return '🚀'
      default: return '⏳'
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl font-gentle text-peace-800">
            Training Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-hope-50 to-comfort-50 rounded-embrace border border-hope-200">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(status.integrationStatus)}`}></div>
                <span className="font-gentle text-hope-800">Overall Status</span>
              </div>
              <div className="text-right">
                <span className="text-lg">{getStatusIcon(status.integrationStatus)}</span>
                <p className="text-sm text-hope-700 font-supportive mt-1">{status.message}</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-embrace border-2 ${status.voiceComplete ? 'bg-green-50 border-green-200' : 'bg-peace-50 border-peace-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{status.voiceComplete ? '✅' : '🎤'}</span>
                  <span className="font-gentle text-sm">Voice Cloning</span>
                </div>
                <p className="text-xs font-supportive text-peace-600">
                  {status.voiceComplete ? 'Voice clone completed' : 'Record voice passages'}
                </p>
                {!status.voiceComplete && (
                  <Button
                    onClick={onStartVoiceSetup}
                    size="sm"
                    className="mt-3 w-full bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace text-xs"
                  >
                    Start Voice Setup
                  </Button>
                )}
              </div>

              <div className={`p-4 rounded-embrace border-2 ${status.textDataSufficient ? 'bg-green-50 border-green-200' : 'bg-peace-50 border-peace-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{status.textDataSufficient ? '✅' : '📝'}</span>
                  <span className="font-gentle text-sm">Training Data</span>
                </div>
                <p className="text-xs font-supportive text-peace-600">
                  {status.textDataSufficient ? 'Sufficient data available' : 'Answer more questions'}
                </p>
                {!status.textDataSufficient && (
                  <Button
                    onClick={() => window.location.href = '/dashboard'}
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace text-xs"
                  >
                    Answer Questions
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Information */}
      <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardContent className="p-6">
          <h3 className="font-gentle text-hope-800 mb-4">What happens during training?</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">🧠</span>
              <div>
                <p className="font-gentle text-hope-700 text-sm">AI Learning</p>
                <p className="text-xs text-hope-600 font-supportive">Your AI learns from your responses, stories, and voice patterns</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">🎤</span>
              <div>
                <p className="font-gentle text-hope-700 text-sm">Voice Integration</p>
                <p className="text-xs text-hope-600 font-supportive">Your cloned voice is integrated with AI responses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">⚡</span>
              <div>
                <p className="font-gentle text-hope-700 text-sm">RTX 5090 Acceleration</p>
                <p className="text-xs text-hope-600 font-supportive">High-end GPU training ensures quality and speed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">💝</span>
              <div>
                <p className="font-gentle text-hope-700 text-sm">Personality Preservation</p>
                <p className="text-xs text-hope-600 font-supportive">Your unique wisdom, tone, and speaking style are preserved</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      {status.integrationStatus === 'ready' && (
        <Card className="mobile-card bg-gradient-to-r from-hope-50 to-comfort-50 border-0 shadow-xl">
          <CardContent className="p-6 text-center">
            <h3 className="font-gentle text-hope-800 mb-4">Ready to Train Your AI!</h3>
            <p className="text-sm text-hope-700 font-supportive mb-6">
              You have completed voice cloning and provided sufficient training data. 
              Your personalized AI training will take approximately 2-3 hours.
            </p>
            <Button
              onClick={onStartTraining}
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-8 py-3 font-supportive"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Starting Training...
                </>
              ) : (
                <>
                  🚀 Start AI Training
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Training Progress View Component
function TrainingProgressView({ 
  progress, 
  onBack 
}: { 
  progress: TrainingProgress | null
  onBack: () => void
}) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const getProgressPercentage = () => {
    if (!progress) return 0
    return Math.round((progress.currentEpoch / progress.totalEpochs) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Training Progress */}
      <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl font-gentle text-peace-800">
              Training in Progress
            </CardTitle>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {progress?.status || 'Training'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-6">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-supportive text-peace-700">Overall Progress</span>
                <span className="text-sm font-supportive text-hope-600">
                  {getProgressPercentage()}%
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="h-3" />
              {progress && (
                <p className="text-xs text-peace-600 font-supportive mt-2">
                  Epoch {progress.currentEpoch} of {progress.totalEpochs}
                </p>
              )}
            </div>

            {/* Training Metrics */}
            {progress && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-hope-50 p-3 rounded-embrace text-center">
                  <div className="text-lg font-bold text-hope-700">{progress.currentLoss.toFixed(3)}</div>
                  <div className="text-xs text-hope-600 font-supportive">Loss</div>
                </div>
                <div className="bg-comfort-50 p-3 rounded-embrace text-center">
                  <div className="text-lg font-bold text-comfort-700">{progress.gpuUtilization}%</div>
                  <div className="text-xs text-comfort-600 font-supportive">GPU Usage</div>
                </div>
                <div className="bg-memory-50 p-3 rounded-embrace text-center">
                  <div className="text-lg font-bold text-memory-700">{progress.memoryUsage}%</div>
                  <div className="text-xs text-memory-600 font-supportive">VRAM</div>
                </div>
                <div className="bg-peace-50 p-3 rounded-embrace text-center">
                  <div className="text-lg font-bold text-peace-700">
                    {progress.estimatedTimeRemaining > 0 ? formatTime(progress.estimatedTimeRemaining) : '--'}
                  </div>
                  <div className="text-xs text-peace-600 font-supportive">Remaining</div>
                </div>
              </div>
            )}

            {/* Voice Integration Metrics */}
            {progress?.voiceAlignment && (
              <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-4 rounded-embrace border border-hope-200">
                <h4 className="font-gentle text-hope-800 mb-3">Voice Integration Quality</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-hope-700">Voice Alignment</span>
                    <span className="text-sm font-supportive text-hope-600">{Math.round(progress.voiceAlignment * 100)}%</span>
                  </div>
                  <Progress value={progress.voiceAlignment * 100} className="h-2" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Information */}
      <Card className="mobile-card bg-white/70 backdrop-blur-md border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="font-gentle text-peace-800 mb-4">What&apos;s Happening Now?</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 animate-pulse">🧠</span>
              <div>
                <p className="font-gentle text-peace-700">Learning Your Personality</p>
                <p className="text-xs text-peace-600 font-supportive">The AI is analyzing your responses to understand your unique perspective and wisdom</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 animate-pulse">🎤</span>
              <div>
                <p className="font-gentle text-peace-700">Integrating Your Voice</p>
                <p className="text-xs text-peace-600 font-supportive">Your voice patterns are being woven into the AI&apos;s response system</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 animate-pulse">⚡</span>
              <div>
                <p className="font-gentle text-peace-700">RTX 5090 Processing</p>
                <p className="text-xs text-peace-600 font-supportive">Advanced GPU acceleration ensures high-quality training results</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="text-center">
        <Button
          onClick={onBack}
          variant="outline"
          className="w-full sm:w-auto border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6"
        >
          Back to Overview
        </Button>
      </div>
    </div>
  )
}

// Completed View Component
function CompletedView({ 
  onBack, 
  onTestAI 
}: { 
  onBack: () => void
  onTestAI: () => void
}) {
  return (
    <div className="space-y-6">
      <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="space-y-6">
            <div>
              <div className="inline-block p-4 rounded-full bg-gradient-to-br from-green-100 to-hope-100 mb-4 animate-bounce">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-gentle text-peace-800 mb-4">
                Your AI is Ready!
              </h2>
              <p className="text-peace-600 font-supportive leading-relaxed">
                Congratulations! Your personalized AI has been successfully trained with your voice and wisdom. 
                It can now speak with your authentic voice and respond with your unique perspective.
              </p>
            </div>

            <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-6 rounded-embrace border border-hope-200">
              <h3 className="font-gentle text-hope-800 mb-4">Your AI Can Now:</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🗣️</span>
                  <div>
                    <p className="font-gentle text-hope-700">Speak With Your Voice</p>
                    <p className="text-sm text-hope-600 font-supportive">Every response uses your authentic voice clone</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">🧠</span>
                  <div>
                    <p className="font-gentle text-hope-700">Share Your Wisdom</p>
                    <p className="text-sm text-hope-600 font-supportive">Trained on your personal responses and stories</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg">💝</span>
                  <div>
                    <p className="font-gentle text-hope-700">Connect Emotionally</p>
                    <p className="text-sm text-hope-600 font-supportive">Maintains your personality and emotional tone</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onTestAI}
                className="flex-1 bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 py-3 font-supportive"
              >
                🎤 Chat with Your AI
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                className="w-full sm:w-auto border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6 font-supportive"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}