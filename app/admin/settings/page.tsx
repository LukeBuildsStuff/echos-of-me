'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import AdminLayout from '@/components/AdminLayout'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import ErrorBoundary from '@/components/ErrorBoundary'
import { 
  Settings, 
  Shield, 
  Database, 
  Mail, 
  Bell, 
  Server, 
  Users, 
  Brain,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  Trash2,
  Plus
} from 'lucide-react'

interface SystemSettings {
  general: {
    siteName: string
    siteDescription: string
    maintenanceMode: boolean
    allowRegistration: boolean
    requireEmailVerification: boolean
    maxUsersPerPlan: {
      free: number
      premium: number
      enterprise: number
    }
  }
  security: {
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    sessionTimeout: number
    maxLoginAttempts: number
    enableTwoFactor: boolean
    allowedDomains: string[]
    blockedIPs: string[]
  }
  ai: {
    defaultModel: string
    maxTrainingTime: number
    maxResponseLength: number
    enableContentModeration: boolean
    trainingQueueLimit: number
    gpuAllocation: {
      training: number
      inference: number
    }
  }
  email: {
    provider: string
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    fromAddress: string
    enableNotifications: boolean
  }
  monitoring: {
    enableMetrics: boolean
    retentionDays: number
    alertThresholds: {
      cpu: number
      memory: number
      disk: number
      responseTime: number
    }
  }
}

const defaultSettings: SystemSettings = {
  general: {
    siteName: 'Echoes of Me',
    siteDescription: 'AI-powered personal legacy platform',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxUsersPerPlan: {
      free: 1000,
      premium: 10000,
      enterprise: -1
    }
  },
  security: {
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    enableTwoFactor: false,
    allowedDomains: [],
    blockedIPs: []
  },
  ai: {
    defaultModel: 'gpt-4',
    maxTrainingTime: 7200,
    maxResponseLength: 2000,
    enableContentModeration: true,
    trainingQueueLimit: 10,
    gpuAllocation: {
      training: 80,
      inference: 20
    }
  },
  email: {
    provider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromAddress: 'noreply@echosofme.com',
    enableNotifications: true
  },
  monitoring: {
    enableMetrics: true,
    retentionDays: 30,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      disk: 90,
      responseTime: 2000
    }
  }
}

