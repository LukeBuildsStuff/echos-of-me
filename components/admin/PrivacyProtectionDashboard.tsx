'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Key,
  FileText,
  Clock,
  User,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  MapPin,
  Globe,
  Database,
  Server,
  Cloud,
  Activity,
  Bell,
  Settings,
  Crown,
  Heart,
  Flower
} from 'lucide-react'
import { griefSensitiveColors, griefSensitiveSpacing } from '@/lib/grief-sensitive-design'

interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  familyName: string
  action: 'login' | 'memory_shared' | 'ai_interaction' | 'data_export' | 'privacy_changed' | 'password_reset' | 'account_deletion'
  details: string
  ipAddress: string
  location: string
  device: string
  riskLevel: 'low' | 'medium' | 'high'
  outcome: 'success' | 'failed' | 'blocked'
  sensitivityLevel: 'public' | 'family' | 'private' | 'confidential'
}

interface PrivacyPolicy {
  id: string
  familyId: string
  familyName: string
  dataRetention: number // days
  sharingPermissions: {
    withinFamily: boolean
    aiTraining: boolean
    anonymizedResearch: boolean
    platformImprovement: boolean
  }
  accessControls: {
    requireAuth: boolean
    twoFactorEnabled: boolean
    sessionTimeout: number // minutes
    locationRestrictions: string[]
  }
  contentFiltering: {
    sensitiveContentBlocking: boolean
    manualReview: boolean
    aiModerationLevel: 'strict' | 'moderate' | 'lenient'
  }
  emergencyAccess: {
    enabled: boolean
    contacts: string[]
    conditions: string[]
  }
  lastUpdated: string
  complianceStatus: 'compliant' | 'review_needed' | 'non_compliant'
}

interface DataRequest {
  id: string
  userId: string
  userName: string
  familyName: string
  requestType: 'export' | 'deletion' | 'rectification' | 'portability'
  requestDate: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  urgency: 'standard' | 'urgent' | 'emergency'
  reason: string
  adminNotes?: string
  completionDate?: string
  dataScope: string[]
  legalBasis: string
}

interface RolePermission {
  roleId: string
  roleName: string
  description: string
  permissions: {
    viewMemories: boolean
    editMemories: boolean
    deleteMemories: boolean
    inviteMembers: boolean
    manageFamily: boolean
    exportData: boolean
    configureAI: boolean
    accessAnalytics: boolean
    emergencyOverride: boolean
  }
  assignedUsers: number
  lastModified: string
  isCustom: boolean
}

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    timestamp: '2024-01-31T14:30:00Z',
    userId: 'user_1',
    userName: 'Sarah Johnson',
    familyName: 'The Johnson Family',
    action: 'ai_interaction',
    details: 'Had meaningful conversation about Dad\'s gardening wisdom',
    ipAddress: '192.168.1.100',
    location: 'Denver, CO',
    device: 'iPhone 15',
    riskLevel: 'low',
    outcome: 'success',
    sensitivityLevel: 'family'
  },
  {
    id: '2',
    timestamp: '2024-01-31T10:15:00Z',
    userId: 'user_2',
    userName: 'Michael Johnson',
    familyName: 'The Johnson Family',
    action: 'memory_shared',
    details: 'Shared story about Dad\'s birthday traditions',
    ipAddress: '10.0.0.50',
    location: 'Boulder, CO',
    device: 'MacBook Pro',
    riskLevel: 'low',
    outcome: 'success',
    sensitivityLevel: 'family'
  },
  {
    id: '3',
    timestamp: '2024-01-30T22:45:00Z',
    userId: 'unknown',
    userName: 'Unknown User',
    familyName: 'N/A',
    action: 'login',
    details: 'Failed login attempt with incorrect credentials',
    ipAddress: '203.45.67.89',
    location: 'Unknown',
    device: 'Unknown Browser',
    riskLevel: 'high',
    outcome: 'blocked',
    sensitivityLevel: 'confidential'
  }
]

