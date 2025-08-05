'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Activity, 
  Calendar,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface UserStatsData {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  adminUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  usersLoggedInToday: number
  usersLoggedInThisWeek: number
  totalResponses: number
  responsesToday: number
  responsesThisWeek: number
  avgResponsesPerUser: number
  mostActiveUsers: Array<{
    id: string
    name: string
    email: string
    response_count: number
    last_login: string
  }>
  recentSignups: Array<{
    id: string
    name: string
    email: string
    created_at: string
    primary_role: string
  }>
  inactiveUsers: Array<{
    id: string
    name: string
    email: string
    last_login_at: string | null
    days_inactive: number
  }>
}

export default function UserStats() {
  const [stats, setStats] = useState<UserStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('week')

  useEffect(() => {
    fetchStats()
  }, [timeframe])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/stats?timeframe=${timeframe}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getGrowthIndicator = (current: number, previous: number) => {
    if (previous === 0) return null
    const growth = ((current - previous) / previous) * 100
    const isPositive = growth > 0
    
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">{Math.abs(growth).toFixed(1)}%</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-gray-200 bg-white">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className="border border-gray-200 bg-white">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-gray-600">Failed to load user statistics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Timeframe:</span>
        {(['today', 'week', 'month'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setTimeframe(period)}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === period
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {stats.totalUsers.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">New {timeframe}</p>
                <p className="text-lg font-semibold text-blue-600">
                  +{timeframe === 'today' ? stats.newUsersToday : 
                     timeframe === 'week' ? stats.newUsersThisWeek : 
                     stats.newUsersThisMonth}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Active Users
                </p>
                <p className="text-3xl font-semibold text-green-600 mt-2">
                  {stats.activeUsers.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Logged in {timeframe}</p>
                <p className="text-lg font-semibold text-green-600">
                  {timeframe === 'today' ? stats.usersLoggedInToday : stats.usersLoggedInThisWeek}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inactive Users */}
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Inactive Users
                </p>
                <p className="text-3xl font-semibold text-red-600 mt-2">
                  {stats.inactiveUsers.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Percentage</p>
                <p className="text-lg font-semibold text-gray-600">
                  {((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Users */}
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Users
                </p>
                <p className="text-3xl font-semibold text-purple-600 mt-2">
                  {stats.adminUsers.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Percentage</p>
                <p className="text-lg font-semibold text-purple-600">
                  {((stats.adminUsers / stats.totalUsers) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Activity Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <p className="font-medium text-gray-900">Total Responses</p>
            </div>
            <p className="text-3xl font-semibold text-blue-600">
              {stats.totalResponses.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Avg per user: {stats.avgResponsesPerUser.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-green-600" />
              <p className="font-medium text-gray-900">Responses Today</p>
            </div>
            <p className="text-3xl font-semibold text-green-600">
              {stats.responsesToday.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {timeframe === 'week' && `This week: ${stats.responsesThisWeek.toLocaleString()}`}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <p className="font-medium text-gray-900">Engagement Rate</p>
            </div>
            <p className="text-3xl font-semibold text-orange-600">
              {((stats.usersLoggedInThisWeek / stats.activeUsers) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Active users logged in this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Most Active Users */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Active Users
            </CardTitle>
            <CardDescription>Users with the most responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.mostActiveUsers.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{user.response_count}</p>
                    <p className="text-xs text-gray-500">responses</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Signups
            </CardTitle>
            <CardDescription>Newest user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentSignups.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.primary_role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{formatDate(user.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Needing Attention */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Inactive Users
            </CardTitle>
            <CardDescription>Users who haven't logged in recently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.inactiveUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-red-600">{user.days_inactive} days</p>
                    <p className="text-xs text-gray-500">inactive</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}