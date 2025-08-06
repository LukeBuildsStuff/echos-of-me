'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { DateInput } from '@/components/ui/date-input'

interface FamilyMember {
  name: string
  relationship: string
  birthday?: string
  memorial_date?: string
}

interface InlineEditableFamilyMemberProps {
  member: FamilyMember
  onSave: (updatedMember: FamilyMember) => Promise<boolean>
  onDelete?: () => Promise<boolean>
  isNew?: boolean
  className?: string
}

const relationshipOptions = [
  { value: 'daughter', label: 'Daughter', category: 'children' },
  { value: 'son', label: 'Son', category: 'children' },
  { value: 'spouse', label: 'Spouse', category: 'partner' },
  { value: 'partner', label: 'Partner', category: 'partner' },
  { value: 'mother', label: 'Mother', category: 'parents' },
  { value: 'father', label: 'Father', category: 'parents' },
  { value: 'sister', label: 'Sister', category: 'siblings' },
  { value: 'brother', label: 'Brother', category: 'siblings' },
  { value: 'grandmother', label: 'Grandmother', category: 'grandparents' },
  { value: 'grandfather', label: 'Grandfather', category: 'grandparents' },
  { value: 'granddaughter', label: 'Granddaughter', category: 'grandchildren' },
  { value: 'grandson', label: 'Grandson', category: 'grandchildren' },
  { value: 'niece', label: 'Niece', category: 'extended' },
  { value: 'nephew', label: 'Nephew', category: 'extended' },
  { value: 'best friend', label: 'Best Friend', category: 'friends' },
  { value: 'close friend', label: 'Close Friend', category: 'friends' },
  { value: 'mentor', label: 'Mentor', category: 'other' },
  { value: 'other', label: 'Other', category: 'other' }
]

// Relationships that may show memorial date field
const memorialEligibleRelationships = [
  'mother', 'father', 'grandmother', 'grandfather', 'spouse', 'partner', 
  'sister', 'brother', 'best friend', 'close friend', 'mentor'
]

