'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Heart, 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  Clock,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  MapPin,
  Zap,
  Sparkles,
  Flower,
  Moon,
  Sun,
  CloudRain,
  Rainbow,
  RefreshCw,
  Send,
  Eye,
  Users,
  Activity,
  TrendingDown,
  TrendingUp,
  Pause,
  Play
} from 'lucide-react'
import { griefSensitiveColors, griefSensitiveSpacing } from '@/lib/grief-sensitive-design'

interface CrisisAlert {
  id: string
  userId: string
  userName: string
  userEmail: string
  familyName: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'emotional_distress' | 'isolation' | 'anniversary_reaction' | 'ai_dependency' | 'withdrawal' | 'concerning_content'
  description: string
  detectedAt: string
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated'
  triggers: string[]
  aiInteractionContext?: string
  lastActivity: string
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  interventions: CrisisIntervention[]
  riskFactors: {
    socialIsolation: number // 0-100
    emotionalVolatility: number
    engagementDrop: number
    concerningPatterns: number
  }
}

interface CrisisIntervention {
  id: string
  type: 'admin_contact' | 'emergency_contact' | 'resource_provided' | 'professional_referral' | 'wellness_check'
  timestamp: string
  adminId: string
  adminName: string
  notes: string
  outcome: 'pending' | 'positive' | 'needs_followup' | 'escalated'
}

interface WellnessMetric {
  userId: string
  userName: string
  familyName: string
  currentMood: 'peaceful' | 'struggling' | 'overwhelmed' | 'hopeful' | 'celebrating'
  engagementTrend: 'improving' | 'stable' | 'declining' | 'concerning'
  lastCheckin: string
  supportNetwork: {
    familyConnections: number
    communityEngagement: number
    professionalSupport: boolean
  }
  wellnessScore: number // 0-100
  recentActivity: {
    memoriesShared: number
    aiConversations: number
    communityInteraction: number
  }
}

const mockCrisisAlerts: CrisisAlert[] = [
  {
    id: '1',
    userId: 'user_3',
    userName: 'Lisa Chen',
    userEmail: 'lisa@example.com',
    familyName: 'The Chen Legacy',
    severity: 'high',
    type: 'emotional_distress',
    description: 'User has been sharing increasingly distressing memories and expressing feelings of hopelessness in AI conversations',
    detectedAt: '2024-01-31T10:30:00Z',
    status: 'active',
    triggers: ['negative_sentiment_spike', 'isolation_keywords', 'grief_overwhelm'],
    aiInteractionContext: 'User asked AI echo: "Do you think Grandma would be disappointed in how I\'m handling everything?"',
    lastActivity: '2024-01-31T09:45:00Z',
    emergencyContact: {
      name: 'David Chen',
      phone: '+1 (555) 987-6543',
      relationship: 'Brother'
    },
    interventions: [],
    riskFactors: {
      socialIsolation: 85,
      emotionalVolatility: 75,
      engagementDrop: 60,
      concerningPatterns: 80
    }
  },
  {
    id: '2',
    userId: 'user_4',
    userName: 'Robert Williams',
    userEmail: 'robert@example.com',
    familyName: 'The Williams Circle',
    severity: 'medium',
    type: 'anniversary_reaction',
    description: 'Significant engagement drop approaching first anniversary of loss, combined with concerning isolation patterns',
    detectedAt: '2024-01-30T16:20:00Z',
    status: 'acknowledged',
    triggers: ['anniversary_proximity', 'engagement_drop', 'isolation_increase'],
    lastActivity: '2024-01-28T12:00:00Z',
    interventions: [
      {
        id: 'int_1',
        type: 'admin_contact',
        timestamp: '2024-01-30T17:00:00Z',
        adminId: 'admin_1',
        adminName: 'Sarah (Crisis Support)',
        notes: 'Sent gentle check-in email. Acknowledged that anniversary dates can be especially difficult.',
        outcome: 'positive'
      }
    ],
    riskFactors: {
      socialIsolation: 70,
      emotionalVolatility: 45,
      engagementDrop: 90,
      concerningPatterns: 55
    }
  }
]

const mockWellnessMetrics: WellnessMetric[] = [
  {
    userId: 'user_1',
    userName: 'Sarah Johnson',
    familyName: 'The Johnson Family',
    currentMood: 'hopeful',
    engagementTrend: 'improving',
    lastCheckin: '2024-01-31T14:00:00Z',
    supportNetwork: {
      familyConnections: 3,
      communityEngagement: 2,
      professionalSupport: false
    },
    wellnessScore: 78,
    recentActivity: {
      memoriesShared: 5,
      aiConversations: 12,
      communityInteraction: 3
    }
  },
  {
    userId: 'user_2',
    userName: 'Michael Johnson',
    familyName: 'The Johnson Family',
    currentMood: 'peaceful',
    engagementTrend: 'stable',
    lastCheckin: '2024-01-30T20:30:00Z',
    supportNetwork: {
      familyConnections: 2,
      communityEngagement: 1,
      professionalSupport: false
    },
    wellnessScore: 82,
    recentActivity: {
      memoriesShared: 3,
      aiConversations: 8,
      communityInteraction: 1
    }
  }
]

