'use client'

import { useState } from 'react'
import { FamilyRole } from '@/lib/family-role-questions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-input'

interface RoleSelectorProps {
  onComplete: (profile: UserRoleProfile) => void
  onCancel?: () => void
  initialProfile?: Partial<UserRoleProfile>
}

export interface UserRoleProfile {
  primaryRole: FamilyRole
  secondaryRoles: FamilyRole[]
  name?: string
  birthday?: string
  childrenBirthdays?: string[]
  importantPeople?: Array<{
    name: string
    relationship: string
    birthday?: string
    memorial_date?: string
  }>
  significantEvents?: string[]
  culturalBackground?: string[]
}

const roleDescriptions: Record<FamilyRole, { title: string; description: string; icon: string }> = {
  parent: {
    title: 'Parent',
    description: 'Preserve your wisdom, love, and guidance for your children',
    icon: '👨‍👩‍👧‍👦'
  },
  grandparent: {
    title: 'Grandparent',
    description: 'Share generational wisdom and family history',
    icon: '👴👵'
  },
  spouse: {
    title: 'Spouse/Partner',
    description: 'Capture the intimate knowledge only you possess',
    icon: '💑'
  },
  sibling: {
    title: 'Sibling',
    description: 'Preserve shared childhood memories and bonds',
    icon: '👫'
  },
  aunt_uncle: {
    title: 'Aunt/Uncle',
    description: 'Share your unique supportive perspective',
    icon: '👨‍👩‍👧'
  },
  mentor: {
    title: 'Mentor/Teacher',
    description: 'Pass on guidance and life lessons',
    icon: '🎓'
  },
  close_friend: {
    title: 'Close Friend',
    description: 'Preserve the chosen family bond',
    icon: '🤝'
  }
}

