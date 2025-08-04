'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  Heart, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  Clock,
  MessageCircle,
  Shield,
  Star,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Eye,
  MoreHorizontal,
  UserCheck,
  UserX,
  Lock,
  Unlock
} from 'lucide-react'
import { griefSensitiveColors } from '@/lib/grief-sensitive-design'

interface FamilyMember {
  id: string
  name: string
  email: string
  role: 'primary' | 'partner' | 'child' | 'sibling' | 'parent' | 'extended'
  avatar?: string
  lastActive: string
  memoriesShared: number
  aiInteractions: number
  needsSupport: boolean
  status: 'active' | 'inactive' | 'memorial'
}

interface Family {
  id: string
  name: string
  primaryContact: string
  members: FamilyMember[]
  totalMemories: number
  familyStory: string
  joinedDate: string
  lastActivity: string
  supportStatus: 'stable' | 'monitoring' | 'intervention'
  location?: string
  phoneNumber?: string
  emergencyContact?: string
}

// Mock data for demonstration
const mockFamilies: Family[] = [
  {
    id: 'fam_001',
    name: 'The Johnson Family',
    primaryContact: 'Sarah Johnson',
    members: [
      {
        id: 'user_001',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'primary',
        lastActive: '2024-02-15T10:30:00Z',
        memoriesShared: 47,
        aiInteractions: 89,
        needsSupport: false,
        status: 'active'
      },
      {
        id: 'user_002',
        name: 'Michael Johnson',
        email: 'michael@example.com',
        role: 'partner',
        lastActive: '2024-02-14T18:45:00Z',
        memoriesShared: 23,
        aiInteractions: 56,
        needsSupport: false,
        status: 'active'
      },
      {
        id: 'user_003',
        name: 'Emma Johnson',
        email: 'emma@example.com',
        role: 'child',
        lastActive: '2024-02-13T14:20:00Z',
        memoriesShared: 12,
        aiInteractions: 34,
        needsSupport: true,
        status: 'active'
      }
    ],
    totalMemories: 82,
    familyStory: 'Preserving memories of beloved grandfather William',
    joinedDate: '2023-11-15',
    lastActivity: '2024-02-15T10:30:00Z',
    supportStatus: 'monitoring',
    location: 'Seattle, WA',
    phoneNumber: '+1 (555) 123-4567',
    emergencyContact: 'sarah@example.com'
  },
  {
    id: 'fam_002',
    name: 'The Rodriguez Family',
    primaryContact: 'Maria Rodriguez',
    members: [
      {
        id: 'user_004',
        name: 'Maria Rodriguez',
        email: 'maria@example.com',
        role: 'primary',
        lastActive: '2024-02-15T09:15:00Z',
        memoriesShared: 156,
        aiInteractions: 203,
        needsSupport: false,
        status: 'active'
      },
      {
        id: 'user_005',
        name: 'Carlos Rodriguez Jr.',
        email: 'carlos@example.com',
        role: 'child',
        lastActive: '2024-02-12T16:30:00Z',
        memoriesShared: 89,
        aiInteractions: 145,
        needsSupport: false,
        status: 'active'
      }
    ],
    totalMemories: 245,
    familyStory: 'Honoring the legacy of Carlos Rodriguez Sr.',
    joinedDate: '2023-08-22',
    lastActivity: '2024-02-15T09:15:00Z',
    supportStatus: 'stable',
    location: 'Austin, TX',
    phoneNumber: '+1 (555) 987-6543',
    emergencyContact: 'maria@example.com'
  }
]

