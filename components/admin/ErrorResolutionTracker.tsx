'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Heart,
  Users,
  Shield,
  Wrench,
  MessageSquare,
  Eye,
  Edit,
  Save,
  X,
  Plus,
  Target,
  TrendingUp,
  Activity,
  Calendar,
  User,
  FileText,
  Phone,
  AlertCircle,
  Timer,
  ChevronRight,
  ChevronDown,
  Zap
} from 'lucide-react'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

interface ResolutionStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  family_impact_reduced: number
  estimated_time_minutes: number
  actual_time_minutes?: number
  assigned_to?: string
  completed_at?: string
  family_communication_sent: boolean
  grief_context_considered: boolean
  notes?: string
}

interface ErrorResolution {
  id: number
  error_id: string
  error_title: string
  severity: 'emergency' | 'critical' | 'warning' | 'info'
  family_impact: 'none' | 'low' | 'medium' | 'high' | 'severe'
  affected_families_count: number
  started_at: string
  estimated_completion?: string
  completed_at?: string
  current_step: number
  total_steps: number
  overall_progress: number
  resolution_type: 'automated' | 'manual' | 'escalated' | 'external'
  priority_score: number
  crisis_level: boolean
  grief_sensitive: boolean
  family_satisfaction_target: number
  family_satisfaction_actual?: number
  resolution_steps: ResolutionStep[]
  family_updates_sent: number
  stakeholders_notified: string[]
  root_cause?: string
  prevention_measures?: string[]
  lessons_learned?: string
}

interface ResolutionStats {
  active_resolutions: number
  avg_resolution_time_hours: number
  family_satisfaction_avg: number
  crisis_resolutions_today: number
  grief_sensitive_resolutions: number
  families_helped_today: number
}

