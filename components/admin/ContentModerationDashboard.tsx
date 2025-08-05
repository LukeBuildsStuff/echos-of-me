'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { 
  MetricCard, 
  QuickStats,
  ActivityFeed
} from './DashboardWidgets'
import { 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  MessageSquare,
  Flag,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Archive,
  Send,
  Ban,
  Shield,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react'

// Types for content moderation
interface ContentItem {
  id: string
  type: 'response' | 'life_story' | 'milestone' | 'voice_note'
  content: string
  userId: string
  userName: string
  userEmail: string
  createdAt: string
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged' | 'escalated'
  moderatedBy?: string
  moderatedAt?: string
  flags: ContentFlag[]
  aiAnalysis: {
    toxicityScore: number
    sentimentScore: number
    categories: string[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    recommendations: string[]
  }
  reportCount: number
  wordCount: number
  language: string
  metadata?: Record<string, any>
}

interface ContentFlag {
  id: string
  type: 'toxicity' | 'harassment' | 'hate_speech' | 'spam' | 'inappropriate' | 'privacy' | 'violence' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  flaggedBy: 'ai' | 'user' | 'moderator'
  flaggedAt: string
  verified: boolean
}

interface ModerationAction {
  id: string
  contentId: string
  action: 'approve' | 'reject' | 'flag' | 'escalate' | 'ban_user' | 'delete'
  reason: string
  moderatorId: string
  moderatorName: string
  timestamp: string
  notes?: string
}

interface ModerationStats {
  totalContent: number
  pendingReview: number
  approvedToday: number
  rejectedToday: number
  flaggedContent: number
  averageReviewTime: number
  aiAccuracy: number
  moderatorWorkload: number
}

interface ContentModerationDashboardProps {
  className?: string
}

export default function ContentModerationDashboard({ className }: ContentModerationDashboardProps) {
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([])
  const [stats, setStats] = useState<ModerationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'queue' | 'flagged' | 'history' | 'analytics'>('queue')
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentItem['moderationStatus']>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ContentItem['type']>('all')
  const [riskFilter, setRiskFilter] = useState<'all' | ContentItem['aiAnalysis']['riskLevel']>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'risk' | 'reports'>('newest')
  
  // Selected content for bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [showModerationDialog, setShowModerationDialog] = useState(false)
  const [moderationAction, setModerationAction] = useState<ModerationAction['action'] | null>(null)
  const [moderationReason, setModerationReason] = useState('')
  const [moderationNotes, setModerationNotes] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    loadContentItems()
    loadStats()
  }, [])

  useEffect(() => {
    filterAndSortItems()
  }, [contentItems, searchQuery, statusFilter, typeFilter, riskFilter, sortBy])

  const loadContentItems = async () => {
    try {
      setLoading(true)
      
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data
      const mockItems: ContentItem[] = [
        {
          id: '1',
          type: 'response',
          content: 'This response contains some concerning language that needs review. It discusses personal struggles in a way that might be harmful to other users.',
          userId: 'user-1',
          userName: 'John Doe',
          userEmail: 'john.doe@example.com',
          createdAt: '2024-01-20T10:30:00Z',
          moderationStatus: 'pending',
          flags: [
            {
              id: 'flag-1',
              type: 'inappropriate',
              severity: 'medium',
              description: 'Content may contain harmful advice',
              flaggedBy: 'ai',
              flaggedAt: '2024-01-20T10:31:00Z',
              verified: false
            }
          ],
          aiAnalysis: {
            toxicityScore: 0.7,
            sentimentScore: -0.3,
            categories: ['personal_struggle', 'advice'],
            riskLevel: 'medium',
            recommendations: ['Manual review recommended', 'Check for harmful advice patterns']
          },
          reportCount: 1,
          wordCount: 342,
          language: 'en'
        },
        {
          id: '2',
          type: 'life_story',
          content: 'A beautiful story about family traditions and memories that brings joy and comfort to anyone who reads it.',
          userId: 'user-2',
          userName: 'Sarah Smith',
          userEmail: 'sarah.smith@example.com',
          createdAt: '2024-01-20T09:15:00Z',
          moderationStatus: 'approved',
          moderatedBy: 'moderator-1',
          moderatedAt: '2024-01-20T09:45:00Z',
          flags: [],
          aiAnalysis: {
            toxicityScore: 0.1,
            sentimentScore: 0.8,
            categories: ['family', 'positive_memory'],
            riskLevel: 'low',
            recommendations: ['Safe for approval']
          },
          reportCount: 0,
          wordCount: 567,
          language: 'en'
        }
        // Add more mock items as needed
      ]

      setContentItems(mockItems)
      
    } catch (error) {
      console.error('Failed to load content items:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Mock stats - replace with actual API
      const mockStats: ModerationStats = {
        totalContent: 2847,
        pendingReview: 23,
        approvedToday: 156,
        rejectedToday: 12,
        flaggedContent: 8,
        averageReviewTime: 4.2,
        aiAccuracy: 94.3,
        moderatorWorkload: 67
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const filterAndSortItems = () => {
    let filtered = [...contentItems]

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.moderationStatus === statusFilter)
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter)
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(item => item.aiAnalysis.riskLevel === riskFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'risk':
          const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return riskOrder[b.aiAnalysis.riskLevel] - riskOrder[a.aiAnalysis.riskLevel]
        case 'reports':
          return b.reportCount - a.reportCount
        default:
          return 0
      }
    })

    setFilteredItems(filtered)
  }

  const getRiskColor = (risk: ContentItem['aiAnalysis']['riskLevel']) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: ContentItem['moderationStatus']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'flagged': return 'bg-orange-100 text-orange-800'
      case 'escalated': return 'bg-purple-100 text-purple-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFlagTypeColor = (type: ContentFlag['type']) => {
    switch (type) {
      case 'toxicity': return 'bg-red-100 text-red-800'
      case 'harassment': return 'bg-red-100 text-red-800'
      case 'hate_speech': return 'bg-red-100 text-red-800'
      case 'violence': return 'bg-red-100 text-red-800'
      case 'spam': return 'bg-yellow-100 text-yellow-800'
      case 'inappropriate': return 'bg-orange-100 text-orange-800'
      case 'privacy': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleModeration = (item: ContentItem, action: ModerationAction['action']) => {
    setSelectedContent(item)
    setModerationAction(action)
    setShowModerationDialog(true)
  }

  const submitModeration = async () => {
    if (!selectedContent || !moderationAction) return

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      // Update the content item
      setContentItems(prev => 
        prev.map(item => 
          item.id === selectedContent.id 
            ? {
                ...item,
                moderationStatus: moderationAction === 'approve' ? 'approved' : 
                                 moderationAction === 'reject' ? 'rejected' :
                                 moderationAction === 'flag' ? 'flagged' :
                                 moderationAction === 'escalate' ? 'escalated' : item.moderationStatus,
                moderatedBy: 'current-moderator',
                moderatedAt: new Date().toISOString()
              }
            : item
        )
      )

      setShowModerationDialog(false)
      setSelectedContent(null)
      setModerationAction(null)
      setModerationReason('')
      setModerationNotes('')
      
    } catch (error) {
      console.error('Failed to submit moderation action:', error)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const totalPages = Math.ceil(filteredItems.length / pageSize)

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading content moderation dashboard...</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-gray-600">Review and moderate user-generated content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => { loadContentItems(); loadStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <QuickStats
          stats={[
            {
              id: 'pending-review',
              title: 'Pending Review',
              value: { current: stats.pendingReview },
              trend: { direction: 'down', percentage: 15.2, period: 'vs yesterday' },
              icon: Clock
            },
            {
              id: 'approved-today',
              title: 'Approved Today',
              value: { current: stats.approvedToday },
              trend: { direction: 'up', percentage: 23.1, period: 'vs yesterday' },
              icon: CheckCircle
            },
            {
              id: 'flagged-content',
              title: 'Flagged Content',
              value: { current: stats.flaggedContent },
              trend: { direction: 'down', percentage: 8.7, period: 'vs yesterday' },
              icon: Flag
            },
            {
              id: 'ai-accuracy',
              title: 'AI Accuracy',
              value: { current: stats.aiAccuracy, format: 'percentage' },
              trend: { direction: 'up', percentage: 2.1, period: 'this week' },
              icon: Shield
            }
          ]}
        />
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue">
            Review Queue
            {stats && stats.pendingReview > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingReview}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="flagged">
            Flagged Content
            {stats && stats.flaggedContent > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.flaggedContent}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Review Queue Tab */}
        <TabsContent value="queue" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search content..."
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={riskFilter} onValueChange={(value: any) => setRiskFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="risk">Risk Level</SelectItem>
                    <SelectItem value="reports">Report Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Content Items */}
          <div className="space-y-4">
            {paginatedItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {item.type.replace('_', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(item.moderationStatus)}>
                            {item.moderationStatus}
                          </Badge>
                          <Badge className={getRiskColor(item.aiAnalysis.riskLevel)}>
                            {item.aiAnalysis.riskLevel} risk
                          </Badge>
                          {item.reportCount > 0 && (
                            <Badge variant="destructive">
                              {item.reportCount} reports
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <User className="h-4 w-4 inline mr-1" />
                          {item.userName} ({item.userEmail}) • 
                          <Calendar className="h-4 w-4 inline ml-2 mr-1" />
                          {new Date(item.createdAt).toLocaleString()} •
                          <FileText className="h-4 w-4 inline ml-2 mr-1" />
                          {item.wordCount} words
                        </div>
                        <p className="text-gray-900 line-clamp-3">{item.content}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleModeration(item, 'approve')}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleModeration(item, 'reject')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleModeration(item, 'flag')}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <Flag className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {(item.flags.length > 0 || item.aiAnalysis.recommendations.length > 0) && (
                  <CardContent className="pt-0">
                    {/* Flags */}
                    {item.flags.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Flags:</h4>
                        <div className="flex flex-wrap gap-2">
                          {item.flags.map((flag) => (
                            <Badge 
                              key={flag.id} 
                              className={getFlagTypeColor(flag.type)}
                            >
                              {flag.type.replace('_', ' ')} ({flag.severity})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* AI Analysis */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">AI Analysis:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Toxicity Score</span>
                          <div className="font-medium">{(item.aiAnalysis.toxicityScore * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Sentiment</span>
                          <div className="font-medium">
                            {item.aiAnalysis.sentimentScore > 0 ? 'Positive' : 
                             item.aiAnalysis.sentimentScore < 0 ? 'Negative' : 'Neutral'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Categories</span>
                          <div className="font-medium">{item.aiAnalysis.categories.join(', ')}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Recommendations</span>
                          <div className="font-medium">{item.aiAnalysis.recommendations[0]}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} items
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
        </TabsContent>

        {/* Other tabs can be implemented similarly */}
        <TabsContent value="flagged" className="space-y-6">
          <Card>
            <CardContent className="text-center py-12">
              <Flag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Flagged Content View</h3>
              <p className="text-gray-500">This section will show all flagged content requiring attention</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ActivityFeed
            title="Recent Moderation Actions"
            activities={[
              {
                id: '1',
                type: 'user',
                title: 'Content approved',
                description: 'Life story from Sarah Smith was approved after review',
                timestamp: '10 minutes ago',
                user: 'Moderator John'
              },
              {
                id: '2',
                type: 'security',
                title: 'Content flagged',
                description: 'Response flagged for inappropriate content by AI system',
                timestamp: '25 minutes ago',
                user: 'AI System'
              },
              {
                id: '3',
                type: 'user',
                title: 'Content rejected',
                description: 'Milestone rejected due to policy violation',
                timestamp: '1 hour ago',
                user: 'Moderator Sarah'
              }
            ]}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Moderation Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Content</span>
                      <span className="font-semibold">{stats.totalContent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Review Time</span>
                      <span className="font-semibold">{stats.averageReviewTime} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">AI Accuracy</span>
                      <span className="font-semibold">{stats.aiAccuracy}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Moderator Workload</span>
                      <span className="font-semibold">{stats.moderatorWorkload}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Responses (65%)</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Life Stories (25%)</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '25%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Milestones (10%)</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '10%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Moderation Dialog */}
      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {moderationAction === 'approve' && 'Approve Content'}
              {moderationAction === 'reject' && 'Reject Content'}
              {moderationAction === 'flag' && 'Flag Content'}
              {moderationAction === 'escalate' && 'Escalate Content'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for this moderation action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Select value={moderationReason} onValueChange={setModerationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {moderationAction === 'approve' && (
                    <>
                      <SelectItem value="content_appropriate">Content is appropriate</SelectItem>
                      <SelectItem value="false_positive">AI false positive</SelectItem>
                      <SelectItem value="manual_review_passed">Passed manual review</SelectItem>
                    </>
                  )}
                  {moderationAction === 'reject' && (
                    <>
                      <SelectItem value="inappropriate_content">Inappropriate content</SelectItem>
                      <SelectItem value="policy_violation">Policy violation</SelectItem>
                      <SelectItem value="harmful_advice">Harmful advice</SelectItem>
                      <SelectItem value="spam">Spam content</SelectItem>
                    </>
                  )}
                  {moderationAction === 'flag' && (
                    <>
                      <SelectItem value="needs_review">Needs further review</SelectItem>
                      <SelectItem value="potential_violation">Potential policy violation</SelectItem>
                      <SelectItem value="user_report">User report received</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <Textarea
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                placeholder="Add any additional context or notes..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModerationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitModeration} disabled={!moderationReason}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}