'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, Settings, Sparkles, Volume2, Clock, Shield, Star, Info, CheckCircle2, AlertCircle } from 'lucide-react'

interface TrainingPreferences {
  personalityDepth: number
  responseStyle: 'gentle' | 'warm' | 'wise' | 'playful'
  memoryFocus: {
    childhood: boolean
    family: boolean
    work: boolean
    hobbies: boolean
    wisdom: boolean
    personality: boolean
  }
  voiceSettings: {
    enabled: boolean
    emotionalExpression: number
    speakingPace: 'slow' | 'moderate' | 'natural'
  }
  privacyLevel: 'family-only' | 'close-family' | 'extended-family'
  trainingIntensity: 'gentle' | 'thorough' | 'comprehensive'
}

interface FamilyMember {
  id: string
  name: string
  relationship: string
  storiesCount: number
  readinessScore: number
}

interface FamilyTrainingConfigurationProps {
  selectedMember: FamilyMember
  onConfigurationComplete: (config: TrainingPreferences) => void
  onBack: () => void
}

export default function FamilyTrainingConfiguration({ 
  selectedMember, 
  onConfigurationComplete, 
  onBack 
}: FamilyTrainingConfigurationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [preferences, setPreferences] = useState<TrainingPreferences>({
    personalityDepth: 85,
    responseStyle: 'warm',
    memoryFocus: {
      childhood: true,
      family: true,
      work: true,
      hobbies: true,
      wisdom: true,
      personality: true
    },
    voiceSettings: {
      enabled: false,
      emotionalExpression: 75,
      speakingPace: 'natural'
    },
    privacyLevel: 'family-only',
    trainingIntensity: 'thorough'
  })

  const steps = [
    {
      id: 'personality',
      title: 'Personality & Response Style',
      description: 'How would you like them to respond to you?',
      icon: <Heart className="w-5 h-5" />
    },
    {
      id: 'memories',
      title: 'Memory Focus Areas', 
      description: 'Which aspects of their life should we emphasize?',
      icon: <Star className="w-5 h-5" />
    },
    {
      id: 'voice',
      title: 'Voice & Expression',
      description: 'Configure how they sound when they speak',
      icon: <Volume2 className="w-5 h-5" />
    },
    {
      id: 'privacy',
      title: 'Privacy & Training',
      description: 'Final settings for security and training approach',
      icon: <Shield className="w-5 h-5" />
    }
  ]

  const responseStyleDescriptions = {
    gentle: 'Soft, caring responses that comfort and support',
    warm: 'Loving, nurturing tone like they always used',
    wise: 'Thoughtful, insightful responses drawing from their experience',
    playful: 'Light-hearted, humorous responses that bring joy'
  }

  const trainingIntensityDescriptions = {
    gentle: '20-30 minutes • Captures essential personality traits',
    thorough: '45-60 minutes • Comprehensive personality and speech patterns',
    comprehensive: '90+ minutes • Deep learning of all nuances and expressions'
  }

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onConfigurationComplete(preferences)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      onBack()
    }
  }

  const updatePreferences = (updates: Partial<TrainingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }

  const getEstimatedTime = () => {
    const baseTime = preferences.trainingIntensity === 'gentle' ? 25 : 
                    preferences.trainingIntensity === 'thorough' ? 50 : 90
    const voiceTime = preferences.voiceSettings.enabled ? 15 : 0
    const memoryFocusCount = Object.values(preferences.memoryFocus).filter(Boolean).length
    const memoryMultiplier = memoryFocusCount / 6
    
    return Math.round(baseTime * memoryMultiplier + voiceTime)
  }

  return (
    <div className="min-h-screen bg-heaven-gradient p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-embrace px-6 py-3">
            <Settings className="w-5 h-5 text-hope-600" />
            <span className="text-lg font-gentle text-peace-800">Training Configuration</span>
          </div>
          <h1 className="text-4xl font-gentle text-peace-900">
            Customizing {selectedMember.name}'s Echo
          </h1>
          <p className="text-xl text-peace-700">
            Let's set up how you'd like to interact with their AI echo
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-3 ${
                    index <= currentStep ? 'text-hope-700' : 'text-peace-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index < currentStep ? 'bg-green-100 text-green-600' :
                      index === currentStep ? 'bg-hope-100 text-hope-600' :
                      'bg-peace-100 text-peace-400'
                    }`}>
                      {index < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                    </div>
                    <div className="hidden md:block">
                      <div className="font-gentle">{step.title}</div>
                      <div className="text-xs text-peace-600">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-green-300' : 'bg-peace-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Content */}
        <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
              {steps[currentStep].icon}
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription className="text-peace-700 font-supportive">
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Personality & Response Style */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-gentle text-peace-800">How deeply should we capture their personality?</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-peace-700">Personality Depth</span>
                      <Badge className="bg-hope-100 text-hope-800">{preferences.personalityDepth}%</Badge>
                    </div>
                    <Slider
                      value={[preferences.personalityDepth]}
                      onValueChange={(value) => updatePreferences({ personalityDepth: value[0] })}
                      max={100}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-peace-600">
                      <span>Basic traits</span>
                      <span>Full personality</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-gentle text-peace-800">What response style feels most like them?</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(responseStyleDescriptions).map(([style, description]) => (
                      <div 
                        key={style}
                        className={`p-4 rounded-embrace border-2 cursor-pointer transition-all ${
                          preferences.responseStyle === style 
                            ? 'border-hope-300 bg-hope-50' 
                            : 'border-peace-200 bg-white/50 hover:border-hope-200'
                        }`}
                        onClick={() => updatePreferences({ responseStyle: style as any })}
                      >
                        <div className="font-gentle text-peace-800 capitalize mb-2">{style}</div>
                        <div className="text-sm text-peace-600">{description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Memory Focus Areas */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Info className="w-12 h-12 text-hope-600 mx-auto" />
                  <p className="text-peace-700 font-supportive">
                    Choose which aspects of {selectedMember.name}'s life to emphasize in their echo. 
                    More focus areas mean richer conversations but longer training time.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(preferences.memoryFocus).map(([category, enabled]) => (
                    <div key={category} className="flex items-center justify-between p-4 bg-white/50 rounded-embrace border border-peace-200">
                      <div>
                        <Label className="font-gentle text-peace-800 capitalize">
                          {category === 'childhood' ? 'Early Life & Childhood' :
                           category === 'family' ? 'Family Relationships' :
                           category === 'work' ? 'Work & Career' :
                           category === 'hobbies' ? 'Interests & Hobbies' :
                           category === 'wisdom' ? 'Life Wisdom & Advice' :
                           'Personality & Character'}
                        </Label>
                        <div className="text-xs text-peace-600 mt-1">
                          {category === 'childhood' ? 'Stories from their youth and formative years' :
                           category === 'family' ? 'How they related to family members' :
                           category === 'work' ? 'Their professional life and work ethic' :
                           category === 'hobbies' ? 'What they loved to do in their free time' :
                           category === 'wisdom' ? 'Life lessons and advice they shared' :
                           'Their unique character traits and quirks'}
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => 
                          updatePreferences({ 
                            memoryFocus: { ...preferences.memoryFocus, [category]: checked }
                          })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="text-center p-4 bg-hope-50 rounded-embrace">
                  <div className="text-sm text-hope-800">
                    <strong>{Object.values(preferences.memoryFocus).filter(Boolean).length} of 6</strong> memory areas selected
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Voice & Expression */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/50 rounded-embrace border border-peace-200">
                  <div>
                    <Label className="font-gentle text-peace-800">Enable Voice Responses</Label>
                    <div className="text-sm text-peace-600 mt-1">
                      Let their echo speak with a synthesized version of their voice
                    </div>
                  </div>
                  <Switch
                    checked={preferences.voiceSettings.enabled}
                    onCheckedChange={(checked) => 
                      updatePreferences({ 
                        voiceSettings: { ...preferences.voiceSettings, enabled: checked }
                      })
                    }
                  />
                </div>

                {preferences.voiceSettings.enabled && (
                  <div className="space-y-4 p-4 bg-hope-50 rounded-embrace">
                    <div className="space-y-3">
                      <h4 className="font-gentle text-peace-800">Emotional Expression Level</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-peace-700">Expression Intensity</span>
                          <Badge className="bg-hope-100 text-hope-800">{preferences.voiceSettings.emotionalExpression}%</Badge>
                        </div>
                        <Slider
                          value={[preferences.voiceSettings.emotionalExpression]}
                          onValueChange={(value) => 
                            updatePreferences({ 
                              voiceSettings: { ...preferences.voiceSettings, emotionalExpression: value[0] }
                            })
                          }
                          max={100}
                          min={30}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-peace-600">
                          <span>Subtle</span>
                          <span>Very expressive</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-gentle text-peace-800">Speaking Pace</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {['slow', 'moderate', 'natural'].map((pace) => (
                          <Button
                            key={pace}
                            variant={preferences.voiceSettings.speakingPace === pace ? "default" : "outline"}
                            onClick={() => 
                              updatePreferences({ 
                                voiceSettings: { ...preferences.voiceSettings, speakingPace: pace as any }
                              })
                            }
                            className="capitalize rounded-embrace"
                          >
                            {pace}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!preferences.voiceSettings.enabled && (
                  <div className="text-center p-6 bg-peace-50 rounded-embrace">
                    <Volume2 className="w-12 h-12 text-peace-400 mx-auto mb-3" />
                    <p className="text-peace-600 font-supportive">
                      Voice responses are disabled. The echo will communicate through text only.
                      You can always enable voice later.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Privacy & Training */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-gentle text-peace-800">Privacy Level</h3>
                  <div className="space-y-3">
                    {[
                      { value: 'family-only', label: 'Family Only', description: 'Only you and immediate family can interact' },
                      { value: 'close-family', label: 'Close Family', description: 'Immediate and close family members' },
                      { value: 'extended-family', label: 'Extended Family', description: 'All family members you approve' }
                    ].map((option) => (
                      <div 
                        key={option.value}
                        className={`p-4 rounded-embrace border-2 cursor-pointer transition-all ${
                          preferences.privacyLevel === option.value 
                            ? 'border-hope-300 bg-hope-50' 
                            : 'border-peace-200 bg-white/50 hover:border-hope-200'
                        }`}
                        onClick={() => updatePreferences({ privacyLevel: option.value as any })}
                      >
                        <div className="font-gentle text-peace-800">{option.label}</div>
                        <div className="text-sm text-peace-600">{option.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-gentle text-peace-800">Training Approach</h3>
                  <div className="space-y-3">
                    {Object.entries(trainingIntensityDescriptions).map(([intensity, description]) => (
                      <div 
                        key={intensity}
                        className={`p-4 rounded-embrace border-2 cursor-pointer transition-all ${
                          preferences.trainingIntensity === intensity 
                            ? 'border-hope-300 bg-hope-50' 
                            : 'border-peace-200 bg-white/50 hover:border-hope-200'
                        }`}
                        onClick={() => updatePreferences({ trainingIntensity: intensity as any })}
                      >
                        <div className="font-gentle text-peace-800 capitalize mb-1">{intensity} Training</div>
                        <div className="text-sm text-peace-600">{description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Training Summary */}
                <div className="p-6 bg-gradient-to-r from-hope-50 to-comfort-50 rounded-embrace border border-hope-200">
                  <h4 className="font-gentle text-peace-800 mb-4">Training Summary</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-peace-600">Estimated Time:</span>
                      <span className="font-gentle text-peace-800 ml-2">{getEstimatedTime()} minutes</span>
                    </div>
                    <div>
                      <span className="text-peace-600">Voice Enabled:</span>
                      <span className="font-gentle text-peace-800 ml-2">
                        {preferences.voiceSettings.enabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-peace-600">Memory Focus:</span>
                      <span className="font-gentle text-peace-800 ml-2">
                        {Object.values(preferences.memoryFocus).filter(Boolean).length} areas
                      </span>
                    </div>
                    <div>
                      <span className="text-peace-600">Response Style:</span>
                      <span className="font-gentle text-peace-800 ml-2 capitalize">
                        {preferences.responseStyle}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-peace-200">
              <Button 
                variant="outline" 
                onClick={handlePrevStep}
                className="rounded-embrace font-supportive"
              >
                {currentStep === 0 ? 'Back to Selection' : 'Previous'}
              </Button>
              
              <Button 
                onClick={handleNextStep}
                className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Creating Echo
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Helpful Information */}
        <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="w-8 h-8 text-hope-600 mx-auto" />
            <div className="space-y-2">
              <h4 className="font-gentle text-peace-800">A Gentle Reminder</h4>
              <p className="text-peace-700 font-supportive max-w-2xl mx-auto">
                Creating an AI echo is a meaningful process that honors {selectedMember.name}'s memory. 
                The training happens with care and respect, focusing on preserving the love and wisdom they shared. 
                You can always adjust these settings later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}