const mockPrivacyPolicies: PrivacyPolicy[] = [
  {
    id: '1',
    familyId: 'fam_1',
    familyName: 'The Johnson Family',
    dataRetention: 365,
    sharingPermissions: {
      withinFamily: true,
      aiTraining: true,
      anonymizedResearch: false,
      platformImprovement: true
    },
    accessControls: {
      requireAuth: true,
      twoFactorEnabled: true,
      sessionTimeout: 60,
      locationRestrictions: ['US', 'CA']
    },
    contentFiltering: {
      sensitiveContentBlocking: true,
      manualReview: false,
      aiModerationLevel: 'moderate'
    },
    emergencyAccess: {
      enabled: true,
      contacts: ['emergency@family.com'],
      conditions: ['Medical emergency', 'Legal requirement']
    },
    lastUpdated: '2024-01-20T10:00:00Z',
    complianceStatus: 'compliant'
  },
  {
    id: '2',
    familyId: 'fam_2',
    familyName: 'The Chen Legacy',
    dataRetention: 730,
    sharingPermissions: {
      withinFamily: true,
      aiTraining: false,
      anonymizedResearch: false,
      platformImprovement: false
    },
    accessControls: {
      requireAuth: true,
      twoFactorEnabled: false,
      sessionTimeout: 30,
      locationRestrictions: []
    },
    contentFiltering: {
      sensitiveContentBlocking: true,
      manualReview: true,
      aiModerationLevel: 'strict'
    },
    emergencyAccess: {
      enabled: false,
      contacts: [],
      conditions: []
    },
    lastUpdated: '2024-01-28T15:30:00Z',
    complianceStatus: 'review_needed'
  }
]

const mockDataRequests: DataRequest[] = [
  {
    id: '1',
    userId: 'user_3',
    userName: 'Lisa Chen',
    familyName: 'The Chen Legacy',
    requestType: 'export',
    requestDate: '2024-01-30T16:00:00Z',
    status: 'pending',
    urgency: 'standard',
    reason: 'Personal backup of grandmother\'s memories',
    dataScope: ['memories', 'photos', 'ai_conversations'],
    legalBasis: 'User consent'
  }
]

const mockRolePermissions: RolePermission[] = [
  {
    roleId: 'family_admin',
    roleName: 'Family Administrator',
    description: 'Full control over family legacy with ability to invite members and manage settings',
    permissions: {
      viewMemories: true,
      editMemories: true,
      deleteMemories: true,
      inviteMembers: true,
      manageFamily: true,
      exportData: true,
      configureAI: true,
      accessAnalytics: true,
      emergencyOverride: true
    },
    assignedUsers: 2,
    lastModified: '2024-01-15T10:00:00Z',
    isCustom: false
  },
  {
    roleId: 'family_member',
    roleName: 'Family Member',
    description: 'Can share memories and interact with AI, but cannot manage family settings',
    permissions: {
      viewMemories: true,
      editMemories: false,
      deleteMemories: false,
      inviteMembers: false,
      manageFamily: false,
      exportData: true,
      configureAI: false,
      accessAnalytics: false,
      emergencyOverride: false
    },
    assignedUsers: 3,
    lastModified: '2024-01-15T10:00:00Z',
    isCustom: false
  }
]

const getActionColor = (action: AuditLog['action']) => {
  switch (action) {
    case 'login': return griefSensitiveColors.primary[500]
    case 'memory_shared': return griefSensitiveColors.memory[500]
    case 'ai_interaction': return griefSensitiveColors.hope[500]
    case 'data_export': return griefSensitiveColors.peace[500]
    case 'privacy_changed': return griefSensitiveColors.warning[500]
    case 'password_reset': return griefSensitiveColors.comfort[500]
    case 'account_deletion': return griefSensitiveColors.warning[600]
    default: return griefSensitiveColors.peace[400]
  }
}

const getRiskColor = (risk: AuditLog['riskLevel']) => {
  switch (risk) {
    case 'high': return griefSensitiveColors.warning[600]
    case 'medium': return griefSensitiveColors.warning[500]
    case 'low': return griefSensitiveColors.hope[500]
    default: return griefSensitiveColors.peace[400]
  }
}

const getComplianceColor = (status: PrivacyPolicy['complianceStatus']) => {
  switch (status) {
    case 'compliant': return griefSensitiveColors.hope[500]
    case 'review_needed': return griefSensitiveColors.warning[500]
    case 'non_compliant': return griefSensitiveColors.warning[600]
    default: return griefSensitiveColors.peace[400]
  }
}

