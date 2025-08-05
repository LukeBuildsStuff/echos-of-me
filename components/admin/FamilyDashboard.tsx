'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Heart, 
  Users, 
  Clock, 
  Star, 
  MessageCircle, 
  Shield, 
  Calendar,
  TreePine,
  Sparkles,
  ArrowRight,
  Phone,
  AlertCircle,
  CheckCircle,
  Moon,
  Sun,
  Camera,
  Music,
  BookOpen,
  Flower
} from 'lucide-react'
import { griefSensitiveColors, griefSensitiveSpacing } from '@/lib/grief-sensitive-design'

interface FamilyMember {
  id: string
  name: string
  role: string
  email: string
  joinedDate: string
  lastActive: string
  memoriesShared: number
  aiConnections: number
  status: 'active' | 'grieving' | 'celebrating' | 'reflecting'
  recentMilestone?: {
    type: 'first_memory' | 'ai_conversation' | 'anniversary' | 'birthday'
    date: string
    description: string
  }
  emotionalJourney: {
    currentPhase: 'exploration' | 'sharing' | 'connecting' | 'healing'
    progress: number
  }
}

interface FamilyTimeline {
  id: string
  familyName: string
  members: FamilyMember[]
  createdDate: string
  totalMemories: number
  aiEchoActive: boolean
  supportLevel: 'stable' | 'monitoring' | 'intervention'
  recentActivity: {
    type: 'memory_shared' | 'ai_conversation' | 'milestone_reached' | 'family_joined'
    description: string
    timestamp: string
    member: string
    emotionalTone: 'hopeful' | 'reflective' | 'joyful' | 'challenging'
  }[]
  legacyMetrics: {
    memoryDepth: number
    connectionStrength: number
    healingProgress: number
    familyBond: number
  }
}

const mockFamilies: FamilyTimeline[] = [
  {
    id: '1',
    familyName: 'The Johnson Family',
    createdDate: '2024-01-15',
    totalMemories: 42,
    aiEchoActive: true,
    supportLevel: 'stable',
    members: [
      {
        id: '1',
        name: 'Sarah Johnson',
        role: 'Daughter',
        email: 'sarah@example.com',
        joinedDate: '2024-01-15',
        lastActive: '2024-01-30',
        memoriesShared: 28,
        aiConnections: 15,
        status: 'reflecting',
        recentMilestone: {
          type: 'ai_conversation',
          date: '2024-01-29',
          description: 'Had her first meaningful conversation with Dad\'s AI echo'
        },
        emotionalJourney: {
          currentPhase: 'healing',
          progress: 75
        }
      },
      {
        id: '2',
        name: 'Michael Johnson',
        role: 'Son',
        email: 'michael@example.com',
        joinedDate: '2024-01-20',
        lastActive: '2024-01-31',
        memoriesShared: 14,
        aiConnections: 8,
        status: 'sharing',
        emotionalJourney: {
          currentPhase: 'sharing',
          progress: 60
        }
      }
    ],
    recentActivity: [
      {
        type: 'ai_conversation',
        description: 'Sarah had a meaningful conversation about Dad\'s gardening wisdom',
        timestamp: '2024-01-31T14:30:00Z',
        member: 'Sarah Johnson',
        emotionalTone: 'hopeful'
      },
      {
        type: 'memory_shared',
        description: 'Michael shared a story about Dad\'s birthday traditions',
        timestamp: '2024-01-31T10:15:00Z',
        member: 'Michael Johnson',
        emotionalTone: 'joyful'
      }
    ],
    legacyMetrics: {
      memoryDepth: 85,
      connectionStrength: 92,
      healingProgress: 78,
      familyBond: 88
    }
  },
  {
    id: '2',
    familyName: 'The Chen Legacy',
    createdDate: '2024-01-28',
    totalMemories: 18,
    aiEchoActive: false,
    supportLevel: 'monitoring',
    members: [
      {
        id: '3',
        name: 'Lisa Chen',
        role: 'Granddaughter',
        email: 'lisa@example.com',
        joinedDate: '2024-01-28',
        lastActive: '2024-01-30',
        memoriesShared: 18,
        aiConnections: 0,
        status: 'grieving',
        emotionalJourney: {
          currentPhase: 'exploration',
          progress: 25
        }
      }
    ],
    recentActivity: [
      {
        type: 'memory_shared',
        description: 'Lisa shared precious memories of Grandmother\'s cooking',
        timestamp: '2024-01-30T16:45:00Z',
        member: 'Lisa Chen',
        emotionalTone: 'reflective'
      }
    ],
    legacyMetrics: {
      memoryDepth: 65,
      connectionStrength: 0,
      healingProgress: 35,
      familyBond: 95
    }
  }
]

