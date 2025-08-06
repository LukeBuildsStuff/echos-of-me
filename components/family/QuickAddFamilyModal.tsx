'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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

interface QuickAddFamilyModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (member: FamilyMember) => Promise<boolean>
}

const relationshipCategories = {
  immediate: {
    title: 'Immediate Family',
    icon: '💝',
    relationships: [
      { value: 'daughter', label: 'Daughter' },
      { value: 'son', label: 'Son' },
      { value: 'spouse', label: 'Spouse' },
      { value: 'partner', label: 'Partner' },
      { value: 'mother', label: 'Mother' },
      { value: 'father', label: 'Father' }
    ]
  },
  siblings: {
    title: 'Siblings',
    icon: '👫',
    relationships: [
      { value: 'sister', label: 'Sister' },
      { value: 'brother', label: 'Brother' }
    ]
  },
  grandparents: {
    title: 'Grandparents & Grandchildren',
    icon: '👴👵',
    relationships: [
      { value: 'grandmother', label: 'Grandmother' },
      { value: 'grandfather', label: 'Grandfather' },
      { value: 'granddaughter', label: 'Granddaughter' },
      { value: 'grandson', label: 'Grandson' }
    ]
  },
  extended: {
    title: 'Extended Family',
    icon: '👨‍👩‍👧',
    relationships: [
      { value: 'niece', label: 'Niece' },
      { value: 'nephew', label: 'Nephew' }
    ]
  },
  friends: {
    title: 'Friends & Others',
    icon: '🤝',
    relationships: [
      { value: 'best friend', label: 'Best Friend' },
      { value: 'close friend', label: 'Close Friend' },
      { value: 'mentor', label: 'Mentor' },
      { value: 'other', label: 'Other' }
    ]
  }
}

// Relationships that may show memorial date field
const memorialEligibleRelationships = [
  'mother', 'father', 'grandmother', 'grandfather', 'spouse', 'partner', 
  'sister', 'brother', 'best friend', 'close friend', 'mentor'
]

export default function QuickAddFamilyModal({ isOpen, onClose, onAdd }: QuickAddFamilyModalProps) {
  const [step, setStep] = useState<'category' | 'details'>('category')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [formData, setFormData] = useState<FamilyMember>({
    name: '',
    relationship: '',
    birthday: '',
    memorial_date: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setStep('category')
    setSelectedCategory('')
    setFormData({
      name: '',
      relationship: '',
      birthday: '',
      memorial_date: ''
    })
    setIsSubmitting(false)
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCategorySelect = (categoryKey: string) => {
    setSelectedCategory(categoryKey)
    setStep('details')
  }

  const handleRelationshipSelect = (relationship: string) => {
    setFormData({ ...formData, relationship })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.relationship) {
      setError('Please provide a name and relationship')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const memberToAdd = {
        name: formData.name.trim(),
        relationship: formData.relationship,
        ...(formData.birthday && { birthday: formData.birthday }),
        ...(formData.memorial_date && { memorial_date: formData.memorial_date })
      }

      const success = await onAdd(memberToAdd)
      
      if (success) {
        handleClose()
      } else {
        setError('Failed to add family member. Please try again.')
      }
    } catch (error) {
      setError('An error occurred while adding the family member.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentCategory = selectedCategory ? relationshipCategories[selectedCategory as keyof typeof relationshipCategories] : null

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogContent className="max-w-md w-full bg-white rounded-sanctuary shadow-xl border border-peace-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-gentle text-peace-800 flex items-center gap-2">
            {step === 'category' ? '👨‍👩‍👧‍👦' : currentCategory?.icon} Add Family Member
          </DialogTitle>
          <DialogDescription className="text-comfort text-peace-600 font-supportive">
            {step === 'category' 
              ? 'Choose the relationship category to get started'
              : `Add a new ${currentCategory?.title.toLowerCase()} member`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Category Selection */}
        {step === 'category' && (
          <div className="space-y-3 mt-4">
            {Object.entries(relationshipCategories).map(([key, category]) => (
              <Card
                key={key}
                onClick={() => handleCategorySelect(key)}
                className="cursor-pointer bg-gradient-to-r from-white to-hope-50 hover:from-hope-50 hover:to-comfort-50 border border-peace-200 hover:border-hope-300 transition-all duration-200 hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="font-gentle text-peace-800">{category.title}</h3>
                      <p className="text-sm text-peace-600 font-supportive">
                        {category.relationships.length} relationship{category.relationships.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <span className="ml-auto text-peace-400">→</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Details Form */}
        {step === 'details' && currentCategory && (
          <div className="space-y-4 mt-4">
            {/* Relationship Selection */}
            <div>
              <label className="block text-sm font-medium text-peace-700 mb-2">
                Relationship
              </label>
              <Select
                value={formData.relationship}
                onValueChange={handleRelationshipSelect}
              >
                <SelectTrigger className="w-full border-2 border-hope-200 rounded-embrace bg-white">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {currentCategory.relationships.map((rel) => (
                    <SelectItem key={rel.value} value={rel.value}>
                      {rel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-peace-700 mb-2">
                Name
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100"
                placeholder="Enter their name"
                required
              />
            </div>

            {/* Optional Date Fields */}
            <div className="grid grid-cols-1 gap-4">
              {/* Birthday */}
              <DateInput
                label="Birthday (optional)"
                value={formData.birthday}
                onChange={(date) => setFormData({ ...formData, birthday: date })}
                placeholder="Select birthday"
                className="rounded-embrace"
              />

              {/* Memorial Date - Only for eligible relationships */}
              {memorialEligibleRelationships.includes(formData.relationship) && (
                <div>
                  <DateInput
                    label="Memorial Date (optional)"
                    value={formData.memorial_date}
                    onChange={(date) => setFormData({ ...formData, memorial_date: date })}
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

            {/* Error Display */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-embrace p-3">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setStep('category')}
                variant="outline"
                disabled={isSubmitting}
                className="flex-1 border-peace-300 text-peace-700 hover:bg-peace-50"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name.trim() || !formData.relationship}
                className="flex-1 bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white"
              >
                {isSubmitting ? 'Adding...' : 'Add Family Member'}
              </Button>
            </div>
          </div>
        )}

        {/* Cancel Button for Category Step */}
        {step === 'category' && (
          <div className="flex justify-end pt-4 border-t border-peace-100 mt-6">
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-peace-300 text-peace-700 hover:bg-peace-50"
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}