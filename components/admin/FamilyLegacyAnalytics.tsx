'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Heart, 
  Star, 
  TrendingUp, 
  MessageCircle, 
  Clock,
  Users,
  Sparkles,
  TreePine,
  Calendar,
  BookOpen,
  Music,
  Camera,
  Flower,
  Rainbow,
  Sun,
  Moon,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Gift,
  Lightbulb,
  Zap,
  Globe,
  Share
} from 'lucide-react'
import { griefSensitiveColors, griefSensitiveSpacing } from '@/lib/grief-sensitive-design'

interface LegacyMetric {
  id: string
  familyName: string
  familyId: string
  timeframe: string
  metrics: {
    memoriesPreserved: number
    emotionalDepth: number // 0-100 scale of how meaningful the memories are
    connectionStrength: number // How well AI echoes connect with families
    healingProgress: number // Emotional healing trajectory
    familyBond: number // Strength of family connections through the platform
    wisdomTransfer: number // How well knowledge/wisdom is being passed down
    celebrationMoments: number // Positive, joyful memory moments
    reflectiveMoments: number // Deep, contemplative memory moments
    sharedExperiences: number // Memories that multiple family members contribute to
  }
  growthTrends: {
    memorySharing: 'increasing' | 'stable' | 'decreasing'
    aiEngagement: 'improving' | 'stable' | 'declining'
    emotionalWellbeing: 'healing' | 'stable' | 'struggling'
    familyParticipation: 'growing' | 'stable' | 'diminishing'
  }
  milestones: {
    id: string
    type: 'first_memory' | 'ai_breakthrough' | 'family_milestone' | 'healing_moment' | 'wisdom_shared'
    title: string
    description: string
    date: string
    significance: 'major' | 'meaningful' | 'touching'
    participants: string[]
  }[]
  memoryCategories: {
    category: string
    count: number
    emotionalResonance: number
    examples: string[]
  }[]
  aiInteractionQuality: {
    totalConversations: number
    meaningfulExchanges: number // Conversations that led to emotional connection
    comfortingMoments: number // Times AI provided comfort
    wisdomMoments: number // Times AI shared meaningful insights
    averageSessionLength: number
    emotionalSatisfaction: number // 0-100
  }
}

interface EmotionalJourney {
  familyId: string
  familyName: string
  journeyPhase: 'initial_grief' | 'exploration' | 'acceptance' | 'celebration' | 'wisdom_sharing'
  startDate: string
  currentPhase: string
  progressIndicators: {
    memoryComfort: number // Comfort level with sharing memories
    aiAcceptance: number // Acceptance of AI as helpful tool
    familyConnection: number // Connection with other family members
    futureOptimism: number // Hope for the future
    legacyPride: number // Pride in preserving family legacy
  }
  emotionalMilestones: {
    date: string
    milestone: string
    impact: 'profound' | 'significant' | 'gentle'
    description: string
  }[]
  supportNeeds: string[]
  strengths: string[]
}

