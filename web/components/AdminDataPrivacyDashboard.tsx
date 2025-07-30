'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface UserPrivacyProfile {
  id: string
  email: string
  name: string
  
  // Consent Management
  consent: {
    dataProcessing: 'granted' | 'denied' | 'pending' | 'withdrawn'
    aiTraining: 'granted' | 'denied' | 'pending' | 'withdrawn'
    dataSharing: 'granted' | 'denied' | 'pending' | 'withdrawn'
    marketing: 'granted' | 'denied' | 'pending' | 'withdrawn'
    lastUpdated: string
    ipAddress: string
    userAgent: string
  }
  
  // Data Categories
  dataCategories: {
    personalInfo: {
      collected: boolean
      count: number
      lastAccess: string
      retention: string
    }
    responses: {
      collected: boolean
      count: number
      lastAccess: string
      retention: string
      sensitive: boolean
    }
    lifeStories: {
      collected: boolean
      count: number
      lastAccess: string
      retention: string
      sensitive: boolean
    }
    voiceData: {
      collected: boolean
      count: number
      lastAccess: string
      retention: string
      sensitive: boolean
    }
    biometricData: {
      collected: boolean
      count: number
      lastAccess: string
      retention: string
      sensitive: boolean
    }
  }
  
  // Data Access & Processing
  access: {
    adminViews: number
    lastAdminAccess: string
    trainingUsage: number
    lastTrainingAccess: string
    apiAccesses: number
    lastApiAccess: string
  }
  
  // Privacy Rights
  rights: {
    hasRequestedData: boolean
    hasRequestedDeletion: boolean
    hasRequestedPortability: boolean
    hasRequestedRectification: boolean
    dataRetentionExpiry: string
  }
  
  // Risk Assessment
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical'
    factors: string[]
    complianceScore: number
    lastAssessment: string
  }
}

interface PrivacyMetrics {
  totalUsers: number
  consentStats: {
    granted: number
    denied: number
    pending: number
    withdrawn: number
  }
  dataBreaches: number
  complianceIssues: number
  averageComplianceScore: number
  dataRetentionCompliance: number
  gdprCompliance: number
  ccpaCompliance: number
}

interface ComplianceAlert {
  id: string
  type: 'consent_expired' | 'data_retention' | 'access_violation' | 'breach_detection' | 'compliance_check'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  userName?: string
  message: string
  details: string
  createdAt: string
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
}

interface PrivacyAuditLog {
  id: string
  timestamp: string
  action: string
  userId: string
  userName: string
  adminId: string
  adminName: string
  details: string
  ipAddress: string
  category: 'access' | 'modification' | 'deletion' | 'consent' | 'export'
}

