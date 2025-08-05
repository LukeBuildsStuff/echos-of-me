'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Brain, 
  Settings, 
  Activity, 
  UserPlus,
  Play,
  Pause,
  Search,
  FileText,
  Shield,
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface QuickActionsProps {
  trainingActive?: boolean
  systemHealth?: 'healthy' | 'warning' | 'critical'
}

export default function QuickActions({ 
  trainingActive = false, 
  systemHealth = 'healthy' 
}: QuickActionsProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleQuickAction = async (action: string, ...args: any[]) => {
    setActionLoading(action)
    
    try {
      switch (action) {
        case 'add_user':
          router.push('/admin/users?action=add')
          break
          
        case 'search_user':
          if (searchQuery.trim()) {
            router.push(`/admin/users?search=${encodeURIComponent(searchQuery.trim())}`)
          }
          break
          
        case 'start_training':
          const startResponse = await fetch('/api/admin/training/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          if (startResponse.ok) {
            router.push('/admin/training')
          }
          break
          
        case 'pause_training':
          const pauseResponse = await fetch('/api/admin/training/pause', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          if (pauseResponse.ok) {
            router.refresh()
          }
          break
          
        case 'view_logs':
          router.push('/admin/error-monitoring')
          break
          
        case 'system_settings':
          router.push('/admin/settings')
          break
          
        case 'security_monitoring':
          router.push('/admin/security')
          break
          
        case 'database_backup':
          const backupResponse = await fetch('/api/admin/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          if (backupResponse.ok) {
            alert('Backup initiated successfully')
          }
          break
          
        case 'export_data':
          router.push('/admin/reports?action=export')
          break
          
        case 'view_analytics':
          router.push('/admin/users/analytics')
          break
          
        default:
          console.log('Unknown action:', action)
      }
    } catch (error) {
      console.error('Quick action error:', error)
      alert('Action failed. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const getSystemStatusBadge = () => {
    switch (systemHealth) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 border-green-200">System Healthy</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">System Warning</Badge>
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 border-red-200">System Critical</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Unknown Status</Badge>
    }
  }

  const isLoading = (action: string) => actionLoading === action

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Primary Actions */}
      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* User Management */}
            <Button 
              className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => handleQuickAction('add_user')}
              disabled={isLoading('add_user')}
            >
              {isLoading('add_user') ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Add New User
            </Button>

            {/* Training Controls */}
            <Button 
              className={`w-full justify-start ${
                trainingActive 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white`}
              onClick={() => handleQuickAction(trainingActive ? 'pause_training' : 'start_training')}
              disabled={isLoading('start_training') || isLoading('pause_training')}
            >
              {isLoading('start_training') || isLoading('pause_training') ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : trainingActive ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {trainingActive ? 'Pause Training' : 'Start Training'}
            </Button>

            {/* User Management Navigation */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/admin/users')}
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>

            {/* System Monitoring */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleQuickAction('view_logs')}
              disabled={isLoading('view_logs')}
            >
              <Activity className="h-4 w-4 mr-2" />
              View Error Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Operations */}
      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Database className="h-5 w-5" />
            System Operations
          </CardTitle>
          <div className="mt-2">
            {getSystemStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Quick User Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickAction('search_user')}
                className="flex-1"
              />
              <Button 
                size="sm"
                onClick={() => handleQuickAction('search_user')}
                disabled={!searchQuery.trim() || isLoading('search_user')}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* System Settings */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleQuickAction('system_settings')}
              disabled={isLoading('system_settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>

            {/* Security Monitoring */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleQuickAction('security_monitoring')}
              disabled={isLoading('security_monitoring')}
            >
              <Shield className="h-4 w-4 mr-2" />
              Security Monitoring
            </Button>

            {/* Data Operations */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 justify-start text-sm"
                onClick={() => handleQuickAction('database_backup')}
                disabled={isLoading('database_backup')}
              >
                {isLoading('database_backup') ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Backup
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 justify-start text-sm"
                onClick={() => handleQuickAction('export_data')}
                disabled={isLoading('export_data')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics & Reports */}
      <Card className="border border-gray-200 bg-white md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <FileText className="h-5 w-5" />
            Analytics & Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => handleQuickAction('view_analytics')}
            >
              <Activity className="h-4 w-4 mr-2" />
              User Analytics
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => router.push('/admin/training')}
            >
              <Brain className="h-4 w-4 mr-2" />
              Training Reports
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => router.push('/admin/reports')}
            >
              <FileText className="h-4 w-4 mr-2" />
              System Reports
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3 mt-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {trainingActive ? '1' : '0'}
              </div>
              <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Brain className="h-3 w-3" />
                Active Training Jobs
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                systemHealth === 'healthy' ? 'text-green-600' : 
                systemHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {systemHealth === 'healthy' ? '99.9' : 
                 systemHealth === 'warning' ? '98.5' : '95.0'}%
              </div>
              <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                {systemHealth === 'healthy' ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : systemHealth === 'warning' ? (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                )}
                System Uptime
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {new Date().getHours() < 12 ? 'AM' : 'PM'}
              </div>
              <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Current Time
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}