'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import AdminLayout from '@/components/AdminLayout'
import { MobileAccessibleTable } from '@/components/ui/mobile-accessible-table'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import ErrorBoundary from '@/components/ErrorBoundary'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Edit, 
  Lock, 
  Unlock, 
  UserX, 
  Mail, 
  Calendar, 
  Activity,
  Download,
  RefreshCw,
  Eye,
  Trash2,
  AlertTriangle
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'moderator'
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  lastLogin: string | null
  createdAt: string
  totalResponses: number
  planType: 'free' | 'premium' | 'enterprise'
  isVerified: boolean
}

interface UserFilters {
  search: string
  role: string
  status: string
  planType: string
}

const mockUsers: User[] = [
  {
    id: '1',
    email: 'sarah.johnson@example.com',
    name: 'Sarah Johnson',
    role: 'user',
    status: 'active',
    lastLogin: '2025-01-30T10:30:00Z',
    createdAt: '2024-12-15T08:00:00Z',
    totalResponses: 145,
    planType: 'premium',
    isVerified: true
  },
  {
    id: '2',
    email: 'michael.chen@example.com',
    name: 'Michael Chen',
    role: 'user',
    status: 'active',
    lastLogin: '2025-01-29T16:45:00Z',
    createdAt: '2024-11-20T14:30:00Z',
    totalResponses: 89,
    planType: 'free',
    isVerified: true
  },
  {
    id: '3',
    email: 'admin@echosofme.com',
    name: 'System Administrator',
    role: 'admin',
    status: 'active',
    lastLogin: '2025-01-31T09:15:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    totalResponses: 12,
    planType: 'enterprise',
    isVerified: true
  },
  {
    id: '4',
    email: 'jane.moderator@example.com',
    name: 'Jane Smith',
    role: 'moderator',
    status: 'active',
    lastLogin: '2025-01-28T11:20:00Z',
    createdAt: '2024-10-05T12:15:00Z',
    totalResponses: 67,
    planType: 'premium',
    isVerified: true
  },
  {
    id: '5',
    email: 'suspended.user@example.com',
    name: 'Suspended User',
    role: 'user',
    status: 'suspended',
    lastLogin: '2025-01-25T08:30:00Z',
    createdAt: '2024-09-10T16:45:00Z',
    totalResponses: 234,
    planType: 'free',
    isVerified: false
  }
]