export default function FamilyManagementDashboard() {
  const [families, setFamilies] = useState<Family[]>(mockFamilies)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<'all' | 'stable' | 'monitoring' | 'intervention'>('all')

  const filteredFamilies = families.filter(family => {
    const matchesSearch = family.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         family.primaryContact.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || family.supportStatus === filterStatus
    return matchesSearch && matchesFilter
  })

  const toggleFamilyExpansion = (familyId: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(familyId)) {
        newSet.delete(familyId)
      } else {
        newSet.add(familyId)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return formatDate(dateString)
  }

  const getSupportStatusColor = (status: string) => {
    switch (status) {
      case 'stable': return griefSensitiveColors.hope[500]
      case 'monitoring': return griefSensitiveColors.memory[500]
      case 'intervention': return griefSensitiveColors.warning[500]
      default: return griefSensitiveColors.peace[500]
    }
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      primary: 'Family Lead',
      partner: 'Partner',
      child: 'Child',
      sibling: 'Sibling',
      parent: 'Parent',
      extended: 'Extended Family'
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 
            className="text-2xl font-semibold mb-2"
            style={{ color: griefSensitiveColors.peace[800] }}
          >
            Family Support Center
          </h2>
          <p style={{ color: griefSensitiveColors.peace[600] }}>
            Supporting {families.length} families in their journey of preserving precious memories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            style={{
              backgroundColor: griefSensitiveColors.hope[100],
              color: griefSensitiveColors.hope[700],
              border: `1px solid ${griefSensitiveColors.hope[300]}`
            }}
          >
            {families.filter(f => f.supportStatus === 'intervention').length} families need immediate support
          </Badge>
          <Button
            size="sm"
            style={{
              backgroundColor: griefSensitiveColors.warning[500],
              color: 'white'
            }}
          >
            <Phone className="h-4 w-4 mr-2" />
            Crisis Support
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
            style={{ color: griefSensitiveColors.peace[400] }}
          />
          <Input
            placeholder="Search families by name or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            style={{
              borderColor: griefSensitiveColors.peace[300],
              backgroundColor: 'white'
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: griefSensitiveColors.peace[500] }} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{
              borderColor: griefSensitiveColors.peace[300],
              backgroundColor: 'white',
              color: griefSensitiveColors.peace[700]
            }}
          >
            <option value="all">All Families</option>
            <option value="stable">Stable</option>
            <option value="monitoring">Monitoring</option>
            <option value="intervention">Needs Intervention</option>
          </select>
        </div>
      </div>

      {/* Family Cards */}
      <div className="space-y-4">
        {filteredFamilies.map((family) => {
          const isExpanded = expandedFamilies.has(family.id)
          const needsSupportCount = family.members.filter(m => m.needsSupport).length
          
          return (
            <Card
              key={family.id}
              className="border-0 shadow-sm hover:shadow-md transition-all duration-300"
              style={{
                backgroundColor: 'white',
                border: `1px solid ${getSupportStatusColor(family.supportStatus)}33`
              }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFamilyExpansion(family.id)}
                      className="p-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <CardTitle 
                        className="text-lg flex items-center gap-3"
                        style={{ color: griefSensitiveColors.peace[800] }}
                      >
                        <Users className="h-5 w-5" style={{ color: griefSensitiveColors.comfort[500] }} />
                        {family.name}
                        <Badge
                          style={{
                            backgroundColor: `${getSupportStatusColor(family.supportStatus)}20`,
                            color: getSupportStatusColor(family.supportStatus),
                            border: `1px solid ${getSupportStatusColor(family.supportStatus)}50`
                          }}
                        >
                          {family.supportStatus}
                        </Badge>
                        {needsSupportCount > 0 && (
                          <Badge
                            className="animate-pulse"
                            style={{
                              backgroundColor: griefSensitiveColors.warning[500],
                              color: 'white'
                            }}
                          >
                            {needsSupportCount} need support
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription style={{ color: griefSensitiveColors.peace[600] }}>
                        {family.familyStory} • {family.members.length} family members
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      style={{
                        borderColor: griefSensitiveColors.primary[300],
                        color: griefSensitiveColors.primary[600]
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      View Family
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{
                        borderColor: griefSensitiveColors.peace[300],
                        color: griefSensitiveColors.peace[600]
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Family Overview Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <div 
                      className="text-2xl font-semibold"
                      style={{ color: griefSensitiveColors.memory[600] }}
                    >
                      {family.totalMemories}
                    </div>
                    <p 
                      className="text-sm"
                      style={{ color: griefSensitiveColors.peace[600] }}
                    >
                      Memories Shared
                    </p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-2xl font-semibold"
                      style={{ color: griefSensitiveColors.hope[600] }}
                    >
                      {family.members.reduce((sum, m) => sum + m.aiInteractions, 0)}
                    </div>
                    <p 
                      className="text-sm"
                      style={{ color: griefSensitiveColors.peace[600] }}
                    >
                      AI Conversations
                    </p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-lg font-medium"
                      style={{ color: griefSensitiveColors.peace[700] }}
                    >
                      {getTimeSince(family.lastActivity)}
                    </div>
                    <p 
                      className="text-sm"
                      style={{ color: griefSensitiveColors.peace[600] }}
                    >
                      Last Activity
                    </p>
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-lg font-medium"
                      style={{ color: griefSensitiveColors.peace[700] }}
                    >
                      {formatDate(family.joinedDate)}
                    </div>
                    <p 
                      className="text-sm"
                      style={{ color: griefSensitiveColors.peace[600] }}
                    >
                      Family Since
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Expanded Family Members View */}
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t" style={{ borderColor: griefSensitiveColors.peace[200] }}>
                    <h4 
                      className="text-sm font-medium mb-4 mt-4 flex items-center gap-2"
                      style={{ color: griefSensitiveColors.peace[700] }}
                    >
                      <Heart className="h-4 w-4" style={{ color: griefSensitiveColors.comfort[500] }} />
                      Family Members
                    </h4>
                    <div className="space-y-3">
                      {family.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 rounded-lg"
                          style={{
                            backgroundColor: member.needsSupport 
                              ? griefSensitiveColors.warning[50] 
                              : griefSensitiveColors.peace[50],
                            border: `1px solid ${member.needsSupport 
                              ? griefSensitiveColors.warning[200] 
                              : griefSensitiveColors.peace[200]}`
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                              style={{ backgroundColor: griefSensitiveColors.comfort[400] }}
                            >
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 
                                  className="font-medium"
                                  style={{ color: griefSensitiveColors.peace[800] }}
                                >
                                  {member.name}
                                </h5>
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: griefSensitiveColors.comfort[300],
                                    color: griefSensitiveColors.comfort[600]
                                  }}
                                >
                                  {getRoleDisplayName(member.role)}
                                </Badge>
                                {member.role === 'primary' && (
                                  <Badge
                                    style={{
                                      backgroundColor: griefSensitiveColors.primary[100],
                                      color: griefSensitiveColors.primary[700],
                                      border: `1px solid ${griefSensitiveColors.primary[300]}`
                                    }}
                                  >
                                    Family Lead
                                  </Badge>
                                )}
                                {member.needsSupport && (
                                  <Badge
                                    className="animate-pulse"
                                    style={{
                                      backgroundColor: griefSensitiveColors.warning[500],
                                      color: 'white'
                                    }}
                                  >
                                    Needs Support
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: griefSensitiveColors.peace[600] }}>
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {member.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {getTimeSince(member.lastActive)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {member.memoriesShared} memories
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="h-3 w-3" />
                                  {member.aiInteractions} conversations
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.needsSupport && (
                              <Button
                                size="sm"
                                style={{
                                  backgroundColor: griefSensitiveColors.hope[500],
                                  color: 'white'
                                }}
                              >
                                <Heart className="h-4 w-4 mr-2" />
                                Provide Support
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              style={{
                                borderColor: griefSensitiveColors.primary[300],
                                color: griefSensitiveColors.primary[600]
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Family Contact Information */}
                    <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: griefSensitiveColors.peace[50] }}>
                      <h5 
                        className="text-sm font-medium mb-3 flex items-center gap-2"
                        style={{ color: griefSensitiveColors.peace[700] }}
                      >
                        <Shield className="h-4 w-4" />
                        Family Contact Information
                      </h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {family.location && (
                          <div className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[600] }}>
                            <MapPin className="h-4 w-4" />
                            <span>{family.location}</span>
                          </div>
                        )}
                        {family.phoneNumber && (
                          <div className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[600] }}>
                            <Phone className="h-4 w-4" />
                            <span>{family.phoneNumber}</span>
                          </div>
                        )}
                        {family.emergencyContact && (
                          <div className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[600] }}>
                            <AlertTriangle className="h-4 w-4" />
                            <span>Emergency: {family.emergencyContact}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2" style={{ color: griefSensitiveColors.peace[600] }}>
                          <Calendar className="h-4 w-4" />
                          <span>Joined {formatDate(family.joinedDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {filteredFamilies.length === 0 && (
        <div className="text-center py-12">
          <Users 
            className="h-12 w-12 mx-auto mb-4" 
            style={{ color: griefSensitiveColors.peace[400] }} 
          />
          <h3 
            className="text-lg font-medium mb-2"
            style={{ color: griefSensitiveColors.peace[700] }}
          >
            No families found
          </h3>
          <p style={{ color: griefSensitiveColors.peace[500] }}>
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  )
}