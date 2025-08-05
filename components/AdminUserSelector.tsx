'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorMessage } from '@/components/ui/error-message'
import { Loading } from '@/components/ui/loading'

interface UserTrainingData {
  id: string
  email: string
  name: string
  responses: {
    count: number
    categories: string[]
    wordCount: number
    lastResponseAt: string | null
    qualityScore: number
  }
  lifeEntries: {
    count: number
    categories: string[]
    wordCount: number
    lastEntryAt: string | null
  }
  milestones: {
    count: number
    types: string[]
    wordCount: number
    lastMilestoneAt: string | null
  }
  training: {
    isEligible: boolean
    dataQuality: 'poor' | 'fair' | 'good' | 'excellent'
    estimatedTrainingTime: number
    lastTrainingAt: string | null
    modelVersions: number
  }
  privacy: {
    consentStatus: 'unknown' | 'granted' | 'denied' | 'pending'
    lastConsentUpdate: string | null
  }
}

interface UserSelectorProps {
  onUserSelected?: (userId: string, userData: UserTrainingData) => void
  onBatchSelected?: (userIds: string[], usersData: UserTrainingData[]) => void
  multiSelect?: boolean
}

export default function AdminUserSelector({ 
  onUserSelected, 
  onBatchSelected, 
  multiSelect = false 
}: UserSelectorProps) {
  const [users, setUsers] = useState<UserTrainingData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('totalWords')
  const [eligibleOnly, setEligibleOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState({
    totalEligible: 0,
    averageQualityScore: 0,
    totalTrainingTime: 0
  })
  
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewUserId, setPreviewUserId] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        eligibleOnly: eligibleOnly.toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/admin/training-data?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load user data')
      }
      
      const data = await response.json()
      setUsers(data.users)
      setCurrentPage(data.pagination.page)
      setTotalPages(data.pagination.totalPages)
      setSummary(data.summary)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, sortBy, eligibleOnly])

  useEffect(() => {
    loadUsers(1)
  }, [loadUsers])

  const handleUserSelect = (userId: string, userData: UserTrainingData) => {
    if (multiSelect) {
      const newSelected = new Set(selectedUsers)
      if (newSelected.has(userId)) {
        newSelected.delete(userId)
      } else {
        newSelected.add(userId)
      }
      setSelectedUsers(newSelected)
    } else {
      onUserSelected?.(userId, userData)
    }
  }

  const handleBatchAction = () => {
    if (onBatchSelected && selectedUsers.size > 0) {
      const selectedUsersData = users.filter(user => selectedUsers.has(user.id))
      onBatchSelected(Array.from(selectedUsers), selectedUsersData)
    }
  }

  const loadPreviewData = async (userId: string) => {
    try {
      setPreviewLoading(true)
      setPreviewUserId(userId)
      
      const response = await fetch('/api/admin/training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'preview' })
      })
      
      if (!response.ok) throw new Error('Failed to load preview data')
      
      const data = await response.json()
      setPreviewData(data)
    } catch (err) {
      console.error('Preview error:', err)
    } finally {
      setPreviewLoading(false)
    }
  }

  const getQualityBadgeColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200'
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'poor': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString()
  }

  const getTotalWords = (user: UserTrainingData) => {
    return user.responses.wordCount + user.lifeEntries.wordCount + user.milestones.wordCount
  }

  if (loading && users.length === 0) {
    return <Loading message="Loading user training data..." />
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Select Users for Training</h2>
          <p className="text-gray-600">Choose users with sufficient data for LLM training</p>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{summary.totalEligible}</div>
              <p className="text-sm text-gray-600">Eligible Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{summary.averageQualityScore}%</div>
              <p className="text-sm text-gray-600">Avg Quality Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{Math.round(summary.totalTrainingTime / 60)}h</div>
              <p className="text-sm text-gray-600">Total Training Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalWords">Total Words</SelectItem>
              <SelectItem value="dataQuality">Data Quality</SelectItem>
              <SelectItem value="lastActivity">Recent Activity</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={eligibleOnly ? "default" : "outline"}
            onClick={() => setEligibleOnly(!eligibleOnly)}
          >
            {eligibleOnly ? "Show All" : "Eligible Only"}
          </Button>
          
          <Button onClick={() => loadUsers(1)} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Batch Actions */}
        {multiSelect && selectedUsers.size > 0 && (
          <div className="flex gap-2 p-4 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedUsers.size} users selected
            </span>
            <Button size="sm" onClick={handleBatchAction}>
              Start Batch Training
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedUsers(new Set())}>
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} />}

      {/* User List */}
      <div className="grid gap-4">
        {users.map((user) => (
          <Card 
            key={user.id} 
            className={`transition-all cursor-pointer hover:shadow-lg ${
              selectedUsers.has(user.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => handleUserSelect(user.id, user)}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getQualityBadgeColor(user.training.dataQuality)}>
                        {user.training.dataQuality}
                      </Badge>
                      {user.training.isEligible ? (
                        <Badge className="bg-green-100 text-green-800">Eligible</Badge>
                      ) : (
                        <Badge variant="outline">Needs More Data</Badge>
                      )}
                    </div>
                  </div>

                  {/* Data Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-blue-600">{user.responses.count}</div>
                      <div className="text-gray-600">Responses</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-600">{user.lifeEntries.count}</div>
                      <div className="text-gray-600">Life Entries</div>
                    </div>
                    <div>
                      <div className="font-medium text-purple-600">{user.milestones.count}</div>
                      <div className="text-gray-600">Milestones</div>
                    </div>
                    <div>
                      <div className="font-medium text-orange-600">{getTotalWords(user).toLocaleString()}</div>
                      <div className="text-gray-600">Total Words</div>
                    </div>
                  </div>

                  {/* Training Info */}
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Est. Training: {user.training.estimatedTrainingTime}min</span>
                    <span>Models: {user.training.modelVersions}</span>
                    <span>Last Training: {formatDate(user.training.lastTrainingAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          loadPreviewData(user.id)
                        }}
                      >
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Training Data Preview - {user.name}</DialogTitle>
                        <DialogDescription>
                          Sample data that will be used for training
                        </DialogDescription>
                      </DialogHeader>
                      
                      {previewLoading ? (
                        <Loading message="Loading preview..." />
                      ) : previewData && previewUserId === user.id ? (
                        <div className="space-y-6">
                          {/* Responses */}
                          <div>
                            <h4 className="font-semibold mb-3">Recent Responses</h4>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {previewData.responses.map((response: any, idx: number) => (
                                <div key={idx} className="border rounded p-3">
                                  <div className="text-sm text-gray-600 mb-1">
                                    {response.category} • {formatDate(response.created_at)}
                                  </div>
                                  <div className="font-medium text-sm mb-2">{response.question_text}</div>
                                  <div className="text-sm">{response.response_text}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Life Entries */}
                          {previewData.lifeEntries.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Life Entries</h4>
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {previewData.lifeEntries.map((entry: any, idx: number) => (
                                  <div key={idx} className="border rounded p-3">
                                    <div className="text-sm text-gray-600 mb-1">
                                      {entry.category} • {formatDate(entry.created_at)}
                                    </div>
                                    <div className="font-medium text-sm mb-2">{entry.title}</div>
                                    <div className="text-sm">{entry.content.slice(0, 200)}...</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Milestones */}
                          {previewData.milestones.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Milestone Messages</h4>
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {previewData.milestones.map((milestone: any, idx: number) => (
                                  <div key={idx} className="border rounded p-3">
                                    <div className="text-sm text-gray-600 mb-1">
                                      {milestone.milestone_type} • {formatDate(milestone.created_at)}
                                    </div>
                                    <div className="font-medium text-sm mb-2">{milestone.message_title}</div>
                                    <div className="text-sm">{milestone.message_content.slice(0, 200)}...</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </DialogContent>
                  </Dialog>
                  
                  {!multiSelect && (
                    <Button size="sm" variant="default">
                      Select
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadUsers(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="py-2 px-4 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => loadUsers(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}