export default function UsersManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [filteredUsers, setFilteredUsers] = useState<User[]>(mockUsers)
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    planType: 'all'
  })

  const checkAdminAccess = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.status === 403) {
        router.push('/dashboard')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || mockUsers)
        setFilteredUsers(data.users || mockUsers)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      // Use mock data as fallback
      setUsers(mockUsers)
      setFilteredUsers(mockUsers)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkAdminAccess()
    }
  }, [status, router, checkAdminAccess])

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      )
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status)
    }

    // Plan type filter
    if (filters.planType !== 'all') {
      filtered = filtered.filter(user => user.planType === filters.planType)
    }

    setFilteredUsers(filtered)
  }, [users, filters])

  const handleRefresh = async () => {
    setLoading(true)
    await checkAdminAccess()
    setLoading(false)
  }

  const handleUserAction = async (action: string, userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        await handleRefresh()
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error)
    }
  }

  const getStatusBadge = (status: User['status']) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Active' },
      inactive: { variant: 'secondary' as const, label: 'Inactive' },
      suspended: { variant: 'destructive' as const, label: 'Suspended' },
      pending: { variant: 'outline' as const, label: 'Pending' }
    }
    
    const config = variants[status]
    return (
      <Badge 
        variant={config.variant} 
        className="text-xs"
        aria-label={`User status: ${config.label}`}
      >
        {config.label}
      </Badge>
    )
  }

  const getRoleBadge = (role: User['role']) => {
    const variants = {
      admin: { variant: 'destructive' as const, label: 'Admin' },
      moderator: { variant: 'default' as const, label: 'Moderator' },
      user: { variant: 'secondary' as const, label: 'User' }
    }
    
    const config = variants[role]
    return (
      <Badge 
        variant={config.variant} 
        className="text-xs"
        aria-label={`User role: ${config.label}`}
      >
        {config.label}
      </Badge>
    )
  }

  const getPlanBadge = (planType: User['planType']) => {
    const variants = {
      free: { variant: 'outline' as const, label: 'Free' },
      premium: { variant: 'default' as const, label: 'Premium' },
      enterprise: { variant: 'destructive' as const, label: 'Enterprise' }
    }
    
    const config = variants[planType]
    return (
      <Badge 
        variant={config.variant} 
        className="text-xs"
        aria-label={`Plan type: ${config.label}`}
      >
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const columns = [
    {
      id: 'user',
      header: 'User',
      accessorKey: 'name',
      cell: (user: User) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate" title={user.name}>
              {user.name}
            </div>
            <div className="text-sm text-gray-500 truncate" title={user.email}>
              {user.email}
            </div>
          </div>
          {user.isVerified && (
            <div className="flex-shrink-0" title="Verified user">
              <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'role',
      cell: (user: User) => getRoleBadge(user.role)
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (user: User) => getStatusBadge(user.status)
    },
    {
      id: 'plan',
      header: 'Plan',
      accessorKey: 'planType',
      cell: (user: User) => getPlanBadge(user.planType)
    },
    {
      id: 'responses',
      header: 'Responses',
      accessorKey: 'totalResponses',
      cell: (user: User) => (
        <div className="text-center">
          <div className="font-medium">{user.totalResponses.toLocaleString()}</div>
          <div className="text-xs text-gray-500">total</div>
        </div>
      )
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      accessorKey: 'lastLogin',
      cell: (user: User) => (
        <div className="text-sm">
          <div className="font-medium">{formatDate(user.lastLogin)}</div>
          {user.lastLogin && (
            <div className="text-xs text-gray-500">
              {new Date(user.lastLogin) > new Date(Date.now() - 24 * 60 * 60 * 1000) ? 'Recent' : 'Older'}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'created',
      header: 'Joined',
      accessorKey: 'createdAt',
      cell: (user: User) => (
        <div className="text-sm">{formatDate(user.createdAt)}</div>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (user: User) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUser(user)
              setShowUserModal(true)
            }}
            className="h-8 w-8 p-0"
            aria-label={`View details for ${user.name}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/users/${user.id}/edit`)}
            className="h-8 w-8 p-0"
            aria-label={`Edit ${user.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          {user.status === 'active' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUserAction('suspend', user.id)}
              className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
              aria-label={`Suspend ${user.name}`}
            >
              <Lock className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUserAction('activate', user.id)}
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
              aria-label={`Activate ${user.name}`}
            >
              <Unlock className="h-4 w-4" />
            </Button>
          )}
          
          {user.role !== 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUserAction('delete', user.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label={`Delete ${user.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ]

  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12" role="status" aria-label="Loading users">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading users...</p>
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
        title="User Management"
        subtitle={`Manage ${filteredUsers.length} users across the platform`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Users', href: '/admin/users' },
          { label: 'Overview' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh user data"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Export user data"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => router.push('/admin/users/invite')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                <p className="text-sm text-gray-500 mt-1">All registered users</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </div>
                <p className="text-sm text-gray-500 mt-1">Currently active</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Premium Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.planType === 'premium' || u.planType === 'enterprise').length}
                </div>
                <p className="text-sm text-gray-500 mt-1">Paid plans</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Suspended</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.status === 'suspended').length}
                </div>
                <p className="text-sm text-gray-500 mt-1">Need attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label htmlFor="search-users" className="text-sm font-medium text-gray-700">
                    Search Users
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search-users"
                      placeholder="Search by name or email..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                      aria-label="Search users by name or email"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="filter-role" className="text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="filter-role"
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    aria-label="Filter by user role"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                    <option value="user">User</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="filter-status" className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="filter-status"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    aria-label="Filter by user status"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="filter-plan" className="text-sm font-medium text-gray-700">
                    Plan Type
                  </label>
                  <select
                    id="filter-plan"
                    value={filters.planType}
                    onChange={(e) => setFilters(prev => ({ ...prev, planType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    aria-label="Filter by plan type"
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users ({filteredUsers.length})
                </div>
                {filteredUsers.length !== users.length && (
                  <Badge variant="outline" className="text-xs">
                    Filtered from {users.length} total
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MobileAccessibleTable
                data={filteredUsers}
                columns={columns}
                loading={loading}
                emptyMessage="No users found matching your filters"
                emptyIcon={Users}
                ariaLabel="User management table"
                searchable={false} // We have custom search above
              />
            </CardContent>
          </Card>
        </div>

        {/* User Details Modal */}
        <AccessibleModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false)
            setSelectedUser(null)
          }}
          title={selectedUser ? `User Details: ${selectedUser.name}` : 'User Details'}
          description="View and manage user account details"
          size="lg"
        >
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900">{selectedUser.name}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser.status)}
                    {getPlanBadge(selectedUser.planType)}
                    {selectedUser.isVerified && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Account Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="font-mono text-xs">{selectedUser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Joined:</span>
                      <span>{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Login:</span>
                      <span>{formatDate(selectedUser.lastLogin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Responses:</span>
                      <span className="font-medium">{selectedUser.totalResponses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setShowUserModal(false)
                        router.push(`/admin/users/${selectedUser.id}/edit`)
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        // Handle send email
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setShowUserModal(false)
                        router.push(`/admin/users/${selectedUser.id}/activity`)
                      }}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      View Activity
                    </Button>
                    
                    {selectedUser.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-orange-600 hover:text-orange-700"
                        onClick={() => {
                          handleUserAction('suspend', selectedUser.id)
                          setShowUserModal(false)
                        }}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Suspend User
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-green-600 hover:text-green-700"
                        onClick={() => {
                          handleUserAction('activate', selectedUser.id)
                          setShowUserModal(false)
                        }}
                      >
                        <Unlock className="h-4 w-4 mr-2" />
                        Activate User
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {selectedUser.status === 'suspended' && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Account Suspended</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    This user account has been suspended and cannot access the platform.
                  </p>
                </div>
              )}
            </div>
          )}
        </AccessibleModal>
      </AdminLayout>
    </ErrorBoundary>
  )
}