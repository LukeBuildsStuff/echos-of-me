'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdminLayout from '@/components/AdminLayout'
import { MobileAccessibleTable } from '@/components/ui/mobile-accessible-table'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import ErrorBoundary from '@/components/ErrorBoundary'
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  Eye, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  Globe,
  Key,
  Trash2,
  Settings,
  Calendar,
  User,
  Activity,
  Database,
  FileText
} from 'lucide-react'

interface SecurityEvent {
  id: string
  type: 'login' | 'failed_login' | 'logout' | 'password_change' | 'admin_action' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  details: {
    action: string
    resource?: string
    oldValue?: string
    newValue?: string
    userAgent?: string
    ip: string
    location?: string
    device?: string
  }
  timestamp: string
  resolved: boolean
  notes?: string
}

interface BlockedIP {
  id: string
  ip: string
  reason: string
  blockedAt: string
  blockedBy: string
  expiresAt: string | null
  attempts: number
  lastAttempt: string
}

interface ActiveSession {
  id: string
  userId: string
  userEmail: string
  userName: string
  ip: string
  location: string
  device: string
  browser: string
  loginAt: string
  lastActivity: string
  isCurrentSession: boolean
}

interface SecurityStats {
  totalEvents: number
  criticalAlerts: number
  failedLogins24h: number
  blockedIPs: number
  activeSessions: number
  suspiciousActivity: number
}

const mockSecurityStats: SecurityStats = {
  totalEvents: 15432,
  criticalAlerts: 3,
  failedLogins24h: 47,
  blockedIPs: 12,
  activeSessions: 234,
  suspiciousActivity: 8
}

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: '1',
    type: 'admin_action',
    severity: 'high',
    user: { id: '1', email: 'admin@echosofme.com', name: 'Admin User', role: 'admin' },
    details: {
      action: 'User account suspended',
      resource: 'user:123',
      oldValue: 'active',
      newValue: 'suspended',
      ip: '192.168.1.100',
      location: 'San Francisco, CA'
    },
    timestamp: '2025-01-31T14:30:00Z',
    resolved: true
  },
  {
    id: '2',
    type: 'failed_login',
    severity: 'medium',
    user: { id: '2', email: 'attacker@suspicious.com', name: 'Unknown', role: 'user' },
    details: {
      action: 'Multiple failed login attempts',
      ip: '185.220.101.42',
      location: 'Unknown',
      device: 'Desktop',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timestamp: '2025-01-31T14:15:00Z',
    resolved: false
  },
  {
    id: '3',
    type: 'suspicious_activity',
    severity: 'critical',
    user: { id: '3', email: 'user@example.com', name: 'John Doe', role: 'user' },
    details: {
      action: 'Unusual API access pattern detected',
      ip: '203.0.113.5',
      location: 'Tokyo, Japan',
      device: 'Mobile'
    },
    timestamp: '2025-01-31T13:45:00Z',
    resolved: false
  }
]

const mockBlockedIPs: BlockedIP[] = [
  {
    id: '1',
    ip: '185.220.101.42',
    reason: 'Multiple failed login attempts',
    blockedAt: '2025-01-31T14:15:00Z',
    blockedBy: 'Automated System',
    expiresAt: '2025-02-07T14:15:00Z',
    attempts: 25,
    lastAttempt: '2025-01-31T14:14:55Z'
  },
  {
    id: '2',
    ip: '198.51.100.15',
    reason: 'Suspicious bot activity',
    blockedAt: '2025-01-31T12:30:00Z',
    blockedBy: 'admin@echosofme.com',
    expiresAt: null,
    attempts: 156,
    lastAttempt: '2025-01-31T12:29:42Z'
  }
]

const mockActiveSessions: ActiveSession[] = [
  {
    id: '1',
    userId: '1',
    userEmail: 'admin@echosofme.com',
    userName: 'Admin User',
    ip: '192.168.1.100',
    location: 'San Francisco, CA',
    device: 'Desktop',
    browser: 'Chrome 120.0',
    loginAt: '2025-01-31T09:00:00Z',
    lastActivity: '2025-01-31T14:45:00Z',
    isCurrentSession: true
  },
  {
    id: '2',
    userId: '2',
    userEmail: 'user@example.com',
    userName: 'John Doe',
    ip: '203.0.113.5',
    location: 'New York, NY',
    device: 'Mobile',
    browser: 'Safari 17.2',
    loginAt: '2025-01-31T08:30:00Z',
    lastActivity: '2025-01-31T14:30:00Z',
    isCurrentSession: false
  }
]