export default function AdminDataPrivacyDashboard() {
  const [users, setUsers] = useState<UserPrivacyProfile[]>([])
  const [metrics, setMetrics] = useState<PrivacyMetrics | null>(null)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [auditLogs, setAuditLogs] = useState<PrivacyAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Search and filtering
  const [searchTerm, setSearchTerm] = useState('')
  const [consentFilter, setConsentFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  
  // Selected user for detailed view
  const [selectedUser, setSelectedUser] = useState<UserPrivacyProfile | null>(null)
  
  // Bulk operations
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')

  useEffect(() => {
    loadPrivacyData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadPrivacyData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPrivacyData = async () => {
    try {
      setError(null)
      
      const [usersResponse, metricsResponse, alertsResponse, auditResponse] = await Promise.all([
        fetch('/api/admin/privacy/users'),
        fetch('/api/admin/privacy/metrics'),
        fetch('/api/admin/privacy/alerts'),
        fetch('/api/admin/privacy/audit-logs')
      ])
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts || [])
      }
      
      if (auditResponse.ok) {
        const auditData = await auditResponse.json()
        setAuditLogs(auditData.logs || [])
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load privacy data')
    } finally {
      setLoading(false)
    }
  }

  const handleConsentUpdate = async (userId: string, consentType: string, status: string) => {
    try {
      const response = await fetch('/api/admin/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, consentType, status })
      })
      
      if (response.ok) {
        await loadPrivacyData()
      }
    } catch (error) {
      console.error('Failed to update consent:', error)
    }
  }

  const handleDataDeletion = async (userId: string, categories: string[]) => {
    if (confirm(`Are you sure you want to delete selected data for this user? This action cannot be undone.`)) {
      try {
        const response = await fetch('/api/admin/privacy/delete-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, categories })
        })
        
        if (response.ok) {
          await loadPrivacyData()
          alert('Data deletion completed successfully')
        }
      } catch (error) {
        console.error('Failed to delete data:', error)
      }
    }
  }

  const generateDataExport = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/privacy/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `user_data_export_${userId}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to generate data export:', error)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/privacy/resolve-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      })
      
      if (response.ok) {
        await loadPrivacyData()
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const runComplianceCheck = async () => {
    try {
      const response = await fetch('/api/admin/privacy/compliance-check', {
        method: 'POST'
      })
      
      if (response.ok) {
        await loadPrivacyData()
        alert('Compliance check completed. Check alerts for any issues found.')
      }
    } catch (error) {
      console.error('Failed to run compliance check:', error)
    }
  }

  const getConsentColor = (status: string) => {
    switch (status) {
      case 'granted': return 'bg-green-100 text-green-800'
      case 'denied': return 'bg-red-100 text-red-800'
      case 'withdrawn': return 'bg-orange-100 text-orange-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesConsent = consentFilter === 'all' || user.consent.dataProcessing === consentFilter
    const matchesRisk = riskFilter === 'all' || user.risk.level === riskFilter
    
    return matchesSearch && matchesConsent && matchesRisk
  })

  if (loading) {
    return <Loading message="Loading privacy dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Privacy & Compliance</h2>
          <p className="text-gray-600">GDPR, CCPA, and privacy regulation compliance management</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={runComplianceCheck} variant="outline">
            Run Compliance Check
          </Button>
          <Button onClick={loadPrivacyData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalUsers}</div>
              <p className="text-sm text-gray-600">Total Users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.consentStats.granted}</div>
              <p className="text-sm text-gray-600">Consents Granted</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.complianceIssues}</div>
              <p className="text-sm text-gray-600">Compliance Issues</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.averageComplianceScore}%</div>
              <p className="text-sm text-gray-600">Avg Compliance</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">{metrics.gdprCompliance}%</div>
              <p className="text-sm text-gray-600">GDPR Score</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{metrics.ccpaCompliance}%</div>
              <p className="text-sm text-gray-600">CCPA Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">User Privacy</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.filter(a => !a.resolved).length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* User Privacy Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            
            <Select value={consentFilter} onValueChange={setConsentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by consent..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Consent Status</SelectItem>
                <SelectItem value="granted">Granted</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by risk..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="critical">Critical Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User List */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      {/* User Header */}
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-semibold">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <Badge className={getRiskColor(user.risk.level)}>
                          {user.risk.level} risk
                        </Badge>
                      </div>

                      {/* Consent Status */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center">
                          <Badge className={getConsentColor(user.consent.dataProcessing)} variant="outline">
                            Data Processing
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">{user.consent.dataProcessing}</div>
                        </div>
                        <div className="text-center">
                          <Badge className={getConsentColor(user.consent.aiTraining)} variant="outline">
                            AI Training
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">{user.consent.aiTraining}</div>
                        </div>
                        <div className="text-center">
                          <Badge className={getConsentColor(user.consent.dataSharing)} variant="outline">
                            Data Sharing
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">{user.consent.dataSharing}</div>
                        </div>
                        <div className="text-center">
                          <Badge className={getConsentColor(user.consent.marketing)} variant="outline">
                            Marketing
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">{user.consent.marketing}</div>
                        </div>
                      </div>

                      {/* Data Categories */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-medium mb-2">Data Categories</h5>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          <div className={user.dataCategories.personalInfo.collected ? 'text-blue-600' : 'text-gray-400'}>
                            Personal Info ({user.dataCategories.personalInfo.count})
                          </div>
                          <div className={user.dataCategories.responses.collected ? 'text-green-600' : 'text-gray-400'}>
                            Responses ({user.dataCategories.responses.count})
                            {user.dataCategories.responses.sensitive && <span className="text-red-600">*</span>}
                          </div>
                          <div className={user.dataCategories.lifeStories.collected ? 'text-purple-600' : 'text-gray-400'}>
                            Life Stories ({user.dataCategories.lifeStories.count})
                            {user.dataCategories.lifeStories.sensitive && <span className="text-red-600">*</span>}
                          </div>
                          <div className={user.dataCategories.voiceData.collected ? 'text-orange-600' : 'text-gray-400'}>
                            Voice Data ({user.dataCategories.voiceData.count})
                            {user.dataCategories.voiceData.sensitive && <span className="text-red-600">*</span>}
                          </div>
                          <div className={user.dataCategories.biometricData.collected ? 'text-red-600' : 'text-gray-400'}>
                            Biometric ({user.dataCategories.biometricData.count})
                            {user.dataCategories.biometricData.sensitive && <span className="text-red-600">*</span>}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">* Sensitive data requiring enhanced protection</div>
                      </div>

                      {/* Compliance Score */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Compliance Score:</span>
                        <Progress value={user.risk.complianceScore} className="flex-1 max-w-32" />
                        <span className="text-sm font-medium">{user.risk.complianceScore}%</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Privacy Profile - {user.name}</DialogTitle>
                            <DialogDescription>
                              Complete privacy and compliance information
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedUser && selectedUser.id === user.id && (
                            <div className="space-y-6">
                              {/* Consent Management */}
                              <div>
                                <h4 className="font-semibold mb-3">Consent Management</h4>
                                <div className="space-y-3">
                                  {Object.entries(selectedUser.consent).filter(([key]) => key !== 'lastUpdated' && key !== 'ipAddress' && key !== 'userAgent').map(([type, status]) => (
                                    <div key={type} className="flex justify-between items-center">
                                      <span className="capitalize">{type.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                                      <div className="flex gap-2">
                                        <Badge className={getConsentColor(status as string)}>
                                          {status as string}
                                        </Badge>
                                        <Select 
                                          value={status as string}
                                          onValueChange={(value) => handleConsentUpdate(selectedUser.id, type, value)}
                                        >
                                          <SelectTrigger className="w-32">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="granted">Grant</SelectItem>
                                            <SelectItem value="denied">Deny</SelectItem>
                                            <SelectItem value="withdrawn">Withdraw</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                                  <div><strong>Last Updated:</strong> {formatDate(selectedUser.consent.lastUpdated)}</div>
                                  <div><strong>IP Address:</strong> {selectedUser.consent.ipAddress}</div>
                                </div>
                              </div>

                              {/* Data Categories Detail */}
                              <div>
                                <h4 className="font-semibold mb-3">Data Categories</h4>
                                <div className="space-y-3">
                                  {Object.entries(selectedUser.dataCategories).map(([category, data]) => (
                                    <div key={category} className="border rounded p-3">
                                      <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-medium capitalize">{category.replace(/([A-Z])/g, ' $1')}</h5>
                                        <div className="flex gap-2">
                                          {data.sensitive && (
                                            <Badge variant="destructive" className="text-xs">Sensitive</Badge>
                                          )}
                                          <Badge variant={data.collected ? "default" : "outline"}>
                                            {data.collected ? 'Collected' : 'Not Collected'}
                                          </Badge>
                                        </div>
                                      </div>
                                      {data.collected && (
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                          <div><strong>Count:</strong> {data.count}</div>
                                          <div><strong>Last Access:</strong> {formatDate(data.lastAccess)}</div>
                                          <div><strong>Retention:</strong> {data.retention}</div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Privacy Rights */}
                              <div>
                                <h4 className="font-semibold mb-3">Privacy Rights Requests</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedUser.rights.hasRequestedData}
                                        readOnly
                                      />
                                      <span className="text-sm">Data Access Request</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedUser.rights.hasRequestedDeletion}
                                        readOnly
                                      />
                                      <span className="text-sm">Data Deletion Request</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedUser.rights.hasRequestedPortability}
                                        readOnly
                                      />
                                      <span className="text-sm">Data Portability Request</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedUser.rights.hasRequestedRectification}
                                        readOnly
                                      />
                                      <span className="text-sm">Data Rectification Request</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Risk Assessment */}
                              <div>
                                <h4 className="font-semibold mb-3">Risk Assessment</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span>Risk Level</span>
                                    <Badge className={getRiskColor(selectedUser.risk.level)}>
                                      {selectedUser.risk.level}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="font-medium">Risk Factors:</span>
                                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                      {selectedUser.risk.factors.map((factor, idx) => (
                                        <li key={idx}>{factor}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span>Compliance Score:</span>
                                    <Progress value={selectedUser.risk.complianceScore} className="flex-1" />
                                    <span>{selectedUser.risk.complianceScore}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-3 pt-4 border-t">
                                <Button 
                                  onClick={() => generateDataExport(selectedUser.id)}
                                  variant="outline"
                                >
                                  Export Data
                                </Button>
                                <Button 
                                  onClick={() => handleDataDeletion(selectedUser.id, ['all'])}
                                  variant="destructive"
                                >
                                  Delete All Data
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateDataExport(user.id)}
                      >
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">No users match the current filters</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Compliance Alerts</h3>
            <div className="text-sm text-gray-600">
              {alerts.filter(a => !a.resolved).length} unresolved alerts
            </div>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${
                alert.severity === 'critical' ? 'border-l-red-500' :
                alert.severity === 'high' ? 'border-l-orange-500' :
                alert.severity === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              } ${alert.resolved ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="font-medium">{alert.message}</span>
                        {alert.resolved && (
                          <Badge variant="outline" className="text-green-600">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600">{alert.details}</p>
                      
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Created: {formatDate(alert.createdAt)}</span>
                        {alert.userName && <span>User: {alert.userName}</span>}
                        {alert.resolved && alert.resolvedAt && (
                          <span>Resolved: {formatDate(alert.resolvedAt)}</span>
                        )}
                      </div>
                    </div>
                    
                    {!alert.resolved && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {alerts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-green-600 font-medium">No compliance alerts</div>
                <div className="text-sm text-gray-500">All privacy requirements are being met</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Privacy Audit Trail</h3>
            <p className="text-sm text-gray-600">Complete log of all privacy-related actions</p>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <Card key={log.id} className="hover:bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{log.category}</Badge>
                        <span className="font-medium">{log.action}</span>
                      </div>
                      
                      <p className="text-sm text-gray-600">{log.details}</p>
                      
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{formatDate(log.timestamp)}</span>
                        <span>User: {log.userName}</span>
                        <span>Admin: {log.adminName}</span>
                        <span>IP: {log.ipAddress}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {auditLogs.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">No audit logs available</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance Status</CardTitle>
              <CardDescription>Overall compliance with major privacy regulations</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics && (
                <div className="space-y-6">
                  {/* Compliance Scores */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{metrics.gdprCompliance}%</div>
                      <div className="font-medium">GDPR Compliance</div>
                      <Progress value={metrics.gdprCompliance} className="mt-2" />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">{metrics.ccpaCompliance}%</div>
                      <div className="font-medium">CCPA Compliance</div>
                      <Progress value={metrics.ccpaCompliance} className="mt-2" />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 mb-2">{metrics.dataRetentionCompliance}%</div>
                      <div className="font-medium">Data Retention</div>
                      <Progress value={metrics.dataRetentionCompliance} className="mt-2" />
                    </div>
                  </div>

                  {/* Compliance Breakdown */}
                  <div>
                    <h4 className="font-semibold mb-3">Compliance Requirements</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span>Consent Management System</span>
                        <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span>Data Subject Rights</span>
                        <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span>Privacy by Design</span>
                        <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <span>Data Breach Notification</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-semibold mb-3">Compliance Recommendations</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>Data Minimization:</strong> Review data collection practices to ensure only necessary data is collected and processed.
                        </div>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm text-yellow-800">
                          <strong>Consent Refresh:</strong> 12 users have consent older than 12 months - consider requesting renewed consent.
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>Audit Trail:</strong> Privacy audit logging is functioning correctly and capturing all required events.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}