export default function AdminSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'ai' | 'email' | 'monitoring'>('general')
  const [showPasswords, setShowPasswords] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [backupModal, setBackupModal] = useState(false)

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      // Load current settings
      const settingsResponse = await fetch('/api/admin/settings')
      if (settingsResponse.ok) {
        const data = await settingsResponse.json()
        setSettings({ ...defaultSettings, ...data.settings })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
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

  const handleSettingChange = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setUnsavedChanges(true)
  }

  const handleNestedSettingChange = (section: keyof SystemSettings, parentKey: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentKey]: {
          ...(prev[section] as any)[parentKey],
          [key]: value
        }
      }
    }))
    setUnsavedChanges(true)
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      if (response.ok) {
        setUnsavedChanges(false)
        // Show success notification
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `admin-settings-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const testEmailSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSettings: settings.email })
      })
      
      if (response.ok) {
        alert('Test email sent successfully!')
      } else {
        alert('Failed to send test email')
      }
    } catch (error) {
      alert('Error testing email settings')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading system settings...</p>
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
        title="System Settings"
        subtitle="Configure system-wide settings and preferences"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Settings' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {unsavedChanges && (
              <Badge variant="destructive" className="animate-pulse">
                Unsaved Changes
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportSettings}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBackupModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Backup
            </Button>
            <Button
              size="sm"
              onClick={saveSettings}
              disabled={saving || !unsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI & Training
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Monitoring
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>Basic site configuration and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.general.siteName}
                      onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Input
                      id="siteDescription"
                      value={settings.general.siteDescription}
                      onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Registration & Access</CardTitle>
                <CardDescription>Control user registration and access policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-gray-500">Temporarily disable site access for maintenance</p>
                  </div>
                  <Switch
                    checked={settings.general.maintenanceMode}
                    onCheckedChange={(checked) => handleSettingChange('general', 'maintenanceMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Registration</Label>
                    <p className="text-sm text-gray-500">Allow new users to register accounts</p>
                  </div>
                  <Switch
                    checked={settings.general.allowRegistration}
                    onCheckedChange={(checked) => handleSettingChange('general', 'allowRegistration', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-gray-500">Users must verify email before accessing features</p>
                  </div>
                  <Switch
                    checked={settings.general.requireEmailVerification}
                    onCheckedChange={(checked) => handleSettingChange('general', 'requireEmailVerification', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Limits</CardTitle>
                <CardDescription>Set maximum users allowed per subscription plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="freeLimit">Free Plan Limit</Label>
                    <Input
                      id="freeLimit"
                      type="number"
                      value={settings.general.maxUsersPerPlan.free}
                      onChange={(e) => handleNestedSettingChange('general', 'maxUsersPerPlan', 'free', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="premiumLimit">Premium Plan Limit</Label>
                    <Input
                      id="premiumLimit"
                      type="number"
                      value={settings.general.maxUsersPerPlan.premium}
                      onChange={(e) => handleNestedSettingChange('general', 'maxUsersPerPlan', 'premium', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enterpriseLimit">Enterprise Limit (-1 = unlimited)</Label>
                    <Input
                      id="enterpriseLimit"
                      type="number"
                      value={settings.general.maxUsersPerPlan.enterprise}
                      onChange={(e) => handleNestedSettingChange('general', 'maxUsersPerPlan', 'enterprise', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password Policy</CardTitle>
                <CardDescription>Configure password requirements and security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      min="6"
                      max="32"
                      value={settings.security.passwordMinLength}
                      onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      min="3"
                      max="10"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Special Characters</Label>
                    <p className="text-sm text-gray-500">Passwords must contain special characters</p>
                  </div>
                  <Switch
                    checked={settings.security.passwordRequireSpecialChars}
                    onCheckedChange={(checked) => handleSettingChange('security', 'passwordRequireSpecialChars', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>Configure user session settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="300"
                    max="86400"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500">Users will be logged out after this period of inactivity</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                  </div>
                  <Switch
                    checked={settings.security.enableTwoFactor}
                    onCheckedChange={(checked) => handleSettingChange('security', 'enableTwoFactor', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Model Configuration</CardTitle>
                <CardDescription>Configure AI model settings and training parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultModel">Default AI Model</Label>
                    <select
                      id="defaultModel"
                      value={settings.ai.defaultModel}
                      onChange={(e) => handleSettingChange('ai', 'defaultModel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3">Claude 3</option>
                      <option value="local-llama">Local Llama</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxResponseLength">Max Response Length (characters)</Label>
                    <Input
                      id="maxResponseLength"
                      type="number"
                      min="100"
                      max="8000"
                      value={settings.ai.maxResponseLength}
                      onChange={(e) => handleSettingChange('ai', 'maxResponseLength', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Content Moderation</Label>
                    <p className="text-sm text-gray-500">Automatically moderate AI-generated content</p>
                  </div>
                  <Switch
                    checked={settings.ai.enableContentModeration}
                    onCheckedChange={(checked) => handleSettingChange('ai', 'enableContentModeration', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Configuration</CardTitle>
                <CardDescription>Configure AI training pipeline settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxTrainingTime">Max Training Time (seconds)</Label>
                    <Input
                      id="maxTrainingTime"
                      type="number"
                      min="300"
                      max="28800"
                      value={settings.ai.maxTrainingTime}
                      onChange={(e) => handleSettingChange('ai', 'maxTrainingTime', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trainingQueueLimit">Training Queue Limit</Label>
                    <Input
                      id="trainingQueueLimit"
                      type="number"
                      min="1"
                      max="50"
                      value={settings.ai.trainingQueueLimit}
                      onChange={(e) => handleSettingChange('ai', 'trainingQueueLimit', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>GPU Allocation</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trainingAllocation">Training (%)</Label>
                      <Input
                        id="trainingAllocation"
                        type="number"
                        min="10"
                        max="90"
                        value={settings.ai.gpuAllocation.training}
                        onChange={(e) => handleNestedSettingChange('ai', 'gpuAllocation', 'training', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inferenceAllocation">Inference (%)</Label>
                      <Input
                        id="inferenceAllocation"
                        type="number"
                        min="10"
                        max="90"
                        value={settings.ai.gpuAllocation.inference}
                        onChange={(e) => handleNestedSettingChange('ai', 'gpuAllocation', 'inference', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Configure SMTP settings for system emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={settings.email.smtpHost}
                      onChange={(e) => handleSettingChange('email', 'smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={settings.email.smtpPort}
                      onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={settings.email.smtpUser}
                      onChange={(e) => handleSettingChange('email', 'smtpUser', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showPasswords ? 'text' : 'password'}
                        value={settings.email.smtpPassword}
                        onChange={(e) => handleSettingChange('email', 'smtpPassword', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fromAddress">From Email Address</Label>
                  <Input
                    id="fromAddress"
                    type="email"
                    value={settings.email.fromAddress}
                    onChange={(e) => handleSettingChange('email', 'fromAddress', e.target.value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Email Notifications</Label>
                    <p className="text-sm text-gray-500">Send system notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.email.enableNotifications}
                    onCheckedChange={(checked) => handleSettingChange('email', 'enableNotifications', checked)}
                  />
                </div>
                
                <div className="pt-4">
                  <Button onClick={testEmailSettings} variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Settings */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Monitoring</CardTitle>
                <CardDescription>Configure system monitoring and alerting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Metrics Collection</Label>
                    <p className="text-sm text-gray-500">Collect system performance metrics</p>
                  </div>
                  <Switch
                    checked={settings.monitoring.enableMetrics}
                    onCheckedChange={(checked) => handleSettingChange('monitoring', 'enableMetrics', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retentionDays">Metrics Retention (days)</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min="7"
                    max="365"
                    value={settings.monitoring.retentionDays}
                    onChange={(e) => handleSettingChange('monitoring', 'retentionDays', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Thresholds</CardTitle>
                <CardDescription>Set thresholds for system alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpuThreshold">CPU Usage (%)</Label>
                    <Input
                      id="cpuThreshold"
                      type="number"
                      min="50"
                      max="100"
                      value={settings.monitoring.alertThresholds.cpu}
                      onChange={(e) => handleNestedSettingChange('monitoring', 'alertThresholds', 'cpu', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memoryThreshold">Memory Usage (%)</Label>
                    <Input
                      id="memoryThreshold"
                      type="number"
                      min="50"
                      max="100"
                      value={settings.monitoring.alertThresholds.memory}
                      onChange={(e) => handleNestedSettingChange('monitoring', 'alertThresholds', 'memory', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diskThreshold">Disk Usage (%)</Label>
                    <Input
                      id="diskThreshold"
                      type="number"
                      min="70"
                      max="100"
                      value={settings.monitoring.alertThresholds.disk}
                      onChange={(e) => handleNestedSettingChange('monitoring', 'alertThresholds', 'disk', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responseTimeThreshold">Response Time (ms)</Label>
                    <Input
                      id="responseTimeThreshold"
                      type="number"
                      min="500"
                      max="10000"
                      value={settings.monitoring.alertThresholds.responseTime}
                      onChange={(e) => handleNestedSettingChange('monitoring', 'alertThresholds', 'responseTime', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Settings Backup Modal */}
        <AccessibleModal
          isOpen={backupModal}
          onClose={() => setBackupModal(false)}
          title="Settings Backup & Restore"
          description="Export or import system settings"
        >
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Important</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Importing settings will overwrite current configuration. Make sure to export current settings first.
              </p>
            </div>
            
            <div className="space-y-2">
              <Button onClick={exportSettings} className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Current Settings
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (e) => {
                        try {
                          const importedSettings = JSON.parse(e.target?.result as string)
                          setSettings({ ...defaultSettings, ...importedSettings })
                          setUnsavedChanges(true)
                          setBackupModal(false)
                        } catch (error) {
                          alert('Invalid settings file')
                        }
                      }
                      reader.readAsText(file)
                    }
                  }}
                />
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </Button>
              </div>
            </div>
          </div>
        </AccessibleModal>
      </AdminLayout>
    </ErrorBoundary>
  )
}