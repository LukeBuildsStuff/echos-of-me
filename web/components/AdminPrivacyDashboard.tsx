'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface ConsentRecord {
  id: string
  userId: string
  userName: string
  userEmail: string
  consentType: 'training' | 'data_access' | 'model_sharing' | 'analytics'
  status: 'granted' | 'denied' | 'pending' | 'revoked'
  grantedAt: string | null
  revokedAt: string | null
  expiresAt: string | null
  metadata: {
    adminUserId?: string
    reason?: string
    scope: string[]
  }
}

interface DataAccessAudit {
  id: string
  userId: string
  userName: string
  adminUserId: string
  adminName: string
  accessType: 'preview' | 'training' | 'model_interaction' | 'analytics'
  dataTypes: string[]
  accessReason: string
  accessedAt: string
  recordCount: number
  approved: boolean
}

interface ComplianceStats {
  totalUsers: number
  consentStatus: Record<string, number>
  recentAccess: DataAccessAudit[]
  expiringConsents: ConsentRecord[]
}

export default function AdminPrivacyDashboard() {
  const [activeTab, setActiveTab] = useState<'consents' | 'audit' | 'compliance'>('consents')
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [auditLog, setAuditLog] = useState<DataAccessAudit[]>([])
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [userFilter, setUserFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  
  // Consent request dialog
  const [requestDialog, setRequestDialog] = useState({
    open: false,
    userId: '',
    userName: '',
    consentType: 'training' as ConsentRecord['consentType'],
    reason: '',
    scope: [] as string[]
  })

  const loadConsents = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (userFilter) params.append('user', userFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      
      const response = await fetch(`/api/admin/privacy/consents?${params}`)
      if (!response.ok) throw new Error('Failed to load consents')
      
      const data = await response.json()
      setConsents(data.consents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consents')
    } finally {
      setLoading(false)
    }
  }, [userFilter, statusFilter, typeFilter])

  const loadAuditLog = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/privacy/audit')
      if (!response.ok) throw new Error('Failed to load audit log')
      
      const data = await response.json()
      setAuditLog(data.auditLog || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    }
  }, [])

  const loadComplianceStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/privacy/compliance')
      if (!response.ok) throw new Error('Failed to load compliance stats')
      
      const data = await response.json()
      setComplianceStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance stats')
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'consents') {
      loadConsents()
    } else if (activeTab === 'audit') {
      loadAuditLog()
    } else if (activeTab === 'compliance') {
      loadComplianceStats()
    }
  }, [activeTab, loadConsents, loadAuditLog, loadComplianceStats])

  const requestConsent = async () => {
    try {
      const response = await fetch('/api/admin/privacy/consent-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: requestDialog.userId,
          consentType: requestDialog.consentType,
          reason: requestDialog.reason,
          scope: requestDialog.scope
        })
      })

      if (!response.ok) throw new Error('Failed to request consent')

      setRequestDialog({ ...requestDialog, open: false })
      await loadConsents()
      
      // Show success message
      alert('Consent request sent successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request consent')
    }
  }

  const revokeConsent = async (consentId: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/privacy/revoke-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId, reason })
      })

      if (!response.ok) throw new Error('Failed to revoke consent')

      await loadConsents()
      alert('Consent revoked successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke consent')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'granted': return 'bg-green-100 text-green-800 border-green-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'denied': return 'bg-red-100 text-red-800 border-red-200'
      case 'revoked': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString()
  }

  if (loading && !consents.length && !auditLog.length && !complianceStats) {
    return <Loading message="Loading privacy dashboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Privacy & Consent Management</h2>
        <p className="text-gray-600">Manage user privacy settings, consent records, and audit trails</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'consents', label: 'Consent Records', count: consents.length },
            { id: 'audit', label: 'Access Audit', count: auditLog.length },
            { id: 'compliance', label: 'Compliance Dashboard', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Consent Records Tab */}
      {activeTab === 'consents' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search users..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="max-w-sm"
            />
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="granted">Granted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="data_access">Data Access</SelectItem>
                <SelectItem value="model_sharing">Model Sharing</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={requestDialog.open} onOpenChange={(open) => setRequestDialog({...requestDialog, open})}>
              <DialogTrigger asChild>
                <Button>Request Consent</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request User Consent</DialogTitle>
                  <DialogDescription>
                    Request consent from a user for specific data access
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="User ID or Email"
                    value={requestDialog.userId}
                    onChange={(e) => setRequestDialog({...requestDialog, userId: e.target.value})}
                  />
                  
                  <Select 
                    value={requestDialog.consentType} 
                    onValueChange={(value) => setRequestDialog({...requestDialog, consentType: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="data_access">Data Access</SelectItem>
                      <SelectItem value="model_sharing">Model Sharing</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="Reason for consent request..."
                    value={requestDialog.reason}
                    onChange={(e) => setRequestDialog({...requestDialog, reason: e.target.value})}
                  />

                  <Button onClick={requestConsent} className="w-full">
                    Send Consent Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Consent Records */}
          <div className="grid gap-4">
            {consents.map((consent) => (
              <Card key={consent.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{consent.userName}</h3>
                        <Badge className={getStatusBadgeColor(consent.status)}>
                          {consent.status}
                        </Badge>
                        <Badge variant="outline">
                          {consent.consentType.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600">{consent.userEmail}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Granted:</span>
                          <div>{formatDate(consent.grantedAt)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Expires:</span>
                          <div>{formatDate(consent.expiresAt)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Scope:</span>
                          <div>{consent.metadata.scope?.join(', ') || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Reason:</span>
                          <div className="truncate">{consent.metadata.reason || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {consent.status === 'granted' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Reason for revocation:')
                            if (reason) revokeConsent(consent.id, reason)
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {auditLog.map((audit) => (
              <Card key={audit.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{audit.userName}</h3>
                        <Badge variant="outline">{audit.accessType}</Badge>
                        <Badge className={audit.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {audit.approved ? 'Approved' : 'Denied'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        Accessed by: {audit.adminName} • {formatDate(audit.accessedAt)}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Data Types:</span>
                          <div>{audit.dataTypes.join(', ')}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Records:</span>
                          <div>{audit.recordCount}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Reason:</span>
                          <div className="truncate">{audit.accessReason}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Dashboard Tab */}
      {activeTab === 'compliance' && complianceStats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{complianceStats.totalUsers}</div>
                <p className="text-sm text-gray-600">Total Active Users</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {complianceStats.consentStatus.training_granted || 0}
                </div>
                <p className="text-sm text-gray-600">Training Consents</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {complianceStats.expiringConsents.length}
                </div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {complianceStats.recentAccess.length}
                </div>
                <p className="text-sm text-gray-600">Recent Access</p>
              </CardContent>
            </Card>
          </div>

          {/* Expiring Consents */}
          {complianceStats.expiringConsents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expiring Consents</CardTitle>
                <CardDescription>
                  Consents that will expire within 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceStats.expiringConsents.map((consent) => (
                    <div key={consent.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{consent.userName}</div>
                        <div className="text-sm text-gray-600">
                          {consent.consentType} • Expires: {formatDate(consent.expiresAt)}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Renew
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Access */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Data Access</CardTitle>
              <CardDescription>
                Data access activities in the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {complianceStats.recentAccess.map((access) => (
                  <div key={access.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">{access.userName}</div>
                      <div className="text-sm text-gray-600">
                        {access.accessType} by {access.adminName} • {formatDate(access.accessedAt)}
                      </div>
                    </div>
                    <Badge className={access.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {access.approved ? 'Approved' : 'Denied'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}