const getSeverityColor = (severity: CrisisAlert['severity']) => {
  switch (severity) {
    case 'critical': return griefSensitiveColors.warning[600]
    case 'high': return griefSensitiveColors.warning[500]
    case 'medium': return griefSensitiveColors.memory[500]
    case 'low': return griefSensitiveColors.hope[500]
    default: return griefSensitiveColors.peace[400]
  }
}

const getMoodColor = (mood: WellnessMetric['currentMood']) => {
  switch (mood) {
    case 'celebrating': return griefSensitiveColors.memory[500]
    case 'hopeful': return griefSensitiveColors.hope[500]
    case 'peaceful': return griefSensitiveColors.primary[500]
    case 'struggling': return griefSensitiveColors.warning[500]
    case 'overwhelmed': return griefSensitiveColors.warning[600]
    default: return griefSensitiveColors.peace[400]
  }
}

const getTrendIcon = (trend: WellnessMetric['engagementTrend']) => {
  switch (trend) {
    case 'improving': return TrendingUp
    case 'stable': return Activity
    case 'declining': return TrendingDown
    case 'concerning': return AlertTriangle
    default: return Activity
  }
}

const getMoodIcon = (mood: WellnessMetric['currentMood']) => {
  switch (mood) {
    case 'celebrating': return Sparkles
    case 'hopeful': return Sun
    case 'peaceful': return Flower
    case 'struggling': return CloudRain
    case 'overwhelmed': return Moon
    default: return Heart
  }
}

