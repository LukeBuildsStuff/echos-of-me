'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AppHeader from '@/components/AppHeader'

interface AdminStats {
  userStats: {
    total_users: number
    new_today: number
    new_this_week: number
    active_today: number
    active_this_week: number
  }
  responseStats: {
    total_responses: number
    responses_today: number
    responses_this_week: number
    avg_response_length: number
  }
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'users' | 'responses' | 'analytics'>('dashboard')

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    )
  }

  if (!session || !stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 pt-32 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-gray-600">System overview and management</p>
            </div>
            <Badge variant="destructive" className="text-sm">
              ADMIN ACCESS
            </Badge>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-8 flex gap-4">
          <Button 
            variant={currentView === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setCurrentView('dashboard')}
          >
            📊 Dashboard
          </Button>
          <Button 
            variant={currentView === 'users' ? 'default' : 'outline'}
            onClick={() => setCurrentView('users')}
          >
            👥 Users
          </Button>
          <Button 
            variant={currentView === 'responses' ? 'default' : 'outline'}
            onClick={() => setCurrentView('responses')}
          >
            💬 Responses
          </Button>
          <Button 
            variant={currentView === 'analytics' ? 'default' : 'outline'}
            onClick={() => setCurrentView('analytics')}
          >
            📈 Analytics
          </Button>
        </div>

        {/* Dashboard Overview */}
        {currentView === 'dashboard' && (
          <>
            {/* User Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.userStats.total_users}</div>
                  <p className="text-xs text-gray-600">
                    +{stats.userStats.new_this_week} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.userStats.active_today}</div>
                  <p className="text-xs text-gray-600">
                    {stats.userStats.active_this_week} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.responseStats.total_responses}</div>
                  <p className="text-xs text-gray-600">
                    +{stats.responseStats.responses_this_week} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Length</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(stats.responseStats.avg_response_length)} words
                  </div>
                  <p className="text-xs text-gray-600">
                    {stats.responseStats.responses_today} today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    👥 User Management
                  </CardTitle>
                  <CardDescription>
                    View, edit, and manage user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => setCurrentView('users')}
                  >
                    Manage Users
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💬 Response Moderation
                  </CardTitle>
                  <CardDescription>
                    Review and moderate user responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => setCurrentView('responses')}
                  >
                    View Responses
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📈 Analytics
                  </CardTitle>
                  <CardDescription>
                    Detailed analytics and reporting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => setCurrentView('analytics')}
                  >
                    View Analytics
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🤖 AI Training
                  </CardTitle>
                  <CardDescription>
                    Manage AI model training pipeline
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full"
                    onClick={() => router.push('/admin/training')}
                  >
                    Manage Training
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Other views - placeholder for now */}
        {currentView !== 'dashboard' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">
              {currentView === 'users' && 'User Management'}
              {currentView === 'responses' && 'Response Moderation'}
              {currentView === 'analytics' && 'Detailed Analytics'}
            </h2>
            <p className="text-gray-600 mb-4">
              This section is under development. Coming soon!
            </p>
            <Button onClick={() => setCurrentView('dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}