export default function PrivacyProtectionDashboard() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs)
  const [privacyPolicies, setPrivacyPolicies] = useState<PrivacyPolicy[]>(mockPrivacyPolicies)
  const [dataRequests, setDataRequests] = useState<DataRequest[]>(mockDataRequests)
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(mockRolePermissions)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1day' | '7days' | '30days' | '90days'>('7days')
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'all' | AuditLog['riskLevel']>('all')
  const [showAuditDetails, setShowAuditDetails] = useState(false)
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null)

  const totalAuditEvents = auditLogs.length
  const highRiskEvents = auditLogs.filter(log => log.riskLevel === 'high').length
  const failedAttempts = auditLogs.filter(log => log.outcome === 'failed' || log.outcome === 'blocked').length
  const pendingRequests = dataRequests.filter(req => req.status === 'pending').length

  const filteredLogs = auditLogs.filter(log => {
    const matchesRisk = selectedRiskLevel === 'all' || log.riskLevel === selectedRiskLevel
    // Add timeframe filtering logic here
    return matchesRisk
  })

  return (
    <div className="space-y-8">
      {/* Compassionate Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div 
            className="p-3 rounded-full"
            style={{ backgroundColor: griefSensitiveColors.primary[100] }}
          >
            <Shield className="h-8 w-8" style={{ color: griefSensitiveColors.primary[600] }} />
          </div>
          <h1 
            className="text-3xl font-semibold"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            Privacy & Security Guardian
          </h1>
        </div>
        <p 
          className="text-lg leading-relaxed max-w-2xl mx-auto"
          style={{ color: griefSensitiveColors.peace[600] }}
        >
          Protecting precious family memories with compassionate security measures and transparent privacy controls
        </p>
      </div>

      {/* Security Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <Activity className="h-4 w-4" />
              Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.primary[600] }}
            >
              {totalAuditEvents}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Past 7 days
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: highRiskEvents > 0 ? griefSensitiveColors.warning[50] : 'white',
            border: `1px solid ${highRiskEvents > 0 ? griefSensitiveColors.warning[300] : griefSensitiveColors.hope[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: highRiskEvents > 0 ? griefSensitiveColors.warning[700] : griefSensitiveColors.hope[700] }}
            >
              <AlertTriangle className="h-4 w-4" />
              High Risk Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: highRiskEvents > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600] }}
            >
              {highRiskEvents}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              {highRiskEvents > 0 ? 'Needs attention' : 'All secure'}
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
              <FileText className="h-4 w-4" />
              Data Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.comfort[600] }}
            >
              {pendingRequests}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Pending review
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.peace[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.peace[700] }}
            >
              <CheckCircle className="h-4 w-4" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.hope[600] }}
            >
              {privacyPolicies.filter(p => p.complianceStatus === 'compliant').length}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Families compliant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Events */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: 'white',
          border: `1px solid ${griefSensitiveColors.peace[200]}`
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle 
                className="flex items-center gap-2"
                style={{ color: griefSensitiveColors.peace[800] }}
              >
                <Activity className="h-5 w-5" />
                Recent Security Events
              </CardTitle>
              <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                Monitoring all access and activity for family protection
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedRiskLevel} onValueChange={(value: any) => setSelectedRiskLevel(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 Day</SelectItem>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                  <SelectItem value="90days">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div 
                key={log.id}
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
                style={{ 
                  backgroundColor: griefSensitiveColors.peace[50],
                  borderColor: griefSensitiveColors.peace[200]
                }}
                onClick={() => {
                  setSelectedAuditLog(log)
                  setShowAuditDetails(true)
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="p-2 rounded-full"
                    style={{ backgroundColor: getActionColor(log.action) + '20' }}
                  >
                    {log.action === 'login' && <User className="h-4 w-4" style={{ color: getActionColor(log.action) }} />}
                    {log.action === 'memory_shared' && <Heart className="h-4 w-4" style={{ color: getActionColor(log.action) }} />}
                    {log.action === 'ai_interaction' && <Flower className="h-4 w-4" style={{ color: getActionColor(log.action) }} />}
                    {log.action === 'data_export' && <Download className="h-4 w-4" style={{ color: getActionColor(log.action) }} />}
                    {log.action === 'privacy_changed' && <Settings className="h-4 w-4" style={{ color: getActionColor(log.action) }} />}
                    {log.action === 'password_reset' && <Key className="h-4 w-4" style={{ color: getActionColor(log.action) }} />}
                    {log.action === 'account_deletion' && <Trash2 className="h-4 w-4" style={{ color: getActionColor(log.action) }} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                        {log.userName}
                      </span>
                      <span className="text-sm" style={{ color: griefSensitiveColors.peace[500] }}>
                        {log.familyName}
                      </span>
                      <Badge
                        className="text-xs"
                        style={{
                          backgroundColor: getActionColor(log.action) + '20',
                          color: getActionColor(log.action),
                          border: `1px solid ${getActionColor(log.action)}`
                        }}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                      {log.details}
                    </p>
                    <div className="flex items-center gap-4 text-xs mt-1" style={{ color: griefSensitiveColors.peace[500] }}>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span>{log.location}</span>
                      <span>{log.device}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    style={{
                      backgroundColor: getRiskColor(log.riskLevel) + '20',
                      color: getRiskColor(log.riskLevel),
                      border: `1px solid ${getRiskColor(log.riskLevel)}`
                    }}
                  >
                    {log.riskLevel} risk
                  </Badge>
                  <Badge
                    variant={log.outcome === 'success' ? 'default' : 'destructive'}
                  >
                    {log.outcome}
                  </Badge>
                  {log.outcome === 'success' ? (
                    <CheckCircle className="h-4 w-4" style={{ color: griefSensitiveColors.hope[500] }} />
                  ) : (
                    <XCircle className="h-4 w-4" style={{ color: griefSensitiveColors.warning[500] }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Policies */}
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
            <Lock className="h-5 w-5" />
            Family Privacy Settings
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            Each family's personalized privacy preferences and data protection settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {privacyPolicies.map((policy) => (
              <Card 
                key={policy.id}
                className="border-0 shadow-sm"
                style={{ 
                  backgroundColor: griefSensitiveColors.peace[50],
                  border: `1px solid ${griefSensitiveColors.peace[200]}`
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg" style={{ color: griefSensitiveColors.peace[800] }}>
                        {policy.familyName}
                      </h4>
                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        Last updated {new Date(policy.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      style={{
                        backgroundColor: getComplianceColor(policy.complianceStatus) + '20',
                        color: getComplianceColor(policy.complianceStatus),
                        border: `1px solid ${getComplianceColor(policy.complianceStatus)}`
                      }}
                    >
                      {policy.complianceStatus.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <h5 className="font-medium mb-3" style={{ color: griefSensitiveColors.peace[700] }}>
                        Data Sharing
                      </h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                            Within Family
                          </span>
                          <Switch 
                            checked={policy.sharingPermissions.withinFamily} 
                            disabled
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                            AI Training
                          </span>
                          <Switch 
                            checked={policy.sharingPermissions.aiTraining} 
                            disabled
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                            Research (Anonymous)
                          </span>
                          <Switch 
                            checked={policy.sharingPermissions.anonymizedResearch} 
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-3" style={{ color: griefSensitiveColors.peace[700] }}>
                        Access Controls
                      </h5>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span style={{ color: griefSensitiveColors.peace[600] }}>Two-Factor Auth:</span>
                          <span className="ml-2 font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {policy.accessControls.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span style={{ color: griefSensitiveColors.peace[600] }}>Session Timeout:</span>
                          <span className="ml-2 font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {policy.accessControls.sessionTimeout} min
                          </span>
                        </div>
                        <div className="text-sm">
                          <span style={{ color: griefSensitiveColors.peace[600] }}>Location Limits:</span>
                          <span className="ml-2 font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {policy.accessControls.locationRestrictions.length > 0 
                              ? policy.accessControls.locationRestrictions.join(', ')
                              : 'None'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-3" style={{ color: griefSensitiveColors.peace[700] }}>
                        Content Protection
                      </h5>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span style={{ color: griefSensitiveColors.peace[600] }}>Sensitive Blocking:</span>
                          <span className="ml-2 font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {policy.contentFiltering.sensitiveContentBlocking ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span style={{ color: griefSensitiveColors.peace[600] }}>Manual Review:</span>
                          <span className="ml-2 font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {policy.contentFiltering.manualReview ? 'Required' : 'Automatic'}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span style={{ color: griefSensitiveColors.peace[600] }}>AI Moderation:</span>
                          <span className="ml-2 font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                            {policy.contentFiltering.aiModerationLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Requests */}
      {pendingRequests > 0 && (
        <Card 
          className="border-0 shadow-sm"
          style={{ 
            backgroundColor: griefSensitiveColors.comfort[50],
            border: `1px solid ${griefSensitiveColors.comfort[300]}`
          }}
        >
          <CardHeader>
            <CardTitle 
              className="flex items-center gap-2"
              style={{ color: griefSensitiveColors.comfort[800] }}
            >
              <FileText className="h-5 w-5" />
              Pending Data Requests
            </CardTitle>
            <CardDescription style={{ color: griefSensitiveColors.comfort[700] }}>
              Family members requesting access to their precious memory data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dataRequests.filter(req => req.status === 'pending').map((request) => (
                <div 
                  key={request.id}
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: 'white',
                    borderColor: griefSensitiveColors.comfort[200]
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                        {request.userName}
                      </h4>
                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        {request.familyName} • {request.requestType} request
                      </p>
                    </div>
                    <Badge
                      style={{
                        backgroundColor: griefSensitiveColors.comfort[100],
                        color: griefSensitiveColors.comfort[700],
                        border: `1px solid ${griefSensitiveColors.comfort[300]}`
                      }}
                    >
                      {request.urgency}
                    </Badge>
                  </div>
                  
                  <p className="text-sm mb-3" style={{ color: griefSensitiveColors.peace[600] }}>
                    {request.reason}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                      Requested {new Date(request.requestDate).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        style={{
                          backgroundColor: griefSensitiveColors.hope[500],
                          color: 'white'
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        style={{
                          borderColor: griefSensitiveColors.peace[300],
                          color: griefSensitiveColors.peace[600]
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role-Based Access Control */}
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
            <Crown className="h-5 w-5" />
            Role-Based Access Control
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            Defining compassionate permissions that respect family hierarchies and relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rolePermissions.map((role) => (
              <div 
                key={role.roleId}
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: griefSensitiveColors.peace[50],
                  borderColor: griefSensitiveColors.peace[200]
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                      {role.roleName}
                    </h4>
                    <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                      {role.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-lg font-semibold"
                      style={{ color: griefSensitiveColors.primary[600] }}
                    >
                      {role.assignedUsers}
                    </div>
                    <p className="text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                      users assigned
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                  {Object.entries(role.permissions).map(([permission, enabled]) => (
                    <div 
                      key={permission}
                      className={`text-xs px-2 py-1 rounded-full text-center ${
                        enabled 
                          ? 'bg-opacity-20 border' 
                          : 'bg-opacity-10'
                      }`}
                      style={{
                        backgroundColor: enabled ? griefSensitiveColors.hope[500] + '20' : griefSensitiveColors.peace[200],
                        color: enabled ? griefSensitiveColors.hope[700] : griefSensitiveColors.peace[500],
                        border: enabled ? `1px solid ${griefSensitiveColors.hope[300]}` : 'none'
                      }}
                    >
                      {permission.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Detail Dialog */}
      <Dialog open={showAuditDetails} onOpenChange={setShowAuditDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle 
              className="flex items-center gap-2"
              style={{ color: griefSensitiveColors.peace[800] }}
            >
              <Activity className="h-5 w-5" />
              Security Event Details
            </DialogTitle>
            <DialogDescription style={{ color: griefSensitiveColors.peace[600] }}>
              Detailed information about this security event
            </DialogDescription>
          </DialogHeader>
          {selectedAuditLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label style={{ color: griefSensitiveColors.peace[600] }}>User</Label>
                  <p style={{ color: griefSensitiveColors.peace[800] }}>{selectedAuditLog.userName}</p>
                </div>
                <div>
                  <Label style={{ color: griefSensitiveColors.peace[600] }}>Family</Label>
                  <p style={{ color: griefSensitiveColors.peace[800] }}>{selectedAuditLog.familyName}</p>
                </div>
                <div>
                  <Label style={{ color: griefSensitiveColors.peace[600] }}>Action</Label>
                  <p style={{ color: griefSensitiveColors.peace[800] }}>{selectedAuditLog.action.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label style={{ color: griefSensitiveColors.peace[600] }}>Timestamp</Label>
                  <p style={{ color: griefSensitiveColors.peace[800] }}>{new Date(selectedAuditLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <Label style={{ color: griefSensitiveColors.peace[600] }}>IP Address</Label>
                  <p style={{ color: griefSensitiveColors.peace[800] }}>{selectedAuditLog.ipAddress}</p>
                </div>
                <div>
                  <Label style={{ color: griefSensitiveColors.peace[600] }}>Location</Label>
                  <p style={{ color: griefSensitiveColors.peace[800] }}>{selectedAuditLog.location}</p>
                </div>
              </div>
              <div>
                <Label style={{ color: griefSensitiveColors.peace[600] }}>Details</Label>
                <p className="mt-1" style={{ color: griefSensitiveColors.peace[800] }}>{selectedAuditLog.details}</p>
              </div>
              <div className="flex gap-2">
                <Badge
                  style={{
                    backgroundColor: getRiskColor(selectedAuditLog.riskLevel) + '20',
                    color: getRiskColor(selectedAuditLog.riskLevel),
                    border: `1px solid ${getRiskColor(selectedAuditLog.riskLevel)}`
                  }}
                >
                  {selectedAuditLog.riskLevel} risk
                </Badge>
                <Badge
                  variant={selectedAuditLog.outcome === 'success' ? 'default' : 'destructive'}
                >
                  {selectedAuditLog.outcome}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAuditDetails(false)}
              style={{
                borderColor: griefSensitiveColors.peace[300],
                color: griefSensitiveColors.peace[600]
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}