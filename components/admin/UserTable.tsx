'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  Key,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  AlertTriangle,
  Shield,
  Clock,
  Activity
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  created_at: string
  last_login_at: string | null
  is_active: boolean
  is_admin: boolean
  primary_role: string
  response_count: number
  last_response_at: string | null
}

interface UserTableProps {
  onUserSelect?: (user: User) => void
  onUserEdit?: (user: User) => void
  onAddUser?: () => void
}

export default function UserTable({ onUserSelect, onUserEdit, onAddUser }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
      setTotalUsers(data.pagination.totalUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, sortBy, sortOrder])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(column)
      setSortOrder('DESC')
    }
    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleToggleStatus = async (userId: string) => {
    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to toggle user status')
      
      await fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Error toggling user status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPassword = async (userId: string) => {
    setActionLoading(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: true, reason: 'Admin password reset' })
      })
      
      if (!response.ok) throw new Error('Failed to reset password')
      
      const data = await response.json()
      alert(`Password reset successfully. ${data.message}`)
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    if (selectedUsers.size === 0) return
    
    setActionLoading('bulk')
    try {
      const promises = Array.from(selectedUsers).map(async (userId) => {
        const user = users.find(u => u.id === userId)
        if (!user) return
        
        const shouldToggle = (action === 'activate' && !user.is_active) || 
                           (action === 'deactivate' && user.is_active)
        
        if (shouldToggle) {
          await fetch(`/api/admin/users/${userId}/toggle-status`, { method: 'POST' })
        }
      })
      
      await Promise.all(promises)
      setSelectedUsers(new Set())
      await fetchUsers()
    } catch (error) {
      console.error('Error with bulk action:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'parent': return 'bg-blue-100 text-blue-800'
      case 'child': return 'bg-green-100 text-green-800'
      case 'caregiver': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card className="border border-gray-200 bg-white">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Users className="h-8 w-8 animate-pulse text-blue-600 mr-3" />
            <span className="text-lg font-medium text-gray-700">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Actions Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search users by name or email..." 
              className="pl-10"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {selectedUsers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedUsers.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('activate')}
                disabled={actionLoading === 'bulk'}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('deactivate')}
                disabled={actionLoading === 'bulk'}
              >
                <UserX className="h-4 w-4 mr-1" />
                Deactivate
              </Button>
            </div>
          )}
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={onAddUser}
        >
          <Users className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">{totalUsers}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {users.filter(u => u.is_active).length}
                </p>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {users.filter(u => u.is_admin).length}
                </p>
                <p className="text-sm text-gray-600">Admin Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {users.filter(u => u.last_login_at && 
                    new Date(u.last_login_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
                <p className="text-sm text-gray-600">Active This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, permissions, and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(new Set(users.map(u => u.id)))
                        } else {
                          setSelectedUsers(new Set())
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-2">
                    <button
                      onClick={() => handleSort('name')}
                      className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                    >
                      User
                      {sortBy === 'name' && (
                        <span className="text-xs">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-2">
                    <button
                      onClick={() => handleSort('primary_role')}
                      className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                    >
                      Role
                      {sortBy === 'primary_role' && (
                        <span className="text-xs">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-2">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                    >
                      Joined
                      {sortBy === 'created_at' && (
                        <span className="text-xs">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-2">
                    <button
                      onClick={() => handleSort('last_login_at')}
                      className="font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                    >
                      Last Login
                      {sortBy === 'last_login_at' && (
                        <span className="text-xs">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-left p-2">Activity</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {user.name}
                            {user.is_admin && (
                              <Shield className="h-3 w-3 text-purple-600" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge className={getRoleColor(user.primary_role)}>
                        {user.primary_role}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="text-sm text-gray-700">{formatDate(user.created_at)}</div>
                    </td>
                    <td className="p-2">
                      <div className="text-sm text-gray-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(user.last_login_at)}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-sm text-gray-700">
                        <div>{user.response_count} responses</div>
                        {user.last_response_at && (
                          <div className="text-xs text-gray-500">
                            Last: {formatDate(user.last_response_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onUserSelect?.(user)}
                          title="View Details"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onUserEdit?.(user)}
                          title="Edit User"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetPassword(user.id)}
                          disabled={actionLoading === user.id}
                          title="Reset Password"
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(user.id)}
                          disabled={actionLoading === user.id || (user.is_admin && user.is_active)}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? (
                            <UserX className="h-3 w-3 text-red-600" />
                          ) : (
                            <UserCheck className="h-3 w-3 text-green-600" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm bg-gray-100 rounded">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}