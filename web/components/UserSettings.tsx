'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UserProfile {
  id: string
  email: string
  name: string
  created_at: string
  primary_role?: string
  children_birthdays?: string[]
  important_people?: any
}

export default function UserSettings() {
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

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/profile')
      const data = await response.json()
      
      if (data.success) {
        setProfile(data.profile)
        setEditName(data.profile.name || '')
      } else {
        console.error('Failed to load profile:', data.error)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
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

      {/* Family Profile Summary */}
      <Card className="bg-gradient-to-br from-white to-comfort-50 border border-peace-200">
        <CardHeader>
          <CardTitle className="text-xl font-compassionate text-peace-800">
            👥 Family Profile
          </CardTitle>
          <CardDescription className="text-comfort text-peace-600">
            Your family role and relationship details for personalized questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-comfort text-peace-700">
                Primary Role: <strong>{profile?.primary_role || 'Not set'}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.hash = 'role-setup'}
                className="text-hope-600 hover:text-hope-700 hover:bg-hope-50"
              >
                Update →
              </Button>
            </div>
            <div className="text-comfort text-peace-600">
              Children: {profile?.children_birthdays?.length || 0} added
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encouragement */}
      <div className="text-center bg-gradient-to-r from-comfort-50 to-hope-50 rounded-sanctuary p-embrace">
        <p className="text-comfort text-peace-700 font-compassionate">
          💝 Your account settings help us personalize your legacy preservation experience
        </p>
      </div>
    </div>
  )
}