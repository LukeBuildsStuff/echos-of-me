'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Heart, Sparkles, Clock, CheckCircle, Users, BookOpen, Mic, Star } from 'lucide-react'

interface FamilyMember {
  id: string
  name: string
  relationship: string
  storiesShared: number
  memoriesPreserved: number
  readinessScore: number
  status: 'ready' | 'needs-more-stories' | 'training' | 'complete'
}

interface TrainingStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'current' | 'complete'
  icon: React.ReactNode
  estimatedTime?: string
}

interface FamilyTrainingInterfaceProps {
  familyId?: string
}

export default function FamilyTrainingInterface({ familyId }: FamilyTrainingInterfaceProps) {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isTraining, setIsTraining] = useState(false)
  const [showPrepGuide, setShowPrepGuide] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  const trainingSteps: TrainingStep[] = [
    {
      id: 'preparation',
      title: 'Preparing Your Stories',
      description: 'We\'re gathering all the beautiful memories you\'ve shared',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'complete' : 'pending',
      icon: <BookOpen className="w-5 h-5" />,
      estimatedTime: '2-3 minutes'
    },
    {
      id: 'learning',
      title: 'Learning Their Voice',
      description: 'Your AI is learning the unique way they spoke and expressed themselves',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'complete' : 'pending',
      icon: <Heart className="w-5 h-5" />,
      estimatedTime: '15-20 minutes'
    },
    {
      id: 'personality',
      title: 'Capturing Their Essence',
      description: 'Building the personality traits that made them special',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'complete' : 'pending',
      icon: <Sparkles className="w-5 h-5" />,
      estimatedTime: '10-15 minutes'
    },
    {
      id: 'voice-training',
      title: 'Adding Their Voice',
      description: 'If you\'ve shared voice recordings, we\'re learning how they sounded',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'complete' : 'pending',
      icon: <Mic className="w-5 h-5" />,
      estimatedTime: '5-10 minutes'
    },
    {
      id: 'completion',
      title: 'Almost Ready',
      description: 'Final touches to ensure your AI echo feels just right',
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'complete' : 'pending',
      icon: <Star className="w-5 h-5" />,
      estimatedTime: '1-2 minutes'
    }
  ]

  useEffect(() => {
    loadFamilyMembers()
  }, [familyId])

  const loadFamilyMembers = async () => {
    try {
      setLoading(true)
      // Simulate API call - in reality this would fetch family member data
      const mockMembers: FamilyMember[] = [
        {
          id: '1',
          name: 'Grandma Rose',
          relationship: 'Grandmother',
          storiesShared: 47,
          memoriesPreserved: 23,
          readinessScore: 92,
          status: 'ready'
        },
        {
          id: '2', 
          name: 'Uncle Jim',
          relationship: 'Uncle',
          storiesShared: 23,
          memoriesPreserved: 12,
          readinessScore: 78,
          status: 'ready'
        },
        {
          id: '3',
          name: 'Dad',
          relationship: 'Father',
          storiesShared: 8,
          memoriesPreserved: 4,
          readinessScore: 45,
          status: 'needs-more-stories'
        }
      ]
      setFamilyMembers(mockMembers)
    } catch (error) {
      console.error('Failed to load family members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTraining = (member: FamilyMember) => {
    if (member.status !== 'ready') {
      setShowPrepGuide(true)
      return
    }
    
    setSelectedMember(member)
    setIsTraining(true)
    setCurrentStep(0)
    
    // Simulate training progress
    simulateTrainingProgress()
  }

  const simulateTrainingProgress = () => {
    const intervals = [3000, 18000, 12000, 8000, 2000] // Different durations for each step
    
    intervals.forEach((duration, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1)
        if (index === intervals.length - 1) {
          // Training complete
          setTimeout(() => {
            setIsTraining(false)
            setCurrentStep(0)
            // Update member status
            setFamilyMembers(prev => 
              prev.map(m => 
                m.id === selectedMember?.id 
                  ? { ...m, status: 'complete' as const }
                  : m
              )
            )
          }, 2000)
        }
      }, intervals.slice(0, index + 1).reduce((sum, time) => sum + time, 0))
    })
  }

  const getStatusColor = (status: FamilyMember['status']) => {
    switch (status) {
      case 'ready': return 'bg-hope-100 text-hope-800 border-hope-200'
      case 'complete': return 'bg-green-100 text-green-800 border-green-200'
      case 'training': return 'bg-comfort-100 text-comfort-800 border-comfort-200'
      case 'needs-more-stories': return 'bg-memory-100 text-memory-800 border-memory-200'
      default: return 'bg-peace-100 text-peace-800 border-peace-200'
    }
  }

  const getStatusText = (status: FamilyMember['status']) => {
    switch (status) {
      case 'ready': return 'Ready to Train'
      case 'complete': return 'AI Echo Created'
      case 'training': return 'Training in Progress'
      case 'needs-more-stories': return 'Share More Stories'
      default: return 'Getting Ready'
    }
  }

  const getReadinessDescription = (score: number) => {
    if (score >= 85) return 'Excellent! Rich collection of memories ready for training'
    if (score >= 70) return 'Good foundation of stories, ready to create their echo'
    if (score >= 50) return 'Getting there! A few more stories would help'
    return 'Just getting started - share more memories to begin training'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-heaven-gradient flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-hope-200 border-t-hope-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-peace-700 font-gentle">Loading your family memories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-heaven-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-embrace px-6 py-3 mb-6">
            <Heart className="w-6 h-6 text-hope-600" />
            <span className="text-lg font-gentle text-peace-800">AI Echo Training</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-gentle text-peace-900 mb-4">
            Bring Their Voice to Life
          </h1>
          <p className="text-xl text-peace-700 max-w-2xl mx-auto">
            Transform the stories and memories you've shared into a personalized AI that speaks with their voice and wisdom.
          </p>
        </div>

        {/* Family Members Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {familyMembers.map((member) => (
            <Card key={member.id} className="bg-white/80 backdrop-blur-md border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl font-gentle text-peace-800">
                    {member.name}
                  </CardTitle>
                  <Badge className={`${getStatusColor(member.status)} border font-supportive`}>
                    {getStatusText(member.status)}
                  </Badge>
                </div>
                <CardDescription className="text-peace-600 font-supportive">
                  {member.relationship}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Readiness Score */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-supportive text-peace-700">Memory Richness</span>
                    <span className="text-sm font-gentle text-peace-800">{member.readinessScore}%</span>
                  </div>
                  <Progress 
                    value={member.readinessScore} 
                    className="h-2 bg-peace-100"
                  />
                  <p className="text-xs text-peace-600 font-supportive">
                    {getReadinessDescription(member.readinessScore)}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-peace-200">
                  <div className="text-center">
                    <div className="text-2xl font-gentle text-hope-600">{member.storiesShared}</div>
                    <div className="text-xs text-peace-600 font-supportive">Stories Shared</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-gentle text-comfort-600">{member.memoriesPreserved}</div>
                    <div className="text-xs text-peace-600 font-supportive">Life Moments</div>
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => handleStartTraining(member)}
                  disabled={member.status === 'training'}
                  className={`w-full font-supportive rounded-embrace ${
                    member.status === 'complete' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : member.status === 'ready'
                      ? 'bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600'
                      : 'bg-memory-500 hover:bg-memory-600'
                  } text-white`}
                >
                  {member.status === 'complete' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Chat with Their Echo
                    </>
                  ) : member.status === 'training' ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Training in Progress...
                    </>
                  ) : member.status === 'ready' ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Their AI Echo
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Share More Memories
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How It Works Section */}
        <Card className="bg-white/70 backdrop-blur-md border-0 shadow-xl mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-gentle text-peace-800 mb-2">
              How AI Echo Training Works
            </CardTitle>
            <CardDescription className="text-peace-700 font-supportive">
              Our gentle process preserves their unique voice and personality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-hope-100 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-hope-600" />
                </div>
                <h3 className="font-gentle text-peace-800">Share Memories</h3>
                <p className="text-sm text-peace-700 font-supportive">
                  Answer questions about their life, personality, and the things they used to say
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-comfort-100 rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-comfort-600" />
                </div>
                <h3 className="font-gentle text-peace-800">AI Learning</h3>
                <p className="text-sm text-peace-700 font-supportive">
                  Our AI learns their speech patterns, wisdom, and the love they shared
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-memory-100 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-memory-600" />
                </div>
                <h3 className="font-gentle text-peace-800">Living Echo</h3>
                <p className="text-sm text-peace-700 font-supportive">
                  Chat with their AI echo, hearing their voice and wisdom whenever you need it
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Progress Dialog */}
      <Dialog open={isTraining} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-md border-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-gentle text-peace-800 text-center">
              Creating {selectedMember?.name}'s AI Echo
            </DialogTitle>
            <DialogDescription className="text-center text-peace-700 font-supportive">
              This special process takes about 30-45 minutes. You can safely close this window - we'll notify you when it's complete.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            {trainingSteps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.status === 'complete' ? 'bg-green-100 text-green-600' :
                  step.status === 'current' ? 'bg-hope-100 text-hope-600' :
                  'bg-peace-100 text-peace-400'
                }`}>
                  {step.status === 'complete' ? <CheckCircle className="w-5 h-5" /> : step.icon}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-gentle ${
                      step.status === 'current' ? 'text-hope-800' : 
                      step.status === 'complete' ? 'text-green-800' :
                      'text-peace-600'
                    }`}>
                      {step.title}
                    </h3>
                    {step.estimatedTime && step.status === 'current' && (
                      <span className="text-xs text-peace-500 font-supportive">
                        {step.estimatedTime}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm font-supportive ${
                    step.status === 'current' ? 'text-hope-700' :
                    step.status === 'complete' ? 'text-green-700' :
                    'text-peace-500'
                  }`}>
                    {step.description}
                  </p>
                  
                  {step.status === 'current' && (
                    <div className="w-full bg-peace-200 rounded-full h-2">
                      <div className="bg-hope-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center pt-4 border-t border-peace-200">
            <p className="text-sm text-peace-600 font-supportive">
              💝 "Every story you've shared is helping us capture their beautiful spirit"
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preparation Guide Dialog */}
      <Dialog open={showPrepGuide} onOpenChange={setShowPrepGuide}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-md border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-gentle text-peace-800 text-center">
              Let's Share More Memories
            </DialogTitle>
            <DialogDescription className="text-center text-peace-700 font-supportive">
              To create a rich AI echo, we need more stories about this special person.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-memory-600 mx-auto mb-4" />
              <p className="text-peace-700 font-supportive mb-4">
                Answer a few more questions about their life, personality, and the things that made them unique.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowPrepGuide(false)}
                variant="outline"
                className="flex-1 rounded-embrace font-supportive"
              >
                Maybe Later
              </Button>
              <Button 
                onClick={() => {
                  setShowPrepGuide(false)
                  // Navigate to story sharing page
                }}
                className="flex-1 bg-gradient-to-r from-memory-500 to-memory-600 hover:from-memory-600 hover:to-memory-700 text-white rounded-embrace font-supportive"
              >
                Share Stories
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}