export default function EmergencySupportDashboard() {
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>(mockCrisisAlerts)
  const [wellnessMetrics, setWellnessMetrics] = useState<WellnessMetric[]>(mockWellnessMetrics)
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null)
  const [showInterventionDialog, setShowInterventionDialog] = useState(false)
  const [showWellnessCheck, setShowWellnessCheck] = useState(false)
  const [interventionNotes, setInterventionNotes] = useState('')
  const [monitoringActive, setMonitoringActive] = useState(true)

  const activeAlerts = crisisAlerts.filter(alert => alert.status === 'active')
  const criticalAlerts = crisisAlerts.filter(alert => alert.severity === 'critical')
  const todaysInterventions = crisisAlerts
    .flatMap(alert => alert.interventions)
    .filter(intervention => {
      const today = new Date()
      const interventionDate = new Date(intervention.timestamp)
      return interventionDate.toDateString() === today.toDateString()
    })

  const averageWellnessScore = wellnessMetrics.length > 0 
    ? Math.round(wellnessMetrics.reduce((sum, metric) => sum + metric.wellnessScore, 0) / wellnessMetrics.length)
    : 0

  const handleAcknowledgeAlert = (alertId: string) => {
    setCrisisAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'acknowledged' as const }
        : alert
    ))
  }

  const handleCreateIntervention = (alert: CrisisAlert, type: CrisisIntervention['type']) => {
    setSelectedAlert(alert)
    setShowInterventionDialog(true)
  }

  const handleEmergencyEscalation = (alert: CrisisAlert) => {
    // In a real implementation, this would trigger emergency protocols
    setCrisisAlerts(prev => prev.map(a => 
      a.id === alert.id 
        ? { ...a, status: 'escalated' as const }
        : a
    ))
  }

  return (
    <div className="space-y-8">
      {/* Compassionate Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div 
            className="p-3 rounded-full relative"
            style={{ backgroundColor: griefSensitiveColors.warning[100] }}
          >
            <Shield className="h-8 w-8" style={{ color: griefSensitiveColors.warning[600] }} />
            {activeAlerts.length > 0 && (
              <div 
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-medium animate-pulse"
                style={{ 
                  backgroundColor: griefSensitiveColors.warning[500],
                  color: 'white'
                }}
              >
                {activeAlerts.length}
              </div>
            )}
          </div>
          <h1 
            className="text-3xl font-semibold"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            Family Crisis Support Center
          </h1>
        </div>
        <p 
          className="text-lg leading-relaxed max-w-2xl mx-auto"
          style={{ color: griefSensitiveColors.peace[600] }}
        >
          Providing immediate, compassionate intervention for families experiencing crisis moments in their grief journey
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div 
            className={`w-3 h-3 rounded-full ${monitoringActive ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: monitoringActive ? griefSensitiveColors.hope[500] : griefSensitiveColors.peace[400] }}
          />
          <span className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
            Crisis Monitoring {monitoringActive ? 'Active' : 'Paused'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonitoringActive(!monitoringActive)}
            className="h-6 w-6 p-0 ml-2"
          >
            {monitoringActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Crisis Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: activeAlerts.length > 0 ? griefSensitiveColors.warning[50] : 'white',
            border: `1px solid ${activeAlerts.length > 0 ? griefSensitiveColors.warning[300] : griefSensitiveColors.peace[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: activeAlerts.length > 0 ? griefSensitiveColors.warning[700] : griefSensitiveColors.peace[700] }}
            >
              <AlertTriangle className="h-4 w-4" />
              Active Crisis Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: activeAlerts.length > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600] }}
            >
              {activeAlerts.length}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              {activeAlerts.length > 0 ? 'Families needing immediate care' : 'All families stable'}
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
              Average Wellness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.hope[600] }}
            >
              {averageWellnessScore}%
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Across all family members
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
              Today's Interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.primary[600] }}
            >
              {todaysInterventions.length}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Compassionate responses sent
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
              <Phone className="h-4 w-4" />
              Emergency Protocols
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: criticalAlerts.length > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.comfort[600] }}
            >
              {criticalAlerts.length}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              {criticalAlerts.length > 0 ? 'Critical situations active' : 'Ready if needed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Crisis Alerts Section */}
      {activeAlerts.length > 0 && (
        <Card 
          className="border-0 shadow-lg"
          style={{ 
            backgroundColor: griefSensitiveColors.warning[50],
            border: `2px solid ${griefSensitiveColors.warning[300]}`
          }}
        >
          <CardHeader>
            <CardTitle 
              className="flex items-center gap-2"
              style={{ color: griefSensitiveColors.warning[800] }}
            >
              <AlertTriangle className="h-5 w-5" />
              Immediate Attention Required
            </CardTitle>
            <CardDescription style={{ color: griefSensitiveColors.warning[700] }}>
              These families need compassionate intervention right now
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <Card 
                  key={alert.id}
                  className="border-0 shadow-sm"
                  style={{ 
                    backgroundColor: 'white',
                    border: `1px solid ${getSeverityColor(alert.severity)}30`
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div 
                          className="p-3 rounded-full"
                          style={{ backgroundColor: getSeverityColor(alert.severity) + '20' }}
                        >
                          <User className="h-5 w-5" style={{ color: getSeverityColor(alert.severity) }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 
                              className="text-lg font-semibold"
                              style={{ color: griefSensitiveColors.peace[800] }}
                            >
                              {alert.userName}
                            </h3>
                            <Badge
                              style={{
                                backgroundColor: getSeverityColor(alert.severity) + '20',
                                color: getSeverityColor(alert.severity),
                                border: `1px solid ${getSeverityColor(alert.severity)}`
                              }}
                            >
                              {alert.severity.toUpperCase()} PRIORITY
                            </Badge>
                            <Badge variant="outline">
                              {alert.type.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2" style={{ color: griefSensitiveColors.peace[600] }}>
                            {alert.familyName} • {alert.userEmail}
                          </p>
                          <p className="text-sm mb-3" style={{ color: griefSensitiveColors.peace[700] }}>
                            {alert.description}
                          </p>
                          
                          {alert.aiInteractionContext && (
                            <div 
                              className="p-3 rounded-lg mb-3"
                              style={{ backgroundColor: griefSensitiveColors.comfort[50] }}
                            >
                              <p className="text-sm font-medium mb-1" style={{ color: griefSensitiveColors.comfort[700] }}>
                                Recent AI Interaction Context:
                              </p>
                              <p className="text-sm italic" style={{ color: griefSensitiveColors.peace[600] }}>
                                "{alert.aiInteractionContext}"
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs font-medium" style={{ color: griefSensitiveColors.peace[600] }}>
                                Social Isolation
                              </p>
                              <Progress 
                                value={alert.riskFactors.socialIsolation} 
                                className="h-2 mt-1"
                                style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                              />
                              <p className="text-xs mt-1" style={{ color: griefSensitiveColors.peace[500] }}>
                                {alert.riskFactors.socialIsolation}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium" style={{ color: griefSensitiveColors.peace[600] }}>
                                Emotional Volatility
                              </p>
                              <Progress 
                                value={alert.riskFactors.emotionalVolatility} 
                                className="h-2 mt-1"
                                style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                              />
                              <p className="text-xs mt-1" style={{ color: griefSensitiveColors.peace[500] }}>
                                {alert.riskFactors.emotionalVolatility}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium" style={{ color: griefSensitiveColors.peace[600] }}>
                                Engagement Drop
                              </p>
                              <Progress 
                                value={alert.riskFactors.engagementDrop} 
                                className="h-2 mt-1"
                                style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                              />
                              <p className="text-xs mt-1" style={{ color: griefSensitiveColors.peace[500] }}>
                                {alert.riskFactors.engagementDrop}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium" style={{ color: griefSensitiveColors.peace[600] }}>
                                Concerning Patterns
                              </p>
                              <Progress 
                                value={alert.riskFactors.concerningPatterns} 
                                className="h-2 mt-1"
                                style={{ backgroundColor: griefSensitiveColors.peace[200] }}
                              />
                              <p className="text-xs mt-1" style={{ color: griefSensitiveColors.peace[500] }}>
                                {alert.riskFactors.concerningPatterns}%
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                            <Clock className="h-3 w-3" />
                            <span>Detected {new Date(alert.detectedAt).toLocaleString()}</span>
                            <span>•</span>
                            <span>Last active {new Date(alert.lastActivity).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: griefSensitiveColors.peace[200] }}>
                      <Button
                        size="sm"
                        onClick={() => handleCreateIntervention(alert, 'admin_contact')}
                        style={{
                          backgroundColor: griefSensitiveColors.primary[500],
                          color: 'white'
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Gentle Message
                      </Button>
                      
                      {alert.emergencyContact && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateIntervention(alert, 'emergency_contact')}
                          style={{
                            borderColor: griefSensitiveColors.comfort[300],
                            color: griefSensitiveColors.comfort[600]
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Contact {alert.emergencyContact.name}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateIntervention(alert, 'wellness_check')}
                        style={{
                          borderColor: griefSensitiveColors.hope[300],
                          color: griefSensitiveColors.hope[600]
                        }}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Wellness Check
                      </Button>

                      {alert.severity === 'critical' && (
                        <Button
                          size="sm"
                          onClick={() => handleEmergencyEscalation(alert)}
                          style={{
                            backgroundColor: griefSensitiveColors.warning[500],
                            color: 'white'
                          }}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Emergency Protocol
                        </Button>
                      )}

                      <div className="ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wellness Overview */}
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
            Family Wellness Overview
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            Monitoring emotional well-being across all family members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wellnessMetrics.map((metric) => (
              <div 
                key={metric.userId}
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: griefSensitiveColors.peace[50],
                  borderColor: griefSensitiveColors.peace[200]
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="p-2 rounded-full"
                      style={{ backgroundColor: getMoodColor(metric.currentMood) + '20' }}
                    >
                      {React.createElement(getMoodIcon(metric.currentMood), {
                        className: "h-4 w-4",
                        style: { color: getMoodColor(metric.currentMood) }
                      })}
                    </div>
                    <div>
                      <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                        {metric.userName}
                      </h4>
                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        {metric.familyName} • Currently {metric.currentMood}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div 
                        className="text-2xl font-semibold"
                        style={{ color: griefSensitiveColors.hope[600] }}
                      >
                        {metric.wellnessScore}%
                      </div>
                      <p className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                        Wellness Score
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {React.createElement(getTrendIcon(metric.engagementTrend), {
                        className: "h-4 w-4",
                        style: { color: griefSensitiveColors.primary[500] }
                      })}
                      <span className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        {metric.engagementTrend}
                      </span>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowWellnessCheck(true)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Intervention Dialog */}
      <Dialog open={showInterventionDialog} onOpenChange={setShowInterventionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle 
              className="flex items-center gap-2"
              style={{ color: griefSensitiveColors.peace[800] }}
            >
              <Heart className="h-5 w-5" />
              Compassionate Intervention
            </DialogTitle>
            <DialogDescription style={{ color: griefSensitiveColors.peace[600] }}>
              Reach out to {selectedAlert?.userName} with care and understanding during this difficult time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: griefSensitiveColors.comfort[50] }}>
              <h4 className="font-medium mb-2" style={{ color: griefSensitiveColors.comfort[700] }}>
                Suggested Compassionate Response
              </h4>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                "Dear {selectedAlert?.userName}, we've noticed you might be going through a particularly difficult time right now. 
                Please know that what you're feeling is completely valid, and you're not alone in this journey. 
                We're here to support you in whatever way feels most helpful."
              </p>
            </div>
            <div>
              <Label htmlFor="intervention-notes" style={{ color: griefSensitiveColors.peace[700] }}>
                Personal message (optional)
              </Label>
              <Textarea
                id="intervention-notes"
                placeholder="Add a personal, caring message..."
                value={interventionNotes}
                onChange={(e) => setInterventionNotes(e.target.value)}
                className="mt-1"
                style={{
                  border: `2px solid ${griefSensitiveColors.peace[200]}`,
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowInterventionDialog(false)}
              style={{
                borderColor: griefSensitiveColors.peace[300],
                color: griefSensitiveColors.peace[600]
              }}
            >
              Cancel
            </Button>
            <Button 
              style={{
                backgroundColor: griefSensitiveColors.primary[500],
                color: 'white'
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Send with Love
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}