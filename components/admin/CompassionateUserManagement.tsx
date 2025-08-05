'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Heart, 
  Users, 
  Search, 
  Shield, 
  Clock,
  Mail,
  Phone,
  Key,
  UserPlus,
  Settings,
  AlertTriangle,
  CheckCircle,
  TreePine,
  Star,
  MessageCircle,
  Calendar,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  User,
  Crown,
  Flower
} from 'lucide-react'
import { griefSensitiveColors, griefSensitiveSpacing } from '@/lib/grief-sensitive-design'

interface User {
  id: string
  name: string
  email: string
  role: 'member' | 'family_admin' | 'admin'
  familyId?: string
  familyName?: string
  status: 'active' | 'inactive' | 'invited' | 'grieving' | 'healing'
  joinedDate: string
  lastActive: string
  memoriesShared: number
  aiInteractions: number
  supportNeeded: boolean
  emotionalState: 'peaceful' | 'struggling' | 'healing' | 'celebrating'
  currentPhase: 'exploring' | 'sharing' | 'connecting' | 'processing'
  privacyLevel: 'open' | 'family_only' | 'private'
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  lastPasswordReset?: string
  loginAttempts: number
  accountRecovery?: {
    requestedDate: string
    reason: string
    status: 'pending' | 'approved' | 'completed'
  }
}

interface FamilyGroup {
  id: string
  name: string
  createdDate: string
  memberCount: number
  primaryContact: string
  supportLevel: 'stable' | 'monitoring' | 'intervention'
  members: User[]
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    role: 'family_admin',
    familyId: 'fam_1',
    familyName: 'The Johnson Family',
    status: 'active',
    joinedDate: '2024-01-15',
    lastActive: '2024-01-31',
    memoriesShared: 28,
    aiInteractions: 15,
    supportNeeded: false,
    emotionalState: 'healing',
    currentPhase: 'connecting',
    privacyLevel: 'family_only',
    emergencyContact: {
      name: 'Michael Johnson',
      phone: '+1 (555) 123-4567',
      relationship: 'Brother'
    },
    lastPasswordReset: '2024-01-20',
    loginAttempts: 0
  },
  {
    id: '2',
    name: 'Michael Johnson',
    email: 'michael@example.com',
    role: 'member',
    familyId: 'fam_1',
    familyName: 'The Johnson Family',
    status: 'active',
    joinedDate: '2024-01-20',
    lastActive: '2024-01-30',
    memoriesShared: 14,
    aiInteractions: 8,
    supportNeeded: false,
    emotionalState: 'peaceful',
    currentPhase: 'sharing',
    privacyLevel: 'family_only',
    loginAttempts: 0
  },
  {
    id: '3',
    name: 'Lisa Chen',
    email: 'lisa@example.com',
    role: 'family_admin',
    familyId: 'fam_2',
    familyName: 'The Chen Legacy',
    status: 'active',
    joinedDate: '2024-01-28',
    lastActive: '2024-01-29',
    memoriesShared: 18,
    aiInteractions: 0,
    supportNeeded: true,
    emotionalState: 'struggling',
    currentPhase: 'exploring',
    privacyLevel: 'private',
    emergencyContact: {
      name: 'David Chen',
      phone: '+1 (555) 987-6543',
      relationship: 'Brother'
    },
    loginAttempts: 0,
    accountRecovery: {
      requestedDate: '2024-01-30',
      reason: 'Forgot password during difficult time',
      status: 'pending'
    }
  }
]

const mockFamilyGroups: FamilyGroup[] = [
  {
    id: 'fam_1',
    name: 'The Johnson Family',
    createdDate: '2024-01-15',
    memberCount: 2,
    primaryContact: 'Sarah Johnson',
    supportLevel: 'stable',
    members: mockUsers.filter(u => u.familyId === 'fam_1')
  },
  {
    id: 'fam_2',
    name: 'The Chen Legacy',
    createdDate: '2024-01-28',
    memberCount: 1,
    primaryContact: 'Lisa Chen',
    supportLevel: 'monitoring',
    members: mockUsers.filter(u => u.familyId === 'fam_2')
  }
]

