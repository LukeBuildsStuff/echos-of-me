'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  BarChart3, 
  Settings, 
  Download,
  RefreshCw,
  Filter,
  Search,
  Upload
} from 'lucide-react'

import UserTable from './UserTable'
import UserDetails from './UserDetails'
import UserStats from './UserStats'
import AddUser from './AddUser'

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

export default function UserManagement() {
  const [currentView, setCurrentView] = useState<'table' | 'stats'>('table')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const handleUserEdit = (user: User) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  const handleAddUser = () => {
    setShowAddUser(true)
  }

  const handleUserAdded = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleUserUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleExportUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/export')
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export users')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            User Management
          </h2>
          <p className="text-lg text-gray-600 mt-1">
            Manage user accounts, monitor activity, and control access
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportUsers}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Users
          </Button>
          <Button
            variant="outline"
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setCurrentView('table')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              currentView === 'table'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Directory
            </div>
          </button>
          <button
            onClick={() => setCurrentView('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              currentView === 'stats'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics & Insights
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {currentView === 'table' && (
          <UserTable
            key={refreshKey}
            onUserSelect={handleUserSelect}
            onUserEdit={handleUserEdit}
            onAddUser={handleAddUser}
          />
        )}

        {currentView === 'stats' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">User Analytics</h3>
                <p className="text-gray-600">Detailed insights into user behavior and engagement</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRefreshKey(prev => prev + 1)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </div>
            <UserStats key={refreshKey} />
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <Card className="border border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common administrative tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAddUser}
            >
              <Users className="h-4 w-4 mr-2" />
              Add New User
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={handleExportUsers}
            >
              <Download className="h-4 w-4 mr-2" />
              Export User Data
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => {
                // TODO: Implement bulk user import
                alert('Bulk import feature coming soon')
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Users
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => {
                // TODO: Implement user audit report
                alert('Audit report feature coming soon')
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {showUserDetails && selectedUser && (
        <UserDetails
          userId={selectedUser.id}
          onClose={() => {
            setShowUserDetails(false)
            setSelectedUser(null)
          }}
          onUserUpdate={handleUserUpdate}
        />
      )}

      {showAddUser && (
        <AddUser
          onClose={() => setShowAddUser(false)}
          onUserAdded={handleUserAdded}
        />
      )}
    </div>
  )
}