export default function ErrorResolutionTracker() {
  const [resolutions, setResolutions] = useState<ErrorResolution[]>([])
  const [stats, setStats] = useState<ResolutionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedResolution, setSelectedResolution] = useState<ErrorResolution | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'analytics'>('active')
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    fetchResolutionData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchResolutionData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchResolutionData = async () => {
    try {
      const response = await fetch('/api/admin/error-resolution')
      const data = await response.json()
      
      if (data.success) {
        setResolutions(data.data.resolutions)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch resolution data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStepStatus = async (resolutionId: number, stepId: string, status: string, notes?: string) => {
    try {
      await fetch(`/api/admin/error-resolution/${resolutionId}/step/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      })
      fetchResolutionData()
    } catch (error) {
      console.error('Failed to update step:', error)
    }
  }

  const sendFamilyUpdate = async (resolutionId: number, updateType: 'progress' | 'completion' | 'delay') => {
    try {
      await fetch(`/api/admin/error-resolution/${resolutionId}/family-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update_type: updateType })
      })
      fetchResolutionData()
    } catch (error) {
      console.error('Failed to send family update:', error)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just started'
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return griefSensitiveColors.hope[500]
      case 'in_progress': return griefSensitiveColors.memory[500]
      case 'blocked': return griefSensitiveColors.warning[500]
      default: return griefSensitiveColors.peace[400]
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle
      case 'in_progress': return Clock
      case 'blocked': return AlertTriangle
      default: return Timer
    }
  }

  const calculateTimeRemaining = (resolution: ErrorResolution) => {
    if (!resolution.estimated_completion) return 'Unknown'
    
    const now = new Date()
    const completion = new Date(resolution.estimated_completion)
    const diffMs = completion.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 0) return 'Overdue'
    if (diffHours < 1) return 'Less than 1h'
    if (diffHours < 24) return `${diffHours}h remaining`
    return `${Math.floor(diffHours / 24)}d remaining`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Target className="h-8 w-8 animate-pulse mx-auto mb-4" style={{ color: griefSensitiveColors.memory[500] }} />
          <p style={{ color: griefSensitiveColors.peace[600] }}>Loading resolution tracking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: griefSensitiveColors.memory[50],
          border: `1px solid ${griefSensitiveColors.memory[200]}`
        }}
      >
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: griefSensitiveColors.memory[100] }}
            >
              <Target className="h-8 w-8" style={{ color: griefSensitiveColors.memory[600] }} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold" style={{ color: griefSensitiveColors.peace[800] }}>
                Family-Centered Error Resolution
              </h1>
              <p className="text-lg" style={{ color: griefSensitiveColors.peace[600] }}>
                Track healing progress with compassionate attention to family well-being
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={activeTab === 'active' ? 'default' : 'outline'}
              onClick={() => setActiveTab('active')}
              className="flex items-center gap-2"
              style={{
                backgroundColor: activeTab === 'active' ? griefSensitiveColors.memory[500] : 'transparent',
                color: activeTab === 'active' ? 'white' : griefSensitiveColors.memory[600]
              }}
            >
              <Activity className="h-4 w-4" />
              Active Resolutions
            </Button>
            <Button
              variant={activeTab === 'completed' ? 'default' : 'outline'}
              onClick={() => setActiveTab('completed')}
              className="flex items-center gap-2"
              style={{
                backgroundColor: activeTab === 'completed' ? griefSensitiveColors.hope[500] : 'transparent',
                color: activeTab === 'completed' ? 'white' : griefSensitiveColors.hope[600]
              }}
            >
              <CheckCircle className="h-4 w-4" />
              Completed
            </Button>
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              onClick={() => setActiveTab('analytics')}
              className="flex items-center gap-2"
              style={{
                backgroundColor: activeTab === 'analytics' ? griefSensitiveColors.comfort[500] : 'transparent',
                color: activeTab === 'analytics' ? 'white' : griefSensitiveColors.comfort[600]
              }}
            >
              <TrendingUp className="h-4 w-4" />
              Family Impact Analytics
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.memory[200]}` }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: griefSensitiveColors.memory[700] }}>
                <Activity className="h-4 w-4" />
                Active Resolutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1" style={{ color: griefSensitiveColors.memory[600] }}>
                {stats.active_resolutions}
              </div>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                Issues being resolved with family care
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.comfort[200]}` }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: griefSensitiveColors.comfort[700] }}>
                <Heart className="h-4 w-4" />
                Family Satisfaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1" style={{ color: griefSensitiveColors.comfort[600] }}>
                {stats.family_satisfaction_avg}/5
              </div>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                Average family happiness with resolution
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.hope[200]}` }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: griefSensitiveColors.hope[700] }}>
                <Users className="h-4 w-4" />
                Families Helped Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1" style={{ color: griefSensitiveColors.hope[600] }}>
                {stats.families_helped_today}
              </div>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                Families restored to full connection
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Resolutions Tab */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {resolutions.filter(r => !r.completed_at).map((resolution) => (
            <Card 
              key={resolution.id}
              className={`border-0 shadow-sm transition-all duration-200 hover:shadow-md ${
                resolution.crisis_level ? 'ring-2 ring-red-200' : ''
              }`}
              style={{ 
                backgroundColor: resolution.crisis_level ? griefSensitiveColors.warning[50] : 'white',
                border: `1px solid ${resolution.crisis_level ? griefSensitiveColors.warning[300] : griefSensitiveColors.peace[200]}`
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge
                        className="text-sm px-3 py-1"
                        style={{
                          backgroundColor: resolution.severity === 'emergency' ? griefSensitiveColors.warning[600] :
                                          resolution.severity === 'critical' ? griefSensitiveColors.warning[500] :
                                          resolution.severity === 'warning' ? griefSensitiveColors.hope[500] :
                                          griefSensitiveColors.peace[500],
                          color: 'white'
                        }}
                      >
                        {resolution.severity.toUpperCase()}
                      </Badge>
                      
                      {resolution.crisis_level && (
                        <Badge className="text-sm px-3 py-1 bg-red-100 text-red-800 animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          CRISIS
                        </Badge>
                      )}
                      
                      {resolution.grief_sensitive && (
                        <Badge 
                          className="text-sm px-3 py-1"
                          style={{
                            backgroundColor: griefSensitiveColors.comfort[100],
                            color: griefSensitiveColors.comfort[700]
                          }}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          Grief-Sensitive
                        </Badge>
                      )}
                      
                      <Badge 
                        className="text-sm px-3 py-1"
                        style={{
                          backgroundColor: griefSensitiveColors.memory[100],
                          color: griefSensitiveColors.memory[700]
                        }}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {resolution.affected_families_count} {resolution.affected_families_count === 1 ? 'Family' : 'Families'}
                      </Badge>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-2" style={{ color: griefSensitiveColors.peace[800] }}>
                      {resolution.error_title}
                    </h3>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: griefSensitiveColors.peace[700] }}>
                          Overall Progress
                        </p>
                        <Progress 
                          value={resolution.overall_progress} 
                          className="h-2"
                          style={{ backgroundColor: griefSensitiveColors.peace[100] }}
                        />
                        <p className="text-xs mt-1" style={{ color: griefSensitiveColors.peace[500] }}>
                          {resolution.overall_progress}% complete
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: griefSensitiveColors.peace[700] }}>
                          Time Status
                        </p>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          Started {formatTimeAgo(resolution.started_at)}
                        </p>
                        <p className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                          {calculateTimeRemaining(resolution)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: griefSensitiveColors.peace[700] }}>
                          Family Communication
                        </p>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          {resolution.family_updates_sent} updates sent
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendFamilyUpdate(resolution.id, 'progress')}
                          className="text-xs mt-1"
                        >
                          Send Update
                        </Button>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1" style={{ color: griefSensitiveColors.peace[700] }}>
                          Resolution Steps
                        </p>
                        <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                          {resolution.current_step} of {resolution.total_steps}
                        </p>
                        <p className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                          {resolution.resolution_type} resolution
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setSelectedResolution(selectedResolution?.id === resolution.id ? null : resolution)}
                    className="flex items-center gap-1 ml-4"
                  >
                    {selectedResolution?.id === resolution.id ? 'Hide' : 'View'} Details
                    <ChevronRight className={`h-3 w-3 transition-transform ${selectedResolution?.id === resolution.id ? 'rotate-90' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              
              {selectedResolution?.id === resolution.id && (
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {/* Resolution Steps */}
                    <div>
                      <h4 className="font-medium mb-4 flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
                        <Wrench className="h-4 w-4" />
                        Resolution Progress with Family Care
                      </h4>
                      
                      <div className="space-y-3">
                        {resolution.resolution_steps.map((step, index) => {
                          const StatusIcon = getStatusIcon(step.status)
                          
                          return (
                            <div
                              key={step.id}
                              className={`p-4 rounded-lg border-l-4 transition-all duration-200 ${
                                step.status === 'in_progress' ? 'ring-2 ring-blue-100' : ''
                              }`}
                              style={{
                                backgroundColor: step.status === 'completed' ? griefSensitiveColors.hope[50] :
                                               step.status === 'in_progress' ? griefSensitiveColors.memory[50] :
                                               step.status === 'blocked' ? griefSensitiveColors.warning[50] :
                                               griefSensitiveColors.peace[50],
                                borderLeftColor: getStatusColor(step.status),
                                border: `1px solid ${griefSensitiveColors.peace[200]}`
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <StatusIcon className="h-5 w-5" style={{ color: getStatusColor(step.status) }} />
                                    <h5 className="font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                                      Step {index + 1}: {step.name}
                                    </h5>
                                    <Badge 
                                      className="text-xs px-2 py-1"
                                      style={{
                                        backgroundColor: getStatusColor(step.status),
                                        color: 'white'
                                      }}
                                    >
                                      {step.status.replace('_', ' ')}
                                    </Badge>
                                    
                                    {step.grief_context_considered && (
                                      <Badge 
                                        className="text-xs px-2 py-1"
                                        style={{
                                          backgroundColor: griefSensitiveColors.comfort[100],
                                          color: griefSensitiveColors.comfort[700]
                                        }}
                                      >
                                        <Heart className="h-3 w-3 mr-1" />
                                        Grief-Aware
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <p className="text-sm mb-3" style={{ color: griefSensitiveColors.peace[600] }}>
                                    {step.description}
                                  </p>
                                  
                                  <div className="grid gap-3 md:grid-cols-3 text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                                    <div>
                                      <span className="font-medium">Family Impact Reduction:</span>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Progress value={step.family_impact_reduced} className="h-1 flex-1" />
                                        <span>{step.family_impact_reduced}%</span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <span className="font-medium">Time:</span>
                                      <p>Est: {step.estimated_time_minutes}m</p>
                                      {step.actual_time_minutes && <p>Actual: {step.actual_time_minutes}m</p>}
                                    </div>
                                    
                                    <div>
                                      <span className="font-medium">Family Communication:</span>
                                      <p className="flex items-center gap-1 mt-1">
                                        {step.family_communication_sent ? (
                                          <>
                                            <CheckCircle className="h-3 w-3" style={{ color: griefSensitiveColors.hope[500] }} />
                                            Sent
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="h-3 w-3" style={{ color: griefSensitiveColors.warning[500] }} />
                                            Pending
                                          </>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {step.notes && (
                                    <div 
                                      className="mt-3 p-3 rounded-lg"
                                      style={{ backgroundColor: griefSensitiveColors.peace[50] }}
                                    >
                                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                                        <FileText className="h-3 w-3 inline mr-1" />
                                        {step.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-2 ml-4">
                                  {step.status !== 'completed' && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => updateStepStatus(resolution.id, step.id, 'completed')}
                                        style={{
                                          backgroundColor: griefSensitiveColors.hope[500],
                                          color: 'white'
                                        }}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Complete
                                      </Button>
                                      
                                      {step.status !== 'blocked' && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateStepStatus(resolution.id, step.id, 'blocked')}
                                        >
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Block
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingStep(editingStep === step.id ? null : step.id)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Note
                                  </Button>
                                </div>
                              </div>
                              
                              {editingStep === step.id && (
                                <div className="mt-4 pt-4 border-t" style={{ borderColor: griefSensitiveColors.peace[200] }}>
                                  <Textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add notes about family considerations, special care needed, or progress updates..."
                                    className="mb-3"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        updateStepStatus(resolution.id, step.id, step.status, newNote)
                                        setEditingStep(null)
                                        setNewNote('')
                                      }}
                                      style={{
                                        backgroundColor: griefSensitiveColors.memory[500],
                                        color: 'white'
                                      }}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save Note
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingStep(null)
                                        setNewNote('')
                                      }}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* Family Satisfaction Target */}
                    <div 
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: griefSensitiveColors.comfort[50] }}
                    >
                      <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: griefSensitiveColors.comfort[700] }}>
                        <Heart className="h-4 w-4" />
                        Family Well-being Target
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm mb-2" style={{ color: griefSensitiveColors.peace[600] }}>
                            Target Family Satisfaction: {resolution.family_satisfaction_target}/5
                          </p>
                          <Progress 
                            value={(resolution.family_satisfaction_target / 5) * 100} 
                            className="h-2"
                          />
                        </div>
                        
                        {resolution.family_satisfaction_actual && (
                          <div>
                            <p className="text-sm mb-2" style={{ color: griefSensitiveColors.peace[600] }}>
                              Current Family Satisfaction: {resolution.family_satisfaction_actual}/5
                            </p>
                            <Progress 
                              value={(resolution.family_satisfaction_actual / 5) * 100} 
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          
          {resolutions.filter(r => !r.completed_at).length === 0 && (
            <Card 
              className="border-0 shadow-sm"
              style={{ 
                backgroundColor: griefSensitiveColors.hope[50],
                border: `1px solid ${griefSensitiveColors.hope[200]}`
              }}
            >
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: griefSensitiveColors.hope[500] }} />
                <h3 className="text-2xl font-semibold mb-2" style={{ color: griefSensitiveColors.hope[700] }}>
                  All Issues Resolved
                </h3>
                <p className="text-lg" style={{ color: griefSensitiveColors.peace[600] }}>
                  No active error resolutions. All families are connected and supported.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Completed Resolutions Tab */}
      {activeTab === 'completed' && (
        <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.peace[200]}` }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[700] }}>
              <CheckCircle className="h-5 w-5" />
              Recently Completed Resolutions
            </CardTitle>
            <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
              Successfully resolved issues with family satisfaction outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resolutions.filter(r => r.completed_at).slice(0, 10).map((resolution) => (
                <div
                  key={resolution.id}
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: griefSensitiveColors.hope[50],
                    border: `1px solid ${griefSensitiveColors.hope[200]}`
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5" style={{ color: griefSensitiveColors.hope[500] }} />
                        <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                          {resolution.error_title}
                        </h4>
                        {resolution.grief_sensitive && (
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={{
                              backgroundColor: griefSensitiveColors.comfort[100],
                              color: griefSensitiveColors.comfort[700]
                            }}
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Grief-Sensitive
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid gap-2 md:grid-cols-4 text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        <div>
                          <span className="font-medium">Families Helped:</span>
                          <p>{resolution.affected_families_count}</p>
                        </div>
                        <div>
                          <span className="font-medium">Resolution Time:</span>
                          <p>{formatTimeAgo(resolution.started_at)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Family Satisfaction:</span>
                          <p>{resolution.family_satisfaction_actual || 'Pending'}/5</p>
                        </div>
                        <div>
                          <span className="font-medium">Completed:</span>
                          <p>{resolution.completed_at ? formatTimeAgo(resolution.completed_at) : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}