const getStatusColor = (status: FamilyMember['status']) => {
  switch (status) {
    case 'active': return griefSensitiveColors.hope[500]
    case 'celebrating': return griefSensitiveColors.memory[500]
    case 'reflecting': return griefSensitiveColors.primary[500]
    case 'grieving': return griefSensitiveColors.comfort[500]
    default: return griefSensitiveColors.peace[400]
  }
}

const getStatusIcon = (status: FamilyMember['status']) => {
  switch (status) {
    case 'active': return Sparkles
    case 'celebrating': return Star
    case 'reflecting': return Moon
    case 'grieving': return Heart
    default: return Sun
  }
}

const getSupportLevelColor = (level: FamilyTimeline['supportLevel']) => {
  switch (level) {
    case 'stable': return griefSensitiveColors.hope[500]
    case 'monitoring': return griefSensitiveColors.memory[500]
    case 'intervention': return griefSensitiveColors.warning[500]
    default: return griefSensitiveColors.peace[400]
  }
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'memory_shared': return BookOpen
    case 'ai_conversation': return MessageCircle
    case 'milestone_reached': return Star
    case 'family_joined': return Heart
    default: return Sparkles
  }
}

const getEmotionalToneColor = (tone: string) => {
  switch (tone) {
    case 'hopeful': return griefSensitiveColors.hope[500]
    case 'joyful': return griefSensitiveColors.memory[500]
    case 'reflective': return griefSensitiveColors.primary[500]
    case 'challenging': return griefSensitiveColors.comfort[500]
    default: return griefSensitiveColors.peace[400]
  }
}

