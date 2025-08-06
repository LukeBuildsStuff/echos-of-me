'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import InlineEditableFamilyMember from './InlineEditableFamilyMember'

interface FamilyMember {
  name: string
  relationship: string
  birthday?: string
  memorial_date?: string
}

interface GroupedFamilyViewProps {
  familyMembers: FamilyMember[]
  onUpdateMember: (originalMember: FamilyMember, updatedMember: FamilyMember) => Promise<boolean>
  onDeleteMember: (member: FamilyMember) => Promise<boolean>
  onAddMember: () => void
  className?: string
}

const relationshipGroups = {
  children: {
    title: 'Children',
    icon: '👶',
    description: 'Your sons and daughters',
    relationships: ['daughter', 'son'],
    color: 'from-hope-500 to-comfort-500'
  },
  partner: {
    title: 'Partner',
    icon: '💑',
    description: 'Your spouse or life partner',
    relationships: ['spouse', 'partner'],
    color: 'from-comfort-500 to-memory-500'
  },
  parents: {
    title: 'Parents',
    icon: '👨‍👩‍👧‍👦',
    description: 'Your mother and father',
    relationships: ['mother', 'father'],
    color: 'from-memory-500 to-warmth-500'
  },
  siblings: {
    title: 'Siblings',
    icon: '👫',
    description: 'Your brothers and sisters',
    relationships: ['sister', 'brother'],
    color: 'from-peace-500 to-grace-500'
  },
  grandparents: {
    title: 'Grandparents',
    icon: '👴👵',
    description: 'Your grandmothers and grandfathers',
    relationships: ['grandmother', 'grandfather'],
    color: 'from-warmth-500 to-memory-500'
  },
  grandchildren: {
    title: 'Grandchildren',
    icon: '👶',
    description: 'Your grandsons and granddaughters',
    relationships: ['granddaughter', 'grandson'],
    color: 'from-hope-500 to-joy-500'
  },
  extended: {
    title: 'Extended Family',
    icon: '👨‍👩‍👧',
    description: 'Aunts, uncles, nieces, and nephews',
    relationships: ['niece', 'nephew'],
    color: 'from-grace-500 to-peace-500'
  },
  friends: {
    title: 'Close Friends',
    icon: '🤝',
    description: 'Your chosen family',
    relationships: ['best friend', 'close friend'],
    color: 'from-joy-500 to-hope-500'
  },
  other: {
    title: 'Others',
    icon: '🌟',
    description: 'Mentors and other important people',
    relationships: ['mentor', 'other'],
    color: 'from-peace-500 to-comfort-500'
  }
}

export default function GroupedFamilyView({
  familyMembers,
  onUpdateMember,
  onDeleteMember,
  onAddMember,
  className = ''
}: GroupedFamilyViewProps) {
  // Expand all groups that have members by default to ensure edit controls are visible
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(Object.keys(relationshipGroups)) // Default all groups expanded for better discoverability
  )

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const groupedMembers = familyMembers.reduce((groups, member) => {
    let groupKey = 'other'
    
    for (const [key, group] of Object.entries(relationshipGroups)) {
      if (group.relationships.includes(member.relationship)) {
        groupKey = key
        break
      }
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(member)
    
    return groups
  }, {} as Record<string, FamilyMember[]>)

  // Sort members within each group by name
  Object.values(groupedMembers).forEach(group => {
    group.sort((a, b) => a.name.localeCompare(b.name))
  })

  const handleUpdateMember = async (originalMember: FamilyMember, updatedMember: FamilyMember) => {
    return await onUpdateMember(originalMember, updatedMember)
  }

  const handleDeleteMember = async (member: FamilyMember) => {
    return await onDeleteMember(member)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-gentle text-peace-800">Your Family Members</h3>
          <p className="text-sm text-peace-600 font-compassionate mt-1">
            💡 Click on any family member card OR use the ✏️ edit buttons to modify their information
          </p>
        </div>
        <Button
          onClick={onAddMember}
          className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white px-6 py-2 rounded-embrace font-supportive shadow-md hover:shadow-lg transition-all duration-200"
        >
          + Add Family Member
        </Button>
      </div>

      {/* Empty State */}
      {familyMembers.length === 0 && (
        <Card className="bg-gradient-to-r from-comfort-50 to-hope-50 border border-peace-200">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="text-xl font-gentle text-peace-800 mb-2">
              Your Family Story Awaits
            </h3>
            <p className="text-peace-600 font-compassionate mb-4 max-w-md mx-auto">
              Add the important people in your life to create more meaningful and personalized conversations
            </p>
            <Button
              onClick={onAddMember}
              className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white px-8 py-3 rounded-embrace font-supportive"
            >
              Add Your First Family Member
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped Family Members */}
      {Object.entries(relationshipGroups).map(([groupKey, groupInfo]) => {
        const members = groupedMembers[groupKey] || []
        if (members.length === 0) return null

        const isExpanded = expandedGroups.has(groupKey)

        return (
          <Card key={groupKey} className="bg-white border border-peace-200 shadow-sm">
            <CardHeader 
              className="cursor-pointer hover:bg-peace-50 transition-colors duration-200 pb-3 focus-within:ring-2 focus-within:ring-hope-200 focus-within:ring-offset-2 rounded-t-sanctuary"
              onClick={() => toggleGroup(groupKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleGroup(groupKey)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${groupInfo.title} section with ${members.length} member${members.length !== 1 ? 's' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl p-2 rounded-full bg-gradient-to-r ${groupInfo.color} bg-opacity-20`}>
                    {groupInfo.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-gentle text-peace-800 flex items-center gap-2">
                      {groupInfo.title}
                      <span className="text-sm font-normal bg-peace-100 text-peace-600 px-2 py-1 rounded-full">
                        {members.length}
                      </span>
                    </CardTitle>
                    <p className="text-sm text-peace-600 font-supportive mt-1">
                      {groupInfo.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-peace-500 hover:text-peace-700 p-2 transform transition-transform duration-200"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${groupInfo.title} section`}
                  aria-expanded={isExpanded}
                >
                  ▼
                </Button>
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="pt-0 pb-4 animate-fade-in">
                <div className="space-y-3">
                  {members.map((member, index) => (
                    <InlineEditableFamilyMember
                      key={`${member.name}-${member.relationship}-${index}`}
                      member={member}
                      onSave={(updatedMember) => handleUpdateMember(member, updatedMember)}
                      onDelete={() => handleDeleteMember(member)}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}