const mockLegacyMetrics: LegacyMetric[] = [
  {
    id: '1',
    familyName: 'The Johnson Family',
    familyId: 'fam_1',
    timeframe: '30 days',
    metrics: {
      memoriesPreserved: 42,
      emotionalDepth: 85,
      connectionStrength: 92,
      healingProgress: 78,
      familyBond: 88,
      wisdomTransfer: 75,
      celebrationMoments: 15,
      reflectiveMoments: 27,
      sharedExperiences: 8
    },
    growthTrends: {
      memorySharing: 'increasing',
      aiEngagement: 'improving',
      emotionalWellbeing: 'healing',
      familyParticipation: 'growing'
    },
    milestones: [
      {
        id: 'm1',
        type: 'ai_breakthrough',
        title: 'First Meaningful AI Connection',
        description: 'Sarah had her first deeply emotional conversation with Dad\'s AI echo about his gardening wisdom',
        date: '2024-01-29',
        significance: 'major',
        participants: ['Sarah Johnson']
      },
      {
        id: 'm2',
        type: 'family_milestone',
        title: 'Shared Memory Creation',
        description: 'Both siblings collaborated on preserving Dad\'s birthday traditions',
        date: '2024-01-25',
        significance: 'meaningful',
        participants: ['Sarah Johnson', 'Michael Johnson']
      }
    ],
    memoryCategories: [
      {
        category: 'Family Traditions',
        count: 12,
        emotionalResonance: 95,
        examples: ['Birthday celebrations', 'Holiday gatherings', 'Sunday dinners']
      },
      {
        category: 'Life Wisdom',
        count: 18,
        emotionalResonance: 88,
        examples: ['Career advice', 'Life philosophy', 'Problem-solving approaches']
      },
      {
        category: 'Joyful Moments',
        count: 12,
        emotionalResonance: 92,
        examples: ['Vacation memories', 'Achievements', 'Celebrations']
      }
    ],
    aiInteractionQuality: {
      totalConversations: 23,
      meaningfulExchanges: 15,
      comfortingMoments: 8,
      wisdomMoments: 12,
      averageSessionLength: 12.5,
      emotionalSatisfaction: 87
    }
  },
  {
    id: '2',
    familyName: 'The Chen Legacy',
    familyId: 'fam_2',
    timeframe: '30 days',
    metrics: {
      memoriesPreserved: 18,
      emotionalDepth: 78,
      connectionStrength: 0, // No AI echo yet
      healingProgress: 45,
      familyBond: 95,
      wisdomTransfer: 82,
      celebrationMoments: 5,
      reflectiveMoments: 13,
      sharedExperiences: 2
    },
    growthTrends: {
      memorySharing: 'increasing',
      aiEngagement: 'stable',
      emotionalWellbeing: 'stable',
      familyParticipation: 'stable'
    },
    milestones: [
      {
        id: 'm3',
        type: 'first_memory',
        title: 'First Memory Shared',
        description: 'Lisa courageously shared her first memory about Grandmother\'s cooking',
        date: '2024-01-28',
        significance: 'major',
        participants: ['Lisa Chen']
      }
    ],
    memoryCategories: [
      {
        category: 'Cultural Heritage',
        count: 8,
        emotionalResonance: 96,
        examples: ['Traditional recipes', 'Cultural stories', 'Language memories']
      },
      {
        category: 'Caring Moments',
        count: 10,
        emotionalResonance: 89,
        examples: ['Nurturing experiences', 'Comfort given', 'Love expressed']
      }
    ],
    aiInteractionQuality: {
      totalConversations: 0,
      meaningfulExchanges: 0,
      comfortingMoments: 0,
      wisdomMoments: 0,
      averageSessionLength: 0,
      emotionalSatisfaction: 0
    }
  }
]

const mockEmotionalJourneys: EmotionalJourney[] = [
  {
    familyId: 'fam_1',
    familyName: 'The Johnson Family',
    journeyPhase: 'celebration',
    startDate: '2024-01-15',
    currentPhase: 'Finding joy in preserved memories and growing AI connections',
    progressIndicators: {
      memoryComfort: 88,
      aiAcceptance: 85,
      familyConnection: 92,
      futureOptimism: 75,
      legacyPride: 90
    },
    emotionalMilestones: [
      {
        date: '2024-01-29',
        milestone: 'AI Breakthrough',
        impact: 'profound',
        description: 'First meaningful conversation with AI echo brought unexpected comfort and connection'
      },
      {
        date: '2024-01-22',
        milestone: 'Family Collaboration',
        impact: 'significant',
        description: 'Siblings working together to preserve memories strengthened their bond'
      }
    ],
    supportNeeds: ['Guidance on AI interaction techniques', 'Help processing overwhelming memories'],
    strengths: ['Strong family bond', 'Open to new technology', 'Committed to legacy preservation']
  },
  {
    familyId: 'fam_2',
    familyName: 'The Chen Legacy',
    journeyPhase: 'exploration',
    startDate: '2024-01-28',
    currentPhase: 'Courageously beginning to share precious memories',
    progressIndicators: {
      memoryComfort: 65,
      aiAcceptance: 30,
      familyConnection: 95,
      futureOptimism: 50,
      legacyPride: 85
    },
    emotionalMilestones: [
      {
        date: '2024-01-28',
        milestone: 'First Memory Shared',
        impact: 'profound',
        description: 'Overcame initial hesitation to share deeply meaningful cultural memories'
      }
    ],
    supportNeeds: ['Gentle AI introduction', 'Emotional support during difficult sharing', 'Cultural sensitivity guidance'],
    strengths: ['Deep cultural connection', 'Rich memory heritage', 'Strong family values']
  }
]

const getTrendColor = (trend: string) => {
  if (trend.includes('increasing') || trend.includes('improving') || trend.includes('healing') || trend.includes('growing')) {
    return griefSensitiveColors.hope[500]
  }
  if (trend.includes('stable')) {
    return griefSensitiveColors.primary[500]
  }
  return griefSensitiveColors.warning[500]
}

