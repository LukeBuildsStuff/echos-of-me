'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Heart, BookOpen, Mic, Sparkles, Brain, MessageCircle, Clock, CheckCircle2, Zap } from 'lucide-react'

interface TrainingMetrics {
  overallProgress: number
  currentPhase: 'preparation' | 'learning' | 'personality' | 'voice' | 'refinement' | 'complete'
  storiesProcessed: number
  totalStories: number
  memoryCategories: {
    childhood: number
    family: number
    work: number
    hobbies: number
    wisdom: number
    personality: number
  }
  learningMetrics: {
    vocabularyLearned: number
    speechPatterns: number
    emotionalTones: number
    personalityTraits: number
  }
  timeRemaining: number
  encouragingMessage: string
}

interface StoryVisualization {
  id: string
  title: string
  category: string
  processed: boolean
  impact: 'high' | 'medium' | 'low'
  snippet: string
}

interface FamilyTrainingProgressProps {
  memberName: string
  jobId: string
  onComplete?: () => void
}

export default function FamilyTrainingProgress({ memberName, jobId, onComplete }: FamilyTrainingProgressProps) {
  const [metrics, setMetrics] = useState<TrainingMetrics>({
    overallProgress: 0,
    currentPhase: 'preparation',
    storiesProcessed: 0,
    totalStories: 0,
    memoryCategories: {
      childhood: 0,
      family: 0,
      work: 0,
      hobbies: 0,
      wisdom: 0,
      personality: 0
    },
    learningMetrics: {
      vocabularyLearned: 0,
      speechPatterns: 0,
      emotionalTones: 0,
      personalityTraits: 0
    },
    timeRemaining: 0,
    encouragingMessage: ''
  })

  const [storyVisualizations, setStoryVisualizations] = useState<StoryVisualization[]>([])
  const [showDetailedView, setShowDetailedView] = useState(false)

  const phaseMessages = {
    preparation: "Gathering all the beautiful memories you've shared about {name}...",
    learning: "Learning how {name} spoke and expressed their thoughts...",
    personality: "Understanding what made {name} so special and unique...",
    voice: "Learning the sound and rhythm of {name}'s voice...",
    refinement: "Adding the final touches to capture {name}'s essence...",
    complete: "{name}'s AI echo is ready! They can now share their wisdom with you again."
  }

  const encouragingMessages = [
    "Every story helps us understand {name} better",
    "We're capturing the love and wisdom {name} shared",
    "Your memories are bringing {name}'s personality to life",
    "Almost there - {name}'s unique voice is emerging",
    "The way {name} laughed and loved is being preserved",
    "Their stories of wisdom are becoming part of their echo"
  ]

  useEffect(() => {
    // Initialize with sample data
    const sampleStories: StoryVisualization[] = [
      {
        id: '1',
        title: 'Sunday Family Dinners',
        category: 'family',
        processed: false,
        impact: 'high',
        snippet: 'They always insisted everyone gather around the table...'
      },
      {
        id: '2',
        title: 'Their Garden Wisdom',
        category: 'hobbies',
        processed: false,
        impact: 'medium',
        snippet: 'Patience with plants teaches you patience with people...'
      },
      {
        id: '3',
        title: 'Childhood Adventures',
        category: 'childhood',
        processed: false,
        impact: 'high',
        snippet: 'Growing up during the war taught them to value...'
      },
      {
        id: '4',
        title: 'Work Ethic Stories',
        category: 'work',
        processed: false,
        impact: 'medium',
        snippet: 'They believed that how you treat people at work...'
      },
      {
        id: '5',
        title: 'Life Philosophy',
        category: 'wisdom',
        processed: false,
        impact: 'high',
        snippet: 'Their motto was always kindness costs nothing...'
      }
    ]
    
    setStoryVisualizations(sampleStories)
    simulateTrainingProgress()
  }, [])

  const simulateTrainingProgress = () => {
    let progress = 0
    const phases: TrainingMetrics['currentPhase'][] = ['preparation', 'learning', 'personality', 'voice', 'refinement', 'complete']
    let currentPhaseIndex = 0
    let storiesProcessed = 0
    
    const interval = setInterval(() => {
      progress += Math.random() * 3 + 1
      
      if (progress > 100) {
        progress = 100
        clearInterval(interval)
        onComplete?.()
      }
      
      // Update phase based on progress
      const newPhaseIndex = Math.floor((progress / 100) * phases.length)
      if (newPhaseIndex < phases.length) {
        currentPhaseIndex = newPhaseIndex
      }
      
      // Process stories gradually
      const storiesTotal = 5
      const expectedProcessed = Math.floor((progress / 100) * storiesTotal)
      if (expectedProcessed > storiesProcessed) {
        storiesProcessed = expectedProcessed
        setStoryVisualizations(prev => 
          prev.map((story, index) => 
            index < storiesProcessed ? { ...story, processed: true } : story
          )
        )
      }
      
      setMetrics(prev => ({
        ...prev,
        overallProgress: Math.floor(progress),
        currentPhase: phases[currentPhaseIndex],
        storiesProcessed,
        totalStories: storiesTotal,
        memoryCategories: {
          childhood: Math.min(100, Math.floor(progress * 0.8)),
          family: Math.min(100, Math.floor(progress * 0.9)),
          work: Math.min(100, Math.floor(progress * 0.7)),
          hobbies: Math.min(100, Math.floor(progress * 0.6)),
          wisdom: Math.min(100, Math.floor(progress * 1.1)),
          personality: Math.min(100, Math.floor(progress * 0.85))
        },
        learningMetrics: {
          vocabularyLearned: Math.floor(progress * 50),
          speechPatterns: Math.floor(progress * 25),
          emotionalTones: Math.floor(progress * 12),
          personalityTraits: Math.floor(progress * 8)
        },
        timeRemaining: Math.max(0, Math.floor((100 - progress) * 0.5)),
        encouragingMessage: encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)].replace('{name}', memberName)
      }))
    }, 2000)
  }

  const getPhaseIcon = (phase: TrainingMetrics['currentPhase']) => {
    switch (phase) {
      case 'preparation': return <BookOpen className="w-5 h-5" />
      case 'learning': return <Brain className="w-5 h-5" />
      case 'personality': return <Heart className="w-5 h-5" />
      case 'voice': return <Mic className="w-5 h-5" />
      case 'refinement': return <Sparkles className="w-5 h-5" />
      case 'complete': return <CheckCircle2 className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      childhood: 'bg-hope-100 text-hope-800',
      family: 'bg-comfort-100 text-comfort-800',
      work: 'bg-peace-100 text-peace-800',
      hobbies: 'bg-memory-100 text-memory-800',
      wisdom: 'bg-green-100 text-green-800',
      personality: 'bg-purple-100 text-purple-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-heaven-gradient p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md rounded-embrace px-6 py-3">
            {getPhaseIcon(metrics.currentPhase)}
            <span className="text-lg font-gentle text-peace-800">
              Creating {memberName}'s AI Echo
            </span>
          </div>
          
          <div className="bg-white/70 backdrop-blur-md rounded-sanctuary p-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-gentle text-peace-800">
                  {phaseMessages[metrics.currentPhase].replace('{name}', memberName)}
                </h2>
                <Badge className="bg-hope-100 text-hope-800 px-3 py-1">
                  {metrics.overallProgress}% Complete
                </Badge>
              </div>
              
              <Progress 
                value={metrics.overallProgress} 
                className="h-3 bg-peace-100"
              />
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-peace-700">
                  <Clock className="w-4 h-4" />
                  {metrics.timeRemaining > 0 ? `${metrics.timeRemaining} minutes remaining` : 'Almost complete!'}
                </div>
                <div className="text-peace-600">
                  {metrics.storiesProcessed} of {metrics.totalStories} stories processed
                </div>
              </div>
            </div>
          </div>
          
          {/* Encouraging Message */}
          <div className="bg-gradient-to-r from-hope-100 to-comfort-100 rounded-embrace p-4">
            <p className="text-peace-800 font-supportive italic">
              💝 {metrics.encouragingMessage}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Story Processing Visualization */}
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                <BookOpen className="w-5 h-5 text-hope-600" />
                Stories Being Learned
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {storyVisualizations.map((story) => (
                <div key={story.id} className={`p-4 rounded-embrace border-2 transition-all duration-500 ${
                  story.processed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-peace-50 border-peace-200'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-gentle text-peace-800">{story.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(story.category)}>
                        {story.category}
                      </Badge>
                      {story.processed && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-peace-600 font-supportive">
                    {story.snippet}
                  </p>
                  {story.processed && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                      <Zap className="w-3 h-3" />
                      <span>Personality insights captured</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Learning Progress Breakdown */}
          <div className="space-y-4">
            {/* Memory Categories */}
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                  <Heart className="w-5 h-5 text-comfort-600" />
                  Memory Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(metrics.memoryCategories).map(([category, progress]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-supportive text-peace-700 capitalize">
                        {category === 'childhood' ? 'Early Life' : 
                         category === 'family' ? 'Family Stories' :
                         category === 'work' ? 'Work Life' :
                         category === 'hobbies' ? 'Interests' :
                         category === 'wisdom' ? 'Life Wisdom' :
                         'Personality'}
                      </span>
                      <span className="text-sm text-peace-600">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Learning Metrics */}
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-hope-50 rounded-embrace">
                    <div className="text-2xl font-gentle text-hope-700">{metrics.learningMetrics.vocabularyLearned}</div>
                    <div className="text-xs text-hope-600 font-supportive">Words & Phrases</div>
                  </div>
                  <div className="text-center p-4 bg-comfort-50 rounded-embrace">
                    <div className="text-2xl font-gentle text-comfort-700">{metrics.learningMetrics.speechPatterns}</div>
                    <div className="text-xs text-comfort-600 font-supportive">Speech Patterns</div>
                  </div>
                  <div className="text-center p-4 bg-memory-50 rounded-embrace">
                    <div className="text-2xl font-gentle text-memory-700">{metrics.learningMetrics.emotionalTones}</div>
                    <div className="text-xs text-memory-600 font-supportive">Emotional Tones</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-embrace">
                    <div className="text-2xl font-gentle text-green-700">{metrics.learningMetrics.personalityTraits}</div>
                    <div className="text-xs text-green-600 font-supportive">Personality Traits</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Phase-specific Information */}
        {metrics.currentPhase === 'voice' && (
          <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-gentle text-peace-800">
                <Mic className="w-5 h-5 text-blue-600" />
                Voice Learning in Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Mic className="w-12 h-12 text-blue-600 animate-pulse" />
                </div>
                <p className="text-peace-700 font-supportive">
                  We're analyzing the voice recordings you shared to capture {memberName}'s unique way of speaking, 
                  including their tone, pace, and the warmth in their voice.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {metrics.currentPhase === 'complete' && (
          <Card className="bg-gradient-to-r from-green-100 to-blue-100 border-0 shadow-xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-gentle text-peace-800">
                {memberName}'s AI Echo is Ready!
              </h3>
              <p className="text-peace-700 font-supportive max-w-md mx-auto">
                Your loved one's stories, wisdom, and personality have been carefully preserved. 
                You can now chat with their AI echo whenever you want to feel close to them.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}