'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import VoiceTrainingGuide from './VoiceTrainingGuide'
import VoiceCloneInterface from './VoiceCloneInterface'

interface VoiceOnboardingWorkflowProps {
  onBack: () => void
  initialStep?: 'welcome' | 'guide' | 'recording' | 'testing' | 'complete'
}

type WorkflowStep = 'welcome' | 'guide' | 'recording' | 'testing' | 'complete'

interface StepInfo {
  id: WorkflowStep
  title: string
  description: string
  icon: string
  estimatedTime: string
}

const WORKFLOW_STEPS: StepInfo[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Learn about voice cloning',
    icon: '👋',
    estimatedTime: '2 min'
  },
  {
    id: 'guide',
    title: 'Training Guide', 
    description: 'Preparation tips & techniques',
    icon: '📚',
    estimatedTime: '5 min'
  },
  {
    id: 'recording',
    title: 'Voice Recording',
    description: 'Record your voice passages',
    icon: '🎤',
    estimatedTime: '10-15 min'
  },
  {
    id: 'testing',
    title: 'Test Your Voice',
    description: 'Try your voice in chat',
    icon: '🔊',
    estimatedTime: '3 min'
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Your voice is ready!',
    icon: '🎉',
    estimatedTime: 'Done!'
  }
]

export default function VoiceOnboardingWorkflow({ 
  onBack, 
  initialStep = 'welcome' 
}: VoiceOnboardingWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(initialStep)
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set())
  const [userProgress, setUserProgress] = useState({
    hasSeenWelcome: false,
    hasViewedGuide: false,
    hasCompletedRecording: false,
    hasTestedVoice: false
  })

  // Auto-advance through certain steps
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep === 'welcome' && !userProgress.hasSeenWelcome) {
        setUserProgress(prev => ({ ...prev, hasSeenWelcome: true }))
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [currentStep, userProgress.hasSeenWelcome])

  const markStepComplete = (step: WorkflowStep) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev)
      newSet.add(step)
      return newSet
    })
  }

  const goToStep = (step: WorkflowStep) => {
    markStepComplete(currentStep)
    setCurrentStep(step)
  }

  const handleGuideComplete = () => {
    setUserProgress(prev => ({ ...prev, hasViewedGuide: true }))
    markStepComplete('guide')
    setCurrentStep('recording')
  }

  const handleRecordingComplete = () => {
    setUserProgress(prev => ({ ...prev, hasCompletedRecording: true }))
    markStepComplete('recording')
    setCurrentStep('testing')
  }

  const handleTestingComplete = () => {
    setUserProgress(prev => ({ ...prev, hasTestedVoice: true }))
    markStepComplete('testing')
    setCurrentStep('complete')
  }

  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => step.id === currentStep)
  const progressPercentage = ((currentStepIndex + 1) / WORKFLOW_STEPS.length) * 100

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={() => goToStep('guide')} onSkipToRecording={() => goToStep('recording')} />
      
      case 'guide':
        return (
          <VoiceTrainingGuide 
            onStartTraining={handleGuideComplete}
            onClose={() => goToStep('recording')}
          />
        )
      
      case 'recording':
        return (
          <VoiceCloneInterface 
            onBack={onBack}
            onComplete={handleRecordingComplete}
          />
        )
      
      case 'testing':
        return <TestingStep onComplete={handleTestingComplete} onSkip={handleTestingComplete} />
      
      case 'complete':
        return <CompletionStep onFinish={onBack} />
      
      default:
        return null
    }
  }

  if (currentStep === 'guide' || currentStep === 'recording') {
    return renderStepContent()
  }

  return (
    <div className="mobile-full-height bg-heaven-gradient py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6" style={{ paddingLeft: 'max(0.75rem, var(--safe-area-inset-left))', paddingRight: 'max(0.75rem, var(--safe-area-inset-right))' }}>
        
        {/* Progress Header */}
        <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader className="px-4 sm:px-6">
            <div className="text-center mb-4">
              <div className="inline-block p-2 sm:p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-3 animate-float">
                <span className="text-2xl sm:text-3xl">{WORKFLOW_STEPS[currentStepIndex]?.icon}</span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
                Voice Clone Setup
              </CardTitle>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-supportive text-peace-700">
                  Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length}
                </span>
                <span className="text-sm font-supportive text-hope-600">
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <div className="w-full bg-hope-100 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 h-3 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* Step Navigator */}
            <div className="flex justify-center gap-2 mt-4">
              {WORKFLOW_STEPS.map((step, index) => {
                const isCompleted = completedSteps.has(step.id)
                const isCurrent = step.id === currentStep
                const isAccessible = index <= currentStepIndex || completedSteps.has(step.id)
                
                return (
                  <button
                    key={step.id}
                    onClick={() => isAccessible && goToStep(step.id)}
                    disabled={!isAccessible}
                    className={`relative group ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    title={`${step.title} - ${step.estimatedTime}`}
                  >
                    <div 
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-green-500 shadow-md' 
                          : isCurrent 
                            ? 'bg-hope-500 shadow-md ring-2 ring-hope-200 animate-pulse' 
                            : isAccessible
                              ? 'bg-peace-300 hover:bg-hope-300'
                              : 'bg-peace-200'
                      }`}
                    />
                    {isAccessible && (
                      <div className="absolute hidden group-hover:block top-full mt-2 left-1/2 transform -translate-x-1/2 bg-peace-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {step.title}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-peace-800 rotate-45"></div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardHeader>
        </Card>

        {/* Step Content */}
        {renderStepContent()}
      </div>
    </div>
  )
}

// Welcome Step Component
function WelcomeStep({ onNext, onSkipToRecording }: { onNext: () => void, onSkipToRecording: () => void }) {
  return (
    <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
      <CardContent className="p-6 sm:p-8 text-center">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-gentle text-peace-800 mb-4">
              Create Your Voice Legacy
            </h2>
            <p className="text-peace-600 font-supportive leading-relaxed">
              Your voice is more than just sound—it&apos;s emotion, comfort, and connection. 
              By creating a voice clone, you&apos;re preserving something deeply personal for your loved ones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-hope-50 rounded-embrace border border-hope-200">
              <div className="text-2xl mb-2">🎤</div>
              <h3 className="font-gentle text-hope-800 mb-2">Record</h3>
              <p className="text-xs text-hope-700 font-supportive">
                Share 3 meaningful passages that capture your voice and personality.
              </p>
            </div>
            
            <div className="p-4 bg-comfort-50 rounded-embrace border border-comfort-200">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-gentle text-comfort-800 mb-2">Create</h3>
              <p className="text-xs text-comfort-700 font-supportive">
                Advanced AI learns your unique speech patterns and emotional range.
              </p>
            </div>
            
            <div className="p-4 bg-memory-50 rounded-embrace border border-memory-200">
              <div className="text-2xl mb-2">💝</div>
              <h3 className="font-gentle text-memory-800 mb-2">Connect</h3>
              <p className="text-xs text-memory-700 font-supportive">
                Your AI echo speaks with your authentic voice in conversations.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-4 rounded-embrace border border-hope-200">
            <h4 className="font-gentle text-hope-800 mb-2">What You&apos;ll Need:</h4>
            <ul className="text-sm text-hope-700 font-supportive space-y-1 text-left">
              <li>• 10-15 minutes of your time</li>
              <li>• A quiet space with minimal background noise</li>
              <li>• A device with a microphone (phone, laptop, or tablet)</li>
              <li>• Your authentic, natural speaking voice</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onNext}
              className="flex-1 bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 py-3 font-supportive"
            >
              Learn Best Practices First
            </Button>
            <Button
              onClick={onSkipToRecording}
              variant="outline"
              className="w-full sm:w-auto border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6 font-supportive"
            >
              Skip to Recording
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Testing Step Component  
function TestingStep({ onComplete, onSkip }: { onComplete: () => void, onSkip: () => void }) {
  const [testMessage, setTestMessage] = useState('')

  return (         
    <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-gentle text-peace-800 mb-4">
              Test Your Voice Clone
            </h2>
            <p className="text-peace-600 font-supportive">
              Your voice clone is ready! Send a test message to hear how it sounds.
            </p>
          </div>

          <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-4 rounded-embrace border border-hope-200">
            <h4 className="font-gentle text-hope-800 mb-3">Try These Test Messages:</h4>
            <div className="grid grid-cols-1 gap-2">
              {[
                "Hello, this is my voice clone speaking to you with love.",
                "I hope you can hear the warmth and care in my voice.",
                "This technology amazes me - it really sounds like me!"
              ].map((message, index) => (
                <button
                  key={index}
                  onClick={() => setTestMessage(message)}
                  className="text-left p-2 bg-white/60 rounded-comfort hover:bg-white/80 transition-all duration-200 text-sm font-supportive text-hope-700 border border-hope-200"
                >
                  &ldquo;{message}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Type a message to test your voice clone..."
              className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate resize-none"
              rows={3}
            />
            
            <Button
              onClick={() => {
                // Here you would typically send the message to the voice synthesis API
                // For now, we'll just simulate success
                setTimeout(onComplete, 2000)
              }}
              disabled={!testMessage.trim()}
              className="w-full bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 py-3 font-supportive"
            >
              🔊 Test My Voice Clone
            </Button>
          </div>

          <div className="text-center">
            <Button
              onClick={onSkip}
              variant="outline"
              className="border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-2 px-4 text-sm font-supportive"
            >
              Skip Testing - Continue Setup
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Completion Step Component
function CompletionStep({ onFinish }: { onFinish: () => void }) {
  return (
    <Card className="mobile-card bg-white/80 backdrop-blur-md border-0 shadow-xl">
      <CardContent className="p-6 sm:p-8 text-center">
        <div className="space-y-6">
          <div>
            <div className="inline-block p-4 rounded-full bg-gradient-to-br from-green-100 to-hope-100 mb-4 animate-bounce">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-2xl font-gentle text-peace-800 mb-4">
              Your Voice Clone is Complete!
            </h2>
            <p className="text-peace-600 font-supportive leading-relaxed">
              Congratulations! You&apos;ve successfully created a voice clone that captures your unique speech patterns, 
              emotional range, and the warmth that makes your voice special.
            </p>
          </div>

          <div className="bg-gradient-to-r from-hope-50 to-comfort-50 p-6 rounded-embrace border border-hope-200">
            <h3 className="font-gentle text-hope-800 mb-4">What Happens Next?</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3">
                <span className="text-lg">🤖</span>
                <div>
                  <p className="font-gentle text-hope-700">AI Echo Conversations</p>
                  <p className="text-sm text-hope-600 font-supportive">Your AI echo can now speak with your authentic voice in chat conversations.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">🔄</span>
                <div>
                  <p className="font-gentle text-hope-700">Continuous Improvement</p>
                  <p className="text-sm text-hope-600 font-supportive">Your voice clone gets better over time as you have more conversations.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">💝</span>
                <div>
                  <p className="font-gentle text-hope-700">Family Access</p>
                  <p className="text-sm text-hope-600 font-supportive">Loved ones can hear your voice when they chat with your AI echo.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => window.location.href = '/ai-echo'}
              className="flex-1 bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-6 py-3 font-supportive"
            >
              Try AI Echo Chat Now
            </Button>
            <Button
              onClick={onFinish}
              variant="outline"
              className="w-full sm:w-auto border-2 border-peace-400 text-peace-700 hover:bg-peace-50 rounded-embrace py-3 px-6 font-supportive"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}