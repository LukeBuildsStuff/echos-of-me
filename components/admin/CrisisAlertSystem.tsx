'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  Heart, 
  Shield, 
  Clock, 
  Phone,
  MessageSquare,
  Users,
  ExternalLink,
  AlertCircle,
  Zap,
  Timer,
  Bell,
  User,
  ChevronRight,
  Activity,
  HelpCircle
} from 'lucide-react'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

interface CrisisAlert {
  id: number
  error_id: string
  alert_type: 'family_disruption' | 'memory_loss' | 'voice_failure' | 'conversation_breakdown' | 'system_wide'
  severity: 'emergency' | 'critical'
  family_count: number
  affected_features: string[]
  crisis_start: string
  estimated_impact: string
  user_email?: string
  family_id?: string
  last_activity?: string
  grief_context: boolean
  auto_escalated: boolean
  response_team_notified: boolean
  hotline_activated: boolean
  family_contacted: boolean
  estimated_resolution?: string
  description: string
  immediate_actions_needed: string[]
}

interface CrisisStats {
  active_crises: number
  families_in_crisis: number
  avg_response_time_minutes: number
  hotline_calls_today: number
  emergency_escalations: number
  grief_sensitive_alerts: number
}

export default function CrisisAlertSystem() {
  const [alerts, setAlerts] = useState<CrisisAlert[]>([])
  const [stats, setStats] = useState<CrisisStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [alertSound, setAlertSound] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<CrisisAlert | null>(null)

  useEffect(() => {
    fetchCrisisAlerts()
    
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchCrisisAlerts, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchCrisisAlerts = async () => {
    try {
      const response = await fetch('/api/admin/crisis-detection')
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.data.alerts)
        setStats(data.data.stats)
        
        // Play alert sound for new critical alerts
        if (alertSound && data.data.alerts.some((alert: CrisisAlert) => 
          !alerts.find(existing => existing.id === alert.id) && alert.severity === 'emergency'
        )) {
          // In a real implementation, you'd play an actual alert sound
          console.log('🚨 NEW CRISIS ALERT - Family Support Needed')
        }
      }
    } catch (error) {
      console.error('Failed to fetch crisis alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivateHotline = async (alertId: number) => {
    try {
      await fetch(`/api/admin/crisis-detection/${alertId}/activate-hotline`, {
        method: 'POST'
      })
      fetchCrisisAlerts()
    } catch (error) {
      console.error('Failed to activate hotline:', error)
    }
  }

  const handleContactFamily = async (alertId: number) => {
    try {
      await fetch(`/api/admin/crisis-detection/${alertId}/contact-family`, {
        method: 'POST'
      })
      fetchCrisisAlerts()
    } catch (error) {
      console.error('Failed to initiate family contact:', error)
    }
  }

  const handleEscalateToTeam = async (alertId: number) => {
    try {
      await fetch(`/api/admin/crisis-detection/${alertId}/escalate`, {
        method: 'POST'
      })
      fetchCrisisAlerts()
    } catch (error) {
      console.error('Failed to escalate to response team:', error)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const alertTime = new Date(timestamp)
    const diffMs = now.getTime() - alertTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'family_disruption': return 'Family Connection Disrupted'
      case 'memory_loss': return 'Memory Storage Crisis'
      case 'voice_failure': return 'Voice Connection Lost'
      case 'conversation_breakdown': return 'AI Conversation Failed'
      case 'system_wide': return 'System-Wide Family Impact'
      default: return 'Critical Family Issue'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'family_disruption': return Users
      case 'memory_loss': return Heart
      case 'voice_failure': return MessageSquare
      case 'conversation_breakdown': return AlertCircle
      case 'system_wide': return Zap
      default: return AlertTriangle
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 animate-pulse mx-auto mb-4" style={{ color: griefSensitiveColors.warning[500] }} />
          <p style={{ color: griefSensitiveColors.peace[600] }}>Monitoring family crisis situations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Crisis Overview Header */}
      <Card 
        className={`border-0 shadow-lg ${alerts.length > 0 ? 'ring-2 ring-red-200' : ''}`}
        style={{ 
          backgroundColor: alerts.length > 0 ? griefSensitiveColors.warning[50] : griefSensitiveColors.hope[50],
          border: `2px solid ${alerts.length > 0 ? griefSensitiveColors.warning[300] : griefSensitiveColors.hope[300]}`
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className={`p-3 rounded-lg ${alerts.length > 0 ? 'animate-pulse' : ''}`}
                style={{ 
                  backgroundColor: alerts.length > 0 ? griefSensitiveColors.warning[100] : griefSensitiveColors.hope[100]
                }}
              >
                <Shield 
                  className="h-8 w-8" 
                  style={{ 
                    color: alerts.length > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600]
                  }} 
                />
              </div>
              <div>
                <h1 
                  className="text-2xl font-semibold"
                  style={{ 
                    color: alerts.length > 0 ? griefSensitiveColors.warning[800] : griefSensitiveColors.hope[800]
                  }}
                >
                  Family Crisis Alert System
                </h1>
                <p style={{ color: griefSensitiveColors.peace[600] }}>
                  {alerts.length > 0 
                    ? `${alerts.length} families need immediate support and care`
                    : 'All families are safely connected and supported'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlertSound(!alertSound)}
                className="flex items-center gap-2"
              >
                <Bell className={`h-4 w-4 ${alertSound ? 'text-blue-600' : 'text-gray-400'}`} />
                {alertSound ? 'Alerts On' : 'Silent'}
              </Button>
              <div className="text-right">
                <div 
                  className="text-2xl font-bold"
                  style={{ 
                    color: alerts.length > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600]
                  }}
                >
                  {alerts.length}
                </div>
                <div className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                  Active Crises
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Crisis Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card 
            className="border-0 shadow-sm"
            style={{ 
              backgroundColor: stats.families_in_crisis > 0 ? griefSensitiveColors.warning[50] : 'white',
              border: `1px solid ${stats.families_in_crisis > 0 ? griefSensitiveColors.warning[300] : griefSensitiveColors.peace[200]}`
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle 
                className="text-sm font-medium flex items-center gap-2"
                style={{ 
                  color: stats.families_in_crisis > 0 ? griefSensitiveColors.warning[700] : griefSensitiveColors.peace[700]
                }}
              >
                <Users className="h-4 w-4" />
                Families in Crisis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-3xl font-semibold mb-1"
                style={{ 
                  color: stats.families_in_crisis > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600]
                }}
              >
                {stats.families_in_crisis}
              </div>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                {stats.families_in_crisis > 0 ? 'Need immediate support' : 'All families protected'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.comfort[200]}` }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: griefSensitiveColors.comfort[700] }}>
                <Timer className="h-4 w-4" />
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1" style={{ color: griefSensitiveColors.comfort[600] }}>
                {stats.avg_response_time_minutes}m
              </div>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                Average family support response
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm" style={{ backgroundColor: 'white', border: `1px solid ${griefSensitiveColors.memory[200]}` }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: griefSensitiveColors.memory[700] }}>
                <Phone className="h-4 w-4" />
                Support Calls Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold mb-1" style={{ color: griefSensitiveColors.memory[600] }}>
                {stats.hotline_calls_today}
              </div>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                Compassionate hotline connections
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Crisis Alerts */}
      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const AlertIcon = getAlertIcon(alert.alert_type)
            
            return (
              <Card 
                key={alert.id}
                className={`border-0 shadow-lg transition-all duration-300 hover:shadow-xl ${
                  alert.severity === 'emergency' ? 'ring-2 ring-red-300 animate-pulse' : ''
                }`}
                style={{ 
                  backgroundColor: alert.severity === 'emergency' ? griefSensitiveColors.warning[50] : 'white',
                  border: `2px solid ${alert.severity === 'emergency' ? griefSensitiveColors.warning[400] : griefSensitiveColors.warning[300]}`
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div 
                        className={`p-3 rounded-lg ${alert.severity === 'emergency' ? 'animate-bounce' : ''}`}
                        style={{ backgroundColor: griefSensitiveColors.warning[100] }}
                      >
                        <AlertIcon className="h-6 w-6" style={{ color: griefSensitiveColors.warning[600] }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge
                            className={`text-sm px-3 py-1 font-medium ${alert.severity === 'emergency' ? 'animate-pulse' : ''}`}
                            style={{
                              backgroundColor: alert.severity === 'emergency' ? griefSensitiveColors.warning[600] : griefSensitiveColors.warning[500],
                              color: 'white'
                            }}
                          >
                            {alert.severity === 'emergency' ? '🚨 EMERGENCY' : '⚠️ CRITICAL'}
                          </Badge>
                          
                          {alert.grief_context && (
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
                            {alert.family_count} {alert.family_count === 1 ? 'Family' : 'Families'}
                          </Badge>
                        </div>
                        
                        <h3 
                          className="text-xl font-semibold mb-2"
                          style={{ color: griefSensitiveColors.peace[800] }}
                        >
                          {getAlertTypeLabel(alert.alert_type)}
                        </h3>
                        
                        <p className="text-sm mb-3" style={{ color: griefSensitiveColors.peace[600] }}>
                          {alert.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm" style={{ color: griefSensitiveColors.peace[500] }}>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(alert.crisis_start)}
                          </span>
                          
                          {alert.user_email && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {alert.user_email}
                            </span>
                          )}
                          
                          {alert.estimated_resolution && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              Est. resolution: {alert.estimated_resolution}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                      className="flex items-center gap-1"
                    >
                      {selectedAlert?.id === alert.id ? 'Hide Details' : 'View Details'}
                      <ChevronRight className={`h-3 w-3 transition-transform ${selectedAlert?.id === alert.id ? 'rotate-90' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                
                {selectedAlert?.id === alert.id && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Impact Summary */}
                      <div 
                        className="p-4 rounded-lg"
                        style={{ backgroundColor: griefSensitiveColors.peace[50] }}
                      >
                        <h4 className="font-medium mb-2" style={{ color: griefSensitiveColors.peace[700] }}>
                          Family Impact Assessment
                        </h4>
                        <p className="text-sm mb-3" style={{ color: griefSensitiveColors.peace[600] }}>
                          {alert.estimated_impact}
                        </p>
                        
                        {alert.affected_features.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2" style={{ color: griefSensitiveColors.peace[700] }}>
                              Affected Features:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {alert.affected_features.map((feature, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Response Status */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <div 
                          className="p-3 rounded-lg flex items-center justify-between"
                          style={{ 
                            backgroundColor: alert.response_team_notified ? griefSensitiveColors.hope[50] : griefSensitiveColors.warning[50]
                          }}
                        >
                          <span className="text-sm font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                            Response Team
                          </span>
                          <Badge 
                            className="text-xs"
                            style={{
                              backgroundColor: alert.response_team_notified ? griefSensitiveColors.hope[500] : griefSensitiveColors.warning[500],
                              color: 'white'
                            }}
                          >
                            {alert.response_team_notified ? 'Notified' : 'Pending'}
                          </Badge>
                        </div>
                        
                        <div 
                          className="p-3 rounded-lg flex items-center justify-between"
                          style={{ 
                            backgroundColor: alert.family_contacted ? griefSensitiveColors.hope[50] : griefSensitiveColors.warning[50]
                          }}
                        >
                          <span className="text-sm font-medium" style={{ color: griefSensitiveColors.peace[700] }}>
                            Family Contact
                          </span>
                          <Badge 
                            className="text-xs"
                            style={{
                              backgroundColor: alert.family_contacted ? griefSensitiveColors.hope[500] : griefSensitiveColors.warning[500],
                              color: 'white'
                            }}
                          >
                            {alert.family_contacted ? 'Contacted' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Immediate Actions */}
                      {alert.immediate_actions_needed.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2" style={{ color: griefSensitiveColors.peace[700] }}>
                            Immediate Actions Needed:
                          </h4>
                          <ul className="space-y-1">
                            {alert.immediate_actions_needed.map((action, index) => (
                              <li key={index} className="text-sm flex items-start gap-2" style={{ color: griefSensitiveColors.peace[600] }}>
                                <ChevronRight className="h-3 w-3 mt-1 flex-shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t" style={{ borderColor: griefSensitiveColors.peace[200] }}>
                        {!alert.hotline_activated && (
                          <Button
                            onClick={() => handleActivateHotline(alert.id)}
                            style={{
                              backgroundColor: griefSensitiveColors.warning[500],
                              color: 'white'
                            }}
                            className="flex items-center gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            Activate Crisis Hotline
                          </Button>
                        )}
                        
                        {!alert.family_contacted && (
                          <Button
                            onClick={() => handleContactFamily(alert.id)}
                            style={{
                              backgroundColor: griefSensitiveColors.comfort[500],
                              color: 'white'
                            }}
                            className="flex items-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Contact Family
                          </Button>
                        )}
                        
                        {!alert.response_team_notified && (
                          <Button
                            onClick={() => handleEscalateToTeam(alert.id)}
                            style={{
                              backgroundColor: griefSensitiveColors.memory[500],
                              color: 'white'
                            }}
                            className="flex items-center gap-2"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Escalate to Response Team
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Full Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: griefSensitiveColors.hope[50],
            border: `1px solid ${griefSensitiveColors.hope[200]}`
          }}
        >
          <CardContent className="py-12 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4" style={{ color: griefSensitiveColors.hope[500] }} />
            <h3 className="text-2xl font-semibold mb-2" style={{ color: griefSensitiveColors.hope[700] }}>
              All Families Safe and Connected
            </h3>
            <p className="text-lg mb-6" style={{ color: griefSensitiveColors.peace[600] }}>
              No crisis situations detected. All family connections are stable and all systems are operating normally.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm" style={{ color: griefSensitiveColors.peace[500] }}>
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System monitoring active
              </span>
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alerts enabled
              </span>
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Support team standing by
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}