const getStatusColor = (status: User['status']) => {
  switch (status) {
    case 'active': return griefSensitiveColors.hope[500]
    case 'inactive': return griefSensitiveColors.peace[400]
    case 'invited': return griefSensitiveColors.primary[500]
    case 'grieving': return griefSensitiveColors.comfort[500]
    case 'healing': return griefSensitiveColors.memory[500]
    default: return griefSensitiveColors.peace[400]
  }
}

const getEmotionalStateColor = (state: User['emotionalState']) => {
  switch (state) {
    case 'peaceful': return griefSensitiveColors.hope[500]
    case 'struggling': return griefSensitiveColors.warning[500]
    case 'healing': return griefSensitiveColors.comfort[500]
    case 'celebrating': return griefSensitiveColors.memory[500]
    default: return griefSensitiveColors.peace[400]
  }
}

const getRoleIcon = (role: User['role']) => {
  switch (role) {
    case 'admin': return Crown
    case 'family_admin': return Shield
    case 'member': return Heart
    default: return User
  }
}

export default function CompassionateUserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>(mockFamilyGroups)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | User['status']>('all')
  const [filterSupportNeeded, setFilterSupportNeeded] = useState<'all' | 'yes' | 'no'>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
  const [showInviteUser, setShowInviteUser] = useState(false)
  const [shadowUser, setShadowUser] = useState<User | null>(null)

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.familyName && user.familyName.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    const matchesSupport = filterSupportNeeded === 'all' || 
                          (filterSupportNeeded === 'yes' && user.supportNeeded) ||
                          (filterSupportNeeded === 'no' && !user.supportNeeded)
    
    return matchesSearch && matchesStatus && matchesSupport
  })

  const usersNeedingSupport = users.filter(u => u.supportNeeded).length
  const accountRecoveryRequests = users.filter(u => u.accountRecovery?.status === 'pending').length
  const recentActivity = users.filter(u => {
    const lastActive = new Date(u.lastActive)
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    return lastActive >= twoDaysAgo
  }).length

  const handlePasswordReset = (user: User) => {
    setSelectedUser(user)
    setShowPasswordReset(true)
  }

  const handleUserShadowing = (user: User) => {
    setShadowUser(user)
    // In a real implementation, this would enable viewing the user's experience
  }

  const handleRecoveryRequest = (user: User) => {
    setSelectedUser(user)
    setShowRecoveryDialog(true)
  }

  return (
    <div className="space-y-8">
      {/* Compassionate Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div 
            className="p-3 rounded-full"
            style={{ backgroundColor: griefSensitiveColors.hope[100] }}
          >
            <Users className="h-8 w-8" style={{ color: griefSensitiveColors.hope[600] }} />
          </div>
          <h1 
            className="text-3xl font-semibold"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            Family Care Center
          </h1>
        </div>
        <p 
          className="text-lg leading-relaxed max-w-2xl mx-auto"
          style={{ color: griefSensitiveColors.peace[600] }}
        >
          Supporting families with gentle care, ensuring their journey through grief and remembrance is met with compassion and understanding
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.hope[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.hope[700] }}
            >
              <Heart className="h-4 w-4" />
              Active Family Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.hope[600] }}
            >
              {users.filter(u => u.status === 'active').length}
            </div>
            <p 
              className="text-sm flex items-center gap-1"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              <CheckCircle className="h-3 w-3" style={{ color: griefSensitiveColors.hope[500] }} />
              {recentActivity} active recently
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: usersNeedingSupport > 0 ? griefSensitiveColors.warning[50] : 'white',
            border: `1px solid ${usersNeedingSupport > 0 ? griefSensitiveColors.warning[300] : griefSensitiveColors.peace[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: usersNeedingSupport > 0 ? griefSensitiveColors.warning[700] : griefSensitiveColors.peace[700] }}
            >
              <Shield className="h-4 w-4" />
              Needing Extra Care
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: usersNeedingSupport > 0 ? griefSensitiveColors.warning[600] : griefSensitiveColors.hope[600] }}
            >
              {usersNeedingSupport}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              {usersNeedingSupport > 0 ? 'Families receiving support' : 'All families stable'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: 'white',
            border: `1px solid ${griefSensitiveColors.primary[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: griefSensitiveColors.primary[700] }}
            >
              <TreePine className="h-4 w-4" />
              Family Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: griefSensitiveColors.primary[600] }}
            >
              {familyGroups.length}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              Growing legacy gardens
            </p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300"
          style={{ 
            backgroundColor: accountRecoveryRequests > 0 ? griefSensitiveColors.comfort[50] : 'white',
            border: `1px solid ${accountRecoveryRequests > 0 ? griefSensitiveColors.comfort[300] : griefSensitiveColors.peace[200]}`
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle 
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: accountRecoveryRequests > 0 ? griefSensitiveColors.comfort[700] : griefSensitiveColors.peace[700] }}
            >
              <Key className="h-4 w-4" />
              Recovery Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="text-3xl font-semibold mb-1"
              style={{ color: accountRecoveryRequests > 0 ? griefSensitiveColors.comfort[600] : griefSensitiveColors.hope[600] }}
            >
              {accountRecoveryRequests}
            </div>
            <p 
              className="text-sm"
              style={{ color: griefSensitiveColors.peace[600] }}
            >
              {accountRecoveryRequests > 0 ? 'Awaiting gentle assistance' : 'No pending requests'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: 'white',
          border: `1px solid ${griefSensitiveColors.peace[200]}`
        }}
      >
        <CardHeader>
          <CardTitle 
            className="flex items-center gap-2"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            <Search className="h-5 w-5" />
            Find and Support Families
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or family..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                style={{
                  border: `2px solid ${griefSensitiveColors.peace[200]}`,
                  borderRadius: '8px'
                }}
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="grieving">Grieving</SelectItem>
                <SelectItem value="healing">Healing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSupportNeeded} onValueChange={(value: any) => setFilterSupportNeeded(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Support needed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="yes">Needing Support</SelectItem>
                <SelectItem value="no">Stable</SelectItem>
              </SelectContent>
            </Select>
            <Button
              style={{
                backgroundColor: griefSensitiveColors.primary[500],
                color: 'white'
              }}
              onClick={() => setShowInviteUser(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Family
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card 
            key={user.id}
            className="border-0 shadow-sm hover:shadow-md transition-all duration-300"
            style={{ 
              backgroundColor: user.supportNeeded ? griefSensitiveColors.warning[50] : 'white',
              border: `1px solid ${user.supportNeeded ? griefSensitiveColors.warning[200] : griefSensitiveColors.peace[200]}`
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div 
                    className="p-3 rounded-full"
                    style={{ backgroundColor: getStatusColor(user.status) + '20' }}
                  >
                    {React.createElement(getRoleIcon(user.role), {
                      className: "h-5 w-5",
                      style: { color: getStatusColor(user.status) }
                    })}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 
                        className="text-lg font-semibold"
                        style={{ color: griefSensitiveColors.peace[800] }}
                      >
                        {user.name}
                      </h3>
                      <Badge
                        style={{
                          backgroundColor: getStatusColor(user.status) + '20',
                          color: getStatusColor(user.status),
                          border: `1px solid ${getStatusColor(user.status)}`
                        }}
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                      {user.supportNeeded && (
                        <Badge
                          style={{
                            backgroundColor: griefSensitiveColors.warning[100],
                            color: griefSensitiveColors.warning[700],
                            border: `1px solid ${griefSensitiveColors.warning[300]}`
                          }}
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          Needs Support
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        {user.email} • {user.familyName || 'Individual member'}
                      </p>
                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        {user.memoriesShared} memories shared • {user.aiInteractions} AI connections • 
                        {user.currentPhase} phase
                      </p>
                      <div className="flex items-center gap-4 text-xs" style={{ color: griefSensitiveColors.peace[500] }}>
                        <span>Joined {new Date(user.joinedDate).toLocaleDateString()}</span>
                        <span>Last active {new Date(user.lastActive).toLocaleDateString()}</span>
                        {user.lastPasswordReset && (
                          <span>Password reset {new Date(user.lastPasswordReset).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div 
                    className="px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: getEmotionalStateColor(user.emotionalState) + '20',
                      color: getEmotionalStateColor(user.emotionalState)
                    }}
                  >
                    {user.emotionalState}
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user)
                        setShowUserDetails(true)
                      }}
                      className="h-8 w-8 p-0"
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserShadowing(user)}
                      className="h-8 w-8 p-0"
                      title="Shadow user experience"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePasswordReset(user)}
                      className="h-8 w-8 p-0"
                      title="Reset password"
                    >
                      <Key className="h-4 w-4" />
                    </Button>

                    {user.accountRecovery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRecoveryRequest(user)}
                        className="h-8 w-8 p-0"
                        title="Handle recovery request"
                        style={{ color: griefSensitiveColors.warning[600] }}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle 
              className="flex items-center gap-2"
              style={{ color: griefSensitiveColors.peace[800] }}
            >
              <Key className="h-5 w-5" />
              Gentle Password Reset
            </DialogTitle>
            <DialogDescription style={{ color: griefSensitiveColors.peace[600] }}>
              Send a compassionate password reset email to {selectedUser?.name}. 
              This will help them regain access during what may be a difficult time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: griefSensitiveColors.comfort[50] }}>
              <h4 className="font-medium mb-2" style={{ color: griefSensitiveColors.comfort[700] }}>
                Email Preview
              </h4>
              <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                "Dear {selectedUser?.name}, we understand this may be a difficult time. 
                We're here to help you access your precious memories whenever you're ready. 
                Please use the link below to reset your password at your own pace."
              </p>
            </div>
            <div>
              <Label htmlFor="admin-note" style={{ color: griefSensitiveColors.peace[700] }}>
                Personal note (optional)
              </Label>
              <Textarea
                id="admin-note"
                placeholder="Add a personal, caring message..."
                className="mt-1"
                style={{
                  border: `2px solid ${griefSensitiveColors.peace[200]}`,
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPasswordReset(false)}
              style={{
                borderColor: griefSensitiveColors.peace[300],
                color: griefSensitiveColors.peace[600]
              }}
            >
              Cancel
            </Button>
            <Button 
              style={{
                backgroundColor: griefSensitiveColors.primary[500],
                color: 'white'
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Reset Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Family Groups Section */}
      <Card 
        className="border-0 shadow-sm"
        style={{ 
          backgroundColor: 'white',
          border: `1px solid ${griefSensitiveColors.peace[200]}`
        }}
      >
        <CardHeader>
          <CardTitle 
            className="flex items-center gap-2"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            <TreePine className="h-5 w-5" />
            Family Legacy Gardens
          </CardTitle>
          <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
            Organized family groups and their collective journey of remembrance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {familyGroups.map((family) => (
              <div 
                key={family.id}
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: griefSensitiveColors.peace[50],
                  borderColor: griefSensitiveColors.peace[200]
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: griefSensitiveColors.comfort[100] }}
                    >
                      <TreePine className="h-4 w-4" style={{ color: griefSensitiveColors.comfort[600] }} />
                    </div>
                    <div>
                      <h4 className="font-medium" style={{ color: griefSensitiveColors.peace[800] }}>
                        {family.name}
                      </h4>
                      <p className="text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                        {family.memberCount} members • Primary contact: {family.primaryContact}
                      </p>
                    </div>
                  </div>
                  <Badge
                    style={{
                      backgroundColor: griefSensitiveColors.hope[100],
                      color: griefSensitiveColors.hope[700],
                      border: `1px solid ${griefSensitiveColors.hope[300]}`
                    }}
                  >
                    {family.supportLevel === 'stable' ? 'Flourishing' : 
                     family.supportLevel === 'monitoring' ? 'Gentle Care' : 'Extra Support'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {family.members.slice(0, 3).map((member) => (
                    <div 
                      key={member.id}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: getStatusColor(member.status) + '20',
                        color: getStatusColor(member.status)
                      }}
                    >
                      {member.name}
                    </div>
                  ))}
                  {family.members.length > 3 && (
                    <div 
                      className="px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: griefSensitiveColors.peace[200],
                        color: griefSensitiveColors.peace[600]
                      }}
                    >
                      +{family.members.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}