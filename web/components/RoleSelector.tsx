'use client'

import { useState } from 'react'
import { FamilyRole } from '@/lib/family-role-questions'

interface RoleSelectorProps {
  onComplete: (profile: UserRoleProfile) => void
  initialProfile?: Partial<UserRoleProfile>
}

export interface UserRoleProfile {
  primaryRole: FamilyRole
  secondaryRoles: FamilyRole[]
  name?: string
  birthday?: string
  childrenAges?: number[]
  importantPeople?: Array<{
    name: string
    relationship: string
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

export default function RoleSelector({ onComplete, initialProfile }: RoleSelectorProps) {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<Partial<UserRoleProfile>>(initialProfile || {})
  const [childCount, setChildCount] = useState(0)
  const [tempChildAges, setTempChildAges] = useState<string[]>([])
  const [importantPeople, setImportantPeople] = useState<Array<{name: string, relationship: string}>>([{name: '', relationship: ''}])

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
    // Convert child ages from strings to numbers
    const childAges = tempChildAges
      .map(age => parseInt(age))
      .filter(age => !isNaN(age))

    setProfile({
      ...profile,
      childrenAges: childAges.length > 0 ? childAges : undefined
    })
    setStep(4)
  }

  const handleComplete = () => {
    if (profile.primaryRole) {
      // Filter out empty important people entries
      const filteredImportantPeople = importantPeople.filter(person => 
        person.name.trim() && person.relationship.trim()
      )
      
      onComplete({
        primaryRole: profile.primaryRole,
        secondaryRoles: profile.secondaryRoles || [],
        name: profile.name,
        birthday: profile.birthday,
        childrenAges: profile.childrenAges,
        importantPeople: filteredImportantPeople.length > 0 ? filteredImportantPeople : undefined,
        significantEvents: profile.significantEvents,
        culturalBackground: profile.culturalBackground
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Step 1: Primary Role Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Who Are You Preserving Your Legacy For?</h2>
            <p className="text-gray-600">Select your primary relationship to personalize your experience</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(roleDescriptions).map(([role, info]) => (
              <button
                key={role}
                onClick={() => handlePrimaryRoleSelect(role as FamilyRole)}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-start space-x-4">
                  <span className="text-4xl">{info.icon}</span>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{info.title}</h3>
                    <p className="text-gray-600">{info.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Secondary Roles */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">You Wear Many Hats</h2>
            <p className="text-gray-600">Select any additional roles that apply to you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(roleDescriptions)
              .filter(([role]) => role !== profile.primaryRole)
              .map(([role, info]) => (
                <label
                  key={role}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer flex items-start space-x-3"
                >
                  <input
                    type="checkbox"
                    checked={profile.secondaryRoles?.includes(role as FamilyRole) || false}
                    onChange={() => handleSecondaryRoleToggle(role as FamilyRole)}
                    className="mt-1"
                  />
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h3 className="font-semibold">{info.title}</h3>
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </div>
                  </div>
                </label>
              ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Personal Information */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Tell Us About Yourself</h2>
            <p className="text-gray-600">This helps us personalize your legacy preservation</p>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                What name would you like to be remembered by?
              </label>
              <input
                type="text"
                value={profile.name || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  name: e.target.value
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Your preferred name"
              />
            </div>

            {/* Birthday */}
            <div>
              <label className="block text-sm font-medium mb-2">
                When is your birthday?
              </label>
              <input
                type="date"
                value={profile.birthday || ''}
                onChange={(e) => setProfile({
                  ...profile,
                  birthday: e.target.value
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Children Information */}
            {(profile.primaryRole === 'parent' || profile.primaryRole === 'grandparent') && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  How many children do you have?
                </label>
                <select
                  value={childCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value)
                    setChildCount(count)
                    setTempChildAges(new Array(count).fill(''))
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={0}>Select number of children</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>

                {childCount > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-600">Ages of your children:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {tempChildAges.map((age, index) => (
                        <input
                          key={index}
                          type="number"
                          value={age}
                          onChange={(e) => {
                            const newAges = [...tempChildAges]
                            newAges[index] = e.target.value
                            setTempChildAges(newAges)
                          }}
                          placeholder={`Child ${index + 1}`}
                          className="px-3 py-1 border border-gray-300 rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Important People */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Who are the most important people in your life?
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Tell us about the people your legacy will touch most deeply
              </p>
              {importantPeople.map((person, index) => (
                <div key={index} className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={person.name}
                    onChange={(e) => {
                      const updated = [...importantPeople]
                      updated[index].name = e.target.value
                      setImportantPeople(updated)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={person.relationship}
                    onChange={(e) => {
                      const updated = [...importantPeople]
                      updated[index].relationship = e.target.value
                      setImportantPeople(updated)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Relationship (e.g., daughter, son, spouse)"
                  />
                  {importantPeople.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = importantPeople.filter((_, i) => i !== index)
                        setImportantPeople(updated)
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setImportantPeople([...importantPeople, {name: '', relationship: ''}])}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add another person
              </button>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleRelationshipDetails}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Your Legacy Profile</h2>
            <p className="text-gray-600">We'll use this to ask the most meaningful questions</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="space-y-4">
              {profile.name && (
                <div>
                  <span className="font-semibold">Name:</span>{' '}
                  {profile.name}
                </div>
              )}

              {profile.birthday && (
                <div>
                  <span className="font-semibold">Birthday:</span>{' '}
                  {new Date(profile.birthday).toLocaleDateString()}
                </div>
              )}

              <div>
                <span className="font-semibold">Primary Role:</span>{' '}
                {roleDescriptions[profile.primaryRole!].title}
              </div>
              
              {profile.secondaryRoles && profile.secondaryRoles.length > 0 && (
                <div>
                  <span className="font-semibold">Also:</span>{' '}
                  {profile.secondaryRoles.map(role => roleDescriptions[role].title).join(', ')}
                </div>
              )}

              {profile.childrenAges && profile.childrenAges.length > 0 && (
                <div>
                  <span className="font-semibold">Children ages:</span>{' '}
                  {profile.childrenAges.join(', ')}
                </div>
              )}

              {importantPeople.filter(p => p.name.trim() && p.relationship.trim()).length > 0 && (
                <div>
                  <span className="font-semibold">Important people:</span>
                  <div className="mt-2 ml-4">
                    {importantPeople
                      .filter(p => p.name.trim() && p.relationship.trim())
                      .map((person, index) => (
                        <div key={index} className="text-gray-700">
                          {person.name} ({person.relationship})
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleComplete}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Start Preserving Your Legacy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}