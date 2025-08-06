'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import GroupedFamilyView from '@/components/family/GroupedFamilyView'
import QuickAddFamilyModal from '@/components/family/QuickAddFamilyModal'

interface UserProfile {
  id: string
  email: string
  name: string
  created_at: string
  primary_role?: string
  children_birthdays?: string[]
  important_people?: Array<{
    name: string
    relationship: string
    birthday?: string
    memorial_date?: string
  }>
}

interface UserSettingsProps {
  onNavigateToRoleSetup?: () => void
}

export default function UserSettings({ onNavigateToRoleSetup }: UserSettingsProps = {}) {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false)
  const [familyOperationLoading, setFamilyOperationLoading] = useState(false)
  const [familyMessage, setFamilyMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  // Helper function to show family operation messages
  const showFamilyMessage = (type: 'success' | 'error', text: string) => {
    setFamilyMessage({ type, text })
    setTimeout(() => setFamilyMessage(null), 5000) // Clear after 5 seconds
  }

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/profile')
      
      if (!response.ok) {
        console.error('Profile API returned status:', response.status)
        // Create a minimal profile to allow family member management
        setProfile({
          important_people: []
        })
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Ensure important_people is always an array
        const profileData = {
          ...data.profile,
          important_people: data.profile.important_people || []
        }
        console.log('Loaded profile with family members:', profileData.important_people.length)
        setProfile(profileData)
        setEditName(profileData.name || '')
      } else {
        console.error('Failed to load profile:', data.error)
        // Create a minimal profile to allow family member management
        setProfile({
          important_people: []
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      // Create a minimal profile to allow family member management even on error
      setProfile({
        important_people: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!editName.trim()) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      })

      const data = await response.json()
      
      if (data.success) {
        setProfile(prev => prev ? { ...prev, name: editName.trim() } : null)
        setIsEditing(false)
      } else {
        alert('Failed to update profile: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Network error while saving profile')
    } finally {
      setIsSaving(false)
    }
  }

  const changePassword = async () => {
    setPasswordError('')

    // Validation
    if (!currentPassword) {
      setPasswordError('Current password is required')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Password changed successfully!')
        setIsChangingPassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordError('Network error while changing password')
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to refresh profile data after family member operations
  const refreshProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      const data = await response.json()
      
      if (data.success) {
        const profileData = {
          ...data.profile,
          important_people: data.profile.important_people || []
        }
        console.log('Refreshed profile with family members:', profileData.important_people.length)
        setProfile(profileData)
      }
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="text-lg">Loading your account settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center bg-gradient-to-br from-hope-50 to-comfort-50 rounded-sanctuary p-embrace border border-hope-200">
        <h1 className="text-3xl font-gentle text-hope-800 mb-2">⚙️ Account Settings</h1>
        <p className="text-comfort text-hope-700 max-w-2xl mx-auto">
          Manage your account information and preferences for your legacy preservation journey.
        </p>
      </div>

      {/* Account Information */}
      <Card className="bg-gradient-to-br from-white to-comfort-50 border border-peace-200">
        <CardHeader>
          <CardTitle className="text-xl font-compassionate text-peace-800">
            👤 Account Information
          </CardTitle>
          <CardDescription className="text-comfort text-peace-600">
            Your basic account details and profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-peace-700 mb-2">
              Email Address
            </label>
            <div className="bg-peace-50 border border-peace-200 rounded-embrace px-4 py-3 text-peace-600">
              {profile?.email}
            </div>
            <p className="text-xs text-peace-500 mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-peace-700 mb-2">
              Display Name
            </label>
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate"
                  placeholder="Your display name"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={saveProfile}
                    disabled={!editName.trim() || isSaving}
                    className="bg-hope-500 hover:bg-hope-600"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setEditName(profile?.name || '')
                    }}
                    disabled={isSaving}
                    className="border-peace-300 text-peace-700 hover:bg-peace-50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white border border-peace-200 rounded-embrace px-4 py-3">
                <span className="text-peace-800 font-compassionate">
                  {profile?.name || 'No name set'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-hope-600 hover:text-hope-700 hover:bg-hope-50"
                >
                  ✏️ Edit
                </Button>
              </div>
            )}
          </div>

          {/* Account created */}
          <div>
            <label className="block text-sm font-medium text-peace-700 mb-2">
              Member Since
            </label>
            <div className="bg-peace-50 border border-peace-200 rounded-embrace px-4 py-3 text-peace-600">
              {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="bg-gradient-to-br from-white to-comfort-50 border border-peace-200">
        <CardHeader>
          <CardTitle className="text-xl font-compassionate text-peace-800">
            🔒 Password & Security
          </CardTitle>
          <CardDescription className="text-comfort text-peace-600">
            Keep your account secure with a strong password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isChangingPassword ? (
            <div className="space-y-4">
              <p className="text-comfort text-peace-600">
                Your password was last updated when you created your account.
              </p>
              <Button
                onClick={() => setIsChangingPassword(true)}
                variant="outline"
                className="border-hope-300 text-hope-700 hover:bg-hope-50"
              >
                Change Password
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-peace-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100"
                  placeholder="Enter your current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-peace-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-peace-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100"
                  placeholder="Confirm your new password"
                />
              </div>
              {passwordError && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-embrace p-3">
                  {passwordError}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={changePassword}
                  disabled={isSaving}
                  className="bg-hope-500 hover:bg-hope-600"
                >
                  {isSaving ? 'Changing...' : 'Change Password'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false)
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordError('')
                  }}
                  disabled={isSaving}
                  className="border-peace-300 text-peace-700 hover:bg-peace-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Family Profile Section */}
      <Card className="bg-gradient-to-br from-white to-comfort-50 border border-peace-200">
        <CardHeader>
          <CardTitle className="text-xl font-compassionate text-peace-800">
            👥 Family Profile
          </CardTitle>
          <CardDescription className="text-comfort text-peace-600">
            Your family relationships help create personalized, meaningful conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Primary Role Section */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-hope-50 to-comfort-50 rounded-embrace border border-hope-200">
              <div>
                <span className="text-comfort text-peace-700">
                  Primary Role: <strong className="text-peace-800">{profile?.primary_role || 'Not set'}</strong>
                </span>
                <p className="text-xs text-peace-600 mt-1">
                  Your main relationship context for personalized questions
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (onNavigateToRoleSetup) {
                    onNavigateToRoleSetup()
                  } else {
                    window.location.href = '/dashboard#role-setup'
                    window.location.reload()
                  }
                }}
                className="text-hope-600 hover:text-hope-700 hover:bg-hope-50 px-4 py-2"
              >
                Update Role →
              </Button>
            </div>

            {/* Family Operation Status Messages */}
            {familyMessage && (
              <div className={`p-4 rounded-embrace border-2 ${
                familyMessage.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{familyMessage.type === 'success' ? '✅' : '❌'}</span>
                    <span className="font-compassionate">{familyMessage.text}</span>
                  </div>
                  <button
                    onClick={() => setFamilyMessage(null)}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded"
                    aria-label="Dismiss message"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Loading State for Family Operations */}
            {familyOperationLoading && (
              <div className="p-4 rounded-embrace border-2 border-hope-200 bg-hope-50">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-hope-600"></div>
                  <span className="text-hope-700 font-compassionate">Processing family member changes...</span>
                </div>
              </div>
            )}

            {/* Family Members Section */}
            {profile?.important_people && Array.isArray(profile.important_people) && profile.important_people.length > 0 ? (
              <div>
                <div className="text-xs text-gray-500 mb-2">
                  Debug: Showing {profile.important_people.length} family members
                </div>
                <GroupedFamilyView
                  familyMembers={profile.important_people}
                onUpdateMember={async (originalMember, updatedMember) => {
                  setFamilyOperationLoading(true)
                  setFamilyMessage(null)
                  
                  try {
                    const response = await fetch('/api/user/family-members', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        original: originalMember,
                        updated: updatedMember
                      })
                    })
                    
                    const data = await response.json()
                    if (data.success) {
                      console.log('Update API returned family members:', data.familyMembers.length)
                      // Update local state with proper immutability
                      setProfile(prev => {
                        if (!prev) {
                          // If profile doesn't exist yet, create a minimal one with family members
                          return {
                            important_people: [...(data.familyMembers || [])]
                          }
                        }
                        const updated = {
                          ...prev,
                          important_people: [...(data.familyMembers || [])]
                        }
                        console.log('Updated profile state with family members:', updated.important_people.length)
                        return updated
                      })
                      // Also refresh from server to ensure consistency
                      setTimeout(refreshProfile, 500)
                      showFamilyMessage('success', `Successfully updated ${updatedMember.name}`)
                      return true
                    } else {
                      console.error('Failed to update family member:', data.error)
                      showFamilyMessage('error', `Failed to update family member: ${data.error || 'Unknown error'}`)
                      return false
                    }
                  } catch (error) {
                    console.error('Error updating family member:', error)
                    showFamilyMessage('error', 'Network error while updating family member')
                    return false
                  } finally {
                    setFamilyOperationLoading(false)
                  }
                }}
                onDeleteMember={async (member) => {
                  setFamilyOperationLoading(true)
                  setFamilyMessage(null)
                  
                  try {
                    const response = await fetch('/api/user/family-members', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        member: member
                      })
                    })
                    
                    const data = await response.json()
                    if (data.success) {
                      console.log('Delete API returned family members:', data.familyMembers.length)
                      // Update local state with proper immutability
                      setProfile(prev => {
                        if (!prev) {
                          // If profile doesn't exist yet, create a minimal one with family members
                          return {
                            important_people: [...(data.familyMembers || [])]
                          }
                        }
                        const updated = {
                          ...prev,
                          important_people: [...(data.familyMembers || [])]
                        }
                        console.log('Updated profile state after delete:', updated.important_people.length)
                        return updated
                      })
                      // Also refresh from server to ensure consistency
                      setTimeout(refreshProfile, 500)
                      showFamilyMessage('success', `Successfully removed ${member.name}`)
                      return true
                    } else {
                      console.error('Failed to delete family member:', data.error)
                      showFamilyMessage('error', `Failed to remove family member: ${data.error || 'Unknown error'}`)
                      return false
                    }
                  } catch (error) {
                    console.error('Error deleting family member:', error)
                    showFamilyMessage('error', 'Network error while removing family member')
                    return false
                  } finally {
                    setFamilyOperationLoading(false)
                  }
                }}
                onAddMember={() => setShowAddFamilyModal(true)}
              />
              </div>
            ) : (
              <div className="text-center p-8 bg-gradient-to-r from-comfort-50 to-hope-50 rounded-embrace border border-peace-200">
                <div className="text-xs text-gray-500 mb-2">
                  Debug: No family members found. Profile loaded: {profile ? 'yes' : 'no'}, 
                  Important people: {profile?.important_people ? `array with ${Array.isArray(profile.important_people) ? profile.important_people.length : 'invalid'} items` : 'null/undefined'}
                </div>
                <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                <h3 className="text-lg font-gentle text-peace-800 mb-2">
                  Your Family Story Awaits
                </h3>
                <p className="text-peace-600 font-compassionate mb-4 max-w-md mx-auto">
                  Add the important people in your life to create more meaningful and personalized conversations
                </p>
                <Button
                  onClick={() => setShowAddFamilyModal(true)}
                  className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white px-6 py-3 rounded-embrace font-supportive"
                >
                  Add Your First Family Member
                </Button>
              </div>
            )}
            
            {/* Legacy: Show children count if available */}
            {profile?.children_birthdays && profile.children_birthdays.length > 0 && (
              <div className="text-comfort text-peace-600 text-sm bg-memory-50 p-3 rounded-embrace border border-memory-200">
                📊 Legacy data: {profile.children_birthdays.length} children's birthdays from previous setup
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Family Member Modal */}
      <QuickAddFamilyModal
        isOpen={showAddFamilyModal}
        onClose={() => setShowAddFamilyModal(false)}
        onAdd={async (newMember) => {
          setFamilyOperationLoading(true)
          setFamilyMessage(null)
          
          try {
            const response = await fetch('/api/user/family-members', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newMember)
            })
            
            const data = await response.json()
            if (data.success) {
              console.log('Add API returned family members:', data.familyMembers.length)
              // Update local state with proper immutability
              setProfile(prev => {
                if (!prev) {
                  // If profile doesn't exist yet, create a minimal one with family members
                  return {
                    important_people: [...(data.familyMembers || [])]
                  }
                }
                const updated = {
                  ...prev,
                  important_people: [...(data.familyMembers || [])]
                }
                console.log('Updated profile state after add:', updated.important_people.length)
                return updated
              })
              // Also refresh from server to ensure consistency
              setTimeout(refreshProfile, 500)
              showFamilyMessage('success', `Successfully added ${newMember.name} to your family`)
              return true
            } else {
              console.error('Failed to add family member:', data.error)
              showFamilyMessage('error', `Failed to add family member: ${data.error || 'Unknown error'}`)
              return false
            }
          } catch (error) {
            console.error('Error adding family member:', error)
            showFamilyMessage('error', 'Network error while adding family member')
            return false
          } finally {
            setFamilyOperationLoading(false)
          }
        }}
      />

      {/* Encouragement */}
      <div className="text-center bg-gradient-to-r from-comfort-50 to-hope-50 rounded-sanctuary p-embrace">
        <p className="text-comfort text-peace-700 font-compassionate">
          💝 Your account settings help us personalize your legacy preservation experience
        </p>
      </div>
    </div>
  )
}