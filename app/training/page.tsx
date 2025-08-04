'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import AppHeader from '@/components/AppHeader'
import FamilyTrainingInterface from '@/components/FamilyTrainingInterface'

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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">
              {status === 'loading' ? 'Checking authentication...' : 'Preparing training interface...'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Non-admin users get the family-friendly training interface
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-heaven-gradient">
        <AppHeader 
          showBackButton 
          onBack={() => router.push('/dashboard')}
        />
        
        <main className="pt-20 pb-8">
          <FamilyTrainingInterface />
        </main>
      </div>
    )
  }

  // This shouldn't be reached since admins are redirected
  return null
}