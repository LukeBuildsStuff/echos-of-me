'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import AppHeader from '@/components/AppHeader'
import UserManagement from '@/components/admin/UserManagement'
import OverviewDashboard from '@/components/admin/OverviewDashboard'
import { 
  Users, 
  Settings, 
  Activity, 
  TrendingUp, 
  Clock, 
  MessageCircle, 
  Home,
  UserCheck,
  Brain,
  Server,
  Database,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react'

interface AdminStats {
  userStats: {
    total_users: number
    active_today: number
    active_this_week: number
    new_users_today: number
  }
  responseStats: {
    total_responses: number
    responses_today: number
    avg_response_length: number
    conversations_today: number
  }
  systemStats: {
    training_status: string
    queue_length: number
    system_health: string
    uptime: string
  }
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'overview' | 'users' | 'training' | 'settings'>('overview')

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        const adminStats: AdminStats = {
          userStats: {
            total_users: data.userStats?.total_users || 0,
            active_today: data.userStats?.active_today || 0,
            active_this_week: data.userStats?.active_this_week || 0,
            new_users_today: data.userStats?.new_users_today || 0
          },
          responseStats: {
            total_responses: data.responseStats?.total_responses || 0,
            responses_today: data.responseStats?.responses_today || 0,
            avg_response_length: data.responseStats?.avg_response_length || 0,
            conversations_today: data.responseStats?.conversations_today || 0
          },
          systemStats: {
            training_status: 'active',
            queue_length: Math.floor(Math.random() * 5),
            system_health: 'healthy',
            uptime: '99.9%'
          }
        }
        setStats(adminStats)
      }
    } catch (error) {
      console.error('Admin access check failed:', error)
      router.push('/dashboard')
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

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Server className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-600" />
          <div className="text-lg font-medium text-gray-900">Loading Admin Dashboard...</div>
          <p className="text-sm mt-2 text-gray-500">Accessing system controls</p>
        </div>
      </div>
    )
  }

  if (!session || !stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <main className="container mx-auto px-4 pt-32 pb-8">
        {/* Clean Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Server className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-semibold text-gray-900">Admin Dashboard</h1>
              </div>
              <p className="text-lg text-gray-600">System management and user administration</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                System Online
              </Badge>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => checkAdminAccess()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Button 
            variant={currentView === 'overview' ? 'default' : 'outline'}
            onClick={() => setCurrentView('overview')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" /> Overview
          </Button>
          <Button 
            variant={currentView === 'users' ? 'default' : 'outline'}
            onClick={() => setCurrentView('users')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" /> Users
          </Button>
          <Button 
            variant={currentView === 'training' ? 'default' : 'outline'}
            onClick={() => setCurrentView('training')}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" /> Training
          </Button>
          <Button 
            variant={currentView === 'settings' ? 'default' : 'outline'}
            onClick={() => setCurrentView('settings')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" /> Settings
          </Button>
        </div>

        {/* Overview Tab */}
        {currentView === 'overview' && (
          <OverviewDashboard />
        )}

        {/* Users Tab */}
        {currentView === 'users' && (
          <UserManagement />
        )}

        {/* Training Tab */}
        {currentView === 'training' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">AI Training Management</h2>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Play className="h-4 w-4 mr-2" />
                Start Training
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Training Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge className="bg-green-100 text-green-800">
                        {stats.systemStats.training_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Queue Length</span>
                      <span className="font-semibold">{stats.systemStats.queue_length}</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Training
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    Training Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Conversations</span>
                      <span className="font-semibold">{stats.responseStats.total_responses}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Avg Length</span>
                      <span className="font-semibold">{stats.responseStats.avg_response_length}</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Training Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Response Quality</span>
                      <Badge className="bg-green-100 text-green-800">High</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Training Progress</span>
                      <span className="font-semibold">87%</span>
                    </div>
                    <Button className="w-full" variant="outline">
                      View Metrics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle>Force Training Controls</CardTitle>
                <CardDescription>
                  Manually trigger training for specific users or datasets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Input placeholder="User ID or email" className="flex-1" />
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    Force Train User
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {currentView === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">System Settings</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Basic system configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">System Name</label>
                    <Input defaultValue="Admin Dashboard" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                    <div className="mt-1">
                      <Button variant="outline" size="sm">Disabled</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Access control and security options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Two-Factor Auth</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Session Timeout</span>
                    <span className="text-sm text-gray-600">24 hours</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    Update Security Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}