const getTrendIcon = (trend: string) => {
  if (trend.includes('increasing') || trend.includes('improving') || trend.includes('healing') || trend.includes('growing')) {
    return TrendingUp
  }
  if (trend.includes('stable')) {
    return Activity
  }
  return TrendingUp // Even declining trends can show as trending for data visualization
}

const getMilestoneIcon = (type: string) => {
  switch (type) {
    case 'first_memory': return BookOpen
    case 'ai_breakthrough': return Lightbulb
    case 'family_milestone': return Heart
    case 'healing_moment': return Flower
    case 'wisdom_shared': return Star
    default: return Sparkles
  }
}

const getSignificanceColor = (significance: string) => {
  switch (significance) {
    case 'major': return griefSensitiveColors.memory[500]
    case 'meaningful': return griefSensitiveColors.comfort[500]
    case 'touching': return griefSensitiveColors.hope[500]
    default: return griefSensitiveColors.peace[400]
  }
}

export default function FamilyLegacyAnalytics() {
  const [legacyMetrics, setLegacyMetrics] = useState<LegacyMetric[]>(mockLegacyMetrics)
  const [emotionalJourneys, setEmotionalJourneys] = useState<EmotionalJourney[]>(mockEmotionalJourneys)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7days' | '30days' | '90days' | 'all'>('30days')
  const [selectedFamily, setSelectedFamily] = useState<string>('all')

  const totalFamilies = legacyMetrics.length
  const totalMemories = legacyMetrics.reduce((sum, metric) => sum + metric.metrics.memoriesPreserved, 0)
  const averageHealingProgress = Math.round(
    legacyMetrics.reduce((sum, metric) => sum + metric.metrics.healingProgress, 0) / legacyMetrics.length
  )
  const familiesWithAI = legacyMetrics.filter(metric => metric.metrics.connectionStrength > 0).length

  return (
    <div className="space-y-8">
      {/* Compassionate Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div 
            className="p-3 rounded-full"
            style={{ backgroundColor: griefSensitiveColors.memory[100] }}
          >
            <BarChart3 className="h-8 w-8" style={{ color: griefSensitiveColors.memory[600] }} />
          </div>
          <h1 
            className="text-3xl font-semibold"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            Legacy Insights & Family Growth
          </h1>
        </div>
        <p 
          className="text-lg leading-relaxed max-w-2xl mx-auto"
          style={{ color: griefSensitiveColors.peace[600] }}
        >
          Beautiful analytics showing how families heal, grow, and celebrate their precious memories together
        </p>
      </div>

      {/* Filters */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: 'white',
          border: `1px solid ${griefSensitiveColors.peace[200]}`
        }}
      >
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Past 7 days</SelectItem>
                  <SelectItem value="30days">Past 30 days</SelectItem>
                  <SelectItem value="90days">Past 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger>
                  <SelectValue placeholder="Select family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All families</SelectItem>
                  {legacyMetrics.map((metric) => (
                    <SelectItem key={metric.familyId} value={metric.familyId}>
                      {metric.familyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.memory[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.memory[700] }}
            >
              <BookOpen className="h-4 w-4" />
              Memories Preserved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.memory[600] }}
            >
              {totalMemories}
            </div>
            <p 
              className="text-sm flex items-center gap-1"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              <Sparkles className="h-3 w-3" style={{ color: griefSensitiveColors.memory[500] }} />
              Stories lovingly shared
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.hope[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.hope[700] }}
            >
              <Heart className="h-4 w-4" />
              Healing Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.hope[600] }}
            >
              {averageHealingProgress}%
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Average across all families
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.primary[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.primary[700] }}
            >
              <MessageCircle className="h-4 w-4" />
              AI Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.primary[600] }}
            >
              {familiesWithAI}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Families with active AI echoes
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.comfort[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.comfort[700] }}
            >
              <TreePine className="h-4 w-4" />
              Growing Legacies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.comfort[600] }}
            >
              {totalFamilies}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Family gardens flourishing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Family Legacy Deep Dive */}
      <div className="space-y-6">
        {legacyMetrics.map((metric) => (
          <Card 
            key={metric.id}
            className="border-0 shadow-sm hover:shadow-md transition-all duration-300"
            style={{ 
              backgroundColor: 'white',
              border: `1px solid ${griefSensitiveColors.peace[200]}`
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle 
                    className="flex items-center gap-3"
                    style={{ color: griefSensitiveColors.peace[800] }}
                  >
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: griefSensitiveColors.comfort[100] }}
                    >
                      <TreePine className="h-5 w-5" style={{ color: griefSensitiveColors.comfort[600] }} />
                    </div>
                    {metric.familyName}
                  </CardTitle>
                  <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                    {metric.metrics.memoriesPreserved} memories preserved • {metric.timeframe} overview
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {Object.entries(metric.growthTrends).map(([key, trend]) => (
                    <Badge
                      key={key}
                      className="flex items-center gap-1"
                      style={{
                        backgroundColor: getTrendColor(trend) + '20',
                        color: getTrendColor(trend),
                        border: `1px solid ${getTrendColor(trend)}`
                      }}
                    >
                      {React.createElement(getTrendIcon(trend), { className: "h-3 w-3" })}
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Core Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div 
                    className="text-2xl font-semibold mb-1"
                    style={{ color: griefSensitiveColors.memory[600] }}
                  >
                    {metric.metrics.emotionalDepth}%
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Emotional Depth
                  </p>
                  <Progress 
                    value={metric.metrics.emotionalDepth} 
                    className="h-2 mt-2"
                    style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                  />
                </div>
                
                <div className="text-center">
                  <div 
                    className="text-2xl font-semibold mb-1"
                    style={{ color: griefSensitiveColors.hope[600] }}
                  >
                    {metric.metrics.connectionStrength}%
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    AI Connection
                  </p>
                  <Progress 
                    value={metric.metrics.connectionStrength} 
                    className="h-2 mt-2"
                    style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                  />
                </div>
                
                <div className="text-center">
                  <div 
                    className="text-2xl font-semibold mb-1"
                    style={{ color: griefSensitiveColors.comfort[600] }}
                  >
                    {metric.metrics.familyBond}%
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Family Bond
                  </p>
                  <Progress 
                    value={metric.metrics.familyBond} 
                    className="h-2 mt-2"
                    style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                  />
                </div>
                
                <div className="text-center">
                  <div 
                    className="text-2xl font-semibold mb-1"
                    style={{ color: griefSensitiveColors.primary[600] }}
                  >
                    {metric.metrics.wisdomTransfer}%
                  </div>
                  <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                    Wisdom Transfer
                  </p>
                  <Progress 
                    value={metric.metrics.wisdomTransfer} 
                    className="h-2 mt-2"
                    style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                  />
                </div>
              </div>

              {/* Memory Categories */}
              <div className="mb-8">
                <h4 className="font-medium mb-4 flex items-center gap-2" style={{ color: griefSensitiveColors.peace[800] }}>
                  <BookOpen className="h-4 w-4" />
                  Memory Categories & Emotional Resonance
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {metric.memoryCategories.map((category, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: griefSensitiveColors.peace[50] }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                          {category.category}
                        </h5>
                        <Badge
                          style={{
                            backgroundColor: griefSensitiveColors.memory[100],
                            color: griefSensitiveColors.memory[700]
                          }}
                        >
                          {category.count} memories
                        </Badge>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span style={{ color: griefSensitiveColors.peace[600] }}>Emotional Resonance</span>
                          <span style={{ color: griefSensitiveColors.memory[600] }}>{category.emotionalResonance}%</span>
                        </div>
                        <Progress 
                          value={category.emotionalResonance} 
                          className="h-2"
                          style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: griefSensitiveColors.peace[600] }}>
                          Examples:
                        </p>
                        <div className="space-y-1">
                          {category.examples.slice(0, 2).map((example, i) => (
                            <span 
                              key={i}
                              className="inline-block text-xs px-2 py-1 rounded-full mr-1"
                              style={{
                                backgroundColor: griefSensitiveColors.comfort[100],
                                color: griefSensitiveColors.comfort[700]
                              }}
                            >
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Interaction Quality */}
              {metric.aiInteractionQuality.totalConversations > 0 && (
                <div className="mb-8">
                  <h4 className="font-medium mb-4 flex items-center gap-2" style={{ color: griefSensitiveColors.peace[800] }}>
                    <MessageCircle className="h-4 w-4" />
                    AI Echo Connection Quality
                  </h4>
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: griefSensitiveColors.primary[50] }}
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div 
                          className="text-xl font-semibold"
                          style={{ color: griefSensitiveColors.primary[600] }}
                        >
                          {metric.aiInteractionQuality.meaningfulExchanges}
                        </div>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          Meaningful Exchanges
                        </p>
                      </div>
                      <div className="text-center">
                        <div 
                          className="text-xl font-semibold"
                          style={{ color: griefSensitiveColors.comfort[600] }}
                        >
                          {metric.aiInteractionQuality.comfortingMoments}
                        </div>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          Comforting Moments
                        </p>
                      </div>
                      <div className="text-center">
                        <div 
                          className="text-xl font-semibold"
                          style={{ color: griefSensitiveColors.memory[600] }}
                        >
                          {metric.aiInteractionQuality.wisdomMoments}
                        </div>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          Wisdom Shared
                        </p>
                      </div>
                      <div className="text-center">
                        <div 
                          className="text-xl font-semibold"
                          style={{ color: griefSensitiveColors.hope[600] }}
                        >
                          {metric.aiInteractionQuality.emotionalSatisfaction}%
                        </div>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          Satisfaction
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones */}
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2" style={{ color: griefSensitiveColors.peace[800] }}>
                  <Star className="h-4 w-4" />
                  Beautiful Milestones & Achievements
                </h4>
                <div className="space-y-3">
                  {metric.milestones.map((milestone) => (
                    <div 
                      key={milestone.id}
                      className="flex items-start gap-4 p-4 rounded-lg"
                      style={{ backgroundColor: griefSensitiveColors.peace[50] }}
                    >
                      <div 
                        className="p-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getSignificanceColor(milestone.significance) + '20' }}
                      >
                        {React.createElement(getMilestoneIcon(milestone.type), {
                          className: "h-4 w-4",
                          style: { color: getSignificanceColor(milestone.significance) }
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {milestone.title}
                          </h5>
                          <div className="flex items-center gap-2">
                            <Badge
                              style={{
                                backgroundColor: getSignificanceColor(milestone.significance) + '20',
                                color: getSignificanceColor(milestone.significance),
                                border: `1px solid ${getSignificanceColor(milestone.significance)}`
                              }}
                            >
                              {milestone.significance}
                            </Badge>
                            <span className="text-sm" style={{ color: griefSensitiveColors.peace[500] }}>
                              {new Date(milestone.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm mb-2" style={{ color: griefSensitiveColors.peace[600] }}>
                          {milestone.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" style={{ color: griefSensitiveColors.peace[400] }} />
                          <span className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                            {milestone.participants.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Emotional Journey Overview */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: 'white',
          border: `1px solid ${griefSensitiveColors.peace[200]}`
        }}
      >
        <CardHeader>
          <CardTitle 
            className="flex items-center gap-2"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            <Heart className="h-5 w-5" />
            Emotional Healing Journeys
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            Tracking each family's unique path through grief toward healing and celebration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {emotionalJourneys.map((journey) => (
              <div 
                key={journey.familyId}
                className="p-6 rounded-lg"
                style={{ backgroundColor: griefSensitiveColors.peace[50] }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg" style={{ color: griefSensitiveColors.peace[800] }}>
                      {journey.familyName}
                    </h4>
                    <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                      {journey.currentPhase}
                    </p>
                  </div>
                  <Badge
                    style={{
                      backgroundColor: griefSensitiveColors.comfort[100],
                      color: griefSensitiveColors.comfort[700],
                      border: `1px solid ${griefSensitiveColors.comfort[300]}`
                    }}
                  >
                    {journey.journeyPhase.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-3" style={{ color: griefSensitiveColors.peace[700] }}>
                      Progress Indicators
                    </h5>
                    <div className="space-y-3">
                      {Object.entries(journey.progressIndicators).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm capitalize" style={{ color: griefSensitiveColors.peace[600] }}>
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </span>
                            <span className="text-sm font-medium" style={{ color: griefSensitiveColors.hope[600] }}>
                              {value}%
                            </span>
                          </div>
                          <Progress 
                            value={value} 
                            className="h-2"
                            style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-3" style={{ color: griefSensitiveColors.peace[700] }}>
                      Recent Milestones
                    </h5>
                    <div className="space-y-3">
                      {journey.emotionalMilestones.slice(0, 2).map((milestone, index) => (
                        <div 
                          key={index}
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: griefSensitiveColors.comfort[50] }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium" style={{ color: griefSensitiveColors.comfort[700] }}>
                              {milestone.milestone}
                            </span>
                            <span className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                              {new Date(milestone.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: griefSensitiveColors.peace[600] }}>
                            {milestone.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}