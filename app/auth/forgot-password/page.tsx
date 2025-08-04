'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to send reset email')
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-heaven-gradient px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="inline-block p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 mx-auto">
              <span className="text-3xl">✉️</span>
            </div>
            <CardTitle className="text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
              Check Your Email
            </CardTitle>
            <CardDescription className="font-supportive">
              We&apos;ve sent password reset instructions to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-hope-50 p-4 rounded-embrace border border-hope-200">
              <p className="text-sm text-hope-700 font-supportive">
                📧 <strong>Email sent to:</strong> {email}
              </p>
              <p className="text-xs text-hope-600 font-supportive mt-2">
                The reset link will expire in 24 hours. Check your spam folder if you don&apos;t see it.
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <Link href="/auth/signin" className="text-primary hover:underline text-sm font-supportive">
                Back to Sign In
              </Link>
              <p className="text-xs text-peace-600 font-supportive">
                Didn&apos;t receive the email?{' '}
                <button 
                  onClick={() => setSuccess(false)}
                  className="text-primary hover:underline"
                >
                  Try again
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-heaven-gradient px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="inline-block p-3 rounded-full bg-gradient-to-br from-hope-100 to-comfort-100 mb-4 mx-auto">
            <span className="text-3xl">🔑</span>
          </div>
          <CardTitle className="text-2xl font-gentle bg-gradient-to-r from-hope-700 to-comfort-700 bg-clip-text text-transparent">
            Forgot Password
          </CardTitle>
          <CardDescription className="font-supportive">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-supportive">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                  Sending Email...
                </div>
              ) : (
                'Send Reset Email'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm space-y-2">
            <p className="text-peace-600 font-supportive">
              Remember your password?{' '}
              <Link href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
            <p className="text-peace-600 font-supportive">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}