'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import AppHeader from '@/components/AppHeader'
import { 
  Users, 
  Brain,
  Eye,
  Server,
  RefreshCw,
  Search,
  UserPlus,
  Zap,
  UserCheck
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  created_at: string
  last_login_at: string | null
  is_active: boolean
  response_count: number
  training_status?: string
}

interface AdminStats {
  total_users: number
  active_sessions: number
  pending_training: number
}

export default function SimplifiedAdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFunction, setActiveFunction] = useState<'users' | 'training' | 'shadow'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [shadowSession, setShadowSession] = useState<any>(null)

  const loadAdminData = useCallback(async () => {
    try {
      // Check admin access and load users
      const [statsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/analytics'),
        fetch('/api/admin/users')
      ])
      
      if (statsResponse.status === 403 || usersResponse.status === 403) {
        router.push('/dashboard')
        return
      }
      
      if (statsResponse.ok && usersResponse.ok) {
        const statsData = await statsResponse.json()
        const usersData = await usersResponse.json()
        
        setStats({
          total_users: statsData.userStats?.total_users || 0,
          active_sessions: Math.floor(Math.random() * 3), // Mock data
          pending_training: Math.floor(Math.random() * 5)
        })
        
        setUsers(usersData.users || [])
      }
    } catch (error) {
      console.error('Admin data load failed:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadAdminData()
    }
  }, [status, router, loadAdminData])

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleForceTraining = async (userIds: string[]) => {
    try {
      const response = await fetch('/api/admin/training/simple-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, priority: 'high' })
      })
      
      if (response.ok) {
        alert(`Training started for ${userIds.length} user(s)`)
        setSelectedUsers([])
        loadAdminData() // Refresh data
      } else {
        alert('Training failed')
      }
    } catch (error) {
      console.error('Training error:', error)
      alert('Training failed')
    }
  }

  const handleShadowUser = async (userId: string) => {
    const reason = prompt('Enter reason for shadowing this user:')
    if (!reason || reason.trim().length < 10) {
      alert('A detailed reason (minimum 10 characters) is required')
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/shadow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      
      if (response.ok) {
        const data = await response.json()
        setShadowSession(data.data)
        alert('Shadow session started successfully')
      } else {
        const error = await response.json()
        alert(`Shadow failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Shadow error:', error)
      alert('Shadow session failed')
    }
  }

  const handleEndShadowSession = async () => {
    if (!shadowSession) return
    
    try {
      const response = await fetch(`/api/admin/users/${shadowSession.targetUser.id}/shadow?sessionId=${shadowSession.sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setShadowSession(null)
        alert('Shadow session ended')
      }
    } catch (error) {
      console.error('End shadow error:', error)
      alert('Failed to end shadow session')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Server className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-600" />
          <div className="text-lg font-medium text-gray-900">Loading Admin Dashboard...</div>
        </div>
      </div>
    )
  }

  if (!session || !stats) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <main className="container mx-auto px-4 pt-32 pb-8">
        {/* Simplified Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
              <p className="text-gray-600 mt-1">Simple. Fast. Focused.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-green-700 border-green-600">
                {stats.total_users} Users
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={loadAdminData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Core Function Navigation */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant={activeFunction === 'users' ? 'default' : 'outline'}
              onClick={() => setActiveFunction('users')}
              className="h-16 text-left justify-start p-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">Manage Users</span>
                </div>
                <p className="text-xs opacity-80">View, edit, delete users</p>
              </div>
            </Button>
            
            <Button 
              variant={activeFunction === 'training' ? 'default' : 'outline'}
              onClick={() => setActiveFunction('training')}
              className="h-16 text-left justify-start p-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-5 w-5" />
                  <span className="font-semibold">Force Train Users</span>
                </div>
                <p className="text-xs opacity-80">Manually trigger AI training</p>
              </div>
            </Button>
            
            <Button 
              variant={activeFunction === 'shadow' ? 'default' : 'outline'}
              onClick={() => setActiveFunction('shadow')}
              className="h-16 text-left justify-start p-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-5 w-5" />
                  <span className="font-semibold">Shadow Users</span>
                </div>
                <p className="text-xs opacity-80">Monitor/impersonate for support</p>
              </div>
            </Button>
          </div>
        </div>

        {/* Active Shadow Session Alert */}
        {shadowSession && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      Active Shadow Session: {shadowSession.targetUser.name}
                    </p>
                    <p className="text-sm text-orange-700">
                      Started at {new Date(shadowSession.sessionDetails.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEndShadowSession}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  End Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Function Content */}
        {activeFunction === 'users' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id])
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                          }
                        }}
                      />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShadowUser(user.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedUsers.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    {selectedUsers.length} user(s) selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleForceTraining(selectedUsers)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Force Train Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedUsers([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeFunction === 'training' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Force Training Controls
              </CardTitle>
              <CardDescription>
                Manually trigger AI training for specific users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-700">{stats.pending_training}</div>
                    <div className="text-sm text-purple-600">Pending Training</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{stats.total_users}</div>
                    <div className="text-sm text-green-600">Total Users</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{selectedUsers.length}</div>
                    <div className="text-sm text-blue-600">Selected for Training</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        if (selectedUsers.length === 0) {
                          alert('Please select users first')
                          return
                        }
                        handleForceTraining(selectedUsers)
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Train Selected Users ({selectedUsers.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const allUserIds = users.map(u => u.id)
                        if (confirm(`Train all ${allUserIds.length} users?`)) {
                          handleForceTraining(allUserIds)
                        }
                      }}
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Train All Users
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeFunction === 'shadow' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                User Shadowing
              </CardTitle>
              <CardDescription>
                Monitor and support users by accessing their sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-700">{stats.active_sessions}</div>
                    <div className="text-sm text-orange-600">Active Shadow Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">{shadowSession ? 1 : 0}</div>
                    <div className="text-sm text-gray-600">Your Active Sessions</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Quick Shadow Access</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredUsers.slice(0, 10).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShadowUser(user.id)}
                          disabled={!!shadowSession}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Shadow
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}