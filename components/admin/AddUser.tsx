'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  UserPlus, 
  X, 
  Mail, 
  User, 
  Shield, 
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface AddUserProps {
  onClose: () => void
  onUserAdded: () => void
}

export default function AddUser({ onClose, onUserAdded }: AddUserProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    primary_role: 'family_member',
    is_admin: false,
    sendWelcomeEmail: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setSuccess(`User created successfully! ${data.message}`)
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        primary_role: 'family_member',
        is_admin: false,
        sendWelcomeEmail: true
      })

      // Notify parent component
      onUserAdded()

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
                <p className="text-sm text-gray-600">Create a new user account</p>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Success</span>
                </div>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            )}

            {/* Basic Information */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Enter the user's basic details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be used for login and notifications
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Role and Permissions */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Role and Permissions</CardTitle>
                <CardDescription>Set the user's role and access level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="primary_role">Primary Role</Label>
                  <select
                    id="primary_role"
                    value={formData.primary_role}
                    onChange={(e) => handleInputChange('primary_role', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md mt-1"
                  >
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                    <option value="family_member">Family Member</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This determines their default permissions and interface
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={formData.is_admin}
                    onChange={(e) => handleInputChange('is_admin', e.target.checked)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <Label htmlFor="is_admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      Administrator Privileges
                    </Label>
                    <p className="text-xs text-purple-700">
                      Grants full system access including user management and settings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Notification Settings</CardTitle>
                <CardDescription>Configure how the user will be notified</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <input
                    type="checkbox"
                    id="sendWelcomeEmail"
                    checked={formData.sendWelcomeEmail}
                    onChange={(e) => handleInputChange('sendWelcomeEmail', e.target.checked)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <Label htmlFor="sendWelcomeEmail" className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-blue-600" />
                      Send Welcome Email
                    </Label>
                    <p className="text-xs text-blue-700">
                      Sends login credentials and getting started information
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.name || !formData.email}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Additional Information */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">What happens next?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• A temporary password will be generated</li>
              <li>• Welcome email with login instructions (if enabled)</li>
              <li>• User can change password on first login</li>
              <li>• Account is immediately active and ready to use</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}