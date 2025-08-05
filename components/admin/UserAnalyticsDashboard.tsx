'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { 
  MetricCard, 
  QuickStats, 
  SimpleChart,
  ActivityFeed
} from './DashboardWidgets'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  MessageSquare,
  Clock,
  Brain,
  Eye,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Shield
} from 'lucide-react'

// Types for user analytics
interface UserMetrics {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  userGrowthRate: number
  averageSessionDuration: number
  averageResponsesPerUser: number
  retentionRate: number
}

interface UserEngagementData {
  date: string
  newUsers: number
  activeUsers: number
  responses: number
  sessions: number
}

interface UserDetails {
  id: string
  name: string
  email: string
  joinedAt: string
  lastActiveAt: string
  totalResponses: number
  totalSessions: number
  averageSessionDuration: number
  totalWordCount: number
  modelTrained: boolean
  subscriptionStatus: 'free' | 'premium' | 'enterprise'
  engagementScore: number
  riskScore: number
  tags: string[]
}

interface UserAnalyticsDashboardProps {
  className?: string
}

export default function UserAnalyticsDashboard({ className }: UserAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [engagementData, setEngagementData] = useState<UserEngagementData[]>([])
  const [users, setUsers] = useState<UserDetails[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'users' | 'insights'>('overview')
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof UserDetails>('lastActiveAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'at-risk'>('all')
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'free' | 'premium' | 'enterprise'>('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    loadAnalytics()
  }, [])

  useEffect(() => {
    filterAndSortUsers()
  }, [users, searchQuery, sortField, sortDirection, statusFilter, subscriptionFilter])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Simulate API calls - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data - replace with actual API responses
      setMetrics({
        totalUsers: 1247,
        activeUsers: 892,
        newUsersToday: 12,
        newUsersThisWeek: 67,
        userGrowthRate: 15.3,
        averageSessionDuration: 23.5,
        averageResponsesPerUser: 47,
        retentionRate: 78.2
      })

      setEngagementData([
        { date: '2024-01-14', newUsers: 8, activeUsers: 145, responses: 267, sessions: 189 },
        { date: '2024-01-15', newUsers: 12, activeUsers: 167, responses: 298, sessions: 201 },
        { date: '2024-01-16', newUsers: 6, activeUsers: 134, responses: 234, sessions: 178 },
        { date: '2024-01-17', newUsers: 15, activeUsers: 178, responses: 325, sessions: 223 },
        { date: '2024-01-18', newUsers: 11, activeUsers: 156, responses: 287, sessions: 195 },
        { date: '2024-01-19', newUsers: 9, activeUsers: 143, responses: 254, sessions: 187 },
        { date: '2024-01-20', newUsers: 12, activeUsers: 162, responses: 289, sessions: 198 }
      ])

      // Mock user data
      const mockUsers: UserDetails[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          joinedAt: '2024-01-15',
          lastActiveAt: '2024-01-20',
          totalResponses: 156,
          totalSessions: 23,
          averageSessionDuration: 28.5,
          totalWordCount: 45670,
          modelTrained: true,
          subscriptionStatus: 'premium',
          engagementScore: 92,
          riskScore: 15,
          tags: ['high-engagement', 'premium-user']
        },
        {
          id: '2',
          name: 'Michael Chen',
          email: 'michael.chen@example.com',
          joinedAt: '2024-01-10',
          lastActiveAt: '2024-01-19',
          totalResponses: 89,
          totalSessions: 15,
          averageSessionDuration: 19.2,
          totalWordCount: 23400,
          modelTrained: false,
          subscriptionStatus: 'free',
          engagementScore: 68,
          riskScore: 35,
          tags: ['moderate-engagement']
        }
        // Add more mock users as needed
      ]
      
      setUsers(mockUsers)
      
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortUsers = () => {
    let filtered = [...users]

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const now = new Date()
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      filtered = filtered.filter(user => {
        const lastActive = new Date(user.lastActiveAt)
        switch (statusFilter) {
          case 'active':
            return lastActive > lastWeek
          case 'inactive':
            return lastActive <= lastWeek
          case 'at-risk':
            return user.riskScore > 50
          default:
            return true
        }
      })
    }

    // Apply subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(user => user.subscriptionStatus === subscriptionFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })

    setFilteredUsers(filtered)
  }

  const handleSort = (field: keyof UserDetails) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getEngagementBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">High</Badge>
    if (score >= 60) return <Badge className="bg-blue-100 text-blue-800">Moderate</Badge>
    if (score >= 40) return <Badge className="bg-yellow-100 text-yellow-800">Low</Badge>
    return <Badge className="bg-red-100 text-red-800">Very Low</Badge>
  }

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive">High Risk</Badge>
    if (score >= 40) return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
    return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
  }

  const getSubscriptionBadge = (status: UserDetails['subscriptionStatus']) => {
    switch (status) {
      case 'enterprise': return <Badge className="bg-purple-100 text-purple-800">Enterprise</Badge>
      case 'premium': return <Badge className="bg-blue-100 text-blue-800">Premium</Badge>
      default: return <Badge variant="outline">Free</Badge>
    }
  }

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const totalPages = Math.ceil(filteredUsers.length / pageSize)

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading user analytics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Analytics</h2>
          <p className="text-gray-600">Comprehensive user behavior and engagement insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <QuickStats
          stats={[
            {
              id: 'total-users',
              title: 'Total Users',
              value: { current: metrics.totalUsers },
              trend: { direction: 'up', percentage: metrics.userGrowthRate, period: 'this month' },
              icon: Users
            },
            {
              id: 'active-users',
              title: 'Active Users',
              value: { current: metrics.activeUsers },
              trend: { direction: 'up', percentage: 8.2, period: 'this week' },
              icon: TrendingUp
            },
            {
              id: 'avg-session',
              title: 'Avg Session Duration',
              value: { current: metrics.averageSessionDuration, unit: 'min' },
              trend: { direction: 'up', percentage: 12.5, period: 'this week' },
              icon: Clock
            },
            {
              id: 'retention',
              title: 'Retention Rate',
              value: { current: metrics.retentionRate, format: 'percentage' },
              trend: { direction: 'up', percentage: 5.1, period: 'this month' },
              icon: Users
            }
          ]}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="users">User Directory</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <SimpleChart
              title="New Users (Last 7 Days)"
              data={engagementData.map(d => ({
                label: new Date(d.date).getDate().toString(),
                value: d.newUsers
              }))}
              type="bar"
            />
            
            <SimpleChart
              title="Daily Active Users"
              data={engagementData.map(d => ({
                label: new Date(d.date).getDate().toString(),
                value: d.activeUsers
              }))}
              type="line"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Segments</CardTitle>
                <CardDescription>Distribution by engagement level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Engagement (80%+)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{width: '35%'}}></div>
                      </div>
                      <span className="text-sm font-medium">437</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Moderate Engagement (60-79%)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: '28%'}}></div>
                      </div>
                      <span className="text-sm font-medium">349</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low Engagement (40-59%)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: '24%'}}></div>
                      </div>
                      <span className="text-sm font-medium">299</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">At Risk (&lt;40%)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{width: '13%'}}></div>
                      </div>
                      <span className="text-sm font-medium">162</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ActivityFeed
              title="Recent User Activity"
              activities={[
                {
                  id: '1',
                  type: 'user',
                  title: 'New premium subscription',
                  description: 'Sarah Johnson upgraded to premium plan',
                  timestamp: '2 hours ago'
                },
                {
                  id: '2',
                  type: 'training',
                  title: 'Model training completed',
                  description: 'AI model training finished for Michael Chen',
                  timestamp: '4 hours ago'
                },
                {
                  id: '3',
                  type: 'user',
                  title: 'High engagement milestone',
                  description: 'Emma Davis reached 100 responses milestone',
                  timestamp: '6 hours ago'
                }
              ]}
            />
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <SimpleChart
              title="Response Volume"
              data={engagementData.map(d => ({
                label: new Date(d.date).getDate().toString(),
                value: d.responses
              }))}
              type="bar"
            />
            
            <SimpleChart
              title="Session Count"
              data={engagementData.map(d => ({
                label: new Date(d.date).getDate().toString(),
                value: d.sessions
              }))}
              type="line"
            />

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Responses/User</span>
                  <span className="font-semibold">{metrics?.averageResponsesPerUser}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Session Duration</span>
                  <span className="font-semibold">{metrics?.averageSessionDuration}min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Return Rate</span>
                  <span className="font-semibold">{metrics?.retentionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={subscriptionFilter} onValueChange={(value: any) => setSubscriptionFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Users ({filteredUsers.length})</CardTitle>
                  <CardDescription>
                    Showing {paginatedUsers.length} of {filteredUsers.length} users
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="admin-table-container">
                <table className="admin-table w-full">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-600">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('name')}
                          className="h-auto p-0 font-medium text-gray-600 hover:text-gray-900"
                        >
                          User
                          <ArrowUpDown className="h-4 w-4 ml-1" />
                        </Button>
                      </th>
                      <th className="text-left p-4 font-medium text-gray-600">Subscription</th>
                      <th className="text-left p-4 font-medium text-gray-600">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('lastActiveAt')}
                          className="h-auto p-0 font-medium text-gray-600 hover:text-gray-900"
                        >
                          Last Active
                          <ArrowUpDown className="h-4 w-4 ml-1" />
                        </Button>
                      </th>
                      <th className="text-left p-4 font-medium text-gray-600">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSort('totalResponses')}
                          className="h-auto p-0 font-medium text-gray-600 hover:text-gray-900"
                        >
                          Responses
                          <ArrowUpDown className="h-4 w-4 ml-1" />
                        </Button>
                      </th>
                      <th className="text-left p-4 font-medium text-gray-600">Engagement</th>
                      <th className="text-left p-4 font-medium text-gray-600">Risk Score</th>
                      <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="flex gap-1 mt-1">
                              {user.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {getSubscriptionBadge(user.subscriptionStatus)}
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {formatDate(user.lastActiveAt)}
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium">{user.totalResponses}</div>
                            <div className="text-gray-500">{user.totalWordCount.toLocaleString()} words</div>
                          </div>
                        </td>
                        <td className="p-4">
                          {getEngagementBadge(user.engagementScore)}
                        </td>
                        <td className="p-4">
                          {getRiskBadge(user.riskScore)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="table-action-button">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="table-action-button">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="table-action-button">
                              <MoreHorizontal className="h-4 w-4" />
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
                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">High Growth Period</h4>
                  <p className="text-sm text-blue-800">User growth increased by 23% this month, primarily driven by premium conversions.</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Retention Opportunity</h4>
                  <p className="text-sm text-yellow-800">162 users are at risk of churning. Consider targeted engagement campaigns.</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Model Training Success</h4>
                  <p className="text-sm text-green-800">67% of eligible users have completed AI model training, up from 45% last month.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Re-engage At-Risk Users</h4>
                    <p className="text-xs text-gray-600 mt-1">Send personalized emails to 162 users with low engagement scores</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Premium Upgrade Campaign</h4>
                    <p className="text-xs text-gray-600 mt-1">Target high-engagement free users for premium conversion</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-sm">Feature Adoption</h4>
                    <p className="text-xs text-gray-600 mt-1">Promote AI training to 400+ eligible users who haven&apos;t started</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}