export default function RoleSelector({ onComplete, onCancel, initialProfile }: RoleSelectorProps) {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<Partial<UserRoleProfile>>(initialProfile || {})
  const [childCount, setChildCount] = useState(0)
  const [tempChildBirthdays, setTempChildBirthdays] = useState<string[]>([])
  const [importantPeople, setImportantPeople] = useState<Array<{name: string, relationship: string, birthday?: string, memorial_date?: string}>>([{name: '', relationship: ''}])

  const handlePrimaryRoleSelect = (role: FamilyRole) => {
    setProfile({ ...profile, primaryRole: role, secondaryRoles: [] })
    setStep(2)
  }

  const handleSecondaryRoleToggle = (role: FamilyRole) => {
    const current = profile.secondaryRoles || []
    if (current.includes(role)) {
      setProfile({
        ...profile,
        secondaryRoles: current.filter(r => r !== role)
      })
    } else {
      setProfile({
        ...profile,
        secondaryRoles: [...current, role]
      })
    }
  }

  const handleRelationshipDetails = () => {
    // Filter out empty birthdays
    const childBirthdays = tempChildBirthdays
      .filter(birthday => birthday.trim() !== '')

    setProfile({
      ...profile,
      childrenBirthdays: childBirthdays.length > 0 ? childBirthdays : undefined
    })
    setStep(4)
  }

  // Helper function to update person fields
  const updatePersonField = (index: number, field: string, value: string) => {
    const updated = [...importantPeople]
    updated[index] = { ...updated[index], [field]: value }
    setImportantPeople(updated)
  }

  const handleComplete = () => {
    console.log('=== handleComplete called ===')
    
    if (!profile?.primaryRole) {
      alert('Please select a primary role first')
      return
    }

    // Simple, safe filtering with date fields
    const safeImportantPeople = []
    if (importantPeople && Array.isArray(importantPeople)) {
      for (const person of importantPeople) {
        if (person && person.name && person.relationship) {
          const personData: any = {
            name: person.name.trim(),
            relationship: person.relationship.trim()
          }
          
          // Add optional date fields if they exist
          if (person.birthday && person.birthday.trim()) {
            personData.birthday = person.birthday.trim()
          }
          if (person.memorial_date && person.memorial_date.trim()) {
            personData.memorial_date = person.memorial_date.trim()
          }
          
          safeImportantPeople.push(personData)
        }
      }
    }
    
    const completeProfile = {
      primaryRole: profile.primaryRole,
      secondaryRoles: profile.secondaryRoles || [],
      name: profile.name || '',
      birthday: profile.birthday || '',
      importantPeople: safeImportantPeople.length > 0 ? safeImportantPeople : []
    }
    
    console.log('Final profile to save:', completeProfile)
    onComplete(completeProfile)
  }

  return (
    <div className="min-h-screen bg-heaven-gradient py-12 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4">
        {/* Step 1: Primary Role Selection */}
        {step === 1 && (
          <div className="space-y-sanctuary">
            <div className="text-center mb-embrace">
              <div className="inline-block p-4 rounded-full bg-white/30 backdrop-blur-sm animate-float mb-4">
                <span className="text-5xl">💝</span>
              </div>
              <h2 className="text-4xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent mb-4">
                Who Are You Preserving Your Legacy For?
              </h2>
              <p className="text-lg text-peace-700 font-supportive max-w-2xl mx-auto">
                Select your primary relationship to personalize your meaningful journey
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(roleDescriptions).map(([role, info]) => (
                <Card
                  key={role}
                  onClick={() => handlePrimaryRoleSelect(role as FamilyRole)}
                  className="cursor-pointer bg-white/80 backdrop-blur-md border-0 shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                >
                  <CardContent className="p-sanctuary">
                    <div className="flex items-start space-x-embrace">
                      <span className="text-5xl group-hover:animate-float">{info.icon}</span>
                      <div>
                        <h3 className="text-xl font-gentle text-peace-800 mb-2">{info.title}</h3>
                        <p className="text-peace-600 font-supportive">{info.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Secondary Roles */}
        {step === 2 && (
          <div className="space-y-embrace">
            <div className="text-center mb-embrace">
              <div className="inline-block p-4 rounded-full bg-white/30 backdrop-blur-sm animate-float mb-4">
                <span className="text-5xl">🌟</span>
              </div>
              <h2 className="text-4xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent mb-4">
                You Wear Many Hats
              </h2>
              <p className="text-lg text-peace-700 font-supportive">
                Select any additional roles that define your loving relationships
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(roleDescriptions)
                .filter(([role]) => role !== profile.primaryRole)
                .map(([role, info]) => (
                  <Card
                    key={role}
                    onClick={() => handleSecondaryRoleToggle(role as FamilyRole)}
                    className={`cursor-pointer backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
                      profile.secondaryRoles?.includes(role as FamilyRole) 
                        ? 'bg-gradient-to-br from-hope-100/90 to-comfort-100/90 scale-105' 
                        : 'bg-white/80 hover:scale-105'
                    }`}
                  >
                    <CardContent className="p-comfort">
                      <div className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-embrace flex items-center justify-center mt-1 transition-all duration-300 ${
                          profile.secondaryRoles?.includes(role as FamilyRole)
                            ? 'bg-gradient-to-r from-hope-600 to-comfort-600'
                            : 'bg-peace-200'
                        }`}>
                          {profile.secondaryRoles?.includes(role as FamilyRole) && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-start space-x-3 flex-1">
                          <span className="text-3xl">{info.icon}</span>
                          <div>
                            <h3 className="font-gentle text-peace-800">{info.title}</h3>
                            <p className="text-sm text-peace-600 font-supportive">{info.description}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            <div className="flex justify-between mt-sanctuary">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="border-2 border-peace-300 text-peace-700 hover:bg-peace-50 rounded-embrace px-6 py-2 font-supportive"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-8 py-2 font-supportive"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Personal Information */}
        {step === 3 && (
          <div className="space-y-embrace">
            <div className="text-center mb-embrace">
              <div className="inline-block p-4 rounded-full bg-white/30 backdrop-blur-sm animate-float mb-4">
                <span className="text-5xl">✨</span>
              </div>
              <h2 className="text-4xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent mb-4">
                Tell Us About Yourself
              </h2>
              <p className="text-lg text-peace-700 font-supportive">
                Your story makes this legacy uniquely yours
              </p>
            </div>

            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl max-w-2xl mx-auto">
              <CardContent className="p-sanctuary space-y-embrace">
                {/* Name */}
                <div>
                  <label className="block text-peace-700 font-supportive mb-2">
                    What name would you like to be remembered by?
                  </label>
                  <input
                    type="text"
                    value={profile.name || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      name: e.target.value
                    })}
                    className="w-full px-comfort py-3 bg-white/50 backdrop-blur-sm border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate transition-all duration-300"
                    placeholder="Your preferred name"
                  />
                </div>

                {/* Birthday */}
                <DateInput
                  label="When is your birthday?"
                  value={profile.birthday || ''}
                  onChange={(date) => setProfile({
                    ...profile,
                    birthday: date
                  })}
                  placeholder="Select your birthday"
                  className="w-full font-compassionate"
                />

                {/* Important People */}
                <div>
                  <label className="block text-peace-700 font-supportive mb-2">
                    Who are the most important people in your life?
                  </label>
                  <p className="text-sm text-peace-600 mb-3 font-supportive">
                    Tell us about the souls your legacy will touch most deeply
                  </p>
                  {importantPeople.map((person, index) => (
                    <div key={index} className="border border-hope-100 rounded-embrace p-4 mb-4 bg-white/30 backdrop-blur-sm">
                      {/* Name and Relationship Row */}
                      <div className="flex gap-3 mb-4">
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) => updatePersonField(index, 'name', e.target.value)}
                          className="flex-1 px-comfort py-3 bg-white/50 backdrop-blur-sm border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate transition-all duration-300"
                          placeholder="Name"
                        />
                        <Select
                          value={person.relationship}
                          onValueChange={(value) => updatePersonField(index, 'relationship', value)}
                        >
                          <SelectTrigger className="flex-1 border-2 border-hope-200 rounded-embrace">
                            <SelectValue placeholder="Relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daughter">Daughter</SelectItem>
                            <SelectItem value="son">Son</SelectItem>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="partner">Partner</SelectItem>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="sister">Sister</SelectItem>
                            <SelectItem value="brother">Brother</SelectItem>
                            <SelectItem value="grandmother">Grandmother</SelectItem>
                            <SelectItem value="grandfather">Grandfather</SelectItem>
                            <SelectItem value="granddaughter">Granddaughter</SelectItem>
                            <SelectItem value="grandson">Grandson</SelectItem>
                            <SelectItem value="niece">Niece</SelectItem>
                            <SelectItem value="nephew">Nephew</SelectItem>
                            <SelectItem value="best friend">Best Friend</SelectItem>
                            <SelectItem value="close friend">Close Friend</SelectItem>
                            <SelectItem value="mentor">Mentor</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {importantPeople.length > 1 && (
                          <Button
                            onClick={() => {
                              const updated = importantPeople.filter((_, i) => i !== index)
                              setImportantPeople(updated)
                            }}
                            variant="ghost"
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-embrace"
                          >
                            ✕
                          </Button>
                        )}
                      </div>

                      {/* Date Fields Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Birthday Field */}
                        <div>
                          <Label htmlFor={`birthday-${index}`} className="text-xs text-peace-600 font-supportive mb-1 block">
                            Birthday (optional)
                          </Label>
                          <DateInput
                            value={person.birthday || ''}
                            onChange={(date) => updatePersonField(index, 'birthday', date)}
                            placeholder="Select birthday"
                            className="backdrop-blur-sm"
                          />
                        </div>
                        
                        {/* Memorial Date Field - Only show for appropriate relationships */}
                        {['mother', 'father', 'grandmother', 'grandfather', 'spouse', 'partner'].includes(person.relationship) && (
                          <div>
                            <Label htmlFor={`memorial-${index}`} className="text-xs text-peace-600 font-supportive mb-1 block">
                              Memorial date (optional)
                            </Label>
                            <DateInput
                              value={person.memorial_date || ''}
                              onChange={(date) => updatePersonField(index, 'memorial_date', date)}
                              placeholder="If applicable"
                              className="backdrop-blur-sm"
                              maxDate="" // No max date restriction for memorial dates
                            />
                            <p className="text-xs text-peace-500 mt-1 font-supportive">
                              Only if they have passed away
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setImportantPeople([...importantPeople, {name: '', relationship: ''}])}
                    className="text-hope-600 hover:text-hope-700 text-sm font-supportive transition-colors duration-300"
                  >
                    + Add another person
                  </button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between max-w-2xl mx-auto">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="border-2 border-peace-300 text-peace-700 hover:bg-peace-50 rounded-embrace px-6 py-2 font-supportive"
              >
                Back
              </Button>
              <Button
                onClick={handleRelationshipDetails}
                className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace px-8 py-2 font-supportive"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-embrace">
            <div className="text-center mb-embrace">
              <div className="inline-block p-4 rounded-full bg-white/30 backdrop-blur-sm animate-float mb-4">
                <span className="text-5xl">🌈</span>
              </div>
              <h2 className="text-4xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent mb-4">
                Your Legacy Profile
              </h2>
              <p className="text-lg text-peace-700 font-supportive">
                Ready to begin preserving your eternal wisdom
              </p>
            </div>

            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl max-w-2xl mx-auto">
              <CardContent className="p-sanctuary">
                <div className="space-y-4">
                  {profile.name && (
                    <div className="flex items-center gap-3">
                      <span className="text-hope-600">✨</span>
                      <span className="font-supportive text-peace-700">Name:</span>
                      <span className="font-compassionate text-peace-800">{profile.name}</span>
                    </div>
                  )}

                  {profile.birthday && (
                    <div className="flex items-center gap-3">
                      <span className="text-comfort-600">🎂</span>
                      <span className="font-supportive text-peace-700">Birthday:</span>
                      <span className="font-compassionate text-peace-800">
                        {new Date(profile.birthday).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-hope-600">💝</span>
                    <span className="font-supportive text-peace-700">Primary Role:</span>
                    <span className="font-compassionate text-peace-800">
                      {roleDescriptions[profile.primaryRole!].title}
                    </span>
                  </div>
                  
                  {profile.secondaryRoles && profile.secondaryRoles.length > 0 && (
                    <div className="flex items-start gap-3">
                      <span className="text-comfort-600 mt-1">🌟</span>
                      <span className="font-supportive text-peace-700">Also:</span>
                      <span className="font-compassionate text-peace-800">
                        {profile.secondaryRoles.map(role => roleDescriptions[role].title).join(', ')}
                      </span>
                    </div>
                  )}

                  {importantPeople.filter(p => p.name.trim() && p.relationship.trim()).length > 0 && (
                    <div className="mt-comfort pt-comfort border-t border-hope-100">
                      <div className="flex items-start gap-3">
                        <span className="text-memory-500 mt-1">💕</span>
                        <div>
                          <span className="font-supportive text-peace-700 block mb-2">
                            Important people in your life:
                          </span>
                          <div className="ml-4 space-y-3">
                            {importantPeople
                              .filter(p => p.name.trim() && p.relationship.trim())
                              .map((person, index) => (
                                <div key={index} className="text-peace-700 font-compassionate border-l-2 border-hope-200 pl-3">
                                  <div className="font-medium">
                                    {person.name} <span className="text-peace-500 font-supportive">({person.relationship})</span>
                                    {person.memorial_date && <span className="text-peace-400 ml-2">🕊️</span>}
                                  </div>
                                  {(person.birthday || person.memorial_date) && (
                                    <div className="text-xs text-peace-500 mt-1 space-y-1">
                                      {person.birthday && (
                                        <div>Birthday: {new Date(person.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                      )}
                                      {person.memorial_date && (
                                        <div>Memorial date: {new Date(person.memorial_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between max-w-2xl mx-auto">
              <Button
                onClick={() => setStep(3)}
                variant="outline"
                className="border-2 border-peace-300 text-peace-700 hover:bg-peace-50 rounded-embrace px-6 py-2 font-supportive"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  alert('Button clicked!') // Immediate feedback
                  try {
                    handleComplete()
                  } catch (error: any) {
                    alert('Error: ' + (error?.message || 'Unknown error'))
                  }
                }}
                className="bg-gradient-to-r from-green-500 to-hope-500 hover:from-green-600 hover:to-hope-600 text-white rounded-embrace px-sanctuary py-4 font-supportive text-lg hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
              >
                Start Preserving Your Legacy
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}