export default function FamilyDashboard() {
  const [families, setFamilies] = useState<FamilyTimeline[]>(mockFamilies)
  const [selectedFamily, setSelectedFamily] = useState<FamilyTimeline | null>(null)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week')

  const totalFamilies = families.length
  const activeFamilies = families.filter(f => f.recentActivity.length > 0).length
  const familiesNeedingSupport = families.filter(f => f.supportLevel === 'monitoring' || f.supportLevel === 'intervention').length
  const totalMemories = families.reduce((sum, f) => sum + f.totalMemories, 0)

  return (
    <div className="space-y-8">
      {/* Compassionate Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div 
            className="p-3 rounded-full"
            style={{ backgroundColor: griefSensitiveColors.comfort[100] }}
          >
            <TreePine className="h-8 w-8" style={{ color: griefSensitiveColors.comfort[600] }} />
          </div>
          <h1 
            className="text-3xl font-semibold"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            Family Legacy Garden
          </h1>
        </div>
        <p 
          className="text-lg leading-relaxed max-w-2xl mx-auto"
          style={{ color: griefSensitiveColors.peace[600] }}
        >
          Nurturing families as they tend to the beautiful gardens of their shared memories and growing legacies
        </p>
      </div>

      {/* Family Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              Family Gardens
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
              className="text-sm flex items-center gap-1"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              <Heart className="h-3 w-3" style={{ color: griefSensitiveColors.hope[500] }} />
              {activeFamilies} actively sharing
            </p>
          </CardContent>
        </Card>

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
              <Star className="h-4 w-4" />
              Precious Memories
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
              Stories lovingly preserved
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
              <MessageCircle className="h-4 w-4" />
              AI Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.hope[600] }}
            >
              {families.filter(f => f.aiEchoActive).length}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Families connecting with love
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: familiesNeedingSupport > 0 ? griefSensitiveColors.warning[50] : 'white',
            border: `1px solid ${familiesNeedingSupport > 0 ? griefSensitiveColors.warning[300] : griefSensitiveColors.peace[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: familiesNeedingSupport > 0 ? griefSensitiveColors.warning[700] : griefSensitiveColors.peace[700] }}
            >
              <Shield className="h-4 w-4" />
              Gentle Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: familiesNeedingSupport > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600] }}
            >
              {familiesNeedingSupport}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              {familiesNeedingSupport > 0 ? 'Families receiving extra care' : 'All families supported'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 
          className="text-2xl font-semibold"
          style={{ color: griefSensitiveColors.peace[800] }}
        >
          Family Journeys
        </h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              style={{
                backgroundColor: timeRange === range ? griefSensitiveColors.primary[500] : 'transparent',
                borderColor: griefSensitiveColors.primary[300],
                color: timeRange === range ? 'white' : griefSensitiveColors.primary[600]
              }}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Family Timeline Cards */}
      <div className="space-y-6">
        {families.map((family) => (
          <Card 
            key={family.id}
            className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
            style={{ 
              backgroundColor: 'white',
              border: `1px solid ${griefSensitiveColors.peace[200]}`
            }}
            onClick={() => setSelectedFamily(family)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: griefSensitiveColors.comfort[100] }}
                    >
                      <TreePine className="h-5 w-5" style={{ color: griefSensitiveColors.comfort[600] }} />
                    </div>
                    <CardTitle 
                      className="text-xl"
                      style={{ color: griefSensitiveColors.peace[800] }}
                    >
                      {family.familyName}
                    </CardTitle>
                    <Badge
                      className="ml-2"
                      style={{
                        backgroundColor: getSupportLevelColor(family.supportLevel) + '20',
                        color: getSupportLevelColor(family.supportLevel),
                        border: `1px solid ${getSupportLevelColor(family.supportLevel)}`
                      }}
                    >
                      {family.supportLevel === 'stable' ? 'Flourishing' : 
                       family.supportLevel === 'monitoring' ? 'Gentle Care' : 'Extra Support'}
                    </Badge>
                  </div>
                  <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                    {family.members.length} family member{family.members.length !== 1 ? 's' : ''} • 
                    {family.totalMemories} memories shared • 
                    Started their journey {new Date(family.createdDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  {family.aiEchoActive && (
                    <Badge
                      style={{
                        backgroundColor: griefSensitiveColors.hope[100],
                        color: griefSensitiveColors.hope[700],
                        border: `1px solid ${griefSensitiveColors.hope[300]}`
                      }}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      AI Echo Active
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4" style={{ color: griefSensitiveColors.primary[400] }} />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Family Members */}
              <div className="space-y-3 mb-6">
                {family.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: griefSensitiveColors.peace[50] }}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(member.status) + '20' }}
                      >
                        {React.createElement(getStatusIcon(member.status), {
                          className: "h-4 w-4",
                          style: { color: getStatusColor(member.status) }
                        })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {member.name}
                          </p>
                          <span className="text-sm" style={{ color: griefSensitiveColors.peace[500] }}>
                            {member.role}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          {member.memoriesShared} memories shared • {member.emotionalJourney.currentPhase} phase
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="w-24 mb-1">
                        <Progress 
                          value={member.emotionalJourney.progress} 
                          className="h-2"
                          style={{ 
                            backgroundColor: griefSensitiveColors.peace[200],
                          }}
                        />
                      </div>
                      <p className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                        {member.emotionalJourney.progress}% progress
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
                  <Clock className="h-4 w-4" />
                  Recent Heartfelt Moments
                </h4>
                <div className="space-y-2">
                  {family.recentActivity.slice(0, 2).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: griefSensitiveColors.peace[50] }}>
                      <div 
                        className="p-1.5 rounded-full mt-0.5"
                        style={{ backgroundColor: getEmotionalToneColor(activity.emotionalTone) + '20' }}
                      >
                        {React.createElement(getActivityIcon(activity.type), {
                          className: "h-3 w-3",
                          style: { color: getEmotionalToneColor(activity.emotionalTone) }
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[700] }}>
                          {activity.description}
                        </p>
                        <p className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                          {activity.member} • {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: getEmotionalToneColor(activity.emotionalTone),
                          color: getEmotionalToneColor(activity.emotionalTone)
                        }}
                      >
                        {activity.emotionalTone}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}