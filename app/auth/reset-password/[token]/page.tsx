'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ResetPasswordPageProps {
  params: {
    token: string
  }
}

export default function ResetPassword({ params }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [validToken, setValidToken] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-reset-token/${params.token}`)
        const data = await response.json()
        
        if (response.ok && data.valid) {
          setValidToken(true)
        } else {
          setError(data.error || 'Invalid or expired reset token')
        }
      } catch (error) {
        setError('Failed to verify reset token')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [params.token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: params.token,
          password 
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Redirect to signin after 3 seconds
        setTimeout(() => {
          router.push('/auth/signin?message=password-reset-success')
        }, 3000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-heaven-gradient px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 mx-auto">
              <div className="w-8 h-8 border-2 border-hope-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <CardTitle className="text-xl font-gentle text-peace-800">
              Verifying Reset Link...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-heaven-gradient px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 mb-4 mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <CardTitle className="text-2xl font-gentle bg-gradient-to-r from-green-700 to-green-800 bg-clip-text text-transparent">
              Password Reset Successfully
            </CardTitle>
            <CardDescription className="font-supportive">
              Your password has been updated. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-green-50 p-4 rounded-embrace border border-green-200 mb-4">
              <p className="text-sm text-green-700 font-supportive">
                Redirecting you to the sign in page in 3 seconds...
              </p>
            </div>
            <Link href="/auth/signin" className="text-primary hover:underline text-sm font-supportive">
              Sign in now →
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token state
  if (!validToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-heaven-gradient px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-red-100 to-red-200 mb-4 mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <CardTitle className="text-2xl font-gentle bg-gradient-to-r from-red-700 to-red-800 bg-clip-text text-transparent">
              Invalid Reset Link
            </CardTitle>
            <CardDescription className="font-supportive">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-embrace border border-red-200">
              <p className="text-sm text-red-700 font-supportive">
                {error}
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <Link href="/auth/forgot-password">
                <Button className="w-full bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/auth/signin" className="text-primary hover:underline text-sm font-supportive block">
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Reset password form
  return (
    <div className="flex min-h-screen items-center justify-center bg-heaven-gradient px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="inline-block p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <CardTitle className="text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
            Reset Your Password
          </CardTitle>
          <CardDescription className="font-supportive">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-supportive">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-embrace"
              />
              <p className="text-xs text-peace-600 font-supportive">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-supportive">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-embrace"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-embrace p-3">
                <p className="text-sm text-red-700 font-supportive">
                  {error}
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <Link href="/auth/signin" className="text-primary hover:underline font-supportive">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}