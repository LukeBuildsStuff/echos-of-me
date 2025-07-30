'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AppHeader from '@/components/AppHeader'

export default function UserTrainingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      checkAdminAccess()
    }
  }, [status, router])

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.ok) {
        setIsAdmin(true)
        // Redirect to admin training page
        router.push('/admin/training')
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Admin access check failed:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-peace-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Non-admin users get redirected to dashboard with a message
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-heaven-gradient">
        <AppHeader 
          showBackButton 
          onBack={() => router.push('/dashboard')}
        />
        
        <main className="container mx-auto px-4 pt-32 pb-8">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-md border-0 shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-gentle text-peace-800 mb-4">
                  🔒 Access Restricted
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-peace-700 font-supportive">
                  AI training functionality is reserved for system administrators. 
                  As a user, you can enjoy your personalized AI through the &ldquo;Your Echo&rdquo; feature on your dashboard.
                </p>
                <p className="text-peace-600 font-supportive text-sm">
                  Your responses and stories are automatically used to improve your personal AI echo. 
                  No manual training is required!
                </p>
                <div className="pt-4">
                  <Button 
                    onClick={() => router.push('/dashboard')}
                    className="bg-gradient-to-r from-hope-500 to-comfort-500 hover:from-hope-600 hover:to-comfort-600 text-white rounded-embrace font-supportive"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // This shouldn't be reached since admins are redirected
  return null
}