export default function InlineEditableFamilyMember({ 
  member, 
  onSave, 
  onDelete, 
  isNew = false,
  className = ''
}: InlineEditableFamilyMemberProps) {
  const [isEditing, setIsEditing] = useState(isNew)
  const [editData, setEditData] = useState<FamilyMember>(member)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!isEditing || isNew) return

    const timeoutId = setTimeout(async () => {
      if (editData.name.trim() && editData.relationship && 
          (editData.name !== member.name || editData.relationship !== member.relationship ||
           editData.birthday !== member.birthday || editData.memorial_date !== member.memorial_date)) {
        
        setSaveStatus('saving')
        try {
          const success = await onSave(editData)
          setSaveStatus(success ? 'saved' : 'error')
          if (success) {
            setTimeout(() => setSaveStatus('idle'), 2000)
          }
        } catch (error) {
          setSaveStatus('error')
        }
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [editData, isEditing, member, onSave, isNew])

  const handleSave = async () => {
    if (!editData.name.trim() || !editData.relationship) {
      setSaveStatus('error')
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')
    try {
      const success = await onSave(editData)
      if (success) {
        setIsEditing(false)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData(member)
    setIsEditing(false)
    setSaveStatus('idle')
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    if (confirm(`Are you sure you want to remove ${member.name} from your family profile?`)) {
      setIsSaving(true)
      try {
        const success = await onDelete()
        if (!success) {
          setSaveStatus('error')
        }
      } catch (error) {
        setSaveStatus('error')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const getRelationshipCategory = (relationship: string) => {
    return relationshipOptions.find(opt => opt.value === relationship)?.category || 'other'
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      children: 'from-hope-50 to-hope-100 border-hope-200',
      partner: 'from-comfort-50 to-comfort-100 border-comfort-200',
      parents: 'from-memory-50 to-memory-100 border-memory-200',
      siblings: 'from-peace-50 to-peace-100 border-peace-200',
      grandparents: 'from-warmth-50 to-warmth-100 border-warmth-200',
      grandchildren: 'from-hope-50 to-hope-100 border-hope-200',
      extended: 'from-grace-50 to-grace-100 border-grace-200',
      friends: 'from-joy-50 to-joy-100 border-joy-200',
      other: 'from-peace-50 to-peace-100 border-peace-200'
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  if (!isEditing) {
    const category = getRelationshipCategory(member.relationship)
    const categoryColor = getCategoryColor(category)
    
    return (
      <Card className={`bg-gradient-to-r ${categoryColor} hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer group ${className}`}
            onClick={() => setIsEditing(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setIsEditing(true)
              }
            }}
            aria-label={`Click to edit ${member.name}'s information`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-gentle text-peace-800 text-lg group-hover:text-hope-700 transition-colors">
                  {member.name}
                </h3>
                {member.memorial_date && (
                  <span className="text-peace-400" title="Memorial date recorded">🕊️</span>
                )}
                {/* Edit indicator that shows on hover */}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-hope-500 text-sm font-supportive">
                  Click to edit
                </span>
              </div>
              <div className="text-sm text-peace-600 capitalize bg-white/60 inline-block px-3 py-1 rounded-full group-hover:bg-white/80 transition-colors">
                {member.relationship}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === 'saved' && (
                <span className="text-hope-600 text-sm animate-fade-in">✓ Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-600 text-sm animate-fade-in">⚠ Error</span>
              )}
              {/* Enhanced edit button - more prominent */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
                className="text-hope-600 hover:text-hope-700 hover:bg-hope-100 p-3 text-lg opacity-100 transition-all min-h-[44px] min-w-[44px] border border-hope-200 hover:border-hope-400 bg-white/80 hover:bg-white shadow-sm hover:shadow-md"
                disabled={isSaving}
                aria-label={`Edit ${member.name}'s information`}
                title="Edit this family member"
              >
                ✏️
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-100 p-3 text-lg opacity-100 transition-all min-h-[44px] min-w-[44px] border border-red-200 hover:border-red-400 bg-white/80 hover:bg-white shadow-sm hover:shadow-md"
                  disabled={isSaving}
                  aria-label={`Remove ${member.name} from family profile`}
                  title="Remove this family member"
                >
                  🗑️
                </Button>
              )}
            </div>
          </div>
          
          {(member.birthday || member.memorial_date) && (
            <div className="space-y-2 mt-3 pt-3 border-t border-white/50">
              {member.birthday && (
                <div className="flex items-center gap-2 text-sm text-peace-600">
                  <span>🎂</span>
                  <span>Birthday: {new Date(member.birthday).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</span>
                </div>
              )}
              {member.memorial_date && (
                <div className="flex items-center gap-2 text-sm text-peace-600">
                  <span>🕊️</span>
                  <span>Memorial: {new Date(member.memorial_date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-gradient-to-r from-white to-hope-50 border-2 border-hope-300 shadow-md ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Name and Relationship Row */}
          <div className="flex gap-3">
            <Input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="flex-1 bg-white border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100"
              placeholder="Name"
              required
            />
            <Select
              value={editData.relationship}
              onValueChange={(value) => setEditData({ ...editData, relationship: value })}
            >
              <SelectTrigger className="flex-1 border-2 border-hope-200 rounded-embrace bg-white">
                <SelectValue placeholder="Relationship" />
              </SelectTrigger>
              <SelectContent>
                {relationshipOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Birthday Field */}
            <DateInput
              label="Birthday (optional)"
              value={editData.birthday || ''}
              onChange={(date) => setEditData({ ...editData, birthday: date })}
              placeholder="Select birthday"
              className="rounded-embrace"
            />
            
            {/* Memorial Date Field - Show for eligible relationships */}
            {memorialEligibleRelationships.includes(editData.relationship) && (
              <div>
                <DateInput
                  label="Memorial date (optional)"
                  value={editData.memorial_date || ''}
                  onChange={(date) => setEditData({ ...editData, memorial_date: date })}
                  placeholder="Select memorial date"
                  className="rounded-embrace"
                  maxDate="" // No max date restriction for memorial dates
                />
                <p className="text-xs text-peace-500 mt-1 font-supportive">
                  Only if they have passed away
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !editData.name.trim() || !editData.relationship}
              className="bg-hope-500 hover:bg-hope-600 text-white px-4 py-2"
            >
              {isSaving ? 'Saving...' : isNew ? 'Add Person' : 'Save Changes'}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving}
              className="border-peace-300 text-peace-700 hover:bg-peace-50 px-4 py-2"
            >
              Cancel
            </Button>
            {saveStatus === 'saving' && (
              <span className="flex items-center text-hope-600 text-sm">
                <span className="animate-spin mr-2">⟳</span> Auto-saving...
              </span>
            )}
            {saveStatus === 'saved' && !isNew && (
              <span className="flex items-center text-hope-600 text-sm animate-fade-in">
                ✓ Saved automatically
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center text-red-600 text-sm animate-fade-in">
                ⚠ Error saving changes
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}