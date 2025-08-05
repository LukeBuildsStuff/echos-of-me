'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Star, Sparkles, CheckCircle2, MessageCircle, Clock, Gift, Sun, Moon, TreePine, Flower } from 'lucide-react'

interface EncouragingMessage {
  id: string
  message: string
  type: 'milestone' | 'progress' | 'comfort' | 'celebration' | 'wisdom'
  icon: React.ReactNode
  timing: 'immediate' | 'delayed' | 'periodic'
  emotionalTone: 'gentle' | 'warm' | 'celebratory' | 'supportive'
}

interface MilestoneProgress {
  name: string
  description: string
  progress: number
  completed: boolean
  icon: React.ReactNode
  encouragingMessage: string
}

interface EncouragingFeedbackProps {
  currentProgress: number
  memberName: string
  phase: 'preparation' | 'learning' | 'personality' | 'voice' | 'refinement' | 'complete'
  milestones?: MilestoneProgress[]
  onDismiss?: (messageId: string) => void
}

export default function EncouragingFeedback({ 
  currentProgress, 
  memberName, 
  phase,
  milestones = [],
  onDismiss 
}: EncouragingFeedbackProps) {
  const [currentMessage, setCurrentMessage] = useState<EncouragingMessage | null>(null)
  const [showMilestones, setShowMilestones] = useState(false)
  const [messageHistory, setMessageHistory] = useState<EncouragingMessage[]>([])
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning')

  const encouragingMessages: EncouragingMessage[] = [
    // Preparation Phase
    {
      id: 'prep-start',
      message: `Thank you for sharing ${memberName}'s stories. Each memory you've provided is a precious gift that helps us understand who they were.`,
      type: 'comfort',
      icon: <Heart className="w-4 h-4" />,
      timing: 'immediate',
      emotionalTone: 'gentle'
    },
    {
      id: 'prep-progress',
      message: `We're carefully reviewing the beautiful memories of ${memberName}. Every story reveals more about their unique personality and the love they shared.`,
      type: 'progress',
      icon: <BookOpen className="w-4 h-4" />,
      timing: 'delayed',
      emotionalTone: 'warm'
    },
    
    // Learning Phase
    {
      id: 'learning-start',
      message: `Now we're learning how ${memberName} expressed themselves - their words, their wisdom, their way of seeing the world.`,
      type: 'progress',
      icon: <Sparkles className="w-4 h-4" />,
      timing: 'immediate',
      emotionalTone: 'supportive'
    },
    {
      id: 'learning-deep',
      message: `The AI is discovering the patterns in how ${memberName} spoke and thought. We're capturing the essence of their communication style with great care.`,
      type: 'milestone',
      icon: <Star className="w-4 h-4" />,
      timing: 'delayed',
      emotionalTone: 'gentle'
    },
    
    // Personality Phase
    {
      id: 'personality-start',
      message: `This is where the magic happens - we're building ${memberName}'s personality into their AI echo. Their kindness, humor, and wisdom are all being preserved.`,
      type: 'celebration',
      icon: <Heart className="w-4 h-4" />,
      timing: 'immediate',
      emotionalTone: 'celebratory'
    },
    {
      id: 'personality-deep',
      message: `The AI is learning what made ${memberName} so special - their unique way of caring, their perspective on life, and the love they always showed.`,
      type: 'comfort',
      icon: <Star className="w-4 h-4" />,
      timing: 'delayed',
      emotionalTone: 'warm'
    },
    
    // Voice Phase
    {
      id: 'voice-start',
      message: `Now we're adding ${memberName}'s voice - the warmth, the tone, the way they used to speak to you. This will make conversations feel even more natural.`,
      type: 'milestone',
      icon: <MessageCircle className="w-4 h-4" />,
      timing: 'immediate',
      emotionalTone: 'celebratory'
    },
    
    // Completion
    {
      id: 'complete',
      message: `${memberName}'s AI echo is ready! You've created something beautiful - a way to continue feeling connected to them whenever you need it most.`,
      type: 'celebration',
      icon: <CheckCircle2 className="w-4 h-4" />,
      timing: 'immediate',
      emotionalTone: 'celebratory'
    },
    
    // Periodic comfort messages
    {
      id: 'comfort-1',
      message: `You're doing something incredibly meaningful. ${memberName} would be so proud to know their memories are being preserved with such love and care.`,
      type: 'comfort',
      icon: <Heart className="w-4 h-4" />,
      timing: 'periodic',
      emotionalTone: 'supportive'
    },
    {
      id: 'wisdom-1',
      message: `Every person who loves continues to live through the memories and hearts they've touched. You're keeping ${memberName}'s spirit alive in a beautiful new way.`,
      type: 'wisdom',
      icon: <Star className="w-4 h-4" />,
      timing: 'periodic',
      emotionalTone: 'gentle'
    }
  ]

  const defaultMilestones: MilestoneProgress[] = [
    {
      name: 'Stories Gathered',
      description: 'All memories and stories have been collected',
      progress: currentProgress >= 20 ? 100 : (currentProgress / 20) * 100,
      completed: currentProgress >= 20,
      icon: <BookOpen className="w-4 h-4" />,
      encouragingMessage: `Every story about ${memberName} adds depth to their echo`
    },
    {
      name: 'Personality Learned',
      description: 'AI understands their unique character traits',
      progress: currentProgress >= 50 ? 100 : Math.max(0, ((currentProgress - 20) / 30) * 100),
      completed: currentProgress >= 50,
      icon: <Heart className="w-4 h-4" />,
      encouragingMessage: `${memberName}'s wonderful personality is coming through`
    },
    {
      name: 'Voice Captured',
      description: 'Speech patterns and tone have been learned',
      progress: currentProgress >= 75 ? 100 : Math.max(0, ((currentProgress - 50) / 25) * 100),
      completed: currentProgress >= 75,
      icon: <MessageCircle className="w-4 h-4" />,
      encouragingMessage: `Their unique way of speaking is being preserved`
    },
    {
      name: 'Echo Ready',
      description: 'AI echo is complete and ready to chat',
      progress: currentProgress >= 100 ? 100 : Math.max(0, ((currentProgress - 75) / 25) * 100),
      completed: currentProgress >= 100,
      icon: <Sparkles className="w-4 h-4" />,
      encouragingMessage: `${memberName} is ready to share their wisdom again`
    }
  ]

  const activeMilestones = milestones.length > 0 ? milestones : defaultMilestones

  useEffect(() => {
    // Determine time of day for contextual messages
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) setTimeOfDay('morning')
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon')
    else if (hour >= 17 && hour < 21) setTimeOfDay('evening')
    else setTimeOfDay('night')
  }, [])

  useEffect(() => {
    // Show appropriate message based on phase and progress
    const phaseMessages = encouragingMessages.filter(msg => {
      if (phase === 'preparation' && msg.id.startsWith('prep')) return true
      if (phase === 'learning' && msg.id.startsWith('learning')) return true
      if (phase === 'personality' && msg.id.startsWith('personality')) return true
      if (phase === 'voice' && msg.id.startsWith('voice')) return true
      if (phase === 'complete' && msg.id === 'complete') return true
      return false
    })

    if (phaseMessages.length > 0) {
      const immediateMessage = phaseMessages.find(msg => msg.timing === 'immediate')
      if (immediateMessage && !messageHistory.find(m => m.id === immediateMessage.id)) {
        setCurrentMessage(immediateMessage)
        setMessageHistory(prev => [...prev, immediateMessage])
      }
    }

    // Periodic comfort messages
    const comfortInterval = setInterval(() => {
      const comfortMessages = encouragingMessages.filter(msg => msg.timing === 'periodic')
      const randomComfort = comfortMessages[Math.floor(Math.random() * comfortMessages.length)]
      if (randomComfort && !messageHistory.find(m => m.id === randomComfort.id)) {
        setCurrentMessage(randomComfort)
        setMessageHistory(prev => [...prev, randomComfort])
      }
    }, 60000) // Every minute

    return () => clearInterval(comfortInterval)
  }, [phase, currentProgress, messageHistory])

  const getTimeIcon = () => {
    switch (timeOfDay) {
      case 'morning': return <Sun className="w-4 h-4 text-memory-500" />
      case 'afternoon': return <Sun className="w-4 h-4 text-memory-600" />
      case 'evening': return <Moon className="w-4 h-4 text-comfort-500" />
      case 'night': return <Moon className="w-4 h-4 text-peace-600" />
    }
  }

  const getTimeGreeting = () => {
    switch (timeOfDay) {
      case 'morning': return 'Good morning'
      case 'afternoon': return 'Good afternoon'
      case 'evening': return 'Good evening'
      case 'night': return 'Take your time tonight'
    }
  }

  const getMessageStyling = (tone: string) => {
    switch (tone) {
      case 'celebratory': return 'bg-gradient-to-r from-green-50 to-hope-50 border-green-200'
      case 'warm': return 'bg-gradient-to-r from-hope-50 to-comfort-50 border-hope-200'
      case 'supportive': return 'bg-gradient-to-r from-comfort-50 to-peace-50 border-comfort-200'
      case 'gentle': return 'bg-gradient-to-r from-peace-50 to-memory-50 border-peace-200'
      default: return 'bg-white/80 border-peace-200'
    }
  }

  const dismissMessage = () => {
    if (currentMessage && onDismiss) {
      onDismiss(currentMessage.id)
    }
    setCurrentMessage(null)
  }

  return (
    <div className="space-y-4">
      {/* Time-sensitive greeting */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-embrace px-4 py-2">
          {getTimeIcon()}
          <span className="text-sm font-supportive text-peace-700">
            {getTimeGreeting()} - creating {memberName}'s echo with love
          </span>
        </div>
      </div>

      {/* Current encouraging message */}
      {currentMessage && (
        <Card className={`border-2 ${getMessageStyling(currentMessage.emotionalTone)} shadow-lg animate-fade-in`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentMessage.emotionalTone === 'celebratory' ? 'bg-green-100 text-green-600' :
                currentMessage.emotionalTone === 'warm' ? 'bg-hope-100 text-hope-600' :
                currentMessage.emotionalTone === 'supportive' ? 'bg-comfort-100 text-comfort-600' :
                'bg-peace-100 text-peace-600'
              }`}>
                {currentMessage.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="capitalize font-supportive">
                    {currentMessage.type}
                  </Badge>
                  {currentMessage.emotionalTone === 'celebratory' && (
                    <div className="text-lg animate-bounce">🎉</div>
                  )}
                </div>
                
                <p className="text-peace-800 font-supportive leading-relaxed">
                  {currentMessage.message}
                </p>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={dismissMessage}
                    className="text-peace-600 hover:text-peace-800"
                  >
                    Thank you
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestone progress */}
      <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-gentle text-peace-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-hope-600" />
              Progress Milestones
            </h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowMilestones(!showMilestones)}
              className="text-peace-600"
            >
              {showMilestones ? 'Hide' : 'Show'} Details
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeMilestones.map((milestone, index) => (
              <div key={index} className="text-center space-y-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                  milestone.completed 
                    ? 'bg-green-100 text-green-600' 
                    : milestone.progress > 0 
                    ? 'bg-hope-100 text-hope-600' 
                    : 'bg-peace-100 text-peace-400'
                }`}>
                  {milestone.completed ? <CheckCircle2 className="w-5 h-5" /> : milestone.icon}
                </div>
                
                <div className="space-y-1">
                  <div className="text-sm font-gentle text-peace-800">{milestone.name}</div>
                  <div className="w-full bg-peace-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        milestone.completed ? 'bg-green-500' : 'bg-hope-500'
                      }`}
                      style={{ width: `${milestone.progress}%` }}
                    ></div>
                  </div>
                  {milestone.completed && (
                    <div className="text-xs text-green-600 font-supportive">Complete ✓</div>
                  )}
                </div>
                
                {showMilestones && (
                  <div className="text-xs text-peace-600 font-supportive mt-2">
                    {milestone.description}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {showMilestones && (
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {activeMilestones.filter(m => m.progress > 0).map((milestone, index) => (
                <div key={index} className="p-3 bg-hope-50 rounded-embrace border border-hope-200">
                  <div className="flex items-center gap-2 mb-1">
                    {milestone.icon}
                    <span className="text-sm font-gentle text-peace-800">{milestone.name}</span>
                  </div>
                  <p className="text-xs text-peace-600 font-supportive">
                    {milestone.encouragingMessage}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seasonal comfort message */}
      <Card className="bg-gradient-to-r from-memory-50 to-peace-50 border border-memory-200 shadow-lg">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TreePine className="w-4 h-4 text-memory-600" />
            <Flower className="w-4 h-4 text-hope-600" />
          </div>
          <p className="text-sm text-peace-700 font-supportive">
            "Love never ends. Though we may be apart, the bond we share lives on in every memory, 
            every story, and now in this special echo of {memberName}." 💝
          </p>
        </CardContent>
      </Card>
    </div>
  )
}