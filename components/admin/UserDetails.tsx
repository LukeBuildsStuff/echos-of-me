'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Activity, 
  Shield, 
  Edit, 
  Save, 
  X,
  Eye,
  EyeOff,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react'

interface UserDetailsProps {
  userId: string
  onClose: () => void
  onUserUpdate?: () => void
}

interface UserDetail {
  id: string
  email: string
  name: string
  created_at: string
  updated_at: string
  last_login_at: string | null
  is_active: boolean
  is_admin: boolean
  primary_role: string
  secondary_roles: string[] | null
  failed_login_attempts: number
  locked_until: string | null
  total_responses: number
  last_response_at: string | null
  responses_last_7_days: number
  responses_last_30_days: number
  family_id: string | null
  family_name: string | null
  family_role: string | null
  recent_responses: Array<{
    id: string
    question: string
    response: string
    created_at: string
    response_length: number
    training_status: string
  }>
  login_history: Array<{
    logged_in_at: string
    ip_address: string
    user_agent: string
    success: boolean
  }>
}

export default function UserDetails({ userId, onClose, onUserUpdate }: UserDetailsProps) {
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    is_active: false,
    is_admin: false,
    primary_role: ''
  })
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null)

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user details')
      
      const data = await response.json()
      setUser(data.user)
      setEditData({
        name: data.user.name,
        is_active: data.user.is_active,
        is_admin: data.user.is_admin,
        primary_role: data.user.primary_role
      })
    } catch (error) {
      console.error('Error fetching user details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      
      if (!response.ok) throw new Error('Failed to update user')
      
      await fetchUserDetails()
      setEditing(false)
      onUserUpdate?.()
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const getActivityColor = (responses: number) => {
    if (responses === 0) return 'text-gray-500'
    if (responses < 5) return 'text-yellow-600'
    if (responses < 20) return 'text-green-600'
    return 'text-blue-600'
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex items-center justify-center">
            <User className="h-8 w-8 animate-pulse text-blue-600 mr-3" />
            <span className="text-lg font-medium text-gray-700">Loading user details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900 mb-2">User not found</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  {user.name}
                  {user.is_admin && <Shield className="h-5 w-5 text-purple-600" />}
                </h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!editing ? (
                <Button
                  onClick={() => setEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditing(false)
                      setEditData({
                        name: user.name,
                        is_active: user.is_active,
                        is_admin: user.is_admin,
                        primary_role: user.primary_role
                      })
                    }}
                    variant="outline"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
              <Button onClick={onClose} variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Information */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editing ? (
                    <>
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={editData.name}
                          onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Primary Role</Label>
                        <select
                          id="role"
                          value={editData.primary_role}
                          onChange={(e) => setEditData(prev => ({ ...prev, primary_role: e.target.value }))}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="parent">Parent</option>
                          <option value="child">Child</option>
                          <option value="family_member">Family Member</option>
                          <option value="caregiver">Caregiver</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={editData.is_active}
                          onChange={(e) => setEditData(prev => ({ ...prev, is_active: e.target.checked }))}
                        />
                        <Label htmlFor="is_active">Active Account</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_admin"
                          checked={editData.is_admin}
                          onChange={(e) => setEditData(prev => ({ ...prev, is_admin: e.target.checked }))}
                        />
                        <Label htmlFor="is_admin">Admin Privileges</Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Role</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {user.primary_role}
                        </Badge>
                      </div>
                      {user.is_admin && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Admin</span>
                          <Badge className="bg-purple-100 text-purple-800">
                            <Shield className="h-3 w-3 mr-1" />
                            Administrator
                          </Badge>
                        </div>
                      )}
                      {user.family_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Family</span>
                          <span className="text-sm font-medium">{user.family_name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Member Since</span>
                        <span className="text-sm font-medium">{formatDate(user.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Login</span>
                        <span className="text-sm font-medium">{formatRelativeDate(user.last_login_at)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Account Security */}
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Account Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Failed Login Attempts</span>
                    <span className="text-sm font-medium">{user.failed_login_attempts}</span>
                  </div>
                  {user.locked_until && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Account Locked</span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        Until: {formatDate(user.locked_until)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Account Status</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">Secure</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity and Responses */}
            <div className="lg:col-span-2 space-y-6">
              {/* Activity Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-gray-200 bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className={`text-2xl font-semibold ${getActivityColor(user.total_responses)}`}>
                          {user.total_responses}
                        </p>
                        <p className="text-sm text-gray-600">Total Responses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200 bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-600" />
                      <div>
                        <p className={`text-2xl font-semibold ${getActivityColor(user.responses_last_7_days)}`}>
                          {user.responses_last_7_days}
                        </p>
                        <p className="text-sm text-gray-600">Last 7 Days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-gray-200 bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className={`text-2xl font-semibold ${getActivityColor(user.responses_last_30_days)}`}>
                          {user.responses_last_30_days}
                        </p>
                        <p className="text-sm text-gray-600">Last 30 Days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Responses */}
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Recent Responses
                  </CardTitle>
                  <CardDescription>
                    Latest responses and training activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.recent_responses.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">No responses yet</p>
                  ) : (
                    <div className="space-y-4">
                      {user.recent_responses.map((response) => (
                        <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {truncateText(response.question, 60)}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={response.training_status === 'trained' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {response.training_status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedResponse(
                                  expandedResponse === response.id ? null : response.id
                                )}
                              >
                                {expandedResponse === response.id ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {expandedResponse === response.id ? (
                            <div className="space-y-2">
                              <div className="bg-gray-50 rounded p-3">
                                <p className="text-sm text-gray-700">{response.response}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              {truncateText(response.response, 100)}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                            <span>{formatDate(response.created_at)}</span>
                            <span>{response.response_length} characters</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Login History */}
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Login History
                  </CardTitle>
                  <CardDescription>
                    Recent login attempts and session data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.login_history.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">No login history available</p>
                  ) : (
                    <div className="space-y-3">
                      {user.login_history.slice(0, 10).map((login, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(login.logged_in_at)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {login.ip_address} • {truncateText(login.user_agent, 50)}
                            </div>
                          </div>
                          <Badge variant={login.success ? 'default' : 'secondary'}>
                            {login.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}