export default function AdminSecurity() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SecurityStats>(mockSecurityStats)
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(mockSecurityEvents)
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>(mockBlockedIPs)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(mockActiveSessions)
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'blocked' | 'sessions'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      // Load security data
      const securityResponse = await fetch('/api/admin/security/events')
      if (securityResponse.ok) {
        const data = await securityResponse.json()
        setSecurityEvents(data.events || mockSecurityEvents)
        setStats(data.stats || mockSecurityStats)
      }
    } catch (error) {
      console.error('Failed to load security data:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkAdminAccess()
    }
  }, [status, router, checkAdminAccess])

  const handleBlockIP = async (ip: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, reason })
      })

      if (response.ok) {
        await checkAdminAccess()
      }
    } catch (error) {
      console.error('Failed to block IP:', error)
    }
  }

  const handleUnblockIP = async (ipId: string) => {
    try {
      const response = await fetch(`/api/admin/security/unblock-ip/${ipId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setBlockedIPs(prev => prev.filter(ip => ip.id !== ipId))
      }
    } catch (error) {
      console.error('Failed to unblock IP:', error)
    }
  }

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/security/terminate-session/${sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setActiveSessions(prev => prev.filter(session => session.id !== sessionId))
      }
    } catch (error) {
      console.error('Failed to terminate session:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSeverityBadge = (severity: SecurityEvent['severity']) => {
    const variants = {
      low: { variant: 'outline' as const, label: 'Low', className: '' },
      medium: { variant: 'default' as const, label: 'Medium', className: '' },
      high: { variant: 'destructive' as const, label: 'High', className: '' },
      critical: { variant: 'destructive' as const, label: 'Critical', className: 'animate-pulse' }
    }
    
    const config = variants[severity]
    return (
      <Badge 
        variant={config.variant} 
        className={config.className}
      >
        {config.label}
      </Badge>
    )
  }

  const getEventTypeIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'login': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed_login': return <XCircle className="h-4 w-4 text-red-500" />
      case 'logout': return <Clock className="h-4 w-4 text-gray-500" />
      case 'password_change': return <Key className="h-4 w-4 text-blue-500" />
      case 'admin_action': return <Shield className="h-4 w-4 text-purple-500" />
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading security dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <ErrorBoundary>
      <AdminLayout
        title="Security & Audit"
        subtitle="Monitor system security, user activity, and audit trails"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Security' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkAdminAccess()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/admin/settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Security Settings
            </Button>
          </div>
        }
      >
        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Events</p>
                  <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Critical Alerts</p>
                  <div className="text-2xl font-bold text-red-700">{stats.criticalAlerts}</div>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed Logins (24h)</p>
                  <div className="text-2xl font-bold">{stats.failedLogins24h}</div>
                </div>
                <XCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Blocked IPs</p>
                  <div className="text-2xl font-bold">{stats.blockedIPs}</div>
                </div>
                <Ban className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Sessions</p>
                  <div className="text-2xl font-bold">{stats.activeSessions}</div>
                </div>
                <User className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Suspicious Activity</p>
                  <div className="text-2xl font-bold text-yellow-700">{stats.suspiciousActivity}</div>
                </div>
                <Eye className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">
              Security Events
              {stats.criticalAlerts > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.criticalAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="blocked">
              Blocked IPs
              <Badge variant="secondary" className="ml-2">
                {stats.blockedIPs}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sessions">
              Active Sessions
              <Badge variant="secondary" className="ml-2">
                {stats.activeSessions}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Critical Events</CardTitle>
                  <CardDescription>High-priority security events requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {securityEvents
                      .filter(event => event.severity === 'critical' || event.severity === 'high')
                      .slice(0, 5)
                      .map(event => (
                        <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          {getEventTypeIcon(event.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.details.action}</span>
                              {getSeverityBadge(event.severity)}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {event.user.email} from {event.details.ip}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Blocked IPs</CardTitle>
                  <CardDescription>Most frequently blocked IP addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {blockedIPs.slice(0, 5).map(ip => (
                      <div key={ip.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium font-mono">{ip.ip}</div>
                          <p className="text-sm text-gray-600">{ip.reason}</p>
                          <p className="text-xs text-gray-500">{ip.attempts} attempts</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblockIP(ip.id)}
                        >
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Comprehensive log of all security-related events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>

                  {/* Events List */}
                  <div className="space-y-2">
                    {securityEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedEvent(event)
                          setShowEventModal(true)
                        }}
                      >
                        {getEventTypeIcon(event.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{event.details.action}</span>
                            {getSeverityBadge(event.severity)}
                            {!event.resolved && (
                              <Badge variant="outline" className="text-xs">
                                Unresolved
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>User: {event.user.email} ({event.user.role})</div>
                            <div>IP: {event.details.ip} {event.details.location && `• ${event.details.location}`}</div>
                            <div>Time: {formatDate(event.timestamp)}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blocked IPs Tab */}
          <TabsContent value="blocked" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Blocked IP Addresses</CardTitle>
                <CardDescription>Manage blocked IP addresses and access restrictions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Add IP Block Form */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium mb-3">Block New IP Address</h4>
                    <div className="flex gap-2">
                      <Input placeholder="IP Address (e.g., 192.168.1.100)" className="flex-1" />
                      <Input placeholder="Reason for blocking" className="flex-1" />
                      <Button>
                        <Ban className="h-4 w-4 mr-2" />
                        Block
                      </Button>
                    </div>
                  </div>

                  {/* Blocked IPs List */}
                  <div className="space-y-2">
                    {blockedIPs.map(ip => (
                      <div key={ip.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-mono font-medium">{ip.ip}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>Reason: {ip.reason}</div>
                            <div>Blocked: {formatDate(ip.blockedAt)} by {ip.blockedBy}</div>
                            <div>Attempts: {ip.attempts} • Last: {formatDate(ip.lastAttempt)}</div>
                            {ip.expiresAt && (
                              <div>Expires: {formatDate(ip.expiresAt)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockIP(ip.id)}
                          >
                            Unblock
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active User Sessions</CardTitle>
                <CardDescription>Monitor and manage active user sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeSessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {session.userName}
                            {session.isCurrentSession && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{session.userEmail}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.location}
                              </span>
                              <span className="flex items-center gap-1">
                                {session.device === 'Mobile' ? (
                                  <Smartphone className="h-3 w-3" />
                                ) : (
                                  <Monitor className="h-3 w-3" />
                                )}
                                {session.device} • {session.browser}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {session.ip}
                              </span>
                            </div>
                            <div className="mt-1">
                              Login: {formatDate(session.loginAt)} • 
                              Last Active: {formatDate(session.lastActivity)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!session.isCurrentSession && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTerminateSession(session.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Terminate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Event Details Modal */}
        <AccessibleModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setSelectedEvent(null)
          }}
          title="Security Event Details"
          description="Detailed information about the security event"
          size="lg"
        >
          {selectedEvent && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                {getEventTypeIcon(selectedEvent.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{selectedEvent.details.action}</h3>
                    {getSeverityBadge(selectedEvent.severity)}
                  </div>
                  <p className="text-gray-600">{formatDate(selectedEvent.timestamp)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">User Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span>{selectedEvent.user.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>{selectedEvent.user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className="capitalize">{selectedEvent.user.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="font-mono text-xs">{selectedEvent.user.id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Event Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">IP Address:</span>
                      <span className="font-mono">{selectedEvent.details.ip}</span>
                    </div>
                    {selectedEvent.details.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span>{selectedEvent.details.location}</span>
                      </div>
                    )}
                    {selectedEvent.details.device && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Device:</span>
                        <span>{selectedEvent.details.device}</span>
                      </div>
                    )}
                    {selectedEvent.details.resource && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resource:</span>
                        <span className="font-mono text-xs">{selectedEvent.details.resource}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedEvent.details.userAgent && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">User Agent</h4>
                  <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded border">
                    {selectedEvent.details.userAgent}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  {selectedEvent.resolved ? (
                    <Badge variant="outline" className="text-green-600">
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Unresolved
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Block IP
                  </Button>
                  <Button size="sm">
                    Mark Resolved
                  </Button>
                </div>
              </div>
            </div>
          )}
        </AccessibleModal>
      </AdminLayout>
    </ErrorBoundary>
  )
}